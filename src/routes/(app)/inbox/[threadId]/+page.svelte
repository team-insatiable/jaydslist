<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';

	$effect(() => {
		if (!browser) return;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});

	$effect(() => {
		if (!browser) return;
		let interval: ReturnType<typeof setInterval>;

		const poll = () => {
			if (!document.hidden) {
				fetch(`/api/threads/${data.thread.id}/presence`, { method: 'POST' }).catch(() => {});
				invalidate('app:thread');
				invalidate('app:inbox');
			}
		};

		function onVisible() {
			if (!document.hidden) {
				poll();
				clearInterval(interval);
				interval = setInterval(poll, 3000);
			}
		}

		interval = setInterval(poll, 3000);
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});

	let { data } = $props();

	let body = $state('');
	let sending = $state(false);

	// Typing indicators — broadcast own typing via KV, display other party's state via poll
	let typingTimer: ReturnType<typeof setTimeout> | null = null;

	function broadcastTyping() {
		// All users broadcast; only supporters see the result (gated server-side)
		if (data.thread.status !== 'open') return;
		fetch(`/api/threads/${data.thread.id}/typing`, { method: 'POST' }).catch(() => {});
		if (typingTimer) clearTimeout(typingTimer);
		typingTimer = setTimeout(() => {
			typingTimer = null;
		}, 2000);
	}
	let sendError = $state('');
	let exchangeWorking = $state(false);
	let showReportMenu = $state(false);
	let blockConfirm = $state(false);
	let blockWorking = $state(false);

	// Decline flow (poster-only)
	let declineOpen = $state(false);
	let declineWorking = $state(false);
	let pauseNudge = $state(false);
	let pauseWorking = $state(false);
	let pauseDone = $state(false);

	const DECLINE_PHRASES = [
		{
			id: 'not_looking',
			text: "Thanks for reaching out — not quite what I'm looking for right now.",
			hint: 'Closes this thread · listing stays active'
		},
		{
			id: 'found_someone',
			text: "I've already connected with someone — best of luck!",
			hint: 'Closes this thread · suggests pausing your listing'
		},
		{
			id: 'taking_break',
			text: "I appreciate the message but I'm taking a break.",
			hint: 'Closes this thread · suggests pausing your listing'
		},
		{
			id: 'not_right_time',
			text: 'Not the right timing for me — thank you for reaching out.',
			hint: 'Closes this thread · listing stays active'
		}
	];
	let reportCategory = $state('');
	let reportDetail = $state('');
	let reportSubmitting = $state(false);
	let reportDone = $state(false);

	let lightboxUrl = $state<string | null>(null);

	let photoId = $state<string | null>(null);
	let photoPreviewUrl = $state<string | null>(null);
	let photoUploading = $state(false);
	let photoError = $state('');
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let formEl = $state<HTMLFormElement | null>(null);

	// Media panel
	let mediaOpen = $state(false);
	let expiryType = $state<'none' | 'view_once' | '10min' | '60min' | '24hr'>('none');
	let vaultPhotos = $state<
		{ id: string; cfImageId: string; deliveryUrl: string; albumId: string | null }[]
	>([]);
	let vaultAlbums = $state<
		{ id: string; name: string; coverUrl: string | null; photoCount: number }[]
	>([]);
	let vaultLoading = $state(false);
	let selectedVaultPhotos = $state<{ cfImageId: string; deliveryUrl: string }[]>([]);
	let selectedAlbum = $state<{ id: string; name: string; coverUrl: string | null } | null>(null);
	let albumExpiryOpen = $state(false);

	const EXPIRY_LABELS: Record<string, string> = {
		none: 'Indefinitely',
		view_once: 'View once',
		'10min': '10 minutes',
		'60min': '1 hour',
		'24hr': '24 hours'
	};
	const EXPIRY_OPTIONS = [
		{ value: 'none', label: 'Indefinitely' },
		{ value: 'view_once', label: 'View once' },
		{ value: '10min', label: '10 minutes' },
		{ value: '60min', label: '1 hour' },
		{ value: '24hr', label: '24 hours' }
	] as const;

	// Album browsing lightbox (recipient side)
	let albumViewing = $state<{
		albumId: string;
		name: string;
		photos: { id: string; cfImageId: string; deliveryUrl: string }[];
		index: number;
	} | null>(null);
	let _albumViewLoading = $state(false);

	// Unalbumized photos shown in top-level grid
	const unalbumizedPhotos = $derived(vaultPhotos.filter((p) => !p.albumId));

	// Expiring photo viewer
	let expiringViewing = $state<{ msgId: string; url: string } | null>(null);
	let expiringCountdown = $state(10);
	let expiringTimer: ReturnType<typeof setInterval> | null = null;

	const minLength = $derived(data.minLength);

	function formatLastActive(d: Date | null): string {
		if (!d) return '';
		const diff = Date.now() - new Date(d).getTime();
		if (diff < 3 * 60_000) return 'Active now';
		if (diff < 60 * 60_000) return `Active ${Math.floor(diff / 60_000)}m ago`;
		if (diff < 24 * 60 * 60_000) return `Active ${Math.floor(diff / 3_600_000)}h ago`;
		return `Active ${Math.floor(diff / 86_400_000)}d ago`;
	}
	// pointer: fine = mouse/trackpad (desktop); pointer: coarse = touchscreen (mobile)
	const isDesktop = $derived(browser ? window.matchMedia('(pointer: fine)').matches : false);

	// Cloudflare Images only accepts raster formats — SVG (a vector/XML format)
	// passes a naive `startsWith('image/')` check but gets rejected by CF with
	// an unfriendly 415, so it needs its own explicit allow-list.
	const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

	async function handleFileSelect(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
			photoError = 'Please use a JPEG, PNG, GIF, or WebP image';
			return;
		}
		if (file.size > 10 * 1024 * 1024) {
			photoError = 'Image must be under 10MB';
			return;
		}

		photoError = '';
		photoUploading = true;
		mediaOpen = false;
		try {
			const urlRes = await fetch('/api/photos/upload-url', { method: 'POST' });
			if (!urlRes.ok) throw new Error('Failed to get upload URL');
			const { uploadUrl, id, deliveryUrl } = (await urlRes.json()) as {
				uploadUrl: string;
				id: string;
				deliveryUrl: string;
			};

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
		expiryType = 'none';
		const cam = document.getElementById('media-camera-input') as HTMLInputElement | null;
		const gal = document.getElementById('media-gallery-input') as HTMLInputElement | null;
		if (cam) cam.value = '';
		if (gal) gal.value = '';
	}

	async function openMedia() {
		mediaOpen = true;
		selectedAlbum = null;
		if (data.isSupporter) {
			vaultLoading = true;
			try {
				const res = await fetch('/api/photos/vault');
				const json = (await res.json()) as {
					photos: { id: string; cfImageId: string; deliveryUrl: string; albumId: string | null }[];
					albums: { id: string; name: string; coverUrl: string | null; photoCount: number }[];
				};
				vaultPhotos = json.photos;
				vaultAlbums = json.albums;
			} catch {
				// ignore — vault grid will be empty
			} finally {
				vaultLoading = false;
			}
		}
	}

	function closeMedia() {
		mediaOpen = false;
		selectedVaultPhotos = [];
		selectedAlbum = null;
		albumExpiryOpen = false;
		photoId = null;
		photoPreviewUrl = null;
		expiryType = 'none';
	}

	function toggleVaultPhoto(photo: { cfImageId: string; deliveryUrl: string }) {
		const idx = selectedVaultPhotos.findIndex((p) => p.cfImageId === photo.cfImageId);
		if (idx >= 0) {
			selectedVaultPhotos = selectedVaultPhotos.filter((_, i) => i !== idx);
		} else if (selectedVaultPhotos.length < 10) {
			selectedVaultPhotos = [...selectedVaultPhotos, photo];
		}
	}

	function selectAlbum(album: { id: string; name: string; coverUrl: string | null }) {
		if (selectedAlbum?.id === album.id) {
			selectedAlbum = null;
			albumExpiryOpen = false;
			expiryType = 'none';
		} else {
			selectedAlbum = album;
			albumExpiryOpen = false;
		}
	}

	async function openAlbumViewer(albumId: string) {
		_albumViewLoading = true;
		try {
			const res = await fetch(`/api/albums/${albumId}`);
			const data = (await res.json()) as {
				name: string;
				photos: { id: string; cfImageId: string; deliveryUrl: string }[];
			};
			albumViewing = { albumId, name: data.name, photos: data.photos, index: 0 };
		} catch {
			// ignore
		} finally {
			_albumViewLoading = false;
		}
	}

	let vaultUploading = $state(false);

	async function handleAddToVault(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
			photoError = 'Please use a JPEG, PNG, GIF, or WebP image';
			return;
		}
		if (file.size > 10 * 1024 * 1024) {
			photoError = 'Image must be under 10MB';
			return;
		}
		photoError = '';
		vaultUploading = true;
		try {
			const urlRes = await fetch('/api/photos/upload-url', { method: 'POST' });
			if (!urlRes.ok) throw new Error('Failed to get upload URL');
			const {
				uploadUrl,
				id: cfImageId,
				deliveryUrl
			} = (await urlRes.json()) as {
				uploadUrl: string;
				id: string;
				deliveryUrl: string;
			};

			const form = new FormData();
			form.append('file', file);
			const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form });
			if (!uploadRes.ok) throw new Error('Upload failed');

			await fetch('/api/photos/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cfImageId, target: 'vault' })
			});

			// Add to local vault grid immediately
			vaultPhotos = [
				{ id: crypto.randomUUID(), cfImageId, deliveryUrl, albumId: null },
				...vaultPhotos
			];

			const gal = document.getElementById('media-gallery-input') as HTMLInputElement | null;
			if (gal) gal.value = '';
		} catch {
			photoError = 'Photo upload failed. Try again.';
		} finally {
			vaultUploading = false;
		}
	}

	function sendFromPanel() {
		if (!photoId && selectedVaultPhotos.length === 0 && !selectedAlbum) return;
		mediaOpen = false;
		if (selectedVaultPhotos.length > 1) {
			sendMultipleVaultPhotos();
		} else {
			// Camera photo, album, or single vault photo: submit form
			tick().then(() => formEl?.requestSubmit());
		}
	}

	async function sendMultipleVaultPhotos() {
		sending = true;
		sendError = '';
		try {
			for (let i = 0; i < selectedVaultPhotos.length; i++) {
				const params = new URLSearchParams({
					body: i === 0 ? body : '',
					cfImageId: selectedVaultPhotos[i].cfImageId,
					...(expiryType !== 'none' ? { expiryType } : {})
				});
				const res = await fetch('?/send', {
					method: 'POST',
					headers: { 'content-type': 'application/x-www-form-urlencoded' },
					body: params
				});
				if (!res.ok) {
					sendError = 'Failed to send some photos';
					break;
				}
			}
			if (!sendError) {
				body = '';
				selectedVaultPhotos = [];
				expiryType = 'none';
			}
		} catch {
			sendError = 'Failed to send. Try again.';
		} finally {
			sending = false;
			await invalidate('app:thread');
			setTimeout(() => textareaEl?.focus(), 0);
		}
	}

	async function tapExpiringPhoto(msgId: string) {
		try {
			const res = await fetch(`/api/threads/${data.thread.id}/messages/${msgId}/view`, {
				method: 'POST'
			});
			const result = (await res.json()) as { expired?: boolean; cfImageUrl?: string };
			if (result.expired || !result.cfImageUrl) {
				invalidate('app:thread');
				return;
			}
			expiringViewing = { msgId, url: result.cfImageUrl };
			expiringCountdown = 10;
			if (expiringTimer) clearInterval(expiringTimer);
			expiringTimer = setInterval(() => {
				expiringCountdown--;
				if (expiringCountdown <= 0) {
					clearInterval(expiringTimer!);
					expiringTimer = null;
					expiringViewing = null;
					invalidate('app:thread');
				}
			}, 1000);
		} catch {
			invalidate('app:thread');
		}
	}

	function closeExpiringViewer() {
		if (expiringTimer) clearInterval(expiringTimer);
		expiringTimer = null;
		expiringViewing = null;
		invalidate('app:thread');
	}

	function formatTime(date: Date | string | null): string {
		if (!date) return '';
		const d = typeof date === 'string' ? new Date(date) : date;
		const diff = Math.floor((Date.now() - d.getTime()) / 1000);
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return d.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	let messagesEl: HTMLElement;

	async function scrollToBottom() {
		await tick();
		if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	$effect(() => {
		const _ = data.messages;
		scrollToBottom();
	});
</script>

<div class="thread-page">
	<header class="thread-header">
		<a href={resolve('/inbox')} class="back-link" aria-label="Back to inbox">
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="15 18 9 12 15 6"></polyline>
			</svg>
		</a>
		<div class="thread-header-info">
			<a href={resolve(`/listings/${data.thread.listingId}`)} class="listing-link"
				>{data.thread.listingSubject}</a
			>
			<span class="other-alias">
				{#if data.isSupporter && data.otherPresence}
					<span
						class="presence-dot"
						class:presence-in-thread={data.otherPresence === 'in_thread'}
						class:presence-in-app={data.otherPresence === 'in_app'}
						class:presence-offline={data.otherPresence === 'offline'}
					></span>
				{/if}
				{data.otherAlias}
			</span>
			{#if data.isSupporter && data.otherPresence}
				<span class="last-active">{formatLastActive(data.otherLastActive)}</span>
			{/if}
		</div>
		<button
			class="more-btn"
			onclick={() => (showReportMenu = !showReportMenu)}
			type="button"
			aria-label="Report user"
		>
			<svg
				width="17"
				height="17"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line
					x1="4"
					y1="22"
					x2="4"
					y2="15"
				/></svg
			>
		</button>
	</header>

	{#if showReportMenu}
		<div class="report-panel">
			{#if reportDone}
				<p class="report-done">Report submitted. Our moderation team will review it.</p>
			{:else}
				<p class="report-panel-title">Report {data.otherAlias}</p>

				<!-- Block section -->
				<div class="block-section">
					{#if !blockConfirm}
						<button
							type="button"
							class="block-btn"
							onclick={() => (blockConfirm = true)}
							disabled={blockWorking}
						>
							Block {data.otherAlias}
						</button>
					{:else}
						<p class="block-confirm-text">
							Block this user? They won't be able to see your listings or contact you.
						</p>
						<form
							method="POST"
							action="?/blockUser"
							use:enhance={() => {
								blockWorking = true;
								return async ({ result, update }) => {
									blockWorking = false;
									if (result.type === 'success') {
										showReportMenu = false;
										blockConfirm = false;
										await invalidate('app:thread');
									}
									await update();
								};
							}}
						>
							<div class="block-confirm-actions">
								<button
									type="button"
									class="block-cancel-btn"
									onclick={() => (blockConfirm = false)}
									disabled={blockWorking}
								>
									Cancel
								</button>
								<button
									type="submit"
									class="block-confirm-btn"
									disabled={blockWorking}
									aria-busy={blockWorking}
								>
									Block
								</button>
							</div>
						</form>
					{/if}
				</div>
				<hr class="block-divider" />

				<form
					method="POST"
					action="?/report"
					use:enhance={() => {
						reportSubmitting = true;
						return async ({ result, update }) => {
							reportSubmitting = false;
							if (result.type === 'success') {
								reportDone = true;
							}
							await update();
						};
					}}
				>
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
					<textarea
						name="detail"
						bind:value={reportDetail}
						placeholder="Additional details (optional)"
						rows="2"
					></textarea>
					<div class="report-actions">
						<button type="button" class="report-cancel" onclick={() => (showReportMenu = false)}
							>Cancel</button
						>
						<button
							type="submit"
							class="report-submit"
							disabled={!reportCategory || reportSubmitting}
							aria-busy={reportSubmitting}
						>
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
					<div
						class="bubble"
						class:bubble-photo={msg.expiringState === 'unviewed' ||
							(!!msg.cfImageUrl && msg.expiringState !== 'expired')}
						class:bubble-album={msg.albumId}
						class:bubble-expired={msg.expiringState === 'expired'}
					>
						{#if msg.expiringState === 'unviewed' && !msg.isMine}
							<button
								class="expiring-placeholder"
								type="button"
								onclick={() => tapExpiringPhoto(msg.id)}
								aria-label="Tap to view expiring photo"
							>
								<div class="expiring-icon-ring">
									<svg
										width="28"
										height="28"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.75"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
									</svg>
								</div>
								<span class="expiring-tap-hint">Tap to view</span>
							</button>
						{:else if msg.expiringState === 'expired'}
							<div class="expired-placeholder">Photo viewed</div>
						{:else if msg.cfImageUrl}
							<button
								class="msg-photo-btn"
								onclick={() => (lightboxUrl = msg.cfImageUrl)}
								type="button"
								aria-label="View photo"
							>
								<img class="msg-photo" src={msg.cfImageUrl} alt="" loading="lazy" />
								{#if msg.isExpiring && msg.expiringState === 'unviewed'}
									<span class="expiring-sent-badge" aria-label="Expiring photo">
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path
												d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
											/>
											<path d="M12 6v6l4 2" />
										</svg>
									</span>
								{/if}
							</button>
						{/if}
						{#if msg.albumId}
							<button
								type="button"
								class="album-msg-card"
								onclick={() => openAlbumViewer(msg.albumId!)}
								aria-label="View shared album"
							>
								<div class="album-cover">
									{#if msg.albumCoverUrl}
										<img src={msg.albumCoverUrl} alt="Album cover" />
									{:else}
										<svg
											width="32"
											height="32"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="1.5"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<rect x="3" y="3" width="18" height="18" rx="2" /><circle
												cx="8.5"
												cy="8.5"
												r="1.5"
											/><polyline points="21 15 16 10 5 21" />
										</svg>
									{/if}
									<span class="album-sender-name"
										>{msg.isMine ? (msg.albumName ?? 'Album') : data.otherAlias}</span
									>
									<div class="album-type-pill">
										<svg
											width="12"
											height="12"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<rect x="3" y="3" width="18" height="18" rx="2" /><circle
												cx="8.5"
												cy="8.5"
												r="1.5"
											/><polyline points="21 15 16 10 5 21" />
										</svg>
									</div>
									{#if msg.isExpiring}
										<span class="album-expiring-badge">View once</span>
									{/if}
								</div>
							</button>
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
					<form
						method="POST"
						action="?/revokeExchange"
						use:enhance={() => {
							exchangeWorking = true;
							return async ({ update }) => {
								exchangeWorking = false;
								await update();
							};
						}}
					>
						<button type="submit" class="revoke-btn" disabled={exchangeWorking}>Revoke</button>
					</form>
				</div>
				{#if data.theirContact}
					<div class="contact-list">
						{#if data.theirContact.phone}
							<a class="contact-row" href="tel:{data.theirContact.phone}">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path
										d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
									/></svg
								>
								<span>{data.theirContact.phone}</span>
							</a>
						{/if}
						{#if data.theirContact.email}
							<a class="contact-row" href="mailto:{data.theirContact.email}">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><rect width="20" height="16" x="2" y="4" rx="2" /><path
										d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
									/></svg
								>
								<span>{data.theirContact.email}</span>
							</a>
						{/if}
					</div>
				{/if}
			</div>
		{:else if data.exchange?.status === 'offered' && data.exchange.iAmOffering}
			<div class="exchange-card pending">
				<span class="exchange-label"
					>Waiting for {data.otherAlias} to accept your contact request</span
				>
				<form
					method="POST"
					action="?/revokeExchange"
					use:enhance={() => {
						exchangeWorking = true;
						return async ({ update }) => {
							exchangeWorking = false;
							await update();
						};
					}}
				>
					<button type="submit" class="revoke-btn" disabled={exchangeWorking}>Cancel</button>
				</form>
			</div>
		{:else if data.exchange?.status === 'offered' && !data.exchange.iAmOffering}
			<div class="exchange-card incoming">
				<div class="exchange-incoming-head">
					<svg
						class="exchange-incoming-icon"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
						/>
					</svg>
					<div>
						<p class="exchange-label">
							<strong>{data.otherAlias}</strong> wants to share contact info
						</p>
						<p class="exchange-hint">Accept to reveal each other's verified phone &amp; email.</p>
					</div>
				</div>
				<div class="exchange-actions">
					<form
						method="POST"
						action="?/acceptExchange"
						use:enhance={() => {
							exchangeWorking = true;
							return async ({ update }) => {
								exchangeWorking = false;
								await update();
							};
						}}
					>
						<button type="submit" class="accept-btn" disabled={exchangeWorking}>Accept</button>
					</form>
					<form
						method="POST"
						action="?/declineExchange"
						use:enhance={() => {
							exchangeWorking = true;
							return async ({ update }) => {
								exchangeWorking = false;
								await update();
							};
						}}
					>
						<button type="submit" class="decline-btn" disabled={exchangeWorking}>Decline</button>
					</form>
				</div>
			</div>
		{:else if data.eligible}
			<div class="exchange-offer">
				<svg
					class="exchange-offer-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path
						d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
					/>
				</svg>
				<div class="exchange-offer-body">
					<span class="exchange-offer-title">Ready to connect?</span>
					<span class="exchange-offer-hint"
						>Share verified phone &amp; email — both parties must accept</span
					>
				</div>
				<form
					method="POST"
					action="?/offerExchange"
					use:enhance={() => {
						exchangeWorking = true;
						return async ({ update }) => {
							exchangeWorking = false;
							await update();
						};
					}}
				>
					<button type="submit" class="offer-btn" disabled={exchangeWorking}> Share info </button>
				</form>
			</div>
		{/if}
	{/if}

	{#if lightboxUrl}
		<div
			class="lightbox"
			role="dialog"
			aria-label="Photo viewer"
			aria-modal="true"
			tabindex="-1"
			onclick={() => (lightboxUrl = null)}
			onkeydown={(e) => {
				if (e.key === 'Escape') lightboxUrl = null;
			}}
		>
			<button
				class="lightbox-close"
				type="button"
				aria-label="Close"
				onclick={() => (lightboxUrl = null)}
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
			<img src={lightboxUrl} alt="" />
		</div>
	{/if}

	{#if data.isSupporter && data.otherIsTyping}
		<div class="typing-indicator">
			<span class="typing-dots"><span></span><span></span><span></span></span>
			<span class="typing-label">{data.otherAlias} is typing</span>
		</div>
	{/if}

	{#if data.thread.status === 'open'}
		<form
			bind:this={formEl}
			class="compose"
			method="POST"
			action="?/send"
			use:enhance={async ({ cancel }) => {
				sendError = '';
				if (selectedVaultPhotos.length > 1) {
					cancel();
					await sendMultipleVaultPhotos();
					return;
				}
				sending = true;
				return async ({ result, update }) => {
					sending = false;
					if (result.type === 'success') {
						body = '';
						clearPhoto();
						selectedVaultPhotos = [];
						selectedAlbum = null;
						expiryType = 'none';
						sendError = '';
						await update();
						setTimeout(() => textareaEl?.focus(), 0);
					} else if (result.type === 'failure') {
						sendError = (result.data?.error as string) ?? 'Failed to send';
					}
				};
			}}
		>
			{#if photoId}
				<input type="hidden" name="cfImageId" value={photoId} />
			{:else if selectedVaultPhotos.length === 1}
				<input type="hidden" name="cfImageId" value={selectedVaultPhotos[0].cfImageId} />
			{/if}
			{#if selectedAlbum}
				<input type="hidden" name="albumId" value={selectedAlbum.id} />
			{/if}
			{#if (photoId || selectedVaultPhotos.length === 1 || selectedAlbum) && expiryType !== 'none'}
				<!-- multi-vault handled in sendMultipleVaultPhotos directly -->
				<input type="hidden" name="expiryType" value={expiryType} />
			{/if}
			{#if sendError}
				<p class="send-error">{sendError}</p>
			{/if}
			{#if photoPreviewUrl}
				<div class="photo-preview">
					<img src={photoPreviewUrl} alt="" />
					<button type="button" class="photo-remove" onclick={clearPhoto} aria-label="Remove photo">
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
					{#if data.isSupporter}
						<button
							type="button"
							class="expiring-toggle"
							class:active={expiryType === 'view_once'}
							onclick={() => (expiryType = expiryType === 'view_once' ? 'none' : 'view_once')}
							aria-pressed={expiryType === 'view_once'}
							aria-label={expiryType === 'view_once' ? 'Cancel view once' : 'Send as view once'}
							title={expiryType === 'view_once' ? 'View once (tap to cancel)' : 'Send as view once'}
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
							</svg>
						</button>
					{/if}
				</div>
			{/if}
			{#if selectedVaultPhotos.length > 0}
				<div class="vault-preview-row">
					{#each selectedVaultPhotos as photo (photo.cfImageId)}
						<div class="vault-preview-thumb">
							<img src={photo.deliveryUrl} alt="" />
							<button
								type="button"
								class="vault-preview-remove"
								onclick={() => toggleVaultPhoto(photo)}
								aria-label="Remove"
							>
								<svg
									width="10"
									height="10"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>
					{/each}
				</div>
			{/if}
			{#if photoError}
				<p class="send-error">{photoError}</p>
			{/if}
			{#if data.thread.role === 'poster'}
				<div class="decline-strip">
					<button
						type="button"
						class="decline-open-btn"
						onclick={() => (declineOpen = true)}
						disabled={declineWorking}
					>
						Not interested? Decline conversation
					</button>
				</div>
			{/if}
			<div class="compose-pill">
				<textarea
					name="body"
					bind:value={body}
					bind:this={textareaEl}
					placeholder="Write your message…"
					rows="1"
					disabled={sending}
					oninput={(e) => {
						broadcastTyping();
						const el = e.currentTarget as HTMLTextAreaElement;
						el.style.height = 'auto';
						el.style.height = Math.min(el.scrollHeight, 120) + 'px';
					}}
					onkeydown={(e) => {
						if (
							e.key === 'Enter' &&
							!e.shiftKey &&
							window.matchMedia('(pointer: fine)').matches &&
							(body.trim().length >= minLength || !!photoId || selectedVaultPhotos.length > 0) &&
							!sending &&
							!photoUploading
						) {
							e.preventDefault();
							(e.currentTarget as HTMLTextAreaElement).closest('form')?.requestSubmit();
						}
					}}
				></textarea>
				<button
					type="submit"
					class="pill-action-btn"
					class:has-content={body.trim().length >= minLength ||
						!!photoId ||
						selectedVaultPhotos.length > 0}
					aria-busy={sending}
					aria-label={body.trim().length >= minLength || photoId || selectedVaultPhotos.length > 0
						? 'Send'
						: 'Voice (not available)'}
					disabled={sending ||
						photoUploading ||
						(!photoId && selectedVaultPhotos.length === 0 && body.trim().length < minLength)}
				>
					{#if sending}
						<span class="spinner"></span>
					{:else if body.trim().length >= minLength || photoId || selectedVaultPhotos.length > 0}
						<!-- Send arrow -->
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
							<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
						</svg>
					{:else}
						<!-- Microphone -->
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
							<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
							<line x1="12" y1="19" x2="12" y2="23" />
							<line x1="8" y1="23" x2="16" y2="23" />
						</svg>
					{/if}
				</button>
			</div>
			{#if !photoId && body.trim().length > 0 && body.trim().length < minLength}
				<div class="char-count short">{body.trim().length}/{minLength} min</div>
			{/if}

			<!-- 4-icon media bar -->
			<div class="media-bar">
				<!-- Camera — opens media panel -->
				<button
					type="button"
					class="media-bar-btn"
					class:active={mediaOpen}
					onclick={mediaOpen ? closeMedia : openMedia}
					disabled={!!photoId || photoUploading || sending}
					aria-label="Add photo"
				>
					{#if photoUploading}
						<span class="spinner"></span>
					{:else}
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
							/>
							<circle cx="12" cy="13" r="4" />
						</svg>
					{/if}
				</button>
				<!-- GIF — placeholder -->
				<button
					type="button"
					class="media-bar-btn placeholder"
					disabled
					aria-label="GIF (coming soon)"
				>
					<span class="gif-label">GIF</span>
				</button>
				<!-- Location — placeholder -->
				<button
					type="button"
					class="media-bar-btn placeholder"
					disabled
					aria-label="Location (coming soon)"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle
							cx="12"
							cy="10"
							r="3"
						/>
					</svg>
				</button>
				<!-- Saved phrases — placeholder -->
				<button
					type="button"
					class="media-bar-btn placeholder"
					disabled
					aria-label="Saved phrases (coming soon)"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
					</svg>
				</button>
			</div>
		</form>

		<!-- Media panel — bottom sheet -->
		{#if mediaOpen}
			<button
				type="button"
				class="media-overlay"
				onclick={closeMedia}
				aria-label="Close media panel"
				tabindex="-1"
			></button>
			<div class="media-panel" transition:fly={{ y: 400, duration: 300, easing: cubicOut }}>
				<div class="panel-handle"></div>
				<h3 class="panel-title">Media</h3>
				<hr class="panel-divider" />

				<!-- Action row -->
				<div class="panel-actions" class:locked={!!photoId}>
					{#if isDesktop}
						<button type="button" class="panel-action placeholder" disabled>
							<svg
								width="28"
								height="28"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path
									d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
								/><circle cx="12" cy="13" r="4" />
							</svg>
							Take Photo
						</button>
					{:else}
						<label class="panel-action" for="media-camera-input">
							<svg
								width="28"
								height="28"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path
									d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
								/><circle cx="12" cy="13" r="4" />
							</svg>
							Take Photo
						</label>
					{/if}
					<label class="panel-action" for="media-gallery-input" class:uploading={vaultUploading}>
						<svg
							width="28"
							height="28"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M12 5v14M5 12h14" />
						</svg>
						{vaultUploading ? 'Uploading…' : 'Add photo'}
					</label>
					<button type="button" class="panel-action placeholder" disabled>
						<svg
							width="28"
							height="28"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polygon points="23 7 16 12 23 17 23 7" /><rect
								x="1"
								y="5"
								width="15"
								height="14"
								rx="2"
							/>
						</svg>
						Video
					</button>
				</div>

				<input
					id="media-camera-input"
					type="file"
					accept="image/*"
					capture="environment"
					class="file-input"
					onchange={handleFileSelect}
					disabled={photoUploading}
				/>
				<input
					id="media-gallery-input"
					type="file"
					accept="image/jpeg,image/png,image/gif,image/webp"
					class="file-input"
					onchange={handleAddToVault}
					disabled={vaultUploading}
				/>

				<!-- Scrollable vault grid -->
				<div class="vault-scroll">
					{#if data.isSupporter}
						{#if vaultLoading}
							<p class="vault-grid-empty">Loading vault…</p>
						{:else if vaultPhotos.length > 0 || vaultAlbums.length > 0}
							<div class="vault-grid">
								<!-- Albums: tap to select the whole album -->
								{#each vaultAlbums as album (album.id)}
									{@const albumSelected = selectedAlbum?.id === album.id}
									{@const albumDimmed =
										selectedVaultPhotos.length > 0 || (!!selectedAlbum && !albumSelected)}
									<button
										type="button"
										class="vault-thumb album-thumb"
										class:selected={albumSelected}
										class:dimmed={albumDimmed}
										onclick={() => selectAlbum(album)}
										aria-label="Select album {album.name}"
										aria-pressed={albumSelected}
									>
										{#if album.coverUrl}
											<img src={album.coverUrl} alt="" loading="lazy" />
										{:else}
											<div class="album-empty-cover"></div>
										{/if}
										<div class="album-label">
											<span class="album-name">{album.name}</span>
										</div>
									</button>
								{/each}
								<!-- Uncategorized photos: multi-select up to 10 -->
								{#each unalbumizedPhotos as photo (photo.id)}
									{@const photoSelected = selectedVaultPhotos.some(
										(p) => p.cfImageId === photo.cfImageId
									)}
									{@const photoDimmed =
										!!selectedAlbum || (selectedVaultPhotos.length >= 10 && !photoSelected)}
									<button
										type="button"
										class="vault-thumb"
										class:selected={photoSelected}
										class:dimmed={photoDimmed}
										onclick={() => toggleVaultPhoto(photo)}
										aria-label="Select vault photo"
										aria-pressed={photoSelected}
									>
										<img src={photo.deliveryUrl} alt="" loading="lazy" />
										{#if photoSelected}
											<span class="vault-check" aria-hidden="true">
												<svg
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="white"
													stroke-width="3"
													stroke-linecap="round"
													stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg
												>
											</span>
										{/if}
									</button>
								{/each}
							</div>
						{:else}
							<p class="vault-grid-empty">No photos in your vault yet.</p>
						{/if}
					{/if}
				</div>

				<!-- Panel footer: overlays the grid, slides up when a photo or selection is made -->
				{#if data.isSupporter && (photoId || selectedVaultPhotos.length > 0 || selectedAlbum)}
					<div
						class="panel-footer"
						class:panel-footer-album={!!selectedAlbum}
						transition:fly={{ y: 80, duration: 220, easing: cubicOut }}
					>
						{#if selectedAlbum}
							<!-- Album: collapsed expiry selector + sliding options list -->
							{#if albumExpiryOpen}
								<div
									class="album-expiry-list"
									transition:fly={{ y: 12, duration: 180, easing: cubicOut }}
								>
									{#each EXPIRY_OPTIONS as opt (opt.value)}
										<button
											type="button"
											class="expiry-list-item"
											class:active={expiryType === opt.value}
											onclick={() => {
												expiryType = opt.value;
												albumExpiryOpen = false;
											}}
										>
											<span>{opt.label}</span>
											{#if expiryType === opt.value}
												<svg
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2.5"
													stroke-linecap="round"
													stroke-linejoin="round"
													aria-hidden="true"
												>
													<polyline points="20 6 9 17 4 12" />
												</svg>
											{/if}
										</button>
									{/each}
								</div>
								<hr class="expiry-list-divider" />
							{/if}
							<button
								type="button"
								class="album-expiry-selector"
								onclick={() => (albumExpiryOpen = !albumExpiryOpen)}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
								</svg>
								<span class="expiry-selector-label">{EXPIRY_LABELS[expiryType]}</span>
								<svg
									class="expiry-chevron"
									class:open={albumExpiryOpen}
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<polyline points="6 9 12 15 18 9" />
								</svg>
							</button>
							<hr class="expiry-list-divider" />
							<button
								type="button"
								class="panel-send-btn"
								onclick={sendFromPanel}
								disabled={sending || photoUploading}
							>
								Share Album
							</button>
						{:else}
							<!-- Timer toggle: camera photo or vault selection -->
							<button
								type="button"
								class="panel-expiring-btn"
								class:active={expiryType !== 'none'}
								onclick={() => {
									expiryType = expiryType === 'none' ? 'view_once' : 'none';
								}}
								aria-pressed={expiryType !== 'none'}
							>
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
								</svg>
								{expiryType !== 'none' ? '10s' : 'Off'}
							</button>
							<button
								type="button"
								class="panel-send-btn"
								onclick={sendFromPanel}
								disabled={sending || photoUploading}
							>
								{#if selectedVaultPhotos.length > 0}
									Send ({selectedVaultPhotos.length})
								{:else}
									Send (1)
								{/if}
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<div class="thread-closed">This conversation is closed.</div>
	{/if}
</div>

<!-- Decline phrase sheet -->
{#if declineOpen}
	<button
		type="button"
		class="media-overlay"
		onclick={() => (declineOpen = false)}
		aria-label="Close"
		tabindex="-1"
	></button>
	<div class="decline-sheet" transition:fly={{ y: 400, duration: 280, easing: cubicOut }}>
		<div class="panel-handle"></div>
		<p class="decline-sheet-title">Send a polite decline</p>
		<p class="decline-sheet-hint">This will send a message and close the thread.</p>
		{#each DECLINE_PHRASES as phrase (phrase.id)}
			<form
				method="POST"
				action="?/decline"
				use:enhance={() => {
					declineWorking = true;
					return async ({ result, update }) => {
						declineWorking = false;
						declineOpen = false;
						if (result.type === 'success' && result.data) {
							const d = result.data as { nudgePause?: boolean; listingId?: string };
							if (d.nudgePause && d.listingId) {
								pauseNudge = true;
							}
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="phraseId" value={phrase.id} />
				<button type="submit" class="phrase-row" disabled={declineWorking}>
					<span class="phrase-text">{phrase.text}</span>
					<span class="phrase-hint">{phrase.hint}</span>
				</button>
			</form>
		{/each}
		<button
			type="button"
			class="decline-cancel"
			onclick={() => (declineOpen = false)}
			disabled={declineWorking}
		>
			Cancel
		</button>
	</div>
{/if}

<!-- Pause nudge banner -->
{#if pauseNudge && !pauseDone}
	<div class="pause-nudge" transition:fly={{ y: -40, duration: 220, easing: cubicOut }}>
		<p class="pause-nudge-text">Want to pause your listing while you're busy?</p>
		<div class="pause-nudge-actions">
			<form
				method="POST"
				action="?/pauseListing"
				use:enhance={() => {
					pauseWorking = true;
					return async ({ result, update }) => {
						pauseWorking = false;
						if (result.type === 'success') {
							pauseDone = true;
							pauseNudge = false;
						}
						await update();
					};
				}}
			>
				<button type="submit" class="pause-confirm-btn" disabled={pauseWorking}>
					Pause listing
				</button>
			</form>
			<button
				type="button"
				class="pause-dismiss-btn"
				onclick={() => (pauseNudge = false)}
				disabled={pauseWorking}
			>
				Keep active
			</button>
		</div>
	</div>
{/if}

<!-- Expiring photo viewer -->
{#if expiringViewing}
	<div class="expiring-lightbox" role="dialog" aria-modal="true" aria-label="Expiring photo">
		<div class="expiring-lightbox-inner">
			<div class="expiring-countdown-ring">
				<svg viewBox="0 0 36 36" class="countdown-svg">
					<circle class="countdown-track" cx="18" cy="18" r="15.9" fill="none" stroke-width="3" />
					<circle
						class="countdown-arc"
						cx="18"
						cy="18"
						r="15.9"
						fill="none"
						stroke-width="3"
						stroke-dasharray="{(expiringCountdown / 10) * 100} 100"
						transform="rotate(-90 18 18)"
					/>
				</svg>
				<span class="countdown-number">{expiringCountdown}</span>
			</div>
			<img src={expiringViewing.url} alt="" class="expiring-img" />
			<button type="button" class="expiring-close" onclick={closeExpiringViewer} aria-label="Close">
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	</div>
{/if}

<!-- Album browser lightbox -->
{#if albumViewing}
	<div class="album-lightbox" role="dialog" aria-modal="true" aria-label="Album viewer">
		<div class="album-lightbox-header">
			<button
				type="button"
				class="album-lb-close"
				onclick={() => (albumViewing = null)}
				aria-label="Close"
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg
				>
			</button>
			<span class="album-lb-title">{albumViewing.name}</span>
			<span class="album-lb-count">{albumViewing.index + 1} / {albumViewing.photos.length}</span>
		</div>
		{#if albumViewing.photos.length > 0}
			<div class="album-lb-img-wrap">
				<img
					class="album-lb-img"
					src={albumViewing.photos[albumViewing.index].deliveryUrl}
					alt=""
				/>
			</div>
			<div class="album-lb-nav">
				<button
					type="button"
					class="album-lb-arrow"
					disabled={albumViewing.index === 0}
					onclick={() => albumViewing && (albumViewing.index -= 1)}
					aria-label="Previous"
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg
					>
				</button>
				<div class="album-lb-dots">
					{#each albumViewing.photos as _photo, i (_photo.id)}
						<button
							type="button"
							class="album-lb-dot"
							class:active={i === albumViewing.index}
							onclick={() => albumViewing && (albumViewing.index = i)}
							aria-label="Photo {i + 1}"
						></button>
					{/each}
				</div>
				<button
					type="button"
					class="album-lb-arrow"
					disabled={albumViewing.index === albumViewing.photos.length - 1}
					onclick={() => albumViewing && (albumViewing.index += 1)}
					aria-label="Next"
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg
					>
				</button>
			</div>
		{:else}
			<p style="color: var(--pico-muted-color); text-align: center; padding: 2rem;">
				No photos in this album.
			</p>
		{/if}
	</div>
{/if}

<style>
	.thread-page {
		max-width: 640px;
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		/* full viewport minus site header; bottom space reserved for fixed media bar + gap */
		height: calc(100dvh - 64px);
		padding-bottom: calc(56px + 0.75rem + env(safe-area-inset-bottom, 0px));
		overflow: hidden;
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

	.more-btn:hover {
		color: var(--pico-color);
	}

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

	.report-panel select,
	.report-panel textarea {
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.report-panel textarea {
		resize: vertical;
	}

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

	.block-section {
		margin-bottom: 0.75rem;
	}

	.block-btn {
		background: none;
		border: 1px solid color-mix(in srgb, var(--pico-del-color) 40%, transparent);
		border-radius: 6px;
		padding: 0.4rem 1rem;
		font-size: 0.825rem;
		font-weight: 500;
		color: var(--pico-del-color);
		cursor: pointer;
		font-family: inherit;
		width: 100%;
		margin: 0;
		text-align: left;
	}

	.block-btn:hover:not(:disabled) {
		background: color-mix(in srgb, var(--pico-del-color) 8%, transparent);
	}

	.block-confirm-text {
		font-size: 0.825rem;
		color: var(--pico-color);
		margin-bottom: 0.5rem;
	}

	.block-confirm-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.block-cancel-btn {
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

	.block-confirm-btn {
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

	.block-divider {
		border: none;
		border-top: 1px solid var(--pico-muted-border-color);
		margin: 0 0 0.75rem;
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
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.presence-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.presence-in-thread {
		background: #22c55e;
	}

	.presence-in-app {
		background: #3b82f6;
	}

	.presence-offline {
		background: #6b7280;
	}

	.last-active {
		font-size: 0.7rem;
		color: var(--pico-muted-color);
		opacity: 0.75;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 0.75rem 1rem 0;
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
		color: white !important;
		border-bottom-right-radius: 4px;
	}

	.bubble-wrap.mine .bubble.bubble-photo,
	.bubble-wrap.mine .bubble.bubble-album,
	.bubble-wrap.mine .bubble.bubble-expired {
		background: none;
		color: inherit !important;
	}

	.bubble-wrap.theirs .bubble {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-bottom-left-radius: 4px;
	}

	.bubble-wrap.theirs .bubble.bubble-photo,
	.bubble-wrap.theirs .bubble.bubble-album {
		background: none;
		border: none;
	}

	.bubble-body {
		margin: 0;
		white-space: pre-wrap;
		color: inherit;
	}

	.bubble-wrap.mine .bubble-body {
		color: white !important;
	}

	.bubble-photo,
	.bubble-album,
	.bubble-expired {
		padding: 0;
		background: none;
		border: none;
		box-shadow: none;
		overflow: visible;
	}

	.bubble-photo {
		width: 180px;
	}

	.msg-photo-btn {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		display: block;
		width: 100%;
		border-radius: 14px;
		overflow: hidden;
	}

	.msg-photo {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
	}

	.bubble-photo .bubble-body {
		padding: 0.4rem 0.75rem 0.5rem;
	}

	.lightbox {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.lightbox img {
		max-width: 100%;
		max-height: 90dvh;
		border-radius: 8px;
		object-fit: contain;
	}

	.lightbox-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgba(0, 0, 0, 0.5);
		border: none;
		border-radius: 50%;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		cursor: pointer;
		padding: 0;
		margin: 0;
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

	.typing-indicator {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem 0.5rem;
		font-size: 0.8rem;
		color: var(--pico-muted-color);
	}

	.typing-dots {
		display: inline-flex;
		align-items: center;
		gap: 3px;
	}

	.typing-dots span {
		display: block;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--pico-muted-color);
		animation: typing-bounce 1.2s infinite ease-in-out;
	}

	.typing-dots span:nth-child(2) {
		animation-delay: 0.2s;
	}

	.typing-dots span:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes typing-bounce {
		0%,
		60%,
		100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		30% {
			transform: translateY(-4px);
			opacity: 1;
		}
	}

	.compose {
		flex-shrink: 0;
		padding-top: 0.2rem;
		padding-bottom: 1.25rem;
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

	/* Expiring photo placeholder (recipient, before viewing) */
	.expiring-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		width: 180px;
		aspect-ratio: 4 / 3;
		background: #1c1c1e;
		border: none;
		border-radius: 14px;
		cursor: pointer;
		color: #fff;
		font-family: inherit;
		margin: 0;
		padding: 0;
		transition: opacity 0.15s;
	}

	.expiring-placeholder:hover {
		opacity: 0.85;
	}

	.expiring-icon-ring {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
	}

	.expiring-tap-hint {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.55);
		letter-spacing: 0.01em;
	}

	/* Expired placeholder */
	.expired-placeholder {
		display: inline-block;
		border: 1px solid #555;
		border-radius: 999px;
		padding: 0.3rem 0.9rem;
		font-size: 0.78rem;
		color: #888;
	}

	/* Badge on sender's own expiring photo */
	.expiring-sent-badge {
		position: absolute;
		top: 6px;
		right: 6px;
		background: rgba(0, 0, 0, 0.55);
		border-radius: 50%;
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	/* msg-photo-btn already uses position: relative implicitly — needs explicit */
	.msg-photo-btn {
		position: relative;
	}

	/* Expiring toggle button on photo preview */
	.expiring-toggle {
		position: absolute;
		bottom: -6px;
		left: -6px;
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 50%;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		margin: 0;
		color: var(--pico-muted-color);
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}

	.expiring-toggle.active {
		background: color-mix(in srgb, var(--pico-primary) 15%, transparent);
		border-color: var(--pico-primary);
		color: var(--pico-primary);
	}

	/* 4-icon media bar — fixed at bottom, replaces the layout's bottom nav in threads */
	.media-bar {
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 640px;
		display: flex;
		align-items: center;
		gap: 0;
		background: var(--pico-background-color);
		border-top: 1px solid var(--pico-muted-border-color);
		padding-bottom: env(safe-area-inset-bottom, 8px);
		z-index: 100;
		min-height: 56px;
	}

	.media-bar-btn {
		flex: 1;
		background: none;
		border: none;
		padding: 0.5rem 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--pico-muted-color);
		cursor: pointer;
		border-radius: 6px;
		margin: 0;
		width: auto;
		transition: color 0.15s;
	}

	.media-bar-btn:hover:not(:disabled) {
		color: var(--pico-primary);
	}

	.media-bar-btn.active {
		color: var(--pico-primary);
	}

	.media-bar-btn.placeholder,
	.media-bar-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.gif-label {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	/* Media panel (bottom sheet) */
	.media-overlay {
		position: fixed;
		inset: 0;
		z-index: 150;
		background: rgba(0, 0, 0, 0.6);
		border: none;
		padding: 0;
		margin: 0;
		border-radius: 0;
		cursor: default;
	}

	.media-overlay:hover,
	.media-overlay:focus,
	.media-overlay:focus-visible,
	.media-overlay:active {
		background: rgba(0, 0, 0, 0.6);
		border-color: transparent;
		box-shadow: none;
		outline: none;
	}

	.media-panel {
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 640px;
		z-index: 200;
		background: var(--pico-card-background-color);
		border-top: 1px solid var(--pico-muted-border-color);
		border-radius: 16px 16px 0 0;
		padding: 0.75rem 0 0;
		max-height: 70dvh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.vault-scroll {
		flex: 1;
		overflow-y: auto;
	}

	/* Panel handle + title */
	.panel-handle {
		width: 36px;
		height: 4px;
		background: rgba(255, 255, 255, 0.25);
		border-radius: 2px;
		margin: 0 auto 0.75rem;
	}

	.panel-title {
		text-align: center;
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 1rem;
		padding: 0;
		color: var(--pico-color);
	}

	.panel-divider {
		border: none;
		border-top: 1px solid var(--pico-muted-border-color);
		margin: 0;
	}

	/* 3-up action row */
	.panel-actions {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		border-bottom: 1px solid var(--pico-muted-border-color);
		margin-bottom: 0;
	}

	.panel-action {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		aspect-ratio: 1;
		padding: 0;
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		color: var(--pico-color);
		background: transparent;
		border: none;
		border-right: 1px solid var(--pico-muted-border-color);
		margin: 0;
		width: 100%;
		transition: background 0.15s;
		text-align: center;
	}

	.panel-action:last-child {
		border-right: none;
	}

	.panel-action:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.06);
	}

	.panel-action.placeholder,
	.panel-action:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.panel-actions.locked .panel-action {
		opacity: 0.25;
		pointer-events: none;
		cursor: default;
	}

	/* Panel footer: expiring toggle + send */
	.panel-footer {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
		background: rgba(30, 30, 30, 0.92);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	.panel-footer-album {
		flex-direction: column;
		align-items: stretch;
		gap: 0;
		padding-top: 0;
	}

	/* Sliding expiry options list */
	.album-expiry-list {
		display: flex;
		flex-direction: column;
	}

	.expiry-list-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		font-size: 0.9rem;
		font-family: inherit;
		color: var(--pico-color);
		cursor: pointer;
		text-align: left;
		width: 100%;
		margin: 0;
		transition: background 0.1s;
	}

	.expiry-list-item:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.expiry-list-item.active {
		color: var(--pico-primary);
		font-weight: 600;
	}

	.expiry-list-item.active svg {
		stroke: var(--pico-primary);
	}

	.expiry-list-divider {
		border: none;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		margin: 0;
	}

	/* Collapsed selector row */
	.album-expiry-selector {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		font-size: 0.9rem;
		font-family: inherit;
		color: var(--pico-color);
		cursor: pointer;
		width: 100%;
		margin: 0;
	}

	.expiry-selector-label {
		text-align: center;
	}

	.expiry-chevron {
		position: absolute;
		right: 1rem;
		color: var(--pico-muted-color);
		transition: transform 0.2s;
	}

	.expiry-chevron.open {
		transform: rotate(180deg);
	}

	.panel-expiring-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 999px;
		padding: 0.5rem 0.9rem;
		font-size: 0.85rem;
		font-family: inherit;
		color: #888;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.panel-expiring-btn.active {
		background: #d0d0d0;
		border-color: #d0d0d0;
		color: #111;
	}

	.panel-expiring-btn:hover {
		background: #222;
	}

	.panel-expiring-btn.active:hover {
		background: #bbb;
		border-color: #bbb;
	}

	.panel-send-btn {
		flex: 1;
		background: var(--pico-primary);
		color: white;
		border: none;
		border-radius: 999px;
		padding: 0.65rem 1.25rem;
		font-size: 0.95rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.panel-send-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* Vault photo grid inside media panel */
	.vault-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2px;
		padding: 0;
	}

	.vault-thumb {
		aspect-ratio: 1;
		background: var(--pico-muted-background-color);
		border: 2px solid transparent;
		border-radius: 0;
		overflow: hidden;
		cursor: pointer;
		padding: 0;
		margin: 0;
		width: 100%;
		position: relative;
		transition: border-color 0.15s;
	}

	.vault-thumb.selected {
		border-color: var(--pico-primary);
	}

	.vault-thumb.dimmed {
		opacity: 0.3;
		pointer-events: none;
	}

	.vault-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.vault-check {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 24px;
		height: 24px;
		background: var(--pico-primary);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Vault photo preview row in compose area */
	.vault-preview-row {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		padding-bottom: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.vault-preview-thumb {
		position: relative;
		flex-shrink: 0;
		width: 72px;
		height: 72px;
		border-radius: 8px;
		overflow: hidden;
	}

	.vault-preview-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.vault-preview-remove {
		position: absolute;
		top: 3px;
		right: 3px;
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 50%;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		margin: 0;
		color: var(--pico-muted-color);
	}

	.album-thumb {
		position: relative;
	}

	.album-thumb img {
		filter: blur(6px);
		transform: scale(1.12);
	}

	.album-empty-cover {
		width: 100%;
		height: 100%;
		background: var(--pico-muted-background-color);
	}

	.album-label {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 0.3rem 0.4rem;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.album-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.vault-grid-empty {
		text-align: center;
		color: var(--pico-muted-color);
		font-size: 0.85rem;
		padding: 1.5rem;
		margin: 0;
	}

	/* Album message card */
	.album-sender-name {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 0.8rem;
		font-weight: 600;
		color: #fff;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
		white-space: nowrap;
		pointer-events: none;
	}

	.album-msg-card {
		background: none;
		border: none;
		border-radius: 12px;
		overflow: hidden;
		cursor: pointer;
		padding: 0;
		width: 120px;
		transition: opacity 0.15s;
	}

	.album-msg-card:hover {
		opacity: 0.85;
	}

	.album-cover {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.album-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.album-type-pill {
		position: absolute;
		bottom: 0.4rem;
		right: 0.4rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		background: rgba(0, 0, 0, 0.55);
		border-radius: 999px;
		padding: 0.2rem 0.5rem;
		color: #fff;
	}

	.album-expiring-badge {
		position: absolute;
		bottom: 0.4rem;
		left: 0.4rem;
		font-size: 0.7rem;
		background: rgba(0, 0, 0, 0.7);
		color: #ffc107;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
	}

	/* Album browsing lightbox */
	.album-lightbox {
		position: fixed;
		inset: 0;
		z-index: 300;
		background: rgba(0, 0, 0, 0.96);
		display: flex;
		flex-direction: column;
	}

	.album-lightbox-header {
		display: flex;
		align-items: center;
		padding: 0.75rem 1rem;
		gap: 0.75rem;
	}

	.album-lb-close {
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		padding: 0.25rem;
		flex-shrink: 0;
	}

	.album-lb-title {
		flex: 1;
		font-weight: 600;
		font-size: 1rem;
		color: white;
	}

	.album-lb-count {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.album-lb-img-wrap {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		padding: 0.5rem;
	}

	.album-lb-img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: 8px;
	}

	.album-lb-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem calc(1rem + env(safe-area-inset-bottom, 0px));
		gap: 1rem;
	}

	.album-lb-arrow {
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 50%;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.15s;
	}

	.album-lb-arrow:disabled {
		opacity: 0.25;
		cursor: default;
	}

	.album-lb-dots {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-wrap: wrap;
		justify-content: center;
	}

	.album-lb-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.3);
		border: none;
		padding: 0;
		cursor: pointer;
		transition: background 0.15s;
	}

	.album-lb-dot.active {
		background: white;
	}

	/* Expiring photo viewer lightbox */
	.expiring-lightbox {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.92);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.expiring-lightbox-inner {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		max-width: 90dvw;
	}

	.expiring-img {
		max-width: 100%;
		max-height: 70dvh;
		border-radius: 10px;
		object-fit: contain;
		display: block;
	}

	.expiring-countdown-ring {
		position: relative;
		width: 48px;
		height: 48px;
		flex-shrink: 0;
	}

	.countdown-svg {
		width: 48px;
		height: 48px;
	}

	.countdown-track {
		stroke: rgba(255, 255, 255, 0.2);
	}

	.countdown-arc {
		stroke: white;
		stroke-linecap: round;
		transition: stroke-dasharray 0.9s linear;
	}

	.countdown-number {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 1rem;
		font-weight: 700;
	}

	.expiring-close {
		position: absolute;
		top: -0.5rem;
		right: -0.5rem;
		background: rgba(255, 255, 255, 0.15);
		border: none;
		border-radius: 50%;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		cursor: pointer;
		padding: 0;
		margin: 0;
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

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Pill-shaped compose input */
	.compose-pill {
		display: flex;
		align-items: flex-end;
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 24px;
		padding: 0.35rem 0.35rem 0.35rem 1rem;
		gap: 0.35rem;
	}

	.compose-pill textarea {
		flex: 1;
		resize: none;
		margin: 0;
		padding: 0.3rem 0;
		font-size: 0.95rem;
		background: transparent;
		border: none;
		box-shadow: none;
		outline: none;
		min-height: 1.5rem;
		max-height: 120px;
		overflow-y: auto;
		line-height: 1.5;
		color: var(--pico-color);
	}

	.pill-action-btn {
		flex-shrink: 0;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 50%;
		border: none;
		padding: 0;
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--pico-muted-background-color);
		color: var(--pico-muted-color);
		cursor: default;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.pill-action-btn.has-content {
		background: var(--pico-primary);
		color: white;
		cursor: pointer;
	}

	.pill-action-btn.has-content:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.char-count {
		font-size: 0.7rem;
		margin-top: 0.25rem;
		margin-bottom: 0.25rem;
		text-align: right;
	}

	.char-count.short {
		color: var(--pico-muted-color);
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
		margin: 0.25rem 0 0.2rem;
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

	.exchange-actions form {
		margin: 0;
	}

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

	.exchange-offer form {
		margin: 0;
		flex-shrink: 0;
	}

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

	/* Decline strip above compose */
	.decline-strip {
		display: flex;
		justify-content: center;
		padding: 0.35rem 0 0.5rem;
	}

	.decline-open-btn {
		background: none;
		border: none;
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		font-family: inherit;
		margin: 0;
		width: auto;
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.15s;
	}

	.decline-open-btn:hover:not(:disabled) {
		color: var(--pico-del-color);
	}

	/* Decline phrase bottom sheet */
	.decline-sheet {
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 640px;
		z-index: 200;
		background: var(--pico-card-background-color);
		border-top: 1px solid var(--pico-muted-border-color);
		border-radius: 16px 16px 0 0;
		padding: 0.75rem 0 calc(1rem + env(safe-area-inset-bottom, 0px));
		display: flex;
		flex-direction: column;
	}

	.decline-sheet-title {
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		margin: 0.25rem 0 0.25rem;
		color: var(--pico-color);
	}

	.decline-sheet-hint {
		font-size: 0.78rem;
		color: var(--pico-muted-color);
		text-align: center;
		margin: 0 0 0.5rem;
	}

	.phrase-row {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2rem;
		width: 100%;
		padding: 0.875rem 1.25rem;
		background: none;
		border: none;
		border-top: 1px solid var(--pico-muted-border-color);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		margin: 0;
		transition: background 0.1s;
	}

	.phrase-row:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
	}

	.phrase-text {
		font-size: 0.9rem;
		color: var(--pico-color);
		line-height: 1.4;
	}

	.phrase-hint {
		font-size: 0.73rem;
		color: var(--pico-muted-color);
	}

	.decline-cancel {
		width: calc(100% - 2.5rem);
		margin: 0.75rem 1.25rem 0;
		padding: 0.7rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 10px;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--pico-color);
		cursor: pointer;
		font-family: inherit;
		transition: background 0.15s;
	}

	.decline-cancel:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	/* Pause nudge banner */
	.pause-nudge {
		position: fixed;
		top: 72px;
		left: 50%;
		transform: translateX(-50%);
		width: calc(100% - 2rem);
		max-width: 600px;
		z-index: 300;
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 12px;
		padding: 1rem 1.25rem;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
	}

	.pause-nudge-text {
		font-size: 0.9rem;
		font-weight: 500;
		margin: 0 0 0.75rem;
		color: var(--pico-color);
	}

	.pause-nudge-actions {
		display: flex;
		gap: 0.5rem;
	}

	.pause-nudge-actions form {
		margin: 0;
	}

	.pause-confirm-btn {
		background: var(--pico-primary);
		color: white;
		border: none;
		border-radius: 6px;
		padding: 0.45rem 1rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		margin: 0;
	}

	.pause-dismiss-btn {
		background: transparent;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 6px;
		padding: 0.45rem 1rem;
		font-size: 0.85rem;
		color: var(--pico-muted-color);
		cursor: pointer;
		font-family: inherit;
		margin: 0;
		width: auto;
	}
</style>
