OnRoute: AI Commute Decision Assistant — MVP Specification
Status: Updated draft for the 19–22 October 2026 hackathon
Direction: Student-first and NED-first. The MVP does not depend on NED administration or official transport-system integration.
Core idea: Help a student compare realistic ways to reach their destination using the shuttle timetable, known route connections, available journey estimates, and sparse student observations. AI explains the trade-offs; it does not invent live bus locations or guaranteed arrival times.

Table of Contents
1. Problem and impact
2. Product principles and boundaries
3. Primary user journey
4. MVP feature scope
5. AI and decision engine
6. Working with sparse and uncertain data
7. Data model
8. Technical approach and integrations
9. Team readiness and roles
10. Three-day execution plan
11. Acceptance criteria
12. Risks and validation
13. Implementation tasks / code gigs
14. Repository and submission checklist
15. Future direction
1. Problem and impact
The problem
A NED student who depends on a university pickup bus may reach their stop and find that the bus has not arrived. They may not know whether it is late, has already passed, has broken down, or is not coming. They then have to choose between waiting, walking to another pickup point, taking public transport, or paying for a ride-hailing service—often without enough information to compare those choices.

The core problem is commute uncertainty and decision-making, not simply late buses. A reporting-only platform can be empty if few students contribute. OnRoute should therefore remain useful when there are zero reports, while treating reports as extra evidence when they exist.
Primary user
A NED student who needs to reach a destination by a particular time and wants to compare the practical options available from their current or selected pickup point.
Proposed solution
OnRoute is an AI-assisted commute decision tool. It uses the shuttle route and timetable information supplied to the project, known stop connections, available travel estimates, and timestamped student observations to compare a small number of feasible options. It explains why an option may be preferable, what assumptions it relies on, and what remains unknown.

Examples of possible options include:
- Waiting for the scheduled university shuttle.
- Walking to another known pickup point and catching a shuttle there, if the route and timing support that connection.
- Using a known public-transport route where enough reliable information is available.
- Comparing a student-entered Bykea or inDrive quote with other options.
The app will not claim to know live service status or retrieve live ride-hailing fares unless a real, authorized integration is available and tested.
Impact hypotheses
We want to test whether:
- Students can understand their available options faster than by searching multiple chats or asking around.
- Students find the recommendation and its explanation useful, even when there are few or no reports.
- Showing data sources, timestamps, and uncertainty helps students avoid treating guesses as facts.
- The route PDF can be converted into sufficiently accurate structured route data for a useful pilot.
These are hypotheses, not proven outcomes. We will not claim that OnRoute reduces travel time, guarantees on-time arrival, improves shuttle reliability, or saves money without evidence.
2. Product principles and boundaries
- Student-first: The app must work without NED administration or an official transport feed.
- Decision support, not certainty: Recommend a feasible option only to the extent supported by available data; show unknowns clearly.
- Timetable is not live tracking: A scheduled time does not prove that a bus has arrived, departed, or is on time.
- AI does not make up transport facts: Route feasibility, times, and costs must come from structured data, a tested external source, or explicit user input.
- Useful with sparse reports: Reports improve the evidence available but are not a prerequisite for the basic comparison.
- No invented alternatives: Only recommend routes or transfers represented in verified or explicitly labelled data.
- Transparent estimates: Distinguish official/published schedule data, external estimates, student reports, user-entered quotes, and demo-only simulated data.
- Privacy by default: Do not publish a student's precise location or expose personal travel history. Send no unnecessary identifying details to the LLM.
- Hackathon scope first: Build one complete, trustworthy commute comparison before adding more routes, providers, or complex AI features.
3. Primary user journey
1. The student opens OnRoute and selects a starting point and destination. The first demo may use a small set of stops and destinations derived from the supplied shuttle PDF.
2. They enter the time they need to arrive by, and optionally their budget and willingness to walk or transfer.
3. The app loads the relevant shuttle routes and schedule entries that have been extracted and checked from the PDF.
4. If configured and working, the app obtains route or traffic estimates from a real maps service. If not, it clearly marks those estimates as unavailable instead of pretending to have live traffic data.
5. The app shows recent reports for relevant stops, if any. Each report has a timestamp and a status such as unconfirmed, corroborated, conflicting, or stale.
6. A deterministic route engine generates a small set of feasible options from the available route graph and inputs. It does not use the LLM to invent stops or calculate authoritative travel times.
7. The options are compared on estimated arrival time, transfers, walking burden, and cost where those values are known. Missing values are marked unknown.
8. The AI explanation describes the strongest available option, its trade-offs, the evidence behind it, and what the student should verify before acting.
9. The student can submit a short observation such as Bus seen, Bus not seen by expected time, or Possible disruption. The report is stored with a server timestamp and the selected stop.
10. The recommendation can update when a new report or input changes the evidence. The app must not claim that one report proves a bus is delayed or cancelled.
4. MVP feature scope
Must have
- A responsive, phone-first web application.
- A small, explicit route dataset extracted from the supplied shuttle PDF, with a source note and a manual verification pass.
- Starting point, destination, arrival deadline, and optional budget/walking preference inputs.
- A route/stop graph for the selected shuttle routes.
- A deterministic comparison of a small set of options supported by the seeded data.
- Clear source and confidence labels for schedules, external estimates, and student reports.
- A basic report form with timestamped observations.
- A results screen that explains what is known, what is estimated, and what is unknown.
- A small demo dataset and a deployed application.
- A README documenting setup, data provenance, assumptions, limitations, and the demo flow.
- Basic input validation and safe handling of API keys.
If time allows
- A tested traffic-aware route estimate from one maps API.
- A small set of public-transport connections, but only if routes and stops can be verified in time.
- A manual field for the user to enter a current Bykea/inDrive fare or pickup estimate.
- A simple report feed for each pickup point.
- An LLM-generated explanation grounded in the route engine's structured comparison.
- A small moderator control for hiding abusive reports.
- A visual map for the routes we have actually modelled.
Explicitly out of scope
- Live GPS tracking of university buses.
- Guaranteed bus ETAs or claims that a shuttle is on time based only on its schedule.
- Automatic access to Bykea or inDrive prices, drivers, or booking systems without a working authorized integration.
- Full coverage of all Karachi public transport.
- Guaranteed traffic-blockage detection or road-closure alerts unless a working source provides them.
- Automatically recommending a nearby shuttle stop unless the route connection and walking link are represented in the data.
- Native Android/iOS applications.
- Rewards, wallets, payments, sponsor marketplace, or multi-campus onboarding.
- Training a custom machine-learning model or claiming predictive accuracy from a handful of reports.
- Complex agents, RAG pipelines, or multi-model orchestration.
Fallback rule: If external APIs or route data are unavailable, the app must still demonstrate a smaller comparison using the verified shuttle dataset and explicitly labelled assumptions. Do not replace missing live data with fabricated live results.
5. AI and decision engine
Design
OnRoute should have two distinct parts:
1. Deterministic route and comparison engine: Finds options that are supported by the route graph and computes comparisons from available structured values.
2. LLM explanation layer: Turns those results into a concise explanation that a student can understand.
The LLM is not the source of truth for the route network, schedule, travel-time calculations, fares, or service status.
Inputs to the decision engine
- Selected origin and destination.
- Arrival deadline.
- Optional budget and walking/transfer preferences.
- Verified shuttle stops, route order, and scheduled times extracted from the PDF.
- Validated walking or transfer links, if modelled.
- External route-duration/traffic estimates, only if a working provider is configured.
- Student reports with timestamps and evidence labels.
- User-entered quotes or travel estimates, clearly labelled as user-provided.
Comparison dimensions
For each option, show the fields that can actually be supported:
- Estimated journey duration or arrival time.
- Whether the option appears to meet the arrival deadline.
- Known fare or user-entered cost, if available.
- Number of transfers.
- Walking distance/time, if known.
- Evidence quality and important unknowns.
Do not create a fake numerical score that appears scientifically calibrated. If a simple ranking formula is used, document its inputs and keep the raw comparison visible.
AI explanation
The backend sends the LLM a compact, structured bundle containing candidate options, their known values, sources, timestamps, and missing fields. The model returns a short explanation that:
- Identifies the best-supported option or says that the evidence is insufficient to choose.
- Explains the main trade-off, such as lower cost versus less predictable arrival.
- Separates facts from estimates and user reports.
- Does not invent routes, road closures, fares, bus positions, or ETAs.
- Advises the student to verify time-sensitive details when necessary.
Example:
Option to consider: The shuttle is the lower-cost option, but its actual arrival is unverified. A mapped road journey appears to fit your deadline based on the current estimate, although its fare and pickup availability have not been verified in OnRoute. Compare the live quote before deciding.

This is an illustrative example, not a claim that those data sources are already connected.
AI failure behaviour
- If the LLM fails, show the structured comparison without the explanation.
- If a maps API fails, mark its estimate unavailable and continue with other supported options.
- If the route graph has no verified alternative, say so rather than inventing one.
- Keep API keys server-side and apply timeouts and response validation.
- Do not send names, emails, or unnecessary personal details to the model.
Keep the AI scope small
For a three-day build, one hosted LLM endpoint is enough. Skip custom model training, agents, and elaborate retrieval systems. The meaningful AI contribution is grounded explanation of a real comparison—not adding a chatbot merely to call the product AI-powered.
6. Working with sparse and uncertain data
The product must work when there are zero to five reports across a route, or none at all.
Evidence categories
Data	How to treat it
Schedule extracted from the PDF	Published/scheduled information; verify route names, stops, and times manually
External travel estimate	Estimate from the named provider at the time retrieved; not a guarantee
Student observation	A timestamped report from a user; may be mistaken or incomplete
User-entered fare or pickup estimate	A user-provided value; show when it was entered
Demo-only scenario	Simulated data used for testing; visibly label it as simulated


Report states
Label	Meaning
Unconfirmed	One report with no independent corroboration
Corroborated	At least one independent account supports the report within the chosen freshness window
Conflicting reports	Recent reports disagree
Stale	The report is outside the documented freshness window and no newer report replaces it


Corroboration means that accounts agree; it does not prove the claim. A lack of reports means unknown, not no disruption. A report saying “I haven't seen the bus” is evidence of that student's observation, not proof that the bus has been cancelled.
What the app does when data is missing
- No student reports: continue with the schedule and any available external estimates; show live shuttle status as unknown.
- No verified schedule: don't display a guessed scheduled time.
- No external traffic data: don't claim to know current traffic or road blockages.
- No public-transport data: don't recommend a specific public-transport connection.
- No reliable fare: show the cost as unknown and ask the student to check the service.
- Conflicting reports: surface the disagreement instead of silently choosing one.
- No feasible route found: explain that the current dataset does not support a recommendation.
Freshness windows should be configured and documented for the demo. Do not show numerical confidence probabilities unless they have been calibrated against real outcomes.
7. Data model
Keep the schema small. Add tables only for features actually implemented.
campuses
Column	Type	Notes
id	UUID	Primary key
name	text	
slug	text	
created_at	timestamp	


stops
Column	Type	Notes
id	UUID	Primary key
campus_id	UUID	FK to campuses
name	text	
latitude / longitude	numeric, nullable	Only if the coordinates are verified and needed for mapping
source_note	text	PDF/page or other source
is_active	boolean	


routes
Column	Type	Notes
id	UUID	Primary key
campus_id	UUID	FK to campuses
name	text	Route label from the source
source_note	text	Source and verification status


route_stops
Column	Type	Notes
id	UUID	Primary key
route_id	UUID	FK to routes
stop_id	UUID	FK to stops
stop_order	integer	Sequence on the route
scheduled_time	time, nullable	Only where supported by the PDF
service_day_note	text, nullable	If the source specifies different service days


reports
Column	Type	Notes
id	UUID	Primary key
campus_id	UUID	FK to campuses
stop_id	UUID	FK to stops
author_id	UUID	FK to authenticated profile
event_type	enum	bus_seen, not_seen, possible_disruption
note	text, nullable	Length-limited
created_at	timestamp	Server timestamp
status	enum	active, flagged, hidden


report_responses (optional if time allows)
Column	Type	Notes
id	UUID	Primary key
report_id	UUID	FK to reports
user_id	UUID	FK to profile
response_type	enum	corroborate, flag
created_at	timestamp	Server timestamp


Unique constraint on (report_id, user_id, response_type).
journey_queries (optional, store minimally)
For the hackathon, trip inputs can be processed without storing them. If persistence is necessary, store only the minimum fields needed for debugging and remove or aggregate records after the demo. Do not create a history of precise student movements by default.
Important constraints
- Enforce permissions in the database, not only the UI.
- Users cannot respond to their own reports.
- Apply basic rate limits and duplicate-report checks.
- Avoid collecting precise live location unless it is genuinely needed and the user explicitly consents.
- Do not store personal trip history by default.
- Keep moderation and audit access restricted.
8. Technical approach and integrations
Choose the stack the team can deliver with. A low-risk default:
Layer	Choice
Frontend	React + Vite + TypeScript; responsive and phone-first
Backend/database/auth	Supabase (PostgreSQL, managed authentication, row-level security)
Route logic	A small deterministic graph/search implementation over the curated route dataset
AI	One hosted LLM API called from a server-side function
Optional mapping	One map/routing provider, only after access, quota, billing, and response quality are tested
Deployment	Vercel or Netlify for the frontend; backend/serverless function as needed
Validation	Input validation, database constraints, and tests for route feasibility and report-state rules


Shuttle PDF processing
- Inspect the actual PDF first: determine whether the text is selectable, scanned, tabular, or image-based.
- Extract a limited subset of routes and stops for the MVP.
- Manually check route order and times against the source pages.
- Keep the PDF/page reference or source note with the imported data.
- If OCR or parsing is unreliable, enter the small demo dataset manually rather than trusting malformed extraction.
External data access
Before committing to a provider, test one representative origin/destination in Karachi and verify that the response includes the data the app needs. Check API access, billing, rate limits, attribution requirements, and terms of use. Do not assume that a website being publicly accessible means its data has an API available for the app.
- Maps/traffic: Potentially useful for road journey estimates if a working API is configured.
- Public transport: Use only verified route information; do not assume a complete live Karachi feed.
- Bykea/inDrive: Treat as user-checked options or manually entered quotes unless an authorized, working integration is confirmed.
- Road blockages: Do not claim detection without a source that actually supplies current closure information.
If Devmarketplace provides a relevant component, inspect its real capabilities and terms before using it. Do not invent integrations or claim that a component is available before checking.
Security basics
- Secrets live in environment variables or the platform's secret manager.
- LLM and maps calls happen server-side where required.
- Rate-limit expensive endpoints.
- Validate external API responses before using them in route calculations.
- Render user-submitted text safely.
- Label seeded and simulated data clearly.
9. Team readiness and roles
Assign roles according to actual teammate skills; do not assume expertise that has not been confirmed.
Role	Focus
Frontend / product owner	Journey inputs, option cards, explanation UI, mobile usability
Route/data owner	Parse and verify PDF data, model stops and routes, implement route graph and comparison logic
AI/integration owner	LLM explanation endpoint, optional maps integration, timeouts, data grounding and fallback
Integration/demo owner	Deployment, end-to-end testing, README, test scenarios, demo script


For a smaller team, combine AI with backend or route/data work. Agree on the data schema and API contracts early. One person must own the final integrated build and deployment.
Reuse strategy
- Use managed authentication and a managed database rather than building them from scratch.
- Reuse familiar UI components and official SDKs.
- Check the actual Devmarketplace catalogue and reuse only tools that can be tested in time.
- Avoid multiple LLM providers, elaborate agent frameworks, and unnecessary mapping libraries.
- Keep the demo small enough that the team can explain every major result.
10. Three-day execution plan (19–22 October)
Day 1, 19 October: route data and skeleton
- [ ] Inspect the shuttle PDF and choose a manageable route subset.
- [ ] Extract stops, route order, and schedule entries; manually verify them.
- [ ] Create the repository, app skeleton, and deployment.
- [ ] Define the route data schema and implement the basic route graph.
- [ ] Agree on request/response shapes and assign owners.
Exit condition: the app can load the curated route dataset and show the selected route/stop information.
Day 2, 20 October: working decision flow
- [ ] Build origin, destination, arrival deadline, and preference inputs.
- [ ] Generate a small set of feasible options from the route graph.
- [ ] Display supported schedule information, transfers, walking requirements, and unknown fields.
- [ ] Add the basic timestamped report flow if the core comparison works.
- [ ] Test invalid inputs, missing connections, and conflicting or stale reports.
Exit condition: a student can enter a journey and receive a transparent comparison based on actual seeded data.
Day 3, 21 October: AI explanation and optional integrations
- [ ] Add the LLM explanation over structured option results.
- [ ] Add a maps/traffic provider only if access and a real Karachi test are successful.
- [ ] Add user-entered ride-hailing quote fields if useful for the demo.
- [ ] Implement API failure and missing-data fallbacks.
- [ ] Test the full flow on a phone-sized layout, deploy, and write demo instructions.
Exit condition: the deployed app compares at least two supported options and explains the trade-offs without inventing facts. If the AI call fails, the comparison remains usable.
22 October: freeze and submit
- [ ] Freeze features and avoid last-minute architectural changes.
- [ ] Test the demo from a clean session.
- [ ] Check that every schedule, estimate, report, and simulated scenario is labelled correctly.
- [ ] Verify deployment, environment configuration, repository, documentation, and licence notices.
- [ ] Prepare a short demo with one normal journey and one disruption scenario.
11. Acceptance criteria
The MVP is ready to demonstrate when:
- [ ] A student can select an origin, destination, and arrival deadline.
- [ ] The app loads the curated shuttle route data and identifies feasible options from it.
- [ ] The app does not recommend an unmodelled transfer or invented route.
- [ ] Each option displays the values it can support and marks missing information as unknown.
- [ ] The app distinguishes scheduled information from real-time estimates and student reports.
- [ ] The decision logic produces a consistent comparison for the same inputs.
- [ ] The AI explanation refers only to the structured results and does not create unsupported routes, times, or prices.
- [ ] If the LLM or external API fails, the app shows a clear fallback rather than a fabricated answer.
- [ ] If reporting is implemented, reports persist with timestamps and conflicting reports remain visible as conflicting.
- [ ] A deployed demo and setup instructions are available.
12. Risks and validation
Risk	Mitigation
Too few student reports	The comparison works from route data without reports; reports are an additional evidence source
PDF is difficult to parse	Use a small manually curated subset and verify it against the source
Shuttle schedule is incomplete or outdated	Label source and verification status; do not imply live service status
No working maps API or quota	Keep the MVP usable with shuttle-only comparisons and clearly labelled missing data
Incomplete public-transport data	Do not recommend unsupported connections
No Bykea/inDrive API access	Ask the user to check the service and optionally enter the current quote
Road blockage data unavailable	Do not claim to detect current road closures
False or malicious student reports	Timestamps, independent corroboration, rate limits, flagging, and moderation reduce but do not eliminate risk
LLM hallucination or outage	Keep calculations deterministic, constrain the prompt/output, and provide a non-AI fallback
Scope grows too large	Deliver one end-to-end route comparison before adding providers or more routes
No university cooperation	Use student-first data collection and label sources without implying official endorsement


Before final submission, run a few short student interviews and validate the chosen routes with students who know them. Informal feedback is useful but is not a representative study. Record what was actually tested.
13. Implementation tasks / code gigs
Choose tasks that directly support the MVP and meet the event's actual submission rules. Candidate tasks, depending on what the Devmarketplace catalogue provides:
1. Route comparison utility: given a curated route graph and journey preferences, return feasible options and explicit unknowns. Include tests for missing connections and arrival deadlines.
2. Grounded AI explanation endpoint: accept structured option results, call one hosted LLM, validate the response, and return a safe fallback on failure.
If the event requires using already-published gigs rather than creating tasks, select the closest real, available ones after checking the catalogue. Do not invent gig names, availability, or integration claims.
14. Repository and submission checklist
Until kickoff, keep the repository documentation-only if the event rules require it. Do not commit implementation code before the permitted start time.

The final submission should include:
- [ ] Problem, primary user, impact hypotheses, and limitations.
- [ ] Concrete end-to-end user journey.
- [ ] Route data source and verification notes.
- [ ] Decision-engine approach and AI guardrails.
- [ ] Data model and architecture.
- [ ] Three-day plan, team roles, and acceptance criteria.
- [ ] Actual Devmarketplace components reused, if any, with accurate descriptions and licences.
- [ ] Deployment, demo instructions, known limitations, and any simulated-data labels.
15. Future direction (not part of the MVP)
If the NED pilot shows repeat usage and students find the recommendations useful, OnRoute could expand to more NED routes and later to other campuses. Possible future additions include better public-transport coverage, verified disruption feeds, and sponsor-funded incentives for useful reports. Institutional analytics or partnerships would require separate validation and should not be assumed.

Do not sell individual student travel histories. Do not make a critical transport decision depend on an unverified AI claim. The product should remain clear about the difference between a known fact, an estimate, a student observation, and something the system does not know.