# Merchant order workbench override

## Context

- Surface: restaurant tablet, optimized for 1024×768 landscape and usable in portrait.
- Reference patterns: Square KDS, Toast KDS, and iCHEF tablet operations.
- Goal: recognize urgency, read modifiers, and move a ticket to the next state with one deliberate tap.

## Overrides

- Treat 1024×768 landscape as the primary merchant workstation, not as a shrunken desktop. Use a 104px compact rail, four readable metrics, a two-column operations overview, and three ticket columns.
- At 768px portrait, retain labeled navigation and switch the ticket board to one full-width column so item names and modifiers never become miniature text.
- Table-state buttons use a 4×2 grid on tablets. Empty tables must open the POS with that exact table already selected.
- Operational body text stays at 11px or larger and primary ticket content at 14–16px; 8–10px text is reserved for tertiary metadata only.

- Add a dedicated manual POS view beside the live-order board. Follow the iCHEF pattern of order context, menu, and current bill as three persistent zones; follow dudoo's clear dine-in/takeout and table-state controls.
- Manual POS orders support table or takeout identity, party size, menu search, category filters, product modifiers, quantity changes, notes, and cash or simulated Rootable Pay checkout without sending staff into the customer-facing site.
- Cash POS checkout means the staff member has already received cash, so the demo creates the order and immediately confirms payment before it enters the kitchen queue. Label this action explicitly as `收現並送單`.
- Persist manual orders as the `merchant_pos` source and show that source on kitchen tickets; it remains a merchant-direct order with 0% cash or 3.9% Rootable Pay treatment.
- Use three workflow columns: paid/pending, preparing/serving, and fully served. Keep oldest work visually prominent through elapsed time and urgency treatment.
- Cash orders wait in a full-width counter approval gate above the kitchen board. They do not enter production counts or the pending kitchen column until staff confirms payment.
- Every order item shows `served / ordered` quantity with 48px controls for serving one portion and undoing one portion. Serving the final portion moves the ticket to fully served automatically.
- Production totals show remaining portions, affected table count, and the next table. One-tap serving always applies to the oldest matching paid order.
- Every ticket shows table, order number, elapsed minutes, payment state, items, notes, total, and one primary next action.
- Top metrics and production counts support a quick rush-hour scan; settlement details live in a separate functional view.
- Navigation contains only working views: live orders, completed orders, and settlement.
- Primary ticket actions are at least 48px high; status uses both text and color.
- Dense layout uses subtle borders and flat surfaces. Avoid decorative motion, floating cards, and hover-only affordances.

## Acceptance

- Staff can create an inner-dining or takeout order from a phone or tablet, including required modifiers, and see it appear in the existing live-order queue.
- The POS layout is three-zone on large tablets, two-stage on portrait tablets, and single-column with a fixed checkout action on phones.
- Three columns are visible or horizontally reachable at tablet widths.
- A ticket can advance through every state without opening a detail modal.
- An unpaid cash order cannot be accepted or served, and confirming cash atomically moves it into the paid pending column.
- Split serving updates both the original ticket and the aggregated production total.
- Completed tickets can be reopened after an accidental completion.
- Loading, sync, empty, error, and disabled states are visible and accessible.
