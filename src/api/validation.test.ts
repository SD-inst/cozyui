import { describe, expect, it } from 'vitest';
import { formatPromptError, parsePromptError } from './validation';

// Verbatim shape of a missing-input-file rejection from ComfyUI 0.42.
const missingFile = {
    error: {
        type: 'prompt_outputs_failed_validation',
        message: 'Prompt outputs failed validation',
        details: '',
        extra_info: {},
    },
    node_errors: {
        '1': {
            errors: [
                {
                    type: 'custom_validation_failed',
                    message: 'Custom validation failed for node',
                    details: 'image - Invalid image file: 1730_cat.png',
                    extra_info: { input_name: 'image' },
                },
            ],
            dependent_outputs: ['2'],
            class_type: 'LoadImage',
        },
    },
};

describe('parsePromptError', () => {
    it('names the node, its class and the concrete reason', () => {
        const parsed = parsePromptError(missingFile);

        expect(parsed?.nodes).toEqual([
            {
                nodeId: '1',
                classType: 'LoadImage',
                details: 'image - Invalid image file: 1730_cat.png',
            },
        ]);
        expect(formatPromptError(parsed!)).toBe(
            '#1 LoadImage: image - Invalid image file: 1730_cat.png',
        );
    });

    it('falls back to the top-level error when no node breakdown is given', () => {
        const parsed = parsePromptError({
            error: {
                type: 'prompt_no_outputs',
                message: 'Prompt has no outputs',
                details: '',
            },
            node_errors: {},
        });

        expect(parsed?.nodes).toEqual([]);
        expect(formatPromptError(parsed!)).toBe('Prompt has no outputs');
    });

    it('lists every failed node', () => {
        const parsed = parsePromptError({
            error: { message: 'Prompt outputs failed validation' },
            node_errors: {
                '1': {
                    class_type: 'LoadImage',
                    errors: [{ details: 'image - Invalid image file: a.png' }],
                },
                '9': {
                    class_type: 'LoadAudio',
                    errors: [{ message: 'Custom validation failed for node' }],
                },
            },
        });

        expect(formatPromptError(parsed!)).toBe(
            '#1 LoadImage: image - Invalid image file: a.png; ' +
                '#9 LoadAudio: Custom validation failed for node',
        );
    });

    it('returns null for a body that is not a validation rejection', () => {
        expect(parsePromptError(undefined)).toBeNull();
        expect(parsePromptError('not json')).toBeNull();
        expect(parsePromptError({ prompt_id: 'x' })).toBeNull();
    });
});
