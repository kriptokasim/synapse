export interface Range {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
}

export interface IEditor {
    getValue(): string;
    getSelection(): Range | null;
    getModel(): {
        uri: string;
        getValue(): string;
        getLineContent(lineNumber: number): string;
        getLineCount(): number;
    } | null;
}
