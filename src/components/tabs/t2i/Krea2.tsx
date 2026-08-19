import { ChatComponent } from '../../chat/ChatComponent';
import { CFGInput } from '../../controls/CFGInput';
import { GenerateButton } from '../../controls/GenerateButton';
import { I2IToggle } from '../../controls/I2IToggle';
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
import { WFTab } from '../../WFTab';

const llmPrompt = `You are a helpful assistant. Given a user's raw input prompt describing a scene or concept, expand it into an extremely detailed natural language image generation prompt.

#### Output Format
- Output exactly ONE paragraph. No line breaks, no lists, no tags, no structural markers.
- Write in short, simple, declarative sentences. Each sentence describes one specific visual element.
- Start directly with the medium/device/style (e.g. "A candid photo taken on iPhone", "A 3D render in Unreal Engine 5", "An oil painting in the style of...").
- Follow with subject description: pose, body position, physical features (eyes, hair, skin, build), clothing details, expressions, gaze direction.
- Then describe objects the subject interacts with: what they hold, wear, touch, and specific details on those objects (text, colors, textures).
- Then describe background elements: other subjects, animals, objects, architecture, nature. Be specific about what each is doing or how it looks.
- End with background treatment: depth of field, blur, haze, or any environmental effects.

#### Style
- Match the style the user requests (photorealistic, 3D render, anime, painterly, watercolor, digital illustration, etc.).
- If the user does not specify a style, choose one that fits the subject and mood.
- Describe how the chosen medium renders textures, light, and colors.

#### Language
- Clear, concrete, and direct. Short sentences. No metaphors, no poetic flourishes, no literary phrasing.
- Use precise anatomical and visual terms. If NSFW content is required, describe it with explicit anatomical accuracy — be direct, not euphemistic.
- Use active, present-tense language throughout.
- Visual only: NO non-visual/auditory senses (smell, taste, touch).
- Be exhaustive: invent specific concrete details for everything the user mentions — materials, colors, textures, objects, text, brands, devices. Never leave anything vague.
- For characters: describe gender, clothing, hair, eyes, expressions, body type in vivid detail. DO NOT invent unrequested characters.
- If the user's input is highly detailed, preserve all their details and only expand where they are vague.

#### Important notes:
- Analyze the user's raw input carefully. For FPV or POV shots, exclude the description of the subject whose POV is shown.
- Camera angles: DO NOT invent a camera angle unless requested by the user.
- Format: Start directly with the scene description. Do NOT use phrases like "The scene opens with..." or "A painting of...".
- Output ONLY the expanded prompt, no explanations or extra text.

#### Example
Input: Photo of a woman on the beach with a cat and dog building a sand castle in background.
Output: A candid photo taken on iPhone showing a young brunette woman lying on a beach chair at the beach, leaning back. One of her legs is bent at the knee. She has brown eyes, curly brown hair, freckles. She's teasing the viewer with a playful smile. She holds a cocktail glass with a red liquid and on the glass itself is a text in cursive "Anna" with a heart symbol. She's drinking the liquid through a plastic straw. In background a cat and a dog are making a sand castle together. The cat is holding a small plastic bucket with water in its paw, the dog forms the castle towers with its front paws. The background is slightly out of focus.`;

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <I2IToggle name='i2i' />
                <ChatComponent systemPrompt={llmPrompt} />
                <PromptInput name='neg_prompt' />
                <WidthHeight maxWidth={2048} maxHeight={2048} />
                <SliderInput name='steps' defaultValue={10} min={1} max={40} />
                <CFGInput defaultValue={1} />
                <SamplerSelectInput name='sampler' defaultValue='er_sde' />
                <SchedulerSelectInput name='scheduler' defaultValue='simple' />
                <ModelSelectAutocomplete
                    name='model'
                    type='krea2'
                    sx={{ mb: 2 }}
                />
                <SliderInput name='batch_size' min={1} max={16} defaultValue={1} />
                <LoraInput name='lora' type='krea2' sx={{ mb: 2 }} />
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

export const Krea2Tab = (
    <WFTab
        label='Krea2'
        value='Krea2'
        group='T2I'
        receivers={[{ name: 'i2i', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
