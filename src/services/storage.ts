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
    if (!value) return [];
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    // Filter out any legacy mock entries
    return parsed.filter(
      (item: any) =>
        item &&
        !item.id?.startsWith('tr-') &&
        !item.fileName?.includes('Sunset') &&
        !item.fileName?.includes('Drone_Footage') &&
        !item.fileName?.includes('Project_Design')
    );
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
  try {
    await Preferences.remove({ key: KEY });
    await Preferences.remove({ key: 'history' });
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('zapdrop_transfers');
      localStorage.removeItem('zapdrop_transfer_history');
      localStorage.removeItem('history');
    }
  } catch {}
}
