import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Package,
  Archive,
  Search,
  Grid,
  List,
  FolderPlus,
  CheckCircle2,
  Send,
  ChevronRight,
  CornerLeftUp,
} from 'lucide-react';
import { DeviceFile, FileCategory } from '../types';
import { listDeviceDirectory, DirectoryEntry } from '../services/library';
import { pickAnyFiles } from '../services/picker';
import { formatFileSize } from '../services/networkUtils';

interface DeviceExplorerProps {
  files: DeviceFile[];
  selectedFiles: DeviceFile[];
  onToggleSelectFile: (file: DeviceFile) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOpenSendWithFiles: (files: DeviceFile[]) => void;
  onAddNewFiles: (newFiles: DeviceFile[]) => void;
  onDeleteFile: (fileId: string) => void;
}

export const DeviceExplorer: React.FC<DeviceExplorerProps> = ({
  files: initialFiles,
  selectedFiles,
  onToggleSelectFile,
  onSelectAll,
  onClearSelection,
  onOpenSendWithFiles,
  onAddNewFiles,
}) => {
  const [currentPath, setCurrentPath] = useState<string>('root');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);

  // Load directory entries whenever currentPath changes
  useEffect(() => {
    setIsLoading(true);
    listDeviceDirectory(currentPath === 'root' ? undefined : currentPath)
      .then((res) => {
        setEntries(res.items || []);
      })
      .catch(() => {
        setEntries([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentPath]);

  const handlePickSystemFiles = async () => {
    const pickedFiles = await pickAnyFiles();
    if (pickedFiles.length > 0) {
      onAddNewFiles(pickedFiles);
      // Prepend to current directory view as entries
      const newEntries: DirectoryEntry[] = pickedFiles.map((p) => ({
        name: p.name,
        path: p.path || p.id,
        isDirectory: false,
        size: p.size,
        modified: Date.now(),
        extension: p.name.includes('.') ? p.name.split('.').pop() || '' : '',
      }));
      setEntries((prev) => [...newEntries, ...prev]);
    }
  };

  const getCategoryFromExt = (ext: string = ''): FileCategory => {
    const e = ext.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(e)) return 'images';
    if (['mp4', 'mkv', 'mov', 'avi', 'webm', '3gp'].includes(e)) return 'videos';
    if (['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'].includes(e)) return 'audio';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(e)) return 'documents';
    if (['apk'].includes(e)) return 'apps';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return 'archives';
    return 'documents';
  };

  const getFileCategoryIcon = (ext: string = '') => {
    const category = getCategoryFromExt(ext);
    switch (category) {
      case 'images':
        return <ImageIcon size={20} className="text-emerald-400" />;
      case 'videos':
        return <Film size={20} className="text-purple-400" />;
      case 'audio':
        return <Music size={20} className="text-pink-400" />;
      case 'apps':
        return <Package size={20} className="text-green-400" />;
      case 'archives':
        return <Archive size={20} className="text-amber-400" />;
      default:
        return <FileText size={20} className="text-blue-400" />;
    }
  };

  const handleEntryClick = (entry: DirectoryEntry) => {
    if (entry.isDirectory) {
      setPathHistory((prev) => [...prev, currentPath]);
      setCurrentPath(entry.path);
      setSearchQuery('');
    } else {
      const converted: DeviceFile = {
        id: entry.path,
        name: entry.name,
        path: entry.path,
        size: entry.size,
        modifiedDate: new Date(entry.modified).toLocaleDateString(),
        category: getCategoryFromExt(entry.extension),
        mimeType: 'application/octet-stream',
        isDirectory: false,
        extension: entry.extension || '',
      };
      onToggleSelectFile(converted);
    }
  };

  const handleNavigateUp = () => {
    if (pathHistory.length > 0) {
      const prev = pathHistory[pathHistory.length - 1];
      setPathHistory((h) => h.slice(0, -1));
      setCurrentPath(prev);
    } else {
      setCurrentPath('root');
    }
    setSearchQuery('');
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return e.name.toLowerCase().includes(q) || (e.extension && e.extension.toLowerCase().includes(q));
  });

  const folderCount = filteredEntries.filter((e) => e.isDirectory).length;
  const fileCount = filteredEntries.filter((e) => !e.isDirectory).length;
  const totalSelectedSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  // Path label formatting
  const displayFolderName =
    currentPath === 'root'
      ? 'Storage'
      : currentPath.split('/').filter(Boolean).pop() || currentPath;

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-28 pt-2 px-3 sm:px-6 max-w-5xl mx-auto space-y-3">
      
      {/* Top Search & Actions */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-2xl neu-pressed text-xs text-white placeholder-slate-500 border border-white/5 focus:border-[#22c55e]/40 outline-none"
          />
        </div>

        <button
          onClick={handlePickSystemFiles}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#22c55e] text-black text-xs font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-[#16a34a] transition-all shrink-0 cursor-pointer"
        >
          <FolderPlus size={14} className="stroke-[2.5]" />
          <span>Add Files</span>
        </button>

        <div className="flex items-center p-1 rounded-2xl neu-pressed border border-white/5 shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              viewMode === 'grid' ? 'neu-raised text-[#22c55e]' : 'text-slate-400'
            }`}
          >
            <Grid size={15} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              viewMode === 'list' ? 'neu-raised text-[#22c55e]' : 'text-slate-400'
            }`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation & Counts */}
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl neu-pressed text-xs">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span
            onClick={() => {
              setCurrentPath('root');
              setPathHistory([]);
              setSearchQuery('');
            }}
            className="text-slate-400 hover:text-white cursor-pointer font-medium"
          >
            Storage
          </span>
          {currentPath !== 'root' && (
            <>
              <ChevronRight size={12} className="text-slate-600 shrink-0" />
              <span className="text-[#22c55e] font-bold truncate">
                {displayFolderName}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentPath !== 'root' && (
            <button
              onClick={handleNavigateUp}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 transition-all cursor-pointer"
            >
              <CornerLeftUp size={12} />
              <span>Back</span>
            </button>
          )}

          {selectedFiles.length > 0 && (
            <button
              onClick={onClearSelection}
              className="text-[11px] text-emerald-400 font-semibold cursor-pointer"
            >
              Clear ({selectedFiles.length})
            </button>
          )}
        </div>
      </div>

      {/* Item Counter */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
        <span>
          {folderCount} folder{folderCount !== 1 ? 's' : ''}, {fileCount} file{fileCount !== 1 ? 's' : ''}
        </span>
        {fileCount > 0 && selectedFiles.length < fileCount && (
          <button
            onClick={() => {
              const allFiles: DeviceFile[] = filteredEntries
                .filter((e) => !e.isDirectory)
                .map((entry) => ({
                  id: entry.path,
                  name: entry.name,
                  path: entry.path,
                  size: entry.size,
                  modifiedDate: new Date(entry.modified).toLocaleDateString(),
                  category: getCategoryFromExt(entry.extension),
                  mimeType: 'application/octet-stream',
                  isDirectory: false,
                  extension: entry.extension || '',
                }));
              onAddNewFiles(allFiles);
              allFiles.forEach((f) => onToggleSelectFile(f));
            }}
            className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
          >
            Select All
          </button>
        )}
      </div>

      {/* Directory Contents - Grid or List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading directory...</div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-12 rounded-3xl neu-pressed text-center text-slate-400 space-y-2">
          <Folder size={32} className="mx-auto text-slate-600 mb-1" />
          <p className="text-xs font-semibold text-slate-300">This folder is empty</p>
          <p className="text-[11px] text-slate-500">
            {currentPath !== 'root'
              ? 'Tap "Back" to navigate to parent folders.'
              : 'Add files using the button above or browse storage.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {filteredEntries.map((entry) => {
            const isSelected = !entry.isDirectory && selectedFiles.some((f) => f.path === entry.path || f.id === entry.path);
            return (
              <motion.div
                key={entry.path}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleEntryClick(entry)}
                className={`relative p-2.5 rounded-2xl neu-raised border transition-all cursor-pointer group flex flex-col items-center text-center ${
                  isSelected
                    ? 'border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.25)] bg-[#171922]'
                    : 'border-white/5 hover:border-white/20'
                }`}
              >
                {/* Selection indicator for files */}
                {!entry.isDirectory && (
                  <div
                    className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all z-10 ${
                      isSelected
                        ? 'bg-[#22c55e] text-black shadow-md'
                        : 'border border-white/30 group-hover:border-white/60'
                    }`}
                  >
                    {isSelected && <CheckCircle2 size={13} className="stroke-[3]" />}
                  </div>
                )}

                {/* Icon */}
                <div className="w-14 h-14 rounded-xl neu-pressed flex items-center justify-center mb-2 relative">
                  {entry.isDirectory ? (
                    <Folder size={26} className="text-[#22c55e] fill-[#22c55e]/20" />
                  ) : (
                    getFileCategoryIcon(entry.extension)
                  )}
                </div>

                <div className="w-full">
                  <div className="text-[11px] font-bold text-slate-200 group-hover:text-white truncate">
                    {entry.name}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    {entry.isDirectory ? (
                      `${entry.itemCount ?? 0} item${(entry.itemCount ?? 0) !== 1 ? 's' : ''}`
                    ) : (
                      formatFileSize(entry.size)
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry) => {
            const isSelected = !entry.isDirectory && selectedFiles.some((f) => f.path === entry.path || f.id === entry.path);
            return (
              <div
                key={entry.path}
                onClick={() => handleEntryClick(entry)}
                className={`p-3 rounded-2xl neu-raised border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#22c55e] bg-[#171922]'
                    : 'border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center shrink-0">
                    {entry.isDirectory ? (
                      <Folder size={20} className="text-[#22c55e] fill-[#22c55e]/20" />
                    ) : (
                      getFileCategoryIcon(entry.extension)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">
                      {entry.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                      {entry.isDirectory ? (
                        <span>{entry.itemCount ?? 0} item{(entry.itemCount ?? 0) !== 1 ? 's' : ''}</span>
                      ) : (
                        <>
                          <span>{formatFileSize(entry.size)}</span>
                          <span>•</span>
                          <span>{new Date(entry.modified).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {entry.isDirectory ? (
                  <ChevronRight size={15} className="text-slate-500 shrink-0" />
                ) : (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#22c55e] text-black shadow-md'
                        : 'border border-white/30'
                    }`}
                  >
                    {isSelected && <CheckCircle2 size={15} className="stroke-[3]" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Send Selection Action Bar */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-18 left-0 right-0 z-30 flex items-center justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#181a24]/95 border border-[#22c55e]/40 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
              <div className="text-xs text-white">
                <span className="font-bold text-[#22c55e]">{selectedFiles.length}</span> selected
                <span className="text-slate-400 text-[10px] ml-1.5">({formatFileSize(totalSelectedSize)})</span>
              </div>
              <button
                onClick={() => onOpenSendWithFiles(selectedFiles)}
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#22c55e] to-[#39f07c] text-black text-xs font-bold shadow-lg flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Send size={13} className="stroke-[2.5]" />
                <span>Send Now</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
