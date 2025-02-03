# application/vessel_handler.py
# A handler processes and manages the state of something (e.g., VesselHandler updates vessel movement).
import numpy as np
from infrastructure.cos_api.vessel_adapter import VesselAdapter

class VesselHandler:
    """Handles vessel operations"""
    def __init__(self, vessel_id):
        self.vessel_id = vessel_id
        self.vessel_adapter = VesselAdapter(vessel_id)
        self.latest_heading = [1, 0]  # Default heading (East)

    def update_vessel_state(self, vessel_data):
        """ Updates the vessel's heading based on received data. """
        position = vessel_data["rect"][:2]  # x, y (center of ship)
        heading = vessel_data["angle"][:2]  # x, y (ship movement direction)
        self.latest_heading = heading  # Store latest ship heading

    def get_latest_heading(self):
        return self.latest_heading
    
    def get_info(self):
        return self.vessel_adapter.get_vessel_info()
