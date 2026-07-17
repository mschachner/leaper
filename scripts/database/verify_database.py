#!/usr/bin/env python3
"""Sanity-check the leap-group database against known results from the
paper (leaps-su26): Hall's condition, parity structure, disjoint-union
theorems, and the classification of odd-order leap groups."""

import itertools
import json
import sys

import networkx as nx

db = []
for path in sys.argv[1:]:
    db.extend(json.load(open(path)))
byname = {e["name"]: e for e in db}
fails = []


def check(label, cond):
    print(("PASS " if cond else "FAIL ") + label)
    if not cond:
        fails.append(label)


def G_of(e):
    G = nx.Graph()
    G.add_nodes_from(range(e["n"]))
    G.add_edges_from(e["edges"])
    return G


def max_independent_set(G):
    best = 0
    nodes = list(G.nodes)
    for r in range(len(nodes), 0, -1):
        if r <= best:
            break
        for sub in itertools.combinations(nodes, r):
            if all(not G.has_edge(u, v) for u, v in itertools.combinations(sub, 2)):
                best = max(best, r)
                break
    return best


# --- Prop 2.3 (Hall): hasHop iff every subset has a large enough neighborhood
def hall(G):
    nodes = list(G.nodes)
    for r in range(1, len(nodes) + 1):
        for sub in itertools.combinations(nodes, r):
            nbhd = set()
            for v in sub:
                nbhd |= set(G.neighbors(v))
            if len(nbhd) < r:
                return False
    return True


check("Hall condition matches hasHop for all 1252 graphs",
      all(hall(G_of(e)) == e["hasHop"] for e in db))

# --- Cor 2.4: graphs with a hop have independence number <= n/2
check("hop => max independent set <= n/2",
      all(max_independent_set(G_of(e)) * 2 <= e["n"]
          for e in db if e["hasHop"]))

# --- Lambda_2 has index 1 or 2 in Lambda_1
check("[L1 : L2] in {1, 2}",
      all(e["l1Order"] in (e["l2Order"], 2 * e["l2Order"]) for e in db))

# --- Sec 3.1: complete graphs and cycles
check("L1(K3) = C3", byname["K3"]["l1"] == "C3")
for k in (4, 5, 6, 7, 8):
    check(f"L1(K{k}) = S{k}", byname[f"K{k}"]["l1"] == f"S{k}")
check("K8 has D(8) = 14833 hops", byname["K8"]["hopCount"] == 14833)
for k in (5, 7):
    check(f"L1(C{k}) = C{k}, reclusive",
          byname[f"C{k}"]["l1"] == f"C{k}" and byname[f"C{k}"]["reclusive"])
# Prop 3.5 / Cor 3.7: C_2n has L2 = Zn x Zn and |L1| = 2n^2
for k in (4, 6, 8):
    n2 = (k // 2) ** 2
    check(f"L2(C{k}) order {n2}, L1 order {2 * n2}",
          byname[f"C{k}"]["l2Order"] == n2
          and byname[f"C{k}"]["l1Order"] == 2 * n2)

# --- P2 + P2 has leap group C2 (parity obstruction, Prop 3.9)
e = byname.get("P2 + P2")
check("L1(P2 + P2) = C2", e is not None and e["l1"] == "C2")

# --- Prop 3.16: |L1| odd and > 1 iff disjoint union of odd cycles
def is_union_of_odd_cycles(e):
    G = G_of(e)
    for c in nx.connected_components(G):
        H = G.subgraph(c)
        k = len(c)
        if k < 3 or k % 2 == 0 or H.number_of_edges() != k:
            return False
        if not all(d == 2 for _, d in H.degree()):
            return False
    return True


check("|L1| odd > 1 iff disjoint union of odd cycles",
      all((e["l1Order"] % 2 == 1 and e["l1Order"] > 1) == is_union_of_odd_cycles(e)
          for e in db))

# --- Prop 3.15: abelian nontrivial leap groups have order not divisible by 4
check("L1 abelian => |L1| not divisible by 4",
      all(e["l1Order"] % 4 != 0 for e in db if e["l1Abelian"]))

# --- Thm 3.14: disjoint union orders (via components computed from the db)
buckets = {}
for e in db:
    key = (e["n"], e["m"], tuple(sorted(e["degrees"])))
    buckets.setdefault(key, []).append(e)


def entry_of(H):
    key = (H.number_of_nodes(), H.number_of_edges(),
           tuple(sorted(d for _, d in H.degree())))
    for e in buckets.get(key, []):
        if nx.is_isomorphic(G_of(e), H):
            return e
    return None


ok = True
checked = 0
for e in db:
    if e["components"] != 2:
        continue
    G = G_of(e)
    comps = [G.subgraph(c).copy() for c in nx.connected_components(G)]
    e1, e2 = entry_of(comps[0]), entry_of(comps[1])
    if e1 is None or e2 is None:
        ok = False
        break
    if not e1["hasHop"] or not e2["hasHop"]:
        expect = 1
    elif e1["reclusive"] or e2["reclusive"]:
        expect = e1["l1Order"] * e2["l1Order"]
    else:
        expect = e1["l2Order"] * e2["l2Order"] * 2
    if e["l1Order"] != expect:
        print(f"  mismatch {e['id']} ({e['name']}): "
              f"got {e['l1Order']}, expected {expect}")
        ok = False
    checked += 1
check(f"Thm 3.14 disjoint-union orders ({checked} two-component graphs)", ok)

# --- paper: smallest hopless connected balanced bipartite graph has 6 vertices
cands = [e for e in db
         if e["connected"] and e["bipartite"] and not e["hasHop"]]
balanced = []
for e in cands:
    G = G_of(e)
    part = nx.bipartite.sets(G)
    if len(part[0]) == len(part[1]):
        balanced.append(e)
check("smallest hopless connected balanced bipartite graph has 6 vertices",
      balanced and min(x["n"] for x in balanced) == 6)

# --- leap-redundant edges and leap-connectivity
check("Kn, Cn have no leap-redundant edges",
      all(not byname[nm]["redundant"]
          for nm in ("K3", "K4", "K5", "K6", "K7", "K8",
                     "C4", "C5", "C6", "C7", "C8")))
# Even paths have a unique hop (the perfect matching); the non-matching
# edges are redundant, and removing them leaves n/2 disjoint P2s.
def even_path_ok(nm, n):
    e = byname[nm]
    if len(e["redundant"]) != (n - 1) - n // 2 or e["leapConnected"]:
        return False
    G = G_of(e)
    G.remove_edges_from(e["edges"][i] for i in e["redundant"])
    return sorted(len(c) for c in nx.connected_components(G)) == [2] * (n // 2)


check("P4: non-matching edge redundant, leap-disconnected", even_path_ok("P4", 4))
check("P6: non-matching edges redundant, leap-disconnected", even_path_ok("P6", 6))
check("P8: non-matching edges redundant, leap-disconnected", even_path_ok("P8", 8))
# odd paths have no hop at all: every edge redundant
check("P3/P5/P7 hopless: all edges redundant",
      all(len(byname[nm]["redundant"]) == byname[nm]["m"]
          for nm in ("P3", "P5", "P7")))
check("leap-connected => connected",
      all(e["connected"] for e in db if e["leapConnected"]))
check("no hop and n >= 2 => leap-disconnected",
      all(not e["leapConnected"] for e in db if not e["hasHop"] and e["n"] >= 2))
check("K1 is leap-connected", byname["K1"]["leapConnected"])
check("redundant edge indices are valid",
      all(all(0 <= i < e["m"] for i in e["redundant"]) for e in db))

# --- totals
check("13598 graphs total", len(db) == 13598)
counts = {}
for e in db:
    counts[e["n"]] = counts.get(e["n"], 0) + 1
check("counts per n = 1,2,4,11,34,156,1044,12346",
      [counts[i] for i in range(1, 9)]
      == [1, 2, 4, 11, 34, 156, 1044, 12346])
check("ids unique", len({e["id"] for e in db}) == len(db))

print()
if fails:
    print(f"{len(fails)} FAILURES")
    sys.exit(1)
print("all checks passed")
