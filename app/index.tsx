import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useSettingsStore } from '../stores/settingsStore';

export default function Index() {
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const [ready, setReady] = useState(() => onboardingCompleted);

  useEffect(() => {
    // 首次进入：加载持久化设置，据此决定是否展示引导页（4.6）
    useSettingsStore
      .getState()
      .loadSettings()
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return onboardingCompleted
    ? <Redirect href="/tabs" />
    : <Redirect href="/onboarding" />;
}
