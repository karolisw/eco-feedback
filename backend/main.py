import asyncio
import uvicorn
from infrastructure.websocket.dashboard import app
from infrastructure.controller.azimuth_controller import controller

async def start_services():
    """Runs both the AzimuthController and FastAPI WebSocket server in parallel."""
    await controller.run()

async def run_server():
    """Starts the FastAPI server with Uvicorn."""
    config = uvicorn.Config(app, host="127.0.0.1", port=8000)
    server = uvicorn.Server(config)
    await server.serve()

async def main():
    """Runs the controller and WebSocket server concurrently."""
    await asyncio.gather(start_services(), run_server())

if __name__ == "__main__":
    loop = asyncio.get_event_loop()

    try:
        loop.run_until_complete(main())  # Runs both the server and controller
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        loop.close()
