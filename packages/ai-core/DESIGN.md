# AI Core Design

## Overview
The `ai-core` package provides the intelligence layer for Synapse. It adapts the architecture of Void (VS Code fork) to work with Synapse's Monaco + Electron environment.

## Architecture

### 1. Provider & Model Layer (`src/providers`)
Abstractions for interacting with LLMs.

- **`AIModelProvider` Interface**:
  ```typescript
  interface AIModelProvider {
    id: string;
    generate(messages: LLMMessage[], config: ModelConfig): Promise<LLMResponse>;
    stream(messages: LLMMessage[], config: ModelConfig): AsyncGenerator<LLMStreamChunk>;
  }
  ```
- **`AIProviderRouter`**:
  - Manages active providers (OpenAI, Anthropic, etc.).
  - Routes requests based on task type (Quick Edit, Chat, Agent).

### 2. Context System (`src/context`)
Services to gather relevant code and metadata.

- **`ContextService`**:
  - `getQuickEditContext(file: string, selection: Range): Promise<ContextItem[]>`
  - `getAgentContext(task: string): Promise<ContextItem[]>`
- **`WorkspaceService`**:
  - Wraps Synapse's FS (`window.synapse`).
  - Provides file search and content reading.

### 3. AI Operations (`src/operations`)
High-level task flows.

- **`QuickEditService`**:
  - Takes user instruction + selection.
  - Builds prompt (using Void's templates).
  - Calls LLM.
  - Returns `CodePatch`.
- **`ChatService`**:
  - Manages conversation history.
  - Handles context references (@file).
- **`AgentService`**:
  - Loops: Plan -> Act (Tool) -> Observe.
  - Tools: `readFile`, `writeFile`, `search`.

### 4. Integration with Synapse
- **`SynapseBridge`**:
  - Interface that `apps/desktop` implements to give `ai-core` access to the editor and FS.
  - `editor: ICodeEditor` (Monaco wrapper)
  - `fs: IFileSystem`

## Key Types (Adapted from Void)

```typescript
type LLMMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type CodePatch = {
  filePath: string;
  changes: {
    range: Range;
    text: string;
  }[];
};
```

## Directory Structure
```
packages/ai-core/
├── src/
│   ├── providers/       # OpenAI, Anthropic, etc.
│   ├── context/         # Context gathering, indexing
│   ├── operations/      # Quick Edit, Chat, Agent
│   ├── prompts/         # Templates (ported from Void)
│   ├── types/           # Shared interfaces
│   └── index.ts         # Public API
├── package.json
└── tsconfig.json
```
