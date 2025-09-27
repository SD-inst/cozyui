import { useEventCallback } from '@mui/material';
import toast from 'react-hot-toast';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTranslate, useTranslateReady } from '../i18n/I18nContext';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { initPreview, setFrame } from '../redux/preview';
import {
    setConnected,
    setCurrentNode,
    setGenerationEnd,
    setGenerationStart,
    setProgress,
    setQueue,
    setStatus,
    setStatusMessage,
    statusEnum,
} from '../redux/progress';
import { addResult, clearPrompt } from '../redux/tab';
import { useRef } from 'react';

export type WSHandlers = {
    onStatus?: (data: any) => void;
    onProgress?: (data: any) => void;
    onConnected?: () => void;
    onComplete?: (data: any) => void;
};

export const WSReceiver = () => {
    const lastProgressUpdate = useRef<any>(null);
    const lastProgressUpdateTO = useRef(0);
    const tr = useTranslate();
    const tr_ready = useTranslateReady();
    const dispatch = useAppDispatch();
    const reset = useEventCallback((noPromptReset?: boolean) => {
        dispatch(setProgress({ max: 0, value: -1 }));
        dispatch(setCurrentNode(''));
        dispatch(setGenerationEnd());
        dispatch(initPreview({ length: 0, rate: 0 }));
        if (!noPromptReset) {
            dispatch(clearPrompt());
        }
    });
    const client_id = useAppSelector((s) => s.config.client_id);
    const apiUrl = useAppSelector((s) => s.config.api);
    const status = useAppSelector((s) => s.progress.status);
    const handleMessage = useEventCallback((ev: MessageEvent) => {
        if (ev.data instanceof ArrayBuffer) {
            const dv = new DataView(ev.data.slice(0, 16));
            const f1 = dv.getUint32(0);
            const f2 = dv.getUint32(4);
            const f3 = dv.getUint32(8);
            if (f1 !== 1 || f2 !== 1 || f3 !== 1) {
                return;
            }
            const idx = dv.getUint32(12);
            window
                .createImageBitmap(new Blob([ev.data.slice(32)]))
                .then((image) => dispatch(setFrame({ idx, image })));

            return;
        }
        const j = JSON.parse(ev.data);
        if (j.type !== 'progress' && j.type !== 'progress_state') {
            // less spam
            console.log(ev.data);
        }
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
                        prompt_id: j.data.prompt_id,
                        node_id: j.data.node,
                        output: j.data.output,
                    })
                );
                break;
            case 'executing':
                dispatch(setCurrentNode(j.data.node || ''));
                break;
            case 'status':
                dispatch(setQueue(j.data.status?.exec_info?.queue_remaining));
                break;
            case 'progress':
                // rate limit progress updates to not trigger React
                // store the latest progress in ref, update once in 100 ms
                lastProgressUpdate.current = j.data;
                if (lastProgressUpdateTO.current) {
                    break;
                }
                lastProgressUpdateTO.current = window.setTimeout(() => {
                    lastProgressUpdateTO.current = 0;
                    if (status !== statusEnum.RUNNING) {
                        return;
                    }
                    dispatch(
                        setProgress({
                            max: lastProgressUpdate.current.max,
                            value: lastProgressUpdate.current.value,
                        })
                    );
                }, 100);
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
                reset(true); // don't reset promptId, it should've been done by InterruptButton (IB) already; if we reset here the user could've started another generation between pressing IB and GB and we'd cause a state race condition (GB enabled, IB missing, but generation is going on). Happens with long step duration.
                break;
            case 'VHS_latentpreview':
                dispatch(initPreview(j.data));
                break;
        }
    });
    const handleOpen = useEventCallback(() => {
        dispatch(setConnected(true));
        console.log('Connected to ComfyUI!');
        toast.success(tr('toasts.connected'));
    });
    const handleClose = useEventCallback(() => {
        dispatch(setConnected(false));
        console.log('Disconnected from ComfyUI');
        toast.error(tr('toasts.disconnected'));
    });
    useWebSocket(
        apiUrl + '/ws?clientId=' + client_id,
        handleMessage,
        handleOpen,
        handleClose,
        !!apiUrl && tr_ready
    );
    return null;
};
