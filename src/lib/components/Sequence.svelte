<script lang="ts">
	import NodePicker from '$lib/components/NodePicker.svelte';
	import { db, depends, invalidate } from '$lib/db';
	import { getItems } from '$lib/db/queries';
	import Timeline from './Timeline.svelte';

	async function createNode(name: string) {
		return (await db.insertInto('nodes').values({ name }).returning('id').executeTakeFirstOrThrow())
			.id;
	}

	async function createEvent(node_id: number) {
		await db
			.insertInto('events')
			.values({
				time: Date.now(),
				node_id,
			})
			.returning('id')
			.executeTakeFirstOrThrow();
		invalidate('db');
	}

	async function createActivity(node_id: number) {
		await db
			.insertInto('activities')
			.values({
				node_id,
				start_time: Date.now(),
				end_time: null,
			})
			.executeTakeFirstOrThrow();
		invalidate('db');
	}

	async function finishAllActivities() {
		await db
			.updateTable('activities')
			.set({ end_time: Date.now() })
			.where('end_time', 'is', null)
			.execute();
		invalidate('db');
	}

	let { events, activities, intervals } = $derived(await depends('db', getItems()));
</script>

<div class="container">
	<Timeline {events} {activities} {intervals} />
	<span>Event: <NodePicker onPicked={createEvent} {createNode} /></span>
	<span>Start Activity: <NodePicker onPicked={createActivity} {createNode} /></span>
	<button onclick={finishAllActivities}>End All Activities</button>
</div>

<style>
	.container {
		padding: 0.5rem;
		border-radius: 1rem;
		border: 1px solid #ccc;
	}
</style>
