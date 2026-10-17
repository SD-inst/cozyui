import { CropSquare } from '@mui/icons-material';
import { Button, useEventCallback } from '@mui/material';
import { Suspense, lazy, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ChatComponent } from '../../chat/ChatComponent';
import { CFGInput } from '../../controls/CFGInput';
import { GenerateButton } from '../../controls/GenerateButton';
import { ImageResult } from '../../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { LoraInput } from '../../controls/LoraInput';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { PromptInput } from '../../controls/PromptInput';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../../controls/SchedulerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { WidthHeight } from '../../controls/WidthHeightInput';
import { useTranslate } from '../../../i18n/I18nContext';
import { WFTab } from '../../WFTab';

const MossLayoutEditor = lazy(() =>
    import('../../controls/moss_bb/MossLayoutEditor').then((m) => ({
        default: m.MossLayoutEditor,
    })),
);

const mossImageSystemPrompt = () =>
    import('../../chat/prompts/mossImage').then((m) => m.mossImageSystemPrompt);

const MossChat = () => {
    const tr = useTranslate();
    const { setValue, getValues } = useFormContext();
    const transform = useEventCallback(
        async (text: string): Promise<string> => {
            // Lazy: keeps the MOSS layout compiler out of the eager chunk.
            const { extractMossPrompt } = await import(
                '../../../utils/mossLayout'
            );
            const result = extractMossPrompt(text);
            switch (result.kind) {
                case 'caption':
                    return result.prompt;
                case 'layout':
                    setValue('width', result.width);
                    setValue('height', result.height);
                    return result.prompt;
                case 'error':
                    toast.error(
                        tr('toasts.moss_layout_invalid', {
                            err: result.message,
                        }),
                    );
                    return text;
                default:
                    return text;
            }
        },
    );
    const refineMessage = useEventCallback(
        (promptText: string): string => {
            const [width, height] = getValues(['width', 'height']) as [
                number,
                number,
            ];
            return `Update the prompt. Canvas size: ${width}x${height}.\n\n${promptText}`;
        },
    );
    return (
        <ChatComponent
            systemPrompt={mossImageSystemPrompt}
            transformAssistantMessage={transform}
            buildRefineMessage={refineMessage}
        />
    );
};

const Content = () => {
    const tr = useTranslate();
    const [editorOpen, setEditorOpen] = useState(false);
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <Button
                    size='small'
                    variant='outlined'
                    startIcon={<CropSquare />}
                    onClick={() => setEditorOpen(true)}
                    sx={{ alignSelf: 'center', mb: 2 }}
                >
                    {tr('moss_bb.edit')}
                </Button>
                {editorOpen && (
                    <Suspense>
                        <MossLayoutEditor onClose={() => setEditorOpen(false)} />
                    </Suspense>
                )}
                <MossChat />
                <PromptInput name='neg_prompt' />
                <WidthHeight maxWidth={2048} maxHeight={2048} />
                <SliderInput name='steps' defaultValue={20} min={1} max={100} />
                <CFGInput defaultValue={5} />
                <SamplerSelectInput name='sampler' defaultValue='seeds_2' />
                <SchedulerSelectInput name='scheduler' defaultValue='sgm_uniform' />
                <ModelSelectAutocomplete
                    name='model'
                    type='moss'
                    sx={{ mb: 2 }}
                />
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={16}
                    defaultValue={1}
                />
                <LoraInput name='lora' type='moss' sx={{ mb: 2 }} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <ImageResult />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const MossImageTab = (
    <WFTab
        label='Moss Image'
        value='Moss Image'
        group='T2I'
        content={<Content />}
    />
);
