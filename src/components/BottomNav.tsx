import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, History, Share2, User, Send, ArrowDownToLine } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSend: () => void;
  onOpenReceive: () => void;
  isActionMenuOpen: boolean;
  setIsActionMenuOpen: (open: boolean) => void;
  isDesktopView: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenSend,
  onOpenReceive,
  isActionMenuOpen,
  setIsActionMenuOpen,
  isDesktopView,
}) => {
  const tabs = [
    { id: 'files' as const, icon: Home, label: 'Home' },
    { id: 'history' as const, icon: History, label: 'History' },
    { id: 'share' as const, icon: Share2, label: 'Share' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
  ];

  const activeIndex = tabs.findIndex((t) => t.id === activeTab);
  const selectedIndex = activeIndex === -1 ? 2 : activeIndex; // default to share if not matched

  const handleTabClick = (index: number, tabId: string) => {
    if (tabId === 'share') {
      if (isDesktopView) {
        onOpenReceive();
      } else {
        setIsActionMenuOpen(!isActionMenuOpen);
      }
    } else {
      setIsActionMenuOpen(false);
      onSelectTab(tabId as ActiveTab);
    }
  };

  // Notch dimensions matching the reference design
  const barWidth = 320;
  const barHeight = 52;
  const tabWidth = barWidth / tabs.length;
  const activeCenterX = selectedIndex * tabWidth + tabWidth / 2;

  // Generate SVG path for the bar with dynamic smooth scooped notch
  const notchRadius = 26;
  const notchDepth = 30;
  const cornerR = 20;

  // Path with smooth Bézier curves forming the organic cutout
  const pathD = `
    M ${cornerR} 0
    L ${activeCenterX - notchRadius - 10} 0
    C ${activeCenterX - notchRadius} 0, ${activeCenterX - notchRadius + 4} ${notchDepth}, ${activeCenterX} ${notchDepth}
    C ${activeCenterX + notchRadius - 4} ${notchDepth}, ${activeCenterX + notchRadius} 0, ${activeCenterX + notchRadius + 10} 0
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
      {/* Revealed Circle Action Buttons for Share (Send & Receive) */}
      <AnimatePresence>
        {isActionMenuOpen && !isDesktopView && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 25 }}
            className="pointer-events-auto mb-3 flex items-center justify-center gap-5"
          >
            {/* SEND CIRCLE BUTTON */}
            <div className="flex flex-col items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onOpenSend();
                }}
                className="w-13 h-13 rounded-full bg-[#22c55e] text-black flex items-center justify-center shadow-[0_0_25px_rgba(34,197,94,0.6)] border-2 border-white/20 transition-all"
                title="Send"
              >
                <Send size={20} className="stroke-[2.5] ml-0.5" />
              </motion.button>
              <span className="text-[11px] font-bold text-white drop-shadow-md">Send</span>
            </div>

            {/* RECEIVE CIRCLE BUTTON */}
            <div className="flex flex-col items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onOpenReceive();
                }}
                className="w-13 h-13 rounded-full bg-[#1b1c23] text-[#22c55e] border-2 border-[#22c55e] flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all"
                title="Receive"
              >
                <ArrowDownToLine size={20} className="stroke-[2.5]" />
              </motion.button>
              <span className="text-[11px] font-bold text-white drop-shadow-md">Receive</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Compact Floating Navigation Bar (Exact Reference Copy) */}
      <div
        className="pointer-events-auto relative shadow-[0_12px_36px_rgba(0,0,0,0.85)]"
        style={{ width: `${barWidth}px`, height: `${barHeight}px` }}
      >
        {/* Dynamic SVG Background Bar with Smooth Cutout Notch */}
        <svg
          width={barWidth}
          height={barHeight}
          viewBox={`0 0 ${barWidth} ${barHeight}`}
          className="absolute inset-0 w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
        >
          {/* Dark Bar Body */}
          <motion.path
            d={pathD}
            fill="#17181f"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1.2"
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          />
        </svg>

        {/* Floating Green Circle Pill that nests in the cutout */}
        <motion.div
          animate={{
            x: activeCenterX - 22,
          }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="absolute top-[-14px] w-11 h-11 rounded-full bg-[#22c55e] flex items-center justify-center text-black shadow-[0_4px_20px_rgba(34,197,94,0.55)] border-2 border-white/20 z-20 pointer-events-none"
        >
          {React.createElement(tabs[selectedIndex].icon, {
            size: 20,
            className: 'stroke-[2.4]',
          })}
        </motion.div>

        {/* Clickable Tab Icons Row */}
        <div className="relative z-10 w-full h-full flex items-center justify-between">
          {tabs.map((tab, idx) => {
            const isActive = selectedIndex === idx;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(idx, tab.id)}
                className="flex-1 h-full flex items-center justify-center transition-all group focus:outline-none"
                style={{ width: `${tabWidth}px` }}
                aria-label={tab.label}
              >
                {/* When inactive, show crisp outline monochrome icon */}
                {!isActive && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                    <Icon size={18} className="stroke-[2]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
