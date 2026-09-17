import { Download, MoreVert, Upload } from '@mui/icons-material';
import {
    Backdrop,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Menu,
    MenuItem,
    Portal,
    Tooltip,
    Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import { useExportImport } from '../../hooks/useExportImport';
import { Domain, RawRecord } from '../../utils/export/format';

// Panel-level export/import for one domain, tucked behind a small "more" menu
// button (these are used rarely, so we don't want big always-visible buttons).
// The only visible control is the menu button; the menu, confirm dialog, and
// progress shade all portal to <body>. Export respects the current selection
// (the panel's filter); a filtered export is confirmed first so the user knows
// it is a partial export.
export const ExportImport = ({
    domain,
    collect,
    filtered,
    count,
}: {
    domain: Domain;
    collect: () => Promise<RawRecord[]>;
    filtered?: boolean;
    count?: number;
}) => {
    const tr = useTranslate();
    const { progress, interrupt, doExport, doImport } = useExportImport();
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const ref = useRef<HTMLInputElement>(null);

    const startExport = () => {
        if (filtered) {
            setConfirmOpen(true);
        } else {
            doExport(domain, collect);
        }
    };

    // Every interaction inside this component (the menu button, a menu item, the
    // confirm-dialog buttons, the progress "Interrupt") would otherwise bubble up
    // the React tree to the enclosing accordion's toggle button: the menu, dialog,
    // and backdrop are portaled to <body> but remain React children of this node.
    // Stopping propagation at this single boundary keeps none of them from
    // reaching it, whatever popover is currently open.
    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Tooltip title={tr('controls.export_import')}>
                <IconButton
                    size='small'
                    edge='start'
                    aria-label={tr('controls.export_import')}
                    onClick={(e) => {
                        setMenuAnchor((prev) => (prev ? null : e.currentTarget));
                    }}
                >
                    <MoreVert fontSize='small' />
                </IconButton>
            </Tooltip>

            <Menu
                open={menuAnchor !== null}
                onClose={() => setMenuAnchor(null)}
                anchorEl={menuAnchor}
            >
                <MenuItem
                    disabled={count === 0}
                    onClick={() => {
                        setMenuAnchor(null);
                        startExport();
                    }}
                >
                    <Upload fontSize='small' sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {tr('controls.export')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        ref.current?.click();
                    }}
                >
                    <Download fontSize='small' sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {tr('controls.import')}
                </MenuItem>
            </Menu>

            <input
                ref={ref}
                type='file'
                accept='.zip,application/zip'
                style={{ display: 'none' }}
                onChange={(e) => {
                    if (e.target.files?.length) {
                        doImport(e.target.files[0], domain);
                    }
                    ref.current!.value = '';
                }}
            />

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>{tr('export.confirm_title')}</DialogTitle>
                <DialogContent>
                    {count !== undefined && (
                        <Typography
                            variant='body2'
                            sx={{ mb: filtered ? 1 : 0 }}
                        >
                            {tr('export.confirm_count', { n: count })}
                        </Typography>
                    )}
                    {filtered && (
                        <Typography variant='body2' color='warning.main'>
                            {tr('export.confirm_filtered')}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>
                        {tr('controls.cancel')}
                    </Button>
                    <Button
                        color='primary'
                        variant='contained'
                        onClick={() => {
                            setConfirmOpen(false);
                            doExport(domain, collect);
                        }}
                    >
                        {tr('controls.ok')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Portal to <body> so the shade escapes the accordion's stacking
                context and actually covers (and blocks) the whole page. */}
            <Portal>
                <Backdrop open={progress > 0} sx={{ zIndex: 1400 }}>
                    <Box
                        display='flex'
                        flexDirection='column'
                        gap={2}
                        alignItems='center'
                    >
                        <CircularProgress
                            variant='determinate'
                            value={progress}
                            sx={{ height: 10, width: '100%' }}
                        />
                        <Typography variant='h6'>
                            {tr('controls.please_wait')}
                        </Typography>
                        <Button
                            color='error'
                            variant='outlined'
                            onClick={() => {
                                interrupt.current = true;
                            }}
                        >
                            {tr('controls.interrupt')}
                        </Button>
                    </Box>
                </Backdrop>
            </Portal>
        </div>
    );
};
