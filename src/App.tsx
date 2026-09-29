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

  // Local device profile state
  const [myProfile, setMyProfile] = useState<DeviceProfile>(() => {
    const saved = localStorage.getItem('zapdrop_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      id: 'self-dev-' + Math.random().toString(36).substring(2, 7),
      name: detectedOs === 'android' ? 'Galaxy S24 Ultra' : 'Studio MacBook Pro',
      avatar: AVATAR_PRESETS[0],
      avatarColor: '#22c55e',
      os: detectedOs,
      model: detectedOs === 'android' ? 'Snapdragon 8 Gen 3 • Wi-Fi 7' : 'Apple M3 Max • Wi-Fi 6E',
      ipAddress: '192.168.43.14',
      isHost: false,
      signalStrength: 99,
      status: 'online',
    };
  });

  // Hotspot status state
  const [hotspotState, setHotspotState] = useState<HotspotState>(() => ({
    enabled: false,
    ssid: 'Zapdrop-Hotspot-5G',
    password: 'zap-speed-889',
    band: '5GHz',
    ipAddress: '192.168.43.1',
    port: 8080,
    connectedClients: 2,
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

  // Navigation and Modals state
  const [activeTab, setActiveTab] = useState<ActiveTab>('files');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [currentTransfer, setCurrentTransfer] = useState<TransferRecord | null>(null);

  // Real-time transfer timer reference
  const transferIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save profile & transfers to localStorage
  useEffect(() => {
    localStorage.setItem('zapdrop_profile', JSON.stringify(myProfile));
  }, [myProfile]);

  useEffect(() => {
    localStorage.setItem('zapdrop_transfers', JSON.stringify(transfers));
  }, [transfers]);

  // BroadcastChannel for real-time multi-tab/device sync
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('zapdrop_p2p_mesh');

      // Announce presence
      channel.postMessage({
        type: 'HEARTBEAT',
        profile: myProfile,
      });

      channel.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'HEARTBEAT' && data.profile && data.profile.id !== myProfile.id) {
          setPeers((prev) => {
            const exists = prev.some((p) => p.id === data.profile.id);
            if (!exists) {
              return [data.profile, ...prev];
            }
            return prev.map((p) => (p.id === data.profile.id ? { ...p, ...data.profile } : p));
          });
        }
      };

      return () => {
        channel.close();
      };
    }
  }, [myProfile]);

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

  // Start Transfer Simulation / Engine
  const handleStartTransfer = (targetPeer: DeviceProfile, filesToSend: DeviceFile[]) => {
    const mainFile = filesToSend[0];
    const totalSize = filesToSend.reduce((sum, f) => sum + f.size, 0);

    const newTransfer: TransferRecord = {
      id: 'tx-' + Date.now(),
      fileName:
        filesToSend.length === 1
          ? mainFile.name
          : `${mainFile.name} + ${filesToSend.length - 1} other files`,
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
      speedMbps: 54.2 + (Math.random() * 15 - 7),
    };

    setCurrentTransfer(newTransfer);
    simulateTransferProgress(newTransfer);
  };

  // Accept incoming transfer
  const handleAcceptIncoming = (sender: DeviceProfile) => {
    const mockIncomingFile = {
      fileName: 'Shared_Project_Archive_4K.zip',
      fileSize: 45000000,
      category: 'archives' as const,
      mimeType: 'application/zip',
    };

    const newTransfer: TransferRecord = {
      id: 'rx-' + Date.now(),
      fileName: mockIncomingFile.fileName,
      fileSize: mockIncomingFile.fileSize,
      fileType: mockIncomingFile.mimeType,
      category: mockIncomingFile.category,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      senderOs: sender.os,
      receiverId: myProfile.id,
      receiverName: myProfile.name,
      receiverAvatar: myProfile.avatar,
      receiverOs: myProfile.os,
      direction: 'received',
      timestamp: Date.now(),
      dateLabel: 'Today, Just now',
      status: 'transferring',
      progress: 0,
      speedMbps: 61.8 + (Math.random() * 12 - 6),
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
      currentProgress += 12 + Math.random() * 8;
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
                speedMbps: 50 + (Math.random() * 20 - 10),
              }
            : null
        );
      }
    }, 300);
  };

  const handleCancelTransfer = () => {
    if (transferIntervalRef.current) {
      clearInterval(transferIntervalRef.current);
    }
    setCurrentTransfer(null);
  };

  const handleDownloadCompleted = (record: TransferRecord) => {
    // Create a mock blob download
    const blob = new Blob([`Zapdrop transfer data for ${record.fileName}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleHotspot = () => {
    setHotspotState((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  return (
    <div className="min-h-screen bg-[#121316] text-[#e2e8f0] flex flex-col selection:bg-[#22c55e] selection:text-black">
      {/* Top App Header */}
      <Header
        myProfile={myProfile}
        hotspotState={hotspotState}
        onToggleHotspot={handleToggleHotspot}
        onOpenProfile={() => setActiveTab('profile')}
        activeTransferSpeed={currentTransfer?.status === 'transferring' ? currentTransfer.speedMbps : 0}
      />

      {/* Main App View Area */}
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
              setIsSendModalOpen(true);
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
              const matchedPeer =
                peers.find((p) => p.id === record.receiverId || p.id === record.senderId) || peers[0];
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
              handleStartTransfer(matchedPeer, [mockFile]);
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

      {/* Central Curved Cutout Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsActionMenuOpen(false);
        }}
        onOpenSend={() => setIsSendModalOpen(true)}
        onOpenReceive={() => setIsReceiveModalOpen(true)}
        onToggleHotspot={handleToggleHotspot}
        isHotspotActive={hotspotState.enabled}
        isActionMenuOpen={isActionMenuOpen}
        setIsActionMenuOpen={setIsActionMenuOpen}
        pendingTransferCount={transfers.filter((t) => t.status === 'transferring').length}
      />

      {/* Send Modal (QR Code & Nearby Devices) */}
      <SendModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        selectedFiles={selectedFiles.length > 0 ? selectedFiles : files.slice(0, 1)}
        peers={peers}
        hotspotState={hotspotState}
        myProfile={myProfile}
        onStartTransfer={handleStartTransfer}
        onPickMoreFiles={() => {
          setIsSendModalOpen(false);
          setActiveTab('files');
        }}
      />

      {/* Receive Modal (Sonar Radar Scanner & QR Reader) */}
      <ReceiveModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        myProfile={myProfile}
        peers={peers}
        onAcceptIncoming={handleAcceptIncoming}
      />

      {/* Live Transfer Progress & Completion Modal */}
      <TransferProgressModal
        currentTransfer={currentTransfer}
        onCancel={handleCancelTransfer}
        onDismiss={() => setCurrentTransfer(null)}
        onDownloadCompleted={handleDownloadCompleted}
      />
    </div>
  );
}
