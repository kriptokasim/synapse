import React, { useState, useEffect } from 'react';
import { Sash } from './Sash';
import { Pane } from './Pane';
import type { PaneProps } from './Pane';

interface SplitViewProps {
    children: React.ReactElement<PaneProps> | React.ReactElement<PaneProps>[];
    className?: string;
    orientation?: 'vertical' | 'horizontal';
    storageKey?: string; // Key for localStorage persistence
}

export const SplitView: React.FC<SplitViewProps> = ({
    children,
    className = '',
    orientation = 'vertical',
    storageKey
}) => {
    // Convert children to array and filter nulls
    const panes = React.Children.toArray(children) as React.ReactElement<PaneProps>[];
    const visiblePanes = panes.filter(p => p.props.visible !== false);

    // Initialize sizes from storage or defaults
    const [sizes, setSizes] = useState<Record<string, number>>(() => {
        if (storageKey) {
            const saved = localStorage.getItem(`splitview-${storageKey}`);
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to parse saved layout', e);
                }
            }
        }

        // Default initialization
        const initialSizes: Record<string, number> = {};
        visiblePanes.forEach(pane => {
            if (!pane.props.flex) {
                initialSizes[pane.props.id] = pane.props.defaultSize || 200;
            }
        });
        return initialSizes;
    });

    // Persist sizes when they change
    useEffect(() => {
        if (storageKey) {
            localStorage.setItem(`splitview-${storageKey}`, JSON.stringify(sizes));
        }
    }, [sizes, storageKey]);

    // We need to track the start size for delta calculations
    const [dragState, setDragState] = useState<{ paneId: string, startSize: number } | null>(null);

    return (
        <div className={`flex ${orientation === 'vertical' ? 'flex-row' : 'flex-col'} w-full h-full overflow-hidden ${className}`}>
            {visiblePanes.map((pane, index) => {
                const isLast = index === visiblePanes.length - 1;
                const size = sizes[pane.props.id] || pane.props.defaultSize || 200;

                return (
                    <React.Fragment key={pane.props.id}>
                        <Pane
                            {...pane.props}
                            size={pane.props.flex ? undefined : size}
                        />

                        {!isLast && !pane.props.flex && (
                            <Sash
                                orientation={orientation}
                                onResizeStart={() => {
                                    setDragState({ paneId: pane.props.id, startSize: size });
                                }}
                                onResize={(delta) => {
                                    if (dragState && dragState.paneId === pane.props.id) {
                                        // Calculate absolute size based on start size + delta
                                        // This mimics the "delta" logic we wanted
                                        const newSize = dragState.startSize + delta;
                                        const min = pane.props.minSize || 0;
                                        const max = pane.props.maxSize || Infinity;
                                        const clampedSize = Math.max(min, Math.min(max, newSize));

                                        setSizes(prev => ({
                                            ...prev,
                                            [pane.props.id]: clampedSize
                                        }));
                                    }
                                }}
                                onResizeEnd={() => {
                                    setDragState(null);
                                }}
                            />
                        )}

                        {/* 
               Handle the case where the NEXT pane is flex, but the CURRENT pane is also flex? 
               Actually, in a simple split view, usually we resize the item BEFORE the sash.
               If the current item is flex, we typically can't resize it explicitly via a sash *after* it,
               unless we are resizing the *next* item (which would be on the right).
               
               For this simplified implementation:
               - Sashes appear after non-flex items to resize them.
               - If we have [Fixed A] [Flex B] [Fixed C], we need sashes:
                 [Fixed A] | [Flex B] | [Fixed C]
                 
               Sash 1 resizes A.
               Sash 2 resizes... C? Or B?
               
               Void/VS Code is complex. Let's stick to the user's requirement:
               Explorer (Fixed/Resizable) | Editor (Flex) | Agent (Fixed/Resizable)
               
               So we need:
               [Explorer] [Sash -> Resizes Explorer] [Editor] [Sash -> Resizes Agent (inverted?)] [Agent]
            */}

                        {!isLast && pane.props.flex && (
                            // If this is the flex item (Editor), and there is a next item (Agent),
                            // the sash after this flex item should resize the NEXT item (Agent).
                            // But dragging it RIGHT should SHRINK Agent, and LEFT should GROW Agent.
                            <Sash
                                orientation={orientation}
                                onResizeStart={() => {
                                    const nextPane = visiblePanes[index + 1];
                                    if (nextPane) {
                                        setDragState({ paneId: nextPane.props.id, startSize: sizes[nextPane.props.id] || nextPane.props.defaultSize || 200 });
                                    }
                                }}
                                onResize={(delta) => {
                                    const nextPane = visiblePanes[index + 1];
                                    if (nextPane && dragState && dragState.paneId === nextPane.props.id) {
                                        // Inverted logic: Dragging right (positive delta) shrinks the right panel
                                        const newSize = dragState.startSize - delta;
                                        const min = nextPane.props.minSize || 0;
                                        const max = nextPane.props.maxSize || Infinity;
                                        const clampedSize = Math.max(min, Math.min(max, newSize));

                                        setSizes(prev => ({
                                            ...prev,
                                            [nextPane.props.id]: clampedSize
                                        }));
                                    }
                                }}
                                onResizeEnd={() => setDragState(null)}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};
