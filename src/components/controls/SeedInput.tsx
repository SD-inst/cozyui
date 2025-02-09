import { Casino } from '@mui/icons-material';
import { Box, Button, TextFieldProps, Tooltip } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { TextInput } from './TextInput';

export const SeedInput = ({
    ...props
}: { name: string; defaultValue?: number } & TextFieldProps) => {
    const { setValue } = useFormContext();
    const randomize = () => {
        const hexString = Array(8)
            .fill(0)
            .map(() => Math.round(Math.random() * 0xf).toString(16))
            .join('');

        const randomBigInt = BigInt(`0x${hexString}`);
        setValue(props.name, parseInt(randomBigInt.toString()));
    };
    return (
        <Box display='flex' gap={1} mt={1} mb={1}>
            <TextInput type='number' fullWidth {...props} />
            <Tooltip arrow title='Randomize seed'>
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
