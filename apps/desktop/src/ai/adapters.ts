import type { IFileSystem, IEditor, Range } from '@synapse/ai-core';
import * as monaco from 'monaco-editor';

export class SynapseFileSystem implements IFileSystem {
    async readFile(path: string): Promise<string> {
        // @ts-ignore
        return window.synapse.readFile(path);
    }

    async writeFile(path: string, content: string): Promise<void> {
        // @ts-ignore
        return window.synapse.writeFile(path, content);
    }

    async readDirectory(path: string): Promise<{ name: string; isDirectory: boolean; path: string }[]> {
        // @ts-ignore
        return window.synapse.readDirectory(path);
    }
}

export class MonacoEditorAdapter implements IEditor {
    constructor(private editor: monaco.editor.IStandaloneCodeEditor) { }

    getValue(): string {
        return this.editor.getValue();
    }

    getSelection(): Range | null {
        const selection = this.editor.getSelection();
        if (!selection) return null;
        return {
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn: selection.endColumn
        };
    }

    getModel() {
        const model = this.editor.getModel();
        if (!model) return null;
        return {
            uri: model.uri.toString(),
            getValue: () => model.getValue(),
            getLineContent: (lineNumber: number) => model.getLineContent(lineNumber),
            getLineCount: () => model.getLineCount()
        };
    }
}
