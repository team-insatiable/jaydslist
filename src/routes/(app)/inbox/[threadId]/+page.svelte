<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';

	let { data } = $props();

	let body = $state('');
	let sending = $state(false);
	let sendError = $state('');
	let exchangeWorking = $state(false);
	let showReportMenu = $state(false);
	let reportCategory = $state('');
	let reportDetail = $state('');
	let reportSubmitting = $state(false);
	let reportDone = $state(false);

	let photoId = $state<string | null>(null);
	let photoPreviewUrl = $state<string | null>(null);
	let photoUploading = $state(false);
	let photoError = $state('');
	let fileInputEl = $state<HTMLInputElement | null>(null);

	const minLength = $derived(data.minLength);

	async function handleFileSelect(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) { photoError = 'Only image files are supported'; return; }
		if (file.size > 10 * 1024 * 1024) { photoError = 'Image must be under 10MB'; return; }

		photoError = '';
		photoUploading = true;
		try {
			const urlRes = await fetch('/api/photos/upload-url', { method: 'POST' });
			if (!urlRes.ok) throw new Error('Failed to get upload URL');
			const { uploadUrl, id, deliveryUrl } = await urlRes.json() as { uploadUrl: string; id: string; deliveryUrl: string };

			const form = new FormData();
			form.append('file', file);
			const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form });
			if (!uploadRes.ok) throw new Error('Upload failed');

			photoId = id;
			photoPreviewUrl = deliveryUrl;
		} catch {
			photoError = 'Photo upload failed. Try again.';
		} finally {
			photoUploading = false;
		}
	}

	function clearPhoto() {
		photoId = null;
		photoPreviewUrl = null;
		photoError = '';
		if (fileInputEl) fileInputEl.value = '';
	}

	function triggerFilePicker() {
		fileInputEl?.click();
	}

	function formatTime(date: Date | string | null): string {
		if (!date) return '';
		const d = typeof date === 'string' ? new Date(date) : date;
		const diff = Math.floor((Date.now() - d.getTime()) / 1000);
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	let messagesEl: HTMLElement;

	async function scrollToBottom() {
		await tick();
		if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	$effect(() => {
		data.messages;
		scrollToBottom();
	});
</script>

<div class="thread-page">
	<header class="thread-header">
		<a href="/inbox" class="back-link" aria-label="Back to inbox">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="15 18 9 12 15 6"></polyline>
			</svg>
		</a>
		<div class="thread-header-info">
			<a href="/listings/{data.thread.listingId}" class="listing-link">{data.thread.listingSubject}</a>
			<span class="other-alias">{data.otherAlias}</span>
		</div>
		<button class="more-btn" onclick={() => showReportMenu = !showReportMenu} type="button" aria-label="Report user">
			<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
		</button>
	</header>

	{#if showReportMenu}
		<div class="report-panel">
			{#if reportDone}
				<p class="report-done">Report submitted. Our moderation team will review it.</p>
			{:else}
				<p class="report-panel-title">Report {data.otherAlias}</p>
				<form method="POST" action="?/report" use:enhance={() => {
					reportSubmitting = true;
					return async ({ result, update }) => {
						reportSubmitting = false;
						if (result.type === 'success') { reportDone = true; }
						await update();
					};
				}}>
					<input type="hidden" name="targetUserId" value={data.otherUserId} />
					<select name="category" bind:value={reportCategory} required>
						<option value="" disabled>Select a reason…</option>
						<option value="harassment">Harassment</option>
						<option value="spam">Spam</option>
						<option value="fake_profile">Fake profile</option>
						<option value="explicit_content">Unsolicited explicit content</option>
						<option value="unsolicited_dm">Unsolicited DM pattern</option>
						<option value="other">Other</option>
					</select>
					<textarea name="detail" bind:value={reportDetail} placeholder="Additional details (optional)" rows="2"></textarea>
					<div class="report-actions">
						<button type="button" class="report-cancel" onclick={() => showReportMenu = false}>Cancel</button>
						<button type="submit" class="report-submit" disabled={!reportCategory || reportSubmitting} aria-busy={reportSubmitting}>
							Submit report
						</button>
					</div>
				</form>
			{/if}
		</div>
	{/if}

	<div class="messages" bind:this={messagesEl}>
		{#if data.messages.length === 0}
			<p class="no-messages">No messages yet. Say hello!</p>
		{:else}
			{#each data.messages as msg (msg.id)}
				<div class="bubble-wrap {msg.isMine ? 'mine' : 'theirs'}">
					<div class="bubble" class:bubble-photo={msg.cfImageUrl}>
						{#if msg.cfImageUrl}
							<img class="msg-photo" src={msg.cfImageUrl} alt="" loading="lazy" />
						{/if}
						{#if msg.body}
							<p class="bubble-body">{msg.body}</p>
						{/if}
					</div>
					<div class="bubble-meta">
						<span>{formatTime(msg.sentAt)}</span>
						{#if msg.isMine && data.isSupporter && msg.readAt}
							<span class="seen">Seen</span>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Key Exchange -->
	{#if data.thread.status === 'open'}
		{#if data.exchange?.status === 'accepted'}
			<div class="exchange-card accepted">
				<div class="exchange-card-head">
					<span class="exchange-label">{data.otherAlias}'s contact info</span>
					<form method="POST" action="?/revokeExchange" use:enhance={() => { exchangeWorking = true; return async ({ update }) => { exchangeWorking = false; await update(); }; }}>
						<button type="submit" class="revoke-btn" disabled={exchangeWorking}>Revoke</button>
					</form>
				</div>
				{#if data.theirContact}
					<div class="contact-list">
						{#if data.theirContact.phone}
							<a class="contact-row" href="tel:{data.theirContact.phone}">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
								<span>{data.theirContact.phone}</span>
							</a>
						{/if}
						{#if data.theirContact.email}
							<a class="contact-row" href="mailto:{data.theirContact.email}">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
								<span>{data.theirContact.email}</span>
							</a>
						{/if}
					</div>
				{/if}
			</div>
		{:else if data.exchange?.status === 'offered' && data.exchange.iAmOffering}
			<div class="exchange-card pending">
				<span class="exchange-label">Waiting for {data.otherAlias} to accept your contact request</span>
				<form method="POST" action="?/revokeExchange" use:enhance={() => { exchangeWorking = true; return async ({ update }) => { exchangeWorking = false; await update(); }; }}>
					<button type="submit" class="revoke-btn" disabled={exchangeWorking}>Cancel</button>
				</form>
			</div>
		{:else if data.exchange?.status === 'offered' && !data.exchange.iAmOffering}
			<div class="exchange-card incoming">
				<div class="exchange-incoming-head">
					<svg class="exchange-incoming-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
					</svg>
					<div>
						<p class="exchange-label"><strong>{data.otherAlias}</strong> wants to share contact info</p>
						<p class="exchange-hint">Accept to reveal each other's verified phone &amp; email.</p>
					</div>
				</div>
				<div class="exchange-actions">
					<form method="POST" action="?/acceptExchange" use:enhance={() => { exchangeWorking = true; return async ({ update }) => { exchangeWorking = false; await update(); }; }}>
						<button type="submit" class="accept-btn" disabled={exchangeWorking}>Accept</button>
					</form>
					<form method="POST" action="?/declineExchange" use:enhance={() => { exchangeWorking = true; return async ({ update }) => { exchangeWorking = false; await update(); }; }}>
						<button type="submit" class="decline-btn" disabled={exchangeWorking}>Decline</button>
					</form>
				</div>
			</div>
		{:else if data.eligible}
			<div class="exchange-offer">
				<svg class="exchange-offer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
				</svg>
				<div class="exchange-offer-body">
					<span class="exchange-offer-title">Ready to connect?</span>
					<span class="exchange-offer-hint">Share verified phone &amp; email — both parties must accept</span>
				</div>
				<form method="POST" action="?/offerExchange" use:enhance={() => { exchangeWorking = true; return async ({ update }) => { exchangeWorking = false; await update(); }; }}>
					<button type="submit" class="offer-btn" disabled={exchangeWorking}>
						Share info
					</button>
				</form>
			</div>
		{/if}
	{/if}

	{#if data.thread.status === 'open'}
		<form
			class="compose"
			method="POST"
			action="?/send"
			use:enhance={() => {
				sending = true;
				sendError = '';
				return async ({ result, update }) => {
					sending = false;
					if (result.type === 'success') {
						body = '';
						clearPhoto();
						await update();
					} else if (result.type === 'failure') {
						sendError = (result.data?.error as string) ?? 'Failed to send';
					}
				};
			}}
		>
			{#if photoId}
				<input type="hidden" name="cfImageId" value={photoId} />
			{/if}
			{#if sendError}
				<p class="send-error">{sendError}</p>
			{/if}
			{#if photoPreviewUrl}
				<div class="photo-preview">
					<img src={photoPreviewUrl} alt="" />
					<button type="button" class="photo-remove" onclick={clearPhoto} aria-label="Remove photo">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
			{/if}
			{#if photoError}
				<p class="send-error">{photoError}</p>
			{/if}
			<div class="compose-row">
				<input
					type="file"
					accept="image/*"
					class="file-input"
					bind:this={fileInputEl as HTMLInputElement}
					onchange={handleFileSelect}
					disabled={sending || photoUploading}
					aria-label="Attach photo"
				/>
				<button
					type="button"
					class="photo-btn"
					onclick={triggerFilePicker}
					disabled={sending || photoUploading || !!photoId}
					aria-label="Attach photo"
					aria-busy={photoUploading}
				>
					{#if photoUploading}
						<span class="spinner"></span>
					{:else}
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
							<polyline points="21 15 16 10 5 21"/>
						</svg>
					{/if}
				</button>
				<textarea
					name="body"
					bind:value={body}
					placeholder="Write your message…"
					rows="3"
					disabled={sending}
				></textarea>
				<button
					type="submit"
					aria-busy={sending}
					disabled={sending || photoUploading || (!photoId && body.trim().length < minLength)}
				>
					{#if !sending}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="22" y1="2" x2="11" y2="13"></line>
							<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
						</svg>
					{/if}
				</button>
			</div>
			{#if !photoId}
				<div class="char-count {body.trim().length < minLength ? 'short' : 'ok'}">
					{body.trim().length}/{minLength} min
				</div>
			{/if}
		</form>
	{:else}
		<div class="thread-closed">This conversation is closed.</div>
	{/if}
</div>

<style>
	.thread-page {
		max-width: 640px;
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		height: calc(100dvh - 120px);
	}

	.thread-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0 0.75rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
		flex-shrink: 0;
	}

	.back-link {
		color: var(--pico-muted-color);
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.thread-header-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.more-btn {
		background: none;
		border: none;
		padding: 0.25rem;
		color: var(--pico-muted-color);
		cursor: pointer;
		display: flex;
		align-items: center;
		flex-shrink: 0;
		margin-left: auto;
	}

	.more-btn:hover { color: var(--pico-color); }

	.report-panel {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		padding: 1rem;
		margin-bottom: 0.5rem;
		flex-shrink: 0;
	}

	.report-panel-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
	}

	.report-panel select, .report-panel textarea {
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.report-panel textarea { resize: vertical; }

	.report-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.report-cancel {
		background: none;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 6px;
		padding: 0.4rem 1rem;
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		cursor: pointer;
		font-family: inherit;
		width: auto;
		margin: 0;
	}

	.report-submit {
		background: color-mix(in srgb, var(--pico-del-color) 15%, transparent);
		color: var(--pico-del-color);
		border: 1px solid color-mix(in srgb, var(--pico-del-color) 30%, transparent);
		border-radius: 6px;
		padding: 0.4rem 1rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		width: auto;
		margin: 0;
	}

	.report-done {
		font-size: 0.8rem;
		color: var(--pico-ins-color);
	}

	.listing-link {
		font-weight: 600;
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-decoration: none;
		color: var(--pico-primary);
	}

	.other-alias {
		font-size: 0.775rem;
		color: var(--pico-muted-color);
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.no-messages {
		text-align: center;
		color: var(--pico-muted-color);
		font-size: 0.875rem;
		margin: auto;
	}

	.bubble-wrap {
		display: flex;
		flex-direction: column;
		max-width: 78%;
	}

	.bubble-wrap.mine {
		align-self: flex-end;
		align-items: flex-end;
	}

	.bubble-wrap.theirs {
		align-self: flex-start;
		align-items: flex-start;
	}

	.bubble {
		padding: 0.6rem 0.875rem;
		border-radius: 16px;
		font-size: 0.9rem;
		line-height: 1.45;
		word-break: break-word;
	}

	.bubble-wrap.mine .bubble {
		background: var(--pico-primary);
		color: white;
		border-bottom-right-radius: 4px;
	}

	.bubble-wrap.theirs .bubble {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-bottom-left-radius: 4px;
	}

	.bubble-body {
		margin: 0;
		white-space: pre-wrap;
	}

	.bubble-photo {
		padding: 0.25rem;
	}

	.msg-photo {
		display: block;
		max-width: 240px;
		max-height: 300px;
		border-radius: 12px;
		object-fit: cover;
	}

	.bubble-photo .bubble-body {
		padding: 0.35rem 0.65rem 0.5rem;
	}

	.bubble-meta {
		display: flex;
		gap: 0.4rem;
		font-size: 0.7rem;
		color: var(--pico-muted-color);
		margin-top: 0.2rem;
		padding: 0 0.25rem;
	}

	.seen {
		color: var(--pico-primary);
	}

	.compose {
		flex-shrink: 0;
		padding-top: 0.75rem;
		border-top: 1px solid var(--pico-muted-border-color);
	}

	.send-error {
		font-size: 0.8rem;
		color: var(--pico-del-color);
		margin-bottom: 0.5rem;
	}

	.photo-preview {
		position: relative;
		display: inline-block;
		margin-bottom: 0.5rem;
	}

	.photo-preview img {
		max-width: 120px;
		max-height: 120px;
		border-radius: 8px;
		object-fit: cover;
		display: block;
		border: 1px solid var(--pico-muted-border-color);
	}

	.photo-remove {
		position: absolute;
		top: -6px;
		right: -6px;
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 50%;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		margin: 0;
		color: var(--pico-muted-color);
	}

	.file-input {
		display: none;
	}

	.photo-btn {
		flex-shrink: 0;
		width: 2.75rem;
		height: 2.75rem;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		margin: 0;
		background: var(--pico-muted-background-color);
		border: 1px solid var(--pico-muted-border-color);
		color: var(--pico-muted-color);
		cursor: pointer;
	}

	.photo-btn:hover:not(:disabled) {
		color: var(--pico-primary);
		border-color: var(--pico-primary);
	}

	.photo-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid var(--pico-muted-border-color);
		border-top-color: var(--pico-primary);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		display: block;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	.compose-row {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
	}

	.compose-row textarea {
		flex: 1;
		resize: none;
		margin: 0;
		font-size: 0.9rem;
	}

	.compose-row > button[type="submit"] {
		flex-shrink: 0;
		width: 2.75rem;
		height: 2.75rem;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		margin: 0;
	}

	.char-count {
		font-size: 0.7rem;
		margin-top: 0.25rem;
		text-align: right;
	}

	.char-count.short {
		color: var(--pico-muted-color);
	}

	.char-count.ok {
		color: var(--pico-ins-color);
	}

	.thread-closed {
		text-align: center;
		padding: 1rem;
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		border-top: 1px solid var(--pico-muted-border-color);
		flex-shrink: 0;
	}

	/* Key exchange */
	.exchange-card,
	.exchange-offer {
		flex-shrink: 0;
		margin: 0.5rem 0;
		border-radius: 10px;
		padding: 0.875rem 1rem;
		font-size: 0.85rem;
	}

	.exchange-card.accepted {
		background: color-mix(in srgb, var(--pico-primary) 5%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-primary) 20%, transparent);
	}

	.exchange-card.pending {
		background: color-mix(in srgb, var(--pico-primary) 6%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-primary) 20%, transparent);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.exchange-card.incoming {
		background: color-mix(in srgb, var(--pico-primary) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-primary) 35%, transparent);
	}

	.exchange-incoming-head {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.exchange-incoming-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		color: var(--pico-primary);
		margin-top: 0.1rem;
	}

	.exchange-card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.exchange-label {
		font-weight: 500;
		color: var(--pico-color);
	}

	.exchange-hint {
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		margin: 0.15rem 0 0;
	}

	.contact-list {
		margin-top: 0.6rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.contact-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--pico-color);
		text-decoration: none;
	}

	.contact-row:hover {
		color: var(--pico-primary);
		text-decoration: none;
	}

	.contact-row svg {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
		color: var(--pico-primary);
		opacity: 0.8;
	}

	.exchange-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.exchange-actions form { margin: 0; }

	.accept-btn {
		background: var(--pico-primary);
		color: white;
		border: none;
		padding: 0.45rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		margin: 0;
	}

	.accept-btn:hover:not(:disabled) {
		background: var(--pico-primary-hover);
	}

	.decline-btn {
		background: transparent;
		color: var(--pico-color);
		border: 1px solid color-mix(in srgb, var(--pico-primary) 40%, transparent);
		padding: 0.45rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;
		cursor: pointer;
		margin: 0;
	}

	.decline-btn:hover:not(:disabled) {
		border-color: var(--pico-primary);
	}

	.revoke-btn {
		background: transparent;
		color: var(--pico-del-color);
		border: 1px solid color-mix(in srgb, var(--pico-del-color) 40%, transparent);
		padding: 0.3rem 0.75rem;
		border-radius: 6px;
		font-size: 0.8rem;
		cursor: pointer;
		margin: 0;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.exchange-offer {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: color-mix(in srgb, var(--pico-primary) 5%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-primary) 25%, transparent);
		border-radius: 10px;
		padding: 0.875rem 1rem;
		margin: 0.5rem 0;
	}

	.exchange-offer-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		color: var(--pico-primary);
		opacity: 0.8;
	}

	.exchange-offer-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.exchange-offer-title {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--pico-color);
	}

	.exchange-offer form { margin: 0; flex-shrink: 0; }

	.offer-btn {
		background: var(--pico-primary);
		color: white;
		border: none;
		padding: 0.4rem 0.875rem;
		border-radius: 6px;
		font-size: 0.825rem;
		cursor: pointer;
		white-space: nowrap;
		margin: 0;
	}

	.offer-btn:hover:not(:disabled) {
		background: var(--pico-primary-hover);
	}

	.exchange-offer-hint {
		font-size: 0.75rem;
		color: var(--pico-muted-color);
	}
</style>
