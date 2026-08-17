# Merchant order workbench override

## Context

- Surface: restaurant tablet, optimized for 1024×768 landscape and usable in portrait.
- Reference patterns: Square KDS, Toast KDS, and iCHEF tablet operations.
- Goal: recognize urgency, read modifiers, and move a ticket to the next state with one deliberate tap.

## Overrides

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

- Three columns are visible or horizontally reachable at tablet widths.
- A ticket can advance through every state without opening a detail modal.
- An unpaid cash order cannot be accepted or served, and confirming cash atomically moves it into the paid pending column.
- Split serving updates both the original ticket and the aggregated production total.
- Completed tickets can be reopened after an accidental completion.
- Loading, sync, empty, error, and disabled states are visible and accessible.
