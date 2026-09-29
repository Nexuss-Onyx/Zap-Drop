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

  const count = peers.length;
  const avatarSizeClass =
    count <= 2 ? 'w-8 h-8' : count <= 4 ? 'w-7 h-7' : 'w-6 h-6';

  const getScatterPosition = (index: number, total: number) => {
    const baseRadius = total <= 3 ? 46 : 50;
    const radiusVariation = index % 2 === 0 ? 0 : 10;
    const r = baseRadius + radiusVariation;
    const angleStep = (2 * Math.PI) / Math.max(total, 1);
    const angle = index * angleStep - Math.PI / 2 + (index % 2 === 1 ? 0.25 : -0.2);
    
    return {
      x: Math.round(Math.cos(angle) * r),
      y: Math.round(Math.sin(angle) * r),
    };
  };

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
              className="w-full max-w-[260px] neu-raised rounded-3xl border border-white/10 p-4 bg-[#171821] text-center shadow-2xl"
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

      {/* Docked Card Attached Directly Above Bottom Nav */}
      <div className="fixed bottom-[58px] left-0 right-0 z-30 pointer-events-none flex flex-col items-center px-4">
        <div className="w-full max-w-[300px] pointer-events-auto">
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              /* COLLAPSED TAB ATTACHED DIRECTLY UNDER/ABOVE NAV */
              <motion.div
                key="collapsed-receive"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 35, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                onClick={() => setIsCollapsed(false)}
                className="p-2 px-3 rounded-t-2xl rounded-b-lg neu-raised border-t border-x border-[#2ee86f]/40 bg-[#16181f]/95 shadow-[0_-8px_25px_rgba(0,0,0,0.7)] flex items-center justify-between cursor-pointer hover:border-[#2ee86f] transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#2ee86f]/20 text-[#2ee86f] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2ee86f] animate-ping" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-bold text-white leading-none">Radar Active</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">({peers.length} found) • Tap to expand</div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCollapsed(false);
                    }}
                    className="p-1 rounded-md neu-pressed text-slate-300 hover:text-white"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAttemptClose();
                    }}
                    className="p-1 rounded-md neu-pressed text-slate-400 hover:text-rose-400"
                  >
                    <X size={13} />
                  </button>
                </div>
              </motion.div>
            ) : (
              /* DOCKED SMALL CARD - SLIDES UP FROM BEHIND THE NAV */
              <motion.div
                key="expanded-receive"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 45, scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                className="w-full neu-raised rounded-3xl border border-white/10 p-3 bg-[#16181f]/98 shadow-[0_8px_35px_rgba(0,0,0,0.9)] flex flex-col items-center text-center backdrop-blur-md mb-1"
              >
                {/* Header Bar */}
                <div className="w-full flex items-center justify-between pb-1 border-b border-white/5 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2ee86f] animate-ping" />
                    <span className="text-[10px] font-bold text-slate-300">
                      Nearby Devices ({peers.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setIsCollapsed(true)}
                      className="p-1 rounded-lg neu-pressed text-slate-400 hover:text-white transition-colors"
                      title="Collapse under nav"
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

                {/* Compact Scattered Radar Screen */}
                <div className="relative w-38 h-38 flex items-center justify-center my-0.5">
                  {/* Sonar pulses */}
                  <div className="absolute inset-0 rounded-full border border-[#2ee86f]/15 animate-radar pointer-events-none" />
                  <div className="absolute inset-4 rounded-full border border-[#2ee86f]/20 animate-radar-delayed pointer-events-none" />
                  <div className="absolute inset-8 rounded-full border border-[#2ee86f]/15 pointer-events-none" />

                  {/* Center Self Device */}
                  <div className="relative z-10 w-9 h-9 rounded-full neu-raised border-2 border-[#2ee86f] flex flex-col items-center justify-center p-0.5 shadow-[0_0_12px_rgba(46,232,111,0.4)]">
                    <img
                      src={myProfile.avatar}
                      alt={myProfile.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="text-[6px] font-bold text-white max-w-[30px] truncate text-center leading-none">
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
                        transition={{ delay: 0.05 + idx * 0.05 }}
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
                            } shadow-md transition-all`}
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-[#121316]">
                            {getOsIcon(peer.os)}
                          </div>
                        </div>
                        <span className="text-[7px] font-semibold text-slate-200 mt-0.5 max-w-[50px] truncate px-1 rounded bg-[#121316]/90 border border-white/10 group-hover:text-[#2ee86f] transition-colors">
                          {peer.name.split(' ')[0]}
                        </span>
                      </motion.button>
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
      </div>
    </>
  );
};
