/**
 * Convert a 0-indexed permutation array to cycle notation.
 * Example: [1,2,0] -> "(1 2 3)"
 * The identity permutation returns "()" - the trival permutation.
 * 
 * @param {number[]} perm - 0-indexed permutation. perm[i] = image of i.
 * @returns {string} Cycle notation with 1-indexed labels.
 */
export function toCycleNotation(perm) {
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
            cycle.push(j + 1); // convert to 1-indexed
            j = perm[j];
        }

        if (cycle.length > 1) {
            cycles.push(`(${cycle.join(' ')})`);
        }
    }

    return cycles.length > 0 ? cycles.join('') : '()';
}