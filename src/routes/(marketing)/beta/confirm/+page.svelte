<script lang="ts">
	let { data } = $props();
</script>

<main class="confirmation">
	<h1>You’re on the list.</h1>
	<p>
		Your {data.instanceName} beta signup is confirmed. We’ll be in touch when there is news to share.
	</p>
</main>

<style>
	.confirmation {
		max-width: 42rem;
		margin: 0 auto;
		padding: 5rem 1.5rem;
		text-align: center;
	}
	.confirmation p {
		color: var(--pico-muted-color);
		font-size: 1.1rem;
		line-height: 1.7;
	}
</style>
