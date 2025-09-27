import { Casino } from '@mui/icons-material';
import { Box, Button, TextFieldProps, Tooltip } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { bigRandom } from '../../api/utils';
import { useTranslate } from '../../i18n/I18nContext';
import { HelpButton } from './HelpButton';
import { TextInput } from './TextInput';

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
        const randomBigInt = bigRandom(seedLength);
        setValue(props.name, parseInt(randomBigInt));
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
