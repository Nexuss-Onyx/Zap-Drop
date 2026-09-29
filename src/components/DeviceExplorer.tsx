import React, { useState } from 'react';
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
import { DeviceFile, FileCategory } from '../types';
import { DEFAULT_DEVICE_FOLDERS, PlatformBridge } from '../services/platformBridge';
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
  files,
  selectedFiles,
  onToggleSelectFile,
  onSelectAll,
  onClearSelection,
  onOpenSendWithFiles,
  onAddNewFiles,
  onDeleteFile,
}) => {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<DeviceFile | null>(null);

  const filteredFiles = files.filter((file) => {
    if (selectedCategory !== 'all' && file.category !== selectedCategory) return false;
    if (currentFolder && !file.path.includes(currentFolder)) return false;
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
    const pickedFiles = await PlatformBridge.pickFilesFromDisk();
    if (pickedFiles.length > 0) {
      const converted: DeviceFile[] = pickedFiles.map((f, i) => {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        let cat: FileCategory = 'documents';
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'heic', 'raw'].includes(ext)) cat = 'images';
        else if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) cat = 'videos';
        else if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) cat = 'audio';
        else if (['apk', 'exe', 'dmg', 'deb'].includes(ext)) cat = 'apps';
        else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) cat = 'archives';

        return {
          id: `file-${Date.now()}-${i}`,
          name: f.name,
          path: `/storage/emulated/0/${f.name}`,
          size: f.size,
          modifiedDate: 'Just now',
          category: cat,
          mimeType: f.type || 'application/octet-stream',
          isDirectory: false,
          extension: ext,
          previewUrl: cat === 'images' ? URL.createObjectURL(f) : undefined,
          blob: f,
        };
      });
      onAddNewFiles(converted);
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
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#22c55e] text-black text-xs font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-[#16a34a] transition-all shrink-0"
        >
          <FolderPlus size={14} className="stroke-[2.5]" />
          <span>Add Files</span>
        </button>

        <div className="flex items-center p-1 rounded-2xl neu-pressed border border-white/5 shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-xl transition-all ${
              viewMode === 'grid' ? 'neu-raised text-[#22c55e]' : 'text-slate-400'
            }`}
          >
            <Grid size={15} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-xl transition-all ${
              viewMode === 'list' ? 'neu-raised text-[#22c55e]' : 'text-slate-400'
            }`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Device Storage Folders */}
      {!currentFolder && (
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
            Folders
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {DEFAULT_DEVICE_FOLDERS.slice(0, 4).map((folder) => (
              <div
                key={folder.path}
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
            className="text-[10px] text-slate-400 hover:text-white"
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
              className={`px-3 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#22c55e] text-black font-bold shadow-sm'
                  : 'neu-raised text-slate-300 hover:text-white border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* File List / Grid */}
      {filteredFiles.length === 0 ? (
        <div className="p-8 text-center neu-pressed rounded-3xl border border-white/5 my-4">
          <Folder size={32} className="text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-300">No files found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredFiles.map((file) => {
            const isSelected = selectedFiles.some((f) => f.id === file.id);
            return (
              <div
                key={file.id}
                onClick={() => onToggleSelectFile(file)}
                className={`relative p-3 rounded-2xl flex flex-col justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#183020] border-2 border-[#22c55e]'
                    : 'neu-raised border border-white/5 hover:border-[#22c55e]/40'
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`absolute top-2 right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-[#22c55e] text-black' : 'neu-pressed text-transparent border border-white/10'
                  }`}
                >
                  <CheckCircle2 size={13} className="fill-current" />
                </div>

                {/* Thumbnail */}
                <div className="w-full aspect-square rounded-xl neu-pressed flex items-center justify-center overflow-hidden mb-2 bg-[#111216]">
                  {file.previewUrl ? (
                    <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    getFileCategoryIcon(file.category)
                  )}
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-200 truncate">{file.name}</div>
                  <div className="text-[10px] text-[#22c55e] font-mono mt-0.5">{formatFileSize(file.size)}</div>
                </div>
              </div>
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
                className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#183020] border border-[#22c55e]'
                    : 'neu-raised border border-white/5 hover:border-[#22c55e]/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#22c55e] text-black' : 'neu-pressed text-transparent border border-white/10'
                    }`}
                  >
                    <CheckCircle2 size={13} className="fill-current" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{file.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{formatFileSize(file.size)}</div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSendWithFiles([file]);
                  }}
                  className="p-1.5 rounded-xl bg-[#22c55e]/15 text-[#22c55e] hover:bg-[#22c55e]/30"
                >
                  <Send size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-sm p-3 rounded-3xl neu-raised border-2 border-[#22c55e] backdrop-blur-xl bg-[#17181e]/95 flex items-center justify-between gap-2 shadow-2xl"
          >
            <div className="text-left pl-2">
              <div className="text-xs font-bold text-white">{selectedFiles.length} Selected</div>
              <div className="text-[10px] font-mono text-[#22c55e]">{formatFileSize(totalSelectedSize)}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClearSelection}
                className="px-2.5 py-1.5 rounded-xl neu-pressed text-xs text-slate-400"
              >
                Clear
              </button>
              <button
                onClick={() => onOpenSendWithFiles(selectedFiles)}
                className="px-3.5 py-2 rounded-2xl bg-[#22c55e] text-black font-bold text-xs shadow-md flex items-center gap-1"
              >
                <Send size={13} className="stroke-[2.5]" />
                <span>Send</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
