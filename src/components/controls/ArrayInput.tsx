import { Add } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { clone } from 'lodash';
import React, {
    cloneElement,
    PropsWithChildren,
    ReactNode,
    useEffect,
    useRef,
} from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';
import {
    useFieldArray,
    useFormContext,
    useWatch,
} from 'react-hook-form';
import toast from 'react-hot-toast';
import { useUploadBackupGuard } from '../../hooks/useUploadBackupGuard';
import { useTranslate } from '../../i18n/I18nContext';
import { roomForNewSlots } from '../../utils/arraySlots';
import { ArrayFileContext } from './ArrayFileContext';
import { DeleteArrayInputButton } from './DeleteArrayInputButton';
import { MoveArrayInputButton } from './MoveArrayInputButton';

const cloneChildren = ({
    children,
    name,
    min = 0,
    index,
    depth = 0,
    onSwap,
    onRemove,
}: {
    children: any;
    name: string;
    min?: number;
    index: number;
    depth?: number;
    onSwap: (a: number, b: number) => void;
    onRemove: (index: number) => void;
}) => {
    return React.Children.map(
        children,
        (child: ReactNode, childIndex: number): ReactNode => {
            if (!React.isValidElement(child)) {
                return child;
            }
            const props = {
                ...child.props,
                children: cloneChildren({
                    children: child.props.children,
                    name,
                    min,
                    index,
                    depth: depth + 1,
                    onSwap,
                    onRemove,
                }),
            };
            if (child.props.name) {
                props.name = `${name}.${index}.${child.props.name}`;
            }
            if (depth === 0 && childIndex === 0) {
                return (
                    <Box
                        display='flex'
                        gap={2}
                        width='100%'
                        alignItems='flex-start'
                        justifyContent='space-between'
                    >
                        <Box flex={1}>{cloneElement(child, props)}</Box>
                        <Stack
                            direction='column'
                            alignItems='center'
                            alignSelf='stretch'
                            spacing={0.5}
                        >
                            <Box alignSelf='flex-start'>
                                <DeleteArrayInputButton
                                    index={index}
                                    min={min}
                                    name={name}
                                    onRemove={onRemove}
                                />
                            </Box>
                            <Box flex={1} />
                            <Stack direction='column' spacing={0.5} pb={8}>
                                <MoveArrayInputButton
                                    index={index}
                                    name={name}
                                    direction='up'
                                    onSwap={onSwap}
                                />
                                <MoveArrayInputButton
                                    index={index}
                                    name={name}
                                    direction='down'
                                    onSwap={onSwap}
                                />
                            </Stack>
                            <Box flex={1} />
                        </Stack>
                    </Box>
                );
            }
            return cloneElement(child, props);
        },
    );
};

export const ArrayInput = ({
    label,
    name,
    newValue,
    keyField = 'image',
    min = 0,
    max = -1,
    receiverFieldName, // temporary field to receive images/videos
    targetFieldName, // subfield in the array element to assign the received value to
    ...props
}: {
    name: string;
    label?: string;
    newValue: any;
    keyField?: string;
    min?: number;
    max?: number;
    receiverFieldName?: string;
    targetFieldName?: string;
} & PropsWithChildren) => {
    const tr = useTranslate();
    const { unregister } = useFormContext();
    const value = useWatch({ name, defaultValue: [] });
    const {
        fields,
        append,
        update,
        swap,
        remove,
        replace,
    } = useFieldArray({ name });
    useUploadBackupGuard(name, value, keyField);
    const prevFieldsLen = useRef(0);
    useEffect(() => {
        const prev = prevFieldsLen.current;
        prevFieldsLen.current = fields.length;
        const justAppended = fields.length > prev;
        if (!justAppended && value.length === 0 && fields.length > 0) {
            replace([]);
            return;
        }
        if (value.length < min && min > 0) {
            for (let i = 0; i < min; i++) {
                append(clone(newValue));
            }
        }
    }, [append, min, newValue, value.length, fields.length, replace]);
    const handleAdd = () => {
        append(clone(newValue));
    };
    // Append several slots at once (used by a FileUpload that received a
    // multi-file drop), each partial entry merged over the default template
    // and capped by `max`. Returns how many were actually added.
    const appendSlots = (entries: Record<string, any>[]): number => {
        const room = roomForNewSlots(value.length, max, entries.length);
        const toAppend = entries
            .slice(0, room)
            .map((e) => ({ ...clone(newValue), ...e }));
        if (toAppend.length) {
            append(toAppend);
        }
        return toAppend.length;
    };
    const receiverFieldValue = useWatch({
        name: receiverFieldName || '',
        disabled: !receiverFieldName || !targetFieldName,
    });
    useEffect(() => {
        if (!receiverFieldName || !receiverFieldValue || !targetFieldName) {
            return;
        }
        unregister(receiverFieldName);
        for (let index = 0; index < value.length; index++) {
            if (!value[index][targetFieldName]) {
                update(index, {
                    ...value[index],
                    [targetFieldName]: receiverFieldValue,
                });
                return;
            }
        }
        if (value.length < max || max === -1) {
            append({
                ...clone(newValue),
                [targetFieldName]: receiverFieldValue,
            });
        } else {
            toast.error(tr('toasts.array_overflow'));
        }
    }, [
        receiverFieldValue,
        receiverFieldName,
        targetFieldName,
        value,
        newValue,
        max,
        tr,
        unregister,
        append,
        update,
    ]);
    return (
        <Box display='flex' flexDirection='column' alignItems='center' gap={2}>
            {label ? tr(label) : tr('controls.' + name)}
            <Box width='100%'>
                <Flipper flipKey={fields.map((f: any) => f.id).join(',')}>
                    {fields.map((field: any, index: number) => (
                        <Flipped flipId={field.id} key={field.id}>
                            {/* Box is Flipped's direct child so the FLIP
                                transform lands on it; the provider sits inside
                                so it never intercepts the animated element. */}
                            <Box
                                display='flex'
                                flexDirection='column'
                                gap={1}
                                width='100%'
                                className='array-input-item'
                            >
                                <Typography variant='body2' align='center'>
                                    {index + 1}
                                </Typography>
                                <ArrayFileContext.Provider
                                    value={{
                                        name,
                                        index,
                                        max,
                                        appendSlots,
                                    }}
                                >
                                    {cloneChildren({
                                        children: props.children,
                                        name,
                                        index,
                                        min,
                                        onSwap: swap,
                                        onRemove: remove,
                                    })}
                                </ArrayFileContext.Provider>
                            </Box>
                        </Flipped>
                    ))}
                </Flipper>
            </Box>
            {(value.length < max || max === -1) && (
                <Button onClick={handleAdd}>
                    <Add />
                </Button>
            )}
        </Box>
    );
};
