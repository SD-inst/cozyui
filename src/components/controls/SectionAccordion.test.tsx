import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SectionAccordion } from './SectionAccordion';

describe('SectionAccordion lazyContent', () => {
    it('mounts children only after first expansion', async () => {
        render(
            <SectionAccordion label='test_section' lazyContent>
                <div>heavy-content</div>
            </SectionAccordion>,
        );
        expect(screen.queryByText('heavy-content')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button'));
        expect(await screen.findByText('heavy-content')).toBeInTheDocument();
    });

    it('mounts children even when the caller uses slotProps.transition (autoscroll)', async () => {
        const onEntered = vi.fn();
        render(
            <SectionAccordion
                label='test_section'
                lazyContent
                slotProps={{ transition: { onEntered, timeout: 0 } }}
            >
                <div>heavy-content</div>
            </SectionAccordion>,
        );
        expect(screen.queryByText('heavy-content')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button'));
        expect(await screen.findByText('heavy-content')).toBeInTheDocument();
        expect(onEntered).toHaveBeenCalled();
    });

    it('keeps the details block stretched before lazy content mounts', () => {
        const { container } = render(
            <SectionAccordion label='test_section' lazyContent>
                <div>heavy-content</div>
            </SectionAccordion>,
        );
        const details = container.querySelector('.MuiAccordionDetails-root');
        expect(details).toHaveStyle({ width: '100%' });
    });
});
