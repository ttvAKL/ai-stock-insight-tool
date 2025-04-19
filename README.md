

 # AI Stock Insight Tool
 
 A personalized AI-powered stock recommendation and insight platform for beginner investors.
 
 ## Frontend Setup (React + Vite + Tailwind)`
 
 1. Install dependencies (in client folder):
    ```bash
    npm install
    ```
 
 ## Backend Setup (Flask + yfinance)
 
 1. (Optional) Create a virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
 
 2. Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
 
 > **Note**: The backend uses ESM-style imports and assumes `"type": "module"` is set in `package.json`.
 
 ## Python Requirements
 
 Ensure `requirements.txt` includes:
 
 ```
 flask
 flask-cors
 yfinance
 ```
 
 ## Node Requirements
 
 Ensure `client/package.json` includes the following dependencies:
 
 ```
 react, react-dom, react-router-dom, axios, tailwindcss, vite, @vitejs/plugin-react
 ```
 
 ## Running Server

 The Makefile streamlines the startup process by launching both the backend and frontend development servers. To start the project, simply run:

 ```bash
 make run
 ```

 > All installed via `npm install` inside the `/client` folder.