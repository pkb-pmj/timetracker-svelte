<script lang="ts">
	import { db } from '$lib/db';

	let query = $state('');
	let debouncedQuery = $state('');

	$effect(() => {
		const q = query;
		const t = setTimeout(() => {
			debouncedQuery = q;
		}, 200);
		return () => clearTimeout(t);
	});

	let nodes = $derived(
		await db
			.selectFrom('nodes')
			.selectAll()
			.where('name', 'like', `%${debouncedQuery}%`)
			.limit(10)
			.execute(),
	);
</script>

<form>
	<input type="text" autocapitalize="words" bind:value={query} />
	<ul>
		{#each nodes as node (node.id)}
			<li>
				<span>{node.name}</span><span>#{node.id}</span>
			</li>
		{:else}
			<span>No matching nodes</span>
		{/each}
	</ul>
</form>
