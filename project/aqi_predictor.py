import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
import warnings
warnings.filterwarnings("ignore")

# Load and clean dataset
df = pd.read_csv("final dataset.csv")
df.drop(columns=["Unnamed: 0"], inplace=True, errors='ignore')
df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
df = df.dropna(subset=["Date"])
df["Year"] = df["Date"].dt.year
df["Month"] = df["Date"].dt.month
df["Day"] = df["Date"].dt.day
df["Weekday"] = df["Date"].dt.weekday
# Define pollutants
pollutants = ["PM2.5", "PM10", "NO", "NO2", "NOx", "NH3", "CO", "SO2", "O3", "Benzene", "Toluene", "Xylene"]
# Monthly mean pollutant profiles (by station)
monthly_profiles = df.groupby(["StationName", "Month"])[pollutants].mean().reset_index()
# Input from user
station_input = input("Enter your station name (e.g., Ahmedabad, Delhi): ").strip().lower()
year = int(input("Enter year (e.g., 2025): "))
month = int(input("Enter month (1–12): "))
day = int(input("Enter day (1–31): "))
# Validate date
try:
    input_date = pd.Timestamp(f"{year}-{month}-{day}")
    weekday = input_date.weekday()
except ValueError:
    print("❌ Invalid date entered.")
    exit()

# Filter for station
df_station = df[df["StationName"].str.lower() == station_input]
if df_station.empty:
    print("❌ Station not found in dataset.")
    exit()
station_monthly = monthly_profiles[(monthly_profiles["StationName"].str.lower() == station_input) & (monthly_profiles["Month"] == month)]
if station_monthly.empty:
    print(" No monthly pollutant data found for this station.")
    exit()
features = ["Year", "Month", "Day", "Weekday"]
input_data = {
    "Year": year,
    "Month": month,
    "Day": day,
    "Weekday": weekday
}
for col in pollutants:
    if col in station_monthly.columns:
        input_data[col] = station_monthly[col].values[0]
    else:
        input_data[col] = 0
input_df = pd.DataFrame([input_data])
df_station = df_station[df_station["AQI_Bucket"] != '-']
df_station.dropna(subset=features + pollutants + ["AQI", "AQI_Bucket"], inplace=True)
X = df_station[features + pollutants]
y_aqi = df_station["AQI"]
y_bucket = df_station["AQI_Bucket"]

model_aqi = RandomForestRegressor(n_estimators=100, random_state=42)
model_aqi.fit(X, y_aqi)

model_bucket = RandomForestClassifier(n_estimators=100, random_state=42)
model_bucket.fit(X, y_bucket)

pollutant_models = {}
for col in pollutants:
    y = df_station[col]
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    pollutant_models[col] = model

print(f"\n📍 Predictions for {station_input.title()} on {day}-{month}-{year}")
print("-" * 50)

for col in pollutants:
    val = pollutant_models[col].predict(input_df)[0]
    print(f"{col:10}: {val:.2f} µg/m³")

predicted_aqi = round(model_aqi.predict(input_df)[0])
predicted_bucket = model_bucket.predict(input_df)[0]

# Health advisory
def get_advisory(bucket):
    messages = {
        "Good": "Air quality is satisfactory. Enjoy outdoor activities.",
        "Satisfactory": "Acceptable air quality. Sensitive individuals should be cautious.",
        "Moderate": "May cause breathing discomfort in sensitive people.",
        "Poor": "Avoid outdoor activities. Use a mask if needed.",
        "Very Poor": "Serious health effects possible. Stay indoors.",
        "Severe": "Hazardous. Emergency conditions. Use air purifiers if available."
    }
    return messages.get(bucket, "No advisory available.")

print(f"\n🌫️  Predicted AQI       : {predicted_aqi}")
print(f"🧭 AQI Category         : {predicted_bucket}")
print(f"💡 Health Advisory      : {get_advisory(predicted_bucket)}")
print("-" * 50)
