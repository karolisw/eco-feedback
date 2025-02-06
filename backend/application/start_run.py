import asyncio
import os
import sqlite3
import random
from infrastructure.websocket.dashboard import dashboard
# Import path_to_db from config.yaml


class MainService:
    """Handles the core functionality of the application"""

    async def run(self):
        """ Continuously fetches data, processes it, and sends feedback. """
        
        # Determine the base directory (backend/)
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))

        runs_db = os.path.join(base_dir, "runs.db") 

        # Create a new database connection inside the function
        conn = sqlite3.connect(runs_db)  
        cursor = conn.cursor()

        # Clear database before starting
        cursor.execute("DELETE FROM Run")
        conn.commit()

        while True:
            # Aggregate and store data
            aggregated_data = {
                "currentThrust": random.randint(0, 100),
                "currentAngle": random.randint(0, 360),
                "consumption": random.randint(0, 100),
                "currentEmissions": random.randint(0, 100),
                "ecoScore": random.randint(0, 100),
            }
            
            # Store data in the database
            cursor.execute(
                "INSERT INTO Run (eco_score, total_emissions, run_time, configuration_number) VALUES (?, ?, ?, ?)",
                (aggregated_data["ecoScore"], aggregated_data["currentEmissions"], 3600, 1)
            )
            conn.commit()

            #print(f"Stored data: {aggregated_data}")

            await asyncio.sleep(5)  # Simulate a periodic update

        # Close the database connection when exiting
        conn.close()
