import sys, signal, threading
import uvicorn
from infrastructure.cos_api.coslaunch_adapter import CosLaunchAdapter
from application.simulation_service import SimulationService
from application.main_service import MainService
from presentation.api import app 

coslaunch_app = CosLaunchAdapter() #TODO should this be moved into main method?

def signal_handler(sig, frame):
    """Handles Ctrl+C to gracefully exit"""
    print("\nShutting down COSLaunch and Simulator...")
    coslaunch_app.stop()
    sys.exit(0)

def main():
    signal.signal(signal.SIGINT, signal_handler)

    # Start COSLaunch application
    coslaunch_thread = threading.Thread(target=coslaunch_app.start)
    coslaunch_thread.start()

    vessel_id = "bedc897f-512b-45a2-aea4-bcfc248d2a8d"
    
    # Start the simulation 
    simulator = SimulationService(vessel_id)
    simulator_thread = threading.Thread(target=simulator.run)
    simulator_thread.start()
    
    # Start the core backend functionality
    main_service = MainService()
    main_service_thread = threading.Thread(target=main_service.run)
    main_service_thread.start()
    
    # Start API/WebSocket Server
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
