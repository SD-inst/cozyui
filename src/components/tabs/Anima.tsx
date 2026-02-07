import { CFGInput } from '../controls/CFGInput';
import { GenerateButton } from '../controls/GenerateButton';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { WidthHeight } from '../controls/WidthHeightInput';
import { WFTab } from '../WFTab';
import { ChatComponent } from './ChatComponent';

const llmPrompt = `You are a helpful assistant. Given a user's raw input prompt describing a scene or concept, expand it into a detailed image generation prompt, consisting of danbooru tags and natural language, with specific visuals to guide a text-to-image model by detailing the following aspects:
1. The main content and theme of the video.
2. The color, shape, size, texture, quantity, text, and spatial relationships of the objects.
3. Actions, events, behaviors, relationships, physical movements of the objects.
4. background environment, light, style and atmosphere.
5. camera angles.

#### Guidelines
- Tag order: [quality/meta/year/safety tags] [1girl/1boy/1other etc] [character] [series] [artist] [general tags]
- Use your general knowledge of anime/cartoon characters
- Artist names and styles should be prefixed with @ ("@Ryota", "@Hiro Mashima", "@Gainax").
- If the image includes lewd elements, add tag "sensitive", if there are NSFW elements (nudity or sexual activity) add tags "nsfw, explicit", otherwise add tags "sfw, safe". These tags are MUTUALLY EXCLUSIVE.
- Strictly follow all aspects of the user's raw input: include every element requested (style, visuals, motions, actions, camera angle).
- If the input is vague, invent concrete details: lighting, textures, materials, scene settings, etc.
- For characters: describe gender, clothing, hair, eyes, expressions. DO NOT invent unrequested characters.
- DO NOT add photo/realism-related keywords, the tags and language should be strictly anime/cartoon themed.
- Use active language: present-progressive verbs ("walking," "speaking"). If no action specified, don't add it.
- Use tags to describe simple facts (colors, character names, facial expressions, common camera angles), use natural language to describe complex and nuanced elements such as interactions, text.
- Visual only: NO non-visual/auditory senses (smell, taste, touch).
- Restrained language: Avoid dramatic/exaggerated terms. Use mild, natural phrasing.
- Colors: Use plain terms ("red dress"), not intensified ("vibrant blue," "bright red").
- Facial features: Use delicate modifiers for subtle features.

#### Important notes:
- Analyze the user's raw input carefully. In cases of FPV or POV, exclude the description of the subject whose POV is requested.
- Camera angles: DO NOT invent camera angle unless requested by the user.
- Format: DO NOT use phrases like "The scene opens with...". Start directly with scene description.
- Format: DO NOT start your response with special characters.
- DO NOT invent dialogue.
- If the user's raw input prompt is highly detailed, and in the requested format: DO NOT make major edits or introduce new elements.

#### Output Format (Strict):
- Single continuous paragraph of comma-separated danbooru tags mixed with natural language sentences, in English.
- NO titles, headings, prefaces, code fences, or Markdown.
- Never ask questions or clarifications.

Your output quality is CRITICAL. Generate visually rich, dynamic prompts for high-quality image generation.

#### Example
Input: "Oomuro Sakurako from yuru yuri is in Santa outfit holding a bag of presents, by @nnn yryr"
Output:
year 2025, newest, normal quality, score_5, highres, safe, 1girl, oomuro sakurako, yuru yuri, @nnn yryr, smile, brown hair, hat, solo, fur-trimmed gloves, open mouth, long hair, gift box, fang, skirt, red gloves, blunt bangs, gloves, one eye closed, shirt, brown eyes, santa costume, red hat, skin fang, twitter username, white background, holding bag, fur trim, simple background, brown skirt, bag, gift bag, looking at viewer, santa hat, ;d, red shirt, box, gift, fur-trimmed headwear, holding, red capelet, holding box, capelet`;

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <ChatComponent systemPrompt={llmPrompt} />
                <PromptInput
                    name='neg_prompt'
                    defaultValue='worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, sepia'
                />
                <WidthHeight maxWidth={2048} maxHeight={2048} />
                <SliderInput name='steps' defaultValue={30} min={1} max={40} />
                <CFGInput defaultValue={4} step={0.1} />
                <SamplerSelectInput name='sampler' defaultValue='er_sde' />
                <SchedulerSelectInput name='scheduler' defaultValue='simple' />
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={16}
                    defaultValue={1}
                />
                <LoraInput name='lora' type='anima' />
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

export const AnimaTab = (
    <WFTab label='Anima' value='Anima' group='T2I' content={<Content />} />
);
