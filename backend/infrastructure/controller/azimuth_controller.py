import asyncio
import logging
import os
import yaml
import numpy as np

from pymodbus import FramerType
from pymodbus.client import AsyncModbusSerialClient, AsyncModbusTcpClient
from pymodbus.constants import Endian
from pymodbus.exceptions import ModbusIOException
from pymodbus.client.mixin import ModbusClientMixin

logger = logging.getLogger("azimuth")
logging.basicConfig(level=logging.INFO)

class AzimuthController:
    def __init__(self, connection_type="RTU", config_file=None):
        """
        Initializes the azimuth controller communication.

        :param connection_type: "RTU" for serial, "TCP" for Ethernet.
        :param config_file: Path to the configuration file.
        """
        self.lock = asyncio.Lock()  # Thread-safe access
        self.connection_type = connection_type.upper()
        self.client = None
        self.registers = {}
        self.latest_data = {}  # Store latest register data
        self.DATATYPE = ModbusClientMixin.DATATYPE

        # Determine the base directory (backend/)
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))

        # Set default config file path if not provided
        if config_file is not None: 
            logger.info(f"Config file provided: {config_file}")
        
        if config_file is None:
            logger.info("No config file provided. Using default config.yaml...")
            config_file = os.path.join(base_dir, "config.yaml") 
            
        # Load configuration
        with open(config_file, "r") as file:
            self.config = yaml.safe_load(file)

        self.slave_id = self.config["rtu"]["slave_id"]
        self.max_attempts = self.config["MAX_ATTEMPTS"]
        self.retry_delay = self.config["RETRY_DELAY"]

        if self.connection_type == "RTU":
            self.port = self.config["rtu"]["port"]
            self.baudrate = self.config["rtu"]["baudrate"]
            self.stopbits = self.config["rtu"]["stopbits"]
            self.bytesize = self.config["rtu"]["bytesize"]
            self.parity = self.config["rtu"]["parity"]
            self.csv_file = self.config["rtu"]["csv_file"]
        else:
            self.ip = self.config["tcp"]["ip"]
            self.tcp_port = self.config["tcp"]["tcp_port"]
        logger.info("Attempting to connect to Modbus server...")
        

    async def connect(self):
        """Attempts to establish a Modbus connection."""
        logger.info(f"Connecting via {self.connection_type}...")

        if self.client:
            logger.info("Closing previous connection...")
            await self.client.close()

        if self.connection_type == "RTU":
            self.client = AsyncModbusSerialClient(
                framer=FramerType.RTU,
                port=self.port,
                baudrate=self.baudrate,
                stopbits=self.stopbits,
                bytesize=self.bytesize,
                parity=self.parity,
            )
        else:
            self.client = AsyncModbusTcpClient(self.ip, port=self.tcp_port)

        # Retry loop for connection attempts
        for attempt in range(self.max_attempts):
            if await self.client.connect():
                logger.info(f"Connection established on attempt {attempt + 1}")
                return True
            logger.warning(f"Connection attempt {attempt + 1} failed. Retrying in {self.retry_delay} seconds...")
            await asyncio.sleep(self.retry_delay)
        logger.error("Failed to connect after multiple attempts.")
        return False

    async def disconnect(self): 
        """Disconnects the Modbus connection."""
        if self.client:
            await self.client.close()
            self.client = None
            logger.info("Disconnected from Modbus server.")

    def read_csv(self): 
        """Reads the CSV file and extracts register configurations."""
        try:
            logger.info(f"Reading CSV file: {self.csv_file}")
            data = np.genfromtxt(self.csv_file, delimiter=",", dtype="str", skip_header=1)
            return data
        except Exception as e:
            logger.error(f"Failed to read CSV file: {e}")
            return None

    def assign_registers(self):
        try:
            logger.info("Assigning registers...")
            data = self.read_csv()
            if data is None:
                return

            regs = {}
            for row in data:
                reg_type = row[2]
                address = int(row[3].strip("x")) if row[3] else None
                data_type = row[6]

                if reg_type == "IREG" and data_type == "FLOAT":
                    for offset in [100, 200]:
                        key = f"{reg_type}_{address}_{offset}"
                        regs[key] = {
                            "reg_type": reg_type,
                            "address": address + offset,
                            "data_type": data_type
                        }
                else:
                    key = f"{reg_type}_{address}"
                    regs[key] = {
                        "reg_type": reg_type,
                        "address": address,
                        "data_type": data_type
                    }

            self.registers = regs
            logger.info(f"Assigned {len(regs)} registers.")
            for key, reg in self.registers.items():
                logger.info(f"Register key: {key}, Address: {reg['address']}, Type: {reg['data_type']}")

        except Exception as e:
            logger.error(f"Failed to assign registers: {e}")
            
        
    async def fetch_register_data(self):
        #logger.info("Fetching register data...")
        if not self.client or not self.client.connected:
            print("[WARNING] Not connected to Modbus server.")
            return {}

        data_values = {}
        
        async with self.lock:  # Ensure thread safety with asyncio.Lock()

            for key, reg in self.registers.items():
                reg_type = reg["reg_type"]
                address = reg["address"]
                data_type = reg["data_type"]

                try:
                    if reg_type == "COIL":
                        result = await self.client.read_coils(address, count=1, slave=self.slave_id)
                        data_values[key] = result.bits[0] if result else None

                    elif reg_type == "ISTS":
                        result = await self.client.read_discrete_inputs(address, count=1, slave=self.slave_id)
                        data_values[key] = result.bits[0] if result else None

                    elif reg_type == "HREG" and data_type == "FLOAT":
                        result = await self.client.read_holding_registers(address, count=2, slave=self.slave_id)
                        if result and result.registers:
                            value = self.client.convert_from_registers(
                                result.registers, float, byteorder=Endian.BIG, wordorder=Endian.LITTLE
                            )
                            data_values[key] = round(value, 3)

                    elif reg_type == "HREG":
                        result = await self.client.read_holding_registers(address, count=1, slave=self.slave_id)
                        data_values[key] = result.registers[0] if result else None

                    elif reg_type == "IREG" and data_type == "FLOAT":
                        for offset in [100, 200]:
                            offset_address = address + offset
                            result = await self.client.read_input_registers(offset_address, count=2, slave=self.slave_id)
                            if result and result.registers:
                                value = self.client.convert_from_registers(
                                    result.registers, self.DATATYPE.FLOAT32, word_order="little"
                                )
                                data_values[f"{key}_{offset}"] = round(value, 3)

                    elif reg_type == "IREG":
                        result = await self.client.read_input_registers(address, count=1, slave=self.slave_id)
                        if result and result.registers:
                            raw_value = result.registers[0]
                            value = raw_value - 65536 if raw_value > 32767 else raw_value
                            data_values[key] = round(value, 3)

                except ModbusIOException as e:
                    print(f"[ERROR] Modbus IO Exception while reading {reg_type} {address}: {e}")
                except Exception as e:
                    print(f"[ERROR] Unexpected error while reading {reg_type} {address}: {e}")
                self.latest_data = data_values  # Store the latest data
        return data_values
    
    def set_setpoint(self, thrust_value: int, angle_value: int):
        """
        Writes the setpoint values to the Modbus registers.

        :param thrust_value: The setpoint for thrust (-100% - 100%).
        :param angle_value: The setpoint for azimuth angle (-180° to 180°).
        """
        if not self.client or not self.client.connected:
            print("[ERROR] Not connected to Modbus. Cannot set setpoint.")
            return False

        try:
            # HREG 04 is used to set the primary setpoint (thrust and angle)
            thrust_register = 0x04
            angle_register = 0x104  # Assuming this is the correct register for angle setpoint??

            # Write thrust setpoint
            self.client.write_register(address=thrust_register, value=int(thrust_value), slave=self.slave_id)
            print(f"[INFO] Set thrust setpoint to {thrust_value}% at register {thrust_register}")

            # Write angle setpoint
            self.client.write_register(address=angle_register, value=int(angle_value), slave=self.slave_id)
            print(f"[INFO] Set angle setpoint to {angle_value}° at register {angle_register}")

            return True

        except ModbusIOException as e:
            print(f"[ERROR] Modbus IO Exception while writing setpoints: {e}")
            return False
        except Exception as e:
            print(f"[ERROR] Unexpected error while writing setpoints: {e}")
            return False
    
    async def set_vibration(self, vibration: int):
        """
        Writes the vibration value to the Modbus register.

        :param vibration_value: The vibration value to set (0 - 3).
        """
        if not self.client or not self.client.connected:
            print("[ERROR] Not connected to Modbus. Cannot set vibration.")
            return False
        
        vibration_strength_reg = 0x01 # TODO correct address could easily be "1" instead of "0x01"
        enable_vibration_reg = 0x02

        try:
            # COIL 02 is used to enable the vibration
            if vibration > 0:
                
                # Enable vibration
                await self.client.write_coil(address=enable_vibration_reg, value=True, slave=self.slave_id)
                
                # Set vibration strength
                await self.client.write_register(address=vibration_strength_reg, value=vibration, slave=self.slave_id)
                print(f"[INFO] Set vibration value to {vibration} at register {vibration_strength_reg}")

                return True

            else:
                # Disable vibration
                await self.client.write_coil(address=enable_vibration_reg, value=False, slave=self.slave_id)

                print(f"[INFO] Disabled vibration at register {enable_vibration_reg}")
            
                return True
        except ModbusIOException as e:
            print(f"[ERROR] Modbus IO Exception while writing vibration: {e}")
            return False
        except Exception as e:
            print(f"[ERROR] Unexpected error while writing vibration: {e}")
            return False
        
        
    async def set_detent(self, detent: int, type: int, pos: int):
        """
        Writes the detent value to the Modbus register.

        :param detent_value: The detent value to set (0 - 3).
        :param type: The type of detent to set ("angle", "thrust").
        :param position: The position of the detent to set (0-100 or 0-359).
        """
        if not self.client or not self.client.connected:
            print("[ERROR] Not connected to Modbus. Cannot set detent.")
            return False
        
        thrust_hreg_pos1 = 140
        thrust_hreg_pos2 = 141
        
        angle_hreg_pos1 = 240
        angle_hreg_pos2 = 241
        
        strength_thrust_hreg = 100
        strength_angle_hreg = 200
        
        try:
            # Enable the use of detents
            await self.client.write_coil(address=1, value=True, slave=self.slave_id)
            
            # Enable only these detent registers
            await self.client.write_coil(thrust_hreg_pos1, value=True, slave=self.slave_id)
            await self.client.write_coil(angle_hreg_pos1, value=True, slave=self.slave_id)
            
            # Disable the other two detent registers
            await self.client.write_coil(thrust_hreg_pos2, value=False, slave=self.slave_id)
            await self.client.write_coil(angle_hreg_pos2, value=False, slave=self.slave_id)
            
            if (type == "thrust"):
                logger.info("Trying to set detents for thruster")
                # The positioning of the detents
                await self.client.write_register(address=thrust_hreg_pos1, value=pos, slave=self.slave_id)
                logger.info(f"Detent has been set for thruster with address: {thrust_hreg_pos1}")
                logger.info(f"and value: {pos}")

                # The strength of the detents
                await self.client.write_register(address=strength_thrust_hreg, value=detent, slave=self.slave_id)
                
                logger.info(f" Set detent value to {detent} at register {strength_thrust_hreg}")
                return True
            if (type == "angle"):
                # The positioning of the detents
                await self.client.write_register(address=angle_hreg_pos1, value=pos, slave=self.slave_id)
                logger.info(f"Detent has been set for angle with address: {angle_hreg_pos1}")
                logger.info(f"and value: {pos}")
                # The strength of the detents
                await self.client.write_register(address=strength_angle_hreg, value=detent, slave=self.slave_id)
                logger.info(f" Set detent value to {detent} at register {strength_angle_hreg}")
                return True
        except ModbusIOException as e:
            logger.error(f"[ERROR] Modbus IO Exception while writing detent: {e}")
            return False 
        
    async def set_boundary(self, enable:bool, boundary: int, type: int, lower: int, upper: int):
        """
        Writes the boundary value to the Modbus register.

        :param boundary_value: The boundary value to set (0 - 3).
        :param type: The type of boundary to set ("angle", "thrust").
        :param position1: The first position of the boundary to set (0-100 or 0-359).
        :param position2: The second position of the boundary to set (0-100 or 0-359).
        """
        if not self.client or not self.client.connected:
            print("[ERROR] Not connected to Modbus. Cannot set boundary.")
            return False
        
        enable_boundary_reg = 3

        if enable:
        
            thrust_boundary_lower = 130
            thrust_boundary_upper = 131
            
            angle_boundary_lower = 230
            angle_boundary_upper = 231
            
            thrust_boundary_strength = 102
            angle_boundary_strength = 202
            
            try:
                await self.client.write_coil(address=enable_boundary_reg, value=enable, slave=self.slave_id)

                if (type == "thrust"):
                    logger.info("Trying to set boundary for thruster")
                    
                    # The positioning of the boundary
                    await self.client.write_register(address=thrust_boundary_lower, value=lower, slave=self.slave_id)
                    await self.client.write_register(address=thrust_boundary_upper, value=upper, slave=self.slave_id)
                    logger.info(f"Boundary has been set for thruster with address: {thrust_boundary_lower} and {thrust_boundary_upper}")
                    logger.info(f"and value: {lower} and {upper}")

                    # The strength of the boundary
                    await self.client.write_register(address=thrust_boundary_strength, value=boundary, slave=self.slave_id)
                    
                    logger.info(f" Set thrust boundary strength to {boundary} at register {thrust_boundary_strength}")
                    return True
                if (type == "angle"):
                    # The positioning of the boundary
                    await self.client.write_register(address=angle_boundary_lower, value=lower, slave=self.slave_id)
                    await self.client.write_register(address=angle_boundary_upper, value=upper, slave=self.slave_id)
                    logger.info(f"Boundary has been set for angle with address: {angle_boundary_lower} and {angle_boundary_upper}")
                    logger.info(f"and value: {lower} and {upper}")
                    # The strength of the boundary
                    await self.client.write_register(address=angle_boundary_strength, value=boundary, slave=self.slave_id)
                    logger.info(f" Set angle boundary strength to {boundary} at register {angle_boundary_strength}")
            except ModbusIOException as e:
                logger.error(f"[ERROR] Modbus IO Exception while writing boundary: {e}")
                return False
        else:
            try:
                await self.client.write_coil(address=enable_boundary_reg, value=enable, slave=self.slave_id)
                logger.info(f"Disabled boundary at register {enable_boundary_reg}")
                return True
            except ModbusIOException as e:
                logger.error(f"[ERROR] Modbus IO Exception while writing boundary: {e}")
                return False
            except Exception as e:
                logger.error(f"[ERROR] Unexpected error while writing boundary: {e}")
                return False 
        
    async def set_friction_strength(self, friction: int):
        """
        Writes the friction value to the Modbus register.

        :param friction_value: The friction value to set (0 - 3).
        """
        if not self.client or not self.client.connected:
            print("[ERROR] Not connected to Modbus. Cannot set friction.")
            return False
        
        friction_strength_reg = 7

        try:
            # Write friction strength
            await self.client.write_register(address=friction_strength_reg, value=friction, slave=self.slave_id)
            logger.info(f"Set friction value to {friction} at register {friction_strength_reg}")

            return True

        except ModbusIOException as e:
            print(f"[ERROR] Modbus IO Exception while writing friction: {e}")
            return False
        except Exception as e:
            print(f"[ERROR] Unexpected error while writing friction: {e}")
            return False
        
        
    async def clear_haptics(self):
        # Between each scenario, the haptics detent and boundary should be cleared
        # This is done by setting the enable coil to False
        enable_detents_reg = 1
        
        if not self.client or not self.client.connected:
            print("[ERROR] Not connected to Modbus. Cannot set friction.")
            return False

        try:
            await self.set_boundary(False, 0, 0, 0, 0)
            await self.client.write_register(address=140, value=0, slave=self.slave_id)
            await self.client.write_register(address=141, value=0, slave=self.slave_id)
            await self.client.write_register(address=240, value=0, slave=self.slave_id)
            await self.client.write_register(address=241, value=0, slave=self.slave_id)
            await self.client.write_coil(address=enable_detents_reg, value=False, slave=self.slave_id)
            await self.client.write_coil(address=40, value=False, slave=self.slave_id)
            await self.client.write_coil(address=41, value=False, slave=self.slave_id)

            
            logger.info(f" Disabled detents at register {enable_detents_reg}")
            
        except ModbusIOException as e:
            logger.error(f"[ERROR] Modbus IO Exception while clearing haptics: {e}")
            return False
        except Exception as e:
            logger.error(f"[ERROR] Unexpected error while clearing haptics: {e}")
            return False
        

    async def get_latest_data(self):
        """Provide the latest register data for external use."""
        return self.latest_data.copy()
    
    async def fetch_dashboard_data(self):
        """Fetches only the registers required for the dashboard."""
        if not self.client or not self.client.connected:
            logger.warning("[DASHBOARD] Not connected to Modbus server.")
            return {}

        # Only the exact keys that matter for the dashboard
        dashboard_keys = [
            "IREG_0_100", "IREG_0_200",
            "IREG_2_100", "IREG_2_200",
            "IREG_4_100", "IREG_4_200"
        ]

        data_values = {}

        async with self.lock:
            for key in dashboard_keys:
                reg = self.registers.get(key)
                if not reg:
                    logger.warning(f"[DASHBOARD] Register not found in config: {key}")
                    continue

                reg_type = reg["reg_type"]
                address = reg["address"]
                data_type = reg["data_type"]

                try:
                    if reg_type == "IREG" and data_type == "FLOAT":
                        result = await self.client.read_input_registers(address, count=2, slave=self.slave_id)
                        if result and result.registers:
                            value = self.client.convert_from_registers(
                                result.registers, self.DATATYPE.FLOAT32, word_order="little"
                            )
                            data_values[key] = round(value, 3)
                        else:
                            logger.warning(f"[DASHBOARD] No result when reading {key}")

                    elif reg_type == "IREG":
                        result = await self.client.read_input_registers(address, count=1, slave=self.slave_id)
                        if result and result.registers:
                            raw_value = result.registers[0]
                            value = raw_value - 65536 if raw_value > 32767 else raw_value
                            data_values[key] = round(value, 3)
                        else:
                            logger.warning(f"[DASHBOARD] No result when reading {key}")

                except Exception as e:
                    logger.error(f"[DASHBOARD] Failed to read {key}: {e}")

        return data_values



    async def update_data(self, interval=0.1):
        """Continuously fetches data every 'interval' seconds."""
        logger.info("Starting data update loop...")
        while True:
            await self.fetch_register_data()
            await asyncio.sleep(interval)

    async def run(self):
        """Initial setup and start the update loop."""
        print("[INFO] Assigning registers...")
        self.assign_registers()
        await self.connect()  # Ensure connection is established
        #asyncio.create_task(self.update_data())  # Run update in background

        
controller = AzimuthController()
#asyncio.create_task(controller.connect())  # Ensures async connection setup
