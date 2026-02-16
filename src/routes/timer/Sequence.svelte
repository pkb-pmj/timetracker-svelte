<script lang="ts">
	import NodePicker from '$lib/components/NodePicker.svelte';
	import { db, reactiveQuery } from '$lib/db';
	import { formatDuration, formatTime, timeNow } from '$lib/util';
	import { durationNow } from '$lib/util';
	import type { StatementInput } from 'sqlocal';
	import { fromStore, type Subscriber } from 'svelte/store';

	interface Props {
		id: number;
	}

	let { id }: Props = $props();

	// this causes infinite loop
	function reactiveQuerySignal<T extends Record<string, any>>(
		query: StatementInput<T>,
	): { readonly current: T[] } {
		const store = reactiveQuery(query);

		return fromStore({
			subscribe(run: Subscriber<T[]>) {
				return store.subscribe(run).unsubscribe;
			},
		});
	}

	let intervals2 = $derived(
		reactiveQuerySignal(
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
		).current ?? [],
	);

	// this works fine
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

	// this isn't relevant
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
		// const intervalsList = intervals2; // causes infinite loop
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

{#snippet timelineEdge(duration: number, live: boolean = false)}
	<li class="edge" class:live>
		<span class="time">
			{formatDuration(duration)}
		</span>
		<div class="line"></div>
	</li>
{/snippet}

{#snippet timelineNode(time: number, name: string | null, live: boolean = false)}
	<li class="node" class:live>
		<span class="time">{formatTime(time)}</span>
		<div class="line top"></div>
		<div class="line bottom"></div>
		<div class="circle"></div>
		<span class="description">{name}</span>
	</li>
{/snippet}

<div class="container">
	<ul>
		{#each timeline as { duration, time, node_name }}
			{#if duration}
				{@render timelineEdge(duration)}
			{/if}
			{@render timelineNode(time, node_name)}
		{/each}
		{#if activeInterval}
			{#if showActiveStartNode}
				{@render timelineNode(activeInterval.start_time, activeInterval.start_name)}
			{/if}
			{@render timelineEdge(durationNow(activeInterval.start_time), true)}
			{@render timelineNode(timeNow(), null, true)}
		{/if}
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

	.time {
		grid-column: 1;
		grid-row: 1;
		font-size: 0.75rem;
		text-align: right;
		/* equal width digits */
		font-variant-numeric: tabular-nums;
	}

	.node .time {
		/* move timestamp further left, so timestamp-circle and duration-line distances are equal */
		/* margin instead of padding so width is independent */
		margin-right: 0.25rem;
		/* 8 characters - hh:mm:ss TODO: different time formats */
		width: 8ch;
	}

	.line {
		grid-row: 1;
		grid-column: 2;
		justify-self: center;
		align-self: stretch;
		/* yes, it does center itself correctly */
		border-left: 1.5px solid black;
		z-index: -1;
	}

	.line.top {
		height: 50%;
		align-self: start;
	}

	.line.bottom {
		height: 50%;
		align-self: end;
	}

	/* ensure line doesn't stick out beyond first or last node */
	li.node:first-child .line.top,
	li.node:last-child .line.bottom {
		display: none;
	}

	.circle {
		grid-column: 2;
		grid-row: 1;
		place-self: center;
		border-radius: 50%;
		border: 1.5px solid black;
		background-color: white;
		width: 0.6rem;
		height: 0.6rem;
	}

	/* color active interval differently */
	.live {
		color: #08f;
		font-style: italic;
	}

	.live .circle,
	.live .line,
	/* including the bottom line segment of previous node */
	li.node:has(+ .live) .line.bottom {
		border-color: #08f;
	}

	.description {
		grid-column: 3;
	}

	.node .description {
		margin-left: 0.25rem;
	}

	button.finish {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid #ccc;
	}
</style>
