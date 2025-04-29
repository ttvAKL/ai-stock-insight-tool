

 # AI Stock Insight Tool
 
 A personalized AI-powered stock recommendation and insight platform for beginner investors.
 
 ## Frontend Setup (React + Vite + Tailwind)
 
 Install dependencies (in client folder):
    ```bash
    npm install
    ```

 ## Python Requirements
 
 Ensure `requirements.txt` includes:
 
 ```
 flask
 flask-cors
 yfinance
 ```
 > **Note**: The backend uses ESM-style imports and assumes `"type": "module"` is set in `package.json`.
 
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