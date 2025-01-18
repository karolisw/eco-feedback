import asyncio
import uvicorn

from simulator.mock_simulator_api import MockSimulatorAPI
from calculations import Calculator
from controller.haptic_feedback import HapticFeedback
from controller.controller_interface import ControllerInterface
from database.database import Database
from websocket.dashboard import dashboard, app

@app.on_event("startup")
async def startup_event():
    print("Starting up the middleware")
    asyncio.create_task(main_loop())

async def main_loop():
    """
    Main loop that runs continuously during the application lifespan.
    """
    # Initialize components
    simulator = MockSimulatorAPI()
    calculator = Calculator()
    haptic = HapticFeedback()
    controller = ControllerInterface()
    db = Database()

    # Main loop
    while True:
        # Fetch data from simulator
        sim_data = simulator.get_data()
        
        # Get inputs from the controller
        controller_data = controller.get_data()  # E.g., {'speed': 10, 'direction': 180}
        
        # Send updated speed and direction to the simulator
        simulator.send_data(controller_data) 
        
        
        # Process eco-feedback calculations
        eco_score = calculator.calculate_eco_score(controller_data=controller_data, simulator_data=sim_data)
        consumption = calculator.calculate_consumption(controller_data=controller_data, simulator_data=sim_data)
        emissions = calculator.calculate_emissions(controller_data=controller_data, simulator_data=sim_data)
    
        
        # Aggregate all data #TODO edit this such that it matches the new database setup/structure
        aggregated_data = {
            "currentThrust": controller_data['speed'],
            "currentAngle": controller_data['angle'],
            "consumption": consumption,
            "currentEmissions": emissions,
            "ecoScore": eco_score,
        }
        
        db = Database()
        
        # Send data to the visual interface
        await dashboard.send_data(aggregated_data)
        await asyncio.sleep(1)
        
        # Add a run to the database
        db.store_data(eco_score=85.5, total_emissions=120.3, run_time=3600, configuration_number=1)

        # Fetch all runs
        db.cursor.execute("SELECT * FROM Run")
        runs = db.cursor.fetchall()

        db.close()

        # Provide haptic feedback
        haptic.provide_feedback(sim_data, eco_score)


    
if __name__ == "__main__":
    # Running the FastAPI app will make the websocket endpoint available to the React frontend
    uvicorn.run(app, host="0.0.0.0", port=8000)