import { Casino } from '@mui/icons-material';
import { Box, Button, TextFieldProps, Tooltip } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { TextInput } from './TextInput';
import { useTranslate } from '../../i18n/I18nContext';
import { HelpButton } from './HelpButton';

export const SeedInput = ({
    seedLength = 13,
    defaultValue = 1024,
    ...props
}: {
    name: string;
    seedLength?: number;
    defaultValue?: number;
} & TextFieldProps) => {
    const { setValue } = useFormContext();
    const tr = useTranslate();
    const randomize = () => {
        const hexString = Array(seedLength)
            .fill(0)
            .map(() => Math.round(Math.random() * 0xf).toString(16))
            .join('');

        const randomBigInt = BigInt(`0x${hexString}`);
        setValue(props.name, parseInt(randomBigInt.toString()));
    };
    return (
        <Box display='flex' position='relative' gap={1} mt={1} mb={1}>
            <HelpButton title='seed' sx={{ right: 80 }} />
            <TextInput
                type='number'
                defaultValue={defaultValue}
                fullWidth
                {...props}
            />
            <Tooltip arrow title={tr('controls.randomize_seed')}>
                <Button
                    variant='outlined'
                    onClick={randomize}
                    size='large'
                    sx={{ height: 55 }}
                >
                    <Casino />
                </Button>
            </Tooltip>
        </Box>
    );
};
