import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { LazyStore } from '@tauri-apps/plugin-store';
import { hostname, platform } from '@tauri-apps/plugin-os';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import type { ZapdropBackend, FileItem, Peer, Unsub, RemoteFile, Progress } from './index';

const store = new LazyStore('zapdrop.json');

const on = <T>(event: string, cb: (p: T) => void): Unsub => {
  let un: (() => void) | null = null;
  let dead = false;
  listen<T>(event, (e) => cb(e.payload)).then((f) => (dead ? f() : (un = f)));
  return () => {
    dead = true;
    un?.();
  };
};

const PAGE = 60;
let extraRoots: string[] = [];

async function deviceId(): Promise<string> {
  let id = await store.get<string>('deviceId');
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '');
    await store.set('deviceId', id);
    await store.save();
  }
  return id;
}

async function deviceName(): Promise<string> {
  const custom = await store.get<string>('deviceName');
  if (custom) return custom;
  try {
    const host = await hostname();
    if (host) return host;
  } catch {}
  return 'Desktop';
}

const norm = (f: any): FileItem => ({ ...f, thumb: null });

export const tauriBackend: ZapdropBackend = {
  platform: ((): any => {
    try {
      const p = platform();
      return p === 'windows' || p === 'macos' || p === 'linux' ? p : 'linux';
    } catch {
      return 'linux';
    }
  })(),

  // ---------- profile / history ----------
  async getProfile() {
    let p = 'linux';
    try {
      p = platform();
    } catch {}
    return {
      id: await deviceId(),
      name: await deviceName(),
      os: p,
      avatar: (await store.get<string>('avatar')) ?? undefined,
    };
  },
  async setDeviceName(name: string) {
    await store.set('deviceName', name.trim().slice(0, 40));
    await store.save();
  },
  async getHistory() {
    return (await store.get<any[]>('history')) ?? [];
  },
  async clearHistory() {
    await store.delete('history');
    await store.save();
  },

  // ---------- library ----------
  async scanLibrary() {
    extraRoots = (await store.get<string[]>('extraRoots')) ?? [];
    return invoke<number>('scan_library', { extraRoots });
  },
  loadFolders: () => invoke('list_folders'),
  async loadFiles({ kind = 'all', folder, query, page = 0 }) {
    const r = await invoke<{ items: any[]; total: number }>('list_files', {
      kind,
      folder: folder ?? null,
      query: query ?? null,
      offset: page * PAGE,
      limit: PAGE,
    });
    return { items: r.items.map(norm), total: r.total };
  },
  async addFiles() {
    const picked = await open({ multiple: true, directory: false, title: 'Add files' });
    if (!picked) return [];
    const paths = Array.isArray(picked) ? picked : [picked];
    return (await invoke<any[]>('add_paths', { paths })).map(norm);
  },
  async addDroppedPaths(paths: string[]) {
    return (await invoke<any[]>('add_paths', { paths })).map(norm);
  },
  async getThumbnail(item: FileItem) {
    if (item.kind !== 'image' && item.kind !== 'video') return null;
    const p = await invoke<string | null>('get_thumbnail', { path: item.path });
    return p ? convertFileSrc(p) : null;
  },

  // ---------- network ----------
  getNetworkStatus: () => invoke('network_status'),
  connectWifi: (ssid, password) => invoke('connect_wifi', { ssid, password }),

  // ---------- send ----------
  async startSend(files, ip) {
    await invoke('hold_awake');
    return invoke('start_send', {
      fileIds: files.map((f) => f.id),
      name: await deviceName(),
      deviceId: await deviceId(),
      ip: ip ?? null,
    });
  },
  async stopSend() {
    await invoke('stop_send');
    await invoke('release_awake');
  },
  onSendProgress: (cb) => on('send_progress', cb),
  onSendDone: (cb) => on<{ peerIp: string }>('send_done', (p) => cb(p.peerIp)),
  onIncomingRequest: (cb) => on('incoming_request', cb),
  answerRequest: (requestId, accept) => invoke('answer_request', { requestId, accept }),

  // ---------- receive ----------
  async startDiscovery() {
    await invoke('start_discovery', { deviceId: await deviceId(), name: await deviceName() });
  },
  stopDiscovery: () => invoke('stop_discovery'),
  onPeerFound: (cb) => on<Peer>('device_found', cb),
  onPeerLost: (cb) => on<{ id: string }>('device_lost', (p) => cb(p.id)),
  async requestAccess(peer: Peer) {
    return invoke<string>('request_access', {
      ip: peer.ip,
      port: peer.port,
      name: await deviceName(),
      deviceId: await deviceId(),
    });
  },
  fetchManifest: (ip: string, port: number, token: string) =>
    invoke<RemoteFile[]>('fetch_manifest', { ip, port, token }),
  async receive(sessionId, ip, port, token, peerName, files) {
    await invoke('hold_awake');
    try {
      const saveDir = (await store.get<string>('saveDir')) ?? null;
      return await invoke<string[]>('start_receive', {
        sessionId,
        ip,
        port,
        token,
        peerName,
        files,
        saveDir,
      });
    } finally {
      await invoke('release_awake');
    }
  },
  cancelReceive: (sessionId: string) => invoke('cancel_receive', { sessionId }),
  onReceiveProgress: (cb: (p: Progress) => void) => on<Progress>('recv_progress', cb),

  // ---------- after transfer ----------
  openFile: (path: string) => invoke('open_file', { path }),
  revealFile: (path: string) => invoke('reveal_file', { path }),
  async notify(title: string, body: string) {
    let ok = await isPermissionGranted();
    if (!ok) ok = (await requestPermission()) === 'granted';
    if (ok) sendNotification({ title, body });
  },
  copyText: (t: string) => writeText(t),
};

// ---------- drag & drop: call once from the app shell ----------
import { getCurrentWebview } from '@tauri-apps/api/webview';
export function enableDropZone(
  onFiles: (files: FileItem[]) => void,
  onHover: (over: boolean) => void
) {
  return getCurrentWebview().onDragDropEvent(async (e) => {
    const t = e.payload.type;
    if (t === 'over' || t === 'enter') onHover(true);
    else if (t === 'leave') onHover(false);
    else if (t === 'drop') {
      onHover(false);
      onFiles(await tauriBackend.addDroppedPaths(e.payload.paths));
    }
  });
}
