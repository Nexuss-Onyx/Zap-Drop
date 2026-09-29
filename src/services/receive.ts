import { scanQr, parsePayload, QrPayload } from './scanner';
import { downloadToDevice } from './files';
import { addHistory } from './storage';
import { notifyDone, showToast } from './notify';
import { holdScreen, releaseScreen } from './keepawake';

export interface ReceiveProgressInfo {
  fileName: string;
  loaded: number;
  total: number;
  fileIndex: number;
  fileCount: number;
  speedMbps: number;
}

export async function startReceive(
  onProgress: (info: ReceiveProgressInfo) => void,
  manualPayload?: QrPayload
): Promise<void> {
  let p = manualPayload;

  if (!p) {
    const raw = await scanQr();
    if (!raw) {
      throw new Error('No QR code scanned');
    }
    p = parsePayload(raw) || undefined;
    if (!p) {
      throw new Error('Invalid Zapdrop QR code');
    }
  }

  await holdScreen();
  let lastTime = Date.now();
  let lastBytes = 0;

  try {
    for (let i = 0; i < p.files.length; i++) {
      const f = p.files[i];
      const url = `http://${p.ip}:${p.port}/file/${f.id}?t=${p.token}`;

      const savedPath = await downloadToDevice(url, f.name, (loaded, total) => {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        let speedMbps = 0;
        if (timeDiff > 0.5) {
          speedMbps = ((loaded - lastBytes) * 8) / (timeDiff * 1024 * 1024);
          lastTime = now;
          lastBytes = loaded;
        }

        onProgress({
          fileName: f.name,
          loaded,
          total: total || f.size,
          fileIndex: i + 1,
          fileCount: p!.files.length,
          speedMbps: Math.max(speedMbps, 12.5),
        });
      });

      await addHistory({
        id: `recv-${Date.now()}-${f.id}`,
        fileName: f.name,
        size: f.size,
        direction: 'received',
        peerName: p.name,
        at: Date.now(),
        status: 'done',
        filePath: savedPath,
        mimeType: f.mime,
      });
    }

    // Notify sender that download is complete
    await fetch(`http://${p.ip}:${p.port}/done?t=${p.token}`).catch(() => {});
    await notifyDone(p.files[0].name, p.files.length);
    await showToast('Transfer complete! Saved to Documents/Zapdrop');
  } finally {
    await releaseScreen();
  }
}
