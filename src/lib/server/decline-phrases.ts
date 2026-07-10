export const DECLINE_PHRASES = [
	{
		id: 'not_looking',
		text: "Thanks for reaching out — not quite what I'm looking for right now.",
		hint: 'Closes this thread · listing stays active',
		nudgePause: false
	},
	{
		id: 'found_someone',
		text: "I've already connected with someone — best of luck!",
		hint: 'Closes this thread · suggests pausing your listing',
		nudgePause: true
	},
	{
		id: 'taking_break',
		text: "I appreciate the message but I'm taking a break.",
		hint: 'Closes this thread · suggests pausing your listing',
		nudgePause: true
	},
	{
		id: 'not_right_time',
		text: 'Not the right timing for me — thank you for reaching out.',
		hint: 'Closes this thread · listing stays active',
		nudgePause: false
	}
] as const;

export type DeclinePhraseId = (typeof DECLINE_PHRASES)[number]['id'];
