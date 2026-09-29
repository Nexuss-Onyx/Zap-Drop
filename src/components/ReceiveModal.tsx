import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Radio, ArrowDownToLine, Check, Smartphone, Monitor } from 'lucide-react';
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
  const [connectingPeerId, setConnectingPeerId] = useState<string | null>(null);

  if (!isOpen) return null;

  const getOsIcon = (os: OSPlatform) => {
    switch (os) {
      case 'android':
      case 'ios':
        return <Smartphone size={13} className="text-[#22c55e]" />;
      default:
        return <Monitor size={13} className="text-[#3b82f6]" />;
    }
  };

  const handleSelectDevice = (peer: DeviceProfile) => {
    setConnectingPeerId(peer.id);
    setTimeout(() => {
      onConnectDevice(peer);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-sm neu-raised rounded-3xl border border-white/10 p-6 bg-[#16181f]/95 shadow-2xl relative flex flex-col items-center"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full neu-pressed flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1 mt-1">
          <div className="w-8 h-8 rounded-xl bg-[#22c55e] text-black flex items-center justify-center shadow-md">
            <ArrowDownToLine size={18} className="stroke-[2.5]" />
          </div>
          <h2 className="text-base font-bold text-white">Receive Files</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">Scanning nearby devices to connect...</p>

        {/* Minimalist Radar Orbit Scanner */}
        <div className="relative w-48 h-48 flex items-center justify-center my-2">
          <div className="absolute inset-0 rounded-full border border-[#22c55e]/20 animate-radar pointer-events-none" />
          <div className="absolute inset-6 rounded-full border border-[#22c55e]/30 animate-radar-delayed pointer-events-none" />
          <div className="absolute inset-12 rounded-full border border-[#22c55e]/20 pointer-events-none" />

          {/* Centered Self Device */}
          <div className="relative z-10 w-16 h-16 rounded-full neu-raised border-2 border-[#22c55e] flex flex-col items-center justify-center p-1 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
            <img
              src={myProfile.avatar}
              alt={myProfile.name}
              className="w-9 h-9 rounded-full object-cover mb-0.5"
            />
            <span className="text-[9px] font-bold text-white max-w-[50px] truncate text-center leading-none">
              You
            </span>
          </div>

          {/* Orbiting Nearby Devices */}
          {peers.slice(0, 3).map((peer, idx) => {
            const angles = [45, 160, 280];
            const angle = angles[idx % angles.length];
            const rad = (angle * Math.PI) / 180;
            const radius = 72;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;

            return (
              <motion.button
                key={peer.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.15 }}
                onClick={() => handleSelectDevice(peer)}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
                className="absolute z-20 flex flex-col items-center group cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={peer.avatar}
                    alt={peer.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/20 group-hover:border-[#22c55e] shadow-lg transition-colors"
                  />
                  <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#121316]">
                    {getOsIcon(peer.os)}
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-slate-200 mt-1 max-w-[70px] truncate px-1 rounded bg-[#121316]/90 border border-white/10 group-hover:text-[#22c55e]">
                  {peer.name.split(' ')[0]}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Nearby Devices List to tap */}
        <div className="w-full mt-4 space-y-2 max-h-40 overflow-y-auto pr-1">
          <div className="text-[11px] font-semibold text-slate-400 px-1 text-left">
            Tap to connect & receive:
          </div>
          {peers.map((peer) => {
            const isConnecting = connectingPeerId === peer.id;
            return (
              <button
                key={peer.id}
                onClick={() => handleSelectDevice(peer)}
                className={`w-full p-2.5 rounded-2xl flex items-center justify-between transition-all ${
                  isConnecting
                    ? 'bg-[#183020] border border-[#22c55e]'
                    : 'neu-raised border border-white/5 hover:border-[#22c55e]/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={peer.avatar}
                    alt={peer.name}
                    className="w-8 h-8 rounded-xl object-cover"
                  />
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">{peer.name}</div>
                    <div className="text-[10px] text-slate-400">Available on Hotspot</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#22c55e] px-2 py-1 rounded-xl neu-pressed">
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
