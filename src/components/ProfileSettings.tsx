import React, { useState } from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  User,
  Smartphone,
  Monitor,
  Radio,
  Wifi,
  ShieldCheck,
  HardDrive,
  Check,
  Camera,
  Layers,
  Sparkles,
  Zap,
  Lock,
  RotateCcw,
  Sliders,
  Globe,
  Bell,
  Cpu,
} from 'lucide-react';
import { DeviceProfile, HotspotState, OSPlatform } from '../types';
import { AVATAR_PRESETS } from '../services/mockNetwork';

interface ProfileSettingsProps {
  myProfile: DeviceProfile;
  onUpdateProfile: (updated: Partial<DeviceProfile>) => void;
  hotspotState: HotspotState;
  onUpdateHotspot: (updated: Partial<HotspotState>) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  myProfile,
  onUpdateProfile,
  hotspotState,
  onUpdateHotspot,
}) => {
  const [nameInput, setNameInput] = useState(myProfile.name);
  const [modelInput, setModelInput] = useState(myProfile.model);
  const [isSaved, setIsSaved] = useState(false);
  const [hotspotSsid, setHotspotSsid] = useState(hotspotState.ssid);
  const [hotspotPass, setHotspotPass] = useState(hotspotState.password);
  const [autoAccept, setAutoAccept] = useState(false);
  const [e2eEncryption, setE2eEncryption] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const handleSaveProfile = () => {
    onUpdateProfile({
      name: nameInput.trim() || myProfile.name,
      model: modelInput.trim() || myProfile.model,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      onUpdateProfile({ avatar: url });
    }
  };

  const osOptions: { id: OSPlatform; label: string; icon: React.ElementType }[] = [
    { id: 'android', label: 'Android (Capacitor)', icon: Smartphone },
    { id: 'macos', label: 'macOS (Tauri)', icon: Monitor },
    { id: 'windows', label: 'Windows 11 (Tauri)', icon: Monitor },
    { id: 'linux', label: 'Linux (Tauri)', icon: Cpu },
    { id: 'ios', label: 'iOS / iPadOS', icon: Smartphone },
  ];

  // Hotspot WiFi QR string: WIFI:T:WPA;S:Zapdrop-5G;P:password;;
  const wifiQrPayload = `WIFI:T:WPA;S:${hotspotState.ssid};P:${hotspotState.password};;`;

  return (
    <div className="min-h-[calc(100vh-140px)] pb-28 pt-2 px-3 sm:px-6 max-w-4xl mx-auto space-y-6">
      
      {/* Profile Card & Avatar Customization */}
      <div className="p-5 sm:p-6 rounded-3xl neu-raised border border-white/5 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <User size={18} className="text-[#22c55e]" />
            <h2 className="text-base font-bold text-white">Device Profile & Discovery Name</h2>
          </div>
          <span className="text-xs text-slate-400">Shown to peers during scan</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar with live photo edit */}
          <div className="relative group">
            <img
              src={myProfile.avatar}
              alt={myProfile.name}
              className="w-24 h-24 rounded-3xl object-cover ring-4 ring-[#22c55e]/50 neu-raised"
            />
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-2 -right-2 p-2 rounded-2xl bg-[#22c55e] text-black cursor-pointer shadow-lg hover:scale-110 transition-transform"
              title="Upload Custom Photo"
            >
              <Camera size={16} className="stroke-[2.5]" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleCustomAvatarUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Name & Model inputs */}
          <div className="flex-1 w-full space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">
                Broadcast Device Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-2xl neu-pressed text-sm text-white font-bold border border-white/5 focus:border-[#22c55e]/50 outline-none"
                  placeholder="e.g. Alex's Galaxy S24 Ultra"
                />
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2.5 rounded-2xl bg-[#22c55e] text-black font-bold text-xs shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-[#16a34a] transition-all flex items-center gap-1"
                >
                  {isSaved ? <Check size={16} /> : 'Save'}
                  <span>{isSaved ? 'Saved!' : 'Update'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">
                Hardware Model / Subtitle
              </label>
              <input
                type="text"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                className="w-full px-4 py-2 rounded-xl neu-pressed text-xs text-slate-300 border border-white/5 focus:border-[#22c55e]/50 outline-none"
                placeholder="e.g. Snapdragon 8 Gen 3 • Wi-Fi 7"
              />
            </div>
          </div>
        </div>

        {/* Preset Avatar Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-400 mb-2 block">Choose Avatar Preset</label>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {AVATAR_PRESETS.map((avUrl, idx) => (
              <button
                key={idx}
                onClick={() => onUpdateProfile({ avatar: avUrl })}
                className={`w-12 h-12 rounded-2xl overflow-hidden shrink-0 transition-all ${
                  myProfile.avatar === avUrl
                    ? 'ring-3 ring-[#22c55e] scale-105 shadow-[0_0_15px_rgba(34,197,94,0.5)]'
                    : 'neu-pressed opacity-70 hover:opacity-100'
                }`}
              >
                <img src={avUrl} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Device Operating System Mode */}
        <div>
          <label className="text-xs font-semibold text-slate-400 mb-2 block">
            Target Platform Runtime (Capacitor / Tauri bridge)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {osOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = myProfile.os === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onUpdateProfile({ os: opt.id })}
                  className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#183020] border-2 border-[#22c55e] text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                      : 'neu-raised text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  <Icon size={16} className={isSelected ? 'text-[#22c55e]' : ''} />
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Hotspot Configuration Beacon */}
      <div className="p-5 sm:p-6 rounded-3xl neu-raised border border-white/5 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-[#22c55e]" />
            <h2 className="text-base font-bold text-white">Mobile Hotspot & Direct Wi-Fi Beacon</h2>
          </div>
          <button
            onClick={() => onUpdateHotspot({ enabled: !hotspotState.enabled })}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              hotspotState.enabled
                ? 'bg-[#22c55e] text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                : 'neu-pressed text-slate-400'
            }`}
          >
            {hotspotState.enabled ? 'ACTIVE' : 'OFF'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Hotspot Network Name (SSID)</label>
              <input
                type="text"
                value={hotspotSsid}
                onChange={(e) => {
                  setHotspotSsid(e.target.value);
                  onUpdateHotspot({ ssid: e.target.value });
                }}
                className="w-full px-4 py-2 rounded-xl neu-pressed text-xs text-white font-mono font-bold border border-white/5 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">WPA3-PSK Password</label>
              <input
                type="text"
                value={hotspotPass}
                onChange={(e) => {
                  setHotspotPass(e.target.value);
                  onUpdateHotspot({ password: e.target.value });
                }}
                className="w-full px-4 py-2 rounded-xl neu-pressed text-xs text-[#22c55e] font-mono font-bold border border-white/5 outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onUpdateHotspot({ band: '5GHz' })}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  hotspotState.band === '5GHz'
                    ? 'bg-[#22c55e] text-black'
                    : 'neu-pressed text-slate-400'
                }`}
              >
                5 GHz (Max Speed)
              </button>
              <button
                onClick={() => onUpdateHotspot({ band: '2.4GHz' })}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  hotspotState.band === '2.4GHz'
                    ? 'bg-[#22c55e] text-black'
                    : 'neu-pressed text-slate-400'
                }`}
              >
                2.4 GHz (Long Range)
              </button>
            </div>
          </div>

          {/* Wi-Fi Direct Instant Join QR */}
          <div className="flex flex-col items-center p-4 rounded-2xl neu-flat border border-white/5 text-center">
            <div className="p-2.5 bg-white rounded-2xl shadow-lg mb-2">
              <QRCodeSVG value={wifiQrPayload} size={110} fgColor="#121316" bgColor="#ffffff" />
            </div>
            <span className="text-[11px] font-bold text-slate-300">Scan to auto-join Hotspot Wi-Fi</span>
            <span className="text-[10px] text-slate-500">Android & iOS camera automatically connects</span>
          </div>
        </div>
      </div>

      {/* Security & Performance Preferences */}
      <div className="p-5 sm:p-6 rounded-3xl neu-raised border border-white/5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <Sliders size={18} className="text-[#22c55e]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Transfer Preferences</h2>
        </div>

        <div className="space-y-3">
          {/* E2E Encryption */}
          <div className="flex items-center justify-between p-3 rounded-2xl neu-pressed">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#22c55e]/15 text-[#22c55e]">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">End-to-End Encryption (AES-256)</div>
                <div className="text-[11px] text-slate-400">Encrypt payload chunks during local peer transfers</div>
              </div>
            </div>
            <button
              onClick={() => setE2eEncryption(!e2eEncryption)}
              className={`w-12 h-7 rounded-full p-1 transition-all ${
                e2eEncryption ? 'bg-[#22c55e]' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black transition-transform ${
                  e2eEncryption ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto-Accept Trusted Peers */}
          <div className="flex items-center justify-between p-3 rounded-2xl neu-pressed">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                <Zap size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Auto-Accept Incoming Files</div>
                <div className="text-[11px] text-slate-400">Automatically start downloading from recognized devices</div>
              </div>
            </div>
            <button
              onClick={() => setAutoAccept(!autoAccept)}
              className={`w-12 h-7 rounded-full p-1 transition-all ${
                autoAccept ? 'bg-[#22c55e]' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black transition-transform ${
                  autoAccept ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Haptics & Sound */}
          <div className="flex items-center justify-between p-3 rounded-2xl neu-pressed">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                <Bell size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Haptic & Transfer Chime</div>
                <div className="text-[11px] text-slate-400">Play confirmation tone on completion</div>
              </div>
            </div>
            <button
              onClick={() => setHapticFeedback(!hapticFeedback)}
              className={`w-12 h-7 rounded-full p-1 transition-all ${
                hapticFeedback ? 'bg-[#22c55e]' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black transition-transform ${
                  hapticFeedback ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
