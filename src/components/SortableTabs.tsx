import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Tab, Tabs, TabsProps } from '@mui/material';
import { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { SortableTab } from './SortableTab';

// wheel → horizontal scroll on the MUI Tabs scroller
const useScroller = (root: HTMLDivElement | null) => {
    useEffect(() => {
        if (!root) {
            return;
        }
        const scroller = root.getElementsByClassName('MuiTabs-scroller')[0] as
            HTMLDivElement | undefined;
        if (!scroller) {
            return;
        }
        const handler = (e: WheelEvent) => {
            e.preventDefault();
            scroller.scrollLeft += e.deltaY;
        };
        scroller.addEventListener('wheel', handler);
        return () => {
            scroller.removeEventListener('wheel', handler);
        };
    }, [root]);
};

/**
 * A bar of draggable MUI tabs. Wraps a real MUI <Tabs> (so the ripple and the
 * sliding underline indicator keep working) with a dnd-kit layer: items render
 * in the given order and can be reordered by dragging (mouse on desktop,
 * long-press on touch).
 */
export const SortableTabs = memo(({
    items,
    activeId,
    labels,
    onDragEnd,
    onItemClick,
    sx,
}: {
    items: string[];
    activeId: string;
    labels: { [id: string]: ReactNode };
    onDragEnd: (activeId: string, overId: string) => void;
    onItemClick: (id: string) => void;
    sx?: TabsProps['sx'];
}) => {
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef(false);
    useScroller(tabsRef.current);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragStart = (event: DragStartEvent) => {
        dragRef.current = true;
        setActiveDragId(String(event.active.id));
    };
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (over && active.id !== over.id) {
            onDragEnd(String(active.id), String(over.id));
        }
        // A click can still fire after a real drag; swallow it
        setTimeout(() => {
            dragRef.current = false;
        }, 0);
    };
    const handleDragCancel = () => {
        // Keyboard drag cancelled (Esc): clear the stuck guard
        setActiveDragId(null);
        setTimeout(() => {
            dragRef.current = false;
        }, 0);
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext items={items}>
                <Tabs
                    ref={tabsRef}
                    value={activeId}
                    onChange={(_, v) => {
                        if (dragRef.current) {
                            return;
                        }
                        onItemClick(String(v));
                    }}
                    variant='scrollable'
                    sx={{ width: '100%', ...sx }}
                >
                    {items.map((id) => (
                        <SortableTab
                            key={id}
                            id={id}
                            label={labels[id]}
                            value={id}
                        />
                    ))}
                </Tabs>
            </SortableContext>
            <DragOverlay>
                {activeDragId && (
                    <Tab
                        label={labels[activeDragId]}
                        sx={{
                            mx: 1,
                            px: 2,
                            opacity: 0.85,
                            borderRadius: 1,
                            boxShadow: 2,
                        }}
                    />
                )}
            </DragOverlay>
        </DndContext>
    );
});

SortableTabs.displayName = 'SortableTabs';
