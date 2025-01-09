# This file handles communication with the simulator

import requests
from config import SIMULATOR_API_URL

class SimulatorAPI:
    def __init__(self):
        self.api_url = SIMULATOR_API_URL

    def send_data(self, controller_data):
        """Send speed and direction to the simulator and fetch additional data."""
        response = requests.post(f"{self.api_url}/update", json=controller_data)
        response.raise_for_status()
        return response.json()  # Expected: {'wave_angle': ..., 'wind_speed': ...}

    