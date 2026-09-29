import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, AlertCircle, Smartphone, Monitor } from 'lucide-react';
import { DeviceProfile, OSPlatform } from '../types';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  myProfile: DeviceProfile;
  peers: DeviceProfile[];
  onConnectDevice: (device: DeviceProfile) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isOpen,
  onClose,
  myProfile,
  peers,
  onConnectDevice,
  isCollapsed,
  setIsCollapsed,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [connectingPeerId, setConnectingPeerId] = useState<string | null>(null);

  if (!isOpen) return null;

  const getOsIcon = (os: OSPlatform) => {
    switch (os) {
      case 'android':
      case 'ios':
        return <Smartphone size={9} className="text-[#2ee86f]" />;
      default:
        return <Monitor size={9} className="text-[#3b82f6]" />;
    }
  };

  const handleAttemptClose = () => {
    setShowExitConfirm(true);
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    setIsCollapsed(false);
    onClose();
  };

  const handleSelectDevice = (peer: DeviceProfile) => {
    setConnectingPeerId(peer.id);
    setTimeout(() => {
      onConnectDevice(peer);
      onClose();
    }, 500);
  };

  // 4 well-scattered quadrant positions around center
  const quadrantOffsets = [
    { x: -55, y: -46 }, // Top-Left
    { x: 55, y: -46 },  // Top-Right
    { x: -52, y: 44 },  // Bottom-Left
    { x: 52, y: 44 },   // Bottom-Right
  ];

  return (
    <>
      {/* Small Confirmation Popup */}
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
              <h3 className="text-xs font-bold text-white mb-1">Stop Scanning?</h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Stop discovering nearby devices.
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
                  Stop
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Docked Modal or Collapsed Action Button - Hovering Right Above Nav Bar */}
      <div className="fixed bottom-[52px] left-0 right-0 z-30 pointer-events-none flex flex-col items-center">
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            /* COLLAPSED BUTTON: EXACT 280PX WIDTH, HOVERING JUST A BIT ABOVE NAV */
            <motion.div
              key="receive-collapsed-button"
              initial={{ opacity: 0, y: 15, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              onClick={() => setIsCollapsed(false)}
              className="w-[280px] pointer-events-auto p-2.5 px-3.5 rounded-2xl neu-raised border border-[#2ee86f]/40 bg-[#16181f]/98 shadow-[0_6px_25px_rgba(0,0,0,0.85)] flex items-center justify-between cursor-pointer group hover:border-[#2ee86f] transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2ee86f]" />
                <span className="text-xs font-bold text-white group-hover:text-[#2ee86f] transition-colors">
                  Tap to view Devices ({peers.length})
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
            /* EXPANDED FULL RADAR CARD: CLEAN, NO PULSE, WITH COLLAPSE & CLOSE AT TOP RIGHT */
            <motion.div
              key="receive-expanded-card"
              initial={{ opacity: 0, y: 25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 25, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="w-[280px] pointer-events-auto neu-raised rounded-3xl border border-white/10 p-3 bg-[#16181f]/98 shadow-[0_8px_35px_rgba(0,0,0,0.9)] flex flex-col items-center text-center backdrop-blur-md"
            >
              {/* Header Bar with Static Indicator + Collapse and Close Buttons at Right */}
              <div className="w-full flex items-center justify-between pb-1 border-b border-white/5 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2ee86f]" />
                  <span className="text-[10px] font-bold text-slate-300">
                    Nearby Devices ({peers.length})
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-1 rounded-lg neu-pressed text-slate-400 hover:text-white transition-colors"
                    title="Collapse"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    onClick={handleAttemptClose}
                    className="p-1 rounded-lg neu-pressed text-slate-400 hover:text-rose-400 transition-colors"
                    title="Close"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Clean Scattered Radar Canvas without pulses */}
              <div className="relative w-44 h-44 flex items-center justify-center my-1 overflow-visible">
                {/* Clean Static Radar Rings */}
                <div className="absolute w-40 h-40 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute w-28 h-28 rounded-full border border-white/10 pointer-events-none" />
                <div className="absolute w-16 h-16 rounded-full border border-[#2ee86f]/20 pointer-events-none" />

                {/* Center Self Device */}
                <div className="relative z-10 w-9 h-9 rounded-full neu-raised border-2 border-[#2ee86f] flex flex-col items-center justify-center p-0.5 shadow-md">
                  <img
                    src={myProfile.avatar}
                    alt={myProfile.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="text-[6px] font-bold text-white max-w-[30px] truncate text-center leading-none">
                    You
                  </span>
                </div>

                {/* Scattered Non-overlapping Orbiting Devices in 4 Quadrants */}
                {peers.slice(0, 4).map((peer, idx) => {
                  const offset = quadrantOffsets[idx % quadrantOffsets.length];
                  const isConnecting = connectingPeerId === peer.id;

                  return (
                    <motion.div
                      key={peer.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{
                        x: offset.x,
                        y: offset.y,
                        opacity: 1,
                        scale: 1,
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25, delay: idx * 0.04 }}
                      className="absolute z-20 flex flex-col items-center"
                    >
                      <button
                        onClick={() => handleSelectDevice(peer)}
                        className="flex flex-col items-center group cursor-pointer focus:outline-none"
                      >
                        <div className="relative">
                          <img
                            src={peer.avatar}
                            alt={peer.name}
                            className={`w-7 h-7 rounded-full object-cover border-2 ${
                              isConnecting
                                ? 'border-[#2ee86f] ring-2 ring-[#2ee86f]'
                                : 'border-white/20 group-hover:border-[#2ee86f]'
                            } shadow-md transition-all`}
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-[#121316]">
                            {getOsIcon(peer.os)}
                          </div>
                        </div>
                        <span className="text-[7px] font-semibold text-slate-200 mt-0.5 max-w-[50px] truncate px-1 rounded bg-[#121316]/90 border border-white/10 group-hover:text-[#2ee86f] transition-colors">
                          {peer.name.split(' ')[0]}
                        </span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-[9px] text-slate-400 mt-0.5">
                Tap any device above to connect & receive
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
