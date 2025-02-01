#!/usr/bin/python
# Filename: main.py
# Description: Entry point for running the middleware and starting the CosLaunch app

import os
import getopt, sys, signal
import threading
import subprocess, time
from simulator import Simulator

# Adding "cospy/apps/" to the Python path 
coslaunch_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../cospy/apps/coslaunch/"))
sys.path.append(coslaunch_path)

from COSLaunch import COSLaunch

IMAGE = None
coslaunch_app = None  # Global reference to COSLaunch instance


def usage():
    """Prints usage instructions"""
    Format = "name,version"
    AppInfo = get_app_info()

    for attr in Format.split(','):
        if AppInfo.get(attr):
            print(AppInfo[attr])

    print("\nUsage:\n    {}\t{}\n\nOptions:".format(
        AppInfo['executable'],
        "\n\t\t".join(AppInfo["usage"])
    ))

    for help in AppInfo["help"]:
        indent = '\t\t' if len(help[0]) <= 3 else '\t'
        print("    {}{}{}".format(help[0], indent, help[1][0]))

    sys.exit(0)

def get_app_info():
    return {
        "executable": "cossim.py",
        "name": "COS Simulation Operating System",
        "version": "Version: 1.0 [07 Mar 2018]",
        "usage": ["[-h][-?][-i image]"],
        "help": [
            ["h", ["Print help.", usage]],
            ["?", ["Print help.", usage]],
            ["i", ["Set the image.", set_image]],
            ["image", ["Code directory.", None]]
        ]
    }
def preamble():
    """Prints header information about the app"""
    Format = "name,version"
    AppInfo = get_app_info()
    for attr in Format.split(','):
        if AppInfo.get(attr):
            print(AppInfo[attr])


def set_image():
    """Sets the simulation image"""
    global IMAGE
    IMAGE = sys.argv[-1]
    if not os.path.isfile(IMAGE):
        print(f'[{IMAGE}] is not a valid image file.')
        sys.exit(-1)
        

def run_coslaunch():
    """Runs COSLaunch in a separate thread"""
    global coslaunch_app
    coslaunch_app = COSLaunch()
    coslaunch_app.run([], get_app_info(), {"image": IMAGE})

def signal_handler(sig, frame):
    """Handles Ctrl+C (SIGINT) to gracefully exit"""
    print("\nShutting down COSLaunch and Simulator...")

    # Stop COSLaunch if running
    if coslaunch_app:
        try:
            print("Sending Enter key to COSLaunch for shutdown...")
            # TODO the coslaunch app expects ENTER key to be pushed to shutdown
            coslaunch_app.stop()
        except AttributeError:
            print("COSLaunch does not have a shutdown method. Terminating manually.")

    # Exit program
    sys.exit(0)
    
def main():
    try:
        opts, args = getopt.getopt(sys.argv[1:], "hi:d", ["help"])
    except getopt.GetoptError:
        usage()
        sys.exit(2)

    for opt, arg in opts:
        if opt in ("-h", "--help"):
            usage()
            sys.exit()
        elif opt in ("-i"):
            set_image()

    preamble()
    
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
