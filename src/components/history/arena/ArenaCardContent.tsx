import { Box, Typography } from '@mui/material';
import { useMemo } from 'react';
import { TaskResult } from '../db';
import { ArenaParticipant, ArenaState, summarize } from '../../../utils/arena';
import { useTranslate } from '../../../i18n/I18nContext';
import { useArena } from './ArenaContext';
import { useParticipantDisplay } from './useParticipantDisplay';

const parseArena = (rec: TaskResult): ArenaState | null => {
    if (!rec.arena) return null;
    try {
        return JSON.parse(rec.arena) as ArenaState;
    } catch {
        return null;
    }
};

// A large thumbnail for the arena winner (1st place): resolves the media from
// the source record via useParticipantDisplay (object URL for local blobs).
const WinnerThumb = ({ participant }: { participant: ArenaParticipant }) => {
    const { source, display } = useParticipantDisplay(participant);
    // Big, centered media like a regular image history card: full width, capped
    // at 300px tall, letterboxed (objectFit: contain) so it's centered, not
    // stretched.
    const mediaStyle = {
        width: '100%',
        maxHeight: 300,
        objectFit: 'contain' as const,
    };
    if (source === undefined || !source) {
        return (
            <Box
                sx={{
                    width: '100%',
                    minHeight: 140,
                    bgcolor: 'background.default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Typography variant='body2' color='textSecondary'>
                    {participant.label}
                </Typography>
            </Box>
        );
    }
    if (source.type === 'gifs') {
        return (
            <video
                src={display}
                muted
                loop
                playsInline
                preload='metadata'
                style={{
                    ...mediaStyle,
                    backgroundColor: 'rgba(0,0,0,0.04)',
                }}
            />
        );
    }
    if (source.type === 'audio') {
        return (
            <Box
                sx={{
                    width: '100%',
                    minHeight: 140,
                    bgcolor: 'background.default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Typography variant='body2' color='textSecondary'>
                    {participant.label}
                </Typography>
            </Box>
        );
    }
    return (
        <img
            src={display}
            alt={participant.label}
            style={{
                ...mediaStyle,
                backgroundColor: 'rgba(0,0,0,0.04)',
                display: 'block',
            }}
        />
    );
};

export const ArenaCardContent = ({ rec }: { rec: TaskResult }) => {
    const tr = useTranslate();
    const { openArena } = useArena();
    // Memoize on the stable record: parseArena/summarize (60-iter BT fit) only
    // re-run when the record itself changes, not on unrelated list re-renders.
    const state = useMemo(() => parseArena(rec), [rec]);
    const summary = useMemo(
        () => (state ? summarize(state) : null),
        [state],
    );
    if (!state || !summary) {
        return null;
    }
    const winner = summary.winner;
    const pct =
        winner && state.matches.length > 0
            ? Math.round(summary.confidence.leaderProb * 100)
            : null;
    if (!winner) {
        return null;
    }
    // Show only the winner (1st place) in the card; the full standings open
    // on click (the arena dialog). This keeps the card compact and the winner
    // always visible (no horizontal scrolling).
    return (
        <Box onClick={() => openArena(rec.id)} sx={{ cursor: 'pointer', p: 1 }}>
            <WinnerThumb participant={winner} />
            <Box sx={{ mt: 1, textAlign: 'center' }}>
                <Typography variant='body1' sx={{ wordBreak: 'break-word' }}>
                    {winner.label}
                </Typography>
                <Typography variant='body2' color='textSecondary'>
                    {tr('arena.points', { n: Math.round(winner.rating) })}
                    {pct !== null && (
                        <>
                            {' · '}
                            {tr('arena.leader', { name: winner.label })}{' '}
                            <b>{pct}%</b>
                        </>
                    )}
                </Typography>
                <Typography variant='caption' color='textSecondary'>
                    {tr('arena.standings_hint', { n: summary.standings.length })}
                </Typography>
            </Box>
        </Box>
    );
};
