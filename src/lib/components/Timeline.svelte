<script lang="ts">
	import { formatDuration, formatTime, timeNow } from '$lib/util';
	import { durationNow } from '$lib/util';
	import { createTimeline, type Interval } from './timeline';

	let { intervals }: Props = $props();

	interface Props {
		intervals: Interval[];
	}

	let { timeline, numLanes, numRows } = $derived(createTimeline(intervals));

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

{#snippet timelineInterval(
	row: number,
	startRow: number,
	endRow: number,
	col: number,
	duration: string,
	label: string | null,
)}
	<li class="interval" style:grid-row={row}>
		<span class="duration">{duration}</span>
		<div class="label-background left" style:grid-column-start="lane {col}"></div>
		<div class="label-background right">
			<span class="label">{label}</span>
		</div>
	</li>
	<div
		class="interval line-container"
		style:grid-row-start={startRow}
		style:grid-row-end={endRow + 1}
		style:grid-column="lane {col}"
	>
		<!-- <div class="line start"></div> -->
		{#if endRow - startRow > 1}
			<div class="line middle"></div>
		{/if}
		<div class="line end"></div>
	</div>
{/snippet}

<ul style:grid-template-rows="repeat({numRows}, auto)" style:--num-lanes={numLanes}>
	{#each timeline as { timestamp, row, place, intervals }}
		{#if place}
			{@render timelineEvent(row, formatTime(timestamp), place)}
		{:else}
			{@render timelineTick(row, formatTime(timestamp))}
		{/if}
		{#each intervals as { row, startRow, endRow, col, interval }}
			{@render timelineInterval(
				row,
				row,
				endRow,
				col,
				formatDuration(interval.end_time - interval.start_time),
				'Walk',
			)}
		{/each}
	{/each}
</ul>

<style>
	ul {
		display: grid;
		/* 0.8rem instead of min-content, handles padding for durations */
		/* the other option would be min-content + manual padding in duration, */
		/* both are equally manual and interdependent */
		grid-template-columns:
			[labels-left] auto
			0.2rem
			[timestamps] min-content
			0.2rem
			repeat(var(--num-lanes), [lane] min-content 0.2rem)
			[timeline] 0.8rem
			0.2rem
			[labels-right] 1fr;
	}

	/* inherit columns from <ul>, contain children in one row without explicit grid-row */
	li {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: subgrid;
		align-items: center;
	}

	.interval .label-background {
		grid-row: 1;
		/* display: grid; */
		align-self: stretch;
		/* grid-template-columns: subgrid; */
		background-color: rgba(0, 128, 0, 0.1);
		/* border: 1.5px solid green; */
	}
	.label-background.left {
		grid-column-end: labels-right;
		border-left: 1.5px solid green;
		border-right: none;
		border-top-left-radius: 1rem;
		border-bottom-left-radius: 0;
		border-left-width: 4px;
	}
	.label-background.right {
		grid-column: labels-right;
		justify-self: left;
		padding-right: 0.5rem;
		border-left: none;
		border-top-right-radius: 0.5rem;
		border-bottom-right-radius: 0.5rem;
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
		border-left: 4px solid green;
		z-index: -1;
	}

	.line.middle {
		grid-row: 2 / -2;
		border-top: none;
		border-bottom: none;
	}

	.line.end {
		grid-row: -1;
		height: 50%;
		align-self: start;
		border-bottom-left-radius: 2px;
		border-bottom-right-radius: 2px;
		border-top: none;
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
		grid-row: 1;
		grid-column: labels-right;
	}
</style>
