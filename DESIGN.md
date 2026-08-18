# Rootable Design System

## Design direction

Rootable is a premium, welcoming restaurant operating system. It combines a warm, food-forward customer experience with calm, legible merchant tools.

- **Visual foundation:** warm cream canvas, four-tone forest green, restrained roasted-terracotta highlights.
- **Customer ordering:** photo-led, compact and decisive; keep the next action visible without making the screen feel busy.
- **Merchant workspace:** denser and more operational, but never cold; status and priority are readable at a glance.
- **Brand personality:** rooted, appetising, quietly premium, trustworthy.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| `forest-950` | `#163C30` | Main CTA, navigation, checkout dock |
| `forest-800` | `#286047` | Active states, secondary emphasis |
| `forest-100` | `#E2EEE3` | Success and soft green surfaces |
| `cream` | `#F7F0E5` | Main page canvas |
| `paper` | `#FFFDF9` | Cards and reading surfaces |
| `roast` | `#A94F20` | Prices and food-forward emphasis |
| `apricot` | `#D78348` | Focus rings and restrained highlights |
| `ink` | `#18342A` | Primary text |
| `muted` | `#637269` | Supporting text |

## Typography and spacing

- Use `Noto Sans TC` / system sans for controls and dense operational data.
- Use a restrained serif display face only for store names and marketing headlines.
- Use an 8px spacing scale. Default control height is 44px; primary mobile actions are 52–56px.
- Keep food imagery edge-to-edge within cards, with no decorative overlays that obscure the dish.

## Components

- **Primary CTA:** dark forest surface, white text, 12–14px radius, subtle shadow. Reserve it for one action per view.
- **Food card:** warm white card, thin oat border, gentle lift; image first, title, price in roast, concise description.
- **Status:** always pair colour with a textual label and icon/dot.
- **Group ordering:** names are more prominent than notes; each dish must retain the ordering member in customer checkout and merchant output.
- **Bottom sheets:** rounded top corners, clear close control, sticky final action, safe-area padding.

## Responsive and motion

- Customer ordering is phone-first from 360px wide. No horizontal scroll.
- Merchant operations optimise for 768–1024px tablets with stable controls and readable order states.
- Motion is short (150–220ms), communicates feedback only, and is disabled for reduced-motion preferences.

## Guardrails

- Do not copy external logos, names, illustrations, or proprietary typefaces.
- Do not use bright red for ordinary prices or primary actions.
- Do not use more than one visually dominant CTA within the same panel.
- Keep direct scan-to-order fast: no pre-menu login gate.
