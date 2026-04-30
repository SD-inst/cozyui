import { ExpandLess, ExpandMore, Reply } from '@mui/icons-material';
import {
    Box,
    Button,
    ButtonGroup,
    ButtonProps,
    Menu,
    MenuItem,
} from '@mui/material';
import { useContext, useRef, useState } from 'react';
import { useResult, useResultParam } from '../../hooks/useResult';
import { useSendResult } from '../../hooks/useSendResult';
import { useTabVisibility } from '../../hooks/useTabVisibility';
import { useTranslate } from '../../i18n/I18nContext';
import { WorkflowTabsContext } from '../contexts/WorkflowTabsContext';

export type SendResultButtonProps = ButtonProps & {
    targetTab?: string;
    fields?: string[];
    index?: number;
    fileField?: string;
    icon?: boolean;
    label?: string;
    showMenu?: boolean;
};

const SendMenuItem = ({
    targetTab,
    index,
    fileField,
    showField = false,
    onClick,
}: SendResultButtonProps & { showField?: boolean }) => {
    const handleSend = useSendResult({
        targetTab,
        fields: [],
        index,
        fileField,
    });
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
            {targetTab + (showField ? ' ⇒ ' + fileField : '')}
        </MenuItem>
    );
};

export const SendResultButton = ({
    targetTab,
    fields = [],
    index = 0,
    icon = false,
    fileField = 'image',
    onClick,
    label = 'send_to_upscale',
    showMenu = true,
    ...props
}: SendResultButtonProps) => {
    const tr = useTranslate();
    const bgref = useRef(null);
    const { type } = useResultParam({ index });
    const results = useResult();
    const [anchor, setAnchor] = useState(null);
    const handleSend = useSendResult({ targetTab, fields, index, fileField });
    const { receivers } = useContext(WorkflowTabsContext);
    const { userFilteredTabs } = useTabVisibility();
    const menu = Object.keys(receivers)
        .filter((tab) => userFilteredTabs.includes(tab))
        .flatMap((tab, ti) =>
            receivers[tab].map((field, fi): [JSX.Element, number] | null => {
                if (field.acceptedTypes.includes(type)) {
                    return [
                        <SendMenuItem
                            targetTab={tab}
                            index={index}
                            showField={receivers[tab].length > 1}
                            fileField={field.name}
                            key={tab + '/' + field.name}
                            onClick={onClick}
                        />,
                        field.weight ? -field.weight : ti * 100 + fi,
                    ];
                }
                return null;
            }),
        )
        .filter((e) => !!e)
        .sort((a, b) => a[1] - b[1])
        .map((e) => e[0]);
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (handleSend) {
            handleSend();
        }
        if (onClick) {
            onClick(e);
        }
    };
    if (!icon && results.length !== 1) {
        return null;
    }
    if (!handleSend && !menu.length) {
        return null;
    }
    return (
        <>
            {icon && handleSend && (
                <Box ref={bgref} sx={props.sx}>
                    <ButtonGroup>
                        <Button
                            variant='outlined'
                            color='secondary'
                            onClick={handleClick}
                            size='small'
                            aria-label={`${tr('controls.send_result')} ${results[index]?.filename || ''}`}
                        >
                            <Reply transform='scale(-1, 1)' />
                        </Button>
                        {showMenu && (
                            <Button
                                variant='outlined'
                                color='secondary'
                                size='small'
                                onClick={() => setAnchor(bgref.current || null)}
                                aria-label={tr('controls.send_to')}
                            >
                                <ExpandMore />
                            </Button>
                        )}
                    </ButtonGroup>
                </Box>
            )}
            {icon && !handleSend && (
                <Box ref={bgref} sx={props.sx}>
                    <Button
                        variant='outlined'
                        color='secondary'
                        size='small'
                        onClick={() => setAnchor(bgref.current || null)}
                        aria-label={tr('controls.send_to')}
                    >
                        {anchor ? <ExpandLess /> : <ExpandMore />}
                    </Button>
                </Box>
            )}
            {!icon && handleSend && (
                <ButtonGroup ref={bgref}>
                    <Button
                        variant='contained'
                        color='secondary'
                        onClick={handleClick}
                        aria-label={tr('controls.' + label)}
                        {...props}
                    >
                        {tr('controls.' + label)}
                    </Button>
                    {showMenu && (
                        <Button
                            variant='contained'
                            color='secondary'
                            size='small'
                            onClick={() => setAnchor(bgref.current || null)}
                            aria-label={tr('controls.send_to')}
                        >
                            <ExpandMore />
                        </Button>
                    )}
                </ButtonGroup>
            )}
            {!icon && !handleSend && (
                <Button
                    ref={bgref}
                    variant='contained'
                    color='secondary'
                    onClick={() => setAnchor(bgref.current || null)}
                    aria-label={tr('controls.send_to')}
                >
                    {tr('controls.send_to')}
                </Button>
            )}
            <Menu
                open={!!anchor}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                onClick={() => setAnchor(null)}
                sx={{ zIndex: 10000 }}
            >
                {menu}
            </Menu>
        </>
    );
};
