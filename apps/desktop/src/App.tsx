import React, { useState, useEffect } from 'react';
import Editor, { useMonaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  Settings, FolderGit2, Search, Zap,
  Minus, Square, X, Sparkles, LayoutTemplate, Code, Eye, RefreshCw, Globe, Folder, File
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

  // View State: 'code' | 'preview' | 'split'
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('split');
  const [previewUrl, setPreviewUrl] = useState('http://localhost:3000');
  const [iframeKey, setIframeKey] = useState(0); // For forcing refresh

  // --- FILE SYSTEM ACTIONS ---
  const handleOpenFolder = async () => {
    const path = await window.synapse.openDirectory();
    if (path) {
      setProjectPath(path);
      loadFiles(path);
    }
  };

  const loadFiles = async (path: string) => {
    const fileList = await window.synapse.readDirectory(path);
    setFiles(fileList);
  };

  const handleFileClick = async (file: any) => {
    if (file.isDirectory) {
      console.log("Opening folder:", file.path);
    } else {
      const content = await window.synapse.readFile(file.path);
      setActiveFile(file.path);
      setCode(content);
    }
  };

  // --- AI LOGIC ---
  const handleAskAI = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isThinking) {
      const prompt = (e.target as HTMLInputElement).value;
      if (!prompt.trim()) return;
      setIsThinking(true);
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
        if (!apiKey || apiKey.includes("SENIN_GERCEK")) {
          alert("API Key Missing in .env"); setIsThinking(false); return;
        }
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
      <div className="absolute top-0 left-0 w-full h-10 z-50 flex justify-between items-center drag-region" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="px-4 flex items-center gap-4">
          <span className="text-xs font-bold tracking-widest text-aether-accent opacity-50">AETHER</span>

          {/* View Mode Toggle */}
          <div className="flex bg-aether-surface rounded-lg p-0.5 no-drag">
            <button onClick={() => setViewMode('code')} className={`p-1 rounded ${viewMode === 'code' ? 'bg-white shadow-sm text-aether-text' : 'text-aether-muted'}`}><Code size={12} /></button>
            <button onClick={() => setViewMode('split')} className={`p-1 rounded ${viewMode === 'split' ? 'bg-white shadow-sm text-aether-text' : 'text-aether-muted'}`}><LayoutTemplate size={12} /></button>
            <button onClick={() => setViewMode('preview')} className={`p-1 rounded ${viewMode === 'preview' ? 'bg-white shadow-sm text-aether-text' : 'text-aether-muted'}`}><Eye size={12} /></button>
          </div>

          {/* URL Bar */}
          <div className="flex items-center gap-2 bg-aether-surface px-2 py-0.5 rounded-md no-drag w-64">
            <Globe size={10} className="text-aether-muted" />
            <input
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              className="bg-transparent outline-none text-[10px] w-full font-mono text-aether-text"
            />
            <button onClick={() => setIframeKey(k => k + 1)}><RefreshCw size={10} className="text-aether-muted hover:text-aether-accent" /></button>
          </div>
        </div>
        <WindowControls />
      </div>

      {/* SIDEBAR */}
      <div className="w-16 flex-shrink-0 flex flex-col items-center py-12 border-r border-aether-border bg-aether-sidebar z-20 pt-16">
        <nav className="flex flex-col gap-6 w-full items-center">
          <FolderGit2 size={20} onClick={handleOpenFolder} className="text-aether-text cursor-pointer hover:text-aether-accent transition-colors" />
          <Search size={20} className="text-aether-muted hover:text-aether-text cursor-pointer transition-colors" />
        </nav>
        <div className="flex-1" />
        <Settings size={20} className="mb-6 text-aether-muted cursor-pointer hover:text-aether-text transition-colors" />
      </div>

      {/* EXPLORER */}
      <div className="w-56 flex-shrink-0 border-r border-aether-border bg-aether-bg py-6 px-4 hidden md:flex flex-col pt-16">
        <h2 className="text-[10px] font-bold tracking-widest text-aether-muted uppercase mb-4">
          {projectPath ? projectPath.split(/[\\/]/).pop() : 'NO FOLDER'}
        </h2>
        <div className="text-sm space-y-0.5 overflow-y-auto flex-1">
          {files.length === 0 && <span className="text-xs text-aether-muted italic">Empty or no folder open</span>}
          {files.map((file, i) => (
            <div key={i} onClick={() => handleFileClick(file)} className={`
                flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all truncate
                ${activeFile === file.path ? 'bg-aether-surface font-medium text-aether-text' : 'text-aether-muted hover:bg-aether-surface/50'}
              `}>
              {file.isDirectory ? <Folder size={14} /> : <File size={14} />}
              <span className="truncate">{file.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN SPLIT CONTENT */}
      <div className="flex-1 flex min-w-0 pt-10 relative">

        {/* LEFT: EDITOR */}
        <div className={`
            flex-col relative transition-all duration-300 ease-in-out border-r border-aether-border
            ${viewMode === 'preview' ? 'hidden' : 'flex'}
            ${viewMode === 'split' ? 'w-1/2' : 'w-full'}
        `}>
          <div className="flex-1 relative overflow-hidden">
            <AetherEditor code={code} setCode={setCode} />
          </div>
          {/* AI Input */}
          <div className="flex-shrink-0 p-4 border-t border-aether-border bg-aether-sidebar z-20">
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${isThinking ? 'bg-white border-aether-accent shadow-glow' : 'bg-aether-bg border-aether-border shadow-sm'}`}>
              {isThinking ? <Zap size={16} className="text-aether-accent animate-pulse" /> : <Sparkles size={16} className="text-aether-muted" />}
              <input disabled={isThinking} onKeyDown={handleAskAI} placeholder="Ask Synapse..." className="flex-1 bg-transparent outline-none text-sm text-aether-text placeholder:text-aether-muted font-medium" />
            </div>
          </div>
        </div>

        {/* RIGHT: PREVIEW */}
        <div className={`
            flex-col bg-white relative transition-all duration-300 ease-in-out
            ${viewMode === 'code' ? 'hidden' : 'flex'}
            ${viewMode === 'split' ? 'w-1/2' : 'w-full'}
        `}>
          <iframe
            key={iframeKey}
            src={previewUrl}
            className="w-full h-full border-none"
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
          {/* Overlay when iframe is likely empty/error */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-aether-bg -z-10">
            <div className="text-center opacity-50">
              <Globe size={32} className="mx-auto mb-2 text-aether-muted" />
              <p className="text-xs">Enter a local URL above</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
