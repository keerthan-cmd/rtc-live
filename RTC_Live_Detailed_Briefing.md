# RTC Live: Comprehensive Technical Briefing

## 1. System Overview
RTC Live is an end-to-end, real-time public transit tracking and management system designed to minimize commuter wait times and provide operational oversight for fleet administrators. It leverages a modern technology stack, splitting functionality between a React-based frontend SPA, a real-time NoSQL synchronization hub (Firebase), and a serverless Python backend equipped with machine learning for predictive analysis and an AI assistant.

---

## 2. Data Utilized
The system handles a wide variety of data to perform mapping, routing, and predictive analytics.

### 2.1 Static Datasets
- **Transit Network Data:** Based on APSRTC (Andhra Pradesh State Road Transport Corporation) routes (`Visakhapatnam_APSRTC_Bus_Routes.csv`). This data includes Route Numbers, Source, Destination, Via (stops), Bus Type, First/Last Bus timings, and Frequency.
- **Traffic Trends Dataset:** A historical dataset (`traffic_dataset_with_trend.csv`) containing Timestamp, Hour, Weather conditions, Events, and Traffic Volume. This is used exclusively for training the predictive models.

### 2.2 Real-Time Data (Telemetry)
- **Driver GPS Coordinates:** Broadcasted via the HTML5 Geolocation API on the driver's device. Contains `latitude`, `longitude`, `speed`, and `heading`.
- **Firebase Realtime Database:** Acts as the living state of the application. It stores the live telemetry data as JSON objects and synchronizes changes across all active clients via WebSockets instantly.

### 2.3 Geospatial Data
- **OSRM Data:** The Open Source Routing Machine provides accurate road network geometry, returning polyline arrays and turn-by-turn distances rather than relying on unrealistic "straight-line" mapping.

---

## 3. Core Algorithms and Logic

### 3.1 Routing & ETA Calculation
- **Physical Distance Calculation:** The application queries the OSRM API to get the exact road distance between the user's boarding point, the bus's current location, and the destination.
- **Estimated Time of Arrival (ETA):** The system divides the remaining route distance by the bus's live telemetry speed (or historical average if live speed is unavailable). It is further modified by the backend machine learning model which adjusts ETA based on predicted traffic volume.

### 3.2 Predictive Machine Learning Algorithm
The backend (`ai/app.py` & `ai/train_model.py`) utilizes a **Random Forest Regressor** (`RandomForestRegressor` from `scikit-learn`).
- **Feature Engineering:** Extracts the `Hour` from the timestamp and encodes the categorical `Weather` conditions using `LabelEncoder`.
- **Prediction:** By passing current hour, weather, and active events into the model, it predicts the `Traffic Volume`, which is directly translated into ETA delay minutes.

### 3.3 Natural Language Processing (Chatbot)
The onboard AI assistant relies on custom NLP logic rather than heavy external LLMs to ensure low latency and zero cost:
- **N-Grams:** Breaks down user messages into unigrams, bigrams, and trigrams.
- **Fuzzy String Matching:** Uses Python's `difflib.SequenceMatcher` to compare generated N-grams against the dataset of known bus stops. This allows the bot to understand stops even with typos or partial matches (e.g., matching "duvada" to "Duvvada Railway Station").
- **Intent Recognition:** Uses Regex to detect intents such as Schedule Info, Fare Info, Greetings, and Live Tracking context.

---

## 4. Suggestions to Improve Security

To make the application production-ready and resistant to malicious actors, the following security hardening steps are recommended:

1. **Firebase Security Rules:** 
   - **Write Restrictions:** Ensure only authenticated drivers (via strict Role-Based Access Control) can write to the `/buses/` nodes in the database.
   - **Read Restrictions:** Commuters should only be able to read active route data and nothing else.
2. **Backend Rate Limiting & API Security:**
   - Implement rate limiting on the Python Flask backend (using `flask-limiter`) to prevent Distributed Denial of Service (DDoS) attacks against the ML prediction and chat endpoints.
3. **Data Validation Pipeline:**
   - Implement server-side bounds checking. If a driver broadcasts a speed of `500 km/h` or coordinates in the ocean, the system should automatically flag the anomaly and ignore the data point, preventing map breakage.
4. **Environment Variables:**
   - Ensure all Firebase API keys, OSRM endpoints, and Vercel configs are securely stored in `.env` files and managed via a Secret Manager, never hardcoded in the repository.

---

## 5. Recommended Application Testing Methods

A comprehensive testing strategy ensures the reliability of a real-time system:

### 5.1 Unit Testing
- **Frontend:** Use **Jest** and **React Testing Library** to test individual components like `AIChatWidget` or the `OTPPage` in isolation.
- **Backend:** Use **pytest** to verify that the fuzzy matching algorithm correctly identifies stops and that the Random Forest model outputs expected ETA ranges for given traffic data.

### 5.2 Integration & E2E Testing
- **End-to-End (E2E) Workflows:** Use **Cypress** or **Playwright** to script automated browser tests. E.g., Script a "User logs in, searches for route 10A, clicks the map, and views ETA" flow.
- **API Contract Testing:** Ensure that the JSON structures expected by the React frontend exactly match the outputs generated by the Python backend.

### 5.3 Load & Stress Testing
- **WebSocket Saturation:** Use tools like **Artillery** or **Apache JMeter** to simulate 10,000+ simultaneous WebSocket connections to Firebase to ensure the realtime sync does not lag under city-wide load.

### 5.4 Chaos & Simulation Testing
- **Edge-Case GPS Simulator:** Expand the existing `simulator.js` to simulate bad telemetry. Test how the frontend behaves if the bus "loses signal" in a tunnel for 3 minutes, then suddenly reappears 2 kilometers down the road.
