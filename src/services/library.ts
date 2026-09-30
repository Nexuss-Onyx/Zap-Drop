import { Capacitor } from '@capacitor/core';
import { ZapdropNative, NativeMediaType } from '../native/zapdrop-native';
import { DeviceFile, FileCategory, FolderNode } from '../types';
import { backend, isTauri } from '../backend';
import { formatFileSize } from './networkUtils';

function getFolderIcon(name: string): FolderNode['icon'] {
  const n = name.toLowerCase();
  if (n.includes('camera')) return 'camera';
  if (n.includes('download')) return 'download';
  if (n.includes('video') || n.includes('movie')) return 'video';
  if (n.includes('music') || n.includes('audio')) return 'music';
  if (n.includes('screenshot') || n.includes('picture') || n.includes('photo')) return 'image';
  if (n.includes('document') || n.includes('doc')) return 'file-text';
  return 'folder';
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
  itemCount?: number;
  extension?: string;
}

export async function listDeviceDirectory(path?: string): Promise<{ path: string; items: DirectoryEntry[] }> {
  if (isTauri) {
    try {
      const b = await backend();
      if (b.listDirectory) {
        const res = await b.listDirectory(path);
        return {
          path: res.path,
          items: res.items || [],
        };
      }
    } catch (e) {
      console.warn('Tauri list_directory error:', e);
      return { path: path || '', items: [] };
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const res = await ZapdropNative.listDirectory({ path });
      return {
        path: res.path,
        items: res.items || [],
      };
    } catch (e) {
      console.warn('Failed to list directory', e);
      return { path: path || '', items: [] };
    }
  }

  // Web desktop fallback with zero mock data
  return { path: path || '', items: [] };
}

export async function loadFolders(): Promise<FolderNode[]> {
  if (isTauri) {
    try {
      const b = await backend();
      const folders = await b.loadFolders();
      if (folders && folders.length > 0) {
        return folders.map((f) => ({
          name: f.name,
          path: f.name,
          icon: getFolderIcon(f.name),
          itemsCount: f.count,
          totalSize: f.size > 0 ? formatFileSize(f.size) : `${f.count} files`,
        }));
      }
      return [];
    } catch (e) {
      console.warn('Tauri loadFolders error:', e);
      return [];
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const { buckets } = await ZapdropNative.listBuckets();
      if (buckets && buckets.length > 0) {
        return buckets.map((b) => ({
          name: b.name,
          path: b.path || b.name,
          icon: getFolderIcon(b.name),
          itemsCount: b.count,
          totalSize: `${b.count} files`,
        }));
      }
      return [];
    } catch (e) {
      console.warn('Failed to list native buckets', e);
      return [];
    }
  }

  return [];
}

export async function loadFiles(
  category: FileCategory = 'all',
  bucket?: string,
  query?: string,
  page = 0
): Promise<DeviceFile[]> {
  if (isTauri) {
    try {
      const b = await backend();
      let kind: any = 'all';
      if (category === 'images') kind = 'image';
      else if (category === 'videos') kind = 'video';
      else if (category === 'audio') kind = 'audio';
      else if (category === 'documents') kind = 'doc';
      else if (category === 'apps') kind = 'app';
      else if (category === 'archives') kind = 'archive';

      const res = await b.loadFiles({
        kind,
        folder: bucket || undefined,
        query: query || undefined,
        page,
      });

      return await Promise.all(
        res.items.map(async (item) => {
          let mappedCategory: FileCategory = 'documents';
          if (item.kind === 'image') mappedCategory = 'images';
          else if (item.kind === 'video') mappedCategory = 'videos';
          else if (item.kind === 'audio') mappedCategory = 'audio';
          else if (item.kind === 'app') mappedCategory = 'apps';
          else if (item.kind === 'archive') mappedCategory = 'archives';

          let previewUrl = item.thumb || undefined;
          if (!previewUrl && (item.kind === 'image' || item.kind === 'video')) {
            try {
              previewUrl = (await b.getThumbnail(item)) || undefined;
            } catch {}
          }

          const ext = item.name.includes('.') ? item.name.split('.').pop() || '' : '';

          return {
            id: item.id,
            name: item.name,
            path: item.path || item.name,
            size: item.size,
            modifiedDate: new Date(item.modified).toLocaleDateString(),
            category: mappedCategory,
            mimeType: item.mime,
            isDirectory: false,
            previewUrl,
            extension: ext,
          };
        })
      );
    } catch (e) {
      console.warn('Tauri loadFiles error:', e);
      return [];
    }
  }

  if (!Capacitor.isNativePlatform()) {
    return [];
  }

  let nativeType: NativeMediaType = 'all';
  if (category === 'images') nativeType = 'image';
  else if (category === 'videos') nativeType = 'video';
  else if (category === 'audio') nativeType = 'audio';
  else if (category === 'documents') nativeType = 'doc';
  else if (category === 'apps') nativeType = 'app';

  try {
    const { items } = await ZapdropNative.listMedia({
      type: nativeType,
      bucket,
      query,
      limit: 60,
      offset: page * 60,
    });

    if (!items || items.length === 0) {
      return [];
    }

    return items.map((i) => {
      let mappedCategory: FileCategory = 'documents';
      if (i.type === 'image') mappedCategory = 'images';
      else if (i.type === 'video') mappedCategory = 'videos';
      else if (i.type === 'audio') mappedCategory = 'audio';
      else if (i.type === 'app') mappedCategory = 'apps';

      const ext = i.name.includes('.') ? i.name.split('.').pop() || '' : '';

      return {
        id: i.id,
        name: i.name,
        path: i.webPath || i.uri,
        size: i.size,
        modifiedDate: new Date(i.modified).toLocaleDateString(),
        category: mappedCategory,
        mimeType: i.mime,
        isDirectory: false,
        previewUrl: i.type === 'image' || i.type === 'video'
          ? (i.webPath ? Capacitor.convertFileSrc(i.webPath) : i.uri)
          : undefined,
        extension: ext,
      };
    });
  } catch (e) {
    console.warn('Failed to list native media', e);
    return [];
  }
}

