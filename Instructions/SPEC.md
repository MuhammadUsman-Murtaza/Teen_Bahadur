# OnRoute: Point-Failure Recovery Assistant for NED Students — MVP Specification

**Team Teen Bahadur | Devmarketplace x NED AI Hackathon | Build window 19–22 Oct 2026**
**Status:** v2. Supersedes the earlier "commute decision assistant" draft. Source of truth for `AGENTS.md`, `SKILLS.md`, `PROMPTS.md`.

**Core idea:** When a NED student's usual university shuttle ("point") plan fails, OnRoute compares realistic next steps (wait, board at a later stop, hop on another point, public bus, Bykea/inDrive) by fastest, cheapest or balanced. It uses verified route data and reports from students further up the same point's route. It shows estimates only when evidence supports them and says "unknown" when it does not.

---

## 1. Problem and impact

A student reaches their stop and the point is late, already gone, or not coming. They don't know which, and can't compare waiting, boarding further along the route, switching to another point, or paying for a ride. Today they ask around in chats.

Most "bus apps" fake live ETAs. OnRoute does not. Its edge is **upstream reports**: a student at stop 3 reporting "departed 7:40" is real evidence for the student at stop 7, and the app can show a labelled estimate range from it.

**Primary user:** a NED student who depends on a point and needs to reach NED by a deadline.

**Impact hypotheses (not proven claims):**
- Students understand their options faster than by asking around.
- Showing the source and uncertainty of each value helps students avoid treating guesses as facts.
- Upstream reports give a usable estimate range even with very few reports.
- The route PDF can be turned into structured data good enough for a pilot.

We do not claim OnRoute reduces travel time, guarantees on-time arrival, or saves money.

## 2. Product principles

- **Student-first.** No dependence on NED administration or an official feed.
- **Decision support, not certainty.** Recommend only as far as the data supports.
- **Timetable is not live tracking.** A scheduled time never proves a bus arrived, left, or is on time.
- **No reports = Unknown, not "all fine."** The app must be useful with zero reports.
- **Code decides, AI explains.** Feasibility, times and costs are computed in plain deterministic code. The LLM only explains the result.
- **No invented transport facts.** Stops, routes, transfers, times, fares and closures come from data or user input, otherwise `unknown`.
- **Every value is labelled** (section 6).
- **Privacy by default.** No live location, no travel history, no names or emails sent to the LLM.
- **Small reliable flow beats many features that don't work.**

## 3. The three scenarios

| # | Scenario | What the app does |
|---|---|---|
| 1 | **Point not coming today** | Offers other points that serve the student's stop (shared-stop transfer), plus public bus / ride options. |
| 2 | **Point already left my stop** (hero demo) | Checks whether the student can catch their own point at a later stop, or switch to another point still ahead, or go by another mode. |
| 3 | **Point is delayed** | Shows wait vs switch. Shows an estimated arrival range **only** if a fresh upstream report supports it. |

The student picks the scenario on the journey screen. The app may hint ("scheduled time has passed") but never asserts live status.

## 4. User journey

1. **Signup (saved):** name/login, point number, usual boarding stop, destination (NED).
2. **Journey (per use):** scenario, boarding stop today (defaults to usual stop, can differ), arrival deadline, preference (fastest / cheapest / balanced), willing to walk/transfer (yes/no), optional Bykea/inDrive quote (price in Rs **and** minutes to reach the target stop or NED).
3. The engine returns a small set of options. Each shows arrival (scheduled / estimated range / unknown), whether it meets the deadline, cost, transfers, walking, evidence labels and unknowns.
4. Optional AI explanation appears under the cards. If it fails, the cards stand alone.
5. **Report button:** seen / departed / not seen / disruption, at a stop, with automatic timestamp. Results update.

## 5. Scope

**Layer 1: must work**
- Phone-friendly web app.
- Signup with point number and usual stop.
- Route data from `data/shuttle/routes.json` (1–2 routes hand-verified, with stop order and stop-to-stop timing).
- Deterministic engine for the three scenarios, deadline check, preference ranking.
- Upstream report logic and ETA rule (section 6).
- Label on every displayed value.

**Layer 2: if the builder makes it easy**
- One-tap report button with freshness display.
- AI explanation of computed options (with non-AI fallback).
- Hand-made public bus fare table for the demo routes (labelled `Estimated` if unsure).
- User-typed Bykea/inDrive quote compared in the results.
- Login security / 2FA only if the platform provides it cheaply.
- Map view.

**Layer 3: pitch as roadmap, do not build**
Live GPS, learned ETAs from history, road-closure feeds, rewards, native app, other universities, automatic Bykea/inDrive pricing, full Karachi transit coverage, custom ML, agent frameworks.

## 6. Evidence, labels and the ETA rule

### Labels (shown next to the value, never in a tooltip only)

| Label | Meaning |
|---|---|
| **Scheduled** | From the shuttle document. In our data this is **only the first-stop departure time** (see section 8). |
| **Reported** | A student report, with timestamp and stop. |
| **Estimated** | Calculated, with assumptions shown (e.g. range from an upstream report, or per-stop time derived from route timing). |
| **Entered by you** | A quote or value typed by the student, with when. |
| **Unknown** | Not enough data. Say so, with a reason. |
| **Stale** | Report older than the freshness window. |
| **Conflicting** | Recent reports disagree. Show the disagreement. |
| **DEMO DATA** | Simulated data. Must be visibly marked. |

### Upstream reports (signature logic)

Student's stop = stop *n* on their point's route. Reports from the **same point** at stops 1 to n-1 are "upstream."

- Report types: `seen`, `departed`, `not_seen`, `disruption`. Timestamp is set by the server. **"Seen" is not "departed."**
- `departed stop k at t` → **Estimated** arrival at stop n = t + sum of stop-to-stop minutes (k to n), shown as a range ± `eta_band_minutes`, e.g. "7:52 to 8:00, based on a report from 7:40."
- `seen at stop k at t` → only a lower bound ("not before ..."). No range.
- `not_seen` and `disruption` are shown as reports. They never produce "cancelled."
- Reports from stops **after** n are ignored for the student's ETA.
- A report older than `fresh_report_minutes` is **Stale** and not used for an ETA.
- Recent reports that disagree (e.g. `departed stop 3` and `not_seen stop 3` within the window) are **Conflicting**: no ETA range, show both.

### ETA rule
- Fresh upstream report: estimated range, labelled with the report it came from.
- No fresh report: scheduled/estimated timetable time and **"Live arrival unknown."**
- Never a precise live countdown to the bus. A countdown to a *scheduled* time is allowed if labelled "scheduled."
- Never "Cancelled" because one student did not see the bus.

### Config (documented assumptions, not facts)
`fresh_report_minutes = 20`, `eta_band_minutes = 4`, `catch_buffer_minutes = 3`. Stored in `routes.json > config` and shown in the README.

## 7. Decision engine and AI

**Engine (plain code, no AI, no network):** given point, boarding stop, now, deadline, scenario, preference, quote, reports, it returns up to ~5 options with explicit unknowns. Same inputs always give the same output.

Options it can build, only from data that exists:
- `wait_scheduled`: wait for own point (Scenarios 1 and 3).
- `board_later_stop`: catch own point at a later stop j, if the student has a way to reach j in time (a user-entered quote with minutes, or a modelled walking link). Otherwise the option is shown as "cannot verify" or omitted.
- `hop_other_point`: another point whose route contains the **same canonical stop id** and whose time at that stop is still ahead. Needs no walking. Stops with different ids are not connected unless a walking link is explicitly modelled.
- `public_bus`: fare from the hand-made fare table if present; duration unknown unless supplied.
- `ride_hailing`: only from the student's typed quote.

**Ranking:** fastest = earliest known arrival; cheapest = lowest known cost; balanced = sum of the two ranks. Unknown values rank last. Raw values stay visible. No fake scores.

**Deadline:** if the range's upper bound passes the deadline, show a warning. If only part of the range does, show "at risk."

**AI explanation:** one hosted model, one server-side function. Input is the structured option bundle only (no names/emails). Output is validated against a schema: `best_supported_option` (id or null), `summary`, `main_tradeoff`, `verify_before_acting[]`. It may not introduce any route, time, fare, closure or position not in the input. On timeout, bad schema or unsupported claim, show the cards with no explanation.

## 8. Data

### Source and the known gap
`data/shuttle/routes.json` is transcribed from *Shuttle Services — Detail of Routes, 2024–25* (16 morning routes). **The document gives only the departure time at each route's first stop and the stop order. It gives no times for later stops and no arrival time at NED.**

Consequences:
- Only the first-stop time is **Scheduled**.
- Every other stop time is at best **Estimated**, and exists only if the team supplies `minutes_from_previous` per stop, or `route_run_minutes` (total first stop to NED, spread evenly). Both are `null` until the data owner fills them from a rider who knows the route.
- Without them the engine must return `unknown` for later-stop timings. It must not invent a default.

### Stops and transfers
Stop names are normalised to canonical ids (e.g. "Malir Halt" and "Malir Hault" are `malir-hault`). This normalisation is automatic and **needs human verification**. Ambiguous pairs (e.g. "Ship Owner" vs "Ship Owner College") are kept separate. Best shared-stop candidates for the demo: **Sakhi Hassan** (Routes 2, 7, 9, 14+3), Nipa (6, 7, 9, 14+3), Five Star Chowrangi (9, 10, 13, 14+3), Malir Hault (6, 11, 12, 15).

### Tables (keep small)

| Table | Key fields |
|---|---|
| `routes` | id, number, first_stop_departure, route_run_minutes, verification |
| `stops` | id (canonical), canonical_name, alias_status |
| `route_stops` | route_id, stop_id, stop_order, time, time_source (`schedule`/`estimated`/null), minutes_from_previous |
| `profiles` | user_id, point_route_id, usual_stop_id |
| `reports` | id, route_id, stop_id, author_id, type, created_at (server), status |
| `fares` (optional) | hand-made, labelled Estimated |

Quotes are processed in the session and not stored. No trip history.

### Permissions (minimal)
Reports require login. Users edit only their own reports. Duplicate-report check (same user, stop, type, short window). Note length limited, text rendered safely.

## 9. Technical approach

Use the stack the Devmarketplace AI builder scaffolds. Do not migrate frameworks. Required structure:

- `data/`: route and fare data (Data owner only)
- `src/logic/`: engine, report logic, types (Logic owner only; framework-free so it can be unit tested)
- `src/screens/`: signup, journey/results, report (Builders, one screen each)
- `src/ai/`: explanation call, schema, fallback

Secrets stay server-side. Maps/traffic integration is out of the MVP: it is untested for Karachi and nobody has time to verify it.

## 10. Team workflow

- Lead owns the central repo. Three teammates fork, import their fork, work on a branch, and open PRs to the central repo. Merge every 1–2 hours. Everyone syncs the fork before each session.
- **One owner per folder.** Shared contracts (`types`, data shape) are changed only by the lead.
- Every builder prompt names the one file it may touch. Merge conflicts are fixed by a human, not the builder.
- Tokens are per person (1M each): all four should build. Plan and polish prompts in chat, paste finished prompts into the builder, paste real data instead of making the builder generate it, one feature per prompt, hand-edit tiny text/colour changes, keep ~15% in reserve for the final fixes.

| Role | Owns |
|---|---|
| Data owner | `data/`: verify routes, fill timing, fare table. **Bottleneck.** |
| Logic owner | `src/logic/`: engine, upstream ETA, tests |
| Builders | `src/screens/`: signup, journey/results, report |
| Demo/docs owner | README, final spec, demo script, backup video |

## 11. Timeline (22 Oct is the final day)

- **Now:** Data owner verifies 1–2 routes and fills timing. Builders build screens on clearly labelled DEMO data.
- **Then sleep.** Tired vibe-coding creates bugs nobody notices.
- **Deadline −5h:** AI explanation, fares, quote entry.
- **Deadline −4h: HARD FREEZE.** No new features.
- **Last 4h:** test, fix, README, final spec, rehearse demo twice, record a backup video.

## 12. Acceptance criteria / must-test

- [ ] Zero reports: "Live arrival unknown," no fake time
- [ ] One fresh upstream report gives a labelled ETA range
- [ ] One stale report is marked Stale and not used
- [ ] Two conflicting reports show the conflict, no range
- [ ] A report from a stop after the student's stop is ignored for their ETA
- [ ] Fastest vs cheapest changes the ranking
- [ ] Deadline too tight shows a warning
- [ ] Scenario 2 on the hero route matches the hand-worked example
- [ ] No option relies on an unmodelled transfer
- [ ] AI off: results still work. AI on: it mentions nothing not in the data
- [ ] Every displayed value has a label; demo data says DEMO DATA
- [ ] Works on a phone-sized screen
- [ ] Clean-session run of the deployed app

## 13. Risks

| Risk | Mitigation |
|---|---|
| **PDF has no per-stop times** | Data owner supplies timing for 1–2 routes from a real rider. Label as Estimated. Engine returns unknown otherwise. |
| Stop spelling variants cause false or missed transfers | Canonical ids, human verification, keep ambiguous stops separate |
| Too few reports | Works from route data; reports are extra evidence |
| AI builder invents data or rewrites files | Real data pasted/loaded from file, one-file-per-prompt, tests, human review |
| LLM failure | Deterministic results stand alone |
| Scope creep | Hard freeze at deadline −4h; cut anything half-working |

## 14. Submission checklist

- [ ] Problem, user, impact hypotheses, limitations
- [ ] End-to-end journey and the 3 scenarios
- [ ] Data source, known gap, verification notes
- [ ] Engine approach and AI guardrails
- [ ] Data model, architecture, team roles
- [ ] Reused Devmarketplace components with real names and licences (check, don't assume)
- [ ] Deployed demo, README, demo script, known limitations, DEMO DATA labels
- [ ] Record what validation was actually done (e.g. one rider confirmed one route's timing). Informal feedback is not a study.

## 15. Future direction (roadmap slide only)

Live tracking, learned ETAs from report history, verified closure feeds, rewards for useful reports, native app, other universities. Never sell individual travel histories.
