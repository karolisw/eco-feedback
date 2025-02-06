import threading
import uvicorn

from infrastructure.websocket.dashboard import app
from infrastructure.controller.azimuth_controller import controller

def main():
    azimuth_thread = threading.Thread(target=controller.run, daemon=True)
    azimuth_thread.start()
    uvicorn.run(app, host="127.0.0.1", port=8000)

if __name__ == "__main__":
    main()
