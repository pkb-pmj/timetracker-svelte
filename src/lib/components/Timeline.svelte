<script lang="ts">
	import { formatDuration, formatTime, timeNow } from '$lib/util';
	import { durationNow } from '$lib/util';
	import {
		createTimeline,
		type ActivityIn,
		type ActivityOut,
		type EventIn,
		type EventOut,
		type IntervalIn,
		type IntervalOut,
	} from './timeline';

	let { events, activities, intervals }: Props = $props();

	interface Props {
		events: EventIn<unknown>[];
		activities: ActivityIn<unknown>[];
		intervals: IntervalIn<unknown>[];
	}

	let { timeline, numLanes, numRows } = $derived(createTimeline(events, activities, intervals));

	$inspect(timeline);
</script>

{#snippet timelineEvent(o: EventOut<unknown>)}
	<li class="event" style:grid-row={o.row}>
		<span class="time">{formatTime(o.time)}</span>
		<div class="marker circle"></div>
		<span class="label">{o.label}</span>
	</li>
{/snippet}

{#snippet timelineTick(row: number, time: number)}
	<li class="event" style:grid-row={row}>
		<span class="time">{formatTime(time)}</span>
		<div class="marker tick"></div>
	</li>
{/snippet}

{#snippet timelineActivity(o: ActivityOut<unknown>)}
	<li class="activity">
		<div class="label-container" style:grid-row={o.start}>
			<div class="label-background left">
				<span class="label">{o.label}</span>
			</div>
			<div class="label-background right" style:grid-column-end="lane-end {o.lane}">
				<span class="duration">{formatDuration(o.duration)}</span>
			</div>
		</div>
		<div
			class="line-container"
			style:grid-row-start={o.start}
			style:grid-row-end={o.end + 1}
			style:grid-column-start="lane-start {o.lane}"
			style:grid-column-end="lane-end {o.lane}"
		>
			{#if o.end - o.start > 1}
				<div class="line middle"></div>
			{/if}
			<div class="line end"></div>
		</div>
	</li>
{/snippet}

{#snippet timelineInterval(o: IntervalOut<unknown>)}
	<li class="interval">
		<span class="duration" style:grid-row={o.row}>{formatDuration(o.duration)}</span>
		<div class="line-container" style:grid-row-start={o.start} style:grid-row-end={o.end + 1}>
			<div class="line start"></div>
			{#if o.end - o.start > 1}
				<div class="line middle"></div>
			{/if}
			<div class="line end"></div>
		</div>
	</li>
{/snippet}

<ul style:grid-template-rows="repeat({numRows}, auto)" style:--num-lanes={Math.max(numLanes, 1)}>
	{#each timeline as { time, events, activities, intervals }}
		{#each events as event}
			{@render timelineEvent(event)}
		{/each}
		{#each activities as activity}
			{@render timelineActivity(activity)}
		{/each}
		{#each intervals as interval}
			{@render timelineInterval(interval)}
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
			[activity-labels-start] 1fr
			[activity-labels-end] 0.5rem
			[activity-durations-start] min-content
			[activity-durations-end] 0.5rem
			repeat(var(--num-lanes), [lane-start] min-content [lane-end] 0.2rem)
			[timeline-start] 0.8rem
			[timeline-end] 0.2rem
			[timestamps-start] min-content
			[timestamps-end] 0.2rem
			[event-labels] 1fr;
	}

	/* inherit columns from <ul>, contain children in one row without explicit grid-row */
	li.event {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: subgrid;
		align-items: center;
	}

	li.activity,
	li.interval {
		display: contents;
	}

	.activity .label-container {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: subgrid;
	}

	.activity .label-background {
		grid-row: 1;
		align-self: stretch;
		display: grid;
		align-items: center;
		background-color: rgba(0, 128, 0, 0.1);
		border: 1.5px solid green;
	}
	.activity .label-background.left {
		grid-column-start: activity-labels-start;
		grid-column-end: activity-labels-end;
		justify-self: right;
		padding-left: 0.5rem;
		border-right: none;
		border-top-left-radius: 0.3rem;
		border-bottom-left-radius: 0.3rem;
	}
	.activity .label-background.right {
		grid-column-start: activity-labels-end;
		grid-template-columns: subgrid;
		border-right: 1.5px solid green;
		border-left: none;
		border-top-right-radius: 0.75rem;
		border-bottom-right-radius: 0;
		border-right-width: 4px;
	}

	.activity .duration {
		grid-column: activity-durations-start;
	}

	.time,
	.duration {
		grid-row: 1;
		font-size: 0.75rem;
		text-align: left;
		/* equal width digits */
		font-variant-numeric: tabular-nums;
	}

	.time {
		grid-column: timestamps-start / timestamps-end;
	}

	.interval .duration {
		grid-column: timeline-end / timestamps-end;
	}

	.interval .line-container {
		grid-column: timeline;
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

	.line.start {
		grid-row: 1;
		height: 50%;
		align-self: end;
		border-top-left-radius: 2px;
		border-top-right-radius: 2px;
		border-bottom: none;
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
		grid-column: event-labels;
	}
</style>
