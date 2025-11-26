/// <reference types="vite/client" />

interface Window {
    synapse: {
        openDirectory: () => Promise<string | null>;
        readDirectory: (path: string) => Promise<any[]>;
        readFile: (path: string) => Promise<string>;
        writeFile: (path: string, content: string) => Promise<boolean>;
    };
    require: any;
}
