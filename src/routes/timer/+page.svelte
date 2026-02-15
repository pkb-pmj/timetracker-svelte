<script lang="ts">
	import NodePicker from '$lib/components/NodePicker.svelte';
	import { db, reactiveQuery } from '$lib/db';
	import { SequenceStatus } from '$lib/db/schema';
	import Sequence from './Sequence.svelte';

	const activeSequences = reactiveQuery(
		db
			.selectFrom('sequences')
			.select('id')
			.where('sequences.status', '=', SequenceStatus.ACTIVE)
			.orderBy('id', 'desc')
			.compile(),
	);

	async function startSequence(start_node_id: number, start_time?: number) {
		start_time ??= Date.now();

		await db.transaction().execute(async (trx) => {
			const { id: sequence_id } = await trx
				.insertInto('sequences')
				.values({ status: SequenceStatus.ACTIVE })
				.returning('id')
				.executeTakeFirstOrThrow();

			await trx
				.insertInto('active_intervals')
				.values({
					start_node_id,
					start_time,
					sequence_id,
				})
				.execute();
		});
	}
</script>

<a href="/">Home</a>
<NodePicker onPicked={startSequence} />
<ul>
	{#each $activeSequences as sequence (sequence.id)}
		<li>
			<Sequence id={sequence.id} />
		</li>
	{/each}
</ul>

<style>
	ul {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
	}
</style>
