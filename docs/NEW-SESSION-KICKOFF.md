# Kickoff prompt for the new session (festival guide project)

Paste everything below the line into the first message of a new Claude Code session, opened on the **cloned** workspace (never the original conference-app repos).

---

I'm building a multi-organizer festival guide app (Atlanta Pride, festival Oct 9, 2026; **target: submit to the Apple App Store Oct 2, 2026**). It is a **clone of my existing conference app**, in two repos: an Expo mobile app and a Next.js admin app sharing one Supabase project. The clone has its own new Supabase project, its own Vercel project and its own GitHub repos. Do not touch the original conference-app repos or their database.

Before doing anything else:
1. Read `docs/APP-OVERVIEW.md` in the admin repo completely. Parts 1–11 describe the system as it is; **Part 12 is the plan for this project** and records the decisions I have made (with the answered questions struck through). Part 12.7 has the schedule and the must-have list.
2. Read `AGENTS.md` and `CLAUDE.md` in each repo. Follow their rules (read the versioned Expo and Next.js docs before writing code; the admin repo owns the schema; a data feature is done only when migration, admin form and mobile screen all exist; typecheck, lint and tests must pass in both repos).
3. Check that this workspace really is the clone: confirm the repos' git remotes and the Supabase URL in the env files point at the **new** projects, not the conference app's. If they don't, stop and tell me.
4. Ask whether the remaining conference-app items (Part 11 known gaps: session editing, linking people to sessions in the admin, Contacts count, sponsor website field, confirming migration 0020) were finished before the clone was made. If not, they are the first work, in this clone.

How I work: I apply migrations myself by pasting SQL into the Supabase SQL editor, so give me each migration and wait for me to say it ran. Ask before deciding product behavior I haven't specified. Give me a short plan before large changes. Commit in small steps; I push (or tell me the command).

Still-open decisions from Part 12.6 you should ask me about when they come up: UI names for the new level and events; the onboarding-form location; whether a color per organizer is one color or a palette. Everything else in Part 12 is decided.
