import os
import joblib
import pandas as pd
import json
import re
import difflib
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

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

FILLERS = set(["how", "to", "get", "from", "please", "pls", "tell", "me", "the", "a", "an", "is", "where", "can", "i", "find", "bus", "buses", "between", "go", "going", "take", "want", "need", "travel", "route", "routes", "for", "of", "and", "in", "at", "on", "by", "there", "here", "are"])

@app.route('/chat', methods=['POST'])
def chat():
    if not routes_data:
        load_models()
        
    data = request.json
    message = str(data.get("message", "")).lower()
    
    if not message:
        return jsonify({"reply": "Please ask me something."})

    context = data.get("context", {})
    incoming_buses = context.get("incomingBuses", [])
    nearby_buses = context.get("nearbyBuses", [])
    boarding = context.get("boardingPoint", "")
    destination = context.get("destination", "")

    routes = routes_data.get("routes", [])
    bot_responses = routes_data.get("bot_responses", {})
    
    # 0. NAME intent
    name_match = re.search(r'\b(i am|i\'m|im|my name is|call me)\s+([a-z]+)\b', message)
    if name_match:
        name = name_match.group(2).capitalize()
        return jsonify({"reply": f"Hi {name}, how may I help you?"})
        
    # 1. GREETING intent
    if re.search(r'^\b(hi|hello|hey|greetings)\b', message):
        return jsonify({"reply": bot_responses.get("greeting", "Hello! How can I help you with your journey today?")})
        
    # 1.5 LIVE TRACKING & CONTEXT AWARE INTENT
    if incoming_buses:
        best_bus = incoming_buses[0]
        if re.search(r'\b(time|when|eta|coming|long|wait|arrive|arriving)\b', message):
            reply = f"Your bus on route {best_bus.get('routeId', 'Unknown')} is currently {best_bus.get('dist', 0):.1f} km away. It will arrive in approximately {best_bus.get('etaMins', 0)} minutes."
            return jsonify({"reply": reply})
        if re.search(r'\b(fare|cost|price|ticket|much)\b', message):
            for r in routes:
                if r["id"] == best_bus.get("routeId"):
                    reply = f"The fare for your current route {r['id']} ({boarding} to {destination}) typically ranges from {r['fare_range']}."
                    return jsonify({"reply": reply})
                    
    if nearby_buses and re.search(r'\b(near|around|close|nearby)\b', message):
        routes_near = list(set([b.get("routeId") for b in nearby_buses if b.get("routeId")]))
        if routes_near:
            reply = f"I see buses on routes {', '.join(routes_near)} currently near your location. You can select one on the map to track it."
        else:
            reply = "There are currently no active buses very close to your location."
        return jsonify({"reply": reply})
    
    # 2. Identify if a specific Route ID was mentioned
    found_route = None
    for r in routes:
        if r["id"].lower() in message.split():
            found_route = r
            break
            
    if found_route:
        # SCHEDULE_INFO intent
        if re.search(r'\b(time|when|first|last|frequency|schedule)\b', message):
            reply = f"Route {found_route['id']} ({found_route['name']}) runs every {found_route['frequency_mins']} mins. The first bus is at {found_route['first_bus']} and the last bus is at {found_route['last_bus']}."
        # FARE_INFO intent
        elif re.search(r'\b(fare|cost|price|ticket|much)\b', message):
            reply = f"The fare for route {found_route['id']} typically ranges from {found_route['fare_range']}."
        # ROUTE_INFO intent
        elif re.search(r'\b(stop|where|path|via)\b', message):
            stops_str = ", ".join(found_route['stops'])
            reply = f"Route {found_route['id']} stops at: {stops_str}."
        else:
            reply = f"Route {found_route['id']} goes from {found_route['name']}. It runs every {found_route['frequency_mins']} mins. Stops include: {', '.join(found_route['stops'][:4])}..."
            
        return jsonify({"reply": reply})

    # 3. PATH_FINDING intent: Extract stops using n-grams and difflib fuzzy matching
    all_stops_lower = {}
    for r in routes:
        for stop in r["stops"]:
            all_stops_lower[stop.lower()] = stop
            
    # Clean message and create n-grams
    words = [w for w in re.findall(r'\b[a-z0-9]+\b', message) if w not in FILLERS]
    
    ngrams = []
    for n in range(1, 4):
        for i in range(len(words) - n + 1):
            ngrams.append(" ".join(words[i:i+n]))
            
    mentioned_stops = set()
    for ngram in ngrams:
        for stop_key in all_stops_lower.keys():
            # 1. Exact Substring Match (handles "duvvada" in "duvvada railway station")
            if len(ngram) >= 3 and ngram in stop_key:
                mentioned_stops.add(all_stops_lower[stop_key])
            
            # 2. Fuzzy Match on the entire stop name
            elif difflib.SequenceMatcher(None, ngram, stop_key).ratio() > 0.75:
                mentioned_stops.add(all_stops_lower[stop_key])
                
            # 3. Fuzzy Match on individual words of the stop (handles "duvada" in "duvvada railway station")
            else:
                stop_words = stop_key.split()
                if len(ngram.split()) == 1 and len(ngram) >= 3:
                    word_matches = difflib.get_close_matches(ngram, stop_words, n=1, cutoff=0.80)
                    if word_matches:
                        mentioned_stops.add(all_stops_lower[stop_key])
            
    if len(mentioned_stops) >= 2:
        valid_routes = []
        for r in routes:
            stops_in_route = [s for s in mentioned_stops if s in r["stops"]]
            if len(stops_in_route) >= 2:
                valid_routes.append(r["id"])
        
        stops_list = " and ".join(list(mentioned_stops)[:2])
        if valid_routes:
            reply = f"To travel between {stops_list}, you can take Route(s): {', '.join(valid_routes)}."
        else:
            reply = f"I couldn't find a direct bus route connecting {stops_list}."
            
    elif len(mentioned_stops) == 1:
        stop_name = list(mentioned_stops)[0]
        valid_routes = []
        for r in routes:
            if stop_name in r["stops"]:
                valid_routes.append(r["id"])
        if valid_routes:
            reply = f"Buses that stop at {stop_name}: {', '.join(valid_routes)}."
        else:
            reply = f"I know the stop {stop_name}, but I don't have any routes for it currently."
    else:
        # 4. HELP or FALLBACK
        if re.search(r'\b(help|support)\b', message):
             reply = bot_responses.get("help", "I can help you find bus routes, timings, and fares. Just ask something like 'how to get to RK Beach?'")
        else:
             reply = bot_responses.get("fallback", "I'm sorry, I couldn't quite understand that. Could you try rephrasing your question with specific bus stops or route numbers?")

    return jsonify({"reply": reply})

# Load models immediately for Gunicorn/production
load_models()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
