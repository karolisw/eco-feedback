from fastapi import APIRouter
from pathlib import Path

router = APIRouter()

# Get absolute path to the backend directory
BASE_DIR = Path(__file__).resolve().parent.parent  # Moves up to "backend"
config_dir = BASE_DIR / "config_files"
#config_dir = BASE_DIR / "infrastructure" / "controller" / "GUI" / "modbus_config"

@router.get("/get-config-files")
def get_config_files():
    try:
        if not config_dir.exists():  # Ensure the directory exists
            return {"error": f"Path does not exist: {config_dir}"}

        files = [f.name for f in config_dir.glob("*.csv")]
        return {"files": files}
    except Exception as e:
        return {"error": str(e)}
