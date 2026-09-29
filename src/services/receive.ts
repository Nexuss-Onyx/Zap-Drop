import { scanQr, parsePayload, QrPayload } from './scanner';
import { downloadToDevice } from './files';
import { addHistory } from './storage';
import { notifyDone, showToast } from './notify';
import { holdScreen, releaseScreen } from './keepawake';
import { backend, isTauri, Peer, RemoteFile } from '../backend';

export interface ReceiveProgressInfo {
  fileName: string;
  loaded: number;
  total: number;
  fileIndex: number;
  fileCount: number;
  speedMbps: number;
}

export async function receiveFromPeer(
  peer: { id: string; name: string; ip: string; port: number; platform?: string },
  onProgress: (info: ReceiveProgressInfo) => void
): Promise<string[]> {
  await holdScreen();
  try {
    const b = await backend();
    const token = await b.requestAccess(peer as Peer);
    const files = await b.fetchManifest(peer.ip, peer.port, token);
    if (!files || files.length === 0) {
      throw new Error('No files shared by sender');
    }

    const sessionId = 'recv-session-' + Date.now();
    const unsub = b.onReceiveProgress((p) => {
      onProgress({
        fileName: p.fileName,
        loaded: p.loaded,
        total: p.total,
        fileIndex: p.fileIndex + 1,
        fileCount: p.fileCount,
        speedMbps: (p.speedBps * 8) / (1024 * 1024),
      });
    });

    try {
      const savedPaths = await b.receive(sessionId, peer.ip, peer.port, token, peer.name, files);
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        await addHistory({
          id: `recv-${Date.now()}-${f.id}`,
          fileName: f.name,
          size: f.size,
          direction: 'received',
          peerName: peer.name,
          at: Date.now(),
          status: 'done',
          filePath: savedPaths[i] || undefined,
          mimeType: f.mime,
        });
      }
      await notifyDone(files[0].name, files.length);
      await showToast('Transfer complete! Saved to Downloads/Zapdrop');
      return savedPaths;
    } finally {
      unsub();
    }
  } finally {
    await releaseScreen();
  }
}

export async function receiveFromCode(
  code: string,
  onProgress: (info: ReceiveProgressInfo) => void
): Promise<string[]> {
  const parts = code.trim().split(':');
  if (parts.length < 3) {
    throw new Error('Invalid code format. Expected IP:PORT:TOKEN');
  }
  const ip = parts[0];
  const port = parseInt(parts[1], 10);
  const token = parts.slice(2).join(':');

  await holdScreen();
  try {
    const b = await backend();
    const files = await b.fetchManifest(ip, port, token);
    if (!files || files.length === 0) {
      throw new Error('No files found for this code');
    }

    const sessionId = 'recv-code-' + Date.now();
    const unsub = b.onReceiveProgress((p) => {
      onProgress({
        fileName: p.fileName,
        loaded: p.loaded,
        total: p.total,
        fileIndex: p.fileIndex + 1,
        fileCount: p.fileCount,
        speedMbps: (p.speedBps * 8) / (1024 * 1024),
      });
    });

    try {
      const savedPaths = await b.receive(sessionId, ip, port, token, 'Direct Peer', files);
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        await addHistory({
          id: `recv-${Date.now()}-${f.id}`,
          fileName: f.name,
          size: f.size,
          direction: 'received',
          peerName: 'Direct Peer',
          at: Date.now(),
          status: 'done',
          filePath: savedPaths[i] || undefined,
          mimeType: f.mime,
        });
      }
      await notifyDone(files[0].name, files.length);
      await showToast('Transfer complete! Saved to Downloads/Zapdrop');
      return savedPaths;
    } finally {
      unsub();
    }
  } finally {
    await releaseScreen();
  }
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

  if (isTauri) {
    await holdScreen();
    try {
      const b = await backend();
      let files: RemoteFile[] = p.files || [];
      if (files.length === 0) {
        files = await b.fetchManifest(p.ip, p.port, p.token);
      }
      const sessionId = 'recv-qr-' + Date.now();
      const unsub = b.onReceiveProgress((prog) => {
        onProgress({
          fileName: prog.fileName,
          loaded: prog.loaded,
          total: prog.total,
          fileIndex: prog.fileIndex + 1,
          fileCount: prog.fileCount,
          speedMbps: (prog.speedBps * 8) / (1024 * 1024),
        });
      });

      try {
        const savedPaths = await b.receive(sessionId, p.ip, p.port, p.token, p.name, files);
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          await addHistory({
            id: `recv-${Date.now()}-${f.id}`,
            fileName: f.name,
            size: f.size,
            direction: 'received',
            peerName: p.name,
            at: Date.now(),
            status: 'done',
            filePath: savedPaths[i] || undefined,
            mimeType: f.mime,
          });
        }
        await notifyDone(files[0].name, files.length);
        await showToast('Transfer complete! Saved to Downloads/Zapdrop');
        return;
      } finally {
        unsub();
      }
    } finally {
      await releaseScreen();
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

    await fetch(`http://${p.ip}:${p.port}/done?t=${p.token}`).catch(() => {});
    await notifyDone(p.files[0].name, p.files.length);
    await showToast('Transfer complete! Saved to Documents/Zapdrop');
  } finally {
    await releaseScreen();
  }
}
