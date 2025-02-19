import time
from fastapi import FastAPI, WebSocket
from ..controller.azimuth_controller import controller
import logging
import asyncio

app = FastAPI()

logger = logging.getLogger("websocket")
logging.basicConfig(level=logging.INFO)

class Dashboard:
    """
    Handles WebSocket connections and data distribution to connected frontend.
    """
    def __init__(self):
        self.clients = set()  # Use a set to avoid duplicate clients
        self.latest_data = None  # Store the latest formatted data
        self.controller = controller  # Global AzimuthController instance

    async def fetch_data(self):
        while True:
            try:
                raw_data = await self.controller.get_latest_data() # TODO method is slow (ca 2.5s) - fix
                formatted_data = self.format_data(raw_data)

                if formatted_data and any(value != 0 for value in formatted_data.values()):
                    self.latest_data = formatted_data
                    await self.broadcast_data()
                else:
                    #logger.info("Skipping sending data due to all values being zero.")
                    pass
            except Exception as e:
                logger.error(f"Error fetching register data: {e}")

            await asyncio.sleep(2)  # Ensures it doesn't flood the system


    async def broadcast_data(self):
        """Immediately send the latest data to all connected clients."""
        if self.latest_data and self.clients:
            #tasks = []
            for client in self.clients:
                try:
                    logger.info(f"Sending formatted data to client: {client.client}")
                    await client.send_json(self.latest_data)
                except Exception as e:
                    logger.error(f"Error sending data: {e}")
                    self.clients.remove(client)


    async def remove_client(self, websocket: WebSocket):
        """Removes a disconnected client safely."""
        if websocket in self.clients:
            self.clients.remove(websocket)
            logger.info(f"Client {websocket.client} removed.")

    def format_data(self, raw_data):
        """Transforms raw register data into the required DashboardData format."""
        try:
            formatted_data = {
                "currentThrust": float(raw_data.get("IREG_0_100", 0)),
                "currentAngle": float(raw_data.get("IREG_2_200", 0)),
                "consumption": 0,  # Placeholder
                "currentEmissions": 0,  # Placeholder
            }
            return formatted_data
        except Exception as e:
            logger.error(f"Error formatting data: {e}")
            return None

    async def websocket_endpoint(self, websocket: WebSocket):
        """Handles WebSocket connections and continuously sends the latest data."""
        await websocket.accept()
        logger.info(f"WebSocket client connected: {websocket.client}")
        self.clients.add(websocket)

        try:
            while True:
                if self.latest_data:
                    await websocket.send_json(self.latest_data)
                await asyncio.sleep(2)  # Prevents tight loop
        except Exception as e:
            logger.info(f"WebSocket disconnected: {e}")
        finally:
            await self.remove_client(websocket)


# Global dashboard instance (singleton)
dashboard = Dashboard()

# Start data fetching loop in the background
def start_dashboard():
    asyncio.create_task(dashboard.fetch_data())

@app.on_event("startup")
def startup_event():
    """Start background data processing on FastAPI startup."""
    start_dashboard()  # Do NOT `await` this

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await dashboard.websocket_endpoint(websocket)
