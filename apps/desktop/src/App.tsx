import React, { useState, useEffect, useRef } from 'react';
import Editor, { useMonaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  Files, Search, GitGraph, Play, Bug, Settings, // Sidebar Icons
  Minus, Square, X,                             // Window Controls
  RefreshCw, Globe, Crosshair,                  // URL Bar
  LayoutTemplate, Code, Eye,                    // View Controls
  Check, AlertCircle, Terminal, Zap, Sparkles   // Status Bar & AI
} from 'lucide-react';
import { SynapseFactory } from './ai/UniversalGateway';
import { INSPECTOR_SCRIPT } from './ai/inspector';

const { ipcRenderer } = window.require('electron');

loader.config({ monaco });

// --- COMPONENTS ---

// Window Controls (Designed for Gold Background)
const WindowControls = () => (
  <div className="flex items-center h-full px-1 no-drag">
    <button onClick={() => ipcRenderer.send('window:minimize')} className="p-2 hover:bg-black/10 rounded-none transition-colors text-aether-textOnAccent"><Minus size={14} /></button>
    <button onClick={() => ipcRenderer.send('window:maximize')} className="p-2 hover:bg-black/10 rounded-none transition-colors text-aether-textOnAccent"><Square size={12} /></button>
    <button onClick={() => ipcRenderer.send('window:close')} className="p-2 hover:bg-red-500 hover:text-white rounded-none transition-colors text-aether-textOnAccent"><X size={14} /></button>
  </div>
);

// Editor with Matching Theme
// Editor with Matching Theme
const AetherEditor = ({ code, setCode, revealLine }: { code: string, setCode: any, revealLine: number | null }) => {
  const monacoInstance = useMonaco();
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]); // Keep track of decorations to clear them

  useEffect(() => {
    if (monacoInstance) {
      monacoInstance.editor.defineTheme('antigravity', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'D99A25', fontStyle: 'bold' }, // Match Accent
          { token: 'string', foreground: '5F8B59' }, // Sage Green
          { token: 'function', foreground: 'B47F1E' },
          { token: 'type', foreground: '2D261F', fontStyle: 'bold' },
        ],
        colors: {
          'editor.background': '#FFFDF5',
          'editor.foreground': '#2D261F',
          'editor.lineHighlightBackground': '#F4F0E6',
          'editorLineNumber.foreground': '#D6D3C4',
          'editorCursor.foreground': '#D99A25',
          'editor.selectionBackground': '#FCEEB5',
        }
      });
      monacoInstance.editor.setTheme('antigravity');
    }
  }, [monacoInstance]);

  // HIGHLIGHT LOGIC
  useEffect(() => {
    if (editorRef.current && revealLine && monacoInstance) {
      const editor = editorRef.current;

      // 1. Scroll to position
      editor.revealLineInCenter(revealLine);
      editor.setPosition({ column: 1, lineNumber: revealLine });
      editor.focus();

      // 2. Apply Decoration (Yellow Highlight)
      // We use the ref to clear previous decorations first
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: new monacoInstance.Range(revealLine, 1, revealLine, 1),
          options: {
            isWholeLine: true,
            className: 'my-line-highlight', // Matches CSS
            marginClassName: 'my-line-highlight-margin' // Optional margin indicator
          }
        }
      ]);
    }
  }, [revealLine, monacoInstance]);

  return (
    <Editor
      height="100%"
      defaultLanguage="typescript"
      value={code}
      onChange={(val) => setCode(val || '')}
      onMount={(editor) => { editorRef.current = editor; }}
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
        automaticLayout: true,
      }}
    />
  );
};

// --- HELPER: LOCAL SEARCH STRATEGY ---
function findLineLocal(code: string, tag: string, id: string | null, text: string): number | null {
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Strategy 1: ID Match (Strongest)
    // Looks for id="value" or id='value'
    if (id && (line.includes(`id="${id}"`) || line.includes(`id='${id}'`))) {
      return i + 1;
    }

    // Strategy 2: Unique Text Match
    // If the line contains the text and the tag name, it's a strong candidate
    if (text && text.length > 5 && line.includes(text)) {
      return i + 1;
    }
  }
  return null;
}

interface SelectedElementContext {
  tag: string;
  text: string;
  id: string | null;
  className: string | null;
  lineNumber: number;
  snippet: string;
}

// --- MAIN APP ---
export default function AetherApp() {
  // State
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [code, setCode] = useState('// Synapse AntiGravity\n// Waiting for instructions...');
  const [isThinking, setIsThinking] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('split');
  const [previewUrl, setPreviewUrl] = useState('about:blank');
  const [iframeKey, setIframeKey] = useState(0);
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [revealLine, setRevealLine] = useState<number | null>(null);
  const [selectedContext, setSelectedContext] = useState<SelectedElementContext | null>(null);

  // Handlers
  const handleOpenFolder = async () => {
    try {
      const path = await window.synapse.openDirectory();
      if (path) { setProjectPath(path); loadFiles(path); }
    } catch (e) { console.error(e); }
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

  // Locator Logic
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_CLICKED') {
        const { tag, id, className, text, snippet } = event.data.payload;
        console.log("Locating:", tag, id);

        // 1. Reset & UI Feedback
        setIsInspectorActive(false);
        document.querySelector('iframe')?.contentWindow?.postMessage({ type: 'TOGGLE_INSPECTOR', active: false }, '*');
        setIsThinking(true);

        // 2. Find Line Number (Existing Logic)
        const localMatch = findLineLocal(code, tag, id, text);
        let foundLine = localMatch;

        if (!foundLine) {
          try {
            const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
            const ai = SynapseFactory.create('gemini', apiKey);
            const prompt = `Find line number for <${tag}> "${text}". Code:\n${code}\nReturn number only.`;
            const result = await ai.generateCode(prompt, code);
            foundLine = parseInt(result.replace(/[^0-9]/g, ''));
          } catch (e) { console.error(e); }
        }

        // 3. SET CONTEXT & SCROLL
        if (foundLine && !isNaN(foundLine)) {
          if (viewMode === 'preview') setViewMode('split');
          setRevealLine(foundLine);
          // ✨ NEW: Save context for the Chat
          setSelectedContext({ tag, text, id, className, lineNumber: foundLine, snippet });
        }

        setIsThinking(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [code, viewMode]);

  const toggleInspector = () => {
    const newState = !isInspectorActive;
    setIsInspectorActive(newState);
    document.querySelector('iframe')?.contentWindow?.postMessage({ type: 'TOGGLE_INSPECTOR', active: newState }, '*');
  };

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const doc = e.currentTarget.contentDocument;
      if (doc) {
        const script = doc.createElement('script');
        script.text = INSPECTOR_SCRIPT;
        doc.body.appendChild(script);
      }
    } catch (e) { }
  };

  const handleAskAI = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isThinking) {
      const userPrompt = (e.target as HTMLInputElement).value;
      if (!userPrompt.trim()) return;

      setIsThinking(true);

      try {
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
        if (!apiKey) { alert("API Key Missing"); setIsThinking(false); return; }
        const ai = SynapseFactory.create('gemini', apiKey);

        let prompt = "";

        // CONTEXT AWARE PROMPT
        if (activeFile && code) {
          prompt = `
                  I need to modify a file based on a user request.
                  
                  FILENAME: ${activeFile}
                  
                  CURRENT CODE:
                  ${code}
                  
                  USER REQUEST: "${userPrompt}"
                  
                  INSTRUCTIONS:
                  1. Return the COMPLETE updated file content.
                  2. Do not include any markdown formatting (no \`\`\`html or \`\`\`javascript).
                  3. Do not add explanations. Just the raw code.
                `;

          // Add selection context if available
          if (selectedContext) {
            prompt += `
                    FOCUS ON THIS ELEMENT:
                    Tag: <${selectedContext.tag}>
                    Content: "${selectedContext.text}"
                    Line: ${selectedContext.lineNumber}
                    `;
          }
        } else {
          alert("No file open!");
          setIsThinking(false);
          return;
        }

        console.log("Sending prompt to AI...");
        let newCode = await ai.generateCode(prompt, code);

        // 🧹 CLEANUP: Remove Markdown Fences if present
        newCode = newCode.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');

        console.log("AI Response received. Writing to file...");

        // APPLY & SAVE
        setCode(newCode); // Update Editor

        if (activeFile) {
          await window.synapse.writeFile(activeFile, newCode);
          console.log("File written successfully.");

          // ⚡ FORCE RELOAD PREVIEW
          // We add a timestamp to the URL to bust any cache
          try {
            const currentUrl = new URL(previewUrl);
            currentUrl.searchParams.set('t', Date.now().toString());
            setPreviewUrl(currentUrl.toString());
          } catch (e) {
            // Fallback if URL is invalid (e.g. about:blank)
            console.warn("Could not update preview URL params", e);
          }
          setIframeKey(k => k + 1); // Hard remount
        }

        // Clear Input
        (e.target as HTMLInputElement).value = '';

      } catch (e: any) {
        console.error("AI Edit Error:", e);
        alert(`AI Error: ${e.message || e}`);
      } finally {
        setIsThinking(false);
        setSelectedContext(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-aether-bg font-sans overflow-hidden">

      {/* --- 1. GOLDEN TOP BAR --- */}
      <div className="h-9 bg-aether-accent flex items-center justify-between drag-region shrink-0 shadow-sm relative z-50">

        {/* Left: Menus */}
        <div className="flex items-center px-3 gap-4 text-xs font-semibold text-aether-textOnAccent">
          <div className="font-black tracking-tight mr-2 cursor-default select-none">AETHER</div>
          <div className="hover:bg-black/5 px-2 py-1 rounded cursor-pointer transition-colors no-drag hidden md:block">File</div>
          <div className="hover:bg-black/5 px-2 py-1 rounded cursor-pointer transition-colors no-drag hidden md:block">Edit</div>
          <div className="hover:bg-black/5 px-2 py-1 rounded cursor-pointer transition-colors no-drag hidden md:block">View</div>
        </div>

        {/* Center: URL & Tools */}
        <div className="flex-1 max-w-2xl mx-4 no-drag h-6">
          <div className="flex items-center w-full h-full bg-white/30 hover:bg-white/50 focus-within:bg-white rounded transition-all px-2 gap-2 border border-black/5 focus-within:border-transparent focus-within:shadow-md focus-within:text-black">
            <Globe size={12} className="text-aether-textOnAccent opacity-60" />
            <input
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              className="flex-1 bg-transparent outline-none text-xs text-aether-textOnAccent placeholder:text-aether-textOnAccent/40 h-full font-medium"
              placeholder="localhost:3000"
            />
            <div className="w-px h-3 bg-black/10"></div>
            <button onClick={toggleInspector} className={`p-0.5 rounded ${isInspectorActive ? 'bg-white text-aether-accent shadow-sm' : 'text-aether-textOnAccent opacity-60 hover:opacity-100'}`}>
              <Crosshair size={12} />
            </button>
            <button onClick={() => setIframeKey(k => k + 1)} className="text-aether-textOnAccent opacity-60 hover:opacity-100">
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Right: Controls */}
        <WindowControls />
      </div>

      {/* --- 2. MAIN WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden">

        {/* A. GOLDEN LEFT BAR (Icons) */}
        <div className="w-12 bg-aether-accent flex flex-col items-center py-4 gap-4 shrink-0 z-20">
          <button onClick={handleOpenFolder} className="p-2 rounded hover:bg-black/10 text-aether-textOnAccent" title="Files"><Files size={18} strokeWidth={2} /></button>
          <button className="p-2 rounded hover:bg-black/10 text-aether-textOnAccent" title="Search"><Search size={18} strokeWidth={2} /></button>
          <button className="p-2 rounded hover:bg-black/10 text-aether-textOnAccent" title="Git"><GitGraph size={18} strokeWidth={2} /></button>
          <div className="flex-1"></div>
          <button className="p-2 rounded hover:bg-black/10 text-aether-textOnAccent" title="Settings"><Settings size={18} strokeWidth={2} /></button>
        </div>

        {/* B. SIDEBAR (Explorer) */}
        <div className="w-60 bg-aether-sidebar border-r border-aether-border flex flex-col shrink-0">
          <div className="h-8 flex items-center px-4 text-[10px] font-bold tracking-wider text-aether-muted uppercase">
            {projectPath ? projectPath.split(/[\\/]/).pop() : 'NO FOLDER'}
          </div>
          <div className="flex-1 overflow-y-auto px-2 text-sm">
            {files.length === 0 && <div className="p-4 text-center text-xs opacity-40 italic">Open a project folder</div>}
            {files.map((file, i) => (
              <div key={i} onClick={() => handleFileClick(file)} className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md transition-colors ${activeFile === file.path ? 'bg-white shadow-sm text-aether-text font-medium' : 'text-aether-text hover:bg-black/5'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${file.isDirectory ? 'bg-aether-accent' : 'bg-aether-border'}`}></span>
                <span className="truncate text-xs">{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* C. EDITOR & PREVIEW */}
        <div className="flex-1 flex flex-col min-w-0 bg-aether-bg relative">
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Pane */}
            <div className={`${viewMode === 'preview' ? 'hidden' : 'flex'} flex-1 flex-col relative border-r border-aether-border`}>
              <AetherEditor code={code} setCode={setCode} revealLine={revealLine} />
            </div>

            {/* Preview Pane */}
            <div className={`${viewMode === 'code' ? 'hidden' : 'flex'} flex-1 bg-white relative`}>
              <iframe key={iframeKey} src={previewUrl} onLoad={handleIframeLoad} className="w-full h-full border-none" title="Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" />
            </div>
          </div>
        </div>

        {/* D. RIGHT PANEL (AGENT MANAGER) */}
        <div className="w-80 bg-aether-sidebar border-l border-aether-border flex flex-col shrink-0">
          {/* Header */}
          <div className="h-9 flex items-center justify-between px-4 border-b border-aether-border bg-aether-sidebar">
            <span className="text-xs font-bold text-aether-text tracking-wide">AGENT MANAGER</span>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="bg-white p-3 rounded-lg border border-aether-border text-sm shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded bg-aether-accent flex items-center justify-center text-[10px] font-bold text-aether-textOnAccent">S</div>
                <span className="text-xs font-bold text-aether-text">Synapse</span>
              </div>
              <p className="text-aether-text leading-relaxed">Hello! I'm ready to help you build. Describe what you want to change in the code.</p>
            </div>

            {/* ✨ NEW: Context Indicator */}
            {selectedContext && (
              <div className="bg-aether-selection/30 p-2 rounded border border-aether-accent/20 text-xs mb-2 flex items-center gap-2">
                <Crosshair size={12} className="text-aether-accent" />
                <span className="font-medium">Editing:</span>
                <code className="bg-white/50 px-1 rounded text-aether-accent font-mono">
                  &lt;{selectedContext.tag}&gt; : {selectedContext.lineNumber}
                </code>
                <button onClick={() => setSelectedContext(null)} className="ml-auto hover:text-red-500"><X size={12} /></button>
              </div>
            )}

            {isThinking && (
              <div className="bg-white p-3 rounded-lg border border-aether-border text-sm shadow-sm opacity-80">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-aether-accent animate-pulse" />
                  <span className="text-xs font-medium text-aether-muted">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-aether-border bg-white/50">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${isThinking ? 'bg-white border-aether-accent shadow-md' : 'bg-white border-aether-border shadow-sm focus-within:border-aether-accent focus-within:shadow-md'}`}>
              {isThinking ? <Zap size={16} className="text-aether-accent animate-pulse" /> : <Sparkles size={16} className="text-aether-muted" />}
              <input
                disabled={isThinking}
                onKeyDown={handleAskAI}
                placeholder="Ask Synapse..."
                className="flex-1 bg-transparent outline-none text-sm font-medium text-aether-text placeholder:text-aether-muted"
              />
            </div>
            <div className="mt-2 text-[10px] text-center text-aether-muted">
              Press Enter to generate code
            </div>
          </div>
        </div>

      </div>

      {/* --- 3. GOLDEN BOTTOM BAR --- */}
      <div className="h-6 bg-aether-accent flex items-center justify-between px-3 text-xxs font-bold text-aether-textOnAccent select-none cursor-default z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 hover:bg-black/5 px-1 rounded"><GitGraph size={10} /> main*</div>
          <div className="flex items-center gap-1 hover:bg-black/5 px-1 rounded"><AlertCircle size={10} /> 0 Errors</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 hover:bg-black/5 px-1 rounded"><LayoutTemplate size={10} /> Split</div>
          <div className="hover:bg-black/5 px-1 rounded">Ln {revealLine || 1}, Col 1</div>
          <div className="hover:bg-black/5 px-1 rounded">UTF-8</div>
          <div className="flex items-center gap-1 hover:bg-black/5 px-1 rounded"><Check size={10} /> Prettier</div>
        </div>
      </div>

    </div>
  );
}
