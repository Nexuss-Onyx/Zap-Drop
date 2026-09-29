import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, User, Radio, ArrowDownToLine } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSend: () => void;
  onOpenReceive: () => void;
  isActionMenuOpen: boolean;
  setIsActionMenuOpen: (open: boolean) => void;
  isDesktopView: boolean;
  isCardOpen?: boolean;
  isCardCollapsed?: boolean;
  onToggleCardCollapse?: () => void;
}

/**
 * Combined Modern Minimalist Luxurious Brand Logo:
 * Seamless synthesis of Image 1 (Notched Bar Base with twin nodes) + Image 2 (Concentric Hotspot Radio Arcs & Transmitter).
 */
export const ZapBrandLogo: React.FC<{ size?: number; className?: string; darkContrast?: boolean }> = ({
  size = 24,
  className = '',
  darkContrast = false,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id={darkContrast ? "zapCombinedGradDark" : "zapCombinedGrad"} x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={darkContrast ? "#0d1117" : "#2ee86f"} />
        <stop offset="50%" stopColor={darkContrast ? "#161b22" : "#4ade80"} />
        <stop offset="100%" stopColor={darkContrast ? "#0d1117" : "#ffffff"} />
      </linearGradient>
      <linearGradient id={darkContrast ? "zapArcGradDark" : "zapArcGrad"} x1="20" y1="15" x2="80" y2="15" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={darkContrast ? "#0a0d14" : "#2ee86f"} />
        <stop offset="50%" stopColor={darkContrast ? "#ffffff" : "#ffffff"} />
        <stop offset="100%" stopColor={darkContrast ? "#0a0d14" : "#2ee86f"} />
      </linearGradient>
    </defs>

    {/* Concentric Hotspot Radio Wave Arcs (Image 2) */}
    {/* Outer Arc */}
    <path
      d="M20 36C27.5 22.5 38 16 50 16C62 16 72.5 22.5 80 36"
      stroke={darkContrast ? "#0d1117" : "url(#zapArcGrad)"}
      strokeWidth="6"
      strokeLinecap="round"
    />
    {/* Inner Arc */}
    <path
      d="M31 41C36 32 42.5 27 50 27C57.5 27 64 32 69 41"
      stroke={darkContrast ? "#0d1117" : "#2ee86f"}
      strokeWidth="5"
      strokeLinecap="round"
    />

    {/* Central Transmitter Node (Image 2) */}
    <circle
      cx="50"
      cy="45"
      r="6.5"
      fill={darkContrast ? "#0d1117" : "#ffffff"}
    />

    {/* Vertical Transmitter Stem + Inverted-Y Antenna Base (Image 2) */}
    <path
      d="M50 51.5V63M50 63L39 74M50 63L61 74"
      stroke={darkContrast ? "#0d1117" : "#ffffff"}
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Notched Docking Bar Base (Image 1) */}
    <path
      d="M10 73C10 68.5817 13.5817 65 18 65H35L44 74C47.5 77.5 52.5 77.5 56 74L65 65H82C86.4183 65 90 68.5817 90 73V81C90 85.4183 86.4183 89 82 89H18C13.5817 89 10 85.4183 10 81V73Z"
      fill={darkContrast ? "#0a0d14" : "#141720"}
      stroke={darkContrast ? "#0a0d14" : "url(#zapCombinedGrad)"}
      strokeWidth="3.5"
    />

    {/* Twin Indicator Nodes on the Right (Image 1) */}
    <circle cx="73" cy="77" r="3.5" fill="#2ee86f" />
    <circle cx="83" cy="77" r="3.5" fill="#2ee86f" />
  </svg>
);

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenSend,
  onOpenReceive,
  isActionMenuOpen,
  setIsActionMenuOpen,
  isDesktopView,
  isCardOpen = false,
  onToggleCardCollapse,
}) => {
  // 3 Icons only: History (Left), Share (Center), Profile (Right)
  const handleCenterShareClick = () => {
    if (isDesktopView) {
      onOpenReceive();
    } else if (isCardOpen && onToggleCardCollapse) {
      onToggleCardCollapse();
    } else {
      setIsActionMenuOpen(!isActionMenuOpen);
    }
  };

  // Dimensions for compact, modern navbar
  const barWidth = 280;
  const barHeight = 48;
  const centerPos = barWidth / 2;
  const notchRadius = 30;
  const notchDepth = 26;
  const cornerR = 24;

  // Path with smooth scooped cutout centered on the Share button
  const pathD = `
    M ${cornerR} 0
    L ${centerPos - notchRadius - 10} 0
    C ${centerPos - notchRadius} 0 ${centerPos - notchRadius + 4} ${notchDepth} ${centerPos} ${notchDepth}
    C ${centerPos + notchRadius - 4} ${notchDepth} ${centerPos + notchRadius} 0 ${centerPos + notchRadius + 10} 0
    L ${barWidth - cornerR} 0
    A ${cornerR} ${cornerR} 0 0 1 ${barWidth} ${cornerR}
    L ${barWidth} ${barHeight - cornerR}
    A ${cornerR} ${cornerR} 0 0 1 ${barWidth - cornerR} ${barHeight}
    L ${cornerR} ${barHeight}
    A ${cornerR} ${cornerR} 0 0 1 0 ${barHeight - cornerR}
    L 0 ${cornerR}
    A ${cornerR} ${cornerR} 0 0 1 ${cornerR} 0
    Z
  `;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none pb-5 px-4">
      {/* Revealed Circle Action Buttons for Share (Send Hotspot & Receive Download) */}
      <AnimatePresence>
        {isActionMenuOpen && !isDesktopView && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 440, damping: 25 }}
            className="pointer-events-auto mb-3 flex items-center justify-center gap-6"
          >
            {/* SEND / HOTSPOT CIRCLE BUTTON */}
            <div className="flex flex-col items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onOpenSend();
                }}
                className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#15803d] to-[#2ee86f] text-white flex items-center justify-center shadow-[0_0_25px_rgba(46,232,111,0.5)] border-2 border-white/20 transition-all cursor-pointer"
                title="Send via Hotspot"
              >
                <Radio size={20} className="stroke-[2.5]" />
              </motion.button>
              <span className="text-[11px] font-bold text-white drop-shadow-md">Send</span>
            </div>

            {/* RECEIVE / DOWNLOAD CIRCLE BUTTON */}
            <div className="flex flex-col items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onOpenReceive();
                }}
                className="w-13 h-13 rounded-full bg-[#171922] text-[#2ee86f] border-2 border-[#2ee86f]/70 flex items-center justify-center shadow-[0_0_20px_rgba(46,232,111,0.35)] transition-all cursor-pointer"
                title="Receive Download"
              >
                <ArrowDownToLine size={20} className="stroke-[2.5]" />
              </motion.button>
              <span className="text-[11px] font-bold text-white drop-shadow-md">Receive</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-Icon Compact Floating Navigation Bar */}
      <div
        className="pointer-events-auto relative shadow-[0_12px_36px_rgba(0,0,0,0.85)]"
        style={{ width: `${barWidth}px`, height: `${barHeight}px` }}
      >
        {/* SVG Background Bar with Smooth Center Notch Cutout */}
        <svg
          width={barWidth}
          height={barHeight}
          viewBox={`0 0 ${barWidth} ${barHeight}`}
          className="absolute inset-0 w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
        >
          <path
            d={pathD}
            fill="#17181f"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1.2"
          />
        </svg>

        {/* Big Elevated Center Share Button with White Background & Zapdrop Brand Icon */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[-16px] z-20">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleCenterShareClick}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer border-2 border-white/80 ${
              isActionMenuOpen
                ? 'bg-white shadow-[0_0_30px_rgba(255,255,255,0.9)] scale-105'
                : 'bg-white shadow-[0_6px_22px_rgba(255,255,255,0.45)]'
            }`}
            title="Zapdrop"
            aria-label="Zapdrop"
          >
            <ZapBrandLogo size={26} darkContrast={true} />
          </motion.button>
        </div>

        {/* 3-Icon Clickable Row: History (Left), Share Spacer (Center), Profile (Right) */}
        <div className="relative z-10 w-full h-full flex items-center justify-between px-6">
          {/* Left: History */}
          <button
            onClick={() => {
              setIsActionMenuOpen(false);
              onSelectTab('history');
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'text-[#2ee86f]'
                : 'text-slate-400 hover:text-white'
            }`}
            aria-label="History"
          >
            <History size={20} className={activeTab === 'history' ? 'stroke-[2.5]' : 'stroke-[2]'} />
          </button>

          {/* Center spacer (under the big elevated share button) */}
          <div className="w-14 h-full" />

          {/* Right: Profile */}
          <button
            onClick={() => {
              setIsActionMenuOpen(false);
              onSelectTab('profile');
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'text-[#2ee86f]'
                : 'text-slate-400 hover:text-white'
            }`}
            aria-label="Profile"
          >
            <User size={20} className={activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[2]'} />
          </button>
        </div>
      </div>
    </div>
  );
};
