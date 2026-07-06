<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { uploadPhotoToVault, SUPPORTED_IMAGE_TYPES } from '$lib/client/photo-upload';

	let { data, form } = $props();

	let submitting = $state<string | null>(null);
	let newAlbumName = $state('');
	let renamingAlbumId = $state<string | null>(null);
	let renameValue = $state('');
	let confirmingDeletePhotoId = $state<string | null>(null);

	let uploading = $state(false);
	let uploadError = $state('');
	let fileInputEl: HTMLInputElement | undefined = $state();

	const UNCATEGORIZED = 'uncategorized';

	const grouped = $derived.by(() => {
		const groups: Record<string, typeof data.photos> = { [UNCATEGORIZED]: [] };
		for (const album of data.albums) groups[album.id] = [];
		for (const photo of data.photos) {
			const key = photo.albumId && groups[photo.albumId] ? photo.albumId : UNCATEGORIZED;
			groups[key].push(photo);
		}
		return groups;
	});

	async function handleUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		uploadError = '';
		uploading = true;
		try {
			await uploadPhotoToVault(file);
			await invalidateAll();
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Photo upload failed. Try again.';
		} finally {
			uploading = false;
			if (fileInputEl) fileInputEl.value = '';
		}
	}

	function startRename(albumId: string, currentName: string) {
		renamingAlbumId = albumId;
		renameValue = currentName;
	}
</script>

<div>
	<h1>Photo Vault</h1>
	<p class="hint">
		Manage the photos you upload here. Pick from them when creating a listing — the same photo can
		be attached to more than one listing at a time.
	</p>

	{#if !data.isSupporter}
		<p class="supporter-notice">Photo vault is a supporter-account feature.</p>
	{/if}

	{#if form?.error}
		<p class="form-error">{form.error}</p>
	{/if}
	{#if uploadError}
		<p class="form-error">{uploadError}</p>
	{/if}

	<div class="vault-controls-wrap">
		{#if !data.isSupporter}
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
		<div class="vault-controls" class:disabled={!data.isSupporter}>
			<div class="upload-row">
				<input
					type="file"
					accept={SUPPORTED_IMAGE_TYPES.join(',')}
					bind:this={fileInputEl}
					onchange={handleUpload}
					disabled={uploading}
					aria-label="Upload a new photo"
				/>
				{#if uploading}
					<span class="spinner"></span>
				{/if}
			</div>

			<form
				method="POST"
				action="?/createAlbum"
				class="add-form"
				use:enhance={() => {
					submitting = 'create';
					return async ({ result, update }) => {
						submitting = null;
						if (result.type === 'success') newAlbumName = '';
						await update();
						await invalidateAll();
					};
				}}
			>
				<input
					type="text"
					name="name"
					bind:value={newAlbumName}
					placeholder="New album name"
					maxlength="40"
				/>
				<button
					type="submit"
					disabled={submitting === 'create'}
					aria-busy={submitting === 'create'}
				>
					+ Create album
				</button>
			</form>
		</div>
	</div>

	{#snippet albumSection(id: string, name: string, isUncategorized: boolean)}
		<section class="album-group">
			<div class="album-header">
				{#if renamingAlbumId === id}
					<form
						method="POST"
						action="?/renameAlbum"
						class="rename-form"
						use:enhance={() => {
							submitting = id + '_rename';
							return async ({ result, update }) => {
								submitting = null;
								if (result.type === 'success') renamingAlbumId = null;
								await update();
								await invalidateAll();
							};
						}}
					>
						<input type="hidden" name="id" value={id} />
						<input type="text" name="name" bind:value={renameValue} maxlength="40" required />
						<button type="submit" disabled={submitting === id + '_rename'}>Save</button>
						<button type="button" class="cancel-btn" onclick={() => (renamingAlbumId = null)}
							>Cancel</button
						>
					</form>
				{:else}
					<h2>{name}</h2>
					{#if !isUncategorized}
						<div class="album-actions">
							<button type="button" class="text-btn" onclick={() => startRename(id, name)}
								>Rename</button
							>
							<form
								method="POST"
								action="?/deleteAlbum"
								use:enhance={() => {
									submitting = id + '_delete_album';
									return async ({ update }) => {
										submitting = null;
										await update();
										await invalidateAll();
									};
								}}
							>
								<input type="hidden" name="id" value={id} />
								<button
									type="submit"
									class="text-btn delete-text"
									disabled={submitting === id + '_delete_album'}
								>
									Delete album
								</button>
							</form>
						</div>
					{/if}
				{/if}
			</div>

			{#if !isUncategorized}
				<p class="album-note">Deleting an album keeps its photos — they move to Uncategorized.</p>
			{/if}

			{#if grouped[id]?.length}
				<div class="photo-grid">
					{#each grouped[id] as photo (photo.id)}
						<div class="photo-tile">
							<img src={photo.deliveryUrl} alt="" />
							<form
								method="POST"
								action="?/moveToAlbum"
								use:enhance={() => {
									submitting = photo.id + '_move';
									return async ({ update }) => {
										submitting = null;
										await update();
										await invalidateAll();
									};
								}}
							>
								<input type="hidden" name="photoId" value={photo.id} />
								<select
									name="albumId"
									value={photo.albumId ?? ''}
									disabled={submitting === photo.id + '_move'}
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
								>
									<option value="">Uncategorized</option>
									{#each data.albums as album (album.id)}
										<option value={album.id}>{album.name}</option>
									{/each}
								</select>
							</form>

							{#if confirmingDeletePhotoId === photo.id}
								<div class="confirm-delete">
									<span>Delete this photo?</span>
									<div class="confirm-actions">
										<button
											type="button"
											class="cancel-btn"
											onclick={() => (confirmingDeletePhotoId = null)}>Cancel</button
										>
										<form
											method="POST"
											action="?/deletePhoto"
											use:enhance={() => {
												submitting = photo.id + '_delete';
												return async ({ update }) => {
													submitting = null;
													confirmingDeletePhotoId = null;
													await update();
													await invalidateAll();
												};
											}}
										>
											<input type="hidden" name="photoId" value={photo.id} />
											<button type="submit" class="confirm-yes">Yes, delete</button>
										</form>
									</div>
								</div>
							{:else}
								<button
									type="button"
									class="remove-btn"
									onclick={() => (confirmingDeletePhotoId = photo.id)}
									aria-label="Delete photo"
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
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-note">No photos here yet.</p>
			{/if}
		</section>
	{/snippet}

	{@render albumSection(UNCATEGORIZED, 'Uncategorized', true)}
	{#each data.albums as album (album.id)}
		{@render albumSection(album.id, album.name, false)}
	{/each}
</div>

<style>
	.hint {
		color: var(--pico-muted-color);
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.supporter-notice {
		font-size: 0.85rem;
		color: var(--pico-muted-color);
		margin-bottom: 1rem;
	}

	.form-error {
		color: var(--pico-del-color);
		font-size: 0.875rem;
	}

	.vault-controls-wrap {
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

	.vault-controls.disabled {
		pointer-events: none;
		opacity: 0.45;
	}

	.upload-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.add-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
	}

	.add-form input[type='text'] {
		flex: 1;
	}

	.add-form button {
		width: auto;
		flex-shrink: 0;
	}

	.album-group {
		margin-bottom: 2rem;
	}

	.album-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.4rem;
	}

	.album-header h2 {
		font-size: 0.95rem;
		font-weight: 700;
		margin: 0;
	}

	.album-actions {
		display: flex;
		gap: 0.75rem;
	}

	.album-actions form {
		margin: 0;
	}

	.text-btn {
		background: none;
		border: none;
		color: var(--pico-muted-color);
		font-size: 0.8rem;
		cursor: pointer;
		padding: 0;
		width: auto;
		margin: 0;
	}

	.delete-text {
		color: var(--pico-del-color);
	}

	.rename-form {
		display: flex;
		gap: 0.5rem;
		flex: 1;
		margin: 0;
	}

	.rename-form input[type='text'] {
		flex: 1;
	}

	.rename-form button {
		width: auto;
		flex-shrink: 0;
	}

	.album-note {
		font-size: 0.78rem;
		color: var(--pico-muted-color);
		margin: 0 0 0.6rem;
	}

	.empty-note {
		font-size: 0.85rem;
		color: var(--pico-muted-color);
	}

	.photo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: 0.75rem;
	}

	.photo-tile {
		position: relative;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 8px;
		overflow: hidden;
		background: none;
	}

	.photo-tile img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		display: block;
	}

	.photo-tile select {
		width: 100%;
		font-size: 0.75rem;
		padding: 0.3rem;
		margin: 0;
		border: none;
		border-top: 1px solid var(--pico-muted-border-color);
		border-radius: 0;
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

	.confirm-delete {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		color: #fff;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem;
		text-align: center;
		font-size: 0.75rem;
	}

	.confirm-actions {
		display: flex;
		gap: 0.4rem;
	}

	.confirm-actions form {
		margin: 0;
	}

	.confirm-yes {
		background: var(--pico-del-color);
		border-color: var(--pico-del-color);
		width: auto;
		font-size: 0.75rem;
		padding: 0.3rem 0.5rem;
		margin: 0;
	}

	.cancel-btn {
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.4);
		color: #fff;
		width: auto;
		font-size: 0.75rem;
		padding: 0.3rem 0.5rem;
		margin: 0;
		cursor: pointer;
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
</style>
