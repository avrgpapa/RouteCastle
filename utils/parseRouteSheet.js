export function parseRouteSheet(rawText) {
  const statuses = ['Active', 'Suspended', 'Canceled'];
  const lines = rawText.trim().split('\n');
  return lines.map(line => {
    for (const status of statuses) {
      if (line.includes(status)) {
        const [before, after] = line.split(status);
        return {
          address: before.trim(),
          status: status,
          notes: after.trim()
        };
      }
    }
    return { address: line.trim(), status: 'Unknown', notes: '' };
  });
}