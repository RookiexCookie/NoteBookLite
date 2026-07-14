import React from 'react';
import { Sparkles, MessageSquare, ArrowRight, Loader2, FileQuestion } from 'lucide-react';
import ChatBubble from './ChatBubble';
import PromptSuggestions from './PromptSuggestions';
import InputBar from './InputBar';

export default function ChatWindow({
  chatHistory,
  query,
  setQuery,
  handleSendMessage,
  selectedDocs,
  isGenerating,
  setActiveTooltip,
  chatEndRef,
  onSourceClick
}) {
  
  // Show welcome state if there is only the bot starter greeting and no messages have been sent yet
  const showWelcome = chatHistory.length <= 1 && !isGenerating;

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-[--bg-app]">
      
      {/* SCROLLABLE VIEWPORT */}
      <div className="flex-1 overflow-y-auto">
        {showWelcome ? (
          /* LARGE CENTERED WELCOME STATE */
          <div className="h-full flex flex-col justify-center items-center px-6 py-12 max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-3.5 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="inline-flex bg-[--accent-light] text-[--accent] p-3 rounded-2xl border border-[--accent]/10 shadow-xs mb-2">
                <Sparkles size={28} className="stroke-[2]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[--text-main]">
                Ask your documents anything.
              </h2>
              <p className="text-xs text-[--text-muted] max-w-md mx-auto leading-relaxed">
                Upload your reference materials, select documents to compile, and ask questions. NotebookLite will answer using strict contextual citations.
              </p>
            </div>

            {/* Prompt Suggestions */}
            <PromptSuggestions 
              handleSendMessage={handleSendMessage}
              selectedDocs={selectedDocs}
            />

            {selectedDocs.length === 0 && (
              <div className="flex items-center space-x-2 text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl animate-pulse">
                <FileQuestion size={12} />
                <span>Please select one or more indexed PDFs in the library to start chatting.</span>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE CONVERSATION FEED */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {chatHistory.map((msg, idx) => (
              <ChatBubble 
                key={idx}
                msg={msg}
                idx={idx}
                setActiveTooltip={setActiveTooltip}
                onSourceClick={onSourceClick}
              />
            ))}
            
            {/* Thinking / Searching Loader */}
            {isGenerating && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="flex items-start max-w-3xl space-x-3.5">
                  <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-[--accent-light] text-[--accent] border border-[--accent]/10 shadow-2xs">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                  <div className="rounded-2xl p-4 border border-[--border] bg-[--surface] text-[--text-muted]">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-semibold text-[--text-main]">NotebookLite</span>
                      <span className="opacity-60">•</span>
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Scroll Anchor */}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* FLOATING INPUT BAR */}
      <InputBar 
        query={query}
        setQuery={setQuery}
        handleSendMessage={handleSendMessage}
        selectedDocs={selectedDocs}
        isGenerating={isGenerating}
      />
    </div>
  );
}
