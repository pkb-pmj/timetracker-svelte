<script lang="ts">
	import { formatDuration, formatTime, timeNow } from '$lib/util';
	import { durationNow } from '$lib/util';
	import { createTimeline, dummyTimeline2, type Interval } from './timeline';

	let { intervals }: Props = $props();

	interface Props {
		intervals: Interval[];
	}

	// let timeline = $derived(createTimeline(intervals));

	let timeline = dummyTimeline2();

	$inspect(timeline);
</script>

{#snippet timelineEvent(row: number, time: string, label: string)}
	<li class="event" style:grid-row={row}>
		<span class="time">{time}</span>
		<div class="marker circle"></div>
		<span class="label">{label}</span>
	</li>
{/snippet}

{#snippet timelineTick(row: number, time: string)}
	<li class="event" style:grid-row={row}>
		<span class="time">{time}</span>
		<div class="marker tick"></div>
	</li>
{/snippet}

{#snippet timelineIntervalLabel(duration: string, label: string | null)}
	<li class="interval">
		<span class="duration">{duration}</span>
		<span class="label">{label}</span>
	</li>
{/snippet}

{#snippet timelineIntervalLine(startRow: number, endRow: number)}
	<div
		class="interval line-container"
		style:grid-row-start={startRow}
		style:grid-row-end={endRow + 1}
	>
		<div class="line start"></div>
		<div class="line middle"></div>
		<div class="line end"></div>
	</div>
{/snippet}

<ul style:grid-template-rows="repeat({2 * timeline.length}, auto)">
	{#each timeline as { timestamp: t, durations }, i}
		{#if t.label}
			{@render timelineEvent(2 * i + 1, formatTime(t.time), t.label)}
		{:else}
			{@render timelineTick(2 * i + 1, formatTime(t.time))}
		{/if}
		<div class="interval-group" style:grid-row={2 * i + 2}>
			{#each durations as { duration, label }}
				{@render timelineIntervalLabel(formatDuration(duration), label)}
			{/each}
		</div>
	{/each}
	<div class="interval-lines">
		{#each timeline as { durations }}
			{#each durations as { startIndex, endIndex }}
				{@render timelineIntervalLine(2 * startIndex + 1, 2 * endIndex + 1)}
			{/each}
		{/each}
	</div>
</ul>

<style>
	ul {
		display: grid;
		/* 0.8rem instead of min-content, handles padding for durations */
		/* the other option would be min-content + manual padding in duration, */
		/* both are equally manual and interdependent */
		grid-template-columns:
			[labels-left] 1fr
			[timestamps] min-content
			[lines] min-content
			[timeline] 0.8rem
			[labels-right] 1fr;
	}

	.interval-lines {
		grid-column: lines;
		grid-row: 1 / -1;
		display: grid;
		grid-template-rows: subgrid;
		grid-auto-flow: column;
		column-gap: 2px;
	}

	/* inherit columns from <ul>, contain children in one row without explicit grid-row */
	.interval-group,
	li {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: subgrid;
		align-items: center;
	}

	.time,
	.duration {
		grid-column: timestamps;
		grid-row: 1;
		font-size: 0.75rem;
		text-align: right;
		/* equal width digits */
		font-variant-numeric: tabular-nums;
	}

	.time {
		/* move timestamp further left, so timestamp-circle and duration-line distances are equal */
		/* margin instead of padding so width is independent */
		margin-right: 0.25rem;
		/* 8 characters - hh:mm:ss TODO: different time formats */
		width: 8ch;
	}

	.line-container {
		display: grid;
		grid-template-rows: subgrid;
		justify-self: center;
		align-self: stretch;
	}

	.line {
		border: 1.5px solid green;
		z-index: -1;
	}

	.line.start {
		grid-row: 1;
		height: calc(50% - 2.25px);
		align-self: end;
	}

	.line.middle {
		grid-row: 2 / -2;
	}

	.line.end {
		grid-row: -1;
		height: calc(50% - 2.25px);
		align-self: start;
	}

	.marker {
		grid-column: timeline;
		grid-row: 1;
		place-self: center;
	}

	.marker.circle {
		border-radius: 50%;
		border: 1.5px solid black;
		background-color: white;
		width: 0.6rem;
		height: 0.6rem;
	}

	.marker.tick {
		border-top: 1.5px solid black;
		width: 0.6rem;
		height: 0;
	}

	/* color active interval differently */
	.live {
		color: #08f;
		font-style: italic;
	}

	.live .marker,
	.live .line {
		border-color: #08f;
	}

	.label {
		grid-column: labels-right;
		margin-left: 0.1rem;
	}

	.event .label {
		margin-left: 0.25rem;
	}
</style>
