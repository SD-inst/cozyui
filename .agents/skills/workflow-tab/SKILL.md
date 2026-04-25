---
name: workflow-tab
description: Create or change a ComfyUI workflow tab or any controls inside, including API JSON, React component, config.json entry, and App.tsx registration
---

# Workflow Tab — Create a new ComfyUI workflow tab

When to use: You need to add or change a ComfyUI-based tab (e.g. T2I, I2V, T2V) or any controls in it in the CozyUI application.

## Inputs required from the user

- `tabName`: Display label shown in the UI (e.g. "Hunyuan T2V")
- `configKey`: Unique key used in config.json (e.g. "Hunyuan T2V")
- `apiFile`: Filename of the ComfyUI workflow JSON (e.g. "hunyuan_t2v_native.json")
- `group`: Generation type group — "T2I" (Text to Image), "I2V" (Image to Video), "T2V" (Text to Video), etc.
- `controls`: List of control names the tab supports (e.g. ["prompt", "model", "width", "height", "seed", "steps"])
- `result`: Result type and node ID (e.g. `{ id: "16", type: "gifs" }`)
- `defaults`: Default values (e.g. model path, width, height)
- `receivers`: (optional) Receivers for data from other tabs (e.g. `{ name: "image", acceptedTypes: ["images"] }`)
- `handler_options`: (optional) Lora handler config if the tab supports LoRA

## Workflow

### Step 1: Create the ComfyUI API JSON file

Create `public/api/<apiFile>` with the ComfyUI workflow in JSON format.

**Structure:**

```json
{
  "NODE_ID": {
    "inputs": {
      "field_name": "value_or_reference",
      "another_field": ["PREV_NODE_ID", 0]
    },
    "class_type": "NodeClassName",
    "_meta": {
      "title": "Human Readable Name"
    }
  }
}
```

**Key conventions:**
- Node IDs are string numbers (e.g. `"1"`, `"8"`, `"44"`)
- References to previous node outputs use `["NODE_ID", 0]` format
- `class_type` must match a valid ComfyUI custom node class
- `_meta.title` is for displaying the control name in the UI during inference

**Example:** See [`public/api/anima.json`](../../public/api/anima.json) — a complete image generation workflow.

### Step 2: Create the React component

Create `src/components/tabs/<TabName>.tsx`.

**Component structure:**

```tsx
import { WFTab } from '../WFTab';
import { Layout, GridLeft, GridRight, GridBottom } from '../controls/Layout';
import { GenerateButton } from '../controls/GenerateButton';
// ... other imports

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                {/* Input controls */}
                <PromptInput name='prompt' />
                <WidthHeight defaultWidth={848} defaultHeight={480} />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <ModelSelectAutocomplete name='model' type='hunyuan' sx={{ mb: 2 }} />
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput name='lora' type='hunyuan' />
                {/* Advanced settings wrapped */}
                <AdvancedSettings>
                    <SamplerSelectInput name='sampler' />
                    <SchedulerSelectInput name='scheduler' />
                </AdvancedSettings>
            </GridLeft>
            <GridRight>
                {/* Result display */}
                <ImageResult />
                {/* or VideoResult, VideoImageResult, etc. */}
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const TabNameTab = (
    <WFTab
        label='Display Label'
        value='configKey'
        group='GROUP'
        receivers={[
            { name: 'image', acceptedTypes: ['images'] },
        ]}  // optional
        content={<Content />}
    />
);
```

**Available controls (import from `src/components/controls/`):**

**Text inputs:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`PromptInput`](../../src/components/controls/PromptInput.tsx) | Text prompt input with danbooru tag support | `name`, `placeholder` |
| [`DoublePromptInput`](../../src/components/controls/DoublePromptInput.tsx) | Positive + negative prompt in one component | `name` |
| [`TextInput`](../../src/components/controls/TextInput.tsx) | Generic text field | `name`, `multiline`, `defaultValue` |
| [`TagAutocomplete`](../../src/components/controls/TagAutocomplete.tsx) | Danbooru tag autocomplete | `name`, `tags` |

**Numeric controls:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`WidthHeight`](../../src/components/controls/WidthHeightInput.tsx) | Image/video dimensions | `defaultWidth`, `defaultHeight`, `maxWidth`, `maxHeight` |
| [`SliderInput`](../../src/components/controls/SliderInput.tsx) | Numeric slider with min/max | `name`, `defaultValue`, `min`, `max`, `step` |
| [`SeedInput`](../../src/components/controls/SeedInput.tsx) | Random seed with randomize button | `name`, `defaultValue` |
| [`CFGInput`](../../src/components/controls/CFGInput.tsx) | CFG guidance strength | `name`, `defaultValue`, `step` |
| [`GuidanceInput`](../../src/components/controls/GuidanceInput.tsx) | Flux-style guidance | `name`, `defaultValue`, `step` |
| [`FlowShiftInput`](../../src/components/controls/FlowShiftInput.tsx) | Flow shift for flow-matching models | `name`, `defaultValue` |

**Length controls:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`LengthSlider`](../../src/components/controls/LengthSlider.tsx) | Video length in frames | `name`, `min`, `max`, `step`, `defaultValue`, `fps` |
| [`HYLengthInput`](../../src/components/controls/hyv/HYLengthInput.tsx) | Hunyuan-specific length input | `name`, `defaultValue` |
| [`WanLengthInput`](../../src/components/controls/wan/WanLengthInput.tsx) | Wan-specific length input | `name`, `defaultValue` |
| [`OviLengthInput`](../../src/components/controls/ovi/OviLengthInput.tsx) | Ovi-specific length input | `name`, `defaultValue` |

**Model selection:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`ModelSelectAutocomplete`](../../src/components/controls/ModelSelectAutocomplete.tsx) | Model dropdown with autocomplete | `name`, `type`, `defaultValue`, `sx` |
| [`ModelSelectInput`](../../src/components/controls/ModelSelectInput.tsx) | Basic model select | `name`, `defaultValue` |
| [`SamplerSelectInput`](../../src/components/controls/SamplerSelectInput.tsx) | Sampler selection dropdown | `name`, `defaultValue` |
| [`SchedulerSelectInput`](../../src/components/controls/SchedulerSelectInput.tsx) | Scheduler selection dropdown | `name`, `defaultValue` |
| [`KJSamplerSelectInput`](../../src/components/controls/KJSchedulerSelectInput.tsx) | KJ-style sampler select | `name`, `defaultValue` |
| [`KJAttentionSelectInput`](../../src/components/controls/KJAttentionSelectInput.tsx) | KJ attention select | `name`, `defaultValue` |
| [`ClipSelectInput`](../../src/components/controls/ClipSelectInput.tsx) | CLIP model selection | `name`, `defaultValue` |
| [`LLMSelectInput`](../../src/components/controls/LLMSelectInput.tsx) | LLM model selection | `name`, `defaultValue` |

**LoRA controls:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`LoraInput`](../../src/components/controls/LoraInput.tsx) | LoRA loader with strength | `name`, `type`, `sx` |

**Advanced settings (collapsible):**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`AdvancedSettings`](../../src/components/controls/AdvancedSettings.tsx) | Collapsible wrapper for advanced controls | children |

**Advanced model controls:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`TeaCacheInput`](../../src/components/controls/TeaCacheInput.tsx) | Tea cache optimization | `name` |
| [`CompileModelToggle`](../../src/components/controls/CompileModelToggle.tsx) | Compile model toggle | `name` |
| [`VirtualVRAMSliderInput`](../../src/components/controls/VirtualVRAMSliderInput.tsx) | Virtual VRAM slider | `name`, `defaultValue` |
| [`UpscaleToggle`](../../src/components/controls/UpscaleToggle.tsx) | Upscale mode toggle | `name` |

**Hunyuan-specific controls:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`HYNAG`](../../src/components/controls/hyv/HYNAG.tsx) | Hunyuan NAG settings | `name` |
| [`HYRiflexInput`](../../src/components/controls/hyv/HYRiflexInput.tsx) | Hunyuan Riflex settings | `name` |
| [`HYTeaCacheInput`](../../src/components/controls/hyv/HYTeaCacheInput.tsx) | Hunyuan TeaCache settings | `name` |
| [`KJHYBlockSwapInput`](../../src/components/controls/hyv/KJHYBlockSwapInput.tsx) | KJ block swap for Hunyuan | `name` |
| [`KJHYCFG`](../../src/components/controls/hyv/KJHYCFG.tsx) | KJ CFG for Hunyuan | `name` |
| [`KJHYTeaCacheInput`](../../src/components/controls/hyv/KJHYTeaCacheInput.tsx) | KJ TeaCache for Hunyuan | `name` |

**Wan-specific controls:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`WanNAG`](../../src/components/controls/wan/WanNAG.tsx) | Wan NAG settings | `name` |
| [`WanRiflexToggle`](../../src/components/controls/wan/WanRiflexToggle.tsx) | Wan Riflex toggle | `name` |
| [`WanFLF2V`](../../src/components/controls/wan/WanFLF2V.tsx) | Wan FLF2V settings | `name` |
| [`WanEndImage`](../../src/components/controls/wan/WanEndImage.tsx) | Wan end image settings | `name` |
| [`KJWanBlockSwapInput`](../../src/components/controls/wan/KJWanBlockSwapInput.tsx) | KJ block swap for Wan | `name` |
| [`KJWanLoopInput`](../../src/components/controls/wan/KJWanLoopInput.tsx) | Wan loop control | `name` |

**LTX2-specific controls:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`LTX2KeyframesControl`](../../src/components/controls/ltx2/LTX2KeyframesControl.tsx) | LTX2 keyframes | — |
| [`LTX2LoopControl`](../../src/components/controls/ltx2/LTX2LoopControl.tsx) | LTX2 loop control | — |
| [`LTX2ReferenceAudioControl`](../../src/components/controls/ltx2/LTX2ReferenceAudioControl.tsx) | LTX2 reference audio | — |
| [`LTX2UpsampleControl`](../../src/components/controls/ltx2/LTX2UpsampleControl.tsx) | LTX2 upsample control | `i2v` |
| [`LTX23UpsampleControl`](../../src/components/controls/ltx2/LTX23UpsampleControl.tsx) | LTX2.3 upsample control | — |
| [`LTXKeepSizeToggle`](../../src/components/controls/ltx2/LTXKeepSizeToggle.tsx) | Keep size toggle | — |
| [`LTX2NoAudioToggle`](../../src/components/controls/ltx2/LTX2NoAudioToggle.tsx) | No audio toggle | — |

**Ovi-specific controls:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`OviPromptInput`](../../src/components/controls/ovi/OviPromptInput.tsx) | Ovi prompt input | `name` |
| [`OviVersionInput`](../../src/components/controls/ovi/OviVersionInput.tsx) | Ovi version select | `name` |

**File upload controls:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`FileUpload`](../../src/components/controls/FileUpload.tsx) | Generic file upload | `name`, `type` (UploadType enum), `extraHandler` |
| [`AudioInput`](../../src/components/controls/AudioInput.tsx) | Audio file input | `name` |
| [`ReferenceLatentInput`](../../src/components/controls/ReferenceLatentInput.tsx) | Reference latent image | `name` |
| [`EnhanceVideoInput`](../../src/components/controls/EnhanceVideoInput.tsx) | Enhance video input | `name` |
| [`VideoImageOverride`](../../src/components/controls/VideoImageOverride.tsx) | Video/image override | — |

**Result display controls:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`ImageResult`](../../src/components/controls/ImageResult.tsx) | Display generated image | — |
| [`VideoResult`](../../src/components/controls/VideoResult.tsx) | Display generated video | `fps` |
| [`VideoImageResult`](../../src/components/controls/VideoImageResult.tsx) | Video with image fallback | `sendTargetTab`, `sendFields` |
| [`AudioResult`](../../src/components/controls/AudioResult.tsx) | Display generated audio | — |
| [`ImagePreview`](../../src/components/controls/ImagePreview.tsx) | Image preview thumbnail | — |
| [`VideoPreview`](../../src/components/controls/VideoPreview.tsx) | Video preview thumbnail | — |

**Action buttons:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`GenerateButton`](../../src/components/controls/GenerateButton.tsx) | Main generate button | — |
| [`InterruptButton`](../../src/components/controls/InterruptButton.tsx) | Interrupt generation | — |
| [`SendResultButton`](../../src/components/controls/SendResultButton.tsx) | Send result to another tab | — |
| [`LightboxSendResultButton`](../../src/components/controls/LightboxSendResultButton.tsx) | Lightbox send result | — |
| [`DownloadImageButton`](../../src/components/controls/DownloadImageButton.tsx) | Download generated image | — |
| [`DescribeButton`](../../src/components/controls/DescribeButton.tsx) | Describe image with LLM | — |
| [`ResetButton`](../../src/components/controls/ResetButton.tsx) | Reset form to defaults | — |
| [`HelpButton`](../../src/components/controls/HelpButton.tsx) | Show help tooltip | `text` |

**Array/structured inputs:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`ArrayInput`](../../src/components/controls/ArrayInput.tsx) | Array/value input | `name` |
| [`DeleteArrayInputButton`](../../src/components/controls/DeleteArrayInputButton.tsx) | Delete array item | — |
| [`SelectInput`](../../src/components/controls/SelectInput.tsx) | Generic select dropdown | `name`, `options` |
| [`ToggleInput`](../../src/components/controls/ToggleInput.tsx) | Boolean toggle | `name`, `defaultValue` |
| [`Randomizer`](../../src/components/controls/Randomizer.tsx) | Random value generator for output file name to prevent file scanning (only for workflows without seed) | — |

**Chat integration:**

| Control | Purpose | Key props |
|---------|---------|-----------|
| [`ChatComponent`](../../src/components/chat/ChatComponent.tsx) | AI chat assistant | `systemPrompt`, `imageFieldName` |

**Layout system:**
- `<Layout>` — root container
- `<GridLeft>` — left column (controls)
- `<GridRight>` — right column (results)
- `<GridBottom>` — bottom bar (buttons)

**WFTab props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | ✅ | UI display name |
| `value` | `string` | ✅ | config.json key (must match) |
| `group` | `string` | ✅ | Generation group: "T2I", "I2V", "T2V", etc. |
| `content` | `ReactNode` | ✅ | The `<Content />` component |
| `receivers` | `receiverParametersType[]` | ❌ | Controls that accept data from other tabs |

**receiverParametersType:**

```typescript
{
    name: string;           // control name (e.g. "image", "prompt")
    weight?: number;        // optional weight for blending
    acceptedTypes: string | string[];  // e.g. "images", "gifs", "audio"
}
```

### Step 3: Add config.json entry

Add a new entry to `public/conf/config.json` under `"tabs"`:

```json
"ConfigKey": {
    "api": "api/<apiFile>",
    "controls": {
        "prompt": {
            "id": "8",
            "field": "text"
        },
        "model": {
            "id": "handle",
            "node_id": "13",
            "field": "unet_name"
        },
        "width": {
            "id": "14",
            "field": "width"
        },
        "height": {
            "id": "14",
            "field": "height"
        },
        "seed": {
            "id": "19",
            "field": "value"
        },
        "steps": {
            "id": "12",
            "field": "steps"
        }
    },
    "handler_options": {
        "lora_params": {
            "lora_input_name": "model",
            "api_input_name": "model",
            "output_node_ids": ["6"],
            "output_idx": 0,
            "class_name": "HunyuanVideoLoraLoader",
            "strength_field_name": "strength",
            "name_field_name": "lora_name"
        }
    },
    "result": [
        { "id": "16", "type": "gifs" },
        { "id": "20", "type": "images" }
    ],
    "defaults": {
        "model": "path/to/model.safetensors",
        "width": 848,
        "height": 480
    }
}
```

**controls field conventions:**
- `"id": "handle"` — special value for dynamic controls (LoRA, etc.)
- `"id": "skip"` — control is disabled/skipped
- `"id": "NODE_ID"` — maps to a specific node in the API JSON
- `"field"` — the input field name on that node
- `"node_id"` and other fields with arbitrary names — (optional) additional node reference for dynamic handlers

**result field:**
- Array of `{ id: string, type: string }` objects
- `type` values: `"images"`, `"audio"`, `"gifs"` (nuance: usually this is for videos, not just GIFs, there is NO "video" result type)
- `id` is the node ID in the API JSON that produces the result

**defaults section:**
- Key-value pairs for default parameter values
- Common defaults: `model`, `width`, `height`, `guidance`, `steps`
- Stored in `config.local.json.example` for project defaults

### Step 4: Register in App.tsx

Add the import and tab registration in `src/App.tsx`:

```tsx
// Add import near other tab imports (alphabetically sorted)
import { NewTabTab } from './components/tabs/NewTab';

// Add to WorkflowTabs children (maintain grouping order)
<WorkflowTabs>
    // ... existing tabs
    {NewTabTab}
    // ... more tabs
</WorkflowTabs>
```

**Placement rules:**
- T2I tabs grouped together
- I2V tabs grouped together
- T2V tabs grouped together
- Audio tabs grouped together
- Upscale tabs grouped together
- Maintain alphabetical order within groups

### Step 5: (Optional) Add defaults to config.local.json.example

If the tab needs custom default values, add to `public/conf/config.local.json.example`:

```json
{
    "tabs": {
        "ConfigKey": {
            "defaults": {
                "model": "path/to/default_model.safetensors",
                "guidance": 7.5,
                "width": 1024,
                "height": 1024
            }
        }
    },
    "lora_types": {
        "hunyuan": {
            "defaults": {
                "uploads/lora/my_lora.safetensors": {
                    "strength": 0.8
                }
            }
        }
    }
}
```

## Typical interface architecture

A standard tab follows this layout:

```
┌─────────────────────────────────────────────────────────┐
│  GridLeft (controls)              │  GridRight (result) │
│  ┌───────────────────────┐        │  ┌───────────────┐  │
│  │ PromptInput           │        │  │ ImageResult   │  │
│  │ (or DoublePromptInput)│        │  │ or VideoResult│  │
│  ├───────────────────────┤        │  └───────────────┘  │
│  │ WidthHeight           │        │                     │
│  ├───────────────────────┤        │                     │
│  │ LengthInput           │        │                     │
│  ├───────────────────────┤        │                     │
│  │ SliderInput (steps)   │        │                     │
│  ├───────────────────────┤        │                     │
│  │ ModelSelect           │        │                     │
│  ├───────────────────────┤        │                     │
│  │ AdvancedSettings      │        │                     │
│  │ (sampler, scheduler)  │        │                     │
│  ├───────────────────────┤        │                     │
│  │ SeedInput             │        │                     │
│  ├───────────────────────┤        │                     │
│  │ LoraInput             │        │                     │
│  └───────────────────────┘        │                     │
├─────────────────────────────────────────────────────────┤
│  GridBottom: GenerateButton                             │
└─────────────────────────────────────────────────────────┘
```

## Common control patterns

### Text-to-Image (T2I)
Required controls: `prompt`, `model`, `width`, `height`, `steps`, `seed`
Optional: `neg_prompt`, `guidance`, `lora`, `sampler`, `scheduler`

### Text-to-Video (T2V)
Required controls: `prompt`, `model`, `width`, `height`, `length`, `steps`, `seed`
Optional: `neg_prompt`, `guidance`, `flow_shift`, `lora`, `sampler`, `scheduler`

### Image-to-Video (I2V)
Required controls: `image`, `prompt`, `model`, `steps`, `seed`
Optional: `neg_prompt`, `guidance`, `length`, `lora`, `keyframes`

## Examples

See existing tabs for reference:
- T2I: [`src/components/tabs/Anima.tsx`](../../src/components/tabs/Anima.tsx) + [`public/api/anima.json`](../../public/api/anima.json)
- T2V: [`src/components/tabs/HunyuanT2V.tsx`](../../src/components/tabs/HunyuanT2V.tsx) + [`public/api/hunyuan_t2v_native.json`](../../public/api/hunyuan_t2v_native.json)
- I2V: [`src/components/tabs/LTX2I2V.tsx`](../../src/components/tabs/LTX2I2V.tsx)

## Troubleshooting

### Tab not appearing
1. Verify import in `src/App.tsx` matches the exported component name
2. Verify `value` in `WFTab` matches the key in `config.json`
3. Check browser console for React errors

### Controls not working
1. Verify control `name` matches keys in `controls` section of config.json
2. Verify `id` in config.json points to a valid node in the API JSON
3. Check that `useAPI()` hook can find the config entry

### Result not displaying
1. Verify `result.id` matches a SaveImage/SaveVideo node in the API JSON
2. Verify `result.type` matches the output format ("images", "gifs", "audio")
3. Check that the node produces output on the expected index (default: 0)
