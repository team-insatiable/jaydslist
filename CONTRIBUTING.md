# Contributing to Jaydslist

Jaydslist is a privacy-first, ad-free, open-source project. Core use should not depend on payment. The current supporter and photo allowance design is under review, so changes that expand paid gating need an explicit product decision.

## Report or propose work

Search [existing issues](https://github.com/team-insatiable/jaydslist/issues) before opening a new one. Choose the Bug report, Improvement, or Operator task form. Describe a single actionable outcome per issue. Use synthetic examples; never post credentials, account-bound Cloudflare values, private messages, phone numbers, or other people's personal data.

For access-control flaws, data exposure, or other security vulnerabilities, use [private vulnerability reporting](https://github.com/team-insatiable/jaydslist/security/advisories/new). Do not publish exploit details in a regular issue.

## How issues move

1. New issues receive `needs-triage`. A maintainer checks for duplicates, asks for missing details, and sets the type and priority.
2. `priority:beta-blocker` means beta should wait for a fix or an explicit risk decision. `priority:beta` means important beta work. `priority:later` means worthwhile but outside the current beta scope.
3. `ready` means the outcome and acceptance criteria are clear enough to start. `blocked` means a named dependency or decision prevents progress. Remove outdated status labels when the state changes.
4. Link pull requests with `Fixes #123` when they fully resolve an issue. Verify the result before closing an operator task. Use the Beta readiness milestone for work targeted at opening the beta.

The issue labels are a lightweight queue. A GitHub Project board can be added if the queue grows enough to need one.

## Pull requests

Keep changes focused. Explain the user-facing behavior, relevant privacy or self-hosting impact, and how you checked it. Run the relevant scripts from `package.json` before requesting review. Do not commit instance-specific configuration or secrets; `wrangler.jsonc` stays generic.
