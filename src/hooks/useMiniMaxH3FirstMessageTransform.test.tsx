import { useEffect } from 'react';
import { render } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { useMiniMaxH3FirstMessageTransform } from './useMiniMaxH3FirstMessageTransform';
import { useMiniMaxH3I2VFirstMessageTransform } from './useMiniMaxH3I2VFirstMessageTransform';

const T2VInner = () => {
    const transform = useMiniMaxH3FirstMessageTransform();
    return <div data-testid="result">{transform('hello')}</div>;
};

const I2VInner = () => {
    const transform = useMiniMaxH3I2VFirstMessageTransform();
    return <div data-testid="result">{transform('hello')}</div>;
};

const renderT2V = (values: Record<string, any>) => {
    const Inner = () => {
        const form = useForm({ defaultValues: values });
        useEffect(() => {
            Object.entries(values).forEach(([k, v]) => {
                form.setValue(k, v);
            });
        }, [form]);
        return (
            <FormProvider {...form}>
                <T2VInner />
            </FormProvider>
        );
    };
    return render(<Inner />);
};

const renderI2V = (values: Record<string, any>) => {
    const Inner = () => {
        const form = useForm({ defaultValues: values });
        useEffect(() => {
            Object.entries(values).forEach(([k, v]) => {
                form.setValue(k, v);
            });
        }, [form]);
        return (
            <FormProvider {...form}>
                <I2VInner />
            </FormProvider>
        );
    };
    return render(<Inner />);
};

describe('useMiniMaxH3FirstMessageTransform (T2V)', () => {
    it('prepends length and aspect before description', () => {
        const { container } = renderT2V({
            length: 5,
            aspect_ratio: '16:9 (Widescreen)',
        });
        const text = container.querySelector('[data-testid="result"]')!.textContent;
        expect(text).toBe('length=5\naspect=16:9\ndescription=hello');
    });

    it('omits the length line when length is 0', () => {
        const { container } = renderT2V({
            length: 0,
            aspect_ratio: '1:1 (Square)',
        });
        const text = container.querySelector('[data-testid="result"]')!.textContent;
        expect(text).toBe('aspect=1:1\ndescription=hello');
    });

    it('uses the aspect ratio prefix from the form value', () => {
        const { container } = renderT2V({
            length: 10,
            aspect_ratio: '21:9 (Ultra Widescreen)',
        });
        const text = container.querySelector('[data-testid="result"]')!.textContent;
        expect(text).toContain('aspect=21:9');
    });
});

describe('useMiniMaxH3I2VFirstMessageTransform', () => {
    it('includes first_image and last_image when both frames are set', () => {
        const { container } = renderI2V({
            length: 5,
            aspect_ratio: '16:9 (Widescreen)',
            first_frame: 'first.png',
            last_frame: 'last.png',
        });
        const text = container.querySelector('[data-testid="result"]')!.textContent;
        expect(text).toBe(
            'length=5\naspect=16:9\nfirst_image=Picture 1\nlast_image=Picture 2\ndescription=hello',
        );
    });

    it('uses Picture 1 for last_image when only last frame is set', () => {
        const { container } = renderI2V({
            length: 5,
            aspect_ratio: '16:9 (Widescreen)',
            first_frame: '',
            last_frame: 'last.png',
        });
        const text = container.querySelector('[data-testid="result"]')!.textContent;
        expect(text).toBe(
            'length=5\naspect=16:9\nlast_image=Picture 1\ndescription=hello',
        );
    });

    it('omits picture lines when no frames are set', () => {
        const { container } = renderI2V({
            length: 5,
            aspect_ratio: '16:9 (Widescreen)',
            first_frame: '',
            last_frame: '',
        });
        const text = container.querySelector('[data-testid="result"]')!.textContent;
        expect(text).toBe('length=5\naspect=16:9\ndescription=hello');
    });

    it('omits the length line when length is 0', () => {
        const { container } = renderI2V({
            length: 0,
            aspect_ratio: '16:9 (Widescreen)',
            first_frame: 'first.png',
        });
        const text = container.querySelector('[data-testid="result"]')!.textContent;
        expect(text).toBe('aspect=16:9\nfirst_image=Picture 1\ndescription=hello');
    });
});
