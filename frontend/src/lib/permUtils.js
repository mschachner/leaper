/**
 * Convert a 0-indexed permutation array to cycle notation.
 * Example: [1,2,0] -> "(1 2 3)" (indexBase=1) or "(0 1 2)" (indexBase=0)
 * The identity permutation returns "()" - the trivial permutation.
 *
 * @param {number[]} perm - 0-indexed permutation. perm[i] = image of i.
 * @param {number} indexBase - 0 for 0-indexed output, 1 for 1-indexed output.
 * @returns {string} Cycle notation string.
 */
export function toCycleNotation(perm, indexBase = 1) {
    const n = perm.length;
    const visited = new Array(n).fill(false);
    const cycles = [];

    for (let i = 0; i < n; i++) {
        if (visited[i] || perm[i] === i) {
            // Fixed point or already seen - skip.
            visited[i] = true;
            continue;
        }

        // Trace the cycle starting at i.
        const cycle = [];
        let j = i;
        while (!visited[j]) {
            visited[j] = true;
            cycle.push(j + indexBase);
            j = perm[j];
        }

        if (cycle.length > 1) {
            cycles.push(`(${cycle.join(' ')})`);
        }
    }

    return cycles.length > 0 ? cycles.join('') : '()';
}

/**
 * Shift all numbers in a cycle notation string by an offset.
 * Used to convert backend 1-indexed cycle strings to 0-indexed display.
 * Example: shiftCycleNotation("(1 2 3)", -1) -> "(0 1 2)"
 *
 * @param {string} cycleStr - Cycle notation string, e.g. "(1 2 3)(4 5)"
 * @param {number} offset - Amount to add to each number (-1 for 1→0 indexed)
 * @returns {string} Adjusted cycle notation string.
 */
export function shiftCycleNotation(cycleStr, offset) {
    if (offset === 0) return cycleStr;
    return cycleStr.replace(/\d+/g, (m) => String(parseInt(m, 10) + offset));
}

/**
 * The inverse of a 0-indexed permutation.
 */
export function inversePerm(perm) {
    const inv = new Array(perm.length);
    perm.forEach((image, i) => { inv[image] = i; });
    return inv;
}

/**
 * The working leap as a permutation, from the labels on the canvas.
 *
 * The app tracks a leap by its labels: labels[v] is the label now sitting at
 * vertex v, i.e. the vertex that label started on. The leap itself sends each
 * starting vertex to where its label is now, which is the inverse:
 * leap[labels[v]] = v. Performing hops h1, then h2, gives the leap
 * "h1, then h2".
 */
export function leapFromLabels(labels) {
    return inversePerm(labels);
}

/**
 * The arrows that draw a leap: one per moved vertex, from the vertex to its
 * image, with a 2-cycle drawn once as a double-headed arrow.
 */
export function leapArrows(leap) {
    const arrows = [];
    for (let i = 0; i < leap.length; i++) {
        const target = leap[i];
        if (target === i) continue;
        const double = leap[target] === i;
        if (double && target < i) continue;   // already drawn from the other end
        arrows.push({ source: i, target, double });
    }
    return arrows;
}
