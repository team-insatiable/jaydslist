<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let creatingAlbum = $state(false);
	let newAlbumName = $state('');
	let submitting = $state(false);

	const uncategorizedPhotos = $derived(data.photos.filter((p) => !p.albumId));

	// Build cover url map: albumId → first photo delivery url
	const coverMap = $derived.by(() => {
		const map: Record<string, string> = {};
		for (const photo of data.photos) {
			if (photo.albumId && !map[photo.albumId]) {
				map[photo.albumId] = photo.deliveryUrl;
			}
		}
		return map;
	});

	// Count photos per album
	const countMap = $derived.by(() => {
		const map: Record<string, number> = {};
		for (const photo of data.photos) {
			if (photo.albumId) map[photo.albumId] = (map[photo.albumId] ?? 0) + 1;
		}
		return map;
	});
</script>

<div>
	<div class="vault-top">
		<h1>Photo Vault</h1>
		{#if data.isSupporter}
			<button
				type="button"
				class="new-album-btn"
				onclick={() => {
					creatingAlbum = !creatingAlbum;
					newAlbumName = '';
				}}
			>
				{creatingAlbum ? 'Cancel' : '+ New Album'}
			</button>
		{/if}
	</div>

	{#if !data.isSupporter}
		<div class="supporter-gate">
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
				<rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
			</svg>
			Photo vault is a supporter feature.
		</div>
	{/if}

	{#if form?.error}
		<p class="form-error">{form.error}</p>
	{/if}

	{#if creatingAlbum}
		<form
			method="POST"
			action="?/createAlbum"
			class="new-album-form"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'success') {
						newAlbumName = '';
						creatingAlbum = false;
					}
					await update();
					await invalidateAll();
				};
			}}
		>
			<input
				type="text"
				name="name"
				bind:value={newAlbumName}
				placeholder="Album name"
				maxlength="40"
				required
				autofocus
			/>
			<button type="submit" disabled={submitting} aria-busy={submitting}>Create</button>
		</form>
	{/if}

	{#if data.albums.length === 0 && uncategorizedPhotos.length === 0}
		<p class="empty-hint">No albums yet. Create one to organize your photos.</p>
	{/if}

	<!-- Album grid -->
	{#if data.albums.length > 0 || uncategorizedPhotos.length > 0}
		<div class="album-grid">
			{#each data.albums as album (album.id)}
				<a href={resolve(`/vault/${album.id}`)} class="album-card">
					<div class="album-cover">
						{#if coverMap[album.id]}
							<img src={coverMap[album.id]} alt="" />
						{:else}
							<div class="album-cover-empty">
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
									<rect x="3" y="3" width="18" height="18" rx="2" /><circle
										cx="8.5"
										cy="8.5"
										r="1.5"
									/><polyline points="21 15 16 10 5 21" />
								</svg>
							</div>
						{/if}
						<div class="album-overlay">
							<span class="album-card-name">{album.name}</span>
							<span class="album-card-count">{countMap[album.id] ?? 0}</span>
						</div>
					</div>
				</a>
			{/each}

			{#if uncategorizedPhotos.length > 0}
				<a href={resolve('/vault/uncategorized')} class="album-card">
					<div class="album-cover">
						<img src={uncategorizedPhotos[0].deliveryUrl} alt="" />
						<div class="album-overlay">
							<span class="album-card-name">Uncategorized</span>
							<span class="album-card-count">{uncategorizedPhotos.length}</span>
						</div>
					</div>
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.vault-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.vault-top h1 {
		margin: 0;
	}

	.new-album-btn {
		width: auto;
		padding: 0.4rem 0.9rem;
		font-size: 0.875rem;
		margin: 0;
	}

	.supporter-gate {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: var(--pico-muted-color);
		margin-bottom: 1rem;
	}

	.form-error {
		color: var(--pico-del-color);
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	.new-album-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.new-album-form input[type='text'] {
		flex: 1;
		margin: 0;
	}

	.new-album-form button {
		width: auto;
		flex-shrink: 0;
		margin: 0;
	}

	.empty-hint {
		font-size: 0.875rem;
		color: var(--pico-muted-color);
	}

	.album-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.album-card {
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.album-cover {
		position: relative;
		aspect-ratio: 1;
		border-radius: 10px;
		overflow: hidden;
		background: #1a1a1a;
	}

	.album-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.album-cover-empty {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #555;
	}

	.album-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.72));
		padding: 1.5rem 0.6rem 0.5rem;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
	}

	.album-card-name {
		color: #fff;
		font-size: 0.85rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.album-card-count {
		color: rgba(255, 255, 255, 0.75);
		font-size: 0.78rem;
		flex-shrink: 0;
		margin-left: 0.25rem;
	}
</style>
