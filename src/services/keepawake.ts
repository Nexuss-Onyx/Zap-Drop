import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';

export async function holdScreen(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await KeepAwake.keepAwake();
    } catch {
      // ignore
    }
  }
}

export async function releaseScreen(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await KeepAwake.allowSleep();
    } catch {
      // ignore
    }
  }
}
