import { Add } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { clone } from 'lodash';
import React, {
    cloneElement,
    PropsWithChildren,
    ReactNode,
    useEffect,
} from 'react';
import { useFormContext } from 'react-hook-form';
import { useWatchForm } from '../../hooks/useWatchForm';
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
    ...props
}: {
    name: string;
    label: string;
    newValue: any;
    keyField?: string;
    min?: number;
    max?: number;
} & PropsWithChildren) => {
    const tr = useTranslate();
    const value: any = useWatchForm(name) || [];
    const { setValue } = useFormContext();
    useEffect(() => {
        if (!value.length && min > 0) {
            setValue(name, Array(min).fill(newValue));
        }
    }, [min, name, newValue, setValue, value.length]);

    const handleAdd = () => {
        setValue(name, [...value, clone(newValue)]);
    };
    return (
        <Box display='flex' flexDirection='column' alignItems='center' gap={2}>
            {tr('controls.' + label)}
            {value?.map((val: any, index: number) => (
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
