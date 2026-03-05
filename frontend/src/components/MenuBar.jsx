import Randomizer from "./Randomizer";

function MenuBar({
    onNew,
    onOpen,
    onSave,
    onSaveAs,
    onLibrary,
    randomizerOpen, setRandomizerOpen,
    randomValues, setRandomValues,
    onGenerate,
    setHelpOpen,
    fileName, isDirty,
}) {
    return (
        <div className="menu-bar">
            <span className="menu-bar-filename">
                {fileName ? fileName : 'Untitled.leap'}{isDirty ? ' •' : ''}
            </span>
            <button onClick={onNew}        className="menu-bar-button">New</button>
            <button onClick={onOpen}       className="menu-bar-button">Open</button>
            <button onClick={onSave}       className="menu-bar-button">Save</button>
            <button onClick={onSaveAs}     className="menu-bar-button">Save as...</button>
            <button onClick={onLibrary}    className="menu-bar-button">Library</button>
            <div className="menubar-randomizer">
                <button onClick={() => setRandomizerOpen(true)} className="menu-bar-button">Random graph....</button>
                {randomizerOpen && (
                    <Randomizer
                    randomValues={randomValues}
                    setRandomValues={setRandomValues}
                    onClose={() => setRandomizerOpen(false)}
                    onGenerate={onGenerate}
                />
                )}
            </div>
            <button onClick={() => setHelpOpen(true)}     className="menu-bar-button">Help</button>
        </div>
    );
}

export default MenuBar;
