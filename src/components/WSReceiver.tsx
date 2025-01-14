import toast from 'react-hot-toast';
import { useWebSocket } from '../hooks/useWebSocket';

export type WSHandlers = {
    onStatus?: (data: any) => void;
    onProgress?: (data: any) => void;
    onConnected?: () => void;
    onComplete?: (data: any) => void;
};

export const WSReceiver = ({
    id,
    onStatus,
    onConnected,
    onStart,
    onProgress,
    onError,
    onExecuted,
    onExecuting,
    onComplete,
    onInterrupted,
}: {
    id: string;
    onStatus: (data: any) => void;
    onConnected?: () => void;
    onStart?: () => void;
    onComplete?: () => void;
    onExecuted?: (data: any) => void;
    onExecuting?: (data: any) => void;
    onProgress?: (data: any) => void;
    onError?: (data: any) => void;
    onInterrupted?: () => void;
}) => {
    const handleMessage = (ev: MessageEvent) => {
        console.log(ev.data);
        const j = JSON.parse(ev.data);
        switch (j.type) {
            case 'execution_success':
                onComplete && onComplete();
                break;
            case 'execution_start':
                onStart && onStart();
                break;
            case 'executed':
                onExecuted && onExecuted(j.data);
                break;
            case 'executing':
                onExecuting && onExecuting(j.data);
                break;
            case 'status':
                onStatus && onStatus(j.data.status);
                break;
            case 'progress':
                onProgress && onProgress(j.data);
                break;
            case 'execution_error':
                onError && onError(j.data);
                break;
            case 'execution_interrupted':
                onInterrupted && onInterrupted();
                break;
        }
    };
    useWebSocket('/cui/ws?clientId=' + id, handleMessage, () => {
        console.log('Connected to ComfyUI!');
        toast.success('Connected!');
        onConnected && onConnected();
    });
    return null;
};
