import { useCallback, useEffect, useState } from 'react';
import { toCycleNotation } from '../lib/permUtils';
import { createEntry } from '../lib/workspace';
import { API_URL } from '../lib/api';

export default function useDrawHop({
    cyRef,
    getGraphData,
    getGraphSnapshot,
    addWorkspaceEntry,
    addToPalette,
    performHop,
    showToast,
}) {
    const [drawingHop, setDrawingHop] = useState(null);

    useEffect(() => {
        const cy = cyRef.current;
        if (!cy) return;
    
        // Clear everything first
        cy.elements('.draw-hop-arrow').remove();
        cy.nodes().removeClass('draw-hop-source');
    
        if (!drawingHop) return;
    
        // Highlight the pending source vertex (first click waiting for target)
        if (drawingHop.pendingSource !== null) {
          cy.getElementById(String(drawingHop.pendingSource)).addClass('draw-hop-source');
        }
    
        // Draw arrows for all completed assignments
        const assignments = drawingHop.assignments;
        const drawn = new Set();
    
        for (const [sourceStr, target] of Object.entries(assignments)) {
          const source = Number(sourceStr);
          if (source === target) continue; // skip fixed points — no arrow needed
    
          const pairKey = [Math.min(source, target), Math.max(source, target)].join('.');
          if (drawn.has(pairKey)) continue;
          drawn.add(pairKey);
    
          const isTransposition =
            String(target) in assignments && assignments[String(target)] === source;
    
          cy.add({
            group: 'edges',
            data: {
              id: `draw-hop-${source}`,
              source: String(source),
              target: String(target),
            },
            classes: isTransposition
              ? 'draw-hop-arrow draw-hop-arrow-double'
              : 'draw-hop-arrow',
          });
        }
    }, [drawingHop, cyRef]);

    const handleDrawHopTap = useCallback((clickedId) => {
        setDrawingHop((prev) => {
            if (!prev) return prev;

            if (prev.pendingSource === null) {
                if (clickedId in prev.assignments) return prev;
                return { ...prev, pendingSource: clickedId };
            } else {
                const source = prev.pendingSource;
                const usedTargets = new Set(Object.values(prev.assignments));
                if (usedTargets.has(clickedId)) return prev;
                const newAssignments = { ...prev.assignments, [source]: clickedId };
                return { ...prev, assignments: newAssignments, pendingSource: null };
            }
        });
    }, []);

    const handleUndoDrawAssignment = useCallback(() => {
        setDrawingHop((prev) => {
          if (!prev) return prev;
          const entries = Object.entries(prev.assignments);
          if (entries.length === 0) return prev;
    
          const newAssignments = { ...prev.assignments };
          delete newAssignments[entries[entries.length - 1][0]];
          return { ...prev, assignments: newAssignments, pendingSource: null };
        });
    }, []);

    const handleVerifyHop = useCallback(async () => {
        const cy = cyRef.current;
        if (!cy || !drawingHop) return;
    
        const n = cy.nodes().length;
        const assignments = drawingHop.assignments;
    
        const oneLine = [];
        for (let i=0; i<n; i++) {
          oneLine.push(assignments[i]+1);
        }
    
        const graphData = getGraphData();
    
        try {
          const resp = await fetch(`${API_URL}/verify-hop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vertices: graphData.vertices,
              edges: graphData.edges,
              one_line: oneLine,
              directed: graphData.directed || false,
            }),
          });
    
          const data = await resp.json();
    
          if (data.valid) {
            const zeroIndexed = [];
            for (let i=0; i<n; i++) {
              zeroIndexed.push(assignments[i]);
            }
            const cycle = toCycleNotation(zeroIndexed);
    
            showToast(`Valid hop: ${cycle}`, 'success');
    
            const entry = createEntry('hop', { source: 'manual' }, {
              hops: [{ one_line: oneLine, cycle }],
              count: 1,
            }, null, getGraphSnapshot());
            addWorkspaceEntry(entry);
    
            // Also pin to palette
            addToPalette({ one_line: oneLine, cycle }, 'manual');
    
            // Reset drawing state (effect handles arrow cleanup)
            setDrawingHop({ assignments: {}, pendingSource: null });
          } else {
            showToast('This permutation is not a valid hop on this graph.', 'error');
          }
        } catch (err) {
          showToast(`Error verifying hop: ${err.message}`, 'error');
        }
    }, [cyRef, drawingHop, getGraphData, getGraphSnapshot, addWorkspaceEntry, addToPalette, showToast]);

    const handlePerformDrawnHop = useCallback(() => {
        if (!drawingHop) return;
    
        const cy = cyRef.current;
        if (!cy) return;
    
        const n = cy.nodes().length;
        const assignments = drawingHop.assignments;
    
        const oneLine = []
        for (let i = 0; i < n; i++) {
          oneLine.push(assignments[i]+1);
        }
    
        const zeroIndexed = []
        for (let i = 0; i<n; i++) {
          zeroIndexed.push(assignments[i]);
        }
        const cycle = toCycleNotation(zeroIndexed);
    
        performHop({ one_line: oneLine, cycle});
    
        // Reset drawing state (effect handles arrow cleanup)
        setDrawingHop({ assignments: {}, pendingSource: null });
    }, [cyRef, drawingHop, performHop]);

    return {
        drawingHop, setDrawingHop,
        handleDrawHopTap,
        handleUndoDrawAssignment,
        handleVerifyHop,
        handlePerformDrawnHop,
    };
}