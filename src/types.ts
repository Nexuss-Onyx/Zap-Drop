export type OSPlatform = 'android' | 'macos' | 'windows' | 'linux' | 'ios';

export interface DeviceProfile {
  id: string;
  name: string;
  avatar: string;
  avatarColor: string;
  os: OSPlatform;
  model: string;
  ipAddress: string;
  isHost: boolean;
  signalStrength: number; // in percentage e.g. 95%
  status: 'online' | 'busy' | 'pairing';
  lastSeen?: number;
}

export type FileCategory = 'all' | 'images' | 'videos' | 'audio' | 'documents' | 'apps' | 'archives';

export interface DeviceFile {
  id: string;
  name: string;
  path: string;
  size: number; // in bytes
  modifiedDate: string;
  category: FileCategory;
  mimeType: string;
  isDirectory: boolean;
  previewUrl?: string;
  blob?: Blob;
  extension: string;
}

export interface FolderNode {
  name: string;
  path: string;
  icon: string;
  itemsCount: number;
  totalSize: string;
}

export interface TransferRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  category: FileCategory;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderOs: OSPlatform;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  receiverOs: OSPlatform;
  direction: 'sent' | 'received';
  timestamp: number;
  dateLabel: string;
  status: 'transferring' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 - 100
  speedMbps: number;
  timeRemainingSec?: number;
  blobUrl?: string;
}

export interface HotspotState {
  enabled: boolean;
  ssid: string;
  password: string;
  band: '5GHz' | '2.4GHz';
  ipAddress: string;
  port: number;
  connectedClients: number;
}

export type ActiveTab = 'files' | 'history' | 'profile' | 'hotspot';
