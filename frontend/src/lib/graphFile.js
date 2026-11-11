import { graphSnapshot } from './cyGraph';

/*
 * Read the current graph into .leap format.
 */

export function serializeGraph(
    cy,
    name= 'Untitled',
    settings = {},
    workspace = [],
    savedLeaps = [],
    hopPalette = []
) {
    // Overlay arrows (working leap, hop being drawn) are not part of the graph.
    const { vertices, edges } = graphSnapshot(cy);

    return {
        name,
        vertices,
        edges,
        settings,
        workspace,
        savedLeaps,
        hopPalette,
        metadata: {
            created: new Date().toISOString(),
            version: '1.2',
        },
    };
}

/*
 * Load a .leap file into Cytoscape.
 */

export function deserializeGraph(cy, data, indexBase = 1, directed = false) {
    cy.elements().remove();

    const nodes = data.vertices.map((v) => ({
        group: 'nodes',
        data: { id: String(v.id), displayLabel: String(v.id + indexBase) },
        position: { x: v.x, y: v.y },
    }));

    const edges = data.edges.map((e) => ({
        group: 'edges',
        data: {
            source: String(e.source),
            target: String(e.target)
        },
        classes: directed ? 'directed' : '',
    }));

    cy.add([...nodes, ...edges]);
    cy.fit(50);
}

/*
 * Validation on load
 */

export function validateGraphData(data) {
    if (!data || typeof data !== 'object') {
        return 'File does not contain a valid JSON object.'
    }

    if (!Array.isArray(data.vertices)) {
        return 'File is missing a "vertices" array.';
    }

    if (!Array.isArray(data.edges)) {
        return 'File is missing an "edges" array.';
    }

    for (const v of data.vertices) {
        if (typeof v?.id !== 'number' || typeof v.x !== 'number' || typeof v.y !== 'number') {
            return `Vertex ${JSON.stringify(v)} is missing "id", "x", or "y" fields.`;
        }
    }
    const vertexIds = new Set(data.vertices.map((v) => v.id));
    if (vertexIds.size !== data.vertices.length) {
        return 'Two vertices share the same "id".';
    }
    for (const e of data.edges) {
        if (!vertexIds.has(e.source) || !vertexIds.has(e.target)) {
            return `Edge ${JSON.stringify(e)} references a vertex that doesn't exist.`
        }
    }
    return null;
}