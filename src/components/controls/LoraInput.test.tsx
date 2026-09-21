import '@testing-library/jest-dom/vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoraInput } from './LoraInput';
import { TabContext, TabContextValueType } from '../contexts/TabContext';
import { config } from '../../redux/config';
import { tab } from '../../redux/tab';
import { I18nContext, defaultValue } from '../../i18n/I18nContext';
import { polyglot } from '../../testUtils';

// flip-toolkit reads matchMedia for responsive behavior.
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

// IndexedDB-backed settings hooks are irrelevant here; stub them so the real
// module (which pulls in Dexie) is never loaded.
vi.mock('../../hooks/useSetting', () => ({
    useMultiSetting: () => [],
    useBooleanSetting: () => false,
}));
// ObjectReloadButton reaches into react-query (useQueryClient); the test only
// cares about the chips, so stub it out.
vi.mock('./ObjectReloadButton', () => ({
    ObjectReloadButton: () => null,
}));

const makeStore = (loraOptions: string[]) =>
    configureStore({
        reducer: { config, tab },
        preloadedState: {
            config: {
                preview_root: '',
                loras: { qwen: { filter: '', defaults: {} } },
                object_info: {
                    LoraLoaderModelOnly: {
                        input: {
                            required: {
                                lora_name: ['COMBO', { options: loraOptions }],
                            },
                        },
                    },
                },
                tabs: {
                    T2V: {
                        handler_options: {
                            lora_params: {
                                api_input_name: 'model',
                                lora_input_name: 'model',
                                output_idx: 0,
                                output_node_ids: ['6'],
                                class_name: 'LoraLoaderModelOnly',
                                strength_field_name: 'strength',
                                name_field_name: 'lora_name',
                            },
                        },
                    },
                },
            },
            tab: {
                current_tab: 'T2V',
                api: {},
                prompt: {},
                params: { tab: '', values: {} },
                result: {},
            },
        } as any,
        middleware: (gdm: any) => gdm({ serializableCheck: false }),
    } as any);

const makeValues = (labels: string[]) =>
    labels.map((label) => ({
        id: `/models/${label}.safetensors`,
        label,
        strength: 1,
        merge: 1,
    }));

const Harness = ({
    loraValues,
    loraOptions,
}: {
    loraValues: { id: string; label: string; strength: number; merge: number }[];
    loraOptions: string[];
}) => {
    const store = makeStore(loraOptions);
    const form = useForm({ defaultValues: { lora: loraValues } });
    const ctx: TabContextValueType = {
        tab_name: 'T2V',
        api: 'T2V',
        handlers: {},
        setValue: () => {},
        handleCtrlEnter: () => {},
    };
    return (
        <Provider store={store}>
            <I18nContext.Provider
                value={{ ...defaultValue, polyglot, locale: 'en' }}
            >
                <TabContext.Provider value={ctx}>
                    <FormProvider {...form}>
                        <LoraInput name='lora' type='qwen' />
                    </FormProvider>
                </TabContext.Provider>
            </I18nContext.Provider>
        </Provider>
    );
};

describe('LoraInput drag-to-reorder', () => {
    it('renders one sortable chip per selected LoRA', () => {
        render(<Harness loraValues={makeValues(['a', 'b', 'c'])} loraOptions={['a', 'b', 'c']} />);

        expect(screen.getByText('a:1')).toBeInTheDocument();
        expect(screen.getByText('b:1')).toBeInTheDocument();
        expect(screen.getByText('c:1')).toBeInTheDocument();

        // dnd-kit wires each chip as a sortable item (role + roledescription).
        const sortable =
            document.querySelectorAll('[aria-roledescription="sortable"]');
        expect(sortable).toHaveLength(3);
    });

    it('still opens the strength dialog on chip click', () => {
        render(<Harness loraValues={makeValues(['a', 'b', 'c'])} loraOptions={['a', 'b', 'c']} />);

        // The dnd pointer listeners must not swallow the click.
        fireEvent.click(screen.getByText('a:1'));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});
