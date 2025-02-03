# application/eco_feedback.py
import numpy as np

class EcoFeedback:
    """Processes eco-feedback calculations"""
    @staticmethod
    def calculate_resistance_effect(ship_heading, current_vector):
        """ Calculates the angle between the ship's heading and the current/wind vector. """
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
