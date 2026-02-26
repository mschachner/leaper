/**
 * Graph generator functions for the library.
 * Each returns { vertices: [{ id, x, y }], edges: [{ source, target }]}.
 * 
 */

// Helpers.

/**
 * Place n vertices in a regular polygon with a given center and radius.
 * Vertex 0 at 12 o'clock.
 */

function polygonLayout(n, cx = 150, cy = 150, r = 120) {
    const vertices = [];
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        vertices.push({
            id: i,
            x: Math.round(cx + r * Math.cos(angle)),
            y: Math.round(cy + r * Math.sin(angle)),
        });
    }
    return vertices;
}

/**
 * Place n vertices in a horizontal line, evenly spaced.
 */

function lineLayout(n, y = 150, xStart = 30, xEnd = 270) {
    const vertices = [];
    const step = n > 1 ? (xEnd - xStart) / (n-1) : 0;
    for (let i = 0; i < n; i++) {
        vertices.push({
            id: i,
            x: Math.round(xStart + i * step),
            y,
        });
    }
    return vertices;
}

/**
 * Place vertices in a grid layout with m rows and n columns.
 */

function gridLayout(m,n, xStart = 30, yStart = 30, xEnd = 270, yEnd = 270) {
    const vertices = [];
    const xStep = n > 1 ? (xEnd - xStart) / (n-1) : 0;
    const yStep = m > 1 ? (yEnd - yStart) / (m-1) : 0;
    let id = 0;
    for (let row = 0; row < m; row++) {
        for (let col = 0; col < n; col++) {
            vertices.push({
                id: id++,
                x: Math.round(xStart + col * xStep),
                y: Math.round(yStart + row * yStep),
            });
        }
    }
    return vertices;
}

/**
 * Place vertices in two horizontal rows for bipartite graphs.
 * Top row has m vertices, bottom row has n vertices.
 */

function bipartiteLayout(m, n, yTop = 60, yBottom = 240, xStart = 30, xEnd = 270) {
    const vertices = [];
    let id = 0;

    // Top row
    const topStep = m > 1 ? (xEnd - xStart) / (m-1) : 0;
    const topOffset = m === 1 ? (xEnd - xStart) / 2 : 0;
    for (let i = 0; i < m; i++) {
        vertices.push({
            id: id++,
            x: Math.round(xStart + topOffset + i*topStep),
            y: yTop,
        });
    }

    // Bottom row
    const botStep = n > 1 ? (xEnd - xStart) / (n-1) : 0;
    const botOffset = n === 1 ? (xEnd - xStart) / 2 : 0;
    for (let i = 0; i < n; i++) {
        vertices.push({
            id: id++,
            x: Math.round(xStart + botOffset + i*botStep),
            y: yBottom,
        });
    }
    return vertices;
}

// Generators

/**
 * Complete graph Kn: every pair of vertices is connected.
 */
export function makeComplete(n) {
    const vertices = polygonLayout(n);
    const edges = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        edges.push({ source: i, target: j });
      }
    }
    return { vertices, edges };
  }
  
  /**
   * Cycle graph Cn: vertices in a ring, each connected to its neighbors.
   */
  export function makeCycle(n) {
    const vertices = polygonLayout(n);
    const edges = [];
    for (let i = 0; i < n; i++) {
      edges.push({ source: i, target: (i + 1) % n });
    }
    return { vertices, edges };
  }
  
  /**
   * Directed cycle DCn: like Cn but edges go one way around the ring.
   */
  export function makeDirectedCycle(n) {
    // Same as makeCycle — the directedness is handled by the `directed` flag on the entry
    return makeCycle(n);
  }
  
  /**
   * Path graph Pn: n vertices in a line, each connected to the next.
   */
  export function makePath(n) {
    const vertices = lineLayout(n);
    const edges = [];
    for (let i = 0; i < n - 1; i++) {
      edges.push({ source: i, target: i + 1 });
    }
    return { vertices, edges };
  }
  
  /**
   * Grid graph (m × n): vertices in a grid, connected to horizontal and vertical neighbors.
   */
  export function makeGrid(m, n) {
    const vertices = gridLayout(m, n);
    const edges = [];
    for (let row = 0; row < m; row++) {
      for (let col = 0; col < n; col++) {
        const id = row * n + col;
        // Right neighbor
        if (col < n - 1) {
          edges.push({ source: id, target: id + 1 });
        }
        // Bottom neighbor
        if (row < m - 1) {
          edges.push({ source: id, target: id + n });
        }
      }
    }
    return { vertices, edges };
  }
  
  /**
   * Complete bipartite graph Km,n: two groups, every vertex in one group
   * connected to every vertex in the other.
   */
  export function makeCompleteBipartite(m, n) {
    const vertices = bipartiteLayout(m, n);
    const edges = [];
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        edges.push({ source: i, target: m + j });
      }
    }
    return { vertices, edges };
  }
  
  /**
   * Petersen graph: the classic 3-regular graph on 10 vertices.
   * Outer pentagon (0–4) + inner pentagram (5–9).
   */
  export function makePetersen() {
    const outer = polygonLayout(5, 150, 150, 120);
    const inner = polygonLayout(5, 150, 150, 55);
    // Shift inner IDs to 5–9
    const innerShifted = inner.map((v, i) => ({ ...v, id: i + 5 }));
    const vertices = [...outer, ...innerShifted];
  
    const edges = [
      // Outer cycle
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
      { source: 3, target: 4 },
      { source: 4, target: 0 },
      // Inner pentagram (skip-1 connections)
      { source: 5, target: 7 },
      { source: 7, target: 9 },
      { source: 9, target: 6 },
      { source: 6, target: 8 },
      { source: 8, target: 5 },
      // Spokes
      { source: 0, target: 5 },
      { source: 1, target: 6 },
      { source: 2, target: 7 },
      { source: 3, target: 8 },
      { source: 4, target: 9 },
    ];
  
    return { vertices, edges };
  }
  
  /**
   * Cube graph Q3: vertices of a 3-dimensional cube.
   */
  export function makeCube() {
    const offset = 40;
    const size = 140;
    const vertices = [
      // Front face
      { id: 0, x: offset,        y: offset },
      { id: 1, x: offset + size, y: offset },
      { id: 2, x: offset + size, y: offset + size },
      { id: 3, x: offset,        y: offset + size },
      // Back face (shifted right and down for 3D effect)
      { id: 4, x: offset + 70,        y: offset + 70 },
      { id: 5, x: offset + 70 + size, y: offset + 70 },
      { id: 6, x: offset + 70 + size, y: offset + 70 + size },
      { id: 7, x: offset + 70,        y: offset + 70 + size },
    ];
  
    const edges = [
      // Front face
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
      { source: 3, target: 0 },
      // Back face
      { source: 4, target: 5 },
      { source: 5, target: 6 },
      { source: 6, target: 7 },
      { source: 7, target: 4 },
      // Connecting edges
      { source: 0, target: 4 },
      { source: 1, target: 5 },
      { source: 2, target: 6 },
      { source: 3, target: 7 },
    ];
  
    return { vertices, edges };
  }
  
  /**
   * Triangular prism: two triangles connected by three edges.
   */
  export function makePrism() {
    const top = polygonLayout(3, 150, 80, 80);
    const bottom = polygonLayout(3, 150, 220, 80).map((v, i) => ({ ...v, id: i + 3 }));
    const vertices = [...top, ...bottom];
  
    const edges = [
      // Top triangle
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 0 },
      // Bottom triangle
      { source: 3, target: 4 },
      { source: 4, target: 5 },
      { source: 5, target: 3 },
      // Connecting edges
      { source: 0, target: 3 },
      { source: 1, target: 4 },
      { source: 2, target: 5 },
    ];
  
    return { vertices, edges };
  }
  
  /**
   * Möbius–Kantor graph: the Levi graph of the Möbius–Kantor configuration.
   * 8-cage, a bipartite 3-regular graph on 16 vertices.
   */
  export function makeMobiusKantor() {
    const outer = polygonLayout(8, 150, 150, 130);
    const inner = polygonLayout(8, 150, 150, 60);
    const innerShifted = inner.map((v, i) => ({ ...v, id: i + 8 }));
    const vertices = [...outer, ...innerShifted];
  
    const edges = [
      // Outer cycle
      ...Array.from({ length: 8 }, (_, i) => ({ source: i, target: (i + 1) % 8 })),
      // Inner star (connect every 3rd)
      ...Array.from({ length: 8 }, (_, i) => ({ source: i + 8, target: ((i + 3) % 8) + 8 })),
      // Spokes
      ...Array.from({ length: 8 }, (_, i) => ({ source: i, target: i + 8 })),
    ];
  
    return { vertices, edges };
  }
  
  /**
   * Pappus graph: a bipartite 3-regular graph on 18 vertices.
   */
  export function makePappus() {
    const outer = polygonLayout(9, 150, 150, 130);
    const inner = polygonLayout(9, 150, 150, 60);
    const innerShifted = inner.map((v, i) => ({ ...v, id: i + 9 }));
    const vertices = [...outer, ...innerShifted];
  
    const edges = [
      // Outer cycle
      ...Array.from({ length: 9 }, (_, i) => ({ source: i, target: (i + 1) % 9 })),
      // Inner connections (each inner vertex connects to the one 4 steps ahead)
      ...Array.from({ length: 9 }, (_, i) => ({ source: i + 9, target: ((i + 4) % 9) + 9 })),
      // Spokes
      ...Array.from({ length: 9 }, (_, i) => ({ source: i, target: i + 9 })),
    ];
  
    return { vertices, edges };
  }
  
  /**
   * Heawood graph: the Levi graph of the Fano plane.
   * A bipartite 3-regular graph on 14 vertices.
   */
  export function makeHeawood() {
    const outer = polygonLayout(7, 150, 150, 130);
    const inner = polygonLayout(7, 150, 150, 60);
    const innerShifted = inner.map((v, i) => ({ ...v, id: i + 7 }));
    const vertices = [...outer, ...innerShifted];
  
    const edges = [
      // Outer cycle
      ...Array.from({ length: 7 }, (_, i) => ({ source: i, target: (i + 1) % 7 })),
      // Inner star (connect every 2nd)
      ...Array.from({ length: 7 }, (_, i) => ({ source: i + 7, target: ((i + 2) % 7) + 7 })),
      // Spokes
      ...Array.from({ length: 7 }, (_, i) => ({ source: i, target: i + 7 })),
    ];
  
    return { vertices, edges };
  }