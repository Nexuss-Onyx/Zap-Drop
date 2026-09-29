import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, X, Smartphone, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { backend } from '../backend';

interface HotspotConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSsid?: string | null;
}

export const HotspotConnectModal: React.FC<HotspotConnectModalProps> = ({
  isOpen,
  onClose,
  currentSsid,
}) => {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssid.trim()) return;

    setIsConnecting(true);
    setError(null);

    try {
      const b = await backend();
      await b.connectWifi(ssid.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(
        err?.toString() ||
          'Failed to connect automatically. Please connect to your phone’s hotspot from your computer’s Wi-Fi menu.'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs pointer-events-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-[380px] neu-raised rounded-3xl border border-white/10 p-5 bg-[#161720] text-left shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2ee86f]/15 text-[#2ee86f] flex items-center justify-center">
              <Wifi size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Join Mobile Hotspot</h3>
              <p className="text-[10px] text-slate-400">Desktop high-speed peer network</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Informative Guidance */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Smartphone size={14} className="text-[#2ee86f]" />
            <span>How to connect:</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            1. On your phone: turn on <strong>Personal Hotspot</strong> in Settings.<br />
            2. Connect this computer to that Wi-Fi network, or enter details below:
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-3 rounded-2xl bg-[#2ee86f]/10 border border-[#2ee86f]/20 text-[#2ee86f] text-xs flex items-center justify-center gap-2 font-bold">
            <CheckCircle2 size={16} />
            <span>Connected! Initializing peer radar...</span>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Phone Hotspot SSID (Wi-Fi Name)
              </label>
              <input
                type="text"
                placeholder={currentSsid || 'e.g. Galaxy S24, iPhone'}
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:border-[#2ee86f]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Hotspot Password
              </label>
              <input
                type="password"
                placeholder="Enter Wi-Fi password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:border-[#2ee86f]"
              />
            </div>

            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-all cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={isConnecting || !ssid.trim()}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#39f07c] text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(46,232,111,0.3)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <span>Connect</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
