import { useCallback } from 'react';
import { serializeGraph, deserializeGraph, validateGraphData } from '../lib/graphFile';
import { saveAs, save, openFile, clearFileHandle } from '../lib/fileAccess';

export default function useFileOperations({
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
}) {
    const handleSave = useCallback(async () => {
        const cy = cyRef.current;
        if (!cy) return;
    
        const graphData = serializeGraph(cy, fileName || 'Untitled', { showLabels, indexBase, directed: isDirected }, workspace, savedLeaps, hopPalette);
        const json = JSON.stringify(graphData, null, 2);
        const name = await save(json);
        setFileName(name);
        setIsDirty(false);
    }, [cyRef, fileName, showLabels, indexBase, isDirected, workspace, savedLeaps, hopPalette, setFileName, setIsDirty])

    const handleSaveAs = useCallback(async () => {
        const cy = cyRef.current;
        if (!cy) return;
    
        const graphData = serializeGraph(cy, fileName || 'Untitled', { showLabels, indexBase, directed: isDirected }, workspace, savedLeaps, hopPalette);
        const json = JSON.stringify(graphData, null, 2);
        const name = await saveAs(json);
        setFileName(name);
        setIsDirty(false);
    }, [cyRef, fileName, showLabels, indexBase, isDirected, workspace, savedLeaps, hopPalette, setFileName, setIsDirty])

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
    
        const loadedIndexBase = data.settings?.indexBase ?? 1;
        const loadedDirected = data.settings?.directed ?? false;
        deserializeGraph(cy, data, loadedIndexBase, loadedDirected);
        if (data.settings?.showLabels !== undefined) {
            setShowLabels(data.settings.showLabels);
        }
        if (data.settings?.indexBase !== undefined) {
            setIndexBase(data.settings.indexBase);
        }
        setIsDirected(loadedDirected);
        setWorkspace(data.workspace || []);
        setSavedLeaps(data.savedLeaps || []);
        setHopPalette(data.hopPalette || []);
        const maxId = Math.max(-1, ...data.vertices.map((v) => v.id));
        nextNodeIdRef.current = maxId + 1;
    
        setFileName(name);
        setIsDirty(false);
    }, [cyRef, isDirty, setShowLabels, setIndexBase, setIsDirected, setWorkspace, setSavedLeaps, setHopPalette, setFileName, setIsDirty, nextNodeIdRef]);

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
        setSavedLeaps([]);
        setHopPalette([]);
        nextNodeIdRef.current = 0;
    }, [cyRef, isDirty, setFileName, setIsDirty, setWorkspace, setSavedLeaps, setHopPalette, nextNodeIdRef]);
    // Note: handleNew intentionally does NOT reset isDirected — the toggle in App.jsx handles that.

    const handleLoadFromLibrary = useCallback((graph) => {
        const confirmMsg = 'You have unsaved changes. Load a library graph anyway?'
        if (isDirty && !window.confirm(confirmMsg)) return;
    
        const cy = cyRef.current;
        if (!cy) return;
    
        deserializeGraph(cy, graph, indexBase, isDirected);
        const maxId = Math.max(-1, ...graph.vertices.map((v) => v.id));
        nextNodeIdRef.current = maxId + 1;
    
        clearFileHandle();
        setFileName(null);
        setIsDirty(false);
        setLibraryOpen(false);
        setWorkspace([]);
        setSavedLeaps([]);
        setHopPalette([]);
    }, [cyRef, isDirty, indexBase, setFileName, setIsDirty, setLibraryOpen, setWorkspace, setSavedLeaps, setHopPalette, nextNodeIdRef]);

    return { handleSave, handleSaveAs, handleOpen, handleNew, handleLoadFromLibrary };
}