<script lang="ts">
	import NodePicker from '$lib/components/NodePicker.svelte';
	import { db, depends, invalidate } from '$lib/db';
	import { getItems } from '$lib/db/queries';
	import Timeline from './Timeline.svelte';

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

	let { events, activities, intervals } = $derived(await depends('db', getItems()));
</script>

<div class="container">
	<Timeline {events} {activities} {intervals} />
	<span>Event: <NodePicker onPicked={createEvent} /></span>
</div>

<style>
	.container {
		padding: 0.5rem;
		border-radius: 1rem;
		border: 1px solid #ccc;
	}
</style>
