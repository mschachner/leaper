import { useCallback, useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';


let nextNodeId = 0;


function App() {
  const cyRef = useRef(null);       // reference to the Cytoscape instance
  const containerRef = useRef(null); // reference to the HTML div
  const [mode, setMode] = useState('select');
  const [edgeSource, setEdgeSource] = useState(null);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const saveSnapshot = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    undoStack.current.push(cy.json().elements);
    redoStack.current = [];
  }, []);

  const undo = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || undoStack.current.length === 0) return;

    redoStack.current.push(cy.json().elements);
    const prev = undoStack.current.pop();
    cy.json({ elements: prev });
  }, []);

  const redo = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || redoStack.current.length === 0) return;

    undoStack.current.push(cy.json().elements);
    const next = redoStack.current.pop();
    cy.json({ elements: next });
  }, []);

  const relabelNodes = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const nodes = cy.nodes();
    const edges = cy.edges();

    // Cytoscape element ids are immutable; build oldId -> newId and rebuild graph
    const idMap = {};
    let nextNewId = 0;
    nodes.forEach((n) => {
      idMap[n.id()] = String(nextNewId++);
    });

    const nodeData = nodes.map((n) => ({
      newId: idMap[n.id()],
      position: n.position(),
    }));
    const edgeData = edges.map((e) => ({
      source: idMap[e.data('source')],
      target: idMap[e.data('target')],
    }));

    cy.elements().remove();

    nodeData.forEach(({ newId, position }) => {
      cy.add({
        group: 'nodes',
        data: { id: newId },
        position: { x: position.x, y: position.y },
      });
    });
    edgeData.forEach(({ source, target }) => {
      cy.add({
        group: 'edges',
        data: { source, target },
      });
    });

    nextNodeId = nextNewId;
    console.log(`Relabeled. Nodes are now ${cy.nodes().map((n) => n.id()).join(', ')}`);
  }, []);

  useEffect(() => {
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(id)',
            'text-valign': 'center',
            'background-color': '#4a90d9',
            'color': '#fff',
            'text-outline-color': '#4a90d9',
            'text-outline-width': 2,
            'width': 30,
            'height': 30,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#e74c3c',
            'text-outline-color': '#e74c3c',
          },
        },
        {
          selector: 'node.edge-source',
          style: {
            'background-color': '#f39c12',
            'text-outline-color': '#f39c12',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#999',
            'curve-style': 'bezier',
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#e74c3c',
            'width': 3,
          },
        },
      ],
      layout: { name: 'preset' },
    });

    cyRef.current = cy;
    return () => cy.destroy()
  }, []);

  const handleTap = useCallback((evt) => {
    const cy = cyRef.current;
    if (!cy) return;

    if (mode === 'addVertex') {
      if (evt.target === cy) {
        const pos = evt.position;
        const id = String(nextNodeId++);
        saveSnapshot();
        cy.add({
          group: 'nodes',
          data: { id },
          position: { x: pos.x, y: pos.y },
        });
      }
    } else if (mode === 'addEdge') {
      if (evt.target !== cy && evt.target.isNode()) {
        const clickedId = evt.target.id();
        if (edgeSource === null) {
          // First click on a node.
          setEdgeSource(clickedId);
          evt.target.addClass('edge-source');
        } else if (clickedId !== edgeSource) {
          const existing = cy.edges().filter(
            (e) =>
            (e.data('source') === edgeSource && e.data().target === clickedId) ||
            (e.data('target') === edgeSource && e.data().source === clickedId)
          );
          if (existing.length === 0) {
            saveSnapshot();
            cy.add({
              group: 'edges',
              data: { source: edgeSource, target: clickedId },
            });
          }
          cy.getElementById(edgeSource).removeClass('edge-source');
          setEdgeSource(null);
        }
      }
    }
  }, [mode, edgeSource]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.on('tap', handleTap);
    return () => cy.off('tap', handleTap);
  }, [handleTap]);

  const handleDelete = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements(':selected').remove();
    relabelNodes();
  }, [relabelNodes]);


  // Keyboard listeners
  useEffect(() => {
    const onKeyDown = (evt) => {
      if (evt.key === 'Delete' || evt.key === 'Backspace') {
        saveSnapshot();
        handleDelete();
      }

      if ((evt.metaKey || evt.ctrlKey) && evt.key === 'z' && !evt.shiftKey) {
        evt.preventDefault();
        undo();
        relabelNodes();
      }

      if ((evt.metaKey || evt.ctrlKey) && evt.key === 'z' && evt.shiftKey) {
        evt.preventDefault();
        redo();
        relabelNodes();
      }
      
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDelete, saveSnapshot, undo, redo, relabelNodes]);

  // Toolbar.

  const buttonStyle = (m) => ({
    padding: '8px 16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    background: mode === m ? '#4a90d9' : '#fff',
    color: mode === m ? '#fff' : '#333',
    cursor: 'pointer',
    fontWeight: mode === m ? 'bold' : 'normal',
  });

  const getGraphData = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return [];

    const vertices = cy.nodes().map((n) => parseInt(n.id(), 10));
    const edges = cy.edges().map((e) => [
      parseInt(e.data('source'), 10),
      parseInt(e.data('target'), 10),
    ]);

    return { vertices, edges };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ padding: '8px 12px', display: 'flex', gap: '8px', borderBottom: '1px solid #ddd' }}>

        {/* Mode buttons */}
        <button style={buttonStyle('select')} onClick={() => { setMode('select'); setEdgeSource(null); }}>Select</button>
        <button style={buttonStyle('addVertex')} onClick={() => setMode('addVertex')}>Add vertex</button>
        <button style={buttonStyle('addEdge')} onClick={() => setMode('addEdge')}>Add edge</button>
        <button style={buttonStyle('delete')} onClick={handleDelete}>Delete</button>

        {/* Layout selector */}

        <select style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value && cyRef.current) {
              cyRef.current.layout({ name: e.target.value, animate: true }).run();
              e.target.value = '';
            }
          }}
      >
        <option value="" disabled>Layout...</option>
        <option value="circle">Circle</option>
        <option value="grid">Grid</option>
        <option value="breadthfirst">Tree</option>
        <option value="cose">Force-Directed</option>
      </select>

      {/* Compute leap group button */}

      <button style={{ ...buttonStyle('compute'), background: '#27ae60', color: '#fff', borderColor: '#27ae60', marginLeft: 'auto'}}
        onClick={async () => {
          const graphData = getGraphData();
          if (!graphData || graphData.vertices.length === 0) {
            alert('Please add at least one vertex.');
            return;
          }
          console.log(`Sending graph data:`, graphData);
          try {
            const resp = await fetch('http://localhost:8000/leap-group', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                vertices: graphData.vertices,
                edges: graphData.edges,
              }),
            });
            const result = await resp.json();
            alert(`Leap group: ${result.structure}\nOrder: ${result.order}`);
          } catch (error) {
            alert(`Error: ${error.message}\n\nIs the backend running?`);
          }
        }}
      >
        Compute leap group
      </button>
      </div>

      {/* Graph canvas */}
      <div ref={containerRef} style={{ flex: 1}} />
      </div>
  );
}

export default App;