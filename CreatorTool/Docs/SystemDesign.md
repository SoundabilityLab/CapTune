# CapTune System Components

## 1. CREATOR TOOL

This component allows caption creators to define the "safe" transformation space for their captions. Creators:

- Upload videos with original caption files
- Set **two anchor points** (lower and upper bounds) that define acceptable ranges for:
  - **Level of Detail** (minimal to elaborate descriptions)
  - **Expressiveness** (neutral to creative/evocative language)
- Preview AI-generated transformations and manually edit if needed; can also lock certain captions
- Export a configuration file containing the original captions, transformation boundaries, and video metadata

### User Flow:

- Users can adjust the sliders to adjust paramters for the active anchor
- When users are adjusting the sliders: the UI will show a deterministic live example for \[Dog Barking\] to guide the process. The live example should show the current value, the change (e.g., 3 --> 4), and the Dog Bark transformation example. The live example should pop up as a tooltip (not a pop-up that covers the full screen) that anchors to the current position. The full set of determinstic example is:
  - Detail (1–5)
  - 1: (DOG BARK)
  - 2: (DOG BARKS)
  - 3: (DOG BARKS TWICE)
  - 4: (DOG BARKS SHARPLY TWICE)
  - 5: (SHARP, ECHOING DOG BARKS TWICE)
  - Expressiveness (1–5)
  - 1: (DOG BARK)
  - 2: (LOUD DOG BARK)
  - 3: (SHARP DOG BARK)
  - 4: (CRISP, RINGING DOG BARK)
  - 5: (PIERCING, ECHOING DOG BARK)
- When users are done adjusting the slider, the system will trigger transformation automatically. Here, slider debouncing should be implemented (a short wait of 500ms) after slider movement.
- When user confirms the preview, the system will start transformation:
  - During transformation, the sliders will be temporarily unavailable.
  - It will first process the 5 nearby non-speech captions and show to the users.
  - What the first five are done, the system will ask users to inspect the results; users can "commit" to this change with "Commit & Apply All" button and have a button for canceling the change. Canceling the change will rollback the transformation and re-enable the sliders.
- Locked or editted captions should not be overwritten during the transformation.

### Formulas for Transformation in CT

```
         ⎧ V_min + (s - s_min)/(s_0 - s_min) × (V_0 - V_min)    if s < s_0
f(s) =  ⎨
         ⎩ V_0 + (s - s_0)/(s_max - s_0) × (V_max - V_0)        if s > s_0
```

**Where:**

- `s` = slider position (ranges from -5 to 5 in the UI)
- `s_0` = center slider position (set to 0), representing the original caption's baseline
- `V_0` = baseline parameter value for the original caption
- `[s_min, s_max]` = bounds for slider positions (set to [-5, 5])
- `[V_min, V_max]` = bounds for parameter values (set to [1, 10])

Note that the original caption will always correspond to the "0" position in sliders.

The key idea is that creators maintain editorial control by establishing guardrails within which viewer customization can occur.
