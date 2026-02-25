/**
 * Markdown parsing utility for StudyLeaf.
 * Centralises marked configuration, reading-time calculation, 
 * TOC generation, and plain-text extraction.
 */
const { marked } = require('marked');

// Configure marked with GFM and line breaks
marked.setOptions({ breaks: true, gfm: true });

/**
 * Render Markdown to HTML.
 */
function renderMarkdown(content) {
    return marked(content);
}

/**
 * Calculate word count and reading time.
 * @param {string} content - Raw Markdown content
 * @returns {{ wordCount: number, readingTime: number }}
 */
function getReadingStats(content) {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    return { wordCount, readingTime };
}

/**
 * Generate Table of Contents from rendered HTML.
 * Parses h2/h3 headings, injects anchor IDs, returns TOC items + modified HTML.
 * @param {string} html - Rendered HTML content
 * @returns {{ tocItems: Array, contentWithIds: string }}
 */
function generateTOC(html) {
    const tocItems = [];
    const headingRegex = /<h([23])(?:\s[^>]*)?>(.+?)<\/h[23]>/gi;
    let match;
    let contentWithIds = html;

    // First pass: collect headings
    const matches = [];
    while ((match = headingRegex.exec(html)) !== null) {
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

    return { tocItems, contentWithIds };
}

/**
 * Extract a plain-text description from Markdown content.
 * @param {string} content - Raw Markdown content
 * @param {number} maxLength - Maximum character length (default: 160)
 * @returns {string}
 */
function getPlainDescription(content, maxLength = 160) {
    return content
        .replace(/[#*_`~>\-\[\]()!|]/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

module.exports = {
    renderMarkdown,
    getReadingStats,
    generateTOC,
    getPlainDescription,
    marked
};
