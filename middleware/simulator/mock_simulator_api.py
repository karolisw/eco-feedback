import random

class MockSimulatorAPI:
    def get_data(self):
        """Simulate fetching data from the simulator."""
        return {
            'wave_angle': random.uniform(-45, 45),  # Simulate wave angle between -45 and 45 degrees
            'wind_speed': random.uniform(0, 20)     # Simulate wind speed between 0 and 20 m/s
        }

    def send_data(self, controller_data):
        """Simulate sending data to the simulator and fetching additional data."""
        return self.get_data()