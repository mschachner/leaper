function MenuBar({
    onNew, onOpen, onSave, onSaveAs, onLibrary,
    fileName, isDirty,
    isDirected, onToggleDirected,
}) {
    return (
        <div className="menu-bar">
            <button onClick={onNew}     className="menu-bar-button">New</button>
            <button onClick={onOpen}    className="menu-bar-button">Open</button>
            <button onClick={onSave}    className="menu-bar-button">Save</button>
            <button onClick={onSaveAs}  className="menu-bar-button">Save As</button>
            <button onClick={onLibrary} className="menu-bar-button">Library</button>
            <span className="menu-bar-filename">
                {fileName ? fileName : 'Untitled.leap'}{isDirty ? ' •' : ''}
            </span>

            
        </div>
    );
}

export default MenuBar;
