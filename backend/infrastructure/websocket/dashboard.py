import json
import logging
import asyncio
import itertools
from persistance.database import Database
from fastapi import APIRouter, WebSocket
from ..controller.azimuth_controller import controller


logger = logging.getLogger("websocket")
logging.basicConfig(level=logging.INFO)

router = APIRouter()

class Dashboard:
    """
    Handles WebSocket connections and data distribution to connected frontend.
    """
    def __init__(self):
        self.clients = set()  # Use a set to avoid duplicate clients
        self.latest_data = None  # Store the latest formatted data
        self.controller = controller  # Global AzimuthController instance
        self.database = None  
        
        # Mock data generators
        self.mock_thrust = itertools.cycle([10, 20, 30,40,50,60,70,80,90,100,90,80,70,60,50,40,30, 20, 10, 0])  # Simulates increasing & decreasing thrust
        self.mock_angle = itertools.cycle([0, 15, 30, 45, 50,60,70,80,90,100,30, 15, 0, -15, -30, -45, -30, -15, 0])  # Oscillates rudder angle
        
    def set_database(self, database: Database):
        """Assigns a database instance to the dashboard singleton."""
        self.database = database
        

    async def fetch_data(self):
        while True:
            try:
                raw_data = await self.controller.get_latest_data() # TODO method is slow (ca 2.5s) - fix
                
                # If no real data, send dynamic mock data
                if not raw_data:
                    raw_data = {
                        "IREG_0_100": next(self.mock_thrust),  # Simulates a gradual thrust change
                        "IREG_0_200": 0,
                        "IREG_2_100": next(self.mock_angle),  # Simulates rudder angle adjustments
                        "IREG_2_200": 0,
                        "IREG_4_100": 50,  # Simulated setpoint for primary thruster
                        "IREG_4_200": 10   # Simulated setpoint for secondary thruster
                    }
                
                formatted_data = self.format_data(raw_data)
                
                if formatted_data and formatted_data != self.latest_data and self.clients:
                    logger.info("New Azimuth data, broadcasting...")
                    self.latest_data = formatted_data
                    await self.broadcast_data()
            except Exception as e:
                logger.error(f"Error fetching register data: {e}")

            await asyncio.sleep(2)  # Ensures it doesn't flood the system


    async def broadcast_data(self):
        """Immediately send the latest data to all connected clients."""
        if self.latest_data and self.clients:
            for client in self.clients:
                try:
                    logger.info(f"Sending formatted data to client: {client.client}")
                    await client.send_json(self.latest_data)
                except Exception as e:
                    logger.error(f"Error sending data: {e}")
                    self.clients.remove(client)
                await asyncio.sleep(2)


    async def remove_client(self, websocket: WebSocket):
        """Removes a disconnected client safely."""
        if websocket in self.clients:
            self.clients.remove(websocket)
            logger.info(f"Client {websocket.client} removed.")

    def format_data(self, raw_data):
        """Transforms raw register data into the required DashboardData format."""
        try:
            formatted_data = {
                "position_pri": float(raw_data.get("IREG_0_100", 0)), # 1st Position register
                "position_sec": float(raw_data.get("IREG_0_200", 0)), # 2nd Position register
                "angle_pri": float(raw_data.get("IREG_2_100", 0)), # 1st Angle register
                "angle_sec": float(raw_data.get("IREG_2_200", 0)), # 2nd Angle register
                "pos_setpoint_pri": float(raw_data.get("IREG_4_100", 0)),
                "pos_setpoint_sec": float(raw_data.get("IREG_4_200", 0)),
            }
            return formatted_data
        except Exception as e:
            logger.error(f"Error formatting data: {e}")
            return None

    async def websocket_endpoint(self, websocket: WebSocket):
        """Handles WebSocket connections and continuously sends the latest data."""
        # TODO this willl probably block the sending of data to the dashboard
        await websocket.accept()
        logger.info(f"WebSocket client connected: {websocket.client}")
        self.clients.add(websocket)

        try:
            while True:
                # Send data to frontend
                if self.latest_data:
                    await websocket.send_json(self.latest_data)
                
                # Receive and process messages
                data = await websocket.receive_text()
                message = json.loads(data)

                if message.get("command") == "stop_simulation":
                    avg_speed = message.get("avg_speed", 0)
                    avg_rpm = message.get("avg_rpm", 0)
                    total_consumption = message.get("total_consumption", 0)
                    run_time = message.get("run_time", 0)
                    configuration_number = message.get("configuration_number", 1)
                    logger.info(f"Storing run data")

                    # Store data in the database
                    await self.database.store_data(
                        total_consumption=total_consumption,
                        run_time=run_time,
                        configuration_number=configuration_number,
                        average_speed=avg_speed,
                        average_rpm=avg_rpm
                    )
                    
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

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await dashboard.websocket_endpoint(websocket)
    

