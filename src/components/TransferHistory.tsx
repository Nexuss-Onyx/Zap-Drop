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
  Download,
  Share2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Monitor,
  Sparkles,
  Layers,
} from 'lucide-react';
import { TransferRecord, OSPlatform } from '../types';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTransfers = transfers.filter((t) => {
    if (filterType !== 'all' && t.direction !== filterType) return false;
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.fileName.toLowerCase().includes(q) ||
        t.senderName.toLowerCase().includes(q) ||
        t.receiverName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by date label
  const groupedTransfers: { [dateLabel: string]: TransferRecord[] } = {};
  filteredTransfers.forEach((t) => {
    const key = t.dateLabel.split(',')[0];
    if (!groupedTransfers[key]) {
      groupedTransfers[key] = [];
    }
    groupedTransfers[key].push(t);
  });

  const totalBytesTransferred = transfers.reduce((sum, t) => sum + t.fileSize, 0);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'images':
        return <ImageIcon size={18} className="text-emerald-400" />;
      case 'videos':
        return <Film size={18} className="text-purple-400" />;
      case 'audio':
        return <Music size={18} className="text-pink-400" />;
      case 'apps':
        return <Package size={18} className="text-green-400" />;
      case 'archives':
        return <Archive size={18} className="text-amber-400" />;
      default:
        return <FileText size={18} className="text-blue-400" />;
    }
  };

  const getOsIcon = (os: OSPlatform) => {
    switch (os) {
      case 'android':
      case 'ios':
        return <Smartphone size={12} className="text-[#22c55e]" />;
      default:
        return <Monitor size={12} className="text-[#3b82f6]" />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] pb-28 pt-2 px-3 sm:px-6 max-w-4xl mx-auto">
      
      {/* Header Summary & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="p-4 rounded-2xl neu-raised border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#22c55e]/15 text-[#22c55e] flex items-center justify-center neu-pressed">
            <History size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-400">Total Transfers</div>
            <div className="text-lg font-black text-white">{transfers.length} Files</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl neu-raised border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center neu-pressed">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-400">Bandwidth Shared</div>
            <div className="text-lg font-black text-white font-mono">{formatFileSize(totalBytesTransferred)}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl neu-raised border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Average P2P Speed</div>
            <div className="text-lg font-black text-[#22c55e] font-mono">56.2 MB/s</div>
          </div>
          {transfers.length > 0 && (
            <button
              onClick={onClearHistory}
              className="p-2 rounded-xl neu-pressed text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
              title="Clear transfer logs"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        {/* Direction Filter */}
        <div className="flex items-center p-1 rounded-2xl neu-pressed border border-white/5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'all' ? 'neu-raised text-[#22c55e]' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setFilterType('sent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'sent' ? 'neu-raised text-[#22c55e]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight size={13} /> Sent
          </button>
          <button
            onClick={() => setFilterType('received')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'received' ? 'neu-raised text-[#22c55e]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft size={13} /> Received
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by file name or sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-2xl neu-pressed text-xs text-white placeholder-slate-500 border border-white/5 focus:border-[#22c55e]/40 outline-none"
          />
        </div>
      </div>

      {/* Transfer History List Grouped by Date */}
      {filteredTransfers.length === 0 ? (
        <div className="p-12 text-center neu-pressed rounded-3xl border border-white/5 my-4">
          <History size={36} className="text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">No transfer history found</p>
          <p className="text-xs text-slate-500 mt-1">Sent and received files will automatically appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransfers).map(([dateLabel, records]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{dateLabel}</span>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] text-slate-500">{records.length} items</span>
              </div>

              <div className="space-y-2.5">
                {records.map((record) => {
                  const isSent = record.direction === 'sent';
                  const partnerName = isSent ? record.receiverName : record.senderName;
                  const partnerAvatar = isSent ? record.receiverAvatar : record.senderAvatar;
                  const partnerOs = isSent ? record.receiverOs : record.senderOs;

                  return (
                    <motion.div
                      key={record.id}
                      whileHover={{ scale: 1.008 }}
                      className="p-3.5 rounded-2xl neu-raised border border-white/5 hover:border-[#22c55e]/30 flex items-center justify-between gap-3 group transition-all"
                    >
                      {/* Left: Direction badge & File icon */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-xl neu-pressed flex items-center justify-center">
                            {getCategoryIcon(record.category)}
                          </div>
                          <div
                            className={`absolute -bottom-1 -right-1 p-0.5 rounded-full ${
                              isSent ? 'bg-blue-500 text-white' : 'bg-[#22c55e] text-black'
                            }`}
                          >
                            {isSent ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                          </div>
                        </div>

                        {/* File & Partner Details */}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                            {record.fileName}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono text-[#22c55e]">{formatFileSize(record.fileSize)}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1 text-slate-300">
                              <img
                                src={partnerAvatar}
                                alt={partnerName}
                                className="w-3.5 h-3.5 rounded-full object-cover"
                              />
                              <span className="truncate max-w-[110px]">{partnerName}</span>
                              {getOsIcon(partnerOs)}
                            </div>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline text-slate-500">{record.dateLabel.split(',')[1]}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Transfer Speed & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                            <CheckCircle2 size={12} className="text-[#22c55e]" />
                            <span>{record.speedMbps.toFixed(1)} MB/s</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Wi-Fi Direct P2P</div>
                        </div>

                        <button
                          onClick={() => onResend(record)}
                          className="p-2 rounded-xl neu-pressed text-slate-400 hover:text-[#22c55e] transition-colors"
                          title="Share / Send Again"
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteTransfer(record.id)}
                          className="p-2 rounded-xl neu-pressed text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete from history"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
