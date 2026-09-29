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
 * Modern Minimalist Luxurious Logo:
 * Combines Hotspot (radiating beacon broadcast waves) + Download (geometric precision downward drop arrow & tray).
 * Distinct luxurious gradient aesthetic (emerald & pure luminescent white) instead of plain black.
 */
export const ZapShareIcon: React.FC<{ size?: number; className?: string; color?: string }> = ({
  size = 24,
  className = '',
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
      <linearGradient id="zapLuxuryGrad" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2ee86f" />
        <stop offset="50%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
      <linearGradient id="zapCoreGrad" x1="30" y1="20" x2="70" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#2ee86f" />
      </linearGradient>
    </defs>

    {/* Top Hotspot Outer Radiating Wave Arc */}
    <path
      d="M22 34C30.2 24.8 40.4 19 50 19C59.6 19 69.8 24.8 78 34"
      stroke="url(#zapLuxuryGrad)"
      strokeWidth="5"
      strokeLinecap="round"
    />

    {/* Top Hotspot Inner Radiating Wave Arc */}
    <path
      d="M32 44C37.2 38.5 43.4 35 50 35C56.6 35 62.8 38.5 68 44"
      stroke="#2ee86f"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeOpacity="0.9"
    />

    {/* Download Precision Arrow - Piercing downward through the hotspot waves */}
    <path
      d="M50 36V66M50 66L38 53M50 66L62 53"
      stroke="url(#zapCoreGrad)"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Minimalist Receiver Cradle Base */}
    <path
      d="M26 73C26 77.4183 29.5817 81 34 81H66C70.4183 81 74 77.4183 74 73"
      stroke="url(#zapLuxuryGrad)"
      strokeWidth="5"
      strokeLinecap="round"
    />
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

        {/* Big Elevated Center Share Button with Combined Hotspot+Download Luxury Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[-16px] z-20">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleCenterShareClick}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer border-2 border-white/20 ${
              isActionMenuOpen
                ? 'bg-[#12141c] shadow-[0_0_30px_rgba(46,232,111,0.7)] ring-2 ring-[#2ee86f]'
                : 'bg-gradient-to-tr from-[#0f1117] via-[#161a24] to-[#1e2433] shadow-[0_6px_22px_rgba(0,0,0,0.7)] hover:border-[#2ee86f]/50'
            }`}
            title="Zapdrop Share"
            aria-label="Zapdrop Share"
          >
            <ZapShareIcon size={26} />
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
