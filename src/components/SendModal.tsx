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
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  selectedFiles,
  hotspotState,
  myProfile,
  isCollapsed,
  setIsCollapsed,
}) => {
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
    <>
      {/* Small Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-[250px] neu-raised rounded-3xl border border-white/10 p-4 bg-[#171821] text-center shadow-2xl"
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

      {/* Floating directly over and above the nav bar */}
      <div className="fixed bottom-[84px] left-0 right-0 z-30 pointer-events-none flex flex-col items-center">
        <motion.div
          layout
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="w-[280px] pointer-events-auto neu-raised rounded-3xl border border-white/10 bg-[#16181f]/98 shadow-[0_12px_40px_rgba(0,0,0,0.95)] backdrop-blur-md overflow-hidden"
        >
          {isCollapsed ? (
            /* COLLAPSED BUTTON VIEW - CHEVRON UP ON LEFT */
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 px-3.5 flex items-center justify-between cursor-pointer group hover:border-[#2ee86f] transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg neu-pressed text-[#2ee86f]">
                  <ChevronUp size={13} />
                </div>
                <span className="text-xs font-bold text-white group-hover:text-[#2ee86f] transition-colors">
                  Tap to view QR Code
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAttemptClose();
                }}
                className="p-1 rounded-lg neu-pressed text-slate-400 hover:text-rose-400 transition-colors"
                title="Exit"
              >
                <X size={13} />
              </button>
            </motion.div>
          ) : (
            /* EXPANDED FULL CARD VIEW */
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="p-3 flex flex-col items-center text-center"
            >
              {/* Header Bar with Collapse Button at Left, Title, and Close Button at Right */}
              <div className="w-full flex items-center justify-between pb-1 border-b border-white/5 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-1 rounded-lg neu-pressed text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Collapse down"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <span className="text-[10px] font-bold text-slate-300">
                    Scan to Receive
                  </span>
                </div>

                <button
                  onClick={handleAttemptClose}
                  className="p-1 rounded-lg neu-pressed text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Profile & Files line */}
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src={myProfile.avatar}
                  alt={myProfile.name}
                  className="w-7 h-7 rounded-xl object-cover ring-1 ring-[#2ee86f]"
                />
                <div className="text-left">
                  <div className="text-[11px] font-bold text-white leading-tight">{myProfile.name}</div>
                  <div className="text-[9px] text-[#2ee86f] font-mono">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} file(s) • ${formatFileSize(totalSize)}`
                      : 'Hotspot Ready'}
                  </div>
                </div>
              </div>

              {/* Small Clean QR Code */}
              <div className="p-2 bg-white rounded-2xl shadow-lg my-0.5">
                <QRCodeSVG
                  value={qrPayload}
                  size={115}
                  level="M"
                  fgColor="#121316"
                  bgColor="#ffffff"
                />
              </div>

              <p className="text-[9px] text-slate-400 mt-1">
                Scan with receiver device camera
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  );
};
