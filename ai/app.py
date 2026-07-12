import os
import joblib
import pandas as pd
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "traffic_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "models", "weather_encoder.pkl")
ROUTES_PATH = os.path.join(BASE_DIR, "datasets", "vizag_routes.json")

model = None
weather_encoder = None
routes_data = {}

def load_models():
    global model, weather_encoder, routes_data
    if os.path.exists(MODEL_PATH) and os.path.exists(ENCODER_PATH):
        model = joblib.load(MODEL_PATH)
        weather_encoder = joblib.load(ENCODER_PATH)
        print("Models loaded successfully.")
    else:
        print("Model files not found. Train the model first.")
        
    if os.path.exists(ROUTES_PATH):
        with open(ROUTES_PATH, 'r') as f:
            routes_data = json.load(f)
        print("Routes data loaded successfully.")
    else:
        print("Routes data not found.")

@app.route('/predict', methods=['POST'])
def predict():
    if model is None or weather_encoder is None:
        load_models()
        
    if model is None or weather_encoder is None:
        return jsonify({"error": "Models not loaded. Train the model first."}), 500

    data = request.json
    try:
        hour = int(data.get("hour", 12))
        weather = str(data.get("weather", "Clear"))
        events = int(data.get("events", 0))

        # Encode weather
        try:
            weather_encoded = weather_encoder.transform([weather])[0]
        except ValueError:
            weather_encoded = 0

        # Predict
        input_data = pd.DataFrame([[hour, weather_encoded, events]], columns=["Hour", "Weather", "Events"])
        prediction = model.predict(input_data)[0]

        return jsonify({
            "predicted_traffic_volume": round(prediction, 2),
            "eta_minutes": max(5, int(round(prediction / 100))) 
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/chat', methods=['POST'])
def chat():
    if not routes_data:
        load_models()
        
    data = request.json
    message = str(data.get("message", "")).lower()
    
    if not message:
        return jsonify({"reply": "Please ask me something."})

    # Simple Rule-based logic
    reply = ""
    routes = routes_data.get("routes", [])
    bot_responses = routes_data.get("bot_responses", {})
    
    if "hello" in message or "hi" in message:
        reply = bot_responses.get("greeting", "Hello!")
    elif "help" in message:
        reply = bot_responses.get("help", "I can help with bus routes.")
    else:
        # Check for specific bus route numbers (e.g. 38Y, 400K)
        found_route = None
        for r in routes:
            if r["id"].lower() in message:
                found_route = r
                break
                
        if found_route:
            if "time" in message or "when" in message or "first" in message or "last" in message:
                reply = f"For route {found_route['id']} ({found_route['name']}), the first bus is at {found_route['first_bus']} and the last bus is at {found_route['last_bus']}. Frequency is every {found_route['frequency_mins']} mins."
            elif "fare" in message or "cost" in message or "price" in message or "ticket" in message:
                reply = f"The fare for route {found_route['id']} ranges from {found_route['fare_range']}."
            elif "stop" in message or "where" in message:
                stops_str = ", ".join(found_route['stops'])
                reply = f"Route {found_route['id']} stops at: {stops_str}."
            else:
                reply = f"Route {found_route['id']} goes from {found_route['name']}. It runs every {found_route['frequency_mins']} mins. Stops include: {', '.join(found_route['stops'][:3])}..."
        else:
            # Check for places/stops
            places_found = []
            for r in routes:
                for stop in r["stops"]:
                    if stop.lower() in message:
                        places_found.append(r["id"])
                        break
            
            if places_found:
                unique_places = list(set(places_found))
                reply = f"Buses going through there: {', '.join(unique_places)}."
            else:
                reply = bot_responses.get("fallback", "I didn't understand.")
                
    return jsonify({"reply": reply})

if __name__ == '__main__':
    load_models()
    app.run(host='0.0.0.0', port=5000, debug=True)
