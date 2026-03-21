import type { Generated } from 'kysely';

export interface Node {
	id: Generated<number>;
	name: string;
}

export interface Event {
	id: Generated<number>;
	time: number;
	node_id: number;
}

export interface Activity {
	id: Generated<number>;
	start_time: number;
	end_time: number;
	node_id: number;
}

export interface Interval {
	id: Generated<number>;
	start_time: number;
	end_time: number;
	start_node_id: number;
	end_node_id: number;
}

export interface ActiveInterval {
	id: Generated<number>;
	start_time: number;
	start_node_id: number;
	end_node_id: number | null;
}

export interface DB {
	nodes: Node;
	events: Event;
	activities: Activity;
	intervals: Interval;
	active_intervals: ActiveInterval;
}
