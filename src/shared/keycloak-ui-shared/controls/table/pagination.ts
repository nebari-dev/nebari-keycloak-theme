/**
 * The offset of the last page that still contains rows.
 *
 * Returns 0 for an empty set, so a table that has just lost every row lands on
 * the first page rather than a negative offset.
 */
export function lastPageStart(total: number, pageSize: number): number {
    if (total <= 0 || pageSize <= 0) return 0;

    return Math.floor((total - 1) / pageSize) * pageSize;
}

/**
 * A corrected page offset for data that has shrunk beneath it, or `undefined`
 * when the current offset still points at rows and nothing needs to change.
 *
 * Snapping to the last populated page rather than back to the first means
 * deleting a row near the end of a long list does not throw the admin back to
 * page one.
 */
export function correctedFirst(
    total: number,
    first: number,
    pageSize: number
): number | undefined {
    if (first <= 0) return undefined;
    if (first < total) return undefined;

    return lastPageStart(total, pageSize);
}
