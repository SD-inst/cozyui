import { Typography } from '@mui/material';
import { get } from 'lodash';
import { useAppSelector } from '../../redux/hooks';
import { VerticalBox } from '../VerticalBox';

export const VideoResult = () => {
    const resultStore = useAppSelector((s) => s.result);
    const current_tab = useAppSelector((s) => s.tab.current_tab);
    const { id, type } = useAppSelector((s) =>
        get(s, `config.tabs["${current_tab}"].result`, {
            id: '',
            type: '',
        })
    );
    let results = get(resultStore, `["${id}"]["${type}"]`, []);
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
