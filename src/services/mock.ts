import { Capacitor } from '@capacitor/core';
import { DeviceFile, FolderNode, DeviceProfile } from '../types';

export const USE_MOCK = !Capacitor.isNativePlatform();

export const MOCK_FOLDERS: FolderNode[] = [
  { name: 'Camera', path: '/DCIM/Camera', icon: 'camera', itemsCount: 42, totalSize: '1.2 GB' },
  { name: 'Downloads', path: '/Download', icon: 'download', itemsCount: 19, totalSize: '480 MB' },
  { name: 'Documents', path: '/Documents', icon: 'file-text', itemsCount: 14, totalSize: '24 MB' },
  { name: 'Movies', path: '/Movies', icon: 'video', itemsCount: 6, totalSize: '2.8 GB' },
  { name: 'Music', path: '/Music', icon: 'music', itemsCount: 35, totalSize: '310 MB' },
  { name: 'Screenshots', path: '/DCIM/Screenshots', icon: 'image', itemsCount: 28, totalSize: '95 MB' },
];

export const MOCK_FILES: DeviceFile[] = [
  {
    id: 'f1',
    name: 'IMG_20260928_4K_Sunset.jpg',
    path: '/DCIM/Camera/IMG_20260928_4K_Sunset.jpg',
    size: 6420000,
    modifiedDate: '2 hours ago',
    category: 'images',
    mimeType: 'image/jpeg',
    isDirectory: false,
    previewUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80',
    extension: 'jpg',
  },
  {
    id: 'f2',
    name: 'Project_Architecture_Blueprint.pdf',
    path: '/Documents/Project_Architecture_Blueprint.pdf',
    size: 2450000,
    modifiedDate: 'Yesterday',
    category: 'documents',
    mimeType: 'application/pdf',
    isDirectory: false,
    extension: 'pdf',
  },
  {
    id: 'f3',
    name: 'Synthwave_Master_Audio.flac',
    path: '/Music/Synthwave_Master_Audio.flac',
    size: 34500000,
    modifiedDate: '3 days ago',
    category: 'audio',
    mimeType: 'audio/flac',
    isDirectory: false,
    extension: 'flac',
  },
  {
    id: 'f4',
    name: 'Drone_4K_Reel_2026.mp4',
    path: '/Movies/Drone_4K_Reel_2026.mp4',
    size: 145000000,
    modifiedDate: 'Sep 24',
    category: 'videos',
    mimeType: 'video/mp4',
    isDirectory: false,
    previewUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    extension: 'mp4',
  },
  {
    id: 'f5',
    name: 'Zapdrop_Beta_v2.0.apk',
    path: '/Download/Zapdrop_Beta_v2.0.apk',
    size: 18200000,
    modifiedDate: 'Sep 22',
    category: 'apps',
    mimeType: 'application/vnd.android.package-archive',
    isDirectory: false,
    extension: 'apk',
  },
];

export const MOCK_RADAR_DEVICES: DeviceProfile[] = [
  {
    id: 'radar-1',
    name: 'Galaxy Ultra S25',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    os: 'android',
    signalStrength: 95,
    status: 'online',
  },
  {
    id: 'radar-2',
    name: 'MacBook Pro M3 Max',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    os: 'macos',
    signalStrength: 88,
    status: 'online',
  },
  {
    id: 'radar-3',
    name: 'Pixel 9 Pro XL',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    os: 'android',
    signalStrength: 72,
    status: 'online',
  },
];
