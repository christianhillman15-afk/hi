# DK3 — AI Image Prompt Pack (photoreal scroll build)

You can generate photoreal stills to spec — so this is how we get a *genuinely
real* hero animation. The website already cross-dissolves a handful of stills as
you scroll (`js/buildseq.js`, `crossfade: true`), so we don't need 120 frames —
we need **5 beautiful, consistent images** that tell the build story and end on a
money shot like the one you shared.

The image you sent (curved rooflines with LED cove lighting, floor-to-ceiling
glass, wood-slat screens, travertine stone, infinity pool, palms, blue-hour
dusk) is the target look. These prompts are tuned to recreate and extend it.

---

## The winning approach: 5 stills that dissolve on scroll

| # | File | Scroll | Shot |
|---|------|-------:|------|
| 1 | `frame_0001.jpg` | 0% | Empty graded oceanfront lot, dawn |
| 2 | `frame_0002.jpg` | 25% | Foundation + concrete structure going in |
| 3 | `frame_0003.jpg` | 50% | Framed / under construction, wrapped |
| 4 | `frame_0004.jpg` | 75% | Finished villa, bright daylight |
| 5 | `frame_0005.jpg` | 100% | **The money shot** — finished villa at blue-hour dusk |

**The #1 rule: keep the CAMERA and the LOT identical across all five.** Same
angle, same framing, same horizon, same palms. Then the dissolve looks like one
place transforming — not five different photos. Best way to do that: generate
shot 5 (the hero) first, then use your tool's **image-to-image / "same scene"**
feature with that image as the reference for shots 1–4, only changing the
construction stage and light. (Midjourney: `--sref` / same seed + `--cref`;
DALL·E / Firefly: "edit / use as reference"; Runway/Flux: img2img at 0.4–0.6
strength.)

---

## Master style suffix (paste at the END of every prompt)

> …ultra-luxury modern tropical villa, curved cantilevered rooflines with warm
> LED cove lighting, floor-to-ceiling curved glass, warm teak wood-slat screens,
> travertine and natural stone, infinity-edge pool, palm trees, Fort Lauderdale
> South Florida, architectural photography, shot on Sony A7R IV 24mm, f/8, ultra
> sharp, high dynamic range, professional real-estate photography, photoreal,
> 8k, cinematic --ar 16:9

**Negative / avoid** (add to a negative field, or append "no …"):
> no people, no cars, no text, no watermark, no logo, no warped or melted
> geometry, no extra floors, no distorted reflections, no fisheye, no
> oversaturation, no cartoon, no CGI look, no tilt-shift blur

---

## The 5 prompts

**1 — Empty lot (0%)**
> Wide establishing shot of a large empty graded waterfront building lot at soft
> dawn, freshly cleared level dirt pad with survey stakes and string lines, a few
> mature palm trees at the edges, calm water and pastel sky behind, where a
> luxury villa will be built, [master style suffix]

**2 — Foundation (25%)**
> The same waterfront lot from the exact same camera angle, now with a poured
> concrete foundation slab and footings, rebar and formwork, early structure of
> ground-floor concrete columns rising, construction site, morning light,
> [master style suffix]

**3 — Under construction (50%)**
> The same lot and same camera angle, now a two-storey villa under construction:
> concrete and steel frame complete, upper floor slab cantilevered, walls going
> up, some scaffolding, wrapped openings, midday sun, construction phase,
> [master style suffix]

**4 — Finished, daylight (75%)**
> The same villa now fully finished and landscaped, bright clear daytime, same
> camera angle: curved white rooflines, floor-to-ceiling glass, teak wood-slat
> screens, travertine stone walls, blue infinity pool, lush tropical planting,
> [master style suffix]

**5 — THE HERO, blue-hour dusk (100%)**
> The finished ultra-luxury villa at blue-hour dusk, same camera angle, dramatic
> deep-blue twilight sky with warm pink horizon, every window glowing warm from
> inside, LED cove lighting tracing the curved rooflines, landscape uplighting on
> palms and stone, mirror-still infinity pool reflecting the house, [master style
> suffix]

---

## Bonus shots for the rest of the site (optional, high impact)

- **Homepage hero background:** shot 5, but framed with more sky on top for the
  headline — add "generous negative space in the upper third, house lower-right."
- **Aerial / drone:** "high aerial drone view looking down at the finished villa,
  rooftop terrace and pool visible, dusk, [master style suffix] --ar 16:9".
- **Entry detail:** "close-up of the villa's grand entry — tall pivot door, warm
  wood slats, stone, glowing sconces, dusk, [master style suffix] --ar 4:5".
- **Interior glimpse:** "warm modern luxury living room seen through the glass
  wall from the pool deck at dusk, [master style suffix] --ar 16:9".

Generate a few options of each and keep the best — consistency of the *house*
matters more than any single frame.

---

## Specs + how to turn it on

- **Export:** JPG (or WebP), **1920×1080 (16:9)**, quality ~80, ≤ ~250 KB each.
- **Name them:** `frame_0001.jpg` … `frame_0005.jpg` (zero-padded, in order).
- **Drop them in:** this folder (`assets/build-sequence/`).
- **Switch on:** in `js/buildseq.js`, set `enabled: true`, `count: 5`,
  `crossfade: true`. Reload — they cross-dissolve as you scroll, ending on the
  dusk hero. (Missing/incomplete set → it safely falls back to the live 3D model.)

Send me the images and I'll wire them in and tune the pacing. Even just shots
**4 and 5** (finished day → finished dusk) make a stunning two-image reveal to
start.
