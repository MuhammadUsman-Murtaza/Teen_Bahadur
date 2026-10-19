# SKILLS.md

Reusable playbooks for the recurring tasks in **OnRoute**. Each skill says when to use it, what goes in, the steps to follow, what comes out, and the guardrails that apply.

Read `AGENTS.md` for the hard rules and `SPEC.md` for product context. These skills assume both.

## Skill index

| # | Skill | Owner (typical) | Day |
|---|---|---|---|
| 1 | [Shuttle PDF extraction and verification](#1-shuttle-pdf-extraction-and-verification) | Route / data | 1 |
| 2 | [Route graph modelling](#2-route-graph-modelling) | Route / data | 1 |
| 3 | [Deterministic route comparison](#3-deterministic-route-comparison) | Route / data | 2 |
| 4 | [Report evidence labelling](#4-report-evidence-labelling) | Route / data or backend | 2 |
| 5 | [Report permissions and abuse controls](#5-report-permissions-and-abuse-controls) | Backend | 1-2 |
| 6 | [Grounded AI explanation](#6-grounded-ai-explanation) | AI / integration | 3 |
| 7 | [External provider check](#7-external-provider-check) | AI / integration | 3 |
| 8 | [Provenance labelling](#8-provenance-labelling) | Frontend | 2-3 |
| 9 | [Demo, README, and submission check](#9-demo-readme-and-submission-check) | Integration / demo | 3-4 |

---

## 1. Shuttle PDF extraction and verification

**Purpose:** Turn the supplied shuttle PDF into a small, trustworthy structured dataset.

**Use when:** Starting the project, or adding a route to the dataset.

**Inputs**
- The shuttle route/timetable PDF
- The chosen route subset (keep it manageable)

**Steps**
1. Inspect the PDF first. Is the text selectable, scanned, tabular, or image-based?
2. Pick a limited subset of routes and stops for the MVP.
3. Extract route names, stop names, stop order, and scheduled times.
4. Manually check every route order and time against the source pages.
5. Attach a `source_note` to each route and stop: PDF name, page, and verification status (`unverified`, `verified by <name>`).
6. If OCR or parsing is unreliable, enter the small dataset by hand instead of trusting malformed extraction.
7. Write down anything ambiguous (service days, missing times, unclear stop names) rather than resolving it silently.

**Outputs**
- Curated data files in `data/shuttle/` matching the `routes`, `stops`, and `route_stops` schema
- A short provenance note listing what was checked and by whom

**Guardrails**
- Never guess a missing time. Leave `scheduled_time` null.
- Never merge stops that might be different places.
- Do not add coordinates unless verified and actually needed.
- Record what was checked; do not present unchecked data as verified.

---

## 2. Route graph modelling

**Purpose:** Represent the verified data as a graph the engine can search.

**Use when:** After the dataset exists, and whenever a route or walking link is added.

**Inputs**
- Verified `routes`, `stops`, `route_stops`
- Any explicitly validated walking/transfer links

**Steps**
1. Create nodes for stops and edges for consecutive `route_stops` on each route.
2. Add walking or transfer edges **only** when the link is explicitly modelled and verified, with its source noted.
3. Store known durations on edges only where supported by the data. Otherwise leave them unknown.
4. Keep the graph small and inspectable. Be able to print or visualise it for the demo.

**Outputs**
- A deterministic graph structure with unit tests for basic traversal

**Guardrails**
- No implied connections. If two stops are near each other but no link is modelled, they are not connected.
- Do not auto-recommend a nearby stop unless the route connection and walking link exist in the data.

---

## 3. Deterministic route comparison

**Purpose:** Produce a small set of supported options and compare them honestly.

**Use when:** Building or changing the decision engine.

**Inputs**
- Origin, destination, arrival deadline
- Optional budget and walking/transfer preferences
- Route graph and schedule data
- Optional: external estimates, student reports, user-entered quotes (each with provenance)

**Steps**
1. Find all feasible options supported by the graph and inputs. Cap the result to a small number.
2. For each option, compute only what the data supports: arrival time, whether it meets the deadline, transfers, walking time/distance, known cost.
3. Mark every missing value `unknown` and attach the reason.
4. Attach provenance and any relevant report label to each option.
5. If no feasible option exists, return an explicit "not supported by current data" result.
6. If a ranking is used, keep the formula simple, documented, and never hide the raw values.

**Output shape (illustrative, not a final schema)**

```json
{
  "options": [
    {
      "id": "opt-1",
      "type": "shuttle",
      "meets_deadline": true,
      "estimated_arrival": { "value": "17:40", "source": "schedule" },
      "transfers": 0,
      "walking_minutes": { "value": null, "reason": "no walking link modelled" },
      "cost": { "value": null, "reason": "not provided" },
      "reports": [{ "label": "unconfirmed", "age_minutes": 6 }],
      "unknowns": ["live shuttle status", "cost"]
    }
  ],
  "notes": ["Schedule is not live status."]
}
```

**Guardrails**
- Same inputs must always give the same output.
- Never use the LLM here.
- Do not invent a numerical score that looks calibrated.

**Tests to write:** feasible option, deadline missed, missing connection, no feasible route, determinism, unknowns propagated.

---

## 4. Report evidence labelling

**Purpose:** Turn raw student reports into the four documented evidence states.

**Use when:** Building the report feed, the engine's use of reports, or the explanation bundle.

**Inputs**
- Reports for a stop (event type, timestamp, status, responses)
- The configured freshness window

**Rules**

| Label | Condition |
|---|---|
| `unconfirmed` | One report, no independent corroboration |
| `corroborated` | At least one independent account corroborates within the freshness window |
| `conflicting` | Recent reports disagree (for example `bus_seen` and `possible_disruption` in the same window) |
| `stale` | Older than the window with no newer report replacing it |

**Steps**
1. Ignore `hidden` reports. Treat `flagged` reports carefully and visibly.
2. Check freshness against the configured window using server timestamps.
3. Count only independent accounts for corroboration. The author never counts.
4. Detect conflicts before assigning `corroborated`.
5. Return the label plus the underlying timestamps.

**Guardrails**
- No reports means `unknown`, not "no disruption".
- Corroboration is agreement, not proof.
- Conflicts are surfaced, never silently resolved.
- No numerical probabilities.

**Tests to write:** each label, boundary exactly at the window edge, conflict beats corroboration, self-corroboration not counted.

---

## 5. Report permissions and abuse controls

**Purpose:** Keep the report system safe with minimal machinery.

**Use when:** Setting up the schema, RLS policies, and report endpoints.

**Steps**
1. Require authentication for all report creation. No anonymous reports.
2. Enforce in the database (row-level security):
   - users can only edit or delete their own content where allowed,
   - users cannot respond to their own reports,
   - unique `(report_id, user_id, response_type)`.
3. Add rate limits and a duplicate-report check (same user, stop, and event type in a short window).
4. Limit note length. Validate all input server-side. Render user text safely.
5. Provide a flag action. If time allows, add a restricted moderator action to hide reports.
6. Keep audit and moderation access restricted.

**Guardrails**
- UI checks are not security. Test permissions directly against the database.
- Do not store precise location or default trip history.

**Tests to write:** self-corroboration blocked, duplicate response blocked, anonymous create blocked, editing another user's report blocked, rate limit triggers.

---

## 6. Grounded AI explanation

**Purpose:** Explain the engine's comparison in plain language without inventing anything.

**Use when:** Day 3, after the deterministic comparison works.

**Inputs**
- The structured comparison from skill 3 (options, known values, sources, timestamps, missing fields)

**Steps**
1. Build a compact bundle server-side. Strip names, emails, and any unnecessary personal data.
2. Write a strict, short system prompt: only use supplied data; never create routes, times, fares, closures, positions, or ETAs; say when evidence is insufficient.
3. Require a response schema, for example:
   - `best_supported_option` (id or null),
   - `summary` (short text),
   - `main_tradeoff`,
   - `verify_before_acting` (list).
4. Set a short output limit and a timeout.
5. Validate the response: it parses, matches the schema, and references only option IDs and values present in the input.
6. On failure (timeout, bad schema, unsupported claims), return no explanation and let the UI show the structured comparison normally.
7. Show the underlying timestamps and sources next to the explanation, and label it as an AI explanation.

**Example of acceptable output**

> The shuttle is the lower-cost option, but its actual arrival is unverified. The mapped road journey appears to fit your deadline based on the current estimate, though its fare and pickup availability are not verified in OnRoute. Check the live quote before deciding.

(Only valid when those data sources are actually connected. Never use this as a claim that they are.)

**Guardrails**
- One hosted model, one endpoint. No agents, RAG, or multi-model orchestration.
- API key stays server-side.
- Generated text explains. It is never a source of truth.

**Tests to write:** schema validation, rejects references to unknown options, timeout fallback, empty or insufficient evidence case.

---

## 7. External provider check

**Purpose:** Decide honestly whether a maps, traffic, or other provider is usable before depending on it.

**Use when:** Considering any external data source (maps, public transport, ride-hailing).

**Steps**
1. Test one representative Karachi origin/destination and confirm the response contains the fields the app needs.
2. Check access, billing, quota and rate limits, attribution requirements, and terms of use.
3. Do not assume a publicly visible website means an API exists.
4. If it works, wrap it server-side with timeouts, response validation, and a clear "unavailable" fallback.
5. If it does not work, record the result and drop it from the MVP.

**Provider-specific notes**
- **Maps/traffic:** optional; usable only after the test above passes.
- **Public transport:** use only verified route information. Do not assume a live Karachi feed.
- **Bykea / inDrive:** treat as user-checked options or manually entered quotes unless an authorized integration is confirmed.
- **Road blockages:** do not claim detection without a source that actually provides it.

**Guardrails**
- Validate external responses before they touch route calculations.
- Label estimates with provider name and retrieval time.
- Failure must degrade to "estimate unavailable", never a fabricated value.

---

## 8. Provenance labelling

**Purpose:** Make it obvious where every number on screen came from.

**Use when:** Building option cards, report feeds, and the explanation view.

**Labels**

| Source | Treatment |
|---|---|
| Schedule from the PDF | "Scheduled" plus verification status |
| External travel estimate | Provider name and time retrieved; "estimate, not a guarantee" |
| Student observation | Timestamp, age, and evidence label |
| User-entered fare or pickup estimate | "Entered by you" plus when |
| Demo-only scenario | Clearly marked "simulated" |

**Steps**
1. Attach a `source` field to every value in the data layer.
2. Render the label next to the value, not hidden in a tooltip.
3. Show `unknown` states explicitly, with a short reason or a "check the service" hint.

**Guardrails**
- Simulated data must never look real.
- Missing data is shown, not hidden.

---

## 9. Demo, README, and submission check

**Purpose:** Make sure what we submit is runnable, honest, and complete.

**Use when:** Day 3 and 22 October.

**Steps**
1. Write the README: setup, environment variables (names only, no secrets), architecture, data provenance and verification notes, assumptions, limitations, and the demo flow.
2. Prepare two demo scenarios: one normal journey, and one disruption scenario with conflicting or stale reports.
3. Run the whole demo from a clean session on a phone-sized layout.
4. Test failure paths on purpose: LLM down, maps API down, no reports, missing schedule entry.
5. Check that every schedule, estimate, report, and simulated scenario is labelled correctly.
6. Verify deployment, environment configuration, repository visibility, docs, and licence notices.
7. List reused components (open-source and Devmarketplace) with real names and licences.
8. Record what interviews or validation were actually done. Do not present informal feedback as a representative study.
9. Freeze features before the final check. No last-minute architectural changes.

**Guardrails**
- Do not invent gig names, catalogue items, or integration claims.
- Describe limitations plainly in the submission.

---

## Adding a new skill

Keep each skill in the same shape so agents can scan them quickly:

```
## N. Skill name
**Purpose:** one sentence
**Use when:** the trigger
**Inputs:** what it needs
**Steps:** numbered, concrete
**Outputs:** what it produces
**Guardrails:** what must not happen
**Tests to write:** (if code is involved)
```

Only add a skill for a task that actually recurs in this project.