# Getting Started with Capsulib

This guide will help you set up and run the Capsulib application for managing your capsule wardrobe.

## Prerequisites

- Python 3.8 or higher
- Node.js 16.0 or higher (LTS version recommended)
- Git

## Backend Setup

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone [your-repository-url]
   cd capsulib
   ```

2. **Set up the Python virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install fastapi uvicorn sqlalchemy pydantic python-multipart pillow
   ```

4. **Run the backend server**:
   ```bash
   python main.py
   ```

   The API server will be available at http://localhost:8000
   
   You can access the interactive API documentation at http://localhost:8000/docs

## Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create Tailwind CSS configuration files manually**:

   Create a file named `tailwind.config.js` with the following content:
   ```javascript
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     content: [
       "./src/**/*.{js,jsx,ts,tsx}",
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```

   Create a file named `postcss.config.js` with the following content:
   ```javascript
   module.exports = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   }
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```

   The frontend will be available at http://localhost:3000

## Working with Aider

Aider is an AI-powered coding assistant that can help you develop this project. Here's how to use it:

1. **Install Aider**:
   ```bash
   pip install aider-chat
   ```

2. **Start Aider in your project directory**:
   ```bash
   cd /path/to/capsulib
   aider
   ```

3. **Example prompts to try with Aider**:
   - "Add a feature to filter items by category"
   - "Create a component to display item details"
   - "Help me implement a search function"

## Project Structure

```
capsulib/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database models and connection
│   ├── uploads/             # Image uploads directory
│   └── db/                  # SQLite database files
├── frontend/
│   ├── public/              # Static assets
│   └── src/
│       ├── components/      # React components
│       │   ├── Header.js
│       │   ├── ItemList.js
│       │   └── ItemForm.js
│       ├── App.js           # Main application component
│       └── index.js         # Entry point
└── GETTING_STARTED.md       # This file
```

## Next Steps

Once you have the application running, you can:

1. Add items to your wardrobe using the "Add Item" button
2. Upload images for each item
3. Edit or delete existing items
4. Explore the FastAPI documentation at http://localhost:8000/docs

## Troubleshooting

- If you encounter issues with Tailwind CSS setup, you can skip it initially and use regular CSS
- If the backend fails to start, check if port 8000 is already in use
- For any database-related issues, try deleting the `db/capsulib.db` file and restart the backend

## GitHub Workflow Tips

- **Commit regularly**:
  ```bash
  git add .
  git commit -m "Add feature: item filtering"
  ```

- **Create feature branches**:
  ```bash
  git checkout -b feature/search-functionality
  ```

- **Merge changes**:
  ```bash
  git checkout main
  git merge feature/search-functionality
  ```

Happy coding! 🚀
