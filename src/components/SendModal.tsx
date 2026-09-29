import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { X, ChevronDown, ChevronUp, AlertCircle, Radio } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end">
      {/* Dimmed backdrop (only active when not collapsed) */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleAttemptClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal to Exit */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs neu-raised rounded-3xl border border-white/10 p-5 bg-[#171821] text-center shadow-2xl"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Stop Sharing?</h3>
              <p className="text-xs text-slate-400 mb-4">
                Other devices will no longer be able to scan and receive these files.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 rounded-2xl neu-flat text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Stay
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md"
                >
                  Yes, Exit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Bottom Sheet / Small-to-Medium Card */}
      <div className="w-full max-w-md mx-auto pointer-events-auto px-3 pb-24 z-10">
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            /* COLLAPSED FLOATING PILL */
            <motion.div
              key="collapsed"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={() => setIsCollapsed(false)}
              className="p-3 rounded-2xl neu-raised border border-[#2ee86f]/40 bg-[#16181f]/95 shadow-[0_8px_30px_rgba(0,0,0,0.8)] flex items-center justify-between cursor-pointer hover:border-[#2ee86f] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img
                    src={myProfile.avatar}
                    alt={myProfile.name}
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-[#2ee86f]"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#2ee86f] ring-2 ring-[#16181f] animate-pulse" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Broadcasting QR</span>
                    <span className="text-[10px] text-[#2ee86f] font-mono">({selectedFiles.length} files)</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Tap to expand and scan</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCollapsed(false);
                  }}
                  className="p-1.5 rounded-xl neu-pressed text-slate-300 hover:text-white"
                  title="Expand"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAttemptClose();
                  }}
                  className="p-1.5 rounded-xl neu-pressed text-slate-400 hover:text-rose-400"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ) : (
            /* EXPANDED MEDIUM BOTTOM CARD */
            <motion.div
              key="expanded"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="w-full neu-raised rounded-3xl border border-white/10 p-4 bg-[#16181f]/98 shadow-[0_12px_45px_rgba(0,0,0,0.9)] max-h-[72vh] flex flex-col items-center text-center overflow-y-auto"
            >
              {/* Header Action Bar: Collapse & Cancel/Close */}
              <div className="w-full flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2ee86f] animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Broadcasting on Network
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-1.5 rounded-xl neu-pressed text-slate-400 hover:text-white transition-colors"
                    title="Collapse"
                  >
                    <ChevronDown size={17} />
                  </button>
                  <button
                    onClick={handleAttemptClose}
                    className="p-1.5 rounded-xl neu-pressed text-slate-400 hover:text-rose-400 transition-colors"
                    title="Cancel & Exit"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* Profile details */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative shrink-0">
                  <img
                    src={myProfile.avatar}
                    alt={myProfile.name}
                    className="w-11 h-11 rounded-2xl object-cover ring-2 ring-[#2ee86f]"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#2ee86f] ring-2 ring-[#16181f]" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white">{myProfile.name}</div>
                  <div className="text-[11px] text-[#2ee86f] font-mono">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} file(s) • ${formatFileSize(totalSize)}`
                      : 'Hotspot ready'}
                  </div>
                </div>
              </div>

              {/* Centered QR Code */}
              <div className="p-3.5 bg-white rounded-2xl shadow-xl my-1">
                <QRCodeSVG
                  value={qrPayload}
                  size={155}
                  level="M"
                  fgColor="#121316"
                  bgColor="#ffffff"
                />
              </div>

              <p className="text-[11px] text-slate-300 font-medium mt-2">
                Scan with any receiving phone or desktop
              </p>

              {/* Footer controls: Collapse or Stop */}
              <div className="w-full flex gap-2 mt-3 pt-2 border-t border-white/5">
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="flex-1 py-2.5 rounded-2xl neu-flat text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Minimize
                </button>
                <button
                  onClick={handleAttemptClose}
                  className="flex-1 py-2.5 rounded-2xl neu-pressed text-xs font-bold text-rose-400 hover:text-rose-300"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
