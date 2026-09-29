import React, { useState } from 'react';
import { DeviceProfile, HotspotState } from '../types';
import logoImg from '../assets/logo.png';
import { ZapBrandLogo } from './BottomNav';

interface HeaderProps {
  myProfile: DeviceProfile;
  hotspotState: HotspotState;
  onOpenProfile: () => void;
  isDesktopView: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  myProfile,
  onOpenProfile,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full px-4 py-3 bg-[#121316]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        
        {/* Brand Logo & Name - Clean Minimalist */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden neu-raised border border-white/10 shadow-[0_0_12px_rgba(46,232,111,0.25)] flex items-center justify-center bg-[#14161f]">
            {!imgFailed && logoImg ? (
              <img
                src={logoImg}
                alt="Zapdrop"
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <ZapBrandLogo size={18} />
            )}
          </div>
          <h1 className="text-base font-bold tracking-tight text-white leading-none">
            Zapdrop
          </h1>
        </div>

        {/* Minimal Avatar Only (Device Name Hidden) */}
        <button
          onClick={onOpenProfile}
          className="p-1 rounded-2xl neu-raised border border-white/10 hover:border-[#2ee86f]/50 transition-all group cursor-pointer focus:outline-none"
          title={myProfile.name}
          aria-label="Profile"
        >
          <img
            src={myProfile.avatar}
            alt={myProfile.name}
            className="w-7 h-7 rounded-xl object-cover ring-1 ring-[#2ee86f]/60 group-hover:ring-[#2ee86f] transition-all"
          />
        </button>

      </div>
    </header>
  );
};
