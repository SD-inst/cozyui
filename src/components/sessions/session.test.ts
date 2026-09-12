import { describe, it, expect } from 'vitest';
import { defaultSessionName } from './session';

describe('defaultSessionName', () => {
    it('uses the first line of a plain prompt', () => {
        const values = { prompt: 'A baker opens the shutters.' };
        expect(defaultSessionName(values, 0)).toBe(
            'A baker opens the shutters.',
        );
    });

    it('trims a long plain prompt to 50 chars with an ellipsis', () => {
        const long =
            'A very long sentence that keeps going and going and going on and on and on and on and on';
        const values = { prompt: long };
        const name = defaultSessionName(values, 0);
        expect(name.length).toBe(51);
        expect(name.endsWith('…')).toBe(true);
        expect(name).toBe(long.slice(0, 50) + '…');
    });

    it('skips blank lines before taking the first non-empty line', () => {
        const values = { prompt: '\n\nA baker opens the shutters.' };
        expect(defaultSessionName(values, 0)).toBe('A baker opens the shutters.');
    });

    it('strips the integrated_multimodal_description header (H3 T2V/I2V)', () => {
        const values = {
            prompt:
                'integrated_multimodal_description: [Shot 1] Live-action, cinematic, a baker opens the shutters of a small street bakery before sunrise.\n\noverall_soundscape: Quiet street ambience.\n\nnon_diegetic_music: A soft acoustic-guitar pattern.',
        };
        const name = defaultSessionName(values, 0);
        expect(name).not.toContain('integrated_multimodal_description');
        expect(name).toContain('[Shot 1] Live-action, cinematic, a baker');
    });

    it('strips the detailed_description header (H3 R2V, body on next line)', () => {
        const values = {
            prompt:
                'subject_definitions:\n<Subject 1> is the coffee-shop environment.\n\nsummary:\n[reference generation] The target video shows the coffee shop.\n\nretention_analysis:\n<Subject 1> (appears in [Shot 1]): fully_preserved - retained.\n\ndetailed_description:\nThe target video is in a realistic sitcom style.\n[Shot 1] The shot begins from the coffee shop.\n\noverall_soundscape: Soft room tone.\n\nnon_diegetic_music: N/A',
        };
        const name = defaultSessionName(values, 0);
        expect(name).not.toContain('detailed_description');
        expect(name).not.toContain('subject_definitions');
        expect(name).toContain('The target video is in a realistic sitcom style');
    });

    it('falls back to the timestamp when there is no prompt', () => {
        const ts = new Date('2026-01-02T03:04:05Z').getTime();
        expect(defaultSessionName({ model: 'x' }, ts)).toBe(
            new Date(ts).toLocaleString(),
        );
    });
});
