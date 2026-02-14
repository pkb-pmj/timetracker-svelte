export function formatTime(timestamp: Date | number | null) {
	if (timestamp === null) return null;
	if (typeof timestamp === 'number') {
		timestamp = new Date(timestamp);
	}
	return timestamp.toLocaleTimeString();
}

export function formatDuration(millis: number) {
	let seconds = Math.floor(millis / 1000) % 60;
	let minutes = Math.floor(millis / (60 * 1000)) % 60;
	let hours = Math.floor(millis / (60 * 60 * 1000)) % 24;
	if (hours) return `${hours}h${minutes.toString().padStart(2, '0')}m`;
	else if (minutes) return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
	else return `${seconds}s`;
}
