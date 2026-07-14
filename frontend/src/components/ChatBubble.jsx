import React from 'react';
import { Sparkles, User, FileText, ExternalLink } from 'lucide-react';

export default function ChatBubble({ msg, idx, setActiveTooltip, onSourceClick }) {
  const isBot = msg.sender === 'bot';
  const text = msg.text;
  const sources = msg.sources || [];

  const renderBoldAndItalics = (str) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIdx = 0;
    let match;
    while ((match = boldRegex.exec(str)) !== null) {
      const textBefore = str.substring(lastIdx, match.index);
      if (textBefore) parts.push(textBefore);
      parts.push(<strong key={match.index} className="font-semibold text-[--text-main]">{match[1]}</strong>);
      lastIdx = boldRegex.lastIndex;
    }
    const remaining = str.substring(lastIdx);
    if (remaining) parts.push(remaining);
    return parts.length > 0 ? parts : str;
  };

  const renderMessageContent = () => {
    if (!text) return null;

    const citationRegex = /\[Source\s+(\d+)\]/gi;
    const lines = text.split('\n');
    
    const textColorMain = isBot ? "text-[--text-main]" : "text-white";
    const textColorMuted = isBot ? "text-[--text-muted]" : "text-blue-100";

    return lines.map((line, lineIdx) => {
      if (line.trim().startsWith('```')) return null;
      let headingLevel = 0;
      if (line.startsWith('### ')) headingLevel = 3;
      else if (line.startsWith('## ')) headingLevel = 2;
      else if (line.startsWith('# ')) headingLevel = 1;

      let content = line;
      if (headingLevel > 0) content = line.substring(headingLevel + 1);

      const parts = [];
      let lastIndex = 0;
      let match;
      const localRegex = new RegExp(citationRegex);
      
      while ((match = localRegex.exec(content)) !== null) {
        const sourceIndex = parseInt(match[1]) - 1;
        const textBefore = content.substring(lastIndex, match.index);
        
        if (textBefore) parts.push(<span key={lastIndex}>{renderBoldAndItalics(textBefore)}</span>);

        if (sourceIndex >= 0 && sourceIndex < sources.length) {
          const sourceObj = sources[sourceIndex];
          parts.push(
            <span
              key={match.index}
              className="inline-block mx-0.5"
              onClick={() => onSourceClick && onSourceClick(sourceObj.filename, sourceObj.page_number)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveTooltip({
                  text: sourceObj.text,
                  filename: sourceObj.filename,
                  page: sourceObj.page_number,
                  score: sourceObj.relevance_score,
                  x: rect.left + window.scrollX,
                  y: rect.top + window.scrollY - 6
                });
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-bold bg-[--accent-light] hover:bg-[--accent] text-[--accent] hover:text-[#11111b] rounded-md border border-[--accent]/20 cursor-pointer transition-colors">
                {match[1]}
              </span>
            </span>
          );
        } else {
          parts.push(<span key={match.index} className="text-gray-400 font-medium">[{match[1]}]</span>);
        }
        lastIndex = localRegex.lastIndex;
      }

      const remainingText = content.substring(lastIndex);
      if (remainingText) parts.push(<span key={lastIndex}>{renderBoldAndItalics(remainingText)}</span>);

      if (headingLevel === 1) return <h1 key={lineIdx} className={`text-base font-semibold tracking-tight mt-4 mb-2 ${textColorMain}`}>{parts}</h1>;
      if (headingLevel === 2) return <h2 key={lineIdx} className={`text-sm font-semibold tracking-tight mt-3 mb-1.5 ${textColorMain}`}>{parts}</h2>;
      if (headingLevel === 3) return <h3 key={lineIdx} className={`text-xs font-semibold tracking-tight mt-2 mb-1 ${textColorMain}`}>{parts}</h3>;
      
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <ul key={lineIdx} className={`list-disc pl-5 my-1 ${textColorMuted} text-xs`}>
            <li>{renderBoldAndItalics(line.trim().substring(2))}</li>
          </ul>
        );
      }
      return <p key={lineIdx} className={`my-1.5 leading-relaxed text-xs ${textColorMuted} font-normal`}>{parts}</p>;
    });
  };

  return (
    <div className={`flex ${!isBot ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
      <div className={`flex items-start max-w-3xl space-x-3.5 ${!isBot ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs shadow-2xs border ${
          isBot 
            ? 'bg-[--accent-light] text-[--accent] border-[--accent]/10' 
            : 'bg-[--surface-muted] text-[--text-muted] border-[--border]'
        }`}>
          {isBot ? <Sparkles size={14} /> : <User size={14} />}
        </div>
        
        {/* Message Bubble Card */}
        <div className={`rounded-2xl p-4 transition-all ${
          isBot ? 'bubble-ai' : 'bubble-user shadow-md'
        }`}>
          {/* Text content parsed */}
          <div className="space-y-1.5">{renderMessageContent()}</div>
          
          {/* Citations List shown below response */}
          {isBot && sources && sources.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-[--border]">
              <h5 className="text-[9px] font-bold uppercase tracking-wider text-[--text-muted] mb-2.5">
                Grounded Citations
              </h5>
              <div className="flex flex-wrap gap-2">
                {sources.map((src, srcIdx) => (
                  <div
                    key={srcIdx}
                    className="text-[10px] font-medium bg-[--surface-muted] hover:bg-[--surface-hover] border border-[--border] hover:border-[--border-hover] text-[--text-muted] hover:text-[--text-main] px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 max-w-[200px]"
                    onClick={() => onSourceClick && onSourceClick(src.filename, src.page_number)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveTooltip({
                        text: src.text,
                        filename: src.filename,
                        page: src.page_number,
                        score: src.relevance_score,
                        x: rect.left + window.scrollX,
                        y: rect.top + window.scrollY - 6
                      });
                    }}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <FileText size={10} className="text-[--accent]" />
                    <span className="truncate">{src.filename}</span>
                    <span className="opacity-60">p.{src.page_number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
