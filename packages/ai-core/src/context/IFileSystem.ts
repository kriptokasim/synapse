export interface IFileSystem {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    readDirectory(path: string): Promise<{ name: string; isDirectory: boolean; path: string }[]>;
    // Add more as needed (e.g. search)
}
