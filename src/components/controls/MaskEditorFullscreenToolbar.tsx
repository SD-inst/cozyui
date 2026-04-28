import {
    Delete,
    ExpandLess,
    ExpandMore,
    FullscreenExit,
    Redo,
    Undo,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { forwardRef, type Ref } from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarSlider } from './ToolbarSlider';

export interface MaskEditorFullscreenToolbarProps {
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    maskColor: string;
    onMaskColorChange: (color: string) => void;
    maskOpacity: number;
    onMaskOpacityChange: (opacity: number) => void;
    onReset: () => void;
    onExitFullscreen: () => void;
    onUndo: () => boolean;
    onRedo: () => boolean;
    canUndo: boolean;
    canRedo: boolean;
    brushSizeMin?: number;
    brushSizeMax?: number;
    brushSizeStep?: number;
    isExpanded?: boolean;
    onToggle?: () => void;
}

/**
 * Top toolbar shown in fullscreen mode for the MaskEditor.
 * Contains brush size, exit fullscreen, undo/redo, delete mask, mask color and opacity.
 */
export const MaskEditorFullscreenToolbar = forwardRef<
    HTMLDivElement,
    MaskEditorFullscreenToolbarProps
>(function MaskEditorFullscreenToolbar(
    {
        brushSize,
        onBrushSizeChange,
        maskColor,
        onMaskColorChange,
        maskOpacity,
        onMaskOpacityChange,
        onReset,
        onExitFullscreen,
        onUndo,
        onRedo,
        canUndo,
        canRedo,
        brushSizeMin = 1,
        brushSizeMax = 200,
        brushSizeStep = 1,
        isExpanded = false,
        onToggle,
    },
    ref: Ref<HTMLDivElement>,
) {
    const tr = useTranslate();

    return (
        <Box
            ref={ref}
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(8px)',
                color: 'white',
                transition: 'all 0.3s ease-in-out',
            }}
        >
            {/* Header row — always visible, full width */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    boxSizing: 'border-box',
                    px: 1.5,
                    py: 0.75,
                    gap: 1,
                    justifyContent: 'space-between',
                }}
            >
                {/* Accordion toggle */}
                <Tooltip
                    title={
                        isExpanded
                            ? tr('controls.mask_editor.collapse_toolbar')
                            : tr('controls.mask_editor.expand_toolbar')
                    }
                >
                    <IconButton
                        onClick={() => {
                            onToggle?.();
                        }}
                        size='small'
                        sx={{
                            color: 'white',
                            cursor: 'pointer',
                        }}
                    >
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Tooltip>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ToolbarButton
                        title={tr('controls.mask_editor.exit_fullscreen')}
                        icon={<FullscreenExit />}
                        onClick={() => {
                            onExitFullscreen();
                        }}
                    />

                    <Box sx={{ width: 8 }} />

                    {/* Undo */}
                    <ToolbarButton
                        title={tr('controls.mask_editor.undo')}
                        icon={<Undo />}
                        onClick={() => {
                            onUndo();
                        }}
                        disabled={!canUndo}
                    />

                    {/* Redo */}
                    <ToolbarButton
                        title={tr('controls.mask_editor.redo')}
                        icon={<Redo />}
                        onClick={() => {
                            onRedo();
                        }}
                        disabled={!canRedo}
                    />
                </Box>

                {/* Reset mask */}
                <ToolbarButton
                    title={tr('controls.mask_editor.reset_mask')}
                    icon={<Delete />}
                    onClick={() => {
                        onReset();
                    }}
                    hoverColor='#ff5252'
                />
            </Box>

            {/* Expanded content — sliders only */}
            {isExpanded && (
                <Box
                    sx={{
                        px: 1.5,
                        pb: 1.5,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        alignItems: 'center',
                    }}
                >
                    {/* Brush size */}
                    <ToolbarSlider
                        label={tr('controls.mask_editor.brush_size')}
                        valueLabel={`${Math.round(brushSize)}px`}
                        sliderProps={{
                            value: Math.round(brushSize),
                            min: brushSizeMin,
                            max: brushSizeMax,
                            step: brushSizeStep,
                            onChange: (_, v) =>
                                onBrushSizeChange(
                                    Math.round(Array.isArray(v) ? v[0] : v),
                                ),
                        }}
                    />

                    {/* Mask color */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <Typography variant='body2'>
                            {tr('controls.mask_editor.mask_color')}
                        </Typography>
                        <input
                            type='color'
                            value={maskColor}
                            onChange={(e) => onMaskColorChange(e.target.value)}
                            style={{
                                width: 28,
                                height: 28,
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderRadius: 1,
                                background: 'none',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        />
                    </Box>

                    {/* Mask opacity */}
                    <ToolbarSlider
                        label={tr('controls.mask_editor.mask_opacity')}
                        valueLabel={`${Math.round(maskOpacity * 100)}%`}
                        sliderProps={{
                            value: Math.round(maskOpacity * 100),
                            min: 0,
                            max: 100,
                            step: 1,
                            onChange: (_, v) =>
                                onMaskOpacityChange(
                                    Math.round(Array.isArray(v) ? v[0] : v) /
                                        100,
                                ),
                        }}
                    />
                </Box>
            )}
        </Box>
    );
});
