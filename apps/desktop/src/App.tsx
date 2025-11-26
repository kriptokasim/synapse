import React, { useState, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { Terminal, Sparkles, Layers, Play, Settings, Command, FolderGit2, Search, Zap } from 'lucide-react';

// Theme Constants mapped from Tailwind config
const THEME = {
  bg: '#fbf7ef',
  text: '#2b2926',
  accent: '#a39060',
  selection: '#e3dcc8',
};

// Monaco Component
const AetherEditor = ({ code, setCode }: { code: string, setCode: any }) => {
  const monaco = useMonaco();
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('aether-cream', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'a39060', fontStyle: 'bold' },
          { token: 'string', foreground: '5f8b59' },
          { token: 'function', foreground: 'c47638' },
        ],
        colors: {
          'editor.background': THEME.bg,
          'editor.foreground': THEME.text,
          'editor.lineHighlightBackground': '#f0ebe0',
          'editorLineNumber.foreground': '#d1cdc4',
          'editorCursor.foreground': THEME.accent,
          'editor.selectionBackground': THEME.selection,
        }
      });
      monaco.editor.setTheme('aether-cream');
    }
  }, [monaco]);

  return (
    <Editor
      height="100%"
      defaultLanguage="typescript"
      value={code}
      onChange={(val) => setCode(val || '')}
      options={{
        minimap: { enabled: false },
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        padding: { top: 24 },
        lineHeight: 1.6,
        smoothScrolling: true,
        overviewRulerBorder: false,
        renderLineHighlight: 'all',
      }}
    />
  );
};

export default function AetherApp() {
  const [code, setCode] = useState(`// Welcome to Aether.\n// Synapse AI is listening.\n\nfunction createFuture() {\n  return "AntiGravity";\n}`);
  const [isThinking, setIsThinking] = useState(false);

  return (
    <div className="flex h-screen bg-aether-bg text-aether-text font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 flex flex-col items-center py-6 border-r border-aether-border bg-aether-sidebar">
        <div className="mb-8"><Command className="text-aether-accent" /></div>
        <nav className="flex flex-col gap-6 w-full items-center">
          <FolderGit2 size={20} className="text-aether-text" />
          <Search size={20} className="text-aether-muted hover:text-aether-text" />
          <Layers size={20} className="text-aether-muted hover:text-aether-text" />
        </nav>
        <div className="flex-1" />
        <Settings size={20} className="mb-4 text-aether-muted" />
      </div>

      {/* Explorer */}
      <div className="w-60 border-r border-aether-border bg-aether-bg py-6 px-4 hidden md:block">
        <h2 className="text-xs font-bold tracking-widest text-aether-muted uppercase mb-4">Files</h2>
        <div className="text-sm space-y-2">
          <div className="flex items-center gap-2 font-medium text-aether-text bg-aether-surface px-2 py-1 rounded">App.tsx</div>
          <div className="flex items-center gap-2 text-aether-muted px-2">main.ts</div>
          <div className="flex items-center gap-2 text-aether-muted px-2">style.css</div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 border-b border-aether-border flex items-center justify-between px-6 bg-aether-bg/80 backdrop-blur">
          <span className="text-sm text-aether-muted">src / <span className="text-aether-text">App.tsx</span></span>
          <button className="flex items-center gap-2 text-xs font-medium text-aether-accent border border-aether-border px-3 py-1 rounded hover:bg-aether-surface">
            <Play size={12} /> Run
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 relative">
          <AetherEditor code={code} setCode={setCode} />
        </div>

        {/* AI Input */}
        <div className="p-4 border-t border-aether-border bg-aether-sidebar">
          <div className="flex items-center gap-3 bg-aether-bg border border-aether-border rounded-xl px-4 py-3 shadow-sm focus-within:border-aether-accent transition-colors">
            {isThinking ? <Zap size={18} className="text-aether-accent animate-pulse" /> : <Sparkles size={18} className="text-aether-muted" />}
            <input
              disabled={isThinking}
              placeholder="Ask Synapse to edit this code..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-aether-muted"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
