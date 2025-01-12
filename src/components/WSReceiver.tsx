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
    onProgress,
    onError,
    onComplete,
    onInterrupted,
    ...props
}: {
    id: string;
    onStatus: (data: any) => void;
    onConnected?: () => void;
    onComplete?: (data: any) => void;
    onProgress?: (data: any) => void;
    onError?: (data: any) => void;
    onInterrupted?: () => void;
}) => {
    const handleMessage = (ev: MessageEvent) => {
        console.log(ev.data);
        const j = JSON.parse(ev.data);
        switch (j.type) {
            case 'executed':
                onComplete && onComplete(j.data);
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
