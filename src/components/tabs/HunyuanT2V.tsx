import { AdvancedSettings } from '../controls/AdvancedSettings';
import { ClipSelectInput } from '../controls/ClipSelectInput';
import { CompileModelToggle } from '../controls/CompileModelToggle';
import { DoublePromptInput } from '../controls/DoublePromptInput';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
import { HYLengthInput } from '../controls/HYLengthInput';
import { HYNAG } from '../controls/HYNAG';
import { HYRiflexInput } from '../controls/HYRiflexInput';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TeaCacheInput } from '../controls/TeaCacheInput';
import { VideoImageOverride } from '../controls/VideoImageOverride';
import { VideoImageResult } from '../controls/VideoImageResult';
import { VideoInterpolationSlider } from '../controls/VideoInterpolationSlider';
import { VirtualVRAMSliderInput } from '../controls/VirtualVRAMSliderInput';
import { WidthHeight } from '../controls/WidthHeightInput';
import { WFTab } from '../WFTab';
import { ChatComponent } from './ChatComponent';

const llmPrompt = `You are a helpful assistant. Given a user's raw input prompt describing a scene or concept, expand it into a detailed video generation prompt with specific visuals to guide a text-to-video model by detailing the following aspects:
1. The main content and theme of the video.
2. The color, shape, size, texture, quantity, text, and spatial relationships of the objects.
3. Actions, events, behaviors temporal relationships, physical movement changes of the objects.
4. background environment, light, style and atmosphere.
5. camera angles, movements, and transitions used in the video.

#### Guidelines
- Strictly follow all aspects of the user's raw input: include every element requested (style, visuals, motions, actions, camera movement).
- If the input is vague, invent concrete details: lighting, textures, materials, scene settings, etc.
- For characters: describe gender, clothing, hair, expressions. DO NOT invent unrequested characters.
- Use active language: present-progressive verbs ("is walking," "speaking"). If no action specified, describe natural movements.
- Maintain chronological flow: use temporal connectors ("as," "then," "while").
- Visual only: NO non-visual/auditory senses (smell, taste, touch).
- Restrained language: Avoid dramatic/exaggerated terms. Use mild, natural phrasing.
- Colors: Use plain terms ("red dress"), not intensified ("vibrant blue," "bright red").
- Lighting: Use neutral descriptions ("soft overhead light"), not harsh ("blinding light").
- Facial features: Use delicate modifiers for subtle features.

#### Important notes:
- Analyze the user's raw input carefully. In cases of FPV or POV, exclude the description of the subject whose POV is requested.
- Camera motion: DO NOT invent camera motion unless requested by the user.
- No timestamps or cuts: DO NOT use timestamps or describe scene cuts unless explicitly requested.
- Format: DO NOT use phrases like "The scene opens with...". Start directly with chronological scene description.
- Format: DO NOT start your response with special characters.
- DO NOT invent dialogue.
- If the user's raw input prompt is highly detailed, chronological and in the requested format: DO NOT make major edits or introduce new elements.

#### Output Format (Strict):
- Single continuous paragraph in natural language (English).
- NO titles, headings, prefaces, code fences, or Markdown.
- Never ask questions or clarifications.

Your output quality is CRITICAL. Generate visually rich, dynamic prompts for high-quality video generation.

#### Example
Input: "A woman at a coffee shop talking on the phone"
Output:
In a medium close-up, a woman in her early 30s with shoulder-length brown hair sits at a small wooden table by the window. She wears a cream-colored turtleneck sweater, holding a white ceramic coffee cup in one hand and a smartphone to her ear with the other. The woman listens intently, nodding slightly, then takes a sip of her coffee and sets it down with a soft clink. Her face brightens into a warm smile as she speaks. She laughs softly and shifts in her chair. Behind her, other patrons move subtly in and out of focus. She concludes speaking cheerfully, lowering the phone.`;

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <DoublePromptInput name='prompt' />
                <ChatComponent systemPrompt={llmPrompt} />
                <WidthHeight defaultWidth={848} defaultHeight={480} />
                <HYLengthInput />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <GuidanceInput />
                <FlowShiftInput />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        type='hunyuan'
                        name='model'
                        sx={{ mb: 2 }}
                    />
                    <ClipSelectInput name='clip_model' />
                    <SamplerSelectInput name='sampler' />
                    <SchedulerSelectInput name='scheduler' />
                    <VirtualVRAMSliderInput name='virtual_vram' />
                    <TeaCacheInput />
                    <HYNAG name='nag' />
                    <HYRiflexInput name='riflex' />
                    <VideoInterpolationSlider />
                    <CompileModelToggle />
                </AdvancedSettings>
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput name='lora' type='hunyuan' />
                <VideoImageOverride />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <VideoImageResult
                    sendTargetTab='Hunyuan Upscale'
                    sendFields={['prompt', 'model', 'lora']}
                />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const HunyanT2VTab = (
    <WFTab
        label='Hunyuan'
        value='Hunyuan T2V'
        group='T2V'
        content={<Content />}
    />
);
