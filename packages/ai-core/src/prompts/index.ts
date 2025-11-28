export const QUICK_EDIT_SYSTEM_PROMPT = `You are an expert coding assistant.
Your task is to modify the provided code based on the user's instruction.
You will be given the full file content and the specific selection to edit.
Return ONLY the new code that should replace the selection.
Do not include any explanation or markdown formatting (unless the code itself is markdown).
If the instruction implies modifying code outside the selection, you may return the full file content, but prefer replacing just the selection if possible.
`;

export const QUICK_EDIT_USER_PROMPT = (fileContent: string, selection: string, instruction: string) => `
FILE CONTENT:
${fileContent}

SELECTION TO EDIT:
${selection}

INSTRUCTION:
${instruction}

OUTPUT (Replacement Code Only):
`;
