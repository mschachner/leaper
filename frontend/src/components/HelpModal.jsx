import { useState, useRef } from "react";

import './HelpModal.css';

const SECTIONS = [
    {
        id: "hops-and-leaps",
        label: "Hops and leaps"
    },
    {
        id: "getting-started",
        label: "Getting started"
    },
    {
        id: "toolbar",
        label: "The toolbar"
    },
    {
        id: "hop-drawing",
        label: "Hop drawing"
    },
    {
        id: "settings",
        label: "Settings"
    },
    {
        id: "workspace",
        label: "The workspace"
    },
    {
        id: "library",
        label: "The library"
    },
    {
        id: "save-and-load",
        label: "Saving and loading"
    },
    {
        id: "keyboard-shortcuts",
        label: "Keyboard shortcuts"
    },
    {
        id: "about",
        label: "About Leaper"
    }
];

function HelpModal({ onClose }) {
    const [activeSection, setActiveSection] = useState('getting-started');
    const contentRef = useRef(null);

    const scrollTo = (id) => {
        setActiveSection(id);
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="modal-overlay">
            <div className="modal help-modal">
                <div className="modal-header">
                    <h2>Help</h2>
                    <button onClick={onClose} className="modal-close">✕</button>
                </div>
                <div className="help-body">
                    <nav className="help-toc">
                        {SECTIONS.map(s => (
                            <div className="help-toc-row" key={s.id}>
                                <button
                                    className={
                                        `help-toc-item${activeSection === s.id ? '-active' : ''}`
                                    }
                                    onClick={() => scrollTo(s.id)}
                                >
                                {s.label}
                                </button>
                            </div>
                        ))}
                    </nav>
                    <div className="help-content" ref={contentRef}>

<section id="hops-and-leaps">
<h3>Hops and leaps</h3>
<p>Leaper is an interactive tool for exploring <em>leap groups</em> of graphs. If you know what those are, skip to the <a href="#getting-started">Getting started</a> section. Otherwise, consider the following puzzle:</p>
<blockquote className="help-blockquote">
    <p>There are 25 frogs on 25 lilypads, spaced out in a grid like so:</p>
    <table className="frog-grid">
        <tbody>
            <tr>
                <td>🐸</td><td>🐸</td><td>🐸</td><td>🐸</td><td>🐸</td>
            </tr>
            <tr>
                <td>🐸</td><td>🐸</td><td>🐸</td><td>🐸</td><td>🐸</td>
            </tr>
            <tr>
                <td>🐸</td><td>🐸</td><td>🐸</td><td>🐸</td><td>🐸</td>
            </tr>
            <tr>
                <td>🐸</td><td>🐸</td><td>🐸</td><td>🐸</td><td>🐸</td>
            </tr>
            <tr>
                <td>🐸</td><td>🐸</td><td>🐸</td><td>🐸</td><td>🐸</td>
            </tr>
        </tbody>
    </table>
<p>On the count of three, every frog hops to an orthogonally adjacent lilypad. Every frog has to hop; nobody gets to stay still.</p>
    <p>One, two, three... hop!</p>
    <p>...can they do it?</p>
</blockquote>

<p>I won't spoil the answer here. But what we're essentially asking is if the 5-by-5 grid graph admits a permutation of its vertices such that every vertex is mapped to an adjacent vertex. Such a map is called a <strong>hop</strong>, in our parlance.</p>

<p>The question of whether a given graph has a hop is an interesting one, as evidenced by the frogs-and-lilypads puzzle. But we can go a step further! Notice that the permutations of the vertex set of a graph form a <a href="https://en.wikipedia.org/wiki/Group_(mathematics)">group</a>, where the group operation is given by composition. The hops are a subset of this group, but not, in general, a <a href="https://en.wikipedia.org/wiki/Subgroup">subgroup</a>. This is because a composition of two hops need not be a hop. So, instead, we define a <strong>leap</strong> to be any permutation which arises from a sequence of hops chained together. This does form a group; we call it the <strong>leap group</strong> of the graph. Leaper is a tool for computing these and related groups!</p> 

<p>Some additional remarks:</p>
<ul>
    <li>Hops and leaps make sense for directed graphs as well as undirected ones. Accordingly, Leaper supports both!</li>
    <li>We can also restrict attention to the leaps which arise from a composition of a fixed number of hops. This leads to the concept of the <strong>n-th leap group</strong> of a graph, which consists of all the leaps which arise from compositions of hops of length divisible by n. (For undirected graphs, this is only interesting for n=1 and n=2.)</li>
</ul>

<p>Many questions remain unanswered about hops and leaps. Part of the goal of this project is to provide the tools necessary to explore them.</p>

</section>

<section id="getting-started">
<h3>Getting started</h3>
<p>The interface consists of a few main components:</p>
<ul>
    <li>the <strong>canvas</strong>, which displays the current graph;</li>
    <li>the <strong>menu bar</strong>, containing file operations, graph generation, and the library;</li>
    <li>the <strong>toolbar</strong>, containing the graph editor buttons, the hop drawing tool, and the settings menu; and</li>
    <li>the <strong>sidebar</strong>, which contains a working leap section, a hop palette, a control panel, and a workspace notebook.</li>
</ul>

<p>The canvas is the main area of the interface. It displays the current graph, and allows you to edit it. Try clicking on the canvas to add vertices, and then click 'Edge' in the toolbar to add edges. When adding an edge, you first select the source vertex, and then the target vertex.</p>

<p>The menu bar contains the file operations, graph generation, and the library. Leaper uses a bespoke file format <code>.leap</code> for saving and loading graphs and computations. Try clicking 'New' to create a new graph, 'Open' to open a graph from a file, 'Save' to save the current graph to a file, and 'Save as...' to save the current graph to a file with a different name. You can also click 'Random graph...' to generate a random graph.</p>

<p>The toolbar contains the graph editor buttons, the hop drawing tool, and the settings menu. The graph editor buttons allow you to add and delete vertices and edges. The hop drawing tool allows you to manually define a permutation by clicking vertex pairs (source → target). Once all vertices are assigned, you can verify whether it's a valid hop on the current graph. The settings menu allows you to change the layout of the graph, the labels of the vertices, and the settings of the graph.</p>

<p>The sidebar contains a working leap section, a hop palette, a control panel, and a workspace notebook. The working leap section displays the current working leap, and allows you to edit it by performing hops. The hop palette displays the hops that have been pinned for the current graph. The control panel contains the computation controls, and the workspace records computation history.</p>

<p> Detailed instructions for each of these components are given in the following sections.</p>

</section>
                        
<section id="toolbar">
<h3>The toolbar</h3>
<p>The toolbar allows you to add and delete vertices and edges. The graph editor has four modes:</p>
<ul>
    <li><strong>Pan/Select</strong>: selection and panning modes.</li>
    <li><strong>Add vertex</strong>: click the canvas to add a vertex.</li>
    <li><strong>Add edge</strong>: click two vertices to add an edge.</li>
    <li><strong>Delete</strong>: click to delete the selected element(s).</li>
</ul>
<p>The Select and Pan modes change the behavior on dragging:</p>
<ul>
    <li><strong>Select</strong>: click and drag to move, box-select to select multiple.</li>
    <li><strong>Pan</strong>: click and drag to pan the canvas.</li>
</ul>
<p> The toolbar also contains the hop drawing tool and the settings menu, which are covered in the following sections.</p>
</section>

<section id="hop-drawing">
<h3>Hop drawing</h3>
<p>The hop drawing tool allows you to manually define a permutation by clicking vertex pairs (source → target). Once all vertices are assigned, you can verify whether it's a valid hop on the current graph.</p>

<p>To use the hop drawing tool, click the 'Draw hop' button in the toolbar. This will activate the hop drawing mode. Click a vertex to set the source, and then click another vertex to set the target. Once all vertices have been assigned, you can verify whether it's a valid hop on the current graph.</p>

<p>Note that the UI will allow you to define an invalid hop, such as one which maps two vertices to the same vertex. You can undo your last assignment by clicking the 'Undo last' button in the status bar. You can also cancel the hop drawing mode by clicking the 'Cancel' button in the status bar.</p>
</section>

<section id="settings">
<h3>Settings</h3>
<p>The settings menu allows you to change the layout of the graph, the labels of the vertices, and the settings of the graph. The settings menu has the following options:</p>
<ul>
    <li><strong>Layout</strong>: change the layout of the graph (Circle, Grid, Tree, Force-Directed).</li>
    <li><strong>Labels</strong>: show or hide the labels of the vertices.</li>
    <li><strong>Directed</strong>: toggle between directed and undirected graphs.</li>
    <li><strong>Indexing</strong>: change the indexing of the vertices (0 or 1).</li>
</ul>
</section>

<section id="workspace">
<h3>The workspace</h3>
<p>The workspace is a notebook that allows you to (1) perform and recall computations, (2) visualize hops, and (3) pin hops to a hop palette, performing them to create a "working leap".</p>
<p>To perform a computation, click the 'Compute' button in the toolbar. The computation will populate in the workspace notebook. Note that computing hops and leaps is O(n!) in the number of vertices, so graphs with more than 8 or so vertices may take a while to compute.</p>
<p>Currently, the workspace notebook supports the following computations:</p>
<ul>
    <li><strong>Leap group</strong>: compute the leap group of the current graph.</li>
    <li><strong>All hops</strong>: compute all hops on the current graph.</li>
    <li><strong>One hop</strong>: compute a single hop on the current graph.</li>
</ul>
<p>Some other notes about the workspace notebook:</p>
<ul>
    <li>The workspace notebook is saved and loaded with the current graph.</li>
</ul>
<p>To visualize a hop, hover over the hop in the workspace notebook. A red dashed arrow will appear showing the path of the hop. You can also click the ▶ button to perform the hop. This will animate the vertices to their new positions with a brief flash of the labels.</p>
<p>To pin a hop to the hop palette, click the 'pin' button in the workspace notebook. The hop will be added to the hop palette. You can then perform the hop by clicking the ▶ button in the hop palette.</p>
</section>

<section id="library">
<h3>The library</h3>
<p>The library is a collection of graphs that you can load into the current graph. The library is organized into categories, and you can search for graphs by name.</p>
<p>To load a graph from the library, click the 'Load' button in the library. The graph will be loaded into the current graph.</p>
</section>

<section id="save-and-load">
<h3>Saving and loading</h3>
<p>Leaper uses a bespoke file format <code>.leap</code> for saving and loading graphs and computations. To save the current graph, click the 'Save' button in the menu bar. To load a graph from a file, click the 'Open' button in the menu bar.</p>
</section>

<section id="keyboard-shortcuts">
<h3>Keyboard shortcuts</h3>
<p>Leaper has the following keyboard shortcuts:</p>
<table className="keyboard-shortcut-table">
    <thead>
        <tr>
            <th>Shortcut</th>
            <th>Action</th>
        </tr>
    </thead>
    <tbody>
        <tr><td><kbd>Cmd/Ctrl</kbd> + <kbd>S</kbd></td><td>Save the current graph</td></tr>
        <tr><td><kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd></td><td>Save the current graph as</td></tr>
        <tr><td><kbd>Cmd/Ctrl</kbd> + <kbd>O</kbd></td><td>Open a graph from a file</td></tr>
        <tr><td><kbd>Cmd/Ctrl</kbd> + <kbd>Z</kbd></td><td>Undo the last action</td></tr>
        <tr><td><kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></td><td>Redo the last action</td></tr>
        <tr><td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td><td>Delete the selected element</td></tr>
        <tr><td><kbd>Escape</kbd></td><td>Close the current modal</td></tr>
        <tr><td><kbd>?</kbd></td><td>Open the help modal</td></tr>
    </tbody>
</table>
</section>

<section id="about">
    <h3>About Leaper</h3>
    <p>Leaper was made in React by <a href="https://mark-schachner.com">Mark Schachner</a>. You can find the github repo <a href="https://github.com/mschachner/leaper?tab=readme-ov-file">here</a>. The theory of hops and leaps has had many contributors, including but not limited to Gabe Udell, Kimball Strong, Emmy Marra, Nikhil Sahoo, and Chase Vogeli.</p>
</section>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default HelpModal;