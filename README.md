# DK3 Construction — Website

A premium, fully responsive marketing website for **DK3 Construction LLC**, a
licensed general contractor in Fort Lauderdale, FL specializing in luxury
residential and commercial projects.

Built as a fast, dependency‑free **static site** (plain HTML, CSS and vanilla
JavaScript) — no build step, no framework, nothing to install. Just open it or
drop it on any host.

---

## Pages

| File | Page | Highlights |
|------|------|-----------|
| `index.html` | Home | Cinematic hero, animated stats, services, featured projects, process, testimonials slider, service‑area map, CTA |
| `services.html` | Services | Six detailed service breakdowns with feature lists + FAQ accordion |
| `projects.html` | Projects | Filterable portfolio gallery (Hospitality / Residential / Commercial / Sitework / Pools) |
| `about.html` | About | Company story, values, founder's note, "why choose us", process |
| `contact.html` | Contact | Validated quote form, contact details, embedded Google Map, service area |

```
.
├── index.html
├── services.html
├── projects.html
├── about.html
├── contact.html
├── css/
│   └── styles.css      # complete design system + all components
├── js/
│   └── main.js         # nav, scroll reveal, counters, slider, filters, form, FAQ
├── assets/
│   ├── favicon.svg
│   └── logo-mark.svg
├── robots.txt
├── sitemap.xml
└── README.md
```

## Design

- **Palette:** near‑black "ink" + warm paper + an amber‑gold accent (a premium,
  construction‑appropriate look).
- **Type:** *Space Grotesk* (display) + *Inter* (body), loaded from Google Fonts.
- **Cinematic motion layer** (inspired by high‑end agency sites): a one‑time
  intro curtain (once per session), buttery smooth scrolling, kinetic
  split‑text headline reveals, parallax hero imagery, a horizontal
  scroll‑pinned project showcase on the home page, and a custom cursor.
- **Motion:** scroll‑reveal, animated counters, a testimonial slider, hover
  interactions — all of which automatically disable under
  `prefers-reduced-motion`, and everything degrades gracefully with JS off.
- **Smooth scroll** uses [Lenis](https://github.com/darkroomengineering/lenis)
  loaded from a CDN; if it fails to load, native scrolling is used — nothing
  breaks. It's only enabled on fine‑pointer (desktop) devices.
- **Responsive:** fluid layouts with a full mobile navigation menu.
- **SEO:** per‑page titles/descriptions, Open Graph tags, a canonical URL, a
  `GeneralContractor` JSON‑LD block on the home page, plus `sitemap.xml` and
  `robots.txt`.

## Running locally

No build required. Either open `index.html` directly, or serve the folder:

```bash
# Python
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying

Any static host works — **GitHub Pages**, Netlify, Vercel, Cloudflare Pages, or
traditional cPanel hosting. Just upload the files. For GitHub Pages, enable
Pages on the repo and point it at the branch root.

---

## Before going live — quick checklist

Everything below is real client data already wired in:

- **Phone:** (954) 709‑9742
- **Email:** jason@dk3llc.com
- **Hours:** Mon–Fri, 9am–5pm
- **Instagram:** @dk3construction · **Facebook:** DK3 Construction
- **Real hotel/hospitality projects** referenced by name (Berkeley Park, Uma
  House, Iberostar Berkeley Shore, Urbanica The Meridian, Casa Boutique,
  Riviere South Beach).

A few things worth swapping for the final launch:

1. **Photography.** Images are high‑quality Unsplash placeholders (loaded from
   `images.unsplash.com`). Replace them with DK3's own project photos for
   maximum impact — search `unsplash.com/photo-` URLs in the HTML and swap the
   `src`. For the best result, download real project photos into `assets/` and
   point to them locally.
2. **Stats.** The headline figures (`11+` hotel builds, `5.0★` rating, etc.) are
   editable in the HTML. `11+` reflects the hotels listed on the current DK3
   site; confirm/adjust the others (they're marked with `data-count`).
3. **Testimonials.** The three home‑page reviews are representative samples
   (first name + city). Replace them with real Google/Facebook reviews.
4. **Founder's note** (About page) is signed "Jason" based on the public email;
   expand or edit as desired.
5. **Contact form.** It validates and shows a success state client‑side, but has
   **no backend** yet. To receive submissions, point the `<form>` at a service:
   - **Formspree:** add `action="https://formspree.io/f/xxxx" method="POST"` to
     the `<form id="contact-form">` and remove the `e.preventDefault()` demo
     handler in `js/main.js`, **or**
   - **Netlify Forms:** add `netlify` to the `<form>` tag when hosting on Netlify.
   Until then, the prominent `mailto:jason@dk3llc.com` link is the fallback.

---

© DK3 Construction LLC. Website template — all photography via Unsplash.
