#!/usr/bin/python
# Filename: main.py
# Description: Entry point for running the middleware and starting the CosLaunch app

import sys, signal
import threading
from simulator import Simulator
from COSLaunch import COSLaunch

IMAGE = None
coslaunch_app = None  # Global reference to COSLaunch instance    

def run_coslaunch():
    """Runs COSLaunch in a separate thread"""
    global coslaunch_app
    coslaunch_app = COSLaunch()
    coslaunch_app.run([], {}, {"image": IMAGE})

def signal_handler(sig, frame):
    """Handles Ctrl+C (SIGINT) to gracefully exit"""
    print("\nShutting down COSLaunch and Simulator...")

    # Stop COSLaunch if running
    if coslaunch_app:
        try:
            print("Sending Enter key to COSLaunch for shutdown...")
            coslaunch_app.stop()
        except AttributeError:
            print("COSLaunch does not have a shutdown method. Terminating manually.")

    # Exit program
    sys.exit(0)


def main():
    # Register signal handler for Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)

    # Start COSLaunch in a separate thread
    coslaunch_thread = threading.Thread(target=run_coslaunch)
    coslaunch_thread.start()

    # Run the simulator after COSLaunch starts
    theApp = Simulator()
    try:
        theApp.run()
    except KeyboardInterrupt:
        print("\nShutting down the simulator...")
        sys.exit(0)

if __name__ == "__main__":
    main()	
