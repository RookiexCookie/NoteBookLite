import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ChatWindow from './components/ChatWindow';
import StudyGuide from './components/StudyGuide';
import SettingsModal from './components/SettingsModal';
import { X } from 'lucide-react';

const UPLOAD_TIMEOUT_MS = 90000;

function App() {
  // --- Core Application State ---
  const [apiProvider, setApiProvider] = useState(() => localStorage.getItem('api_provider') || 'gemini');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [openRouterApiKey, setOpenRouterApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('selected_model') || 'gemini-2.5-flash';
  });
  
  const activeApiKey = apiProvider === 'gemini' ? geminiApiKey : openRouterApiKey;

  const [showSettings, setShowSettings] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'bot',
      text: "Hello! I am your NotebookLite assistant. Upload your PDF documents in the sidebar library, select the ones you want to use as context, and ask me any question. I will formulate answers strictly grounded in your reference papers, providing citations.",
      sources: []
    }
  ]);
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'study'
  const [studyDoc, setStudyDoc] = useState('');
  const [studyMode, setStudyMode] = useState('summary'); // 'summary' | 'concepts' | 'flashcards' | 'quiz'
  
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [documentSummary, setDocumentSummary] = useState('');
  const [isStudyLoading, setIsStudyLoading] = useState(false);
  const [studyMaterial, setStudyMaterial] = useState(null);
  
  const [flippedCards, setFlippedCards] = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  
  const [viewerFile, setViewerFile] = useState(null);
  const [viewerPage, setViewerPage] = useState(1);

  const handleSourceClick = (filename, pageNumber) => {
    setViewerFile(filename);
    setViewerPage(pageNumber || 1);
  };

  const handleViewFile = (filename) => {
    setViewerFile(filename);
    setViewerPage(1);
  };
  
  const chatEndRef = useRef(null);

  // Sync scroll on chat update
  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatHistory, isGenerating]);

  // Load documents & check local backend status & clear workspace on load
  useEffect(() => { 
    const resetWorkspace = async () => {
      try {
        await fetch('http://localhost:8000/documents', { method: 'DELETE' });
      } catch (error) {
        console.error("Could not reset local workspace on load:", error);
      }
      fetchDocuments(); 
    };
    resetWorkspace();
  }, []);

  // Fetch summary or study guide when changing tabs/targets
  useEffect(() => {
    if (activeTab === 'study' && studyDoc) {
      if (studyMode === 'summary' && !documentSummary) generateSummary(studyDoc);
      else if (studyMode !== 'summary' && !studyMaterial) generateStudyGuide(studyDoc);
    }
  }, [activeTab, studyDoc, studyMode]);

  // Settings changes are handled in SettingsModal

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
        setIsApiConnected(true);
        // Default select all indexed documents if nothing is currently selected
        if (data.length > 0 && selectedDocs.length === 0) {
          setSelectedDocs(data.filter(d => d.indexed).map(d => d.filename));
        }
      } else {
        setIsApiConnected(false);
      }
    } catch (error) {
      console.error("Error connecting to NotebookLite FastAPI server:", error);
      setIsApiConnected(false);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => { 
    e.preventDefault(); 
    setDragOver(true); 
  };
  
  const handleDragLeave = () => { 
    setDragOver(false); 
  };
  
  const handleDrop = async (e) => {
    e.preventDefault(); 
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      uploadFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      uploadFile(file);
    }
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    setUploadStatus(`Uploading ${file.name}...`);
    const formData = new FormData();
    formData.append('file', file);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    
    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        headers: { 
          'X-API-Provider': apiProvider,
          'X-API-Key': activeApiKey,
          'X-API-Model': selectedModel
        },
        signal: controller.signal,
        body: formData,
      });
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }
      if (response.ok) {
        const uploadedName = data.filename || file.name;
        setUploadStatus(data.warning ? `Uploaded ${uploadedName} with a warning: ${data.warning}` : `Uploaded ${uploadedName}`);
        await fetchDocuments();
        setSelectedDocs(prev => (prev.includes(uploadedName) ? prev : [...prev, uploadedName]));
      } else {
        setUploadStatus(`Upload failed: ${data.detail || 'Error'}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setUploadStatus('Upload timed out. The backend is still processing the PDF.');
      } else {
        setUploadStatus('Server connection error.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      setIsUploading(false);
    }
  };

  const handleIndexDocument = async (filename) => {
    if (!activeApiKey) return alert("Please configure an API key in settings first.");
    try {
      const response = await fetch('http://localhost:8000/index-document', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Provider': apiProvider,
          'X-API-Key': activeApiKey,
          'X-API-Model': selectedModel
        },
        body: JSON.stringify({ filename })
      });
      if (response.ok) { 
        await fetchDocuments(); 
      } else {
        const err = await response.json();
        alert(`Indexing failed: ${err.detail}`);
      }
    } catch (error) { 
      console.error(error); 
    }
  };

  const handleDeleteDoc = async (filename, e) => {
    e.stopPropagation();
    if (!confirm(`Delete ${filename} from your library?`)) return;
    try {
      const response = await fetch(`http://localhost:8000/documents/${filename}`, { method: 'DELETE' });
      if (response.ok) {
        setDocuments(prev => prev.filter(d => d.filename !== filename));
        setSelectedDocs(prev => prev.filter(d => d !== filename));
        if (studyDoc === filename) { 
          setStudyDoc(''); 
          setStudyMaterial(null); 
          setDocumentSummary(''); 
        }
      }
    } catch (error) { 
      console.error(error); 
    }
  };

  const toggleDocSelection = (filename) => {
    if (filename === null) {
      // Toggle all indexed documents selection
      const allIndexed = documents.filter(d => d.indexed).map(d => d.filename);
      const allSelected = allIndexed.every(f => selectedDocs.includes(f));
      if (allSelected) {
        setSelectedDocs([]);
      } else {
        setSelectedDocs(allIndexed);
      }
    } else {
      setSelectedDocs(prev => prev.includes(filename) ? prev.filter(f => f !== filename) : [...prev, filename]);
    }
  };

  const handleSendMessage = async (e, customQuery = '') => {
    if (e) e.preventDefault();
    const queryText = customQuery || query;
    if (!queryText || !queryText.trim() || selectedDocs.length === 0) return;
    
    if (!activeApiKey && apiProvider === 'openrouter') {
      alert("Please configure an OpenRouter API Key in the settings first.");
      return;
    }

    setChatHistory(prev => [...prev, { sender: 'user', text: queryText }]);
    setQuery('');
    setIsGenerating(true);

    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Provider': apiProvider,
          'X-API-Key': activeApiKey,
          'X-API-Model': selectedModel
        },
        body: JSON.stringify({ query: queryText, filenames: selectedDocs, top_k: 5 })
      });
      const data = await response.json();
      if (response.ok) {
        setChatHistory(prev => [...prev, { sender: 'bot', text: data.answer, sources: data.sources }]);
      } else {
        setChatHistory(prev => [...prev, { sender: 'bot', text: `Failed to answer: ${data.detail || 'Unknown error'}` }]);
      }
    } catch (error) {
      setChatHistory(prev => [...prev, { sender: 'bot', text: "Local API synchronization failure. Please ensure the backend is running." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSummary = async (filename) => {
    if (!activeApiKey) return;
    setIsSummaryLoading(true);
    try {
      const response = await fetch('http://localhost:8000/generate-summary', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Provider': apiProvider,
          'X-API-Key': activeApiKey,
          'X-API-Model': selectedModel
        },
        body: JSON.stringify({ filename })
      });
      const data = await response.json();
      if (response.ok) setDocumentSummary(data.summary);
    } catch (e) { 
      console.error(e); 
    }
    setIsSummaryLoading(false);
  };

  const generateStudyGuide = async (filename) => {
    if (!activeApiKey) return;
    setIsStudyLoading(true);
    try {
      const response = await fetch('http://localhost:8000/generate-study-guide', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Provider': apiProvider,
          'X-API-Key': activeApiKey,
          'X-API-Model': selectedModel
        },
        body: JSON.stringify({ filename })
      });
      const data = await response.json();
      if (response.ok) setStudyMaterial(data);
    } catch (e) { 
      console.error(e); 
    }
    setIsStudyLoading(false);
  };

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden text-[--text-main]">
      
      {/* COLLAPSIBLE SIDEBAR */}
      <Sidebar 
        documents={documents}
        selectedDocs={selectedDocs}
        toggleDocSelection={toggleDocSelection}
        handleDeleteDoc={handleDeleteDoc}
        handleIndexDocument={handleIndexDocument}
        isUploading={isUploading}
        uploadStatus={uploadStatus}
        handleFileChange={handleFileChange}
        dragOver={dragOver}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleDrop={handleDrop}
        apiKey={activeApiKey}
        isApiConnected={isApiConnected}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        onViewFile={handleViewFile}
      />

      {/* MAIN WORKSPACE WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* TOP NAVIGATION BAR */}
        <Navbar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedDocs={selectedDocs}
          documents={documents}
          setShowSettings={setShowSettings}
        />

        {/* SPLIT VIEWPORT WITH PDF VIEWER */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          
          {viewerFile && (
            <div className="w-1/2 border-r border-[--border] flex flex-col overflow-hidden bg-[--bg-app-2] animate-in slide-in-from-left duration-300">
              <div className="p-3 border-b border-[--border] flex justify-between items-center bg-[--surface]/40">
                <span className="text-xs font-semibold text-[--text-main] truncate max-w-[80%]">{viewerFile}</span>
                <button 
                  onClick={() => setViewerFile(null)} 
                  className="text-[--text-muted] hover:text-[--text-main] p-1 rounded hover:bg-[--surface] transition-colors cursor-pointer"
                  title="Close PDF Viewer"
                >
                  <X size={14} />
                </button>
              </div>
              <iframe 
                src={`http://localhost:8000/uploads/${encodeURIComponent(viewerFile)}#page=${viewerPage}`}
                className="w-full h-full border-0 bg-[--bg-app]"
                title="PDF Viewer"
                key={`${viewerFile}_${viewerPage}`}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* WORKSPACE VIEWPORTS */}
            {activeTab === 'chat' ? (
              <ChatWindow 
                chatHistory={chatHistory}
                query={query}
                setQuery={setQuery}
                handleSendMessage={handleSendMessage}
                selectedDocs={selectedDocs}
                isGenerating={isGenerating}
                setActiveTooltip={setActiveTooltip}
                chatEndRef={chatEndRef}
                onSourceClick={handleSourceClick}
              />
            ) : (
              <StudyGuide 
                documents={documents}
                studyDoc={studyDoc}
                setStudyDoc={setStudyDoc}
                studyMode={studyMode}
                setStudyMode={setStudyMode}
                isSummaryLoading={isSummaryLoading}
                documentSummary={documentSummary}
                isStudyLoading={isStudyLoading}
                studyMaterial={studyMaterial}
                flippedCards={flippedCards}
                setFlippedCards={setFlippedCards}
                quizAnswers={quizAnswers}
                setQuizAnswers={setQuizAnswers}
                quizSubmitted={quizSubmitted}
                setQuizSubmitted={setQuizSubmitted}
                generateSummary={generateSummary}
                generateStudyGuide={generateStudyGuide}
              />
            )}
          </div>
        </div>

      </div>

      {/* FLOAT CITED ANCHORED TOOLTIP ON CITATION HOVER */}
      {activeTooltip && (
        <div
          className="fixed glass-panel p-3 rounded-2xl max-w-xs text-[11px] leading-relaxed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-[calc(100%+10px)] animate-in fade-in duration-100"
          style={{ left: `${activeTooltip.x}px`, top: `${activeTooltip.y}px` }}
        >
          <div className="flex justify-between border-b border-[--border] pb-1.5 mb-1.5 font-semibold text-[9px] text-[--text-muted] uppercase tracking-wider">
            <span className="truncate max-w-[150px]">{activeTooltip.filename}</span>
            <span>Page {activeTooltip.page}</span>
          </div>
          <p className="italic text-[--text-main]">"{activeTooltip.text}"</p>
        </div>
      )}

      {/* SETTINGS PARAMETER MODAL */}
      <SettingsModal 
        apiProvider={apiProvider}
        setApiProvider={setApiProvider}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={setGeminiApiKey}
        openRouterApiKey={openRouterApiKey}
        setOpenRouterApiKey={setOpenRouterApiKey}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
      />

    </div>
  );
}

export default App;
