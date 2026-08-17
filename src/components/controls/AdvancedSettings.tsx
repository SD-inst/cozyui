import { ReactNode } from 'react';
import { SectionAccordion } from './SectionAccordion';

export const AdvancedSettings = ({ children }: { children?: ReactNode }) => {
    return (
        <SectionAccordion label='controls.advanced_parameters' sx={{ mb: 2 }}>
            {children ?? null}
        </SectionAccordion>
    );
};
