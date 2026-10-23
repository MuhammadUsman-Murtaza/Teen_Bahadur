# OnRoute — Phase 0: Foundation & Working Application

## 1. Your mission

You are working on **OnRoute**, a student shuttle-service application developed by Team Teen Bahadur.

Your task is to implement **Phase 0: the working application foundation** using the existing project, instructions, and Supabase database.

This is a time-sensitive submission. Prioritize a functional, connected, testable application over unnecessary complexity.

**Do not just give me a plan or mockup. Inspect the repository, implement the application, run the available checks, and report what actually works.**

## 2. Mandatory technology stack

- **Frontend:** React with Vite.
- **Language:** Follow the existing project conventions. Prefer TypeScript if already used; otherwise use the simplest compatible setup.
- **Backend and authentication:** Supabase.
- **Database:** Use the existing Supabase project and its existing schema.
- **Credentials:** Use the Secrets/environment-variable configuration provided by Devmarketplace.
- **Deployment:** Preserve and use the existing Devmarketplace deployment workflow.

Do not replace React + Vite with another framework. Do not replace Supabase with another backend, create a second database, or switch to mock data.

## 3. Phase 0 — inspect before changing anything

Before editing files:

1. Inspect the repository structure and identify the current application entry point.
2. Read and follow these project instructions if present:
   - `Instructions/agent.md`
   - `Instructions/skills.md`
   - `OnRoute/Spec.md`
3. Inspect the existing Supabase schema, configuration, installed dependencies, and current implementation.
4. Inspect which Secrets/environment variables are available through Devmarketplace. Do not reveal or print secret values.
5. Identify what already works and reuse it. Do not unnecessarily rebuild existing components or configuration.

If a file is missing, continue using the available repository instructions and report the missing file. Do not stop the entire task merely because an optional document is absent.

**Do not reset, recreate, or destructively modify the database. Do not run migrations or change the schema unless a change is demonstrably necessary and has been explained first.**

## 4. Use the existing Supabase schema exactly

The database is based on this SQL:

```sql
create table points (
  id serial primary key,
  number text unique not null
);

create table stops (
  id serial primary key,
  name text not null
);

create table point_stops (
  point_id int references points(id),
  stop_id int references stops(id),
  stop_order int not null,
  primary key (point_id, stop_id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  point_id int not null references points(id),
  stop_id int not null references stops(id),
  created_at timestamptz default now()
);

alter table points enable row level security;
alter table stops enable row level security;
alter table point_stops enable row level security;
alter table profiles enable row level security;

create policy "read points"
on points for select using (true);

create policy "read stops"
on stops for select using (true);

create policy "read point_stops"
on point_stops for select using (true);

create policy "own profile read"
on profiles for select using (auth.uid() = id);

create policy "own profile insert"
on profiles for insert with check (auth.uid() = id);

create policy "own profile update"
on profiles for update using (auth.uid() = id);
```

This is the schema reference. Inspect the live database and existing migration files before assuming that every statement needs to be executed again.

### Database rules

- `points.id` identifies a point; `points.number` is the human-readable point number.
- `stops.id` identifies a stop; `stops.name` is its display name.
- `point_stops` defines which stops belong to which points.
- `point_stops.stop_order` defines the sequence of stops for a point.
- `profiles.id` must equal the authenticated user's Supabase Auth UUID.
- `profiles.name` stores the student's username for this phase.
- `profiles.point_id` stores the selected point's actual database ID.
- `profiles.stop_id` stores the selected stop's actual database ID.
- `profiles.created_at` is managed by the database default.

**Do not invent columns or rename existing columns.** In particular, do not add a `username`, `email`, `password`, `route`, or `boarding_stop` column just because it sounds convenient.

Use `profiles.name` for the username in this phase. The email and password belong to Supabase Auth, not the `profiles` table.

Do not assume point numbers are integers. `points.number` is text.

## 5. Supabase credentials and Devmarketplace Secrets

Connect the frontend to the existing Supabase project using the credentials configured in Devmarketplace Secrets.

Use the existing secret names if they are already configured. If not, identify the exact required names and ask for missing values through the appropriate Secrets interface.

The frontend configuration will normally require:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or the appropriate Supabase publishable key supported by the project.

Use the naming convention already supported by the deployment environment when applicable.

Requirements:

1. Read credentials from environment variables, not hardcoded source files.
2. Configure the Supabase client in one reusable module.
3. Never print secret values in logs or include them in reports.
4. Never commit credentials to Git.
5. Never expose the Supabase `service_role` key or any privileged secret to browser-side code.
6. If a required secret is missing, report its name without revealing any secret values.
7. Verify the connection by performing safe, read-only queries against the existing tables.

Remember that Vite's `VITE_` variables are exposed to client-side code. Only the Supabase URL and publishable/anon key belong there.

Do not claim that Supabase is connected until a real query succeeds.

## 6. Required application features

### A. Authentication

Create a clean student sign-up and login experience.

**Sign-up fields:**
- Email address
- Username
- Password

Use Supabase Auth to create the account with the email and password.

Use `profiles.name` to store the chosen username. Validate required fields and show useful errors, including invalid email, weak password, duplicate username where safely enforceable, and existing email.

Do not store passwords in `profiles`, browser storage, or any custom database table.

Handle Supabase email confirmation correctly. If confirmation is required, show a clear message telling the student to confirm their email rather than falsely claiming they are already signed in.

### B. Student point and boarding-stop setup

After authentication, check whether the current user has a profile.

- If a profile exists, proceed to the profile page.
- If no profile exists, send the student to the onboarding page.

The onboarding form must contain:

1. A point selector populated from the real `points` table.
2. A boarding-stop selector populated from `point_stops` joined with `stops`, filtered to the selected point.

When a student changes the point, refresh the stop choices for that point and clear any previously selected stop that no longer belongs to it.

Display the point number using `points.number` and stop labels using `stops.name`.

Sort the stop options by `point_stops.stop_order` in ascending order.

Do not display every stop for every point. Only display stops associated with the selected point.

On submission, save the authenticated student's profile using:

- `id`: the current Supabase authenticated user's UUID
- `name`: the chosen username
- `point_id`: the selected point's database ID
- `stop_id`: the selected stop's database ID

Validate the selection and show loading, success, and error states.

Never create a profile for another user. Never use a hardcoded user ID.

### C. Student profile page

Create a working profile page that retrieves the current student's information from Supabase.

Display:

- Username
- Email from the authenticated Supabase user
- Selected point number
- Selected boarding-stop name

Use the real database relationships to resolve point and stop names. Do not display raw IDs as the primary user-facing labels.

Allow the student to edit their selected point and boarding stop using the same validated selection logic.

If the username can be changed, update the existing `profiles.name` field rather than creating a new column.

Provide a logout action that signs the user out through Supabase Auth.

### D. Main application page

Create a separate, functional main application page as the placeholder for future OnRoute features.

For Phase 0, include:

- OnRoute branding and a short, accurate description of the application.
- A simple navigation structure.
- A link to the student's profile.
- A logout action.
- A clear empty-state or placeholder section for future features.

Keep this page separate from the profile page. Do not invent complex functionality to fill the space.

### E. Routing and session handling

Implement appropriate routes for:

- Sign-up
- Login
- Student onboarding
- Student profile
- Main application page

Use protected routes where needed.

On page refresh, restore the Supabase authentication session correctly. Prevent logged-out users from accessing protected pages.

Prevent authenticated students with no profile from being sent into a broken or blank page. Send them to onboarding.

Prevent authenticated students who already have a profile from being unnecessarily forced through initial setup again.

Handle loading and error states instead of showing blank screens.

## 7. Security and data integrity

Use Supabase Auth and the existing Row Level Security policies.

- Students must only read and modify their own profile.
- The client must use the authenticated user's UUID.
- Do not disable RLS to make the app work.
- Do not use a service-role key in the frontend.
- Do not trust a selected stop merely because it appears in a dropdown.
- Ensure the selected stop belongs to the selected point, using the `point_stops` relationship.
- If the existing database policies or constraints do not enforce an essential security or integrity rule, identify the gap and propose the smallest safe fix.
- Do not silently make destructive or broad database-policy changes.

The existing `profiles` table requires `name`, `point_id`, and `stop_id`. Therefore, create the profile only after the student has selected a valid point and stop.

If profile creation fails after authentication succeeds, show a recoverable error and allow the authenticated student to retry onboarding. Do not create duplicate accounts or claim that profile creation succeeded when it failed.

## 8. Design and user experience

Make the application polished enough for a hackathon submission.

Use a consistent, modern, responsive design that works on desktop and mobile.

Include:

- Clear page hierarchy and navigation.
- Accessible form labels.
- Useful validation and error messages.
- Loading indicators.
- Empty states.
- Success feedback.
- Consistent buttons and input styling.

Reuse the existing design system, branding, and components if present.

Do not spend excessive time on decorative animations or complex visual effects. Working features and reliable data flow come first.

## 9. Explicitly out of scope

Do not build any of the following in Phase 0:

- Bus-driver accounts or driver dashboards.
- GPS or live vehicle tracking.
- Maps or real-time ETAs.
- Payments.
- Notifications.
- Reports or analytics dashboards.
- Administrative panels.
- Unrequested database tables or features.
- Fake API responses or mock student data presented as real.
- A replacement backend or database.

Do not add extra features simply because you think they might be useful later.

## 10. Implementation and verification

After inspecting the project, implement the required features using the existing codebase and conventions.

Then perform the following checks where the environment allows:

1. Install or verify the required dependencies.
2. Run the existing lint, type-check, and build scripts where available.
3. Verify the Supabase client initializes using configured Secrets.
4. Verify points and stop options are retrieved from the actual database.
5. Verify stop choices change when a different point is selected.
6. Verify a new student can sign up and follow the correct email-confirmation flow.
7. Verify login and logout.
8. Verify onboarding creates a profile with the correct Auth UUID and selected database IDs.
9. Verify the profile page displays the saved username, point number, stop name, and authenticated email.
10. Verify the profile persists after refreshing.
11. Verify a user without a profile can recover from onboarding errors.
12. Verify users cannot access each other's profiles.
13. Verify the main application page and navigation work.
14. Check for console errors, broken routes, and missing environment configuration.

Do not fabricate test results. If a check requires a real account, unavailable secret, deployment permission, or manual browser interaction, clearly state what remains unverified.

Do not use a real student's private account or expose credentials in testing.

## 11. Final report

When implementation is complete, provide a concise report with:

1. Features implemented.
2. Files created or modified.
3. Supabase connection status based on actual verification.
4. Build and test results.
5. Any missing Secrets or configuration steps.
6. Any database changes made, with the reason for each.
7. Any remaining blockers that could prevent submission.
8. The deployed preview URL or deployment status, if available.

Separate **verified working**, **implemented but not fully tested**, and **blocked** items.

Do not claim completion if the application is only a visual mockup or if the backend is not connected.

## Final instruction

Start by inspecting the existing repository, instructions, schema, and Devmarketplace Secrets. Then implement Phase 0 using React + Vite and the existing Supabase backend.

**Keep the scope small. Preserve the database. Connect real data. Finish the essential student workflow. Test it. Report the truth.**
