import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Folder, History, User, Send, ArrowDownToLine, Radio, Zap, X } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSend: () => void;
  onOpenReceive: () => void;
  onToggleHotspot: () => void;
  isHotspotActive: boolean;
  isActionMenuOpen: boolean;
  setIsActionMenuOpen: (open: boolean) => void;
  pendingTransferCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenSend,
  onOpenReceive,
  onToggleHotspot,
  isHotspotActive,
  isActionMenuOpen,
  setIsActionMenuOpen,
  pendingTransferCount = 0,
}) => {
  const tabs = [
    { id: 'files' as ActiveTab, label: 'Files', icon: Folder },
    { id: 'history' as ActiveTab, label: 'History', icon: History, badge: pendingTransferCount },
    { id: 'profile' as ActiveTab, label: 'Device', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none pb-6 px-4">
      {/* Quick Action Flyout Menu (Send & Receive Popups) */}
      <AnimatePresence>
        {isActionMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 380, damping: 25 }}
            className="pointer-events-auto mb-4 w-full max-w-sm p-4 rounded-3xl neu-raised border border-white/10 backdrop-blur-xl bg-[#17181e]/95 shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Zapdrop Fast Share
                </span>
              </div>
              <button
                onClick={() => setIsActionMenuOpen(false)}
                className="w-7 h-7 rounded-full neu-pressed flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                aria-label="Close action menu"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* SEND BUTTON */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onOpenSend();
                }}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-[#1f222d] to-[#15161d] neu-flat hover:border-[#22c55e]/40 border border-white/5 group transition-all"
              >
                <div className="w-13 h-13 rounded-2xl bg-[#22c55e] text-black flex items-center justify-center mb-2.5 shadow-[0_0_20px_rgba(34,197,94,0.4)] group-hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] transition-all">
                  <Send size={24} className="stroke-[2.3] ml-0.5" />
                </div>
                <span className="font-bold text-white text-sm">Send Files</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Show QR & Broadcast</span>
              </motion.button>

              {/* RECEIVE BUTTON */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onOpenReceive();
                }}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-[#1f222d] to-[#15161d] neu-flat hover:border-[#22c55e]/40 border border-white/5 group transition-all"
              >
                <div className="w-13 h-13 rounded-2xl bg-[#19241f] border border-[#22c55e]/40 text-[#22c55e] flex items-center justify-center mb-2.5 shadow-[0_0_15px_rgba(34,197,94,0.2)] group-hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all">
                  <ArrowDownToLine size={24} className="stroke-[2.3]" />
                </div>
                <span className="font-bold text-white text-sm">Receive Files</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Radar Scan Devices</span>
              </motion.button>
            </div>

            {/* Hotspot Direct Switcher */}
            <div className="mt-3 pt-3 border-t border-white/5">
              <button
                onClick={onToggleHotspot}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                  isHotspotActive
                    ? 'bg-[#183020] border border-[#22c55e]/40 text-[#22c55e]'
                    : 'neu-pressed text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${isHotspotActive ? 'bg-[#22c55e] text-black' : 'bg-slate-800 text-slate-400'}`}>
                    <Radio size={16} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">{isHotspotActive ? 'Zapdrop 5GHz Hotspot (Active)' : 'Direct Mobile Hotspot'}</div>
                    <div className="text-[10px] text-slate-400">{isHotspotActive ? 'Peers can connect via Wi-Fi' : 'Share without existing Wi-Fi router'}</div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isHotspotActive ? 'border-[#22c55e] bg-[#22c55e]' : 'border-slate-600'}`}>
                  {isHotspotActive && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Curved Cutout Floating Navigation Bar */}
      <div className="pointer-events-auto relative w-full max-w-md bg-[#16171d] border border-white/10 rounded-[32px] p-2 neu-raised shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <div className="flex items-center justify-around relative">
          
          {/* Left Tab: Files */}
          <button
            onClick={() => onSelectTab('files')}
            className="relative flex flex-col items-center justify-center py-2 px-4 transition-all duration-300 group"
          >
            {activeTab === 'files' ? (
              <motion.div
                layoutId="activeTabPill"
                className="w-12 h-12 rounded-full bg-[#22c55e] text-black flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.5)] -translate-y-2"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              >
                <Folder size={22} className="stroke-[2.4]" />
              </motion.div>
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors">
                <Folder size={20} />
              </div>
            )}
            <span className={`text-[10px] font-semibold mt-0.5 ${activeTab === 'files' ? 'text-[#22c55e]' : 'text-slate-400'}`}>
              Files
            </span>
          </button>

          {/* Tab 2: History */}
          <button
            onClick={() => onSelectTab('history')}
            className="relative flex flex-col items-center justify-center py-2 px-4 transition-all duration-300 group"
          >
            {activeTab === 'history' ? (
              <motion.div
                layoutId="activeTabPill"
                className="w-12 h-12 rounded-full bg-[#22c55e] text-black flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.5)] -translate-y-2"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              >
                <History size={22} className="stroke-[2.4]" />
              </motion.div>
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors relative">
                <History size={20} />
                {pendingTransferCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#22c55e] ring-2 ring-[#16171d]" />
                )}
              </div>
            )}
            <span className={`text-[10px] font-semibold mt-0.5 ${activeTab === 'history' ? 'text-[#22c55e]' : 'text-slate-400'}`}>
              History
            </span>
          </button>

          {/* Central Highlight Share Button (Toggles Send/Receive Popup) */}
          <div className="relative -mt-6">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isActionMenuOpen
                  ? 'bg-gradient-to-tr from-[#15803d] to-[#22c55e] text-black shadow-[0_0_30px_rgba(34,197,94,0.7)] rotate-45'
                  : 'bg-gradient-to-tr from-[#16a34a] to-[#4ade80] text-black shadow-[0_0_25px_rgba(34,197,94,0.5)]'
              } border-2 border-white/20`}
              aria-label="Zapdrop Quick Share Actions"
            >
              {isActionMenuOpen ? (
                <X size={26} className="stroke-[2.5]" />
              ) : (
                <Zap size={26} className="fill-black stroke-black" />
              )}
            </motion.button>
          </div>

          {/* Tab 3: Device / Profile */}
          <button
            onClick={() => onSelectTab('profile')}
            className="relative flex flex-col items-center justify-center py-2 px-4 transition-all duration-300 group"
          >
            {activeTab === 'profile' ? (
              <motion.div
                layoutId="activeTabPill"
                className="w-12 h-12 rounded-full bg-[#22c55e] text-black flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.5)] -translate-y-2"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              >
                <User size={22} className="stroke-[2.4]" />
              </motion.div>
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors">
                <User size={20} />
              </div>
            )}
            <span className={`text-[10px] font-semibold mt-0.5 ${activeTab === 'profile' ? 'text-[#22c55e]' : 'text-slate-400'}`}>
              Device
            </span>
          </button>

        </div>
      </div>
    </div>
  );
};
