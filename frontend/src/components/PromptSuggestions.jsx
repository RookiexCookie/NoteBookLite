import React from 'react';
import { Sparkles, FileText, HelpCircle, Layers } from 'lucide-react';

export default function PromptSuggestions({ handleSendMessage, selectedDocs }) {
  const suggestions = [
    {
      text: "Summarize the key points across selected documents.",
      label: "Summarize sources",
      icon: <FileText size={12} className="text-blue-400" />
    },
    {
      text: "What are the primary findings in these materials?",
      label: "Primary findings",
      icon: <Sparkles size={12} className="text-violet-400" />
    },
    {
      text: "Explain the methodology described in the texts.",
      label: "Explain methodology",
      icon: <Layers size={12} className="text-emerald-400" />
    }
  ];

  if (selectedDocs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-3xl mx-auto w-full px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {suggestions.map((sug, idx) => (
        <button
          key={idx}
          onClick={(e) => handleSendMessage(e, sug.text)}
          className="text-left text-xs bg-[--surface] hover:bg-[--surface-hover] border border-[--border] hover:border-[--border-hover] p-3 rounded-2xl shadow-2xs transition-all text-[--text-muted] hover:text-[--text-main] flex items-start space-x-2.5 cursor-pointer"
        >
          <div className="pt-0.5 shrink-0">{sug.icon}</div>
          <div className="min-w-0">
            <span className="font-semibold text-[--text-main] block truncate">{sug.label}</span>
            <span className="text-[10px] opacity-75 mt-0.5 block line-clamp-1">{sug.text}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
