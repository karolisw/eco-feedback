# application/simulation_service.py
import time
from cos.tools.cviz.Dispatcher import Dispatcher
from cos.tools.cviz.RPCAgent import RPCAgent
from application.vessel_handler import VesselHandler
from application.eco_feedback import EcoFeedback
from application.weather_handler import WeatherHandler
class SimulationService:
    """Controls simulation"""
    def __init__(self, vessel_id):
        self.dispatch = Dispatcher(self)
        self.vessel_handler = VesselHandler(vessel_id)
        self.weather_handler = WeatherHandler()
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

    # TODO needs work, but good enough for now
    def on_weather_update(self, weather_data):
        """ Updates weather state when weather changes. """
        self.weather_handler.update_weather(weather_data)
        results = self.weather_handler.process_weather_effects(self.vessel_handler.get_latest_heading())
        print(f"the first result is", results[0])
        