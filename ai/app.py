import os
import joblib
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "traffic_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "models", "weather_encoder.pkl")

model = None
weather_encoder = None

def load_models():
    global model, weather_encoder
    if os.path.exists(MODEL_PATH) and os.path.exists(ENCODER_PATH):
        model = joblib.load(MODEL_PATH)
        weather_encoder = joblib.load(ENCODER_PATH)
        print("Models loaded successfully.")
    else:
        print("Model files not found. Train the model first.")

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

if __name__ == '__main__':
    load_models()
    app.run(host='0.0.0.0', port=5000, debug=True)
