import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  X,
  Pause,
  Play,
  Share2,
  Download,
  Smartphone,
  Monitor,
  Zap,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react';
import { TransferRecord, OSPlatform } from '../types';
import { formatFileSize } from '../services/mockNetwork';

interface TransferProgressModalProps {
  currentTransfer: TransferRecord | null;
  onCancel: () => void;
  onDismiss: () => void;
  onDownloadCompleted: (record: TransferRecord) => void;
}

export const TransferProgressModal: React.FC<TransferProgressModalProps> = ({
  currentTransfer,
  onCancel,
  onDismiss,
  onDownloadCompleted,
}) => {
  useEffect(() => {
    if (currentTransfer && currentTransfer.status === 'completed' && currentTransfer.progress === 100) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#4ade80', '#ffffff', '#15803d'],
        });
      } catch (err) {
        console.warn('Confetti error', err);
      }
    }
  }, [currentTransfer?.status, currentTransfer?.progress]);

  if (!currentTransfer) return null;

  const isSent = currentTransfer.direction === 'sent';
  const isCompleted = currentTransfer.status === 'completed';

  const getOsIcon = (os: OSPlatform) => {
    switch (os) {
      case 'android':
      case 'ios':
        return <Smartphone size={13} className="text-[#22c55e]" />;
      default:
        return <Monitor size={13} className="text-[#3b82f6]" />;
    }
  };

  const transferredBytes = Math.round((currentTransfer.fileSize * currentTransfer.progress) / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md neu-raised rounded-3xl border border-white/10 p-6 bg-[#16181f]/95 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative overflow-hidden"
      >
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#22c55e]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCompleted ? 'bg-[#22c55e]' : 'bg-[#22c55e] animate-ping'
              }`}
            />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {isCompleted
                ? isSent
                  ? 'Transfer Complete!'
                  : 'File Received Successfully!'
                : isSent
                ? 'Sending to Device...'
                : 'Receiving from Device...'}
            </h3>
          </div>
          {isCompleted && (
            <button
              onClick={onDismiss}
              className="w-7 h-7 rounded-full neu-pressed flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Device P2P Visual Beam (Sender -> Receiver) */}
        <div className="my-5 p-4 rounded-2xl neu-pressed flex items-center justify-between relative overflow-hidden">
          {/* Sender */}
          <div className="flex flex-col items-center z-10">
            <div className="relative">
              <img
                src={currentTransfer.senderAvatar}
                alt={currentTransfer.senderName}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#22c55e]"
              />
              <div className="absolute -bottom-1 -right-1 p-0.5 rounded-md bg-[#121316]">
                {getOsIcon(currentTransfer.senderOs)}
              </div>
            </div>
            <span className="text-[10px] font-bold text-white mt-1 max-w-[90px] truncate text-center">
              {currentTransfer.senderName.split(' ')[0]}
            </span>
          </div>

          {/* Transfer beam animation */}
          <div className="flex-1 mx-3 flex flex-col items-center relative">
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
              {!isCompleted ? (
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#22c55e] to-transparent shadow-[0_0_10px_rgba(34,197,94,1)]"
                />
              ) : (
                <div className="w-full h-full bg-[#22c55e]" />
              )}
            </div>
            <div className="mt-2 px-2.5 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 font-mono text-[10px] font-bold flex items-center gap-1">
              <Zap size={10} className="fill-[#22c55e]" />
              <span>{isCompleted ? '58.4 MB/s' : `${currentTransfer.speedMbps.toFixed(1)} MB/s`}</span>
            </div>
          </div>

          {/* Receiver */}
          <div className="flex flex-col items-center z-10">
            <div className="relative">
              <img
                src={currentTransfer.receiverAvatar}
                alt={currentTransfer.receiverName}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500"
              />
              <div className="absolute -bottom-1 -right-1 p-0.5 rounded-md bg-[#121316]">
                {getOsIcon(currentTransfer.receiverOs)}
              </div>
            </div>
            <span className="text-[10px] font-bold text-white mt-1 max-w-[90px] truncate text-center">
              {currentTransfer.receiverName.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* File Name and Size Info */}
        <div className="text-center mb-4">
          <h4 className="text-sm font-bold text-white truncate max-w-xs mx-auto" title={currentTransfer.fileName}>
            {currentTransfer.fileName}
          </h4>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-1 font-mono">
            <span>{formatFileSize(transferredBytes)}</span>
            <span>/</span>
            <span className="text-slate-200">{formatFileSize(currentTransfer.fileSize)}</span>
            <span className="text-[#22c55e] font-bold">({Math.round(currentTransfer.progress)}%)</span>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-3 rounded-full neu-pressed p-0.5 mb-5 relative overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${currentTransfer.progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.3 }}
            className="h-full rounded-full bg-gradient-to-r from-[#16a34a] to-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.6)]"
          />
        </div>

        {/* Action Controls */}
        <div className="flex gap-2.5">
          {!isCompleted ? (
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-2xl neu-flat text-rose-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <X size={15} /> Cancel Transfer
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  onDownloadCompleted(currentTransfer);
                  onDismiss();
                }}
                className="flex-1 py-3 rounded-2xl neu-flat text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Download size={15} /> Save / Open
              </button>
              <button
                onClick={onDismiss}
                className="flex-1 py-3 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black text-xs font-bold shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center gap-1.5 transition-all"
              >
                <CheckCircle2 size={16} className="stroke-[2.5]" /> Done
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
