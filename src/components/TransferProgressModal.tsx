import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { CheckCircle2, X, Download } from 'lucide-react';
import { TransferRecord } from '../types';
import { formatFileSize } from '../services/networkUtils';

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
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#4ade80', '#ffffff'],
        });
      } catch (err) {}
    }
  }, [currentTransfer?.status, currentTransfer?.progress]);

  if (!currentTransfer) return null;

  const isSent = currentTransfer.direction === 'sent';
  const isCompleted = currentTransfer.status === 'completed';
  const transferredBytes = Math.round((currentTransfer.fileSize * currentTransfer.progress) / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 15 }}
        className="w-full max-w-sm neu-raised rounded-3xl border border-white/10 p-6 bg-[#16181f]/95 shadow-2xl relative flex flex-col items-center text-center"
      >
        {/* Header Title */}
        <div className="flex items-center justify-between w-full pb-3 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-[#22c55e]' : 'bg-[#22c55e] animate-pulse'}`} />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {isCompleted ? 'Transfer Complete' : isSent ? 'Sending...' : 'Receiving...'}
            </h3>
          </div>
          {isCompleted && (
            <button
              onClick={onDismiss}
              className="w-7 h-7 rounded-full neu-pressed flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Sender & Receiver Avatars */}
        <div className="flex items-center justify-center gap-5 my-3">
          <div className="flex flex-col items-center">
            <img
              src={currentTransfer.senderAvatar}
              alt={currentTransfer.senderName}
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#22c55e]"
            />
            <span className="text-[10px] font-bold text-slate-300 mt-1 max-w-[80px] truncate">
              {currentTransfer.senderName}
            </span>
          </div>

          <div className="w-12 h-0.5 bg-gradient-to-r from-[#22c55e] to-blue-500 rounded-full" />

          <div className="flex flex-col items-center">
            <img
              src={currentTransfer.receiverAvatar}
              alt={currentTransfer.receiverName}
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500"
            />
            <span className="text-[10px] font-bold text-slate-300 mt-1 max-w-[80px] truncate">
              {currentTransfer.receiverName}
            </span>
          </div>
        </div>

        {/* File name & size */}
        <h4 className="text-xs font-bold text-white truncate max-w-[240px] mt-2" title={currentTransfer.fileName}>
          {currentTransfer.fileName}
        </h4>
        <div className="text-[11px] text-[#22c55e] font-mono mt-0.5 mb-4">
          {formatFileSize(transferredBytes)} / {formatFileSize(currentTransfer.fileSize)} ({Math.round(currentTransfer.progress)}%)
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 rounded-full neu-pressed p-0.5 mb-5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${currentTransfer.progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.25 }}
            className="h-full rounded-full bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.5)]"
          />
        </div>

        {/* Actions */}
        <div className="w-full flex gap-2">
          {!isCompleted ? (
            <button
              onClick={onCancel}
              className="w-full py-2.5 rounded-2xl neu-flat text-rose-400 hover:text-rose-300 text-xs font-bold"
            >
              Cancel
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  onDownloadCompleted(currentTransfer);
                  onDismiss();
                }}
                className="flex-1 py-2.5 rounded-2xl neu-flat text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <Download size={14} /> Save
              </button>
              <button
                onClick={onDismiss}
                className="flex-1 py-2.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black text-xs font-bold flex items-center justify-center gap-1 shadow-md"
              >
                <CheckCircle2 size={15} /> Done
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
