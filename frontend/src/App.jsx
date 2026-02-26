import { useCallback, useEffect, useRef, useState } from 'react';
import { serializeGraph, deserializeGraph, validateGraphData } from './lib/graphFile';

import ControlPanel from './components/ControlPanel';
import GraphLibraryModal from './components/graphLibraryModal';
import NotebookEntry from './components/NotebookEntry';
import WorkingLeap from './components/WorkingLeap';
import DrawHopBar from './components/DrawHopBar';
import HopPalette from './components/HopPalette';
import Toast from './components/Toasts';
import MenuBar from './components/MenuBar';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import SettingsModal from './components/SettingsModal';


import useCytoscape from './hooks/useCytoscape';
import useFileOperations from './hooks/useFileOperations';
import useHopInteraction from './hooks/useHopInteraction';
import useToast from './hooks/useToast';
import useDrawHop from './hooks/useDrawHop';


function App() {
  const nextNodeIdRef = useRef(0);

  const [mode, setMode]                 = useState('select');
  const [edgeSource, setEdgeSource]     = useState(null);
  const [fileName, setFileName]         = useState(null);
  const [isDirty, setIsDirty]           = useState(false);
  const [libraryOpen, setLibraryOpen]   = useState(false);
  const [showLabels, setShowLabels]     = useState(true);
  const [workspace, setWorkspace]       = useState([]);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [snapshotView, setSnapshotView] = useState(null);
  const [hopPalette, setHopPalette]     = useState([]);
  const [indexBase, setIndexBase]       = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDirected, setIsDirected]    = useState(false);
  
  const { cyRef, containerRef } = useCytoscape();
  const { toasts, showToast, dismissToast } = useToast();

  const {
    selectedHop, setSelectedHop,
    labelPerm, setLabelPerm,
    hopHistory, setHopHistory,
    savedLeaps, setSavedLeaps,
    selectHop, performHop, resetLabels,
    saveWorkingLeap, recallWorkingLeap, deleteSavedLeap,
  } = useHopInteraction({ cyRef, showLabels, indexBase, isDirected });

  const { handleSave, handleSaveAs, handleOpen, handleNew, handleLoadFromLibrary} = 
  useFileOperations({
    cyRef,
    fileName,   setFileName,
    isDirty,    setIsDirty,
    showLabels, setShowLabels,
    workspace,  setWorkspace,
    savedLeaps, setSavedLeaps,
    hopPalette, setHopPalette,
    indexBase,   setIndexBase,
    isDirected,  setIsDirected,
    setLibraryOpen,
    nextNodeIdRef,
  });

  // Graph data handler
  const getGraphData = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return [];

    const vertices = cy.nodes().map((n) => parseInt(n.id(), 10));
    const edges = cy.edges().filter((e) =>
      !e.hasClass('leap-arrow') && !e.hasClass('draw-hop-arrow')
    ).map((e) => [
      parseInt(e.data('source'), 10),
      parseInt(e.data('target'), 10),
    ]);

    return { vertices, edges, directed: isDirected };
  }, [isDirected]);

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
      const displayLabel = indexBase === 0 ? newId : String(parseInt(newId, 10) + 1);
      cy.add({
        group: 'nodes',
        data: { id: newId, displayLabel },
        position: { x: position.x, y: position.y },
      });
    });
    edgeData.forEach(({ source, target }) => {
      const edge = cy.add({
        group: 'edges',
        data: { source, target },
      });
      if (isDirected) edge.addClass('directed');
    });

    nextNodeIdRef.current = nextNewId;
    console.log(`Relabeled. Nodes are now ${cy.nodes().map((n) => n.id()).join(', ')}`);
  }, [indexBase, isDirected]);

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

  // Update all node displayLabels when indexBase changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((node) => {
      const nodeId = parseInt(node.id(), 10);
      // If labelPerm is active, useHopInteraction handles labels.
      // Otherwise, set display based on indexBase.
      if (!labelPerm) {
        node.data('displayLabel', String(nodeId + indexBase));
      }
    });
  }, [indexBase, labelPerm]);

  // Directed/undirected toggle
  const handleToggleDirected = useCallback(() => {
    const cy = cyRef.current;
    const hasContent = cy && (cy.nodes().length > 0 || workspace.length > 0);
    if (hasContent && isDirty) {
      if (!window.confirm('Switching graph type will start a new graph. Unsaved changes will be lost. Continue?')) {
        return;
      }
    } else if (hasContent) {
      if (!window.confirm('Switching graph type will start a new graph. Continue?')) {
        return;
      }
    }
    // Clear graph and toggle
    handleNew();
    setIsDirected((prev) => !prev);
  }, [isDirty, workspace, handleNew]);

  // Add/remove .directed class on all edges when isDirected changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (isDirected) {
      cy.edges().addClass('directed');
    } else {
      cy.edges().removeClass('directed');
    }
  }, [isDirected]);

  // When adding edges in directed mode, auto-apply .directed class
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const onAddEdge = (evt) => {
      if (evt.target.isEdge && evt.target.isEdge() && isDirected) {
        if (!evt.target.hasClass('draw-hop-arrow') && !evt.target.hasClass('leap-arrow')) {
          evt.target.addClass('directed');
        }
      }
    };

    cy.on('add', onAddEdge);
    return () => cy.off('add', onAddEdge);
  }, [isDirected]);

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
      cy.autoungrabify(false);
    } else {
      cy.boxSelectionEnabled(false);
      cy.userPanningEnabled(false);
      cy.autoungrabify(false);
    }
  },[mode]);

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
        const id = String(nextNodeIdRef.current++);
        const displayLabel = indexBase === 0 ? id : String(parseInt(id, 10) + 1);
        saveSnapshot();
        cy.add({
          group: 'nodes',
          data: { id, displayLabel },
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
          const existing = cy.edges().filter((e) => {
            if (isDirected) {
              // Directed: only check exact source→target
              return e.data('source') === edgeSource && e.data('target') === clickedId;
            }
            // Undirected: check both directions
            return (e.data('source') === edgeSource && e.data('target') === clickedId) ||
                   (e.data('target') === edgeSource && e.data('source') === clickedId);
          });
          if (existing.length === 0) {
            saveSnapshot();
            const newEdge = cy.add({
              group: 'edges',
              data: { source: edgeSource, target: clickedId },
            });
            if (isDirected) newEdge.addClass('directed');
          }
          cy.getElementById(edgeSource).removeClass('edge-source');
          setEdgeSource(null);
        }
      }
    } else if (mode === 'drawHop') {
      if (evt.target !== cy && evt.target.isNode()) {
        const clickedId = parseInt(evt.target.id(), 10);
        handleDrawHopTap(clickedId);
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

  const savedGraphState = useRef(null);

  const viewSnapshot = useCallback((snapshot) => {
    const cy = cyRef.current;
    if (!cy || !snapshot) return;

    // Save current graph state
    savedGraphState.current = {
      elements: cy.json().elements,
      nextNodeId: nextNodeIdRef.current,
    }

    // Load snapshot
    deserializeGraph(cy, snapshot, indexBase, isDirected);
    setSnapshotView(snapshot);
  }, [indexBase, isDirected])

  const exitSnapshotView = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || !savedGraphState.current) return;

    // Restore saved graph state
    cy.json({ elements: savedGraphState.current.elements });
    nextNodeIdRef.current = savedGraphState.current.nextNodeId;
    savedGraphState.current = null;
    setSnapshotView(null);
  }, []);

  // Snapshot-aware hop hover for workspace entries
  const hoverWorkspaceHop = useCallback((hop, snapshot) => {
    if (snapshot && !savedGraphState.current) {
      viewSnapshot(snapshot);
    }
    selectHop(hop);
  }, [viewSnapshot, selectHop]);

  const unhoverWorkspaceHop = useCallback(() => {
    setSelectedHop(null);
    if (savedGraphState.current) exitSnapshotView();
  }, [exitSnapshotView]);

  // Guarded hop hover/perform for palette (no snapshot available)
  const hoverPaletteHop = useCallback((hop) => {
    const cy = cyRef.current;
    if (!cy) return;
    if (hop.one_line.length !== cy.nodes().length) return;
    selectHop(hop);
  }, [selectHop]);

  const performPaletteHop = useCallback((hop) => {
    const cy = cyRef.current;
    if (!cy) return;
    if (hop.one_line.length !== cy.nodes().length) return;
    performHop(hop);
  }, [performHop]);

  // Hop palette helpers

  const addToPalette = useCallback((hop, source = 'computed') => {
    setHopPalette((prev) => {
      const exists = prev.some((h) => h.one_line.join(',') === hop.one_line.join(','));
      if (exists) return prev;
      const name = hop.name || hop.cycle;
      return [...prev, { name, one_line: hop.one_line, cycle: hop.cycle, source }];
    });
    setIsDirty(true);
  }, []);

  const removeFromPalette = useCallback((index) => {
    setHopPalette((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }, []);

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

      if (evt.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false);
        if (libraryOpen) setLibraryOpen(false);
      }
      
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDelete, saveSnapshot, undo, redo, relabelNodes, handleSave, handleSaveAs, handleOpen, libraryOpen, settingsOpen]);

  const {
    drawingHop, setDrawingHop,
    handleDrawHopTap,
    handleUndoDrawAssignment,
    handleVerifyHop,
    handlePerformDrawnHop
  } = useDrawHop({
    cyRef,
    getGraphData,
    getGraphSnapshot,
    addWorkspaceEntry: addWorkspaceEntry,
    addToPalette,
    performHop,
    showToast,
  });

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column' }}>

      {/* Menu bar */}
      <MenuBar
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onLibrary={() => setLibraryOpen(true)}
        fileName={fileName}
        isDirty={isDirty}
        isDirected={isDirected}
        onToggleDirected={handleToggleDirected}
      />
      
      {/* Draw hop status bar */}
      {mode === 'drawHop' && drawingHop && (
        <DrawHopBar
          drawingHop={drawingHop}
          nodeCount={cyRef.current ? cyRef.current.nodes().length : 0}
          onVerifyAndSave={handleVerifyHop}
          onPerform={handlePerformDrawnHop}
          onCancel={() => {
            setMode('select');
          }}
          onUndo={handleUndoDrawAssignment}
        />
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
        <Toast toasts={toasts} onDismiss={dismissToast} />

        <Toolbar
          mode={mode}
          onSetMode={setMode}
          onDelete={handleDelete}
          setDrawingHop={setDrawingHop}
          setEdgeSource={setEdgeSource}
          setSelectedHop={setSelectedHop}
          onOpenSettings={() => setSettingsOpen(true)}
        />
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
        <Sidebar width={sidebarWidth} onWidthChange={setSidebarWidth}>
          <WorkingLeap
              labelPerm={labelPerm}
              hopHistory={hopHistory}
              onReset={resetLabels}
              onSave={saveWorkingLeap}
              savedLeaps={savedLeaps}
              onRecall={recallWorkingLeap}
              onDelete={deleteSavedLeap}
              indexBase={indexBase}
            />
          <HopPalette
            hops={hopPalette}
            onHover={hoverPaletteHop}
            onUnhover={() => setSelectedHop(null)}
            selectedHop={selectedHop}
            onRemove={removeFromPalette}
            onPerform={performPaletteHop}
            indexBase={indexBase}
            nodeCount={cyRef.current ? cyRef.current.nodes().length : 0}
          />
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
                  onHoverHop={(hop) => hoverWorkspaceHop(hop, entry.graphSnapshot)}
                  onUnhoverHop={unhoverWorkspaceHop}
                  selectedHop={selectedHop}
                  onPerformHop={performHop}
                  onViewSnapshot={viewSnapshot}
                  onPinHop={addToPalette}
                  indexBase={indexBase}
                />
              ))
            )}
          </div>
        </Sidebar>
    </div>
    {libraryOpen && (
      <GraphLibraryModal
        onLoad={handleLoadFromLibrary}
        onClose={() => setLibraryOpen(false)}
        isDirected={isDirected}
      />
    )}
    {settingsOpen && (
      <SettingsModal
        onClose={() => setSettingsOpen(false)}
        cyRef={cyRef}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        indexBase={indexBase}
        setIndexBase={setIndexBase}
      />
    )}
    </div>
  );
}

export default App;