<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let creatingAlbum = $state(false);
	let newAlbumName = $state('');
	let submitting = $state(false);
	let activeMenu = $state<string | null>(null);
	let deletingId = $state<string | null>(null);

	const uncategorizedPhotos = $derived(data.photos.filter((p) => !p.albumId));

	const coverMap = $derived.by(() => {
		const map: Record<string, string> = {};
		for (const photo of data.photos) {
			if (photo.albumId && !map[photo.albumId]) {
				map[photo.albumId] = photo.deliveryUrl;
			}
		}
		return map;
	});

	const countMap = $derived.by(() => {
		const map: Record<string, number> = {};
		for (const photo of data.photos) {
			if (photo.albumId) map[photo.albumId] = (map[photo.albumId] ?? 0) + 1;
		}
		return map;
	});

	function closeMenu() {
		activeMenu = null;
	}
</script>

<div class="albums-page">
	<header class="albums-header">
		<h1>My Albums</h1>
	</header>

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

	<div class="album-grid">
		<!-- New album tile -->
		<button
			type="button"
			class="album-new-tile"
			onclick={() => {
				newAlbumName = '';
				creatingAlbum = true;
			}}
			disabled={!data.isSupporter}
			aria-label="Create new album"
		>
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
				<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
			</svg>
		</button>

		{#each data.albums as album (album.id)}
			<div class="album-card-wrap">
				<a href={resolve(`/vault/${album.id}`)} class="album-card" aria-label={album.name}>
					<div class="album-cover">
						{#if coverMap[album.id]}
							<img src={coverMap[album.id]} alt="" class="album-cover-img" />
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
							<span class="album-card-count">{countMap[album.id] ?? 0} items</span>
						</div>
					</div>
				</a>

				<button
					type="button"
					class="album-menu-btn"
					onclick={(e) => {
						e.preventDefault();
						activeMenu = activeMenu === album.id ? null : album.id;
					}}
					aria-label="Album options"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
						<circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle
							cx="12"
							cy="19"
							r="2"
						/>
					</svg>
				</button>
			</div>
		{/each}

		{#if uncategorizedPhotos.length > 0}
			<div class="album-card-wrap">
				<a href={resolve('/vault/uncategorized')} class="album-card" aria-label="Uncategorized">
					<div class="album-cover">
						<img src={uncategorizedPhotos[0].deliveryUrl} alt="" class="album-cover-img" />
						<div class="album-overlay">
							<span class="album-card-name">Uncategorized</span>
							<span class="album-card-count">{uncategorizedPhotos.length} items</span>
						</div>
					</div>
				</a>
			</div>
		{/if}
	</div>

	{#if data.albums.length === 0 && uncategorizedPhotos.length === 0 && data.isSupporter}
		<p class="empty-hint">No albums yet. Tap + to create one.</p>
	{/if}
</div>

<!-- Album options action sheet -->
{#if activeMenu}
	<div
		class="sheet-backdrop"
		role="presentation"
		onclick={closeMenu}
		onkeydown={(e) => e.key === 'Escape' && closeMenu()}
	></div>
	<div class="action-sheet" role="dialog" aria-modal="true">
		<div class="sheet-handle"></div>
		<a href={resolve(`/vault/${activeMenu}`)} class="sheet-item" onclick={closeMenu}>
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
				<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
			</svg>
			View Album
		</a>
		<form
			method="POST"
			action="?/deleteAlbum"
			use:enhance={() => {
				deletingId = activeMenu;
				closeMenu();
				return async ({ update }) => {
					deletingId = null;
					await update();
					await invalidateAll();
				};
			}}
		>
			<input type="hidden" name="id" value={activeMenu} />
			<button type="submit" class="sheet-item sheet-item-danger" disabled={deletingId !== null}>
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
					<polyline points="3 6 5 6 21 6" /><path
						d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
					/><path d="M10 11v6" /><path d="M14 11v6" /><path
						d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
					/>
				</svg>
				Delete Album
			</button>
		</form>
	</div>
{/if}

<!-- Create album bottom sheet -->
{#if creatingAlbum}
	<div
		class="sheet-backdrop"
		role="presentation"
		onclick={() => (creatingAlbum = false)}
		onkeydown={(e) => e.key === 'Escape' && (creatingAlbum = false)}
	></div>
	<div class="action-sheet create-sheet" role="dialog" aria-modal="true">
		<div class="sheet-handle"></div>
		<p class="sheet-title">New Album</p>
		<form
			method="POST"
			action="?/createAlbum"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'success' && result.data?.albumId) {
						await goto(resolve(`/vault/${result.data.albumId}`));
					} else {
						await update();
						await invalidateAll();
					}
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
	</div>
{/if}

<style>
	.albums-page {
		padding-bottom: 2rem;
	}

	.albums-header {
		margin-bottom: 1rem;
	}

	.albums-header h1 {
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

	.empty-hint {
		font-size: 0.875rem;
		color: var(--pico-muted-color);
		margin-top: 1rem;
	}

	.album-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.album-new-tile {
		aspect-ratio: 1;
		background: #1a1a1a;
		border: 2px dashed #333;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #666;
		cursor: pointer;
		padding: 0;
		margin: 0;
		width: 100%;
		transition:
			border-color 0.15s,
			color 0.15s;
	}

	.album-new-tile:hover:not(:disabled) {
		border-color: #555;
		color: #999;
	}

	.album-new-tile:disabled {
		cursor: default;
		opacity: 0.4;
	}

	.album-card-wrap {
		position: relative;
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

	.album-cover-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		filter: blur(6px);
		transform: scale(1.12);
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
		flex-direction: column;
		align-items: flex-start;
		gap: 0.1rem;
	}

	.album-card-name {
		color: #fff;
		font-size: 0.85rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.album-card-count {
		color: rgba(255, 255, 255, 0.65);
		font-size: 0.75rem;
	}

	.album-menu-btn {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.55);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		cursor: pointer;
		padding: 0;
		margin: 0;
		backdrop-filter: blur(4px);
	}

	/* Action sheet */
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 200;
	}

	.action-sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--pico-card-background-color);
		border-radius: 16px 16px 0 0;
		padding: 0.5rem 0 calc(env(safe-area-inset-bottom) + 1rem);
		z-index: 201;
		display: flex;
		flex-direction: column;
	}

	.sheet-handle {
		width: 36px;
		height: 4px;
		background: var(--pico-muted-border-color);
		border-radius: 2px;
		margin: 0.5rem auto 0.75rem;
	}

	.sheet-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--pico-muted-color);
		text-align: center;
		margin: 0 0 0.75rem;
	}

	.sheet-item {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 0.9rem 1.25rem;
		font-size: 1rem;
		color: var(--pico-color);
		text-decoration: none;
		background: none;
		border: none;
		width: 100%;
		text-align: left;
		cursor: pointer;
		margin: 0;
	}

	.sheet-item:hover {
		background: var(--pico-muted-background-color);
	}

	.sheet-item-danger {
		color: var(--pico-del-color);
	}

	.create-sheet {
		padding-left: 1rem;
		padding-right: 1rem;
	}

	.create-sheet form {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.create-sheet input[type='text'] {
		flex: 1;
		margin: 0;
	}

	.create-sheet button[type='submit'] {
		width: auto;
		flex-shrink: 0;
		margin: 0;
	}
</style>
