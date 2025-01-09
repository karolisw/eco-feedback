# This file handles the logic for eco-score, consumption, and emissions calculations
    
class Calculator:
    def calculate_consumption(self, controller_data, simulator_data):
        """Calculate fuel consumption based on speed, direction, and environmental data."""
        speed = controller_data['speed']
        wave_angle = simulator_data['wave_angle']
        return speed * 0.1 + wave_angle * 0.05  # Example formula

    def calculate_emissions(self, controller_data, simulator_data):
        """Calculate emissions based on consumption."""
        consumption = self.calculate_consumption(controller_data, simulator_data)
        return consumption * 2.5  # Example emission factor

    def calculate_eco_score(self, controller_data, simulator_data):
        """Calculate an eco-score (e.g., lower is better)."""
        consumption = self.calculate_consumption(controller_data, simulator_data)
        return max(0, 100 - consumption)  # Example eco-score formula
