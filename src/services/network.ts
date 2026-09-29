import { Network } from '@capacitor/network';
import { ZapdropNative } from '../native/zapdrop-native';
import { Capacitor } from '@capacitor/core';
import { backend, isTauri } from '../backend';

export async function isOnLocalNetwork(): Promise<boolean> {
  if (isTauri) {
    try {
      const b = await backend();
      const status = await b.getNetworkStatus();
      return status.ready;
    } catch {
      return true;
    }
  }

  if (!Capacitor.isNativePlatform()) return true;
  try {
    const s = await Network.getStatus();
    const { ip } = await ZapdropNative.getLocalIp();
    return s.connected || !!ip;
  } catch {
    return true;
  }
}

export async function getLocalIpAddress(): Promise<string | null> {
  if (isTauri) {
    try {
      const b = await backend();
      const status = await b.getNetworkStatus();
      return status.suggestedIp;
    } catch {
      return null;
    }
  }

  if (!Capacitor.isNativePlatform()) return '192.168.1.100';
  try {
    const { ip } = await ZapdropNative.getLocalIp();
    return ip;
  } catch {
    return null;
  }
}

export function watchNetwork(cb: (online: boolean) => void) {
  if (isTauri) {
    let active = true;
    const interval = setInterval(async () => {
      if (!active) return;
      try {
        const b = await backend();
        const st = await b.getNetworkStatus();
        cb(st.ready);
      } catch {}
    }, 3000);

    return {
      remove: async () => {
        active = false;
        clearInterval(interval);
      },
    };
  }

  return Network.addListener('networkStatusChange', (s) => {
    cb(s.connected);
  });
}
