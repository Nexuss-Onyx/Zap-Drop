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
  Upload,
  FolderPlus,
  CheckCircle2,
  Send,
  MoreVertical,
  ChevronRight,
  Eye,
  Share2,
  HardDrive,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { DeviceFile, FileCategory, FolderNode } from '../types';
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
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Filter files by category, folder, and search query
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
    { id: 'all', label: 'All Files', icon: Folder },
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'videos', label: 'Videos', icon: Film },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'apps', label: 'APKs & Apps', icon: Package },
    { id: 'archives', label: 'Archives', icon: Archive },
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
          id: `user-file-${Date.now()}-${i}`,
          name: f.name,
          path: `/storage/emulated/0/User/${f.name}`,
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      const converted: DeviceFile[] = dropped.map((f, i) => {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        let cat: FileCategory = 'documents';
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'heic', 'raw'].includes(ext)) cat = 'images';
        else if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) cat = 'videos';
        else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) cat = 'audio';
        else if (['apk', 'exe', 'dmg'].includes(ext)) cat = 'apps';
        else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) cat = 'archives';

        return {
          id: `drop-file-${Date.now()}-${i}`,
          name: f.name,
          path: `/storage/emulated/0/Downloads/${f.name}`,
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
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative min-h-[calc(100vh-140px)] pb-28 pt-2 px-3 sm:px-6 max-w-6xl mx-auto transition-all ${
        isDraggingOver ? 'ring-4 ring-[#22c55e] rounded-3xl bg-[#22c55e]/5' : ''
      }`}
    >
      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-[#121316]/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
          <div className="p-8 rounded-3xl neu-raised border-2 border-[#22c55e] text-center max-w-md shadow-[0_0_50px_rgba(34,197,94,0.4)]">
            <Upload size={48} className="text-[#22c55e] mx-auto mb-3 animate-bounce" />
            <h3 className="text-xl font-bold text-white mb-1">Drop Files to Add to Zapdrop</h3>
            <p className="text-sm text-slate-300">Ready to instantly share with connected devices</p>
          </div>
        </div>
      )}

      {/* Top Controls: Search, View Mode, Real System Picker */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search folders, docs, media, APKs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl neu-pressed text-sm text-white placeholder-slate-500 border border-white/5 focus:border-[#22c55e]/50 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Action Buttons: Pick from Storage, Select All, Grid/List */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handlePickSystemFiles}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl neu-raised border border-[#22c55e]/40 text-[#22c55e] hover:bg-[#22c55e]/10 text-xs font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.15)]"
          >
            <FolderPlus size={15} />
            <span>Browse Device</span>
          </button>

          <div className="flex items-center p-1 rounded-2xl neu-pressed border border-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'grid' ? 'neu-raised text-[#22c55e]' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'list' ? 'neu-raised text-[#22c55e]' : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Device Folders Section */}
      {!currentFolder && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <HardDrive size={16} className="text-[#22c55e]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Device Storage Folders</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Internal: 128 GB (42.6 GB Free)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {DEFAULT_DEVICE_FOLDERS.map((folder) => (
              <motion.div
                key={folder.path}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentFolder(folder.name)}
                className="p-3.5 rounded-2xl neu-raised border border-white/5 hover:border-[#22c55e]/40 cursor-pointer group transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center text-[#22c55e] group-hover:text-emerald-300">
                    <Folder size={20} className="fill-[#22c55e]/20" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-black/40 px-2 py-0.5 rounded-md">
                    {folder.itemsCount} items
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                  {folder.name}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
                  <span>{folder.totalSize}</span>
                  <ChevronRight size={13} className="text-slate-600 group-hover:text-[#22c55e] transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation when inside a folder */}
      {currentFolder && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl neu-pressed text-xs">
          <button
            onClick={() => setCurrentFolder(null)}
            className="text-slate-400 hover:text-[#22c55e] font-semibold transition-colors flex items-center gap-1"
          >
            <HardDrive size={13} /> Internal Storage
          </button>
          <ChevronRight size={13} className="text-slate-600" />
          <span className="text-[#22c55e] font-bold">{currentFolder}</span>
          <button
            onClick={() => setCurrentFolder(null)}
            className="ml-auto text-[11px] text-slate-400 hover:text-white bg-slate-800/80 px-2 py-1 rounded-lg"
          >
            Show All Folders
          </button>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#22c55e] text-black shadow-[0_0_15px_rgba(34,197,94,0.4)] font-bold'
                  : 'neu-raised text-slate-300 hover:text-white border border-white/5'
              }`}
            >
              <Icon size={14} className={isSelected ? 'stroke-[2.5]' : ''} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Selection Toolbar (if any items selected) */}
      <div className="flex items-center justify-between px-1 mb-3 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-white">{filteredFiles.length}</strong> items
          </span>
          {selectedFiles.length > 0 && (
            <span className="text-[#22c55e] font-bold">
              • {selectedFiles.length} selected ({formatFileSize(totalSelectedSize)})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedFiles.length < filteredFiles.length ? (
            <button
              onClick={onSelectAll}
              className="text-xs text-slate-300 hover:text-[#22c55e] transition-colors"
            >
              Select All
            </button>
          ) : (
            <button
              onClick={onClearSelection}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Deselect All
            </button>
          )}
        </div>
      </div>

      {/* File Grid or List View */}
      {filteredFiles.length === 0 ? (
        <div className="p-12 text-center neu-pressed rounded-3xl border border-white/5 my-4">
          <Folder size={40} className="text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">No files found in this category</p>
          <p className="text-xs text-slate-500 mt-1">
            Tap &quot;Browse Device&quot; or drop files here to add more.
          </p>
          <button
            onClick={handlePickSystemFiles}
            className="mt-4 px-4 py-2 rounded-xl neu-raised text-xs font-bold text-[#22c55e] border border-[#22c55e]/30"
          >
            Pick from Storage
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {filteredFiles.map((file) => {
            const isSelected = selectedFiles.some((f) => f.id === file.id);
            return (
              <motion.div
                key={file.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`group relative p-3 rounded-2xl flex flex-col justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#183020] border-2 border-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                    : 'neu-raised border border-white/5 hover:border-[#22c55e]/40'
                }`}
                onClick={() => onToggleSelectFile(file)}
              >
                {/* Checkbox Select Pill */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelectFile(file);
                  }}
                  className={`absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#22c55e] text-black shadow-md'
                      : 'neu-pressed text-transparent border border-white/10 group-hover:border-white/30'
                  }`}
                >
                  <CheckCircle2 size={15} className="fill-current" />
                </div>

                {/* File Thumbnail Preview */}
                <div className="w-full aspect-square rounded-xl neu-pressed flex items-center justify-center overflow-hidden mb-2.5 relative bg-[#111216]">
                  {file.previewUrl ? (
                    <img
                      src={file.previewUrl}
                      alt={file.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="p-3 rounded-2xl neu-flat">{getFileCategoryIcon(file.category)}</div>
                  )}

                  {/* Extension Badge */}
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-black/70 text-slate-300 backdrop-blur-sm">
                    {file.extension}
                  </span>
                </div>

                {/* File Info */}
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate" title={file.name}>
                    {file.name}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span className="font-mono text-[#22c55e]">{formatFileSize(file.size)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                      title="File Details & Preview"
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2">
          {filteredFiles.map((file) => {
            const isSelected = selectedFiles.some((f) => f.id === file.id);
            return (
              <motion.div
                key={file.id}
                whileHover={{ scale: 1.005 }}
                onClick={() => onToggleSelectFile(file)}
                className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#183020] border border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                    : 'neu-raised border border-white/5 hover:border-[#22c55e]/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectFile(file);
                    }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-[#22c55e] text-black'
                        : 'neu-pressed text-transparent border border-white/10'
                    }`}
                  >
                    <CheckCircle2 size={15} className="fill-current" />
                  </div>

                  <div className="w-10 h-10 rounded-xl neu-pressed shrink-0 overflow-hidden flex items-center justify-center">
                    {file.previewUrl ? (
                      <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      getFileCategoryIcon(file.category)
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{file.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[#22c55e]">{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{file.modifiedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewFile(file);
                    }}
                    className="p-2 rounded-xl neu-pressed text-slate-400 hover:text-white"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSendWithFiles([file]);
                    }}
                    className="p-2 rounded-xl bg-[#22c55e]/15 text-[#22c55e] hover:bg-[#22c55e]/30 border border-[#22c55e]/30"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* FLOATING ACTION BAR FOR SELECTED FILES */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-lg p-3.5 rounded-3xl neu-raised border-2 border-[#22c55e] backdrop-blur-xl bg-[#17181e]/95 shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 pl-2">
              <div className="w-9 h-9 rounded-xl bg-[#22c55e] text-black flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                {selectedFiles.length}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Files Selected</div>
                <div className="text-[11px] font-mono text-[#22c55e]">{formatFileSize(totalSelectedSize)} Total</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClearSelection}
                className="px-3 py-2 rounded-xl neu-pressed text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => onOpenSendWithFiles(selectedFiles)}
                className="px-4 py-2.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-xs shadow-[0_0_20px_rgba(34,197,94,0.5)] flex items-center gap-1.5 transition-all"
              >
                <Send size={15} className="stroke-[2.5]" />
                <span>Send {selectedFiles.length} Files</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILE PREVIEW MODAL */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md neu-raised rounded-3xl border border-white/10 p-5 bg-[#16181f]/95 relative shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-sm font-bold text-white truncate max-w-[260px]">{previewFile.name}</h3>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="w-7 h-7 rounded-full neu-pressed flex items-center justify-center text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {previewFile.previewUrl && (
                <div className="my-3 rounded-2xl overflow-hidden max-h-56 neu-pressed border border-white/5">
                  <img src={previewFile.previewUrl} alt={previewFile.name} className="w-full h-full object-contain" />
                </div>
              )}

              <div className="space-y-2 my-3 text-xs p-3 rounded-2xl neu-pressed">
                <div className="flex justify-between">
                  <span className="text-slate-400">File Size:</span>
                  <span className="font-mono text-[#22c55e]">{formatFileSize(previewFile.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Type / MIME:</span>
                  <span className="text-slate-200">{previewFile.mimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Device Path:</span>
                  <span className="font-mono text-[11px] text-slate-300 truncate max-w-[200px]">{previewFile.path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Modified Date:</span>
                  <span className="text-slate-200">{previewFile.modifiedDate}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    onDeleteFile(previewFile.id);
                    setPreviewFile(null);
                  }}
                  className="p-3 rounded-2xl neu-pressed text-rose-400 hover:text-rose-300"
                  title="Remove from Zapdrop"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => {
                    PlatformBridge.shareFile(previewFile);
                  }}
                  className="flex-1 py-3 rounded-2xl neu-flat text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Share2 size={15} /> System Share
                </button>
                <button
                  onClick={() => {
                    onOpenSendWithFiles([previewFile]);
                    setPreviewFile(null);
                  }}
                  className="flex-[1.5] py-3 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                >
                  <Send size={15} className="stroke-[2.5]" /> Zapdrop Send
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
