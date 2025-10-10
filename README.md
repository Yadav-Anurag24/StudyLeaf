# 📖 StudyLeaf

> A minimalist, Markdown-based personal learning journal built with Node.js and Express.

![StudyLeaf Screenshot](https://i.imgur.com/WpP8I7H.png)

## About The Project

StudyLeaf is a clean, content-focused web application designed to be a personal knowledge vault. Inspired by the minimalist aesthetic of developers like Mary Rose Cook, this project serves as a digital notebook for documenting course notes, book summaries, and technical learnings.

All notes are written in simple Markdown files, which the application dynamically reads and renders into beautifully styled web pages, making it an ideal tool for developers and lifelong learners alike.

---

## ✨ Features

* **Dynamic Content:** Automatically reads and lists all notes from a local `/notes` directory.
* **Markdown-to-HTML:** Parses Markdown files, including fenced code blocks, into clean HTML on the fly.
* **Syntax Highlighting:** Provides beautiful, theme-based syntax highlighting for code snippets using `highlight.js`.
* **Minimalist UI:** A clean, single-column, responsive layout focused entirely on readability.
* **Efficient Templating:** Uses EJS and a master layout file to keep the codebase DRY (Don't Repeat Yourself).

---

## 🛠️ Built With

This project was built using the following technologies:

* **Backend:** Node.js, Express.js
* **Frontend:** EJS (Embedded JavaScript Templates), HTML5, CSS3
* **Key NPM Packages:**
    * `express-ejs-layouts`
    * `marked`
    * `nodemon`
    * `highlight.js` (client-side)

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Ensure that Node.js and npm are installed on your machine.
* npm
    ```sh
    npm install npm@latest -g
    ```

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/Yadav-Anurag24/StudyLeaf.git
    ```
2.  Navigate into the project directory:
    ```sh
    cd StudyLeaf
    ```
3.  Install NPM packages:
    ```sh
    npm install
    ```
4.  Run the server in development mode:
    ```sh
    npm run dev
    ```
5.  Open your browser and visit `http://localhost:3000`.

---

## Usage

To add a new note, simply create a new `.md` file in the `/notes` directory. Use hyphens for spaces in the filename (e.g., `my-new-note.md`). The application will automatically detect it and add it to the homepage archive.

---

## Acknowledgements

* Inspiration for the UI/UX came from [Mary Rose Cook's blog](https://maryrosecook.com/blog/).
