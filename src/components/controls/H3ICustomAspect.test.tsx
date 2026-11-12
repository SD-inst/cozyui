import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { polyglot } from '../../testUtils';
import { I18nContext, defaultValue } from '../../i18n/I18nContext';
import {
    TabContext,
    TabContextValueType,
} from '../contexts/TabContext';
import { H3ICustomAspect } from './H3ICustomAspect';

const makeCtx = (): TabContextValueType => ({
    tab_name: 'H3 Image I2I',
    api: 'H3 Image I2I',
    handlers: {},
    setValue: () => {},
    handleCtrlEnter: () => {},
});

const Harness = () => {
    const form = useForm();
    return (
        <TabContext.Provider value={makeCtx()}>
            <I18nContext.Provider
                value={{ ...defaultValue, polyglot, locale: 'en' }}
            >
                <FormProvider {...form}>
                    <H3ICustomAspect />
                </FormProvider>
            </I18nContext.Provider>
        </TabContext.Provider>
    );
};

describe('H3ICustomAspect', () => {
    it('shows the aspect list only while the toggle is on', () => {
        render(<Harness />);

        expect(screen.queryByLabelText('aspect ratio')).toBeNull();
        fireEvent.click(screen.getByLabelText('custom aspect ratio'));
        expect(screen.getByLabelText('aspect ratio')).toBeInTheDocument();
    });

    it('labels the list from its own key, not from the nested field name', () => {
        render(<Harness />);
        fireEvent.click(screen.getByLabelText('custom aspect ratio'));

        // The field is `custom_aspect.aspect_ratio`; a label derived from that
        // path would render the untranslated key instead of the phrase.
        const select = screen.getByLabelText('aspect ratio');
        expect(select).toHaveAttribute('aria-label', 'aspect ratio');
        expect(screen.queryByText('controls.aspect_ratio')).toBeNull();
    });
});
