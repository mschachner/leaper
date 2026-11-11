import { describe, it, expect } from 'vitest';
import graphLibrary from '../src/lib/graphLibrary';
import { makeRandom } from '../src/lib/graphGenerators';

const byName = (name) => graphLibrary.find((g) => g.name === name);

function neighbors(graph) {
  const nbrs = graph.vertices.map(() => new Set());
  for (const { source, target } of graph.edges) {
    nbrs[source].add(target);
    nbrs[target].add(source);
  }
  return nbrs;
}

function distancesFrom(nbrs, start) {
  const dist = new Array(nbrs.length).fill(-1);
  dist[start] = 0;
  const queue = [start];
  for (const v of queue) {
    for (const w of nbrs[v]) {
      if (dist[w] === -1) {
        dist[w] = dist[v] + 1;
        queue.push(w);
      }
    }
  }
  return dist;
}

/**
 * The intersection array {b_0, ..., b_{d-1}; c_1, ..., c_d} of a
 * distance-regular graph, or null if the graph is not distance-regular.
 * b_i (c_i) counts the neighbors of a vertex at distance i from v that are
 * at distance i+1 (i-1) from v.
 */
function intersectionArray(graph) {
  const nbrs = neighbors(graph);
  let array = null;
  for (let v = 0; v < nbrs.length; v++) {
    const dist = distancesFrom(nbrs, v);
    const d = Math.max(...dist);
    const b = new Array(d + 1).fill(null);
    const c = new Array(d + 1).fill(null);
    for (let w = 0; w < nbrs.length; w++) {
      const i = dist[w];
      const up = [...nbrs[w]].filter((x) => dist[x] === i + 1).length;
      const down = [...nbrs[w]].filter((x) => dist[x] === i - 1).length;
      if (b[i] !== null && (b[i] !== up || c[i] !== down)) return null;
      b[i] = up;
      c[i] = down;
    }
    const here = `${b.slice(0, d).join(',')};${c.slice(1).join(',')}`;
    if (array !== null && array !== here) return null;
    array = here;
  }
  return array;
}

describe('graph library', () => {
  it('has unique names', () => {
    const names = graphLibrary.map((g) => g.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(graphLibrary.map((g) => [g.name, g]))('%s is well formed', (_name, graph) => {
    const n = graph.vertices.length;
    expect(graph.vertices.map((v) => v.id)).toEqual([...Array(n).keys()]);
    const seen = new Set();
    for (const { source, target } of graph.edges) {
      expect(source).not.toBe(target);
      expect(source >= 0 && source < n && target >= 0 && target < n).toBe(true);
      const key = graph.directed || source < target ? `${source}>${target}` : `${target}>${source}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    for (const v of graph.vertices) {
      expect(Number.isFinite(v.x) && Number.isFinite(v.y)).toBe(true);
    }
  });

  it.each([
    ['K5', 5, 10], ['K8', 8, 28], ['C10', 10, 10], ['P8', 8, 7],
    ['3×4 Grid', 12, 17], ['4×4 Grid', 16, 24], ['K2,4', 6, 8], ['K3,3', 6, 9],
    ['Petersen', 10, 15], ['Cube (Q3)', 8, 12], ['Prism', 6, 9],
    ['Möbius–Kantor', 16, 24], ['Pappus', 18, 27], ['Heawood', 14, 21],
  ])('%s has %i vertices and %i edges', (name, n, m) => {
    expect(byName(name).vertices.length).toBe(n);
    expect(byName(name).edges.length).toBe(m);
  });

  // Each of these graphs is the only distance-regular graph with its
  // intersection array, so the array identifies it up to isomorphism.
  it.each([
    ['Petersen', '3,2;1,1'],
    ['Cube (Q3)', '3,2,1;1,2,3'],
    ['Heawood', '3,2,2;1,1,3'],
    ['Pappus', '3,2,2,1;1,1,2,3'],
    ['K3,3', '3,2;1,3'],
  ])('%s has intersection array {%s}', (name, array) => {
    expect(intersectionArray(byName(name))).toBe(array);
  });

  it('Möbius–Kantor is cubic and bipartite', () => {
    const nbrs = neighbors(byName('Möbius–Kantor'));
    expect(nbrs.every((s) => s.size === 3)).toBe(true);
    const dist = distancesFrom(nbrs, 0);
    for (const { source, target } of byName('Möbius–Kantor').edges) {
      expect(dist[source] % 2).not.toBe(dist[target] % 2);
    }
  });
});

describe('makeRandom', () => {
  it('makes simple graphs on 0..n-1', () => {
    for (const directed of [false, true]) {
      const g = makeRandom(directed, 12, 0.5);
      expect(g.vertices.map((v) => v.id)).toEqual([...Array(12).keys()]);
      for (const { source, target } of g.edges) {
        expect(source).not.toBe(target);
        if (!directed) expect(source).toBeLessThan(target);
      }
    }
  });
});
