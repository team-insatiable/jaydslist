<script lang="ts">
	import InstanceDocument from '$lib/components/InstanceDocument.svelte';
	let { data } = $props();
</script>

<InstanceDocument title={data.title} content={data.content} variant="rules" />
