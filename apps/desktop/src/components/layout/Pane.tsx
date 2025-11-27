import React from 'react';

export interface PaneProps {
    id: string;
    minSize?: number;
    maxSize?: number;
    defaultSize?: number;
    flex?: boolean; // If true, this pane takes up remaining space
    visible?: boolean;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export const Pane: React.FC<PaneProps & { size?: number }> = ({
    size,
    flex,
    visible = true,
    children,
    className = '',
    style
}) => {
    if (!visible) return null;

    return (
        <div
            className={`relative h-full flex-shrink-0 overflow-hidden ${className}`}
            style={{
                width: flex ? '100%' : size,
                flex: flex ? '1 1 0%' : 'none',
                ...style
            }}
        >
            {children}
        </div>
    );
};
