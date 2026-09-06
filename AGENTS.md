# AGENTS.md

Conventions for the PASSCO education platform (client = Vite + React + TS + Tailwind v4, server = Express).

## Build / verify commands
- Client build: `cd client && npm run build` (runs `tsc -b && vite build`). Run after every change.
- Server typecheck: `cd server && npx tsc --noEmit`. Run after every server change.
- `rg` is NOT on this machine's PATH — use the Grep/Glob tools instead.

## UI conventions
- **Brand color: indigo** `#4f46e5`. Use `bg-indigo-600`, `text-indigo-500`, `from-indigo-500 to-indigo-600` etc. Never introduce a competing brand hue (blue/navy). PWA `theme_color` and `--color-primary` must stay indigo (`#4f46e5`).
- **Font stack**: system-ui only (`ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, ...`). Do not declare webfonts that are not loaded (no `Inter`).
- **Icons**: lucide-react everywhere. Decorative icons get `aria-hidden="true"`. Icon-only buttons MUST have an `aria-label`. Keep hit areas ≥ 40px (`h-10 w-10` or `min-w-10 py-2`).
- **Spacing**: standard card padding `p-5`, compact cards `p-4`; section gaps `space-y-5`/`space-y-8`; CTAs `min-h-11`; touch targets ≥ 40px high on mobile.
- **Color language**: slate for neutrals with `dark:` variants on every component that needs it. Body text `text-slate-500 dark:text-slate-400`, headings `text-slate-900 dark:text-white`, secondary `text-slate-600 dark:text-slate-300`.
- **Cards/tables**: use `rounded-xl`/`rounded-2xl`, `border border-slate-200`, `bg-white`, `shadow-sm`, `dark:border-slate-800 dark:bg-slate-900`. Long lists are paginated client-side with `components/Pagination.tsx` + `hooks/usePagination.ts`. Wide tables get a mobile card list: `hidden md:block` table + `md:hidden` stacked cards.

## Interactions / accessibility
- Feedback goes through the toast system (`useToast()` → `success`/`error`/`info`). Do NOT use `window.alert`. Destructive deletes use `components/admin/ConfirmDialog.tsx`.
- Modals must use `hooks/useModalA11y(open, { onClose })` (focus trap + Escape + focus restore + body scroll lock) and expose `role="dialog" aria-modal="true"`.
- Motion: wrap apps/screens in `<MotionConfig reducedMotion="user">`; honor the global reduced-motion CSS in `globals.css`. Do not add infinite animations on critical content.
- Forms: associate labels via `htmlFor`/`id`; show inline `aria-describedby` error text; prefer a page-level `role="alert"` summary for submit errors.
- Pages render empty states with an icon + guidance + primary call to action rather than bare "no data" text.

## Data-layer conventions
- Report cards: student-facing generation uses `createReportCard`; admin uses `createAdminReportCard`/`adminRegenerateReportCard`/`deleteAdminReportCard`. Report UI lives on `/reports` (student) and `/admin/reports`. Server verification is `/verify/report/:code`, QR via `qrcode.react`.
- All mutating server endpoints: validation rules in `server/routes/*.ts`, audit log entries for admin actions.
- Subject/class/assessment metadata icons live in `client/src/data/questionBank.ts` as lucide component references — read `SUBJECT_META[subjectId].icon` as a component, never as text.