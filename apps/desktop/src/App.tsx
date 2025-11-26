import React, { useState, useEffect, useRef } from 'react';
import Editor, { useMonaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  Files, Search, GitGraph, Settings, // Sidebar Icons
  Minus, Square, X,                  // Window Controls
  RefreshCw, Globe, Crosshair,       // URL Bar
  Check, AlertCircle,
  Zap, Paperclip, Brain, Rocket, ArrowUp // Status Bar & AI Icons
} from 'lucide-react';
import { SynapseFactory } from './ai/UniversalGateway';
import type { AIModelMode } from './ai/UniversalGateway';
import { INSPECTOR_SCRIPT } from './ai/inspector';

const { ipcRenderer } = window.require('electron');

loader.config({ monaco });

// --- COMPONENTS ---

const WindowControls = () => (
  <div className="flex items-center h-full px-1 no-drag">
    <button onClick={() => ipcRenderer.send('window:minimize')} className="p-2 hover:bg-black/10 rounded-none transition-colors text-aether-textOnAccent"><Minus size={14} /></button>
    <button onClick={() => ipcRenderer.send('window:maximize')} className="p-2 hover:bg-black/10 rounded-none transition-colors text-aether-textOnAccent"><Square size={12} /></button>
    <button onClick={() => ipcRenderer.send('window:close')} className="p-2 hover:bg-red-500 hover:text-white rounded-none transition-colors text-aether-textOnAccent"><X size={14} /></button>
  </div>
);

const AetherEditor = ({ code, setCode, revealLine }: { code: string, setCode: any, revealLine: number | null }) => {
  const monacoInstance = useMonaco();
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    if (monacoInstance) {
      monacoInstance.editor.defineTheme('antigravity', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'D99A25', fontStyle: 'bold' },
          { token: 'string', foreground: '5F8B59' },
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

  useEffect(() => {
    if (editorRef.current && revealLine && monacoInstance) {
      const editor = editorRef.current;
      editor.revealLineInCenter(revealLine);
      editor.setPosition({ column: 1, lineNumber: revealLine });
      editor.focus();
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: new monacoInstance.Range(revealLine, 1, revealLine, 1),
          options: { isWholeLine: true, className: 'my-line-highlight' }
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

// --- MAIN APP ---
export default function AetherApp() {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [code, setCode] = useState('// Synapse AntiGravity v2\n// Ready for multimodal input...');
  const [isThinking, setIsThinking] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('split');
  const [previewUrl, setPreviewUrl] = useState('about:blank');
  const [iframeKey, setIframeKey] = useState(0);
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [revealLine, setRevealLine] = useState<number | null>(null);
  const [selectedContext, setSelectedContext] = useState<any>(null);

  // ✨ NEW: AI State
  const [aiMode, setAiMode] = useState<AIModelMode>('standard');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Locator & Inspector Logic
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_CLICKED') {
        const { tag, id, className, text, snippet } = event.data.payload;
        setIsInspectorActive(false);
        document.querySelector('iframe')?.contentWindow?.postMessage({ type: 'TOGGLE_INSPECTOR', active: false }, '*');

        // Simple locator fallback
        const lines = code.split('\n');
        let foundLine = null;
        for (let i = 0; i < lines.length; i++) {
          if (id && lines[i].includes(`id="${id}"`)) { foundLine = i + 1; break; }
          if (text && text.length > 5 && lines[i].includes(text)) { foundLine = i + 1; break; }
        }

        if (foundLine) {
          if (viewMode === 'preview') setViewMode('split');
          setRevealLine(foundLine);
          setSelectedContext({ tag, text, id, className, lineNumber: foundLine, snippet });
        }
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAskAI = async () => {
    if (!chatInput.trim() && !attachedImage) return;
    if (isThinking) return;

    setIsThinking(true);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) { alert("API Key Missing"); setIsThinking(false); return; }

      const ai = SynapseFactory.create('gemini', apiKey);

      let prompt = `
            I need to modify the current file based on a request.
            FILENAME: ${activeFile || 'untitled'}
            USER REQUEST: "${chatInput}"
        `;

      if (selectedContext) {
        prompt += `\nFOCUS ON ELEMENT: <${selectedContext.tag}> at line ${selectedContext.lineNumber}`;
      }

      console.log("Sending to AI...", aiMode);

      // ✨ NEW: Pass image and mode to AI
      let newCode = await ai.generateCode(prompt, code, {
        mode: aiMode,
        image: attachedImage || undefined
      });

      newCode = newCode.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');

      setCode(newCode);
      if (activeFile) {
        await window.synapse.writeFile(activeFile, newCode);
        const currentUrl = new URL(previewUrl);
        currentUrl.searchParams.set('t', Date.now().toString());
        setPreviewUrl(currentUrl.toString());
        setIframeKey(k => k + 1);
      }

      setChatInput('');
      setAttachedImage(null);
      setSelectedContext(null);

    } catch (e: any) {
      console.error("AI Error:", e);
      alert(e.message);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-aether-bg font-sans overflow-hidden">

      {/* --- 1. TOP BAR --- */}
      <div className="h-9 bg-aether-accent flex items-center justify-between drag-region shrink-0 shadow-sm relative z-50">
        <div className="flex items-center px-3 gap-4 text-xs font-semibold text-aether-textOnAccent">
          <div className="font-black tracking-tight mr-2 cursor-default select-none">AETHER v2</div>
          <div className="hover:bg-black/5 px-2 py-1 rounded cursor-pointer no-drag hidden md:block">File</div>
          <div className="hover:bg-black/5 px-2 py-1 rounded cursor-pointer no-drag hidden md:block">View</div>
        </div>

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
        <WindowControls />
      </div>

      {/* --- 2. MAIN WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden">

        {/* SIDEBARS */}
        <div className="w-12 bg-aether-accent flex flex-col items-center py-4 gap-4 shrink-0 z-20">
          <button onClick={handleOpenFolder} className="p-2 rounded hover:bg-black/10 text-aether-textOnAccent"><Files size={18} /></button>
          <button className="p-2 rounded hover:bg-black/10 text-aether-textOnAccent"><Search size={18} /></button>
          <div className="flex-1"></div>
          <button className="p-2 rounded hover:bg-black/10 text-aether-textOnAccent"><Settings size={18} /></button>
        </div>

        <div className="w-60 bg-aether-sidebar border-r border-aether-border flex flex-col shrink-0">
          <div className="h-8 flex items-center px-4 text-[10px] font-bold tracking-wider text-aether-muted uppercase">
            {projectPath ? projectPath.split(/[\\/]/).pop() : 'NO FOLDER'}
          </div>
          <div className="flex-1 overflow-y-auto px-2 text-sm">
            {files.map((file, i) => (
              <div key={i} onClick={() => handleFileClick(file)} className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md transition-colors ${activeFile === file.path ? 'bg-white shadow-sm text-aether-text font-medium' : 'text-aether-text hover:bg-black/5'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${file.isDirectory ? 'bg-aether-accent' : 'bg-aether-border'}`}></span>
                <span className="truncate text-xs">{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* EDITOR & PREVIEW */}
        <div className="flex-1 flex flex-col min-w-0 bg-aether-bg relative">
          <div className="flex-1 flex overflow-hidden">
            <div className={`${viewMode === 'preview' ? 'hidden' : 'flex'} flex-1 flex-col relative border-r border-aether-border`}>
              <AetherEditor code={code} setCode={setCode} revealLine={revealLine} />
            </div>
            <div className={`${viewMode === 'code' ? 'hidden' : 'flex'} flex-1 bg-white relative`}>
              <iframe key={iframeKey} src={previewUrl} onLoad={handleIframeLoad} className="w-full h-full border-none" title="Preview" />
            </div>
          </div>
        </div>

        {/* --- D. RIGHT PANEL (UPDATED AI) --- */}
        <div className="w-80 bg-aether-sidebar border-l border-aether-border flex flex-col shrink-0">

          {/* 1. Model Selector */}
          <div className="p-4 border-b border-aether-border">
            <div className="flex bg-aether-bg border border-aether-border rounded-lg p-1">
              {(['fast', 'standard', 'thinking'] as AIModelMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setAiMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${aiMode === m
                    ? 'bg-aether-accent text-aether-textOnAccent shadow-sm'
                    : 'text-aether-muted hover:bg-black/5'
                    }`}
                  title={m}
                >
                  {m === 'fast' && <Rocket size={12} />}
                  {m === 'standard' && <Zap size={12} />}
                  {m === 'thinking' && <Brain size={12} />}
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Chat History */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="bg-white p-3 rounded-lg border border-aether-border text-sm shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded bg-aether-accent flex items-center justify-center text-[10px] font-bold text-aether-textOnAccent">S</div>
                <span className="text-xs font-bold text-aether-text">Synapse</span>
              </div>
              <p className="text-aether-text leading-relaxed">
                Ready. Select a model above. You can attach screenshots for UI tasks.
              </p>
            </div>

            {selectedContext && (
              <div className="bg-aether-selection/30 p-2 rounded border border-aether-accent/20 text-xs flex items-center gap-2">
                <Crosshair size={12} className="text-aether-accent" />
                <span className="font-medium">Focus:</span>
                <code className="bg-white/50 px-1 rounded text-aether-accent font-mono">&lt;{selectedContext.tag}&gt;</code>
                <button onClick={() => setSelectedContext(null)} className="ml-auto hover:text-red-500"><X size={12} /></button>
              </div>
            )}
          </div>

          {/* 3. Advanced Input Area */}
          <div className="p-4 border-t border-aether-border bg-white/50">

            {/* Attachment Preview */}
            {attachedImage && (
              <div className="flex items-center gap-2 mb-2 bg-white border border-aether-border px-2 py-1 rounded-md w-fit shadow-sm">
                <div className="w-6 h-6 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  <img src={attachedImage} className="w-full h-full object-cover" alt="preview" />
                </div>
                <span className="text-[10px] text-aether-text truncate max-w-[100px]">Image attached</span>
                <button onClick={() => setAttachedImage(null)} className="hover:text-red-500"><X size={12} /></button>
              </div>
            )}

            <div className={`flex items-end gap-2 px-3 py-2 rounded-lg border transition-all bg-white ${isThinking ? 'border-aether-accent shadow-md' : 'border-aether-border shadow-sm focus-within:border-aether-accent focus-within:shadow-md'}`}>

              {/* Attach Button */}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mb-1 text-aether-muted hover:text-aether-accent transition-colors"
                title="Attach Image"
              >
                <Paperclip size={16} />
              </button>

              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isThinking}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAskAI())}
                placeholder={isThinking ? (aiMode === 'thinking' ? "Thinking deeply..." : "Generating...") : "Ask Synapse..."}
                className="flex-1 bg-transparent outline-none text-sm font-medium text-aether-text placeholder:text-aether-muted resize-none py-1 max-h-32 min-h-[24px]"
                rows={1}
                style={{ fieldSizing: 'content' } as any}
              />

              {/* Send Button */}
              <button
                onClick={handleAskAI}
                disabled={isThinking || (!chatInput.trim() && !attachedImage)}
                className={`mb-1 p-1 rounded transition-all ${isThinking
                  ? 'text-aether-muted'
                  : (!chatInput.trim() && !attachedImage)
                    ? 'text-aether-border cursor-not-allowed'
                    : 'text-aether-accent hover:bg-aether-accent/10'
                  }`}
              >
                {isThinking ? <Zap size={16} className="animate-pulse" /> : <ArrowUp size={16} strokeWidth={3} />}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* --- 3. BOTTOM BAR --- */}
      <div className="h-6 bg-aether-accent flex items-center justify-between px-3 text-xxs font-bold text-aether-textOnAccent select-none cursor-default z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 hover:bg-black/5 px-1 rounded"><GitGraph size={10} /> main*</div>
          <div className="flex items-center gap-1 hover:bg-black/5 px-1 rounded"><AlertCircle size={10} /> 0 Errors</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hover:bg-black/5 px-1 rounded uppercase">{aiMode}</div>
          <div className="hover:bg-black/5 px-1 rounded">Ln {revealLine || 1}, Col 1</div>
          <div className="flex items-center gap-1 hover:bg-black/5 px-1 rounded"><Check size={10} /> Prettier</div>
        </div>
      </div>

    </div>
  );
}
