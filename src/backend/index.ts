import { Capacitor } from '@capacitor/core';

export type Kind = 'all' | 'image' | 'video' | 'audio' | 'doc' | 'app';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  mime: string;
  kind: Kind | 'archive' | 'other';
  folder: string;
  modified: number;
  path?: string;            // desktop only
  uri?: string;             // android only
  thumb?: string | null;    // url usable in <img src>
}

export interface Folder {
  name: string;
  count: number;
  size: number;
}

export interface Profile {
  id: string;
  name: string;
  os: string;
  avatar?: string;
}

export interface NetworkStatus {
  ready: boolean;
  suggestedIp: string | null;
  ssid: string | null;
  interfaces: { name: string; ip: string; likelyHotspot: boolean; virtual: boolean }[];
}

export interface SendSession {
  ip: string;
  port: number;
  token: string;
  code: string;             // "ip:port:token"
  qrPayload: string;        // JSON string to encode in the QR
  files: { id: string; name: string; size: number; mime: string }[];
}

export interface Peer {
  id: string;
  name: string;
  ip: string;
  port: number;
  platform: string;
}

export interface RemoteFile {
  id: string;
  name: string;
  size: number;
  mime: string;
}

export interface Progress {
  fileId: string;
  fileName: string;
  loaded: number;
  total: number;
  fileIndex: number;
  fileCount: number;
  speedBps: number;
}

export type Unsub = () => void;

export interface ZapdropBackend {
  readonly platform: 'android' | 'windows' | 'macos' | 'linux' | 'web';

  // profile / settings / history
  getProfile(): Promise<Profile>;
  setDeviceName(name: string): Promise<void>;
  getHistory(): Promise<any[]>;
  clearHistory(): Promise<void>;

  // library
  scanLibrary(): Promise<number>;
  loadFolders(): Promise<Folder[]>;
  loadFiles(q: { kind?: Kind; folder?: string; query?: string; page?: number }): Promise<{ items: FileItem[]; total: number }>;
  listDirectory?(path?: string): Promise<{ path: string; items: any[] }>;
  addFiles(): Promise<FileItem[]>;                       // native picker
  addDroppedPaths(paths: string[]): Promise<FileItem[]>; // desktop drag & drop
  getThumbnail(item: FileItem): Promise<string | null>;

  // network
  getNetworkStatus(): Promise<NetworkStatus>;
  connectWifi(ssid: string, password: string): Promise<void>;

  // send
  startSend(files: FileItem[], ip?: string): Promise<SendSession>;
  stopSend(): Promise<void>;
  onSendProgress(cb: (p: { id: string; sent: number; total: number }) => void): Unsub;
  onSendDone(cb: (peerIp: string) => void): Unsub;
  onIncomingRequest(cb: (r: { requestId: string; name: string; ip: string }) => void): Unsub;
  answerRequest(requestId: string, accept: boolean): Promise<void>;

  // receive
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  onPeerFound(cb: (p: Peer) => void): Unsub;
  onPeerLost(cb: (id: string) => void): Unsub;
  requestAccess(peer: Peer): Promise<string>;                                   // returns token
  fetchManifest(ip: string, port: number, token: string): Promise<RemoteFile[]>;
  receive(sessionId: string, ip: string, port: number, token: string,
          peerName: string, files: RemoteFile[]): Promise<string[]>;            // saved paths
  cancelReceive(sessionId: string): Promise<void>;
  onReceiveProgress(cb: (p: Progress) => void): Unsub;

  // after transfer
  openFile(path: string): Promise<void>;
  revealFile(path: string): Promise<void>;
  notify(title: string, body: string): Promise<void>;
  copyText(text: string): Promise<void>;
}

// ---- runtime picker ----
export const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
export const isAndroid = typeof window !== 'undefined' && (Capacitor?.isNativePlatform?.() ?? false);

let cached: ZapdropBackend | null = null;
export async function backend(): Promise<ZapdropBackend> {
  if (cached) return cached;
  if (isTauri) {
    const mod = await import('./tauri');
    cached = mod.tauriBackend;
  } else if (isAndroid) {
    const mod = await import('./capacitor');
    cached = mod.capacitorBackend;
  } else {
    const mod = await import('./web');
    cached = mod.webBackend;
  }
  return cached;
}
