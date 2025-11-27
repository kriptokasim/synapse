import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { useMonaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  Minus, Square, X,
  RefreshCw, Globe, Crosshair,
  Paperclip, ArrowUp,
  ChevronRight, MoreHorizontal,
  Terminal, CheckCircle2
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

// --- PERFOMANCE HOOKS ---

/**
 * High-Performance Resizable Hook (Void-Style)
 * Bypasses React State for 60FPS resizing by manipulating DOM directly.
 */
const useResizable = (
  initialWidth: number,
  minWidth: number,
  maxWidth: number,
  direction: 'left' | 'right' = 'right'
) => {
  // We keep state for initial render and persistence, but NOT for the drag loop
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for the drag operation
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    startXRef.current = e.clientX;
    startWidthRef.current = panelRef.current ? panelRef.current.offsetWidth : width;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Direct DOM manipulation - No React Re-renders here!
      if (!panelRef.current) return;

      const delta = e.clientX - startXRef.current;
      let newWidth = direction === 'right'
        ? startWidthRef.current + delta
        : startWidthRef.current - delta;

      // Hard limits
      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;

      panelRef.current.style.width = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Commit the final width to React state
      if (panelRef.current) {
        setWidth(panelRef.current.offsetWidth);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minWidth, maxWidth, direction]);

  return { width, startResize, isDragging, panelRef };
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
        automaticLayout: true, // Critical for flex resizing
        scrollBeyondLastLine: false,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
      }}
    />
  );
};

// --- MAIN APP ---
export default function App() {
  const [code, setCode] = useState('// Synapse Aether v3.5\n// Ready to code...');
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);

  // UI State
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('about:blank');
  const [iframeKey, setIframeKey] = useState(0);
  const [isInspectorActive, setIsInspectorActive] = useState(false);

  // Fast Resizable Panels (DOM-based)
  const explorer = useResizable(240, 150, 400, 'right');
  const agent = useResizable(400, 300, 600, 'left');
  const preview = useResizable(500, 200, 800, 'left');

  // Global dragging state for iframe protection
  const isAnyDragging = explorer.isDragging || agent.isDragging || preview.isDragging;

  // Agent State
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('synapse_chat_history');
    return saved ? JSON.parse(saved) : [{
      id: 'init', role: 'model', content: 'Synapse ready. Assign me a task.', type: 'message'
    }];
  });
  const [aiMode] = useState<AIModelMode>('standard');
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

  // @ts-ignore
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

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_CLICKED') {
        const { tag, id, selector, snippet } = event.data.payload;
        setIsInspectorActive(false);
        document.querySelector('iframe')?.contentWindow?.postMessage({ type: 'TOGGLE_INSPECTOR', active: false }, '*');

        const lines = code.split('\n');
        let foundLine = lines.findIndex(l => l.includes(`id="${id}"`) || l.includes(`<${tag}`)) + 1;
        if (foundLine === 0) foundLine = 1;

        setIsPreviewVisible(true);
        setSelectedContext({ tag, selector, lineNumber: foundLine, snippet });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [code]);

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
        const url = new URL(previewUrl);
        url.searchParams.set('t', Date.now().toString());
        setPreviewUrl(url.toString());
        setIframeKey(k => k + 1);
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: 'Changes applied.',
        type: 'message'
      }]);
      setSelectedContext(null);

    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: `Error: ${e.message}`, type: 'message' }]);
    } finally {
      setIsThinking(false);
    }
  };

  const Resizer = ({ onMouseDown, isVertical = false }: { onMouseDown: any, isVertical?: boolean }) => (
    <div
      className={`hover:bg-aether-accent/50 transition-colors z-50 flex items-center justify-center ${isVertical ? 'w-1 cursor-col-resize h-full' : 'h-1 cursor-row-resize w-full'
        }`}
      onMouseDown={onMouseDown}
    >
      <div className={`bg-aether-border ${isVertical ? 'w-[1px] h-full' : 'h-[1px] w-full'}`} />
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-aether-bg text-aether-text font-sans overflow-hidden selection:bg-aether-selection">

      {/* GLOBAL DRAG OVERLAY - Critical for Iframe smoothness */}
      {isAnyDragging && (
        <div className="fixed inset-0 z-[9999] cursor-col-resize bg-transparent" />
      )}

      {/* 1. TOP MENU BAR */}
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
          <button onClick={() => ipcRenderer?.send('window:minimize')} className="p-1.5 hover:bg-aether-border"><Minus size={12} /></button>
          <button onClick={() => ipcRenderer?.send('window:maximize')} className="p-1.5 hover:bg-aether-border"><Square size={10} /></button>
          <button onClick={() => ipcRenderer?.send('window:close')} className="p-1.5 hover:bg-red-100 hover:text-red-500"><X size={12} /></button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">

        {/* A. SIDEBAR */}
        <div
          ref={explorer.panelRef}
          style={{ width: explorer.width }}
          className="bg-aether-sidebar/50 flex flex-col shrink-0 relative"
        >
          <div className="h-9 flex items-center px-4 text-xs font-bold tracking-wider text-aether-muted uppercase justify-between border-b border-aether-border">
            <span>Explorer</span>
            <MoreHorizontal size={14} className="cursor-pointer" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {files.map((file, i) => (
              <div key={i} onClick={() => handleFileClick(file)} className={`flex items-center gap-2 px-3 py-1 cursor-pointer text-sm ${activeFile === file.path ? 'bg-white text-aether-text' : 'text-aether-muted'}`}>
                {file.isDirectory ? <ChevronRight size={12} /> : <div className="w-3" />}
                <span className="truncate">{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        <Resizer onMouseDown={explorer.startResize} isVertical={true} />

        {/* B. CENTRAL AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-aether-bg relative">
          <div className="h-9 flex items-center bg-aether-sidebar/30 border-b border-aether-border shrink-0">
            <div className="px-4 py-2 bg-aether-bg border-r border-aether-border text-xs font-medium text-aether-text flex items-center gap-2 border-t-2 border-t-aether-accent">
              <span>{activeFile ? activeFile.split(/[\\/]/).pop() : 'Welcome'}</span>
              <button
                onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                className={`ml-4 px-2 py-0.5 rounded-full border border-aether-border flex items-center gap-1 transition-colors ${isPreviewVisible ? 'bg-aether-accent text-white' : 'bg-aether-sidebar text-aether-text'}`}
              >
                <Globe size={10} />
                <span>{isPreviewVisible ? 'Hide' : 'Show'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 relative">
              <AetherEditor code={code} setCode={setCode} revealLine={selectedContext?.lineNumber || 0} />
            </div>

            {isPreviewVisible && (
              <>
                <Resizer onMouseDown={preview.startResize} isVertical={true} />
                <div
                  ref={preview.panelRef}
                  style={{ width: preview.width }}
                  className="bg-white relative flex flex-col shrink-0"
                >
                  <div className="h-8 flex items-center px-2 bg-gray-50 border-b border-gray-200 gap-2 shrink-0">
                    <button onClick={toggleInspector} className={`p-1 rounded ${isInspectorActive ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}><Crosshair size={14} /></button>
                    <input className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-0.5 outline-none" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} />
                    <button onClick={() => setIframeKey(k => k + 1)}><RefreshCw size={12} /></button>
                  </div>
                  {/* POINTER EVENTS NONE IS CRITICAL FOR DRAGGING OVER IFRAME */}
                  <iframe
                    key={iframeKey}
                    src={previewUrl}
                    onLoad={handleIframeLoad}
                    className={`flex-1 w-full border-none ${isAnyDragging ? 'pointer-events-none' : ''}`}
                    title="Preview"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <Resizer onMouseDown={agent.startResize} isVertical={true} />

        {/* C. AGENT MANAGER */}
        <div
          ref={agent.panelRef}
          style={{ width: agent.width }}
          className="flex flex-col bg-aether-bg shrink-0 shadow-xl z-20"
        >
          {/* Agent content same as before */}
          <div className="h-12 flex items-center justify-between px-4 border-b border-aether-border bg-aether-bg shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-aether-success" />
              <span className="text-sm font-bold text-aether-text">Current Task</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-aether-bg/50" ref={chatScrollRef}>
            {messages.map((msg) => (
              <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {msg.type === 'message' && (
                  <div className={`p-3 rounded-lg shadow-sm text-xs leading-relaxed ${msg.role === 'user' ? 'bg-white border border-aether-accent/50' : 'pl-4 border-l-2 border-aether-border ml-1'}`}>
                    {msg.image && <img src={msg.image} className="mb-2 max-h-20 rounded" />}
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            {isThinking && <div className="text-xs text-aether-accent px-2">Generating...</div>}
          </div>
          <div className="p-4 border-t border-aether-border bg-aether-bg shrink-0">
            <div className="relative bg-white border border-aether-border rounded-xl shadow-float">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAskAI())}
                placeholder="Ask anything..."
                className="w-full bg-transparent text-sm p-3 min-h-[50px] outline-none resize-none"
              />
              <div className="flex justify-between px-2 pb-2">
                <button onClick={() => fileInputRef.current?.click()}><Paperclip size={14} /></button>
                <button onClick={() => handleAskAI()}><ArrowUp size={14} /></button>
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          </div>
        </div>

      </div>

      {/* 3. STATUS BAR */}
      <div className="h-6 bg-aether-accent flex items-center justify-between px-3 text-xxs font-bold text-aether-textOnAccent select-none z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1"><Terminal size={10} /> Ready</div>
        </div>
      </div>
    </div>
  );
}
