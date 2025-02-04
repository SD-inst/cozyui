import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { makeOutputUrl } from '../api/utils';
import { db, TaskResult } from '../components/history/db';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { statusEnum } from '../redux/progress';
import { actionEnum } from '../redux/tab';
import { useResult, useResultParam } from './useResult';
import { useApiURL } from './useApiURL';
import { settings, useBooleanSetting } from './useSaveOutputsLocally';
import { addResult } from '../redux/result';

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
    const save_locally = useBooleanSetting(settings.save_outputs_locally);
    const save_history = useBooleanSetting(settings.save_history);
    const dispatch = useAppDispatch();
    useEffect(() => {
        // store result to IndexedDB history
        if (
            !save_history ||
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
        // mark all as saved locally to prevent duplicates from other tabs later
        const saved_results = results
            .filter((r) => !r.saved_locally)
            .map((r) => ({
                ...r,
                saved_locally: true,
            }));
        if (saved_results.length) {
            dispatch(
                addResult({
                    node_id: id_r,
                    output: { [type_r]: saved_results },
                })
            );
        } else {
            return;
        }
        (async () => {
            const task_results = await Promise.all(
                saved_results.map(async (r: any) => {
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
            if (!task_results.length) {
                return;
            }
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
    }, [action, apiUrl, dispatch, end_ts, id_r, results, save_history, save_locally, start_ts, status, tab, type_r, values]);
};
