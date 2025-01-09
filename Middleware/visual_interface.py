# A websocket that relays the data from the middleware to the visual-interface/dashboard
from fastapi import FastAPI, WebSocket

app = FastAPI()

class VisualInterface:
    def __init__(self):
        self.clients = []

    async def send_data(self, data):
        """Send aggregated data to connected WebSocket (AKA the visual interface)
        This method will be called from the main loop in main.py, but could be called from anywhere in the middleware."""
        for client in self.clients:
            await client.send_json(data)

    async def websocket_endpoint(self, websocket: WebSocket):
        """WebSocket connection handler"""
        await websocket.accept()
        self.clients.append(websocket)
        try:
            while True:
                await websocket.receive_text()  # Keep the connection alive
        except:
            self.clients.remove(websocket)

# Create a global VisualInterface instance
visual_interface = VisualInterface()

# Define the WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await visual_interface.websocket_endpoint(websocket)
