# infrastructure/cos_api/coslaunch_adapter.py
from COSLaunch import COSLaunch

class CosLaunchAdapter:
    """Manages COSLaunch connection"""
    def __init__(self):
        self.coslaunch = COSLaunch()

    def start(self):
        """ Starts the COSLaunch application. """
        self.coslaunch.run([], {}, {"image": None})

    def stop(self):
        """ Stops the COSLaunch application. """
        try:
            self.coslaunch.stop()
        except AttributeError:
            print("COSLaunch does not have a stop method. Terminating manually.")
