<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, onclose, children }: { title: string; onclose: () => void; children: Snippet } =
		$props();
	let dialog: HTMLDialogElement;
	$effect(() => {
		dialog.showModal();
	});
</script>

<dialog bind:this={dialog} {onclose} aria-label={title}>
	<article>
		<header>
			<h2>{title}</h2>
			<button type="button" aria-label="Close report form" onclick={() => dialog.close()}>×</button>
		</header>
		{@render children()}
	</article>
</dialog>

<style>
	dialog {
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--pico-color);
		width: min(30rem, calc(100vw - 2rem));
		max-width: none;
		max-height: calc(100dvh - 2rem);
		overflow: visible;
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 60%);
		backdrop-filter: blur(3px);
	}
	dialog article {
		width: 100%;
		box-sizing: border-box;
		padding: 1.5rem;
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 14px;
		box-shadow: 0 24px 80px rgb(0 0 0 / 40%);
		max-height: calc(100dvh - 2rem);
		overflow-y: auto;
		margin: auto;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 0 1rem;
		padding: 0;
		background: transparent;
		border: 0;
	}
	h2 {
		font-size: 1.1rem;
		margin: 0;
	}
	header button {
		background: transparent;
		border: 0;
		color: var(--pico-muted-color);
		font-size: 1.5rem;
		margin: 0;
		padding: 0;
		width: 44px;
		height: 44px;
	}
</style>
