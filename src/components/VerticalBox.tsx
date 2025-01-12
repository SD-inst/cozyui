import { Box, BoxProps } from '@mui/material';

export const VerticalBox = ({ ...props }: BoxProps) => {
    return (
        <Box
            display='flex'
            flexDirection='column'
            gap={1}
            alignItems='center'
            {...props}
        >
            {props.children}
        </Box>
    );
};
