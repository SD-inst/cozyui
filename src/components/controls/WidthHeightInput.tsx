import { Box } from '@mui/material';
import { HYSize } from './HYSize';
import { SwapButton } from './SwapButton';

export const WidthHeight = ({
    widthName = 'width',
    heightName = 'height',
    defaultWidth = 832,
    defaultHeight = 1280,
    maxWidth = 2048,
    maxHeight = 2048,
}: {
    widthName?: string;
    heightName?: string;
    defaultWidth?: number;
    defaultHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
}) => {
    return (
        <Box display='flex' flexDirection='row' width='100%'>
            <Box display='flex' flexDirection='column' flex={1}>
                <HYSize
                    name={widthName}
                    defaultValue={defaultWidth}
                    max={maxWidth}
                />
                <HYSize
                    name={heightName}
                    defaultValue={defaultHeight}
                    max={maxHeight}
                />
            </Box>
            <Box display='flex' alignItems='center'>
                <SwapButton names={[widthName, heightName]} sx={{ mt: 3 }} />
            </Box>
        </Box>
    );
};
