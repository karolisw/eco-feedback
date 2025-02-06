import os
import sqlite3

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
    
        
        # TODO refactor class - i probably might not even need the class
        # 1) create a call that stores the data in the database
        # 2) create a call that fetches the data from the database
        # 3) the logic to start a simulation could easily just be moved to backend/main.py
        # 4) the methods stated in 1) and 2) could be moved into /persistance/database.py
        # 5) the instantiation of the database connection could be moved to /persistance/database.py as well - or main.py
        
        
        """

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
            """

        # Close the database connection when exiting
        conn.close()
