import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Check, X, ShieldAlert } from 'lucide-react';
import { backend } from '../backend';

export interface IncomingRequestData {
  requestId: string;
  name: string;
  deviceId?: string;
  ip: string;
}

interface IncomingRequestModalProps {
  request: IncomingRequestData | null;
  onDecide: (requestId: string, accept: boolean) => void;
}

export const IncomingRequestModal: React.FC<IncomingRequestModalProps> = ({
  request,
  onDecide,
}) => {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs pointer-events-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-[320px] neu-raised rounded-3xl border border-white/10 p-5 bg-[#171821] text-center shadow-2xl space-y-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#2ee86f]/15 text-[#2ee86f] flex items-center justify-center mx-auto border border-[#2ee86f]/20 shadow-[0_0_20px_rgba(46,232,111,0.2)]">
          <Smartphone size={24} />
        </div>

        <div>
          <h3 className="text-sm font-bold text-white mb-1">Incoming File Request</h3>
          <p className="text-xs text-slate-300">
            <span className="font-semibold text-[#2ee86f]">{request.name}</span> ({request.ip}) wants to receive your selected files.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => onDecide(request.requestId, false)}
            className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <X size={14} />
            <span>Decline</span>
          </button>
          <button
            onClick={() => onDecide(request.requestId, true)}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#39f07c] text-black font-bold text-xs shadow-[0_0_20px_rgba(46,232,111,0.35)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check size={14} className="stroke-[2.5]" />
            <span>Accept</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
