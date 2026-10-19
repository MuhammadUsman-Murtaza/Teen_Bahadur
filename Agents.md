# AGENTS.md

Instructions for AI coding agents (and humans who work like them) contributing to **OnRoute**, an AI-assisted commute decision tool for NED students. Read this file first, then `SPEC.md` for the full product context and `SKILLS.md` for task playbooks.

If this file and `SPEC.md` disagree, `SPEC.md` wins. If something here is unclear, ask the team instead of guessing.

---

## 1. What OnRoute is

OnRoute helps a student compare a small number of realistic ways to reach a destination by a deadline. It uses:

- the university shuttle timetable (curated from a supplied PDF),
- known route/stop connections,
- external journey estimates, **only if** a real provider is configured and tested,
- sparse, timestamped student observations,
- user-entered quotes (for example a Bykea or inDrive price).

A **deterministic engine** produces the options. An **LLM only explains** the engine's output. The LLM is never the source of truth for routes, times, fares, or service status.

**Hackathon window:** 19-22 October 2026. Scope is one trustworthy end-to-end comparison, not broad coverage.

---

## 2. Hard rules (never break these)

1. **Never fabricate transport facts.** No invented stops, routes, transfers, times, fares, bus positions, road closures, or ETAs. If a value is not in the data, it is `unknown`.
2. **Schedule is not live status.** A scheduled time never means a bus has arrived, left, or is on time.
3. **No reports means unknown, not "no disruption".** One "bus not seen" report is one student's observation, not proof of cancellation.
4. **The LLM never calculates.** Route feasibility, durations, and deadline checks happen in deterministic code. The LLM receives structured results and writes a short explanation.
5. **Always label data provenance.** Every displayed value is tagged as one of: `schedule`, `external_estimate`, `student_report`, `user_entered`, or `simulated`.
6. **Fail safe.** If the LLM, a maps API, or the route graph fails, show the structured comparison or an honest "not enough data" message. Never fill gaps with made-up output.
7. **Privacy by default.** No precise live location, no personal trip history, no names or emails sent to the LLM.
8. **Secrets stay server-side.** No API keys in browser code, commits, logs, or client bundles.
9. **Do not claim integrations that are not real.** That includes Devmarketplace components, Bykea/inDrive APIs, public-transport feeds, and traffic data. Verify first, then describe accurately.
10. **No numerical "confidence scores".** Do not present probabilities unless calibrated against real outcomes. Show the raw comparison and documented labels instead.

---

## 3. Scope guardrails

### In scope for the MVP

- Phone-first responsive web app
- Curated shuttle route dataset from the PDF, with source notes and manual verification
- Inputs: origin, destination, arrival deadline, optional budget and walking/transfer preferences
- Route/stop graph and a deterministic option comparison
- Source and confidence labels on everything shown
- Timestamped student report form
- Grounded LLM explanation (one hosted model, one server-side endpoint)
- README with setup, data provenance, assumptions, limitations, demo flow

### Out of scope (do not build, even if it looks easy)

- Live GPS or vehicle tracking, guaranteed ETAs
- Automatic Bykea/inDrive pricing or booking
- Full Karachi public-transport coverage, road-closure detection
- Native mobile apps, payments, wallets, rewards, multi-campus onboarding
- Custom ML training, RAG pipelines, agent frameworks, multi-model orchestration
- A chatbot added just to be "AI-powered"

### Fallback rule

If external APIs or extra route data are unavailable, the app must still demonstrate a smaller comparison using the verified shuttle dataset and clearly labelled assumptions.

---

## 4. Tech stack (proposed defaults)

Use these unless the team has agreed otherwise. Do not swap in new frameworks without asking.

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript, phone-first |
| Backend / DB / auth | Supabase (PostgreSQL, managed auth, row-level security) |
| Route logic | Small deterministic graph/search over the curated dataset |
| AI | One hosted LLM API, called from a server-side function |
| Optional mapping | One provider, only after access, quota, billing, and Karachi response quality are tested |
| Deployment | Vercel or Netlify (frontend), serverless function for the AI endpoint as needed |
| Tests | Route feasibility tests, report-state rule tests, permission tests |

---

## 5. Suggested repository layout

Illustrative only. Align with the real structure once implementation starts.

```
/
├── SPEC.md                 # Product spec (source of truth)
├── AGENTS.md               # This file
├── SKILLS.md               # Task playbooks for agents
├── README.md               # Setup, provenance, limitations, demo flow
├── data/
│   ├── shuttle/            # Curated route data + source notes
│   └── seed/               # Demo/simulated data (must be labelled)
├── src/
│   ├── engine/             # Deterministic route graph + comparison
│   ├── reports/            # Report states and freshness rules
│   ├── ai/                 # Explanation prompt, schema, validation, fallback
│   └── ui/                 # Components and screens
├── supabase/               # Schema, RLS policies, seed scripts
└── tests/
```

**Kickoff rule:** if the event requires a documentation-only repository before the permitted start time, do not commit any implementation code until it begins. Markdown files like this one are fine.

---

## 6. Working conventions

### General

- Make the smallest change that satisfies the task. Finish one end-to-end path before adding another.
- Keep the data model small. Add a table or column only for a feature that is actually being implemented.
- Prefer boring, readable code over clever abstractions. Another teammate must be able to explain every major result in the demo.
- Do not add dependencies casually. Check the licence, and record reused open-source or Devmarketplace components with real names and licences for the README.
- Pin down API shapes and schema with the team *before* parallel work.

### Deterministic engine

- The engine must return the same output for the same inputs.
- Return explicit `unknown` values and reasons instead of defaults or guesses.
- If no feasible option exists in the data, return an explicit "no supported option" result.
- If a ranking formula is used, document its inputs and keep the raw comparison visible.

### Reports and evidence labels

Use these labels, backed by a documented freshness window set in config:

| Label | Meaning |
|---|---|
| `unconfirmed` | One report, no independent corroboration |
| `corroborated` | At least one independent account supports it within the freshness window |
| `conflicting` | Recent reports disagree |
| `stale` | Outside the freshness window with no newer report replacing it |

Corroboration means accounts agree. It does not prove the claim. Conflicting reports are shown as conflicting, never silently resolved.

### LLM explanation

- Input: a compact structured bundle (options, known values, sources, timestamps, missing fields). Nothing else.
- Output: a short explanation validated against a strict response schema, with a short output limit and a timeout.
- It must identify the best-supported option or say evidence is insufficient, explain the main trade-off, separate facts from estimates and reports, and tell the student what to verify.
- It must not introduce any route, time, fare, closure, or position that is not in the input.
- On any failure, fall back to the structured comparison without the explanation.

### Security and permissions

- Enforce permissions in the database (row-level security), not only in the UI.
- Users cannot corroborate or flag their own reports. One response per account per report.
- Rate-limit expensive endpoints and report submission. Add duplicate-report checks.
- Validate input lengths and types. Render user text safely.
- Validate external API responses before they touch route calculations.
- Label seeded and simulated data clearly. Never use real student travel histories.

---

## 7. Testing expectations

Add focused tests rather than broad coverage. At minimum:

- **Route engine:** feasible option found, missing connection, deadline not met, no feasible route, same inputs give same output.
- **Report states:** unconfirmed, corroborated, conflicting, stale, boundary at the freshness window.
- **Permissions:** self-corroboration blocked, duplicate response blocked, anonymous report creation blocked, editing another user's report blocked.
- **AI layer:** output matches the schema, rejects content that references things not in the input, falls back cleanly on timeout/error.
- **Failure modes:** maps API down, LLM down, empty report set, missing schedule entry.

Run the demo from a clean session before submission.

---

## 8. Definition of done

A task is done when:

- [ ] It does what the task asked and nothing more.
- [ ] Missing data shows as `unknown`, not a guess.
- [ ] Provenance labels are present on every new displayed value.
- [ ] Failure paths are handled and tested.
- [ ] No secrets, personal data, or unlabelled simulated data were added.
- [ ] Relevant tests pass.
- [ ] Docs (README, data source notes) are updated if behaviour or assumptions changed.
- [ ] Any reused component is recorded with its real name and licence.

---

## 9. Roles and handoffs

Roles are assigned to real teammates based on their confirmed skills.

| Role | Owns |
|---|---|
| Frontend / product owner | Journey inputs, option cards, explanation UI, mobile usability |
| Route / data owner | PDF extraction and verification, stops and routes, route graph, comparison logic |
| AI / integration owner | LLM explanation endpoint, optional maps integration, timeouts, grounding, fallback |
| Integration / demo owner | Deployment, end-to-end tests, README, test scenarios, demo script |

For a smaller team, combine AI with backend or route/data work. One person owns the final integrated build and deployment. When an agent finishes a task that touches another owner's area, leave a short handoff note: what changed, what is unverified, what to check next.

---

## 10. Execution timeline (reference)

| Day | Focus | Exit condition |
|---|---|---|
| 19 Oct | Route data and skeleton | App loads curated route data and shows selected route/stop info |
| 20 Oct | Working decision flow | Student enters a journey and gets a transparent comparison from seeded data |
| 21 Oct | AI explanation and optional integrations | Deployed app compares at least two supported options; comparison still works if AI fails |
| 22 Oct | Freeze and submit | Clean-session demo, correct labels, docs and licences verified |

If the AI or an optional integration threatens the core flow, **cut it** and keep the deterministic comparison.

---

## 11. When in doubt

- Choose "unknown" over a guess.
- Choose the smaller scope over the clever feature.
- Choose a clear fallback over a fabricated answer.
- Ask the team before inventing a data source, an integration, or a claim.