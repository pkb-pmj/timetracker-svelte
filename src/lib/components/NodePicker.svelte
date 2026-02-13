<script lang="ts">
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
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

	// TODO: a less hacky way to do this..? And be careful when integrating this with other modals
	function showModal() {
		// only push state if it isn't already set to 'NodePicker'
		// when user opens model, closes, navigates forward and opens modal again,
		// this prevents duplicate entries and allows closing modal on 1st "back", not 2nd
		if (page.state.modal !== 'NodePicker') pushState('', { modal: 'NodePicker' });
		dialogEl?.showModal();
	}

	$effect(() => {
		// only close on "back", don't open on "forward"
		if (page.state.modal !== 'NodePicker') dialogEl?.close();
	});

	function onclose() {
		activeId = null;
		query = '';
		// update history if closed in other way than navigating back
		if (page.state.modal === 'NodePicker') history.back();
	}
</script>

<button onclick={showModal}>Now at {selected?.name ?? '?'}</button>
<dialog bind:this={dialogEl} onclick={onClickOutside} {onclose}>
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
			autocapitalize="words"
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
					<span class="name">{node.name}</span> <span class="id">#{node.id}</span>
				</li>
			{/each}
		</ul>
	</div>
</dialog>

<style>
	dialog {
		padding: 0;
		border: none;
		border-radius: 1em 1em 0 0;
		width: 80%;
		max-width: 600px;
		margin: 4em auto;
		transform: translateY(100%);
		transition: transform 150ms ease-out;
		height: calc(100% - 4em);
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
		gap: 0.5em;
		padding: 0.5em;
		padding-bottom: 0;
		height: 100%;
	}

	input {
		position: sticky;
		top: 0;
		z-index: 1;
		background: white;
		border-bottom: 1px solid #eee;
		padding: 0.5em;
		border-radius: 0.5em;
		border: 1px solid #ccc;
		font-size: 1rem;
	}

	ul {
		flex: 1;
		overflow-y: auto;
		padding: 0;
		padding-bottom: 0.5em;
		margin: 0;
		list-style: none;
	}

	li {
		padding: 0.5em;
		cursor: pointer;
		border-radius: 0.5em;
	}

	/* Mouse hover */
	li:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	/* Active (== selected) (arrow-key focus) */
	li[aria-selected='true'] {
		background: rgba(0, 0, 0, 0.12);
	}

	button:disabled {
		opacity: 0.5;
	}

	button:not(:disabled) {
		font-weight: 500;
	}

	span.id {
		font-size: 0.8rem;
		color: #888;
	}
</style>
