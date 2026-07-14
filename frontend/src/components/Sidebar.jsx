import React from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  Trash2, 
  Settings, 
  Database, 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Sparkles, 
  RefreshCw,
  FolderOpen,
  Eye
} from 'lucide-react';

export default function Sidebar({
  documents,
  selectedDocs,
  toggleDocSelection,
  handleDeleteDoc,
  handleIndexDocument,
  isUploading,
  uploadStatus,
  handleFileChange,
  dragOver,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  apiKey,
  isApiConnected,
  showSettings,
  setShowSettings,
  isCollapsed,
  setIsCollapsed,
  onViewFile
}) {
  
  // Calculate total size of documents
  const totalSizeBytes = documents.reduce((acc, doc) => acc + (doc.size_bytes || 0), 0);
  
  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <aside 
      className={`border-r border-[--border] glassmorphism flex flex-col shrink-0 transition-all duration-300 relative ${
        isCollapsed ? 'w-16' : 'w-80'
      }`}
    >
      {/* COLLAPSE TOGGLE BUTTON */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-4 -right-3 bg-[--surface] border border-[--border] text-[--text-muted] hover:text-[--text-main] p-1 rounded-full shadow-md z-20 cursor-pointer transition-colors"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* HEADER */}
      <div className={`p-4 border-b border-[--border] flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
        <div className="btn-primary p-2 rounded-xl shadow-md shrink-0 flex items-center justify-center">
          <BookOpen size={18} className="stroke-[2.5]" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[--text-main] tracking-tight truncate">NotebookLite</h2>
            <p className="text-[10px] text-[--text-muted] font-medium uppercase tracking-wider">AI Reading Assistant</p>
          </div>
        )}
      </div>

      {/* DRAG & DROP UPLOAD BLOCK */}
      {!isCollapsed && (
        <div className="p-4 border-b border-[--border]">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
              dragOver 
                ? 'border-[--accent] bg-[--accent-light] scale-[0.98]' 
                : 'border-[--border] hover:border-[--border-hover] bg-[--surface] hover:bg-[--surface-hover]'
            }`}
          >
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange} 
              className="hidden" 
              id="sidebar-pdf-upload"
              disabled={isUploading}
            />
            <label htmlFor="sidebar-pdf-upload" className="cursor-pointer block">
              <UploadCloud size={24} className={`mx-auto mb-2 transition-colors ${dragOver ? 'text-[--accent]' : 'text-[--text-muted]'}`} />
              <span className="text-xs font-medium text-[--text-main] block">Click or drag PDF</span>
              <span className="text-[10px] text-[--text-muted] block mt-0.5">Up to 25MB</span>
            </label>
          </div>
          
          {uploadStatus && (
            <div className="mt-3 text-[11px] bg-[--accent-light] text-[--accent] p-2 rounded-xl border border-[--accent-light] flex items-center justify-between animate-in fade-in duration-200">
              <span className="truncate mr-2 font-medium">{uploadStatus}</span>
              <button 
                onClick={() => {}} 
                className="text-[--text-muted] hover:text-[--text-main] cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}
        </div>
      )}

      {/* DOCUMENT LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className={`flex items-center justify-between text-[11px] font-semibold text-[--text-muted] uppercase tracking-wider ${isCollapsed ? 'justify-center' : ''}`}>
          {isCollapsed ? (
            <FolderOpen size={14} title={`Sources (${documents.length})`} />
          ) : (
            <>
              <span>Sources ({documents.length})</span>
              {documents.length > 0 && (
                <button
                  onClick={() => {
                    const allIndexed = documents.filter(d => d.indexed).map(d => d.filename);
                    toggleDocSelection(null); // Custom toggle all trigger can be handled in App.jsx
                  }}
                  className="text-[--accent] hover:underline cursor-pointer lowercase font-medium"
                >
                  toggle selection
                </button>
              )}
            </>
          )}
        </div>

        {documents.length === 0 ? (
          !isCollapsed && (
            <div className="text-center py-8 text-[--text-muted] border border-[--border] border-dashed rounded-2xl bg-[--surface]/20">
              <FileText size={20} className="mx-auto mb-1.5 opacity-40" />
              <p className="text-[11px] font-medium">Library is empty</p>
              <p className="text-[10px] opacity-75">Upload a PDF to begin</p>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const isSelected = selectedDocs.includes(doc.filename);
              return (
                <div
                  key={doc.filename}
                  onClick={() => doc.indexed && toggleDocSelection(doc.filename)}
                  className={`group flex items-start p-2.5 rounded-xl border transition-all duration-200 ${
                    isCollapsed ? 'justify-center' : 'space-x-2.5'
                  } ${
                    isSelected 
                      ? 'border-[--accent] bg-[--accent-light]' 
                      : 'border-[--border] hover:border-[--border-hover] bg-[--surface] hover:bg-[--surface-hover]'
                  } ${!doc.indexed ? 'opacity-70' : 'cursor-pointer'}`}
                >
                  {/* CHECKBOX / STATUS ICON */}
                  <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      disabled={!doc.indexed}
                      checked={isSelected}
                      onChange={() => toggleDocSelection(doc.filename)}
                      className="w-3.5 h-3.5 border-[--border] bg-[--bg-app] text-[--accent] rounded-md focus:ring-[--accent] cursor-pointer"
                    />
                  </div>

                  {!isCollapsed && (
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <span 
                          className="font-medium text-[--text-main] text-xs truncate mr-1.5 block" 
                          title={doc.filename}
                        >
                          {doc.filename}
                        </span>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewFile && onViewFile(doc.filename);
                            }}
                            className="text-[--text-muted] hover:text-[--accent] p-0.5 rounded transition-colors cursor-pointer"
                            title="Open PDF Viewer"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteDoc(doc.filename, e)}
                            className="text-[--text-muted] hover:text-[--error] p-0.5 rounded transition-colors cursor-pointer"
                            title="Delete source"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[10px]">
                        <span className="text-[--text-muted] font-medium">{formatBytes(doc.size_bytes)}</span>
                        
                        {doc.indexed ? (
                          <span className="text-[--success] font-semibold flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[--success]"></span>
                            <span>Indexed</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleIndexDocument(doc.filename)}
                            className="bg-[--accent-purple-light] hover:bg-[--accent-purple]/20 border border-[--accent-purple]/20 text-[--accent-purple] px-1.5 py-0.5 rounded font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                            title="Generate Vector Embeddings"
                          >
                            <span className="w-1 h-1 rounded-full bg-[--accent-purple] animate-pulse"></span>
                            <span>Index Now</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTTOM METRICS & STATUS */}
      <div className="p-4 border-t border-[--border] bg-[--surface-muted] space-y-3">
        {!isCollapsed ? (
          <>
            {/* Storage Metric */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-[--text-muted] font-medium">
                <span className="flex items-center space-x-1">
                  <Database size={10} />
                  <span>Local Storage</span>
                </span>
                <span>{formatBytes(totalSizeBytes)}</span>
              </div>
              <div className="w-full bg-[--border] h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-[--accent] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((totalSizeBytes / (50 * 1024 * 1024)) * 100, 100)}%` }} // 50MB soft limit visualization
                ></div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-2 border-t border-[--border] pt-3">
              {/* Backend Status */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[--text-muted] flex items-center space-x-1">
                  <Activity size={10} />
                  <span>Local Backend</span>
                </span>
                {isApiConnected ? (
                  <span className="text-[--success] font-semibold flex items-center space-x-1 bg-[--success]/10 px-1.5 py-0.5 rounded-md">
                    <span className="w-1 h-1 rounded-full bg-[--success]"></span>
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="text-[--error] font-semibold flex items-center space-x-1 bg-[--error]/10 px-1.5 py-0.5 rounded-md">
                    <span className="w-1 h-1 rounded-full bg-[--error] animate-pulse"></span>
                    <span>Disconnected</span>
                  </span>
                )}
              </div>

              {/* Gemini API Indicator */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[--text-muted] flex items-center space-x-1">
                  <Sparkles size={10} />
                  <span>Gemini Integration</span>
                </span>
                {apiKey ? (
                  <span className="text-blue-400 font-semibold flex items-center space-x-1 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                    <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                    <span>Authorized</span>
                  </span>
                ) : (
                  <span className="text-amber-500 font-semibold flex items-center space-x-1 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                    <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Unconfigured</span>
                  </span>
                )}
              </div>
            </div>

            {/* Settings Trigger */}
            <button
              onClick={() => setShowSettings(true)}
              className="w-full bg-[--surface] hover:bg-[--surface-hover] border border-[--border] text-[--text-main] hover:text-[--text-main] text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs mt-2"
            >
              <Settings size={13} />
              <span>Settings</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div 
              title={`Storage: ${formatBytes(totalSizeBytes)}`}
              className="w-2.5 h-2.5 rounded-full bg-[--accent]"
            />
            <Activity 
              size={14} 
              className={isApiConnected ? "text-[--success]" : "text-[--error] animate-pulse"} 
              title={isApiConnected ? "Local Backend: Connected" : "Local Backend: Disconnected"}
            />
            <Sparkles 
              size={14} 
              className={apiKey ? "text-blue-400" : "text-amber-500"} 
              title={apiKey ? "Gemini: Configured" : "Gemini: Unconfigured"}
            />
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg border border-[--border] hover:bg-[--surface-hover] text-[--text-muted] hover:text-[--text-main] transition-colors cursor-pointer"
              title="Settings"
            >
              <Settings size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
