import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tab,
    Tabs,
    Typography,
    useTheme,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    KeyboardEvent,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { formatDuration } from '../../hooks/useTaskDuration';
import { matchTimings, NodeTiming } from '../../utils/nodeTimings';
import { useIsPhone } from '../../hooks/useIsPhone';
import { useTranslate } from '../../i18n/I18nContext';
import { CompareContext } from '../contexts/CompareContext';
import { TaskResult } from './db';
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
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (document.fullscreenElement) {
                setTimeout(
                    () => (document.fullscreenElement as HTMLElement).focus(),
                    0,
                );
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange,
            );
        };
    }, []);
    const tasks = useLiveQuery(
        () =>
            Promise.all([
                db.taskResults.get(A_id || 0),
                db.taskResults.get(B_id || 0),
        ]), [A_id, B_id]
    );
    if (!tasks || !tasks[0] || !tasks[1]) {
        return null;
    }
    const urls = tasks.map((t): string | undefined => {
        if (!t) return undefined;
        if (Array.isArray(t.data)) {
            return t.data.length > 0 ? URL.createObjectURL(t.data[0]) : undefined;
        }
        if (t.data) {
            return URL.createObjectURL(t.data);
        }
        if (Array.isArray(t.url)) {
            return t.url[0];
        }
        return t.url;
    });
    const VideoViewer = ({ i }: { i: number }) => (
        <video
            key={i}
            src={urls[i]}
            ref={refs[i]}
            controls
            loop
            playsInline
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
            onKeyDown={(e: KeyboardEvent<HTMLVideoElement>) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    refs[1 - i].current?.requestFullscreen();
                }
            }}
        >
            <track
                label='Numbers'
                kind='subtitles'
                default
                src={`subs/${i + 1}.vtt`}
            />
        </video>
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
                    key={i}
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
                    .filter((u): u is string => u !== undefined)
                    .map((u) => ({ src: u }))}
                carousel={{ finite: true }}
                animation={{ navigation: 0 }}
                plugins={[Zoom, Fullscreen]}
                zoom={{ scrollToZoom: true, maxZoomPixelRatio: 5 }}
            />
        </Box>
    );
};

const getParamValues = (task?: TaskResult): any => {
    if (!task?.params) {
        return {};
    }
    try {
        return JSON.parse(task.params).values || {};
    } catch {
        return {};
    }
};

const parseTimings = (task?: TaskResult): NodeTiming[] => {
    if (!task?.timings) {
        return [];
    }
    try {
        return JSON.parse(task.timings) as NodeTiming[];
    } catch {
        return [];
    }
};

// Side-by-side per-node timings of two runs. Phases are matched by node
// id (static nodes keep the same id across runs), falling back to the phase
// label for dynamically inserted nodes that get a new id every run (see
// matchTimings). Sampler phases are additionally shown normalized per step,
// since their duration depends on the steps parameter.
const TimingsCompare = () => {
    const tr = useTranslate();
    const { A_id, B_id } = useContext(CompareContext);
    const tasks = useLiveQuery(
        () =>
            Promise.all([
                db.taskResults.get(A_id || 0),
                db.taskResults.get(B_id || 0),
            ]),
        [A_id, B_id]
    );
    const taskA = tasks?.[0];
    const taskB = tasks?.[1];
    const tA = useMemo(() => parseTimings(taskA), [taskA]);
    const tB = useMemo(() => parseTimings(taskB), [taskB]);
    const rows = useMemo(() => matchTimings(tA, tB), [tA, tB]);
    if (!tasks || !tasks[0] || !tasks[1]) {
        return null;
    }
    const valuesA = getParamValues(tasks[0]);
    const valuesB = getParamValues(tasks[1]);
    const stepsA = Number(valuesA.steps) || 0;
    const stepsB = Number(valuesB.steps) || 0;
    const rate = (t?: NodeTiming, steps = 0) => {
        if (!t || !steps || !/Sampler/i.test(t.cls || t.label)) {
            return '—';
        }
        return `${(t.ms / steps / 1000).toFixed(2)} ${tr('controls.per_step')}`;
    };
    if (!tA.length && !tB.length) {
        return (
            <Typography variant='body1' align='center' sx={{ my: 2 }}>
                {tr('controls.no_timings')}
            </Typography>
        );
    }
    return (
        <Box>
            <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 1, lineHeight: 1.6 }}
            >
                A: {new Date(tasks[0].timestamp).toLocaleString()} ·{' '}
                {tr('controls.steps')}: {stepsA || '—'} ·{' '}
                {tr('controls.length')}: {valuesA.length ?? '—'} ·{' '}
                {tr('controls.total_time')}:{' '}
                {formatDuration(tasks[0].duration / 1000)}
                <br />
                B: {new Date(tasks[1].timestamp).toLocaleString()} ·{' '}
                {tr('controls.steps')}: {stepsB || '—'} ·{' '}
                {tr('controls.length')}: {valuesB.length ?? '—'} ·{' '}
                {tr('controls.total_time')}:{' '}
                {formatDuration(tasks[1].duration / 1000)}
            </Typography>
            <Table size='small'>
                <TableHead>
                    <TableRow>
                        <TableCell>{tr('controls.phase')}</TableCell>
                        <TableCell align='right'>A</TableCell>
                        <TableCell align='right'>B</TableCell>
                        <TableCell align='right'>Δ</TableCell>
                        <TableCell align='right'>
                            A ({tr('controls.per_step')})
                        </TableCell>
                        <TableCell align='right'>
                            B ({tr('controls.per_step')})
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((r, i) => {
                        const delta = r.a && r.b ? r.a.ms - r.b.ms : null;
                        return (
                            <TableRow key={i + ':' + (r.a?.node || r.b?.node)}>
                                <TableCell>{r.label}</TableCell>
                                <TableCell align='right'>
                                    {r.a
                                        ? formatDuration(r.a.ms / 1000)
                                        : '—'}
                                </TableCell>
                                <TableCell align='right'>
                                    {r.b
                                        ? formatDuration(r.b.ms / 1000)
                                        : '—'}
                                </TableCell>
                                <TableCell
                                    align='right'
                                    sx={{
                                        color:
                                            delta === null
                                                ? 'inherit'
                                                : delta > 0
                                                  ? 'error.main'
                                                  : 'success.main',
                                    }}
                                >
                                    {delta === null
                                        ? '—'
                                        : `${delta > 0 ? '+' : '-'}${Math.abs(
                                              delta / 1000,
                                          ).toFixed(1)} s`}
                                </TableCell>
                                <TableCell align='right'>
                                    {rate(r.a, stepsA)}
                                </TableCell>
                                <TableCell align='right'>
                                    {rate(r.b, stepsB)}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
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
                            <Tab
                                label={tr('controls.tab_timings_diff')}
                                value='timings'
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
                        ) : tab === 'timings' ? (
                            <TimingsCompare />
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
