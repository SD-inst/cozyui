import { EmojiEvents } from '@mui/icons-material';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { useState } from 'react';
import { useTranslate } from '../../../i18n/I18nContext';
import { standings } from '../../../utils/arena';
import { useArena } from './ArenaContext';

// Panel-level arena menu, tucked behind a small swords button (these are used
// rarely, so we keep a compact button like the export/import menu). The menu is
// context-dependent: outside selection mode it offers "Select participants";
// inside it offers "Exit selection mode". "Start" is always shown when an arena
// exists. Clicks are stopped from propagating to the accordion.
export const ArenaMenu = () => {
    const tr = useTranslate();
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);
    const { working, selectMode, toggleSelectMode, exitSelectMode, start } =
        useArena();

    const count = working ? standings(working.state).length : 0;
    const canStart = !!working && count >= 2;

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Tooltip title={tr('arena.title')}>
                <IconButton
                    size='small'
                    edge='start'
                    aria-label={tr('arena.title')}
                    onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
                >
                    <EmojiEvents fontSize='small' />
                </IconButton>
            </Tooltip>

            <Menu
                open={anchor !== null}
                onClose={() => setAnchor(null)}
                anchorEl={anchor}
            >
                <MenuItem
                    onClick={() => {
                        setAnchor(null);
                        if (selectMode) {
                            exitSelectMode();
                        } else {
                            toggleSelectMode();
                        }
                    }}
                >
                    {tr(selectMode ? 'arena.exit' : 'arena.select')}
                </MenuItem>
                <MenuItem
                    disabled={!canStart}
                    onClick={() => {
                        setAnchor(null);
                        start();
                    }}
                >
                    {tr('arena.start')}
                </MenuItem>
            </Menu>
        </div>
    );
};
