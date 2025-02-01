import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { makeOutputUrl } from '../api/utils';
import { db, TaskResult } from '../components/history/db';
import { useAppSelector } from '../redux/hooks';
import { statusEnum } from '../redux/progress';
import { actionEnum } from '../redux/tab';
import { useResult, useResultParam } from './useResult';
import { useApiURL } from './useApiURL';
import { useSaveOutputsLocally } from './useSaveOutputsLocally';

export const useSaveToHistory = ({
    id,
    type,
}: {
    id?: string;
    type?: string;
}) => {
    const apiUrl = useApiURL();
    const results = useResult({ id, type });
    const { id: id_r, type: type_r } = useResultParam({ id, type });
    const { start_ts, end_ts, status } = useAppSelector((s) => s.progress);
    const { action, tab, values } = useAppSelector((s) => s.tab.params);
    const save_locally = useSaveOutputsLocally();
    useEffect(() => {
        // store result to IndexedDB history
        if (
            !start_ts ||
            !end_ts ||
            !results.length ||
            status !== statusEnum.FINISHED ||
            !type_r ||
            !id_r ||
            action !== actionEnum.STORE
        ) {
            return;
        }
        (async () => {
            const task_results = await Promise.all(
                results.map(async (r: any) => {
                    const url = makeOutputUrl(apiUrl, r);
                    let data = undefined;
                    if (save_locally) {
                        const result = await fetch(url);
                        data = await result.blob();
                    }
                    return {
                        timestamp: end_ts,
                        duration: end_ts - start_ts,
                        type: type_r,
                        node_id: id_r,
                        params: JSON.stringify({ tab, values }),
                        url,
                        data,
                    } as TaskResult;
                })
            );
            return db.transaction('rw', db.taskResults, async (tx) => {
                const exists = await tx.taskResults
                    .where({ timestamp: end_ts, node_id: id_r })
                    .count();
                if (exists > 0) {
                    return;
                }
                return tx.taskResults.bulkAdd(task_results);
            });
        })()
            .then(() => {
                console.log('History updated');
            })
            .catch((e) => {
                toast.error('Error saving history: ' + e);
                console.log(e);
            });
    }, [
        action,
        apiUrl,
        end_ts,
        id_r,
        results,
        save_locally,
        start_ts,
        status,
        tab,
        type,
        type_r,
        values,
    ]);
};
