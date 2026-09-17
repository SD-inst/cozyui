import { Download } from '@mui/icons-material';
import { Button, IconButton, Tooltip } from '@mui/material';
import { MouseEvent } from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import { useExportImport } from '../../hooks/useExportImport';
import {
    Domain,
    RawRecord,
    archiveFilename,
} from '../../utils/export/format';

// Single-item export (presets / sessions / refmods). Fire-and-forget with a
// toast (no progress UI) — one item exports quickly. `iconOnly` renders a
// compact IconButton (with a tooltip) instead of a labeled Button. `name` (the
// asset's name) makes the downloaded archive self-describing.
export const ExportItemButton = ({
    domain,
    collect,
    sx,
    label,
    iconOnly,
    name,
}: {
    domain: Domain;
    collect: () => Promise<RawRecord[]>;
    sx?: Record<string, any>;
    label?: string;
    iconOnly?: boolean;
    name?: string;
}) => {
    const tr = useTranslate();
    const { doExport } = useExportImport();
    const text = label ?? tr('controls.export_item');
    const onClick = (e: MouseEvent) => {
        e.stopPropagation();
        doExport(domain, collect, {
            quiet: true,
            name: archiveFilename(name, domain),
        });
    };
    if (iconOnly) {
        return (
            <Tooltip title={text}>
                <IconButton size='small' sx={sx} onClick={onClick}>
                    <Download fontSize='small' />
                </IconButton>
            </Tooltip>
        );
    }
    return (
        <Button
            size='small'
            variant='outlined'
            startIcon={<Download />}
            sx={sx}
            onClick={onClick}
        >
            {text}
        </Button>
    );
};
