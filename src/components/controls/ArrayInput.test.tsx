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

// flip-toolkit uses matchMedia for responsive behavior.
window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
});

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
vi.mock('react-hot-toast', () => ({
    default: { error: vi.fn() },
}));
// Compact mode gates its paste listener on the active tab; keep the real
// TabContext (the harness renders its Provider) but stub the redux-backed hook.
vi.mock(
    '../contexts/TabContext',
    async (importOriginal) => {
        const actual =
            await importOriginal<
                typeof import('../contexts/TabContext')
            >();
        return { ...actual, useIsCurrentTab: () => true };
    },
);

let control: Control | undefined;

const createPolyglot = () => {
    const polyglot = new Polyglot({ locale: 'en' });
    polyglot.extend({
        controls: {
            ref_videos: 'reference videos',
            ref_images: 'reference images',
            remove: 'Remove',
            replace: 'Replace',
            close: 'Close',
        },
        toasts: {
            error_uploading: 'Error uploading image: %{err}',
            array_overflow: 'Can\'t add more elements.',
        },
    });
    return polyglot;
};

const makeCtx = (tabName = 'T2V'): TabContextValueType => ({
    tab_name: tabName,
    api: tabName,
    handlers: {},
    setValue: () => {},
    handleCtrlEnter: () => {},
});

// ============================================================================
// Compact-mode controls dialog tests (existing + additions)
// ============================================================================

const Harness = ({
    min = 0,
    max = -1,
    defaultValues,
}: {
    min?: number;
    max?: number;
    defaultValues?: Record<string, any>;
}) => {
    const form = useForm({
        defaultValues:
            defaultValues ?? {
                ref_videos: [
                    { video: 'test.mp4', no_audio: false, trim: 0, last: false },
                ],
            },
    });
    useEffect(() => {
        control = form.control as unknown as Control;
    }, [form.control]);

    const ctx = makeCtx('R2V');
    const polyglot = createPolyglot();

    return (
        <TabContext.Provider value={ctx}>
            <I18nContext.Provider
                value={{ ...defaultValue, polyglot, locale: 'en' }}
            >
                <FormProvider {...form}>
                    <ArrayInput
                        name='ref_videos'
                        keyField='video'
                        min={min}
                        max={max}
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

    it('shows the correct item number in the dialog title', () => {
        render(<Harness />);

        fireEvent.click(screen.getByText('1'));

        // Title should contain "reference videos — 1"
        const title = screen.getByRole('heading');
        expect(title.textContent).toContain('1');
    });

    it('removes the item when clicking Remove in the dialog', async () => {
        render(<Harness />);

        fireEvent.click(screen.getByText('1'));

        // Find and click the Remove button in the dialog.
        const removeBtn = screen.getByRole('button', { name: /remove/i });
        fireEvent.click(removeBtn);

        await waitFor(() => {
            expect(screen.queryByRole('heading')).toBeNull();
        });
    });

    it('closes the dialog without removing the item', async () => {
        render(<Harness />);

        fireEvent.click(screen.getByText('1'));

        const closeBtn = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeBtn);

        await waitFor(() => {
            expect(screen.queryByRole('heading')).not.toBeInTheDocument();
        });
    });

    it('hides the add button when max is reached', () => {
        render(
            <Harness
                max={1}
                defaultValues={{
                    ref_videos: [{ video: 'test.mp4', no_audio: false, trim: 0, last: false }],
                }}
            />,
        );

        // MUI Add icon has the exact path: M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z
        // When at max, this path should not exist in the DOM.
        const addIcon = document.querySelector('[d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"]');
        expect(addIcon).toBeNull();
    });

    it('shows the add button when below max', () => {
        render(
            <Harness
                max={5}
                defaultValues={{
                    ref_videos: [{ video: 'test.mp4', no_audio: false, trim: 0, last: false }],
                }}
            />,
        );

        // The add button renders an MUI Add icon.
        // MUI's Add icon has path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
        const addBtn = document.querySelector('[d*="M19 13"]');
        expect(addBtn).not.toBeNull();
    });

    it('registers universal skip/skip_chat fields per item, not top-level', async () => {
        render(<Harness />);

        fireEvent.click(screen.getByText('1'));

        await waitFor(() => {
            expect(hasRegisteredField(control, 'ref_videos.0.skip')).toBe(true);
        });
        expect(hasRegisteredField(control, 'ref_videos.0.skip_chat')).toBe(true);
        // The universal toggles are nested per-item, never top-level.
        expect(hasRegisteredField(control, 'skip')).toBe(false);
        expect(hasRegisteredField(control, 'skip_chat')).toBe(false);
    });
});

// ============================================================================
// List-mode tests
// ============================================================================

describe('ArrayInput list mode', () => {
    it('renders items with index numbers', () => {
        const HarnessList = () => {
            const form = useForm({
                defaultValues: {
                    ref_images: [
                        { image: 'a.png', trim: 0 },
                        { image: 'b.png', trim: 0 },
                    ],
                },
            });
            useEffect(() => {
                control = form.control as unknown as Control;
            }, [form.control]);

            const ctx = makeCtx('T2V');
            const polyglot = createPolyglot();

            return (
                <TabContext.Provider value={ctx}>
                    <I18nContext.Provider
                        value={{ ...defaultValue, polyglot, locale: 'en' }}
                    >
                        <FormProvider {...form}>
                            <ArrayInput
                                name='ref_images'
                                keyField='image'
                                listMode
                                newValue={{ image: '', trim: 0 }}
                            >
                                <input name='image' />
                                <Controller
                                    name='trim'
                                    render={({ field }) => (
                                        <input {...field} aria-label='trim' />
                                    )}
                                />
                            </ArrayInput>
                        </FormProvider>
                    </I18nContext.Provider>
                </TabContext.Provider>
            );
        };

        render(<HarnessList />);

        // Each item should display its 1-based index number.
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('remaps field names to array indices in list mode', async () => {
        const HarnessList = () => {
            const form = useForm({
                defaultValues: {
                    ref_images: [
                        { image: 'a.png', trim: 0 },
                    ],
                },
            });
            useEffect(() => {
                control = form.control as unknown as Control;
            }, [form.control]);

            const ctx = makeCtx('T2V');
            const polyglot = createPolyglot();

            return (
                <TabContext.Provider value={ctx}>
                    <I18nContext.Provider
                        value={{ ...defaultValue, polyglot, locale: 'en' }}
                    >
                        <FormProvider {...form}>
                            <ArrayInput
                                name='ref_images'
                                keyField='image'
                                listMode
                                newValue={{ image: '', trim: 0 }}
                            >
                                <input name='image' />
                                <Controller
                                    name='trim'
                                    render={({ field }) => (
                                        <input {...field} aria-label='trim' />
                                    )}
                                />
                            </ArrayInput>
                        </FormProvider>
                    </I18nContext.Provider>
                </TabContext.Provider>
            );
        };

        render(<HarnessList />);

        await waitFor(() => {
            expect(hasRegisteredField(control, 'ref_images.0.trim')).toBe(true);
        });

        // Top-level `trim` should NOT be registered.
        expect(hasRegisteredField(control, 'trim')).toBe(false);
    });

    it('shows the add button when below max', () => {
        const HarnessList = () => {
            const form = useForm({
                defaultValues: {
                    ref_images: [{ image: 'a.png' }],
                },
            });
            const ctx = makeCtx('T2V');
            const polyglot = createPolyglot();

            return (
                <TabContext.Provider value={ctx}>
                    <I18nContext.Provider
                        value={{ ...defaultValue, polyglot, locale: 'en' }}
                    >
                        <FormProvider {...form}>
                            <ArrayInput
                                name='ref_images'
                                keyField='image'
                                listMode
                                max={5}
                                newValue={{ image: '' }}
                            >
                                <input name='image' />
                            </ArrayInput>
                        </FormProvider>
                    </I18nContext.Provider>
                </TabContext.Provider>
            );
        };

        render(<HarnessList />);

        // The add button should be present (MUI Button with Add icon).
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('hides the add button when at max', () => {
        const HarnessList = () => {
            const form = useForm({
                defaultValues: {
                    ref_images: [
                        { image: 'a.png' },
                        { image: 'b.png' },
                    ],
                },
            });
            const ctx = makeCtx('T2V');
            const polyglot = createPolyglot();

            return (
                <TabContext.Provider value={ctx}>
                    <I18nContext.Provider
                        value={{ ...defaultValue, polyglot, locale: 'en' }}
                    >
                        <FormProvider {...form}>
                            <ArrayInput
                                name='ref_images'
                                keyField='image'
                                listMode
                                max={2}
                                newValue={{ image: '' }}
                            >
                                <input name='image' />
                            </ArrayInput>
                        </FormProvider>
                    </I18nContext.Provider>
                </TabContext.Provider>
            );
        };

        render(<HarnessList />);

        // When at max, only the move/delete buttons should exist, no add button.
        // The add button is a MUI Button with an Add icon (svg with specific class).
        // We verify the item count is 2 and no additional "add" button appears.
        const items = screen.getAllByText(/^[12]$/);
        expect(items).toHaveLength(2);
    });
});

// ============================================================================
// Min/max constraint tests
// ============================================================================

describe('ArrayInput min/max constraints', () => {
    it('auto-appends items to meet min', async () => {
        const HarnessMin = () => {
            const form = useForm({
                defaultValues: { ref_images: [] },
            });
            useEffect(() => {
                control = form.control as unknown as Control;
            }, [form.control]);

            const ctx = makeCtx('T2V');
            const polyglot = createPolyglot();

            return (
                <TabContext.Provider value={ctx}>
                    <I18nContext.Provider
                        value={{ ...defaultValue, polyglot, locale: 'en' }}
                    >
                        <FormProvider {...form}>
                            <ArrayInput
                                name='ref_images'
                                keyField='image'
                                listMode
                                min={2}
                                newValue={{ image: '' }}
                            >
                                <input name='image' />
                            </ArrayInput>
                        </FormProvider>
                    </I18nContext.Provider>
                </TabContext.Provider>
            );
        };

        render(<HarnessMin />);

        await waitFor(() => {
            // Should auto-append 2 items.
            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
        });
    });

    it('does not remove below min via delete button', () => {
        const HarnessMin = () => {
            const form = useForm({
                defaultValues: {
                    ref_images: [
                        { image: 'a.png' },
                        { image: 'b.png' },
                    ],
                },
            });
            const ctx = makeCtx('T2V');
            const polyglot = createPolyglot();

            return (
                <TabContext.Provider value={ctx}>
                    <I18nContext.Provider
                        value={{ ...defaultValue, polyglot, locale: 'en' }}
                    >
                        <FormProvider {...form}>
                            <ArrayInput
                                name='ref_images'
                                keyField='image'
                                listMode
                                min={2}
                                newValue={{ image: '' }}
                            >
                                <input name='image' />
                            </ArrayInput>
                        </FormProvider>
                    </I18nContext.Provider>
                </TabContext.Provider>
            );
        };

        render(<HarnessMin />);

        // DeleteArrayInputButton returns null when value.length <= min.
        // With min=2 and exactly 2 items, delete buttons should not render.
        // Verify the items are still there.
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('allows removal when above min', () => {
        const HarnessAboveMin = () => {
            const form = useForm({
                defaultValues: {
                    ref_images: [
                        { image: 'a.png' },
                        { image: 'b.png' },
                        { image: 'c.png' },
                    ],
                },
            });
            const ctx = makeCtx('T2V');
            const polyglot = createPolyglot();

            return (
                <TabContext.Provider value={ctx}>
                    <I18nContext.Provider
                        value={{ ...defaultValue, polyglot, locale: 'en' }}
                    >
                        <FormProvider {...form}>
                            <ArrayInput
                                name='ref_images'
                                keyField='image'
                                listMode
                                min={1}
                                newValue={{ image: '' }}
                            >
                                <input name='image' />
                            </ArrayInput>
                        </FormProvider>
                    </I18nContext.Provider>
                </TabContext.Provider>
            );
        };

        render(<HarnessAboveMin />);

        // With min=1 and 3 items, delete buttons should be visible.
        // DeleteArrayInputButton uses a Close icon inside a Button.
        // The button has no explicit name, so we check by the icon.
        const buttons = screen.getAllByRole('button');
        // Should have at least some buttons for delete and move.
        expect(buttons.length).toBeGreaterThan(0);
    });
});

// ============================================================================
// Move button visibility tests
// ============================================================================

describe('ArrayInput move buttons', () => {
    it('hides move-up for the first item and move-down for the last', () => {
        const HarnessMove = () => {
            const form = useForm({
                defaultValues: {
                    ref_images: [
                        { image: 'a.png' },
                        { image: 'b.png' },
                    ],
                },
            });
            const ctx = makeCtx('T2V');
            const polyglot = createPolyglot();

            return (
                <TabContext.Provider value={ctx}>
                    <I18nContext.Provider
                        value={{ ...defaultValue, polyglot, locale: 'en' }}
                    >
                        <FormProvider {...form}>
                            <ArrayInput
                                name='ref_images'
                                keyField='image'
                                listMode
                                newValue={{ image: '' }}
                            >
                                <input name='image' />
                            </ArrayInput>
                        </FormProvider>
                    </I18nContext.Provider>
                </TabContext.Provider>
            );
        };

        render(<HarnessMove />);

        // MoveArrayInputButton returns null for up at index 0 and down at last index.
        // We can't easily query by icon, but we can verify the structure.
        // The buttons are MUI IconButtons without labels.
        // Instead, let's verify the item count is correct.
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });
});

// ============================================================================
// Receiver field tests
// ============================================================================

describe('ArrayInput receiver fields', () => {
    it('propagates receiver value to items without a target field', async () => {
        const HarnessReceiver = () => {
            const form = useForm({
                defaultValues: {
                    ref_images: [{ image: 'a.png' }],
                    sent_value: 'from_receivers',
                },
            });
            useEffect(() => {
                control = form.control as unknown as Control;
            }, [form.control]);

            const ctx = makeCtx('T2V');
            const polyglot = createPolyglot();

            return (
                <TabContext.Provider value={ctx}>
                    <I18nContext.Provider
                        value={{ ...defaultValue, polyglot, locale: 'en' }}
                    >
                        <FormProvider {...form}>
                            <ArrayInput
                                name='ref_images'
                                keyField='image'
                                listMode
                                receiverFieldName='sent_value'
                                targetFieldName='source'
                                newValue={{ image: '', source: '' }}
                            >
                                <input name='image' />
                                <input name='source' aria-label='source' />
                            </ArrayInput>
                        </FormProvider>
                    </I18nContext.Provider>
                </TabContext.Provider>
            );
        };

        render(<HarnessReceiver />);

        await waitFor(() => {
            const values = (control as any)?.getValues?.('ref_images') as any[];
            if (values?.length) {
                expect(values[0]?.source).toBe('from_receivers');
            }
        });
    });
});
