import { describe, it, expect } from 'vitest';
import core from '../src/data/leapDatabaseCore.json';
import {
  DEFAULT_FILTERS, displayGroup, matchesQuery, normalizeGroup, prepEntry, searchDatabase,
} from '../src/lib/leapDatabase';
import graphLibrary from '../src/lib/graphLibrary';

const db = core.map(prepEntry);
const search = (query, filters = {}, sort = 'vertices') =>
  searchDatabase(db, query, 'all', { ...DEFAULT_FILTERS, ...filters }, sort);

describe('database search', () => {
  it('finds graphs by name and alias', () => {
    expect(search('C6').some((e) => e.name === 'C6')).toBe(true);
    expect(search('triangle').some((e) => e.name === 'K3')).toBe(true);
    expect(search('prism')[0].name).toBe('Prism');
  });

  it('matches disjoint unions in either order', () => {
    const a = search('C3 + C4').map((e) => e.id);
    const b = search('C4 + C3').map((e) => e.id);
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
  });

  it('finds graphs by group, in several spellings', () => {
    const expected = db.filter((e) => e.l1 === 'C2 x C2' || e.l2 === 'C2 x C2').length;
    expect(expected).toBeGreaterThan(0);
    for (const q of ['C2 x C2', 'Z2 x Z2', 'c2×c2']) {
      const hits = search(q).filter((e) => e.l1 === 'C2 x C2' || e.l2 === 'C2 x C2');
      expect(hits.length).toBe(expected);
    }
    expect(normalizeGroup('S3 ≀ C2')).toBe(normalizeGroup('s3 wr c2'));
    expect(matchesQuery(db.find((e) => e.name === 'K3,3'), 'S3 ≀ C2', 'group')).toBe(true);
  });

  it('applies filters and sorting', () => {
    const hopless = search('', { hasHop: 'no' });
    expect(hopless.length).toBeGreaterThan(0);
    expect(hopless.every((e) => !e.hasHop)).toBe(true);
    const byHops = search('', { minN: 6, maxN: 6 }, 'hops');
    expect(byHops[0].name).toBe('K6');
    expect(byHops.every((e) => e.n === 6)).toBe(true);
  });

  it('shows friendlier names for some GAP descriptions', () => {
    expect(displayGroup('(S3 x S3) : C2')).toBe('S3 ≀ C2');
    expect(displayGroup('S5')).toBe('S5');
  });
});

describe('database contents', () => {
  it('covers every graph on up to 7 vertices', () => {
    expect(db.length).toBe(1252);
    expect(db.every((e) => e.edges.length === e.m && e.layout.length === e.n)).toBe(true);
  });

  // The library and the database were built separately; where they name the
  // same graph they should agree on its size.
  it('agrees with the graph library on shared names', () => {
    const rename = { 'K3 (Triangle)': 'K3', 'Cube (Q3)': 'Cube', '2×3 Grid': '2x3 grid', '2×4 Grid': '2x4 grid' };
    let compared = 0;
    for (const graph of graphLibrary.filter((g) => !g.directed)) {
      const entry = db.find((e) => e.name === (rename[graph.name] ?? graph.name));
      if (!entry) continue;
      compared += 1;
      expect([graph.name, graph.vertices.length, graph.edges.length]).toEqual([graph.name, entry.n, entry.m]);
    }
    expect(compared).toBeGreaterThan(15);
  });
});
