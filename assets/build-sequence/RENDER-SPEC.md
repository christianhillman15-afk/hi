# DK3 — Photoreal Build Sequence · Render Spec

This folder is the drop-in slot for the **photoreal scroll animation** that
replaces the live 3D model on the homepage. Render the sequence to this spec,
drop the frames in here, flip one switch, and the site plays it as visitors
scroll — the same technique the luxury-real-estate reels use.

The website side is already built (`js/buildseq.js`). You only need to supply
the frames (or a video). Nothing else changes.

---

## 1. What to deliver

**Preferred — an image sequence** (smoothest scroll scrubbing):

- **Frames:** 90–150 still images (120 is the sweet spot).
- **Naming:** `frame_0001.jpg`, `frame_0002.jpg`, … zero-padded, sequential,
  starting at `0001`. No gaps.
- **Format:** JPG, quality ~80 (or WebP if you prefer — set `ext:"webp"`).
- **Resolution:** 1920×1080 (16:9). The player cover-fits, so 16:9 is safest.
- **Weight target:** keep each frame ≤ ~180 KB so the whole set loads fast.
  (120 × 150 KB ≈ 18 MB total — fine for a hero once, but compress well.)
- **Background:** render on the **environment/sky**, not transparent — this is
  a full-frame cinematic shot, not a cutout.

**Alternative — a video** (lighter to download, slightly less precise scrub):

- `build.mp4`, H.264, 1920×1080, ~6–10 s, high bitrate, **no audio**.
- Also export `build.webm` (VP9) if you can, for broader support.

---

## 2. The shot (match the current narrative)

One continuous **locked, slow camera move** (a gentle orbit/craned pan around a
single luxury modern home on its lot) covering three acts, evenly across the
timeline so scroll position maps to build progress:

| Scroll | Act | On screen |
|-------:|-----|-----------|
| 0 – 33% | **Land** | Cleared/graded lot, survey stakes, excavation, foundation slab. Early light. |
| 33 – 66% | **Structure** | Framing rises, walls close in, roof sets. Crane/scaffold optional. Midday. |
| 66 – 100% | **Delivered** | Finished contemporary home — stucco + wood + stone, glass, pool, palms, rooftop terrace — settling into a **golden-hour/dusk** glow with warm interior + landscape lighting. |

Keep the camera **calm and continuous** (no cuts). The final 10% should rest on
the money shot — the finished home at dusk — because that frame is what sits on
screen when the section is centered.

Design cues to match the brand (so it feels like the same house):
two-storey flat-roof modern villa, warm wood-slat entry accent, stone base
course, dark metal roof/parapet with a pale coping cap, floor-to-ceiling glass,
rooftop terrace + pergola, driveway + pool + South-Florida palms, address
monument at the street. Fort Lauderdale daylight → warm dusk.

---

## 3. Turn it on

1. Put the frames in this folder (`assets/build-sequence/`).
2. Open `js/buildseq.js` and edit the `SEQ` config at the top:

   ```js
   var SEQ = {
     enabled: true,          // ← turn it on
     path:   "assets/build-sequence/",
     prefix: "frame_",
     pad:    4,
     ext:    "jpg",
     first:  1,
     count:  120,            // ← your exact frame count
     video:  ""              // (or "assets/build-sequence/build.mp4" for video mode)
   };
   ```
3. Reload. The photoreal scrub replaces the live model automatically. If a frame
   is ever missing, the site quietly falls back to the live 3D model — it can't
   break.

---

## 4. How to get it rendered

Any of these produces a compliant sequence:

- **Blender** (free) — model or import the home, set an EEVEE/Cycles camera
  animation of ~120 frames, `Output → Image Sequence (JPEG)`, name `frame_####`.
- **Cinema 4D / 3ds Max + Corona/V-Ray**, **Unreal Engine 5** (Movie Render
  Queue), **Twinmotion**, or **D5 Render** — all export image sequences.
- **Commission it** — hand this file to an archviz freelancer (Upwork/Fiverr,
  search "architectural visualization animation"). This spec is the brief;
  typical turnaround is a few days.

If you already have your architect's 3D model or renderings of a real DK3 home,
that's the ideal source — it'll be the actual house you built.
