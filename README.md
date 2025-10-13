# 📖 StudyLeaf - A Minimalist Note-Taking CMS

A full-stack, database-driven personal learning journal built with Node.js, Express, and MongoDB. This application allows for creating, editing, and managing notes through a clean, content-focused interface with secure admin controls.

![StudyLeaf Screenshot](https://i.imgur.com/your-screenshot-url.png)
_Replace the link above with a URL to a new screenshot of your finished project._

---
## ## About The Project

StudyLeaf is a complete Content Management System (CMS) designed to be a personal knowledge vault. Inspired by the minimalist aesthetic of developers like Mary Rose Cook, this project moved beyond a simple file-based blog to become a robust, database-driven web application.

Notes are written in Markdown and managed through a secure, password-protected interface. The application is built from the ground up, featuring a full suite of CRUD (Create, Read, Update, Delete) operations, user authentication, and a polished, responsive UI.

---
## ## Core Features ✨

* **Full CRUD Functionality:** Create, read, update, and delete notes directly from the web interface.
* **Database Integration:** All notes and user sessions are stored persistently in a **MongoDB Atlas** cloud database.
* **Secure Authentication:** Admin routes for creating, editing, and deleting notes are protected by a password-based session authentication system.
* **Dynamic Content Rendering:** Notes are written in Markdown and parsed into clean HTML on the server-side using `marked`.
* **Note Sorting & Metadata:** Notes are automatically sorted by date, with metadata managed in the database.
* **Live Search:** Instantly find notes by keyword with a search function that queries the database title and content fields.
* **Polished UI/UX:**
    * Clean, minimalist, and responsive design.
    * **Light/Dark Mode** toggle that respects the user's OS preference and saves their choice.
    * Beautiful syntax highlighting for code blocks via `highlight.js`.
    * Convenient "Scroll to Top" and floating action buttons.

---
## ## Tech Stack 🛠️

* **Backend:** Node.js, Express.js
* **Database:** MongoDB with Mongoose
* **Frontend:** EJS (Embedded JavaScript Templates), HTML5, CSS3
* **Key NPM Packages:**
    * `mongoose` for database modeling.
    * `express-session` & `connect-mongo` for persistent, database-backed sessions.
    * `dotenv` for secure management of environment variables.
    * `marked` for Markdown parsing.
    * `nodemon` for development.

---
## ## Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

Make sure you have Node.js and npm installed.
* npm
    ```sh
    npm install npm@latest -g
    ```

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/your-username/StudyLeaf.git](https://github.com/your-username/StudyLeaf.git)
    ```
2.  **Navigate into the project directory:**
    ```sh
    cd StudyLeaf
    ```
3.  **Install NPM packages:**
    ```sh
    npm install
    ```
4.  **Set up your environment variables:**
    * Create a file named `.env` in the root of the project.
    * Add the following variables, replacing the values with your own:
        ```env
        # MongoDB Connection String from Atlas
        DATABASE_URL=mongodb+srv://...

        # Your secret admin password
        ADMIN_PASSWORD=your_secret_password

        # A long, random string for session security
        SESSION_SECRET=your_long_random_session_secret
        ```
5.  **Run the server:**
    ```sh
    npm run dev
    ```
6.  Open your browser and visit `http://localhost:3000`.

---
## ## Deployment

This application is deployed on **Vercel** and configured with the necessary environment variables for production use. The session store is configured with `connect-mongo`, making it compatible with Vercel's ephemeral file system.
