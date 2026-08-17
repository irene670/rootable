# Merchant order workbench override

## Context

- Surface: restaurant tablet, optimized for 1024×768 landscape and usable in portrait.
- Reference patterns: Square KDS, Toast KDS, and iCHEF tablet operations.
- Goal: recognize urgency, read modifiers, and move a ticket to the next state with one deliberate tap.

## Overrides

- Use three workflow columns: pending, preparing, and ready. Keep oldest work visually prominent through elapsed time and urgency treatment.
- Every ticket shows table, order number, elapsed minutes, payment state, items, notes, total, and one primary next action.
- Top metrics and production counts support a quick rush-hour scan; settlement details live in a separate functional view.
- Navigation contains only working views: live orders, completed orders, and settlement.
- Primary ticket actions are at least 48px high; status uses both text and color.
- Dense layout uses subtle borders and flat surfaces. Avoid decorative motion, floating cards, and hover-only affordances.

## Acceptance

- Three columns are visible or horizontally reachable at tablet widths.
- A ticket can advance through every state without opening a detail modal.
- Completed tickets can be reopened after an accidental completion.
- Loading, sync, empty, error, and disabled states are visible and accessible.
