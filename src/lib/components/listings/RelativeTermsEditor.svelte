<script lang="ts">
	import { scanTerms, findTermMatches, areAllTermsDefined } from '$lib/relative-terms';

	let {
		body = $bindable(),
		vocabulary,
		definitions = $bindable(),
		textareaName,
		placeholder = "Tell people about yourself and what you're looking for. Be specific — vague listings get fewer responses.",
		rows = 8,
		onValidityChange
	}: {
		body: string;
		vocabulary: string[];
		definitions: Record<string, string>;
		textareaName?: string;
		placeholder?: string;
		rows?: number;
		onValidityChange?: (valid: boolean) => void;
	} = $props();

	const foundTerms = $derived(scanTerms(body, vocabulary));
	const allDefined = $derived(areAllTermsDefined(foundTerms, definitions));

	$effect(() => {
		onValidityChange?.(allDefined);
	});

	// Prune definitions for terms no longer present as the poster edits the body
	$effect(() => {
		const current = new Set(foundTerms);
		for (const key of Object.keys(definitions)) {
			if (!current.has(key)) {
				const next = { ...definitions };
				delete next[key];
				definitions = next;
			}
		}
	});

	function escapeHtml(s: string): string {
		return s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	// Built from the same findTermMatches used by scanTerms, so the highlight
	// and the "flagged terms" list below can never disagree.
	const highlightedHtml = $derived.by(() => {
		const matches = [...findTermMatches(body, vocabulary)].sort((a, b) => a.start - b.start);
		let html = '';
		let cursor = 0;
		for (const m of matches) {
			if (m.start < cursor) continue; // guard against any overlapping matches
			html += escapeHtml(body.slice(cursor, m.start));
			html += `<mark>${escapeHtml(body.slice(m.start, m.end))}</mark>`;
			cursor = m.end;
		}
		html += escapeHtml(body.slice(cursor));
		return html;
	});

	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let backdropEl: HTMLDivElement | undefined = $state();

	function syncScroll() {
		if (backdropEl && textareaEl) {
			backdropEl.scrollTop = textareaEl.scrollTop;
			backdropEl.scrollLeft = textareaEl.scrollLeft;
		}
	}
</script>

<div class="editor-wrap">
	<div class="text-layer backdrop" bind:this={backdropEl} aria-hidden="true">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- built from escapeHtml() above, plain <mark> wrapping only -->
		{@html highlightedHtml}
	</div>
	<textarea
		id="body"
		name={textareaName}
		{rows}
		{placeholder}
		bind:value={body}
		bind:this={textareaEl}
		onscroll={syncScroll}
		oninput={syncScroll}
		class="text-layer"
	></textarea>
</div>

{#if foundTerms.length > 0}
	<div class="terms-box">
		<p class="terms-heading">Define your terms</p>
		<p class="terms-desc">
			Help potential matches understand what you mean. All must be defined before continuing.
		</p>
		{#each foundTerms as term (term)}
			<div class="term-row">
				<span class="term-chip">{term}</span>
				<input
					id="term-{term}"
					type="text"
					placeholder="What do you mean by this?"
					value={definitions[term] ?? ''}
					oninput={(e) => {
						definitions = { ...definitions, [term]: (e.currentTarget as HTMLInputElement).value };
					}}
				/>
			</div>
		{/each}
	</div>
{/if}

<style>
	.editor-wrap {
		position: relative;
	}

	.text-layer {
		width: 100%;
		box-sizing: border-box;
		margin: 0;
		font-size: 1rem;
		line-height: var(--pico-line-height);
		font-family: inherit;
		letter-spacing: inherit;
		padding: var(--pico-form-element-spacing-vertical) var(--pico-form-element-spacing-horizontal);
		border: var(--pico-border-width) solid transparent;
		border-radius: var(--pico-border-radius);
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	textarea.text-layer {
		position: relative;
		background: transparent;
		resize: vertical;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		color: transparent;
	}

	.backdrop :global(mark) {
		background: var(--pico-mark-background-color);
		color: transparent;
		border-radius: 3px;
		padding: 0;
	}

	.terms-box {
		background: color-mix(in srgb, var(--pico-primary) 6%, transparent);
		border: 1px solid color-mix(in srgb, var(--pico-primary) 20%, transparent);
		border-radius: 8px;
		padding: 1rem 1.25rem;
		margin-bottom: 1.25rem;
	}

	.terms-heading {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.2rem;
	}

	.terms-desc {
		font-size: 0.8rem;
		color: var(--pico-muted-color);
		margin-bottom: 1rem;
	}

	.term-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.6rem;
	}

	.term-chip {
		flex-shrink: 0;
		font-size: 0.8rem;
		font-weight: 500;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--pico-primary) 15%, transparent);
		color: var(--pico-primary);
		min-width: 5rem;
		text-align: center;
	}

	.term-row input {
		flex: 1;
		margin-bottom: 0;
		font-size: 0.875rem;
	}
</style>
