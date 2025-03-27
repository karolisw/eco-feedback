import json
import logging
import asyncio
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
        
    def set_database(self, database: Database):
        """Assigns a database instance to the dashboard singleton."""
        self.database = database
        
    async def fetch_data(self):
        while True:
            try:
                if not self.controller.client or not self.controller.client.connected:
                    await asyncio.sleep(0.1)
                    continue  # Try again on next loop
                raw_data = await self.controller.fetch_dashboard_data()  #await self.controller.get_latest_data() # await self.controller.fetch_dashboard_data()
                formatted_data = self.format_data(raw_data)
                
                if formatted_data and formatted_data != self.latest_data and self.clients:
                    self.latest_data = formatted_data
                    
                
            except Exception as e:
                logger.error(f"Error fetching register data: {e}")

            await asyncio.sleep(0.1)  # Ensures it doesn't flood the system
    
 
    async def handle_client_messages(self, websocket: WebSocket, message: str):
        """Handles incoming WebSocket messages and processes commands."""
        try:
            logger.info(f"Received WebSocket message: {message}")  

            data = json.loads(message)  # Parse JSON data
            
            logger.info(f"Command received: {data.get('command')}")


            # Handle setpoint updates
            if data.get("command") == "set_setpoint":
                thrust_setpoint = data.get("thrust_setpoint", 0)
                angle_setpoint = data.get("angle_setpoint", 0)
                #logger.info(f"Updating setpoints → Thrust: {thrust_setpoint}, Angle: {angle_setpoint}")

                success = self.controller.set_setpoint(thrust_setpoint, angle_setpoint)
                if success:
                    logger.info("Setpoints successfully updated.")
                else:
                    await websocket.send_json(self.latest_data)
                    logger.error("Failed to update setpoints.")

            # Handle vibration updates
            if data.get("command") == "set_vibration":
                vibration = data.get("strength", 0)
                logger.info(f"Setting vibration to {vibration}")

                success = await self.controller.set_vibration(vibration)
                if success:
                    logger.info("Vibration successfully updated.")
                else:
                    logger.error("Failed to update vibration.")
                    
            # Handle detent updates
            if data.get("command") == "set_detent":
                logger.info("Detent update request received.")
                detent = data.get("detent", 0)
                type = data.get("type", 0)
                pos = data.get("pos", 0)
                logger.info(f"Setting detent to {detent}")

                success = await self.controller.set_detent(detent, type, pos)
                if success:
                    logger.info("Detent successfully updated.")
                else:
                    logger.error("Failed to update detent.")
            
            # Handle friction strength updates (usually alongside detent updates)
            if data.get("command") == "set_friction_strength":
                friction = data.get("friction", 0)
                #logger.info(f"Setting friction strength to {friction}")
                success = await self.controller.set_friction_strength(friction)
                if success:
                    logger.info("Friction strength successfully updated.")
                else:
                    logger.error("Failed to update friction strength.")
                    
            # Handle boundary updates
            if data.get("command") == "set_boundary":
                logger.info("Boundary update request received.")
                enable = data.get("enable",False)
                boundary = data.get("boundary", 0)
                type = data.get("type", 0)
                lower = data.get("lower", 0)
                upper = data.get("upper", 0)

                success = await self.controller.set_boundary(enable, boundary, type, lower, upper)
                if success:
                    logger.info("Boundary successfully updated.")
                else:
                    logger.error("Failed to update boundary.")

            # Handle stop simulation command
            if data.get("command") == "stop_simulation":
                avg_speed = data.get("avg_speed", 0)
                avg_rpm = data.get("avg_rpm", 0)
                total_consumption = data.get("total_consumption", 0)
                run_time = data.get("run_time", 0)
                configuration_number = data.get("configuration_number", 1)

                #logger.info("Stop simulation request received.")

                await self.database.store_data(
                    total_consumption=total_consumption,
                    run_time=run_time,
                    configuration_number=configuration_number,
                    average_speed=avg_speed,
                    average_rpm=avg_rpm
                )

                logger.info("Simulation data stored successfully.")

        except Exception as e:
            logger.error(f"Error processing WebSocket message: {e}")
            
    async def send_live_updates(self, websocket: WebSocket):
        """Continuously send azimuth data to the frontend."""
        try:
            while True:
                if self.latest_data:
                    # Check for "empty" data: all values are exactly 0.0
                    if all(value == 0.0 for value in self.latest_data.values()):
                        #logger.warning("Skipping update: Detected empty/default azimuth data.")
                        pass
                    else:
                        await websocket.send_json(self.latest_data)
                await asyncio.sleep(0.1)  # Prevent flooding
        except Exception as e:
            logger.error(f"Error sending live updates: {e}")

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
        """Handles WebSocket connections, processes messages, and sends updates."""
        await websocket.accept()
        self.clients.add(websocket)
        logger.info(f"WebSocket client connected: {websocket.client}")

        try:
            # Start sending live data updates to the connected client
            send_task = asyncio.create_task(self.send_live_updates(websocket))

            # Listen for incoming messages
            async for message in websocket.iter_text():
                await self.handle_client_messages(websocket, message)

        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            self.clients.discard(websocket)
            send_task.cancel()  # Stop sending updates when client disconnects
            logger.info(f"Client {websocket.client} disconnected.")

# Global dashboard instance (singleton)
dashboard = Dashboard()

# Start data fetching loop in the background
def start_dashboard():
    asyncio.create_task(dashboard.fetch_data())

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await dashboard.websocket_endpoint(websocket)
    