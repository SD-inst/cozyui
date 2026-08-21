import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NodeTiming } from '../../utils/nodeTimings';
import { NodeTimingsBar } from './NodeTimingsBar';

const timings: NodeTiming[] = [
    {
        node: '105:14',
        cls: 'SamplerCustomAdvanced',
        label: 'SamplerCustomAdvanced',
        ms: 100000,
        offset_ms: 0,
    },
    {
        node: '105:121',
        cls: 'VHS_VideoCombine',
        label: 'Video Combine',
        ms: 5000,
        offset_ms: 100000,
    },
];

describe('NodeTimingsBar', () => {
    it('renders one segment per phase plus an "other" segment for the rest', () => {
        // 2 phases + "other" (115000 - 105000 = 10000 > 0)
        const { container } = render(
            <NodeTimingsBar timings={timings} totalMs={115000} />
        );
        const bar = container.querySelector('[role="button"]');
        expect(bar).not.toBeNull();
        expect(bar!.children).toHaveLength(3);
    });

    it('expands the phase list on click and shows durations with percentages', () => {
        render(<NodeTimingsBar timings={timings} totalMs={115000} />);
        expect(screen.queryByText('SamplerCustomAdvanced')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Node timings' }));
        expect(screen.getByText('SamplerCustomAdvanced')).toBeInTheDocument();
        expect(screen.getByText('01:40 (87%)')).toBeInTheDocument();
        expect(screen.getByText('Video Combine')).toBeInTheDocument();
        expect(screen.getByText('00:05 (4%)')).toBeInTheDocument();
    });

    it('renders nothing when there is no data', () => {
        const { container } = render(
            <NodeTimingsBar timings={[]} totalMs={100} />
        );
        expect(container.firstChild).toBeNull();
    });
});
