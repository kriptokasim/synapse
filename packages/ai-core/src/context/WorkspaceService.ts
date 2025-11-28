import { IFileSystem } from './IFileSystem';
import { ContextItem } from './ContextService';

export class WorkspaceService {
    constructor(private fs: IFileSystem) { }

    async listFiles(rootPath: string): Promise<string[]> {
        // Recursive listing
        const files: string[] = [];
        const entries = await this.fs.readDirectory(rootPath);

        for (const entry of entries) {
            if (entry.isDirectory) {
                if (entry.name === 'node_modules' || entry.name === '.git') continue;
                const subFiles = await this.listFiles(entry.path);
                files.push(...subFiles);
            } else {
                files.push(entry.path);
            }
        }
        return files;
    }

    async search(query: string, rootPath: string): Promise<ContextItem[]> {
        // Naive search for now: list all files and grep content
        // In a real app, we'd use ripgrep or a search index
        const files = await this.listFiles(rootPath);
        const results: ContextItem[] = [];

        for (const file of files) {
            // Limit to small number of files for naive search
            if (results.length >= 5) break;

            try {
                const content = await this.fs.readFile(file);
                if (content.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                        type: 'file',
                        path: file,
                        content: content // In real app, snippet only
                    });
                }
            } catch (e) {
                // Ignore read errors
            }
        }

        return results;
    }
}
