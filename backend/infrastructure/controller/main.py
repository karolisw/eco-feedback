from azimuth_controller import AzimuthController

if __name__ == "__main__":
    controller = AzimuthController(connection_type="RTU")  
    controller.run()
