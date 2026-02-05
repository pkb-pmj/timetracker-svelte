<script lang="ts">
	import { migrator } from '$lib/db';
	import { NO_MIGRATIONS } from 'kysely';

	const resetDatabase = async () => {
		if (!window.confirm('Reset database? All data will be deleted')) return;
		await migrator.migrateTo(NO_MIGRATIONS);
		await migrator.migrateToLatest();
		alert('Database reset!');
	};
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<a href="/nodes">Nodes</a>
<button onclick={resetDatabase}>Reset database</button>
