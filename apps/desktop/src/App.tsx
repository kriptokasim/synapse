import React, { useState, useEffect } from 'react';
import Editor, { useMonaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  Settings, FolderGit2, Search, Zap,
  Minus, Square, X, Sparkles, LayoutTemplate, Code, Eye, RefreshCw, Globe
} from 'lucide-react';
import { SynapseFactory } from './ai/UniversalGateway';

const { ipcRenderer } = window.require('electron');

loader.config({ monaco });

const THEME = {
  bg: '#fbf7ef',
  text: '#2b2926',
  accent: '#a39060',
  selection: '#e3dcc8',
};

// --- COMPONENTS ---
const WindowControls = () => (
  <div className="flex items-center gap-2 px-4 no-drag">
    <button onClick={() => ipcRenderer.send('window:minimize')} className="p-1.5 hover:bg-aether-surface rounded text-aether-muted hover:text-aether-text transition-colors"><Minus size={14} /></button>
    <button onClick={() => ipcRenderer.send('window:maximize')} className="p-1.5 hover:bg-aether-surface rounded text-aether-muted hover:text-aether-text transition-colors"><Square size={12} /></button>
    <button onClick={() => ipcRenderer.send('window:close')} className="p-1.5 hover:bg-red-100 hover:text-red-500 rounded text-aether-muted transition-colors"><X size={14} /></button>
  </div>
);

const AetherEditor = ({ code, setCode }: { code: string, setCode: any }) => {
  const monacoInstance = useMonaco();
  useEffect(() => {
    if (monacoInstance) {
      monacoInstance.editor.defineTheme('aether-cream', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'a39060', fontStyle: 'bold' },
          { token: 'string', foreground: '5f8b59' },
          { token: 'function', foreground: 'c47638' },
          { token: 'type', foreground: '2b2926', fontStyle: 'bold' },
        ],
        colors: {
          'editor.background': THEME.bg,
          'editor.foreground': THEME.text,
          'editor.lineHighlightBackground': '#f0ebe0',
          'editorLineNumber.foreground': '#d1cdc4',
          'editorCursor.foreground': THEME.accent,
          'editor.selectionBackground': THEME.selection,
          'editor.inactiveSelectionBackground': '#f0ebe0',
        }
      });
      monacoInstance.editor.setTheme('aether-cream');
    }
  }, [monacoInstance]);

  return (
    <Editor
      height="100%"
      defaultLanguage="typescript"
      value={code}
      onChange={(val) => setCode(val || '')}
      options={{
        minimap: { enabled: false },
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        lineHeight: 1.6,
        padding: { top: 16 },
        smoothScrolling: true,
        overviewRulerBorder: false,
        renderLineHighlight: 'all',
        hideCursorInOverviewRuler: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
};

// --- MAIN APP ---
export default function AetherApp() {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [code, setCode] = useState('// Open a folder to start coding...');
  const [isThinking, setIsThinking] = useState(false);

  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('split');
  const [previewUrl, setPreviewUrl] = useState('http://localhost:3000');
  const [iframeKey, setIframeKey] = useState(0);

  // --- ACTIONS ---
  const handleOpenFolder = async () => {
    console.log("[UI] Requesting open folder...");
    try {
      // Verify API availability
      if (!window.synapse) {
        throw new Error("Synapse API not found on window object. Is preload script working?");
      }

      const path = await window.synapse.openDirectory();
      console.log("[UI] Received path:", path);

      if (path) {
        setProjectPath(path);
        await loadFiles(path);
      }
    } catch (error: any) {
      console.error("[UI] Open Folder Error:", error);
      alert(`Error opening folder: ${error.message || error}`);
    }
  };

  const loadFiles = async (path: string) => {
    const fileList = await window.synapse.readDirectory(path);
    setFiles(fileList);
  };

  const handleFileClick = async (file: any) => {
    if (file.isDirectory) return;
    const content = await window.synapse.readFile(file.path);
    setActiveFile(file.path);
    setCode(content);
  };

  const handleAskAI = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isThinking) {
      const prompt = (e.target as HTMLInputElement).value;
      if (!prompt.trim()) return;
      setIsThinking(true);
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
        if (!apiKey) { alert("API Key Missing"); setIsThinking(false); return; }
        const ai = SynapseFactory.create('gemini', apiKey);
        const newCode = await ai.generateCode(prompt, code);
        setCode(newCode);
      } catch (error) { console.error(error); alert("AI Failed"); }
      finally { setIsThinking(false); }
    }
  };

  return (
    <div className="flex h-screen w-screen bg-aether-bg text-aether-text font-sans overflow-hidden border border-aether-border rounded-lg shadow-2xl">

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full h-10 z-50 flex justify-between items-center drag-region">
        <div className="px-4 flex items-center gap-4">
          <span className="text-xs font-bold tracking-widest text-aether-accent opacity-50">AETHER</span>

          {/* View Toggle */}
          <div className="flex bg-aether-surface rounded-lg p-0.5 no-drag">
            <button onClick={() => setViewMode('code')} className={`p-1 rounded transition-all ${viewMode === 'code' ? 'bg-white shadow-sm text-aether-text' : 'text-aether-muted hover:text-aether-text'}`} title="Code Only"><Code size={12} /></button>
            <button onClick={() => setViewMode('split')} className={`p-1 rounded transition-all ${viewMode === 'split' ? 'bg-white shadow-sm text-aether-text' : 'text-aether-muted hover:text-aether-text'}`} title="Split View"><LayoutTemplate size={12} /></button>
            <button onClick={() => setViewMode('preview')} className={`p-1 rounded transition-all ${viewMode === 'preview' ? 'bg-white shadow-sm text-aether-text' : 'text-aether-muted hover:text-aether-text'}`} title="Preview Only"><Eye size={12} /></button>
          </div>

          {/* CLEAN URL BAR */}
          <div className="flex items-center gap-2 bg-aether-surface px-2 py-1 rounded-md no-drag w-64 group focus-within:ring-1 focus-within:ring-aether-accent/50 transition-all">
            <Globe size={10} className="text-aether-muted group-focus-within:text-aether-accent" />
            <input
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] w-full font-mono text-aether-text focus:ring-0 placeholder:text-aether-muted/50"
              placeholder="Enter localhost URL..."
            />
            <button onClick={() => setIframeKey(k => k + 1)} className="text-aether-muted hover:text-aether-accent transition-colors"><RefreshCw size={10} /></button>
          </div>
        </div>
        <WindowControls />
      </div>

      {/* SIDEBAR */}
      <div className="w-16 flex-shrink-0 flex flex-col items-center py-12 border-r border-aether-border bg-aether-sidebar z-20 pt-16">
        <nav className="flex flex-col gap-6 w-full items-center">
          {/* FOLDER BUTTON - Explicitly bound */}
          <button onClick={handleOpenFolder} className="p-2 rounded-xl text-aether-text hover:bg-aether-surface hover:text-aether-accent transition-colors no-drag" title="Open Project">
            <FolderGit2 size={20} />
          </button>
          <button className="p-2 rounded-xl text-aether-muted hover:bg-aether-surface hover:text-aether-text transition-colors no-drag">
            <Search size={20} />
          </button>
        </nav>
        <div className="flex-1" />
        <Settings size={20} className="mb-6 text-aether-muted cursor-pointer hover:text-aether-text transition-colors no-drag" />
      </div>

      {/* EXPLORER */}
      <div className="w-56 flex-shrink-0 border-r border-aether-border bg-aether-bg py-6 px-4 hidden md:flex flex-col pt-16">
        <h2 className="text-[10px] font-bold tracking-widest text-aether-muted uppercase mb-4 truncate">
          {projectPath ? projectPath.split(/[\\/]/).pop() : 'NO FOLDER'}
        </h2>
        <div className="text-sm space-y-0.5 overflow-y-auto flex-1 pr-2 scrollbar-hide">
          {!projectPath && (
            <div className="flex flex-col items-center justify-center h-32 text-aether-muted text-xs text-center">
              <FolderGit2 size={24} className="mb-2 opacity-20" />
              <p>Open a project<br />to start</p>
            </div>
          )}
          {files.map((file, i) => (
            <div key={i} onClick={() => handleFileClick(file)} className={`
                flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all truncate group
                ${activeFile === file.path ? 'bg-aether-surface font-medium text-aether-text shadow-sm' : 'text-aether-muted hover:bg-aether-surface/50 hover:text-aether-text'}
              `}>
              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${file.isDirectory ? 'bg-aether-accent group-hover:scale-125' : 'bg-aether-border group-hover:bg-aether-muted'}`}></span>
              <span className="truncate text-xs">{file.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SPLIT CONTENT */}
      <div className="flex-1 flex min-w-0 pt-10 relative">

        {/* EDITOR PANE */}
        <div className={`
            flex-col relative transition-all duration-300 ease-in-out border-r border-aether-border
            ${viewMode === 'preview' ? 'hidden' : 'flex'}
            ${viewMode === 'split' ? 'w-1/2' : 'w-full'}
        `}>
          <div className="flex-1 relative overflow-hidden">
            <AetherEditor code={code} setCode={setCode} />
          </div>
          <div className="flex-shrink-0 p-4 border-t border-aether-border bg-aether-sidebar z-20">
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${isThinking ? 'bg-white border-aether-accent shadow-glow' : 'bg-aether-bg border-aether-border shadow-sm'}`}>
              {isThinking ? <Zap size={16} className="text-aether-accent animate-pulse" /> : <Sparkles size={16} className="text-aether-muted" />}
              <input disabled={isThinking} onKeyDown={handleAskAI} placeholder="Ask Synapse..." className="flex-1 bg-transparent outline-none text-sm text-aether-text placeholder:text-aether-muted font-medium border-none focus:ring-0" />
            </div>
          </div>
        </div>

        {/* PREVIEW PANE */}
        <div className={`
            flex-col bg-white relative transition-all duration-300 ease-in-out
            ${viewMode === 'code' ? 'hidden' : 'flex'}
            ${viewMode === 'split' ? 'w-1/2' : 'w-full'}
        `}>
          <iframe
            key={iframeKey}
            src={previewUrl}
            className="w-full h-full border-none bg-white"
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      </div>
    </div>
  );
}
