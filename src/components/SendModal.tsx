import React from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode } from 'lucide-react';
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
  if (!isOpen) return null;

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  // Minimal QR payload with hotspot & connection data
  const qrPayload = `WIFI:T:WPA;S:${hotspotState.ssid};P:${hotspotState.password};;`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-sm neu-raised rounded-3xl border border-white/10 p-6 bg-[#16181f]/95 shadow-2xl relative flex flex-col items-center text-center"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full neu-pressed flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Sender Profile Centered */}
        <div className="relative mb-3 mt-1">
          <img
            src={myProfile.avatar}
            alt={myProfile.name}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#22c55e] shadow-lg"
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#22c55e] border-2 border-[#16181f]" />
        </div>

        <h2 className="text-base font-bold text-white mb-0.5">{myProfile.name}</h2>
        <p className="text-xs text-slate-400 mb-5">
          {selectedFiles.length > 0
            ? `${selectedFiles.length} file(s) ready • ${formatFileSize(totalSize)}`
            : 'Scan QR to connect and receive files'}
        </p>

        {/* Centered Clean QR Code */}
        <div className="p-4 bg-white rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] mb-5">
          <QRCodeSVG
            value={qrPayload}
            size={180}
            level="M"
            fgColor="#121316"
            bgColor="#ffffff"
          />
        </div>

        <p className="text-xs text-slate-300 font-medium">
          Scan with receiving phone or desktop to connect
        </p>

        {/* Done Button */}
        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-xs shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all"
        >
          Done
        </button>
      </motion.div>
    </div>
  );
};
