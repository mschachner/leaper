/*
 * Keep track of the current handle.
 */

let currentFileHandle = null;

/*
 * Check whether the API is available.
 */

export function hasFileSystemAccess() {
    return 'showSaveFilePicker' in window;
}

/*
 * 'Save as...' functionality
 */

export async function saveAs(jsonString) {
    if (!hasFileSystemAccess()) {
        return saveAsFallback(jsonString);
    }

    // Get the handle using API
    const handle = await window.showSaveFilePicker({
        suggestedName: 'graph.leap',
        types: [
            {
                description: 'Leaper graph files',
                accept: { 'application/json': ['.leap']},
            },
        ],
    });

    currentFileHandle = handle;
    const writable = await handle.createWritable();
    await writable.write(jsonString);
    await writable.close();

    return handle.name;
}

/* 
 * Save, using existing file handle if one exists.
 */

export async function save(jsonString) {
    if (!currentFileHandle) {
        return saveAs(jsonString);
    }

    const writable = await currentFileHandle.createWritable();
    await writable.write(jsonString);
    await writable.close();

    return currentFileHandle.name;
}

/*
 * Open via a file picker
 */

export async function openFile() {
    if (!hasFileSystemAccess) {
        return openFileFallback();
    }

    const [handle] = await window.showOpenFilePicker({
        types: [
            {
                description: 'Leaper graph files',
                accept: { 'application/json': ['.leap', '.json'] },
            },
        ],
    });

    currentFileHandle = handle;
    const file = await handle.getFile();
    const text = await file.text();
    return { data: JSON.parse(text), name: handle.name };
}

/*
 * Clear the current file handle.
 */

export function clearFileHandle() {
    currentFileHandle = null;
}

// Fallbacks for Firefox / Safari.

function saveAsFallback(jsonString) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph.leap';
    a.click();
    URL.revokeObjectURL(url);
    return 'graph.leap';
}

function openFileFallback() {
    return new Promise((resolve,reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.leap,.json';
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return reject(new Error('No file selected'));
            const text = await file.text();
            resolve({
                data: JSON.parse(text), name: file.name
            });
        };
        input.click();
    })
}