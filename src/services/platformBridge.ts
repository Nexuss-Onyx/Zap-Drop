/**
 * Platform bridge for Capacitor (Android 5.1+) and Tauri/Web
 * Seamlessly connects to real native services on device with robust web fallback.
 */

import { DeviceFile, FolderNode, OSPlatform } from '../types';
import { pickAnyFiles } from './picker';
import { loadFiles, loadFolders } from './library';
import { getDeviceProfile } from './device';
import { Capacitor } from '@capacitor/core';

export class PlatformBridge {
  static isTauri(): boolean {
    return typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
  }

  static isCapacitor(): boolean {
    return Capacitor.isNativePlatform();
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
   * Reads real files from user's system via Capacitor FilePicker or HTML5 File Picker
   */
  static async pickFilesFromDisk(): Promise<DeviceFile[]> {
    return pickAnyFiles();
  }

  static async getRealFolders(): Promise<FolderNode[]> {
    return loadFolders();
  }

  static async getRealFiles(category?: string): Promise<DeviceFile[]> {
    return loadFiles((category as unknown as Parameters<typeof loadFiles>[0]) || 'all');
  }

  static async getNativeProfile() {
    return getDeviceProfile();
  }
}

export const INITIAL_FILES: DeviceFile[] = [];
