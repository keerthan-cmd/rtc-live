from flask import Flask, jsonify, request
import pandas as pd
from scipy.spatial import distance
import random

app = Flask(__name__, static_folder='static', static_url_path='')

EXCEL_FILE = 'APSRTC_Network_Dataset_v5.xlsx'

def get_dataset():
    return pd.read_excel(EXCEL_FILE, sheet_name='Tracking_Data')

@app.route('/')
def home():
    return app.send_static_file('index.html')

@app.route('/api/stops/near', methods=['GET'])
def get_nearby_stops():
    df = get_dataset()
    user_lat = float(request.args.get('lat', 17.6745))
    user_lng = float(request.args.get('lng', 83.2135))
        
    unique_stops = df.drop_duplicates(subset=['stop_id']).copy()
    unique_stops['distance'] = unique_stops.apply(
        lambda row: distance.euclidean((user_lat, user_lng), (row['latitude'], row['longitude'])), axis=1
    )
    sorted_stops = unique_stops.sort_values(by='distance').head(5)
    return jsonify(sorted_stops[['stop_id', 'stop_name', 'latitude', 'longitude']].to_dict(orient='records'))

@app.route('/api/buses/between', methods=['GET'])
def get_buses_between():
    df = get_dataset()
    origin = request.args.get('origin', '').strip().lower()
    dest = request.args.get('dest', '').strip().lower()
    bus_type = request.args.get('type', 'All').strip()
    
    if not origin or not dest: return jsonify([])

    routes_with_origin = df[df['stop_name'].str.lower().str.contains(origin)]['route_id'].unique()
    routes_with_dest = df[df['stop_name'].str.lower().str.contains(dest)]['route_id'].unique()
    valid_routes = list(set(routes_with_origin) & set(routes_with_dest))
    
    if not valid_routes: return jsonify([])

    # Apply 3rd input filter
    active_vehicles = df[df['route_id'].isin(valid_routes)].drop_duplicates(subset=['vehicle_id'])
    if bus_type != "All":
        active_vehicles = active_vehicles[active_vehicles['service_type'].str.contains(bus_type, case=False)]
    
    results = []
    for _, row in active_vehicles.iterrows():
        results.append({
            "vehicle_id": str(row['vehicle_id']),
            "route_id": str(row['route_id']),
            "service_type": str(row['service_type']),
            "live_lat": float(row['lat']),
            "live_lng": float(row['long']),
            "eta": random.randint(4, 15)
        })
    return jsonify(results)

@app.route('/api/route/variants/<route_no>', methods=['GET'])
def get_route_variants(route_no):
    df = get_dataset()
    route_df = df[df['route_id'].str.upper() == route_no.upper()].drop_duplicates(subset=['vehicle_id'])
    
    if route_df.empty: return jsonify({"error": "No active vehicles found."}), 404
        
    return jsonify([{
        "vehicle_id": str(row['vehicle_id']),
        "route_id": str(row['route_id']),
        "service_type": str(row['service_type']),
        "destination": str(row['destination']),
    } for _, row in route_df.iterrows()])

@app.route('/api/track/vehicle/<vehicle_id>', methods=['GET'])
def track_specific_vehicle(vehicle_id):
    df = get_dataset()
    vehicle_df = df[df['vehicle_id'].str.upper() == vehicle_id.upper()]
    if vehicle_df.empty: return jsonify({"error": "Vehicle not found."}), 404
        
    v_data = vehicle_df.iloc[0]
    route_stops = df[df['vehicle_id'] == vehicle_id].drop_duplicates(subset=['stop_id']).sort_values('sequence_order')
    
    return jsonify({
        "vehicle": {
            "id": str(v_data['vehicle_id']),
            "type": str(v_data['service_type']),
            "lat": float(v_data['lat']),
            "lng": float(v_data['long']),
            "next_stop": str(v_data['next_stop_id']),
            "crowdness": str(v_data['crowdness']),
            "next_bus": str(v_data['next_bus_eta'])
        },
        "path": [{"stop_name": str(s['stop_name']), "lat": float(s['latitude']), "lng": float(s['longitude'])} for _, s in route_stops.iterrows()]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)