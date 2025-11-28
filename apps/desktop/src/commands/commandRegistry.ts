export type CommandId =
    | "file.new"
    | "file.openFolder"
    | "file.save"
    | "file.saveAll"
    | "file.exit"
    | "edit.undo"
    | "edit.redo"
    | "edit.cut"
    | "edit.copy"
    | "edit.paste"
    | "view.toggleSidebar"
    | "view.toggleBottomPanel"
    | "view.togglePreview"
    | "ai.quickEditSelection"
    | "ai.openChat"
    | "settings.open"
    | "settings.openModels"
    | "help.showShortcuts"
    | "help.about";

export type CommandHandler = (payload?: any) => void | Promise<void>;

const handlers = new Map<CommandId, CommandHandler>();

export function registerCommand(id: CommandId, handler: CommandHandler) {
    handlers.set(id, handler);
}

export function unregisterCommand(id: CommandId) {
    handlers.delete(id);
}

export async function executeCommand(id: CommandId, payload?: any) {
    const handler = handlers.get(id);
    if (!handler) {
        console.warn(`[commandRegistry] No handler for command: ${id}`);
        return;
    }
    return handler(payload);
}
