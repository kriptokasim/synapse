import React, { useState, useEffect, useRef } from 'react';
import Editor, { useMonaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  Files, Settings, Minus, Square, X,
  RefreshCw, Globe, Crosshair,
  Zap, Paperclip, Brain, Rocket, ArrowUp, Bot, Trash2
} from 'lucide-react';
import { SynapseFactory } from './ai/UniversalGateway';
import type { AIModelMode } from './ai/UniversalGateway';
import { INSPECTOR_SCRIPT } from './ai/inspector';

const { ipcRenderer } = window.require('electron');
loader.config({ monaco });

// Types
interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  image?: string;
}

interface SelectedContext {
  tag: string;
  selector: string;
  lineNumber: number;
  snippet: string;
}

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
  // Project State
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [code, setCode] = useState('// Synapse AntiGravity v2.1\n// Select a file to begin...');

  // UI State
  const [isThinking, setIsThinking] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('split');
  const [previewUrl, setPreviewUrl] = useState('about:blank');
  const [iframeKey, setIframeKey] = useState(0);
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [revealLine, setRevealLine] = useState<number | null>(null);

  // AI & Persistent Chat
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('synapse_chat_history');
    return saved ? JSON.parse(saved) : [{ id: 'init', role: 'model', content: 'Synapse ready. Select an element (Inspect) or attach an image to edit.' }];
  });

  const [aiMode, setAiMode] = useState<AIModelMode>('standard');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [selectedContext, setSelectedContext] = useState<SelectedContext | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Persist Chat
  useEffect(() => {
    localStorage.setItem('synapse_chat_history', JSON.stringify(messages));
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleClearChat = () => {
    if (confirm("Clear chat history?")) {
      setMessages([{ id: Date.now().toString(), role: 'model', content: 'Chat cleared.' }]);
    }
  };

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

  // Smart Inspector Handler
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_CLICKED') {
        const { tag, id, selector, snippet } = event.data.payload;
        console.log("Smart Selector:", selector);

        setIsInspectorActive(false);
        document.querySelector('iframe')?.contentWindow?.postMessage({ type: 'TOGGLE_INSPECTOR', active: false }, '*');

        // Locator: Try to find the specific tag in the code
        // This is a simple heuristic, in v3 we can use AST parsing
        const lines = code.split('\n');
        let foundLine = null;

        // Priority 1: ID
        if (id) {
          const idx = lines.findIndex(l => l.includes(`id="${id}"`) || l.includes(`id='${id}'`));
          if (idx > -1) foundLine = idx + 1;
        }

        // Priority 2: Tag Name (Fallback)
        if (!foundLine) {
          // Try to find the tag closer to where we might be looking (not perfect)
          const idx = lines.findIndex(l => l.includes(`<${tag}`));
          if (idx > -1) foundLine = idx + 1;
        }

        setRevealLine(foundLine);
        if (viewMode === 'preview') setViewMode('split');

        // Set Context with FULL SELECTOR
        setSelectedContext({ tag, selector, lineNumber: foundLine || 0, snippet });
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

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      image: attachedImage || undefined
    };

    setMessages(prev => [...prev, newUserMsg]);
    setChatInput('');
    setAttachedImage(null);
    setIsThinking(true);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) throw new Error("API Key Missing");

      const ai = SynapseFactory.create('gemini', apiKey);

      let prompt = `
            FILENAME: ${activeFile || 'untitled'}
            USER REQUEST: "${newUserMsg.content}"
        `;

      if (selectedContext) {
        prompt += `
            
            >>> FOCUS CONTEXT (Apply changes HERE):
            TARGET SELECTOR: ${selectedContext.selector}
            (The user clicked exactly this element. Be extremely specific.)
            
            HTML SNIPPET:
            ${selectedContext.snippet}
            `;
      }

      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', content: 'Working on it...' }]);

      const newCode = await ai.generateCode(prompt, code, {
        mode: aiMode,
        image: newUserMsg.image
      });

      const cleanCode = newCode.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
      setCode(cleanCode);

      if (activeFile) {
        await window.synapse.writeFile(activeFile, cleanCode);
        const currentUrl = new URL(previewUrl);
        currentUrl.searchParams.set('t', Date.now().toString());
        setPreviewUrl(currentUrl.toString());
        setIframeKey(k => k + 1);
      }

      setMessages(prev => prev.map(m =>
        m.id === botMsgId ? { ...m, content: "Updates applied successfully." } : m
      ));
      setSelectedContext(null);

    } catch (e: any) {
      console.error("AI Error:", e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: `Error: ${e.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-aether-bg font-sans overflow-hidden text-aether-text">

      {/* TOP BAR */}
      <div className="h-9 bg-aether-accent flex items-center justify-between drag-region shrink-0 shadow-sm relative z-50">
        <div className="flex items-center px-3 gap-4 text-xs font-semibold text-aether-textOnAccent">
          <div className="font-black tracking-tight mr-2 cursor-default select-none">AETHER v2.1</div>
          <div className="hover:bg-black/5 px-2 py-1 rounded cursor-pointer transition-colors no-drag hidden md:block">File</div>
        </div>

        <div className="flex-1 max-w-2xl mx-4 no-drag h-6">
          <div className="flex items-center w-full h-full bg-white/30 hover:bg-white/50 focus-within:bg-white rounded transition-all px-2 gap-2 border border-black/5 focus-within:text-black">
            <Globe size={12} className="text-aether-textOnAccent opacity-60" />
            <input
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              className="flex-1 bg-transparent outline-none text-xs text-aether-textOnAccent placeholder:text-aether-textOnAccent/40 h-full font-medium"
              placeholder="localhost:3000"
            />
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

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Icons */}
        <div className="w-12 bg-aether-accent flex flex-col items-center py-4 gap-4 shrink-0 z-20">
          <button onClick={handleOpenFolder} className="p-2 rounded hover:bg-black/10 text-aether-textOnAccent"><Files size={18} /></button>
          <div className="flex-1"></div>
          <button className="p-2 rounded hover:bg-black/10 text-aether-textOnAccent"><Settings size={18} /></button>
        </div>

        {/* Explorer */}
        <div className="w-60 bg-aether-sidebar border-r border-aether-border flex flex-col shrink-0">
          <div className="h-8 flex items-center px-4 text-[10px] font-bold tracking-wider text-aether-muted uppercase">
            {projectPath ? projectPath.split(/[\\/]/).pop() : 'NO FOLDER'}
          </div>
          <div className="flex-1 overflow-y-auto px-2 text-sm">
            {files.map((file, i) => (
              <div key={i} onClick={() => handleFileClick(file)} className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md transition-colors ${activeFile === file.path ? 'bg-white shadow-sm font-medium' : 'hover:bg-black/5'}`}>
                <span className="truncate text-xs">{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Editor/Preview */}
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

        {/* CHAT PANEL */}
        <div className="w-80 bg-aether-sidebar border-l border-aether-border flex flex-col shrink-0">
          {/* Models */}
          <div className="p-4 border-b border-aether-border bg-aether-sidebar">
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

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 scroll-smooth" ref={chatScrollRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.image && (
                  <img src={msg.image} className="max-w-[120px] rounded-lg border border-aether-border" alt="upload" />
                )}
                <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                  ? 'bg-aether-selection text-aether-text border border-aether-accent/20'
                  : 'bg-white border border-aether-border shadow-sm'
                  }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-aether-accent animate-pulse px-2">
                <Bot size={14} />
                <span className="text-xs font-medium">AI is working...</span>
              </div>
            )}
          </div>

          {/* Context & Input */}
          {selectedContext && (
            <div className="px-4 py-2 bg-aether-selection/50 border-t border-aether-border flex items-center gap-2 text-xs">
              <Crosshair size={12} className="text-aether-accent" />
              <span className="font-mono truncate flex-1 font-bold text-aether-accent" title={selectedContext.selector}>
                {selectedContext.selector}
              </span>
              <button onClick={() => setSelectedContext(null)} className="hover:text-red-500"><X size={12} /></button>
            </div>
          )}

          <div className="p-4 border-t border-aether-border bg-white/50">
            {attachedImage && (
              <div className="flex items-center gap-2 mb-2 bg-white border border-aether-border px-2 py-1 rounded-md w-fit shadow-sm">
                <img src={attachedImage} className="w-6 h-6 object-cover rounded" alt="preview" />
                <button onClick={() => setAttachedImage(null)} className="hover:text-red-500"><X size={12} /></button>
              </div>
            )}

            <div className={`flex items-end gap-2 px-3 py-2 rounded-lg border transition-all bg-white ${isThinking ? 'border-aether-accent shadow-md' : 'border-aether-border shadow-sm'}`}>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="mb-1 text-aether-muted hover:text-aether-accent"><Paperclip size={16} /></button>

              {/* Clear Chat Button Hidden Shortcut */}
              <button onClick={handleClearChat} className="mb-1 text-aether-muted hover:text-red-500" title="Clear Chat"><Trash2 size={14} /></button>

              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isThinking}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAskAI())}
                placeholder={isThinking ? (aiMode === 'thinking' ? "Reasoning deeply..." : "Generating...") : "Ask Synapse..."}
                className="flex-1 bg-transparent outline-none text-sm font-medium text-aether-text placeholder:text-aether-muted resize-none py-1 max-h-32 min-h-[24px]"
                rows={1}
                style={{ fieldSizing: 'content' } as any}
              />

              <button onClick={handleAskAI} disabled={isThinking || (!chatInput.trim() && !attachedImage)} className="mb-1 text-aether-accent hover:bg-aether-accent/10 p-1 rounded">
                {isThinking ? <Zap size={16} className="animate-pulse" /> : <ArrowUp size={16} strokeWidth={3} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
