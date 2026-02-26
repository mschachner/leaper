import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

const cyStyles = [
    {
      selector: 'node',
      style: {
        'label': 'data(displayLabel)',
        'text-valign': 'center',
        'background-color': '#4a90d9',
        'color': '#fff',
        'text-outline-color': '#4a90d9',
        'text-outline-width': 1.5,
        'font-size': '10px',
        'width': 20,
        'height': 20,
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
      selector: 'edge.directed',
      style: {
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#999',
      },
    },
    {
      selector: 'edge.directed:selected',
      style: {
        'target-arrow-color': '#e74c3c',
      },
    },
    // Hop traversal: highlight existing edges the hop uses
    {
      selector: '.hop-traversed',
      style: {
        'line-color': '#e74c3c',
        'width': 3.5,
        'opacity': 1,
      },
    },
    // Undirected: arrow at target end (hop follows stored edge direction)
    {
      selector: '.hop-traversed-forward',
      style: {
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#e74c3c',
        'arrow-scale': 1.2,
      },
    },
    // Undirected: arrow at source end (hop goes against stored edge direction)
    {
      selector: '.hop-traversed-reverse',
      style: {
        'source-arrow-shape': 'triangle',
        'source-arrow-color': '#e74c3c',
        'arrow-scale': 1.2,
      },
    },
    // Undirected transposition: arrows at both ends
    {
      selector: '.hop-traversed-both',
      style: {
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#e74c3c',
        'source-arrow-shape': 'triangle',
        'source-arrow-color': '#e74c3c',
        'arrow-scale': 1.2,
      },
    },
    // Directed edge that is hop-traversed: recolor the existing arrow
    {
      selector: 'edge.directed.hop-traversed',
      style: {
        'target-arrow-color': '#e74c3c',
      },
    },
    {
      selector: '.draw-hop-arrow',
      style: {
        'width': 2.5,
        'line-color': '#27ae60',
        'target-arrow-color': '#27ae60',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.2,
        'curve-style': 'bezier',
        'control-point-step-size': 40,
        'line-style':  'dashed',
        'line-dash-pattern': [6,3],
        'opacity': 0.85,
      },
    },
    {
      selector: '.draw-hop-arrow-double',
      style: {
        'source-arrow-color': '#27ae60',
        'source-arrow-shape': 'triangle',
      },
    },
    {
      selector: 'node.draw-hop-source',
      style: {
        'background-color': '#27ae60',
        'text-outline-color': '#27ae60',
      },
    },
    {
      selector: '.leap-arrow',
      style: {
        'width': 2.5,
        'line-color': '#2980b9',
        'target-arrow-color': '#2980b9',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.2,
        'curve-style': 'bezier',
        'control-point-step-size': 40,
        'line-style': 'dashed',
        'line-dash-pattern': [6,3],
        'opacity': 0.7,
      },
    },
    {
      selector: '.leap-arrow-double',
      style: {
        'source-arrow-color': '#2980b9',
        'source-arrow-shape': 'triangle',
      },
    },
]

export default function useCytoscape() {
    const cyRef = useRef(null);
    const containerRef = useRef(null);

    // Initialize Cytoscape
    useEffect(() => {
        const cy = cytoscape({
            container: containerRef.current,
            elements: [],
            style: cyStyles,
            layout: { name: 'preset' },
            userZoomingEnabled: true,
            wheelSensitivity: 0.3,
        });

        cyRef.current = cy;
        return () => cy.destroy();
    }, []);

    // Manual scroll to zoom
    useEffect(() => {
        const container = containerRef.current;
        const cy = cyRef.current;
        if (!container || !cy) return;

        const onWheel = (e) => {
            e.preventDefault();
            const zoomFactor = 1 - e.deltaY * 0.003;
            const rect = container.getBoundingClientRect();
            cy.zoom({
                level: cy.zoom() * zoomFactor,
                renderedPosition: {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                },
            });
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, []);

    return { cyRef, containerRef };
}