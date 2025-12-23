r"""
Utilities for calculating leap groups.

EXAMPLES::

    sage: from leaper.leaper import leap_group
    sage: 

"""
from sage.all import *
from sage.graphs.all import graphs
import pandas as pd  # type: ignore
from sage.graphs.digraph_generators import DiGraphGenerators
DiGraphs = DiGraphGenerators()


def is_hop(G, p):
    """
    Return True if the permutation ``p`` is a hop on the graph ``G``.
    """
    return all(p[v] in G.neighbors(v) for v in G.vertices())

def hops(G):
    """
    Return a list of all the hops on the graph ``G`` as standard permutations
    of {1, ..., n}, where n = |V(G)|.
    """
    verts = sorted(G.vertices())
    v_to_i = {v: i + 1 for i, v in enumerate(verts)}

    hop_perms = []
    for p in Permutations(verts):  # combinatorial permutations on the actual vertices
        if is_hop(G, p):
            # convert to one-line notation on {1,...,n}
            images = [v_to_i[p[v]] for v in verts]
            hop_perms.append(Permutation(images))  # standard permutation
    return hop_perms

def compositions(h, n):
    """
    Given a list of permutations, return the compositions of the permutations of length ``n``.
    """
    if n == 1:
        return h
    else:
        return [p * q for p in h for q in compositions(h, n-1)]

def leap_n(G, n):
    """
    Return the nth leap group of the graph ``G``.
    """
    h = hops(G)
    hn = compositions(h, n)
    return PermutationGroup(hn)

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
                    row['image_path'] = os.path.join('images', image_filename)
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
