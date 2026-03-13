<script lang="ts">
	import NodePicker from '$lib/components/NodePicker.svelte';
	import { db, depends, invalidate, reactiveQuery } from '$lib/db';
	import { getItems } from '$lib/db/queries';
	import Timeline from './Timeline.svelte';

	interface Props {
		id: number;
	}

	let { id }: Props = $props();

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

		invalidate('db');
	}

	async function cancelLastInterval() {
		await db.deleteFrom('active_intervals').where('sequence_id', '=', id).execute();
	}

	let { events, activities, intervals } = $derived(await depends('db', getItems(id)));
</script>

<div class="container">
	<Timeline {events} {activities} {intervals} />
	<button class="finish" onclick={cancelLastInterval}>Finish here</button>
	<NodePicker onPicked={moveToNextInterval} />
</div>

<style>
	.container {
		padding: 0.5rem;
		border-radius: 1rem;
		border: 1px solid #ccc;
	}

	button.finish {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid #ccc;
	}
</style>
