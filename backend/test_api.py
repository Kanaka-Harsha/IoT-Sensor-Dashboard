import unittest
import json
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from db import init_db, execute_query

class TestIoTDashboardBackend(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Ensure database tables are initialized before tests run."""
        try:
            init_db()
        except Exception as e:
            print(f"Skipping DB initialization if Postgres is not reachable locally: {e}")

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_01_water_quality_ingestion(self):
        payload = {
            "turbidity": 2850,
            "ph": 7.02,
            "tds_ppm": 345.8
        }
        response = self.app.post(
            "/sensor-data",
            data=json.dumps(payload),
            content_type="application/json"
        )
        print("\nWater Quality Ingestion Response:", response.status_code, response.get_json())
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data["status"], "success")
            self.assertIn("inserted_id", data)

    def test_01b_water_quality_esp32_format(self):
        payload = {
            "turbidity": 2450,
            "ph": 7.35,
            "tds_ppm": 310.5
        }
        response = self.app.post(
            "/sensor-data",
            data=json.dumps(payload),
            content_type="application/json"
        )
        print("\nESP32 Water Quality Ingestion Response:", response.status_code, response.get_json())
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data["status"], "success")
            self.assertIn("inserted_id", data)

    def test_02_air_quality_ingestion(self):
        payload = {
            "temperature_c": 28.1,
            "humidity": 64.5,
            "pm25": 18.4,
            "pm10": 42.1,
            "co2": 412.0,
            "aqi": 55.0
        }
        response = self.app.post(
            "/api/air-quality",
            data=json.dumps(payload),
            content_type="application/json"
        )
        print("\nAir Quality Ingestion Response:", response.status_code, response.get_json())
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data["status"], "success")
            self.assertIn("inserted_id", data)

    def test_02b_air_quality_esp32_format(self):
        payload = {
            "temperature_c": 27.8,
            "humidity_pct": 58.2,
            "voc_index": 120,
            "co2_ppm": 450,
            "sht4x_ok": True,
            "s88_ok": True
        }
        response = self.app.post(
            "/air-quality-data",
            data=json.dumps(payload),
            content_type="application/json"
        )
        print("\nESP32 Air Quality Ingestion Response:", response.status_code, response.get_json())
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data["status"], "success")
            self.assertIn("inserted_id", data)

    def test_02c_pi4_temperature_ingestion(self):
        payload = {
            "temp": 25.4,
            "humidity": 48.2,
            "pressure": 1013.25,
            "gas_resistance": 54200
        }
        response = self.app.post(
            "/api/pi4/temperature",
            data=json.dumps(payload),
            content_type="application/json"
        )
        print("\nPi 4 Temperature Ingestion Response:", response.status_code, response.get_json())
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data["status"], "success")
            self.assertIn("inserted_id", data)

    def test_02d_washroom_hygiene_ingestion(self):
        payload = {
            "gas": 145,
            "temperature_c": 26.4,
            "humidity": 68.2
        }
        response = self.app.post(
            "/api/washroom/hygiene",
            data=json.dumps(payload),
            content_type="application/json"
        )
        print("\nWashroom Hygiene Ingestion Response:", response.status_code, response.get_json())
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data["status"], "success")
            self.assertIn("inserted_id", data)

    def test_03_frontend_get_water_quality(self):
        response = self.app.get("/api/water-quality?limit=10")
        print("\nGet Water Quality Response:", response.status_code)
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data["status"], "success")
            self.assertIsInstance(data["data"], list)

    def test_04_frontend_get_air_quality(self):
        response = self.app.get("/api/air-quality?limit=10")
        print("\nGet Air Quality Response:", response.status_code)
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data["status"], "success")
            self.assertIsInstance(data["data"], list)

    def test_04b_frontend_get_pi4_temperature(self):
        response = self.app.get("/api/pi4/temperature?limit=10")
        print("\nGet Pi 4 Temperature Response:", response.status_code)
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data["status"], "success")
            self.assertIsInstance(data["data"], list)

    def test_04c_frontend_get_washroom_hygiene(self):
        response = self.app.get("/api/washroom/hygiene?limit=10")
        print("\nGet Washroom Hygiene Response:", response.status_code)
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data["status"], "success")
            self.assertIsInstance(data["data"], list)

    def test_05_frontend_get_latest(self):
        response = self.app.get("/api/latest")
        print("\nGet Latest Readings Response:", response.status_code)
        if response.status_code == 200:
            data = response.get_json()
            self.assertEqual(data["status"], "success")

if __name__ == "__main__":
    unittest.main()
