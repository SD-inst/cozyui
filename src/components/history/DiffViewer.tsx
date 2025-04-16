import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Tab,
    Tabs,
    useTheme,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useIsPhone } from '../../hooks/useIsPhone';
import { useTranslate } from '../../i18n/I18nContext';
import { CompareContext } from '../contexts/CompareContext';
import { db } from './db';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';

const VideoCompare = () => {
    const { A_id, B_id, open } = useContext(CompareContext);
    const [loaded, setLoaded] = useState([false, false]);
    const [lbOpen, setLbOpen] = useState(false);
    const [index, setIndex] = useState(0);
    const refA = useRef<HTMLVideoElement>(null);
    const refB = useRef<HTMLVideoElement>(null);
    const refs = useMemo(() => [refA, refB], []);
    const seek_breaker = useRef([false, false]);
    useEffect(() => {
        if (!open) {
            setLoaded([false, false]);
        }
    }, [open]);
    useEffect(() => {
        if (!loaded.every((l) => l)) {
            return;
        }
        refs.forEach((r) => r.current?.play());
    }, [loaded, refs]);
    const tasks = useLiveQuery(() =>
        Promise.all([
            db.taskResults.get(A_id || 0),
            db.taskResults.get(B_id || 0),
        ])
    );
    if (!tasks || !tasks[0] || !tasks[1]) {
        return null;
    }
    const urls = tasks.map((t) =>
        t?.data ? URL.createObjectURL(t.data) : t?.url
    );
    const VideoViewer = ({ i }: { i: number }) => (
        <video
            key={i}
            src={urls[i]}
            ref={refs[i]}
            controls
            loop
            onCanPlay={() => {
                setLoaded((l) => {
                    if (l[i]) {
                        return l;
                    }
                    const newval = [...l];
                    newval[i] = true;
                    return newval;
                });
            }}
            onPause={() => refs[1 - i].current?.pause()}
            onPlay={() => refs[1 - i].current?.play()}
            onSeeking={() => {
                if (seek_breaker.current[i]) {
                    seek_breaker.current[i] = false;
                    return;
                }
                if (!refs[i].current || !refs[1 - i].current) {
                    return;
                }
                seek_breaker.current[1 - i] = true;
                refs[1 - i].current!.currentTime = refs[i].current.currentTime;
            }}
            style={{ maxWidth: '100%' }}
        />
    );
    const ImageViewer = ({ i }: { i: number }) => (
        <img
            src={urls[i]}
            style={{ maxWidth: '100%', cursor: 'pointer' }}
            onClick={() => {
                setIndex(i);
                setLbOpen(true);
            }}
        />
    );
    return (
        <Box
            display='flex'
            flexDirection='row'
            flexWrap='wrap'
            alignItems='center'
            justifyContent='center'
        >
            {[0, 1].map((i) => (
                <Box
                    sx={{
                        maxWidth: {
                            xs: 200,
                            md: 300,
                            lg: 400,
                        },
                    }}
                >
                    {tasks[i]?.type === 'gifs' ? <VideoViewer i={i} /> : null}
                    {tasks[i]?.type === 'images' ? <ImageViewer i={i} /> : null}
                </Box>
            ))}
            <Lightbox
                open={lbOpen}
                index={index}
                close={() => setLbOpen(false)}
                slides={urls
                    .filter((u) => u !== undefined)
                    .map((u) => ({ src: u }))}
                carousel={{ finite: true }}
                animation={{ navigation: 0 }}
                plugins={[Zoom, Fullscreen]}
                zoom={{ scrollToZoom: true, maxZoomPixelRatio: 5 }}
            />
        </Box>
    );
};

export const DiffViewer = () => {
    const [diffJsonWords, setDiffJsonWords] = useState();
    const [tab, setTab] = useState('json');
    useEffect(() => {
        // https://github.com/kpdecker/jsdiff/issues/579#issuecomment-2671520352
        Promise.all([
            // @ts-expect-error I know what I'm doing
            import('diff/lib/diff/json.js'),
            // @ts-expect-error I know what I'm doing
            import('diff/lib/diff/word.js'),
        ]).then((p) => {
            p[0].jsonDiff.tokenize = p[1].wordDiff.tokenize;
            // have to wrap it in a function, otherwise React tries to call p[0].diffJson and crashes
            setDiffJsonWords(() => p[0].diffJson);
        });
    }, []);
    const tr = useTranslate();
    const { setCompare, jsonA, jsonB, open } = useContext(CompareContext);
    const handleClose = () => {
        setCompare((v) => ({ ...v, open: false }));
        setTab('json');
    };
    const {
        palette: { mode },
    } = useTheme();
    const phone = useIsPhone();
    const singleJson = !jsonA;
    return (
        <Dialog
            open={open}
            onClose={handleClose}
            onKeyUp={(e) =>
                (e.key === 'Enter' || e.key === 'Esc') && handleClose()
            }
            maxWidth='lg'
        >
            <DialogTitle>
                {singleJson
                    ? tr('controls.generation_params')
                    : tr('controls.difference')}
            </DialogTitle>
            <DialogContent>
                {singleJson ? (
                    <ReactDiffViewer
                        newValue={jsonB}
                        useDarkTheme={mode === 'dark'}
                        splitView={false}
                        compareMethod={diffJsonWords}
                        hideLineNumbers
                        styles={
                            {
                                diffContainer: { minWidth: 200 },
                                marker: { visibility: 'hidden' },
                                summary: { display: 'none' },
                                diffAdded: { backgroundColor: 'transparent' },
                            } as any
                        } // TODO: fix temporary "as any"
                    />
                ) : (
                    <>
                        <Tabs onChange={(_, v) => setTab(v)} value={tab}>
                            <Tab
                                label={tr('controls.tab_json_diff')}
                                value='json'
                            />
                            <Tab
                                label={tr('controls.tab_media_diff')}
                                value='video'
                            />
                        </Tabs>
                        {tab === 'json' ? (
                            <ReactDiffViewer
                                oldValue={jsonA}
                                newValue={jsonB}
                                useDarkTheme={mode === 'dark'}
                                splitView={!phone}
                                compareMethod={diffJsonWords}
                                hideLineNumbers
                                styles={{ diffContainer: { minWidth: 200 } }}
                            />
                        ) : (
                            <VideoCompare />
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{tr('controls.close')}</Button>
            </DialogActions>
        </Dialog>
    );
};
