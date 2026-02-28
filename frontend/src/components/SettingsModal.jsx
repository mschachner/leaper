/**
 * Settings modal — extensible container for app-wide preferences.
 * Currently includes: graph layout, label visibility, index base.
 */
function SettingsModal({
  onClose, 
  cyRef, 
  showLabels, setShowLabels,
  indexBase, setIndexBase,
  isDirected, onToggleDirected}) {

  const applyLayout = (name) => {
    if (name && cyRef.current) {
      cyRef.current.layout({
        name,
        animate: true,
        animationDuration: 500,
        animationEasing: 'ease-out',
      }).run();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="settings-modal">
        {/* Header */}
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <button
            onClick={onClose}
            className="modal-close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="settings-body">

          {/* Directed/Undirected toggle */}
          <SettingsSection title="Graph type">
          <div>
            <button
                onClick={isDirected ? onToggleDirected : undefined}
                className={`segment-button segment-button-left${!isDirected ? ' active' : ''}`}
            >
              Undirected
            </button>
            <button
                onClick={!isDirected ? onToggleDirected : undefined}
                className={`segment-button segment-button-right${isDirected ? ' active' : ''}`}
            >
              Directed
            </button>
            </div>
          </SettingsSection>
          
          {/* Layout section */}
          <SettingsSection title="Layout">
            <div className="settings-layout-buttons">
              {[
                { value: 'circle', label: 'Circle' },
                { value: 'grid', label: 'Grid' },
                { value: 'breadthfirst', label: 'Tree' },
                { value: 'cose', label: 'Force-Directed' },
              ].map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => applyLayout(layout.value)}
                  className="toolbar-button"
                >
                  {layout.label}
                </button>
              ))}
            </div>
          </SettingsSection>

          {/* Display section */}
          <SettingsSection title="Display">
            <label className="settings-display-label">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              Show vertex labels
            </label>
          </SettingsSection>

          {/* Indexing section */}
          <SettingsSection title="Indexing">
            <div className="settings-index-options">
              {[
                { value: 0, label: '0-indexed', desc: 'Vertices: 0, 1, 2, ...' },
                { value: 1, label: '1-indexed', desc: 'Vertices: 1, 2, 3, ...' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`settings-index-option${indexBase === opt.value ? ' active' : ''}`}
                >
                  <input
                    type="radio"
                    name="indexBase"
                    checked={indexBase === opt.value}
                    onChange={() => setIndexBase(opt.value)}
                    className="settings-index-radio"
                  />
                  <div>
                    <div className="settings-index-label">{opt.label}</div>
                    <div className="settings-index-desc">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </SettingsSection>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button
            onClick={onClose}
            className="settings-done"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/** Reusable section wrapper for settings groups. */
function SettingsSection({ title, children }) {
  return (
    <div>
      <div className="settings-section-title">
        {title}
      </div>
      {children}
    </div>
  );
}

export default SettingsModal;
