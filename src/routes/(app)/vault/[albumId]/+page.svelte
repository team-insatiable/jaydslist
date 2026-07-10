<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { uploadPhotoToVault, SUPPORTED_IMAGE_TYPES } from '$lib/client/photo-upload';

	let { data, form } = $props();

	let actionSheetOpen = $state(false);
	let vaultPickerOpen = $state(false);
	let renaming = $state(false);
	let renameValue = $state(data.albumName);
	let submitting = $state<string | null>(null);
	let uploading = $state(false);
	let uploadProgress = $state<{ current: number; total: number } | null>(null);
	let uploadError = $state('');

	const MAX_BATCH = 10;

	let cameraInputEl: HTMLInputElement | undefined = $state();
	let libraryInputEl: HTMLInputElement | undefined = $state();
	let renameInputEl: HTMLInputElement | undefined = $state();

	// Drag-to-reorder state — customOrder overrides server data for optimistic reordering
	let customOrder = $state<{ id: string; deliveryUrl: string }[] | null>(null);
	const photoOrder = $derived(customOrder ?? data.albumPhotos);
	let draggedId = $state<string | null>(null);
	let dragOverId = $state<string | null>(null);
	// touch drag
	let touchDragId = $state<string | null>(null);
	let touchGhostEl: HTMLElement | null = null;

	function formatDate(d: Date | null): string {
		if (!d) return '';
		const dt = new Date(d);
		return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function startRename() {
		renameValue = data.albumName;
		renaming = true;
		setTimeout(() => renameInputEl?.focus(), 0);
	}

	async function handleUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files ?? []).slice(0, MAX_BATCH);
		if (!files.length) return;
		uploadError = '';
		uploading = true;
		uploadProgress = files.length > 1 ? { current: 0, total: files.length } : null;
		actionSheetOpen = false;
		const albumId = data.isUncategorized ? undefined : data.albumId;
		try {
			for (let i = 0; i < files.length; i++) {
				if (uploadProgress) uploadProgress = { current: i + 1, total: files.length };
				await uploadPhotoToVault(files[i], albumId);
			}
			await invalidateAll();
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed. Try again.';
		} finally {
			uploading = false;
			uploadProgress = null;
			if (cameraInputEl) cameraInputEl.value = '';
			if (libraryInputEl) libraryInputEl.value = '';
		}
	}

	// ── Desktop drag ──
	function onDragStart(e: DragEvent, id: string) {
		draggedId = id;
		e.dataTransfer!.effectAllowed = 'move';
	}
	function onDragOver(e: DragEvent, id: string) {
		e.preventDefault();
		dragOverId = id;
	}
	function onDrop(e: DragEvent, id: string) {
		e.preventDefault();
		applyReorder(id);
	}
	function onDragEnd() {
		draggedId = null;
		dragOverId = null;
	}

	// ── Touch drag — registered imperatively so touchmove can be non-passive ──
	let gridEl: HTMLElement | undefined = $state();

	$effect(() => {
		if (!gridEl) return;

		function handleTouchStart(e: TouchEvent) {
			const tile = (e.target as HTMLElement).closest('[data-photo-id]');
			if (!tile) return;
			touchDragId = tile.getAttribute('data-photo-id');
			const rect = (tile as HTMLElement).getBoundingClientRect();
			const ghost = (tile as HTMLElement).cloneNode(true) as HTMLElement;
			ghost.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;opacity:0.75;pointer-events:none;z-index:9999;border-radius:4px;overflow:hidden;`;
			document.body.appendChild(ghost);
			touchGhostEl = ghost;
		}

		function handleTouchMove(e: TouchEvent) {
			if (!touchDragId || !touchGhostEl) return;
			e.preventDefault();
			const touch = e.touches[0];
			const w = touchGhostEl.offsetWidth;
			const h = touchGhostEl.offsetHeight;
			touchGhostEl.style.left = `${touch.clientX - w / 2}px`;
			touchGhostEl.style.top = `${touch.clientY - h / 2}px`;
			touchGhostEl.style.display = 'none';
			const el = document.elementFromPoint(touch.clientX, touch.clientY);
			touchGhostEl.style.display = '';
			const over = el?.closest('[data-photo-id]');
			dragOverId = over ? (over.getAttribute('data-photo-id') ?? null) : null;
		}

		function handleTouchEnd() {
			if (touchDragId && dragOverId && touchDragId !== dragOverId) applyReorder(dragOverId);
			touchDragId = null;
			dragOverId = null;
			draggedId = null;
			touchGhostEl?.remove();
			touchGhostEl = null;
		}

		gridEl.addEventListener('touchstart', handleTouchStart);
		gridEl.addEventListener('touchmove', handleTouchMove, { passive: false });
		gridEl.addEventListener('touchend', handleTouchEnd);

		return () => {
			gridEl?.removeEventListener('touchstart', handleTouchStart);
			gridEl?.removeEventListener('touchmove', handleTouchMove);
			gridEl?.removeEventListener('touchend', handleTouchEnd);
		};
	});

	function applyReorder(targetId: string) {
		const fromId = draggedId ?? touchDragId;
		if (!fromId || fromId === targetId) return;
		const from = photoOrder.findIndex((p) => p.id === fromId);
		const to = photoOrder.findIndex((p) => p.id === targetId);
		if (from === -1 || to === -1) return;
		const next = [...photoOrder];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		customOrder = next;
		draggedId = null;
		// fire-and-forget save
		const fd = new FormData();
		fd.append('order', JSON.stringify(next.map((p) => p.id)));
		fetch('?/reorderPhotos', { method: 'POST', body: fd }).catch(() => {});
	}
</script>

<div class="album-page">
	<!-- Header -->
	<header class="album-header">
		<a href={resolve('/vault')} class="back-btn" aria-label="Back to vault">
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
		<span class="header-title">Edit Album</span>
		<div class="header-spacer"></div>
	</header>

	{#if form?.error || uploadError}
		<p class="form-error">{form?.error ?? uploadError}</p>
	{/if}

	<!-- Album info: thumbnail left, all text in right column -->
	<div class="album-info">
		<div class="cover-thumb">
			{#if photoOrder[0]}
				<img src={photoOrder[0].deliveryUrl} alt="Album cover" class="cover-img-blur" />
			{:else}
				<div class="cover-placeholder">
					<svg
						width="24"
						height="24"
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
				</div>
			{/if}
		</div>

		<div class="album-meta">
			{#if data.isUncategorized}
				<p class="album-name-static">{data.albumName}</p>
			{:else if renaming}
				<form
					method="POST"
					action="?/renameAlbum"
					class="rename-form"
					use:enhance={() => {
						submitting = 'rename';
						return async ({ update }) => {
							submitting = null;
							renaming = false;
							await update();
							await invalidateAll();
						};
					}}
				>
					<input
						type="text"
						name="name"
						bind:value={renameValue}
						bind:this={renameInputEl}
						maxlength="40"
						required
						onblur={() => {
							if (renameValue.trim() === data.albumName) renaming = false;
						}}
						onkeydown={(e) => {
							if (e.key === 'Escape') renaming = false;
						}}
					/>
					<button type="submit" class="save-btn" disabled={submitting === 'rename'}>Save</button>
				</form>
			{:else}
				<button type="button" class="name-row" onclick={startRename}>
					<span class="album-name-text">{data.albumName}</span>
					<svg
						class="pencil-icon"
						width="15"
						height="15"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
					</svg>
				</button>
			{/if}
			<p class="meta-hint">Only you see the album name</p>
			<p class="meta-stats">
				{data.albumPhotos.length}
				{data.albumPhotos.length === 1 ? 'item' : 'items'}
				{#if data.lastUpdated}· Last updated {formatDate(data.lastUpdated)}{/if}
			</p>
		</div>
	</div>

	<!-- Photo grid -->
	<div class="photo-grid" bind:this={gridEl}>
		<!-- Add button -->
		{#if !data.isUncategorized}
			<button
				type="button"
				class="add-tile"
				onclick={() => {
					actionSheetOpen = true;
					vaultPickerOpen = false;
				}}
				aria-label="Add photo"
			>
				{#if uploading}
					{#if uploadProgress}
						<span class="upload-count">{uploadProgress.current}/{uploadProgress.total}</span>
					{:else}
						<span class="spinner"></span>
					{/if}
				{:else}
					<svg
						width="28"
						height="28"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
					</svg>
				{/if}
			</button>
		{/if}

		{#each photoOrder as photo (photo.id)}
			<div
				class="photo-tile"
				class:drag-over={dragOverId === photo.id}
				class:dragging={draggedId === photo.id || touchDragId === photo.id}
				data-photo-id={photo.id}
				draggable="true"
				ondragstart={(e) => onDragStart(e, photo.id)}
				ondragover={(e) => onDragOver(e, photo.id)}
				ondrop={(e) => onDrop(e, photo.id)}
				ondragend={onDragEnd}
			>
				<img src={photo.deliveryUrl} alt="" />
				<form
					method="POST"
					action="?/deletePhoto"
					use:enhance={() => {
						submitting = photo.id;
						return async ({ update }) => {
							submitting = null;
							await update();
							await invalidateAll();
						};
					}}
				>
					<input type="hidden" name="photoId" value={photo.id} />
					<button
						type="submit"
						class="trash-btn"
						disabled={submitting === photo.id}
						aria-label="Delete photo"
					>
						<svg
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="3 6 5 6 21 6" /><path
								d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
							/><path d="M10 11v6" /><path d="M14 11v6" /><path
								d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
							/>
						</svg>
					</button>
				</form>
			</div>
		{/each}
	</div>

	{#if data.albumPhotos.length > 0}
		<p class="grid-hint">Tap to view</p>
	{/if}

	<!-- Hidden file inputs -->
	<input
		type="file"
		accept={SUPPORTED_IMAGE_TYPES.join(',')}
		capture="user"
		bind:this={cameraInputEl}
		onchange={handleUpload}
		style="display:none"
	/>
	<input
		type="file"
		accept={SUPPORTED_IMAGE_TYPES.join(',')}
		multiple
		bind:this={libraryInputEl}
		onchange={handleUpload}
		style="display:none"
	/>
</div>

<!-- Action sheet backdrop -->
{#if actionSheetOpen}
	<div
		class="backdrop"
		role="presentation"
		onclick={() => {
			actionSheetOpen = false;
			vaultPickerOpen = false;
		}}
	></div>
{/if}

<!-- Action sheet -->
{#if actionSheetOpen && !vaultPickerOpen}
	<div class="action-sheet">
		<button
			type="button"
			class="sheet-option"
			onclick={() => {
				vaultPickerOpen = true;
			}}
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
					points="17 8 12 3 7 8"
				/><line x1="12" y1="3" x2="12" y2="15" />
			</svg>
			Add from Previous Uploads
		</button>
		<button
			type="button"
			class="sheet-option"
			onclick={() => {
				actionSheetOpen = false;
				cameraInputEl?.click();
			}}
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path
					d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
				/><circle cx="12" cy="13" r="4" />
			</svg>
			Take a Photo
		</button>
		<button
			type="button"
			class="sheet-option"
			onclick={() => {
				actionSheetOpen = false;
				libraryInputEl?.click();
			}}
		>
			<svg
				width="20"
				height="20"
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
			Photo Library
		</button>
	</div>
{/if}

<!-- Vault picker panel -->
{#if vaultPickerOpen}
	<div class="action-sheet vault-picker">
		<div class="picker-header">
			<span class="picker-title">Previous Uploads</span>
			<button
				type="button"
				class="picker-close"
				onclick={() => {
					vaultPickerOpen = false;
					actionSheetOpen = false;
				}}>Done</button
			>
		</div>
		{#if data.otherPhotos.length === 0}
			<p class="picker-empty">No other photos in your vault.</p>
		{:else}
			<div class="picker-grid">
				{#each data.otherPhotos as photo (photo.id)}
					<form
						method="POST"
						action="?/addToAlbum"
						use:enhance={() => {
							submitting = 'add_' + photo.id;
							return async ({ update }) => {
								submitting = null;
								vaultPickerOpen = false;
								actionSheetOpen = false;
								await update();
								await invalidateAll();
							};
						}}
					>
						<input type="hidden" name="photoId" value={photo.id} />
						<button type="submit" class="picker-tile" disabled={submitting === 'add_' + photo.id}>
							<img src={photo.deliveryUrl} alt="" />
						</button>
					</form>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.album-page {
		padding-bottom: 2rem;
	}

	.album-header {
		display: flex;
		align-items: center;
		padding: 0.75rem 0 1rem;
		gap: 0.5rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		color: var(--pico-color);
		text-decoration: none;
		flex-shrink: 0;
	}

	.header-title {
		flex: 1;
		text-align: center;
		font-weight: 600;
		font-size: 1rem;
	}

	.header-spacer {
		width: 20px;
		flex-shrink: 0;
	}

	.form-error {
		color: var(--pico-del-color);
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	/* Info section */
	.album-info {
		display: flex;
		flex-direction: row;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	.cover-thumb {
		flex-shrink: 0;
		width: 90px;
		height: 90px;
		border-radius: 10px;
		overflow: hidden;
		flex-shrink: 0;
		background: #1a1a1a;
	}

	.cover-img-blur {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		filter: blur(6px);
		transform: scale(1.12);
	}

	.cover-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #555;
	}

	.album-meta {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}

	.album-name-static {
		font-weight: 600;
		font-size: 1rem;
		margin: 0;
	}

	.name-row {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: 0.4rem;
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		color: var(--pico-color);
		width: 100%;
		text-align: left;
	}

	.album-name-text {
		font-weight: 600;
		font-size: 1rem;
	}

	.pencil-icon {
		color: var(--pico-muted-color);
		flex-shrink: 0;
	}

	.rename-form {
		display: flex;
		gap: 0.4rem;
		align-items: center;
		margin: 0;
	}

	.rename-form input[type='text'] {
		flex: 1;
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		padding: 0.3rem 0.5rem;
	}

	.save-btn {
		width: auto;
		padding: 0.3rem 0.75rem;
		font-size: 0.85rem;
		margin: 0;
	}

	.meta-hint {
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		margin: 0;
	}

	.meta-stats {
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		margin: 0;
	}

	/* Photo grid */
	.photo-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 3px;
		touch-action: none;
	}

	.add-tile {
		aspect-ratio: 1;
		background: #1a1a1a;
		border: none;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #666;
		cursor: pointer;
		padding: 0;
		margin: 0;
		width: 100%;
	}

	.add-tile:hover {
		background: #242424;
		color: #888;
	}

	.photo-tile {
		position: relative;
		aspect-ratio: 1;
		border-radius: 4px;
		overflow: hidden;
	}

	.photo-tile img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.photo-tile.drag-over {
		outline: 2px solid var(--pico-primary);
		outline-offset: -2px;
	}

	.photo-tile.dragging {
		opacity: 0.4;
	}

	.photo-tile form {
		margin: 0;
		position: absolute;
		top: 4px;
		right: 4px;
	}

	.trash-btn {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.65);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		cursor: pointer;
		padding: 0;
		margin: 0;
	}

	.grid-hint {
		font-size: 0.75rem;
		color: var(--pico-muted-color);
		margin: 0.5rem 0 0;
		text-align: center;
	}

	/* Spinner */
	.upload-count {
		font-size: 0.75rem;
		font-weight: 600;
		color: #aaa;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid #444;
		border-top-color: #aaa;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		display: block;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Backdrop */
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 100;
	}

	/* Action sheet */
	.action-sheet {
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 640px;
		background: var(--pico-card-background-color, #111);
		border-radius: 16px 16px 0 0;
		z-index: 101;
		padding: 0.5rem 0 calc(env(safe-area-inset-bottom, 0px) + 1rem);
	}

	.sheet-option {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		width: 100%;
		background: none;
		border: none;
		padding: 0.9rem 1.25rem;
		font-size: 1rem;
		color: var(--pico-color);
		cursor: pointer;
		text-align: left;
		margin: 0;
	}

	.sheet-option:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	/* Vault picker */
	.vault-picker {
		max-height: 70vh;
		display: flex;
		flex-direction: column;
	}

	.picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.25rem 0.5rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
	}

	.picker-title {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.picker-close {
		background: none;
		border: none;
		color: var(--pico-primary);
		font-size: 0.9rem;
		cursor: pointer;
		padding: 0;
		margin: 0;
		width: auto;
	}

	.picker-empty {
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		text-align: center;
		padding: 1.5rem;
		margin: 0;
	}

	.picker-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 3px;
		overflow-y: auto;
		padding: 3px;
	}

	.picker-grid form {
		margin: 0;
	}

	.picker-tile {
		aspect-ratio: 1;
		width: 100%;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		background: #1a1a1a;
		border-radius: 4px;
		overflow: hidden;
		display: block;
	}

	.picker-tile img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
</style>
