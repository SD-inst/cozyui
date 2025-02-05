import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
    setCurrentNode,
    setGenerationEnd,
    setGenerationStart,
    setProgress,
    setQueue,
    setStatus,
    setStatusMessage,
    statusEnum,
} from '../redux/progress';
import { addResult } from '../redux/result';
import { setPromptId } from '../redux/tab';

export type WSHandlers = {
    onStatus?: (data: any) => void;
    onProgress?: (data: any) => void;
    onConnected?: () => void;
    onComplete?: (data: any) => void;
};

export const WSReceiver = () => {
    const dispatch = useAppDispatch();
    const reset = useCallback(() => {
        dispatch(setProgress({ max: 0, value: -1 }));
        dispatch(setCurrentNode(''));
        dispatch(setGenerationEnd());
        dispatch(setPromptId(''));
    }, [dispatch]);
    const client_id = useAppSelector((s) => s.config.client_id);
    const apiUrl = useAppSelector((s) => s.config.api);
    const handleMessage = useCallback(
        (ev: MessageEvent) => {
            console.log(ev.data);
            const j = JSON.parse(ev.data);
            switch (j.type) {
                case 'execution_success':
                    dispatch(setStatus(statusEnum.FINISHED));
                    reset();
                    break;
                case 'execution_start':
                    dispatch(setStatus(statusEnum.RUNNING));
                    dispatch(setGenerationStart());
                    break;
                case 'executed':
                    dispatch(
                        addResult({
                            node_id: j.data.node,
                            output: j.data.output,
                        })
                    );
                    break;
                case 'executing':
                    dispatch(setCurrentNode(j.data.node || ''));
                    break;
                case 'status':
                    dispatch(
                        setQueue(j.data.status?.exec_info?.queue_remaining)
                    );
                    break;
                case 'progress':
                    dispatch(
                        setProgress({
                            max: j.data.max,
                            value: j.data.value,
                        })
                    );
                    break;
                case 'execution_error':
                    toast.error(j.data.exception_message);
                    dispatch(
                        setStatusMessage({
                            status: statusEnum.ERROR,
                            message: j.data.exception_message,
                        })
                    );
                    reset();
                    break;
                case 'execution_interrupted':
                    dispatch(setStatus(statusEnum.INTERRUPTED));
                    reset();
                    break;
            }
        },
        [dispatch, reset]
    );
    const handleOpen = useCallback(() => {
        console.log('Connected to ComfyUI!');
        toast.success('Connected!');
    }, []);
    useWebSocket(
        apiUrl + '/ws?clientId=' + client_id,
        handleMessage,
        handleOpen,
        !!apiUrl
    );
    return null;
};
