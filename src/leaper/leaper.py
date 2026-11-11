r"""
Utilities for calculating leap groups.

Hop enumeration and generator reduction live in ``hopsearch.py`` (pure
Python); this module is the Sage-facing layer on top of it.
"""
from sage.all import *
from sage.graphs.all import graphs
from sage.graphs.digraph_generators import DiGraphGenerators
from sage.libs.gap.libgap import libgap
DiGraphs = DiGraphGenerators()

# After the star import, which defines its own ``factorial`` and ``random``.
from itertools import islice
from math import factorial as _factorial
from random import Random as _Random

try:
    from . import hopsearch
except ImportError:  # loaded as a plain module rather than as leaper.leaper
    import hopsearch


def _hop_neighbors(G, v):
    """
    Return the neighbors of ``v`` relevant for hops:
    out-neighbors for directed graphs, all neighbors for undirected.
    """
    if G.is_directed():
        return G.neighbors_out(v)
    return G.neighbors(v)

def is_hop(G, p):
    """
    Return True if the permutation ``p`` is a hop on the graph ``G``.
    """
    return all(p[v] in _hop_neighbors(G, v) for v in G.vertices())

def _adjacency(G):
    """
    Return ``(verts, adj)``: the sorted vertices of ``G``, and its adjacency
    in the form ``hopsearch`` uses, with vertex ``verts[i]`` numbered ``i``.
    """
    verts = sorted(G.vertices())
    index = {v: i for i, v in enumerate(verts)}
    adj = [sorted(index[w] for w in set(_hop_neighbors(G, v))) for v in verts]
    return verts, adj

def hops(G):
    """
    Return a list of all the hops on the graph ``G`` as standard permutations
    of {1, ..., n}, where n = |V(G)|, in lexicographic order.
    """
    _, adj = _adjacency(G)
    return [Permutation([x + 1 for x in p]) for p in hopsearch.iter_hops(adj)]

def compositions(h, n):
    """
    Given a list of permutations, return the compositions of the permutations of length ``n``.
    """
    if n == 1:
        return h
    else:
        return [p * q for p in h for q in compositions(h, n-1)]

def leap_group_from_adjacency(adj, n=1, samples=64, chunk=512):
    """
    Return ``(group, info)`` for the graph with the given adjacency (see
    ``hopsearch``): ``group`` is its ``n``-th leap group as a GAP permutation
    group on {1, ..., len(adj)}, and ``info`` is a dict with

    - ``hops``: the number of hops examined, and
    - ``complete``: whether every hop was enumerated.

    The group can never be larger than ``hopsearch.order_bound(adj, n)``, so
    as soon as it reaches that order there is nothing left to compute. It is
    built in two stages. First, randomly chosen hops are tried, ``samples``
    at a time, for as long as they keep enlarging the group. Dense graphs,
    which have enormous numbers of hops, almost always reach the bound here
    (``complete`` is then False). Otherwise every hop is enumerated and fed
    to GAP in chunks.
    """
    N = len(adj)
    group = libgap.Group([], libgap.eval("()"))
    info = {"hops": 0, "complete": True}
    first = hopsearch.find_hop(adj)
    if first is None:
        return group, info
    bound = hopsearch.order_bound(adj, n)
    base, expand = hopsearch.leap_generator_map(first, n)

    def enlarge(group, hop_iter):
        gens = [g for a in hop_iter for g in expand(a)]
        return libgap.ClosureGroup(
            group, [libgap.PermList([x + 1 for x in g]) for g in gens])

    group = enlarge(group, [first])
    if base:
        group = libgap.ClosureGroup(
            group, [libgap.PermList([x + 1 for x in g]) for g in base])
    order = int(group.Order())

    rng = _Random(0)
    for _ in range(8):
        if order == bound:
            break
        group = enlarge(group, [hopsearch.find_hop(adj, rng) for _ in range(samples)])
        info["hops"] += samples
        grown = int(group.Order())
        if grown == order:
            break
        order = grown
    if order == bound:
        info["complete"] = False
        return group, info

    info["hops"] = 0
    hop_iter = hopsearch.iter_hops(adj)
    while True:
        batch = list(islice(hop_iter, chunk))
        if not batch:
            break
        info["hops"] += len(batch)
        group = enlarge(group, batch)
        if int(group.Order()) == bound:
            info["complete"] = next(hop_iter, None) is None
            break
        chunk = min(2 * chunk, 65536)
    return group, info

def _symmetric_name(m):
    return "C2" if m == 2 else f"S{m}"

def recognize_group(group, N):
    r"""
    Name the GAP permutation group ``group`` on {1, ..., N} if it is one of a
    few shapes that can be identified from its order alone, and return None
    otherwise. These shapes are common among leap groups, and GAP's
    ``StructureDescription`` can take minutes on them once they are large.

    - Trivial: ``"1"``.
    - One nontrivial orbit of size `m`, and order `m!` or `m!/2`: the
      symmetric group or (as the only subgroup of index 2) the alternating
      group, ``"S<m>"`` or ``"A<m>"``.
    - One nontrivial orbit carrying a block system of `k` blocks of size
      `m \ge 3`, and order `(m!)^k \, k!`: the group lies in the stabilizer
      of the block system, which has exactly that order, so it is all of
      `S_m \wr S_k`. Named ``"S<m> ≀ S<k>"``, with ``C2`` for `S_2`.
    - Several nontrivial orbits of sizes `m_1, \dots, m_r`, and order
      `\prod m_i!`: the full product ``"S<m_1> x ... x S<m_r>"``. Only used
      for orders above 50,000, so that smaller groups keep GAP's names.
    """
    order = int(group.Order())
    if order == 1:
        return "1"
    orbits = [o for o in group.Orbits(list(range(1, N + 1))).sage() if len(o) > 1]
    if len(orbits) == 1:
        M = len(orbits[0])
        if order == _factorial(M):
            return _symmetric_name(M)
        if M >= 5 and 2 * order == _factorial(M):
            return f"A{M}"
        # If the group is S_m wr S_k then its only block system is the one
        # it stabilizes, and that system is the smallest one in which point 1
        # shares a block with any other point of its block. So it is enough
        # to look at those smallest systems, one per second point.
        action = libgap.Action(group, orbits[0])
        points = list(range(1, M + 1))
        tried = set()
        for x in range(2, M + 1):
            m = len(action.Blocks(points, [1, x])[0])
            if m in tried or m == M:
                continue
            tried.add(m)
            k = M // m
            if m >= 3 and order == _factorial(m) ** k * _factorial(k):
                return f"S{m} ≀ {_symmetric_name(k)}"
        return None
    if order > 50000 and order == prod(_factorial(len(o)) for o in orbits):
        return " x ".join(_symmetric_name(m) for m in sorted(len(o) for o in orbits))
    return None

def describe_group(group, N):
    """
    Return a structure description of the GAP permutation group ``group`` on
    {1, ..., N}: a recognized name (see ``recognize_group``) if there is one,
    and GAP's ``StructureDescription`` otherwise. The latter can be very slow
    for large groups.
    """
    name = recognize_group(group, N)
    if name is None:
        name = str(group.StructureDescription())
    return name

def leap_n(G, n):
    """
    Return the nth leap group of the graph ``G``.
    """
    _, adj = _adjacency(G)
    group, _ = leap_group_from_adjacency(adj, n)
    return PermutationGroup(gap_group=group, domain=list(range(1, len(adj) + 1)))

def leap_group(G):
    """
    Return the (first) leap group of the graph ``G``.
    """
    return leap_n(G, 1)

def leap_2(G):
    """
    Return the second leap group of the graph ``G``.
    """
    return leap_n(G, 2)

def compute_leap_groups(max_vertices, output_dir, directed=False, max_degree=2, images=False):
    """
    Compute the following for all (directed or undirected) graphs with at most ``max_vertices`` vertices:
    - The name of the graph
    - If enabled, an image of the graph
    - The number of vertices
    - The number of edges
    - The chromatic number
    - For each n from 1 to max_degree:
        - The structure description of the nth leap group
        - The order of the nth leap group
    
    Outputs as a csv in ``output_dir``. If ``images`` is True, then the images are saved as png files in a directory called 'images' within ``output_dir``, and the path to the respective image is added to the csv.
    """
    import os
    import pandas as pd
    try:
        from graphsCanonical import CANONICAL_NAME
    except ImportError:
        print("Warning: Could not import CANONICAL_NAME from graphsCanonical.py")
        CANONICAL_NAME = {}

    data = []
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    images_dir = os.path.join(output_dir, 'images')
    if images and not os.path.exists(images_dir):
        os.makedirs(images_dir)
        
    img_counter = 0
    total_graphs = 0
    
    for v in range(1, max_vertices + 1):
        print(f"Processing graphs with {v} vertices...")
        if directed:
            gen = DiGraphs(v)
        else:
            gen = graphs.nauty_geng(str(v))
        for G in gen:
            total_graphs += 1
            if total_graphs % 100 == 0:
                print(f"Processed {total_graphs} graphs...")
                
            row = {}
            
            # Canonicalize the graph to ensure consistent graph6 string lookup
            canon_G = G.canonical_label()
            
            # Determine graph6/dig6 string
            g6 = canon_G.dig6_string() if directed else canon_G.graph6_string()
            
            # Look up name in CANONICAL_NAME, fallback to generated name
            if g6 in CANONICAL_NAME:
                row['name'] = CANONICAL_NAME[g6]
            else:
                existing_name = G.name()
                if existing_name:
                    row['name'] = existing_name
                else:
                    # Generate name like "(n,m) graph #K"
                    # We can use img_counter as a unique K since it increments for every graph
                    # Note: img_counter is incremented later if images is True, but we can rely on total_graphs
                    # However, total_graphs is reset each run. If we want global uniqueness across calls we'd need more state.
                    # Assuming K just needs to be unique within this run/output.
                    row['name'] = f"({G.order()},{G.size()}) graph #{total_graphs}"
            
            row['vertices'] = G.order()
            row['edges'] = G.size()
            
            try:
                row['chromatic_number'] = G.chromatic_number()
            except Exception:
                row['chromatic_number'] = None
            
            if images:
                image_filename = f"graph_{img_counter}.png"
                image_path = os.path.join(images_dir, image_filename)
                try:
                    G.plot().save(image_path)
                    # Use absolute URL for image path in CSV
                    base_url = "https://raw.githubusercontent.com/mschachner/leaper/main/results/"
                    row['image_path'] = f"{base_url}images/{image_filename}"
                except Exception:
                    row['image_path'] = None
                img_counter += 1
            
            for n in range(1, max_degree + 1):
                try:
                    lg = leap_n(G, n)
                    row[f'leap_{n}_structure'] = lg.structure_description()
                    row[f'leap_{n}_order'] = lg.order()
                except Exception:
                    print(f"Error computing leap_{n} group for {G.name()}")
                    row[f'leap_{n}_structure'] = None
                    row[f'leap_{n}_order'] = None
                    
            data.append(row)
            
    csv_path = os.path.join(output_dir, 'leap_groups.csv')
    pd.DataFrame(data).to_csv(csv_path, index=False)

def extending_hops(G, h):
    """
    Given a graph ``G`` and a partial permutation ``h`` on the vertices of ``G``, return the extending hops on ``G`` that extend ``h``.

    ``h`` is indexed like the hops: ``h[i]`` is the image (in {1, ..., n}) of
    the ``i``-th vertex, or None if it is unconstrained.
    """
    for p in hops(G):
        if all(h[i] is None or p[i] == h[i] for i in range(len(p))):
            yield p

def hop_edges(G):
    """
    Return the set of edges ``(v, w)`` of ``G`` that are used by some hop,
    i.e. some hop sends ``v`` to ``w`` (or, if ``G`` is undirected, ``w`` to
    ``v``).
    """
    verts, adj = _adjacency(G)
    moved = set()
    for p in hopsearch.iter_hops(adj):
        moved.update(enumerate(p))
    used = set()
    index = {v: i for i, v in enumerate(verts)}
    for v, w in G.edges(labels=False):
        i, j = index[v], index[w]
        if (i, j) in moved or (not G.is_directed() and (j, i) in moved):
            used.add((v, w))
    return used

def is_leap_minimal(G):
    """
    Return True if every edge of ``G`` gets used in a hop.
    """
    return len(hop_edges(G)) == G.size()

def leap_minimal_core(G):
    """
    Delete all edges of ``G`` that are not used in a hop.
    """
    return G.subgraph(edges=list(hop_edges(G)))
