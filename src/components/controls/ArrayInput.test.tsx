import '@testing-library/jest-dom/vitest';
import { useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Box } from '@mui/material';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import Polyglot from 'node-polyglot';

import { ArrayInput } from './ArrayInput';
import { TabContext, TabContextValueType } from '../contexts/TabContext';
import { hasRegisteredField } from '../../utils/registeredFields';
import { I18nContext, defaultValue } from '../../i18n/I18nContext';

// The compact-mode ArrayInput wires in storage/network hooks that are
// irrelevant to the name-remapping behaviour under test.
vi.mock('../../hooks/useApiURL', () => ({
    useApiURL: () => 'http://localhost:8188',
}));
vi.mock('../../hooks/useUploadBackupGuard', () => ({
    useUploadBackupGuard: () => {},
}));
vi.mock('../../hooks/useBackupUpload', () => ({
    useReuploadLost: () => () => {},
}));

let control: Control | undefined;

// Mimics the R2V reference-video row: a file field (child 0, dropped by the
// dialog) plus a direct toggle and a pair of controls wrapped in a Box. The
// Box-wrapped pair is exactly what the "open the badge dialog" bug exposed.
const Harness = () => {
    const form = useForm({
        defaultValues: {
            ref_videos: [
                { video: 'test.mp4', no_audio: false, trim: 0, last: false },
            ],
        },
    });
    useEffect(() => {
        control = form.control as unknown as Control;
    }, [form.control]);

    const ctx: TabContextValueType = {
        tab_name: 'R2V',
        api: 'R2V',
        handlers: {},
        setValue: () => {},
        handleCtrlEnter: () => {},
    };
    const polyglot = new Polyglot({ locale: 'en' });

    return (
        <TabContext.Provider value={ctx}>
            <I18nContext.Provider
                value={{ ...defaultValue, polyglot, locale: 'en' }}
            >
                <FormProvider {...form}>
                    <ArrayInput
                        name='ref_videos'
                        keyField='video'
                        newValue={{
                            video: '',
                            no_audio: false,
                            trim: 0,
                            last: false,
                        }}
                    >
                        <input name='video' />
                        <Controller
                            name='no_audio'
                            render={() => <input aria-label='no_audio' />}
                        />
                        <Box>
                            <Controller
                                name='trim'
                                render={({ field }) => (
                                    <input {...field} aria-label='trim' />
                                )}
                            />
                            <Controller
                                name='last'
                                render={({ field }) => (
                                    <input {...field} aria-label='last' />
                                )}
                            />
                        </Box>
                    </ArrayInput>
                </FormProvider>
            </I18nContext.Provider>
        </TabContext.Provider>
    );
};

describe('ArrayInput compact-mode controls dialog', () => {
    it('remaps nested controls to per-item fields, not top-level fields', async () => {
        render(<Harness />);

        // Open the per-item controls dialog by clicking the numbered badge.
        fireEvent.click(screen.getByText('1'));

        await waitFor(() => {
            expect(hasRegisteredField(control, 'ref_videos.0.trim')).toBe(true);
        });

        // Before the fix these mounted as bogus top-level form fields
        // (`trim` / `last`), which triggered "Missing API bindings".
        expect(hasRegisteredField(control, 'trim')).toBe(false);
        expect(hasRegisteredField(control, 'last')).toBe(false);
        // The direct (unwrapped) child stays correctly nested as before.
        expect(hasRegisteredField(control, 'no_audio')).toBe(false);
        expect(hasRegisteredField(control, 'ref_videos.0.no_audio')).toBe(true);
    });
});
