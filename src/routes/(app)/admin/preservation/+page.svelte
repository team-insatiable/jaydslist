<script lang="ts">
	let { data, form } = $props();
</script>

<section>
	<h1>Preservation holds</h1>
	<p>
		An active hold protects a report or safety case from the future retention purge. It does not
		change who can see the underlying message or listing. Record the specific reason and review
		active holds regularly.
	</p>
	{#if form?.error}<p role="alert">{form.error}</p>{/if}
	{#if form?.success}<p role="status">Hold {form.success}.</p>{/if}
	<form method="POST" action="?/place">
		<h2>Place a hold</h2>
		<label for="targetType">Case type</label>
		<select id="targetType" name="targetType" required>
			<option value="report" selected={data.targetType === 'report'}>Report</option>
			<option value="safety_case" selected={data.targetType === 'safety_case'}>Safety case</option>
		</select>
		<label for="targetId">Case ID</label>
		<input id="targetId" name="targetId" value={data.targetId} required maxlength="128" />
		<label for="reason">Reason and reference</label>
		<textarea id="reason" name="reason" required maxlength="1000"></textarea>
		<button type="submit">Place hold</button>
	</form>
	<h2>Recent holds</h2>
	{#if data.holds.length === 0}<p>No holds recorded.</p>{/if}
	{#each data.holds as hold (hold.id)}
		<article>
			<h3>{hold.targetType} {hold.targetId}</h3>
			<p>Placed by {hold.placedBy} on {new Date(hold.placedAt).toLocaleString()}</p>
			<p>{hold.reason}</p>
			{#if hold.releasedAt}
				<p>
					Released by {hold.releasedBy} on {new Date(hold.releasedAt).toLocaleString()}:
					{hold.releaseReason}
				</p>
			{:else}
				<form method="POST" action="?/release">
					<input type="hidden" name="holdId" value={hold.id} />
					<label for="release-{hold.id}">Release reason</label>
					<textarea id="release-{hold.id}" name="reason" required maxlength="1000"></textarea>
					<button type="submit">Release hold</button>
				</form>
			{/if}
		</article>
	{/each}
</section>
