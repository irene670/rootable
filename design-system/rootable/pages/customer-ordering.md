# Customer ordering override

## Context

- Surface: phone-only QR ordering, 360–480px.
- Reference patterns: McDonald's mobile ordering, Wangpin mobile dining, iCHEF online ordering, and Olo Serve.
- Goal: finish an order one-handed with the fewest possible decisions per screen.

## Overrides

- Keep the Rootable forest palette from `MASTER.md`; do not adopt generic restaurant red.
- Start with a focused scanned-table confirmation screen before revealing the menu. The first screen shows the store, confirmed table number, language selector, and exactly two ordering choices: regular ordering or group ordering.
- Regular ordering uses progressive identity: LINE login is the recommended member-benefit path, while guest ordering remains a complete non-blocking path without phone-number collection.
- Group ordering means separate-phone selection with one host-controlled checkout. Joining or starting a group must not force LINE login.
- Open products in a bottom sheet with required customization groups, quantity, price, and one clear add-to-cart action.
- Use a compact store header with table number, a sticky horizontal category rail, dense image-led menu rows, and a fixed cart CTA.
- Keep every touch target at least 44px. Quantity controls must remain visible after an item is added.
- Checkout is a separate full-screen step with editable quantities, dining details, payment choices, and one fixed final action.
- Never expose merchant administration links in the guest flow.
- Motion is limited to 150–200ms state feedback and must respect reduced-motion preferences.
- If a guest completes checkout, show the successful order first and only then offer optional LINE login for order lookup, notifications, and a clearly labeled familiar-customer reward. Declining must never change the submitted order.

## Acceptance

- No horizontal page scroll at 360px and 390px.
- Fixed cart and checkout bars respect bottom safe areas and never cover the last content row.
- Cash, LINE Pay simulation, and Apple Pay simulation are distinguishable without relying on color alone.
- Query strings such as `?table=B12` hydrate without console errors and prefill the scanned table number.
- Switching between Traditional Chinese and English changes the QR entry and identity-choice labels without reloading the page.
- A guest can complete: QR entry → regular ordering → guest → menu → checkout → success → optional LINE conversion.
