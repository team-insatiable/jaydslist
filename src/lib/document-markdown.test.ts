import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './document-markdown';

describe('instance document Markdown', () => {
	it('keeps all introductory paragraphs and lists on feature pages', () => {
		for (const variant of ['about', 'rules'] as const) {
			const html = renderMarkdown(
				'# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\n- Before sections\n\n## Section\n\nSection text.\n\nClosing paragraph.',
				variant
			);
			for (const text of [
				'First paragraph.',
				'Second paragraph.',
				'Before sections',
				'Section text.',
				'Closing paragraph.'
			])
				expect(html).toContain(text);
		}
	});
	it('preserves explicit breaks but treats wrapped prose as one paragraph', () => {
		const html = renderMarkdown(
			'First line.  \nSecond line.\\\nThird line.\nWrapped prose.\n\nSeparate paragraph.',
			'document'
		);
		expect(html).toContain('First line.<br />Second line.<br />Third line. Wrapped prose.');
		expect(html).toContain('</p>\n<p>Separate paragraph.</p>');
	});
	it('renders numbered and bulleted lists separately', () => {
		const html = renderMarkdown('3. Three\n4. Four\n\n- Bullet one\n- Bullet two', 'document');
		expect(html).toContain('<ol start="3"><li>Three</li><li>Four</li></ol>');
		expect(html).toContain('<ul><li>Bullet one</li><li>Bullet two</li></ul>');
	});
	it('keeps content without a top-level heading', () => {
		expect(renderMarkdown('Intro.\n\nAnother paragraph.', 'about')).toContain(
			'<p>Intro.</p><p>Another paragraph.</p>'
		);
	});
	it('escapes HTML and attribute quotes without allowing unsafe links', () => {
		const html = renderMarkdown(
			'<script>alert(1)</script>\n\n[bad](javascript:alert)\n\n[quoted](https://example.com/"onclick="bad)',
			'document'
		);
		expect(html).not.toContain('<script>');
		expect(html).not.toContain('href="javascript:');
		expect(html).not.toContain('"onclick="');
		expect(html).toContain('&quot;');
	});
});
