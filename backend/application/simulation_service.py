# application/simulation_service.py
import time
from cos.tools.cviz.Dispatcher import Dispatcher
from cos.tools.cviz.RPCAgent import RPCAgent
from application.vessel_handler import VesselHandler
from application.eco_feedback import EcoFeedback
from infrastructure.cos_api.weather_adapter import WeatherAdapter

class SimulationService:
    """Controls simulation"""
    def __init__(self, vessel_id):
        self.dispatch = Dispatcher(self)
        self.vessel_handler = VesselHandler(vessel_id)
        self.weather_adapter = WeatherAdapter()
        self.ipc = RPCAgent()
        self.ipc.connect()

    def run(self):
        self.init()
        self.loop()

    def init(self):
        """ Subscribes to vessel and weather updates. """
        self.dispatch.subscribe("vessel.move", self.on_vessel_move)
        self.dispatch.subscribe("weather.update", self.on_weather_update)

    def loop(self):
        """ Continuously listens for events. """
        while True:
            self.listen()
            time.sleep(1)

    def listen(self):
        self.ipc.pump(self.dispatch)
        return True

    def on_vessel_move(self, vessel_data):
        """ Updates vessel state when vessel moves. """
        self.vessel_handler.update_vessel_state(vessel_data)

    def on_weather_update(self, weather_data):
        """ Calculates eco-feedback based on weather impact. """
        ship_heading = self.vessel_handler.get_latest_heading()
        for vector in weather_data.get("vectors", []):
            direction = vector["X"][:2]  # Only x, y components
            resistance_angle = EcoFeedback.calculate_resistance_effect(ship_heading, direction)
            print(f"Ship vs. {weather_data['type']} Angle: {resistance_angle}°")
            if resistance_angle > 150:
                print("⚠️ High resistance detected! Ship is moving against the current.")
