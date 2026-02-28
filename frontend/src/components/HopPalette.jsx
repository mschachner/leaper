import { shiftCycleNotation } from '../lib/permUtils';

function HopPalette({ hops, onHover, onUnhover, selectedHop, onRemove, onPerform, indexBase = 1, nodeCount = 0 }) {
  if (hops.length === 0) return null;

  return (
    <div className="hop-palette">
      <div className="hop-palette-header">
        Hop Palette
      </div>
      {hops.map((hop, i) => {
        const isSelected = selectedHop &&
          selectedHop.one_line.join(',') === hop.one_line.join(',');
        const isCompatible = hop.one_line.length === nodeCount;

        return (
          <div
            key={i}
            className={`hop-palette-item${isSelected ? ' selected' : ''}`}
            style={isCompatible ? undefined : { opacity: 0.45 }}
            onMouseEnter={() => onHover(hop)}
            onMouseLeave={() => onUnhover()}
            title={isCompatible ? undefined : `Incompatible: hop is for ${hop.one_line.length}-node graph`}
          >
            <span className="hop-palette-cycle">
              {indexBase === 0 ? shiftCycleNotation(hop.cycle, -1) : hop.cycle}
            </span>
            <span className="hop-palette-source">
              {hop.source}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onPerform(hop); }}
              className={`hop-palette-perform ${isCompatible ? 'compatible' : 'incompatible'}`}
              title={isCompatible ? 'Perform this hop' : 'Incompatible with current graph'}
            >
              ▶
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              className="hop-palette-remove"
              title="Remove from palette"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default HopPalette;
