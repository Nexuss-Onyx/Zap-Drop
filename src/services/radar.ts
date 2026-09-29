import { Capacitor } from '@capacitor/core';
import { ZapdropNative } from '../native/zapdrop-native';
import { DeviceProfile } from '../types';
import { getDeviceProfile } from './device';
import { MOCK_RADAR_DEVICES } from './mock';
import { backend, isTauri } from '../backend';

export interface RadarDiscoverySession {
  stop: () => Promise<void>;
}

export async function startRadarDiscovery(
  onDeviceFound: (device: DeviceProfile) => void,
  onDeviceLost?: (id: string) => void
): Promise<RadarDiscoverySession> {
  if (isTauri) {
    try {
      const b = await backend();
      const unsubFound = b.onPeerFound((peer) => {
        onDeviceFound({
          id: peer.id,
          name: peer.name,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          os: (peer.platform as any) || 'linux',
          signalStrength: 95,
          status: 'online',
        });
      });

      const unsubLost = b.onPeerLost((id) => {
        if (onDeviceLost) onDeviceLost(id);
      });

      await b.startDiscovery();

      return {
        stop: async () => {
          try {
            unsubFound();
            unsubLost();
            await b.stopDiscovery();
          } catch {}
        },
      };
    } catch (e) {
      console.warn('Tauri startDiscovery error:', e);
    }
  }

  if (!Capacitor.isNativePlatform()) {
    const timer = setTimeout(() => {
      MOCK_RADAR_DEVICES.forEach((d) => onDeviceFound(d));
    }, 400);
    return {
      stop: async () => {
        clearTimeout(timer);
      },
    };
  }

  const me = await getDeviceProfile();

  const foundSub = await ZapdropNative.addListener('deviceFound', (d) => {
    onDeviceFound({
      id: d.id,
      name: d.name,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      os: 'android',
      signalStrength: 90,
      status: 'online',
    });
  });

  const lostSub = await ZapdropNative.addListener('deviceLost', (d) => {
    if (onDeviceLost) onDeviceLost(d.id);
  });

  await ZapdropNative.startDiscovery({
    deviceId: me.id,
    name: me.name,
  });

  return {
    stop: async () => {
      try {
        await foundSub.remove();
        await lostSub.remove();
        await ZapdropNative.stopDiscovery();
      } catch {}
    },
  };
}
