import { IFileSystem } from './IFileSystem';
import { IEditor, Range } from './IEditor';

export interface ContextItem {
    type: 'file' | 'snippet' | 'selection';
    path: string;
    content: string;
    range?: Range;
}

export class ContextService {
    constructor(_fs: IFileSystem) { }

    async buildQuickEditContext(
        editor: IEditor,
        _instruction: string
    ): Promise<ContextItem[]> {
        const model = editor.getModel();
        if (!model) {
            throw new Error('No active model in editor');
        }

        const selection = editor.getSelection();
        const contextItems: ContextItem[] = [];

        // 1. Add the full file content (or a window around selection)
        // For now, let's add the full file but we might want to truncate for large files
        contextItems.push({
            type: 'file',
            path: model.uri,
            content: model.getValue()
        });

        // 2. Add the selection specifically if it exists
        if (selection) {
            // Extract selected text
            // This is a simplification; in a real app we'd slice the content based on range
            // But since we send the whole file, the LLM can infer from range if we pass it in prompt
            contextItems.push({
                type: 'selection',
                path: model.uri,
                content: '', // Content is already in file, but we mark the range
                range: selection
            });
        }

        // 3. Future: Add related files (imports, definitions)
        // await this.gatherRelatedFiles(model.uri, model.getValue());

        return contextItems;
    }

    // Helper to format context for the LLM
    formatContextForPrompt(items: ContextItem[]): string {
        let output = '';
        for (const item of items) {
            if (item.type === 'file') {
                output += `File: ${item.path}\n\`\`\`\n${item.content}\n\`\`\`\n\n`;
            } else if (item.type === 'selection') {
                output += `Selection in ${item.path}: Lines ${item.range?.startLineNumber}-${item.range?.endLineNumber}\n`;
            }
        }
        return output;
    }
}
