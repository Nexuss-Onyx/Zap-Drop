import React from 'react';
import { Zap, Wifi, Radio, Smartphone, Monitor, ShieldCheck, Activity } from 'lucide-react';
import { DeviceProfile, HotspotState, OSPlatform } from '../types';

interface HeaderProps {
  myProfile: DeviceProfile;
  hotspotState: HotspotState;
  onToggleHotspot: () => void;
  onOpenProfile: () => void;
  activeTransferSpeed: number;
}

export const Header: React.FC<HeaderProps> = ({
  myProfile,
  hotspotState,
  onToggleHotspot,
  onOpenProfile,
  activeTransferSpeed,
}) => {
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
    <header className="sticky top-0 z-30 w-full px-4 pt-4 pb-3 bg-[#121316]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        
        {/* Brand Logo & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#15803d] flex items-center justify-center neu-raised shadow-[0_0_20px_rgba(34,197,94,0.35)]">
            <Zap size={22} className="fill-black text-black" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                Zapdrop
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30">
                P2P Ultra
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-[11px]">
                {hotspotState.enabled ? (
                  <>
                    <Radio size={12} className="text-[#22c55e] animate-pulse" />
                    <span className="text-[#22c55e] font-medium">Hotspot: {hotspotState.ssid}</span>
                  </>
                ) : (
                  <>
                    <Wifi size={12} className="text-slate-400" />
                    <span>Wi-Fi: 192.168.1.102</span>
                  </>
                )}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400/90 font-mono">
                <ShieldCheck size={11} /> E2E AES-256
              </span>
            </div>
          </div>
        </div>

        {/* Live Transfer Rate Indicator or Hotspot Toggle & Profile */}
        <div className="flex items-center gap-2">
          {activeTransferSpeed > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#13241b] border border-[#22c55e]/30 text-[#22c55e] font-mono text-xs shadow-[0_0_15px_rgba(34,197,94,0.2)]">
              <Activity size={13} className="animate-spin" />
              <span>{activeTransferSpeed.toFixed(1)} MB/s</span>
            </div>
          )}

          {/* Quick Hotspot Button */}
          <button
            onClick={onToggleHotspot}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all ${
              hotspotState.enabled
                ? 'bg-[#22c55e] text-black shadow-[0_0_20px_rgba(34,197,94,0.5)] font-bold'
                : 'neu-raised text-slate-300 hover:text-white border border-white/5'
            }`}
          >
            <Radio size={14} className={hotspotState.enabled ? 'animate-pulse' : ''} />
            <span>{hotspotState.enabled ? 'Hotspot ON' : 'Start Hotspot'}</span>
          </button>

          {/* Device Profile Pill */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl neu-raised border border-white/5 hover:border-[#22c55e]/30 transition-all group"
          >
            <div className="relative">
              <img
                src={myProfile.avatar}
                alt={myProfile.name}
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-[#22c55e]/60 group-hover:ring-[#22c55e] transition-all"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22c55e] border-2 border-[#121316]" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-200 group-hover:text-white flex items-center gap-1 max-w-[120px] truncate">
                {myProfile.name}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                {getOsIcon(myProfile.os)}
                <span className="capitalize">{myProfile.os}</span>
              </div>
            </div>
          </button>
        </div>

      </div>
    </header>
  );
};
