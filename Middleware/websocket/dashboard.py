# A websocket that relays the data from the middleware to the visual-interface/dashboard
from fastapi import FastAPI, WebSocket
import logging
import asyncio

app = FastAPI()

logger = logging.getLogger("websocket")
logging.basicConfig(level=logging.INFO)

class Dashboard:
    def __init__(self):
        self.clients = []

    async def send_data(self, data):
        """Send aggregated data to connected WebSocket (AKA the visual interface)
        This method will be called from the main loop in main.py, but could be called from anywhere in the middleware."""
        for client in self.clients:
            try:
                logger.info(f"Sending data to client: {client.client}")
                await client.send_json(data)
            except Exception as e:
                logger.error(f"Error sending data: {e}")
                self.clients.remove(client)
                
    async def websocket_endpoint(self, websocket: WebSocket):
        """WebSocket connection handler"""
        await websocket.accept()
        print("A websocket is connected")
        self.clients.append(websocket)
        try:
            while True:
                await websocket.send_text("example text") # TODO this works but we need to send the actual data
                await asyncio.sleep(1)
        except Exception as e:
            print(f"WebSocket disconnected: {e}")
            self.clients.remove(websocket)

# Create a global websocket to dashboard instance
dashboard = Dashboard()

# Define the WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await dashboard.websocket_endpoint(websocket)
    
""" 
async def send_periodic_data():
    while True:
        data = {
            "currentThrust": 10,
            "currentAngle": 180,
            "consumption": 5,
            "currentEmissions": 12,
            "ecoScore": 85.5,
        }
        await dashboard.send_data(data)
        await asyncio.sleep(1)  # Send data every second


# Start periodic task when the app starts
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(send_periodic_data())

"""
