import pandas as pd
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

df = pd.read_csv(
    "ai/datasets/traffic_dataset_with_trend.csv"
)

df["Timestamp"] = pd.to_datetime(
    df["Timestamp"]
)

df["Hour"] = df["Timestamp"].dt.hour

weather_encoder = LabelEncoder()

df["Weather"] = weather_encoder.fit_transform(
    df["Weather"]
)

X = df[
    ["Hour", "Weather", "Events"]
]

y = df["Traffic Volume"]

model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

model.fit(X, y)

joblib.dump(
    model,
    "ai/models/traffic_model.pkl"
)

joblib.dump(
    weather_encoder,
    "ai/models/weather_encoder.pkl"
)

print("Model Trained Successfully")