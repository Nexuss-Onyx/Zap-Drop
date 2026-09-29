import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowDownToLine, Radio, Smartphone, Monitor, Scan, KeyRound, Check, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { DeviceProfile, OSPlatform } from '../types';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  myProfile: DeviceProfile;
  peers: DeviceProfile[];
  onAcceptIncoming: (sender: DeviceProfile) => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isOpen,
  onClose,
  myProfile,
  peers,
  onAcceptIncoming,
}) => {
  const [viewMode, setViewMode] = useState<'radar' | 'scanner' | 'pin'>('radar');
  const [pinCode, setPinCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [simulatedIncoming, setSimulatedIncoming] = useState<DeviceProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsScanning(true);
      // Simulate an incoming transfer request after 3.5 seconds
      const timer = setTimeout(() => {
        if (peers.length > 0) {
          setSimulatedIncoming(peers[0]);
        }
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setSimulatedIncoming(null);
    }
  }, [isOpen, peers]);

  if (!isOpen) return null;

  const getOsIcon = (os: OSPlatform) => {
    switch (os) {
      case 'android':
      case 'ios':
        return <Smartphone size={14} className="text-[#22c55e]" />;
      default:
        return <Monitor size={14} className="text-[#3b82f6]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg neu-raised rounded-3xl border border-white/10 p-6 bg-[#16181f]/95 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Glow ambient */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-[#22c55e]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#19241f] border border-[#22c55e]/40 text-[#22c55e] flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.2)]">
              <ArrowDownToLine size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Receive Files</h2>
              <p className="text-xs text-slate-400">Scanning local network & Hotspot beacons</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full neu-pressed flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* View mode switcher */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl neu-pressed my-3">
          <button
            onClick={() => setViewMode('radar')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'radar'
                ? 'neu-raised text-[#22c55e] border border-[#22c55e]/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio size={14} /> Radar
          </button>
          <button
            onClick={() => setViewMode('scanner')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'scanner'
                ? 'neu-raised text-[#22c55e] border border-[#22c55e]/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scan size={14} /> QR Camera
          </button>
          <button
            onClick={() => setViewMode('pin')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'pin'
                ? 'neu-raised text-[#22c55e] border border-[#22c55e]/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound size={14} /> 4-Digit PIN
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto min-h-[300px] flex flex-col items-center justify-center">
          {viewMode === 'radar' && (
            <div className="w-full flex flex-col items-center">
              {/* Radar Graphic */}
              <div className="relative w-64 h-64 flex items-center justify-center my-2">
                {/* Concentric pulsing radar waves */}
                <div className="absolute inset-0 rounded-full border border-[#22c55e]/20 animate-radar pointer-events-none" />
                <div className="absolute inset-4 rounded-full border border-[#22c55e]/25 animate-radar-delayed pointer-events-none" />
                <div className="absolute inset-8 rounded-full border border-[#22c55e]/30 animate-radar-delayed-2 pointer-events-none" />
                <div className="absolute inset-12 rounded-full border border-[#22c55e]/15 pointer-events-none" />
                <div className="absolute inset-20 rounded-full border border-[#22c55e]/20 pointer-events-none" />

                {/* Central Self Device Badge */}
                <div className="relative z-10 w-20 h-20 rounded-full neu-raised border-2 border-[#22c55e] flex flex-col items-center justify-center p-1 shadow-[0_0_25px_rgba(34,197,94,0.4)]">
                  <img
                    src={myProfile.avatar}
                    alt={myProfile.name}
                    className="w-10 h-10 rounded-full object-cover mb-0.5 ring-2 ring-[#22c55e]"
                  />
                  <span className="text-[9px] font-bold text-white max-w-[60px] truncate text-center leading-none">
                    You
                  </span>
                </div>

                {/* Orbiting Discovered Peers */}
                {peers.map((peer, idx) => {
                  const angles = [35, 145, 230, 310];
                  const angle = angles[idx % angles.length];
                  const rad = (angle * Math.PI) / 180;
                  const radius = 95;
                  const x = Math.cos(rad) * radius;
                  const y = Math.sin(rad) * radius;

                  return (
                    <motion.button
                      key={peer.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 + idx * 0.15 }}
                      whileHover={{ scale: 1.15 }}
                      onClick={() => onAcceptIncoming(peer)}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className="absolute z-20 flex flex-col items-center group cursor-pointer"
                    >
                      <div className="relative">
                        <img
                          src={peer.avatar}
                          alt={peer.name}
                          className="w-11 h-11 rounded-full object-cover border-2 border-white/20 group-hover:border-[#22c55e] shadow-lg transition-colors"
                        />
                        <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#121316] text-[#22c55e]">
                          {getOsIcon(peer.os)}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-200 mt-1 max-w-[80px] truncate px-1.5 py-0.5 rounded-md bg-[#121316]/90 border border-white/10 group-hover:text-[#22c55e]">
                        {peer.name.split(' ')[0]}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Status footer pill */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full neu-pressed text-xs text-slate-300 mt-2">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
                <span>Broadcasting as &quot;<strong className="text-white">{myProfile.name}</strong>&quot;</span>
              </div>
            </div>
          )}

          {viewMode === 'scanner' && (
            <div className="flex flex-col items-center text-center p-4">
              <div className="relative w-64 h-64 rounded-3xl neu-pressed border-2 border-dashed border-[#22c55e]/50 flex items-center justify-center overflow-hidden bg-black/40">
                {/* Laser scan line */}
                <motion.div
                  animate={{ y: [-100, 100, -100] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#22c55e] to-transparent shadow-[0_0_15px_rgba(34,197,94,0.9)]"
                />
                <div className="text-center p-4 z-10">
                  <Scan size={44} className="text-[#22c55e] mx-auto mb-2 opacity-80" />
                  <p className="text-xs text-slate-300 font-medium">Point camera at sender&apos;s QR code</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Auto-detects IP & Wi-Fi Hotspots</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (peers.length > 0) onAcceptIncoming(peers[0]);
                }}
                className="mt-4 px-4 py-2 rounded-xl neu-raised text-xs font-bold text-[#22c55e] flex items-center gap-2 border border-[#22c55e]/30 hover:bg-[#22c55e]/10 transition-all"
              >
                <Sparkles size={14} /> Simulate Instant QR Scan
              </button>
            </div>
          )}

          {viewMode === 'pin' && (
            <div className="flex flex-col items-center text-center p-4 w-full max-w-xs">
              <KeyRound size={36} className="text-[#22c55e] mb-2" />
              <h3 className="text-sm font-bold text-white mb-1">Enter 4-Digit Sender PIN</h3>
              <p className="text-xs text-slate-400 mb-4">Displayed below the sender&apos;s QR code</p>
              
              <div className="flex gap-2 mb-6">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={pinCode[idx] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const newPin = (pinCode + val).slice(0, 4);
                        setPinCode(newPin);
                        if (newPin.length === 4 && peers.length > 0) {
                          onAcceptIncoming(peers[0]);
                        }
                      }
                    }}
                    className="w-12 h-14 rounded-2xl neu-pressed text-center font-mono text-xl font-bold text-[#22c55e] border border-white/10 focus:border-[#22c55e] outline-none"
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  setPinCode('8492');
                  if (peers.length > 0) onAcceptIncoming(peers[0]);
                }}
                className="text-xs text-[#22c55e] underline hover:text-[#4ade80]"
              >
                Fill Sample PIN (8492)
              </button>
            </div>
          )}
        </div>

        {/* Incoming Transfer Request Notification Toast / Sheet */}
        <AnimatePresence>
          {simulatedIncoming && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="p-4 rounded-2xl bg-[#1a2f22] border-2 border-[#22c55e] shadow-[0_0_30px_rgba(34,197,94,0.4)] mt-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={simulatedIncoming.avatar}
                  alt={simulatedIncoming.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#22c55e]"
                />
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{simulatedIncoming.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#22c55e] text-black font-bold">
                      INCOMING
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-300">
                    wants to send 2 files (32.4 MB)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSimulatedIncoming(null)}
                  className="px-2.5 py-1.5 rounded-xl neu-flat text-xs text-slate-400 hover:text-white"
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    onAcceptIncoming(simulatedIncoming);
                    setSimulatedIncoming(null);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#22c55e] text-black text-xs font-bold shadow-md hover:bg-[#16a34a] flex items-center gap-1"
                >
                  <Check size={14} className="stroke-[3]" /> Accept
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-[#22c55e]" /> TLS + Local P2P direct
          </span>
          <button
            onClick={() => setIsScanning(!isScanning)}
            className="flex items-center gap-1 text-slate-300 hover:text-white"
          >
            <RefreshCw size={12} className={isScanning ? 'animate-spin' : ''} />
            <span>Refresh Scan</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
