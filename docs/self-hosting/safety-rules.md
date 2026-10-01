# Safety screening rule revisions

The admin Safety screening rules page stores operator-authored JSON revisions in D1. This is separate from the relative-terms vocabulary used to explain listing language. A revision can be staged and reviewed before activation, and an older revision can be activated again. Stage and activate `[]` to disable all matching rules. Each change records an operator, time, and reason.

Each rule contains a stable `id`, a reviewer-facing `label`, an `intent`, a `falsePositiveRisk`, a `scope` (`message`, `listing`, or `both`), and at least two terms in `all`. Optional `none` terms exclude a match. Terms match whole words or phrases after Unicode normalization. This simple matcher can miss coded language and can flag harmless context; a match is a review signal, not a finding.

```json
[
	{
		"id": "example_review_1",
		"label": "Example combination",
		"intent": "Explain the specific concerning context this rule is meant to surface",
		"falsePositiveRisk": "Explain plausible harmless contexts that could match",
		"scope": "both",
		"all": ["example term one", "example term two"],
		"none": ["known harmless phrase"]
	}
]
```

The rule editor is a foundation for the screening and hold work tracked in issues #85 and #86. At this revision, activating rules does **not** scan or hold content. Operators should not treat an active revision as a working safety control until the screening and delivery gates are complete and tested. Rule edits affect future scans once those gates are in place; existing content is not automatically rescanned. Choose and review actual terms with the moderation owner and qualified counsel before enabling screening.
