# StudyLeaf — Professional Upgrade Roadmap

**Version:** 1.2.0 → 2.0.0  
**Date:** February 2026  
**Status:** Planning

---

## 1. Responsiveness & Mobile UX _(Critical)_

The CSS currently uses a fixed `max-width: 700px` container with **no media queries**. On phones, the editor, FAB button, header nav, and search bar will break or feel cramped.

### Action Items

- Add `@media` breakpoints (`768px`, `480px`) for the header (stack logo/nav vertically), note list, editor form, and FAB placement.
- Make the EasyMDE toolbar scrollable horizontally on small screens.
- Add `touch-action` CSS and larger tap targets (min `44×44px`) for mobile buttons.

---

## 2. Pagination _(Scalability)_

Right now `Note.find()` loads **every** note into memory on every homepage visit. This will collapse performance at ~100+ notes.

### Action Items

- Implement skip/limit pagination on the homepage route:
  ```js
  const page = parseInt(req.query.page) || 1;
  const limit = 12;
  const notes = await Note.find().sort({ date: -1 }).skip((page - 1) * limit).limit(limit);
  const total = await Note.countDocuments();
  ```
- Pass `page`, `totalPages` to the view and render prev/next navigation links.

---

## 3. Security Hardening

| Issue | Fix |
|---|---|
| No password hashing — raw string compare against `.env` | Use `bcrypt.compare()` even for a single-user system |
| No CSRF protection | Add `csurf` or `csrf-csrf` middleware on all POST routes |
| No rate limiting on `/login` | Add `express-rate-limit` (e.g., 5 attempts per 15 min) |
| `marked()` renders raw HTML (XSS risk) | Enable `marked({ sanitize: true })` or use `DOMPurify` server-side |
| No `helmet` headers | `app.use(helmet())` for security headers (CSP, X-Frame-Options, etc.) |
| Session secret in `.env` but no validation | Add startup validation: `if (!process.env.SESSION_SECRET) throw ...` |

---

## 4. Error Handling & 404 Page

There is no 404 handler or global error middleware. Missing slugs return a raw `"Note not found."` string.

### Action Items

- Create `views/404.ejs` and `views/error.ejs` templates.
- Add at the bottom of `server.js`:
  ```js
  app.use((req, res) => res.status(404).render('404', { title: 'Not Found' }));
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { title: 'Error', message: err.message });
  });
  ```

---

## 5. Reading Time & Note Metadata

Add estimated reading time displayed on each note — a small professional touch.

### Action Items

- Calculate reading time server-side:
  ```js
  const readingTime = Math.ceil(note.content.split(/\s+/).length / 200);
  ```
- Pass it to the view and display like: `📖 3 min read`

---

## 6. Related Notes

At the bottom of `note.ejs`, show notes that share tags with the current note.

### Action Items

- Query for related notes:
  ```js
  const related = await Note.find({
    tags: { $in: note.tags },
    _id: { $ne: note._id }
  }).limit(4);
  ```
- Render a "See Also" section at the bottom of the note view.

---

## 7. Table of Contents (Auto-generated)

For long notes, auto-generate a TOC from headings in the rendered Markdown.

### Action Items

- Parse the HTML output of `marked()` for `<h2>` and `<h3>` tags.
- Build a collapsible TOC at the top of each note, with anchor links.

---

## 8. SEO & Social Sharing

The `<head>` in `layout.ejs` has no meta description, Open Graph, or Twitter Card tags.

### Action Items

- Pass a `description` variable (first 160 chars of content, stripped of Markdown) from server routes.
- Render meta tags in layout:
  ```html
  <meta name="description" content="<%= description %>">
  <meta property="og:title" content="<%= title %>">
  <meta property="og:description" content="<%= description %>">
  <meta property="og:type" content="article">
  ```

---

## 9. RSS Feed

Add a `/feed` route that generates an XML RSS feed of the latest notes.

### Action Items

- Install the `rss` npm package.
- Create a `/feed` GET route that returns `Content-Type: application/rss+xml`.

---

## 10. Tag Cloud / All Tags Page

Create a `/tags` page that shows all unique tags with note counts, styled as a tag cloud.

### Action Items

- Use MongoDB aggregation:
  ```js
  const tags = await Note.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  ```
- Create `views/tags.ejs` and link to it from the navigation.

---

## 11. Draft / Publish System

Prevent accidentally publishing unfinished work.

### Action Items

- Add a `status` field to the Note schema: `"draft"` | `"published"` (default: `"published"`).
- Public routes only show published notes.
- Admin dashboard shows drafts separately with a "Publish" button.

---

## 12. Image Upload

Replace external URLs with direct server uploads.

### Action Items

- Install `multer` for file upload handling.
- Store images in `/public/uploads/` (or integrate Cloudinary/S3 for scalability).
- Add a custom EasyMDE toolbar button that triggers upload and inserts the Markdown image syntax.

---

## 13. Code Architecture Improvements

| Current Issue | Improvement |
|---|---|
| All routes in `server.js` (200+ lines, growing) | Extract into `routes/notes.js`, `routes/auth.js`, `routes/tags.js` using `express.Router()` |
| Empty `utils/markdownParser.js` | Move `marked` config there; add custom renderers, sanitization, reading-time calc |
| Slug generation is inline and fragile | Use the `slugify` npm package or move to a Mongoose `pre('save')` hook in the model |
| Duplicate EasyMDE config in both `new-note.ejs` and `edit-note.ejs` | Extract into a shared `/scripts/editor.js` file |
| SweetAlert2 loaded twice (layout.ejs + edit-note.ejs) | Load only once in layout |
| No `.gitignore` visible | Add one excluding `node_modules/`, `.env`, `data/` |

---

## 14. UX Enhancements

- **Auto-save drafts** — Periodically save editor content to `localStorage` so nothing is lost on accidental navigation.
- **Toast notifications** — Replace raw redirects after save/delete with flash messages (`connect-flash`) like _"Note saved successfully."_
- **Keyboard shortcuts** — `Ctrl+S` to save a note from the editor, `Ctrl+K` to focus search.
- **Smooth page transitions** — Add CSS `fade-in` animations on page load.
- **Note pinning** — Add a `pinned: Boolean` field; pinned notes always appear first on the homepage.
- **Word count** — Show live word/character count in the editor footer.

---

## 15. Performance & Caching

- Add **MongoDB indexes** on `slug` (already unique), `tags`, and `date` fields for faster queries.
- Use `express` static file caching headers (`maxAge`) for CSS/JS/images.
- Add `compression` middleware (`app.use(compression())`) for gzip responses.
- Consider adding `ETag` support for note pages.

---

## Priority Implementation Order

| Phase | Features | Effort |
|---|---|---|
| **Phase 1** _(Quick wins)_ | Responsiveness, 404 page, helmet, rate-limit, flash messages | 1–2 days |
| **Phase 2** _(Core value)_ | Pagination, related notes, reading time, route refactor | 2–3 days |
| **Phase 3** _(Professional)_ | SEO meta tags, RSS feed, tag cloud page, draft system | 2–3 days |
| **Phase 4** _(Advanced)_ | Image uploads, auto-save, TOC, keyboard shortcuts | 3–5 days |

---

> **Total estimated effort:** ~8–13 days of focused development.
