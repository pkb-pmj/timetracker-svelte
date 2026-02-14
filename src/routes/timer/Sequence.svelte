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
				.leftJoin('nodes as end_node', 'end_node.id', 'intervals.end_node_id')
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

	async function moveToNextInterval(node_id: number) {
		const time = Date.now();

		await db.transaction().execute(async (trx) => {
			await trx
				.updateTable('intervals')
				.where('sequence_id', '=', id)
				.where('end_time', 'is', null)
				.set({ end_node_id: node_id, end_time: time })
				.execute();
		});

		await db
			.insertInto('intervals')
			.values({ start_node_id: node_id, start_time: time, sequence_id: id })
			.execute();
	}

	async function cancelLastInterval() {
		await db
			.deleteFrom('intervals')
			.where('sequence_id', '=', id)
			.where('end_time', 'is', null)
			.execute();
	}

	type TimelineItem = {
		time: number | null;
		node_id: number | null;
		node_name: string | null;
		duration: number | null;
		live: boolean;
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
					live: false,
				});
			}

			items.push({
				time: end_time,
				node_id: end_id,
				node_name: end_name,
				duration: end_time === null ? start_time : end_time - start_time,
				live: end_time === null,
			});
		}
		return items;
	});

	$inspect(timeline);
</script>

<div class="container">
	<ul>
		{#each timeline as { duration, live, time, node_name }, i}
			{#if duration}
				<li class="edge" class:live>
					<span class="time">
						{formatDuration(live ? duration : durationNow(duration))}
					</span>
					<span class="divider">|</span>
				</li>
			{/if}
			<li class="node" class:live>
				<span class="time">{formatTime(time ?? timeNow())}</span>
				<span class="divider">O</span>
				{node_name}
			</li>
		{/each}
	</ul>
	<button class="finish" onclick={cancelLastInterval}>Finish here</button>
	<NodePicker onPicked={moveToNextInterval} />
</div>

<style>
	.container {
		margin: 0.5rem;
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
