import { Capacitor } from '@capacitor/core';
import { ZapdropNative, NativeMediaType } from '../native/zapdrop-native';
import { DeviceFile, FileCategory, FolderNode } from '../types';
import { MOCK_FILES, MOCK_FOLDERS, USE_MOCK } from './mock';
import { backend, isTauri } from '../backend';
import { formatFileSize } from './mockNetwork';

export async function loadFolders(): Promise<FolderNode[]> {
  if (isTauri) {
    try {
      const b = await backend();
      const folders = await b.loadFolders();
      if (folders && folders.length > 0) {
        return folders.map((f) => ({
          name: f.name,
          path: f.name,
          icon: f.name.toLowerCase().includes('picture') || f.name.toLowerCase().includes('photo')
            ? 'image'
            : f.name.toLowerCase().includes('download')
            ? 'download'
            : f.name.toLowerCase().includes('video') || f.name.toLowerCase().includes('movie')
            ? 'video'
            : f.name.toLowerCase().includes('music') || f.name.toLowerCase().includes('audio')
            ? 'music'
            : f.name.toLowerCase().includes('screenshot')
            ? 'image'
            : f.name.toLowerCase().includes('document')
            ? 'file-text'
            : 'folder',
          itemsCount: f.count,
          totalSize: f.size > 0 ? formatFileSize(f.size) : `${f.count} files`,
        }));
      }
    } catch (e) {
      console.warn('Tauri loadFolders error:', e);
    }
  }

  if (USE_MOCK) {
    return MOCK_FOLDERS;
  }

  try {
    const { buckets } = await ZapdropNative.listBuckets();
    return buckets.map((b) => ({
      name: b.name,
      path: b.path,
      icon: b.name.toLowerCase().includes('camera')
        ? 'camera'
        : b.name.toLowerCase().includes('download')
        ? 'download'
        : b.name.toLowerCase().includes('video') || b.name.toLowerCase().includes('movie')
        ? 'video'
        : b.name.toLowerCase().includes('music') || b.name.toLowerCase().includes('audio')
        ? 'music'
        : 'folder',
      itemsCount: b.count,
      totalSize: `${b.count} files`,
    }));
  } catch (e) {
    console.warn('Failed to list native buckets, using fallback', e);
    return MOCK_FOLDERS;
  }
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
    }
  }

  if (USE_MOCK) {
    let filtered = [...MOCK_FILES];
    if (category !== 'all') {
      filtered = filtered.filter((f) => f.category === category);
    }
    if (query) {
      filtered = filtered.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
    }
    return filtered;
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
        previewUrl: i.type === 'image' || i.type === 'video' ? Capacitor.convertFileSrc(i.webPath) : undefined,
        extension: ext,
      };
    });
  } catch (e) {
    console.warn('Failed to list native media, falling back', e);
    return MOCK_FILES;
  }
}
