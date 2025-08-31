function formatTimestamp(timestampSeconds) {
    const hours = Math.floor(timestampSeconds / 3600);
    const minutes = Math.floor((timestampSeconds % 3600) / 60);
    const seconds = timestampSeconds % 60;

    // Pad hours/minutes
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");

    // Seconds with 3 decimal places
    const ss = seconds.toFixed(3).padStart(6, "0");

    return `${hh}:${mm}:${ss}`;
}

export { formatTimestamp };
