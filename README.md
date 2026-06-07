# Smart Delivery Route Optimizer - Run & Installation Guide

This document describes the prerequisites, running instructions, and security guidelines for the **Smart Delivery Route Optimizer** application.

---

## 1. Prerequisites (What you need installed)

To run this application locally, you need the following:

1. **Modern Web Browser**: Google Chrome, Microsoft Edge, Brave, Mozilla Firefox, or Apple Safari.
2. **Internet Connection**: Required to load map tiles, Leaflet libraries, and connect to the OpenRouteService API.
3. **Local Web Server**:
   * **Why a server is required**: The project uses **ES6 JavaScript Modules** (modular JS files loaded with `<script type="module">`). For security reasons, web browsers block modular JavaScript files from loading via the direct file system protocol (`file:///c:/...`) due to **CORS (Cross-Origin Resource Sharing)** policies. 
   * **Mam's Favorite Question**: *Why can't we just double-click `index.html` to open it?*
     * *Answer*: Because of browser CORS security blocking local ES6 ES-Modules. It **must** be served via an HTTP server.

To serve the files, you can use any of the three methods listed below:

---

## 2. How to Run the Application (3 Methods)

### Method A: Using Node.js (Recommended & Pre-configured)
Since Node.js is installed on your machine, this is the easiest way.

1. Open your terminal or Command Prompt (CMD) in the project directory.
2. Run the following command:
   ```bash
   npx http-server -c-1 -p 3000
   ```
   *(Note: `-c-1` disables browser caching so your code changes update instantly, and `-p 3000` hosts the app on port 3000).*
3. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

### Method B: Using Python (No installation required if Python is present)
If you have Python installed, you can use its built-in HTTP server:

1. Open Command Prompt in the project folder.
2. Run the command:
   * **For Python 3**:
     ```bash
     python -m http.server 3000
     ```
   * **For Python 2**:
     ```bash
     python -m SimpleHTTPServer 3000
     ```
3. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

### Method C: Using VS Code Live Server Extension (Visual / GUI method)
If you are editing the code using VS Code:

1. Open VS Code and open the project folder.
2. Install the **"Live Server"** extension by *Ritwick Dey* from the extensions tab (`Ctrl+Shift+X`).
3. Open [index.html](file:///c:/Users/rajes/Desktop/Project/index.html).
4. Click the **"Go Live"** button in the bottom right corner of the VS Code window, or right-click `index.html` and select **"Open with Live Server"**.
5. The browser will automatically open and display the app on a port (usually `http://127.0.0.1:5500`).

---

## 3. Trouble-shooting & Key Configuration

### Where is the Routing Key located?
* The default routing key is embedded directly inside **[js/routing.js](file:///c:/Users/rajes/Desktop/Project/js/routing.js)**.
* If the default key runs out of daily quota (free keys allow 2,000 requests per day), you can create a free account at [OpenRouteService.org](https://openrouteservice.org/) to get your own key.
* Enter your custom key inside the app by clicking the **Configuration Sliders (Gear icon)** in the top right corner of the dashboard.

---

## 4. Deploying to Vercel (Free Online Hosting)

Yes, this project is **100% static** (pure HTML, CSS, JS), so it can be deployed to Vercel in seconds for free!

### Method 1: Deploying via GitHub (Recommended)
1. Push your project files (`index.html`, `css/`, `js/`) to a repository on your **GitHub** account.
2. Go to [vercel.com](https://vercel.com/) and sign up / log in with your GitHub account.
3. On the Vercel dashboard, click **"Add New"** -> **"Project"**.
4. Import your GitHub repository from the list.
5. Leave all settings as default (Framework Preset: *Other*) and click **"Deploy"**.
6. Within 10 seconds, Vercel will give you a live production link (e.g., `https://smart-delivery-route.vercel.app`) that you can share with anyone!

### Method 2: Deploying via Vercel CLI (Direct Upload from Terminal)
If you don't want to use GitHub, you can deploy it directly from your terminal using Vercel's CLI:
1. Open your Command Prompt (CMD) in the project directory.
2. Run the command:
   ```bash
   npx vercel
   ```
3. Follow the interactive prompts:
   * **Set up and deploy?** -> Press `Y` and Enter.
   * **Link to existing project?** -> Press `N` and Enter.
   * **What's your project name?** -> Enter a name or press Enter for default.
   * **In which directory is your code located?** -> Press Enter (`./`).
   * **Want to modify settings?** -> Press `N` and Enter.
4. The CLI will upload your files and output a **Production URL** in your command prompt. Open it to test!

