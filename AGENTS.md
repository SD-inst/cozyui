# CozyUI — Technical Documentation

## Overview

CozyUI is a React-based web frontend for **ComfyUI**, a node-based graphical interface for AI model workflows. The application provides a tabbed interface for various generation workflows: Text-to-Image (T2I), Image-to-Video (I2V), Text-to-Video (T2V), Audio generation, and Upscaling.

**Tech stack:** React 19 + TypeScript, MUI (Material-UI), Redux Toolkit, react-hook-form, Dexie (IndexedDB), WebSocket for ComfyUI communication.

---

## Project Structure

```
public/api/          — ComfyUI workflow JSON files (one per tab)
public/conf/         — Configuration files (config.json, config.local.json)
src/
  api/               — API utilities (mergeType, utils)
  components/
    chat/            — Prompt-generation chat (ChatComponent, ChatMessage, prompts/)
    contexts/        — React contexts (WorkflowTabs, Tab, Filter, ResultOverride)
    controls/        — Reusable UI controls (inputs, buttons, layout)
    controls/mask_editor/ — Mask editor components
    history/         — History panel (IndexedDB, import/export)
    settings/        — Settings UI
    tabs/            — Individual workflow tabs (one per generation type)
  hooks/             — Custom React hooks
  i18n/              — Internationalization (node-polyglot)
  redux/             — Redux slices (config, progress, tab, preview)
```

---

## Architecture

### Entry Point — [`App.tsx`](src/App.tsx)

The app wraps everything in a layered provider hierarchy:

```
ThemeContext
  → I18nContextProvider
    → ConfigLoader (side-effect only — loads config)
    → TagLoader (side-effect only — loads autocomplete tags)
    → ResultOverrideContextProvider
      → WSReceiver (WebSocket listener)
      → VerticalBox
        → WorkflowTabsContextProvider
          → WorkflowTabs
            → [tab children — each <WFTab>]
          → Progress
          → InterruptButton
          → FilterContextProvider
            → HistoryPanel
            → AppSettings
```

### Configuration Loading

[`ConfigLoader.tsx`](src/ConfigLoader.tsx) fetches three data sources in sequence:

1. **`conf/config.json`** — Main configuration defining all tabs, their API files, controls mapping, defaults, and result nodes.
2. **`conf/config.local.json`** — Local overrides (merged into main config).
3. **`/api/object_info`** — Fetched from the ComfyUI server at runtime; contains node class signatures (available options for each input).

Config is stored in Redux under `s.config`. The `loaded` array tracks initialization state.

### Tab System

Each workflow tab is defined by:

1. **React component** in `src/components/tabs/<Name>.tsx` — exports a `<WFTab>` element.
2. **API JSON** in `public/api/<name>.json` — ComfyUI workflow definition.
3. **Config entry** in `public/conf/config.json` under `tabs.<key>`.

Tabs are registered in [`App.tsx`](src/App.tsx) by adding `{NameTab}` inside `<WorkflowTabs>`.

#### [`WFTab`](src/components/WFTab.tsx) Component

```tsx
export type receiverParametersType = {
    name: string;
    weight?: number;
    acceptedTypes: string | string[];  // "images", "gifs", "audio"
};

// WFTab is a marker component — returns null, carries metadata
export const WFTab = ({}: {
    label: string;      // Display name
    value?: number | string;  // config.json key
    content: ReactNode; // The actual content
    group?: string;     // "T2I", "I2V", "T2V", etc.
    receivers?: receiverParametersType[];  // Data receivers from other tabs
}) => null;
```

#### [`WorkflowTabs`](src/components/WorkflowTabs.tsx)

The parent container that:
- Manages the active tab state via Redux (`s.tab`).
- Wraps each tab's `content` in `TabContextProvider` (provides `api`, `tab_name`, `controls`).
- Uses `react-hook-form` (`FormProvider`, `useWatch`) to manage all form state.
- Persists form state to IndexedDB for restoration.
- Provides `ValuesRestore` component that handles form initialization and state recovery.

---

## Configuration (config.json)

Located at [`public/conf/config.json`](public/conf/config.json).

### Top-level Structure

```typescript
type configType = {
    tabs: { [tabName: string]: tabConfigType };
    object_info: { [nodeClass]: { ... } };  // Fetched from ComfyUI API
    llm: { [key: string]: llmConfigType };  // LLM providers for chat
    lora_types: { [type: string]: loraDefaults };
    // ... other settings
};
```

### Tab Config (`tabConfigType`)

```typescript
type tabConfigType = {
    api: string;              // Path to API JSON (e.g., "api/flux.json")
    controls: {               // Maps control names to node fields
        [control: string]: controlType;
    };
    result: { id: string; type: string };  // OR array of such objects
    defaults?: Record<string, any>;         // Default values
    handler_options: {
        lora_params: { /* LoRA loader config */ };
        node_params: { /* Sampler/loader node refs */ };
    };
};
```

### Control Mapping (`controlType`)

```typescript
type controlType = {
    id: string;           // "handle" | "skip" | "NODE_ID"
    field: string;        // Input field name on the node
    order?: number;       // Execution order
    [key: string]: any;   // Extra params (node_id, output_node_id, etc.)
};
```

**`id` values:**
- `"handle"` — Dynamic control (LoRA, clip, etc.) — handled by special handlers.
- `"skip"` — Control is disabled.
- `"NODE_ID"` — Maps to a specific node in the API JSON.

### Result Definition

The `result` field can be:
- **Single object:** `{ id: "16", type: "gifs" }`
- **Array:** `[{ id: "16", type: "gifs" }, { id: "20", type: "images" }]`

`type` values: `"images"`, `"gifs"` (for videos), `"audio"`.

---

## API JSON Files

Located at [`public/api/`](public/api/).

### Structure

```json
{
  "1": {
    "inputs": { "field_name": "value_or_reference" },
    "class_type": "NodeClassName",
    "_meta": { "title": "Human Readable Name" }
  },
  "2": {
    "inputs": { "image": ["1", 0] },
    "class_type": "AnotherNodeClass"
  }
}
```

### Conventions

- Node IDs are **string numbers**.
- References use `["NODE_ID", output_index]` format (e.g., `["1", 0]`).
- `class_type` must match a ComfyUI custom node class.
- `_meta.title` is used for UI display.
- The workflow is modified at runtime — control values replace literal inputs.

---

## Redux State

### `s.config` — Configuration and Connection State

```typescript
// Key fields:
tabs: { ... };           // Merged config from config.json + local overrides
object_info: { ... };    // ComfyUI node signatures
client_id: string;       // WebSocket client ID
api: string;             // ComfyUI API base URL
loaded: [boolean, boolean]; // [mainConfigLoaded, localConfigLoaded]
```

### `s.tab` — Active Tab State

```typescript
// Key fields:
tab: string;             // Currently active tab name
result: {               // Generation results per tab
    [tabName]: {
        [resultId]: {
            [type]: [{ url, filename, ... }]
        }
    }
};
params: {               // Pending restore action
    action: 'RESTORE' | null;
    tab: string;
    values: object;
};
```

### `s.progress` — Generation Progress

```typescript
// Key fields:
status: 'IDLE' | 'RUNNING' | 'FINISHED';
progress: { value: number; max: number };
currentNode: string;
queue: number;
```

### `s.preview` — Preview Frames

```typescript
// Key fields:
frames: ImageBitmap[];  // Binary frames from WebSocket
length: number;
rate: number;
```

---

## Hooks

### Core Hooks

| Hook | File | Purpose |
|------|------|---------|
| [`useAPI()`](src/hooks/useAPI.ts) | `useAPI.ts` | Returns `tabConfigType` for the current tab |
| [`useControl(name)`](src/hooks/useAPI.ts) | `useAPI.ts` | Returns `controlType` for a specific control name |
| [`useFindNode(class)`](src/hooks/useAPI.ts) | `useAPI.ts` | Finds a unique node by class type |
| [`useResult()`](src/hooks/useResult.ts) | `useResult.ts` | Returns generation results for current tab |
| [`useResultParam()`](src/hooks/useResult.ts) | `src/hooks/useResult.ts` | Returns result config (id, type, filename, url) |
| [`useWatchForm(name)`](src/hooks/useWatchForm.ts) | `useWatchForm.ts` | Get watched form value with fallback |
| [`useWebSocket(url, ...)`](src/hooks/useWebSocket.ts) | `useWebSocket.ts` | WebSocket with auto-reconnect |
| [`useCurrentTab()`](src/hooks/useCurrentTab.ts) | `useCurrentTab.ts` | Get current tab info |
| [`useSetDefaults()`](src/hooks/useSetDefaults.ts) | `useSetDefaults.ts` | Set form defaults from config |
| [`useRestoreValues()`](src/hooks/useRestoreValues.ts) | `useRestoreValues.ts` | Restore values from IndexedDB |
| [`useAPI()`](src/hooks/useAPI.ts) | `useAPI.ts` | Get config for current tab |

### Tab Context

[`TabContext`](src/components/contexts/TabContextProvider.tsx) provides:
- `api` — The API JSON for current tab
- `tab_name` — Current tab name
- `controls` — Control mapping from config
- `workflow` — Full workflow object
- `setDefaults` — Function to reset form

---

## Internationalization (i18n)

Located in [`src/i18n/`](src/i18n/).

Uses **node-polyglot** library with dynamic locale loading.

```typescript
// src/i18n/I18nContext.tsx
export const createPolyglot = (locale: string, updater?: () => void) => {
    const polyglot = new Polyglot({ locale });
    polyglot.extend(en);  // Base English translations
    import(`./locales/${locale}.ts`).then((m) => {
        polyglot.extend(m.default);  // Dynamic locale override
    });
    return polyglot;
};
```

**Available locales:** [`locales.ts`](src/i18n/locales.ts) — `en`, `ru`.

**Usage:**
```tsx
const tr = useTranslate();
tr('some.key.path');  // Returns translated string
tr('some.key', { param: value });  // With interpolation
```

**Locale files:**
- [`src/i18n/locales/en.ts`](src/i18n/locales/en.ts) — English base
- [`src/i18n/locales/ru.ts`](src/i18n/locales/ru.ts) — Russian overrides

---

## WebSocket Communication

[`WSReceiver`](src/components/WSReceiver.tsx) listens to ComfyUI WebSocket at `/ws?clientId=...`.

### Message Types Handled

| Message Type | Action |
|-------------|--------|
| `execution_success` | Generation completed — reset progress |
| `execution_start` | Generation started — set status to RUNNING |
| `executed` | Node executed — add result, update preview |
| `progress` | Generation progress — update progress bar |
| `status` | Queue status — update queue info |
| `new_queue` | Queue changed |
| Binary frames | Decode and dispatch as preview frames |

### Dispatched Redux Actions

- `setProgress`, `setCurrentNode`, `setGenerationStart`, `setGenerationEnd`
- `setStatus`, `setStatusMessage`, `setConnected`, `setQueue`
- `addResult`, `clearPrompt`
- `setFrame`, `initPreview`

---

## Controls Library

All reusable controls are in [`src/components/controls/`](src/components/controls/).

### Layout

| Component | Purpose |
|-----------|---------|
| [`Layout`](src/components/controls/Layout.tsx) | Root container |
| `GridLeft` | Left column (controls) |
| `GridRight` | Right column (results) |
| `GridBottom` | Bottom bar (action buttons) |

### Input Controls

| Control | Purpose | Key Props |
|---------|---------|-----------|
| `PromptInput` | Text prompt with tag autocomplete | `name`, `placeholder` |
| `WidthHeight` | Image/video dimensions | `defaultWidth`, `defaultHeight` |
| `SliderInput` | Numeric slider | `name`, `defaultValue`, `min`, `max`, `step` |
| `SeedInput` | Seed with randomize button | `name`, `defaultValue` |
| `ModelSelectAutocomplete` | Model dropdown with search | `name`, `type` |
| `LoraInput` | LoRA loader with strength | `name`, `type`, `classNameOverride` |
| `ToggleInput` | Boolean toggle | `name`, `defaultValue` |
| `SelectInput` | Dropdown select | `name`, `options` |
| `AdvancedSettings` | Collapsible advanced section | children |

### Result Controls

| Control | Purpose |
|---------|---------|
| `ImageResult` | Display generated image |
| `VideoResult` | Display generated video |
| `AudioResult` | Display generated audio |
| `SendResultButton` | Send result to another tab |
| `DownloadImageButton` | Download generated file |

### Mask Editor

Located in [`src/components/controls/mask_editor/`](src/components/controls/mask_editor/):
- [`MaskEditor.tsx`](src/components/controls/mask_editor/MaskEditor.tsx) — Main editor component
- [`useMaskBrush.ts`](src/components/controls/mask_editor/useMaskBrush.ts) — Brush logic hook
- [`MaskEditorFullscreenToolbar.tsx`](src/components/controls/mask_editor/MaskEditorFullscreenToolbar.tsx) — Toolbar
- [`MaskEditorControls.tsx`](src/components/controls/mask_editor/MaskEditorControls.tsx) — Brush controls

---

## History Panel

Located in [`src/components/history/`](src/components/history/).

Uses **Dexie** (IndexedDB wrapper) for local storage.

| File | Purpose |
|------|---------|
| [`db.ts`](src/components/history/db.ts) | Database schema definition |
| [`HistoryPanel.tsx`](src/components/history/HistoryPanel.tsx) | Main panel component |
| [`HistoryCard.tsx`](src/components/history/HistoryCard.tsx) | Single history item |
| [`HistoryCardContent.tsx`](src/components/history/HistoryCardContent.tsx) | Card content (params preview) |
| [`filter.ts`](src/components/history/filter.ts) | Filter logic |
| [`ImportExport.tsx`](src/components/history/ImportExport.tsx) | Import/export history |

---

## Settings

Located in [`src/components/settings/`](src/components/settings/).

| File | Purpose |
|------|---------|
| `AppSettings.tsx` | Main settings panel |
| `LanguageSelect.tsx` | Language switcher |
| `HiddenTabs.tsx` | Configure visible/hidden tabs |
| `NotificationSetting.tsx` | Notification sound settings |
| `Version.tsx` | App version display |

---

## Prompt-Generation Chat (LLM)

Located in [`src/components/chat/`](src/components/chat/). Optional assistant chat that generates and refines prompts for generation tabs, wired to an OpenAI-compatible API.

### LLM Configuration

Top-level `llm` section of `public/conf/config.json` (type `llmConfigType` in `src/redux/config.ts`):

```json
"llm": {
    "apiKey": "your-api-key",
    "baseURL": "https://.../v1",
    "model": "",
    "modelVision": "",
    "supportsVideo": false,
    "temperature": 1.0
}
```

- `model` — text model. The chat renders null unless it is set.
- `modelVision` — used whenever a message carries media parts (or non-string content). Required whenever `mediaFields` is used.
- `supportsVideo` — when `true`, videos from `mediaFields` of kind `video` are attached to the first message. Default is `false`; enable in `config.local.json`.

### Components and Hooks

| File | Purpose |
|------|---------|
| [`ChatComponent.tsx`](src/components/chat/ChatComponent.tsx) | Accordion chat: message list, CONNECTING/THINKING indicators, input, send / new-chat / clear / abort / refine buttons |
| [`BouncingTextIndicator.tsx`](src/components/chat/BouncingTextIndicator.tsx) | Bouncing-letters status indicator (single component, `text` prop): CONNECTING — between request and first stream chunk; THINKING — while reasoning streams. One-shot auto-scroll to itself, see "Auto-Scroll" below |
| [`ChatMessage.tsx`](src/components/chat/ChatMessage.tsx) | Single message: text (`pre-wrap`) + wrapping media row (image thumbs and compact videos — 100px, no controls, click to play/pause) |
| [`prompts/*.ts`](src/components/chat/prompts/) | System prompts per mode: `minimaxH3T2V.ts`, `minimaxH3I2V.ts`, `minimaxH3R2V.ts` |
| [`useOpenAIChat.ts`](src/hooks/useOpenAIChat.ts) | Chat state, streaming, `sendMessage(content, context?, media?)`, per-tab IndexedDB persistence (`db.chatLogs`) |
| [`useMessageProcessor.ts`](src/hooks/useMessageProcessor.ts) | `processUserMessage(text, media?)` → message with processed media parts |
| [`useImageProcessor.ts`](src/hooks/useImageProcessor.ts) | `processImage` (fetch → JPEG → `image_url` base64), `processVideo` (fetch → `input_video` base64) |
| [`useImageURL.ts`](src/hooks/useImageURL.ts) | `useImageURLs` — filenames → `/api/view` URLs (random `noCache` param) |

### `ChatComponent` Props

```tsx
export type mediaFieldType = {
    name: string;        // Form field name
    kind: 'image' | 'video';
    itemField?: string;  // For array fields: the entry property holding the filename
};

<ChatComponent
    promptFieldName='prompt'   // Form field that receives the generated prompt
    mediaFields={[...]}        // Optional — files attached to the first message
    systemPrompt={...}         // System message
    transformFirstMessage={fn} // Optional — rewrite of the first user message
/>
```

- `mediaFields` extraction: a string field yields a single item; an array field (e.g. `ArrayInput`) yields `entry[itemField]` per entry. Image-kind entries with video extensions are filtered out. Video-kind entries are included only when `llm.supportsVideo` is true. Media is attached **only to the first user message** of the chat.
- "New chat" restores only the text after the first `description=` marker of the stored first message (`extractFirstMessageText`), so the length/aspect prefix is not duplicated.
- Chat logs persist per tab in IndexedDB and survive page reloads.

### Chat Auto-Scroll — IMPORTANT

Auto-scroll must scroll **only the chat's message list container** (the `Box` with `maxHeight: 500, overflowY: 'auto'` in `ChatComponent`), never the whole page:

- Use `container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })` — **never `scrollIntoView()`**, which can drag the entire page along with the chat (the indicator initially used it and had to be redone).
- Scroll triggers: new messages, generation completion, and the appearance of the CONNECTING/THINKING indicators (covers e.g. "Regenerate", where the message count does not change and the messages effect alone would not fire).
- Each trigger scrolls **once** (smooth, non-blocking) — it must not re-fire on every render or fight the user's manual scrolling.

### Media Part Format — IMPORTANT

The provider does **NOT** accept OpenAI's `video_url` content type (returns `400 unsupported content[].type: 'video_url'`). Videos must be sent as:

```json
{ "type": "input_video", "input_video": { "data": "data:video/mp4;base64,..." } }
```

Images use the standard format: `{ "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }`.

### First Message Transform

- [`useMiniMaxH3FirstMessageTransform`](src/hooks/useMiniMaxH3FirstMessageTransform.ts) (T2V; also used for R2V): prepends `length=N`, `aspect=A:B` (from the `length` / `aspect_ratio` form fields), then `description=...`.
- [`useMiniMaxH3I2VFirstMessageTransform`](src/hooks/useMiniMaxH3I2VFirstMessageTransform.ts) (I2V): same, plus `first_image=Picture 1` / `last_image=Picture 2` lines depending on which frame fields are filled (last-only → `last_image=Picture 1`).

### System Prompts (minimaxH3*)

- Plain text, no markdown. Spoken content in generated prompts uses English double quotes `"[English] ..."` — **never `<d>` tags** (they cause a short-sound audio artifact in the model). `<scenetrans>` / `<cutoff>` mark dialogue crossing a cut or truncated by the video end.
- T2V: three inline blocks — `integrated_multimodal_description: ...`, `overall_soundscape: ...`, `non_diegetic_music: ...`.
- I2V: a picture-instruction line, then the same three blocks.
- R2V (full-reference mode): six sections, each with a header on its own line — `subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, `overall_soundscape`, `non_diegetic_music`. Reference labels `<Subject N>`, `<Picture N>`, `<Video N>`, `<Audio N>` are numbered independently per category in attachment order. The output must enumerate assets fully (`<Picture 1>, <Picture 2>, ...`) — never ranges like "Pictures 1 to 4". Audio files are never attached to the message; `<Audio N>` labels are assigned from the user's text only.
- Reference guides: `docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md` (shared shot/camera/speaker rules) and `docs/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md` (full-reference mode).

---

## Creating a New Tab

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

### Step 2: Create the React component

Create `src/components/tabs/<TabName>.tsx`.

**Component structure:**

```tsx
import { WFTab } from '../WFTab';
import { Layout, GridLeft, GridRight, GridBottom } from '../controls/Layout';
import { GenerateButton } from '../controls/GenerateButton';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <WidthHeight defaultWidth={848} defaultHeight={480} />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <ModelSelectAutocomplete name='model' type='hunyuan' sx={{ mb: 2 }} />
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput name='lora' type='hunyuan' />
                <AdvancedSettings>
                    <SamplerSelectInput name='sampler' />
                    <SchedulerSelectInput name='scheduler' />
                </AdvancedSettings>
            </GridLeft>
            <GridRight>
                <ImageResult />
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
        receivers={[{ name: 'image', acceptedTypes: ['images'] }]}  // optional
        content={<Content />}
    />
);
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
        "sampler": {
            "id": "handle",
            "sampler_id": "108"
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
- `"id": "handle"` — special value for dynamic controls (LoRA, etc.) — handled by custom handlers
- `"id": "skip"` — control is disabled/skipped
- `"id": "NODE_ID"` — maps to a specific node in the API JSON
- `"field"` — the input field name on that node
- Arbitrary extra fields (e.g. `node_id`, `sampler_id`, `set_field`) — passed to handler via `control` object for node references

**result field:**
- Array of `{ id: string, type: string }` objects
- `type` values: `"images"`, `"audio"`, `"gifs"` (usually for videos, not just GIFs)
- `id` is the node ID in the API JSON that produces the result

**defaults section:**
- Key-value pairs for default parameter values
- Stored in `config.local.json.example` for project defaults

### Step 4: Register in App.tsx

Add the import and tab registration in `src/App.tsx`:

```tsx
import { NewTabTab } from './components/tabs/NewTab';

<WorkflowTabs>
    {NewTabTab}
</WorkflowTabs>
```

**Placement rules:**
- T2I, I2V, T2V, Audio, Upscale tabs grouped together
- Alphabetical order within groups

### Step 5: (Optional) Add defaults to config.local.json.example

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
    }
}
```

### Standard Tab Layout

```
┌─────────────────────────────────────────────┐
│  GridLeft (controls)    │  GridRight (result)│
│  PromptInput            │  ImageResult       │
│  WidthHeight            │  (or VideoResult)  │
│  SliderInput (steps)    │                    │
│  ModelSelect            │                    │
│  AdvancedSettings       │                    │
│  SeedInput              │                    │
│  LoraInput              │                    │
├─────────────────────────┤                    │
│  GridBottom: GenerateButton                   │
└─────────────────────────┘                    │
```

---

## Dynamic Workflow Modification

### insertGraph — Inserting node groups at runtime

`insertGraph` is the primary utility for inserting groups of nodes into the workflow dynamically. Located in [`src/api/utils.ts`](src/api/utils.ts).

**Signature:**

```typescript
insertGraph(api: any, graph: any): string
```

**How it works:**

1. Allocates a free node ID using `getFreeNodeId(api)`
2. Prefixes all node keys in the graph with the allocated ID (graph keys use `:` placeholder, e.g. `':main'` → `'157:main'`)
3. Rewrites internal references (links starting with `:`) to use the actual prefixed IDs
4. Returns the base ID for constructing full node IDs

**Example:**

```tsx
import { getFreeNodeId, insertGraph } from '../../../api/utils';

const handler = useEventCallback((api: any, value: any, control: controlType) => {
    if (!value || !value.length || !control.sampler_id) {
        return;
    }

    // Define a sub-graph with placeholder IDs (must use : prefix)
    const referenceGraph = {
        ':reference': {
            inputs: {},
            class_type: 'HiDreamO1ReferenceImages',
            _meta: { title: 'HiDream-O1 Reference Images' },
        },
    };

    // Insert the graph — returns base ID, e.g. "157"
    const refBaseID = insertGraph(api, referenceGraph);
    const refNodeID = refBaseID + ':reference';

    // Connect reference images from array to LoadImage nodes
    value.forEach((v, idx) => {
        if (!v.enabled) return;
        const imageNodeID = getFreeNodeId(api) + '';
        api[imageNodeID] = {
            inputs: { image: v.image },
            class_type: 'LoadImage',
            _meta: { title: 'Load Image' },
        };
        api[refNodeID].inputs['images.image_' + (idx + 1)] = [imageNodeID, 0];
    });

    // Connect to the sampler — node ID comes from config.json control field
    api[control.sampler_id].inputs.positive = [refNodeID, 0];
    api[control.sampler_id].inputs.negative = [refNodeID, 1];
});
```

**Key rules:**
- Prefer using `insertGraph` if you need to insert more than one node
- Graph node keys must use `:` prefix (e.g. `':node'`, `':loader'`)
- Internal links between graph nodes use `[':key', 0]` format — `insertGraph` auto-resolves these
- External references (not starting with `:`) are preserved unchanged
- Use `getFreeNodeId(api)` for standalone single-node insertion outside `insertGraph`
- CRITICAL: **Never hardcode node IDs** — pass them via config.json control fields or extract from `control` object. There should NOT BE A SINGLE HARDCODED ID in ts/tsx code. The only exception is `insertGraph` where you provide free-form colon-prefixed suffixes.
- NEVER look up nodes by their names, classes, etc. IT'S FRAGILE. If you need a specific node, pass its ID from config.json.
- NEVER do `git checkout`, the changes are often too massive and you will revert a lot of useful code in the process. You can see diffs and revert parts of the code manually.

### Dynamic handler example

```tsx
import { useEventCallback } from '@mui/material';
import { useRegisterHandler } from '../contexts/TabContext';
import { controlType } from '../../../redux/config';
import { insertGraph } from '../../../api/utils';

const ReferenceImages = ({ name }: { name: string }) => {
    const handler = useEventCallback(
        (api: any, value: any, control: controlType) => {
            // Node IDs come from config.json — never search by class_type
            if (!control.reference_node_id) return;
            
            api[control.reference_node_id].inputs.my_field = value;
        },
    );
    useRegisterHandler({ name, handler });
    // ...
};
```

The `control` object contains extra fields from config.json (e.g., `reference_node_id`, `sampler_id`).

### Handler lifecycle

**Handlers are called only once — right before generation.** Each generation starts from a clean slate: the workflow is reloaded fresh from the API JSON file. Modified workflows are not cached or persisted between generations.

This means:
- Handlers must fully set up the workflow each time they are called
- Inserted nodes (via `insertGraph` or `getFreeNodeId`) are added to the current workflow copy and sent to ComfyUI with the prompt
- Any conditional logic (e.g. inserting/removing nodes based on parameter values) must handle the full state change in a single call — there is no incremental update
- If a node should not exist (e.g. switching from base to dev model), the handler must explicitly remove it from the current `api` object
- **Do NOT delete nodes for disabled toggles** — if a toggle-controlled node is only inserted when `value === true`, just return early when `value === false`. The graph is reloaded fresh from the API JSON on each generation, so no leftover nodes exist

---

## Key Patterns

### Form State Management

All tab forms use `react-hook-form` via `FormProvider`. The `WorkflowTabs` component creates a single form per tab and all controls subscribe via `Controller` or `useController`.

### Result Handling

Results arrive via WebSocket, dispatched to `s.tab.result[tabName][id][type]`. The `useResult()` hook reads from this location. Results can be overridden via `ResultOverrideContext` for features like sending images between tabs.

### Dynamic Control Values

At runtime, the app reads the API JSON and replaces input values based on the current form state. The `useAPI()` hook provides the mapping between control names and node fields. **IMPORTANT**: all controls that are registered in react-hook-form should have a corresponding config.json entry. If control is handled somehwere else (by another control or handler), it should have its `id` set to `skip` explicitly.

### LoRA Handling

LoRA loading is configured via `handler_options.lora_params` in config. The system dynamically inserts LoRA loader nodes and connects them to the model pipeline.

For tab-specific LoRA loaders (e.g., `NunchakuQwenImageLoraLoader`), use the `classNameOverride` prop on `LoraInput`:

```tsx
<LoraInput
    name='lora'
    type='qwen'
    classNameOverride={isNunchaku ? 'NunchakuQwenImageLoraLoader' : undefined}
/>
```

### Dynamic Workflow Modification via Custom Handlers

For controls that need to modify the workflow based on runtime values (e.g., switching model loaders), create a custom handler using `useEventCallback` and pass it via `customHandler` prop:

```tsx
const useModelHandler = () => {
    return useEventCallback(
        (api: any, value: string, control: controlType) => {
            const isNunchaku = value.toLowerCase().includes('nunchaku');
            if (isNunchaku) {
                // Replace model loader with NunchakuQwenImageDiTLoader
                api[control.model_loader_id] = { ...nunchakuLoaderNode };
                // Insert FluxKontextMultiReferenceLatentMethod nodes
                insertNode(api, control.sampler_id, 'positive', positiveRefNode);
                insertNode(api, control.sampler_id, 'negative', negativeRefNode);
            } else {
                // Standard mode
                api[control.node_id].inputs[control.field] = value;
            }
        },
    );
};

<ModelSelectAutocomplete
    name='model'
    type='qwen'
    customHandler={modelHandler}
/>
```

The `control` object contains extra fields from config.json (e.g., `model_loader_id`, `sampler_id`). **CRITICAL**: never hardcode node IDs, they should be either passed via config.json control fields or collected from the other known nodes (by tracking inputs backwards).

---

## Common File Locations

| What | Where |
|------|-------|
| Tab component | `src/components/tabs/<Name>.tsx` |
| Tab API workflow | `public/api/<name>.json` |
| Tab config | `public/conf/config.json` → `tabs.<key>` |
| Tab registration | `src/App.tsx` → `<WorkflowTabs>` children |
| Default values | `public/conf/config.local.json.example` |
| Redux slices | `src/redux/*.ts` |
| Custom hooks | `src/hooks/*.ts` |
| Controls | `src/components/controls/*.tsx` |
| Tab layout | `src/components/WorkflowTabs.tsx` |
| i18n locales | `src/i18n/locales/*.ts` |
| Chat component | `src/components/chat/*.tsx` |
| LLM system prompts | `src/components/chat/prompts/*.ts` |
| LLM config | `public/conf/config.json` → `llm` |

### i18n Reminder

**Every new component, control, or tab MUST have i18n keys.** When creating a new UI component:

1. Add keys to `src/i18n/locales/en.ts` (base English translations).
2. Add the same keys to `src/i18n/locales/ru.ts` (Russian overrides — can use English text as placeholder).
3. Use `useTranslate()` hook (`tr('key.path')`) for all user-facing strings: labels, placeholders, button text, error messages, tooltips.
4. Never hardcode UI strings in components — always use `tr()`.

Keys should follow a hierarchical pattern: `controls.<component_name>.<field>`, `tabs.<tab_name>.<field>`, `toasts.<message>`, etc.

### Before using any control component — read its source

**Always read the component source file before using it.** Controls like `SelectInput`, `SliderInput`, `SelectControl`, etc. have their own label handling pipeline:

- `SelectInputBase` prepends `controls.` to the `label` prop: `` label={`controls.${label || props.name}`} ``
- `SelectControl` then calls `tr(label)` on the result
- Same pattern: `SliderInput` → `SliderControl` → `tr()`

This means:
- Pass **raw key names** (e.g. `label='ref_image_size'`), NOT pre-translated values (`label={tr('controls.ref_image_size')}`)
- The full key resolves to `controls.ref_image_size` → translated via `tr()`
- For `choices` in `SelectInput`, pass translated values via `tr()`: `{ text: tr('controls.scale_match'), value: 'match' }`
- For direct `tr()` usage (not through a control component), use the full path: `tr('controls.ref_image_size')`, `tr('controls.scale_match')`, etc.

**Rule:** When adding a new UI element, read the relevant control component source first to understand its i18n pipeline. Never guess how a component handles labels or translations.

### After iterative fixes — ask about updating AGENTS.md

If fixing an issue took multiple attempts, once the user confirms the result is satisfactory, ask: "Can/should I update AGENTS.md with what we learned?" This captures lessons learned and prevents repeating the same mistakes.

---

## Development Commands

### Linting + Typecheck

**Always use `yarn lint` to run both ESLint and TypeScript checks.** Do not use `npx eslint` or `yarn tsc --noEmit` directly — they may invoke mismatched versions or skip project reference checking.

```bash
yarn lint            # runs eslint . && tsc -b --noEmit
yarn lint --fix      # runs eslint . --fix
```

`yarn lint` combines linting and typecheck in one command. TypeScript uses `tsc -b` (project references mode) to correctly resolve all files and catch module errors.

### Testing (mandatory before deploy)

Tests run with **Vitest** (config in [`vitest.config.ts`](vitest.config.ts), jsdom environment, `@testing-library/react` for components). **`yarn build` runs the full test suite and fails if any test fails** — a deployable build cannot be produced with a red suite:

```bash
yarn test            # runs the full suite once (vitest run)
yarn test:watch      # dev mode (vitest)
yarn build           # tsc -b && vitest run && vite build
```

Test files are colocated with the code as `*.test.ts(x)` under `src/` and are type-checked by `tsc -b` (part of the app project, included by `tsconfig.app.json`). Pure logic lives in `src/utils/*` and `src/api/utils.ts`; keep it free of React so it stays testable without jsdom. Component tests use the `@testing-library/jest-dom` matchers — a test file using them must `import '@testing-library/jest-dom/vitest'` for the types (the runtime setup already loads it via `vitest.setup.ts`).

## Kilo code notes

If the user gives you a path to an image or a document (docx/xlsx etc.), use the read tool to look at it. Despite the tool description you DO have vision support and CAN see images and read documents.