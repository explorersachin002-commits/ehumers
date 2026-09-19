import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Folder,
  File,
  FileText,
  Image,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  ExternalLink,
  Info,
  CheckCircle,
} from 'lucide-react';
import { StorageNode } from '../types';

export const DirectoryStorageView: React.FC = () => {
  const [treeData, setTreeData] = useState<StorageNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    uploads: true,
    'uploads/2026': true,
  });

  const fetchStorageStats = () => {
    setIsLoading(true);
    fetch('/api/storage/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.tree) {
          setTreeData(data.tree);
        }
      })
      .catch((err) => console.error('Failed to load storage stats:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchStorageStats();
  }, []);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const renderNode = (node: StorageNode, depth: number = 0) => {
    const isFolder = node.type === 'directory';
    const isExpanded = expandedFolders[node.relativePath || node.name] !== false;
    const isPdf = node.name.endsWith('.pdf');
    const isImg = /\.(png|jpg|jpeg)$/i.test(node.name);

    return (
      <div key={node.relativePath || node.name} className="text-xs font-mono">
        <div
          className={`flex items-center space-x-2 py-1.5 px-2 rounded-md transition-colors ${
            isFolder
              ? 'hover:bg-slate-100 cursor-pointer font-bold text-slate-800'
              : 'hover:bg-slate-50 text-slate-600'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 20)}px` }}
          onClick={() => isFolder && toggleFolder(node.relativePath || node.name)}
        >
          {isFolder ? (
            <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
          ) : isPdf ? (
            <FileText className="w-4 h-4 text-rose-500 shrink-0" />
          ) : isImg ? (
            <Image className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <File className="w-4 h-4 text-slate-400 shrink-0" />
          )}

          <span className="truncate">{node.name}</span>

          {isFolder ? (
            <span className="text-[10px] text-slate-400 font-normal">
              ({node.fileCount || 0} files, {Math.ceil((node.sizeBytes || 0) / 1024)} KB)
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-normal ml-auto">
              {Math.ceil((node.sizeBytes || 0) / 1024)} KB
            </span>
          )}
        </div>

        {isFolder && isExpanded && node.children && (
          <div className="border-l border-slate-200 ml-4">
            {node.children.length === 0 ? (
              <div
                className="text-[11px] text-slate-400 italic py-1"
                style={{ paddingLeft: `${(depth + 1) * 20}px` }}
              >
                (Empty partition directory)
              </div>
            ) : (
              node.children.map((child) => renderNode(child, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="storage-directory-view" className="space-y-4">
      {/* Top Architecture Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Partitioned Document Storage Tier
              </h2>
              <p className="text-xs text-slate-500">
                Target filesystem path: <code className="font-mono text-blue-700">/storage/uploads/YYYY/MM/</code> with safe UUID file naming
              </p>
            </div>
          </div>

          <button
            id="btn-refresh-storage"
            onClick={fetchStorageStats}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Rescan Disk</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Directory Tree */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FolderTree className="w-4 h-4 text-slate-600" />
              <span className="font-bold text-xs text-slate-800">Filesystem Tree Structure</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Root: storage/uploads/
            </span>
          </div>

          <div className="p-4 overflow-x-auto min-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-slate-400 space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-xs">Scanning storage volumes...</span>
              </div>
            ) : treeData ? (
              renderNode(treeData)
            ) : (
              <p className="text-xs text-slate-400">No directory data found.</p>
            )}
          </div>
        </div>

        {/* Security & Validation Pipeline Specs */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>File Ingestion Security Engine</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start space-x-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-950 font-semibold block">Magic Bytes Inspection</strong>
                  <span className="text-[11px] text-emerald-800 leading-snug">
                    Inspects raw binary headers (<code className="font-mono">%PDF-</code>, <code className="font-mono">\x89PNG</code>, <code className="font-mono">\xFF\xD8\xFF</code>) to prevent MIME spoofing attacks.
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-2 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-950 font-semibold block">Extension Whitelisting</strong>
                  <span className="text-[11px] text-blue-800 leading-snug">
                    Strictly limits allowed file extensions to <code className="font-mono">.pdf</code>, <code className="font-mono">.png</code>, <code className="font-mono">.jpg</code>, and <code className="font-mono">.jpeg</code>.
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-2 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                <CheckCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-950 font-semibold block">Size Limit Enforcement</strong>
                  <span className="text-[11px] text-amber-800 leading-snug">
                    Rejects payloads larger than 25 MB before disk writes.
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-2 bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                <CheckCircle className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-purple-950 font-semibold block">Path Traversal Defense</strong>
                  <span className="text-[11px] text-purple-800 leading-snug">
                    Generates random UUID filenames and verifies resolved path remains confined to the storage root.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
