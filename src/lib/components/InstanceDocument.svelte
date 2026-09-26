<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	type Variant = 'document' | 'about' | 'rules';
	type Block =
		| { type: 'heading'; level: number; content: string; id: string }
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
				blocks.push({
					type: 'heading',
					level: heading[1].length,
					content: heading[2],
					id: `section-${blocks.length}`
				});
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
		return `<h${block.level} id="${block.id}">${inline(block.content)}</h${block.level}>`;
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
	const sections = $derived(
		parseMarkdown(content).filter(
			(block): block is Extract<Block, { type: 'heading' }> =>
				block.type === 'heading' && block.level === 2
		)
	);
	const pages = [
		{ href: '/about' as const, label: 'About' },
		{ href: '/rules' as const, label: 'Community rules' },
		{ href: '/privacy' as const, label: 'Privacy' },
		{ href: '/terms' as const, label: 'Terms of use' }
	];
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<main class:feature-page={variant !== 'document'} class="document-page">
	<p class="document-eyebrow">The people. The principles. The fine print.</p>
	<div class="document-layout">
		<aside class="document-rail">
			<nav aria-label="About and policies">
				{#each pages as item (item.href)}
					<a
						href={resolve(item.href)}
						aria-current={page.url.pathname === item.href ? 'page' : undefined}
						>{item.label}<span aria-hidden="true">↗</span></a
					>
				{/each}
			</nav>
			{#if sections.length > 0}
				<nav class="contents" aria-label="On this page">
					<p>On this page</p>
					{#each sections as section (section.id)}
						<a href={`#${section.id}`}>{section.content.replaceAll('*', '')}</a>
					{/each}
				</nav>
			{/if}
		</aside>
		<article class:feature-content={variant !== 'document'} class="document-content">
			<!-- Instance Markdown is escaped and rendered by renderMarkdown above. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html html}
		</article>
	</div>
</main>

<style>
	.document-page {
		max-width: 76rem;
		margin-inline: auto;
		padding: 3.5rem 1.5rem 5rem;
	}
	.document-content :global(h1) {
		margin-bottom: 1.5rem;
		font-size: clamp(2.5rem, 5vw, 3.75rem);
		font-family: Georgia, serif;
		font-weight: 500;
		line-height: 1.1;
		letter-spacing: -0.045em;
		text-wrap: balance;
	}
	.document-content :global(h2) {
		margin-top: 2.5rem;
		margin-bottom: 1rem;
		font-family: Georgia, serif;
		font-weight: 500;
		font-size: 1.6rem;
	}
	.document-content :global(p),
	.document-content :global(li) {
		line-height: 1.85;
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
		gap: 1.25rem;
		margin-top: 2.25rem;
	}
	.feature-content :global(.about-section),
	.feature-content :global(.rules-section) {
		padding: 1.75rem;
		border: 1px solid var(--pico-muted-border-color);
		border-radius: 4px;
		background: var(--pico-card-background-color);
	}
	.feature-content :global(.about-section h2),
	.feature-content :global(.rules-section h2) {
		margin: 0 0 0.75rem;
		font-size: 1.5rem;
	}
	.feature-content :global(.about-section p),
	.feature-content :global(.rules-section p),
	.feature-content :global(.rules-section li) {
		margin-bottom: 0.75rem;
		font-size: 0.95rem;
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
	.document-eyebrow {
		color: var(--pico-primary);
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		padding-bottom: 1.5rem;
		margin-bottom: 2rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
	}
	.document-layout {
		display: grid;
		grid-template-columns: 200px minmax(0, 1fr);
		gap: 3rem;
		align-items: start;
	}
	.document-rail {
		position: sticky;
		top: 5rem;
	}
	.document-rail nav {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.document-rail a {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.65rem 0.75rem;
		font-size: 0.85rem;
		color: var(--pico-muted-color);
		border-radius: 4px;
	}
	.document-rail a[aria-current='page'] {
		background: color-mix(in srgb, var(--pico-primary) 8%, transparent);
		color: var(--pico-primary);
		font-weight: 700;
	}
	.document-rail .contents {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--pico-muted-border-color);
	}
	.contents p {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 0.5rem;
	}
	.contents a {
		font-size: 0.75rem;
		padding-block: 0.35rem;
	}
	.document-content {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.document-content:not(.feature-content) {
		background: var(--pico-card-background-color);
		border: 1px solid var(--pico-muted-border-color);
		border-top: 3px solid var(--pico-primary);
		border-radius: 4px;
		padding: clamp(1.25rem, 4vw, 3rem);
	}
	.document-content :global(p + p),
	.document-content :global(ul + p),
	.document-content :global(p + ul) {
		margin-top: 1rem;
	}
	.document-content :global(h2),
	.document-content :global(h3) {
		scroll-margin-top: 6rem;
	}
	.document-content :global(h3) {
		margin-block: 1.75rem 0.75rem;
	}
	.document-content :global(li + li) {
		margin-top: 0.5rem;
	}
	.document-content :global(.feature-hero) {
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
	}
	@media (max-width: 800px) {
		.document-layout {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
		.document-rail {
			position: static;
		}
		.document-rail nav {
			flex-direction: row;
			flex-wrap: wrap;
		}
		.document-rail .contents {
			display: none;
		}
		.document-page {
			padding-top: 2rem;
		}
	}
	@media (max-width: 450px) {
		.feature-content :global(.about-grid),
		.feature-content :global(.rules-grid) {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
