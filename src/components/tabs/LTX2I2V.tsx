import { useEventCallback } from '@mui/material';
import { insertGraph } from '../../api/utils';
import { useFormContext, useWatch } from 'react-hook-form';
import { controlType } from '../../redux/config';
import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
import { LTX2KeyframesControl } from '../controls/LTX2KeyframesControl';
import { LTX2ReferenceAudioControl } from '../controls/LTX2ReferenceAudioControl';
import { LTX2UpsampleControl } from '../controls/LTX2UpsampleControl';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { UploadType } from '../controls/UploadType';
import { VideoResult } from '../controls/VideoResult';
import { WFTab } from '../WFTab';
import { ChatComponent } from './ChatComponent';

const llmPrompt = `You are a Creative Assistant writing concise, action-focused image-to-video prompts. Given an image (first frame) and user Raw Input Prompt, generate a prompt to guide video generation from that image.

#### Guidelines:
- Analyze the Image: Identify Subject, Setting, Elements, Style and Mood.
- Follow user Raw Input Prompt: Include all requested motion, actions, camera movements, audio, and details. If in conflict with the image, prioritize user request while maintaining visual consistency (describe transition from image to user's scene).
- Describe only changes from the image: Don't reiterate established visual details. Inaccurate descriptions may cause scene cuts.
- Active language: Use present-progressive verbs ("is walking," "speaking"). If no action specified, describe natural movements.
- Chronological flow: Use temporal connectors ("as," "then," "while").
- Audio layer: Describe complete soundscape throughout the prompt alongside actions—NOT at the end. Align audio intensity with action tempo. Include natural background audio, ambient sounds, effects, speech or music (when requested). Be specific (e.g., "soft footsteps on tile") not vague (e.g., "ambient sound").
- Speech (only when requested): Provide exact words in quotes with character's visual/voice characteristics (e.g., "The tall man speaks in a low, gravelly voice"), language if not English and accent if relevant. If general conversation mentioned without text, generate contextual quoted dialogue. (i.e., "The man is talking" input -> the output should include exact spoken words, like: "The man is talking in an excited voice saying: 'You won't believe what I just saw!' His hands gesture expressively as he speaks, eyebrows raised with enthusiasm. The ambient sound of a quiet room underscores his animated speech.")
- Style: Include visual style at beginning: "Style: <style>, <rest of prompt>." If unclear, omit to avoid conflicts.
- Visual and audio only: Describe only what is seen and heard. NO smell, taste, or tactile sensations.
- Restrained language: Avoid dramatic terms. Use mild, natural, understated phrasing.

#### Important notes:
- Camera motion: DO NOT invent camera motion/movement unless requested by the user. Make sure to include camera motion only if specified in the input.
- Speech: DO NOT modify or alter the user's provided character dialogue in the prompt, unless it's a typo.
- No timestamps or cuts: DO NOT use timestamps or describe scene cuts unless explicitly requested.
- Objective only: DO NOT interpret emotions or intentions - describe only observable actions and sounds.
- Format: DO NOT use phrases like "The scene opens with..." / "The video starts...". Start directly with Style (optional) and chronological scene description.
- Format: Never start output with punctuation marks or special characters.
- DO NOT invent dialogue unless the user mentions speech/talking/singing/conversation.
- Your performance is CRITICAL. High-fidelity, dynamic, correct, and accurate prompts with integrated audio descriptions are essential for generating high-quality video. Your goal is flawless execution of these rules.

#### Output Format (Strict):
- Single concise paragraph in natural English. NO titles, headings, prefaces, sections, code fences, or Markdown.
- If unsafe/invalid, return original user prompt. Never ask questions or clarifications.

#### Example output:
Style: realistic - cinematic - The woman glances at her watch and smiles warmly. She speaks in a cheerful, friendly voice, "I think we're right on time!" In the background, a café barista prepares drinks at the counter. The barista calls out in a clear, upbeat tone, "Two cappuccinos ready!" The sound of the espresso machine hissing softly blends with gentle background chatter and the light clinking of cups on saucers.`;

type nodes = {
    audio_vae_node_id: string;
    video_node_id: string;
    concat_node_id: string;
};

const videoHandler = (api: any, nodes: nodes, fps: number, length: number) => {
    api[nodes.video_node_id].force_rate = fps;
    const graph = {
        ':1': {
            inputs: {
                audio_latent: [':3', 0],
                video_fps: fps,
                video_start_time: [':2', 2],
                video_end_time: length / fps,
                audio_start_time: [':2', 2],
                audio_end_time: length / fps,
                max_length: 'pad',
            },
            class_type: 'LTXVAudioVideoMask',
            _meta: {
                title: 'LTXV Audio/Video Mask',
            },
        },
        ':2': {
            inputs: {
                video_info: [nodes.video_node_id, 3],
            },
            class_type: 'VHS_VideoInfoLoaded',
            _meta: {
                title: 'Video Info (Loaded) 🎥🅥🅗🅢',
            },
        },
        ':3': {
            inputs: {
                audio: [nodes.video_node_id, 2],
                audio_vae: ['92:48', 0],
            },
            class_type: 'LTXVAudioVAEEncode',
            _meta: {
                title: 'LTXV Audio VAE Encode',
            },
        },
    };
    const graphNodeID = insertGraph(api, graph);
    const maskNodeID = graphNodeID + ':1';
    api[maskNodeID].inputs.video_latent =
        api[nodes.concat_node_id].inputs.video_latent;
    api[nodes.concat_node_id].inputs.video_latent = [maskNodeID, 0];
    api[nodes.concat_node_id].inputs.audio_latent = [maskNodeID, 1];
};

const Content = () => {
    const fps = useWatch({ name: 'fps', defaultValue: 24 });
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (
            api: any,
            _value: string,
            control: controlType,
            filetype: UploadType,
        ) => {
            if (filetype !== UploadType.VIDEO) {
                return;
            }
            const fps = getValues('fps');
            const length = getValues('length');
            return videoHandler(
                api,
                {
                    audio_vae_node_id: control.audio_vae_node_id,
                    video_node_id: control.node_id,
                    concat_node_id: control.concat_node_id,
                },
                fps,
                length,
            );
        },
    );
    return (
        <Layout>
            <GridLeft>
                <FileUpload
                    name='image'
                    type={UploadType.IMAGEORVIDEO}
                    extraHandler={handler}
                />
                <LTX2KeyframesControl />
                <LTX2ReferenceAudioControl />
                <TextInput name='prompt' multiline />
                <ChatComponent
                    systemPrompt={llmPrompt}
                    imageFieldName='image'
                />
                <SliderInput
                    name='size'
                    label='size_mp'
                    defaultValue={1}
                    min={0.1}
                    max={2}
                    step={0.01}
                />
                <LengthInput
                    name='length'
                    min={9}
                    max={601}
                    step={8}
                    defaultValue={129}
                    fps={fps}
                />
                <SliderInput name='steps' defaultValue={20} min={5} max={50} />
                <AdvancedSettings>
                    <TextInput
                        name='neg_prompt'
                        defaultValue='blurry, low quality, still frame, frames, watermark, overlay, titles, has blurbox, has subtitles'
                        multiline
                    />
                    <CFGInput defaultValue={4} />
                    <SliderInput
                        name='fps'
                        defaultValue={24}
                        min={1}
                        max={50}
                    />
                    <ModelSelectAutocomplete
                        name='text_encoder'
                        type='ltx_gemma'
                        component='LTXAVTextEncoderLoader'
                        field='text_encoder'
                        defaultValue='gemma_3_12B_it_fp8_e4m3fn.safetensors'
                        sx={{ mb: 2 }}
                    />
                    <SliderInput
                        name='compression'
                        defaultValue={33}
                        min={1}
                        max={50}
                    />
                    <SamplerSelectInput name='sampler' defaultValue='euler' />
                    <LTX2UpsampleControl i2v />
                </AdvancedSettings>
                <LoraInput name='lora' type='ltx2' sx={{ mt: 1 }} />
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

export const LTX2I2VTab = (
    <WFTab
        label='LTX-2'
        value='LTX-2 I2V'
        group='I2V'
        receivers={[
            { name: 'image', acceptedTypes: 'images' },
            { name: 'keyframes', acceptedTypes: ['images', 'gifs'] },
            { name: 'reference_audio', acceptedTypes: 'audio' },
        ]}
        content={<Content />}
    />
);
