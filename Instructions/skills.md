# SKILLS.md

Task playbooks for **OnRoute**. Read `AGENTS.md` (hard rules) and `SPEC.md` (product) first.

| # | Skill | Owner | When |
|---|---|---|---|
| 1 | Route data verification and timing | Data | First |
| 2 | Stop identity and transfer graph | Data / Logic | First |
| 3 | Scenario engine and ranking | Logic | Core |
| 4 | Upstream reports and ETA range | Logic | Core |
| 5 | Labels and provenance | Builders | With every screen |
| 6 | Fares and user quotes | Data / Builders | Layer 2 |
| 7 | Grounded AI explanation | Logic / lead | After core works |
| 8 | Team git workflow and token hygiene | Everyone | Always |
| 9 | Demo, README, submission check | Demo/docs | Last 4h |

---

## 1. Route data verification and timing

**Purpose:** Make `data/shuttle/routes.json` trustworthy for 1–2 demo routes.
**Inputs:** the PDF, `routes.json` (auto-transcribed, marked `unverified`), one student who rides the route.
**Steps**
1. Choose 1–2 routes. Suggested hero: **Route 7** (7:25, passes Sakhi Hassan, Shadman No. 1, Buffer Zone, Nipa) plus a hop-on route sharing Sakhi Hassan: **Route 2**, **Route 9** or **Route 14+3**. Choose by what a real rider can confirm.
2. Check every stop name and order against the PDF page. Set `verification` to `verified by <name>`.
3. **Fill timing.** The PDF has only the first-stop departure. Ask the rider for approximate `minutes_from_previous` for each stop, or total run minutes (`route_run_minutes`, spread evenly). Mark those times `estimated`, never `schedule`.
4. Write ambiguities in `meta.TO_VERIFY` instead of resolving them silently.
**Outputs:** verified route entries, a provenance note (who checked, when, what is still estimated).
**Guardrails:** never guess a missing time; never mark an estimate as Scheduled; do not add coordinates; unverified routes stay out of the demo.

## 2. Stop identity and transfer graph

**Purpose:** Decide which stops are the same place, so transfers are real.
**Steps**
1. Review `stops[]` with `alias_status: "auto-normalised, needs human check"`. Confirm or split each merged spelling (Malir Halt/Hault, Sakhi Hassan Chowrangi/Sakhi Hassan, etc.). Keep uncertain pairs separate (e.g. Ship Owner vs Ship Owner College).
2. A transfer exists only where two points share a canonical stop id. Shared-stop candidates are listed in `SPEC.md` section 8.
3. Walking links between different stops are added to a `walking_links` list only if explicitly verified, with source and minutes.
4. Keep the graph small enough to print for the demo.
**Guardrails:** no implied connections; nearby is not connected; direction and order matter (a point cannot be boarded at a stop it has already passed).
**Tests:** shared stop found; non-shared stop not connected; stop order respected.

## 3. Scenario engine and ranking

**Purpose:** Pure functions that return a small set of honest options.
**Inputs:** point (route id), boarding stop id, `now`, deadline, scenario (`not_coming` | `left_my_stop` | `delayed`), preference, walk/transfer flag, quote `{price_pkr, minutes}`, reports, route data, fares.
**Rules**
- `wait_scheduled` (scenarios 1, 3): own point's time at the boarding stop; NED arrival = that time + remaining stop minutes, if timing exists, else unknown.
- `board_later_stop` (scenario 2): for each stop j after the boarding stop, feasible if `now + student's travel minutes to j + catch_buffer <= point's time at j`. Student travel minutes come only from a typed quote or a modelled walking link; otherwise the option is marked "cannot verify."
- `hop_other_point` (scenarios 1, 2, 3): other routes containing the same stop id whose time at that stop is >= now + buffer.
- `public_bus` / `ride_hailing`: cost from fare table or typed quote; time from the quote or unknown.
- Return at most ~5 options. If none is supported, return `[]` plus a reason.
- Ranking: fastest = earliest known arrival; cheapest = lowest known cost; balanced = rank sum. Unknown ranks last. Raw values always remain.
- `meets_deadline`: `true` / `false` / `"unknown"`. If the range straddles the deadline, mark "at risk."

**Output shape (contract; only the lead changes it)**
```json
{
  "options": [{
    "id": "opt-1",
    "type": "wait_scheduled | board_later_stop | hop_other_point | public_bus | ride_hailing",
    "label": "Hop on Route 2 at Sakhi Hassan",
    "steps": ["..."],
    "arrival_at_ned": { "value": "08:10", "range": ["08:06","08:14"], "label": "estimated", "reason": "..." },
    "meets_deadline": true,
    "cost_pkr": { "value": null, "label": "unknown", "reason": "no fare entered" },
    "transfers": 1,
    "walking_minutes": { "value": 0, "label": "estimated" },
    "evidence": [{ "label": "reported", "detail": "departed Stop 3 at 07:40, 12 min ago" }],
    "unknowns": ["live point status"]
  }],
  "reason_if_empty": null,
  "notes": ["Schedule is not live status."]
}
```
**Tests:** each scenario feasible and not; deadline missed; missing timing returns unknown; determinism; no hop without shared stop; fastest vs cheapest differ.

## 4. Upstream reports and ETA range

**Purpose:** Turn reports from students up the route into a labelled estimate.
**Inputs:** reports for the point, student's stop index n, `now`, config (`fresh_report_minutes`, `eta_band_minutes`).
**Steps**
1. Drop `hidden` reports. Keep only the student's point.
2. Age = `now - created_at` (server time). Older than the window: **Stale**, unused.
3. Keep reports at stops 1 to n-1. Ignore stops after n for the ETA.
4. If fresh reports disagree (e.g. `departed` vs `not_seen` at the same stop in the window): **Conflicting**, no range.
5. `departed stop k at t`: estimate = t + sum(minutes k to n); range = estimate ± band. Label Estimated, cite the report.
6. `seen stop k at t`: "not before t + minutes." No range.
7. `not_seen`, `disruption`: show as Reported with age. Never "cancelled."
8. No usable report: return scheduled/estimated timetable time + `"Live arrival unknown"`.
**Guardrails:** needs `minutes_from_previous`; if null, say the estimate is unavailable. No probabilities.
**Tests:** zero, fresh departed, seen only, stale, conflicting, boundary at window edge, report after student's stop ignored.

## 5. Labels and provenance

**Purpose:** Show where every value came from.
**Steps**
1. Every value in the engine output has a `label` and, when relevant, a `reason`.
2. Screens render one shared badge component (Scheduled, Reported, Estimated, Entered by you, Unknown, Stale, Conflicting, DEMO DATA) next to the value.
3. Show Unknown explicitly with a short reason and, for costs, "check the service."
4. A global **DEMO DATA** banner whenever simulated time or simulated reports are active.
**Guardrails:** demo data must never look real; missing data is shown, not hidden; no label may be a tooltip only.

## 6. Fares and user quotes

**Purpose:** Cost comparison without pretending to know live prices.
**Steps**
1. Data owner fills a small `data/fares.json` for demo routes (public bus fare, rough ride estimate). Anything unsure is labelled Estimated.
2. Bykea/inDrive: student types price (Rs) and minutes. Label "Entered by you" with time entered. Quotes are not stored.
**Guardrails:** no automatic ride-hailing prices; no fare invented by the builder; unknown fare shows Unknown.

## 7. Grounded AI explanation

**Purpose:** Plain-language explanation of the engine's output.
**Steps**
1. Build the bundle server-side from engine output only. No names or emails.
2. Strict system prompt: use only supplied data; never create routes, times, fares, closures or positions; say when evidence is insufficient.
3. Require JSON: `best_supported_option` (id or null), `summary`, `main_tradeoff`, `verify_before_acting[]`.
4. Short output limit and timeout. Validate: parses, matches schema, references only option ids in the input.
5. On any failure return nothing; the UI shows the cards. Label the text "AI explanation."
**Guardrails:** one model, one endpoint; key server-side; explanation is never a source of truth.
**Tests:** schema; unknown option id rejected; timeout fallback; insufficient-evidence case.

## 8. Team git workflow and token hygiene

- Central repo (lead). Teammates fork, import the fork, branch per feature, PR to central. Sync fork before every session. Merge every 1–2 hours.
- One owner per folder. Shared contracts changed only by the lead.
- Every builder prompt names the file it may touch.
- Tokens: plan in chat, paste finished prompts; paste real data; one feature per prompt; hand-edit trivial text; keep ~15% reserve for the final fixes. All four teammates should build.
- Test the fork → PR → merge loop with a tiny change first.

## 9. Demo, README, submission check

1. README: setup, env var names (no secrets), architecture, data provenance and the known timing gap, assumptions (config values), limitations, demo flow.
2. Demo script (under 5 min): signup with point + stop → scheduled route info → zero-report "Live arrival unknown" → submit upstream report, range appears with source → "point already left my stop" with ranked alternatives → AI explanation → roadmap slide.
3. Run the **must-test list** in `SPEC.md` section 12 from a clean session on a phone-sized screen. Test failure paths: AI off, no reports, missing timing.
4. Check every value is labelled and demo data says DEMO DATA.
5. Record a backup video. List reused components with real names and licences. Record what validation was actually done.
