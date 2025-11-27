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
    id,
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
        display: visible ? undefined : 'none',
        ...style
    };

    if (orientation === 'vertical') {
        // Vertical Split (Row): Height is 100%, Width is managed
        styleProps.height = '100%';
        if (!flex) {
            styleProps.width = size;
        }
    } else {
        // Horizontal Split (Column): Width is 100%, Height is managed
        styleProps.width = '100%';
        if (!flex) {
            styleProps.height = size;
        }
    }

    return (
        <div
            id={id}
            className={`relative flex-shrink-0 overflow-hidden ${className}`}
            style={styleProps}
        >
            {children}
        </div>
    );
};
