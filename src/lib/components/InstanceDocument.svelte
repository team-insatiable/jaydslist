<script lang="ts">
	let { title, content }: { title: string; content: string } = $props();

	function escapeHtml(value: string) {
		return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
	}

	function inline(value: string) {
		return escapeHtml(value)
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>');
	}

	function renderMarkdown(markdown: string) {
		const blocks: string[] = [];
		let paragraph: string[] = [];
		let list: string[] = [];

		const flushParagraph = () => {
			if (paragraph.length) blocks.push(`<p>${inline(paragraph.join(' '))}</p>`);
			paragraph = [];
		};
		const flushList = () => {
			if (list.length)
				blocks.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
			list = [];
		};

		for (const rawLine of markdown.trim().split('\n')) {
			const line = rawLine.trim();
			if (!line) {
				flushParagraph();
				flushList();
				continue;
			}
			const heading = /^(#{1,3})\s+(.+)$/.exec(line);
			if (heading) {
				flushParagraph();
				flushList();
				const level = heading[1].length + 1;
				blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
				continue;
			}
			const item = /^[-*]\s+(.+)$/.exec(line);
			if (item) {
				flushParagraph();
				list.push(item[1]);
				continue;
			}
			flushList();
			paragraph.push(line);
		}
		flushParagraph();
		flushList();
		return blocks.join('\n');
	}

	const html = $derived(renderMarkdown(content));
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<main class="document-page">
	<article class="document-content">
		<!-- Instance Markdown is escaped and rendered by renderMarkdown above. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html html}
	</article>
</main>

<style>
	.document-page {
		max-width: 52rem;
		margin-inline: auto;
		padding: 3.5rem 1.5rem 5rem;
	}

	.document-content :global(h1) {
		margin-bottom: 1rem;
		font-size: clamp(2rem, 4vw, 2.75rem);
		letter-spacing: -0.03em;
	}

	.document-content :global(h2) {
		margin-top: 2.5rem;
	}

	.document-content :global(p),
	.document-content :global(li) {
		line-height: 1.7;
	}
</style>
