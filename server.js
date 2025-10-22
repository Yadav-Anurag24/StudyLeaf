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

// 2. Constants & Middleware Setup
const app = express();
const PORT = process.env.PORT || 3000;
// Note: Passwords with '#' can sometimes cause issues. Consider changing it if you face login problems.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

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

// --- DATABASE-DRIVEN ROUTES ---

// GET Homepage: Fetch all notes from DB
app.get('/', async (req, res) => {
    try {
        const notes = await Note.find().sort({ date: -1 }); // Find all notes, sort by date descending
        res.render('index', { title: 'Home', notes: notes });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// GET Search: Find notes in DB
app.get('/search', async (req, res) => {
    const query = req.query.query;
    if (!query) return res.redirect('/');
    try {
        const searchQuery = new RegExp(query, 'i'); // Case-insensitive search
        const results = await Note.find({
            $or: [{ title: { $regex: searchQuery } }, { content: { $regex: searchQuery } }]
        }).sort({ date: -1 });
        res.render('search-results', { title: 'Search Results', results: results, query: query });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// GET Create a new note form (No change here)
app.get('/note/new', requireLogin, (req, res) => {
    res.render('new-note', { title: 'New Note' });
});

// POST Create a new note in DB
app.post('/note/new', requireLogin, async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).send("Title and content are required.");
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const newNote = new Note({
        title: title,
        slug: slug,
        content: content,
        date: new Date()
    });
    try {
        await newNote.save();
        res.redirect(`/note/${slug}`);
    } catch (err) {
        if (err.code === 11000) { // Handle duplicate slug error
            return res.status(400).send("A note with this title already exists.");
        }
        res.status(500).send("Failed to save the note.");
    }
});

// GET Edit an existing note form
app.get('/note/:slug/edit', requireLogin, async (req, res) => {
    try {
        const note = await Note.findOne({ slug: req.params.slug });
        if (!note) return res.status(404).send("Note not found.");
        // Format date to YYYY-MM-DD for the input field
        const formattedDate = note.date.toISOString().slice(0, 10);
        res.render('edit-note', {
            title: 'Edit Note',
            note: { title: note.title, content: note.content, date: formattedDate },
            slug: note.slug,
            marked: marked
        });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// POST Update an existing note in DB
app.post('/note/:slug/edit', requireLogin, async (req, res) => {
    try {
        const { content, date } = req.body;
        await Note.findOneAndUpdate(
            { slug: req.params.slug },
            { content: content, date: new Date(date) }
        );
        res.redirect(`/note/${req.params.slug}`);
    } catch (err) {
        res.status(500).send("Failed to update note.");
    }
});

// POST Delete a note from DB
app.post('/note/:slug/delete', requireLogin, async (req, res) => {
    try {
        await Note.findOneAndDelete({ slug: req.params.slug });
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Failed to delete note.");
    }
});

// GET Read a single note from DB (Must be the last GET /note/... route)
app.get('/note/:slug', async (req, res) => {
    try {
        const note = await Note.findOne({ slug: req.params.slug });
        if (!note) return res.status(404).send("Note not found.");
        const htmlContent = marked(note.content);
        res.render('note', { title: note.title, content: htmlContent, slug: note.slug });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// 5. Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});