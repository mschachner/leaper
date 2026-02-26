/**
 * Settings modal — extensible container for app-wide preferences.
 * Currently includes: graph layout, label visibility, index base.
 */
function SettingsModal({ onClose, cyRef, showLabels, setShowLabels, indexBase, setIndexBase }) {

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
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        color: '#333',
        borderRadius: '8px',
        width: '380px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Settings</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#888',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Layout section */}
          <SettingsSection title="Layout">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { value: 'circle', label: 'Circle' },
                { value: 'grid', label: 'Grid' },
                { value: 'breadthfirst', label: 'Tree' },
                { value: 'cose', label: 'Force-Directed' },
              ].map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => applyLayout(layout.value)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    background: '#f8f8f8',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#333',
                  }}
                >
                  {layout.label}
                </button>
              ))}
            </div>
          </SettingsSection>

          {/* Display section */}
          <SettingsSection title="Display">
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '14px', cursor: 'pointer',
            }}>
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
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { value: 0, label: '0-indexed', desc: 'Vertices: 0, 1, 2, ...' },
                { value: 1, label: '1-indexed', desc: 'Vertices: 1, 2, 3, ...' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    cursor: 'pointer',
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${indexBase === opt.value ? '#4a90d9' : '#ddd'}`,
                    background: indexBase === opt.value ? '#e8f0fe' : '#fff',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="indexBase"
                    checked={indexBase === opt.value}
                    onChange={() => setIndexBase(opt.value)}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </SettingsSection>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 20px',
              borderRadius: '4px',
              border: '1px solid #4a90d9',
              background: '#4a90d9',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
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
      <div style={{
        fontSize: '11px',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '8px',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default SettingsModal;
