import { FormControl, InputLabel, Select, SelectProps } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { HelpButton } from './HelpButton';

export const SelectControl = <T,>({
    label,
    tooltip,
    ...props
}: {
    label: string;
    tooltip?: string;
} & SelectProps<T>) => {
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
