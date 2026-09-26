<script lang="ts">
	type Variant = 'document' | 'about' | 'rules';
	type Block =
		| { type: 'heading'; level: number; content: string }
		| { type: 'paragraph'; content: string }
		| { type: 'list'; items: string[] };

	let {
		title,
		content,
		variant = 'document'
	}: { title: string; content: string; variant?: Variant } = $props();

	function escapeHtml(value: string) {
		return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
	}

	function inline(value: string) {
		return escapeHtml(value)
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>');
	}

	function parseMarkdown(markdown: string) {
		const blocks: Block[] = [];
		let paragraph: string[] = [];
		let list: string[] = [];
		const flushParagraph = () => {
			if (paragraph.length) blocks.push({ type: 'paragraph', content: paragraph.join(' ') });
			paragraph = [];
		};
		const flushList = () => {
			if (list.length) blocks.push({ type: 'list', items: list });
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
				blocks.push({ type: 'heading', level: heading[1].length, content: heading[2] });
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
		return blocks;
	}

	function renderBlock(block: Block) {
		if (block.type === 'paragraph') return `<p>${inline(block.content)}</p>`;
		if (block.type === 'list')
			return `<ul>${block.items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`;
		return `<h${block.level}>${inline(block.content)}</h${block.level}>`;
	}

	function renderFeaturePage(blocks: Block[], pageVariant: Exclude<Variant, 'document'>) {
		const titleIndex = blocks.findIndex((block) => block.type === 'heading' && block.level === 1);
		const titleBlock = titleIndex >= 0 ? blocks[titleIndex] : undefined;
		const possibleLead = titleIndex >= 0 ? blocks[titleIndex + 1] : undefined;
		const lead = possibleLead?.type === 'paragraph' ? possibleLead : undefined;
		const sections: Block[][] = [];
		let current: Block[] | undefined;

		for (const block of blocks.slice(titleIndex + (lead ? 2 : 1))) {
			if (block.type === 'heading' && block.level === 2) {
				current = [block];
				sections.push(current);
			} else if (current) current.push(block);
		}

		const sectionHtml = sections
			.map((section, index) => {
				const enforcement =
					pageVariant === 'rules' && index === sections.length - 1 ? ' is-enforcement' : '';
				return `<section class="${pageVariant}-section${enforcement}">${section.map(renderBlock).join('')}</section>`;
			})
			.join('');
		return `<header class="feature-hero">${titleBlock ? renderBlock(titleBlock) : ''}${lead ? renderBlock(lead) : ''}</header><div class="${pageVariant}-grid">${sectionHtml}</div>`;
	}

	function renderMarkdown(markdown: string, pageVariant: Variant) {
		const blocks = parseMarkdown(markdown);
		if (pageVariant === 'about' || pageVariant === 'rules')
			return renderFeaturePage(blocks, pageVariant);
		return blocks.map(renderBlock).join('\n');
	}

	const html = $derived(renderMarkdown(content, variant));
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<main class:feature-page={variant !== 'document'} class="document-page">
	<article class:feature-content={variant !== 'document'} class="document-content">
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
	.feature-page {
		max-width: 54rem;
	}
	.feature-content :global(.feature-hero h1),
	.feature-content :global(.feature-hero p) {
		max-width: 42rem;
	}
	.feature-content :global(.feature-hero p) {
		font-size: 1.05rem;
		color: var(--pico-muted-color);
	}
	.feature-content :global(.about-grid),
	.feature-content :global(.rules-grid) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.875rem;
		margin-top: 2.25rem;
	}
	.feature-content :global(.about-section),
	.feature-content :global(.rules-section) {
		padding: 1.375rem 1.25rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 12px;
		background: var(--pico-card-background-color);
	}
	.feature-content :global(.about-section h2),
	.feature-content :global(.rules-section h2) {
		margin: 0 0 0.75rem;
		font-size: 1rem;
	}
	.feature-content :global(.about-section p),
	.feature-content :global(.rules-section p),
	.feature-content :global(.rules-section li) {
		margin-bottom: 0;
		font-size: 0.9rem;
		color: var(--pico-muted-color);
	}
	.feature-content :global(.rules-section ul) {
		margin: 0;
		padding-left: 1.2rem;
	}
	.feature-content :global(.rules-section li + li) {
		margin-top: 0.45rem;
	}
	.feature-content :global(.rules-section.is-enforcement) {
		grid-column: 1 / -1;
	}
</style>
