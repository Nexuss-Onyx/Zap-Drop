import React, { useState } from 'react';
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
} from 'lucide-react';
import { TransferRecord } from '../types';
import { formatFileSize } from '../services/mockNetwork';

interface TransferHistoryProps {
  transfers: TransferRecord[];
  onClearHistory: () => void;
  onDeleteTransfer: (id: string) => void;
  onResend: (record: TransferRecord) => void;
}

export const TransferHistory: React.FC<TransferHistoryProps> = ({
  transfers,
  onClearHistory,
  onDeleteTransfer,
  onResend,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');

  const filteredTransfers = transfers.filter((t) => {
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

  return (
    <div className="min-h-[calc(100vh-140px)] pb-28 pt-2 px-3 sm:px-6 max-w-2xl mx-auto space-y-4">
      
      {/* Header & Clear Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center p-1 rounded-2xl neu-pressed border border-white/5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'all' ? 'neu-raised text-[#22c55e]' : 'text-slate-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('sent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'sent' ? 'neu-raised text-[#22c55e]' : 'text-slate-400'
            }`}
          >
            <ArrowUpRight size={12} /> Sent
          </button>
          <button
            onClick={() => setFilterType('received')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'received' ? 'neu-raised text-[#22c55e]' : 'text-slate-400'
            }`}
          >
            <ArrowDownLeft size={12} /> Received
          </button>
        </div>

        {transfers.length > 0 && (
          <button
            onClick={onClearHistory}
            className="p-2 rounded-xl neu-pressed text-slate-400 hover:text-rose-400 text-xs"
            title="Clear history"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* History Items */}
      {filteredTransfers.length === 0 ? (
        <div className="p-10 text-center neu-pressed rounded-3xl border border-white/5 my-4">
          <History size={32} className="text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-300">No transfer history</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransfers.map((record) => {
            const isSent = record.direction === 'sent';
            const partnerName = isSent ? record.receiverName : record.senderName;
            const partnerAvatar = isSent ? record.receiverAvatar : record.senderAvatar;

            return (
              <div
                key={record.id}
                className="p-3 rounded-2xl neu-raised border border-white/5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center">
                      {getCategoryIcon(record.category)}
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 p-0.5 rounded-full ${
                        isSent ? 'bg-blue-500 text-white' : 'bg-[#22c55e] text-black'
                      }`}
                    >
                      {isSent ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{record.fileName}</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-mono text-[#22c55e]">{formatFileSize(record.fileSize)}</span>
                      <span>•</span>
                      <img src={partnerAvatar} alt={partnerName} className="w-3.5 h-3.5 rounded-full object-cover" />
                      <span className="truncate max-w-[100px]">{partnerName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onResend(record)}
                    className="p-2 rounded-xl neu-pressed text-slate-400 hover:text-[#22c55e]"
                    title="Send again"
                  >
                    <Share2 size={13} />
                  </button>
                  <button
                    onClick={() => onDeleteTransfer(record.id)}
                    className="p-2 rounded-xl neu-pressed text-slate-500 hover:text-rose-400"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
