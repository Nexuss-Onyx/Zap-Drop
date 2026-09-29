import { Share } from '@capacitor/share';
import { FileOpener } from '@capacitor-community/file-opener';
import { Capacitor } from '@capacitor/core';

export async function shareFile(uri: string, title: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    if (navigator.share) {
      await navigator.share({ title, url: uri });
    }
    return;
  }
  try {
    await Share.share({
      title,
      files: [uri],
      dialogTitle: 'Share with',
    });
  } catch (e) {
    console.warn('Share cancelled or failed', e);
  }
}

export async function openReceived(uri: string, mime: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    window.open(uri, '_blank');
    return;
  }
  try {
    await FileOpener.open({
      filePath: uri,
      contentType: mime,
    });
  } catch (e) {
    console.error('Failed to open file', e);
  }
}
