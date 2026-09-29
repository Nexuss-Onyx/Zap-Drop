import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { backend, isTauri } from '../backend';

export interface DeviceProfileData {
  id: string;
  name: string;
  avatar: string;
  os: string;
  model: string;
  isOnline: boolean;
}

export async function getDeviceProfile(): Promise<DeviceProfileData> {
  if (isTauri) {
    try {
      const b = await backend();
      const p = await b.getProfile();
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        os: p.os,
        model: p.os === 'macos' ? 'MacBook / Mac' : p.os === 'windows' ? 'Windows PC' : 'Linux Workstation',
        isOnline: true,
      };
    } catch (e) {
      console.warn('Tauri getProfile error:', e);
    }
  }

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
  if (isTauri) {
    try {
      const b = await backend();
      await b.setDeviceName(name);
      return;
    } catch {}
  }
  await Preferences.set({ key: 'deviceName', value: name.trim() });
}

export async function setAvatar(avatarUrl: string): Promise<void> {
  await Preferences.set({ key: 'avatar', value: avatarUrl });
}
