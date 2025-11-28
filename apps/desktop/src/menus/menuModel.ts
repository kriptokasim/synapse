import type { CommandId } from "../commands/commandRegistry";

export type MenuEntry =
    | { type: "command"; id: CommandId; label: string; shortcut?: string }
    | { type: "separator" }
    | { type: "submenu"; label: string; items: MenuEntry[] };

export const topMenus: MenuEntry[] = [
    {
        type: "submenu",
        label: "File",
        items: [
            { type: "command", id: "file.new", label: "New File..." },
            { type: "command", id: "file.openFolder", label: "Open Folder..." },
            { type: "separator" },
            { type: "command", id: "file.save", label: "Save", shortcut: "Ctrl+S" },
            { type: "command", id: "file.saveAll", label: "Save All" },
            { type: "separator" },
            { type: "command", id: "file.exit", label: "Exit" },
        ],
    },
    {
        type: "submenu",
        label: "Edit",
        items: [
            { type: "command", id: "edit.undo", label: "Undo", shortcut: "Ctrl+Z" },
            { type: "command", id: "edit.redo", label: "Redo", shortcut: "Ctrl+Y" },
            { type: "separator" },
            { type: "command", id: "edit.cut", label: "Cut", shortcut: "Ctrl+X" },
            { type: "command", id: "edit.copy", label: "Copy", shortcut: "Ctrl+C" },
            { type: "command", id: "edit.paste", label: "Paste", shortcut: "Ctrl+V" },
            { type: "separator" },
            {
                type: "command",
                id: "ai.quickEditSelection",
                label: "AI Quick Edit...",
                shortcut: "Ctrl+K",
            },
            { type: "command", id: "ai.openChat", label: "Open Agent Panel" },
        ],
    },
    {
        type: "submenu",
        label: "View",
        items: [
            { type: "command", id: "view.toggleSidebar", label: "Toggle Sidebar" },
            { type: "command", id: "view.togglePreview", label: "Toggle Preview" },
            { type: "command", id: "view.toggleBottomPanel", label: "Toggle Console" },
        ],
    },
    {
        type: "submenu",
        label: "Settings",
        items: [
            { type: "command", id: "settings.open", label: "Open Settings..." },
            { type: "command", id: "settings.openModels", label: "Models & Providers..." },
        ],
    },
    {
        type: "submenu",
        label: "Help",
        items: [
            { type: "command", id: "help.showShortcuts", label: "Keyboard Shortcuts" },
            { type: "command", id: "help.about", label: "About Synapse" },
        ],
    },
];
