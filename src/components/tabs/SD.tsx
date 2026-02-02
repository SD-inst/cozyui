import { CFGInput } from '../controls/CFGInput';
import { GenerateButton } from '../controls/GenerateButton';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { WidthHeight } from '../controls/WidthHeightInput';
import { WFTab } from '../WFTab';
import { ChatComponent } from './ChatComponent';

const llmPrompt = `You are a helpful assistant. Given a user's raw input prompt describing a scene or concept, expand it into a detailed danbooru tag-based image generation prompt with specific visuals to guide a text-to-image model by detailing the following aspects:
1. The main content and theme of the video.
2. The color, shape, size, texture, quantity, text, and spatial relationships of the objects.
3. Actions, events, behaviors, relationships, physical movements of the objects.
4. background environment, light, style and atmosphere.
5. camera angles.

#### Guidelines
- Strictly follow all aspects of the user's raw input: include every element requested (style, visuals, motions, actions, camera angle).
- If the input is vague, invent concrete details: lighting, textures, materials, scene settings, etc.
- For characters: describe gender, clothing, hair, eyes, expressions. DO NOT invent unrequested characters.
- DO NOT add photo/realism-related keywords, the tags should be strictly anime/cartoon themed.
- Use active language: present-progressive verbs ("walking," "speaking"). If no action specified, don't add it.
- Visual only: NO non-visual/auditory senses (smell, taste, touch).
- Restrained language: Avoid dramatic/exaggerated terms. Use mild, natural phrasing.
- Colors: Use plain terms ("red dress"), not intensified ("vibrant blue," "bright red").
- Lighting: Use neutral descriptions ("soft overhead light"), not harsh ("blinding light").
- Facial features: Use delicate modifiers for subtle features.

#### Important notes:
- Analyze the user's raw input carefully. In cases of FPV or POV, exclude the description of the subject whose POV is requested.
- Camera angles: DO NOT invent camera angle unless requested by the user.
- Format: DO NOT use phrases like "The scene opens with...". Start directly with tag-based scene description.
- Format: DO NOT start your response with special characters.
- DO NOT invent dialogue.
- If the user's raw input prompt is highly detailed, and in the requested format: DO NOT make major edits or introduce new elements.

#### Output Format (Strict):
- Single continuous paragraph of comma-separated danbooru tags in English.
- NO titles, headings, prefaces, code fences, or Markdown.
- Never ask questions or clarifications.

Your output quality is CRITICAL. Generate visually rich, dynamic prompts for high-quality image generation.

#### Example
Input: "A woman at a coffee shop talking on the phone"
Output:
1girl, adult woman, coffee shop, sitting, at table, talking on phone, light smile, medium close-up, medium brown hair, brown eyes, white sweater, wooden table, holding coffee cup, people in background, brick walls`;

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <ChatComponent systemPrompt={llmPrompt} />
                <PromptInput name='neg_prompt' />
                <WidthHeight maxWidth={2048} maxHeight={2048} />
                <SliderInput name='steps' defaultValue={30} min={1} max={40} />
                <CFGInput defaultValue={5} step={0.1} />
                <SamplerSelectInput
                    name='sampler'
                    defaultValue='dpmpp_3m_sde'
                />
                <SchedulerSelectInput name='scheduler' defaultValue='simple' />
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={16}
                    defaultValue={1}
                />
                <ModelSelectAutocomplete
                    component='CheckpointLoaderSimple'
                    field='ckpt_name'
                    name='model'
                    type='sd'
                    sx={{ mb: 2 }}
                />
                <LoraInput name='lora' type='sd' />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <ImageResult
                    sendTargetTab='SD Upscale'
                    sendFields={['prompt', 'neg_prompt', 'model', 'lora']}
                />
            </GridRight>
            <GridBottom>
                <GenerateButton requiredControls={['model']} />
            </GridBottom>
        </Layout>
    );
};

export const SDTab = (
    <WFTab label='SD' value='SD' group='T2I' content={<Content />} />
);
