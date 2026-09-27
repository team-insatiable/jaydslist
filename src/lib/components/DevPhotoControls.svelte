<script lang="ts">
	import { onMount } from 'svelte';
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
	import { dev } from '$app/environment';
	let { value = $bindable('safe') }: { value?: string } = $props();
</script>

{#if dev}
	<label class="dev-photo-controls">
		Local test: simulate photo screening
		<select bind:value disabled={!ready}>
			<option value="safe">Safe</option>
			<option value="nsfw">NSFW</option>
			<option value="unknown">Uncertain</option>
		</select>
		<small>Photos stay on this computer. No Cloudflare Images or AWS calls.</small>
	</label>
{/if}

<style>
	.dev-photo-controls {
		display: block;
		padding: 0.75rem;
		margin-bottom: 1rem;
		border: 1px dashed var(--pico-muted-border-color);
		border-radius: 8px;
		font-size: 0.85rem;
	}
	select {
		margin: 0.5rem 0;
	}
</style>
