# PROMPTS.md: Devmarketplace builder prompts for OnRoute

Order matters. Send one prompt at a time, test it, commit, then the next. Each prompt names its file(s) and its owner so four people don't collide.

**Before anything:** the lead commits `SPEC.md`, `AGENTS.md`, `SKILLS.md` and `data/shuttle/routes.json` to the central repo, and everyone syncs their fork.

**Known data gap (read this):** the PDF gives only the **first-stop departure time** and stop order. No later-stop times, no NED arrival. Scenario 2 and every ETA need per-stop timing, so the Data owner must fill `minutes_from_previous` (or `route_run_minutes`) for the 1–2 demo routes from a real rider. Until then, builders use the DEMO timing file in P1.

---

## HEADER (paste at the top of every prompt)

```
Read AGENTS.md and SPEC.md first. Follow them exactly.
- Do not invent any stops, times, fares, routes or ETAs. Use only data/shuttle/routes.json, data/fares.json, or values I paste. If something is missing, show it as "Unknown" and add a TODO. Do not guess a default.
- Only edit the file(s) I name. Do not rename, move, reformat or rewrite anything else.
- No calculations in screens. Screens call src/logic and render the result.
- Every displayed value shows a label next to it: Scheduled / Reported / Estimated / Entered by you / Unknown / Stale / Conflicting / DEMO DATA.
- Keep the change small. At the end, list the files you changed and anything you could not verify.
```

---

## P0. Grounding check (Lead, once, no code, costs almost nothing)

```
[HEADER]
Do not write code. Read AGENTS.md, SPEC.md and data/shuttle/routes.json, then reply with:
1. The 3 scenarios in one line each.
2. What the route file contains and what it does NOT contain (times).
3. Which stops are shared by Route 7 and Route 2, Route 9, Route 14+3 (use stop ids from the file).
4. A list of anything unclear.
```
If the answer to 2 does not say "only first-stop departure time," the builder has not read the file. Stop and fix before continuing.

---

## P1. Data loader and DEMO timing (Data owner + Logic owner)

First the Data owner fills `data/demo/timing_demo.json` (or real values if available):
```
{ "_label": "DEMO DATA - replace with verified values",
  "routes": { "route-7": { "route_run_minutes": null, "minutes_from_previous": { "<stop_id>": null } },
              "route-2": { "route_run_minutes": null, "minutes_from_previous": { "<stop_id>": null } } } }
```
Then:
```
[HEADER]
Create src/logic/data only. Do not touch data files.
1. Load data/shuttle/routes.json and data/demo/timing_demo.json (demo values override nulls but must carry label "demo").
2. Export: getRoute(routeId), getStopsAfter(routeId, stopId), getRoutesServingStop(stopId), getStopTime(routeId, stopId) -> { value: "HH:MM" | null, label: "scheduled" | "estimated" | "demo" | "unknown", reason }.
   - First stop of a route = routes.json departure, label "scheduled".
   - Later stops: if minutes_from_previous exists, cumulative sum from the first-stop departure, label "estimated" (or "demo" if from the demo file).
   - Else if route_run_minutes exists, spread evenly, label "estimated".
   - Else value null, label "unknown", reason "no timing in data". NEVER default a number.
3. A validate() function: no duplicate stop_order, every stop_id exists, every route has a departure.
4. Tests in src/logic/data.test: unknown timing returns null; shared stop 'sakhi-hassan' is returned for routes 2, 7, 9, 14-3; a stop not on a route is rejected.
Run the tests and show the output.
```

---

## P2. Shared types contract (Lead only, tiny)

```
[HEADER]
Create src/logic/types only. Define types for: Label, Option (id, type, label, steps[], arrival_at_ned {value, range?, label, reason}, meets_deadline true|false|"unknown"|"at_risk", cost_pkr {value, label, reason}, transfers, walking_minutes {value,label}, evidence[{label,detail}], unknowns[]), EngineInput (routeId, boardingStopId, now "HH:MM", deadline "HH:MM", scenario "not_coming"|"left_my_stop"|"delayed", preference "fastest"|"cheapest"|"balanced", willingToWalkOrTransfer boolean, quote {price_pkr, minutes}|null, reports Report[]), EngineResult {options, reason_if_empty, notes}, Report (id, routeId, stopId, type "seen"|"departed"|"not_seen"|"disruption", createdAt ISO). Types only, no logic.
```
After this merges, nobody but the lead edits it.

---

## P3. Report logic (Logic owner)

```
[HEADER]
Create src/logic/reports only (pure functions, no UI, no network). Config from data/shuttle/routes.json > config: fresh_report_minutes, eta_band_minutes.

Function evaluateReports({ routeId, studentStopId, now, reports }) returns:
{ status: "none" | "fresh" | "stale" | "conflicting", usedReport?, etaRange?: [HH:MM, HH:MM], notBefore?: HH:MM, label, detail, ignored: [...] }

Rules, exactly:
- Only reports for this routeId. Only reports at stops BEFORE studentStopId on that route. Reports at the student's stop or after are listed in "ignored" with a reason and never used for the ETA.
- Age = now - createdAt. If older than fresh_report_minutes -> "stale", not used for an ETA.
- Fresh "departed" at stop k at time t: estimate = t + sum of minutes from stop k to studentStopId using getStopTime/minutes data. etaRange = estimate +/- eta_band_minutes. label "estimated", detail "based on a report from HH:MM at <stop>". If any needed minutes are unknown -> no range, label "unknown", reason "route timing missing".
- Fresh "seen" at stop k: only notBefore = t + minutes from k to student's stop. No range.
- "not_seen" and "disruption": status "fresh" but never an ETA, never "cancelled". Shown as reported with age.
- Two fresh reports at the same stop that disagree (e.g. departed vs not_seen) -> status "conflicting", no range, include both.
- No reports -> status "none", label "unknown", detail "Live arrival unknown".
No probabilities, no numeric confidence.

Tests (src/logic/reports.test) using a small TEST FIXTURE inside the test file (two fake stops, marked fixture): zero reports; fresh departed gives range; seen gives notBefore only; stale; conflicting; exactly at window edge; report after student's stop ignored; missing timing gives unknown. Run all and show the output.
```

---

## P4. Scenario engine (Logic owner. The core. Check by hand.)

```
[HEADER]
Create src/logic/engine only (pure, deterministic, no UI, no AI, no network). Use src/logic/types, src/logic/data, src/logic/reports. Do not edit them.

getOptions(input: EngineInput) -> EngineResult. Return at most 5 options, sorted by input.preference.

Scenario "delayed" and "not_coming" -> option wait_scheduled (own point) :
 time at boarding stop = getStopTime. NED arrival = that time + remaining stop minutes if timing exists, else value null label "unknown".
 For "delayed": if evaluateReports gives an etaRange, use it as arrival range (label "estimated", cite the report). Otherwise show the timetable time + "Live arrival unknown".
 For "not_coming": do NOT offer wait_scheduled as a recommendation; offer it only as a note.
Scenario "left_my_stop" -> option board_later_stop:
 for each stop j after the boarding stop on the same route: feasible only if input.quote or a modelled walking link gives the student's travel minutes to j, AND now + travel + catch_buffer_minutes <= point time at j. If no way to reach j is known, mark that option "cannot verify" in unknowns, do not assume one.
All scenarios -> option hop_other_point:
 for each OTHER route returned by getRoutesServingStop(boardingStopId) whose time at that stop is >= now + catch_buffer_minutes. Transfers = 1, walking 0. No walking link exists in the data, so NEVER connect different stop ids.
 If that route's time at the stop is unknown, include the option with arrival unknown and reason.
Any scenario -> ride_hailing option ONLY if input.quote exists: cost = quote.price_pkr label "entered_by_you"; arrival = now + quote.minutes label "entered_by_you".
public_bus: only if data/fares.json has a matching entry; otherwise omit.

meets_deadline: true if known arrival (upper end of range) <= deadline; false if lower end > deadline; "at_risk" if the range straddles it; "unknown" if arrival unknown.
Ranking: fastest = earliest known arrival; cheapest = lowest known cost; balanced = sum of the two ranks. Unknown ranks last. Never drop the raw values. No scores.
If no option is supported return options [] and reason_if_empty.

Tests (src/logic/engine.test) with a TEST FIXTURE (two fake routes sharing one stop, marked fixture): left_my_stop with a catchable later stop (via quote); left_my_stop with none catchable; hop_other_point found via shared stop; no hop for different stop ids; deadline false / at_risk / true; fastest and cheapest give different orders; unknown timing gives unknown and not a number; same input twice gives identical output. Run all tests and show the output.
```
**Human check (mandatory):** take one hero example, work it out on paper with real timings, and compare to the engine output before anyone builds on it.

---

## P5. Signup / profile screen (Builder A)

```
[HEADER]
Create src/screens/Signup only. Fields: name, email, password, destination (fixed to NED, read-only), point number (dropdown listing routes from data/shuttle/routes.json by "number"), usual boarding stop (dropdown of that route's stops, ordered, filtered by chosen point). Save point and usual stop to the user's profile using the platform's existing auth/database. Validate required fields. Do not change any other file and do not touch src/logic.
```

## P6. Journey and results screen (Builder B)

```
[HEADER]
Create src/screens/Journey only. Read the user's profile for point and usual stop.
Inputs: scenario (3 big buttons: "My point isn't coming" / "My point already left my stop" / "My point is delayed"), boarding stop today (defaults to usual stop, changeable, stops of the chosen point only), arrival deadline (time), preference (fastest / cheapest / balanced), willing to walk or transfer (yes/no), optional ride quote: price in Rs AND minutes (label "Entered by you").
Add a clearly visible "DEMO: simulate current time" field. When used, show a banner "DEMO DATA: simulated time".
On submit call getOptions from src/logic/engine with real reports (when the report table exists) or an empty list. Render each option as a card: label, steps, NED arrival (value or range, with its label badge), meets_deadline (use warning wording for false / at_risk), cost with badge, transfers, evidence list with badges and age, unknowns list. Show reason_if_empty if no options. Show "Live arrival unknown" where the engine says so. Create one reusable label badge component in this file or src/screens/components/Badge only.
Do NOT modify src/logic. Do NOT calculate anything in the UI. Phone-width first.
```

## P7. Report screen (Builder C)

```
[HEADER]
Create src/screens/Report only, and one table/collection "reports" (route_id, stop_id, author_id, type: seen|departed|not_seen|disruption, created_at set by the server, never by the client). The user must be logged in. Four buttons: "Point seen here", "Point departed", "Point not seen", "Disruption". Stop defaults to the profile's usual stop, changeable. Reject a duplicate (same user, stop, type within 2 minutes). Below the buttons list recent reports for the user's point with a relative age ("12 min ago") and a "Stale" badge when older than fresh_report_minutes from routes.json > config. Must work normally with zero reports. Do not edit any other file.
```

## P8. Wire reports into results (Lead, after P3, P4, P6, P7 are merged)

```
[HEADER]
Edit src/screens/Journey only. Load the reports for the user's point from the reports table and pass them to getOptions. Show an evidence section above the cards with the output of evaluateReports: the status badge (Estimated range with "based on a report from HH:MM at <stop>", Stale, Conflicting with both reports listed, or "Live arrival unknown" when none). Do not change src/logic.
```

## P9. Fares and quote comparison (Data owner fills data, Builder B or Logic owner prompts)

Data owner creates `data/fares.json` by hand from real fares:
```
{ "_label": "Hand-made, estimated", "public_bus": [ { "from_stop_id": "...", "to": "ned-main-campus", "fare_pkr": null, "label": "estimated" } ] }
```
Then:
```
[HEADER]
Edit src/logic/engine only. Add public_bus options from data/fares.json: cost from the entry with label "estimated"; arrival unknown unless the entry has minutes. Do not invent fares. If the file has no matching entry, omit the option. Add one test and run all tests.
```

## P10. AI explanation (only after everything above works, deadline -5h)

```
[HEADER]
Create src/ai only, plus one server-side function. Input: the EngineResult JSON only (strip any name/email). Call one hosted LLM with this system prompt: "You explain commute options for a student. Use ONLY the JSON given. Never create routes, stops, times, fares, closures or bus positions. If evidence is insufficient, say so. Reply as JSON: {best_supported_option: id|null, summary, main_tradeoff, verify_before_acting: string[]}." Max 150 output tokens, 8 second timeout. Validate: valid JSON, schema matches, best_supported_option is null or an option id in the input. On any failure return null. API key from an environment variable, never in client code.
Then edit src/screens/Journey only: show the explanation under the cards labelled "AI explanation" and hide it if null. The cards must work with the AI turned off. Add a test for schema rejection, unknown option id, and timeout.
```

## P11. Label audit (read-only, anyone, before the freeze)

```
[HEADER]
Do not change any file. Review src/screens and src/logic and list every place where (a) a value is displayed without a label, (b) a number or time is hard-coded or defaulted instead of coming from data, (c) demo data is shown without a DEMO DATA label, (d) a screen does its own calculation. Give file and line for each.
```

## P12. Bug fix template (when the builder goes off the rails)

```
[HEADER]
Bug: <what you did, what you expected, what happened>.
Touch only <file>. Do not rewrite the file. Explain the cause in 2 sentences first, then make the smallest fix. Do not change any test to make it pass. Run the tests and show the output.
```
If it breaks twice, stop prompting. Fix by hand or paste the file in chat and ask for the cause.

---

## Who runs what

| Person | Prompts |
|---|---|
| Lead | P0, P2, P8, merges, final test |
| Data owner | fills data files, P1 data inputs, P9 data |
| Logic owner | P1, P3, P4, P9 prompt, P10 |
| Builder A | P5 |
| Builder B | P6 |
| Builder C | P7 |
| Demo/docs | README, demo script, backup video, P11 |

If you are only three builders, Logic owner also takes P7.

## Order for today

1. P0, then Data owner starts timing for the hero route immediately.
2. P1, P2, then P3 and P4 in parallel with P5, P6, P7 (UI on DEMO data).
3. P8 once P3, P4, P6, P7 are merged. Run the must-test list in `SPEC.md` section 12.
4. P9, then P10 only if all of that works. Deadline −4h: freeze. P11, fix, README, rehearse twice, record backup video.
