import { useCallback, useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { serializeGraph, deserializeGraph, validateGraphData } from './graphFile';
import { saveAs, save, openFile, clearFileHandle } from './fileAccess';

import ControlPanel from './ControlPanel';
import GraphLibraryModal from './graphLibraryModal';
import NotebookEntry from './NotebookEntry';


let nextNodeId = 0;


function App() {
  const cyRef = useRef(null);       // reference to the Cytoscape instance
  const containerRef = useRef(null); // reference to the HTML div
  const isDraggingSidebar = useRef(false);

  const [mode, setMode] = useState('select');
  const [edgeSource, setEdgeSource] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [workspace, setWorkspace] = useState([]);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [snapshotView, setSnapshotView] = useState(null);
  const [selectedHop, setSelectedHop] = useState(null);
  const [labelPerm, setLabelPerm] = useState(null);



  // Undo/redo helpers
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

  // Relabeler method
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
        data: { id: newId, displayLabel: newId },
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

  // Workspace helpers
  const addWorkspaceEntry = useCallback((entry) => {
    setWorkspace((prev) => [...prev, entry]);
    setIsDirty(true);
  }, []);

  const removeWorkspaceEntry = useCallback((id) => {
    setWorkspace((prev) => prev.filter((e) => e.id !== id));
    setIsDirty(true);
  }, []);

  const clearWorkspace = useCallback(() => {
    setIsDirty(true);
    setWorkspace([]);
  }, []);

  // Sidebar resizing

  const onSidebarDragStart = useCallback((e) => {
    isDraggingSidebar.current = true;
    e.preventDefault();
  }, [])

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDraggingSidebar.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.max(275,Math.min(600,newWidth)));
    };

    const onMouseUp = () => {
      isDraggingSidebar.current = false;
    };
    
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp)
    };
  }, []);


  // Cytoscape initialization
  useEffect(() => {
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(displayLabel)',
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
          selector: 'node.hide-label',
          style: {
            'label': '',
            'text-outline-width': 0,
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
        {
          selector: '.hop-arrow',
          style: {
            'width': 2.5,
            'line-color': '#e74c3c',
            'target-arrow-color': '#e74c3c',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.2,
            'curve-style': 'bezier',
            'control-point-step-size': 40,
            'line-style': 'dashed',
            'line-dash-pattern': [6,3],
            'opacity': 0.85,
          },
        },
        {
          selector: '.hop-arrow-double',
          style: {
            'source-arrow-color': '#e74c3c',
            'source-arrow-shape': 'triangle',
          },
        },
      ],
      layout: { name: 'preset' },
      userZoomingEnabled: true,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;
    return () => cy.destroy()
  }, []);

  // Tracking dirty state
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

  // Text label hiding
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (showLabels) {
      cy.nodes().removeClass('hide-label');
     } else {
        cy.nodes().addClass('hide-label');
      }
  },[showLabels]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const onAdd = (evt) => {
      if (evt.target.isNode && evt.target.isNode() && !showLabels) {
        evt.target.addClass('hide-label');
      }
    };

    cy.on('add', onAdd);
    return () => cy.off('add', onAdd)
  }, [showLabels]);

  // Enable box selection
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (mode === 'select') {
      cy.boxSelectionEnabled(true);
      cy.userPanningEnabled(false);
      cy.autoungrabify(false);
    } else if (mode === 'pan') {
      cy.boxSelectionEnabled(false);
      cy.userPanningEnabled(true);
      cy.autoungrabify(true);
    } else {
      cy.boxSelectionEnabled(false);
      cy.userPanningEnabled(false);
      cy.autoungrabify(false);
    }
  },[mode]);

  // Manual scroll-to-zoom (Cytoscape disables wheel zoom when panning is off)
  useEffect(() => {
    const container = containerRef.current;
    const cy = cyRef.current;
    if (!container || !cy) return;

    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = 1 - e.deltaY * 0.003;
      const rect = container.getBoundingClientRect();
      const pos = cy.renderer().projectIntoViewport(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
      cy.zoom({
        level: cy.zoom() * zoomFactor,
        renderedPosition: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Make workspace scrollable
  useEffect(() => {
    const el = document.getElementById('notebook-scroll');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [workspace]);

  // Handle user actions
  const handleTap = useCallback((evt) => {
    if (snapshotView) return; // No editing snapshots!
    const cy = cyRef.current;
    if (!cy) return;

    if (mode === 'addVertex') {
      if (evt.target === cy) {
        const pos = evt.position;
        const id = String(nextNodeId++);
        saveSnapshot();
        cy.add({
          group: 'nodes',
          data: { id, displayLabel: id },
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

  // Graph snapshots for reviewing computations
  const getGraphSnapshot = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return null;

    const vertices = cy.nodes().map((n) => ({
      id: parseInt(n.id(), 10),
      x: n.position('x'),
      y: n.position('y'),
    }));
    const edges = cy.edges().map((e) => ({
      source: parseInt(e.data('source'), 10),
      target: parseInt(e.data('target'), 10),
    }));

    return { vertices, edges };
  }, []);

  const savedGraphState = useRef(null);

  const viewSnapshot = useCallback((snapshot) => {
    const cy = cyRef.current;
    if (!cy || !snapshot) return;

    // Save current graph state
    savedGraphState.current = {
      elements: cy.json().elements,
      nextNodeId: nextNodeId,
    }

    // Load snapshot
    deserializeGraph(cy, snapshot);
    setSnapshotView(snapshot);
  }, [])

  const exitSnapshotView = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || !savedGraphState.current) return;

    // Restore saved graph state
    cy.json({ elements: savedGraphState.current.elements });
    nextNodeId = savedGraphState.current.nextNodeId;
    savedGraphState.current = null;
    setSnapshotView(null);
  }, []);

  // Hop selection

  const selectHop = useCallback((hop) => {
    setSelectedHop((prev) => {
      if (prev && prev.one_line.join(',') === hop.one_line.join(',')) {
        return null;
      }
      return hop;
    })
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Remove any existing overlay arrows
    cy.elements('.hop-arrow').remove();

    if (!selectedHop) return;

    const perm = selectedHop.one_line
    const n = perm.length;

    // Track which pairs we've already drawn (for transpositions)
    const drawn = new Set();

    for (let i = 0; i < n; i++) {
      const sourceId = String(i);
      const targetId = String(perm[i]-1); // convert to 0-indexed

      if (sourceId === targetId) continue;

      // Transposition check
      const pairKey = [Math.min(i, perm[i]-1), Math.max(i, perm[i]-1)].join('.');
      if (drawn.has(pairKey)) continue;
      drawn.add(pairKey);

      const isTransposition = perm[perm[i]-1] === i+1;

      cy.add({
        group: 'edges',
        data: {
          id: `hop-arrow-${i}`,
          source: sourceId,
          target: targetId
        },
        classes: isTransposition ? 'hop-arrow hop-arrow-double' : 'hop-arrow',
      });
    }
  }, [selectedHop])

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const clearSelection = (evt) => {
      if (evt.target.hasClass && evt.target.hasClass('hop-arrow')) return;
      setSelectedHop(null);
    };
    cy.on('add remove', clearSelection);
    return () => cy.off('add remove', clearSelection);
  }, []);

  // Label permutations for performing hops

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((node) => {
      const nodeIndex = parseInt(node.id(),10);
      if (labelPerm) {
        node.data('displayLabel', String(labelPerm[nodeIndex]));
      } else {
        node.data('displayLabel', node.id());
      }
    });
  }, [labelPerm]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const onGraphChange = (evt) => {
      if (evt.target.hasClass && evt.target.hasClass('hop-arrow')) return;
      setLabelPerm(null);
      setSelectedHop(null);
    };

    cy.on('add remove', onGraphChange);
    return () => cy.off('add remove', onGraphChange);
  }, [])

  const performHop = useCallback((hop) => {
    const cy = cyRef. current;
    if (!cy) return;

    const perm = hop.one_line;
    const n = cy.nodes().length;

    // current label perm
    const current = labelPerm || Array.from({ length: n }, (_,i) => i);

    const newLabels = new Array(n);
    for (let i = 0; i<n; i++) {
      newLabels[perm[i] - 1] = current[i];
    }

    // Flash animation (hah)
    cy.nodes().addClass('hide-label');
    setTimeout(() => {
      setLabelPerm(newLabels);
      setTimeout(() => {
        if (showLabels) {
          cy.nodes().removeClass('hide-label');
        }
      }, 50);
    }, 150);

    setSelectedHop(null);
  }, [labelPerm, showLabels]);

  const resetLabels = useCallback(() => {
    setLabelPerm(null);
    setSelectedHop(null);
  }, []);


  // Save, Save As, Open, New, Load from Libary
  const handleSave = useCallback(async () => {
    const cy = cyRef.current;
    if (!cy) return;

    const graphData = serializeGraph(cy, fileName || 'Untitled', { showLabels }, workspace);
    const json = JSON.stringify(graphData, null, 2);
    const name = await save(json);
    setFileName(name);
    setIsDirty(false);
  }, [fileName, showLabels, workspace])

  const handleSaveAs = useCallback(async () => {
    const cy = cyRef.current;
    if (!cy) return;

    const graphData = serializeGraph(cy, fileName || 'Untitled', { showLabels }, workspace);
    const json = JSON.stringify(graphData, null, 2);
    const name = await saveAs(json);
    setFileName(name);
    setIsDirty(false);
  }, [fileName, showLabels, workspace])

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
    if (data.settings?.showLabels !== undefined) {
      setShowLabels(data.settings.showLabels);
    }
    setWorkspace(data.workspace || []);
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
    setWorkspace([]);
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
    setWorkspace([]);
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

  // Toolbar helpers

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
      


      {/* Hop action bar */}

      {(selectedHop || labelPerm) && (
        <div style={{
          padding: '6px 12px',
          background: '#f0f4f8',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
        }}>
          {selectedHop && (
            <button
              onClick={() => performHop(selectedHop)}
              style={{
                padding: '4px 12px',
                background: '#4a90d9',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Perform hop {selectedHop.cycle}
            </button>
          )}
          {labelPerm && (
            <>
              <span style={{ color: '#555' }}>
                Current labels: [{labelPerm.join(', ')}]
              </span>
              <button
                onClick={resetLabels}
                style={{
                  padding: '4px 12px',
                  background: '#95a5a6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Reset labels
              </button>
            </>
          )}
        </div>
      )}

      {/* Main area: canvas + sidebar */}

      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Canvas column: toolbar + banner + graph */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}>

        {/* Toolbar */}
        <div style={{
          padding: '8px 12px',
          display: 'flex',
          background: 'transparent',
          gap: '8px',
          }}>

          {/* Mode buttons */}
          <button style={buttonStyleToolbar('pan')} onClick={() => { setMode('pan'); setEdgeSource(null); }}>Pan</button>
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
                cyRef.current.layout({
                  name: e.target.value,
                  animate: true,
                  animationDuration: 500,
                  animationEasing: 'ease-out',
                }).run();
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

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
              Labels
            </label>  
        </div>
            {/* Snapshot banner */}
            {snapshotView && (
              <div style={{
                padding: '8px 16px',
                background: '#fff3cd',
                borderBottom: '1px solid #ffc107',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: '#856404'
              }}>
                <span>Viewing a graph from a previous computation</span>
                <button
                  onClick={exitSnapshotView}
                  style={{
                    padding: '4px 12px',
                    background: '#ffc107',
                    color: '#856404',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px',
                  }}
                >
                  Back to current graph
                </button>
              </div>
            )}

          {/* Graph canvas */}
          <div ref={containerRef} style={{
            flex: 1,
            minWidth: 0,
            zIndex: 2
          }} />
        </div>
        {/* Sidebar */}
        <div style={{
          width: `${sidebarWidth}px`,
          flexShrink: 0,
          borderLeft: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          background: '#fafafa',
          color: '#000',
          position: 'relative',
        }}>
          {/* Drag handle */}
          <div
            onMouseDown={onSidebarDragStart}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '8px',
              cursor: 'col-resize',
              zIndex: 10,
            }}
          />

          {/* Compute buttons */}
          <ControlPanel
            getGraphData={getGraphData}
            getGraphSnapshot={getGraphSnapshot}
            addEntry={addWorkspaceEntry}
          />

          {/* Notebook header */}
          <div style={{
            padding: '8px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #ddd',
          }}>
            <span style={{
              fontSize: '12px',
              color: '#888',
              textTransform: 'uppercase'
            }}>
              Workspace
            </span>
            {workspace.length > 0 && (
              <button
                onClick={clearWorkspace}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#aaa',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Scrollable notebook entries */}
          <div
            id="notebook-scroll"
            style={{
              flex: 1,
              overflowY: 'auto'
            }}
          >
            {workspace.length === 0 ? (
              <div style={{
                padding: '24px 16px',
                color: '#bbb',
                fontSize: '13px',
                textAlign: 'center'
              }}>
                Run a computation to see results here.
              </div>
            ) : (
              workspace.map((entry) => (
                <NotebookEntry
                  key={entry.id}
                  entry={entry}
                  onRemove={removeWorkspaceEntry}
                  onSelectHop={selectHop}
                  selectedHop={selectedHop}
                  onViewSnapshot={viewSnapshot}
                />
              ))
            )}
            </div>
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