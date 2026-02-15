/** 
 * Function for creating workspace entries.
 *
 * @param {string} type     - The kind of computation.
 * @param {object} params   - The parameters used.
 * @param {object} result   - The result from the API.
 * @param {string} elapsed  - How long it took.
 * @returns {object}        - A workspace entry.
 */

export function createEntry(type, params, result, elapsed, graphSnapshot=null) {
    return {
        id: crypto.randomUUID(),
        type,
        params,
        result,
        elapsed,
        graphSnapshot,
        timestamp: new Date().toISOString(),
    };
}