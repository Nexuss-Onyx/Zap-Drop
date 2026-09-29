import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Send, QrCode, Wifi, Radio, Smartphone, Monitor, CheckCircle2, Copy, Check, Plus, FolderUp } from 'lucide-react';
import { DeviceFile, DeviceProfile, HotspotState, OSPlatform } from '../types';
import { formatFileSize } from '../services/mockNetwork';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles: DeviceFile[];
  peers: DeviceProfile[];
  hotspotState: HotspotState;
  myProfile: DeviceProfile;
  onStartTransfer: (targetPeer: DeviceProfile, files: DeviceFile[]) => void;
  onPickMoreFiles: () => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  selectedFiles,
  peers,
  hotspotState,
  myProfile,
  onStartTransfer,
  onPickMoreFiles,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'radar'>('qr');
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  const connectionPayload = JSON.stringify({
    app: 'zapdrop',
    version: '2.4',
    sender: myProfile.name,
    senderId: myProfile.id,
    ip: hotspotState.enabled ? hotspotState.ipAddress : myProfile.ipAddress,
    port: 8080,
    hotspot: hotspotState.enabled ? hotspotState.ssid : null,
    password: hotspotState.enabled ? hotspotState.password : null,
    filesCount: selectedFiles.length,
    totalBytes: totalSize,
    pin: '8492',
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`http://${hotspotState.ipAddress || myProfile.ipAddress}:8080/zap/${myProfile.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getOsIcon = (os: OSPlatform) => {
    switch (os) {
      case 'android':
      case 'ios':
        return <Smartphone size={15} className="text-[#22c55e]" />;
      default:
        return <Monitor size={15} className="text-[#3b82f6]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg neu-raised rounded-3xl border border-white/10 p-6 bg-[#16181f]/95 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#22c55e]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#22c55e] text-black flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.4)]">
              <Send size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Send Files via Zapdrop</h2>
              <p className="text-xs text-slate-400">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file(s) selected • ${formatFileSize(totalSize)}`
                  : 'Select a device or scan QR code'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full neu-pressed flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selected files pill ribbon */}
        <div className="my-3 p-3 rounded-2xl neu-pressed flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {selectedFiles.length === 0 ? (
              <span className="text-xs text-slate-400">No files queued yet</span>
            ) : (
              selectedFiles.slice(0, 3).map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1b1e27] border border-white/5 text-xs text-slate-200 whitespace-nowrap"
                >
                  <span className="max-w-[90px] truncate">{f.name}</span>
                  <span className="text-[10px] text-[#22c55e]">({formatFileSize(f.size)})</span>
                </div>
              ))
            )}
            {selectedFiles.length > 3 && (
              <span className="text-xs text-slate-400 font-semibold px-1">
                +{selectedFiles.length - 3} more
              </span>
            )}
          </div>
          <button
            onClick={onPickMoreFiles}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-[#22c55e]/15 text-[#22c55e] hover:bg-[#22c55e]/25 border border-[#22c55e]/30 whitespace-nowrap transition-all"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Tab switchers: QR Code vs Direct Radar Devices */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl neu-pressed mb-4">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'qr'
                ? 'neu-raised text-[#22c55e] border border-[#22c55e]/30 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode size={16} />
            <span>QR Code Connect</span>
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'radar'
                ? 'neu-raised text-[#22c55e] border border-[#22c55e]/30 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio size={16} />
            <span>Nearby Devices ({peers.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'qr' ? (
            <div className="flex flex-col items-center text-center">
              {/* QR Code Container */}
              <div className="p-4 rounded-3xl neu-flat border border-white/10 bg-[#121316] relative shadow-[0_0_30px_rgba(0,0,0,0.8)] my-2">
                <div className="p-3 bg-white rounded-2xl">
                  <QRCodeSVG
                    value={connectionPayload}
                    size={190}
                    level="M"
                    fgColor="#0e0f12"
                    bgColor="#ffffff"
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#22c55e] text-black font-mono text-[10px] font-bold shadow-md">
                  PIN: 8492
                </div>
              </div>

              <p className="text-xs text-slate-300 font-medium mt-3">
                Scan with any phone camera or Desktop Zapdrop receiver
              </p>

              {/* Hotspot & IP connection detail card */}
              <div className="w-full mt-4 p-3.5 rounded-2xl neu-pressed text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Wi-Fi Hotspot:</span>
                  <span className="text-[#22c55e] font-mono font-bold flex items-center gap-1">
                    <Radio size={12} /> {hotspotState.ssid}
                  </span>
                </div>
                {hotspotState.enabled && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Hotspot Password:</span>
                    <span className="text-white font-mono bg-black/40 px-2 py-0.5 rounded">
                      {hotspotState.password}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-slate-400">Direct Web URL:</span>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 text-slate-300 hover:text-white font-mono text-[11px] bg-slate-800/80 px-2 py-1 rounded-lg transition-colors"
                  >
                    {copied ? <Check size={12} className="text-[#22c55e]" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : `http://${hotspotState.ipAddress}:8080`}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Radar Scanned Devices List */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Tap a device to initiate instant transfer</span>
                <span className="flex items-center gap-1 text-[#22c55e] text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" /> Scanning
                </span>
              </div>

              {peers.map((peer) => {
                const isSelected = selectedPeerId === peer.id;
                return (
                  <motion.div
                    key={peer.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPeerId(peer.id)}
                    className={`p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#183020] border-2 border-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                        : 'neu-raised border border-white/5 hover:border-[#22c55e]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={peer.avatar}
                          alt={peer.name}
                          className="w-11 h-11 rounded-xl object-cover"
                        />
                        <div className="absolute -bottom-1 -right-1 p-0.5 rounded-md bg-[#16181f] neu-pressed">
                          {getOsIcon(peer.os)}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          {peer.name}
                          {peer.status === 'online' && (
                            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">{peer.ipAddress}</span>
                          <span>•</span>
                          <span className="text-[11px] text-emerald-400">{peer.model}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right hidden sm:block">
                        <div className="text-[11px] font-mono text-slate-300">{peer.signalStrength}%</div>
                        <div className="text-[10px] text-slate-500">Signal</div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? 'bg-[#22c55e] border-[#22c55e] text-black'
                            : 'neu-pressed border-slate-700 text-transparent'
                        }`}
                      >
                        <CheckCircle2 size={16} className="fill-current" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="pt-4 mt-2 border-t border-white/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl neu-flat text-slate-400 hover:text-white text-sm font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            disabled={selectedFiles.length === 0 || (activeTab === 'radar' && !selectedPeerId)}
            onClick={() => {
              const targetPeer = peers.find((p) => p.id === selectedPeerId) || peers[0];
              onStartTransfer(targetPeer, selectedFiles);
              onClose();
            }}
            className="flex-[2] py-3 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
          >
            <Send size={18} className="stroke-[2.5]" />
            <span>
              {activeTab === 'qr'
                ? 'Send to First Connected'
                : selectedPeerId
                ? `Send to ${peers.find((p) => p.id === selectedPeerId)?.name.split(' ')[0]}`
                : 'Select Device'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
