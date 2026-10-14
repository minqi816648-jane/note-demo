package expo.modules.screencapture

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.util.DisplayMetrics
import android.view.WindowManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.io.Serializable
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

private const val moduleName = "ScreenCapture"

/** 截屏授权输入（占位，无实际参数；满足 I : Serializable 约束） */
internal object ScreenCaptureInput : Serializable {
  private const val serialVersionUID = 1L
}

/** 截屏授权结果：resultCode + result Data Intent（必须保留，供 getMediaProjection 使用） */
internal data class ProjectionResult(
  val resultCode: Int,
  val data: Intent?
) : Serializable

internal class ScreenCaptureContract :
  AppContextActivityResultContract<ScreenCaptureInput, ProjectionResult> {
  override fun createIntent(context: Context, input: ScreenCaptureInput): Intent {
    val manager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    return manager.createScreenCaptureIntent()
  }

  override fun parseResult(input: ScreenCaptureInput, resultCode: Int, intent: Intent?): ProjectionResult =
    ProjectionResult(resultCode, intent)
}

class ScreenCaptureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name(moduleName)

    RegisterActivityContracts {
      captureLauncher = registerForActivityResult(ScreenCaptureContract())
    }

    AsyncFunction("captureAsync") Coroutine { promise: Promise ->
      captureScreen(promise)
    }
  }

  private lateinit var captureLauncher: AppContextActivityResultLauncher<ScreenCaptureInput, ProjectionResult>

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val currentActivity: Activity?
    get() = appContext.currentActivity

  private suspend fun captureScreen(promise: Promise) {
    if (currentActivity == null) {
      promise.reject("E_NO_ACTIVITY", "No activity to capture from", null)
      return
    }

    val result = captureLauncher.launch(ScreenCaptureInput)

    if (result.resultCode != Activity.RESULT_OK) {
      promise.reject("E_CANCELLED", "Screen capture permission denied", null)
      return
    }

    val projectionManager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    val dataIntent = result.data ?: projectionManager.createScreenCaptureIntent()

    val projection = projectionManager.getMediaProjection(result.resultCode, dataIntent)
      ?: run {
        promise.reject("E_PROJECTION", "Failed to create media projection", null)
        return
      }

    val metrics = DisplayMetrics()
    val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    windowManager.defaultDisplay.getRealMetrics(metrics)
    val width = metrics.widthPixels
    val height = metrics.heightPixels
    val density = metrics.densityDpi

    val imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
    var virtualDisplay: android.hardware.display.VirtualDisplay? = null

    try {
      virtualDisplay = projection.createVirtualDisplay(
        "ScreenCapture",
        width, height, density,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
        imageReader.surface,
        null,
        null
      )

      val bitmap = acquireLatestFrame(imageReader)
      val file = saveBitmapToFile(bitmap)
      promise.resolve(Uri.fromFile(file).toString())
    } catch (e: Exception) {
      promise.reject("E_CAPTURE", "Failed to capture screen: ${e.message}", e)
    } finally {
      virtualDisplay?.release()
      imageReader.close()
      projection.stop()
    }
  }

  private fun acquireLatestFrame(imageReader: ImageReader): Bitmap {
    val latch = CountDownLatch(1)
    var captured: Bitmap? = null

    val listener = ImageReader.OnImageAvailableListener { reader ->
      val image: Image? = reader.acquireLatestImage()
      if (image != null) {
        try {
          val plane = image.planes[0]
          val buffer = plane.buffer
          val pixelStride = plane.pixelStride
          val rowStride = plane.rowStride
          val rowPadding = rowStride - pixelStride * image.width

          val bitmap = Bitmap.createBitmap(
            image.width + rowPadding / pixelStride,
            image.height,
            Bitmap.Config.ARGB_8888
          )
          bitmap.copyPixelsFromBuffer(buffer)
          captured = bitmap
        } finally {
          image.close()
        }
      }
      latch.countDown()
    }

    imageReader.setOnImageAvailableListener(listener, null)
    latch.await(3, TimeUnit.SECONDS)
    imageReader.setOnImageAvailableListener(null, null)

    return captured ?: throw IllegalStateException("No frame captured within timeout")
  }

  private fun saveBitmapToFile(bitmap: Bitmap): File {
    val dir = File(context.cacheDir, "captures")
    if (!dir.exists()) dir.mkdirs()
    val file = File(dir, "screen_${System.currentTimeMillis()}.png")
    FileOutputStream(file).use { out ->
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
    }
    return file
  }
}
