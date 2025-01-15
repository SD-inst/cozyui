import { Typography } from '@mui/material';
import { useResult } from '../StatusContext';
import { useTabContext } from '../TabContext';
import { VerticalBox } from '../VerticalBox';

export const VideoResult = () => {
    const tb = useTabContext();
    const results = useResult(tb.result?.id, tb.result?.type);
    return (
        <VerticalBox width='100%'>
            <Typography variant='body1'>Video</Typography>
            {results?.map((r) => (
                <video
                    key={r.filename}
                    style={{ width: '100%' }}
                    src={`/cui/api/view?filename=${r.filename}&subfolder=${r.subfolder}&type=${r.type}`}
                    controls
                    autoPlay
                    loop
                />
            ))}
        </VerticalBox>
    );
};
