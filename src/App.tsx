import '@fontsource/roboto/400.css';
import { createTheme, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import './App.css';
import { Log } from './components/Log';
import { Progress } from './components/Progress';
import { Queue } from './components/Queue';
import { TabContextProvider } from './components/TabContext';
import { WSReceiver } from './components/WSReceiver';
import { WorkflowTabs } from './components/WorkflowTabs';
import { HunyanT2VTab } from './components/tabs/HunyuanT2V';
import { LTXI2VTab } from './components/tabs/LTXI2V';
import { VerticalBox } from './components/VerticalBox';

const queryClient = new QueryClient();

function App() {
    const [id] = useState(
        [...Array(32)]
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join('')
    );
    const [progress, setProgress] = useState({ max: 0, value: -1 });
    const [queue, setQueue] = useState(0);
    const [disabled, setDisabled] = useState(true);
    const [result, setResult] = useState<any>(null);
    const reset = () => {
        setProgress({ max: 0, value: -1 });
        setDisabled(false);
    };
    const onComplete = (data: any) => {
        setResult(
            data.output.gifs.map((gif: any) => ({
                filename: gif.filename,
                type: gif.type,
                subfolder: gif.subfolder,
            }))
        );
        reset();
    };
    const onError = (data: any) => {
        toast.error(data.exception_message);
        setDisabled(false);
    };
    const [log, setLog] = useState<string[]>([]);
    const theme = createTheme({
        colorSchemes: { dark: true, light: true },
        defaultColorScheme: 'dark',
    });
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <WSReceiver
                    onStatus={(d) => setQueue(d?.exec_info?.queue_remaining)}
                    id={id}
                    onConnected={reset}
                    onProgress={(d) =>
                        setProgress({ max: d.max, value: d.value })
                    }
                    onInterrupted={reset}
                    onComplete={onComplete}
                    onError={onError}
                />
                <VerticalBox>
                    <TabContextProvider>
                        <WorkflowTabs
                            id={id}
                            disabled={disabled}
                            setDisabled={setDisabled}
                        >
                            {HunyanT2VTab}
                            {LTXI2VTab}
                        </WorkflowTabs>
                    </TabContextProvider>
                    <Queue queue={queue} />
                    <Progress min={0} {...progress} />
                    {result?.map((g: any, i: number) => (
                        <video
                            style={{ maxWidth: 200 }}
                            key={i}
                            src={`/cui/api/view?filename=${g.filename}&subfolder=${g.subfolder}&type=${g.type}`}
                            controls
                            autoPlay
                            loop
                        />
                    ))}
                    <Log lines={log} />
                </VerticalBox>
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
