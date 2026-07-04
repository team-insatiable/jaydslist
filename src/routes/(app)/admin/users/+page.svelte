<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let q = $state(data.q);
	let banReason = $state<Record<string, string>>({});
	let submitting = $state<string | null>(null);

	function timeAgo(date: Date | null): string {
		if (!date) return '';
		const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
		if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
		return `${Math.floor(s / 86400)}d ago`;
	}
</script>

<div>
	<h1>User Lookup</h1>

	<form method="GET" class="search-form">
		<input
			type="search"
			name="q"
			bind:value={q}
			placeholder="Search by email or alias…"
			autocomplete="off"
		/>
		<button type="submit">Search</button>
	</form>

	{#if form?.success}
		<div class="toast">Action completed.</div>
	{/if}

	{#if data.q && data.users.length === 0}
		<div class="empty">No users found for "{data.q}".</div>
	{:else if data.users.length > 0}
		<ul class="user-list">
			{#each data.users as u (u.id)}
				<li class="user-card">
					<div class="user-top">
						<div class="user-info">
							<span class="alias">{u.alias ?? '—'}</span>
							<span class="email">{u.email}</span>
						</div>
						<div class="user-badges">
							<span class="badge tier-{u.trustTier}">{u.trustTier}</span>
							{#if u.status === 'banned'}
								<span class="badge status-banned">Banned</span>
							{/if}
							{#if u.isSupporter}
								<span class="badge status-supporter">Supporter</span>
							{/if}
						</div>
					</div>
					<div class="user-meta">
						<span>{u.phoneVerified ? 'Phone verified' : 'Phone unverified'}</span>
						<span class="sep">·</span>
						<span>{u.activeListings} active listing{u.activeListings === 1 ? '' : 's'}</span>
						{#if u.createdAt}
							<span class="sep">·</span>
							<span>Joined {timeAgo(u.createdAt)}</span>
						{/if}
						<span class="sep">·</span>
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- /listings?userId= isn't a real route yet; tracked separately -->
						<a href="/listings?userId={u.id}" target="_blank" class="view-link">View listings</a>
					</div>

					<div class="user-actions">
						{#if u.status === 'banned'}
							<form
								method="POST"
								action="?/unban"
								use:enhance={() => {
									submitting = u.id + '_unban';
									return async ({ update }) => {
										submitting = null;
										await update();
										await invalidateAll();
									};
								}}
							>
								<input type="hidden" name="targetUserId" value={u.id} />
								<button
									type="submit"
									class="btn-unban"
									disabled={submitting !== null}
									aria-busy={submitting === u.id + '_unban'}
								>
									Unban
								</button>
							</form>
						{:else}
							<input
								id="ban-reason-{u.id}"
								type="text"
								class="ban-reason"
								placeholder="Ban reason"
								bind:value={banReason[u.id]}
							/>
							<form
								method="POST"
								action="?/ban"
								use:enhance={() => {
									submitting = u.id + '_ban';
									return async ({ update }) => {
										submitting = null;
										await update();
										await invalidateAll();
									};
								}}
							>
								<input type="hidden" name="targetUserId" value={u.id} />
								<input type="hidden" name="reason" value={banReason[u.id] ?? ''} />
								<button
									type="submit"
									class="btn-ban"
									disabled={submitting !== null}
									aria-busy={submitting === u.id + '_ban'}
								>
									Ban
								</button>
							</form>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	h1 {
		font-size: 1.3rem;
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.search-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.search-form input {
		flex: 1;
		margin: 0;
	}

	.search-form button {
		width: auto;
		margin: 0;
		padding: 0.5rem 1.25rem;
	}

	.toast {
		background: color-mix(in srgb, var(--pico-ins-color) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-ins-color) 30%, transparent);
		color: var(--pico-ins-color);
		padding: 0.6rem 1rem;
		border-radius: 8px;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.empty {
		text-align: center;
		padding: 2rem 1rem;
		color: var(--pico-muted-color);
		font-size: 0.9rem;
	}

	.user-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.user-card {
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		background: var(--pico-card-background-color);
		padding: 0.875rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.user-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.alias {
		font-size: 0.9rem;
		font-weight: 600;
	}

	.email {
		font-size: 0.78rem;
		color: var(--pico-muted-color);
	}

	.user-badges {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.badge {
		font-size: 0.68rem;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.tier-new {
		background: var(--pico-muted-background-color);
		color: var(--pico-muted-color);
	}
	.tier-established {
		background: color-mix(in srgb, #0891b2 12%, transparent);
		color: #0891b2;
	}
	.tier-trusted {
		background: color-mix(in srgb, #16a34a 12%, transparent);
		color: #16a34a;
	}
	.status-banned {
		background: color-mix(in srgb, var(--pico-del-color) 12%, transparent);
		color: var(--pico-del-color);
	}
	.status-supporter {
		background: color-mix(in srgb, var(--pico-primary) 12%, transparent);
		color: var(--pico-primary);
	}

	.user-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.78rem;
		color: var(--pico-muted-color);
	}

	.sep {
		opacity: 0.4;
	}

	.view-link {
		color: var(--pico-primary);
		text-decoration: none;
		font-size: 0.78rem;
	}

	.user-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.ban-reason {
		flex: 1;
		font-size: 0.8rem;
		margin: 0;
		padding: 0.35rem 0.65rem;
	}

	.user-actions form {
		margin: 0;
	}

	.user-actions button {
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.4rem 1rem;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		font-family: inherit;
		width: auto;
		margin: 0;
	}

	.btn-ban {
		background: color-mix(in srgb, var(--pico-del-color) 15%, transparent);
		color: var(--pico-del-color);
		border: 1px solid color-mix(in srgb, var(--pico-del-color) 30%, transparent);
	}

	.btn-unban {
		background: var(--pico-muted-background-color);
		color: var(--pico-muted-color);
		border: 1px solid var(--pico-muted-border-color);
	}
</style>
