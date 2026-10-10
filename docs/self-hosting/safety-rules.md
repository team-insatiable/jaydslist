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

Each new message and listing submission is screened against the active revision before delivery or publication. A matching submission is held for an administrator in Safety cases. If the active revision cannot be read, the submission is held for review. Clear submissions proceed immediately. The sender can see a held message marked as awaiting review; the recipient cannot see it in the thread, inbox preview, unread count, notification, or shared photo endpoints. A held listing is visible to its owner and hidden from everyone else. The reviewer records a reason when releasing or rejecting a case.

Rule edits affect future submissions and listing reactivations. Existing content is not automatically rescanned. Activate a reviewed rule revision before opening the instance to users; otherwise all new submissions enter the review queue. Choose actual terms with the moderation owner and qualified counsel. Keep a staffed queue and a review-time target, because a hold can last until an administrator acts.
