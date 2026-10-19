# ResumeCraft AI

A frontend-only public website for a resume-builder product concept, built with Next.js App Router, TypeScript, Tailwind CSS, and Lucide React.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available routes

- `/` — landing page, benefits, workflow, sample templates, proposed plans, sample testimonials, and FAQ
- `/templates` — searchable/filterable template gallery with preview dialogs
- `/pricing` — proposed plan overview with non-functional enrollment notices
- `/about` — product mission
- `/contact` — client-validated form demo; messages are not sent or stored
- `/privacy` and `/terms` — draft legal placeholders that require review before production

Template resume creation, AI assistance, PDF export, accounts, backend services, and payment are not implemented. Pricing tiers and features are proposals, not active offers.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
