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
  Eye,
  Trash2,
} from 'lucide-react';
import { DeviceFile, FileCategory, FolderNode } from '../types';
import { loadFiles, loadFolders } from '../services/library';
import { pickAnyFiles } from '../services/picker';
import { formatFileSize } from '../services/mockNetwork';

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
  onDeleteFile,
}) => {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [deviceFiles, setDeviceFiles] = useState<DeviceFile[]>(initialFiles);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<DeviceFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load real folders on mount
  useEffect(() => {
    loadFolders().then((f) => {
      if (f && f.length > 0) setFolders(f);
    });
  }, []);

  // Load real files when category or folder changes
  useEffect(() => {
    setIsLoading(true);
    loadFiles(selectedCategory, currentFolder || undefined, searchQuery || undefined)
      .then((loaded) => {
        if (loaded && loaded.length > 0) {
          setDeviceFiles(loaded);
        } else if (initialFiles.length > 0) {
          setDeviceFiles(initialFiles);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedCategory, currentFolder, searchQuery, initialFiles]);

  const filteredFiles = deviceFiles.filter((file) => {
    if (selectedCategory !== 'all' && file.category !== selectedCategory) return false;
    if (currentFolder && !file.path.toLowerCase().includes(currentFolder.toLowerCase())) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return file.name.toLowerCase().includes(q) || file.extension.toLowerCase().includes(q);
    }
    return true;
  });

  const categories: { id: FileCategory; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All', icon: Folder },
    { id: 'images', label: 'Photos', icon: ImageIcon },
    { id: 'videos', label: 'Videos', icon: Film },
    { id: 'documents', label: 'Docs', icon: FileText },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'apps', label: 'Apps', icon: Package },
    { id: 'archives', label: 'Zip', icon: Archive },
  ];

  const handlePickSystemFiles = async () => {
    const pickedFiles = await pickAnyFiles();
    if (pickedFiles.length > 0) {
      onAddNewFiles(pickedFiles);
      setDeviceFiles((prev) => [...pickedFiles, ...prev]);
    }
  };

  const getFileCategoryIcon = (category: FileCategory) => {
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

  const totalSelectedSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-28 pt-2 px-3 sm:px-6 max-w-5xl mx-auto">
      
      {/* Top Search & Actions */}
      <div className="flex items-center justify-between gap-2.5 mb-4">
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

      {/* Device Storage Folders */}
      {!currentFolder && folders.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
            Folders
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {folders.slice(0, 4).map((folder) => (
              <div
                key={folder.name}
                onClick={() => setCurrentFolder(folder.name)}
                className="p-3 rounded-2xl neu-raised border border-white/5 hover:border-[#22c55e]/40 cursor-pointer group transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-8 h-8 rounded-xl neu-pressed flex items-center justify-center text-[#22c55e]">
                    <Folder size={16} className="fill-[#22c55e]/20" />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">{folder.itemsCount}</span>
                </div>
                <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                  {folder.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breadcrumb if folder selected */}
      {currentFolder && (
        <div className="flex items-center justify-between gap-2 mb-4 p-2.5 rounded-2xl neu-pressed text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 cursor-pointer hover:text-white" onClick={() => setCurrentFolder(null)}>
              Storage
            </span>
            <ChevronRight size={12} className="text-slate-600" />
            <span className="text-[#22c55e] font-bold">{currentFolder}</span>
          </div>
          <button
            onClick={() => setCurrentFolder(null)}
            className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
          >
            All Folders
          </button>
        </div>
      )}

      {/* Categories */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#22c55e] text-black shadow-[0_0_12px_rgba(34,197,94,0.35)]'
                  : 'neu-raised text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Files Header / Selection Counter */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs text-slate-400">
          {filteredFiles.length} item{filteredFiles.length !== 1 ? 's' : ''}
        </span>
        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={onSelectAll}
              className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              Select All
            </button>
            <button
              onClick={onClearSelection}
              className="text-[11px] text-emerald-400 font-semibold cursor-pointer"
            >
              Clear ({selectedFiles.length})
            </button>
          </div>
        )}
      </div>

      {/* Grid or List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {filteredFiles.map((file) => {
            const isSelected = selectedFiles.some((f) => f.id === file.id);
            return (
              <motion.div
                key={file.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => onToggleSelectFile(file)}
                className={`relative p-2.5 rounded-2xl neu-raised border transition-all cursor-pointer group flex flex-col items-center text-center ${
                  isSelected
                    ? 'border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.25)] bg-[#171922]'
                    : 'border-white/5 hover:border-white/20'
                }`}
              >
                {/* Selection indicator */}
                <div
                  className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all z-10 ${
                    isSelected
                      ? 'bg-[#22c55e] text-black shadow-md'
                      : 'border border-white/30 group-hover:border-white/60'
                  }`}
                >
                  {isSelected && <CheckCircle2 size={13} className="stroke-[3]" />}
                </div>

                {/* Thumbnail / Icon */}
                <div className="w-14 h-14 rounded-xl neu-pressed flex items-center justify-center overflow-hidden mb-2 relative">
                  {file.previewUrl ? (
                    <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    getFileCategoryIcon(file.category)
                  )}
                </div>

                <div className="w-full">
                  <div className="text-[11px] font-bold text-slate-200 group-hover:text-white truncate">
                    {file.name}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map((file) => {
            const isSelected = selectedFiles.some((f) => f.id === file.id);
            return (
              <div
                key={file.id}
                onClick={() => onToggleSelectFile(file)}
                className={`p-3 rounded-2xl neu-raised border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#22c55e] bg-[#171922]'
                    : 'border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center shrink-0 overflow-hidden">
                    {file.previewUrl ? (
                      <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      getFileCategoryIcon(file.category)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{file.modifiedDate}</span>
                    </div>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'bg-[#22c55e] text-black shadow-md'
                      : 'border border-white/30'
                  }`}
                >
                  {isSelected && <CheckCircle2 size={15} className="stroke-[3]" />}
                </div>
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
