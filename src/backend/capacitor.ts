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
import { ZapdropNative } from '../native/zapdrop-native';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { Clipboard } from '@capacitor/clipboard';
import { LocalNotifications } from '@capacitor/local-notifications';
import { pickAnyFiles } from '../services/picker';
import { downloadToDevice } from '../services/files';

const receiveProgressListeners = new Set<(p: Progress) => void>();

const toFileItem = (m: any): FileItem => ({
  id: m.id,
  name: m.name,
  size: m.size,
  mime: m.mime,
  kind: m.type === 'image' ? 'image' : m.type === 'video' ? 'video' : m.type === 'audio' ? 'audio' : m.type === 'doc' ? 'doc' : m.type === 'app' ? 'app' : 'other',
  folder: m.bucket || 'Storage',
  modified: m.modified || Date.now(),
  uri: m.uri,
  thumb: m.webPath || null,
});

async function getStoredDeviceId(): Promise<string> {
  const { value } = await Preferences.get({ key: 'deviceId' });
  if (value) return value;
  const newId = (await Device.getId()).identifier || crypto.randomUUID().replace(/-/g, '');
  await Preferences.set({ key: 'deviceId', value: newId });
  return newId;
}

export const capacitorBackend: ZapdropBackend = {
  platform: 'android',

  async getProfile(): Promise<Profile> {
    const id = await getStoredDeviceId();
    const info = await Device.getInfo();
    const { value: customName } = await Preferences.get({ key: 'deviceName' });
    const { value: avatar } = await Preferences.get({ key: 'avatar' });
    return {
      id,
      name: customName || info.name || info.model || 'Android Device',
      os: 'android',
      avatar: avatar || undefined,
    };
  },

  async setDeviceName(name: string) {
    await Preferences.set({ key: 'deviceName', value: name });
  },

  async getHistory() {
    const { value } = await Preferences.get({ key: 'zapdrop_transfer_history' });
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter(
            (t: any) =>
              t &&
              !t.id?.startsWith('tr-') &&
              !t.fileName?.includes('Sunset') &&
              !t.fileName?.includes('Drone_Footage')
          )
        : [];
    } catch {
      return [];
    }
  },

  async clearHistory() {
    await Preferences.remove({ key: 'zapdrop_transfer_history' });
    await Preferences.remove({ key: 'history' });
  },

  async scanLibrary() {
    const res = await ZapdropNative.listMedia({ limit: 1 });
    return res.total;
  },

  async loadFolders(): Promise<Folder[]> {
    const { buckets } = await ZapdropNative.listBuckets();
    return buckets.map((b) => ({
      name: b.name,
      count: b.count,
      size: 0,
    }));
  },

  async loadFiles({ kind = 'all', folder, query, page = 0 }) {
    const limit = 60;
    const offset = page * limit;
    const res = await ZapdropNative.listMedia({
      type: kind === 'all' ? undefined : (kind as any),
      bucket: folder,
      query,
      limit,
      offset,
    });
    return {
      items: res.items.map(toFileItem),
      total: res.total,
    };
  },

  async addFiles(): Promise<FileItem[]> {
    const picked = await pickAnyFiles();
    return picked.map((p) => ({
      id: p.id,
      name: p.name,
      size: p.size,
      mime: p.mimeType,
      kind: 'other',
      folder: 'Added',
      modified: Date.now(),
      uri: p.nativeUri || p.path,
      thumb: p.previewUrl || null,
    }));
  },

  async addDroppedPaths(): Promise<FileItem[]> {
    return [];
  },

  async getThumbnail(item: FileItem) {
    return item.thumb || null;
  },

  async getNetworkStatus(): Promise<NetworkStatus> {
    const status = await Network.getStatus();
    const { ip } = await ZapdropNative.getLocalIp();
    return {
      ready: !!ip,
      suggestedIp: ip || null,
      ssid: status.connectionType === 'wifi' ? 'Wi-Fi Network' : null,
      interfaces: ip
        ? [{ name: 'wlan0', ip, likelyHotspot: ip.startsWith('192.168.43.') || ip.startsWith('192.168.49.'), virtual: false }]
        : [],
    };
  },

  async connectWifi() {},

  async startSend(files: FileItem[], ip?: string): Promise<SendSession> {
    const token = crypto.randomUUID().replace(/-/g, '');
    const sendFiles = files.map((f) => ({
      id: f.id,
      uri: f.uri || f.path || '',
      name: f.name,
      size: f.size,
      mime: f.mime,
    }));
    const profile = await this.getProfile();
    const res = await ZapdropNative.startServer({
      token,
      deviceName: profile.name,
      deviceId: profile.id,
      files: sendFiles,
    });
    const chosenIp = ip || res.ip;
    const code = `${chosenIp}:${res.port}:${token}`;
    const qrPayload = JSON.stringify({
      v: 1,
      ip: chosenIp,
      port: res.port,
      token,
      name: profile.name,
      deviceId: profile.id,
      files: files.map((f) => ({ id: f.id, name: f.name, size: f.size, mime: f.mime })),
    });

    return {
      ip: chosenIp,
      port: res.port,
      token,
      code,
      qrPayload,
      files: files.map((f) => ({ id: f.id, name: f.name, size: f.size, mime: f.mime })),
    };
  },

  async stopSend() {
    await ZapdropNative.stopServer();
  },

  onSendProgress(cb) {
    let handle: any = null;
    ZapdropNative.addListener('fileServed', (d) => {
      cb({ id: d.id, sent: d.bytes, total: d.total });
    }).then((h) => {
      handle = h;
    });
    return () => handle?.remove();
  },

  onSendDone(cb) {
    let handle: any = null;
    ZapdropNative.addListener('transferDone', (d) => {
      cb(d.peerIp);
    }).then((h) => {
      handle = h;
    });
    return () => handle?.remove();
  },

  onIncomingRequest() {
    return () => {};
  },

  async answerRequest() {},

  async startDiscovery() {
    const p = await this.getProfile();
    await ZapdropNative.startDiscovery({ deviceId: p.id, name: p.name });
  },

  async stopDiscovery() {
    await ZapdropNative.stopDiscovery();
  },

  onPeerFound(cb: (p: Peer) => void): Unsub {
    let handle: any = null;
    ZapdropNative.addListener('deviceFound', (d) => {
      cb({ id: d.id, name: d.name, ip: d.ip, port: d.port, platform: 'android' });
    }).then((h) => {
      handle = h;
    });
    return () => handle?.remove();
  },

  onPeerLost(cb: (id: string) => void): Unsub {
    let handle: any = null;
    ZapdropNative.addListener('deviceLost', (d) => {
      cb(d.id);
    }).then((h) => {
      handle = h;
    });
    return () => handle?.remove();
  },

  async requestAccess(peer: Peer): Promise<string> {
    try {
      const profile = await this.getProfile();
      const res = await fetch(`http://${peer.ip}:${peer.port}/hello?name=${encodeURIComponent(profile.name)}&id=${encodeURIComponent(profile.id)}`);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.token) return data.token;
      }
    } catch {}
    return 'no-token';
  },

  async fetchManifest(ip: string, port: number, token: string): Promise<RemoteFile[]> {
    try {
      const res = await fetch(`http://${ip}:${port}/manifest?t=${encodeURIComponent(token)}`);
      if (res.ok) return await res.json();
    } catch {}
    const fallbackRes = await fetch(`http://${ip}:${port}/manifest`);
    if (!fallbackRes.ok) throw new Error('HTTP_' + fallbackRes.status);
    return fallbackRes.json();
  },

  async receive(_sessionId, ip, port, token, _peerName, files): Promise<string[]> {
    const saved: string[] = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const url = `http://${ip}:${port}/file/${encodeURIComponent(file.id)}?t=${encodeURIComponent(token)}`;
      const path = await downloadToDevice(url, file.name, (loaded, total) => {
        const progress: Progress = {
          fileId: file.id,
          fileName: file.name,
          loaded,
          total: total || file.size,
          fileIndex: index,
          fileCount: files.length,
          speedBps: 0,
        };
        receiveProgressListeners.forEach((listener) => listener(progress));
      });
      saved.push(path);
    }
    await fetch(`http://${ip}:${port}/done?t=${encodeURIComponent(token)}`).catch(() => {});
    return saved;
  },

  async cancelReceive() {},

  onReceiveProgress(cb: (p: Progress) => void) {
    receiveProgressListeners.add(cb);
    return () => receiveProgressListeners.delete(cb);
  },

  async openFile() {},
  async revealFile() {},

  async notify(title: string, body: string) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 100000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      });
    } catch {}
  },

  async copyText(text: string) {
    await Clipboard.write({ string: text });
  },
};
