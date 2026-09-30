import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, ChevronUp, AlertCircle, Smartphone, Monitor } from 'lucide-react';
import { DeviceProfile, OSPlatform } from '../types';
import { receiveFromPeer, ReceiveProgressInfo } from '../services/receive';
import { startRadarDiscovery } from '../services/radar';

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
  onConnectDevice,
  isCollapsed,
  setIsCollapsed,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [connectingPeerId, setConnectingPeerId] = useState<string | null>(null);
  const [radarDevices, setRadarDevices] = useState<DeviceProfile[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);
  const [progressInfo, setProgressInfo] = useState<ReceiveProgressInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setRadarDevices([]);
      setProgressInfo(null);
      setStatusMessage(null);
      setIsReceiving(false);
      return;
    }

    let isMounted = true;
    let stopDiscovery: (() => Promise<void>) | null = null;

    // 1. Start Native / UDP Radar Discovery
    startRadarDiscovery(
      (device) => {
        if (isMounted) {
          setRadarDevices((prev) => {
            if (prev.some((d) => d.id === device.id)) return prev;
            return [...prev, device];
          });
        }
      },
      (lostId) => {
        if (isMounted) {
          setRadarDevices((prev) => prev.filter((d) => d.id !== lostId));
        }
      }
    ).then((session) => {
      stopDiscovery = session.stop;
    });

    // 2. Active Probe for Mobile Hotspots & Local Network Senders (Android Hotspot gateway: 192.168.43.1, 192.168.49.1)
    const probeHotspots = async () => {
      const candidateIps = [
        '192.168.43.1', // Android Portable Hotspot default
        '192.168.49.1', // Wi-Fi Direct default
        '192.168.1.1',
        '192.168.0.1',
        '10.0.0.1',
      ];

      for (const ip of candidateIps) {
        if (!isMounted) break;
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1200);
          const res = await fetch(`http://${ip}:48556/api/status`, {
            signal: controller.signal,
          }).catch(() => null);
          clearTimeout(timer);

          if (res && res.ok && isMounted) {
            const data = await res.json().catch(() => null);
            if (data && data.deviceId) {
              const dev: DeviceProfile = {
                id: data.deviceId,
                name: data.name || 'Mobile Hotspot Device',
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
                os: (data.platform as OSPlatform) || 'android',
                signalStrength: 98,
                status: 'online',
              };
              (dev as any).ip = ip;
              (dev as any).port = 48556;

              setRadarDevices((prev) => {
                if (prev.some((d) => d.id === dev.id)) return prev;
                return [...prev, dev];
              });
            }
          }
        } catch {}
      }
    };

    probeHotspots();
    const interval = setInterval(probeHotspots, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (stopDiscovery) stopDiscovery();
    };
  }, [isOpen]);

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

  const handleSelectDevice = async (peer: DeviceProfile) => {
    setConnectingPeerId(peer.id);
    setIsReceiving(true);
    setStatusMessage(`Requesting files from ${peer.name}...`);

    try {
      await receiveFromPeer(
        {
          id: peer.id,
          name: peer.name,
          ip: (peer as any).ip || '192.168.43.1',
          port: (peer as any).port || 48556,
          platform: peer.os,
        },
        (info) => {
          setProgressInfo(info);
        }
      );
      setStatusMessage('Transfer completed successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      const msg = err?.message || err?.toString() || 'Transfer failed';
      setStatusMessage(msg.includes('DECLINED') ? 'Request declined by sender' : msg);
      onConnectDevice(peer);
    } finally {
      setIsReceiving(false);
      setConnectingPeerId(null);
    }
  };

  const quadrantOffsets = [
    { x: -55, y: -46 },
    { x: 55, y: -46 },
    { x: -55, y: 46 },
    { x: 55, y: 46 },
  ];

  return (
    <>
      {/* Confirmation Modal */}
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
              <h3 className="text-xs font-bold text-white mb-1">Stop Receiving?</h3>
              <p className="text-[11px] text-slate-400 mb-3">
                This will end your radar visibility and stop incoming transfers.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  Stay
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
                >
                  Exit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Receive Floating Sheet */}
      <div className="fixed bottom-16 left-0 right-0 z-40 flex flex-col items-center pointer-events-none px-4">
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: 1,
            height: isCollapsed ? '52px' : 'auto',
          }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-[340px] pointer-events-auto neu-raised rounded-3xl border border-white/10 bg-[#161720]/95 backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.85)] overflow-hidden"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title={isCollapsed ? 'Expand' : 'Minimize'}
              >
                {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              <span className="text-xs font-bold text-white">Receive Files</span>
              <span className="text-[10px] text-slate-400">
                ({radarDevices.length} nearby)
              </span>
            </div>

            <div className="flex items-center">
              <button
                onClick={handleAttemptClose}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Expanded Content */}
          {!isCollapsed && (
            <div className="p-4 flex flex-col items-center text-center space-y-3">
              {/* Progress info if downloading */}
              {progressInfo && (
                <div className="w-full p-2.5 rounded-2xl bg-black/40 border border-white/5 text-left space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-white">
                    <span className="truncate max-w-[180px]">{progressInfo.fileName}</span>
                    <span className="text-[#2ee86f]">
                      {Math.round((progressInfo.loaded / Math.max(1, progressInfo.total)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#2ee86f] transition-all"
                      style={{
                        width: `${Math.min(100, Math.round((progressInfo.loaded / Math.max(1, progressInfo.total)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      File {progressInfo.fileIndex} of {progressInfo.fileCount}
                    </span>
                    <span>{progressInfo.speedMbps.toFixed(1)} MB/s</span>
                  </div>
                </div>
              )}

              {/* Status Message */}
              {statusMessage && (
                <p className="text-[11px] text-emerald-400 font-medium">{statusMessage}</p>
              )}

              {/* Radar Container */}
              <div className="relative w-48 h-48 rounded-full bg-[#0d0f16]/90 border border-[#2ee86f]/20 flex items-center justify-center overflow-hidden shadow-inner my-1">
                {/* Concentric Radar Rings */}
                <div className="absolute inset-4 rounded-full border border-[#2ee86f]/15 pointer-events-none" />
                <div className="absolute inset-10 rounded-full border border-[#2ee86f]/20 pointer-events-none" />
                <div className="absolute inset-16 rounded-full border border-[#2ee86f]/25 pointer-events-none" />

                {/* Rotating Scanner Line */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                  className="absolute inset-0 origin-center pointer-events-none"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(46,232,111,0.18) 360deg)',
                  }}
                />

                {/* Center Self Avatar */}
                <div className="relative z-10 w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#22c55e] to-white shadow-[0_0_15px_rgba(46,232,111,0.6)] flex items-center justify-center">
                  <img
                    src={myProfile.avatar}
                    alt={myProfile.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>

                {/* Discovered Peer Avatars */}
                {radarDevices.slice(0, 4).map((peer, idx) => {
                  const offset = quadrantOffsets[idx] || { x: 0, y: 0 };
                  const isConnecting = connectingPeerId === peer.id;

                  return (
                    <motion.button
                      key={peer.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelectDevice(peer)}
                      className={`absolute z-20 flex flex-col items-center cursor-pointer group ${
                        isConnecting ? 'animate-pulse' : ''
                      }`}
                      style={{
                        transform: `translate(${offset.x}px, ${offset.y}px)`,
                      }}
                      title={`Connect to ${peer.name}`}
                    >
                      <div className="relative w-8 h-8 rounded-full p-0.5 bg-[#171922] border-2 border-[#2ee86f]/80 shadow-[0_0_10px_rgba(46,232,111,0.4)] group-hover:border-[#2ee86f] transition-all">
                        <img
                          src={peer.avatar}
                          alt={peer.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                        <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#11131a] border border-white/20">
                          {getOsIcon(peer.os)}
                        </div>
                      </div>
                      <span className="text-[9px] font-medium text-slate-300 group-hover:text-white truncate max-w-[55px] drop-shadow-md">
                        {peer.name.split(' ')[0]}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <span className="text-[11px] text-slate-400 font-medium">
                {radarDevices.length > 0
                  ? 'Tap a discovered mobile or desktop device to connect'
                  : 'Actively searching local Wi-Fi & Mobile Hotspots...'}
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};
