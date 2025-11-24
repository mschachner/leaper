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
    print(f"Checking if {p} is a hop on {G.name()}")
    return all(p(i) in G.neighbors(p(i)) for i in range(G.order()))

def hops(G):
    """
    Return a list of all the hops on the graph ``G``.
    """
    return [p for p in Permutations(G.order()) if is_hop(G, p)]

def compositions(h, n):
    """
    Given a list of permutations, return the compositions of the permutations of length ``n``.
    """
    if n == 0:
        return [Permutation()]
    else:
        return [p * q for p in h for q in compositions(h, n-1)]

def leap_n(G, n):
    """
    Return the nth leap group of the graph ``G``.

    EXAMPLES::

        
    """
    print(f"Computing leap_{n} group for {G.name()}")
    h = hops(G)
    print(f"Hops: {h}")
    hn = compositions(h, n)
    print(f"Compositions: {hn}")
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

def compute_leap_groups(max_vertices, directed=False, max_degree=2, images=False):
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
    
    Outputs as a csv. If ``images`` is True, then the images are saved as png files in a directory called 'images', and the path to the respective image is added to the csv.
    """
    import os
    
    data = []
    
    if images and not os.path.exists('images'):
        os.makedirs('images')
        
    img_counter = 0
    
    for v in range(1, max_vertices + 1):
        if directed:
            gen = DiGraphs(v)
        else:
            gen = graphs.nauty_geng(str(v))
        print(f"Generated {len(gen)} graphs")
        print(f"Graphs: {gen}")
        for G in gen:
            row = {}
            # Use graph6/dig6 string as name if not named (common for generated graphs)
            name = G.name()
            if not name:
                name = G.dig6_string() if directed else G.graph6_string()
            row['name'] = name
            
            row['vertices'] = G.order()
            row['edges'] = G.size()
            
            try:
                row['chromatic_number'] = G.chromatic_number()
            except Exception:
                row['chromatic_number'] = None
            
            if images:
                image_path = os.path.join('images', f"graph_{img_counter}.png")
                try:
                    G.plot().save(image_path)
                    row['image_path'] = image_path
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
            
    pd.DataFrame(data).to_csv('leap_groups.csv', index=False)
