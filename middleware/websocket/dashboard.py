from fastapi import FastAPI, WebSocket
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

    async def send_data(self, data):
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
                        logger.info(f"Sending data to client: {client.client}")
                        await client.send_json(data)
                    except Exception as e:
                        logger.error(f"Error sending data: {e}")
                        self.clients.remove(client)
        except Exception as e:
            print(f"WebSocket disconnected: {e}")
            self.clients.remove(websocket)

# Create a global websocket to dashboard instance
dashboard = Dashboard()

# Define the WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await dashboard.websocket_endpoint(websocket)