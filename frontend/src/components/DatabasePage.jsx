import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FILTERS,
  MAX_N,
  SORTS,
  displayGroup,
  prepEntry,
  searchDatabase,
} from '../lib/leapDatabase';

import './DatabasePage.css';

const PAGE_SIZE = 60;

const FAMILIES = [
  ['any', 'Any family'],
  ['Complete', 'Complete'],
  ['Cycle', 'Cycles'],
  ['Path', 'Paths'],
  ['Bipartite', 'Bipartite'],
  ['Grid', 'Grids'],
  ['Famous', 'Famous'],
  ['Tree', 'Trees'],
  ['Disjoint union', 'Disjoint unions'],
  ['Other', 'Other'],
];

const TRI_FILTERS = [
  ['hasHop', 'Has hop'],
  ['connected', 'Connected'],
  ['bipartite', 'Bipartite'],
  ['reclusive', 'Reclusive'],
  ['planar', 'Planar'],
  ['regular', 'Regular'],
  ['forest', 'Forest'],
  ['l1Abelian', 'Λ₁ abelian'],
  ['leapConnected', 'Leap-connected'],
];

function DatabasePage() {
  const [db, setDb] = useState(null);
  const [query, setQuery] = useState('');
  const [groupSel, setGroupSel] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState('vertices');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Load the database lazily so it stays out of the main bundle. The core
  // (n <= 7) chunk is small and bundled; the n = 8 chunk is ~7.5 MB and is
  // fetched in the background after the core is shown.
  const [n8State, setN8State] = useState('loading'); // loading | done | error
  useEffect(() => {
    let live = true;
    import('../data/leapDatabaseCore.json').then((m) => {
      if (!live) return;
      setDb(m.default.map(prepEntry));
      fetch(`${import.meta.env.BASE_URL}data/leapDatabaseN8.json`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((n8) => {
          if (!live) return;
          setDb((prev) => [...(prev || []), ...n8.map(prepEntry)]);
          setN8State('done');
        })
        .catch((err) => {
          console.warn('Failed to load n=8 database chunk:', err);
          if (live) setN8State('error');
        });
    });
    return () => { live = false; };
  }, []);

  // All distinct leap groups in the database, sorted by group order.
  const allGroups = useMemo(() => {
    if (!db) return [];
    const seen = new Map();
    for (const e of db) {
      if (!seen.has(e.l1)) seen.set(e.l1, e.l1Order);
    }
    return [...seen.entries()]
      .map(([name, order]) => ({ name, order }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }, [db]);

  // Results of search + filters, before the group pill is applied.
  const baseResults = useMemo(() => {
    if (!db) return [];
    return searchDatabase(db, query, 'all', filters, sortKey);
  }, [db, query, filters, sortKey]);

  // How many of those have each leap group (drives pill greying).
  const groupCounts = useMemo(() => {
    const counts = new Map();
    for (const e of baseResults) {
      counts.set(e.l1, (counts.get(e.l1) || 0) + 1);
    }
    return counts;
  }, [baseResults]);

  const results = useMemo(
    () => (groupSel ? baseResults.filter((e) => e.l1 === groupSel) : baseResults),
    [baseResults, groupSel]
  );

  // Reset pagination whenever the result set changes.
  useEffect(() => { setLimit(PAGE_SIZE); }, [query, filters, sortKey, groupSel]);

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const filtersActive =
    JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  if (!db) {
    return <div className="db-page db-loading">Loading database…</div>;
  }

  return (
    <div className="db-page">
      <div className="db-controls">
        <div className="db-search-row">
          <input
            type="text"
            className="db-search-input"
            placeholder="Search by graph name (C6, prism, K3 + K3) or group structure (S4, Z2 x Z2)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button
            className={`db-pill db-filters-toggle${filtersOpen || filtersActive ? ' active' : ''}`}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            Filters{filtersActive ? ' •' : ''}
          </button>
          <select
            className="db-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            {Object.entries(SORTS).map(([k, s]) => (
              <option key={k} value={k}>Sort: {s.label}</option>
            ))}
          </select>
        </div>

        {/* Every leap group represented in the database. Clicking filters to
            graphs with that Λ₁; pills grey out when the current search and
            filters exclude every graph with that group. */}
        <div className="db-group-pills">
          <span className="db-filter-label">Leap groups:</span>
          {allGroups.map(({ name, order }) => {
            const count = groupCounts.get(name) || 0;
            const active = groupSel === name;
            const pretty = displayGroup(name);
            return (
              <button
                key={name}
                className={
                  'db-group-pill' +
                  (active ? ' active' : '') +
                  (count === 0 ? ' unavailable' : '')
                }
                disabled={count === 0 && !active}
                title={`Λ₁ ≅ ${pretty}, order ${order}`
                  + (pretty !== name ? ` (GAP: ${name})` : '')}
                onClick={() => setGroupSel(active ? null : name)}
              >
                {name === '1' ? 'trivial' : pretty}
                {count > 0 && <span className="db-group-pill-count">{count}</span>}
              </button>
            );
          })}
        </div>

        {filtersOpen && (
          <div className="db-filter-panel">
            <div className="db-filter-group">
              <label className="db-filter-label">Vertices</label>
              <select
                className="db-select"
                value={filters.minN}
                onChange={(e) => setFilter('minN', Number(e.target.value))}
              >
                {Array.from({ length: MAX_N }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v}>min {v}</option>
                ))}
              </select>
              <select
                className="db-select"
                value={filters.maxN}
                onChange={(e) => setFilter('maxN', Number(e.target.value))}
              >
                {Array.from({ length: MAX_N }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v}>max {v}</option>
                ))}
              </select>
              <select
                className="db-select"
                value={filters.family}
                onChange={(e) => setFilter('family', e.target.value)}
              >
                {FAMILIES.map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div className="db-filter-group">
              {TRI_FILTERS.map(([key, label]) => (
                <span key={key} className="db-tri">
                  <label className="db-filter-label">{label}</label>
                  <select
                    className="db-select"
                    value={filters[key]}
                    onChange={(e) => setFilter(key, e.target.value)}
                  >
                    <option value="any">any</option>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </span>
              ))}
              {filtersActive && (
                <button
                  className="db-pill"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        <div className="db-result-count">
          {results.length} of {db.length} graphs
          {n8State === 'loading' && ' · loading 12,346 graphs on 8 vertices…'}
          {n8State === 'error' && ' · (n = 8 data failed to load)'}
        </div>
      </div>

      <div className="db-grid-container">
        {results.length === 0 ? (
          <div className="db-empty">
            No graphs match. Try a family name (C6, K3,3), a small classic
            (paw, bull, prism), or a group in GAP notation (S4, C2 x C2, D8).
          </div>
        ) : (
          <>
            <div className="db-grid">
              {results.slice(0, limit).map((e) => (
                <EntryCard key={e.id} entry={e} onClick={() => setSelected(e)} />
              ))}
            </div>
            {results.length > limit && (
              <button
                className="db-show-more btn"
                onClick={() => setLimit(limit + PAGE_SIZE)}
              >
                Show more ({results.length - limit} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {selected && (
        <DetailModal entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function GraphSvg({ entry, className }) {
  const pad = 16;
  const xs = entry.layout.map((p) => p[0]);
  const ys = entry.layout.map((p) => p[1]);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) + pad - minX;
  const h = Math.max(...ys) + pad - minY;
  const redundant = new Set(entry.redundant);

  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} className={className}>
      {entry.edges.map(([u, v], i) => (
        <line
          key={i}
          className={`db-svg-edge${redundant.has(i) ? ' redundant' : ''}`}
          x1={entry.layout[u][0]} y1={entry.layout[u][1]}
          x2={entry.layout[v][0]} y2={entry.layout[v][1]}
        />
      ))}
      {entry.layout.map(([x, y], i) => (
        <circle key={i} className="db-svg-node" cx={x} cy={y} r={6} />
      ))}
    </svg>
  );
}

function EntryCard({ entry, onClick }) {
  return (
    <div className="db-card" onClick={onClick}>
      <GraphSvg entry={entry} className="db-card-svg" />
      <div className="db-card-name">{entry.name}</div>
      <div className="db-card-info">
        {entry.n} vertices, {entry.m} edges
      </div>
      <div className="db-card-badges">
        {entry.hasHop ? (
          <>
            <span className="db-badge db-badge-group" title="Leap group Λ₁">
              Λ₁ ≅ {displayGroup(entry.l1)}
            </span>
            <span className="db-badge" title="Number of hops">
              {entry.hopCount} hop{entry.hopCount === 1 ? '' : 's'}
            </span>
          </>
        ) : (
          <span className="db-badge db-badge-nohop">no hop</span>
        )}
      </div>
    </div>
  );
}

function yn(v) {
  if (v === null || v === undefined) return '—';
  return v ? 'yes' : 'no';
}

function GroupValue({ desc, order }) {
  const pretty = displayGroup(desc);
  return (
    <>
      {pretty}&ensp;(order {order})
      {pretty !== desc && <div className="db-detail-gap">GAP: {desc}</div>}
    </>
  );
}

function DetailModal({ entry, onClose }) {
  const rows = [
    ['Leap group Λ₁', entry.hasHop
      ? <GroupValue desc={entry.l1} order={entry.l1Order} />
      : 'trivial (no hop)'],
    ['Second leap group Λ₂', entry.hasHop
      ? <GroupValue desc={entry.l2} order={entry.l2Order} />
      : 'trivial'],
    ['Hops', String(entry.hopCount)],
    ['Reclusive', entry.hasHop ? yn(entry.reclusive) : '— (no hop)'],
    ['Leap-connected', yn(entry.leapConnected)],
    ['Leap-redundant edges',
      entry.redundant.length === 0 ? 'none'
        : `${entry.redundant.length} of ${entry.m}`],
    ['Λ₁ abelian', entry.hasHop ? yn(entry.l1Abelian) : '—'],
    ['Vertices / edges', `${entry.n} / ${entry.m}`],
    ['Degree sequence', entry.degrees.join(', ')],
    ['Connected', `${yn(entry.connected)}${entry.connected ? '' : ` (${entry.components} components)`}`],
    ['Bipartite', yn(entry.bipartite)],
    ['Planar', yn(entry.planar)],
    ['Regular', yn(entry.regular)],
    ['Tree / forest', `${yn(entry.tree)} / ${yn(entry.forest)}`],
    ['Girth', entry.girth === null ? '∞ (no cycles)' : String(entry.girth)],
    ['Diameter', entry.diameter === null ? '—' : String(entry.diameter)],
    ['Triangles', String(entry.triangles)],
    ...(entry.atlas != null
      ? [['Atlas number', `G${entry.atlas} (Read–Wilson)`]]
      : []),
    ['graph6', entry.g6],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal db-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{entry.name}</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        <div className="modal-body db-detail-body">
          <GraphSvg entry={entry} className="db-detail-svg" />
          {entry.redundant.length > 0 && (
            <div className="db-redundant-legend">
              <svg viewBox="0 0 24 8" className="db-redundant-legend-swatch">
                <line x1="1" y1="4" x2="23" y2="4" className="db-svg-edge redundant" />
              </svg>
              leap-redundant edge (used by no hop)
            </div>
          )}
          {entry.aliases.length > 0 && (
            <div className="db-detail-aliases">
              Also known as: {entry.aliases.join(', ')}
            </div>
          )}
          <table className="db-detail-table">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <td className="db-detail-key">{k}</td>
                  <td className="db-detail-value">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DatabasePage;
