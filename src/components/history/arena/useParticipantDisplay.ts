import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, TaskResult } from '../db';
import { ArenaParticipant } from '../../../utils/arena';

// Resolves a competitor's media from the source history record and returns a
// ready-to-use `display` URL (object URL for local blobs, regular URL otherwise).
// Shared between the small media preview and the lightbox so both render the
// same blob without duplicate fetches.
export const useParticipantDisplay = (participant?: ArenaParticipant) => {
    const source = useLiveQuery<TaskResult | undefined>(
        () =>
            participant
                ? db.taskResults.get(participant.taskResultId)
                : Promise.resolve(undefined),
        [participant],
    );
    const [dataUrl, setDataUrl] = useState('');
    useEffect(() => {
        let url = '';
        if (source && participant) {
            const data = Array.isArray(source.data)
                ? source.data[participant.assetIndex]
                : source.data;
            if (data) url = URL.createObjectURL(data);
        }
        setDataUrl(url);
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [source, participant]);
    const url =
        participant && source
            ? Array.isArray(source.url)
                ? source.url[participant.assetIndex]
                : source.url
            : undefined;
    const display = dataUrl || url || '';
    return { source, display, loading: source === undefined };
};
