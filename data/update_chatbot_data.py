import csv
import json
import os

CSV_PATH = r"c:\Users\panch\Documents\csp real\data\Visakhapatnam_APSRTC_Bus_Routes.csv"
OUT_PATH = r"c:\Users\panch\Documents\csp real\ai\datasets\vizag_routes.json"

def update_chatbot_data():
    routes = []
    
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            route_id = row['Route Number'].strip()
            source = row['Source'].strip()
            dest = row['Destination'].strip()
            via_raw = row['Via']
            
            # Parse 'Via' stops
            via_stops = [s.strip() for s in via_raw.split(',')] if via_raw else []
            route_path = [source] + via_stops + [dest]
            route_path = [s for s in route_path if s]
            
            first_bus = row.get('First Bus', '06:00 AM').strip()
            last_bus = row.get('Last Bus', '09:00 PM').strip()
            freq = row.get('Frequency (Mins)', '20').strip()
            
            # Create the object expected by the chatbot
            routes.append({
                "id": route_id,
                "name": f"{source} to {dest}",
                "first_bus": first_bus,
                "last_bus": last_bus,
                "frequency_mins": int(freq) if freq.isdigit() else 20,
                "fare_range": "₹10 - ₹40", # Default fare
                "stops": route_path
            })

    output_data = {
        "bot_responses": {
            "greeting": "Hello! I am your RTC Vizag assistant. I can help you find bus routes, timings, and fares. Which route or place are you looking for?",
            "help": "I can help you find bus routes, first and last bus timings, frequencies, and fares. For example, ask me 'When is the first bus for 10A?' or 'What buses go to NAD?'",
            "fallback": "I'm sorry, I couldn't find information about that. Try asking about a specific route like '38' or a place like 'RK Beach'."
        },
        "routes": routes
    }
    
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w') as f:
        json.dump(output_data, f, indent=2)
        
    print(f"Chatbot dataset updated with {len(routes)} routes!")

if __name__ == "__main__":
    update_chatbot_data()
