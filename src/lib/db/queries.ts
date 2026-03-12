import type { ItemsIn } from '$lib/components/timeline';
import type { QueryCreator } from 'kysely';
import { db, type DB } from '.';

async function getEvents(q: QueryCreator<DB>, sequenceId: number) {
	return await q
		.selectFrom('events')
		.innerJoin('nodes', 'nodes.id', 'events.node_id')
		.select(['events.id', 'events.time', 'nodes.name'])
		.where('events.sequence_id', '=', sequenceId)
		.orderBy('events.time', 'asc')
		.execute();
}

async function getActivities(q: QueryCreator<DB>, sequenceId: number) {
	return await q
		.selectFrom('activities')
		.innerJoin('nodes', 'nodes.id', 'activities.node_id')
		.select([
			'activities.id',
			'activities.start_time as startTime',
			'activities.end_time as endTime',
			'nodes.name as name',
		])
		.where('activities.sequence_id', '=', sequenceId)
		.orderBy('activities.start_time', 'asc')
		.execute();
}

async function getIntervals(q: QueryCreator<DB>, sequenceId: number) {
	return await q
		.selectFrom('intervals')
		.innerJoin('nodes as start_node', 'start_node.id', 'intervals.start_node_id')
		.innerJoin('nodes as end_node', 'end_node.id', 'intervals.end_node_id')
		.select([
			'intervals.id',
			'intervals.start_time as startTime',
			'intervals.end_time as endTime',
			'start_node.name as startName',
			'end_node.name as endName',
		])
		.where('intervals.sequence_id', '=', sequenceId)
		.orderBy('intervals.start_time', 'asc')
		.execute();
}

export async function getItems(sequenceId: number): Promise<ItemsIn<number, number, number>> {
	const { events, intervals, activities } = await db.transaction().execute(async (tx) => ({
		events: await getEvents(tx, sequenceId),
		activities: await getActivities(tx, sequenceId),
		intervals: await getIntervals(tx, sequenceId),
	}));

	return {
		events: [
			...events.map((o) => ({
				time: o.time,
				label: o.name,
				ref: o.id,
			})),
			...intervals.map((o) => ({
				time: o.startTime,
				label: o.startName,
				ref: o.id,
			})),
			...intervals.map((o) => ({
				time: o.endTime,
				label: o.endName,
				ref: o.id,
			})),
		].sort((a, b) => a.time - b.time),
		intervals: intervals.map((o) => ({
			start: o.startTime,
			end: o.endTime,
			duration: o.endTime - o.startTime,
			ref: o.id,
		})),
		activities: activities.map((o) => ({
			start: o.startTime,
			end: o.endTime,
			duration: o.endTime - o.startTime,
			label: o.name,
			ref: o.id,
		})),
	};
}
