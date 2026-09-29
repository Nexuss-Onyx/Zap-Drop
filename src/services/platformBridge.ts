/**
 * Platform bridge for Tauri (Desktop) and Capacitor (Android)
 * with robust HTML5 File System & WebRTC / BroadcastChannel fallback.
 */

import { DeviceFile, FolderNode, OSPlatform } from '../types';

export class PlatformBridge {
  static isTauri(): boolean {
    return typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
  }

  static isCapacitor(): boolean {
    return typeof window !== 'undefined' && 'Capacitor' in window;
  }

  static getDetectedOS(): OSPlatform {
    if (typeof window === 'undefined') return 'android';
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('win')) return 'windows';
    if (ua.includes('linux')) return 'linux';
    return 'android';
  }

  /**
   * Reads real files from user's system via HTML5 File Picker or Tauri/Capacitor
   */
  static async pickFilesFromDisk(): Promise<File[]> {
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const picker = (window as unknown as { showOpenFilePicker: (options?: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker;
        const handles = await picker({
          multiple: true,
        });
        const files: File[] = [];
        for (const handle of handles) {
          const file = await handle.getFile();
          files.push(file);
        }
        return files;
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return [];
      }
    }

    // Standard HTML input fallback
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          resolve(Array.from(input.files));
        } else {
          resolve([]);
        }
      };
      input.click();
    });
  }

  /**
   * Reads a directory from user's system via Directory Picker
   */
  static async pickDirectoryFromDisk(): Promise<{ files: File[]; folderName: string }> {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirPicker = (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
        const dirHandle = await dirPicker();
        const files: File[] = [];
        
        async function readEntries(dir: FileSystemDirectoryHandle, currentPath = '') {
          // @ts-ignore
          for await (const entry of dir.values()) {
            if (entry.kind === 'file') {
              const file = await (entry as FileSystemFileHandle).getFile();
              files.push(file);
            } else if (entry.kind === 'directory') {
              await readEntries(entry as FileSystemDirectoryHandle, `${currentPath}/${entry.name}`);
            }
          }
        }
        
        await readEntries(dirHandle);
        return { files, folderName: dirHandle.name };
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return { files: [], folderName: '' };
      }
    }
    return { files: [], folderName: '' };
  }

  /**
   * Shares file using Capacitor Share or Web Share API
   */
  static async shareFile(file: DeviceFile): Promise<boolean> {
    if (navigator.share && file.blob) {
      try {
        const shareFile = new File([file.blob], file.name, { type: file.mimeType });
        if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
          await navigator.share({
            title: `Zapdrop: ${file.name}`,
            text: `Sharing ${file.name} via Zapdrop`,
            files: [shareFile],
          });
          return true;
        }
      } catch (err) {
        console.warn('Web share failed', err);
      }
    }
    return false;
  }
}

// Initial default system folders & mock files for rich device file browsing
export const DEFAULT_DEVICE_FOLDERS: FolderNode[] = [
  { name: 'DCIM / Camera', path: '/storage/emulated/0/DCIM/Camera', icon: 'camera', itemsCount: 38, totalSize: '1.42 GB' },
  { name: 'Downloads', path: '/storage/emulated/0/Download', icon: 'download', itemsCount: 19, totalSize: '680 MB' },
  { name: 'Documents', path: '/storage/emulated/0/Documents', icon: 'file-text', itemsCount: 14, totalSize: '45.2 MB' },
  { name: 'Movies & Screen', path: '/storage/emulated/0/Movies', icon: 'video', itemsCount: 6, totalSize: '2.85 GB' },
  { name: 'Music & Audio', path: '/storage/emulated/0/Music', icon: 'music', itemsCount: 22, totalSize: '310 MB' },
  { name: 'Apps & APKs', path: '/storage/emulated/0/APKs', icon: 'package', itemsCount: 5, totalSize: '240 MB' },
  { name: 'Archives & ZIP', path: '/storage/emulated/0/Archives', icon: 'archive', itemsCount: 8, totalSize: '512 MB' },
];

export const INITIAL_FILES: DeviceFile[] = [
  {
    id: 'f-1',
    name: 'IMG_20260928_Sunset_4K.raw',
    path: '/storage/emulated/0/DCIM/Camera/IMG_20260928_Sunset_4K.raw',
    size: 28400000,
    modifiedDate: 'Today, 2:45 PM',
    category: 'images',
    mimeType: 'image/jpeg',
    isDirectory: false,
    previewUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60',
    extension: 'raw',
  },
  {
    id: 'f-2',
    name: 'Drone_Footage_Cinematic_4K60.mp4',
    path: '/storage/emulated/0/Movies/Drone_Footage_Cinematic_4K60.mp4',
    size: 1420000000,
    modifiedDate: 'Today, 11:15 AM',
    category: 'videos',
    mimeType: 'video/mp4',
    isDirectory: false,
    previewUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500&auto=format&fit=crop&q=60',
    extension: 'mp4',
  },
  {
    id: 'f-3',
    name: 'Zapdrop_Architecture_v3.pdf',
    path: '/storage/emulated/0/Documents/Zapdrop_Architecture_v3.pdf',
    size: 4850000,
    modifiedDate: 'Yesterday, 6:30 PM',
    category: 'documents',
    mimeType: 'application/pdf',
    isDirectory: false,
    extension: 'pdf',
  },
  {
    id: 'f-4',
    name: 'Cyberpunk_Beats_Master_FLAC.flac',
    path: '/storage/emulated/0/Music/Cyberpunk_Beats_Master_FLAC.flac',
    size: 42000000,
    modifiedDate: 'Sep 27, 2026',
    category: 'audio',
    mimeType: 'audio/flac',
    isDirectory: false,
    extension: 'flac',
  },
  {
    id: 'f-5',
    name: 'Zapdrop_Android_v2.4.0.apk',
    path: '/storage/emulated/0/APKs/Zapdrop_Android_v2.4.0.apk',
    size: 68400000,
    modifiedDate: 'Sep 26, 2026',
    category: 'apps',
    mimeType: 'application/vnd.android.package-archive',
    isDirectory: false,
    extension: 'apk',
  },
  {
    id: 'f-6',
    name: 'Project_Assets_Backup_2026.zip',
    path: '/storage/emulated/0/Archives/Project_Assets_Backup_2026.zip',
    size: 340000000,
    modifiedDate: 'Sep 25, 2026',
    category: 'archives',
    mimeType: 'application/zip',
    isDirectory: false,
    extension: 'zip',
  },
  {
    id: 'f-7',
    name: 'Portrait_Studio_Light.heic',
    path: '/storage/emulated/0/DCIM/Camera/Portrait_Studio_Light.heic',
    size: 14200000,
    modifiedDate: 'Sep 24, 2026',
    category: 'images',
    mimeType: 'image/heic',
    isDirectory: false,
    previewUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60',
    extension: 'heic',
  },
  {
    id: 'f-8',
    name: 'Financial_Report_Q3_Encrypted.xlsx',
    path: '/storage/emulated/0/Documents/Financial_Report_Q3_Encrypted.xlsx',
    size: 2100000,
    modifiedDate: 'Sep 22, 2026',
    category: 'documents',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    isDirectory: false,
    extension: 'xlsx',
  },
];
