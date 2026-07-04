<script lang="ts">
	interface VaultPhoto {
		id: string;
		deliveryUrl: string;
		uploadedAt: Date;
	}

	let {
		photoIds = $bindable(),
		vaultPhotos = $bindable(),
		isSupporter,
		maxPhotos = 3,
		onUploadingChange
	}: {
		photoIds: string[];
		vaultPhotos: VaultPhoto[];
		isSupporter: boolean;
		maxPhotos?: number;
		onUploadingChange?: (uploading: boolean) => void;
	} = $props();

	let pickerOpen = $state(false);
	let photoUploading = $state(false);
	let photoError = $state('');
	let fileInputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		onUploadingChange?.(photoUploading);
	});

	const availableVaultPhotos = $derived(vaultPhotos.filter((p) => !photoIds.includes(p.id)));
	const canAddMore = $derived(photoIds.length < maxPhotos);

	function photoById(id: string): VaultPhoto | undefined {
		return vaultPhotos.find((p) => p.id === id);
	}

	function openPicker() {
		if (!isSupporter || !canAddMore) return;
		photoError = '';
		// Nothing to pick from yet — skip the panel and go straight to the file
		// picker instead of making the common "just add a photo" case take two
		// clicks (+ then Upload new photo).
		if (availableVaultPhotos.length === 0) {
			triggerFilePicker();
			return;
		}
		pickerOpen = true;
	}

	function closePicker() {
		pickerOpen = false;
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

			const confirmRes = await fetch('/api/photos/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cfImageId: id, target: 'vault' })
			});
			if (!confirmRes.ok) {
				const errBody = (await confirmRes.json().catch(() => null)) as { message?: string } | null;
				throw new Error(errBody?.message ?? 'Could not save photo to your vault');
			}
			const { id: vaultPhotoId } = (await confirmRes.json()) as { id: string };

			vaultPhotos = [{ id: vaultPhotoId, deliveryUrl, uploadedAt: new Date() }, ...vaultPhotos];
			photoIds = [...photoIds, vaultPhotoId];
			closePicker();
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
					aria-busy={photoUploading}
					aria-label="Add photo"
				>
					{#if photoUploading}
						<span class="spinner"></span>
					{:else}
						+
					{/if}
				</button>
			{/if}
		{/each}
	</div>

	{#if photoError}
		<p class="photo-error">{photoError}</p>
	{/if}

	<input
		type="file"
		accept="image/jpeg,image/png,image/gif,image/webp"
		class="file-input"
		bind:this={fileInputEl}
		onchange={handleFileSelect}
		disabled={photoUploading}
		aria-label="Upload a new photo"
	/>

	{#if pickerOpen}
		<div class="picker-panel">
			<p class="panel-label">Choose from your vault</p>
			<div class="vault-grid">
				{#each availableVaultPhotos as photo (photo.id)}
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
			<div class="panel-actions">
				<button
					type="button"
					class="upload-btn"
					onclick={triggerFilePicker}
					disabled={photoUploading}
					aria-busy={photoUploading}
				>
					{photoUploading ? 'Uploading…' : '+ Upload new photo'}
				</button>
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

	.spinner {
		width: 16px;
		height: 16px;
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

	.panel-label {
		font-size: 0.8rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

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

	.file-input {
		display: none;
	}

	.panel-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.upload-btn {
		width: auto;
		margin: 0;
		font-size: 0.875rem;
		padding: 0.5rem 1rem;
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
