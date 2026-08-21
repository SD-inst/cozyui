import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import { useState } from 'react';
import { formatDuration } from '../../hooks/useTaskDuration';
import { useTranslate } from '../../i18n/I18nContext';
import { NodeTiming } from '../../utils/nodeTimings';

type segmentType = {
    label: string;
    ms: number;
    color: string;
};

// A horizontal timeline of the run: one segment per tracked phase (in order)
// plus a trailing "other" segment (short nodes, gaps, queue). Hover for
// details, click to expand the full list.
export const NodeTimingsBar = ({
    timings,
    totalMs,
}: {
    timings: NodeTiming[];
    totalMs: number;
}) => {
    const [open, setOpen] = useState(false);
    const theme = useTheme();
    const tr = useTranslate();
    if (!totalMs || !timings?.length) {
        return null;
    }
    const total = Math.max(totalMs, 1);
    const sum = timings.reduce((acc, t) => acc + t.ms, 0);
    const otherMs = Math.max(0, totalMs - sum);
    const colors = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.info.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
    ];
    const segments: segmentType[] = timings.map((t, i) => ({
        label: t.label,
        ms: t.ms,
        color: colors[i % colors.length],
    }));
    if (otherMs > 0) {
        segments.push({
            label: tr('controls.timings_other'),
            ms: otherMs,
            color: theme.palette.grey[600],
        });
    }
    const pct = (ms: number) => Math.round((ms / total) * 100);
    return (
        <Box sx={{ px: 1, pt: 1, width: '100%' }}>
            <Box
                component='div'
                role='button'
                tabIndex={0}
                aria-label={tr('controls.node_timings')}
                onClick={() => setOpen(!open)}
                onKeyDown={(e) =>
                    (e.key === 'Enter' || e.key === ' ') && setOpen(!open)
                }
                sx={{
                    display: 'flex',
                    height: 8,
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    opacity: open ? 1 : 0.75,
                    '&:hover': { opacity: 1 },
                    mx: 1,
                }}
            >
                {segments.map((s, i) => (
                    <Tooltip
                        key={i}
                        // Informational tooltip for an active feature, not a
                        // "help" one: the app theme sets disableHover/Touch to
                        // the `disable_help` setting globally; force-enable so
                        // the bar keeps working when help tooltips are off.
                        disableHoverListener={false}
                        disableTouchListener={false}
                        title={`${s.label} — ${formatDuration(s.ms / 1000)} (${pct(s.ms)}%)`}
                    >
                        <Box
                            component='span'
                            sx={{
                                width: `${(s.ms / total) * 100}%`,
                                height: '100%',
                                display: 'inline-block',
                                backgroundColor: s.color,
                            }}
                        />
                    </Tooltip>
                ))}
            </Box>
            {open && (
                <Box sx={{ p: 1 }}>
                    {segments.map((s, i) => (
                        <Box
                            key={i}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                py: 0.5,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: s.color,
                                }}
                            />
                            <Typography
                                variant='caption'
                                sx={{
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {s.label}
                            </Typography>
                            <Typography
                                variant='caption'
                                color='text.secondary'
                            >
                                {formatDuration(s.ms / 1000)} ({pct(s.ms)}%)
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};
