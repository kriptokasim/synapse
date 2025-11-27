import React, { useState, useEffect, useRef } from 'react';
import Editor, { useMonaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  ChevronRight, MoreHorizontal,
  Terminal, CheckCircle2, Circle,
  Minus, Square, X, Globe, Crosshair, RefreshCw,
  Brain, Zap, Paperclip, ArrowUp, GitGraph, Check
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

// --- COMPONENTS ---

// 1. Aether Editor
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
          { token: 'keyword', foreground: 'D99A25', fontStyle: 'bold' }, // Amber
          { token: 'string', foreground: '658E55' }, // Sage
          { token: 'function', foreground: 'B47F1E' },
          { token: 'type', foreground: '3E3832', fontStyle: 'bold' },
          { token: 'number', foreground: 'D99A25' },
        ],
        colors: {
          'editor.background': '#FBF7EF', // Aether BG
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
  // State
  const [code, setCode] = useState('// Synapse Aether v3.2\n// Ready to code...');
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);

  // UI State
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('about:blank');
  const [iframeKey, setIframeKey] = useState(0);
  const [isInspectorActive, setIsInspectorActive] = useState(false);

  // Agent State
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('synapse_chat_history');
    return saved ? JSON.parse(saved) : [{
      id: 'init',
      role: 'model',
      content: 'Synapse ready. Assign me a task.',
      type: 'message'
    }];
  });
  const [aiMode, setAiMode] = useState<AIModelMode>('standard');
  const [isThinking, setIsThinking] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<SelectedContext | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('synapse_chat_history', JSON.stringify(messages));
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages]);

  // --- HANDLERS ---
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

  // Inspector
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

      const botMsgId = (Date.now() + 1).toString();

      if (aiMode === 'thinking') {
        setMessages(prev => [...prev, {
          id: botMsgId + '_thought',
          role: 'model',
          content: 'Analyzing structure and planning changes...',
          type: 'thought'
        }]);
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

      const doneMsg: ChatMessage = {
        id: botMsgId,
        role: 'model',
        content: 'Changes applied.',
        type: 'message'
      };

      setMessages(prev => [...prev, doneMsg]);
      setSelectedContext(null);

    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: `Error: ${e.message}`, type: 'message' }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-aether-bg text-aether-text font-sans overflow-hidden selection:bg-aether-selection">

      {/* 1. TOP MENU BAR */}
      <div className="h-8 flex items-center justify-between px-3 bg-aether-bg border-b border-aether-border drag-region z-50">
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
          <button onClick={() => ipcRenderer?.send('window:minimize')} className="p-1.5 hover:bg-aether-border rounded text-aether-text"><Minus size={12} /></button>
          <button onClick={() => ipcRenderer?.send('window:maximize')} className="p-1.5 hover:bg-aether-border rounded text-aether-text"><Square size={10} /></button>
          <button onClick={() => ipcRenderer?.send('window:close')} className="p-1.5 hover:bg-red-100 hover:text-red-500 rounded text-aether-text"><X size={12} /></button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">

        {/* A. SIDEBAR (Explorer) */}
        <div className="w-60 bg-aether-sidebar/50 border-r border-aether-border flex flex-col shrink-0">
          <div className="h-9 flex items-center px-4 text-xs font-bold tracking-wider text-aether-muted uppercase justify-between">
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
        </div>

        {/* B. CENTRAL AREA (Editor + Preview) */}
        <div className="flex-1 flex flex-col min-w-0 bg-aether-bg relative">
          {/* Tab Bar */}
          <div className="h-9 flex items-center bg-aether-sidebar/30 border-b border-aether-border">
            <div className="px-4 py-2 bg-aether-bg border-r border-aether-border text-xs font-medium text-aether-text flex items-center gap-2 border-t-2 border-t-aether-accent">
              <span>{activeFile ? activeFile.split(/[\\/]/).pop() : 'Welcome'}</span>
              <button
                onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                className={`ml-4 px-2 py-0.5 rounded-full border border-aether-border flex items-center gap-1 transition-colors ${isPreviewVisible ? 'bg-aether-accent text-white' : 'bg-aether-sidebar text-aether-text'}`}
              >
                <Globe size={10} />
                <span>{isPreviewVisible ? 'Hide Preview' : 'Show Preview'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Code Editor - Takes all available space when preview is closed */}
            <div className={`flex-1 relative border-r border-aether-border transition-all duration-300`}>
              <AetherEditor code={code} setCode={setCode} revealLine={0} />
            </div>

            {/* Live Preview - Fixed Width/Zero Width Toggle */}
            <div
              className={`bg-white relative flex flex-col border-l border-aether-border transition-all duration-300 ease-in-out overflow-hidden ${isPreviewVisible ? 'flex-1 min-w-[300px]' : 'w-0 flex-none border-l-0'
                }`}
            >
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
              <iframe key={iframeKey} src={previewUrl} onLoad={handleIframeLoad} className="flex-1 w-full border-none" title="Preview" />
            </div>
          </div>
        </div>

        {/* C. AGENT MANAGER */}
        <div className="w-[400px] flex flex-col bg-aether-bg border-l border-aether-border shrink-0 shadow-xl z-20">
          <div className="h-12 flex items-center justify-between px-4 border-b border-aether-border bg-aether-bg">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-aether-success" />
              <span className="text-sm font-bold text-aether-text">Current Task</span>
            </div>
            <button className="p-1.5 hover:bg-aether-sidebar rounded text-aether-muted"><MoreHorizontal size={14} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-aether-bg/50" ref={chatScrollRef}>
            {/* Task Card */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-aether-accent shadow-paper relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-aether-accent"></div>
              <div className="mt-0.5 text-aether-accent animate-pulse"><Circle size={14} /></div>
              <div className="flex-1">
                <div className="text-xs font-bold text-aether-text mb-1">User Request</div>
                <div className="text-xs text-aether-text leading-relaxed">
                  "{messages.filter(m => m.role === 'user').slice(-1)[0]?.content || "Waiting for instructions..."}"
                </div>
              </div>
            </div>

            {/* Messages */}
            {messages.map((msg) => (
              <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {msg.type === 'thought' && (
                  <div className="flex items-center gap-2 text-xs text-aether-muted mb-2 px-2">
                    <Brain size={12} />
                    <span className="italic">{msg.content}</span>
                  </div>
                )}
                {msg.type === 'message' && (
                  <div className={`p-3 rounded-lg shadow-sm text-xs leading-relaxed ${msg.role === 'user' ? 'bg-white border border-aether-accent/50' : 'pl-4 border-l-2 border-aether-border ml-1'
                    }`}>
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

          {/* Input Area */}
          <div className="p-4 border-t border-aether-border bg-aether-bg">
            {selectedContext && (
              <div className="flex items-center gap-2 mb-2 text-xs bg-aether-selection px-2 py-1 rounded border border-aether-accent/20 w-fit">
                <Crosshair size={12} className="text-aether-accent" />
                <span className="font-mono text-aether-text">{selectedContext.selector}</span>
                <button onClick={() => setSelectedContext(null)} className="hover:text-red-500"><X size={12} /></button>
              </div>
            )}

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
        </div>

      </div>

      {/* 3. STATUS BAR */}
      <div className="h-6 bg-aether-accent flex items-center justify-between px-3 text-xxs font-bold text-aether-textOnAccent select-none z-50">
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
