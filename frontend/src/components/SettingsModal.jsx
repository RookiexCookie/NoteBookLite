import React, { useState, useEffect } from 'react';
import { X, Key, Shield, Info, Check } from 'lucide-react';

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'custom', name: 'Custom Model ID...' }
];

const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (Chat)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)' },
  { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B (Free)' },
  { id: 'custom', name: 'Custom Model ID...' }
];

export default function SettingsModal({
  apiProvider,
  setApiProvider,
  geminiApiKey,
  setGeminiApiKey,
  openRouterApiKey,
  setOpenRouterApiKey,
  selectedModel,
  setSelectedModel,
  showSettings,
  setShowSettings
}) {
  const [localProvider, setLocalProvider] = useState(apiProvider);
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);
  const [localOpenRouterKey, setLocalOpenRouterKey] = useState(openRouterApiKey);
  
  const [localModel, setLocalModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Sync state when modal is opened
  useEffect(() => {
    if (showSettings) {
      setLocalProvider(apiProvider);
      setLocalGeminiKey(geminiApiKey);
      setLocalOpenRouterKey(openRouterApiKey);
      
      const modelsList = apiProvider === 'gemini' ? GEMINI_MODELS : OPENROUTER_MODELS;
      const match = modelsList.find(m => m.id === selectedModel);
      if (match) {
        setLocalModel(selectedModel);
        setCustomModel('');
      } else {
        setLocalModel('custom');
        setCustomModel(selectedModel);
      }
    }
  }, [showSettings, apiProvider, geminiApiKey, openRouterApiKey, selectedModel]);

  // Adjust default model selection when provider changes locally in form
  const handleProviderChange = (provider) => {
    setLocalProvider(provider);
    if (provider === 'gemini') {
      setLocalModel('gemini-2.5-flash');
    } else {
      setLocalModel('google/gemini-2.5-flash');
    }
  };

  if (!showSettings) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const finalModel = localModel === 'custom' ? customModel.trim() : localModel;
    
    setApiProvider(localProvider);
    setGeminiApiKey(localGeminiKey);
    setOpenRouterApiKey(localOpenRouterKey);
    setSelectedModel(finalModel);

    localStorage.setItem('api_provider', localProvider);
    localStorage.setItem('gemini_api_key', localGeminiKey);
    localStorage.setItem('openrouter_api_key', localOpenRouterKey);
    localStorage.setItem('selected_model', finalModel);

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setShowSettings(false);
    }, 800);
  };

  const modelsList = localProvider === 'gemini' ? GEMINI_MODELS : OPENROUTER_MODELS;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div 
        className="bg-[--surface] border border-[--border] w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[--border] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key size={16} className="text-[--accent]" />
            <h3 className="text-sm font-semibold text-[--text-main]">Workspace Configuration</h3>
          </div>
          <button 
            onClick={() => setShowSettings(false)}
            className="p-1 rounded-lg text-[--text-muted] hover:text-[--text-main] hover:bg-[--surface-hover] transition-all cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">
              API Provider
            </label>
            <select
              value={localProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full text-xs bg-[--surface-muted] border border-[--border] focus:border-[--accent] rounded-xl px-3 py-2.5 focus:outline-none text-[--text-main]"
            >
              <option value="gemini">Google Gemini (Direct)</option>
              <option value="openrouter">OpenRouter (Multi-model & Fallback)</option>
            </select>
          </div>

          {/* Dynamic API Key Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">
              {localProvider === 'gemini' ? 'Google Gemini API Key' : 'OpenRouter API Key'}
            </label>
            <input
              type="password"
              value={localProvider === 'gemini' ? localGeminiKey : localOpenRouterKey}
              onChange={(e) => localProvider === 'gemini' ? setLocalGeminiKey(e.target.value) : setLocalOpenRouterKey(e.target.value)}
              placeholder={localProvider === 'gemini' ? "AIzaSy..." : "sk-or-..."}
              className="w-full text-xs bg-[--surface-muted] border border-[--border] hover:border-[--border-hover] focus:border-[--accent] rounded-xl px-3 py-2.5 focus:outline-none text-[--text-main] placeholder:text-neutral-600"
            />
            <p className="text-[10px] text-[--text-muted] leading-relaxed flex items-start space-x-1.5 mt-1">
              <Shield size={12} className="shrink-0 text-blue-400 mt-0.5" />
              <span>This key is saved locally in your browser's LocalStorage and is sent only to your locally running backend.</span>
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">
              Active LLM Model
            </label>
            <select
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              className="w-full text-xs bg-[--surface-muted] border border-[--border] focus:border-[--accent] rounded-xl px-3 py-2.5 focus:outline-none text-[--text-main]"
            >
              {modelsList.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            {localModel === 'custom' && (
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Enter custom model ID (e.g. meta-llama/llama-3-8b-instruct)"
                className="w-full text-xs bg-[--surface-muted] border border-[--border] hover:border-[--border-hover] focus:border-[--accent] rounded-xl px-3 py-2.5 focus:outline-none text-[--text-main] mt-1.5"
                required
              />
            )}
          </div>

          {/* Info Section */}
          <div className="bg-[--surface-muted] border border-[--border] p-3 rounded-xl flex items-start space-x-2.5">
            <Info size={14} className="shrink-0 text-amber-500 mt-0.5" />
            <div className="text-[10px] text-[--text-muted] leading-relaxed">
              <span className="font-semibold text-[--text-main] block mb-0.5">Free local fallback is active</span>
              If Gemini or OpenRouter API is unconfigured or fails, the workspace automatically defaults to free offline keyword-matching search.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 border border-[--border] hover:bg-[--surface-hover] text-xs font-semibold rounded-xl text-[--text-muted] hover:text-[--text-main] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[--accent] text-white hover:bg-blue-600 text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-w-[80px]"
            >
              {isSaved ? (
                <>
                  <Check size={12} />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
