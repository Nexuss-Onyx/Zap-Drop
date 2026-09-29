import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

async function saveTarget() {
  if (!Capacitor.isNativePlatform()) {
    return { directory: Directory.Documents, base: 'Zapdrop' };
  }
  try {
    const { androidSDKVersion } = await Device.getInfo();
    return (androidSDKVersion ?? 22) >= 29
      ? { directory: Directory.Documents, base: 'Zapdrop' }
      : { directory: Directory.ExternalStorage, base: 'Download/Zapdrop' };
  } catch {
    return { directory: Directory.Documents, base: 'Zapdrop' };
  }
}

export async function ensureSaveDir() {
  const { directory, base } = await saveTarget();
  try {
    await Filesystem.mkdir({ path: base, directory, recursive: true });
  } catch {
    // already exists
  }
  return { directory, base };
}

export async function downloadToDevice(
  url: string,
  fileName: string,
  onProgress: (loaded: number, total: number) => void
): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback: simulated download with progress
    let loaded = 0;
    const total = 5 * 1024 * 1024;
    while (loaded < total) {
      await new Promise((r) => setTimeout(r, 100));
      loaded += 1024 * 1024;
      onProgress(Math.min(loaded, total), total);
    }
    return `blob:${fileName}`;
  }

  const { directory, base } = await ensureSaveDir();

  const sub = await Filesystem.addListener('progress', (p) => {
    onProgress(p.bytes, p.contentLength);
  });

  try {
    const res = await Filesystem.downloadFile({
      url,
      path: `${base}/${fileName}`,
      directory,
      progress: true,
      recursive: true,
    });
    return res.path || `${base}/${fileName}`;
  } finally {
    sub.remove();
  }
}

export async function getFileUri(path: string, directory: Directory): Promise<string> {
  return (await Filesystem.getUri({ path, directory })).uri;
}
