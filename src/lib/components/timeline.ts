export interface Interval {
	id: number;
	start_time: number;
	end_time: number;
	start_id: number;
	start_name: string;
	end_id: number;
	end_name: string;
}

interface TimelineItemGroup {
	timestamp: number;
	row: number;
	place: string | null;
	intervals: TimelineInterval[];
}

interface TimelineInterval {
	row: number;
	startRow: number;
	endRow: number;
	col: number;
	interval: Interval;
}

export function createTimeline(intervals: Interval[]): {
	timeline: TimelineItemGroup[];
	numLanes: number;
	numRows: number;
} {
	const timestampCount = new Map<number, number>();

	intervals.forEach(({ start_time: start, end_time: end }) => {
		timestampCount.set(start, (timestampCount.get(start) ?? 1) + 1);
		timestampCount.set(end, timestampCount.get(end) ?? 1);
	});

	const timestampRow = new Map<number, number>();

	let sum = 0;
	timestampCount.forEach((v, k) => {
		timestampRow.set(k, sum + 1);
		sum += v;
	});

	interface TimelineMapItem {
		places: Set<string>;
		intervals: Omit<TimelineInterval, 'row' | 'col'>[];
	}

	const timestampMap = new Map<number, TimelineMapItem>(
		timestampCount.keys().map((k) => [k, { places: new Set(), intervals: [] }]),
	);

	intervals.forEach((interval) => {
		const { start_time, end_time, start_name, end_name } = interval;
		timestampMap.get(start_time)!.places.add(start_name);
		timestampMap.get(end_time)!.places.add(end_name);
		timestampMap.get(start_time)!.intervals.push({
			startRow: timestampRow.get(start_time)!,
			endRow: timestampRow.get(end_time)!,
			interval,
		});
	});

	const lanePacker = createLanePacker();

	return {
		timeline: timestampMap
			.entries()
			.map(([timestamp, { places, intervals }]) => ({
				timestamp,
				row: timestampRow.get(timestamp)!,
				place: places.values().toArray().join('/') ?? null,
				intervals: intervals.map((int, i) => ({
					...int,
					row: timestampRow.get(timestamp)! + i + 1,
					col: lanePacker.nextLane(int.startRow, int.endRow) + 1,
				})),
			}))
			.toArray(),
		numLanes: lanePacker.numLanes(),
		numRows: sum,
	};
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
