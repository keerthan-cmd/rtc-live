---
title: "RTC Live: A Real-Time Public Transit Tracking and Management System"
author: "Project Report Submission"
date: "2026"
geometry: margin=1in
---

# 1. Abstract
The unpredictability of public transportation arrivals is a major inconvenience for daily commuters. **RTC Live** is a comprehensive, real-time public transit tracking system designed to alleviate this issue. By leveraging modern web technologies and real-time database synchronization, the proposed system provides an end-to-end solution featuring dedicated interfaces for commuters, bus drivers, and fleet administrators. This report details the system architecture, technological stack, and the operational workflow of the application, demonstrating a highly scalable and cost-effective solution for modernizing public transit networks.

# 2. Introduction
Public transportation is the backbone of urban mobility. However, the lack of real-time visibility into bus locations leads to increased commuter wait times, anxiety, and an overall decrease in the adoption of public transit. 
RTC Live was developed to address this gap. The primary objective is to provide a unified platform where:
1. **Passengers** can track buses in real-time, view accurate Estimated Times of Arrival (ETAs), and plan their journeys.
2. **Drivers** can effortlessly broadcast their GPS coordinates without needing specialized, expensive hardware.
3. **Administrators** can monitor fleet health, track on-time performance, and manage active route alerts dynamically.

# 3. System Architecture
The application employs a decoupled, cloud-native architecture separating the frontend client from the backend data and logic layers.

## 3.1 Frontend (Client-Side)
The frontend is developed as a Single Page Application (SPA) using **React** and optimized with the **Vite** build tool.
- **User Interface (UI):** Designed with a mobile-first approach, the application utilizes custom responsive CSS to ensure compatibility across all devices without the bloat of heavy external UI libraries.
- **Mapping Engine:** Interactive maps are rendered using **Leaflet.js** integrated with **OpenStreetMap** tile layers. Route geometries are dynamically fetched and plotted using the **OSRM (Open Source Routing Machine) API**.
- **Deployment:** Hosted securely and reliably via **GitHub Pages**.

## 3.2 Backend & Database
To ensure instantaneous data propagation between moving buses and thousands of passenger clients, the backend is split into two specialized services.
- **Firebase Realtime Database:** Acts as the central synchronization hub. It maintains active websocket connections with all clients. As soon as a driver's coordinates change, the data is pushed to Firebase and instantly reflected on all commuter maps. It also securely manages authentication credentials and temporary OTPs.
- **AI Serverless Backend:** Developed using **Python Flask** and deployed as Serverless Functions on **Vercel**. This backend handles complex tasks such as querying datasets and powering the onboard AI Assistant (`AIChatWidget`), ensuring zero idle compute costs.

# 4. Implementation Details & Modules

## 4.1 Authentication Module (`AuthPage.jsx`)
A robust Role-Based Access Control (RBAC) system manages entry into the application. Users must select their role (User, Driver, Admin) during login. The system uses a secure OTP-based password recovery mechanism via EmailJS, bypassing the need for a dedicated SMTP server.

## 4.2 Passenger Interface (`UserDashboard.jsx`)
The core commuter dashboard. 
- **Journey Planning:** Users input their boarding and destination stops. 
- **Live Tracking:** The system calculates the Haversine distance between incoming buses and the user, dividing it by the bus's telemetry speed to provide an accurate ETA. The OSRM API is utilized to draw the exact road paths the bus will take.

## 4.3 Driver Interface (`DriverDashboard.jsx`)
The telemetry broadcast module.
- **Hardware GPS Tracking:** Utilizes the HTML5 Geolocation API to fetch the device's physical coordinates and pushes them to Firebase multiple times a minute.
- **Mock Simulation Engine:** For development and testing, a sophisticated mock engine was built. It queries OSRM for physical road geometry and interpolates a virtual bus along real-world curves rather than drawing unrealistic straight lines.

## 4.4 Fleet Command (`AdminDashboard.jsx`)
The administrative oversight dashboard.
- **Dynamic Metrics:** Replaces static reporting with real-time algorithm-driven metrics. 
- **Active Alerts & Performance:** The system aggressively polls the database. If a bus fails to ping its location within 60 seconds (due to network failure or application closure), the system immediately flags a "Signal Lost" alert and automatically recalculates the fleet's On-Time Performance percentage.

# 5. Operational Workflow
1. **Initialization:** The user authenticates and is routed to their respective dashboard based on their role.
2. **Telemetry Broadcast:** The driver inputs the Bus License Plate and Route Number, initializing the broadcast loop.
3. **Data Consumption:** Commuters querying that route instantly receive the broadcast data. The client-side logic calculates distances and draws routes.
4. **Administrative Oversight:** The Admin monitors the entire network simultaneously, with algorithms monitoring heartbeat signals from all active buses to detect anomalies.

# 6. Conclusion
RTC Live successfully demonstrates a highly efficient, scalable, and low-cost solution to the public transit tracking problem. By utilizing serverless architectures, real-time NoSQL databases, and optimized frontend frameworks, the system delivers enterprise-grade performance without the heavy infrastructure overhead typically associated with municipal transit software. 

# 7. Future Scope
Future enhancements to the system could include:
1. Integration of machine learning models to predict traffic delays based on historical data.
2. Hardware integration directly into bus telemetry systems via IoT modules rather than relying on driver mobile devices.
3. Expanded passenger features such as digital ticketing and multi-modal transit planning.
