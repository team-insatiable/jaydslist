<script lang="ts">
	import logo from '$lib/assets/logo.svg';
	let { size = 36 }: { size?: number } = $props();
</script>

<img src={logo} alt="" width={size} height={size} class="brand-mark" aria-hidden="true" />

<style>
	.brand-mark {
		display: block;
		flex-shrink: 0;
	}
</style>
