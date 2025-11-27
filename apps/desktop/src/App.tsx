import React, { useState, useEffect, useRef } from 'react';
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
import { SplitView } from './components/layout/SplitView';
import { Pane } from './components/layout/Pane';

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
  const [showPreview, setShowPreview] = useState(true);

  // --- APP LOGIC (Previously existing) ---
  const [code, setCode] = useState('// Synapse Aether v4.0\n// Ready to code...');
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
        console.log('[App] Element clicked:', { tag, selector });

        setIsInspectorActive(false);

        // Use specific selector
        const iframe = document.querySelector('#preview iframe') as HTMLIFrameElement;
        iframe?.contentWindow?.postMessage({ type: 'TOGGLE_INSPECTOR', active: false }, '*');

        setShowPreview(true);

        // Find line number
        let lineNumber = 1;
        if (code && snippet) {
          // Try to find the exact snippet
          const lines = code.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(tag) && (lines[i].includes(`id="${selector.split('#')[1]}"`) || lines[i].includes(`class="${selector.split('.')[1]}"`))) {
              lineNumber = i + 1;
              break;
            }
          }
          // Fallback: simple tag search if specific ID/Class not found
          if (lineNumber === 1) {
            const index = code.indexOf(`<${tag}`);
            if (index !== -1) {
              lineNumber = code.substring(0, index).split('\n').length;
            }
          }
        }

        setSelectedContext({ tag, selector, lineNumber, snippet });

        // Populate chat input
        setChatInput(`Look at this ${tag} (${selector}):\n\`\`\`html\n${snippet}\n\`\`\`\nHow can I improve it?`);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [code]); // Add code dependency to search it

  const toggleInspector = () => {
    console.log('[App] Toggling inspector. Current state:', isInspectorActive);
    setIsInspectorActive(!isInspectorActive);

    const iframe = document.querySelector('#preview iframe') as HTMLIFrameElement;
    if (iframe) {
      console.log('[App] Found iframe, sending message. Pointer events:', iframe.style.pointerEvents);
      iframe.contentWindow?.postMessage({ type: 'TOGGLE_INSPECTOR', active: !isInspectorActive }, '*');
    } else {
      console.error('[App] Iframe not found!');
    }
  };

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    console.log('[App] Iframe loaded');
    try {
      const doc = e.currentTarget.contentDocument;
      if (doc) {
        console.log('[App] Injecting inspector script');
        const script = doc.createElement('script');
        script.text = INSPECTOR_SCRIPT;
        doc.body.appendChild(script);
      }
    } catch (e) {
      console.error('[App] Failed to inject inspector script', e);
    }
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

      // Robust code extraction:
      // 1. Try to find a code block
      const codeBlockMatch = newCode.match(/```(?:tsx|jsx|typescript|javascript|html)?\n([\s\S]*?)```/);
      let cleanCode = codeBlockMatch ? codeBlockMatch[1] : newCode;

      // 2. Fallback cleanup if no block found (legacy behavior)
      if (!codeBlockMatch) {
        cleanCode = cleanCode.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
      }

      setCode(cleanCode);

      if (activeFile) {
        // @ts-ignore
        await window.synapse.writeFile(activeFile, cleanCode);
        setIframeKey(k => k + 1);
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: 'Done. Code updated.', type: 'message' }]);
    } catch (e: any) {
      console.error('AI Error:', e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: `Error: ${e.message || 'Unknown error'}`, type: 'message' }]);
    } finally {
      setIsThinking(false);
    }
  };

  // --- COMPONENT RENDER ---
  return (
    <div className="flex flex-col h-screen w-screen bg-aether-bg text-aether-text font-sans overflow-hidden selection:bg-aether-selection">

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

      {/* MAIN WORKSPACE (Void-style SplitView) */}
      <div className="flex-1 flex overflow-hidden relative">
        <SplitView storageKey="main-layout" className="flex-1">

          {/* 1. EXPLORER PANEL */}
          <Pane id="explorer" defaultSize={240} minSize={150} maxSize={400} className="bg-aether-sidebar/50 flex flex-col">
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

          {/* 2. CENTER AREA (Editor + Preview) */}
          <Pane id="center" flex className="flex flex-col min-w-0 bg-aether-bg">
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
              <SplitView storageKey="center-layout" orientation="vertical" className="flex-1">
                {/* Editor (Flex) */}
                <Pane id="editor" flex className="relative h-full">
                  <AetherEditor code={code} setCode={setCode} revealLine={selectedContext?.lineNumber || 0} />
                </Pane>

                {/* Preview (Conditional + Resizable) */}
                <Pane id="preview" visible={showPreview} defaultSize={500} minSize={200} maxSize={1000} className="bg-white flex flex-col border-l border-aether-border">
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
                  <iframe
                    key={iframeKey}
                    src={previewUrl}
                    onLoad={handleIframeLoad}
                    className="flex-1 w-full border-none"
                    title="Preview"
                  />
                </Pane>
              </SplitView>
            </div>
          </Pane>

          {/* 3. AGENT PANEL */}
          <Pane id="agent" defaultSize={400} minSize={300} maxSize={600} className="flex flex-col bg-aether-bg shadow-xl z-20 border-l border-aether-border">
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

        </SplitView>
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
