import React from 'react';
import { MessageSquare, GraduationCap, Settings2, Sliders } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  selectedDocs,
  documents,
  setShowSettings
}) {
  const activeIndexedDocs = documents.filter(d => d.indexed && selectedDocs.includes(d.filename));

  return (
    <header className="h-14 border-b border-[--border] bg-[--surface] px-6 flex items-center justify-between z-10 shrink-0">
      {/* LEFT: TITLE & BREADCRUMBS */}
      <div className="flex items-center space-x-3 min-w-0">
        <h1 className="text-xs font-semibold text-[--text-muted] tracking-wide uppercase">My Workspace</h1>
        <span className="text-[--border] font-light">/</span>
        <span className="text-xs font-semibold text-[--text-main] truncate">My Notebook</span>
      </div>

      {/* CENTER: MAIN NAVIGATION TABS */}
      <div className="flex bg-[--surface-muted] border border-[--border] p-0.5 rounded-xl">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center space-x-2 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-[--surface] text-[--accent] shadow-2xs'
              : 'text-[--text-muted] hover:text-[--text-main]'
          }`}
        >
          <MessageSquare size={13} />
          <span>Chat Assistant</span>
        </button>
        <button
          onClick={() => setActiveTab('study')}
          className={`flex items-center space-x-2 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'study'
              ? 'bg-[--surface] text-[--accent-purple] shadow-2xs'
              : 'text-[--text-muted] hover:text-[--text-main]'
          }`}
        >
          <GraduationCap size={13} />
          <span>Study Guide</span>
        </button>
      </div>

      {/* RIGHT: SYSTEM CONTEXT ACTIONS */}
      <div className="flex items-center space-x-3">
        {activeTab === 'chat' && (
          <div className="hidden sm:inline-flex items-center text-[10px] font-semibold text-[--text-muted] bg-[--surface-muted] border border-[--border] py-1 px-2.5 rounded-full">
            Searching <span className="text-[--accent] font-bold mx-1">{activeIndexedDocs.length}</span> sources
          </div>
        )}
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 border border-[--border] rounded-xl text-[--text-muted] hover:text-[--text-main] bg-[--surface] hover:bg-[--surface-hover] transition-all cursor-pointer shadow-2xs"
          title="Configure Workspace Parameters"
        >
          <Settings2 size={13} />
        </button>
      </div>
    </header>
  );
}
