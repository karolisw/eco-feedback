# application/main_service.py
import asyncio
from infrastructure.database.database import Database
from infrastructure.websocket.dashboard import dashboard
import random

class MainService:
    """Handles the core functionality of the application"""
    def __init__(self):
        self.db = Database()

    async def run(self):
        """ Continuously fetches data, processes it, and sends feedback. """
        self.db.clear_data()  # Clean up database before start

        while True:
            # TODO Fetch simulator & controller data

            # TODOSend updated controls to simulator

            # Process eco-feedback calculations

            # Aggregate and store data
            aggregated_data = {
                "currentThrust": random.randint(0, 100),
                "currentAngle": random.randint(0, 360),
                "consumption": random.randint(0, 100),
                "currentEmissions": random.randint(0, 100),
                "ecoScore": random.randint(0, 100),
            }
            self.db.store_data(aggregated_data["ecoScore"], aggregated_data["currentEmissions"], run_time=3600, configuration_number=1)

            # Send data to the visual interface
            await dashboard.send_data(aggregated_data)
            await asyncio.sleep(1)

            # TODO Provide haptic feedback
            

