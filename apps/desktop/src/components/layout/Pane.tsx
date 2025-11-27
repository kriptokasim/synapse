import React from 'react';

export interface PaneProps {
    id: string;
    minSize?: number;
    maxSize?: number;
    defaultSize?: number;
    flex?: boolean; // If true, this pane takes up remaining space
    visible?: boolean;
    orientation?: 'vertical' | 'horizontal';
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export const Pane: React.FC<PaneProps & { size?: number; orientation?: 'vertical' | 'horizontal' }> = ({
    size,
    flex,
    visible = true,
    children,
    className = '',
    orientation = 'vertical',
    style
}) => {
    // CHANGE: Do not return null. Render it hidden instead.
    // if (!visible) return null;

    const styleProps: React.CSSProperties = {
        flex: flex ? '1 1 0%' : 'none',
        display: visible ? 'block' : 'none',
        ...style
    };

    if (!flex) {
        if (orientation === 'vertical') {
            styleProps.width = size;
        } else {
            styleProps.height = size;
        }
    }

    return (
        <div
            className={`relative flex-shrink-0 overflow-hidden ${className}`}
            style={styleProps}
        >
            {children}
        </div>
    );
};
