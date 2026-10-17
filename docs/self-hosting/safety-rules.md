# Safety screening rule revisions

Keep your rules in `content/safety-rules.json` in your instance repository and copy it over `src/lib/instance-content/safety-rules.json` when building. The upstream file is an empty template; it is not an active rule set. The build validates the file and rejects unsupported schema versions, fields, or malformed rules. No application fork is needed.

The admin Safety screening rules page can load the deployed file or a JSON file from your device into the editor. Review it, enter a reason, stage it, and activate that revision with another reason. The active revision is stored in D1 with its author and history; a file change alone does not alter live screening. Older revisions remain available for rollback. This is separate from the relative-terms vocabulary used to explain listing language. Stage and activate an empty rules file only if you deliberately want to disable matching rules.

Each rule contains a stable `id`, a reviewer-facing `label`, an `intent`, a `falsePositiveRisk`, a `scope` (`message`, `listing`, or `both`), and at least two terms in `all`. Optional `none` terms exclude a match. Terms match whole words or phrases after Unicode normalization. This simple matcher can miss coded language and can flag harmless context; a match is a review signal, not a finding.

```json
{
	"schemaVersion": 1,
	"rules": [
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
}
```

Each new message and listing submission is screened against the active revision before delivery or publication. A matching submission is held for an administrator in Safety cases. If the active revision cannot be read, the submission is held for review. Clear submissions proceed immediately. The sender can see a held message marked as awaiting review; the recipient cannot see it in the thread, inbox preview, unread count, notification, or shared photo endpoints. A held listing is visible to its owner and hidden from everyone else. The reviewer records a reason when releasing or rejecting a case.

Rule edits affect future submissions and listing reactivations. Existing content is not automatically rescanned. Activate a reviewed rule revision before opening the instance to users; otherwise all new submissions enter the review queue. Choose actual terms with the moderation owner and qualified counsel. Keep a staffed queue and a review-time target, because a hold can last until an administrator acts. This file configures the supported combination matcher; a different algorithm or external screening provider still requires application support.
