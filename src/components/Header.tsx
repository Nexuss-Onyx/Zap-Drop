import React from 'react';
import { Share2, Smartphone, Monitor } from 'lucide-react';
import { DeviceProfile, HotspotState, OSPlatform } from '../types';

interface HeaderProps {
  myProfile: DeviceProfile;
  hotspotState: HotspotState;
  onOpenProfile: () => void;
  isDesktopView: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  myProfile,
  hotspotState,
  onOpenProfile,
  isDesktopView,
}) => {
  const getOsIcon = (os: OSPlatform) => {
    switch (os) {
      case 'android':
      case 'ios':
        return <Smartphone size={13} className="text-[#22c55e]" />;
      default:
        return <Monitor size={13} className="text-[#3b82f6]" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full px-4 pt-3 pb-3 bg-[#121316]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        
        {/* Brand Logo & Clean Subtitle */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#22c55e] flex items-center justify-center neu-raised shadow-[0_0_15px_rgba(34,197,94,0.35)]">
            <Share2 size={19} className="text-black stroke-[2.4]" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">
              Zapdrop
            </h1>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${hotspotState.enabled ? 'bg-[#22c55e] animate-pulse' : 'bg-[#22c55e]'}`} />
              <span>{hotspotState.enabled ? 'Hotspot Active' : isDesktopView ? 'Desktop Receiver' : 'Ready to share'}</span>
            </div>
          </div>
        </div>

        {/* Device Profile Pill */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl neu-raised border border-white/5 hover:border-[#22c55e]/30 transition-all group"
        >
          <img
            src={myProfile.avatar}
            alt={myProfile.name}
            className="w-7 h-7 rounded-xl object-cover ring-1 ring-[#22c55e]/60 group-hover:ring-[#22c55e] transition-all"
          />
          <div className="text-left">
            <div className="text-xs font-bold text-slate-200 group-hover:text-white max-w-[120px] truncate">
              {myProfile.name}
            </div>
          </div>
        </button>

      </div>
    </header>
  );
};
