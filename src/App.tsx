import React, { useState, useEffect, useRef } from 'react';
import {
  ActiveTab,
  DeviceFile,
  DeviceProfile,
  HotspotState,
  TransferRecord,
} from './types';
import {
  DEFAULT_SAMPLE_PEERS,
  INITIAL_TRANSFERS,
  AVATAR_PRESETS,
} from './services/mockNetwork';
import { INITIAL_FILES, PlatformBridge } from './services/platformBridge';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DeviceExplorer } from './components/DeviceExplorer';
import { TransferHistory } from './components/TransferHistory';
import { ProfileSettings } from './components/ProfileSettings';
import { SendModal } from './components/SendModal';
import { ReceiveModal } from './components/ReceiveModal';
import { TransferProgressModal } from './components/TransferProgressModal';

export default function App() {
  const detectedOs = PlatformBridge.getDetectedOS();

  // Screen size detection: Desktop (>= 1024px) vs Phone / Tablet (< 1024px)
  const [isDesktopView, setIsDesktopView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktopView(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Device profile state
  const [myProfile, setMyProfile] = useState<DeviceProfile>(() => {
    const saved = localStorage.getItem('zapdrop_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      id: 'self-dev-' + Math.random().toString(36).substring(2, 7),
      name: detectedOs === 'android' ? 'Galaxy S24' : 'MacBook Pro',
      avatar: AVATAR_PRESETS[0],
      os: detectedOs,
      signalStrength: 99,
      status: 'online',
    };
  });

  // Hotspot state
  const [hotspotState, setHotspotState] = useState<HotspotState>(() => ({
    enabled: false,
    ssid: 'Zapdrop-Hotspot',
    password: 'zap-speed-889',
  }));

  // Discovered peers
  const [peers, setPeers] = useState<DeviceProfile[]>(DEFAULT_SAMPLE_PEERS);

  // Files in device storage
  const [files, setFiles] = useState<DeviceFile[]>(() => {
    const saved = localStorage.getItem('zapdrop_files');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_FILES;
  });

  // Selection & Transfers
  const [selectedFiles, setSelectedFiles] = useState<DeviceFile[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>(() => {
    const saved = localStorage.getItem('zapdrop_transfers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_TRANSFERS;
  });

  // Active tab (Default: files / home folder screen above navigation)
  const [activeTab, setActiveTab] = useState<ActiveTab>('files');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isSendCollapsed, setIsSendCollapsed] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isReceiveCollapsed, setIsReceiveCollapsed] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [currentTransfer, setCurrentTransfer] = useState<TransferRecord | null>(null);

  const isCardActive = isSendModalOpen || isReceiveModalOpen;
  const isAnyCardCollapsed = (isSendModalOpen && isSendCollapsed) || (isReceiveModalOpen && isReceiveCollapsed);

  const handleToggleCardCollapse = () => {
    if (isReceiveModalOpen) {
      setIsReceiveCollapsed((prev) => !prev);
    } else if (isSendModalOpen) {
      setIsSendCollapsed((prev) => !prev);
    }
  };

  const transferIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('zapdrop_profile', JSON.stringify(myProfile));
  }, [myProfile]);

  useEffect(() => {
    localStorage.setItem('zapdrop_transfers', JSON.stringify(transfers));
  }, [transfers]);

  // File selection toggles
  const handleToggleSelectFile = (file: DeviceFile) => {
    setSelectedFiles((prev) => {
      const exists = prev.some((f) => f.id === file.id);
      if (exists) {
        return prev.filter((f) => f.id !== file.id);
      } else {
        return [...prev, file];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedFiles(files);
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
  };

  const handleAddNewFiles = (newFiles: DeviceFile[]) => {
    setFiles((prev) => [...newFiles, ...prev]);
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // SEND CLICK: Automatically turn on hotspot and open clean centered QR code
  const handleOpenSend = () => {
    setHotspotState((prev) => ({ ...prev, enabled: true }));
    setIsReceiveModalOpen(false);
    setIsSendCollapsed(false);
    setIsSendModalOpen(true);
  };

  // RECEIVE CLICK: Turn on WiFi / scan nearby devices
  const handleOpenReceive = () => {
    setIsSendModalOpen(false);
    setIsReceiveCollapsed(false);
    setIsReceiveModalOpen(true);
  };

  // Connect to a device clicked in the scan to start receiving/transferring
  const handleConnectDevice = (targetPeer: DeviceProfile) => {
    const mockFile: DeviceFile = {
      id: 'rx-' + Date.now(),
      name: 'Shared_Archive.zip',
      path: '/storage/emulated/0/Downloads/Shared_Archive.zip',
      size: 42000000,
      modifiedDate: 'Today',
      category: 'archives',
      mimeType: 'application/zip',
      isDirectory: false,
      extension: 'zip',
    };

    const newTransfer: TransferRecord = {
      id: 'rx-' + Date.now(),
      fileName: mockFile.name,
      fileSize: mockFile.size,
      fileType: mockFile.mimeType,
      category: mockFile.category,
      senderId: targetPeer.id,
      senderName: targetPeer.name,
      senderAvatar: targetPeer.avatar,
      senderOs: targetPeer.os,
      receiverId: myProfile.id,
      receiverName: myProfile.name,
      receiverAvatar: myProfile.avatar,
      receiverOs: myProfile.os,
      direction: 'received',
      timestamp: Date.now(),
      dateLabel: 'Today, Just now',
      status: 'transferring',
      progress: 0,
      speedMbps: 58.4,
    };

    setCurrentTransfer(newTransfer);
    simulateTransferProgress(newTransfer);
  };

  const handleStartTransferWithFiles = (targetPeer: DeviceProfile, filesToSend: DeviceFile[]) => {
    const mainFile = filesToSend[0] || files[0];
    const totalSize = filesToSend.reduce((sum, f) => sum + f.size, 0);

    const newTransfer: TransferRecord = {
      id: 'tx-' + Date.now(),
      fileName: filesToSend.length === 1 ? mainFile.name : `${mainFile.name} + ${filesToSend.length - 1} files`,
      fileSize: totalSize,
      fileType: mainFile.mimeType,
      category: mainFile.category,
      senderId: myProfile.id,
      senderName: myProfile.name,
      senderAvatar: myProfile.avatar,
      senderOs: myProfile.os,
      receiverId: targetPeer.id,
      receiverName: targetPeer.name,
      receiverAvatar: targetPeer.avatar,
      receiverOs: targetPeer.os,
      direction: 'sent',
      timestamp: Date.now(),
      dateLabel: 'Today, Just now',
      status: 'transferring',
      progress: 0,
      speedMbps: 54.0,
    };

    setCurrentTransfer(newTransfer);
    simulateTransferProgress(newTransfer);
  };

  const simulateTransferProgress = (initialRecord: TransferRecord) => {
    if (transferIntervalRef.current) {
      clearInterval(transferIntervalRef.current);
    }

    let currentProgress = 0;
    transferIntervalRef.current = setInterval(() => {
      currentProgress += 14 + Math.random() * 8;
      if (currentProgress >= 100) {
        currentProgress = 100;
        if (transferIntervalRef.current) clearInterval(transferIntervalRef.current);

        const completedRecord: TransferRecord = {
          ...initialRecord,
          progress: 100,
          status: 'completed',
        };

        setCurrentTransfer(completedRecord);
        setTransfers((prev) => [completedRecord, ...prev]);
      } else {
        setCurrentTransfer((prev) =>
          prev
            ? {
                ...prev,
                progress: currentProgress,
              }
            : null
        );
      }
    }, 280);
  };

  const handleCancelTransfer = () => {
    if (transferIntervalRef.current) {
      clearInterval(transferIntervalRef.current);
    }
    setCurrentTransfer(null);
  };

  const handleDownloadCompleted = (record: TransferRecord) => {
    const blob = new Blob([`Zapdrop transfer data for ${record.fileName}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#121316] text-[#e2e8f0] flex flex-col selection:bg-[#22c55e] selection:text-black">
      {/* Clean Minimalist Header */}
      <Header
        myProfile={myProfile}
        hotspotState={hotspotState}
        onOpenProfile={() => setActiveTab('profile')}
        isDesktopView={isDesktopView}
      />

      {/* Main Screen Content (Folders/Files Explorer is the default view above navigation) */}
      <main className="flex-1 w-full relative">
        {activeTab === 'files' && (
          <DeviceExplorer
            files={files}
            selectedFiles={selectedFiles}
            onToggleSelectFile={handleToggleSelectFile}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onOpenSendWithFiles={(filesToSend) => {
              setSelectedFiles(filesToSend);
              handleOpenSend();
            }}
            onAddNewFiles={handleAddNewFiles}
            onDeleteFile={handleDeleteFile}
          />
        )}

        {activeTab === 'history' && (
          <TransferHistory
            transfers={transfers}
            onClearHistory={() => setTransfers([])}
            onDeleteTransfer={(id) => setTransfers((prev) => prev.filter((t) => t.id !== id))}
            onResend={(record) => {
              const matchedPeer = peers[0];
              const mockFile: DeviceFile = {
                id: 'resend-' + Date.now(),
                name: record.fileName,
                path: `/storage/emulated/0/${record.fileName}`,
                size: record.fileSize,
                modifiedDate: 'Today',
                category: record.category,
                mimeType: record.fileType,
                isDirectory: false,
                extension: record.fileName.split('.').pop() || 'bin',
              };
              handleStartTransferWithFiles(matchedPeer, [mockFile]);
            }}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileSettings
            myProfile={myProfile}
            onUpdateProfile={(updated) => setMyProfile((prev) => ({ ...prev, ...updated }))}
            hotspotState={hotspotState}
            onUpdateHotspot={(updated) => setHotspotState((prev) => ({ ...prev, ...updated }))}
          />
        )}
      </main>

      {/* 3-Icon Curved Bottom Navigation Bar (History, Share, Profile) */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsActionMenuOpen(false);
        }}
        onOpenSend={handleOpenSend}
        onOpenReceive={handleOpenReceive}
        isActionMenuOpen={isActionMenuOpen}
        setIsActionMenuOpen={setIsActionMenuOpen}
        isDesktopView={isDesktopView}
        isCardOpen={isCardActive}
        isCardCollapsed={isAnyCardCollapsed}
        onToggleCardCollapse={handleToggleCardCollapse}
      />

      {/* Clean Centered Send QR Code Modal */}
      <SendModal
        isOpen={isSendModalOpen}
        onClose={() => {
          setIsSendModalOpen(false);
          setIsSendCollapsed(false);
        }}
        selectedFiles={selectedFiles.length > 0 ? selectedFiles : files.slice(0, 1)}
        hotspotState={hotspotState}
        myProfile={myProfile}
        isCollapsed={isSendCollapsed}
        setIsCollapsed={setIsSendCollapsed}
      />

      {/* Radar Scan Receive Modal */}
      <ReceiveModal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setIsReceiveCollapsed(false);
        }}
        myProfile={myProfile}
        peers={peers}
        onConnectDevice={handleConnectDevice}
        isCollapsed={isReceiveCollapsed}
        setIsCollapsed={setIsReceiveCollapsed}
      />

      {/* Transfer Progress & Completion Modal */}
      <TransferProgressModal
        currentTransfer={currentTransfer}
        onCancel={handleCancelTransfer}
        onDismiss={() => setCurrentTransfer(null)}
        onDownloadCompleted={handleDownloadCompleted}
      />
    </div>
  );
}
