import React, { useState, useEffect } from 'react';
import Editor, { useMonaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Sparkles, Layers, Play, Settings, Command, FolderGit2, Search, Zap } from 'lucide-react';
import { SynapseFactory } from './ai/UniversalGateway';

// --- CONFIGURATION: Force Monaco to use local resources ---
loader.config({ monaco });

// Theme Constants (Aether Cream)
const THEME = {
  bg: '#fbf7ef',
  text: '#2b2926',
  accent: '#a39060',
  selection: '#e3dcc8',
};

// --- COMPONENT: Aether Editor ---
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
          automaticLayout: true, // Critical for resizing
        }}
      />
    </div>
  );
};

// --- MAIN APP ---
export default function AetherApp() {
  const [code, setCode] = useState(`// Welcome to Aether.\n// Synapse AI is listening.\n\nfunction createFuture() {\n  return "AntiGravity";\n}`);
  const [isThinking, setIsThinking] = useState(false);

  // --- AI LOGIC: The Synapse Connection ---
  const handleAskAI = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isThinking) {
      const prompt = (e.target as HTMLInputElement).value;
      if (!prompt.trim()) return;

      setIsThinking(true);

      try {
        // SECURITY FIX: Read from Environment Variable
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
        alert("Synapse Connection Failed. Check console for details.");
      } finally {
        setIsThinking(false);
      }
    }
  };

  return (
    <div className="flex h-screen w-screen bg-aether-bg text-aether-text font-sans overflow-hidden">

      {/* SIDEBAR: Fixed Width */}
      <div className="w-16 flex-shrink-0 flex flex-col items-center py-6 border-r border-aether-border bg-aether-sidebar z-20">
        <div className="mb-8 p-2 bg-aether-surface rounded-lg shadow-soft">
          <Command className="text-aether-accent" size={20} />
        </div>
        <nav className="flex flex-col gap-6 w-full items-center">
          <FolderGit2 size={20} className="text-aether-text cursor-pointer hover:text-aether-accent transition-colors" />
          <Search size={20} className="text-aether-muted hover:text-aether-text cursor-pointer transition-colors" />
          <Layers size={20} className="text-aether-muted hover:text-aether-text cursor-pointer transition-colors" />
        </nav>
        <div className="flex-1" />
        <Settings size={20} className="mb-4 text-aether-muted cursor-pointer hover:text-aether-text transition-colors" />
      </div>

      {/* EXPLORER: Fixed Width */}
      <div className="w-64 flex-shrink-0 border-r border-aether-border bg-aether-bg py-6 px-4 hidden md:flex flex-col">
        <h2 className="text-[10px] font-bold tracking-widest text-aether-muted uppercase mb-4">Explorer</h2>
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2 font-medium text-aether-text bg-aether-surface/60 px-2 py-1.5 rounded cursor-pointer border border-transparent hover:border-aether-border transition-all">
            <span className="w-1.5 h-1.5 rounded-full bg-aether-accent"></span>
            App.tsx
          </div>
          <div className="flex items-center gap-2 text-aether-muted px-2 py-1.5 cursor-pointer hover:bg-aether-surface/30 rounded transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-aether-border"></span>
            main.ts
          </div>
          <div className="flex items-center gap-2 text-aether-muted px-2 py-1.5 cursor-pointer hover:bg-aether-surface/30 rounded transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-aether-border"></span>
            style.css
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: Flex Grow */}
      <div className="flex-1 flex flex-col min-w-0 bg-aether-bg">

        {/* Top Bar */}
        <div className="h-12 flex-shrink-0 border-b border-aether-border flex items-center justify-between px-6 bg-aether-bg z-10">
          <div className="flex items-center gap-2 text-xs text-aether-muted font-mono">
            <span>src</span>
            <span className="text-aether-border">/</span>
            <span className="text-aether-text font-semibold">App.tsx</span>
          </div>
          <button className="flex items-center gap-2 text-xs font-medium text-aether-accent border border-aether-border bg-white px-3 py-1.5 rounded-md shadow-sm hover:shadow-soft transition-all active:scale-95">
            <Play size={12} fill="currentColor" /> Run
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 relative overflow-hidden">
          <AetherEditor code={code} setCode={setCode} />
        </div>

        {/* AI Input Bar */}
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
              placeholder={isThinking ? "Synapse is generating code..." : "Ask Synapse to edit code..."}
              className="flex-1 bg-transparent outline-none text-sm text-aether-text placeholder:text-aether-muted font-medium"
            />

            {isThinking && <span className="text-[10px] text-aether-accent font-bold tracking-wide uppercase animate-pulse">GEMINI 2.0</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
