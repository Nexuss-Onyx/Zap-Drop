import {
  ZapdropBackend,
  FileItem,
  Folder,
  Profile,
  NetworkStatus,
  SendSession,
  Peer,
  RemoteFile,
  Progress,
  Unsub,
} from './index';
import { MOCK_FILES, MOCK_FOLDERS } from '../services/mock';
import { AVATAR_PRESETS, DEFAULT_SAMPLE_PEERS } from '../services/mockNetwork';

function toFileItem(f: any): FileItem {
  let kind: FileItem['kind'] = 'other';
  if (f.category === 'images') kind = 'image';
  else if (f.category === 'videos') kind = 'video';
  else if (f.category === 'audio') kind = 'audio';
  else if (f.category === 'documents') kind = 'doc';
  else if (f.category === 'apps') kind = 'app';
  else if (f.category === 'archives') kind = 'archive';

  return {
    id: f.id,
    name: f.name,
    size: f.size,
    mime: f.mimeType,
    kind,
    folder: f.path ? f.path.split('/')[1] || 'Downloads' : 'Downloads',
    modified: Date.now() - 3600000,
    path: f.path,
    thumb: f.previewUrl || null,
  };
}

let mockItems: FileItem[] = MOCK_FILES.map(toFileItem);
let mockProfile: Profile = {
  id: 'mock-desktop-01',
  name: 'Studio Workstation',
  os: 'linux',
  avatar: AVATAR_PRESETS[0],
};
let mockHistory: any[] = [];

export const mockBackend: ZapdropBackend = {
  platform: 'web',

  async getProfile() {
    return { ...mockProfile };
  },
  async setDeviceName(name: string) {
    mockProfile.name = name;
  },
  async getHistory() {
    return [...mockHistory];
  },
  async clearHistory() {
    mockHistory = [];
  },

  async scanLibrary() {
    return mockItems.length;
  },
  async loadFolders(): Promise<Folder[]> {
    return MOCK_FOLDERS.map((f) => ({
      name: f.name,
      count: f.itemsCount,
      size: parseInt(f.totalSize) * 1024 * 1024 || 1024 * 1024,
    }));
  },
  async loadFiles({ kind = 'all', folder, query, page = 0 }) {
    let filtered = mockItems;
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
  async addFiles(): Promise<FileItem[]> {
    return [];
  },
  async addDroppedPaths(paths: string[]): Promise<FileItem[]> {
    const newItems: FileItem[] = paths.map((p, idx) => ({
      id: 'drop-' + Date.now() + '-' + idx,
      name: p.split(/[\\/]/).pop() || 'file',
      size: 1024 * 1024,
      mime: 'application/octet-stream',
      kind: 'other',
      folder: 'Added',
      modified: Date.now(),
      path: p,
      thumb: null,
    }));
    mockItems = [...newItems, ...mockItems];
    return newItems;
  },
  async getThumbnail(item: FileItem) {
    return item.thumb || null;
  },

  async getNetworkStatus(): Promise<NetworkStatus> {
    return {
      ready: true,
      suggestedIp: '192.168.43.15',
      ssid: 'Pixel-Hotspot',
      interfaces: [
        { name: 'wlan0', ip: '192.168.43.15', likelyHotspot: true, virtual: false },
      ],
    };
  },
  async connectWifi(_ssid: string, _password: string) {
    // mock connect
  },

  async startSend(files: FileItem[], ip?: string): Promise<SendSession> {
    const chosenIp = ip || '192.168.43.15';
    const port = 48556;
    const token = 'mocktoken' + Math.random().toString(36).substring(2, 8);
    const code = `${chosenIp}:${port}:${token}`;
    const payload = JSON.stringify({
      v: 1,
      ip: chosenIp,
      port,
      token,
      name: mockProfile.name,
      deviceId: mockProfile.id,
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
  onPeerFound(cb: (p: Peer) => void): Unsub {
    const t = setTimeout(() => {
      DEFAULT_SAMPLE_PEERS.forEach((peer, i) => {
        cb({
          id: peer.id,
          name: peer.name,
          ip: `192.168.43.${20 + i}`,
          port: 48556,
          platform: peer.os,
        });
      });
    }, 400);
    return () => clearTimeout(t);
  },
  onPeerLost() {
    return () => {};
  },
  async requestAccess() {
    return 'mocktoken' + Math.random().toString(36).substring(2, 8);
  },
  async fetchManifest(_ip: string, _port: number, _token: string): Promise<RemoteFile[]> {
    return [
      { id: 'rf1', name: 'Shared_Photo.jpg', size: 3450000, mime: 'image/jpeg' },
      { id: 'rf2', name: 'Document_v2.pdf', size: 1250000, mime: 'application/pdf' },
    ];
  },
  async receive(_sessionId, _ip, _port, _token, peerName, files): Promise<string[]> {
    files.forEach((f) => {
      mockHistory.unshift({
        id: 'hist-' + Date.now(),
        fileName: f.name,
        fileSize: f.size,
        peerName,
        direction: 'received',
        timestamp: Date.now(),
      });
    });
    return files.map((f) => `/Downloads/Zapdrop/${f.name}`);
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
