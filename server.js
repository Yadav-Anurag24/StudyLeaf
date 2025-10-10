// 1. Import necessary packages
const expressLayouts = require('express-ejs-layouts');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked'); // marked is imported

// 2. Create an Express application
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Set up the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts); // Master layout configue

// 4. Set up a static folder
app.use(express.static(path.join(__dirname, 'public')));


// 5. Define a route for the HOMEPAGE
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
                const title = path.basename(file, '.md').replace(/-/g, ' ');
                return {
                    title: title.charAt(0).toUpperCase() + title.slice(1),
                    slug: path.basename(file, '.md')
                };
            });
        
        res.render('index', { title: 'Home', notes: notes });
    });
});

// 6. Define a route for a SINGLE NOTE
app.get('/note/:slug', (req, res) => {
    const slug = req.params.slug;
    const filePath = path.join(__dirname, 'notes', `${slug}.md`);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).send("Note not found.");
        }

        const content = marked(data);
        const title = slug.replace(/-/g, ' ');
        const formattedTitle = title.charAt(0).toUpperCase() + title.slice(1);

        res.render('note', { title: formattedTitle, content: content });
    });
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About' });
});

// 7. Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});