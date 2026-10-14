// ============================================
// note-demo 原生能力 config plugin
// 托管三阶段原生改动，使 `expo prebuild` 可稳定重建：
//   1. Share Target：MainActivity 的 SEND intent-filter + EXTRA_TEXT 抽取
//   2. 全局截屏：MediaProjection 前台服务权限（app.json 已含）+ 深链入口
//   3. 快速设置磁贴：NoteCaptureTileService + ic_tile_capture 图标 + tile_label
// ============================================
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const CAPTURE_TOKEN = 'note-demo-tile-capture-v1';

const MAIN_ACTIVITY_TEMPLATE = `package com.anonymous.notedemo

import android.content.Intent
import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    handleShareIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleShareIntent(intent)
  }

  private fun handleShareIntent(intent: Intent?) {
    if (intent?.action != Intent.ACTION_SEND) return
    val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT) ?: return
    val url = extractUrl(sharedText) ?: return
    val title = extractTitle(sharedText)

    val deepLink = android.net.Uri.Builder()
      .scheme("note-demo")
      .authority("save-link")
      .appendQueryParameter("url", url)
      .apply { if (title != null) appendQueryParameter("title", title) }
      .build()

    startActivity(Intent(Intent.ACTION_VIEW, deepLink).apply {
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    })
  }

  private fun extractUrl(text: String): String? {
    val regex = Regex("https?://[^\\\\s]+")
    val match = regex.find(text) ?: return null
    return match.value.trim('"', '\\'', '(', ')', '\uFF0C', '\u3002', '\uFF1B', ',')
  }

  private fun extractTitle(text: String): String? {
    val url = extractUrl(text) ?: return null
    val remaining = text.replace(url, "").trim().trim('"', '\\'', '(', ')', '\uFF0C', '\u3002', '\uFF1B', ',', ' ', '-', '|', '\u30FB')
    return remaining.ifEmpty { null }
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              super.invokeDefaultOnBackPressed()
          }
          return
      }
      super.invokeDefaultOnBackPressed()
  }
}
`;

const TILE_SERVICE_TEMPLATE = `package com.anonymous.notedemo

import android.content.Intent
import android.net.Uri
import android.service.quicksettings.TileService

class NoteCaptureTileService : TileService() {
  override fun onClick() {
    super.onClick()
    unlockAndRun(Runnable {
      startActivityAndCollapse(
        Intent(Intent.ACTION_VIEW, Uri.parse("note-demo://capture?token=${CAPTURE_TOKEN}")).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      )
    })
  }

  companion object {
    const val CAPTURE_TOKEN = "${CAPTURE_TOKEN}"
  }
}
`;

const TILE_ICON = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M4,4h3l2,-2h6l2,2h3v16H4zM12,18a4,4 0 1,0 0,-8 4,4 0 0,0 0,8z" />
</vector>
`;

function withAndroidManifestEdits(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // 1) MainActivity 加 SEND intent-filter
    const application = manifest.application && manifest.application[0];
    if (application) {
      const mainActivity = application.activity && application.activity.find(
        (a) => a.$['android:name'] === '.MainActivity'
      );
      if (mainActivity) {
        const hasSend = (mainActivity['intent-filter'] || []).some((f) =>
          (f.action || []).some((a) => a.$['android:name'] === 'android.intent.action.SEND')
        );
        if (!hasSend) {
          mainActivity['intent-filter'] = mainActivity['intent-filter'] || [];
          mainActivity['intent-filter'].push({
            action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
            category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
            data: [{ $: { 'android:mimeType': 'text/plain' } }],
          });
        }
      }
    }

    // 2) 磁贴 service 声明
    if (application) {
      const services = application.service || [];
      const hasTile = services.some((s) => s.$['android:name'] === '.NoteCaptureTileService');
      if (!hasTile) {
        services.push({
          $: {
            'android:name': '.NoteCaptureTileService',
            'android:exported': 'true',
            'android:icon': '@drawable/ic_tile_capture',
            'android:label': '@string/tile_label',
            'android:permission': 'android.permission.BIND_QUICK_SETTINGS_TILE',
          },
          'intent-filter': [
            { action: [{ $: { 'android:name': 'android.service.quicksettings.action.QS_TILE' } }] },
          ],
        });
        application.service = services;
      }
    }

    return cfg;
  });
}

function withDangerousNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const root = cfg.modRequest.platformProjectRoot;
      const pkgDir = path.join(
        root,
        'app',
        'src',
        'main',
        'java',
        'com',
        'anonymous',
        'notedemo'
      );

      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(path.join(pkgDir, 'MainActivity.kt'), MAIN_ACTIVITY_TEMPLATE);
      fs.writeFileSync(path.join(pkgDir, 'NoteCaptureTileService.kt'), TILE_SERVICE_TEMPLATE);

      const resDir = path.join(root, 'app', 'src', 'main', 'res');
      fs.mkdirSync(path.join(resDir, 'drawable'), { recursive: true });
      fs.writeFileSync(path.join(resDir, 'drawable', 'ic_tile_capture.xml'), TILE_ICON);

      // strings.xml 追加 tile_label
      const valuesDir = path.join(resDir, 'values');
      fs.mkdirSync(valuesDir, { recursive: true });
      const stringsPath = path.join(valuesDir, 'strings.xml');
      let strings = fs.existsSync(stringsPath)
        ? fs.readFileSync(stringsPath, 'utf8')
        : '<resources></resources>';
      if (!strings.includes('name="tile_label"')) {
        strings = strings.replace(
          '</resources>',
          '  <string name="tile_label">截图存笔记</string>\n</resources>'
        );
        fs.writeFileSync(stringsPath, strings);
      }

      return cfg;
    },
  ]);
}

module.exports = function withNoteDemoNative(config) {
  config = withAndroidManifestEdits(config);
  config = withDangerousNativeFiles(config);
  return config;
};
