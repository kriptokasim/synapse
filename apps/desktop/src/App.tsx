import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { useMonaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  Minus, Square, X,
  RefreshCw, Globe, Crosshair, Check,
  Zap, Paperclip, Brain, ArrowUp,
  ChevronRight, MoreHorizontal,
  Terminal, CheckCircle2, GitGraph
} from 'lucide-react';
import { SynapseFactory } from './ai/UniversalGateway';
import type { AIModelMode } from './ai/UniversalGateway';
import { INSPECTOR_SCRIPT } from './ai/inspector';

// Electron Interop
const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

loader.config({ monaco });

// --- TYPES ---
interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  type: 'message' | 'thought' | 'task_list';
  image?: string;
}

interface SelectedContext {
  tag: string;
  selector: string;
  lineNumber: number;
  snippet: string;
}

// --- VS CODE-STYLE LAYOUT ENGINE ---

/**
 * A robust SplitView implementation inspired by VS Code's 'src/vs/base/browser/ui/splitview/'
 * It handles the layout of the Explorer, Editor/Preview, and Agent panels.
 */


const Pane = ({
  width,
  minWidth = 0,
  maxWidth = Infinity,
  className = "",
  children,
  style
}: {
  width?: number | string, // If undefined, it acts as flex-1 (fluid)
  minWidth?: number,
  maxWidth?: number,
  className?: string,
  children: React.ReactNode,
  style?: React.CSSProperties
}) => {
  const isFluid = width === undefined;

  return (
    <div
      className={`relative h-full flex-shrink-0 ${className}`}
      style={{
        width: isFluid ? '100%' : width,
        flex: isFluid ? '1 1 0%' : 'none',
        minWidth,
        maxWidth,
        ...style
      }}
    >
      {children}
    </div>
  );
};

const Sash = ({
  onResizeStart,
  vertical = true
}: {
  onResizeStart: (e: React.MouseEvent) => void,
  vertical?: boolean
}) => {
  return (
    <div
      className={`z-50 flex items-center justify-center hover:bg-aether-accent/50 transition-colors cursor-col-resize select-none ${vertical ? 'w-1 h-full -mx-0.5' : 'h-1 w-full -my-0.5'}`}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(e);
      }}
    >
      <div className={`bg-aether-border ${vertical ? 'w-[1px] h-full' : 'h-[1px] w-full'}`} />
    </div>
  );
};

// --- COMPONENTS ---

const AetherEditor = ({ code, setCode, revealLine }: { code: string, setCode: any, revealLine: number | null }) => {
  const monacoInstance = useMonaco();
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    if (monacoInstance) {
      monacoInstance.editor.defineTheme('aether-paper', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '9CA3AF', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'D99A25', fontStyle: 'bold' },
          { token: 'string', foreground: '658E55' },
          { token: 'function', foreground: 'B47F1E' },
          { token: 'type', foreground: '3E3832', fontStyle: 'bold' },
          { token: 'number', foreground: 'D99A25' },
        ],
        colors: {
          'editor.background': '#FBF7EF',
          'editor.foreground': '#3E3832',
          'editor.lineHighlightBackground': '#F2EBE0',
          'editorLineNumber.foreground': '#C4BCAD',
          'editorCursor.foreground': '#D99A25',
          'editor.selectionBackground': '#FCEEB5',
          'editorIndentGuide.background': '#E6E0D1',
        }
      });
      monacoInstance.editor.setTheme('aether-paper');
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
          options: { isWholeLine: true, className: 'bg-aether-accentDim border-l-4 border-aether-accent' }
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
        fontSize: 13.5,
        lineHeight: 1.6,
        padding: { top: 24 },
        smoothScrolling: true,
        overviewRulerBorder: false,
        renderLineHighlight: 'all',
        hideCursorInOverviewRuler: true,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
      }}
    />
  );
};

// --- MAIN APP ---
export default function App() {
  // --- LAYOUT STATE (The "Void" behavior) ---
  const [leftPanelWidth, setLeftPanelWidth] = useState(240);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [showPreview, setShowPreview] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(500); // Width of preview WITHIN the center area

  // This ref tracks if we are currently dragging ANY sash.
  // Critical for fixing the iframe "swallowing mouse events" bug.
  const [isResizing, setIsResizing] = useState(false);
  const resizingState = useRef<{
    startX: number,
    startWidth: number,
    target: 'left' | 'right' | 'preview'
  } | null>(null);

  // --- DRAG HANDLERS ---
  const startResize = useCallback((e: React.MouseEvent, target: 'left' | 'right' | 'preview') => {
    setIsResizing(true);
    let startWidth = 0;
    if (target === 'left') startWidth = leftPanelWidth;
    if (target === 'right') startWidth = rightPanelWidth;
    if (target === 'preview') startWidth = previewWidth;

    resizingState.current = {
      startX: e.clientX,
      startWidth,
      target
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftPanelWidth, rightPanelWidth, previewWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingState.current) return;

      const { startX, startWidth, target } = resizingState.current;
      const delta = e.clientX - startX;

      if (target === 'left') {
        // Dragging Left Panel Sash (Right side of panel) -> Delta adds to width
        setLeftPanelWidth(Math.max(150, Math.min(600, startWidth + delta)));
      } else if (target === 'right') {
        // Dragging Right Panel Sash (Left side of panel) -> Delta subtracts from width
        setRightPanelWidth(Math.max(300, Math.min(800, startWidth - delta)));
      } else if (target === 'preview') {
        // Dragging Preview Sash (Left side of preview) -> Delta subtracts from width
        setPreviewWidth(Math.max(200, Math.min(1000, startWidth - delta)));
      }
    };

    const handleMouseUp = () => {
      if (resizingState.current) {
        setIsResizing(false);
        resizingState.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);


  // --- APP LOGIC (Previously existing) ---
  const [code, setCode] = useState('// Synapse Aether v3.5\n// Ready to code...');
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState('about:blank');
  const [iframeKey, setIframeKey] = useState(0);
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('synapse_chat_history');
    return saved ? JSON.parse(saved) : [{ id: 'init', role: 'model', content: 'Synapse ready.', type: 'message' }];
  });
  const [aiMode, setAiMode] = useState<AIModelMode>('standard');
  const [isThinking, setIsThinking] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<SelectedContext | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('synapse_chat_history', JSON.stringify(messages));
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages]);

  const handleOpenFolder = async () => {
    try {
      // @ts-ignore
      const path = await window.synapse.openDirectory();
      if (path) loadFiles(path);
    } catch (e) { }
  };

  const loadFiles = async (path: string) => {
    // @ts-ignore
    const fileList = await window.synapse.readDirectory(path);
    setFiles(fileList);
  };

  const handleFileClick = async (file: any) => {
    if (file.isDirectory) return;
    // @ts-ignore
    const content = await window.synapse.readFile(file.path);
    setActiveFile(file.path);
    setCode(content);
  };

  // Inspector Logic
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_CLICKED') {
        const { tag, selector, snippet } = event.data.payload;
        setIsInspectorActive(false);
        document.querySelector('iframe')?.contentWindow?.postMessage({ type: 'TOGGLE_INSPECTOR', active: false }, '*');
        setShowPreview(true);
        setSelectedContext({ tag, selector, lineNumber: 1, snippet });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const toggleInspector = () => {
    setIsInspectorActive(!isInspectorActive);
    document.querySelector('iframe')?.contentWindow?.postMessage({ type: 'TOGGLE_INSPECTOR', active: !isInspectorActive }, '*');
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
    if ((!chatInput.trim() && !attachedImage) || isThinking) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      image: attachedImage || undefined,
      type: 'message'
    };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setAttachedImage(null);
    setIsThinking(true);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      const ai = SynapseFactory.create('gemini', apiKey);

      let prompt = `FILENAME: ${activeFile || 'untitled'}\nREQUEST: "${userMsg.content}"`;
      if (selectedContext) {
        prompt += `\nCONTEXT: Element ${selectedContext.selector}\nCODE: ${selectedContext.snippet}`;
      }

      const newCode = await ai.generateCode(prompt, code, { mode: aiMode, image: userMsg.image });
      const cleanCode = newCode.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
      setCode(cleanCode);

      if (activeFile) {
        // @ts-ignore
        await window.synapse.writeFile(activeFile, cleanCode);
        setIframeKey(k => k + 1);
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: 'Done.', type: 'message' }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: 'Error.', type: 'message' }]);
    } finally {
      setIsThinking(false);
    }
  };

  // --- COMPONENT RENDER ---
  return (
    <div className="flex flex-col h-screen w-screen bg-aether-bg text-aether-text font-sans overflow-hidden selection:bg-aether-selection">

      {/* CRITICAL: Global Drag Overlay 
        This transparent div covers the ENTIRE screen (including iframes) when dragging.
        It captures all mouse events, preventing the iframe from 'stealing' them.
      */}
      {isResizing && (
        <div className="fixed inset-0 z-[9999] cursor-col-resize bg-transparent" />
      )}

      {/* TOP MENU BAR */}
      <div className="h-8 flex items-center justify-between px-3 bg-aether-bg border-b border-aether-border drag-region z-50 shrink-0">
        <div className="flex items-center gap-4 no-drag">
          <div className="flex gap-3 text-xs font-medium text-aether-text/80">
            <span className="hover:text-aether-accent cursor-pointer">File</span>
            <span className="hover:text-aether-accent cursor-pointer">Edit</span>
            <span className="hover:text-aether-accent cursor-pointer">View</span>
          </div>
        </div>
        <div className="flex-1 flex justify-center no-drag absolute left-1/2 -translate-x-1/2">
          <span className="text-xs font-bold tracking-wide text-aether-text/60">Synapse — Antigravity</span>
        </div>
        <div className="flex items-center gap-2 no-drag">
          <button onClick={() => ipcRenderer?.send('window:minimize')} className="p-1.5 hover:bg-aether-border rounded"><Minus size={12} /></button>
          <button onClick={() => ipcRenderer?.send('window:maximize')} className="p-1.5 hover:bg-aether-border rounded"><Square size={10} /></button>
          <button onClick={() => ipcRenderer?.send('window:close')} className="p-1.5 hover:bg-red-100 hover:text-red-500 rounded"><X size={12} /></button>
        </div>
      </div>

      {/* MAIN WORKSPACE (VS Code SplitView) */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* 1. EXPLORER PANEL */}
        <Pane width={leftPanelWidth} minWidth={150} maxWidth={400} className="bg-aether-sidebar/50 flex flex-col">
          <div className="h-9 flex items-center px-4 text-xs font-bold tracking-wider text-aether-muted uppercase justify-between border-b border-aether-border">
            <span>Explorer</span>
            <MoreHorizontal size={14} className="cursor-pointer hover:text-aether-text" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {files.length === 0 && (
              <div className="p-6 text-center text-xs text-aether-muted">
                <div className="mb-2">No folder open</div>
                <button onClick={handleOpenFolder} className="px-3 py-1 bg-aether-accent text-white rounded-md shadow-sm hover:bg-aether-accentHover">Open</button>
              </div>
            )}
            {files.map((file, i) => (
              <div key={i} onClick={() => handleFileClick(file)} className={`group flex items-center gap-2 px-3 py-1 cursor-pointer text-sm transition-all border-l-2 ${activeFile === file.path ? 'border-aether-accent bg-white text-aether-text' : 'border-transparent text-aether-muted hover:text-aether-text hover:bg-white/50'}`}>
                {file.isDirectory ? <ChevronRight size={12} /> : <div className="w-3" />}
                <span className="truncate font-medium">{file.name}</span>
              </div>
            ))}
          </div>
        </Pane>

        {/* SASH 1: Explorer <-> Center */}
        <Sash onResizeStart={(e) => startResize(e, 'left')} />

        {/* 2. CENTER AREA (Editor + Preview) */}
        <Pane className="flex flex-col min-w-0 bg-aether-bg">
          {/* Tabs */}
          <div className="h-9 flex items-center bg-aether-sidebar/30 border-b border-aether-border shrink-0">
            <div className="px-4 py-2 bg-aether-bg border-r border-aether-border text-xs font-medium text-aether-text flex items-center gap-2 border-t-2 border-t-aether-accent">
              <span>{activeFile ? activeFile.split(/[\\/]/).pop() : 'Welcome'}</span>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`ml-4 px-2 py-0.5 rounded-full border border-aether-border flex items-center gap-1 transition-colors ${showPreview ? 'bg-aether-accent text-white' : 'bg-aether-sidebar text-aether-text'}`}
              >
                <Globe size={10} />
                <span>{showPreview ? 'Hide' : 'Show'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Editor (Flex 1 to take remaining space) */}
            <div className="flex-1 relative h-full">
              <AetherEditor code={code} setCode={setCode} revealLine={selectedContext?.lineNumber || 0} />
            </div>

            {/* Preview (Conditional + Resizable) */}
            {showPreview && (
              <>
                <Sash onResizeStart={(e) => startResize(e, 'preview')} />
                <Pane width={previewWidth} minWidth={200} maxWidth={800} className="bg-white flex flex-col border-l border-aether-border">
                  <div className="h-8 flex items-center px-2 bg-gray-50 border-b border-gray-200 gap-2 shrink-0">
                    <button onClick={toggleInspector} className={`p-1 rounded ${isInspectorActive ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`} title="Inspect Element">
                      <Crosshair size={14} />
                    </button>
                    <input
                      className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600 outline-none focus:border-blue-400"
                      value={previewUrl}
                      onChange={(e) => setPreviewUrl(e.target.value)}
                    />
                    <button onClick={() => setIframeKey(k => k + 1)} className="p-1 text-gray-500 hover:text-gray-900"><RefreshCw size={12} /></button>
                  </div>
                  {/* IFRAME with pointer-events protection */}
                  <iframe
                    key={iframeKey}
                    src={previewUrl}
                    onLoad={handleIframeLoad}
                    className={`flex-1 w-full border-none ${isResizing ? 'pointer-events-none' : ''}`}
                    title="Preview"
                  />
                </Pane>
              </>
            )}
          </div>
        </Pane>

        {/* SASH 2: Center <-> Agent */}
        <Sash onResizeStart={(e) => startResize(e, 'right')} />

        {/* 3. AGENT PANEL */}
        <Pane width={rightPanelWidth} minWidth={300} maxWidth={600} className="flex flex-col bg-aether-bg shadow-xl z-20 border-l border-aether-border">
          <div className="h-12 flex items-center justify-between px-4 border-b border-aether-border bg-aether-bg shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-aether-success" />
              <span className="text-sm font-bold text-aether-text">Current Task</span>
            </div>
            <button className="p-1.5 hover:bg-aether-sidebar rounded text-aether-muted"><MoreHorizontal size={14} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-aether-bg/50" ref={chatScrollRef}>
            {messages.map((msg) => (
              <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {msg.type === 'message' && (
                  <div className={`p-3 rounded-lg shadow-sm text-xs leading-relaxed ${msg.role === 'user' ? 'bg-white border border-aether-accent/50' : 'pl-4 border-l-2 border-aether-border ml-1'}`}>
                    {msg.image && <img src={msg.image} className="mb-2 max-h-20 rounded border border-gray-200" />}
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-aether-accent px-2 animate-pulse">
                <Zap size={12} />
                <span>Generating...</span>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-aether-border bg-aether-bg shrink-0">
            <div className="relative bg-white border border-aether-border rounded-xl shadow-float focus-within:ring-2 focus-within:ring-aether-accent/50 transition-all">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAskAI())}
                placeholder="Ask anything (Ctrl+L)"
                className="w-full bg-transparent text-sm p-3 min-h-[50px] max-h-[200px] outline-none resize-none placeholder:text-aether-muted/70 text-aether-text"
              />
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex gap-1">
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded hover:bg-aether-sidebar text-aether-muted hover:text-aether-text transition-colors">
                    <Paperclip size={14} />
                  </button>
                  <button
                    onClick={() => setAiMode(aiMode === 'thinking' ? 'standard' : 'thinking')}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${aiMode === 'thinking' ? 'bg-aether-accent text-white' : 'text-aether-muted hover:bg-aether-sidebar'}`}
                  >
                    {aiMode === 'thinking' ? <Brain size={10} /> : <Zap size={10} />}
                    <span>{aiMode}</span>
                  </button>
                </div>
                <button
                  onClick={() => handleAskAI()}
                  disabled={(!chatInput.trim() && !attachedImage) || isThinking}
                  className="p-1.5 bg-aether-text text-white rounded shadow-sm hover:bg-black disabled:opacity-50 transition-all"
                >
                  <ArrowUp size={14} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>
        </Pane>

      </div>

      {/* 3. STATUS BAR */}
      <div className="h-6 bg-aether-accent flex items-center justify-between px-3 text-xxs font-bold text-aether-textOnAccent select-none z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1"><Terminal size={10} /> Ready</div>
          <div className="flex items-center gap-1 opacity-80"><GitGraph size={10} /> main*</div>
        </div>
        <div className="flex items-center gap-3 opacity-80">
          <span>Ln 12, Col 4</span>
          <span>UTF-8</span>
          <Check size={10} />
        </div>
      </div>

    </div>
  );
}
