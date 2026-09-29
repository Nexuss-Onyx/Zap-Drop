import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, User, Share2, Send, ArrowDownToLine, Folder } from 'lucide-react';
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
  const handleShareClick = () => {
    if (isDesktopView) {
      // On desktop view, assume desktop receiver directly scans to receive from mobile hotspot
      onOpenReceive();
      setIsActionMenuOpen(false);
    } else {
      // On mobile / tablet view, toggle the 2 circular Send and Receive buttons
      setIsActionMenuOpen(!isActionMenuOpen);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none pb-6 px-4">
      {/* Revealed Circle Action Buttons (Only Send and Receive circles, no card clutter) */}
      <AnimatePresence>
        {isActionMenuOpen && !isDesktopView && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="pointer-events-auto mb-4 flex items-center justify-center gap-6"
          >
            {/* SEND CIRCULAR BUTTON */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onOpenSend();
                }}
                className="w-14 h-14 rounded-full bg-[#22c55e] text-black flex items-center justify-center shadow-[0_0_25px_rgba(34,197,94,0.6)] border-2 border-white/20 transition-all"
                title="Send"
              >
                <Send size={22} className="stroke-[2.5] ml-0.5" />
              </motion.button>
              <span className="text-xs font-bold text-white drop-shadow-md">Send</span>
            </div>

            {/* RECEIVE CIRCULAR BUTTON */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onOpenReceive();
                }}
                className="w-14 h-14 rounded-full bg-[#1e2028] text-[#22c55e] border-2 border-[#22c55e] flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all"
                title="Receive"
              >
                <ArrowDownToLine size={22} className="stroke-[2.5]" />
              </motion.button>
              <span className="text-xs font-bold text-white drop-shadow-md">Receive</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-Icon Central Navigation Bar with Curved Cutout Style */}
      <div className="pointer-events-auto relative w-full max-w-xs bg-[#16171d] border border-white/10 rounded-[32px] p-2 neu-raised shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <div className="flex items-center justify-around relative">
          
          {/* Left Icon: History */}
          <button
            onClick={() => {
              onSelectTab('history');
              setIsActionMenuOpen(false);
            }}
            className="relative flex flex-col items-center justify-center py-2 px-3 transition-all duration-300 group"
          >
            {activeTab === 'history' ? (
              <motion.div
                layoutId="activeTabPill"
                className="w-11 h-11 rounded-full bg-[#22c55e] text-black flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.5)] -translate-y-2"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              >
                <History size={20} className="stroke-[2.5]" />
              </motion.div>
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors">
                <History size={19} />
              </div>
            )}
            <span className={`text-[10px] font-semibold mt-0.5 ${activeTab === 'history' ? 'text-[#22c55e]' : 'text-slate-400'}`}>
              History
            </span>
          </button>

          {/* Central Highlight Button: Share (or Direct Receive on Desktop) */}
          <div className="relative -mt-6">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleShareClick}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isActionMenuOpen
                  ? 'bg-[#15803d] text-white shadow-[0_0_25px_rgba(34,197,94,0.7)]'
                  : 'bg-[#22c55e] text-black shadow-[0_0_25px_rgba(34,197,94,0.5)]'
              } border-2 border-white/20`}
              title={isDesktopView ? "Receive Files" : "Share"}
            >
              <Share2 size={24} className="stroke-[2.5]" />
            </motion.button>
          </div>

          {/* Right Icon: Profile / Device */}
          <button
            onClick={() => {
              onSelectTab('profile');
              setIsActionMenuOpen(false);
            }}
            className="relative flex flex-col items-center justify-center py-2 px-3 transition-all duration-300 group"
          >
            {activeTab === 'profile' ? (
              <motion.div
                layoutId="activeTabPill"
                className="w-11 h-11 rounded-full bg-[#22c55e] text-black flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.5)] -translate-y-2"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              >
                <User size={20} className="stroke-[2.5]" />
              </motion.div>
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors">
                <User size={19} />
              </div>
            )}
            <span className={`text-[10px] font-semibold mt-0.5 ${activeTab === 'profile' ? 'text-[#22c55e]' : 'text-slate-400'}`}>
              Profile
            </span>
          </button>

        </div>
      </div>
    </div>
  );
};
