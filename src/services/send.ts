import { Capacitor } from '@capacitor/core';
import { ZapdropNative } from '../native/zapdrop-native';
import { getDeviceProfile } from './device';
import { makeQrDataUrl } from './qr';
import { holdScreen, releaseScreen } from './keepawake';
import { addHistory } from './storage';
import { DeviceFile } from '../types';

export interface SendSession {
  qrCodeUrl: string;
  ip: string;
  port: number;
  token: string;
  stop: () => Promise<void>;
}

export async function startSend(
  selectedFiles: DeviceFile[],
  onProgress?: (id: string, bytes: number, total: number) => void,
  onDone?: () => void
): Promise<SendSession> {
  const profile = await getDeviceProfile();
  const token = Math.random().toString(36).substring(2, 10);

  if (!Capacitor.isNativePlatform()) {
    // Simulated send session for browser preview
    const payload = {
      v: 1 as const,
      ip: '192.168.1.100',
      port: 8080,
      token,
      name: profile.name,
      deviceId: profile.id,
      files: selectedFiles.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        mime: f.mimeType || 'application/octet-stream',
      })),
    };
    const qrCodeUrl = await makeQrDataUrl(payload);
    return {
      qrCodeUrl,
      ip: '192.168.1.100',
      port: 8080,
      token,
      stop: async () => {},
    };
  }

  const nativeFiles = selectedFiles.map((f) => ({
    id: f.id,
    uri: f.path,
    name: f.name,
    size: f.size,
    mime: f.mimeType || 'application/octet-stream',
  }));

  const { ip, port } = await ZapdropNative.startServer({
    token,
    files: nativeFiles,
  });

  if (!ip) {
    throw new Error('Please connect to a Wi-Fi network or enable Portable Hotspot.');
  }

  const payload = {
    v: 1 as const,
    ip,
    port,
    token,
    name: profile.name,
    deviceId: profile.id,
    files: nativeFiles.map(({ id, name, size, mime }) => ({ id, name, size, mime })),
  };

  const qrCodeUrl = await makeQrDataUrl(payload);
  await holdScreen();

  const progressSub = await ZapdropNative.addListener('fileServed', (e) => {
    if (onProgress) onProgress(e.id, e.bytes, e.total);
  });

  const doneSub = await ZapdropNative.addListener('transferDone', async () => {
    for (const file of selectedFiles) {
      await addHistory({
        id: `sent-${Date.now()}-${file.id}`,
        fileName: file.name,
        size: file.size,
        direction: 'sent',
        peerName: 'Connected Peer',
        at: Date.now(),
        status: 'done',
      });
    }
    if (onDone) onDone();
  });

  const stop = async () => {
    try {
      await progressSub.remove();
      await doneSub.remove();
      await ZapdropNative.stopServer();
      await releaseScreen();
    } catch {
      // ignore
    }
  };

  return {
    qrCodeUrl,
    ip,
    port,
    token,
    stop,
  };
}
