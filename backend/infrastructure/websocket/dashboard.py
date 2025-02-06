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
        self.clients = []
        self.data_queue = asyncio.Queue()
        self.controller = controller  # Get the global AzimuthController instance

    async def fetch_data(self):
        """
        Continuously fetches data from the azimuth controller and queues it for sending.
        """
        while True:
            try:
                raw_data = self.controller.get_latest_data()
                formatted_data = self.format_data(raw_data)  # Format before queuing

                # Check if all values in formatted_data are 0
                if formatted_data and any(value != 0 for value in formatted_data.values()):
                    await self.queue_data(formatted_data)
                else:
                    logger.info("Skipping sending data due to all values being zero.")
            except Exception as e:
                logger.error(f"Error fetching register data: {e}")
            await asyncio.sleep(1)  # Adjust based on desired update rate

    def format_data(self, raw_data):
        """
        Transforms raw register data into the required DashboardData format.
        """
        try:
            formatted_data = {
                "currentThrust": float(raw_data.get("IREG_0_100", 0)),  # The position of the thruster
                "currentAngle": float(raw_data.get("IREG_2_200", 0)),   # The angle of the rudder
                "consumption": 0,  # Placeholder for future data    
                "currentEmissions": 0,  # Placeholder for future data
                "ecoScore": 0,  # Placeholder for future data      
            }
            return formatted_data
        except Exception as e:
            logger.error(f"Error formatting data: {e}")
            return None

    async def queue_data(self, data):
        """
        Adds data to the queue to be sent to connected WebSocket clients.
        """
        await self.data_queue.put(data)

    async def websocket_endpoint(self, websocket: WebSocket):
        """Handles WebSocket connections and sends data from the queue to clients."""
        await websocket.accept()
        logger.info("WebSocket client connected.")
        self.clients.append(websocket)
        try:
            while True:
                data = await self.data_queue.get()
                for client in self.clients:
                    try:
                        logger.info(f"Sending formatted data to client: {client.client}")
                        await client.send_json(data)  # Ensure JSON format
                    except Exception as e:
                        logger.error(f"Error sending data: {e}")
                        self.clients.remove(client)
        except Exception as e:
            logger.info(f"WebSocket disconnected: {e}")
            self.clients.remove(websocket)

# A global websocket (Singleton) that communicates with the frontend/dashboard
dashboard = Dashboard()

# Start data fetching loop in the background
async def start_dashboard():
    asyncio.create_task(dashboard.fetch_data())

@app.on_event("startup")
async def startup_event():
    """Start background data processing on FastAPI startup."""
    await start_dashboard()

# Define the WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await dashboard.websocket_endpoint(websocket)
