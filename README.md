# CapTune System Components

## 1. **Creator Tool (CT)**

This component allows caption creators to define the "safe" transformation space for their captions. Creators:

- Upload videos with original caption files
- Set **two anchor points** (lower and upper bounds) that define acceptable ranges for:
  - **Level of Detail** (minimal to elaborate descriptions)
  - **Expressiveness** (neutral to creative/evocative language)
- Preview AI-generated transformations and manually edit if needed; can also lock certain captions
- Export a configuration file containing the original captions, transformation boundaries, and video metadata

The key idea is that creators maintain editorial control by establishing guardrails within which viewer customization can occur.

## 2. **Viewer Client (VC)**

This component enables DHH viewers to personalize captions during playback based on their preferences. Viewers can:

- Adjust captions within the creator-defined boundaries using a **10×10 style grid** (Level of Detail × Expressiveness)
- Select from three **sound representation methods**: source-focused, onomatopoeia, or sensory quality-based
- Toggle **genre alignment** to match captions to the video's tone and style
- Use either direct manipulation controls or a **natural language chat interface** to specify preferences

The system uses GPT-5 to transform captions in real-time based on viewer selections while respecting the creator's boundaries.
