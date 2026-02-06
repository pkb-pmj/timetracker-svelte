<script lang="ts">
	import NodePicker from '$lib/components/NodePicker.svelte';
	import { db, reactiveQuery } from '$lib/db';
	import Sequence from './Sequence.svelte';

	const activeSequences = reactiveQuery(
		db
			.selectFrom('intervals')
			.select('sequence_id as id')
			.where('end_time', 'is', null)
			.distinct()
			.orderBy('start_time', 'desc')
			.compile(),
	);

	async function startSequence(start_node_id: number, start_time?: number) {
		start_time ??= Date.now();

		await db.transaction().execute(async (trx) => {
			const { id: sequence_id } = await trx
				.insertInto('sequences')
				.defaultValues()
				.returning('id')
				.executeTakeFirstOrThrow();

			await trx
				.insertInto('intervals')
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
