# Handles haptic feedback logic

from config import HAPTIC_MODES

class HapticFeedback:
    def provide_feedback(self, sim_data, eco_score):
        if eco_score < 0.5:
            self.send_haptic_signal("continuous")
        else:
            self.send_haptic_signal("intermittent")

    def send_haptic_signal(self, mode):
        if mode not in HAPTIC_MODES:
            raise ValueError(f"Invalid haptic mode: {mode}")
        print(f"Sending {mode} haptic feedback")