import { useState } from 'react';
import { shiftCycleNotation } from '../lib/permUtils';

function NotebookEntry({ entry, onRemove, onHoverHop, onUnhoverHop, selectedHop, onPerformHop, onViewSnapshot, onPinHop, indexBase = 1 }) {
    return (
        <div className="notebook-entry">
            {/* Dismiss button */}
            <button
                onClick={() => onRemove(entry.id)}
                className="notebook-entry-dismiss"
                title="Remove this entry"
            >
                ✕
            </button>

            {/* Header */}
            <EntryHeader
                entry={entry}
                onViewSnapshot={onViewSnapshot}
            />

            {/* Body - switches on entry type */}
            <EntryBody
                entry={entry}
                onHoverHop={onHoverHop}
                onUnhoverHop={onUnhoverHop}
                selectedHop={selectedHop}
                onPerformHop={onPerformHop}
                onPinHop={onPinHop}
                indexBase={indexBase}
            />
        </div>
    );
}

function EntryHeader({ entry, onViewSnapshot }) {
    const time = new Date(entry.timestamp).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });

    let title;
    switch (entry.type) {
        case 'leap-group':
            title = `Leap group, n=${entry.params.n}`;
            break;
        case 'hops':
            title='Found all hops';
            break;
        case 'hop':
            title='Found one hop';
            break;
        default:
            title = entry.type;
    }

    return (
        <div className="entry-header">
            <div>
                <span className="entry-header-title">
                    {title}
                </span>
                {entry.graphSnapshot && (
                    <button
                        onClick={() => onViewSnapshot(entry.graphSnapshot)}
                        className="entry-header-see-graph"
                    >
                        see graph
                    </button>
                )}
            </div>
            <span className="entry-header-meta">
                {time}
                {entry.elapsed && ` • ${entry.elapsed}s`}
            </span>
        </div>
    );
}

function EntryBody({ entry, onHoverHop, onUnhoverHop, selectedHop, onPerformHop, onPinHop, indexBase }) {
    switch (entry.type) {
        case 'leap-group':
            return <LeapGroupBody result={entry.result} />;
        case 'hops':
        case 'hop':
            return <HopsBody
                        result={entry.result}
                        onHoverHop={onHoverHop}
                        onUnhoverHop={onUnhoverHop}
                        selectedHop={selectedHop}
                        onPerformHop={onPerformHop}
                        onPinHop={onPinHop}
                        indexBase={indexBase}
            />;
        default:
            return <div className="entry-body-unknown">
                Unknown entry type
            </div>
    }
}

function LeapGroupBody({ result }) {
    return (
        <div className="leap-group-body">
            <div className="leap-group-structure">
                {result.structure}
            </div>
            <div className="leap-group-order">
                Order: {result.order}
            </div>
        </div>
    );
}

function HopsBody({ result, onHoverHop, onUnhoverHop, selectedHop, onPerformHop, onPinHop, indexBase }) {
    const [expanded, setExpanded] = useState(false);
    const PREVIEW_COUNT = 5;

    if (result.count === 0) {
        return (
            <div className="hops-body-empty">
                No hops found
            </div>
        );
    }

    const hopsToShow = expanded ? result.hops : result.hops.slice(0, PREVIEW_COUNT);
    const hasMore = result.hops.length > PREVIEW_COUNT;

    return (
        <div className="hops-body">
            <div className="hops-body-count">
                {result.count} hop{result.count !== 1 ? 's' : ''} found
            </div>
            {hopsToShow.map((hop, i) => (
                <HopItem
                    key={i}
                    hop={hop}
                    selected={
                        selectedHop && selectedHop.one_line.join(',') === hop.one_line.join(',')
                    }
                    onHover={() => onHoverHop(hop)}
                    onUnhover={onUnhoverHop}
                    onPerform={onPerformHop ? () => onPerformHop(hop) : null}
                    onPin={onPinHop ? () => onPinHop(hop) : null}
                    indexBase={indexBase}
                />
            ))}
            {hasMore && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="hops-body-toggle"
                >
                    {expanded
                        ? 'Show fewer'
                        : `Show all ${result.count} hops...`
                    }
                </button>
            )}
        </div>
    );
}

function HopItem({ hop, selected, onHover, onUnhover, onPerform, onPin, indexBase = 1 }) {
    // Backend cycles/one_line are always 1-indexed; shift for 0-indexed display
    const displayCycle = indexBase === 0 ? shiftCycleNotation(hop.cycle, -1) : hop.cycle;
    const displayOneLine = indexBase === 0
        ? hop.one_line.map((v) => v - 1)
        : hop.one_line;

    return (
        <div
            onMouseEnter={() => onHover()}
            onMouseLeave={() => onUnhover()}
            className={`hop-item${selected ? ' selected' : ''}`}
            title={`One-line: [${displayOneLine.join(', ')}]`}
        >
            <span className="hop-item-cycle">{displayCycle}</span>
            {onPerform && (
                <button
                    onClick={(e) => { e.stopPropagation(); onPerform(); }}
                    className="hop-item-perform"
                    title="Perform this hop"
                >
                    ▶
                </button>
            )}
            {onPin && (
                <button
                    onClick={(e) => { e.stopPropagation(); onPin(); }}
                    className="hop-item-pin"
                    title="Pin to hop palette"
                >
                    pin
                </button>
            )}
        </div>
    );
}

export default NotebookEntry;
