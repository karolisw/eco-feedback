import asyncio
import os
import signal
from fastapi import FastAPI
import uvicorn
from infrastructure.websocket.dashboard import router as ws_router, dashboard
from persistance.database import Database
from application.api import router as api_router

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

# Allow requests from frontend 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with your frontend URL for better security
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


# Include api and websocket routers
app.include_router(ws_router)
app.include_router(api_router)

# Initialize database
database = Database()

dashboard.set_database(database)

# Storing tasks so they can be canceled
running_tasks = []

# TODO: At some point, figure out if this is actually needed (startup event -> could i just include it in the main function?)
@app.on_event("startup")
def startup_event():
    """Start background data processing on FastAPI startup."""
    task = asyncio.create_task(dashboard.fetch_data())
    running_tasks.append(task)

    
@app.on_event("shutdown")
async def shutdown_event():
    """Properly cancel background tasks on shutdown."""
    print("Shutting down server...")
    for task in running_tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            print("Task cancelled:", task)
            
    print("All background tasks shut down.")
    await asyncio.sleep(0.1)  # Allow cleanup time
    os._exit(0)  # Force exit if something still hangs


async def run_server():
    """Starts the FastAPI server with Uvicorn."""
    config = uvicorn.Config(app, host="127.0.0.1", port=8000)
    server = uvicorn.Server(config)
    await server.serve()

async def main():
    """Runs the controller and WebSocket server concurrently."""
    await asyncio.gather(run_server())

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def shutdown_handler(sig, frame):
        print("Received shutdown signal, exiting...")
        loop.stop()
        os._exit(0)

    # Handle shutdown signals
    signal.signal(signal.SIGINT, shutdown_handler)  # Handle Ctrl+C
    signal.signal(signal.SIGTERM, shutdown_handler)

    try:
        loop.run_until_complete(main())  # Runs both the server and controller
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        loop.run_until_complete(shutdown_event())  # Ensure cleanup
        loop.close()