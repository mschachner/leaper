import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { deserializeGraph } from './lib/graphFile';
import { checkHealth } from './lib/api';
import { makeRandom } from './lib/graphGenerators';
import {
  graphData, graphSnapshot, graphEdges, graphElements,
  restoreGraphElements, relabelVertices, sameGraph, isOverlay, OVERLAY_SELECTOR,
} from './lib/cyGraph';

import ControlPanel from './components/ControlPanel';
import GraphLibraryModal from './components/GraphLibraryModal';
import NotebookEntry from './components/NotebookEntry';
import WorkingLeap from './components/WorkingLeap';
import HopPalette from './components/HopPalette';
import Toast from './components/Toasts';
import MenuBar from './components/MenuBar';
import DatabasePage from './components/DatabasePage';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';

import useCytoscape from './hooks/useCytoscape';
import useFileOperations from './hooks/useFileOperations';
import useHopInteraction from './hooks/useHopInteraction';
import useToast from './hooks/useToast';
import useDrawHop from './hooks/useDrawHop';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import { clearFileHandle } from './lib/fileAccess';


function App() {
  const nextNodeIdRef = useRef(0);

  const [mode, setMode]                     = useState('addVertex');
  const [edgeSource, setEdgeSource]         = useState(null);
  const [fileName, setFileName]             = useState(null);
  const [isDirty, setIsDirty]               = useState(false);
  const [libraryOpen, setLibraryOpen]       = useState(false);
  const [showLabels, setShowLabels]         = useState(false);
  const [workspace, setWorkspace]           = useState([]);
  const [sidebarWidth, setSidebarWidth]     = useState(400);
  const [snapshotView, setSnapshotView]     = useState(null);
  const [hopPalette, setHopPalette]         = useState([]);
  const [indexBase, setIndexBase]           = useState(1);
  const [settingsOpen, setSettingsOpen]     = useState(false);
  const [isDirected, setIsDirected]         = useState(false);
  const [backendOnline, setBackendOnline]   = useState(true);
  const [canvasEmpty, setCanvasEmpty]       = useState(true);
  const [randomizerOpen, setRandomizerOpen] = useState(false);
  const [randomValues, setRandomValues]     = useState([5,0.3]);
  const [helpOpen, setHelpOpen]             = useState(false);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [page, setPage]                     = useState('editor');
  const [nodeCount, setNodeCount]           = useState(0);

    
  const { cyRef, containerRef } = useCytoscape();
  const { toasts, showToast, dismissToast } = useToast();

  // Dark mode should default to the user's color scheme
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);


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
    if (!cy) return null;
    return graphData(cy, isDirected);
  }, [cyRef, isDirected]);

  const getGraphSnapshot = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return null;
    return graphSnapshot(cy);
  }, [cyRef]);

  // Swapping the whole graph in and out (snapshots) should not count as an
  // edit, so dirty tracking is paused while this is set.
  const suppressDirtyRef = useRef(false);
  const withoutDirtying = useCallback((fn) => {
    suppressDirtyRef.current = true;
    try {
      fn();
    } finally {
      suppressDirtyRef.current = false;
    }
  }, []);

  // Relabeler method: renumber the vertices 0..n-1 after a deletion or undo.
  const relabelNodes = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    nextNodeIdRef.current = relabelVertices(cy, indexBase, isDirected);
  }, [cyRef, indexBase, isDirected]);

  // Undo/redo helpers
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const saveSnapshot = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    undoStack.current.push(graphElements(cy));
    redoStack.current = [];
  }, [cyRef]);

  const undo = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || undoStack.current.length === 0) return;

    redoStack.current.push(graphElements(cy));
    restoreGraphElements(cy, undoStack.current.pop());
    relabelNodes();
  }, [cyRef, relabelNodes]);

  const redo = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || redoStack.current.length === 0) return;

    undoStack.current.push(graphElements(cy));
    restoreGraphElements(cy, redoStack.current.pop());
    relabelNodes();
  }, [cyRef, relabelNodes]);

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

    const markDirty = (evt) => {
      if (suppressDirtyRef.current || isOverlay(evt.target)) return;
      setIsDirty(true);
    };
    cy.on('add remove position', markDirty);
    return () => cy.off('add remove position', markDirty);
  }, [cyRef]);

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
  },[cyRef, showLabels]);

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
  }, [cyRef, showLabels]);

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
  }, [cyRef, indexBase, labelPerm]);

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
  }, [cyRef, isDirty, workspace, handleNew]);

  // Add/remove .directed class on all edges when isDirected changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (isDirected) {
      graphEdges(cy).addClass('directed');
    } else {
      graphEdges(cy).removeClass('directed');
    }
  }, [cyRef, isDirected]);

  // When adding edges in directed mode, auto-apply .directed class
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const onAddEdge = (evt) => {
      if (evt.target.isEdge && evt.target.isEdge() && isDirected) {
        if (!isOverlay(evt.target)) {
          evt.target.addClass('directed');
        }
      }
    };

    cy.on('add', onAddEdge);
    return () => cy.off('add', onAddEdge);
  }, [cyRef, isDirected]);

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
  },[cyRef, mode]);

  // Make workspace scrollable
  useEffect(() => {
    const el = document.getElementById('notebook-scroll');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [workspace]);

  // Graph snapshots for reviewing computations

  const savedGraphState = useRef(null);

  const viewSnapshot = useCallback((snapshot) => {
    const cy = cyRef.current;
    if (!cy || !snapshot) return;

    // Save current graph state (once: a second snapshot replaces the first
    // on the canvas, but "back" still returns to the user's own graph).
    if (!savedGraphState.current) {
      savedGraphState.current = {
        elements: graphElements(cy),
        nextNodeId: nextNodeIdRef.current,
        labelPerm,
        hopHistory,
      };
    }

    // Load snapshot
    withoutDirtying(() => deserializeGraph(cy, snapshot, indexBase, isDirected));
    setSnapshotView(snapshot);
  }, [cyRef, indexBase, isDirected, labelPerm, hopHistory, withoutDirtying])

  const exitSnapshotView = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || !savedGraphState.current) return;

    // Restore saved graph state, including the working leap, which the
    // graph swap resets.
    const saved = savedGraphState.current;
    savedGraphState.current = null;
    withoutDirtying(() => restoreGraphElements(cy, saved.elements));
    nextNodeIdRef.current = saved.nextNodeId;
    setLabelPerm(saved.labelPerm);
    setHopHistory(saved.hopHistory);
    setSnapshotView(null);
  }, [cyRef, withoutDirtying, setLabelPerm, setHopHistory]);

  // Snapshot-aware hop hover for workspace entries. The snapshot is only
  // swapped in when it differs from the graph on the canvas; hovering a hop
  // of the current graph just highlights it in place.
  const hoverSwappedRef = useRef(false);

  const hoverWorkspaceHop = useCallback((hop, snapshot) => {
    const cy = cyRef.current;
    if (cy && snapshot && !savedGraphState.current && !sameGraph(cy, snapshot, isDirected)) {
      viewSnapshot(snapshot);
      hoverSwappedRef.current = true;
    }
    selectHop(hop);
  }, [cyRef, isDirected, viewSnapshot, selectHop]);

  const unhoverWorkspaceHop = useCallback(() => {
    setSelectedHop(null);
    if (hoverSwappedRef.current) {
      hoverSwappedRef.current = false;
      exitSnapshotView();
    }
  }, [exitSnapshotView, setSelectedHop]);

  // Performing a workspace hop only makes sense on the graph it belongs to.
  // If hovering has swapped that graph in, clicking keeps it on the canvas
  // (the banner offers the way back) instead of undoing the hop on mouse-out.
  const performWorkspaceHop = useCallback((hop, snapshot) => {
    const cy = cyRef.current;
    if (!cy) return;
    if (snapshot && !sameGraph(cy, snapshot, isDirected)) return;
    hoverSwappedRef.current = false;
    performHop(hop);
  }, [cyRef, isDirected, performHop]);

  // Guarded hop hover/perform for palette (no snapshot available)
  const hoverPaletteHop = useCallback((hop) => {
    const cy = cyRef.current;
    if (!cy) return;
    if (hop.one_line.length !== cy.nodes().length) return;
    selectHop(hop);
  }, [cyRef, selectHop]);

  const performPaletteHop = useCallback((hop) => {
    const cy = cyRef.current;
    if (!cy) return;
    if (hop.one_line.length !== cy.nodes().length) return;
    performHop(hop);
  }, [cyRef, performHop]);

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

  // Check backend health. A sleeping backend can take a while to wake, so
  // keep trying for a bit before leaving the offline banner up.
  useEffect(() => {
    let live = true;
    let timer = null;
    const delays = [5000, 10000, 20000, 30000];
    const attempt = (i) => {
      checkHealth(i === 0 ? 5000 : 15000).then((ok) => {
        if (!live) return;
        setBackendOnline(ok);
        if (!ok && i < delays.length) {
          timer = setTimeout(() => attempt(i + 1), delays[i]);
        }
      });
    };
    attempt(0);
    return () => { live = false; clearTimeout(timer); };
  }, []);

  // Empty canvas placeholder

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const onCount = () => {
      setCanvasEmpty(cy.nodes().length === 0);
      setNodeCount(cy.nodes().length);
    };
    cy.on('add remove', onCount);
    return () => cy.off('add remove', onCount)
  }, [cyRef]);

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

  // Handle user actions
  const handleTap = useCallback((evt) => {
    if (snapshotView) return; // No editing snapshots!
    const cy = cyRef.current;
    if (!cy) return;

    if (mode === 'addVertex') {
      if (evt.target === cy) {
        const pos = evt.position;
        saveSnapshot();
        const id = String(nextNodeIdRef.current++);
        cy.add({
          group: 'nodes',
          data: { id, displayLabel: String(parseInt(id, 10) + indexBase) },
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
          const existing = graphEdges(cy).filter((e) => {
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
  }, [cyRef, mode, edgeSource, snapshotView, indexBase, isDirected, saveSnapshot, handleDrawHopTap]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.on('tap', handleTap);
    return () => cy.off('tap', handleTap);
  }, [cyRef, handleTap]);

  // Leaving edge mode (or the graph changing under it) forgets a half-drawn edge.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || edgeSource !== null) return;
    cy.nodes('.edge-source').removeClass('edge-source');
  }, [cyRef, edgeSource]);

  const handleDelete = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || snapshotView) return;

    const selected = cy.elements(':selected').not(OVERLAY_SELECTOR);
    if (selected.length === 0) return;

    saveSnapshot();
    selected.remove();
    setEdgeSource(null);
    relabelNodes();
  }, [cyRef, snapshotView, saveSnapshot, relabelNodes]);

  // Keyboard shortcuts

  const shortcuts = useMemo(() => {
    const typing = () => {
      const el = document.activeElement;
      return !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
    };
    const mod = (e) => e.metaKey || e.ctrlKey;
    const key = (e) => e.key.toLowerCase();
    const editing = () => page === 'editor' && !snapshotView;

    return [
      {
        match: (e) => (e.key === 'Delete' || e.key === 'Backspace') && !typing() && editing(),
        action: (e) => { e.preventDefault(); handleDelete(); }
      },
      {
        match: (e) => mod(e) && key(e) === 'z' && !e.shiftKey && !typing() && editing(),
        action: (e) => { e.preventDefault(); undo(); }
      },
      {
        match: (e) => mod(e) && ((key(e) === 'z' && e.shiftKey) || key(e) === 'y') && !typing() && editing(),
        action: (e) => { e.preventDefault(); redo(); }
      },
      {
        match: (e) => mod(e) && key(e) === 's' && !e.shiftKey && page === 'editor',
        action: (e) => { e.preventDefault(); handleSave(); }
      },
      {
        match: (e) => mod(e) && key(e) === 's' && e.shiftKey && page === 'editor',
        action: (e) => { e.preventDefault(); handleSaveAs(); }
      },
      {
        match: (e) => mod(e) && key(e) === 'o' && page === 'editor',
        action: (e) => { e.preventDefault(); handleOpen(); }
      },
      {
        match: (e) => e.key === '?' && !typing(),
        action: () => setHelpOpen(true)
      },
      {
        match: (e) => e.key === 'Escape',
        action: () => {
          setHelpOpen(false);
          setLibraryOpen(false);
          setRandomizerOpen(false);
          setSettingsOpen(false)
        }
      },
    ];
  }, [page, snapshotView, handleDelete, undo, redo, handleSave, handleSaveAs, handleOpen]);

  useKeyboardShortcuts(shortcuts);

  // Randomizer
  const handleRandom = useCallback(() => {
    const confirmMsg = 'You have unsaved changes. Load random graph anyway?';
    if (isDirty && !window.confirm(confirmMsg)) return;

    const cy = cyRef.current;
    if (!cy) return;

    const graph = makeRandom(isDirected, ...randomValues);

    deserializeGraph(cy,graph, indexBase, isDirected);
    const maxId = Math.max(-1, ...graph.vertices.map((v) => v.id));
    nextNodeIdRef.current = maxId + 1;

    clearFileHandle();
    setFileName(null);
    setIsDirty(false);
    setWorkspace([]);
    setSavedLeaps([]);
    setHopPalette([]);
  }, [cyRef, isDirty, isDirected, indexBase, randomValues, nextNodeIdRef, setFileName, setSavedLeaps]);

  return (
    <div className="appRoot">

      {!backendOnline && (
        <div className='backendOffline'>
          Backend not reachable — computation features are unavailable.
          You can still edit and save graphs.
        </div>
      )}

      {/* Menu bar */}
      <MenuBar
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onLibrary={() => setLibraryOpen(true)}
        randomizerOpen={randomizerOpen}
        setRandomizerOpen={setRandomizerOpen}
        randomValues={randomValues}
        setRandomValues={setRandomValues}
        onGenerate={handleRandom}
        setHelpOpen={setHelpOpen}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        fileName={fileName}
        isDirty={isDirty}
        page={page}
        setPage={setPage}
      />

      {/* Database page (editor stays mounted underneath so the graph,
          workspace, and cytoscape state survive page switches) */}
      {page === 'database' && <DatabasePage />}

      {/* Main area: canvas + sidebar */}

      <div className="mainArea" style={page === 'database' ? { display: 'none' } : undefined}>

        {/* Canvas column: toolbar + banner + graph */}
        <div className="canvasColumn">
          <Toast toasts={toasts} onDismiss={dismissToast} />

          <Toolbar
            mode={mode}
            onSetMode={setMode}
            onDelete={handleDelete}
            drawingHop={drawingHop}
            setDrawingHop={setDrawingHop}
            onVerifyHop={handleVerifyHop}
            onPerformDrawnHop={handlePerformDrawnHop}
            onUndoDrawAssignment={handleUndoDrawAssignment}
            setEdgeSource={setEdgeSource}
            setSelectedHop={setSelectedHop}
            onOpenSettings={() => setSettingsOpen(true)}
            nodeCount={nodeCount}
          />
          {/* Snapshot banner */}
          {snapshotView && (
            <div className="snapshotBanner">
              <span>Viewing a graph from a previous computation</span>
              <button
                onClick={exitSnapshotView}
                className="snapshotBannerButton"
              >
                Back to current graph
              </button>
            </div>
          )}

          {/* Graph canvas */}
          <div ref={containerRef} className='canvas' />

          {/* Empty canvas placeholder */}
          {canvasEmpty && (
            <div className='canvasPlaceholder' >
              Click or tap anywhere to place a vertex!
            </div>
          )}

        </div>

        {/* Sidebar */}
        <Sidebar 
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        >
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
            nodeCount={nodeCount}
          />
          <ControlPanel
            getGraphData={getGraphData}
            getGraphSnapshot={getGraphSnapshot}
            addEntry={addWorkspaceEntry}
          />
          {/* Notebook header */}
          <div className="notebookHeader">
            <span className="notebookHeaderLabel">
              Workspace
            </span>
            {workspace.length > 0 && (
              <button
                onClick={clearWorkspace}
                className="notebookClearButton"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Scrollable notebook entries */}
          <div
            id="notebook-scroll"
            className="notebookScroll"
          >
            {workspace.length === 0 ? (
              <div className="notebookEmpty">
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
                  onPerformHop={(hop) => performWorkspaceHop(hop, entry.graphSnapshot)}
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
        isDirected={isDirected}
        onToggleDirected={handleToggleDirected}
      />
    )}
    {helpOpen && (
      <HelpModal
        onClose={() => setHelpOpen(false)}
      />
    )}
    </div>
  );
}

export default App;