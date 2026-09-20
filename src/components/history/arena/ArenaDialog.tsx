import { OpenInFull } from '@mui/icons-material';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { db, TaskResult } from '../db';
import {
    ArenaParticipant,
    ArenaSummary,
    nextPair,
    summarize,
} from '../../../utils/arena';
import { useTranslate } from '../../../i18n/I18nContext';
import { CompareContext } from '../../contexts/CompareContext';
import { LoadParamsButton } from '../LoadParamsButton';
import { useArena } from './ArenaContext';
import { useParticipantDisplay } from './useParticipantDisplay';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';

// 1×1 transparent GIF: the Lightbox needs a valid `src` per slide to open, and
// the real media is rendered per-slide by `render.slide` (LightboxSlide).
const BLANK_SRC = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5TAwAAAAD';

// Whether a resolved source type is a zoomable image (as opposed to video/audio).
const isImageType = (type?: string) =>
    !!type && type !== 'gifs' && type !== 'audio';

// Resolves one participant's media and reports it to the ArenaLightbox. Renders
// nothing. It drives the slide `src` so image slides carry the REAL url (which
// is what lets the Lightbox's built-in ImageSlide render, so the Zoom plugin
// can zoom into fine detail); the media type then decides whether
// `render.slide` returns null (image → built-in ImageSlide) or draws the
// video/audio itself.
const SlideMediaResolver = ({
    participant,
    index,
    onResolve,
}: {
    participant?: ArenaParticipant;
    index: number;
    onResolve: (index: number, media: { display: string; type?: string }) => void;
}) => {
    const { display, source } = useParticipantDisplay(participant);
    const type = source?.type;
    useEffect(() => {
        onResolve(index, { display, type });
    }, [index, display, type, onResolve]);
    return null;
};

// Renders a competitor's media (image/video/audio) from a resolved `display`
// URL. The `display` URL is produced by `useParticipantDisplay` (object URL
// for local blobs, regular URL otherwise) so the small preview and the
// lightbox share a single blob URL instead of duplicating it.
const ParticipantAsset = ({
    participant,
    source,
    display,
    height = 260,
    fill = true,
}: {
    participant: ArenaParticipant;
    source?: TaskResult;
    display: string;
    height?: number | string;
    // `fill` stretches the media to the container width (standings rows:
    // uniform-width thumbnails). When false the media keeps its natural
    // (capped) size so the element box matches the image and a corner
    // overlay (the "view full" icon in the voting view) lands on the image,
    // not on the empty letterbox `objectFit:contain` would otherwise leave.
    fill?: boolean;
}) => {
    const tr = useTranslate();
    const mediaStyle = fill
        ? {
              width: '100%',
              maxHeight: height,
              objectFit: 'contain' as const,
          }
        : {
              maxWidth: '100%',
              maxHeight: height,
          };
    if (source === undefined) {
        return (
            <Box sx={{ height, width: fill ? '100%' : undefined, bgcolor: 'background.default' }} />
        );
    }
    if (!source) {
        return (
            <Typography variant='body2' color='textSecondary'>
                {tr('arena.missing')}
            </Typography>
        );
    }
    switch (source.type) {
        case 'gifs':
            return (
                <video
                    src={display}
                    controls
                    muted
                    loop
                    playsInline
                    preload='auto'
                    style={mediaStyle}
                />
            );
        case 'audio':
            return (
                <Box sx={{ py: 4 }}>
                    <Typography variant='body1' sx={{ mb: 1 }}>
                        {participant.label}
                    </Typography>
                    <audio src={display} controls style={{ width: '100%' }} />
                </Box>
            );
        default:
            return (
                <img
                    src={display}
                    alt={participant.label}
                    style={{
                        ...mediaStyle,
                        display: 'block',
                    }}
                />
            );
    }
};

// Renders one participant's media inside the lightbox, filling the slide
// container. Used by the lightbox's `render.slide` (both the A/B voting view
// and the finished-arena standings view), so images/videos/audio all work.
const LightboxSlide = ({ participant }: { participant?: ArenaParticipant }) => {
    const tr = useTranslate();
    const { source, display, loading } = useParticipantDisplay(participant);
    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 4,
                }}
            >
                <CircularProgress />
            </Box>
        );
    }
    if (!participant || !source) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 4,
                    color: 'textSecondary',
                }}
            >
                {tr('arena.missing')}
            </Box>
        );
    }
    switch (source.type) {
        case 'gifs':
            return (
                <video
                    src={display}
                    controls
                    muted
                    loop
                    playsInline
                    preload='auto'
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                    }}
                />
            );
        case 'audio':
            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        p: 4,
                    }}
                >
                    <audio src={display} controls style={{ width: '80%' }} />
                </Box>
            );
        default:
            return (
                <img
                    src={display}
                    alt=''
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                    }}
                />
            );
    }
};

// The arena lightbox. Wraps the library in a self-contained component that
// resolves the media for its current participants (so image slides carry the
// real url) and renders `render.slide` accordingly: images return null (the
// library's built-in ImageSlide renders, enabling the Zoom plugin for fine
// detail), while video/audio are drawn by LightboxSlide. `media` resets when
// the participant list changes (voting <-> standings, or a new pair) so a stale
// frame can't leak into the new list.
const ArenaLightbox = ({
    participants,
    open,
    index,
    onView,
    onClose,
    voteButtonRef,
    canVote,
    currentId,
    onVote,
    voteLabel,
}: {
    participants: (ArenaParticipant | undefined)[];
    open: boolean;
    index: number;
    onView: (i: number) => void;
    onClose: () => void;
    voteButtonRef: React.RefObject<HTMLButtonElement>;
    canVote: boolean;
    currentId: string;
    onVote: (winnerId: string) => void;
    voteLabel: string;
}) => {
    const [media, setMedia] = useState<
        Record<number, { display: string; type?: string }>
    >({});
    const handleResolve = useCallback(
        (i: number, m: { display: string; type?: string }) =>
            setMedia((prev) => ({ ...prev, [i]: m })),
        [],
    );
    const participantKey = participants.map((p) => (p ? p.key : 'x')).join('|');
    useEffect(() => {
        setMedia({});
    }, [participantKey]);

    const slides = participants.map((_, i) => ({
        src: media[i]?.display || BLANK_SRC,
        alt: String(i),
    }));

    return (
        <>
            {participants.map((p, i) => (
                <SlideMediaResolver
                    key={p ? p.key : `x-${i}`}
                    participant={p}
                    index={i}
                    onResolve={handleResolve}
                />
            ))}
            <Lightbox
                open={open}
                index={index}
                close={onClose}
                on={{ view: (props) => onView(props.index) }}
                slides={slides}
                carousel={{ finite: true }}
                animation={{ navigation: 0 }}
                plugins={[Zoom, Fullscreen]}
                zoom={{ scrollToZoom: true, maxZoomPixelRatio: 5 }}
                render={{
                    slide: (props) => {
                        const i = Number(
                            (props.slide as unknown as { alt?: string }).alt,
                        );
                        const m = media[i];
                        // Images: return null so the library's built-in ImageSlide
                        // renders the real `src` (above) — this is what the Zoom
                        // plugin hooks into to enable wheel / double-click zoom.
                        if (isImageType(m?.type)) return null;
                        // Video / audio: draw the media directly.
                        return <LightboxSlide participant={participants[i]} />;
                    },
                    controls: () =>
                        canVote ? (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 12,
                                    left: 0,
                                    right: 0,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    pointerEvents: 'none',
                                }}
                            >
                                <Button
                                    variant='contained'
                                    color='primary'
                                    ref={voteButtonRef}
                                    onClick={() => onVote(currentId)}
                                    sx={{
                                        pointerEvents: 'auto',
                                        // The button is kept focused (see the
                                        // effect in ArenaDialog) for Enter-to-vote;
                                        // suppress the focus ring on this overlay
                                        // button.
                                        '&:focus-visible': { outline: 'none' },
                                    }}
                                >
                                    {voteLabel}
                                </Button>
                            </Box>
                        ) : null,
                }}
            />
        </>
    );
};

const Confidence = ({ summary }: { summary: ArenaSummary }) => {
    const tr = useTranslate();
    const { confidence, winner } = summary;
    if (!winner || summary.matchesPlayed === 0) {
        return null;
    }
    const pct = Math.round(confidence.leaderProb * 100);
    const ci = Number.isFinite(confidence.ciHalfWidth)
        ? confidence.ciHalfWidth.toFixed(1)
        : null;
    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant='body2' color='textSecondary'>
                {tr('arena.confidence')}:{' '}
                {tr('arena.leader', { name: winner.label })}{' '}
                <b>{pct}%</b>
                {ci && (
                    <>
                        {' · '}{tr('arena.ci')} ±{ci}
                    </>
                )}
            </Typography>
        </Box>
    );
};

// A candidate card in the A/B voting view: label, clickable media (opens the
// full-size lightbox on this slide — the lightbox's arrows switch between the
// two candidates for comparison), and a quick "choose" button.
const CandidateView = ({
    participant,
    source,
    display,
    label,
    onOpen,
    onVote,
    disabled,
}: {
    participant: ArenaParticipant;
    source?: TaskResult;
    display: string;
    label: string;
    onOpen: () => void;
    onVote: () => void;
    disabled?: boolean;
}) => {
    const tr = useTranslate();
    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
            }}
        >
            <Typography variant='body1'>{label}</Typography>
            <Box
                onClick={onOpen}
                sx={{
                    cursor: 'pointer',
                    position: 'relative',
                    // Shrink-wrap the natural-size media (ParticipantAsset
                    // `fill={false}`) so the "view full" icon lands on the media's
                    // corner, not on the empty letterbox the media used to leave
                    // when stretched to the full column width.
                    width: 'fit-content',
                    maxWidth: '100%',
                }}
            >
                <ParticipantAsset
                    participant={participant}
                    source={source}
                    display={display}
                    fill={false}
                />
                <OpenInFull
                    fontSize='small'
                    aria-label={tr('arena.view_full')}
                    sx={{
                        position: 'absolute',
                        // Top-right, not bottom-right: the bottom-right corner is
                        // taken by the native <video controls> fullscreen button,
                        // which would otherwise collide with this overlay icon.
                        top: 4,
                        right: 4,
                        color: 'white',
                        bgcolor: 'rgba(0, 0, 0, 0.55)',
                        borderRadius: '50%',
                        p: 0.5,
                    }}
                />
            </Box>
            <Button
                variant='contained'
                color='primary'
                disabled={disabled}
                onClick={onVote}
            >
                {tr('arena.vote_this')}
            </Button>
        </Box>
    );
};

// A finished-arena standings row: resolves the competitor's media via
// useParticipantDisplay (one object URL per row, shared with the render).
const ParticipantRow = ({ participant }: { participant: ArenaParticipant }) => {
    const { source, display } = useParticipantDisplay(participant);
    return (
        <ParticipantAsset
            participant={participant}
            source={source}
            display={display}
            height={120}
        />
    );
};

export const ArenaDialog = () => {
    const tr = useTranslate();
    const {
        openArenaId,
        arenas,
        vote,
        closeArena,
        finishArena,
        continueArena,
        continueVoting,
    } = useArena();
    const [lbIndex, setLbIndex] = useState<number | null>(null);
    // Guards against racing double-clicks: a vote is in flight (the
    // repeat-guard in the provider is gone, since the arena re-votes exhausted
    // pairs). The lightbox vote button stays enabled (this guard, not a
    // `disabled` state, prevents the double) so it never blurs to <body> and
    // keeps keyboard focus alive.
    const [voting, setVoting] = useState(false);
    // The lightbox vote button: focused while the voting lightbox is open so
    // Enter votes for the current slide (native button activation) and the
    // lightbox's arrow-key navigation (on the focused controller) keeps working.
    const voteButtonRef = useRef<HTMLButtonElement>(null);
    const entry = arenas.find((e) => e.rec.id === openArenaId);
    // Compute the A/B display URLs before the early return: the
    // useParticipantDisplay hooks must be called unconditionally. The lightbox
    // shows [A, B] (the current pair); its arrows switch between the two for
    // comparison.
    const st = entry?.state;
    const pair =
        st && st.status !== 'finished'
            ? nextPair(st, st.config.seed, !!st.allowRevote)
            : null;
    const byKey: Record<string, ArenaParticipant> = {};
    st?.participants.forEach((p) => {
        byKey[p.key] = p;
    });
    const aParticipant = pair ? byKey[pair[0]] : undefined;
    const bParticipant = pair ? byKey[pair[1]] : undefined;
    const aDisp = useParticipantDisplay(aParticipant);
    const bDisp = useParticipantDisplay(bParticipant);
    // The lightbox STAYS OPEN across votes: each vote advances the pair and the
    // 2-slide voting set updates in place, with the active slide index (0/1)
    // still valid. It only closes when a standings index (>= 2) is out of bounds
    // for the 2-slide voting lightbox — i.e. switching from the finished
    // standings view back to voting via "Continue". No reset in the standings
    // view itself, so that lightbox can open and browse freely.
    const isVoting = st ? st.status !== 'finished' : false;
    // Voting view but no pair left: the round-robin / match cap is exhausted.
    // Close the lightbox (there's no A/B pair to show) and show the
    // "voting ended" view with a "Continue voting" button.
    const votingExhausted = isVoting && pair === null;
    useEffect(() => {
        if (lbIndex === null) return;
        if (votingExhausted || (isVoting && lbIndex >= 2)) setLbIndex(null);
    }, [isVoting, votingExhausted, lbIndex]);
    // Full keyboard mode in the voting lightbox: keep the vote button focused so
    // Enter votes for the current slide (native activation) and the lightbox's
    // arrow-key navigation (handled by the library on the focused controller)
    // keeps working. Re-focusing on every pair / slide change restores this
    // after a vote (the pair advances) and after navigating.
    const lightboxOpen = lbIndex !== null;
    const canVote = isVoting && pair !== null;
    const pairKey = pair ? `${pair[0]}|${pair[1]}` : null;
    useEffect(() => {
        if (lightboxOpen && canVote) {
            voteButtonRef.current?.focus({ preventScroll: true });
        }
    }, [lightboxOpen, canVote, lbIndex, pairKey]);
    if (!entry || !openArenaId) {
        return null;
    }
    const { rec, state } = entry;
    const isFinished = state.status === 'finished';
    const summary = summarize(state);
    // Standings are shown when the arena is explicitly finished (via the
    // "Finish arena" button); "Continue arena" re-activates it to keep voting.
    // The status is the single source of truth — an exhausted-but-active arena
    // still shows the voting view (with an "exhausted" note when no pairs left).
    const showStandings = isFinished;
    const target = Math.min(state.config.maxMatches, summary.pairsTotal);
    const progressPct =
        target > 0
            ? Math.min(100, Math.round((summary.matchesPlayed / target) * 100))
            : 0;
    // Lightbox content: the current A/B pair while voting, or ALL competitors
    // (standings order) once finished, so you can review everyone in full
    // resolution. The ArenaLightbox below resolves each asset and renders it
    // (images via the built-in ImageSlide → zoom, video/audio drawn directly).
    const viewParticipants = showStandings
        ? summary.standings
        : [aParticipant, bParticipant];
    // Records a vote and disables the button while in flight, so racing
    // double-clicks can't double-record the same pair (the arena now re-votes
    // exhausted pairs, so the provider-level repeat guard is no longer there).
    const handleVote = async (winnerId: string) => {
        if (!pair || voting) return;
        setVoting(true);
        try {
            await vote(rec.id, pair[0], pair[1], winnerId);
        } finally {
            setVoting(false);
        }
    };
    // The lightbox shows ONE image at a time (slide 0 = A, slide 1 = B); the
    // voting button votes for the currently displayed competitor. `lbIndex`
    // tracks the active slide (updated by the lightbox's `view` callback).
    const currentIdx = lbIndex ?? 0;
    const currentId = pair ? (currentIdx >= 1 ? pair[1] : pair[0]) : '';

    return (
        <Dialog
            open={!!openArenaId}
            onClose={closeArena}
            // While the lightbox is open, Esc closes the lightbox only (the
            // library handles it); suppress the dialog's own Esc so the arena
            // dialog isn't dismissed along with it.
            disableEscapeKeyDown={lbIndex !== null}
            maxWidth='md'
            fullWidth
        >
            <DialogTitle>{tr('arena.title')}</DialogTitle>
            <DialogContent>
                {!showStandings && (
                    <>
                        <Box sx={{ mb: 1 }}>
                            <Typography variant='body2' color='textSecondary'>
                                {tr('arena.progress', {
                                    done: summary.matchesPlayed,
                                    total: target,
                                })}
                            </Typography>
                            <CircularProgress
                                variant='determinate'
                                value={progressPct}
                                size={10}
                                sx={{ height: 8, width: '100%' }}
                            />
                        </Box>
                        <Confidence summary={summary} />
                        {pair ? (
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                                <CandidateView
                                    participant={aParticipant!}
                                    source={aDisp.source}
                                    display={aDisp.display}
                                    label={tr('arena.a')}
                                    onOpen={() => setLbIndex(0)}
                                    onVote={() => handleVote(pair[0])}
                                    disabled={voting}
                                />
                                <CandidateView
                                    participant={bParticipant!}
                                    source={bDisp.source}
                                    display={bDisp.display}
                                    label={tr('arena.b')}
                                    onOpen={() => setLbIndex(1)}
                                    onVote={() => handleVote(pair[1])}
                                    disabled={voting}
                                />
                            </Box>
                        ) : (
                            // Voting ended: the round-robin / match cap is
                            // exhausted. Offer to keep going (re-vote) or to
                            // finish (the "Finish arena" button is in the
                            // dialog actions).
                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant='body1' color='warning.main'>
                                    {tr('arena.exhausted')}
                                </Typography>
                                <Button
                                    variant='outlined'
                                    color='primary'
                                    sx={{ mt: 1 }}
                                    onClick={() => continueVoting(rec.id)}
                                >
                                    {tr('arena.continue')}
                                </Button>
                            </Box>
                        )}
                    </>
                )}

                {showStandings && (
                    <Box>
                        <Confidence summary={summary} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {summary.standings.map((p, i) => (
                                <Box
                                    key={p.key}
                                    sx={{
                                        display: 'flex',
                                        gap: 2,
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Box sx={{ width: 40, flexShrink: 0 }}>
                                        <Typography variant='h6'>{i + 1}</Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            width: { xs: '100%', sm: 240 },
                                            flexShrink: 0,
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => setLbIndex(i)}
                                    >
                                        <ParticipantRow participant={p} />
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant='body1'>{p.label}</Typography>
                                        <Typography variant='body2' color='textSecondary'>
                                            {tr('arena.points', { n: Math.round(p.rating) })}
                                            {' · '}
                                            {tr('arena.wl', {
                                                w: p.wins,
                                                l: p.losses,
                                            })}
                                        </Typography>
                                        <SourceParams participant={p} />
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                <ArenaLightbox
                    participants={viewParticipants}
                    open={lbIndex !== null}
                    index={lbIndex ?? 0}
                    onView={setLbIndex}
                    onClose={() => setLbIndex(null)}
                    voteButtonRef={voteButtonRef}
                    canVote={canVote}
                    currentId={currentId}
                    onVote={handleVote}
                    voteLabel={tr('arena.vote_this')}
                />
            </DialogContent>
            <DialogActions>
                {isFinished ? (
                    <Button onClick={() => continueArena(rec.id)}>
                        {tr('arena.continue')}
                    </Button>
                ) : (
                    <Button onClick={() => finishArena(rec.id)}>
                        {tr('arena.finish')}
                    </Button>
                )}
                <Button onClick={closeArena}>{tr('controls.close')}</Button>
            </DialogActions>
        </Dialog>
    );
};

// "View generation params" control for a competitor, resolved from its source
// record (params live there, not in the arena record). Opens the shared
// DiffViewer in single-JSON mode (read-only, no restore) — the same params view
// history uses.
const SourceParams = ({ participant }: { participant: ArenaParticipant }) => {
    const tr = useTranslate();
    const { setCompare } = useContext(CompareContext);
    const source = useLiveQuery(
        () => db.taskResults.get(participant.taskResultId),
        [participant.taskResultId],
    );
    if (!source) {
        return null;
    }
    const handle = () => {
        if (!source.params) {
            toast.error(tr('toasts.no_params'));
            return;
        }
        setCompare((v) => ({
            ...v,
            jsonA: undefined,
            jsonB: JSON.parse(source.params || '{}'),
            open: true,
        }));
    };
    return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
                disabled={!source.params}
                variant='outlined'
                color='info'
                onClick={handle}
                size='small'
            >
                {tr('controls.show_params')}
            </Button>
            <LoadParamsButton params={source.params} />
        </Box>
    );
};
