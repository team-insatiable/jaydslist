<script lang="ts">
	import { uploadPhotoToVault, SUPPORTED_IMAGE_TYPES } from '$lib/client/photo-upload';

	interface VaultPhoto {
		id: string;
		deliveryUrl: string;
		uploadedAt: Date;
		albumId: string | null;
	}

	interface VaultAlbum {
		id: string;
		name: string;
	}

	let {
		photoIds = $bindable(),
		vaultPhotos = $bindable(),
		vaultAlbums = $bindable(),
		isSupporter,
		maxPhotos = 3,
		onUploadingChange
	}: {
		photoIds: string[];
		vaultPhotos: VaultPhoto[];
		vaultAlbums: VaultAlbum[];
		isSupporter: boolean;
		maxPhotos?: number;
		onUploadingChange?: (uploading: boolean) => void;
	} = $props();

	let pickerOpen = $state(false);
	let currentAlbumId = $state<string | null>(null);
	let photoUploading = $state(false);
	let photoError = $state('');
	let fileInputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		onUploadingChange?.(photoUploading);
	});

	const coverMap = $derived.by(() => {
		const map: Record<string, string> = {};
		for (const p of vaultPhotos) {
			if (p.albumId && !map[p.albumId]) map[p.albumId] = p.deliveryUrl;
		}
		return map;
	});

	const countMap = $derived.by(() => {
		const map: Record<string, number> = {};
		for (const p of vaultPhotos) {
			if (p.albumId) map[p.albumId] = (map[p.albumId] ?? 0) + 1;
		}
		return map;
	});

	const uncategorizedPhotos = $derived(
		vaultPhotos.filter((p) => !p.albumId && !photoIds.includes(p.id))
	);

	const currentAlbumPhotos = $derived(
		currentAlbumId
			? vaultPhotos.filter((p) => p.albumId === currentAlbumId && !photoIds.includes(p.id))
			: []
	);

	const currentAlbumName = $derived(vaultAlbums.find((a) => a.id === currentAlbumId)?.name ?? '');

	const canAddMore = $derived(photoIds.length < maxPhotos);

	const hasAnything = $derived(vaultPhotos.length > 0 || vaultAlbums.length > 0);

	function photoById(id: string): VaultPhoto | undefined {
		return vaultPhotos.find((p) => p.id === id);
	}

	function openPicker() {
		if (!isSupporter || !canAddMore) return;
		photoError = '';
		if (!hasAnything) {
			triggerFilePicker();
			return;
		}
		currentAlbumId = null;
		pickerOpen = true;
	}

	function closePicker() {
		pickerOpen = false;
		currentAlbumId = null;
	}

	function selectVaultPhoto(id: string) {
		photoIds = [...photoIds, id];
		closePicker();
	}

	function removePhoto(id: string) {
		photoIds = photoIds.filter((pid) => pid !== id);
	}

	function triggerFilePicker() {
		fileInputEl?.click();
	}

	async function handleFileSelect(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		photoError = '';
		photoUploading = true;
		try {
			const { id: vaultPhotoId, deliveryUrl } = await uploadPhotoToVault(file);
			// Add to vault (uncategorized) — user taps it in the grid to select for the listing
			vaultPhotos = [
				{ id: vaultPhotoId, deliveryUrl, uploadedAt: new Date(), albumId: null },
				...vaultPhotos
			];
		} catch (err) {
			photoError = err instanceof Error ? err.message : 'Photo upload failed. Try again.';
		} finally {
			photoUploading = false;
			if (fileInputEl) fileInputEl.value = '';
		}
	}
</script>

<div class="photo-picker">
	{#if !isSupporter}
		<p class="supporter-notice">
			Photos are a supporter-account feature. Your listing will post without photos.
		</p>
	{/if}

	<div class="photo-slots-wrap">
		{#if !isSupporter}
			<div class="supporter-badge">
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
					<rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
				</svg>
				Supporter feature
			</div>
		{/if}
		<div class="photo-slots" class:disabled={!isSupporter}>
			{#each Array(maxPhotos) as _, i (i)}
				{#if photoIds[i]}
					{@const photo = photoById(photoIds[i])}
					<div class="photo-slot filled">
						{#if photo}
							<img src={photo.deliveryUrl} alt="" />
						{/if}
						<button
							type="button"
							class="remove-btn"
							onclick={() => removePhoto(photoIds[i])}
							disabled={!isSupporter}
							aria-label="Remove photo"
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>
				{:else}
					<button
						type="button"
						class="photo-slot empty"
						onclick={openPicker}
						disabled={!isSupporter || !canAddMore || photoUploading}
						aria-label="Add photo"
					>
						+
					</button>
				{/if}
			{/each}
		</div>
	</div>

	{#if photoError}
		<p class="photo-error">{photoError}</p>
	{/if}

	<input
		type="file"
		accept={SUPPORTED_IMAGE_TYPES.join(',')}
		class="file-input"
		bind:this={fileInputEl}
		onchange={handleFileSelect}
		disabled={photoUploading}
		aria-label="Upload a new photo"
	/>

	{#if pickerOpen}
		<div class="picker-panel">
			{#if currentAlbumId}
				<!-- Album drill-in view -->
				<div class="panel-header">
					<button
						type="button"
						class="back-btn"
						aria-label="Back"
						onclick={() => (currentAlbumId = null)}
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="15 18 9 12 15 6" />
						</svg>
					</button>
					<span class="panel-title">{currentAlbumName}</span>
				</div>
				{#if currentAlbumPhotos.length === 0}
					<p class="empty-hint">No photos in this album yet.</p>
				{:else}
					<div class="vault-grid">
						{#each currentAlbumPhotos as photo (photo.id)}
							<button
								type="button"
								class="vault-thumb"
								onclick={() => selectVaultPhoto(photo.id)}
								aria-label="Use this photo"
							>
								<img src={photo.deliveryUrl} alt="" />
							</button>
						{/each}
					</div>
				{/if}
			{:else}
				<!-- Root view: albums + uncategorized -->
				<p class="panel-label">Choose from your vault</p>

				{#if vaultAlbums.length > 0}
					<div class="album-row">
						{#each vaultAlbums as album (album.id)}
							<button
								type="button"
								class="album-tile"
								onclick={() => (currentAlbumId = album.id)}
								aria-label="Open album {album.name}"
							>
								<div class="album-cover">
									{#if coverMap[album.id]}
										<img src={coverMap[album.id]} alt="" class="album-cover-img" />
									{:else}
										<div class="album-cover-empty">
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
										</div>
									{/if}
									<div class="album-badge">
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
											<polyline points="9 18 15 12 9 6" />
										</svg>
									</div>
								</div>
								<span class="album-name">{album.name}</span>
								<span class="album-count">{countMap[album.id] ?? 0}</span>
							</button>
						{/each}
					</div>
				{/if}

				{#if vaultAlbums.length > 0 && uncategorizedPhotos.length > 0}
					<p class="section-label">Uncategorized</p>
				{/if}
				<div class="vault-grid">
					<button
						type="button"
						class="picker-add-tile"
						onclick={triggerFilePicker}
						disabled={photoUploading}
						aria-label="Upload new photo"
					>
						{#if photoUploading}
							<span class="picker-spinner"></span>
						{:else}
							<svg
								width="26"
								height="26"
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
					{#each uncategorizedPhotos as photo (photo.id)}
						<button
							type="button"
							class="vault-thumb"
							onclick={() => selectVaultPhoto(photo.id)}
							aria-label="Use this photo"
						>
							<img src={photo.deliveryUrl} alt="" />
						</button>
					{/each}
				</div>
			{/if}

			<div class="panel-actions">
				<button type="button" class="cancel-btn" onclick={closePicker}>Cancel</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.photo-picker {
		margin-bottom: 1.25rem;
	}

	.supporter-notice {
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		margin-bottom: 0.6rem;
	}

	.photo-slots-wrap {
		position: relative;
		padding-top: 2.25rem;
	}

	.supporter-badge {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: color-mix(in srgb, #d97706 16%, transparent);
		border: 1px solid color-mix(in srgb, #d97706 40%, transparent);
		border-radius: 999px;
		padding: 0.3rem 0.7rem;
		font-size: 0.72rem;
		font-weight: 700;
		color: #d97706;
		white-space: nowrap;
		pointer-events: none;
	}

	.photo-slots {
		display: flex;
		gap: 0.75rem;
	}

	.photo-slots.disabled {
		pointer-events: none;
		opacity: 0.45;
	}

	.photo-slot {
		width: 84px;
		height: 84px;
		border-radius: 8px;
		flex-shrink: 0;
	}

	.photo-slot.empty {
		border: 1px dashed var(--pico-muted-border-color);
		background: none;
		color: var(--pico-muted-color);
		font-size: 1.75rem;
		font-weight: 400;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
	}

	.photo-slot.empty:hover:not(:disabled) {
		border-color: var(--pico-primary);
		color: var(--pico-primary);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.photo-slot.filled {
		position: relative;
		border: 1px solid var(--pico-muted-border-color);
		overflow: hidden;
	}

	.photo-slot.filled img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.remove-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		background: rgba(0, 0, 0, 0.6);
		border: none;
		border-radius: 50%;
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		cursor: pointer;
		padding: 0;
		margin: 0;
	}

	.photo-error {
		font-size: 0.8rem;
		color: var(--pico-del-color);
		margin-top: 0.5rem;
		margin-bottom: 0;
	}

	.picker-panel {
		margin-top: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 8px;
		background: var(--pico-card-background-color);
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.back-btn {
		background: none;
		border: none;
		padding: 0.25rem;
		margin: 0;
		cursor: pointer;
		color: var(--pico-color);
		display: flex;
		align-items: center;
		justify-content: flex-start;
		width: auto;
	}

	.panel-title {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.panel-label {
		font-size: 0.8rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.section-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--pico-muted-color);
		margin: 0.75rem 0 0.4rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	/* Album row */
	.album-row {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 0.25rem;
		margin-bottom: 0.25rem;
	}

	.album-tile {
		flex-shrink: 0;
		width: 72px;
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.album-cover {
		position: relative;
		width: 72px;
		height: 72px;
		border-radius: 8px;
		overflow: hidden;
		background: #1a1a1a;
		border: 1px solid var(--pico-muted-border-color);
	}

	.album-cover-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		filter: blur(5px);
		transform: scale(1.1);
	}

	.album-cover-empty {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #555;
	}

	.album-badge {
		position: absolute;
		bottom: 4px;
		right: 4px;
		background: rgba(0, 0, 0, 0.55);
		border-radius: 50%;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
	}

	.album-name {
		font-size: 0.7rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 72px;
		display: block;
		color: var(--pico-color);
	}

	.album-count {
		font-size: 0.65rem;
		color: var(--pico-muted-color);
	}

	/* Photo grid */
	.vault-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.vault-thumb {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 6px;
		border: 1px solid var(--pico-muted-border-color);
		background: none;
		overflow: hidden;
		padding: 0;
		cursor: pointer;
	}

	.vault-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.empty-hint {
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		margin-bottom: 0.75rem;
	}

	.file-input {
		display: none;
	}

	.picker-add-tile {
		aspect-ratio: 1;
		background: #1a1a1a;
		border: 2px dashed #333;
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

	.picker-add-tile:hover:not(:disabled) {
		background: #242424;
		border-color: #555;
		color: #888;
	}

	.picker-spinner {
		width: 16px;
		height: 16px;
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

	.panel-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.25rem;
	}

	.cancel-btn {
		width: auto;
		margin: 0;
		background: none;
		border: none;
		color: var(--pico-muted-color);
		font-size: 0.875rem;
		cursor: pointer;
		padding: 0.5rem;
	}
</style>
