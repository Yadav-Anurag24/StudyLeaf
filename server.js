// 1. Import necessary packages
require('dotenv').config();
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const { marked } = require('marked');
const mongoose = require('mongoose');
const Note = require('./models/Note');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');

// --- ENVIRONMENT VARIABLE VALIDATION ---
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET', 'ADMIN_PASSWORD_HASH'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

// 2. Constants & Middleware Setup
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// Gatekeeper Middleware: Checks if a user is logged in
const requireLogin = (req, res, next) => {
    if (req.session && req.session.isLoggedIn) { // Added a check for req.session
        next(); // User is logged in, proceed
    } else {
        res.redirect('/login'); // User is not logged in, redirect
    }
};

// 3. Configure Express App
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(expressLayouts);
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- SECURITY: Helmet for HTTP security headers ---
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",  // Required for EasyMDE inline scripts
                "https://unpkg.com",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",  // Required for EasyMDE & inline styles
                "https://unpkg.com",
                "https://cdnjs.cloudflare.com",
                "https://maxcdn.bootstrapcdn.com"  // Font Awesome for EasyMDE icons
            ],
            fontSrc: ["'self'", "https://maxcdn.bootstrapcdn.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],  // Allow external images in notes
            connectSrc: ["'self'"]
        }
    }
}));

// --- SECURITY: Rate limit on login to prevent brute-force ---
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                    // 5 attempts per window
    message: 'Too many login attempts. Please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false
});

// THIS MUST COME AFTER THE CONFIGS ABOVE AND BEFORE YOUR ROUTES
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.DATABASE_URL, // Use the same database connection string
        collectionName: 'sessions' // Name of the collection to store sessions
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
}));

// 4. Define Routes

// --- CORE PAGES & AUTH (No change here) ---
app.get('/about', (req, res) => {
    res.render('about', { title: 'About', description: 'Learn more about StudyLeaf — a personal digital notebook and learning journal.' });
});
app.get('/login', (req, res) => {
    res.render('login', { title: 'Login', description: 'Log in to manage your StudyLeaf notes.', error: null });
});
app.post('/login', loginLimiter, async (req, res) => {
    try {
        const isMatch = await bcrypt.compare(req.body.password, ADMIN_PASSWORD_HASH);
        if (isMatch) {
            req.session.isLoggedIn = true;
            res.redirect('/');
        } else {
            res.render('login', { title: 'Login', description: 'Log in to manage your StudyLeaf notes.', error: 'Incorrect password.' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.render('login', { title: 'Login', description: 'Log in to manage your StudyLeaf notes.', error: 'An error occurred. Please try again.' });
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// --- DATABASE-DRIVEN ROUTES ---

const NOTES_PER_PAGE = 10;

// GET Homepage: Fetch all notes from DB (with pagination)
app.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const totalNotes = await Note.countDocuments();
        const totalPages = Math.ceil(totalNotes / NOTES_PER_PAGE);
        const notes = await Note.find()
            .sort({ date: -1 })
            .skip((page - 1) * NOTES_PER_PAGE)
            .limit(NOTES_PER_PAGE);

        res.render('index', {
            title: 'Home',
            description: 'Browse all notes on StudyLeaf — a personal learning journal.',
            notes: notes,
            currentPage: page,
            totalPages: totalPages,
            basePath: '/'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { title: 'Error', statusCode: 500, message: 'Failed to load notes.' });
    }
});

// GET Search: Find notes in DB (with pagination)
app.get('/search', async (req, res) => {
    const query = req.query.query;
    if (!query) return res.redirect('/');
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const searchQuery = new RegExp(query, 'i');
        const filter = {
            $or: [{ title: { $regex: searchQuery } }, { content: { $regex: searchQuery } }]
        };
        const totalResults = await Note.countDocuments(filter);
        const totalPages = Math.ceil(totalResults / NOTES_PER_PAGE);
        const results = await Note.find(filter)
            .sort({ date: -1 })
            .skip((page - 1) * NOTES_PER_PAGE)
            .limit(NOTES_PER_PAGE);

        res.render('search-results', {
            title: 'Search Results',
            description: `Search results for "${query}" on StudyLeaf.`,
            results: results,
            query: query,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { title: 'Error', statusCode: 500, message: 'Failed to load search results.' });
    }
});

// GET Create a new note form (No change here)
app.get('/note/new', requireLogin, (req, res) => {
    res.render('new-note', { title: 'New Note', description: 'Create a new note on StudyLeaf.' });
});

// GET Filter notes by tag (with pagination)
app.get('/tags/:tag', async (req, res) => {
    const tag = req.params.tag;
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const filter = { tags: tag };
        const totalNotes = await Note.countDocuments(filter);
        const totalPages = Math.ceil(totalNotes / NOTES_PER_PAGE);
        const notes = await Note.find(filter)
            .sort({ date: -1 })
            .skip((page - 1) * NOTES_PER_PAGE)
            .limit(NOTES_PER_PAGE);

        res.render('index', {
            notes: notes,
            title: `Tag: ${tag}`,
            description: `Notes tagged with "${tag}" on StudyLeaf.`,
            currentPage: page,
            totalPages: totalPages,
            basePath: `/tags/${tag}`
        });
    } catch (e) {
        res.status(500).render('error', { title: 'Error', statusCode: 500, message: 'Failed to load notes for this tag.' });
    }
});

// POST Create a new note in DB
app.post('/note/new', requireLogin, async (req, res) => {
    // 1. Get tags from req.body along with title and content
    const { title, content, tags } = req.body;

    if (!title || !content) return res.status(400).render('error', { title: 'Error', statusCode: 400, message: 'Title and content are required.' });

    // 2. Process the tags string into an array
    // Example: "React, Node,  " becomes ["React", "Node"]
    const tagsList = tags 
        ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

    // Create the slug (URL-friendly title)
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    const newNote = new Note({
        title: title,
        slug: slug,
        content: content,
        date: new Date(),
        tags: tagsList // <--- 3. Save the array of tags here
    });

    try {
        await newNote.save();
        res.redirect(`/note/${slug}`);
    } catch (err) {
        if (err.code === 11000) { // Handle duplicate slug error
            return res.status(400).render('error', { title: 'Error', statusCode: 400, message: 'A note with this title already exists.' });
        }
        console.error(err);
        res.status(500).render('error', { title: 'Error', statusCode: 500, message: 'Failed to save the note.' });
    }
});

// GET Edit an existing note form
app.get('/note/:slug/edit', requireLogin, async (req, res) => {
    try {
        const note = await Note.findOne({ slug: req.params.slug });
        if (!note) return res.status(404).render('404', { title: 'Not Found' });
        // Format date to YYYY-MM-DD for the input field
        const formattedDate = note.date.toISOString().slice(0, 10);
        res.render('edit-note', {
            title: 'Edit Note',
            description: `Editing "${note.title}" on StudyLeaf.`,
            note: { title: note.title, content: note.content, date: formattedDate },
            slug: note.slug,
            marked: marked
        });
    } catch (err) {
        res.status(500).render('error', { title: 'Error', statusCode: 500, message: 'Failed to load note for editing.' });
    }
});

// POST Update an existing note
app.post('/note/:slug/edit', requireLogin, async (req, res) => {
    // 1. Get content, date, and tags from the form
    const { content, date, tags } = req.body;

    // 2. Process the tags string into an array
    const tagsList = tags 
        ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

    try {
        // 3. Find the note by the URL slug and update its fields
        await Note.findOneAndUpdate(
            { slug: req.params.slug }, // Find by the slug in the URL
            {
                content: content,
                date: new Date(date), // Update the date
                tags: tagsList // <--- Update the tags array
            }
        );

        // 4. Redirect back to the note reading page
        res.redirect(`/note/${req.params.slug}`);
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { title: 'Error', statusCode: 500, message: 'Failed to update the note.' });
    }
});

// POST Delete a note from DB
app.post('/note/:slug/delete', requireLogin, async (req, res) => {
    try {
        await Note.findOneAndDelete({ slug: req.params.slug });
        res.redirect('/');
    } catch (err) {
        res.status(500).render('error', { title: 'Error', statusCode: 500, message: 'Failed to delete the note.' });
    }
});

// GET Read a single note from DB (Must be the last GET /note/... route)
app.get('/note/:slug', async (req, res) => {
    try {
        const note = await Note.findOne({ slug: req.params.slug });
        if (!note) return res.status(404).render('404', { title: 'Not Found' });

        // Calculate reading time (average 200 words per minute)
        const wordCount = note.content.split(/\s+/).filter(w => w.length > 0).length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));

        // Render Markdown with sanitization (allow only safe tags like <mark>)
        const htmlContent = marked(note.content, {
            breaks: true,
            gfm: true
        });

        // Generate Table of Contents from rendered headings (h2 and h3)
        const tocItems = [];
        const headingRegex = /<h([23])(?:\s[^>]*)?>(.+?)<\/h[23]>/gi;
        let match;
        let headingIndex = 0;
        let contentWithIds = htmlContent;

        // First pass: collect headings
        const matches = [];
        while ((match = headingRegex.exec(htmlContent)) !== null) {
            matches.push({ level: parseInt(match[1]), text: match[2], fullMatch: match[0] });
        }

        // Second pass: add IDs to headings and build TOC
        matches.forEach((m, i) => {
            const slug = m.text
                .replace(/<[^>]+>/g, '')  // Strip any inline HTML tags
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
            const id = `heading-${slug}-${i}`;
            const headingWithId = `<h${m.level} id="${id}">${m.text}</h${m.level}>`;
            contentWithIds = contentWithIds.replace(m.fullMatch, headingWithId);
            tocItems.push({
                level: m.level,
                text: m.text.replace(/<[^>]+>/g, ''),  // Plain text for TOC
                id: id
            });
        });

        // Find related notes that share tags with the current note
        let relatedNotes = [];
        if (note.tags && note.tags.length > 0) {
            relatedNotes = await Note.find({
                tags: { $in: note.tags },
                _id: { $ne: note._id }
            })
            .sort({ date: -1 })
            .limit(4)
            .select('title slug tags date');
        }

        // Generate a plain-text description from Markdown content (first 160 chars)
        const plainDescription = note.content
            .replace(/[#*_`~>\-\[\]()!|]/g, '')  // Strip Markdown syntax
            .replace(/<[^>]+>/g, '')               // Strip HTML tags
            .replace(/\s+/g, ' ')                  // Collapse whitespace
            .trim()
            .slice(0, 160);

        res.render('note', {
            title: note.title,
            description: plainDescription,
            ogType: 'article',
            content: contentWithIds,
            slug: note.slug,
            date: note.date,
            tags: note.tags || [],
            readingTime: readingTime,
            wordCount: wordCount,
            relatedNotes: relatedNotes,
            tocItems: tocItems
        });
    } catch (err) {
        res.status(500).render('error', { title: 'Error', statusCode: 500, message: 'Failed to load this note.' });
    }
});

// --- GLOBAL ERROR HANDLERS (must be after all routes) ---

// 404 — Catch-all for unmatched routes
app.use((req, res) => {
    res.status(404).render('404', { title: 'Not Found' });
});

// 500 — Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).render('error', {
        title: 'Error',
        statusCode: err.status || 500,
        message: err.message || 'An unexpected error occurred.'
    });
});

// 5. Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});