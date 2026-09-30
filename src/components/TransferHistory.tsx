import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  History,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Package,
  Archive,
  Trash2,
  Share2,
  FolderOpen,
} from 'lucide-react';
import { TransferRecord } from '../types';
import { formatFileSize } from '../services/networkUtils';
import { getHistory, clearHistory, HistoryItem } from '../services/storage';
import { openReceived, shareFile } from '../services/share';

interface TransferHistoryProps {
  transfers: TransferRecord[];
  onClearHistory: () => void;
  onDeleteTransfer: (id: string) => void;
  onResend: (record: TransferRecord) => void;
}

export const TransferHistory: React.FC<TransferHistoryProps> = ({
  transfers: initialTransfers,
  onClearHistory,
  onDeleteTransfer,
  onResend,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    getHistory().then((items) => {
      setHistoryItems(items);
    });
  }, []);

  const handleClear = async () => {
    await clearHistory();
    setHistoryItems([]);
    onClearHistory();
  };

  // Only real history items from device transfers
  const combinedHistory = historyItems.map((h) => ({
    id: h.id,
    fileName: h.fileName,
    fileSize: h.size,
    fileType: h.mimeType || 'file',
    category: (h.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i)
      ? 'images'
      : h.fileName.match(/\.(mp4|mkv|mov|avi|3gp)$/i)
      ? 'videos'
      : h.fileName.match(/\.(mp3|wav|flac|m4a|aac)$/i)
      ? 'audio'
      : h.fileName.match(/\.apk$/i)
      ? 'apps'
      : 'documents') as TransferRecord['category'],
    senderId: h.direction === 'sent' ? 'me' : 'peer',
    senderName: h.direction === 'sent' ? 'Me' : h.peerName,
    senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    senderOs: 'android' as const,
    receiverId: h.direction === 'received' ? 'me' : 'peer',
    receiverName: h.direction === 'received' ? 'Me' : h.peerName,
    receiverAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    receiverOs: 'android' as const,
    direction: h.direction,
    timestamp: h.at,
    dateLabel: new Date(h.at).toLocaleDateString(),
    status: 'completed' as const,
    progress: 100,
    speedMbps: 45.8,
    filePath: h.filePath,
  }));

  const filteredTransfers = combinedHistory.filter((t) => {
    if (filterType !== 'all' && t.direction !== filterType) return false;
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'images':
        return <ImageIcon size={16} className="text-emerald-400" />;
      case 'videos':
        return <Film size={16} className="text-purple-400" />;
      case 'audio':
        return <Music size={16} className="text-pink-400" />;
      case 'apps':
        return <Package size={16} className="text-green-400" />;
      case 'archives':
        return <Archive size={16} className="text-amber-400" />;
      default:
        return <FileText size={16} className="text-blue-400" />;
    }
  };

  const handleOpenOrShare = async (item: typeof combinedHistory[0]) => {
    if (item.filePath) {
      await openReceived(item.filePath, item.fileType);
    } else {
      await shareFile(item.fileName, item.fileName);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] pb-28 pt-2 px-3 sm:px-6 max-w-2xl mx-auto space-y-4">
      
      {/* Header & Clear Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={18} className="text-[#22c55e]" />
          <h2 className="text-sm font-bold text-white">Transfer History</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
            {filteredTransfers.length}
          </span>
        </div>

        {filteredTransfers.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-2xl neu-pressed border border-white/5">
        {(['all', 'sent', 'received'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
              filterType === type
                ? 'neu-raised text-[#22c55e] border border-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Transfer List */}
      {filteredTransfers.length === 0 ? (
        <div className="p-8 rounded-3xl neu-pressed text-center text-slate-400 space-y-2">
          <History size={32} className="mx-auto text-slate-600" />
          <p className="text-xs font-medium">No transfer records found</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTransfers.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl neu-raised border border-white/5 flex items-center justify-between gap-3 hover:border-white/15 transition-all"
            >
              {/* Left icon & info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center shrink-0">
                  {getCategoryIcon(item.category)}
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate">
                    {item.fileName}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-0.5 font-medium">
                      {item.direction === 'sent' ? (
                        <>
                          <ArrowUpRight size={11} className="text-[#22c55e]" />
                          <span>Sent to {item.receiverName}</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownLeft size={11} className="text-[#3b82f6]" />
                          <span>From {item.senderName}</span>
                        </>
                      )}
                    </span>
                    <span>•</span>
                    <span>{formatFileSize(item.fileSize)}</span>
                    <span>•</span>
                    <span>{item.dateLabel}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleOpenOrShare(item)}
                  className="p-2 rounded-xl neu-raised hover:text-[#22c55e] text-slate-400 transition-all cursor-pointer"
                  title="Open or Share"
                >
                  <FolderOpen size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

    </div>
  );
};
