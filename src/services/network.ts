import { Network } from '@capacitor/network';
import { ZapdropNative } from '../native/zapdrop-native';
import { Capacitor } from '@capacitor/core';

export async function isOnLocalNetwork(): Promise<boolean> {
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
  if (!Capacitor.isNativePlatform()) return '192.168.1.100';
  try {
    const { ip } = await ZapdropNative.getLocalIp();
    return ip;
  } catch {
    return null;
  }
}

export function watchNetwork(cb: (online: boolean) => void) {
  return Network.addListener('networkStatusChange', (s) => {
    cb(s.connected);
  });
}
