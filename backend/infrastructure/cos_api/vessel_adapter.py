# infrastructure/cos_api/vessel_adapter.py
from cos.core.api.Vessel import Vessel

class VesselAdapter:
    """Handles vessel communication for a single vessel."""
    def __init__(self, vessel_id):
        self.vessel = Vessel()
        self.vessel_id = vessel_id

    def get_vessel_info(self):
        return self.vessel.describe(self.vessel_id)
