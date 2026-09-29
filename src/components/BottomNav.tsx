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
 * Brand Logo: Minimalist Luxury Hotspot + Download Drop Geometric Beacon
 */
export const ZapBrandLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
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
      <linearGradient id="zapBrandGrad" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2ee86f" />
        <stop offset="60%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
    </defs>
    {/* Concentric Hotspot Wave Arcs */}
    <path
      d="M22 34C30.2 24.8 40.4 19 50 19C59.6 19 69.8 24.8 78 34"
      stroke="url(#zapBrandGrad)"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path
      d="M33 45C38 40 43.8 37 50 37C56.2 37 62 40 67 45"
      stroke="#2ee86f"
      strokeWidth="5"
      strokeLinecap="round"
    />
    {/* Download Drop Arrow */}
    <path
      d="M50 38V66M50 66L39 54M50 66L61 54"
      stroke="#ffffff"
      strokeWidth="6.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Receiver Tray */}
    <path
      d="M26 73C26 77.4183 29.5817 81 34 81H66C70.4183 81 74 77.4183 74 73"
      stroke="url(#zapBrandGrad)"
      strokeWidth="6"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Reverted Exact Share Icon (Curved arrow springing out of open container box)
 */
export const ZapShareIcon: React.FC<{ size?: number; className?: string; color?: string }> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Open Container Box */}
    <path
      d="M38 31H19C15.6863 31 13 33.6863 13 37V81C13 84.3137 15.6863 87 19 87H69C72.3137 87 75 84.3137 75 81V62L67.5 56.5V79.5H20.5V38.5H30.5L38 31Z"
      fill={color}
    />
    {/* Curved Arrow Springing Outward to the Top-Right */}
    <path
      d="M31.5 61.5C35 48 44.5 35 62.5 30.5V18.5L87 37.5L62.5 56.5V43.5C49 44.5 39 50.5 31.5 61.5Z"
      fill={color}
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

        {/* Big Elevated Center Share Button with Reverted Curved Arrow Share Icon */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[-16px] z-20">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleCenterShareClick}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer border-2 border-white/25 ${
              isActionMenuOpen
                ? 'bg-gradient-to-tr from-[#16a34a] to-[#2ee86f] text-black shadow-[0_0_30px_rgba(46,232,111,0.8)] scale-105'
                : 'bg-gradient-to-tr from-[#22c55e] to-[#39f07c] text-black shadow-[0_6px_22px_rgba(46,232,111,0.55)]'
            }`}
            title="Zapdrop Share"
            aria-label="Zapdrop Share"
          >
            <ZapShareIcon size={24} color="#0d0e12" />
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
