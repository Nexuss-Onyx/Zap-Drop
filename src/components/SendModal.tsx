import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, ChevronUp, AlertCircle, Wifi, Copy, Check } from 'lucide-react';
import { DeviceFile, DeviceProfile, HotspotState } from '../types';
import { formatFileSize } from '../services/networkUtils';
import { startSend, SendSession } from '../services/send';
import { backend } from '../backend';
import { Capacitor } from '@capacitor/core';
import { ZapdropNative } from '../native/zapdrop-native';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles: DeviceFile[];
  hotspotState: HotspotState;
  myProfile: DeviceProfile;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  selectedFiles,
  hotspotState,
  isCollapsed,
  setIsCollapsed,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [transferProgress, setTransferProgress] = useState<{ bytes: number; total: number } | null>(null);
  const [transferDone, setTransferDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sessionRef = useRef<SendSession | null>(null);

  const initOrRefreshServer = () => {
    if (!isOpen || selectedFiles.length === 0) return;

    startSend(
      selectedFiles,
      (_id, bytes, total) => {
        setTransferProgress({ bytes, total });
      },
      () => {
        setTransferDone(true);
      }
    )
      .then((session) => {
        if (sessionRef.current) {
          sessionRef.current.stop().catch(() => {});
        }
        sessionRef.current = session;
        setQrCodeDataUrl(session.qrCodeUrl);
        setShortCode(session.code || `${session.ip}:${session.port}:${session.token}`);
        setErrorMsg(null);
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Failed to start file sharing server');
      });
  };

  useEffect(() => {
    if (!isOpen || selectedFiles.length === 0) {
      if (sessionRef.current) {
        sessionRef.current.stop().catch(() => {});
        sessionRef.current = null;
      }
      setQrCodeDataUrl(null);
      setShortCode(null);
      setTransferProgress(null);
      setTransferDone(false);
      setErrorMsg(null);
      return;
    }

    // startServer owns the asynchronous hotspot -> interface -> server sequence.
    // Do not race it with a second toggle request.
    initOrRefreshServer();

    return () => {
      if (sessionRef.current) {
        sessionRef.current.stop().catch(() => {});
        sessionRef.current = null;
      }
    };
  }, [isOpen, selectedFiles]);

  if (!isOpen) return null;

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  const handleAttemptClose = () => {
    setShowExitConfirm(true);
  };

  const handleConfirmExit = () => {
    if (sessionRef.current) {
      sessionRef.current.stop().catch(() => {});
      sessionRef.current = null;
    }
    setShowExitConfirm(false);
    setIsCollapsed(false);
    onClose();
  };

  const handleCopyCode = async () => {
    if (!shortCode) return;
    try {
      const b = await backend();
      await b.copyText(shortCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      navigator.clipboard?.writeText(shortCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Exit Confirmation Dialog */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-[250px] neu-raised rounded-3xl border border-white/10 p-4 bg-[#171821] text-center shadow-2xl"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-2">
                <AlertCircle size={18} />
              </div>
              <h3 className="text-xs font-bold text-white mb-1">Stop Sending?</h3>
              <p className="text-[11px] text-slate-400 mb-3">
                This will shut down your local file server and close the transfer session.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  Stay
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
                >
                  Exit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Send Floating Sheet */}
      <div className="fixed bottom-16 left-0 right-0 z-40 flex flex-col items-center pointer-events-none px-4">
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: 1,
            height: isCollapsed ? '52px' : 'auto',
          }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-[320px] pointer-events-auto neu-raised rounded-3xl border border-white/10 bg-[#161720]/95 backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.85)] overflow-hidden"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title={isCollapsed ? 'Expand' : 'Minimize'}
              >
                {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              <span className="text-xs font-bold text-white">
                {transferDone ? 'Release Complete' : `Releasing ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`}
              </span>
              <span className="text-[10px] text-slate-400">
                ({formatFileSize(totalSize)})
              </span>
            </div>

            <div className="flex items-center">
              <button
                onClick={handleAttemptClose}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Expanded Content */}
          {!isCollapsed && (
            <div className="p-4 flex flex-col items-center text-center space-y-3">
              {/* Native Hotspot Banner if Disabled */}
              {Capacitor.isNativePlatform() && !hotspotState.enabled && (
                <button
                  onClick={async () => {
                    try {
                      await ZapdropNative.toggleHotspot({ enable: true });
                      initOrRefreshServer();
                    } catch {}
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-between transition-all cursor-pointer hover:bg-amber-500/30"
                >
                  <span className="flex items-center gap-1.5">
                    <Wifi size={14} className="text-amber-400 animate-pulse" />
                    <span>Enable Mobile Hotspot</span>
                  </span>
                  <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-md font-extrabold uppercase">
                    Turn ON
                  </span>
                </button>
              )}

              {/* QR Code Prominent Container */}
              <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center min-w-[200px] min-h-[200px]">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Scan QR Code to receive files"
                    className="w-44 h-44 object-contain"
                  />
                ) : errorMsg ? (
                  <div className="text-xs text-red-500 p-2">{errorMsg}</div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <Wifi size={28} className="animate-pulse text-[#2ee86f]" />
                    <span className="text-[11px] font-medium text-slate-700">Starting Server...</span>
                  </div>
                )}
              </div>

              {/* Short Connection Code */}
              {shortCode && (
                <div className="w-full flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/10 text-xs">
                  <span className="font-mono text-[10px] text-emerald-400 truncate max-w-[200px] select-all">
                    {shortCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-white font-semibold transition-all cursor-pointer flex items-center gap-1"
                    title="Copy connection code"
                  >
                    {copied ? <Check size={11} className="text-[#2ee86f]" /> : <Copy size={11} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

              {/* Transfer Progress Bar */}
              {transferProgress && transferProgress.total > 0 && (
                <div className="w-full space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Transferring...</span>
                    <span>{Math.round((transferProgress.bytes / transferProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#22c55e] to-[#39f07c] transition-all"
                      style={{
                        width: `${Math.min(100, Math.round((transferProgress.bytes / transferProgress.total) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};
