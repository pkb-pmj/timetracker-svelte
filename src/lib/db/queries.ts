import type { ItemsIn } from '$lib/components/timeline';
import type { QueryCreator } from 'kysely';
import { db, type DB } from '.';

async function getEvents(q: QueryCreator<DB>) {
	return await q
		.selectFrom('events')
		.innerJoin('nodes', 'nodes.id', 'events.node_id')
		.select(['events.id', 'events.time', 'nodes.name'])
		.orderBy('events.time', 'asc')
		.execute();
}

async function getActivities(q: QueryCreator<DB>) {
	return await q
		.selectFrom('activities')
		.innerJoin('nodes', 'nodes.id', 'activities.node_id')
		.select([
			'activities.id',
			'activities.start_time as startTime',
			'activities.end_time as endTime',
			'nodes.name as name',
		])
		.orderBy('activities.start_time', 'asc')
		.execute();
}

async function getIntervals(q: QueryCreator<DB>) {
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
		.orderBy('intervals.start_time', 'asc')
		.execute();
}

async function getIntervalRanges(q: QueryCreator<DB>) {
	return await q
		.selectFrom('intervals')
		.select(['id', 'start_time as startTime', 'end_time as endTime'])
		.orderBy('start_time', 'asc')
		.execute();
}

async function getIntervalEndpoints(q: QueryCreator<DB>) {
	const starts = q
		.selectFrom('nodes')
		.innerJoin('intervals', 'intervals.start_node_id', 'nodes.id')
		.select([
			'nodes.id as nodeId',
			// 'intervals.id',
			'intervals.start_time as time',
			'nodes.name as name',
		]);
	const ends = q
		.selectFrom('nodes')
		.innerJoin('intervals', 'intervals.end_node_id', 'nodes.id')
		.select([
			'nodes.id as nodeId',
			// 'intervals.id',
			'intervals.end_time as time',
			'nodes.name as name',
		]);
	return await starts.union(ends).orderBy('time', 'asc').execute();
}

export async function getItems(): Promise<ItemsIn<number, number, number>> {
	const { events, activities, intervalRanges, intervalEndpoints } = await db
		.transaction()
		.execute(async (tx) => ({
			events: await getEvents(tx),
			activities: await getActivities(tx),
			intervalRanges: await getIntervalRanges(tx),
			intervalEndpoints: await getIntervalEndpoints(tx),
		}));

	return {
		events: [
			...events.map((o) => ({
				time: o.time,
				label: o.name,
				ref: o.id,
			})),
			// TODO: handle end/start interval ids better (= at all)
			...intervalEndpoints.map((o) => ({
				time: o.time,
				label: o.name,
				ref: o.nodeId,
			})),
		].sort((a, b) => a.time - b.time),
		intervals: intervalRanges.map((o) => ({
			start: o.startTime,
			end: o.endTime,
			ref: o.id,
		})),
		activities: activities.map((o) => ({
			start: o.startTime,
			end: o.endTime,
			label: o.name,
			ref: o.id,
		})),
	};
}
