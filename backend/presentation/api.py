# Exposes the API/WebSockets
import asyncio
import uvicorn
from fastapi import FastAPI
from application.main_service import MainService

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    print("Starting up the backend")
    asyncio.create_task(main_loop())

async def main_loop():
    """Main loop that runs continuously during the application lifespan."""
    service = MainService()
    await service.run()

# Removed the uvicorn.run() call to allow for running the application in a separate process (backend/main.py)
# TODO Is the server instantiated correctly when not instantiated in this file?
# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)