import {
    Box,
    MenuItem,
    MenuItemProps,
    MenuList,
    Paper,
    Popper,
} from '@mui/material';
import { Tags } from '../history/db';
import { useEffect, useRef } from 'react';

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

const TagItem = ({
    tag,
    selected,
    onClick,
    ...props
}: {
    tag: Tags;
    selected: boolean;
    onClick?: (tag: Tags) => void;
} & Omit<MenuItemProps, 'onClick'>) => {
    const ref = useRef<HTMLLIElement>(null);
    useEffect(() => {
        if (selected && ref.current) {
            ref.current.scrollIntoView({
                block: 'nearest',
            });
        }
    }, [selected]);

    return (
        <MenuItem
            key={tag.name}
            dense
            selected={selected}
            sx={{
                justifyContent: 'space-between',
            }}
            onMouseDown={(e) => {
                if (onClick) {
                    onClick(tag);
                }
                e.preventDefault();
            }}
            ref={ref}
            {...props}
        >
            <Box
                sx={{
                    color: colors[tag.color] || 'white',
                    whiteSpace: 'normal',
                }}
            >
                {tag.alias.length
                    ? tag.alias.slice(0, 3).join(', ') +
                      (tag.alias.length > 3 ? ', ...' : '') +
                      ' ⇒ '
                    : ''}
                {tag.name}
            </Box>
            <Box sx={{ ml: 2 }}>{formatScore(tag.score)}</Box>
        </MenuItem>
    );
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
            sx={{ zIndex: 100, maxHeight: 300, overflow: 'auto' }}
        >
            <Paper elevation={5} sx={{ borderRadius: 2 }}>
                <MenuList onKeyDown={() => {}}>
                    {tags.map((t, i) => (
                        <TagItem
                            tag={t}
                            key={t.name}
                            selected={i === pos}
                            onClick={onClick}
                        />
                    ))}
                </MenuList>
            </Paper>
        </Popper>
    );
};
