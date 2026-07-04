<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();

	function timeAgo(date: Date | string | null): string {
		if (!date) return '';
		const d = typeof date === 'string' ? new Date(date) : date;
		const diff = Math.floor((Date.now() - d.getTime()) / 1000);
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
		return d.toLocaleDateString();
	}
</script>

<div class="inbox-page">
	<h1>Inbox</h1>

	{#if data.threads.length === 0}
		<div class="empty">
			<p>No conversations yet.</p>
			<a href={resolve('/browse')}>Browse listings</a>
		</div>
	{:else}
		<ul class="thread-list">
			{#each data.threads as thread (thread.id)}
				<li class="thread-row {thread.unreadCount > 0 ? 'unread' : ''}">
					<a href={resolve(`/inbox/${thread.id}`)} class="thread-link">
						<div class="thread-top">
							<span class="listing-subject">{thread.listingSubject}</span>
							<span class="thread-time">{timeAgo(thread.lastMessageAt)}</span>
						</div>
						<div class="thread-mid">
							<span class="other-alias">{thread.otherAlias}</span>
						</div>
						<div class="thread-bottom">
							<span class="preview">{thread.lastMessagePreview || 'No messages yet'}</span>
							{#if thread.unreadCount > 0}
								<span class="unread-badge">{thread.unreadCount}</span>
							{/if}
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.inbox-page {
		max-width: 600px;
		margin-inline: auto;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 1.25rem;
	}

	.empty {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--pico-muted-color);
	}

	.empty a {
		display: inline-block;
		margin-top: 0.75rem;
	}

	.thread-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.thread-row {
		list-style: none;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		margin-bottom: 0.6rem;
		background: var(--pico-card-background-color);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
		transition: border-color 0.15s;
	}

	.thread-row.unread {
		border-color: var(--pico-primary);
	}

	.thread-link {
		display: block;
		padding: 1rem 1.125rem;
		text-decoration: none;
		color: inherit;
	}

	.thread-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 0.3rem;
	}

	.listing-subject {
		font-weight: 600;
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.thread-time {
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		flex-shrink: 0;
	}

	.thread-mid {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.35rem;
	}

	.other-alias {
		font-size: 0.8rem;
		color: var(--pico-muted-color);
	}

	.thread-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.preview {
		font-size: 0.825rem;
		color: var(--pico-muted-color);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.thread-row.unread .preview {
		color: var(--pico-color);
		font-weight: 500;
	}

	.unread-badge {
		background: var(--pico-primary);
		color: white;
		font-size: 0.7rem;
		font-weight: 600;
		min-width: 1.25rem;
		height: 1.25rem;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 0.3rem;
		flex-shrink: 0;
	}
</style>
