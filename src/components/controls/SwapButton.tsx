import { SwapVert } from '@mui/icons-material';
import { Button, ButtonProps } from '@mui/material';
import { useFormContext } from 'react-hook-form';

export const SwapButton = ({
    names,
    ...props
}: { names: string[] } & ButtonProps) => {
    const { getValues, setValue } = useFormContext();
    const handleSwap = () => {
        const vals = getValues(names);
        setValue(names[0], vals[1]);
        setValue(names[1], vals[0]);
    };
    return (
        <Button
            variant='outlined'
            color='primary'
            onClick={handleSwap}
            {...props}
        >
            <SwapVert />
        </Button>
    );
};
