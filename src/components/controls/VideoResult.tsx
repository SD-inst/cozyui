import { Typography } from '@mui/material';
import { useResult } from '../../hooks/useResult';
import { VerticalBox } from '../VerticalBox';

export const VideoResult = () => {
    let results = useResult();
    return (
        <VerticalBox width='100%'>
            <Typography variant='body1'>Video</Typography>
            {results?.map((r: any) => (
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
