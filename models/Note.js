const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    tags: {
        type: [String], // An array of strings
        default: []
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
    },
    pinned: {
        type: Boolean,
        default: false
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

// --- Performance Indexes ---
NoteSchema.index({ date: -1 });          // Sort by date
NoteSchema.index({ tags: 1 });           // Filter by tag
NoteSchema.index({ status: 1, date: -1 }); // Published notes sorted by date
NoteSchema.index({ pinned: -1, date: -1 }); // Pinned-first sorting

module.exports = mongoose.model('Note', NoteSchema);