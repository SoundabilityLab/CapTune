**CapTune – Creator Tool**

This repository implements the Creator Tool (CT) described in `Docs/SystemDesign.md`. It enables caption creators to upload a video + captions, calibrate stylistic parameters with AI, define lower/upper anchor bounds, lock/edit captions, categorize non‑speech captions, preview overlays, and export a configuration bundle for downstream viewers.

The Viewer Client (VC) is not part of this repo.

**Overview**
- Upload SRT captions and a video for preview
- Calibrate baseline parameters with AI: detail level and expressiveness (range 1–10)
- Define lower/upper anchors via sliders (range -5..5; 0 = baseline). While dragging,
  the slider shows a deterministic "Dog Bark" example tooltip. Changes auto-trigger
  a debounced preview (500ms) that transforms the 5 nearest non‑speech captions.
  After preview completes, use "Commit & Apply All" to apply to all remaining captions
  or "Cancel Changes" to roll back.
- Lock or manually edit individual captions to preserve them
- Categorize non‑speech captions (music, sound_effect, character_sound, onomatopoeia, action)
- Export JSON containing original/lower/upper captions plus parameter values and metadata

**Key Files**
- `pages/index.tsx`: Main UI wiring (uploads, player, tabs, export)
- `components/TransformationTabs.tsx`: Sliders, preview, confirm/cancel, batch transforms
- `components/CaptionList.tsx`: Per‑caption edit/lock/category controls
- `components/VideoPlayer.tsx`: Video element with generated WebVTT track overlay
- `utils/ParameterMapper.ts`: Maps UI slider values [-10..10] to math values [1..10]
- `utils/transformationQueueService.ts`: Splits transforms into current window ±60s and upcoming; handles cancellation
- `utils/transformService.ts`: Client calls to API for calibrate/transform
- `utils/categorizationService.ts`: Client call to categorize non‑speech captions
- API routes: `pages/api/transform/calibrate.ts`, `pages/api/transform/applyChange.ts`, `pages/api/categorize.ts`
- `utils/exportService.ts`: Builds export JSON and triggers download

**Requirements**
- Node.js 18+
- An OpenAI API key available to the app as `OPENAI_API_KEY`

Create an env file:

```
cp .env.local.example .env.local
# then edit .env.local and set OPENAI_API_KEY
```

**Install & Run**
- Install: `npm install`
- Dev: `npm run dev` (http://localhost:3000)

**How It Works (High Level)**
- Parse SRT → normalize to caption objects, heuristically mark non‑speech (parentheses)
- Calibrate baseline math values via AI; initialize the `ParameterMapper`
- Slider moves update math values; send caption batch near current playback first, then background batch
- Locked or manually edited captions are preserved across transformations
- Generate WebVTT from displayed captions to overlay on the video element
- Export JSON bundle containing lower/upper/original captions + parameter values + metadata

**Security Note**
- Never commit API keys. This project reads `process.env.OPENAI_API_KEY`. See `.env.local.example`.

**Model Selection**
- By default the APIs use `gpt-4o`. You can change models via env vars:
  - `OPENAI_MODEL` (global default), or per-route overrides:
    - `OPENAI_TRANSFORM_MODEL` (applyChange)
    - `OPENAI_CALIBRATE_MODEL` (calibrate)
    - `OPENAI_CATEGORIZE_MODEL` (categorize)
- If your account has access to GPT‑5, set `OPENAI_MODEL=gpt-5` (or the per-route var). Otherwise it will fall back to `gpt-4o`.
