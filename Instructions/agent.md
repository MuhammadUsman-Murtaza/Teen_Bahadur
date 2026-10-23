# AGENTS.md

Instructions for AI coding agents (and humans who work like them) contributing to **OnRoute**. Read this file, then `SPEC.md`, then `data/shuttle/routes.json` before writing anything. If this file and `SPEC.md` disagree, `SPEC.md` wins. If something is unclear, ask instead of guessing.

## 1. What OnRoute is

OnRoute helps NED students recover when their usual university shuttle ("point") plan fails. Scenarios: (1) point not coming, (2) point already left my stop, (3) point delayed. It compares wait / board at a later stop / hop on another point / public bus / Bykea-inDrive, ranked by fastest, cheapest or balanced.

A **deterministic engine** produces options. An **LLM only explains** them. Evidence comes from the verified route file, **upstream student reports** (same point, stops 1 to n-1), and user-typed quotes.

## 2. Hard rules (never break)

1. **Never fabricate transport facts.** No invented stops, routes, transfers, times, fares, bus positions, closures or ETAs. Missing = `unknown`.
2. **Know what the data contains.** `routes.json` has only the **first-stop departure time** and stop order. Later-stop times are **Estimated** and exist only if `minutes_from_previous` or `route_run_minutes` is filled. If null, return `unknown`. Never insert a default.
3. **Schedule is not live status.** No reports = Unknown, not "all fine." One "not seen" report never means "cancelled."
4. **The LLM never calculates.** Feasibility, times, deadline checks, ranking and ETA ranges are plain code.
5. **Label everything.** Every displayed value carries one of: Scheduled, Reported, Estimated, Entered by you, Unknown, Stale, Conflicting, DEMO DATA. The label is rendered next to the value.
6. **ETA rule.** Fresh upstream report: estimated range labelled with its source report. No fresh report: scheduled/estimated timetable time plus "Live arrival unknown." Never a precise live countdown to the bus.
7. **Only `departed` reports make a range.** `seen` gives "not before." Reports from stops after the student's stop are ignored for their ETA. Stale reports are not used. Conflicting reports show the conflict and no range.
8. **Transfers need a shared canonical stop id** or an explicitly modelled walking link. Nearby-looking stops are not connected.
9. **Fail safe.** If the LLM fails, show the cards without explanation. If data is missing, say "not enough data."
10. **Privacy and secrets.** No live location, no trip history, no names/emails to the LLM, no keys in client code or commits.
11. **No numerical confidence scores or percentages.**
12. **Do not claim integrations that are not real** (Bykea/inDrive APIs, traffic, transit feeds, Devmarketplace components not inspected).

## 3. Scope

**Build (Layer 1):** phone-first web app; signup with point + usual stop; journey form (scenario, boarding stop today, deadline, preference, walk/transfer yes/no); engine for 3 scenarios; upstream report logic; labels.

**Build if easy (Layer 2):** one-tap report button with freshness; AI explanation with fallback; hand-made fare table; typed Bykea/inDrive quote (price Rs **and** minutes); map; 2FA only if the platform gives it cheaply.

**Do not build (Layer 3):** live GPS, learned ETAs, closure feeds, rewards, native app, other universities, automatic ride-hailing prices, maps/traffic API, RAG, agents, ML training, a chatbot for its own sake.

## 4. Stack and structure

Use whatever stack the Devmarketplace builder scaffolded. **Do not migrate or add frameworks.**

```
data/shuttle/routes.json   # Data owner only
data/fares.json            # Data owner only (hand-made, labelled Estimated)
src/logic/                 # Logic owner only. Framework-free, unit-tested
src/screens/               # Builders, one screen per person
src/ai/                    # Explanation call, schema, fallback
SPEC.md  AGENTS.md  SKILLS.md  PROMPTS.md  README.md
```

`src/logic/types` (the option and report shapes) is a shared contract. **Only the lead changes it.**

## 5. Rules for AI builder sessions

- **Edit only the file(s) the prompt names.** Do not rename, move, reformat or "improve" anything else. List the files you changed at the end.
- **Never generate data.** Load `data/shuttle/routes.json`. If something is missing, add a `TODO` and say so.
- **No calculations in screens.** Screens call `src/logic` and render the result.
- **No demo data without a visible "DEMO DATA" label.**
- Small change per prompt. Do not rewrite a working file to add a feature.
- Merge conflicts are resolved by a human, never by the builder.
- A UI that looks finished is not evidence the logic is right. Run the tests.

## 6. Git workflow

Lead owns the central repo. Others fork, sync the fork before every session, work on a branch (`signup-screen`, `report-screen`), commit small, open a PR to the central repo. Lead reviews and merges every 1–2 hours. After each merge everyone syncs. After the freeze only the lead merges, bug fixes only.

## 7. Roles

| Role | Owns |
|---|---|
| Data owner | `data/`: verify routes, fill timing, fare table |
| Logic owner | `src/logic/`, tests |
| Builders | `src/screens/` (one screen each) |
| Demo/docs owner | README, final spec, demo script, backup video |

Leave a handoff note when touching another owner's area: what changed, what is unverified, what to check next.

## 8. Tests expected

- Engine: scenario 1, 2, 3 each with a feasible and a no-feasible case; deadline missed; unknown timing returns unknown; determinism; shared-stop hop; no hop without shared id.
- Reports: zero; fresh `departed` gives range; `seen` gives lower bound only; stale; conflicting; boundary at the freshness window; stop-after-student ignored.
- Ranking: fastest vs cheapest differ; unknown ranks last.
- AI: schema valid; rejects unknown option ids; falls back on timeout.
- Screens: AI off still renders; zero-report state; phone width.

## 9. Definition of done

- [ ] Does what was asked, nothing more
- [ ] Missing data shows as Unknown with a reason
- [ ] Labels on every new displayed value
- [ ] Failure paths handled
- [ ] No secrets, personal data or unlabelled demo data
- [ ] Tests pass
- [ ] README/data notes updated if assumptions changed

## 10. Timeline

22 Oct is the final day. Hard freeze at deadline −4h. If the AI layer or a Layer 2 feature threatens the core flow, cut it. When in doubt: choose Unknown over a guess, smaller scope over a clever feature, a clear fallback over a fabricated answer.
