import { FormControl, InputLabel, Select, SelectProps } from '@mui/material';
import { Ref } from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import { HelpButton } from './HelpButton';

export type SelectControlProps<T> = {
    label: string;
    tooltip?: string;
} & SelectProps<T>;

export const SelectControl = <T,>({
    label,
    tooltip,
    selectRef,
    ...props
}: { selectRef?: Ref<any> } & SelectControlProps<T>) => {
    const tr = useTranslate();
    return (
        <FormControl
            fullWidth
            sx={{
                wordWrap: 'normal',
                display: 'flex',
                flexDirection: 'row',
                ...props.sx,
            }}
        >
            <InputLabel>{tr(label)}</InputLabel>
            <Select
                label={tr(label)}
                sx={{
                    '& .MuiSelect-select': {
                        whiteSpace: 'normal !important',
                    },
                    flex: 1,
                }}
                ref={selectRef}
                {...props}
            >
                {props.children}
            </Select>
            {tooltip && (
                <HelpButton
                    title={tooltip}
                    sx={{ position: 'relative', top: 15 }}
                />
            )}
        </FormControl>
    );
};
