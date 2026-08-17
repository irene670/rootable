# Customer ordering override

## Context

- Surface: phone-only QR ordering, 360–480px.
- Reference patterns: McDonald's mobile ordering, Wangpin mobile dining, iCHEF online ordering, and Olo Serve.
- Goal: finish an order one-handed with the fewest possible decisions per screen.

## Overrides

- Keep the Rootable forest palette from `MASTER.md`; do not adopt generic restaurant red.
- Start with a scanned-table confirmation screen before revealing the menu. Make the dining mode and table number explicit and editable.
- Open products in a bottom sheet with required customization groups, quantity, price, and one clear add-to-cart action.
- Use a compact store header with table number, a sticky horizontal category rail, dense image-led menu rows, and a fixed cart CTA.
- Keep every touch target at least 44px. Quantity controls must remain visible after an item is added.
- Checkout is a separate full-screen step with editable quantities, dining details, payment choices, and one fixed final action.
- Never expose merchant administration links in the guest flow.
- Motion is limited to 150–200ms state feedback and must respect reduced-motion preferences.

## Acceptance

- No horizontal page scroll at 360px and 390px.
- Fixed cart and checkout bars respect bottom safe areas and never cover the last content row.
- Cash, LINE Pay simulation, and Apple Pay simulation are distinguishable without relying on color alone.
- Query strings such as `?table=B12` hydrate without console errors and prefill the scanned table number.
