# RTC Live: Exhaustive Project Documentation

This document serves as the absolute, definitive architectural and functional reference for the **RTC Live** project. Every single file that contributes to the application's logic, presentation, AI models, and deployment has been analyzed, documented, and formatted for clarity.

---

# Part 1: Frontend Application Logic (`/frontend/src/`)

## 1. `App.jsx`
### **Purpose**
The **Global Entry Point, State Manager, and Router**. This is the absolute root of the React application that orchestrates all authenticated sessions and routing.

### **Detailed Mechanics**
* **Routing Architecture:** Uses `react-router-dom` (`HashRouter`) to strictly partition the application into secure zones: `/user` for passengers, `/driver` for fleet operators, and `/admin` for dispatchers.
* **Authentication Pipeline:** Houses the `AuthFlow` state machine. It prevents unauthorized access by checking `localStorage` for an `rtc_session`. If a user is not logged in, they are trapped in the login screen. It features a custom `sanitizeEmail` helper to convert dots to commas, satisfying Firebase's stringent database key requirements.
* **Password Reset:** Integrates with `@emailjs/browser` to asynchronously dispatch 6-digit OTPs (One Time Passwords) to users' inboxes, temporarily storing the hash in a secure `temporary_otps/` Firebase node.
* **Admin Dashboard Component:** Directly embedded in this file, the `AdminDashboard` listens to a global `onValue` Firebase hook. It watches the entire fleet in real-time, instantly triggers the HTML5 `Notification` API if a driver flags an emergency, and renders the master map using Leaflet.

---

## 2. `UserDashboard.jsx`
### **Purpose**
The **Passenger Commuter Interface**. This is the core public-facing application used by thousands of commuters to track buses and plan their daily transit.

### **Detailed Mechanics**
* **Live Fleet Synchronization:** Mounts a strict `useEffect` listener to the `buses/` Firebase Realtime Database node. As buses update their raw GPS arrays, this component pulls the delta down in real-time.
* **The "Find Buses" Algorithm:** When a user selects a boarding and destination stop, a highly optimized `useMemo` hook executes. It scans `ROUTES_DATA.json` to verify the bus is traveling in the correct chronological direction (`idxA < idxB`). 
* **ETA Generation:** Uses the Haversine formula (`getDistanceFromLatLonInKm`) to calculate the exact spatial distance between the user's stop and the bus's live GPS. It divides this distance by the driver's reported speed to output an Estimated Time of Arrival.
* **Dynamic Geolocation (`handleBoardingChange`):** If a user clicks "Use My Live Location", it bypasses manual selection. It queries the device's hardware GPS, runs the Haversine formula against *every single bus stop in the city*, and automatically locks onto the closest physical stop.

---

## 3. `DriverDashboard.jsx`
### **Purpose**
The **Telemetry Broadcaster**. Installed on mounted tablets inside the physical buses, this dashboard continuously beams live GPS data to the cloud.

### **Detailed Mechanics**
* **Hardware Interfacing:** Uses `navigator.geolocation.watchPosition` configured with `{ enableHighAccuracy: true }`. This forces the device's hardware to prioritize satellite GPS over cell-tower triangulation, guaranteeing lane-level accuracy.
* **Database Overwrites:** On every GPS tick, it executes a Firebase `set()` operation to `buses/${busId}`. This completely overwrites the previous coordinate, ensuring the database remains a lightweight snapshot of the present rather than a bloated historical ledger.
* **Mock Simulation (Dev Mode):** A brilliant fallback built for testing. It queries the Open Source Routing Machine (OSRM) API to fetch a perfectly snapped polyline of the roads. It then uses `setInterval` and linear interpolation (`getInterpolatedPoint`) to physically animate a ghost bus driving along the route.

---

## 4. `MapComponent.jsx`
### **Purpose**
The **Geospatial Renderer**. It entirely abstracts the complex map rendering logic away from the React dashboards, utilizing Leaflet.js.

### **Detailed Mechanics**
* **Tile Rendering:** Connects to OpenStreetMap's servers to render the physical streets and topography.
* **Dynamic Fleet Plotting:** Iterates over the live `buses` dictionary, assigning custom colored SVG markers based on the bus type (City Ordinary, Metro Express, Luxury). If a bus is in an emergency state, it injects a CSS keyframe animation (`pulse-red`) directly onto the marker.
* **Aggressive Recenter Button:** When clicked, it forcefully halts the map's current pan state, queries the browser's hardware GPS to find the user, and triggers a smooth `map.setView()` animation to snap the camera directly overhead the user.

---

## 5. `AIChatWidget.jsx`
### **Purpose**
The **Intelligent NLP Interface**. A floating, responsive widget providing rule-based and AI-backed responses to complex transit queries.

### **Detailed Mechanics**
* **Speech Recognition:** Hooks deeply into the browser's native Web Speech API (`window.SpeechRecognition`). Users can tap the microphone to speak their query, which is transcribed locally and fed into the AI.
* **Offline Fallbacks:** Features an internal regex engine that intercepts basic queries (e.g., "help"). For routing queries mentioning two known stops, it executes a fast local intersection algorithm, bypassing the backend to save latency.
* **Responsive UI:** Utilizes CSS `calc()` variables to ensure the chat window perfectly scales to the exact millimeter of the user's viewport without clipping into mobile browser navigation bars.

---

## 6. `AuthPage.jsx` & `OTPPage.jsx`
### **Purpose**
The **Authentication Interfaces**. Handles the visual and logical flows for logging in, signing up, and verifying email identities.

### **Detailed Mechanics**
* **AuthPage.jsx:** Contains a fluid UI that gracefully toggles between Login, Sign Up, and Forgot Password states. It collects the user's selected role (Passenger vs Driver vs Admin) and passes the payload up to `App.jsx`.
* **OTPPage.jsx:** A highly specialized input component. It forces the user to enter exactly 6 digits, auto-advancing the cursor to the next input box instantly upon typing, creating a premium authentication experience similar to modern banking apps.

---

## 7. `DashboardScreens.jsx`
### **Purpose**
A library of **Secondary View Components** used within the dashboards, specifically handling historical data and settings.

### **Detailed Mechanics**
* Contains isolated React components like `MyRoutes`, `RideHistory`, and `Settings`.
* **Theming Engine:** The `Settings` component manages the global Dark Mode toggle, dynamically injecting the `.dark-theme` CSS class onto the HTML root, swapping out all global color variables (`--clean-white` to `--rtc-black`) instantly without a page reload.

---

## 8. `simulator.js`
### **Purpose**
The **Load Testing & Automation Utility**. A background script designed to stress-test the Firebase infrastructure and frontend rendering by simulating an active city fleet.

### **Detailed Mechanics**
* Generates an array of up to 15 virtual buses. It grabs physical coordinates from `stops.json` and uses mathematical linear interpolation to smoothly animate them across the city.
* Every 2000 milliseconds, it executes a massive parallel push to the Firebase database, tricking the frontend into believing 15 physical drivers are actively navigating the streets.

---

## 9. `firebase.js` & `routes.js` & `main.jsx`
### **Purpose**
The **Core Integrations and Entry Points**.
* **`firebase.js`:** Initializes the Firebase SDK using environment variables. It abstracts and exports the `database` and `auth` objects so components don't have to initialize the app repeatedly.
* **`routes.js`:** A helper utility (often deprecated or superseded by `App.jsx` routing logic) designed to centralize path strings.
* **`main.jsx`:** The absolute root DOM node binder. It imports the global CSS and invokes `ReactDOM.createRoot()`.

---

# Part 2: Frontend Styling & Configs

## 10. `index.css` & `App.css`
### **Purpose**
The **Global Design System**.
* Avoids messy inline styles by establishing a strict hierarchy of CSS variables (`:root { --rtc-red: #E31E24; }`).
* Implements critical responsive media queries (`@media (max-width: 768px)`), instructing the dashboards to completely restructure their flexbox layouts (e.g., snapping sidebars to the bottom of the screen) when viewed on mobile phones.

## 11. `vite.config.js` & `package.json`
### **Purpose**
The **Build Pipeline**.
* **`vite.config.js`:** Configures the Vite bundler. Critically, it sets `base: '/rtc-live/'`, informing the compiler that the app will be hosted in a sub-directory on GitHub Pages, ensuring all asset paths (like images and CSS) don't break in production.
* **`package.json`:** Defines all NPM dependencies (React, Leaflet, Firebase) and contains the crucial `deploy` script (`gh-pages -d dist`) used to push code to the live internet.

## 12. `public/sw.js` & `manifest.json`
### **Purpose**
The **Progressive Web App (PWA) Backbone**.
* **`sw.js` (Service Worker):** A background script that intercepts network requests, heavily caching images and CSS so the app loads instantly on weak 3G mobile networks.
* **`manifest.json`:** Tells Android and iOS browsers that the app can be "Installed" directly to the user's home screen, behaving like a native application without needing an app store.

---

# Part 3: Backend AI & Data Layer (`/ai/` and `/data/`)

## 13. `ai/app.py`
### **Purpose**
The **Flask AI API**. The heavy-duty processing engine for Machine Learning and NLP.

### **Detailed Mechanics**
* **The Predictive Engine (`/predict`):** Loads a pre-trained `traffic_model.pkl` into RAM using `joblib`. It accepts weather conditions, hour of the day, and local events via JSON. It feeds this into a Random Forest Regressor to output an AI-predicted traffic volume, dynamically altering the ETA shown to passengers.
* **The NLP Engine (`/chat`):** Powers the AI Chatbot. 
  * Strips conversational filler words.
  * Generates **N-Grams** (1 to 3-word combinations) from the user's input.
  * Uses `difflib.SequenceMatcher` to perform fuzzy string matching, allowing the backend to correctly identify complex Indian bus stops even if the user completely misspells them.

## 14. `ai/train_model.py`
### **Purpose**
The **Machine Learning Pipeline**.
* Executes offline to parse historical CSV data. Uses `LabelEncoder` to convert text (like "Rainy") into integers. 
* Initializes a `RandomForestRegressor(n_estimators=100)`, training 100 distinct decision trees to learn traffic patterns. It exports the resulting mathematical matrices to disk as a `.pkl` file.

## 15. `data/generate_map_data.py`
### **Purpose**
The **Spatial ETL (Extract, Transform, Load) Scraper**.
* Reads raw municipal spreadsheets (`Visakhapatnam_APSRTC_Bus_Routes.csv`).
* Queries the public **OpenStreetMap Nominatim API** to fetch the exact physical Latitude and Longitude for every single bus stop mentioned in the spreadsheet.
* Outputs perfectly formatted JSON arrays that the React frontend can instantly render onto the Leaflet map.

## 16. `data/update_chatbot_data.py`
### **Purpose**
The **NLP Pre-processor**.
* Restructures the raw CSV data into a highly optimized, flat JSON dictionary specifically designed for rapid text search and intent matching, drastically speeding up the response time of the Flask `/chat` endpoint.

---
*Generated by Antigravity on behalf of RTC Live.*
