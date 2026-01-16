import { Add } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { clone } from 'lodash';
import React, {
    cloneElement,
    PropsWithChildren,
    ReactNode,
    useEffect,
} from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslate } from '../../i18n/I18nContext';
import { DeleteArrayInputButton } from './DeleteArrayInputButton';

const cloneChildren = ({
    children,
    name,
    min = 0,
    index,
    depth = 0,
}: {
    children: any;
    name: string;
    min?: number;
    index: number;
    depth?: number;
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
                        <DeleteArrayInputButton
                            index={index}
                            min={min}
                            name={name}
                        />
                    </Box>
                );
            }
            return cloneElement(child, props);
        }
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
    const value: any[] = useWatch({ name, defaultValue: [] });
    const { unregister, setValue } = useFormContext();
    const { append, update } = useFieldArray({ name });
    useEffect(() => {
        if (value.length < min && min > 0) {
            for (let i = 0; i < min; i++) {
                append(clone(newValue));
            }
        } else if (value === undefined) {
            setValue(name, []);
        }
    }, [append, min, name, newValue, setValue, value, value.length]);
    const handleAdd = () => {
        append(clone(newValue));
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
            {value.map((val: any, index: number) => (
                <Box
                    display='flex'
                    flexDirection='column'
                    gap={1}
                    width='100%'
                    key={`${index}_${val[keyField]}`}
                >
                    <Typography variant='body2' align='center'>
                        {index + 1}
                    </Typography>
                    {cloneChildren({
                        children: props.children,
                        name,
                        index,
                        min,
                    })}
                </Box>
            ))}
            {(value.length < max || max === -1) && (
                <Button onClick={handleAdd}>
                    <Add />
                </Button>
            )}
        </Box>
    );
};
