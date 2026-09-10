import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ModPickerDialog } from '../components/controls/ModPickerDialog';

export const useModPicker = ({ name, max }: { name: string; max: number }) => {
    const [open, setOpen] = useState(false);
    const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
    const { getValues, setValue } = useFormContext();

    const openPicker = (index?: number) => {
        setReplaceIndex(index ?? null);
        setOpen(true);
    };

    const handleAdd = (id: string, strength: number) => {
        const current = getValues(name) ?? [];
        if (replaceIndex !== null) {
            const next = [...current];
            next[replaceIndex] = { ...next[replaceIndex], id, strength, copies: 1 };
            setValue(name, next, { shouldDirty: true });
        } else {
            if (current.length >= max && max !== -1) return;
            setValue(name, [...current, { id, strength, copies: 1 }], { shouldDirty: true });
        }
        setReplaceIndex(null);
    };

    const dialog = (
        <ModPickerDialog
            open={open}
            onClose={() => {
                setOpen(false);
                setReplaceIndex(null);
            }}
            onAdd={handleAdd}
        />
    );

    return { openPicker, dialog };
};
