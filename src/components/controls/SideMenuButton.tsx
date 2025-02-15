import { Close, Menu } from '@mui/icons-material';
import { IconButton, SwipeableDrawer } from '@mui/material';
import { useState } from 'react';
import { VerticalBox } from '../VerticalBox';

const width = 300;
const transition = 'ease-out 0.3s';

// currently unused
export const SideMenuButton = () => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <IconButton
                onClick={() => setOpen(!open)}
                sx={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    zIndex: 1300,
                }}
            >
                <Menu
                    sx={{
                        position: 'absolute',
                        opacity: open ? 0 : 1,
                        rotate: open ? '180deg' : '0deg',
                        transition,
                    }}
                />
                <Close
                    sx={{
                        position: 'absolute',
                        opacity: open ? 1 : 0,
                        rotate: open ? '0deg' : '-180deg',
                        transition,
                    }}
                />
            </IconButton>
            <SwipeableDrawer
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => setOpen(false)}
            >
                <VerticalBox sx={{ mt: 2, p: 2, width }}>
                </VerticalBox>
            </SwipeableDrawer>
        </>
    );
};
