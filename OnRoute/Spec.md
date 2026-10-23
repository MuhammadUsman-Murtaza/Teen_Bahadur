# OnRoute: MVP Specification

> **Status:** Draft for the 19-22 October 2026 hackathon
>
> **Direction:** Student-first and NED-first. It doesn't depend on the university's cooperation.
>
> **Core idea:** OnRoute shows what students have actually reported, how recent that information is, and how much confidence it supports. We're not pretending to have live GPS or guaranteed arrival times.

## Table of Contents

1. [Problem and impact](#1-problem-and-impact)
2. [Principles and boundaries](#2-principles-and-boundaries)
3. [A concrete user journey](#3-a-concrete-user-journey)
4. [MVP feature list](#4-mvp-feature-list)
5. [AI feature: evidence-grounded incident summary](#5-ai-feature-evidence-grounded-incident-summary)
6. [Confidence and freshness rules](#6-confidence-and-freshness-rules)
7. [Data model](#7-data-model)
8. [Technical approach](#8-technical-approach)
9. [Team readiness and roles](#9-team-readiness-and-roles)
10. [Three-day execution plan](#10-three-day-execution-plan-19-22-october)
11. [Acceptance criteria](#11-acceptance-criteria)
12. [Risks and validation](#12-risks-and-validation)
13. [Two code gigs / implementation tasks](#13-two-code-gigs--implementation-tasks)
14. [Repository and submission checklist](#14-repository-and-submission-checklist)
15. [Future direction](#15-future-direction-not-part-of-the-mvp)

---

## 1. Problem and impact

### The problem

For NED students who rely on the university pickup buses, a late or missing bus is a guessing game. You might not know whether to keep waiting or sort out another way home, especially if the bus has broken down. Right now, information is scattered across personal messages and word of mouth, and one unconfirmed message can easily turn into a misleading "fact."

### Who it's for

A NED student standing at a known pickup point, trying to decide whether to keep waiting or look at other options.

### Why it matters

That uncertainty costs students time and makes it harder to plan the trip home. OnRoute is meant to reduce *information* uncertainty. It doesn't claim to prevent delays or make anyone's journey faster. Before treating our assumptions as facts, we'd like to talk to a few students and confirm the route and stop details.

### Our proposed solution

OnRoute is a student-run bus reliability and incident-information service. Students post timestamped observations such as "bus seen," "not seen at expected time," or "breakdown reported." Others can corroborate a report or flag it. The interface separates recent, corroborated information from stale or unverified reports, so it's clear what's solid and what isn't.

### Impact hypotheses and how we'd test them

- Students can see relevant, recent reports for their pickup point without digging through multiple chats.
- The interface is upfront about uncertainty instead of presenting guesses as facts.
- A small pilot can tell us about report freshness, corroboration, repeat usage, and whether students feel the information helped them decide what to do.

These are hypotheses, not proven outcomes. We won't claim that OnRoute reduces waiting time or improves bus punctuality.

---

## 2. Principles and boundaries

- **Student-first.** Reporting and viewing work without NED administration being involved.
- **Evidence before confidence.** Every report carries a timestamp and a source account. Confidence comes from how recent a report is and whether independent users corroborate it.
- **No fake live tracking.** We won't claim GPS tracking, an official feed, verified bus locations, or guaranteed ETAs unless we integrate and validate a real source.
- **No made-up alternatives.** We only suggest other transport if we've verified the route or service. For the hackathon, "consider another option" stays the student's own call.
- **Privacy by default.** We don't expose anyone's precise live location, and we never sell individual travel histories.
- **The smallest useful loop.** A student picks a stop, reads current reports, submits an observation, and watches the confidence update.

---

## 3. A concrete user journey

1. A student signs in and selects NED as their campus.
2. They pick a pickup point from a small, manually verified list of stops.
3. The stop page shows the published expected time (only if it's been supplied and verified), the latest reports, how old each one is, and a confidence label.
4. The student submits one structured observation: *Bus seen*, *Not seen by expected time*, or *Breakdown/route disruption reported*, with an optional short note.
5. The system stores the observation with a server timestamp and the author.
6. A second student can corroborate or flag the report. Nobody can corroborate their own report.
7. A deterministic rule works out the visible evidence state from freshness, corroboration, and whether reports conflict. The labels are *Unconfirmed*, *Corroborated*, *Conflicting reports*, and *Stale*.
8. The student makes their own decision. OnRoute never invents an ETA.
9. If time allows, a minimal moderator view lets us hide abusive reports and manage the seeded stops.

---

## 4. MVP feature list

### Must have

- A responsive web app that works well on a phone
- Sign-in and sign-out through a managed authentication service
- NED campus and seeded pickup-point selection
- A stop detail page with the latest timestamped reports
- A structured report form
- Corroborate or flag a report, one action per account per report
- Rule-based confidence and freshness labels
- A persistent relational database
- Basic abuse controls: authentication, duplicate and rate limits, input validation, and report flagging
- A public README covering setup, architecture, limitations, and the demo flow
- A deployed app with a small seeded demo dataset

### If time allows

- A minimal moderator screen
- Admin-editable stop and schedule seed data
- An LLM-generated plain-language summary of existing reports, grounded strictly in retrieved records and clearly labelled as an AI summary
- A simple aggregate view of incidents by stop

### Out of scope for now

- Live GPS, automatic vehicle tracking, or hardware integration
- Guaranteed arrival-time prediction
- Official NED integration or endorsement
- Automated route alternatives or maps-based routing
- Native Android/iOS apps
- Rewards, redeemable credits, wallets, payments, or a sponsor marketplace
- Multi-university onboarding and tenant administration (we'll just keep the schema from blocking this later)
- Training a custom ML model, or claiming predictive accuracy from sparse data

---

## 5. AI feature: evidence-grounded incident summary

The AI's job is to explain the evidence we already have, not to fill in facts we don't.

**Input:** A backend-generated bundle of recent reports for one stop, including event type, timestamp, corroboration count, and any schedule data explicitly marked as verified.

**Output:** A short summary, for example:

> One bus-sighting report was submitted 4 minutes ago and has not been corroborated. There isn't enough information to estimate arrival.

### Guardrails

- The model only sees records the backend fetched for the selected stop.
- It shouldn't create times, sightings, causes, routes, or ETAs that aren't in the supplied evidence.
- The underlying report timestamps are shown right next to the summary.
- If the model call fails, the reports and deterministic labels show up as normal.
- Generated text is there to explain, not to act as a source of truth.
- Names, emails, and other unnecessary personal data never go to the model.
- The summary is optional. Reporting and confidence labels work fine without it.

### Implementation

One hosted LLM API called from the backend, with a compact prompt, a strict response schema, a short output limit, and proper timeout and error handling. Given that we only have three days, we're deliberately skipping RAG, agents, fine-tuning, and any complex ML pipeline.

---

## 6. Confidence and freshness rules

For the MVP we'll use simple, transparent rules instead of machine learning.

| Label | Meaning |
|---|---|
| **Unconfirmed** | One recent report with no independent corroboration. |
| **Corroborated** | At least one independent account backs up a report within the freshness window. |
| **Conflicting reports** | Recent reports disagree, e.g. a bus-sighting and a disruption report for the same stop and time window. |
| **Stale** | The report is older than the freshness window and nothing newer confirms it. |

We'll pick an initial freshness window based on the seeded schedule and our demo scenarios, and write it down. We also won't show a numerical probability unless it's been calibrated against real outcomes. Worth remembering that corroboration means independent accounts *agree*, which isn't the same as proving the report is true.

---

## 7. Data model

A small relational schema is enough. Every user-generated record is scoped to a campus, even though the first deployment only has NED.

### `campuses`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | |
| `slug` | text | |
| `created_at` | timestamp | |

### `stops`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `campus_id` | UUID | FK to `campuses` |
| `name` | text | |
| `route_label` | text, nullable | Display label only |
| `scheduled_time` | time, nullable | Only if verified |
| `schedule_source` | text, nullable | |
| `is_active` | boolean | |

### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, matches the auth user ID |
| `campus_id` | UUID | FK to `campuses` |
| `display_name` | text, optional | Avoids exposing emails publicly |
| `created_at` | timestamp | |

### `reports`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `campus_id` | UUID | FK to `campuses` |
| `stop_id` | UUID | FK to `stops` |
| `author_id` | UUID | FK to `profiles` |
| `event_type` | enum | `bus_seen`, `not_seen`, `disruption` |
| `note` | text, nullable | Length-limited |
| `created_at` | timestamp | Server timestamp |
| `status` | enum | `active`, `flagged`, `hidden` |

### `report_responses`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `report_id` | UUID | FK to `reports` |
| `user_id` | UUID | FK to `profiles` |
| `response_type` | enum | `corroborate`, `flag` |
| `created_at` | timestamp | Server timestamp |

Unique constraint on `(report_id, user_id, response_type)`.

### Important constraints

- Permissions are enforced in the database itself, not just in the UI.
- Users can't respond to their own reports.
- Basic rate limits and duplicate-report checks are in place.
- We don't store precise user location.
- Audit and moderation actions stay minimal and access-controlled.

---

## 8. Technical approach

We'll go with whatever stack the team knows best. A low-risk default would be:

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript, responsive and phone-first |
| Backend, database, auth | Supabase (PostgreSQL, managed authentication, row-level security) |
| AI | One hosted LLM API called from a server-side function; the API key is never exposed in browser code |
| Deployment | Vercel or Netlify for the frontend, Supabase for the backend; a server-side deployment only if the AI endpoint needs it |
| Validation | Server-side input checks, database constraints, and a few focused tests for report permissions and confidence rules |

If Devmarketplace offers a suitable starter, auth component, database template, or deployable integration, we'll look at what it actually does and use it only if it saves time. We don't want to assume a component exists, or burn the hackathon on an unfamiliar tool without a fallback.

### Security basics

- Secrets live in environment variables.
- Row-level security covers campus, report, and response data.
- Anonymous report creation isn't allowed.
- Users can't edit someone else's report.
- Notes have a length limit and user text is rendered safely.
- The demo dataset contains no real student travel histories.

---

## 9. Team readiness and roles

Roles will be matched to what each teammate is actually good at, and we won't claim skills we don't have.

| Role | Focus |
|---|---|
| **Frontend / product owner** | Stop selection, report feed, report form, confidence labels, mobile usability |
| **Backend / data owner** | Schema, authentication, permissions, report APIs and queries, seed data |
| **AI / integration owner** | Evidence-bundle generation, the hosted model call, fallback behaviour, test cases |
| **Integration / demo owner** (can be combined with another role) | Deployment, README, end-to-end tests, demo script, checking the full user journey |

With a smaller team, AI can merge with backend and deployment/docs can merge with frontend. We'll agree on API shapes and the schema before splitting up to build in parallel, and one person will own the final integration and deployment.

### Reuse strategy

- We'd rather use managed authentication and PostgreSQL than build our own.
- Established UI components and official SDKs are fine where we already understand them.
- We'll check Devmarketplace for relevant, working components and record exactly what we reuse.
- Open-source libraries are welcome as long as the licences are compatible, and we'll keep any required notices.
- We're steering clear of multiple AI services, elaborate agent frameworks, and unnecessary mapping libraries.

---

## 10. Three-day execution plan (19-22 October)

### Day 1, 19 October: foundations

- [ ] Confirm the exact stop and report workflow, and check the seed list with a few students
- [ ] Create the repository, deploy a skeleton, and set up environment variables
- [ ] Set up the schema, auth, row-level security, and seed data
- [ ] Agree on request/response shapes and assign owners

**Exit condition:** a student can sign in and view seeded stops.

### Day 2, 20 October: the core reporting loop

- [ ] Build the stop feed and the structured report form
- [ ] Persist reports and corroborate/flag actions
- [ ] Implement the freshness and conflict labels plus abuse checks
- [ ] Test the full flow with two separate accounts

**Exit condition:** two users can submit and corroborate reports, and labels update from database state.

### Day 3, 21 October: AI, polish, deployment

- [ ] Add the AI summary, but only once the core flow works
- [ ] Add fallback behaviour, empty states, and error handling
- [ ] Test mobile layout, permissions, stale and conflicting reports, and API failures
- [ ] Deploy, then write the README and demo steps

**Exit condition:** the deployed end-to-end journey works reliably. If the AI threatens that, we'll cut AI summarization before we touch the core reporting loop.

### 22 October: submission and contingency

- [ ] Freeze features
- [ ] Run the demo from a clean session
- [ ] Check the public repository and docs, the deployment link, environment configuration, and licence notices
- [ ] Prepare a short demo showing one unconfirmed report becoming corroborated, plus a separate conflicting or stale case

---

## 11. Acceptance criteria

We'll consider the MVP ready to demo when:

- [ ] A new student can sign in and select a seeded pickup point.
- [ ] They can read reports with timestamps and evidence labels.
- [ ] A signed-in student can submit a report and still see it after a refresh.
- [ ] A second account can corroborate it, and self-corroboration is blocked.
- [ ] Old reports become stale according to the documented rule.
- [ ] Conflicting reports show up as conflicting, not silently resolved.
- [ ] AI summaries, if included, are based on retrieved records and fail safely.
- [ ] A deployed demo and setup documentation are available.

---

## 12. Risks and validation

| Risk | How we plan to handle it |
|---|---|
| Too few students report | Test with a small student group and keep reporting quick. We won't claim network effects until we've actually seen them. |
| False or malicious reports | Corroboration, rate limits, flagging, freshness labels, and moderation. These reduce the risk but don't eliminate it. |
| No reliable schedule source | Mark the schedule as unavailable instead of inventing times. |
| Sparse history | Avoid ETA predictions and ML claims. |
| No university cooperation | Use student-verified seed data, label its source clearly, and avoid implying official status. |
| AI hallucination or outage | Ground it in retrieved records and keep the core interface working without AI. |
| Rewards distract from the MVP | Leave credits, sponsors, and payments out of the three-day build. |

Before submission, we'll run a few short student interviews and verify the initial stop list. We'll record what we actually checked and won't present informal feedback as a representative study.

---

## 13. Two code gigs / implementation tasks

We'd like to pick two small, clearly scoped code gigs that directly support the MVP and meet the event's submission requirements. Our suggestions, depending on what the Devmarketplace catalogue actually has:

1. **Report confidence utility:** implement and test the deterministic freshness, corroboration, conflict, and stale-state rules.
2. **Evidence-grounded AI summary endpoint:** a server-side LLM call that summarizes only the supplied report records, validates the output, and returns a safe fallback on failure.

If the event requires using already-published gigs rather than creating our own, we'll choose the closest real, available ones after checking the catalogue, without making up gig names, availability, or integration claims.

---

## 14. Repository and submission checklist

Until kickoff, we'll keep the repository documentation-only if the event rules require it. It will hold this spec and any required pitch or README material, with no implementation code committed before the permitted start time.

The final submission will include:

- [ ] Problem, primary user, impact hypothesis, and limitations
- [ ] The concrete end-to-end user journey
- [ ] The AI feature and its guardrails
- [ ] Data model and architecture
- [ ] The three-day plan, team roles, and acceptance criteria
- [ ] Open-source and Devmarketplace reuse notes, with actual component names and licences
- [ ] Deployment and demo instructions, plus known limitations

---

## 15. Future direction (not part of the MVP)

If the NED pilot shows repeat use and genuinely useful reports, OnRoute could grow to other campuses through configurable campus and stop data, with strict tenant isolation. We could also explore sponsor-funded rewards for useful reports and reliability analytics for institutions. Neither demand nor revenue is validated yet.

Whatever happens, we won't sell individual students' travel histories, and urgent transport information should never be locked behind rewards.
