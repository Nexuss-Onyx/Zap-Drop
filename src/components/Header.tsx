import React from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import { DeviceProfile, HotspotState, OSPlatform } from '../types';
import { ZapShareIcon } from './BottomNav';

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
        return <Smartphone size={13} className="text-[#2ee86f]" />;
      default:
        return <Monitor size={13} className="text-[#3b82f6]" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full px-4 pt-3 pb-3 bg-[#121316]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        
        {/* Brand Logo & Clean Subtitle (No Pulse, No 'Ready to share') */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#1a1d26] border border-[#2ee86f]/30 flex items-center justify-center neu-raised shadow-[0_0_16px_rgba(46,232,111,0.25)]">
            <ZapShareIcon size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">
              Zapdrop
            </h1>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2ee86f]" />
              <span className="text-slate-300 font-medium">
                {hotspotState.enabled ? 'Hotspot Active' : isDesktopView ? 'Desktop Receiver' : 'Offline Direct P2P'}
              </span>
            </div>
          </div>
        </div>

        {/* Device Profile Pill */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl neu-raised border border-white/5 hover:border-[#2ee86f]/40 transition-all group"
        >
          <img
            src={myProfile.avatar}
            alt={myProfile.name}
            className="w-7 h-7 rounded-xl object-cover ring-1 ring-[#2ee86f]/60 group-hover:ring-[#2ee86f] transition-all"
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
