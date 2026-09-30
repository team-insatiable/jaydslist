<script lang="ts">
	let { size = 36 }: { size?: number } = $props();
</script>

<img src="/logo.png" alt="" width={size} height={size} class="brand-mark" aria-hidden="true" />

<style>
	.brand-mark {
		display: block;
		flex-shrink: 0;
	}
</style>
