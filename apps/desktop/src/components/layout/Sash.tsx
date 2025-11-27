import React, { useCallback, useRef, useState } from 'react';

interface SashProps {
    onResizeStart: () => void;
    onResize: (delta: number) => void;
    onResizeEnd: () => void;
    orientation?: 'vertical' | 'horizontal';
    className?: string;
}

export const Sash: React.FC<SashProps> = ({
    onResizeStart,
    onResize,
    onResizeEnd,
    orientation = 'vertical',
    className = ''
}) => {
    const [isResizing, setIsResizing] = useState(false);
    const startRef = useRef<{ x: number; y: number } | null>(null);

    // Global event handlers for drag operation
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!startRef.current) return;

        const deltaX = e.clientX - startRef.current.x;
        const deltaY = e.clientY - startRef.current.y;

        // For this simplified version, we just pass the relevant delta
        const delta = orientation === 'vertical' ? deltaX : deltaY;

        onResize(delta);
    }, [onResize, orientation]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
        startRef.current = null;
        onResizeEnd();

        // Cleanup global listeners
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        // Restore body cursor
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Re-enable pointer events on iframes
        const iframes = document.getElementsByTagName('iframe');
        for (let i = 0; i < iframes.length; i++) {
            iframes[i].style.pointerEvents = '';
        }
    }, [onResizeEnd, handleMouseMove]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsResizing(true);
        startRef.current = { x: e.clientX, y: e.clientY };
        onResizeStart();

        // Add global listeners
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        // Set global cursor
        document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';

        // Disable pointer events on iframes to prevent them from stealing mouse events
        const iframes = document.getElementsByTagName('iframe');
        for (let i = 0; i < iframes.length; i++) {
            iframes[i].style.pointerEvents = 'none';
        }
    }, [orientation, onResizeStart, handleMouseMove, handleMouseUp]);

    return (
        <div
            className={`z-50 flex items-center justify-center hover:bg-aether-accent/50 transition-colors select-none ${orientation === 'vertical'
                ? 'w-1 h-full -mx-0.5 cursor-col-resize'
                : 'h-1 w-full -my-0.5 cursor-row-resize'
                } ${className} ${isResizing ? 'bg-aether-accent' : ''}`}
            onMouseDown={handleMouseDown}
        >
            {/* Visual handle line */}
            <div className={`bg-aether-border ${orientation === 'vertical' ? 'w-[1px] h-full' : 'h-[1px] w-full'
                }`} />
        </div>
    );
};
