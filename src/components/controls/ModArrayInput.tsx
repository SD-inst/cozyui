import { Box, useTheme } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { memo, useEffect, useState } from 'react';
import { ArrayInput } from './ArrayInput';
import { SliderInput } from './SliderInput';
import { useModPicker } from './ModPickerDialog';
import { db } from '../history/db';

const THUMBNAIL_SIZE = 128;

export const ModThumbnail = memo(({ modId }: { modId: string }) => {
    const [url, setUrl] = useState('');
    const file = useLiveQuery(
        async () =>
            db.refModFiles
                .where({ mod: modId })
                .and((f: any) => f.fileType === 'thumbnail')
                .first(),
        [modId],
    );
    useEffect(() => {
        if (file?.file) {
            const u = URL.createObjectURL(file.file);
            setUrl(u);
            return () => URL.revokeObjectURL(u);
        }
    }, [file]);
    if (!url) return null;
    return (
        <img
            src={url}
            alt=''
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
        />
    );
});

const ModThumbContent = ({ item }: { item: any }) => {
    const theme = useTheme();
    return (
        <Box
            sx={{
                width: THUMBNAIL_SIZE,
                height: THUMBNAIL_SIZE,
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: theme.palette.grey[100],
                border: '1px solid',
                borderColor: theme.palette.grey[300],
                position: 'relative',
                cursor: 'pointer',
            }}
        >
            {item?.id && <ModThumbnail modId={item.id} />}
            {!item?.id && (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.palette.grey[500],
                    }}
                >
                    🎨
                </Box>
            )}
        </Box>
    );
};

export const ModArrayInput = ({
    label,
    name,
    max = -1,
}: {
    name: string;
    label?: string;
    max?: number;
}) => {
    const picker = useModPicker({ name, max });

    const handleReplace = (index: number) => {
        picker.openPicker(index);
    };

    const renderPreview = (item: any) => (
        <Box
            sx={{
                width: 200,
                height: 200,
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: 'grey.100',
                marginBottom: 16,
            }}
        >
            {item?.id && <ModThumbnail modId={item.id} />}
        </Box>
    );

    return (
        <>
            <ArrayInput
                name={name}
                label={label}
                newValue={{ id: '', strength: 1.0, copies: 1 }}
                keyField='id'
                max={max}
                renderItem={(item) => <ModThumbContent item={item} />}
                onAddClick={() => picker.openPicker()}
                onReplaceClick={handleReplace}
                renderPreview={renderPreview}
            >
                <SliderInput
                    name='strength'
                    label='refmods.strength'
                    defaultValue={1.0}
                    min={0}
                    max={1}
                    step={0.05}
                />
                <SliderInput
                    name='copies'
                    label='refmods.copies'
                    defaultValue={1}
                    min={1}
                    max={10}
                    step={1}
                />
            </ArrayInput>
            {picker.dialog}
        </>
    );
};
