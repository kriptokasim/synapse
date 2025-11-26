import React, { useState, useEffect } from 'react';
import Editor, { useMonaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  Layers, Settings, FolderGit2, Search, Zap,
  Minus, Square, X, Sparkles, File, Folder
} from 'lucide-react';
import { SynapseFactory } from './ai/UniversalGateway';

const { ipcRenderer } = window.require('electron'); // Electron Bridge

loader.config({ monaco });

const THEME = {
  bg: '#fbf7ef',
  text: '#2b2926',
  accent: '#a39060',
  selection: '#e3dcc8',
};

// --- WINDOW CONTROLS COMPONENT ---
const WindowControls = () => (
  <div className="flex items-center gap-2 px-4 no-drag">
    <button onClick={() => ipcRenderer.send('window:minimize')} className="p-1.5 hover:bg-aether-surface rounded text-aether-muted hover:text-aether-text transition-colors">
      <Minus size={14} />
    </button>
    <button onClick={() => ipcRenderer.send('window:maximize')} className="p-1.5 hover:bg-aether-surface rounded text-aether-muted hover:text-aether-text transition-colors">
      <Square size={12} />
    </button>
    <button onClick={() => ipcRenderer.send('window:close')} className="p-1.5 hover:bg-red-100 hover:text-red-500 rounded text-aether-muted transition-colors">
      <X size={14} />
    </button>
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
    <div className="h-full w-full">
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
    </div>
  );
};

export default function AetherApp() {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [code, setCode] = useState('// Open a folder to start coding...');
  const [isThinking, setIsThinking] = useState(false);

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
      // Ideally we dive deeper, for now let's just log
      console.log("Opening folder:", file.path);
      // In a full app, this would toggle expansion
    } else {
      const content = await window.synapse.readFile(file.path);
      setActiveFile(file.path);
      setCode(content);
    }
  };

  const handleSave = async () => {
    if (activeFile) {
      await window.synapse.writeFile(activeFile, code);
      alert("Saved!");
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, code]);

  const handleAskAI = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isThinking) {
      const prompt = (e.target as HTMLInputElement).value;
      if (!prompt.trim()) return;

      setIsThinking(true);

      try {
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

        if (!apiKey || apiKey.includes("SENIN_GERCEK")) {
          alert("Setup Error: Please add VITE_GOOGLE_API_KEY to apps/desktop/.env");
          setIsThinking(false);
          return;
        }

        const ai = SynapseFactory.create('gemini', apiKey);
        const newCode = await ai.generateCode(prompt, code);
        setCode(newCode);

      } catch (error) {
        console.error("AI Error:", error);
        alert("Synapse Connection Failed.");
      } finally {
        setIsThinking(false);
      }
    }
  };

  return (
    <div className="flex h-screen w-screen bg-aether-bg text-aether-text font-sans overflow-hidden border border-aether-border rounded-lg shadow-2xl">

      {/* DRAGGABLE HEADER REGION */}
      <div className="absolute top-0 left-0 w-full h-10 z-50 flex justify-between items-center drag-region" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="px-4 text-xs font-bold tracking-widest text-aether-accent opacity-50">AETHER</div>
        <WindowControls />
      </div>

      {/* SIDEBAR */}
      <div className="w-16 flex-shrink-0 flex flex-col items-center py-12 border-r border-aether-border bg-aether-sidebar z-20 pt-16">
        <nav className="flex flex-col gap-6 w-full items-center">
          <FolderGit2
            size={20}
            onClick={handleOpenFolder}
            className="text-aether-text cursor-pointer hover:text-aether-accent transition-colors"
          />
          <Search size={20} className="text-aether-muted hover:text-aether-text cursor-pointer transition-colors" />
          <Layers size={20} className="text-aether-muted hover:text-aether-text cursor-pointer transition-colors" />
        </nav>
        <div className="flex-1" />
        <Settings size={20} className="mb-6 text-aether-muted cursor-pointer hover:text-aether-text transition-colors" />
      </div>

      {/* EXPLORER */}
      <div className="w-64 flex-shrink-0 border-r border-aether-border bg-aether-bg py-6 px-4 hidden md:flex flex-col pt-16">
        <h2 className="text-[10px] font-bold tracking-widest text-aether-muted uppercase mb-4">
          {projectPath ? projectPath.split('/').pop() : 'NO FOLDER'}
        </h2>
        <div className="text-sm space-y-1 overflow-y-auto">
          {files.map(file => (
            <div
              key={file.path}
              onClick={() => handleFileClick(file)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${activeFile === file.path ? 'bg-aether-surface/80 text-aether-text' : 'text-aether-muted hover:text-aether-text hover:bg-aether-surface/40'
                }`}
            >
              {file.isDirectory ? <Folder size={14} /> : <File size={14} />}
              <span className="truncate">{file.name}</span>
            </div>
          ))}
          {files.length === 0 && (
            <div className="text-aether-muted italic text-xs">Empty or no folder open</div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-aether-bg pt-10">

        {/* Editor Area */}
        <div className="flex-1 relative overflow-hidden">
          <AetherEditor code={code} setCode={setCode} />
        </div>

        {/* AI Input */}
        <div className="flex-shrink-0 p-4 border-t border-aether-border bg-aether-sidebar z-20">
          <div className={`
            flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300
            ${isThinking ? 'bg-white border-aether-accent shadow-glow' : 'bg-aether-bg border-aether-border shadow-sm'}
          `}>
            {isThinking ? (
              <Zap size={18} className="text-aether-accent animate-pulse" />
            ) : (
              <Sparkles size={18} className="text-aether-muted" />
            )}

            <input
              disabled={isThinking}
              onKeyDown={handleAskAI}
              placeholder={isThinking ? "Processing..." : "Ask Synapse..."}
              className="flex-1 bg-transparent outline-none text-sm text-aether-text placeholder:text-aether-muted font-medium"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
