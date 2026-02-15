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

{#snippet timelineEdge(duration: number, live: boolean = false)}
	<li class="edge" class:live>
		<span class="time">
			{formatDuration(duration)}
		</span>
		<span class="divider">|</span>
	</li>
{/snippet}

{#snippet timelineNode(time: number, name: string | null, live: boolean = false)}
	<li class="node" class:live>
		<span class="time">{formatTime(time)}</span>
		<span class="divider">O</span>
		{name}
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
		padding: 0.5rem;
	}

	li {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	span.time {
		flex: 0;
		flex-basis: 4rem;
		font-size: 0.75rem;
		text-align: right;
	}

	.live {
		color: #08f;
	}

	.live span.time {
		font-style: italic;
	}

	span.divider {
		flex: 0;
		flex-basis: 1.5rem;
		text-align: center;
	}

	button.finish {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid #ccc;
	}
</style>
