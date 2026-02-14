<script lang="ts">
	import NodePicker from '$lib/components/NodePicker.svelte';
	import { db, reactiveQuery } from '$lib/db';
	import { formatTime } from '$lib/util';

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
					'start_node.name as start_name',
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
</script>

<ul>
	{#each $intervals as interval (interval.id)}
		<li>
			<span>
				{interval.start_name}
				{formatTime(interval.start_time)} -> {interval.end_name}
				{formatTime(interval.end_time)}
			</span>
		</li>
	{/each}
</ul>
<button onclick={cancelLastInterval}>Finish here</button>
<NodePicker onPicked={moveToNextInterval} />
