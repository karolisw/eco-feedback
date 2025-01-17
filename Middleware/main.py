import sys
import os
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from simulator.simulator_api import SimulatorAPI
from calculations import Calculator
from controller.haptic_feedback import HapticFeedback
from controller.controller_interface import ControllerInterface
from database.database import Database
from websocket.dashboard import Dashboard
from websocket.dashboard import app

import uvicorn

async def main():
    # Initialize components
    simulator = SimulatorAPI()
    calculator = Calculator()
    haptic = HapticFeedback()
    controller = ControllerInterface()
    db = Database()
    dashboard = Dashboard()
    
    # Configure CORS
    app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to your frontend's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


    # Main loop
    while True:
        # Fetch data from simulator
        sim_data = simulator.get_data()
        
        # Get inputs from the controller
        controller_data = controller.get_data()  # E.g., {'speed': 10, 'direction': 180}
        
        # Send updated speed and direction to the simulator
        # TODO this is a bit confusing, we are sending data to the simulator and getting data back (no handling)

        simulator_data = simulator.send_data(controller_data) 
        
        # Process eco-feedback calculations
        eco_score = calculator.calculate_eco_score(sim_data)
        consumption = calculator.calculate_consumption(sim_data)
        emissions = calculator.calculate_emissions(sim_data)
        
        # Aggregate all data #TODO edit this such that it matches the new database setup/structure
        aggregated_data1 = {
            "currentThrust": controller_data['SPEED'],
            "currentAngle": controller_data['ANGLE'],
            "consumption": consumption,
            "currentEmissions": emissions,
            "ecoScore": eco_score,
        }
        
        aggregated_data = {
            "currentThrust": 10,
            "currentAngle": 180,
            "consumption": 5,
            "currentEmissions": 12,
            "ecoScore": 85.5,
        }
        
        print("sending data to dashboard", aggregated_data)
        db = Database()
        
        # Send data to the visual interface
        await dashboard.send_data(aggregated_data)
        await asyncio.sleep(1)
        
        # Add a run to the database
        db.store_data(eco_score=85.5, total_emissions=120.3, run_time=3600, configuration_number=1)

        # Fetch all runs
        db.cursor.execute("SELECT * FROM Run")
        runs = db.cursor.fetchall()
        print(len(runs))

        db.close()

        # Provide haptic feedback
        haptic.provide_feedback(sim_data, eco_score)

        # Transmit data to the controller 
        controller.transmit_direction(sim_data['direction'])
        controller.transmit_speed(sim_data['speed'])

    
if __name__ == "__main__":
    asyncio.run(main())
    
    # Running the FastAPI app will make the websocket endpoint available to the React frontend
    uvicorn.run(app, host="0.0.0.0", port=8000)
