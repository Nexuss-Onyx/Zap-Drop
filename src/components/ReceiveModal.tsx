import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, ChevronUp, AlertCircle, Smartphone, Monitor } from 'lucide-react';
import { DeviceProfile, OSPlatform } from '../types';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  myProfile: DeviceProfile;
  peers: DeviceProfile[];
  onConnectDevice: (device: DeviceProfile) => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isOpen,
  onClose,
  myProfile,
  peers,
  onConnectDevice,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [connectingPeerId, setConnectingPeerId] = useState<string | null>(null);

  if (!isOpen) return null;

  const getOsIcon = (os: OSPlatform) => {
    switch (os) {
      case 'android':
      case 'ios':
        return <Smartphone size={11} className="text-[#2ee86f]" />;
      default:
        return <Monitor size={11} className="text-[#3b82f6]" />;
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
    }, 600);
  };

  // Compute non-overlapping scattered orbital positions based on peer count
  const count = peers.length;
  // Size scales down responsively as count increases to prevent overlap
  const avatarSizeClass =
    count <= 2 ? 'w-11 h-11' : count <= 4 ? 'w-9 h-9' : 'w-8 h-8';

  const getScatterPosition = (index: number, total: number) => {
    // Multi-ring staggered distribution ensuring zero collision
    const baseRadius = total <= 3 ? 65 : 72;
    const radiusVariation = index % 2 === 0 ? 0 : 16;
    const r = baseRadius + radiusVariation;
    const angleStep = (2 * Math.PI) / Math.max(total, 1);
    const angle = index * angleStep - Math.PI / 2 + (index % 2 === 1 ? 0.3 : -0.2);
    
    return {
      x: Math.round(Math.cos(angle) * r),
      y: Math.round(Math.sin(angle) * r),
    };
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end">
      {/* Dimmed backdrop */}
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

      {/* Confirmation to Exit Scan */}
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
              <h3 className="text-sm font-bold text-white mb-1">Stop Scanning?</h3>
              <p className="text-xs text-slate-400 mb-4">
                You will stop searching for nearby devices.
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
                  Stop
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Bottom Sheet / Medium Radar Card */}
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
                <div className="w-8 h-8 rounded-xl bg-[#2ee86f]/20 text-[#2ee86f] flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2ee86f] animate-ping" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Scanning Network</span>
                    <span className="text-[10px] text-[#2ee86f]">({peers.length} found)</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Tap to expand radar</div>
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
            /* EXPANDED RADAR CARD */
            <motion.div
              key="expanded"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="w-full neu-raised rounded-3xl border border-white/10 p-4 bg-[#16181f]/98 shadow-[0_12px_45px_rgba(0,0,0,0.9)] max-h-[76vh] flex flex-col items-center text-center overflow-y-auto"
            >
              {/* Header Action Bar */}
              <div className="w-full flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2ee86f] animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Radar Discovery
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

              {/* Scattered Non-Overlapping Radar Screen */}
              <div className="relative w-56 h-56 flex items-center justify-center my-2">
                {/* Sonar pulses */}
                <div className="absolute inset-0 rounded-full border border-[#2ee86f]/15 animate-radar pointer-events-none" />
                <div className="absolute inset-6 rounded-full border border-[#2ee86f]/20 animate-radar-delayed pointer-events-none" />
                <div className="absolute inset-14 rounded-full border border-[#2ee86f]/15 pointer-events-none" />

                {/* Center Self Device */}
                <div className="relative z-10 w-14 h-14 rounded-full neu-raised border-2 border-[#2ee86f] flex flex-col items-center justify-center p-1 shadow-[0_0_20px_rgba(46,232,111,0.4)]">
                  <img
                    src={myProfile.avatar}
                    alt={myProfile.name}
                    className="w-8 h-8 rounded-full object-cover mb-0.5"
                  />
                  <span className="text-[8px] font-bold text-white max-w-[45px] truncate text-center leading-none">
                    You
                  </span>
                </div>

                {/* Scattered Non-overlapping Orbiting Devices */}
                {peers.map((peer, idx) => {
                  const pos = getScatterPosition(idx, peers.length);
                  const isConnecting = connectingPeerId === peer.id;

                  return (
                    <motion.button
                      key={peer.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 + idx * 0.1 }}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelectDevice(peer)}
                      style={{
                        transform: `translate(${pos.x}px, ${pos.y}px)`,
                      }}
                      className="absolute z-20 flex flex-col items-center group cursor-pointer"
                    >
                      <div className="relative">
                        <img
                          src={peer.avatar}
                          alt={peer.name}
                          className={`${avatarSizeClass} rounded-full object-cover border-2 ${
                            isConnecting
                              ? 'border-[#2ee86f] ring-2 ring-[#2ee86f] animate-pulse'
                              : 'border-white/20 group-hover:border-[#2ee86f]'
                          } shadow-lg transition-all`}
                        />
                        <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#121316]">
                          {getOsIcon(peer.os)}
                        </div>
                      </div>
                      <span className="text-[9px] font-semibold text-slate-200 mt-0.5 max-w-[65px] truncate px-1 rounded bg-[#121316]/90 border border-white/10 group-hover:text-[#2ee86f] transition-colors">
                        {peer.name.split(' ')[0]}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400 font-medium mb-2">
                Tap any nearby device above to connect
              </p>

              {/* Minimalist Device List */}
              <div className="w-full space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {peers.map((peer) => {
                  const isConnecting = connectingPeerId === peer.id;
                  return (
                    <button
                      key={peer.id}
                      onClick={() => handleSelectDevice(peer)}
                      className={`w-full p-2 rounded-2xl flex items-center justify-between transition-all ${
                        isConnecting
                          ? 'bg-[#183020] border border-[#2ee86f]'
                          : 'neu-raised border border-white/5 hover:border-[#2ee86f]/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={peer.avatar}
                          alt={peer.name}
                          className="w-7 h-7 rounded-xl object-cover"
                        />
                        <div className="text-left">
                          <div className="text-xs font-bold text-white">{peer.name}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-[#2ee86f] px-2 py-0.5 rounded-xl neu-pressed">
                        {isConnecting ? 'Connecting...' : 'Connect'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Footer controls: Collapse or Stop */}
              <div className="w-full flex gap-2 mt-3 pt-2 border-t border-white/5">
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="flex-1 py-2 rounded-2xl neu-flat text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Minimize
                </button>
                <button
                  onClick={handleAttemptClose}
                  className="flex-1 py-2 rounded-2xl neu-pressed text-xs font-bold text-rose-400 hover:text-rose-300"
                >
                  Stop Scanning
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
