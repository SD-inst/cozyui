import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Tab } from '@mui/material';
import { ComponentPropsWithoutRef } from 'react';

type SortableTabProps = ComponentPropsWithoutRef<typeof Tab> & {
    id: string;
};

/**
 * A real MUI <Tab> that is also a dnd-kit sortable item. The whole tab is the
 * drag handle: dnd-kit's pointer listeners and node ref are attached to the
 * tab element, and the live reorder transform is applied via inline style.
 *
 * MUI <Tabs> clones its direct children to inject selection state
 * (selected / onChange / the sliding indicator / textColor, ...). Those props
 * are forwarded straight to the inner <Tab>, so the ripple and the animated
 * underline keep working.
 */
export const SortableTab = ({ id, ...mui }: SortableTabProps) => {
    const {
        setNodeRef,
        transform,
        transition,
        isDragging,
        attributes,
        listeners,
    } = useSortable({ id });

    return (
        <Tab
            ref={setNodeRef}
            value={id}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.5 : 1,
                flexShrink: 0,
            }}
            {...attributes}
            {...listeners}
            {...mui}
        />
    );
};
