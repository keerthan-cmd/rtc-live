import csv
import json
import time
import requests
import random
import os

CSV_PATH = r"c:\Users\panch\Documents\csp real\data\Visakhapatnam_APSRTC_Bus_Routes.csv"
STOPS_OUT = r"c:\Users\panch\Documents\csp real\frontend\src\data\stops.json"
ROUTES_OUT = r"c:\Users\panch\Documents\csp real\frontend\src\data\routes_data.json"

# Vizag center for fallback
VIZAG_CENTER = [17.72, 83.30]

def geocode_stop(stop_name):
    # Try to use nominatim
    url = f"https://nominatim.openstreetmap.org/search?q={stop_name},+Visakhapatnam,+Andhra+Pradesh,+India&format=json&limit=1"
    headers = {'User-Agent': 'RTCVizagTracker/1.0'}
    try:
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data:
                return [float(data[0]['lat']), float(data[0]['lon'])]
    except Exception as e:
        print(f"Failed to geocode {stop_name}: {e}")
    
    # Fallback to random coordinate near Vizag center
    return [
        VIZAG_CENTER[0] + random.uniform(-0.05, 0.05),
        VIZAG_CENTER[1] + random.uniform(-0.05, 0.05)
    ]

def process_data():
    stops = {}
    routes = {}

    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            route_num = row['Route Number'].strip()
            source = row['Source'].strip()
            dest = row['Destination'].strip()
            via_raw = row['Via']
            
            # Parse 'Via' stops
            via_stops = [s.strip() for s in via_raw.split(',')] if via_raw else []
            
            # The full path of the bus is Source -> Via -> Destination
            route_path = [source] + via_stops + [dest]
            # Remove any empty strings
            route_path = [s for s in route_path if s]
            
            routes[route_num] = route_path
            
            for stop in route_path:
                if stop not in stops:
                    stops[stop] = None

    print(f"Found {len(stops)} unique stops. Geocoding...")
    
    # Geocode all stops
    for idx, stop in enumerate(stops.keys()):
        print(f"[{idx+1}/{len(stops)}] Geocoding: {stop}")
        stops[stop] = geocode_stop(stop)
        time.sleep(1) # Respect Nominatim limits

    # Create directories if they don't exist
    os.makedirs(os.path.dirname(STOPS_OUT), exist_ok=True)

    with open(STOPS_OUT, 'w') as f:
        json.dump(stops, f, indent=2)
        
    with open(ROUTES_OUT, 'w') as f:
        json.dump(routes, f, indent=2)

    print(f"Data generated successfully in {os.path.dirname(STOPS_OUT)}")

if __name__ == "__main__":
    process_data()
