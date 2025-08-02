import { ExpandMore, Reply } from '@mui/icons-material';
import {
    Box,
    Button,
    ButtonGroup,
    ButtonProps,
    Menu,
    MenuItem,
} from '@mui/material';
import { useContext, useRef, useState } from 'react';
import { useSendResult } from '../../hooks/useSendResult';
import { useTranslate } from '../../i18n/I18nContext';
import { WorkflowTabsContext } from '../contexts/WorkflowTabsContext';

export type SendResultButtonProps = ButtonProps & {
    targetTab?: string;
    fields?: string[];
    index?: number;
    fileField?: string;
    icon?: boolean;
    label?: string;
};

const SendMenuItem = ({
    targetTab,
    index,
    fileField,
    onClick,
}: SendResultButtonProps) => {
    const handleSend = useSendResult({
        targetTab,
        fields: [],
        index,
        fileField,
    });
    const tr = useTranslate();
    if (!handleSend) {
        return null;
    }
    return (
        <MenuItem
            onClick={(e) => {
                handleSend();
                if (onClick) {
                    onClick(e as any);
                }
            }}
        >
            {tr('controls.send_to', { target: targetTab, fileField })}
        </MenuItem>
    );
};

export const SendResultButton = ({
    targetTab,
    fields,
    index = 0,
    icon = false,
    fileField = 'image',
    onClick,
    label = 'send_to_upscale',
    ...props
}: SendResultButtonProps) => {
    const tr = useTranslate();
    const bgref = useRef(null);
    const [anchor, setAnchor] = useState(null);
    const handleSend = useSendResult({ targetTab, fields, index, fileField });
    const { receivers } = useContext(WorkflowTabsContext);
    const menu = Object.keys(receivers).flatMap((tab) =>
        receivers[tab].map((field) => (
            <SendMenuItem targetTab={tab} index={index} fileField={field} />
        ))
    );
    if (!handleSend) {
        return null;
    }
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        handleSend();
        if (onClick) {
            onClick(e);
        }
    };
    if (icon) {
        return (
            <Box>
                <Button
                    variant='outlined'
                    color='secondary'
                    onClick={handleClick}
                    size='small'
                    {...props}
                >
                    <Reply transform='scale(-1, 1)' />
                </Button>
            </Box>
        );
    } else {
        return (
            <>
                <ButtonGroup ref={bgref}>
                    <Button
                        variant='contained'
                        color='secondary'
                        onClick={handleClick}
                        {...props}
                    >
                        {tr('controls.' + label)}
                    </Button>
                    <Button
                        variant='contained'
                        color='secondary'
                        size='small'
                        onClick={() => setAnchor(bgref.current || null)}
                    >
                        <ExpandMore />
                    </Button>
                </ButtonGroup>
                <Menu
                    open={!!anchor}
                    anchorEl={anchor}
                    onClose={() => setAnchor(null)}
                    onClick={() => setAnchor(null)}
                >
                    {menu}
                </Menu>
            </>
        );
    }
};
