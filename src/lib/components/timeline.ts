import { toMillis } from '$lib/util';

export interface Interval {
	id: number;
	start_time: number;
	end_time: number;
	start_id: number;
	start_name: string;
	end_id: number;
	end_name: string;
}

export interface TimelineTick {
	type: 'tick';
	time: number;
}

export interface TimelineEvent {
	type: 'event';
	time: number;
	label: string;
}

export interface TimelineInterval {
	type: 'interval';
	startRow: number;
	endRow: number;
	duration: number;
	label: string;
}

export type TimelinePoint = TimelineEvent | TimelineTick;

export interface TimelineTimestamp {
	ending: TimelineInterval[];
	starting: TimelineInterval[];
	events: TimelinePoint[];
}

export type TimelineItem = TimelineInterval | TimelinePoint;

export function createTimeline(intervals: Interval[]): TimelineItem[] {
	const timestamps = new Map<number, TimelineTimestamp>();

	for (const interval of intervals) {
		const { start_id, start_name, start_time, end_id, end_name, end_time } = interval;

		const timelineInterval: TimelineInterval = {
			type: 'interval',
			startRow: start_time,
			endRow: end_time,
			duration: end_time - start_time,
			label: 'Walk',
		};

		const startPoint: TimelinePoint = {
			type: 'event',
			time: start_time,
			label: start_name,
		};

		const endPoint: TimelinePoint = {
			type: 'event',
			time: end_time,
			label: end_name,
		};

		if (!timestamps.has(start_time))
			timestamps.set(start_time, { ending: [], starting: [], events: [] });
		timestamps.get(start_time)!.starting.push(timelineInterval);
		timestamps.get(start_time)!.events.push(startPoint);
		if (!timestamps.has(end_time))
			timestamps.set(end_time, { ending: [], starting: [], events: [] });
		timestamps.get(end_time)!.ending.push(timelineInterval);
		timestamps.get(end_time)!.events.push(endPoint);
	}

	const timestampMap: Record<number, number> = {};
	let i = 1;

	const items = timestamps
		.entries()
		.flatMap(([time, obj]) => {
			timestampMap[time] = i;
			const arr = [obj.events[0], ...obj.starting];
			i += arr.length;
			return arr;
		})
		.toArray();

	items.forEach((item) => {
		if (item.type === 'interval') {
			item.startRow = timestampMap[item.startRow];
			item.endRow = timestampMap[item.endRow];
		}
	});

	return items;
}

interface Duration {
	duration: number;
	label: string | null;
	startIndex: number;
	endIndex: number;
}

interface Timestamp {
	time: number;
	label: string | null;
}

interface TimelineGroup {
	timestamp: Timestamp;
	durations: Duration[];
}

export function dummyTimeline2(): TimelineGroup[] {
	return [
		{
			timestamp: {
				time: Date.now(),
				label: 'Event1',
			},
			durations: [
				{
					duration: toMillis(0, 5, 3),
					label: 'Activity1',
					startIndex: 0,
					endIndex: 1,
				},
				{
					duration: toMillis(0, 9, 7),
					label: 'Activity3',
					startIndex: 0,
					endIndex: 2,
				},
			],
		},
		{
			timestamp: {
				time: Date.now(),
				label: 'Event2',
			},
			durations: [
				{
					duration: toMillis(0, 7, 4),
					label: 'Activity2',
					startIndex: 1,
					endIndex: 2,
				},
			],
		},
		{
			timestamp: {
				time: Date.now(),
				label: 'Event3',
			},
			durations: [],
		},
	];
}
