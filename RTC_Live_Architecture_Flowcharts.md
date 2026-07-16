# RTC Live: Architecture Flowcharts

This document provides visual representations of the RTC Live architecture.

## 1. High-Level System Architecture

```mermaid
graph TD
UserApp[Passenger App]
DriverApp[Driver App]
AdminApp[Admin Dashboard]
Auth[Firebase Authentication]
RTDB[Firebase Realtime Database]
FlaskApp[Flask AI API]
MLModel[Traffic Prediction Model]
NLPEngine[NLP Engine]
OSM[OpenStreetMap]
OSRM[OSRM Routing Engine]
EmailJS[EmailJS OTP]
UserApp-->|Reads Live GPS|RTDB
DriverApp-->|Writes Live GPS|RTDB
AdminApp-->|Reads Fleet Status|RTDB
UserApp-->|Authenticates|Auth
DriverApp-->|Authenticates|Auth
AdminApp-->|Authenticates|Auth
UserApp-->|Queries API|FlaskApp
FlaskApp-->MLModel
FlaskApp-->NLPEngine
UserApp-->OSM
AdminApp-->OSM
DriverApp-->|Snaps route|OSRM
Auth-->|Password Reset|EmailJS
```

---

## 2. Frontend Component Routing and State

```mermaid
graph TD
App[App.jsx Root]
AuthFlow[AuthFlow State Machine]
AuthPage[AuthPage.jsx]
UserDash[UserDashboard.jsx]
DriverDash[DriverDashboard.jsx]
AdminDash[AdminDashboard.jsx]
OTPPage[OTPPage.jsx]
MapComp[MapComponent.jsx]
AIChat[AIChatWidget.jsx]
DashScreens[DashboardScreens.jsx]
App-->AuthFlow
AuthFlow-->|No Session|AuthPage
AuthFlow-->|Passenger Session|UserDash
AuthFlow-->|Driver Session|DriverDash
AuthFlow-->|Admin Session|AdminDash
AuthPage-->OTPPage
UserDash-->MapComp
UserDash-->AIChat
UserDash-->DashScreens
AdminDash-->MapComp
```

---

## 3. Backend AI and Data ETL Pipeline

```mermaid
graph TD
RawCSV[Raw Municipal Data]
TrafficData[Historical Traffic Logs]
GenMapData[generate_map_data.py]
TrainModel[train_model.py]
UpdateChatbot[update_chatbot_data.py]
StopsJSON[stops.json]
ModelPKL[traffic_model.pkl]
ChatbotData[JSON Dictionary]
Flask[Flask API app.py]
OSMAPI[OSM Nominatim API]
RawCSV-->GenMapData
TrafficData-->TrainModel
RawCSV-->UpdateChatbot
GenMapData-->OSMAPI
OSMAPI-->GenMapData
GenMapData-->|Outputs|StopsJSON
TrainModel-->|Exports Model|ModelPKL
UpdateChatbot-->|Outputs|ChatbotData
ModelPKL-->|Loads into RAM|Flask
ChatbotData-->|Loads into memory|Flask
```

---

## 4. Driver Telemetry Engine

```mermaid
graph TD
Start[Driver Logs In]-->Input[Enter Bus ID and Route]
Input-->Mode{Dev Mode}
Mode-->|Yes|Sim[Fetch polyline from OSRM]
Sim-->SimLoop[setInterval Loop]
SimLoop-->Interp[Calculate interpolated coordinates]
Interp-->PushSim[Set coordinate to Firebase]
PushSim-->SimLoop
Mode-->|No|Hard[navigator.geolocation.watchPosition]
Hard-->Config[Apply enableHighAccuracy]
Config-->WaitMove[Wait for physical movement]
WaitMove-->GPSData[Extract Lat Lng from Satellite]
GPSData-->PushFB[Set payload to Firebase]
PushFB-->WaitMove
Emerg[Driver clicks Emergency]-->PushFB
Occup[Driver updates Crowd Level]-->PushFB
```
