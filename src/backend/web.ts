import {
  ZapdropBackend,
  FileItem,
  Folder,
  Profile,
  NetworkStatus,
  SendSession,
  Peer,
  RemoteFile,
  Unsub,
} from './index';

export const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=120&auto=format&fit=crop&q=80',
];

let webFiles: FileItem[] = [];
let webProfile: Profile = {
  id: 'device-web-' + Math.random().toString(36).substring(2, 8),
  name: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Mac') ? 'MacBook' : navigator.userAgent.includes('Windows') ? 'Windows PC' : 'Desktop Browser') : 'Desktop',
  os: 'web',
  avatar: AVATAR_PRESETS[0],
};
let webHistory: any[] = [];

export const webBackend: ZapdropBackend = {
  platform: 'web',

  async getProfile() {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('zapdrop_profile') : null;
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.name) webProfile.name = p.name;
        if (p.avatar) webProfile.avatar = p.avatar;
        if (p.id) webProfile.id = p.id;
      } catch {}
    }
    return { ...webProfile };
  },

  async setDeviceName(name: string) {
    webProfile.name = name;
  },

  async getHistory() {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('zapdrop_transfer_history') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [...webHistory];
  },

  async clearHistory() {
    webHistory = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('zapdrop_transfers');
      localStorage.removeItem('zapdrop_transfer_history');
    }
  },

  async scanLibrary() {
    return webFiles.length;
  },

  async loadFolders(): Promise<Folder[]> {
    return [];
  },

  async loadFiles({ kind = 'all', folder, query, page = 0 }) {
    let filtered = webFiles;
    if (kind !== 'all') {
      filtered = filtered.filter((i) => i.kind === kind);
    }
    if (folder) {
      filtered = filtered.filter((i) => i.folder.toLowerCase() === folder.toLowerCase());
    }
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(q));
    }
    return {
      items: filtered.slice(page * 60, (page + 1) * 60),
      total: filtered.length,
    };
  },

  async listDirectory(path?: string) {
    return {
      path: path || 'root',
      items: webFiles.map((f) => ({
        name: f.name,
        path: f.path || f.id,
        isDirectory: false,
        size: f.size,
        modified: f.modified,
        extension: f.name.includes('.') ? f.name.split('.').pop() || '' : '',
      })),
    };
  },

  async addFiles(): Promise<FileItem[]> {
    return [];
  },

  async addDroppedPaths(paths: string[]): Promise<FileItem[]> {
    const newItems: FileItem[] = paths.map((p, idx) => ({
      id: 'file-' + Date.now() + '-' + idx,
      name: p.split(/[\\/]/).pop() || 'file',
      size: 1024,
      mime: 'application/octet-stream',
      kind: 'other',
      folder: 'Storage',
      modified: Date.now(),
      path: p,
      thumb: null,
    }));
    webFiles = [...newItems, ...webFiles];
    return newItems;
  },

  async getThumbnail(item: FileItem) {
    return item.thumb || null;
  },

  async getNetworkStatus(): Promise<NetworkStatus> {
    return {
      ready: true,
      suggestedIp: typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1',
      ssid: 'Local Network',
      interfaces: [
        { name: 'eth0', ip: typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1', likelyHotspot: false, virtual: false },
      ],
    };
  },

  async connectWifi(_ssid: string, _password: string) {},

  async startSend(files: FileItem[], ip?: string): Promise<SendSession> {
    const chosenIp = ip || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1');
    const port = 48556;
    const token = Math.random().toString(36).substring(2, 10);
    const code = `${chosenIp}:${port}:${token}`;
    const payload = JSON.stringify({
      v: 1,
      ip: chosenIp,
      port,
      token,
      name: webProfile.name,
      deviceId: webProfile.id,
      files: files.map((f) => ({ id: f.id, name: f.name, size: f.size, mime: f.mime })),
    });
    return {
      ip: chosenIp,
      port,
      token,
      code,
      qrPayload: payload,
      files: files.map((f) => ({ id: f.id, name: f.name, size: f.size, mime: f.mime })),
    };
  },

  async stopSend() {},
  onSendProgress() {
    return () => {};
  },
  onSendDone() {
    return () => {};
  },
  onIncomingRequest() {
    return () => {};
  },
  async answerRequest() {},

  async startDiscovery() {},
  async stopDiscovery() {},
  onPeerFound(_cb: (p: Peer) => void): Unsub {
    return () => {};
  },
  onPeerLost() {
    return () => {};
  },
  async requestAccess() {
    return Math.random().toString(36).substring(2, 10);
  },
  async fetchManifest(_ip: string, _port: number, _token: string): Promise<RemoteFile[]> {
    return [];
  },
  async receive(_sessionId, _ip, _port, _token, peerName, files): Promise<string[]> {
    files.forEach((f) => {
      webHistory.unshift({
        id: 'hist-' + Date.now(),
        fileName: f.name,
        fileSize: f.size,
        peerName,
        direction: 'received',
        timestamp: Date.now(),
      });
    });
    return files.map((f) => f.name);
  },
  async cancelReceive() {},
  onReceiveProgress() {
    return () => {};
  },

  async openFile() {},
  async revealFile() {},
  async notify() {},
  async copyText(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  },
};
