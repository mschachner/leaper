import { useCallback, useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { serializeGraph, deserializeGraph, validateGraphData } from './graphFile';
import { saveAs, save, openFile, clearFileHandle } from './fileAccess';

import ControlPanel from './ControlPanel';
import GraphLibraryModal from './graphLibraryModal';


let nextNodeId = 0;


function App() {
  const cyRef = useRef(null);       // reference to the Cytoscape instance
  const containerRef = useRef(null); // reference to the HTML div
  const [mode, setMode] = useState('select');
  const [edgeSource, setEdgeSource] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

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

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const markDirty = () => setIsDirty(true);
    cy.on('add remove position', markDirty);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

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

  const handleSave = useCallback(async () => {
    const cy = cyRef.current;
    if (!cy) return;

    const graphData = serializeGraph(cy, fileName || 'Untitled');
    const json = JSON.stringify(graphData, null, 2);
    const name = await save(json);
    setFileName(name);
    setIsDirty(false);
  }, [fileName])

  const handleSaveAs = useCallback(async () => {
    const cy = cyRef.current;
    if (!cy) return;

    const graphData = serializeGraph(cy, fileName || 'Untitled');
    const json = JSON.stringify(graphData, null, 2);
    const name = await saveAs(json);
    setFileName(name);
    setIsDirty(false);
  }, [fileName])

  const handleOpen = useCallback(async () => {
    const confirmMsg = 'You have unsaved changes. Open a different graph anyway?';
    if (isDirty && !window.confirm(confirmMsg)) {
      return;
    }
    const cy = cyRef.current;
    if (!cy) return;

    const { data, name } = await openFile();

    const error = validateGraphData(data);
    if (error) {
      alert(`Couldn't load ${name}: ${error}`);
      return;
    }

    deserializeGraph(cy,data);
    const maxId = Math.max(-1, ...data.vertices.map((v) => v.id));
    nextNodeId = maxId + 1;


    setFileName(name);
    setIsDirty(false);
  }, [isDirty])

  const handleNew = useCallback(() => {
    const confirmMsg = 'You have unsaved changes. Start a new graph anyway?';
    if (isDirty && !window.confirm(confirmMsg)) {
      return;
    }
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().remove();
    clearFileHandle();
    setFileName(null);
    setIsDirty(false);
    nextNodeId = 0;
  }, [isDirty]);

  const handleLoadFromLibrary = useCallback((graph) => {
    const confirmMsg = 'You have unsaved changes. Load a library graph anyway?'
    if (isDirty && !window.confirm(confirmMsg)) return;

    const cy = cyRef.current;
    if (!cy) return;

    deserializeGraph(cy, graph);

    const maxId = Math.max(-1, ...graph.vertices.map((v) => v.id));
    nextNodeId = maxId + 1;

    clearFileHandle();
    setFileName(null);
    setIsDirty(false);
    setLibraryOpen(false);
  }, [isDirty]);

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

      if ((evt.metaKey || evt.ctrlKey) && evt.key === 's' && !evt.shiftKey) {
        evt.preventDefault();
        handleSave();
      }

      if ((evt.metaKey || evt.ctrlKey) && evt.key === 's' && evt.shiftKey) {
        evt.preventDefault();
        handleSaveAs();
      }

      if ((evt.metaKey || evt.ctrlKey) && evt.key === 'o') {
        evt.preventDefault();
        handleOpen();
      }

      if (evt.key === 'Escape' && libraryOpen) {
        setLibraryOpen(false);
      }
      
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDelete, saveSnapshot, undo, redo, relabelNodes, handleSave, handleSaveAs, handleOpen, libraryOpen, setLibraryOpen]);

  // Toolbar.

  const buttonStyleToolbar = (m) => ({
    padding: '0px 8px',
    borderRadius: '15px',
    background: mode === m ? '#4a90d9' : '#fff',
    color: mode === m ? '#fff' : '#333',
    cursor: 'pointer',
    fontWeight: mode === m ? 'bold' : 'normal',
  });

  const buttonStyleMenu = {
    padding: '0px 8px',
    borderRight: '1px solid #333',
    borderRadius: '0px',
    background: '#fff',
    color: '#333',
    cursor: 'pointer',
  }

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
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column' }}>

      {/* Menu bar */}
      <div style={{
        padding: '6px 0px',
        display: 'flex',
        alignItems: 'center',
        background: '#fff'
      }}>
        <button onClick={handleNew} style={buttonStyleMenu}>New</button>
        <button onClick={handleOpen} style={buttonStyleMenu}>Open</button>
        <button onClick={handleSave} style={buttonStyleMenu}>Save</button>
        <button onClick={handleSaveAs} style={buttonStyleMenu}>Save As</button>
        <button onClick={() => setLibraryOpen(true)} style={buttonStyleMenu}>Library</button> 
        <span style={{
          marginLeft: '12px',
          color: '#666',
          fontSize: '14px'
        }}>
          {fileName ? fileName : 'Untitled.leap'}{isDirty ? ' •' : ''}
        </span>
      </div>  
      
      {/* Toolbar */}
      <div style={{
        padding: '8px 12px',
        display: 'flex',
        background: 'transparent',
        gap: '8px',
        }}>

        {/* Mode buttons */}
        <button style={buttonStyleToolbar('select')} onClick={() => { setMode('select'); setEdgeSource(null); }}>Select</button>
        <button style={buttonStyleToolbar('addVertex')} onClick={() => setMode('addVertex')}>Vertex</button>
        <button style={buttonStyleToolbar('addEdge')} onClick={() => setMode('addEdge')}>Edge</button>
        <button style={buttonStyleToolbar('delete')} onClick={handleDelete}>Delete</button>

        {/* Layout selector */}

        <select style={{
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc' 
        }}
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
      </div>

      {/* Main area: canvas + sidebar */}

      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Graph canvas */}
        <div ref={containerRef} style={{ flex: 1}} />

        {/* Sidebar */}
        <div style={{
        width: '300px',
        borderLeft: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        background: '#fafafa',
        color: '#000',
        overflowY: 'auto',
      }}>
        <ControlPanel getGraphData={getGraphData} cyRef = {cyRef} />
        </div>
      </div>

      {libraryOpen && (
        <GraphLibraryModal
          onLoad={handleLoadFromLibrary}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  );
}

export default App;