interface TimestampInternal<E, A, I> {
	events: EventIn<E>[];
	activities: ActivityIn<A>[];
	intervals: IntervalIn<I>[];
}

export interface TimestampOut<E, A, I> {
	time: number;
	events: EventOut<E>[];
	activities: ActivityOut<A>[];
	intervals: IntervalOut<I>[];
}

export interface ActivityIn<T> {
	start: number;
	end: number;
	duration: number;
	label: string;
	ref: T;
}

export interface ActivityOut<T> {
	start: number;
	end: number;
	lane: number;
	duration: number;
	label: string;
	ref: T;
}

export interface IntervalIn<T> {
	start: number;
	end: number;
	duration: number;
	ref: T;
}

export interface IntervalOut<T> extends IntervalIn<T> {
	row: number;
}

export interface EventIn<T> {
	time: number;
	label: string;
	ref: T;
}

export interface EventOut<T> extends EventIn<T> {
	row: number;
}

export function createTimeline<E, A, I>(
	events: EventIn<E>[],
	activities: ActivityIn<A>[],
	intervals: IntervalIn<I>[],
): { timeline: TimestampOut<E, A, I>[]; numLanes: number; numRows: number } {
	const sortedTimestamps = getUniqueSortedTimestamps(events, activities, intervals);

	const timestampMap = new Map<number, TimestampInternal<E, A, I>>(
		sortedTimestamps.map((t) => [t, { events: [], activities: [], intervals: [] }]),
	);

	events.forEach((v) => timestampMap.get(v.time)!.events.push(v));
	activities.forEach((v) => timestampMap.get(v.start)!.activities.push(v));
	intervals.forEach((v) => timestampMap.get(v.start)!.intervals.push(v));

	const timestampRow = new Map<number, number>();
	let sum = 0;
	timestampMap.entries().forEach(([t, o]) => {
		timestampRow.set(t, sum + 1);
		// 1 in case the timestamp is only the end of some activities/intervals
		sum += Math.max(o.events.length + o.intervals.length + 1, o.activities.length, 1);
	});

	timestampMap.values().forEach((o) => {
		o.activities.sort((a, b) => a.end - b.end);
		o.intervals.sort((a, b) => a.end - b.end);
	});

	const lanePacker = createLanePacker();

	const timeline = timestampMap
		.entries()
		.map(([time, { events, activities, intervals }]) => {
			const startRow = timestampRow.get(time)!;
			return {
				time,
				events: events.map((v, i) => ({ ...v, row: startRow + i })),
				activities: activities
					.map((v, i) => ({
						...v,
						start: startRow + i,
						end: timestampRow.get(v.end)!,
					}))
					.map((v) => ({ ...v, lane: lanePacker.nextLane(v.start, v.end) })),
				intervals: intervals.map((v, i) => ({
					...v,
					start: startRow,
					row: startRow + events.length,
					end: timestampRow.get(v.end)!,
				})),
			};
		})
		.toArray();

	return {
		timeline,
		numLanes: lanePacker.numLanes(),
		numRows: sum,
	};
}

function getUniqueSortedTimestamps<E, A, I>(
	events: EventIn<E>[],
	activities: ActivityIn<A>[],
	intervals: IntervalIn<I>[],
): number[] {
	const timestampSet = new Set<number>();
	events.forEach((v) => timestampSet.add(v.time));
	activities.forEach((v) => timestampSet.add(v.start));
	activities.forEach((v) => timestampSet.add(v.end));
	intervals.forEach((v) => timestampSet.add(v.start));
	intervals.forEach((v) => timestampSet.add(v.end));
	return timestampSet.keys().toArray().sort();
}

function createLanePacker() {
	const lastIndexes: number[] = [];

	return {
		nextLane: (start: number, end: number) => {
			if (!lastIndexes.length) lastIndexes.push(-1);

			const lane = lastIndexes.findIndex((i) => i <= start);

			if (lane === -1) {
				lastIndexes.push(end);
				return lastIndexes.length - 1;
			} else {
				lastIndexes[lane] = end;
				return lane;
			}
		},
		numLanes: () => lastIndexes.length,
	};
}
