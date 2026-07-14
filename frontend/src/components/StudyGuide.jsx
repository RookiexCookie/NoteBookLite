import React from 'react';
import { 
  FileText, 
  Sparkles, 
  Layers, 
  GraduationCap, 
  Loader2, 
  RotateCw, 
  CheckCircle2, 
  Award,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import ChatBubble from './ChatBubble';

export default function StudyGuide({
  documents,
  studyDoc,
  setStudyDoc,
  studyMode,
  setStudyMode,
  isSummaryLoading,
  documentSummary,
  isStudyLoading,
  studyMaterial,
  flippedCards,
  setFlippedCards,
  quizAnswers,
  setQuizAnswers,
  quizSubmitted,
  setQuizSubmitted,
  generateSummary,
  generateStudyGuide
}) {

  const indexedDocs = documents.filter(d => d.indexed);

  // Helper to render markdown content for document summaries
  const renderSummaryText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <ul key={idx} className="list-disc pl-5 my-1 text-[--text-muted] text-xs">
            <li>{line.trim().substring(2).replace(/\*\*/g, '')}</li>
          </ul>
        );
      }
      return <p key={idx} className="my-1.5 leading-relaxed text-xs text-[--text-muted]">{line.replace(/\*/g, '')}</p>;
    });
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-[--bg-app]">
      
      {/* TABS HEADER */}
      <div className="p-4 bg-[--surface] border-b border-[--border] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-muted]">Focus Source:</span>
          <select
            value={studyDoc}
            onChange={(e) => { 
              const filename = e.target.value;
              setStudyDoc(filename); 
              setQuizAnswers({}); 
              setQuizSubmitted(false);
              setFlippedCards({});
            }}
            className="text-xs font-semibold bg-[--surface-muted] hover:bg-[--surface-hover] border border-[--border] hover:border-[--border-hover] text-[--text-main] rounded-xl px-3 py-1.5 focus:outline-none transition-all cursor-pointer"
          >
            <option value="" disabled>Select Indexed PDF</option>
            {indexedDocs.map(d => (
              <option key={d.filename} value={d.filename}>{d.filename}</option>
            ))}
          </select>
        </div>

        {studyDoc && (
          <div className="flex bg-[--surface-muted] border border-[--border] p-0.5 rounded-xl">
            {[
              { id: 'summary', label: 'Summary', icon: <FileText size={12} /> },
              { id: 'concepts', label: 'Concepts', icon: <Layers size={12} /> },
              { id: 'flashcards', label: 'Flashcards', icon: <GraduationCap size={12} /> },
              { id: 'quiz', label: 'Quiz', icon: <HelpCircle size={12} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStudyMode(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer transition-all ${
                  studyMode === tab.id 
                    ? 'bg-[--surface] text-[--accent-purple] shadow-2xs' 
                    : 'text-[--text-muted] hover:text-[--text-main]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEWPORT CONTROLLER */}
      <div className="flex-1 overflow-y-auto p-6">
        {!studyDoc ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 max-w-sm mx-auto space-y-4">
            <div className="p-3 bg-[--surface] border border-[--border] rounded-2xl text-[--text-muted] shadow-2xs">
              <GraduationCap size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[--text-main]">No study target active</h4>
              <p className="text-xs text-[--text-muted] leading-relaxed">
                Select an indexed document in the header dropdown to generate summaries, taxonomy guides, study flashcards, and quizzes.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* STUDY MODE: SUMMARY */}
            {studyMode === 'summary' && (
              <div className="bg-[--surface] p-6 rounded-2xl border border-[--border] shadow-2xs space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center space-x-2 border-b border-[--border] pb-3">
                  <FileText size={15} className="text-[--accent-purple]" />
                  <span className="text-[10px] font-bold text-[--text-main] uppercase tracking-wider">Document Summary</span>
                </div>
                {isSummaryLoading ? (
                  <div className="flex items-center space-x-2 text-xs text-[--text-muted] py-6 animate-pulse">
                    <Loader2 size={14} className="animate-spin text-[--accent-purple]" />
                    <span>Analyzing document structure...</span>
                  </div>
                ) : (
                  <div className="prose max-w-none text-xs text-[--text-muted] leading-relaxed">
                    {documentSummary ? renderSummaryText(documentSummary) : (
                      <p className="italic opacity-60">No summary generated. Click below to initialize.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* LOADER FOR CONCEPTS / CARDS / QUIZ */}
            {studyMode !== 'summary' && isStudyLoading && (
              <div className="flex flex-col items-center justify-center py-20 space-y-3 animate-pulse">
                <Loader2 size={24} className="animate-spin text-[--accent-purple]" />
                <span className="text-xs text-[--text-muted] font-medium">Extracting knowledge taxonomy...</span>
              </div>
            )}

            {/* STUDY MODE: CONCEPTS */}
            {studyMode === 'concepts' && !isStudyLoading && studyMaterial && (
              <div className="space-y-3.5 animate-in fade-in duration-300">
                {studyMaterial.key_concepts?.map((c, i) => (
                  <div key={i} className="bg-[--surface] p-5 rounded-2xl border border-[--border] shadow-2xs space-y-2.5 hover:border-[--border-hover] transition-all">
                    <h3 className="font-semibold text-xs text-[--text-main]">{c.title}</h3>
                    <p className="text-xs text-[--text-muted] leading-relaxed">{c.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            {/* STUDY MODE: FLASHCARDS */}
            {studyMode === 'flashcards' && !isStudyLoading && studyMaterial && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                {studyMaterial.flashcards?.map((card, i) => {
                  const isFlipped = flippedCards[i];
                  return (
                    <div 
                      key={i} 
                      onClick={() => setFlippedCards(prev => ({ ...prev, [i]: !prev[i] }))} 
                      className="h-44 cursor-pointer relative perspective group"
                    >
                      <div className={`w-full h-full duration-300 preserve-3d transform transition-transform absolute rounded-2xl border border-[--border] group-hover:border-[--border-hover] shadow-2xs ${isFlipped ? 'rotate-y-180' : ''}`}>
                        
                        {/* Front Face */}
                        <div className="absolute inset-0 bg-[--surface] rounded-2xl backface-hidden p-5 flex flex-col justify-between">
                          <span className="text-[9px] uppercase font-bold text-[--text-muted]">Card {i + 1}</span>
                          <p className="text-center font-semibold text-xs text-[--text-main] my-auto px-2">{card.question}</p>
                          <span className="text-[9px] text-center text-[--accent-purple] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Click to Reveal Answer</span>
                        </div>
                        
                        {/* Back Face */}
                        <div className="absolute inset-0 bg-[--surface-muted] rounded-2xl backface-hidden rotate-y-180 p-5 flex flex-col justify-between">
                          <span className="text-[9px] uppercase font-bold text-[--accent-purple]">Answer Concept</span>
                          <p className="text-center text-xs text-[--text-muted] my-auto leading-relaxed px-2">{card.answer}</p>
                          <span className="text-[9px] text-center text-[--text-muted] opacity-60">Click to Flip Back</span>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* STUDY MODE: QUIZ */}
            {studyMode === 'quiz' && !isStudyLoading && studyMaterial && (
              <div className="bg-[--surface] p-6 rounded-2xl border border-[--border] space-y-6 shadow-2xs animate-in fade-in duration-300">
                <div className="flex justify-between items-center border-b border-[--border] pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles size={14} className="text-[--accent-purple]" />
                    <span className="text-xs font-semibold text-[--text-main]">Knowledge Checkpoint</span>
                  </div>
                  {quizSubmitted && (
                    <span className="bg-[--accent-purple-light] text-[--accent-purple] text-[10px] px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1.5">
                      <Award size={12} />
                      <span>Score: {Object.keys(quizAnswers).filter(k => quizAnswers[k] === studyMaterial.quiz[k].answer).length} / {studyMaterial.quiz.length}</span>
                    </span>
                  )}
                </div>

                {studyMaterial.quiz?.map((item, qIdx) => (
                  <div key={qIdx} className="space-y-3">
                    <h4 className="font-semibold text-xs text-[--text-main]">{qIdx + 1}. {item.question}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {item.options.map((opt, optIdx) => {
                        const isSelected = quizAnswers[qIdx] === opt;
                        const isCorrect = item.answer === opt;
                        
                        let optionStyle = 'border-[--border] hover:bg-[--surface-muted] text-[--text-muted]';
                        if (isSelected && !quizSubmitted) optionStyle = 'border-[--accent-purple] bg-[--accent-purple-light] text-[--accent-purple]';
                        if (quizSubmitted) {
                          if (isCorrect) optionStyle = 'border-[--success]/40 bg-[--success]/10 text-[--success]';
                          else if (isSelected) optionStyle = 'border-[--error]/40 bg-[--error]/10 text-[--error]';
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={quizSubmitted}
                            onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: opt }))}
                            className={`text-left text-xs p-3 rounded-xl border font-medium transition-all cursor-pointer ${optionStyle}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-2 border-t border-[--border]">
                  {quizSubmitted ? (
                    <button 
                      onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }} 
                      className="bg-[--accent-purple] text-white hover:bg-violet-600 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer shadow-2xs transition-colors flex items-center space-x-1.5"
                    >
                      <RotateCw size={13} />
                      <span>Retake Quiz</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => setQuizSubmitted(true)} 
                      disabled={Object.keys(quizAnswers).length < (studyMaterial.quiz?.length || 0)} 
                      className="bg-[--accent-purple] text-white hover:bg-violet-600 disabled:opacity-40 text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer shadow-2xs transition-colors"
                    >
                      Submit Assessment
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error handling when study material is unavailable/empty */}
            {studyMode !== 'summary' && !isStudyLoading && !studyMaterial && (
              <div className="text-center py-10 space-y-3">
                <AlertCircle size={20} className="mx-auto text-amber-500 opacity-60" />
                <p className="text-xs text-[--text-muted]">Study material has not been generated for this PDF.</p>
                <button 
                  onClick={() => generateStudyGuide(studyDoc)}
                  className="bg-[--accent-purple] hover:bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer shadow-2xs transition-colors"
                >
                  Generate Study Guide
                </button>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
