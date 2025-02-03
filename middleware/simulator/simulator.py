#!/usr/bin/python
# Filename: simulator.py
# Description: Middleware for analyzing ship movement vs. environmental forces

import numpy as np
import time
from cos.tools.cviz.Dispatcher import Dispatcher
from cos.core.api.Vessel import Vessel
from cos.tools.cviz.RPCAgent import RPCAgent

class Simulator:
    def __init__(self):
        self.dispatch = Dispatcher(self)
        self.vessel_id = 'bedc897f-512b-45a2-aea4-bcfc248d2a8d'  # Modify if needed
        self.proxy = Vessel()
        self.latest_heading = [1, 0]  # Default heading (East) to prevent errors
        self.ipc = RPCAgent()
        self.ipc.connect()

    def run(self):
        self.init()
        self.loop()

    def init(self):
        # Subscribe to vessel movement and weather updates
        self.dispatch.subscribe("vessel.move", self.on_vessel_move)
        self.dispatch.subscribe("weather.update", self.on_weather_update)
        
        # Get vessel details
        info = self.proxy.describe(self.vessel_id)
        print(f'{info["name"]} at {info["pose"]["position"]}')

    def loop(self):
        while True:
            if not self.listen():
                break
            time.sleep(1)

    def listen(self):
        self.ipc.pump(self.dispatch)
        return self.handle_events()

    def on_vessel_move(self, args):
        """Extracts vessel movement data including position and heading direction."""
        position = args["rect"][:2]  # x, y (center of ship)
        heading = args["angle"][:2]  # x, y (ship movement direction)
        self.latest_heading = heading  # Store latest ship heading

    def on_weather_update(self, args):
        """Handles weather updates and calculates resistance effect."""
        if "type" in args:
            print(f"Weather Type: {args['type']}")
            for vector in args.get("vectors", []):
                position = vector["P"]  # Position (x, y, z)
                direction = vector["X"][:2]  # Wind/Current direction, only x, y
                rotation = vector["R"]  # Rotation force
                
                resistance_angle = self.calculate_resistance_effect(self.latest_heading, direction)
                print(f"Ship vs. {args['type']} Angle: {resistance_angle}°")
                
                if resistance_angle > 150:
                    print("⚠️ High resistance detected! Ship is moving against the current.")

    def calculate_resistance_effect(self, ship_heading, current_vector):
        """Calculates the angle between the ship's heading and the current/wind vector."""
        ship_heading_2d = np.array(ship_heading[:2])
        current_vector_2d = np.array(current_vector[:2])

        if np.all(ship_heading_2d == 0) or np.all(current_vector_2d == 0):
            return 0.0  # Avoid division by zero if vectors are zero

        dot_product = np.dot(ship_heading_2d, current_vector_2d)
        norm_product = np.linalg.norm(ship_heading_2d) * np.linalg.norm(current_vector_2d)
        
        if norm_product == 0:
            return 0.0

        angle = np.arccos(np.clip(dot_product / norm_product, -1.0, 1.0))
        return np.degrees(angle)

    def handle_events(self):
        return True

if __name__ == "__main__":
    eco_feedback = Simulator()
