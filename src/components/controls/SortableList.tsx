import {
    DndContext,
    DragEndEvent,
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
import { Box } from '@mui/material';
import { ReactNode, useMemo } from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';

// Shared drag-to-reorder shell: DndContext + SortableContext + Flipper + a Box
// container, with each item wrapped in a `Flipped` keyed by its stable id. The
// stable `item.id` React key is what prevents the "spring back to the old
// position" glitch — it keeps DOM nodes associated with their item across a
// reorder. `children` is a render function `(item, index) => node` that builds
// each item; the per-item `useSortable` lives inside the returned element (see
// LoraChip / CustomItemShell / CompactFileItem). `trailing` (e.g. an add button
// / drop overlay) renders inside the container, after the items.
export const SortableList = <T extends { id: string }>({
    items,
    onMove,
    children,
    containerProps,
    trailing,
}: {
    items: T[];
    onMove: (oldIndex: number, newIndex: number) => void;
    children: (item: T, index: number) => ReactNode;
    containerProps?: any;
    trailing?: ReactNode;
}) => {
    const ids = useMemo(() => items.map((i) => i.id), [items]);
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
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            return;
        }
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex !== -1 && newIndex !== -1) {
            onMove(oldIndex, newIndex);
        }
    };
    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={ids}>
                <Flipper flipKey={ids.join(',')}>
                    <Box {...containerProps}>
                        {items.map((item, index) => (
                            <Flipped key={item.id} flipId={item.id}>
                                {children(item, index)}
                            </Flipped>
                        ))}
                        {trailing}
                    </Box>
                </Flipper>
            </SortableContext>
        </DndContext>
    );
};
