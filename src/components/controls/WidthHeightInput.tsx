import { Lock, LockOpen, SwapVert } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { useCallback, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { SliderInputBase } from './SliderInputBase';

export const WidthHeight = ({
    widthName = 'width',
    heightName = 'height',
    defaultWidth = 832,
    defaultHeight = 1280,
    maxWidth = 1280,
    maxHeight = 1280,
    step = 16,
}: {
    widthName?: string;
    heightName?: string;
    defaultWidth?: number;
    defaultHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    step?: number;
}) => {
    const [aspect, setAspect] = useState(0);
    const { getValues, setValue } = useFormContext();
    const handleSwap = useCallback(() => {
        const vals = getValues([widthName, heightName]);
        setValue(widthName, vals[1]);
        setValue(heightName, vals[0]);
        if (aspect && vals[0]) {
            setAspect(vals[1] / vals[0]);
        }
    }, [aspect, getValues, heightName, setValue, widthName]);
    const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        field: { ref: wRef, onChange: onWidthChangeCtl, ...widthField },
    } = useController({
        name: widthName,
        defaultValue: defaultWidth,
    });
    const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        field: { ref: hRef, onChange: onHeightChangeCtl, ...heightField },
    } = useController({
        name: heightName,
        defaultValue: defaultHeight,
    });
    const onWidthChange = useCallback(
        (v: number) => {
            if (aspect) {
                const h = Math.min(v / aspect, maxHeight);
                onHeightChangeCtl(h - (h % step));
                if (h === maxHeight) {
                    v = maxHeight * aspect - ((maxHeight * aspect) % step);
                }
            }
            onWidthChangeCtl(v);
        },
        [aspect, maxHeight, onHeightChangeCtl, onWidthChangeCtl, step]
    );
    const onHeightChange = useCallback(
        (v: number) => {
            if (aspect) {
                const w = Math.min(v * aspect, maxWidth);
                onWidthChangeCtl(w - (w % step));
                if (w === maxWidth) {
                    v = maxWidth / aspect - ((maxWidth / aspect) % step);
                }
            }
            onHeightChangeCtl(v);
        },
        [aspect, maxWidth, onHeightChangeCtl, onWidthChangeCtl, step]
    );
    return (
        <Box
            display='flex'
            flexDirection='row'
            width='100%'
            alignItems='center'
        >
            <Box display='flex' flexDirection='column' flex={1}>
                <SliderInputBase
                    defaultValue={defaultWidth}
                    max={maxWidth}
                    step={step}
                    onChange={(v) => onWidthChange(v)}
                    {...widthField}
                />
                <SliderInputBase
                    defaultValue={defaultHeight}
                    max={maxHeight}
                    step={step}
                    onChange={(v) => onHeightChange(v)}
                    {...heightField}
                />
            </Box>
            <Box
                display='flex'
                alignItems='center'
                gap={1}
                sx={{
                    pt: 3,
                    pl: 1,
                    flexDirection: {
                        xs: 'column',
                        sm: 'row',
                    },
                }}
            >
                <Button variant='outlined' color='primary' onClick={handleSwap}>
                    <SwapVert />
                </Button>
                <Button
                    variant='outlined'
                    color='primary'
                    onClick={() => {
                        if (aspect || !heightField.value) {
                            setAspect(0);
                        } else {
                            setAspect(widthField.value / heightField.value);
                        }
                    }}
                >
                    {aspect ? (
                        <Box display='flex' gap={1}>
                            <Lock /> {aspect.toFixed(2)}
                        </Box>
                    ) : (
                        <LockOpen />
                    )}
                </Button>
            </Box>
        </Box>
    );
};
