# Manages communication betweeen the middleware and the controller

class ControllerApi:
    def get_angle(self):
        return 30

    def get_speed(self):
        return 15
        
    def get_data(self):
        return {
            'speed': self.get_speed(),
            'angle': self.get_angle()
        }
