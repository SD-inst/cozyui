import { Box, Typography } from '@mui/material';

export const Log = ({ lines, ...props }: { lines: string[] }) => {
    return (
        <Box display='flex' flexDirection='column' gap={1}>
            {lines.map((l, i) => (
                <Typography key={i} variant='body1'>
                    {l}
                </Typography>
            ))}
        </Box>
    );
};
