import { describe, it, expect } from 'vitest';
import cytoscape from 'cytoscape';
import {
  graphData, graphSnapshot, graphEdges, graphElements, restoreGraphElements,
  relabelVertices, sameGraph,
} from '../src/lib/cyGraph';
import { serializeGraph, deserializeGraph, validateGraphData } from '../src/lib/graphFile';

const path3 = {
  vertices: [{ id: 0, x: 0, y: 0 }, { id: 1, x: 50, y: 0 }, { id: 2, x: 100, y: 0 }],
  edges: [{ source: 0, target: 1 }, { source: 1, target: 2 }],
};

function canvasWith(graph) {
  const cy = cytoscape({ headless: true });
  deserializeGraph(cy, graph);
  return cy;
}

/** Add the arrows the app draws for a working leap and a hop in progress. */
function addOverlays(cy) {
  cy.add({ group: 'edges', data: { id: 'leap-arrow-0', source: '0', target: '2' }, classes: 'leap-arrow' });
  cy.add({ group: 'edges', data: { id: 'draw-hop-1', source: '2', target: '0' }, classes: 'draw-hop-arrow' });
}

describe('overlay arrows are not part of the graph', () => {
  it('graphData and graphSnapshot leave them out', () => {
    const cy = canvasWith(path3);
    addOverlays(cy);
    expect(cy.edges().length).toBe(4);
    expect(graphEdges(cy).length).toBe(2);
    expect(graphData(cy, false)).toEqual({ vertices: [0, 1, 2], edges: [[0, 1], [1, 2]], directed: false });
    expect(graphSnapshot(cy)).toEqual(path3);
  });

  it('saved files leave them out', () => {
    const cy = canvasWith(path3);
    addOverlays(cy);
    const file = serializeGraph(cy, 'test');
    expect(file.edges).toEqual(path3.edges);
    expect(validateGraphData(file)).toBeNull();
  });

  it('undo snapshots leave them out', () => {
    const cy = canvasWith(path3);
    addOverlays(cy);
    const saved = graphElements(cy);
    cy.elements().remove();
    restoreGraphElements(cy, saved);
    expect(cy.nodes().length).toBe(3);
    expect(cy.edges().length).toBe(2);
    expect(cy.getElementById('1').position()).toEqual({ x: 50, y: 0 });
  });

  it('relabeling does not turn them into edges', () => {
    const cy = canvasWith(path3);
    addOverlays(cy);
    cy.getElementById('0').remove();          // also removes its edges and arrows
    expect(relabelVertices(cy, 1, false)).toBe(2);
    expect(graphData(cy, false)).toEqual({ vertices: [0, 1], edges: [[0, 1]], directed: false });
    expect(cy.edges().length).toBe(1);
  });
});

describe('relabelVertices', () => {
  it('renumbers 0..n-1 in order, keeping positions, edges and labels', () => {
    const cy = canvasWith({
      vertices: [{ id: 4, x: 1, y: 2 }, { id: 7, x: 3, y: 4 }, { id: 9, x: 5, y: 6 }],
      edges: [{ source: 4, target: 9 }],
    });
    expect(relabelVertices(cy, 1, true)).toBe(3);
    expect(graphSnapshot(cy)).toEqual({
      vertices: [{ id: 0, x: 1, y: 2 }, { id: 1, x: 3, y: 4 }, { id: 2, x: 5, y: 6 }],
      edges: [{ source: 0, target: 2 }],
    });
    expect(cy.nodes().map((n) => n.data('displayLabel'))).toEqual(['1', '2', '3']);
    expect(cy.edges().every((e) => e.hasClass('directed'))).toBe(true);
  });

  it('leaves an already numbered graph alone', () => {
    const cy = canvasWith(path3);
    let events = 0;
    cy.on('add remove', () => { events += 1; });
    expect(relabelVertices(cy, 1, false)).toBe(3);
    expect(events).toBe(0);
  });
});

describe('sameGraph', () => {
  it('ignores positions and, when undirected, edge direction', () => {
    const cy = canvasWith(path3);
    const moved = {
      vertices: path3.vertices.map((v) => ({ ...v, x: v.x + 10 })),
      edges: [{ source: 1, target: 0 }, { source: 2, target: 1 }],
    };
    expect(sameGraph(cy, moved, false)).toBe(true);
    expect(sameGraph(cy, moved, true)).toBe(false);
  });

  it('notices different vertices or edges', () => {
    const cy = canvasWith(path3);
    expect(sameGraph(cy, { ...path3, edges: [path3.edges[0]] }, false)).toBe(false);
    expect(sameGraph(cy, { ...path3, edges: [{ source: 0, target: 1 }, { source: 0, target: 2 }] }, false)).toBe(false);
    expect(sameGraph(cy, { vertices: path3.vertices.slice(0, 2), edges: [] }, false)).toBe(false);
    expect(sameGraph(cy, null, false)).toBe(false);
  });
});

describe('validateGraphData', () => {
  it('accepts a saved graph', () => {
    expect(validateGraphData(path3)).toBeNull();
  });

  it.each([
    ['not an object', null],
    ['no vertices', { edges: [] }],
    ['no edges', { vertices: [] }],
    ['vertex without position', { vertices: [{ id: 0 }], edges: [] }],
    ['duplicate ids', { vertices: [{ id: 0, x: 0, y: 0 }, { id: 0, x: 1, y: 1 }], edges: [] }],
    ['edge to nowhere', { vertices: [{ id: 0, x: 0, y: 0 }], edges: [{ source: 0, target: 3 }] }],
  ])('rejects %s', (_label, data) => {
    expect(validateGraphData(data)).toEqual(expect.any(String));
  });
});
