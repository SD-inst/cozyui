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
| [`useSettingEditor(name)`](src/hooks/useSetting.ts) | `useSetting.ts` | Editable setting as `[value, setValue]` — see "Editable settings fields" under Settings |
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

### Dexie filtering patterns — IMPORTANT

IndexedDB has no query planner; one cursor walks one index. Multi-criteria filtering is done client-side:

- **Multi-filter = index query per criterion + PK intersection.** `pkFromFilter` in `filter.ts` runs one indexed query per active filter (`.where(field).equals/startsWith/between`) and intersects the resulting primary-key arrays in JS. All filterable fields MUST stay indexed (`timestamp`, `type`, `model`, `mark`, `*words`, `tab`) so the path never degrades to a full scan. The `group` filter has no stored field: `pkFromFilter` resolves it to the tabs of that group (via `workflowTabGroups` from `WorkflowTabsContext`, passed as its 2nd argument) and queries `.where('tab').anyOf(tabs)`.
- **Distinct index values (index-only, no record loading):**
  ```ts
  db.taskResults
      .where('model')
      .between(undefined, undefined, true, true) // full index range → Collection
      .uniqueKeys(); // distinct values only
  ```
  `uniqueKeys()` lives on `Collection`, not on `WhereClause` — a value method (e.g. `between(undefined, undefined)`) is required to get a `Collection`. Dexie then uses `openKeyCursor` + the native `nextunique` cursor direction: it walks only the index B-tree (record objects are NOT loaded) and yields each distinct value once. This is how `HistoryPanel` lists the model-filter options without scanning thousands of records.
- **NEVER full-scan `taskResults` for filter options** (`.filter(...).toArray()` without a limit): records carry `data?: Blob` (generated files when `save_outputs_locally` is on), so an unbounded scan loads all media into memory. Page result queries always use `.limit(page_size)`.
- Dexie tests run against `fake-indexeddb` (polyfill via `import 'fake-indexeddb/auto'`; jsdom has no IndexedDB) — see `distinctModels.test.ts`.

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

### Editable settings fields bind to `useSettingEditor` — IMPORTANT

A stored setting lives in IndexedDB and reaches React through `useLiveQuery`, i.e. one tick later than the keystroke. Binding an input's `value` straight to `useStringSetting`/`useNumberSetting` therefore breaks editing anywhere but at the end of the text: right after the keystroke React restores the DOM value to the prop it still holds — the previous one — and the typed text comes back from the database immediately after; each of those programmatic `input.value` writes puts the caret at the end of the field.

```tsx
const [url, setUrl] = useSettingEditor(settings.llm_url);

<TextField value={url} onChange={(e) => setUrl(e.target.value)} />
```

[`useSettingEditor`](src/hooks/useSetting.ts) keeps a local draft and releases it as soon as the stored value catches up with it, so writes made anywhere else still reach the field. Read-only consumers of a setting keep using `useStringSetting`/`useNumberSetting`.

To test caret behavior, the keystroke must reach React's value tracker: set the value through the prototype setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, …)`) and only then `fireEvent.change(input)` — assigning `input.value` directly is invisible to React, and the test silently passes without any `onChange` running. See [`src/hooks/useSetting.test.tsx`](src/hooks/useSetting.test.tsx).

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

- Plain text, no markdown. Dialogue (spoken content) is wrapped in `<d>[English] ...</d>` tags — ComfyUI's tokenizer now supports these correctly, so they no longer cause the short-sound audio artifact. Sung content stays in English double quotes `"[English] ..."`. `<scenetrans>` / `<|cutoff|>` (with pipes) mark dialogue crossing a cut or truncated by the video end. The tokenizer also defines `<|lyrics_start|>`/`<|lyrics_end|>` and `<|caption_start|>`/`<|caption_end|>` tokens (likely for sung lyrics and on-screen captions), intentionally not used in the prompts yet.
- T2V: three inline blocks — `integrated_multimodal_description: ...`, `overall_soundscape: ...`, `non_diegetic_music: ...`.
- I2V: a picture-instruction line, then the same three blocks.
- R2V (full-reference mode): six sections, each with a header on its own line — `subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, `overall_soundscape`, `non_diegetic_music`. Reference labels `<Subject N>`, `<Picture N>`, `<Video N>`, `<Audio N>` are numbered independently per category in attachment order. The output must enumerate assets fully (`<Picture 1>, <Picture 2>, ...`) — never ranges like "Pictures 1 to 4". Audio files are never attached to the message; `<Audio N>` labels are assigned from the user's text only.
- Reference guides: `docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md` (shared shot/camera/speaker rules) and `docs/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md` (full-reference mode).

### Chat system prompts are lazy chunks — IMPORTANT

Every module in [`src/components/chat/prompts/`](src/components/chat/prompts/) is a big template-text file (~2–29 KB each). They are **never imported statically** — each must be loaded via `import()` so Vite/Rollup splits it into its own chunk and the main bundle stays lean.

- In the consuming component, define a **stable module-level loader constant** (stable identity matters: `ChatComponent` passes it to `useLazyPrompt`, which re-fetches whenever the function identity changes):
  ```tsx
  const animaSystemPrompt = () =>
      import('../../chat/prompts/anima').then((m) => m.animaSystemPrompt);

  <ChatComponent systemPrompt={animaSystemPrompt} />
  ```
- `ChatComponent.systemPrompt` and `chatModeType.systemPrompt` accept `lazyPromptType` (`string | (() => Promise<string>)`) from [`useLazyPrompt`](src/hooks/useLazyPrompt.ts). In `useOpenAIChat`, the system message is a live parameter: while the prompt is unresolved the chat starts with no system message, and once it resolves the sync effect inserts/updates it at the front — including restored chats persisted without one.
- Multi-mode chats (YuE2): put the loader in each mode; only the active mode's prompt is fetched.
- One-shot LLM calls outside `ChatComponent` (e.g. `convertWithLLM` in `MossLayoutEditor`) `await import()` the prompt inline at the call site.
- When adding a new prompt module, follow the same pattern — a static `import { … } from '…/prompts/…'` anywhere regrows the main chunk.

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

### Graph Types — the workflow is typed, never `any`

The workflow graph is typed in [`src/api/graph.ts`](src/api/graph.ts):

```typescript
type NodeId = string;                       // "12" or a prefixed id from insertGraph, "12:main"
type NodeRef = [NodeId, number];           // a link to another node's output
type InputValue = string | number | boolean | null | NodeRef | Array<...>;
interface WorkflowNode { inputs: Record<string, InputValue>; class_type?: string; _meta?: NodeMeta }
type Workflow = Record<NodeId, WorkflowNode>;
```

- **Handlers type `api` as `Workflow`** — the registration pipeline enforces it: `handlerType` and `useRegisterHandler` in `TabContext.tsx` declare `(api: Workflow, value, control)`, and `GenerateButton` passes `params.prompt: Workflow` (a `cloneDeep` of the fetched API JSON, via `useGet<Workflow>`). Never write `api: any` in a handler.
- **`InputValue` includes `null`** — handlers clear connections with `null`.
- **Reading references:** an input is an `InputValue`, so to index a ref you must cast: `(api[id].inputs.images as NodeRef)[0]` — or use the `isNodeRef()` type guard. The same applies to arithmetic on inputs: `(api[id].inputs.frame_rate as number) * value`.
- Node IDs are **strings** (may be composite, e.g. `12:main`); `getFreeNodeId` returns a `number` — append `'' + idx` when building IDs. Indexing `Workflow` with a number is fine.
- `s.tab.api` in Redux (`tab.ts`) stores the last sent prompt as a `Workflow` (`setApi`).

### insertGraph — Inserting node groups at runtime

`insertGraph` is the primary utility for inserting groups of nodes into the workflow dynamically. Located in [`src/api/utils.ts`](src/api/utils.ts).

**Signature:**

```typescript
insertGraph(api: Workflow, graph: Workflow): string
```

**How it works:**

1. Allocates a free node ID using `getFreeNodeId(api)`
2. Prefixes all node keys in the graph with the allocated ID (graph keys use `:` placeholder, e.g. `':main'` → `'157:main'`)
3. Rewrites internal references (links starting with `:`) to use the actual prefixed IDs
4. Returns the base ID for constructing full node IDs

**Example:**

```tsx
import { getFreeNodeId, insertGraph } from '../../../api/utils';

const handler = useEventCallback((api: Workflow, value: any, control: controlType) => {
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
        (api: Workflow, value: any, control: controlType) => {
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

### Handler execution order — IMPORTANT

`GenerateButton` runs the controls in the order `Object.keys(controls).sort((a,b) => order(controls[a]) - order(controls[b]))`, so a handler's config `order` decides when it sees the (already mutated) workflow:

- direct node-id controls run first (order `0`), `id: "handle"` defaults to `100`, an explicit `order` (e.g. `audio_refine: 150`) runs after all of them;
- the sort is stable, so for equal `order` the config.json **key order** decides — put a control after the controls it depends on;
- async handlers are awaited inside the loop, so a rewiring done by an earlier control is visible to later ones.

Give a handler an explicit `order` when it must read values another handler has already written into the graph (e.g. reading `VAEDecode.inputs.samples` after `latent_upscale` has rewired it).

### Derive conditioning from the sampler that produced the latent — IMPORTANT

When a handler inserts a **post-processing / refinement** node (H3 audio refiner, any extra sampler pass) it must take the latent AND the conditioning from the **same producing sampler**, never from the static base ids:

- read the final latent from what currently feeds the decode: `api[video_vae_decode].inputs.samples`;
- resolve conditioning through that sampler: `sampler.inputs.guider` → `guider.inputs.conditioning` (see `conditioningOfSampler` in [`MiniMaxH3AudioRefinerHandler.ts`](src/components/controls/MiniMaxH3AudioRefinerHandler.ts)).

Why: with latent upscale active, the second sampler gets its own `BasicGuider` whose conditioning is built at the **upscaled** resolution (a duplicated `MiniMaxH3ImageToVideo`/`MiniMaxH3ReferenceToVideo`), while the base `105:16` conditioning is at the base resolution — feeding it to a node that consumes the upscaled latent produces a **tensor size mismatch** (observed on I2V). Reading through the sampler's own guider chain also picks up RefMod-applied conditioning (rewired by `refmods`, which runs earlier) and the PDD/upscale model swaps.

Corollary for the model chain: insert accelerator LoRAs at the node's **consumers** (`turbo_model_node_ids`, e.g. `137`), not into the node's own input (`136`), so downstream branches can tap that node's output without them.

### H3 latent anchors (latent keyframes via masked AV latent) — IMPORTANT

The `latent` toggle next to `keyframe` on R2V references (`MiniMaxH3LatentAnchor.ts`) VAE-encodes an image/clip into the sampler's AV latent and freezes those slots with a nested `noise_mask` — unlike `MiniMaxH3AddGuide` (conditioning tokens re-injected every step), the sampler blends the anchor back every step, so the model never has to "understand" an end-clip it was not trained on.

H3 video VAE time chunking (the whole slot math): `clip_length=17`, `vae_ratio_t=4`, `token_drop=3` (dropped only once, at the very end of the whole encode). A full video of F = 17M+5 frames has T = 5M+2 slots; chunk i covers pixel frames `[17i, 17i+17)` ↔ slots `[5i, 5i+5)`; the trailing 5 frames get the trailing 2 slots (the `(1,4)` mini-cycle of `FRAME_PER_TOKEN`). Standalone clip encodes: **17m frames → 5m−3 slots, 17m+5 frames → 5m+2 slots** — so only a 17m+5 clip runs **flush to the video end** (its trailing chunk == the video's trailing chunk); an interior region needs a 17m trim + 5 junk pad frames, then `LatentCut(dim='t', amount=5m)` drops the pad's 2 slots. Anchors therefore always snap to 17-frame chunk boundaries.

Latent/mask plumbing facts (all verified against this ComfyUI):

- AV latents are `NestedTensor((video [B,24,T,h,w], audio [B,32,2,T_a]))`. **Stock nodes do not handle NestedTensor samples**: `ReplaceVideoLatentFrames` (core, `nodes_latent.py`) reads `shape[2]` and slices `[:, :, i:j]` — it works only after splitting the streams. Use the core `LTXVSeparateAVLatent`/`LTXVConcatAVLatent` (their description explicitly says "any AV model, e.g. LTXV or MiniMax H3"); the Concat builds the **nested `noise_mask`** from the per-stream `noise_mask`s, which is what the sampler's nested-mask path consumes (`comfy/samplers.py:1297`).
- `SetLatentNoiseMask` never touches `samples`, so it is safe on AV latents — but the mask shape convention differs per stream because `reshape_mask` maps the MASK spatial axes onto the latent's **last two** dims: video (5D) → put time in the **batch axis** (one constant image per latent slot; equal-length trilinear is exact, constant spatial = exact at any latent size); audio (4D `[B,32,2,T_a]`) → put time in the mask **width** (one `2×T_a` image; `SolidMask` + `MaskComposite(subtract, x=a0)` cuts the window). A single mask on an AV latent applies to the video only; audio stays fully denoised unless masked explicitly.
- The audio stream can only be **masked, not spliced**: its time axis is the last dim of a 4D latent, while core's `LatentCut/LatentConcat` `t` maps to `ndim-3` (axis 1 on 4D → the channel axis). Frozen zero slots decode to silence (used to stop audio over-generation under an anchored tail); injecting the clip's own audio needs a ~50-line custom node (nested utils exist in `ComfyUI-MiniMaxH3_LatentUpscaler/utils.py`).
- `MinimaxH3LatentUpscaler3D` **discards `noise_mask`** (outputs only `samples`) and `denoised_output` (sampler output index 1) carries no mask either — the upscale pass must **re-apply** anchors and masks on the upscaled latent (same slot indexes: the upscaler keeps T; re-encode clips at the static upscaled pixel size via `computeUpscaledPixelSize`).
- Masking is H3-native in core: the `MiniMaxH3` model class pools the mask to the DiT token grid, turns masked tokens into cond-timestep tokens (`VISUAL_COND_TIMESTEP=0.999` noise aug) and re-blends `latent_image` every step; the Spectrum node handles `denoise_mask` natively too.

---

## Key Patterns

### Form State Management

All tab forms use `react-hook-form` via `FormProvider`. The `WorkflowTabs` component creates a single form per tab and all controls subscribe via `Controller` or `useController`.

### Result Handling

Results arrive via WebSocket, dispatched to `s.tab.result[tabName][id][type]`. The `useResult()` hook reads from this location. Results can be overridden via `ResultOverrideContext` for features like sending images between tabs.

### Dynamic Control Values

At runtime, the app reads the API JSON and replaces input values based on the current form state. The `useAPI()` hook provides the mapping between control names and node fields. **IMPORTANT**: all controls that are registered in react-hook-form should have a corresponding config.json entry. If control is handled somehwere else (by another control or handler), it should have its `id` set to `skip` explicitly.

### Uploaded input files: local copies and the pre-generation preflight — IMPORTANT

ComfyUI's `input` folder is not durable (in `compose.yml` only `./models` is a volume), while the persisted form state keeps naming those files for weeks. One referenced file that is gone makes ComfyUI reject the **whole** workflow with `prompt_outputs_failed_validation`, whose top-level message names neither the node nor the value — so `GenerateButton` decodes `node_errors` into `#<node id> <class_type>: <details>` and shows that ([src/api/validation.ts](src/api/validation.ts)).

Every upload registers its bytes in `db.uploads` under **the server filename** (`id === filename`, indexed by `filename` and `lastUsedAt`) — the only identity that survives reordering, slot changes and re-uploads. All upload paths go through `uploadInputFile` ([src/utils/uploadStore.ts](src/utils/uploadStore.ts)); a re-upload renames the record (`renameUpload`) instead of leaving a stale entry. Pre-v13 records keyed by form position are re-keyed once at startup from each tab's persisted `formState`; a copy no saved form value mentions anymore is deleted, and once the store passes its share of `navigator.storage.estimate()` the oldest copies go (files still referenced by a form last). Removing an asset from a form drops its copy right away: the form-state save effect in [`WorkflowTabs`](src/components/WorkflowTabs.tsx) compares the tab's previous and newly persisted state and deletes copies no saved state references (`dropCopiesLostByTab`) — a file another tab still uses, or one still held by a `skip`ped array entry, survives; a wholesale empty state (initialization, reset) is skipped so a transient clear cannot wipe the cache. `navigator.storage.persist()` is requested because these copies are what makes a cleared input folder survivable.

`GenerateButton` runs one preflight per generation ([src/utils/filePreflightRun.ts](src/utils/filePreflightRun.ts), policy in the pure [src/utils/filePreflight.ts](src/utils/filePreflight.ts)) in two phases:

- **before the control handlers**, over the form values: each referenced file is probed with `HEAD /api/view`, a missing one is re-uploaded from the local copy, and the new name is written back with `setValue` — so every node the handlers then build already points at a file that exists;
- **after the handlers**, over the finished workflow: covers names the handlers put into the graph themselves, skipping everything the first phase confirmed, and applies the same rename to the form so previews and the next generation don't repeat the work.

Only names this client uploaded are candidates: the `<milliseconds>_` prefix every upload adds, or a registration in the store. Prompts, output names and model/LoRA selectors (`ltx2/ltx-2-19b-dev-fp8.safetensors` — always with a subfolder) are never candidates and could not be re-uploaded anyway. Array entries with `skip: true` or `enabled: false` are excluded, since their files never reach the graph. **Ref mods are excluded as well** — their ids and `serverFilename`s go to the collectors as an exclusion set: a mod's bytes live in `db.refModFiles` and `ensureRefModOnServer` is what restores them, while the mod's *id* is a form leaf, so treating that leaf as a filename re-uploads nonsense and rewrites the leaf, detaching the slot from its mod (the thumbnail then renders as an empty tile).

A restore counts only when the server really holds the bytes: the new name is probed once more, and a file that is absent or whose `content-length` differs from the local copy is reported lost instead of being renamed into the payload. A copy holding no bytes is never stored, is dropped when looked up, and the startup pass clears whatever older code left behind — a 404 body from `/api/view` is empty, so a backup fetched for a name the server never had was indistinguishable from a real one.

`probeFile` is tri-state (`present | missing | unknown`): only a real HTTP 404 counts as gone; a timeout or a 5xx is `unknown`, so a wedged server is never mistaken for a mass deletion and nothing is re-uploaded. A file that is gone with no local copy aborts the generation with a message naming the control (`errors.files_lost`) rather than sending a doomed request. Files the server has and the store does not are fetched in the background after the prompt is sent (`cacheUnstored`, ≤ 20 MB each). Masks built by `I2IToggle` are deliberately not registered: they are rebuilt every generation and never appear in a form value.

### Tooltips vs. the `disable_help` setting — IMPORTANT

[`ThemeContext`](src/components/contexts/ThemeContext.tsx) sets `MuiTooltip` defaults `disableHoverListener` and `disableTouchListener` to the `disable_help` user setting (`settings.disable_help`). So when a user turns on "Disable tooltips", **every** `<Tooltip>` in the app stops showing — including ones that carry essential state, not just help text.

Functional/informational tooltips (e.g. explaining why a control is disabled or what a toggle currently does, like the bounding-box editor's snap/underlay buttons and the `NodeTimingsBar` segments) must stay visible regardless of that setting. Force them back on per instance:

```tsx
<Tooltip
    disableHoverListener={false}
    disableTouchListener={false}
    title={tr('...')}
>
    <span>{/* wrapper so a disabled child still receives hover */}</span>
</Tooltip>
```

Only leave `disableHoverListener`/`disableTouchListener` unset for genuine "help" tooltips that should honor the user's preference.

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
        (api: Workflow, value: string, control: controlType) => {
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

### ArrayInput `skip` / `skip_chat` (per-item) — IMPORTANT

Every `ArrayInput` item carries two **universal** per-item toggles (no opt-in), injected centrally in `ArrayInput.tsx` and flowing through the same per-item name-remapping as the tab-supplied children, so they register as `name.<index>.skip` / `name.<index>.skip_chat` (compact dialog and list mode alike). Skipped items render dimmed.

- **`skip`** — the item is excluded from **generation** ("as if it doesn't exist").
- **`skip_chat`** — the item is excluded from the **first chat message** (asset needed for generation but that would confuse the chat, e.g. a drift-fighting keyframe).

The two flags are **independent** — each consumer reads only its own flag. The full array always stays in the form; the "effective value" is a **pure derivation at the read boundary, never a second stored copy** (a filtered copy + sync effect would be fragile and is deliberately avoided).

Where it's honored:
- **Generation handlers** filter to the active entries before numbering slots or building nodes — use `activeEntries(entries)` from [`src/utils/arraySlots.ts`](src/utils/arraySlots.ts) (canonical, tested). Handlers that already gate on a per-item `enabled` toggle add `|| v.skip` to that check (`enabled` = permanent state, `skip` = temporary).
- **Chat** filters `skip_chat` in two places that must stay aligned: `ChatComponent` drops `skip_chat` items from the attached media (generic over `mediaFields`), and `useRefModsForChat` ([`src/hooks/useRefMods.ts`](src/hooks/useRefMods.ts)) skips them when computing the 1-based index for the `refmods=` line, so `Picture N` positions match the attached thumbnails.

**Compact vs. positional renumbering — pick per consumer and keep it internally consistent:**
- **`refmods`** uses **compact** renumbering: `useMiniMaxH3RefModHandler` resolves the active mods to a list and fills loader slots `mod_1..mod_N` in order (no gaps), matching the compact `refmods=` line in chat.
- **R2V reference arrays** (`ref_images`/`ref_videos`/`ref_audio`) use **positional** skip: the handler does `if (!v.image || v.skip) return;` keeping the original index and leaving the skipped slot unassigned. `collectKeyframeEntries` in [`src/components/controls/MiniMaxH3KeyframeHandler.ts`](src/components/controls/MiniMaxH3KeyframeHandler.ts) reads node inputs by **original** index, so positional is what keeps the keyframe collector aligned — do not switch these to compact renumbering without updating the collector.

### Drag-to-reorder list items (dnd-kit) — IMPORTANT

Asset arrays (`ArrayInput`) and the LoRA chips (`LoraInput`) both let the user drag items to reorder them. Both are `@dnd-kit/core` (`DndContext` + `MouseSensor`) + `@dnd-kit/sortable` (`SortableContext` + `useSortable`) + `react-flip-toolkit`, and the combination has one non-obvious requirement. Break it and you get the classic **"item springs back to its old position, then jumps to the new one"** glitch on drop:

- **The same stable item id must be the React key AND the `useSortable` id AND the `SortableContext` `items`** — all three the same id. Index-based keys (an array index, or MUI Autocomplete's `getTagProps({ index }).key`) mis-associate the DOM nodes across a reorder, so the item snaps back home before settling.
- **Wrap the list in `Flipper`/`Flipped` keyed by that same id** (`Flipper flipKey={ids.join(',')}`, `Flipped key={id} flipId={id}`). The FLIP layer is what animates each item smoothly from its old slot to its new one on drop — without it the reorder looks jumpy.
- **`MouseSensor` with `activationConstraint: { distance: 8 }`** so a plain click on an item (e.g. a LoRA chip, which opens the strength dialog) does not start a drag.
- The reorder itself is a pure `arrayMove(values, oldIndex, newIndex)`: `LoraInput` keys it on the id via [`reorderById`](src/utils/lora.ts) (tested in `lora.test.ts`); `ArrayInput` uses `useFieldArray.move(old, new)`.

Both are tested: `ArrayInput.test.tsx` and `LoraInput.test.tsx` (the latter asserts the chips carry `aria-roledescription="sortable"` and that a click still opens the dialog).

### Heavy/rare subtrees must stay out of the main chunk

The main chunk is kept lean by dynamic-importing rarely loaded code; keep it that way when adding features:

- **`SectionAccordion` has a `lazyContent` prop** — children mount only on the accordion's first expansion (`TransitionProps.onEntered`). MUI keeps `AccordionDetails` children mounted while collapsed, so IndexedDB queries and heavy widgets inside a collapsed accordion otherwise run at page load. Used on the History panel (its cards, `ArenaDialog`, `DiffViewer`) and the advanced filters.
- **Heavy rare libraries are isolated in their own lazy module**, not just lazy-mounted: `DateFilterFields` holds the only `@mui/x-date-pickers` + dayjs usage (175 KB chunk), `DiffViewer` owns `react-diff-viewer-continued` + `diff`. If a common file imports them statically, they move back into main.
- **`lazy()` + `<Suspense fallback={null}>` for on-demand widgets**: `MaskEditor` (loaded when `I2IToggle` inpainting is enabled), `MossLayoutEditor`, `lamejs`, chat prompts (see the chat section).
- **`lodash` must not be used — import from `lodash-es` only.** The CJS `lodash` defeats tree-shaking (Rollup inlined the whole 544 KB bundle); `lodash-es` keeps only the used functions (~110 KB → a few KB).

### Crash reporting — the page has to report itself — IMPORTANT

A phone has no console, and React unmounts the whole tree on any uncaught render or effect error, so a crash reads as "the controls appeared and then vanished" with nothing for the user to show anyone. Three layers, all of them load-bearing:

- **`window` level** — `installCrashReporting()` in [`src/utils/crashOverlay.ts`](src/utils/crashOverlay.ts) listens for `error`, `unhandledrejection` and `vite:preloadError` (a lazy chunk that failed to fetch or parse — in Vite 6 the failure sits on `event.payload` and is rethrown, so the rejection handler sees it as well) and renders the report as plain DOM: no React, no MUI, no theme, because those are frequently the things that broke. Importing the module installs the listeners, and [`main.tsx`](src/main.tsx) keeps that import **first** — ES modules are evaluated in source order, so a module that throws while it is being loaded still reaches a page able to say so. The inline script in [`index.html`](index.html) queues whatever happens before the entry module is fetched; the module drains that queue and sets `window.__earlyCrashes = null`.
- **Fatal vs. dismissible** — a rejected promise usually leaves a working page behind, so its report can be dismissed; a render/window/chunk failure cannot. `isSameCrash` in [`src/utils/crashReport.ts`](src/utils/crashReport.ts) merges the duplicate reports that one failed chunk produces, and at most three problems are shown. The panel is `user-select:text`, and its copy button falls back to a selected `<textarea>`: over plain http on a LAN address `navigator.clipboard` does not exist, which is exactly where a phone tester is pointed.
- **React level** — [`ErrorBoundary`](src/components/ErrorBoundary.tsx) wraps the tree in [`main.tsx`](src/main.tsx) and reports to the overlay. [`CrashBoundary`](src/components/CrashNotice.tsx) is the in-place variant — the name of the broken section, its message, and a retry — used around each tab in [`WorkflowTabs.tsx`](src/components/WorkflowTabs.tsx) and around each side panel in [`App.tsx`](src/App.tsx), so one broken panel cannot take the generation controls down with it. A boundary given a `fallback` deliberately does not report to the overlay: the notice already carries the message.
- **A failed resource is not a crash.** An `<img>` or `<script>` that 404s reaches the same `error` event carrying neither a `message` nor an `error` object, and that absence is the filter. Do not replace it with a comparison of `event.target` against `window`: under jsdom those are different objects, and the filter then silently stops working in tests.
- **The overlay cannot use the app locale** — it lives in IndexedDB, which may be part of what broke — so it translates through `createPolyglot` using `navigator.language`, and `refreshCrashOverlay()` redraws once the locale file arrives. Keys are `errors.crash_*` in both locale files, and the test polyglot fails them when one is missing.

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

**`eslint-disable-next-line react-hooks/exhaustive-deps` is strictly prohibited.** Never silence `react-hooks/exhaustive-deps` — no `eslint-disable-next-line`, `eslint-disable`, or any inline suppression. The rule catches real stale-closure bugs; suppressing it hides them. If an effect/hook references a reactive value that isn't in the dependency array, fix the code instead: add the dependency, or restructure so the referenced value is genuinely stable — e.g. a `useMemo`-derived array, or a latest-ref (a `useRef` whose `.current` is updated each render) to read the current value inside the effect while keeping the dependency array on a stable key (e.g. the joined id string, as in `useModThumbURLs` / `useRefModMeta`). Do not suppress the rule to make lint pass.

### Testing (mandatory before deploy)

Tests run with **Vitest** (config in [`vitest.config.ts`](vitest.config.ts), jsdom environment, `@testing-library/react` for components). **`yarn build` runs the full test suite and fails if any test fails** — a deployable build cannot be produced with a red suite:

```bash
yarn test            # runs the full suite once (vitest run)
yarn test:watch      # dev mode (vitest)
yarn build           # tsc -b && vitest run && vite build
```

**A test that renders a component with a missing i18n key fails.** The test polyglot is seeded from the real `en` locale ([`src/testUtils.ts`](src/testUtils.ts)) and records every key no locale defines (`onMissingKey` → `src/i18n/missingKeys.ts`); the setup asserts the set after each test instead of letting node-polyglot's `console.warn` scroll past — vitest owns the console after setup files run, so the hook has to sit on the polyglot. Tests therefore pass **real** translation keys (`label='controls.settings'`), never invented ones.

Test files are colocated with the code as `*.test.ts(x)` under `src/` and are type-checked by `tsc -b` (part of the app project, included by `tsconfig.app.json`). Pure logic lives in `src/utils/*` and `src/api/utils.ts`; keep it free of React so it stays testable without jsdom. Component tests use the `@testing-library/jest-dom` matchers — a test file using them must `import '@testing-library/jest-dom/vitest'` for the types (the runtime setup already loads it via [`src/testSetup.ts`](src/testSetup.ts)).

## Kilo code notes

If the user gives you a path to an image or a document (docx/xlsx etc.), use the read tool to look at it. Despite the tool description you DO have vision support and CAN see images and read documents.