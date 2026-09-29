import { Preferences } from '@capacitor/preferences';

export interface HistoryItem {
  id: string;
  fileName: string;
  size: number;
  direction: 'sent' | 'received';
  peerName: string;
  at: number;
  status: 'done' | 'failed';
  filePath?: string;
  mimeType?: string;
}

const KEY = 'zapdrop_transfer_history';

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export async function addHistory(item: HistoryItem): Promise<void> {
  try {
    const all = await getHistory();
    all.unshift(item);
    await Preferences.set({ key: KEY, value: JSON.stringify(all.slice(0, 500)) });
  } catch (e) {
    console.error('Failed to save history', e);
  }
}

export async function clearHistory(): Promise<void> {
  await Preferences.remove({ key: KEY });
}
