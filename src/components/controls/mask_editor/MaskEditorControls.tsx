import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Delete, Fullscreen, Undo, Redo } from '@mui/icons-material';
import { EraserIcon } from './EraserIcon';
import { SliderInputBase } from '../SliderInputBase';
import { useTranslate } from '../../../i18n/I18nContext';

export interface MaskEditorControlsProps {
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    maskColor: string;
    onMaskColorChange: (color: string) => void;
    maskOpacity: number;
    onMaskOpacityChange: (opacity: number) => void;
    isErasing: boolean;
    onToggleErasing: () => void;
    onReset: () => void;
    onToggleFullscreen: () => void;
    onUndo: () => boolean;
    onRedo: () => boolean;
    canUndo: boolean;
    canRedo: boolean;
    brushSizeMin?: number;
    brushSizeMax?: number;
    brushSizeStep?: number;
}

/**
 * Control panel for MaskEditor.
 * Contains brush size slider, mask color and opacity pickers,
 * as well as reset, undo/redo and fullscreen buttons.
 */
export const MaskEditorControls = ({
    brushSize,
    onBrushSizeChange,
    maskColor,
    onMaskColorChange,
    maskOpacity,
    onMaskOpacityChange,
    isErasing,
    onToggleErasing,
    onReset,
    onToggleFullscreen,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    brushSizeMin = 1,
    brushSizeMax = 200,
    brushSizeStep = 1,
}: MaskEditorControlsProps) => {
    const tr = useTranslate();
    const handleBrushSizeChange = (v: number | number[]) =>
        onBrushSizeChange(Math.round(Array.isArray(v) ? v[0] : v));
    const handleMaskOpacityChange = (v: number | number[]) =>
        onMaskOpacityChange(Math.round(Array.isArray(v) ? v[0] : v) / 100);

    return (
        <Box
            sx={{
                width: '100%',
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
            }}
        >
            {/* Brush size */}
            <SliderInputBase
                name='brush_size'
                label='controls.mask_editor.brush_size'
                value={Math.round(brushSize)}
                onChange={handleBrushSizeChange as any}
                min={brushSizeMin}
                max={brushSizeMax}
                step={brushSizeStep}
                suffix='px'
            />

            {/* Mask color */}
            <Box>
                <Stack
                    direction='row'
                    alignItems='center'
                    justifyContent='space-between'
                    mb={0.5}
                >
                    <Typography variant='body1'>{tr('controls.mask_editor.mask_color')}</Typography>
                    <input
                        type='color'
                        value={maskColor}
                        onChange={(e) => onMaskColorChange(e.target.value)}
                        style={{
                            width: 40,
                            height: 30,
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                        }}
                    />
                </Stack>
            </Box>

            {/* Mask opacity */}
            <SliderInputBase
                name='mask_opacity'
                label='controls.mask_editor.mask_opacity'
                value={Math.round(maskOpacity * 100)}
                onChange={handleMaskOpacityChange as any}
                min={0}
                max={100}
                step={1}
                suffix='%'
            />

            <Stack direction='row' spacing={1} justifyContent='space-between'>
                <IconButton color='primary' onClick={onToggleFullscreen}>
                    <Fullscreen />
                </IconButton>
                <Tooltip
                    title={
                        isErasing
                            ? tr('controls.mask_editor.draw_mode')
                            : tr('controls.mask_editor.erase_mode')
                    }
                >
                    <IconButton
                        color={isErasing ? 'error' : 'primary'}
                        onClick={onToggleErasing}
                    >
                        <EraserIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title={tr('controls.mask_editor.undo')}>
                    <IconButton
                        color='primary'
                        onClick={onUndo}
                        disabled={!canUndo}
                        size='small'
                    >
                        <Undo />
                    </IconButton>
                </Tooltip>
                <Tooltip title={tr('controls.mask_editor.redo')}>
                    <IconButton
                        color='primary'
                        onClick={onRedo}
                        disabled={!canRedo}
                        size='small'
                    >
                        <Redo />
                    </IconButton>
                </Tooltip>
                <IconButton color='error' onClick={onReset}>
                    <Delete />
                </IconButton>
            </Stack>
        </Box>
    );
};
