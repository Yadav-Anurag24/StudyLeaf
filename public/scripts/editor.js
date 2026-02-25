/**
 * Shared EasyMDE editor initializer for StudyLeaf.
 * Used by both new-note.ejs and edit-note.ejs.
 */
function initEditor(elementId) {
    const editor = new EasyMDE({
        element: document.getElementById(elementId),
        spellChecker: false,
        status: ['words', 'cursor'],
        toolbar: [
            "bold", "italic", "strikethrough", "|",
            "heading-1", "heading-2", "heading-3", "|",
            "quote", "unordered-list", "ordered-list", "|",
            "link", "image",
            {
                name: "upload-image",
                action: function(editor) {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async () => {
                        const file = input.files[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                            alert('Image must be under 5 MB.');
                            return;
                        }
                        const formData = new FormData();
                        formData.append('image', file);
                        try {
                            const res = await fetch('/api/upload', { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.url) {
                                const cm = editor.codemirror;
                                const pos = cm.getCursor();
                                cm.replaceRange(`![${file.name}](${data.url})`, pos);
                            } else {
                                alert(data.error || 'Upload failed.');
                            }
                        } catch (err) {
                            alert('Upload failed. Are you logged in?');
                        }
                    };
                    input.click();
                },
                className: "fa fa-upload",
                title: "Upload Image",
            },
            "|",
            {
                name: "highlight",
                action: function(editor) {
                    const cm = editor.codemirror;
                    const selection = cm.getSelection();
                    cm.replaceSelection(`<mark>${selection}</mark>`);
                },
                className: "fa fa-paint-brush",
                title: "Highlight Text",
            },
            "|",
            "preview", "side-by-side", "fullscreen"
        ]
    });

    // --- Auto-save to localStorage ---
    const storageKey = 'studyleaf-autosave-' + (window.location.pathname || 'new');
    const savedContent = localStorage.getItem(storageKey);
    if (savedContent && !editor.value()) {
        editor.value(savedContent);
    }
    let saveTimeout;
    editor.codemirror.on('change', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            localStorage.setItem(storageKey, editor.value());
        }, 1000);
    });

    // Clear auto-save on form submit
    const form = document.getElementById(elementId)?.closest('form');
    if (form) {
        form.addEventListener('submit', () => {
            localStorage.removeItem(storageKey);
        });
    }

    // --- Keyboard shortcut: Ctrl+S to save ---
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (form) form.submit();
        }
    });

    return editor;
}
