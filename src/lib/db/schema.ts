import type { Generated } from 'kysely';

export interface Node {
	id: Generated<number>;
	name: string;
}

export interface Interval {
	id: Generated<number>;
	start_time: number;
	end_time: number | null;
	start_node_id: number;
	end_node_id: number | null;
}

export interface DB {
	nodes: Node;
	intervals: Interval;
}
