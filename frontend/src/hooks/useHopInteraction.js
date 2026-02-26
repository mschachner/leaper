import { useCallback, useEffect, useState } from 'react';
import { toCycleNotation } from '../lib/permUtils';

export default function useHopInteraction({ cyRef, showLabels, indexBase = 1, isDirected = false }) {
    const [selectedHop, setSelectedHop] = useState(null);
    const [labelPerm,   setLabelPerm]   = useState(null);
    const [hopHistory,  setHopHistory]  = useState([]);
    const [savedLeaps,  setSavedLeaps]  = useState([]);

    // Hop selection

    const selectHop = useCallback((hop) => {
        setSelectedHop(hop);
    }, []);

    // Highlight existing edges when a hop is selected
    useEffect(() => {
        const cy = cyRef.current;
        if (!cy) return;

        // Clear any previous highlights
        cy.edges().removeClass('hop-traversed hop-traversed-forward hop-traversed-reverse hop-traversed-both');

        if (!selectedHop) return;

        const perm = selectedHop.one_line;
        const n = perm.length;

        // Guard: don't highlight if hop doesn't match the current graph
        if (n !== cy.nodes().length) return;

        // Track which pairs we've already processed (for undirected transpositions)
        const drawn = new Set();

        for (let i = 0; i < n; i++) {
          const j = perm[i] - 1; // convert to 0-indexed target
          if (i === j) continue;  // skip fixed points

          const nodeI = cy.getElementById(String(i));
          const nodeJ = cy.getElementById(String(j));

          if (isDirected) {
            // Directed: find the specific directed edge from i to j (graph edges only)
            const edges = nodeI.edgesTo(nodeJ).filter(
              (e) => !e.hasClass('leap-arrow') && !e.hasClass('draw-hop-arrow')
            );
            if (edges.length === 0) continue; // guard
            edges[0].addClass('hop-traversed');
            // The existing arrow shows direction; recoloring suffices
            // (handled by the edge.directed.hop-traversed compound style)
          } else {
            // Undirected: deduplicate transpositions (single edge serves both directions)
            const pairKey = [Math.min(i, j), Math.max(i, j)].join('.');
            if (drawn.has(pairKey)) continue;
            drawn.add(pairKey);

            // Graph edges only (exclude overlays)
            const edges = nodeI.edgesWith(nodeJ).filter(
              (e) => !e.hasClass('leap-arrow') && !e.hasClass('draw-hop-arrow')
            );
            if (edges.length === 0) continue; // guard

            const edge = edges[0];
            edge.addClass('hop-traversed');

            // Add arrowhead(s) to indicate direction of vertex movement
            const isTransposition = perm[j] === i + 1;
            if (isTransposition) {
              edge.addClass('hop-traversed-both');
            } else if (edge.source().id() === String(i)) {
              // Hop goes from source → target (forward)
              edge.addClass('hop-traversed-forward');
            } else {
              // Hop goes from target → source (reverse)
              edge.addClass('hop-traversed-reverse');
            }
          }
        }
    }, [selectedHop, cyRef, isDirected])

    useEffect(() => {
        const cy = cyRef.current;
        if (!cy) return;
    
        const clearSelection = (evt) => {
          if (evt.target.hasClass && (
            evt.target.hasClass('draw-hop-arrow') ||
            evt.target.hasClass('leap-arrow')
          )) return;
          setSelectedHop(null);
        };
        cy.on('add remove', clearSelection);
        return () => cy.off('add remove', clearSelection);
    }, [cyRef]);

    // Label permutation + leap arrows
    useEffect(() => {
        const cy = cyRef.current;
        if (!cy) return;
    
        cy.nodes().forEach((node) => {
          const nodeIndex = parseInt(node.id(),10);
          if (labelPerm) {
            node.data('displayLabel', String(labelPerm[nodeIndex] + indexBase));
          } else {
            node.data('displayLabel', String(nodeIndex + indexBase));
          }
        });
    
        // Draw blue leap arrows showing the working leap permutation
        cy.elements('.leap-arrow').remove();
    
        if (labelPerm) {
          const n = labelPerm.length;
          const drawn = new Set();
    
          for (let i = 0; i < n; i++) {
            const target = labelPerm[i];
            if (target === i) continue;
    
            const pairKey = [Math.min(i, target), Math.max(i, target)].join('.');
            if (drawn.has(pairKey)) continue;
            drawn.add(pairKey);
    
            const isTransposition = labelPerm[target] === i;
    
            cy.add({
              group: 'edges',
              data: {
                id: `leap-arrow-${i}`,
                source: String(i),
                target: String(target),
              },
              classes: isTransposition
                ? 'leap-arrow leap-arrow-double'
                : 'leap-arrow',
            });
          }
        }
    }, [labelPerm, cyRef, indexBase]);

    // Reset everything when graph structure changes
    useEffect(() => {
        const cy = cyRef.current;
        if (!cy) return;
    
        const onGraphChange = (evt) => {
          if (evt.target.hasClass && (
            evt.target.hasClass('draw-hop-arrow') ||
            evt.target.hasClass('leap-arrow')
          )) return;
          setLabelPerm(null);
          setSelectedHop(null);
          setHopHistory([]);
        };
    
        cy.on('add remove', onGraphChange);
        return () => cy.off('add remove', onGraphChange);
    }, [cyRef])

    const performHop = useCallback((hop) => {
        const cy = cyRef. current;
        if (!cy) return;
    
        const perm = hop.one_line;
        const n = cy.nodes().length;

        // Guard: hop must match current graph size
        if (perm.length !== n) return;

        // current label perm
        const current = labelPerm || Array.from({ length: n }, (_,i) => i);
    
    
        const newLabels = new Array(n);
        for (let i = 0; i<n; i++) {
          newLabels[perm[i] - 1] = current[i];
        }
    
        // Record this hop in the composition history
        setHopHistory((prev) => [...prev, {
          cycle: hop.cycle,
          one_line: hop.one_line
        }]);
    
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
    }, [cyRef, labelPerm, showLabels]);

    const resetLabels = useCallback(() => {
        setLabelPerm(null);
        setSelectedHop(null);
        setHopHistory([]);
    }, []);

    const saveWorkingLeap = useCallback(() => {
        if (!labelPerm) return;
    
        const name = window.prompt('Name for this leap:')
        if (!name) return;
    
        setSavedLeaps((prev) => [...prev, {
          name,
          permutation: [...labelPerm],
          history: hopHistory.map((h) => h.cycle),
        }]);
    }, [labelPerm, hopHistory]);
    
    const recallWorkingLeap = useCallback((saved) => {
        setLabelPerm([...saved.permutation]);
        setHopHistory(saved.history.map((cycle) => ({ cycle, one_line: []})));
        setSelectedHop(null);
    }, []);
    
    const deleteSavedLeap = useCallback((index) => {
        setSavedLeaps((prev) => prev.filter((_, i) => i !== index));
    }, []);

    return {
        selectedHop, setSelectedHop,
        labelPerm,   setLabelPerm,
        hopHistory,  setHopHistory,
        savedLeaps,  setSavedLeaps,
        selectHop,
        performHop,
        resetLabels,
        saveWorkingLeap,
        recallWorkingLeap,
        deleteSavedLeap,
    };
}

