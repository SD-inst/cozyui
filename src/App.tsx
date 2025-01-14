import '@fontsource/roboto/400.css';
import { createTheme, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import './App.css';
import { Progress } from './components/Progress';
import { emptyStatus, status, StatusContext } from './components/StatusContext';
import { VerticalBox } from './components/VerticalBox';
import { WSReceiver } from './components/WSReceiver';
import { WorkflowTabs } from './components/WorkflowTabs';
import { HunyanT2VTab } from './components/tabs/HunyuanT2V';
import { LTXI2VTab } from './components/tabs/LTXI2V';

const queryClient = new QueryClient();

function App() {
    const [id] = useState(
        [...Array(32)]
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join('')
    );
    const [status, setStatus] = useState<status>({
        ...emptyStatus,
        generationDisabled: true,
    });
    const reset = () => {
        setStatus((s) => ({
            ...emptyStatus,
            result: s.result,
        }));
    };
    const onComplete = () => {
        reset();
    };
    const onStart = () => {
        setStatus((s) => ({
            ...emptyStatus,
            api: s.api,
            generationDisabled: true,
            status: 'Running',
        }));
    };
    const onExecuting = (data: any) =>
        setStatus((s: status) => ({
            ...s,
            currentNode: '' + (data.node || ''),
        }));
    const onExecuted = (data: any) =>
        setStatus((s: status) => ({
            ...s,
            result: {
                ...s.result,
                [data.node]: data.output,
            },
        }));
    const onError = (data: any) => {
        toast.error(data.exception_message);
    };
    const theme = createTheme({
        colorSchemes: { dark: true },
        defaultColorScheme: 'dark',
    });
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <WSReceiver
                    onStatus={(d) =>
                        setStatus((s: status) => ({
                            ...s,
                            queue: d?.exec_info?.queue_remaining,
                        }))
                    }
                    id={id}
                    onConnected={reset}
                    onProgress={(d) =>
                        setStatus((s: status) => ({
                            ...s,
                            progress: { min: 0, max: d.max, value: d.value },
                        }))
                    }
                    onStart={onStart}
                    onExecuted={onExecuted}
                    onExecuting={onExecuting}
                    onInterrupted={reset}
                    onComplete={onComplete}
                    onError={onError}
                />
                <StatusContext.Provider
                    value={{ ...status, client_id: id, setStatus }}
                >
                    <VerticalBox>
                        <WorkflowTabs id={id}>
                            {HunyanT2VTab}
                            {LTXI2VTab}
                        </WorkflowTabs>
                        <Progress />
                    </VerticalBox>
                </StatusContext.Provider>
                <Toaster
                    position='bottom-center'
                    toastOptions={{
                        style: {
                            background: theme.palette.background.default,
                            color: theme.palette.text.primary,
                        },
                    }}
                />
            </ThemeProvider>
        </QueryClientProvider>
    );
}

export default App;
