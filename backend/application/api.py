import asyncio
from fastapi import APIRouter, HTTPException
from pathlib import Path
import logging
from fastapi.responses import JSONResponse
from infrastructure.controller.azimuth_controller import controller 
import yaml
from pydantic import BaseModel

router = APIRouter()

# Logging
logger = logging.getLogger("api")
logging.basicConfig(level=logging.INFO)

# Get absolute path to the backend directory
BASE_DIR = Path(__file__).resolve().parent.parent  # Moves up to "backend"
config_dir = BASE_DIR / "config_files"

# A Pydantic model for request validation
class ConfigRequest(BaseModel):
    file_name: str
    
async def start_services():
    """Runs the AzimuthController, but aborts if the connection fails."""
    logger.info("Attempting to start AzimuthController...")
    try:
        controller.assign_registers()
        connected = await controller.connect()  # Ensure connection is established
        if not connected:
            logger.warning("Failed to connect to Modbus server. Aborting start_services.")
            return  # Exit function without starting update loop
        asyncio.create_task(controller.update_data())  # Run update in background

    except Exception as e:
        logger.error(f"Unexpected error while starting controller: {e}")


@router.get("/get-config-files")
def get_config_files():
    try:
        if not config_dir.exists():  # Ensure the directory exists
            return JSONResponse(status_code=404, content={"error": f"Path does not exist"})

        files = [f.name for f in config_dir.glob("*.csv")]
        return {"files": files}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Failed to retrieve config files", "details": str(e)})
    
@router.post("/load-config")
async def load_config(config: ConfigRequest):
    """Load the selected config file into the Azimuth Controller."""
    try:
        if not config.file_name:
            raise HTTPException(status_code=400, detail="Invalid config file name")
        
        file_name = config.file_name
        
        # Path to config file that is selected
        config_path = config_dir / file_name

        if not config_path.exists():
            return JSONResponse(status_code=404, content={"error": f"Config file not found: {config_path}"})

        # Update the Azimuth Controller's config dynamically
        with open(config_path, "r") as file:
            controller.config = yaml.safe_load(file)
                
        # Start the controller
        await start_services()

        return JSONResponse(status_code=200, content={"message": f"Config {config.file_name} loaded successfully"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Controller not connected", "details": str(e)})
