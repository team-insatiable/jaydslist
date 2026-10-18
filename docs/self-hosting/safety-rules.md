# Content Safety rule revisions

Keep your rules in `content/safety-rules.json` in your instance repository and copy it over `src/lib/instance-content/safety-rules.json` when building. The upstream file is an empty template; it is not an active rule set. The build validates the file and rejects unsupported schema versions, fields, or malformed rules. No application fork is needed.

The admin Content Safety rules page can load the deployed file or a JSON file from your device. It presents sections, queues, matching conditions, intent, and false-positive notes in a readable review. Raw JSON editing is available under **Edit raw JSON (advanced)**. Review the rules, enter a reason, stage them, and activate the staged revision with another reason. The active revision is stored in D1 with its author and history; a file change alone does not alter live screening. Older revisions remain available for rollback. This is separate from the relative-terms vocabulary used to explain listing language. Stage and activate an empty rules file only if you deliberately want to disable matching rules.

The version 2 file groups rules into named sections. A section sends matches to the `urgent`, `solicitation`, or `general` review view. A submission matching several rules creates one case, with all matched sections recorded; the highest-priority view wins (`urgent` before `solicitation` before `general`). Scanner failures use the `system` view. User reports appear in the same Review inbox as a separate source. The existing relative-terms vocabulary and photo screening are separate features.

Each rule contains a stable `id`, a reviewer-facing `label`, an `intent`, a `falsePositiveRisk`, a `scope` (`message`, `listing`, or `both`), and at least two terms in `all`. Alternatively, use one required term in `all` with one or more alternatives in `any`. Optional `withinWords` (2–100) requires the matched terms to fit within that many words. Optional `none` terms exclude a match anywhere in the submission. Terms match whole words or phrases after Unicode normalization. A match is a review signal, not a finding.

```json
{
	"schemaVersion": 2,
	"sections": [
		{
			"id": "commercial_sex_solicitation",
			"label": "Commercial sex solicitation",
			"queue": "solicitation",
			"rules": [
				{
					"id": "example_review_1",
					"label": "Example combination",
					"intent": "Explain the specific concerning context this rule is meant to surface",
					"falsePositiveRisk": "Explain plausible harmless contexts that could match",
					"scope": "both",
					"all": ["example term one"],
					"any": ["example term two", "alternative phrase"],
					"withinWords": 12
				}
			]
		}
	]
}
```

Each new message and listing submission is screened against the active revision before delivery or publication. A matching submission is held for an administrator in the Review inbox and Safety cases. If the active revision cannot be read, the submission is held in the system view. Clear submissions proceed immediately. The sender can see a held message marked as awaiting review; the recipient cannot see it in the thread, inbox preview, unread count, notification, or shared photo endpoints. A held listing is visible to its owner and hidden from everyone else. The reviewer records a reason when releasing or rejecting a case.

Rule edits affect future submissions and listing reactivations. Existing content is not automatically rescanned. Older flat rule revisions remain readable and route to the general view. Activate a reviewed rule revision before opening the instance to users; otherwise all new submissions enter the system review view. Choose actual terms with the moderation owner and qualified counsel. Keep a staffed queue and a review-time target, because a hold can last until an administrator acts. The structured matcher does not understand intent, negation, or coded language it was not configured to recognize. A different algorithm or external screening provider still requires application support.
