# Manages communication betweeen the middleware and the controller

class ControllerInterface:
    def transmit_direction(self, direction):
        print(f"Transmitting direction: {direction}")

    def transmit_speed(self, speed):
        print(f"Transmitting speed: {speed}")
