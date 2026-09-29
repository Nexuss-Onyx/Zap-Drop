import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { DeviceFile, DeviceProfile, HotspotState } from '../types';
import { formatFileSize } from '../services/mockNetwork';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles: DeviceFile[];
  hotspotState: HotspotState;
  myProfile: DeviceProfile;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  selectedFiles,
  hotspotState,
  myProfile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  if (!isOpen) return null;

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  const qrPayload = `WIFI:T:WPA;S:${hotspotState.ssid};P:${hotspotState.password};;`;

  const handleAttemptClose = () => {
    setShowExitConfirm(true);
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    setIsCollapsed(false);
    onClose();
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 pointer-events-none flex flex-col items-center px-4">
      {/* Small Confirmation Popup */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-[260px] neu-raised rounded-3xl border border-white/10 p-4 bg-[#171821] text-center shadow-2xl"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-2">
                <AlertCircle size={18} />
              </div>
              <h3 className="text-xs font-bold text-white mb-1">Stop Sharing?</h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Other devices will stop receiving.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-1.5 rounded-xl neu-flat text-[11px] font-semibold text-slate-300 hover:text-white"
                >
                  Stay
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold"
                >
                  Exit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Small Compact Card - Slides & Fades from Down to Up */}
      <div className="w-full max-w-[320px] pointer-events-auto">
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            /* COLLAPSED PILL */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, y: 25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-2xl neu-raised border border-[#2ee86f]/40 bg-[#16181f]/95 shadow-[0_8px_30px_rgba(0,0,0,0.85)] flex items-center justify-between cursor-pointer hover:border-[#2ee86f] transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <img
                    src={myProfile.avatar}
                    alt={myProfile.name}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-[#2ee86f]"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#2ee86f] animate-pulse" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-white">QR Broadcast Active</div>
                  <div className="text-[10px] text-slate-400">Tap to expand</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCollapsed(false);
                  }}
                  className="p-1 rounded-lg neu-pressed text-slate-300 hover:text-white"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAttemptClose();
                  }}
                  className="p-1 rounded-lg neu-pressed text-slate-400 hover:text-rose-400"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ) : (
            /* COMPACT SMALL CARD */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 35, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 25, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              className="w-full neu-raised rounded-3xl border border-white/10 p-3.5 bg-[#16181f]/98 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col items-center text-center backdrop-blur-md"
            >
              {/* Header Bar */}
              <div className="w-full flex items-center justify-between pb-1.5 border-b border-white/5 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2ee86f] animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-300">
                    Scan to Receive
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-1 rounded-lg neu-pressed text-slate-400 hover:text-white"
                    title="Minimize"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={handleAttemptClose}
                    className="p-1 rounded-lg neu-pressed text-slate-400 hover:text-rose-400"
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Profile & Files line */}
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={myProfile.avatar}
                  alt={myProfile.name}
                  className="w-8 h-8 rounded-xl object-cover ring-1 ring-[#2ee86f]"
                />
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-tight">{myProfile.name}</div>
                  <div className="text-[10px] text-[#2ee86f] font-mono">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} file(s) • ${formatFileSize(totalSize)}`
                      : 'Hotspot Ready'}
                  </div>
                </div>
              </div>

              {/* Small QR Code */}
              <div className="p-2.5 bg-white rounded-2xl shadow-lg my-1">
                <QRCodeSVG
                  value={qrPayload}
                  size={120}
                  level="M"
                  fgColor="#121316"
                  bgColor="#ffffff"
                />
              </div>

              <p className="text-[10px] text-slate-400 mt-1.5">
                Scan with any device camera or receiver
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
