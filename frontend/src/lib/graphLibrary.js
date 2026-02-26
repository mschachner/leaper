import {
  makeComplete,
  makeCycle,
  makeDirectedCycle,
  makePath,
  makeGrid,
  makeCompleteBipartite,
  makePetersen,
  makeCube,
  makePrism,
  makeMobiusKantor,
  makePappus,
  makeHeawood,
} from './graphGenerators';

/**
 * Build a library entry from a generator result.
 */
function entry(name, family, tags, gen, options = {}) {
  return {
    name,
    family,
    tags,
    ...gen,
    ...options,
  };
}

const graphLibrary = [
  // --- Complete graphs ---
  entry('K3 (Triangle)',  'Complete', ['complete'], makeComplete(3)),
  entry('K4',             'Complete', ['complete'], makeComplete(4)),
  entry('K5',             'Complete', ['complete'], makeComplete(5)),
  entry('K6',             'Complete', ['complete'], makeComplete(6)),
  entry('K7',             'Complete', ['complete'], makeComplete(7)),
  entry('K8',             'Complete', ['complete'], makeComplete(8)),

  // --- Cycles ---
  entry('C3 (Triangle)',  'Cycles', ['cycle'], makeCycle(3)),
  entry('C4 (Square)',    'Cycles', ['cycle'], makeCycle(4)),
  entry('C5 (Pentagon)',  'Cycles', ['cycle'], makeCycle(5)),
  entry('C6 (Hexagon)',   'Cycles', ['cycle'], makeCycle(6)),
  entry('C7 (Heptagon)',  'Cycles', ['cycle'], makeCycle(7)),
  entry('C8 (Octagon)',   'Cycles', ['cycle'], makeCycle(8)),
  entry('C9',             'Cycles', ['cycle'], makeCycle(9)),
  entry('C10',            'Cycles', ['cycle'], makeCycle(10)),

  // --- Paths ---
  entry('P2',  'Paths', ['path'], makePath(2)),
  entry('P3',  'Paths', ['path'], makePath(3)),
  entry('P4',  'Paths', ['path'], makePath(4)),
  entry('P5',  'Paths', ['path'], makePath(5)),
  entry('P6',  'Paths', ['path'], makePath(6)),
  entry('P7',  'Paths', ['path'], makePath(7)),
  entry('P8',  'Paths', ['path'], makePath(8)),

  // --- Grid graphs ---
  entry('2×2 Grid',  'Grids', ['grid'], makeGrid(2, 2)),
  entry('2×3 Grid',  'Grids', ['grid'], makeGrid(2, 3)),
  entry('2×4 Grid',  'Grids', ['grid'], makeGrid(2, 4)),
  entry('3×3 Grid',  'Grids', ['grid'], makeGrid(3, 3)),
  entry('3×4 Grid',  'Grids', ['grid'], makeGrid(3, 4)),
  entry('4×4 Grid',  'Grids', ['grid'], makeGrid(4, 4)),

  // --- Complete bipartite ---
  entry('K1,1',  'Bipartite', ['complete bipartite'], makeCompleteBipartite(1, 1)),
  entry('K1,2',  'Bipartite', ['complete bipartite'], makeCompleteBipartite(1, 2)),
  entry('K1,3',  'Bipartite', ['complete bipartite'], makeCompleteBipartite(1, 3)),
  entry('K1,4',  'Bipartite', ['complete bipartite'], makeCompleteBipartite(1, 4)),
  entry('K1,5',  'Bipartite', ['complete bipartite'], makeCompleteBipartite(1, 5)),
  entry('K2,2',  'Bipartite', ['complete bipartite'], makeCompleteBipartite(2, 2)),
  entry('K2,3',  'Bipartite', ['complete bipartite'], makeCompleteBipartite(2, 3)),
  entry('K2,4',  'Bipartite', ['complete bipartite'], makeCompleteBipartite(2, 4)),
  entry('K3,3',  'Bipartite', ['complete bipartite'], makeCompleteBipartite(3, 3)),

  // --- Famous graphs ---
  entry('Petersen',       'Famous', ['famous'], makePetersen()),
  entry('Cube (Q3)',      'Famous', ['famous', 'hypercube'], makeCube()),
  entry('Prism',          'Famous', ['famous'], makePrism()),
  entry('Möbius–Kantor',  'Famous', ['famous'], makeMobiusKantor()),
  entry('Pappus',         'Famous', ['famous'], makePappus()),
  entry('Heawood',        'Famous', ['famous'], makeHeawood()),

  // --- Directed cycles ---
  entry('DC3',  'Cycles', ['cycle', 'directed'], makeDirectedCycle(3), { directed: true }),
  entry('DC4',  'Cycles', ['cycle', 'directed'], makeDirectedCycle(4), { directed: true }),
  entry('DC5',  'Cycles', ['cycle', 'directed'], makeDirectedCycle(5), { directed: true }),
  entry('DC6',  'Cycles', ['cycle', 'directed'], makeDirectedCycle(6), { directed: true }),
  entry('DC7',  'Cycles', ['cycle', 'directed'], makeDirectedCycle(7), { directed: true }),
  entry('DC8',  'Cycles', ['cycle', 'directed'], makeDirectedCycle(8), { directed: true }),
];

export default graphLibrary;