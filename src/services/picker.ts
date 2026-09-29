import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Capacitor } from '@capacitor/core';
import { DeviceFile, FileCategory } from '../types';

export async function pickAnyFiles(): Promise<DeviceFile[]> {
  if (!Capacitor.isNativePlatform()) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.onchange = () => {
        if (!input.files) return resolve([]);
        const picked: DeviceFile[] = Array.from(input.files).map((f, idx) => {
          let category: FileCategory = 'documents';
          if (f.type.startsWith('image/')) category = 'images';
          else if (f.type.startsWith('video/')) category = 'videos';
          else if (f.type.startsWith('audio/')) category = 'audio';
          else if (f.name.endsWith('.apk')) category = 'apps';

          return {
            id: `picked-${Date.now()}-${idx}`,
            name: f.name,
            path: f.name,
            size: f.size,
            category,
            modifiedDate: 'Just now',
            mimeType: f.type || 'application/octet-stream',
            isDirectory: false,
            extension: f.name.includes('.') ? f.name.split('.').pop() || '' : '',
            blob: f,
          };
        });
        resolve(picked);
      };
      input.click();
    });
  }

  try {
    const { files } = await FilePicker.pickFiles({
      limit: 0,
      readData: false,
    });

    return files.map((f, idx) => {
      const mime = f.mimeType || '';
      let category: FileCategory = 'documents';
      if (mime.startsWith('image/')) category = 'images';
      else if (mime.startsWith('video/')) category = 'videos';
      else if (mime.startsWith('audio/')) category = 'audio';
      else if (f.name.endsWith('.apk') || mime === 'application/vnd.android.package-archive') category = 'apps';

      return {
        id: `native-${Date.now()}-${idx}`,
        name: f.name,
        path: f.path || f.name,
        size: f.size,
        category,
        modifiedDate: 'Just now',
        mimeType: mime || 'application/octet-stream',
        isDirectory: false,
        extension: f.name.includes('.') ? f.name.split('.').pop() || '' : '',
        nativeUri: f.path || undefined,
      };
    });
  } catch {
    return [];
  }
}
