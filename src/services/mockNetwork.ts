import { DeviceProfile, TransferRecord } from '../types';

export const DEFAULT_SAMPLE_PEERS: DeviceProfile[] = [
  {
    id: 'peer-s24',
    name: "Galaxy S24 Ultra",
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    os: 'android',
    signalStrength: 98,
    status: 'online',
  },
  {
    id: 'peer-macbook',
    name: "MacBook Pro",
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    os: 'macos',
    signalStrength: 92,
    status: 'online',
  },
  {
    id: 'peer-win-rig',
    name: 'Desktop PC',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    os: 'windows',
    signalStrength: 84,
    status: 'online',
  },
  {
    id: 'peer-pixel',
    name: 'Pixel 9 Pro',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    os: 'android',
    signalStrength: 76,
    status: 'online',
  }
];

export const INITIAL_TRANSFERS: TransferRecord[] = [
  {
    id: 'tr-1',
    fileName: 'IMG_Sunset_4K.jpg',
    fileSize: 28400000,
    fileType: 'image/jpeg',
    category: 'images',
    senderId: 'self',
    senderName: 'My Device',
    senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    senderOs: 'android',
    receiverId: 'peer-macbook',
    receiverName: 'MacBook Pro',
    receiverAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    receiverOs: 'macos',
    direction: 'sent',
    timestamp: Date.now() - 1000 * 60 * 18,
    dateLabel: 'Today, 3:10 PM',
    status: 'completed',
    progress: 100,
    speedMbps: 48.5,
  },
  {
    id: 'tr-2',
    fileName: 'Drone_Footage.mp4',
    fileSize: 1420000000,
    fileType: 'video/mp4',
    category: 'videos',
    senderId: 'peer-s24',
    senderName: "Galaxy S24 Ultra",
    senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    senderOs: 'android',
    receiverId: 'self',
    receiverName: 'My Device',
    receiverAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    receiverOs: 'android',
    direction: 'received',
    timestamp: Date.now() - 1000 * 60 * 140,
    dateLabel: 'Today, 1:05 PM',
    status: 'completed',
    progress: 100,
    speedMbps: 62.1,
  },
  {
    id: 'tr-3',
    fileName: 'Project_Design.pdf',
    fileSize: 4850000,
    fileType: 'application/pdf',
    category: 'documents',
    senderId: 'self',
    senderName: 'My Device',
    senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    senderOs: 'android',
    receiverId: 'peer-win-rig',
    receiverName: 'Desktop PC',
    receiverAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    receiverOs: 'windows',
    direction: 'sent',
    timestamp: Date.now() - 1000 * 60 * 60 * 26,
    dateLabel: 'Yesterday, 4:20 PM',
    status: 'completed',
    progress: 100,
    speedMbps: 54.0,
  }
];

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

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
