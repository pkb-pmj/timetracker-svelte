<script lang="ts">
	import { db, type Node } from '$lib/db';
	import type { Selectable } from 'kysely';

	let { onPicked }: { onPicked: (id: number) => void } = $props();

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
			.limit(30)
			.execute(),
	);

	let activeId = $state<number | null>(null);
	let selected = $state<Selectable<Node> | null>(null);

	$effect(() => {
		if (activeId === null) return;
		// make sure active node is visible
		document.getElementById(activeId.toString())?.scrollIntoView({ block: 'nearest' });
	});

	$effect(() => {
		// reset activeId if it was filtered out
		if (!nodes.some((node) => node.id === activeId)) activeId = null;
	});

	let inputEl = $state<HTMLInputElement | null>(null);
	let dialogEl = $state<HTMLDialogElement | null>(null);

	function moveActiveOption(step: number) {
		if (activeId === null) {
			activeId = nodes[0].id;
		} else {
			const i = nodes.findIndex((node) => node.id === activeId);
			activeId = nodes[(i + step + nodes.length) % nodes.length].id;
		}
	}

	function selectOption(id: number) {
		activeId = id;
		selected = nodes.find((node) => node.id === id) ?? null;
		dialogEl?.close();
		onPicked(id);
	}

	$inspect(activeId);

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			moveActiveOption(-1);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			moveActiveOption(1);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (activeId !== null) selectOption(activeId);
		}
	}

	function onClickOutside(e: MouseEvent) {
		if (e.target === dialogEl) dialogEl?.close();
	}
</script>

<button onclick={() => dialogEl?.showModal()}>Now at {selected?.name ?? '?'}</button>
<dialog bind:this={dialogEl} onclick={onClickOutside} onclose={() => (activeId = null)}>
	<div class="combobox">
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="text"
			role="combobox"
			aria-autocomplete="list"
			aria-expanded="true"
			aria-controls="listbox"
			aria-activedescendant={activeId !== null ? `option-${activeId}` : undefined}
			autocomplete="off"
			placeholder="Search"
			autofocus
			onkeydown={onKeyDown}
			bind:value={query}
			bind:this={inputEl}
		/>
		<ul id="listbox" role="listbox" tabindex="-1">
			{#each nodes as node (node.id)}
				<li
					id="option-{node.id}"
					role="option"
					aria-selected={activeId === node.id}
					onmousedown={(e) => {
						e.preventDefault();
						selectOption(node.id);
					}}
				>
					<span>{node.name}</span><span>#{node.id}</span>
				</li>
			{/each}
		</ul>
	</div>
</dialog>

<style>
	dialog {
		padding: 0;
		border: none;
		border-radius: 16px 16px 0 0;
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
		transform: translateY(100%);
		transition: transform 150ms ease-out;
	}

	dialog[open] {
		transform: translateY(0);
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.3);
	}

	.combobox {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 1em;
		max-height: 85vh;
	}

	input {
		position: sticky;
		top: 0;
		z-index: 1;
		background: white;
		border-bottom: 1px solid #eee;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid #ccc;
		font-size: 1rem;
	}

	[role='listbox'] {
		overflow-y: scroll;
		padding: 8px 0;
		margin: 0;
		list-style: none;
	}

	[role='option'] {
		padding: 8px 12px;
		cursor: pointer;
		border-radius: 6px;
	}

	/* Mouse hover */
	[role='option']:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	/* Active (== selected) (arrow-key focus) */
	[role='option'][aria-selected='true'] {
		background: rgba(0, 0, 0, 0.12);
	}

	button:disabled {
		opacity: 0.5;
	}

	button:not(:disabled) {
		font-weight: 500;
	}
</style>
