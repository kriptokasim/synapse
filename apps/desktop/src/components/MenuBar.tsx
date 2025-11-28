import React, { useState } from "react";
import { executeCommand } from "../commands/commandRegistry";
import { topMenus, type MenuEntry } from "../menus/menuModel";

export const MenuBar: React.FC = () => {
    const [openLabel, setOpenLabel] = useState<string | null>(null);

    const handleMenuClick = (label: string) => {
        setOpenLabel(prev => (prev === label ? null : label));
    };

    const handleEntryClick = async (entry: MenuEntry) => {
        if (entry.type === "command") {
            setOpenLabel(null);
            await executeCommand(entry.id);
        }
    };

    const renderSubmenu = (menu: MenuEntry) => {
        if (menu.type !== "submenu") return null;
        const isOpen = openLabel === menu.label;
        return (
            <div key={menu.label} className="relative select-none">
                <button
                    className={`px-3 py-1 text-xs font-medium uppercase tracking-wide hover:bg-aether-border/40 ${isOpen ? "bg-aether-border/60" : ""
                        }`}
                    onClick={() => handleMenuClick(menu.label)}
                >
                    {menu.label}
                </button>
                {isOpen && (
                    <div className="absolute left-0 mt-0.5 min-w-[180px] rounded-md border border-aether-border bg-white shadow-lg z-50">
                        {menu.items.map((item, idx) => {
                            if (item.type === "separator") {
                                return <div key={idx} className="my-1 border-t border-aether-border/70" />;
                            }
                            if (item.type === "command") {
                                return (
                                    <button
                                        key={item.id}
                                        className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-aether-text hover:bg-aether-border/20"
                                        onClick={() => handleEntryClick(item)}
                                    >
                                        <span>{item.label}</span>
                                        {item.shortcut && (
                                            <span className="ml-4 text-[10px] text-aether-muted">
                                                {item.shortcut}
                                            </span>
                                        )}
                                    </button>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-8 items-center gap-1 border-b border-aether-border bg-aether-toolbar px-2 text-aether-muted">
            {topMenus.map(renderSubmenu)}
        </div>
    );
};
