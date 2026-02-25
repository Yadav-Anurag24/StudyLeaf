// 1. Import necessary packages
require('dotenv').config();
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const { marked } = require('marked');
const { renderMarkdown, getReadingStats, generateTOC, getPlainDescription } = require('./utils/markdownParser');
const mongoose = require('mongoose');
const Note = require('./models/Note');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const multer = require('multer');
const flash = require('connect-flash');
const compression = require('compression');

// --- MULTER CONFIG: Image uploads ---
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'public', 'uploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|svg/;
        const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimeOk = allowed.test(file.mimetype);
        if (extOk && mimeOk) return cb(null, true);
        cb(new Error('Only image files (jpg, png, gif, webp, svg) are allowed.'));
    }
});

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

// Ensure uploads directory exists
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

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
app.use(compression()); // Gzip compression for all responses
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',   // Cache static assets for 7 days
    etag: true       // Enable ETag for cache validation
}));

// Serve uploads from /tmp on Vercel (read-only filesystem)
if (process.env.VERCEL) {
    app.use('/uploads', express.static('/tmp/uploads'));
}

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

// --- FLASH MESSAGES ---
app.use(flash());
app.use((req, res, next) => {
    res.locals.flashSuccess = req.flash('success');
    res.locals.flashError = req.flash('error');
    res.locals.isLoggedIn = req.session && req.session.isLoggedIn;
    next();
});

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

// --- IMAGE UPLOAD API ---
app.post('/api/upload', requireLogin, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// --- TAG CLOUD PAGE ---
app.get('/tags', async (req, res) => {
    try {
        const tags = await Note.aggregate([
            { $match: { status: { $ne: 'draft' } } },
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const maxCount = tags.length > 0 ? tags[0].count : 1;
        res.render('tags', {
            title: 'All Tags',
            description: 'Browse all tags on StudyLeaf.',
            tags: tags,
            maxCount: maxCount
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { title: 'Error', statusCode: 500, message: 'Failed to load tags.' });
    }
});

// --- RSS FEED ---
app.get('/feed', async (req, res) => {
    try {
        const notes = await Note.find({ status: { $ne: 'draft' } }).sort({ date: -1 }).limit(20);
        const siteUrl = `${req.protocol}://${req.get('host')}`;

        const escapeXml = (str) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        const itemsXml = notes.map(note => {
            const description = note.content
                .replace(/[#*_`~>\-\[\]()!|]/g, '')
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 300);

            return `
        <item>
            <title>${escapeXml(note.title)}</title>
            <link>${siteUrl}/note/${note.slug}</link>
            <guid>${siteUrl}/note/${note.slug}</guid>
            <pubDate>${new Date(note.date).toUTCString()}</pubDate>
            <description>${escapeXml(description)}</description>
            ${note.tags.map(tag => `<category>${escapeXml(tag)}</category>`).join('\n            ')}
        </item>`;
        }).join('');

        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>StudyLeaf</title>
        <link>${siteUrl}</link>
        <description>StudyLeaf — A personal learning journal for notes, ideas, and knowledge.</description>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="${siteUrl}/feed" rel="self" type="application/rss+xml"/>${itemsXml}
    </channel>
</rss>`;

        res.set('Content-Type', 'application/rss+xml; charset=UTF-8');
        res.send(rssXml);
    } catch (err) {
        console.error('RSS feed error:', err);
        res.status(500).send('Failed to generate RSS feed.');
    }
});

// --- DATABASE-DRIVEN ROUTES ---

const NOTES_PER_PAGE = 10;

// GET Homepage: Fetch all notes from DB (with pagination)
app.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const isAdmin = req.session && req.session.isLoggedIn;
        const filter = isAdmin ? {} : { status: { $ne: 'draft' } };
        const totalNotes = await Note.countDocuments(filter);
        const totalPages = Math.ceil(totalNotes / NOTES_PER_PAGE);
        const notes = await Note.find(filter)
            .sort({ pinned: -1, date: -1 })
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
        const isAdmin = req.session && req.session.isLoggedIn;
        const baseFilter = isAdmin ? {} : { status: { $ne: 'draft' } };
        const filter = {
            ...baseFilter,
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
        const isAdmin = req.session && req.session.isLoggedIn;
        const filter = isAdmin ? { tags: tag } : { tags: tag, status: { $ne: 'draft' } };
        const totalNotes = await Note.countDocuments(filter);
        const totalPages = Math.ceil(totalNotes / NOTES_PER_PAGE);
        const notes = await Note.find(filter)
            .sort({ pinned: -1, date: -1 })
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
    const { title, content, tags, status } = req.body;

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
        tags: tagsList,
        status: status === 'draft' ? 'draft' : 'published'
    });

    try {
        await newNote.save();
        req.flash('success', 'Note created successfully!');
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
            note: { title: note.title, content: note.content, date: formattedDate, status: note.status || 'published', pinned: note.pinned || false },
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
    const { content, date, tags, status, pinned } = req.body;

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
                tags: tagsList,
                status: status === 'draft' ? 'draft' : 'published',
                pinned: pinned === 'on'
            }
        );

        // 4. Redirect back to the note reading page
        req.flash('success', 'Note updated successfully!');
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
        req.flash('success', 'Note deleted.');
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

        // Block public access to draft notes
        const isAdmin = req.session && req.session.isLoggedIn;
        if (note.status === 'draft' && !isAdmin) {
            return res.status(404).render('404', { title: 'Not Found' });
        }

        // Use shared utilities for Markdown processing
        const { wordCount, readingTime } = getReadingStats(note.content);
        const htmlContent = renderMarkdown(note.content);
        const { tocItems, contentWithIds } = generateTOC(htmlContent);
        const plainDescription = getPlainDescription(note.content);

        // Find related notes that share tags with the current note
        let relatedNotes = [];
        if (note.tags && note.tags.length > 0) {
            relatedNotes = await Note.find({
                tags: { $in: note.tags },
                _id: { $ne: note._id },
                status: { $ne: 'draft' }
            })
            .sort({ date: -1 })
            .limit(4)
            .select('title slug tags date');
        }

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