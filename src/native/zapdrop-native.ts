import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export type NativeMediaType = 'all' | 'image' | 'video' | 'audio' | 'doc' | 'app';

export interface NativeMediaItem {
  id: string;            // MediaStore id
  uri: string;           // content:// or file:// uri
  webPath: string;       // for <img src> via convertFileSrc
  name: string;
  size: number;
  mime: string;
  type: NativeMediaType;
  bucket: string;        // "Camera", "Download", ...
  modified: number;      // epoch ms
}

export interface NativeBucket {
  name: string;
  path: string;
  count: number;
}

export interface ZapdropNativePlugin {
  listBuckets(): Promise<{ buckets: NativeBucket[] }>;
  listMedia(opts: {
    type?: NativeMediaType;
    bucket?: string;
    limit?: number;
    offset?: number;
    query?: string;
  }): Promise<{ items: NativeMediaItem[]; total: number }>;

  getLocalIp(): Promise<{ ip: string | null }>;

  startServer(opts: {
    token: string;
    files: { id: string; uri: string; name: string; size: number; mime: string }[];
  }): Promise<{ ip: string; port: number }>;
  stopServer(): Promise<void>;

  startDiscovery(opts: { deviceId: string; name: string }): Promise<void>;
  stopDiscovery(): Promise<void>;

  addListener(
    e: 'deviceFound',
    cb: (d: { id: string; name: string; ip: string; port: number }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    e: 'deviceLost',
    cb: (d: { id: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    e: 'fileServed',
    cb: (d: { id: string; bytes: number; total: number }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    e: 'transferDone',
    cb: (d: { peerIp: string }) => void
  ): Promise<PluginListenerHandle>;
}

export const ZapdropNative = registerPlugin<ZapdropNativePlugin>('ZapdropNative');
