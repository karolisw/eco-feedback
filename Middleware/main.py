# This is the entry point of the program

from Middleware.simulator.simulator_api import SimulatorAPI
from Middleware.calculations import Calculator
from Middleware.controller.haptic_feedback import HapticFeedback
from Middleware.controller.controller_interface import ControllerInterface
from Middleware.database.database import Database
from Middleware.dashboard.visual_interface import VisualInterface
import uvicorn
from Middleware.dashboard.visual_interface import app

def main():
    # Initialize components
    simulator = SimulatorAPI()
    calculator = Calculator()
    haptic = HapticFeedback()
    controller = ControllerInterface()
    db = Database()
    visual_interface = VisualInterface()


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
        
        # Aggregate all data
        aggregated_data = {
            "speed": controller_data['speed'],
            "direction": controller_data['direction'],
            "consumption": consumption,
            "emissions": emissions,
            "eco_score": eco_score,
        }
        
        # Send data to the visual interface
        visual_interface.send_data(aggregated_data)

        # Store data in the database
        db.store_data(sim_data, eco_score, consumption, emissions) # TODO should this be in the loop - could be way too much data

        # Provide haptic feedback
        haptic.provide_feedback(sim_data, eco_score)

        # Transmit data to the controller 
        controller.transmit_direction(sim_data['direction'])
        controller.transmit_speed(sim_data['speed'])

    
if __name__ == "__main__":
    main()
    
    # Running the FastAPI app will make the websocket endpoint available to the React frontend
    uvicorn.run(app, host="0.0.0.0", port=8000)
