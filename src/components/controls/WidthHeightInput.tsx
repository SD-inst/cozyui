import {
    Lock,
    LockOpen,
    PhotoSizeSelectLarge,
    SwapVert,
} from '@mui/icons-material';
import { Box, Button, useEventCallback } from '@mui/material';
import { useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { SliderInputBase } from './SliderInputBase';

const gcd = (a: number, b: number) => {
    if (b === 0) {
        return a;
    }
    return gcd(b, a % b);
};

const calcAspect = (a: number, b: number) => {
    const aspect = a / b;
    const r = gcd(a, b);
    a = a / r;
    b = b / r;
    while (a > 100 || b > 100) {
        a = Math.round(a / 10);
        b = Math.round(b / 10);
    }
    return { aspect, str: a > 0 && b > 0 ? `${a}:${b}` : '' };
};

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
    const [{ aspect, str }, setAspect] = useState({ aspect: 0, str: '' });
    const [size, setSize] = useState(0);
    const { getValues, setValue } = useFormContext();
    const handleSwap = useEventCallback(() => {
        const vals = getValues([widthName, heightName]);
        setValue(widthName, vals[1]);
        setValue(heightName, vals[0]);
        if (aspect && vals[0]) {
            setAspect(calcAspect(vals[1], vals[0]));
        }
    });
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
    const onWidthChange = useEventCallback((v: number) => {
        if (aspect) {
            const h = Math.min(v / aspect, maxHeight);
            onHeightChangeCtl(h - (h % step));
            if (h === maxHeight) {
                v = maxHeight * aspect - ((maxHeight * aspect) % step);
            }
        }
        if (size) {
            const h = Math.min(size / v, maxHeight);
            onHeightChangeCtl(h - (h % step));
            if (h === maxHeight) {
                v = size / maxHeight - ((size / maxHeight) % step);
            }
        }
        onWidthChangeCtl(v);
    });
    const onHeightChange = useEventCallback((v: number) => {
        if (aspect) {
            const w = Math.min(v * aspect, maxWidth);
            onWidthChangeCtl(w - (w % step));
            if (w === maxWidth) {
                v = maxWidth / aspect - ((maxWidth / aspect) % step);
            }
        }
        if (size) {
            const w = Math.min(size / v, maxWidth);
            onWidthChangeCtl(w - (w % step));
            if (w === maxWidth) {
                v = size / maxWidth - ((size / maxWidth) % step);
            }
        }
        onHeightChangeCtl(v);
    });
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
                    variant={aspect ? 'contained' : 'outlined'}
                    color='primary'
                    onClick={() => {
                        if (aspect || !heightField.value) {
                            setAspect({ aspect: 0, str: '' });
                        } else {
                            setAspect(
                                calcAspect(widthField.value, heightField.value)
                            );
                            setSize(0);
                        }
                    }}
                >
                    <Box display='flex' gap={1}>
                        {aspect ? (
                            <>
                                <Lock />
                                {str || aspect.toFixed(2)}
                            </>
                        ) : (
                            <LockOpen />
                        )}
                    </Box>
                </Button>
                <Button
                    variant={size ? 'contained' : 'outlined'}
                    onClick={() => {
                        if (size) {
                            setSize(0);
                        } else {
                            setSize(widthField.value * heightField.value);
                            setAspect({ aspect: 0, str: '' });
                        }
                    }}
                >
                    <Box
                        display='flex'
                        gap={1}
                        sx={{
                            flexDirection: {
                                xs: 'column',
                                sm: 'row',
                            },
                        }}
                    >
                        <PhotoSizeSelectLarge />
                        {(
                            (size || widthField.value * heightField.value) / 1e6
                        ).toFixed(2)}
                    </Box>
                </Button>
            </Box>
        </Box>
    );
};
