// 1. Import necessary packages
const express = require('express');
const path = require('path');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { marked } = require('marked');
const matter = require('gray-matter'); // For parsing front-matter

// 2. Constants & Middleware Setup
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = 'dazaiOsamu#24'; // Change this!

// Gatekeeper Middleware: Checks if a user is logged in
const requireLogin = (req, res, next) => {
    if (req.session.isLoggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
};

// 3. Configure Express App
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    store: new FileStore(),
    secret: 'Real Monsters are those who always tell lies.', // Change this!
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// 4. Define Routes

// --- CORE PAGES & AUTH ---
app.get('/', (req, res) => {
    const notesDirectory = path.join(__dirname, 'notes');
    fs.readdir(notesDirectory, (err, files) => {
        if (err) {
            console.error("Could not list the directory.", err);
            return res.status(500).send("Server Error");
        }
        const notes = files
            .filter(file => path.extname(file) === '.md')
            .map(file => {
                const filePath = path.join(notesDirectory, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const { data } = matter(fileContent); // Use gray-matter
                const slug = path.basename(file, '.md');
                const title = slug.replace(/-/g, ' ');
                return {
                    title: title.charAt(0).toUpperCase() + title.slice(1),
                    slug: slug,
                    date: data.date || null
                };
            });
        // Sort notes by date, newest first
        notes.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.render('index', { title: 'Home', notes: notes });
    });
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About' });
});

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login', error: null });
});

app.post('/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        req.session.isLoggedIn = true;
        res.redirect('/');
    } else {
        res.render('login', { title: 'Login', error: 'Incorrect password.' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// --- SEARCH ROUTE ---
app.get('/search', (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.redirect('/'); // If no query, just go home
    }

    const notesDirectory = path.join(__dirname, 'notes');
    const allFiles = fs.readdirSync(notesDirectory);
    const searchResults = [];

    allFiles.forEach(file => {
        if (path.extname(file) === '.md') {
            const filePath = path.join(notesDirectory, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const { data, content } = matter(fileContent);

            const slug = path.basename(file, '.md');
            const title = slug.replace(/-/g, ' ');

            // Check if the title or content includes the query (case-insensitive)
            if (title.toLowerCase().includes(query.toLowerCase()) || content.toLowerCase().includes(query.toLowerCase())) {
                searchResults.push({
                    title: title.charAt(0).toUpperCase() + title.slice(1),
                    slug: slug,
                    date: data.date || null
                });
            }
        }
    });

    // Sort results by date
    searchResults.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.render('search-results', {
        title: 'Search Results',
        results: searchResults,
        query: query
    });
});

// --- PROTECTED NOTE ROUTES (CRUD) ---

// Create a new note (GET form)
app.get('/note/new', requireLogin, (req, res) => {
    res.render('new-note', { title: 'New Note' });
});

// Create a new note (POST data)
app.post('/note/new', requireLogin, (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).send("Title and content are required.");
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const filePath = path.join(__dirname, 'notes', `${slug}.md`);
    // Add front-matter with today's date
    const date = new Date().toISOString().slice(0, 10);
    const fileContent = `---\ndate: ${date}\n---\n\n${content}`;
    fs.writeFile(filePath, fileContent, (err) => {
        if (err) return res.status(500).send("Failed to save the note.");
        res.redirect(`/note/${slug}`);
    });
});

// Edit an existing note (GET form)
app.get('/note/:slug/edit', requireLogin, (req, res) => {
    const slug = req.params.slug;
    const filePath = path.join(__dirname, 'notes', `${slug}.md`);
    fs.readFile(filePath, 'utf8', (err, fileContent) => {
        if (err) return res.status(404).send("Note not found.");
        const { data, content } = matter(fileContent);
        const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const note = { title: title, content: content, date: data.date };
        res.render('edit-note', { title: 'Edit Note', note: note, slug: slug });
    });
});

// Edit an existing note (POST data)
app.post('/note/:slug/edit', requireLogin, (req, res) => {
    const slug = req.params.slug;
    const { title, content, date } = req.body; // Assume date and title can be edited
    const filePath = path.join(__dirname, 'notes', `${slug}.md`);
    const fileContent = `---\ndate: ${date}\n---\n\n${content}`;
    fs.writeFile(filePath, fileContent, (err) => {
        if (err) return res.status(500).send("Failed to update the note.");
        res.redirect(`/note/${slug}`);
    });
});

// --- DELETE ROUTE ---

// POST Route: Delete a note file
app.post('/note/:slug/delete', requireLogin, (req, res) => {
    const slug = req.params.slug;
    const filePath = path.join(__dirname, 'notes', `${slug}.md`);

    // Use fs.unlink to delete the file
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error("Error deleting file:", err);
            return res.status(500).send("Failed to delete the note.");
        }
        // On successful deletion, redirect to the homepage
        res.redirect('/');
    });
});

// Read a single note (This MUST be the last GET /note/... route)
app.get('/note/:slug', (req, res) => {
    const slug = req.params.slug;
    const filePath = path.join(__dirname, 'notes', `${slug}.md`);
    fs.readFile(filePath, 'utf8', (err, fileContent) => {
        if (err) return res.status(404).send("Note not found.");
        const { content } = matter(fileContent); // Separate content from front-matter
        const htmlContent = marked(content);
        const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        res.render('note', { title: title, content: htmlContent, slug: slug });
    });
});

// 5. Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});