import React from 'react';
import { Send, ArrowUp } from 'lucide-react';

export default function InputBar({
  query,
  setQuery,
  handleSendMessage,
  selectedDocs,
  isGenerating
}) {
  const isDisabled = selectedDocs.length === 0 || isGenerating;
  
  const getPlaceholder = () => {
    if (isGenerating) return "Generating grounded response...";
    if (selectedDocs.length === 0) return "Select reference sources in the library to start asking...";
    return `Ask anything about the ${selectedDocs.length} compiled source${selectedDocs.length > 1 ? 's' : ''}...`;
  };

  return (
    <div className="p-4 max-w-3xl mx-auto w-full shrink-0 animate-in fade-in duration-300">
      <form 
        onSubmit={handleSendMessage} 
        className={`flex bg-[--surface] border rounded-2xl shadow-sm p-1.5 items-center transition-all ${
          isDisabled 
            ? 'opacity-65 border-[--border]' 
            : 'border-[--border] hover:border-[--border-hover] focus-within:border-[--accent] focus-within:ring-1 focus-within:ring-[--accent]/30'
        }`}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={getPlaceholder()}
          disabled={isDisabled}
          className="flex-grow bg-transparent border-0 px-3 py-2 text-xs focus:outline-none text-[--text-main] placeholder:text-[--text-muted]"
        />
        <button
          type="submit"
          disabled={!query.trim() || isDisabled}
          className={`rounded-xl p-2 shrink-0 transition-all flex items-center justify-center cursor-pointer ${
            !query.trim() || isDisabled
              ? 'bg-[--surface-muted] text-[--text-muted]'
              : 'btn-primary shadow-2xs'
          }`}
        >
          <ArrowUp size={14} className="stroke-[2.5]" />
        </button>
      </form>
    </div>
  );
}
