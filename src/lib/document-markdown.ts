export type Variant = 'document' | 'about' | 'rules';
export type Block =
	| { type: 'heading'; level: number; content: string; id: string }
	| { type: 'paragraph'; content: string }
	| { type: 'list'; items: string[]; ordered: boolean; start: number };

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function inline(value: string) {
	return escapeHtml(value)
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.+?)\*/g, '<em>$1</em>')
		.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>')
		.replace(/ {2,}\n|\\\n/g, '<br />')
		.replace(/\n/g, ' ');
}

export function parseMarkdown(markdown: string) {
	const blocks: Block[] = [];
	let paragraph: string[] = [];
	let list: string[] = [];
	let ordered = false;
	let start = 1;
	const flushParagraph = () => {
		if (paragraph.length) blocks.push({ type: 'paragraph', content: paragraph.join('\n') });
		paragraph = [];
	};
	const flushList = () => {
		if (list.length) blocks.push({ type: 'list', items: list, ordered, start });
		list = [];
	};

	for (const rawLine of markdown.trim().split('\n')) {
		const line = rawLine.trim();
		if (!line) {
			flushParagraph();
			flushList();
			continue;
		}
		const heading = /^(#{1,6})\s+(.+)$/.exec(line);
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
		const item = /^(?:([-*+])|(\d+)[.)])\s+(.+)$/.exec(line);
		if (item) {
			flushParagraph();
			const isOrdered = !!item[2];
			if (list.length && ordered !== isOrdered) flushList();
			if (!list.length) {
				ordered = isOrdered;
				start = Number(item[2] ?? 1);
			}
			list.push(item[3]);
			continue;
		}
		flushList();
		paragraph.push(rawLine.trimStart());
	}
	flushParagraph();
	flushList();
	return blocks;
}

function renderBlock(block: Block) {
	if (block.type === 'paragraph') return `<p>${inline(block.content)}</p>`;
	if (block.type === 'list')
		return `<${block.ordered ? 'ol' : 'ul'}${block.ordered ? ` start="${block.start}"` : ''}>${block.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${block.ordered ? 'ol' : 'ul'}>`;
	return `<h${block.level} id="${block.id}">${inline(block.content)}</h${block.level}>`;
}

function renderFeaturePage(blocks: Block[], pageVariant: Exclude<Variant, 'document'>) {
	const titleIndex = blocks.findIndex((block) => block.type === 'heading' && block.level === 1);
	const titleBlock = titleIndex >= 0 ? blocks[titleIndex] : undefined;
	const intro: Block[] = [];
	const sections: Block[][] = [];
	let current: Block[] | undefined;

	for (const [index, block] of blocks.entries()) {
		if (index === titleIndex) continue;
		if (block.type === 'heading' && block.level === 2) {
			current = [block];
			sections.push(current);
		} else if (current) current.push(block);
		else intro.push(block);
	}

	const sectionHtml = sections
		.map((section, index) => {
			const enforcement =
				pageVariant === 'rules' && index === sections.length - 1 ? ' is-enforcement' : '';
			return `<section class="${pageVariant}-section${enforcement}">${section.map(renderBlock).join('')}</section>`;
		})
		.join('');
	return `<header class="feature-hero">${titleBlock ? renderBlock(titleBlock) : ''}${intro.map(renderBlock).join('')}</header><div class="${pageVariant}-grid">${sectionHtml}</div>`;
}

export function renderMarkdown(markdown: string, pageVariant: Variant) {
	const blocks = parseMarkdown(markdown);
	if (pageVariant === 'about' || pageVariant === 'rules')
		return renderFeaturePage(blocks, pageVariant);
	return blocks.map(renderBlock).join('\n');
}
