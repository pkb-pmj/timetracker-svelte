<script lang="ts">
	import NodePicker from '$lib/components/NodePicker.svelte';
	import { db, reactiveQuery } from '$lib/db';
	import { formatDuration, formatTime, timeNow } from '$lib/util';
	import { durationNow } from '$lib/util';

	interface Props {
		id: number;
	}

	let { id }: Props = $props();

	// TODO: wrapper function for reactiveQuery that does this internally
	let intervalStore = $derived(
		reactiveQuery(
			db
				.selectFrom('intervals')
				.innerJoin('nodes as start_node', 'start_node.id', 'intervals.start_node_id')
				.innerJoin('nodes as end_node', 'end_node.id', 'intervals.end_node_id')
				.select([
					'intervals.id',
					'intervals.start_time',
					'intervals.end_time',
					'start_node.id as start_id',
					'start_node.name as start_name',
					'end_node.id as end_id',
					'end_node.name as end_name',
				])
				.where('sequence_id', '=', id)
				.orderBy('start_time', 'asc')
				.compile(),
		),
	);

	let intervals = $derived($intervalStore ?? []);

	let activeIntervalStore = $derived(
		reactiveQuery(
			db
				.selectFrom('active_intervals')
				.innerJoin('nodes as start_node', 'start_node.id', 'active_intervals.start_node_id')
				.leftJoin('nodes as end_node', 'end_node.id', 'active_intervals.end_node_id')
				.select([
					'active_intervals.id',
					'active_intervals.start_time',
					'start_node.id as start_id',
					'start_node.name as start_name',
					'end_node.id as end_id',
					'end_node.name as end_name',
				])
				.where('sequence_id', '=', id)
				.compile(),
		),
	);

	let activeInterval = $derived($activeIntervalStore?.at(0) ?? null);

	async function moveToNextInterval(node_id: number) {
		const time = Date.now();

		await db.transaction().execute(async (trx) => {
			const activeInterval = await trx
				.selectFrom('active_intervals')
				.where('sequence_id', '=', id)
				.selectAll()
				// TODO: make sure somewhere that it does exist
				.executeTakeFirstOrThrow();

			await trx
				.insertInto('intervals')
				.values({
					start_node_id: activeInterval.start_node_id,
					start_time: activeInterval.start_time,
					end_node_id: node_id,
					end_time: time,
					sequence_id: id,
				})
				.execute();

			await trx
				.updateTable('active_intervals')
				.where('sequence_id', '=', id)
				.set({ start_node_id: node_id, start_time: time })
				.execute();
		});
	}

	async function cancelLastInterval() {
		await db.deleteFrom('active_intervals').where('sequence_id', '=', id).execute();
	}

	type TimelineItem = {
		time: number;
		node_id: number;
		node_name: string;
		duration: number | null;
	};

	let timeline = $derived.by(() => {
		const items: TimelineItem[] = [];
		const intervalsList = intervals;
		for (const interval of intervalsList) {
			const { start_id, start_name, start_time, end_id, end_name, end_time } = interval;
			if (
				!items.length ||
				items.at(-1)?.time !== start_time ||
				items.at(-1)?.node_id !== start_id
			) {
				items.push({
					time: start_time,
					node_id: start_id,
					node_name: start_name,
					duration: null,
				});
			}

			items.push({
				time: end_time,
				node_id: end_id,
				node_name: end_name,
				duration: end_time - start_time,
			});
		}

		return items;
	});

	let showActiveStartNode = $derived(
		(activeInterval &&
			(!timeline.length ||
				timeline.at(-1)?.time !== activeInterval.start_time ||
				timeline.at(-1)?.node_id !== activeInterval.start_id)) ??
			false,
	);

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

{#snippet timelineInterval(startRow: number, endRow: number, duration: string, label: string)}
	<li class="interval" style:grid-row={startRow + 1}>
		<span class="duration">{duration}</span>
		<span class="label">{label}</span>
	</li>
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

<div class="container">
	<ul>
		{@render timelineEvent(1, '12:43', 'Event 1')}
		{@render timelineTick(2, '12:48')}
		{@render timelineInterval(2, 4, '4m17s', 'Interval 1')}
		{@render timelineTick(4, '12:52')}
		{@render timelineInterval(4, 6, '5m2s', 'Interval 2')}
		{@render timelineEvent(6, '12:57', 'Event 2')}
		{@render timelineEvent(7, '13:01', 'Event 3')}
	</ul>
	<button class="finish" onclick={cancelLastInterval}>Finish here</button>
	<NodePicker onPicked={moveToNextInterval} />
</div>

<style>
	.container {
		padding: 0.5rem;
		border-radius: 1rem;
		border: 1px solid #ccc;
	}

	ul {
		display: grid;
		/* 0.8rem instead of min-content, handles padding for durations */
		/* the other option would be min-content + manual padding in duration, */
		/* both are equally manual and interdependent */
		grid-template-columns: min-content 0.8rem 1fr;
	}

	/* inherit columns from <ul>, contain children in one row without explicit grid-row */
	li {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: subgrid;
		align-items: center;
	}

	.time,
	.duration {
		grid-column: 1;
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
		grid-column: 2;
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
		grid-column: 2;
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
		grid-column: 3;
		margin-left: 0.1rem;
	}

	.event .label {
		margin-left: 0.25rem;
	}

	button.finish {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid #ccc;
	}
</style>
