import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface DeviceProfileData {
  id: string;
  name: string;
  avatar: string;
  os: string;
  model: string;
  isOnline: boolean;
}

export async function getDeviceProfile(): Promise<DeviceProfileData> {
  if (!Capacitor.isNativePlatform()) {
    const savedName = (await Preferences.get({ key: 'deviceName' })).value;
    const savedAvatar = (await Preferences.get({ key: 'avatar' })).value;
    return {
      id: 'web-device-' + Math.floor(Math.random() * 1000),
      name: savedName || 'My Device',
      avatar: savedAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      os: 'Web Platform',
      model: 'Browser Client',
      isOnline: true,
    };
  }

  const info = await Device.getInfo();
  const { identifier } = await Device.getId();
  const savedName = (await Preferences.get({ key: 'deviceName' })).value;
  const savedAvatar = (await Preferences.get({ key: 'avatar' })).value;

  const defaultName = info.name && info.name !== 'unknown' 
    ? info.name 
    : `${info.manufacturer || 'Android'} ${info.model || 'Device'}`.trim();

  return {
    id: identifier,
    name: savedName || defaultName,
    avatar: savedAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    os: `${info.platform} ${info.osVersion}`,
    model: info.model,
    isOnline: true,
  };
}

export async function setDeviceName(name: string): Promise<void> {
  await Preferences.set({ key: 'deviceName', value: name.trim() });
}

export async function setAvatar(avatarUrl: string): Promise<void> {
  await Preferences.set({ key: 'avatar', value: avatarUrl });
}
