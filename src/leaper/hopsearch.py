r"""
Hop enumeration and leap-group generators in pure Python (no Sage needed).

A graph is given by its *adjacency*: a list ``adj`` where ``adj[v]`` is the
sorted list of vertices that ``v`` may hop to (its neighbors, or its
out-neighbors in a directed graph). Vertices are ``0, ..., n-1``. A hop is
returned as a tuple ``p`` with ``p[v]`` the image of ``v``.
"""
from itertools import islice
from math import factorial


def adjacency(n, edges, directed=False):
    """
    Return the adjacency of the graph on ``0, ..., n-1`` with the given edges.
    """
    nbrs = [set() for _ in range(n)]
    for u, v in edges:
        nbrs[u].add(v)
        if not directed:
            nbrs[v].add(u)
    return [sorted(s) for s in nbrs]


def is_hop(adj, p):
    """
    Return True if ``p`` is a hop: a permutation of the vertices sending every
    vertex to one of its neighbors.
    """
    n = len(adj)
    if len(p) != n or sorted(p) != list(range(n)):
        return False
    return all(p[v] in adj[v] for v in range(n))


def find_hop(adj, rng=None):
    """
    Return some hop of the graph, or None if it has none.

    A hop is a perfect matching between the vertices (as sources) and the
    vertices (as targets), so one can be found by bipartite matching in
    polynomial time, however large the graph. With ``rng`` (a
    ``random.Random``), the vertices and their neighbors are tried in a
    shuffled order, which gives a different hop from call to call.
    """
    n = len(adj)
    order = list(range(n))
    choices = adj
    if rng is not None:
        rng.shuffle(order)
        choices = [rng.sample(a, len(a)) for a in adj]
    source_of = [-1] * n

    def augment(s, seen):
        for t in choices[s]:
            if not seen[t]:
                seen[t] = True
                if source_of[t] == -1 or augment(source_of[t], seen):
                    source_of[t] = s
                    return True
        return False

    for s in order:
        if not augment(s, [False] * n):
            return None
    p = [0] * n
    for t, s in enumerate(source_of):
        p[s] = t
    return tuple(p)


def has_hop(adj):
    """
    Return True if the graph has at least one hop.
    """
    return find_hop(adj) is not None


def iter_hops(adj):
    """
    Generate the hops of the graph in lexicographic order.

    Vertices are assigned images in the order ``0, 1, ..., n-1``. After each
    assignment the search checks the vertices it just constrained: a later
    vertex that lost its last free neighbor, or a free target that lost its
    last unassigned source, ends that branch immediately.
    """
    n = len(adj)
    if n == 0:
        yield ()
        return
    if not has_hop(adj):
        return

    out = [sum(1 << t for t in adj[s]) for s in range(n)]
    into = [0] * n
    for s in range(n):
        for t in adj[s]:
            into[t] |= 1 << s
    full = (1 << n) - 1
    # later[i]: the sources that are still unassigned once 0..i have images.
    later = [full >> (i + 1) << (i + 1) for i in range(n)]

    perm = [0] * n
    candidates = [0] * n   # untried targets at each level, as a bitmask
    used_at = [0] * n      # targets in use before level i chooses
    last = n - 1

    i = 0
    used_at[0] = 0
    candidates[0] = out[0]
    while i >= 0:
        c = candidates[i]
        if not c:
            i -= 1
            continue
        low = c & -c
        candidates[i] = c ^ low
        used = used_at[i] | low
        perm[i] = low.bit_length() - 1
        if i == last:
            yield tuple(perm)
            continue

        free = full & ~used
        rest = later[i]
        ok = True
        # Later sources that could have used this target.
        m = into[perm[i]] & rest
        while m:
            b = m & -m
            if not out[b.bit_length() - 1] & free:
                ok = False
                break
            m ^= b
        if ok:
            # Free targets that vertex i could have supplied.
            m = out[i] & free
            while m:
                b = m & -m
                if not into[b.bit_length() - 1] & rest:
                    ok = False
                    break
                m ^= b
        if not ok:
            continue

        i += 1
        used_at[i] = used
        candidates[i] = out[i] & free


def first_hop(adj):
    """
    Return the lexicographically first hop of the graph, or None.
    """
    return next(iter_hops(adj), None)


def order_bound(adj, n=1):
    r"""
    Return an upper bound on the order of the ``n``-th leap group.

    A hop sends every vertex to a neighbor, so it preserves each connected
    component, and in a bipartite component it exchanges the two sides. A
    product of ``n`` hops therefore preserves the sides of every bipartite
    component if ``n`` is even, and exchanges them in every bipartite
    component at once if ``n`` is odd. The group of all permutations with
    this property has order

        `\prod_{C \text{ not bipartite}} |C|! \cdot
         \prod_{C \text{ bipartite}} |X_C|! \, |Y_C|! \cdot \varepsilon`,

    where `\varepsilon = 2` if ``n`` is odd and some component is bipartite
    with more than one vertex, and `\varepsilon = 1` otherwise.

    Direction is ignored: components and sides are those of the underlying
    undirected graph.
    """
    N = len(adj)
    nbrs = [set(a) for a in adj]
    for v in range(N):
        for w in adj[v]:
            nbrs[w].add(v)
    side = [None] * N
    bound = 1
    swap = False
    for root in range(N):
        if side[root] is not None:
            continue
        side[root] = 0
        component = [root]
        bipartite = True
        for v in component:
            for w in nbrs[v]:
                if side[w] is None:
                    side[w] = 1 - side[v]
                    component.append(w)
                elif side[w] == side[v]:
                    bipartite = False
        if bipartite:
            x = sum(1 for v in component if side[v] == 0)
            bound *= factorial(x) * factorial(len(component) - x)
            swap = swap or len(component) > 1
        else:
            bound *= factorial(len(component))
    if swap and n % 2 == 1:
        bound *= 2
    return bound


def hops(adj, limit=None):
    """
    Return the list of hops of the graph, in lexicographic order. With
    ``limit``, return at most that many.
    """
    return list(islice(iter_hops(adj), limit))


# Permutations as tuples.

def compose(p, q):
    """
    Return the permutation "first ``p``, then ``q``".
    """
    return tuple(q[x] for x in p)


def inverse(p):
    inv = [0] * len(p)
    for i, x in enumerate(p):
        inv[x] = i
    return tuple(inv)


def leap_generator_map(h0, n=1):
    r"""
    Return ``(base, expand)`` describing a generating set for the ``n``-th
    leap group, which is the group generated by all products of ``n`` hops:
    ``base`` is a list of generators, and ``expand(a)`` is the list of
    generators contributed by the hop ``a``. The generating set is ``base``
    together with ``expand(a)`` for every hop ``a``. ``h0`` is any one hop.

    For ``n = 1`` these are the hops themselves. For ``n > 1`` there are
    `|H|^n` products of ``n`` hops, but far fewer are needed. A product
    `a_1 a_2 \cdots a_n` equals

        `h_0^n \cdot \prod_{i=1}^{n} h_0^{-(n-i)-1} a_i h_0^{n-i}`,

    and each factor `h_0^{-k-1} a h_0^{k}` (`0 \le k < n`) is itself a
    quotient of two products of ``n`` hops:
    `(h_0^n)^{-1} \cdot h_0^{n-1-k} a h_0^{k}`. So the group is generated by
    `h_0^n` together with `h_0^{-k-1} a h_0^{k}` for all hops `a` and
    `0 \le k < n`: that is `n|H| + 1` generators.
    """
    if n == 1:
        return [], lambda a: [a]
    identity = tuple(range(len(h0)))
    powers = [identity]                 # powers[k] = h0^k
    for _ in range(n):
        powers.append(compose(powers[-1], h0))
    h0_inv = inverse(h0)
    inv_powers = [h0_inv]               # inv_powers[k] = h0^-(k+1)
    for _ in range(n - 1):
        inv_powers.append(compose(inv_powers[-1], h0_inv))

    def expand(a):
        return [compose(compose(inv_powers[k], a), powers[k]) for k in range(n)]

    return [powers[n]], expand


def leap_generators(hop_list, n=1):
    """
    Return a generating set for the ``n``-th leap group of a graph with the
    given hops (see ``leap_generator_map``), as a list.
    """
    hop_list = list(hop_list)
    if not hop_list:
        return []
    base, expand = leap_generator_map(hop_list[0], n)
    return base + [g for a in hop_list for g in expand(a)]
