# Customer ordering override

## Context

- Surface: phone-only QR ordering, 360–480px.
- Reference patterns: McDonald's mobile ordering, Wangpin mobile dining, iCHEF online ordering, and Olo Serve.
- Goal: finish an order one-handed with the fewest possible decisions per screen.

## Overrides

- Keep the Rootable forest palette from `MASTER.md`; do not adopt generic restaurant red.
- A scanned table QR Code opens the menu immediately. Show the store and table number in the compact menu header; do not introduce a second general-versus-group decision screen.
- Keep a single, prominent `團體點餐` action at the top of the menu. The first guest creates the shared order, then sees a QR Code that encodes the same table and group-order URL.
- Group ordering means separate-phone selection with one host-controlled checkout. Other guests join by scanning the host's QR Code, enter only a display name, and never need LINE login or a manually entered code. A shareable link and six-character code remain fallback paths.
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
- Query strings such as `?table=B12` open the menu directly without a login gate.
- A host can create a group from the menu, display a readable QR Code, and a second phone opened with its QR URL joins the same table/order session.
- A guest can complete: QR scan → menu → checkout → success → optional LINE conversion.
