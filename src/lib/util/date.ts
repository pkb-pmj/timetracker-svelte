export function formatTime(timestamp: Date | number | null) {
	if (timestamp === null) return null;
	if (typeof timestamp === 'number') {
		timestamp = new Date(timestamp);
	}
	return timestamp.toLocaleTimeString();
}
