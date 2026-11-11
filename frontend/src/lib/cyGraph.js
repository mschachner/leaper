/**
 * Helpers for reading and rewriting the graph held in a Cytoscape instance.
 *
 * The canvas holds more than the graph: the arrows drawn for the working
 * leap and for a hop in progress are Cytoscape edges too. Everything that
 * reads "the graph" (computations, saving, undo, relabeling) must go through
 * these helpers so that those overlay arrows are never mistaken for edges.
 */

export const OVERLAY_SELECTOR = '.leap-arrow, .draw-hop-arrow';

/** Is this element one of the overlay arrows rather than part of the graph? */
export function isOverlay(ele) {
    return ele.hasClass('leap-arrow') || ele.hasClass('draw-hop-arrow');
}

/** The edges of the graph itself. */
export function graphEdges(cy) {
    return cy.edges().not(OVERLAY_SELECTOR);
}

/** The graph in the shape the API expects. */
export function graphData(cy, directed) {
    return {
        vertices: cy.nodes().map((n) => parseInt(n.id(), 10)),
        edges: graphEdges(cy).map((e) => [
            parseInt(e.data('source'), 10),
            parseInt(e.data('target'), 10),
        ]),
        directed,
    };
}

/** The graph with vertex positions, as stored in files and workspace entries. */
export function graphSnapshot(cy) {
    return {
        vertices: cy.nodes().map((n) => ({
            id: parseInt(n.id(), 10),
            x: n.position('x'),
            y: n.position('y'),
        })),
        edges: graphEdges(cy).map((e) => ({
            source: parseInt(e.data('source'), 10),
            target: parseInt(e.data('target'), 10),
        })),
    };
}

/**
 * Does the canvas hold the same graph as `snapshot` (same vertex ids, same
 * edges)? Positions are ignored. Undirected edges match in either direction.
 */
export function sameGraph(cy, snapshot, directed) {
    if (!snapshot) return false;
    const key = (s, t) => (directed || s <= t ? `${s}>${t}` : `${t}>${s}`);
    const current = graphSnapshot(cy);
    if (current.vertices.length !== snapshot.vertices.length) return false;
    if (current.edges.length !== snapshot.edges.length) return false;
    const ids = new Set(current.vertices.map((v) => v.id));
    if (!snapshot.vertices.every((v) => ids.has(v.id))) return false;
    const edges = new Set(current.edges.map((e) => key(e.source, e.target)));
    return snapshot.edges.every((e) => edges.has(key(e.source, e.target)));
}

/** The graph's elements as Cytoscape JSON, for undo and for swapping graphs. */
export function graphElements(cy) {
    return cy.elements().not(OVERLAY_SELECTOR).jsons();
}

/** Replace everything on the canvas with elements from `graphElements`. */
export function restoreGraphElements(cy, elements) {
    cy.elements().remove();
    cy.add(elements);
}

/**
 * Renumber the vertices 0, 1, ..., n-1 in their current order, keeping
 * positions and edges. Cytoscape ids are immutable, so the graph is rebuilt.
 * Returns the number of vertices. Does nothing if the ids are already
 * 0, ..., n-1 in order.
 */
export function relabelVertices(cy, indexBase, directed) {
    const nodes = cy.nodes();
    const inOrder = nodes.every((n, i) => n.id() === String(i));
    if (inOrder) return nodes.length;

    const idMap = {};
    nodes.forEach((n, i) => { idMap[n.id()] = String(i); });
    const nodeData = nodes.map((n) => ({
        id: idMap[n.id()],
        position: { ...n.position() },
    }));
    const edgeData = graphEdges(cy).map((e) => ({
        source: idMap[e.data('source')],
        target: idMap[e.data('target')],
    }));

    cy.elements().remove();
    cy.add(nodeData.map(({ id, position }) => ({
        group: 'nodes',
        data: { id, displayLabel: String(parseInt(id, 10) + indexBase) },
        position,
    })));
    cy.add(edgeData.map((data) => ({
        group: 'edges',
        data,
        classes: directed ? 'directed' : '',
    })));
    return nodeData.length;
}
