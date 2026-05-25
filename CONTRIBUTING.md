# Contributing to AIF

Thanks for your interest in AIF. This document explains how to contribute effectively.

## Before you start

**Please read this first.** Contributions that skip these conventions will be closed without review.

- AIF is licensed under **AGPL-3.0**. By submitting a contribution, you agree that your code will be distributed under the same license.
- The **protocol specification** (in `protocol/`) is separate from the reference implementation. Changes to the spec require a separate RFC process — see [Protocol changes](#protocol-changes) below.
- This project is maintained by one person. Review may take time. Please be patient.

## What we need

Contributions are especially welcome in these areas:

| Area | Examples |
|---|---|
| **Protocol integrations** | AIF plugins for Obsidian, Raycast, Logseq, VS Code, IntelliJ |
| **Alternative agent-runners** | Python, Go, Rust implementations of the agent-runner that speaks to the same API |
| **AIF-compatible readers** | Mobile reader apps, CLI readers, terminal UIs |
| **Additional notification channels** | Telegram bot, Discord webhooks, SMS (Twilio), Matrix |
| **Bug fixes** | Typed, tested, with a reproduction in the PR description |
| **Docs improvements** | Clearer explanations, more examples, translations |
| **Protocol feedback** | Thoughtful issues about the spec — edge cases, ambiguities, proposals |

## What we don't need (yet)

- **Large architectural rewrites.** Propose first via an issue. Unsolicited rewrite PRs will be closed.
- **Dependency changes without rationale.** Don't swap libraries unless there's a clear reason.
- **Style-only PRs.** We don't have a formatter war to fight. Don't submit PRs that just reformat existing code.
- **Scope creep.** One PR = one logical change.

## How to contribute

### 1. Find or file an issue first

**Before writing code**, open an issue describing what you want to do. This saves everyone time — maintainers can flag if the idea doesn't fit, is already in progress, or has a simpler path.

Exceptions: typos, tiny doc fixes, and obvious one-line bug fixes can go straight to PR.

### 2. Fork and branch

```bash
# Fork via GitHub UI, then:
git clone https://github.com/YOUR_USERNAME/AIF.git
cd AIF/aif
git checkout -b feat/your-feature   # or fix/..., docs/..., chore/...
```

Branch naming:

- `feat/…` — new features
- `fix/…` — bug fixes
- `docs/…` — documentation only
- `chore/…` — tooling, refactors, non-user-facing

### 3. Set up locally

```bash
npm install
cp backend/.env.example backend/.env
cp publisher/.env.example publisher/.env
cp reader/.env.example reader/.env
# Fill in your Supabase keys (free tier works)

npm run dev:backend      # port 3001
npm run dev:publisher    # port 5173
npm run dev:reader       # port 5174
```

See [README.md](./README.md#run-locally) for the full setup.

### 4. Make your changes

Follow the conventions of the surrounding code. If you're editing a file, match its style. If you're creating a new file, match the style of similar files in the same workspace.

**Every PR must:**

- Pass `npm run typecheck` from the repo root
- Not add `any` types without justification
- Not introduce new runtime dependencies without discussion
- Not include commented-out code
- Not include debugging artifacts (`console.log`, `debugger`, etc.)
- Keep commits focused — one logical change per commit is ideal

### 5. Test your changes

- **Backend changes** — hit the affected endpoints with `curl` or Postman. Document the commands in your PR.
- **Frontend changes** — exercise the feature in a browser. Include a screenshot or short video in the PR.
- **Protocol changes** — validate with the zod schema in `shared/src/validator.ts`.
- **Agent-runner changes** — run `npx aif-agent test` against a real feed.

We don't have a test suite (yet). Manual testing is required until we do.

### 6. Commit

Use a clear, imperative-mood subject line under 72 characters:

```
Good:
  Add Telegram channel to notification engine
  Fix race condition in feed refresh scheduler
  Update README with AGPL relicense notes

Bad:
  updates
  Fixed bug
  WIP: working on notifications maybe
```

If the change needs explanation, include a body. Explain **why**, not **what** — the diff shows the what.

### 7. Open a pull request

Against the **`dev`** branch, not `main`. Include in the PR description:

- **What** the change does
- **Why** it's needed
- **How** it was tested
- **Screenshots** for UI changes
- **Linked issue** if applicable (`Closes #123`)

A maintainer will review. Expect feedback. Iterating is normal.

### 8. After merge

- Your contribution ships in the next release
- Your username goes into the git history and the contributors list
- You're welcome to contribute more

## Code style

We don't have a published style guide. Match the style of the code you're editing.

Rough conventions:

- **TypeScript strict mode.** No `any` unless genuinely necessary.
- **Functional React components** with hooks. No class components.
- **Tailwind utility classes** for styling. Extract to a component when repeated 3+ times.
- **Zod for validation** at system boundaries (API routes, config files).
- **pino for logging** in the backend. No `console.log` in production code paths.
- **No comments that restate the code.** Only comments that explain non-obvious *why*.
- **Small functions.** If it doesn't fit on a screen, refactor it.

## Protocol changes

Changes to the AIF protocol itself (the JSON format, the schema, the `<link>` tag convention) are different from code changes. They affect every tool that speaks AIF.

Process:

1. Open an issue with the tag `protocol` describing the proposed change
2. Explain the use case, the alternatives considered, and backward-compatibility implications
3. Wait for discussion — at minimum 7 days
4. If accepted, the maintainer opens a PR against `protocol/AIF-SPEC.md` with the change, a CHANGELOG entry, and a version bump proposal

Breaking changes require a major version bump (AIF 1.x → 2.0) and a migration plan.

## Security

**Do not open a public issue for security vulnerabilities.** Email the maintainer directly (see the GitHub profile) or use GitHub's private vulnerability reporting:

https://github.com/joym-gits/AIF/security/advisories/new

We aim to respond to security reports within 72 hours.

## Code of Conduct

Short version: **don't be a jerk.**

- Disagree with ideas, not people.
- Assume good faith.
- Criticism should be specific and actionable.
- Harassment, personal attacks, or discriminatory behaviour get you blocked from the project without warning.

If someone is behaving badly toward you, email the maintainer.

## Licensing of contributions

By contributing, you agree that:

1. Your contribution is your own work or you have permission to submit it.
2. Your contribution is licensed under **AGPL-3.0** (the project license).
3. You grant the project maintainer the right to distribute your contribution under AGPL-3.0 and any compatible future license.

No CLA (Contributor License Agreement) to sign. The license itself handles it.

## Questions?

- **General questions** — open a GitHub Discussion
- **Bug reports** — open an issue with a clear reproduction
- **Feature ideas** — open an issue with the `proposal` label
- **Protocol questions** — open an issue with the `protocol` label

Thank you for considering a contribution. Every star, issue, and PR helps AIF exist as public infrastructure.
