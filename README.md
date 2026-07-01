# Mike's Maintenance — Website

A professional, responsive marketing website for **Mike's Maintenance**, a home repair and
maintenance company serving **Montclair, California** and the surrounding **50-mile** area.

## Services featured

- **Appliance Repair** — washing machines, dryers, dishwashers, refrigeration, treadmills
- **Plumbing & Water** — leaks, drains, fixtures, water lines, hydraulic services
- **Electrical** — wiring, outlets, fixtures, troubleshooting, installations
- **Heating & Cooling** — HVAC repair, maintenance, refrigeration
- **Gas Line Work** — installation, leak detection, appliance hookups
- **Handyman & Maintenance** — general repairs, installations, preventive maintenance

## Highlights

- Single-page site with hero, services, "why us", process, service area, about, and contact sections
- Fully responsive (desktop, tablet, mobile) with an accessible mobile navigation menu
- Client-side contact form with inline validation
- Scroll-reveal animations and animated statistic counters
- SEO metadata, Open Graph tags, and `LocalBusiness` structured data (JSON-LD)
- No build step and no external frameworks — just HTML, CSS, and vanilla JavaScript
- Respects `prefers-reduced-motion` for accessibility

## Project structure

```
.
├── index.html          # Page markup and content
├── css/
│   └── styles.css      # All styling and responsive rules
├── js/
│   └── main.js         # Nav, scroll reveals, counters, form validation
├── assets/
│   └── favicon.svg     # Site icon
└── README.md
```

## Viewing locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Customizing

- **Phone / email:** update the `tel:` and `mailto:` links in `index.html` (search for
  `(909) 555-0123` and `service@mikesmaintenance.example`).
- **Colors:** adjust the CSS custom properties in the `:root` block of `css/styles.css`.
- **Contact form:** the form currently simulates a successful submission on the client side.
  To deliver messages, point the form at a backend endpoint or a form service (e.g. Formspree)
  in `js/main.js`.

> Contact details and statistics use placeholder values — replace them with the company's real
> information before publishing.
