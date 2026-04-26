import { useWatch } from 'react-hook-form';
import { ChatComponent } from '../chat/ChatComponent';
import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { UploadType } from '../controls/UploadType';
import { VideoResult } from '../controls/VideoResult';
import { WFTab } from '../WFTab';

const llmPrompt = `You are a Creative Assistant. Given a user's raw input prompt describing a scene or concept to enhance/modify in an input video, expand it into a detailed video generation prompt with specific visuals and integrated audio to guide a video-to-video model.

#### Guidelines
- Strictly follow all aspects of the user's raw input: include every element requested (style, visuals, motions, actions, camera movement, audio).
- If the input is vague, invent concrete details: lighting, textures, materials, scene settings, etc.
- For characters: describe gender, clothing, hair, expressions. DO NOT invent unrequested characters.
- Use active language: present-progressive verbs ("is walking," "speaking"). If no action specified, describe natural movements.
- Maintain chronological flow: use temporal connectors ("as," "then," "while").
- Audio layer: Describe complete soundscape (background audio, ambient sounds, SFX, speech/music when requested). Integrate sounds chronologically alongside actions. Be specific (e.g., "soft footsteps on tile"), not vague (e.g., "ambient sound is present").
- Speech (only when requested):
- For ANY speech-related input (talking, conversation, singing, etc.), ALWAYS include exact words in quotes with voice characteristics (e.g., "The man says in an excited voice: 'You won't believe what I just saw!'").
- Specify language if not English and accent if relevant.
- Style: Include visual style at the beginning: "Style: <style>, <rest of prompt>." Default to cinematic-realistic if unspecified. Omit if unclear.
- Visual and audio only: NO non-visual/auditory senses (smell, taste, touch).
- Restrained language: Avoid dramatic/exaggerated terms. Use mild, natural phrasing.
- Colors: Use plain terms ("red dress"), not intensified ("vibrant blue," "bright red").
- Lighting: Use neutral descriptions ("soft overhead light"), not harsh ("blinding light").
- Facial features: Use delicate modifiers for subtle features (i.e., "subtle freckles").

#### Important notes:
- Analyze the user's raw input carefully. In cases of FPV or POV, exclude the description of the subject whose POV is requested.
- Camera motion: DO NOT invent camera motion unless requested by the user.
- Speech: DO NOT modify user-provided character dialogue unless it's a typo.
- No timestamps or cuts: DO NOT use timestamps or describe scene cuts unless explicitly requested.
- Format: DO NOT use phrases like "The scene opens with...". Start directly with Style (optional) and chronological scene description.
- Format: DO NOT start your response with special characters.
- DO NOT invent dialogue unless the user mentions speech/talking/singing/conversation.
- If the user's raw input prompt is highly detailed, chronological and in the requested format: DO NOT make major edits or introduce new elements. Add/enhance audio descriptions if missing.

#### Output Format (Strict):
- Single continuous paragraph in natural language (English).
- NO titles, headings, prefaces, code fences, or Markdown.
- If unsafe/invalid, return original user prompt. Never ask questions or clarifications.

Your output quality is CRITICAL. Generate visually rich, dynamic prompts with integrated audio for high-quality video generation.`;

const Content = () => {
    const fps = useWatch({ name: 'fps', defaultValue: 24 });
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='video' type={UploadType.VIDEO} />
                <TextInput name='prompt' multiline />
                <ChatComponent systemPrompt={llmPrompt} />
                <SliderInput name='steps' defaultValue={20} min={1} max={50} />
                <AdvancedSettings>
                    <TextInput
                        name='neg_prompt'
                        defaultValue='blurry, low quality, still frame, frames, watermark, overlay, titles, has blurbox, has subtitles'
                    />
                    <ModelSelectAutocomplete
                        name='model'
                        type='ltx2'
                        component='UNETLoader'
                        field='unet_name'
                        defaultValue='ltx2/ltx-2.3-22b-dev_transformer_only_fp8_scaled.safetensors'
                        sx={{ mb: 2 }}
                    />
                    <ModelSelectAutocomplete
                        name='text_encoder'
                        type='ltx_gemma'
                        component='LTXAVTextEncoderLoader'
                        field='text_encoder'
                        defaultValue='gemma_3_12B_it_fp8_e4m3fn.safetensors'
                        sx={{ mb: 2 }}
                    />
                    <SamplerSelectInput name='sampler' defaultValue='res_2s' />
                    <CFGInput defaultValue={4} />
                </AdvancedSettings>
                <LoraInput
                    name='lora'
                    type='ltx2'
                    sx={{ mt: 1 }}
                />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <VideoResult fps={fps} />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const LTX23V2VTab = (
    <WFTab
        label='LTX-2.3 V2V'
        value='LTX-2.3 V2V'
        group='V2V'
        receivers={[{ name: 'video', acceptedTypes: ['videos'] }]}
        content={<Content />}
    />
);
