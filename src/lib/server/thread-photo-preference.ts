export type ThreadPhotoChoice = 'inherit' | 'allow' | 'block';

export function allowsNsfwInThread(accountAllowsNsfw: boolean, choice: string): boolean {
	if (choice === 'allow') return true;
	if (choice === 'block') return false;
	return accountAllowsNsfw;
}

export function threadPhotoUrl(cfImageId: string, threadId: string, blurred = false): string {
	return `/api/photos/${encodeURIComponent(cfImageId)}?threadId=${encodeURIComponent(threadId)}${blurred ? '&preview=blurred' : ''}`;
}
