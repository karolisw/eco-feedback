class WeatherHandler:
    """Handles weather operations"""
    def __init__(self):
        self.latest_weather = None

    def update_weather(self, weather_data):
        """ Updates the latest weather data. """
        self.latest_weather = weather_data
        
    def get_latest_weather_data(self):
        return self.latest_weather
    
    def process_weather_effects(self, ship_heading):
        """ 
        Computes the impact of weather on vessel movement. 
        Returns resistance angles for eco-feedback.
        """
        if not self.latest_weather:
            return None  # No weather data available

        results = []
        for vector in self.latest_weather.get("vectors", []):
            direction = vector["X"][:2]  # Only x, y components
            resistance_angle = self.calculate_resistance_effect(ship_heading, direction)
            results.append((self.latest_weather["type"], resistance_angle))
        
        return results
    
    @staticmethod
    def calculate_resistance_effect(ship_heading, current_vector):
        """ Calculates the angle between ship heading and weather force vector. """
        import numpy as np

        ship_heading_2d = np.array(ship_heading[:2])
        current_vector_2d = np.array(current_vector[:2])

        if np.all(ship_heading_2d == 0) or np.all(current_vector_2d == 0):
            return 0.0  # Avoid division by zero

        dot_product = np.dot(ship_heading_2d, current_vector_2d)
        norm_product = np.linalg.norm(ship_heading_2d) * np.linalg.norm(current_vector_2d)

        if norm_product == 0:
            return 0.0

        angle = np.arccos(np.clip(dot_product / norm_product, -1.0, 1.0))
        return np.degrees(angle)