import { useResult } from '../StatusContext';
import { useTabContext } from '../TabContext';

export const VideoResult = () => {
    const tb = useTabContext();
    const r = useResult(tb.result?.id, tb.result?.type);
    if (!r?.length) {
        return null;
    }
    return (
        <video
            style={{ maxWidth: 200 }}
            src={`/cui/api/view?filename=${r[0].filename}&subfolder=${r[0].subfolder}&type=${r[0].type}`}
            controls
            autoPlay
            loop
        />
    );
};
