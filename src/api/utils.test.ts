import { describe, expect, it } from 'vitest';
import { getFreeNodeId, insertGraph, insertNode } from './utils';

describe('getFreeNodeId', () => {
    it('returns the max numeric base id plus one', () => {
        // ids may be composite ("105:14"); only the base part matters
        expect(getFreeNodeId({ '105:9': {}, '105:14': {}, '7': {} })).toBe(106);
    });

    it('ignores non-numeric base parts', () => {
        expect(getFreeNodeId({ '42:main': {} })).toBe(43);
    });
});

describe('insertGraph', () => {
    it('allocates a free base id and prefixes all graph nodes', () => {
        const api: any = {
            '1': { inputs: {}, class_type: 'Model' },
            '2': { inputs: {}, class_type: 'Sampler' },
        };
        const graph = {
            ':main': { inputs: {}, class_type: 'MainNode' },
            ':aux': { inputs: {}, class_type: 'AuxNode' },
        };
        const base = insertGraph(api, graph);
        expect(base).toBe('3');
        expect(api['3:main'].class_type).toBe('MainNode');
        expect(api['3:aux'].class_type).toBe('AuxNode');
        expect(Object.keys(api)).toHaveLength(4);
    });

    it('rewrites internal links and keeps external links intact', () => {
        const api: any = {
            '2': { inputs: {}, class_type: 'Sampler' },
        };
        const graph = {
            ':main': {
                inputs: { noise: [':aux', 0], model: ['2', 0] },
                class_type: 'MainNode',
            },
            ':aux': { inputs: {}, class_type: 'AuxNode' },
        };
        const base = insertGraph(api, graph);
        expect(api[`${base}:main`].inputs.noise).toEqual(['3:aux', 0]);
        expect(api[`${base}:main`].inputs.model).toEqual(['2', 0]);
    });
});

describe('insertNode', () => {
    it('wires input => new node => output and returns the new id', () => {
        const api: any = {
            '1': { inputs: {}, class_type: 'Model' },
            '2': { inputs: { model: ['1', 0] }, class_type: 'Sampler' },
        };
        const id = insertNode(api, '2', 'model', { inputs: {}, class_type: 'Lora' });
        expect(id).toBe('3');
        expect(api['3'].inputs.model).toEqual(['1', 0]);
        expect(api['2'].inputs.model).toEqual(['3', 0]);
    });

    it('supports multiple output nodes at once', () => {
        const api: any = {
            '1': { inputs: {}, class_type: 'Model' },
            '2': { inputs: { model: ['1', 0] }, class_type: 'SamplerA' },
            '3': { inputs: { model: ['1', 0] }, class_type: 'SamplerB' },
        };
        const id = insertNode(api, ['2', '3'], 'model', {
            inputs: {},
            class_type: 'Lora',
        });
        expect(id).toBe('4');
        expect(api['4'].inputs.model).toEqual(['1', 0]);
        expect(api['2'].inputs.model).toEqual(['4', 0]);
        expect(api['3'].inputs.model).toEqual(['4', 0]);
    });
});
