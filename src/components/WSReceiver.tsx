import { useEventCallback } from '@mui/material';
import toast from 'react-hot-toast';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTranslate, useTranslateReady } from '../i18n/I18nContext';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { initPreview, setFrame } from '../redux/preview';
import {
    addNodeEvent,
    clearNodeEvents,
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
import { updateNoCache } from '../api/utils';

export type WSHandlers = {
    onStatus?: (data: any) => void;
    onProgress?: (data: any) => void;
    onConnected?: () => void;
    onComplete?: (data: any) => void;
};

export const WSReceiver = () => {
    const lastProgressUpdate = useRef<any>({});
    const lastProgressUpdateTO = useRef(0);
    const lastProgressNode = useRef('');
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
    const node_events = useAppSelector((s) => s.progress.node_events);
    const prompts = useAppSelector((s) => s.tab.prompt);
    lastProgressUpdate.current.status = status;
    // The container can start up after we've sent the prompt, and the WS
    // reconnect during that window drops the initial execution_start message.
    // Any real activity message (executing / progress) from our own task means
    // the run is live — recover the RUNNING status so the progress bar and
    // interrupt button appear.
    const markRunning = () => {
        if (status !== statusEnum.RUNNING) {
            dispatch(setStatus(statusEnum.RUNNING));
            dispatch(setGenerationStart());
        }
    };
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
        // Drop events for a prompt that is no longer the active one. A cancel
        // takes a few seconds on the ComfyUI side, so after a cancel followed
        // by an immediate restart the OLD prompt's terminal events (mainly
        // execution_interrupted, but executed/progress/error can also arrive
        // late) land AFTER the new prompt is already registered in `prompts`.
        // Without this guard they clobber the new run: reset() clears the
        // prompt entry (so the interrupt button disappears and the result is
        // filed under a temporary key instead of the tab). Events with no
        // prompt_id (e.g. queue `status`) always pass through; when no prompt
        // is active (the run the client just finalized) events pass too.
        const active_prompt_ids = Object.keys(prompts);
        if (
            active_prompt_ids.length > 0 &&
            j.data?.prompt_id &&
            !active_prompt_ids.includes(j.data.prompt_id)
        ) {
            return;
        }
        switch (j.type) {
            case 'execution_success':
                dispatch(setStatus(statusEnum.FINISHED));
                reset();
                break;
            case 'execution_start':
                // The proxy may re-send execution_start mid-run (e.g. after a
                // WS reconnect); keep the events collected so far in that case.
                if (status === statusEnum.RUNNING && node_events.length > 0) {
                    console.warn(
                        '[node_events] execution_start mid-run, keeping collected events',
                    );
                } else {
                    dispatch(clearNodeEvents());
                }
                lastProgressNode.current = '';
                dispatch(setStatus(statusEnum.RUNNING));
                dispatch(setGenerationStart());
                break;
            case 'executed':
                updateNoCache();
                dispatch(
                    addNodeEvent({
                        node: j.data.node || '',
                        ts: new Date().getTime(),
                        type: 'executed',
                    }),
                );
                dispatch(
                    addResult({
                        prompt_id: j.data.prompt_id,
                        node_id: j.data.node,
                        output: j.data.output,
                    }),
                );
                break;
            case 'executing':
                // A node is actively running our task — recover if we missed
                // the initial execution_start (covers nodes without progress).
                if (j.data.node) {
                    markRunning();
                }
                dispatch(setCurrentNode(j.data.node || ''));
                dispatch(
                    addNodeEvent({
                        node: j.data.node || '',
                        ts: new Date().getTime(),
                        type: 'executing',
                    }),
                );
                break;
            case 'status':
                dispatch(setQueue(j.data.status?.exec_info?.queue_remaining));
                break;
            case 'progress':
                // node boundary marker (backup for executing/executed)
                if (j.data.node && j.data.node !== lastProgressNode.current) {
                    // Real progress data from our task — recover if we missed the
                    // initial execution_start.
                    markRunning();
                    lastProgressNode.current = j.data.node;
                    dispatch(
                        addNodeEvent({
                            node: j.data.node,
                            ts: new Date().getTime(),
                            type: 'progress',
                        }),
                    );
                }
                // rate limit progress updates to not trigger React
                // store the latest progress in ref, update once in 100 ms
                lastProgressUpdate.current = {
                    ...lastProgressUpdate.current,
                    ...j.data,
                };
                if (lastProgressUpdateTO.current) {
                    break;
                }
                lastProgressUpdateTO.current = window.setTimeout(() => {
                    lastProgressUpdateTO.current = 0;
                    if (
                        lastProgressUpdate.current.status !== statusEnum.RUNNING
                    ) {
                        setProgress({
                            max: 0,
                            value: 0,
                        });
                        return;
                    }
                    dispatch(
                        setProgress({
                            max: lastProgressUpdate.current.max,
                            value: lastProgressUpdate.current.value,
                        }),
                    );
                }, 100);
                break;
            case 'execution_error':
                toast.error(j.data.exception_message);
                dispatch(
                    setStatusMessage({
                        status: statusEnum.ERROR,
                        message: j.data.exception_message,
                    }),
                );
                reset();
                break;
            case 'execution_interrupted':
                // The task can be interrupted by an external proxy (timeout on
                // long-running generations) without the user pressing
                // InterruptButton (IB). IB clears the prompt and sets CANCELLED
                // itself, so when status is already CANCELLED we just finalize
                // (reset(true) skips the prompt, IB already did). Otherwise the
                // run is still marked RUNNING/WAITING and we must stop it here
                // (reset() clears the prompt), else the UI sticks on "Running"
                // with a stale interrupt button.
                dispatch(setStatus(statusEnum.INTERRUPTED));
                reset(status === statusEnum.CANCELLED);
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
        !!apiUrl && tr_ready,
    );
    return null;
};
