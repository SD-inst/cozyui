import { Box, MenuItem, MenuList, Paper, Popper } from '@mui/material';
import { Tags } from '../history/db';

const formatScore = (n: number) => {
    if (n > 1e6) {
        return (n / 1e6).toFixed(1) + 'M';
    }
    if (n > 1e3) {
        return (n / 1e3).toFixed(1) + 'K';
    }
    return '' + n;
};

type colorType = { [c: number]: string };

const colors: colorType = {
    0: 'lightblue',
    1: 'indianred',
    3: 'violet',
    4: 'lightgreen',
    5: 'orange',
};

export const TagSuggestion = ({
    open,
    tags,
    pos,
    el,
    onClick,
}: {
    open: boolean;
    tags: Tags[];
    pos: number;
    el?: HTMLElement;
    onClick?: (t: Tags) => void;
}) => {
    return (
        <Popper
            open={!!el && open}
            anchorEl={el}
            placement='bottom-start'
            sx={{ zIndex: 100 }}
        >
            <Paper elevation={5} sx={{ borderRadius: 2 }}>
                <MenuList onKeyDown={() => {}}>
                    {tags.map((t, i) => (
                        <MenuItem
                            key={t.name}
                            dense
                            selected={i === pos}
                            sx={{
                                justifyContent: 'space-between',
                            }}
                            onMouseDown={(e) => {
                                if (onClick) {
                                    onClick(t);
                                }
                                e.preventDefault();
                            }}
                        >
                            <Box
                                sx={{
                                    color: colors[t.color] || 'white',
                                    whiteSpace: 'normal',
                                }}
                            >
                                {t.alias.length
                                    ? t.alias.slice(0, 3).join(', ') +
                                      (t.alias.length > 3 ? ', ...' : '') +
                                      ' ⇒ '
                                    : ''}
                                {t.name}
                            </Box>
                            <Box sx={{ ml: 2 }}>{formatScore(t.score)}</Box>
                        </MenuItem>
                    ))}
                </MenuList>
            </Paper>
        </Popper>
    );
};
