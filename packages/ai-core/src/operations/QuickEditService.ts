import { AIProviderRouter } from '../providers/AIProviderRouter';
import { ContextService } from '../context/ContextService';
import { IEditor } from '../context/IEditor';
import { ModelConfig, CodePatch } from '../types';
import { QUICK_EDIT_SYSTEM_PROMPT, QUICK_EDIT_USER_PROMPT } from '../prompts';

export class QuickEditService {
    constructor(
        private router: AIProviderRouter,
        _contextService: ContextService
    ) { }

    async quickEdit(
        editor: IEditor,
        instruction: string,
        config?: Partial<ModelConfig>
    ): Promise<CodePatch> {
        const provider = this.router.resolveProvider(config);
        const modelId = config?.modelId || 'gpt-4o'; // Default

        const model = editor.getModel();
        if (!model) throw new Error('No active model');

        const selection = editor.getSelection();
        const fileContent = model.getValue();
        const selectionContent = selection
            ? this.getSelectionContent(fileContent, selection)
            : fileContent; // Fallback to whole file if no selection

        // Build Prompt
        // In a real implementation, we'd use contextService to get related files
        // For now, we just use the current file and selection
        const messages = [
            { role: 'system' as const, content: QUICK_EDIT_SYSTEM_PROMPT },
            { role: 'user' as const, content: QUICK_EDIT_USER_PROMPT(fileContent, selectionContent, instruction) }
        ];

        const response = await provider.generate(messages, {
            modelId,
            apiKey: config?.apiKey,
            ...config
        });

        let newContent = response.content;
        // Strip markdown code blocks if present
        newContent = newContent.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');

        return {
            filePath: model.uri,
            originalContent: selectionContent,
            newContent: newContent
        };
    }

    private getSelectionContent(fileContent: string, range: any): string {
        const lines = fileContent.split('\n');
        // Simplified extraction. In real app, handle columns precisely.
        // This assumes line-based selection for simplicity or needs proper range handling.
        // Monaco ranges are 1-based.
        const selectedLines = lines.slice(range.startLineNumber - 1, range.endLineNumber);
        return selectedLines.join('\n');
    }
}
