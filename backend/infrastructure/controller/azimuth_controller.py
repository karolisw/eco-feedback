import asyncio
import os
import time
import yaml
import numpy as np

from pymodbus import FramerType
from pymodbus.client import ModbusSerialClient, ModbusTcpClient, AsyncModbusSerialClient, AsyncModbusTcpClient
from pymodbus.constants import Endian
from pymodbus.exceptions import ModbusIOException
from pymodbus.client.mixin import ModbusClientMixin

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
        if config_file is None:
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

        #self.connect()

    async def connect(self):
        """Attempts to establish a Modbus connection."""
        print(f"[INFO] Connecting via {self.connection_type}...")

        if self.client:
            print("[INFO] Closing previous connection...")
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
                print(f"[INFO] Connection established on attempt {attempt + 1}")
                return True
            print(f"[WARNING] Connection attempt {attempt + 1} failed. Retrying in {self.retry_delay} seconds...")
            await asyncio.sleep(self.retry_delay)

        print("[ERROR] Failed to connect after multiple attempts.")
        return False

    async def disconnect(self): 
        """Disconnects the Modbus connection."""
        if self.client:
            await self.client.close()
            self.client = None
            print("[INFO] Disconnected from azimuth controller.")

    def read_csv(self): 
        """Reads the CSV file and extracts register configurations."""
        try:
            data = np.genfromtxt(self.csv_file, delimiter=",", dtype="str", skip_header=1)
            return data
        except Exception as e:
            print(f"[ERROR] Failed to read CSV file: {e}")
            return None

    def assign_registers(self):
        """Creates a dictionary of registers based on the CSV file."""
        data = self.read_csv()
        if data is None:
            return

        regs = {}
        for row in data:
            reg_type = row[2]  # COIL, ISTS, HREG, IREG
            address = int(row[3].strip("x")) if row[3] else None
            data_type = row[6]  # FLOAT, INT, etc.

            key = f"{reg_type}_{address}"
            regs[key] = {
                "reg_type": reg_type,
                "address": address,
                "data_type": data_type,
            }

        self.registers = regs
        print(f"[INFO] Assigned {len(regs)} registers.")

    
    async def fetch_register_data(self):
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
    
    def set_vibration(self, vibration_value: int):
        """
        Writes the vibration value to the Modbus register.

        :param vibration_value: The vibration value to set (0 - 3).
        """
        if not self.client or not self.client.connected:
            print("[ERROR] Not connected to Modbus. Cannot set vibration.")
            return False

        try:
            # HREG 01 is used to set the vibration value
            vibration_register = 0x01 # TODO correct address could easily be "1" instead of "0x01"

            # Write vibration value
            self.client.write_register(address=vibration_register, value=bool(vibration_value), slave=self.slave_id)
            print(f"[INFO] Set vibration value to {vibration_value} at register {vibration_register}")

            return True

        except ModbusIOException as e:
            print(f"[ERROR] Modbus IO Exception while writing vibration: {e}")
            return False
        except Exception as e:
            print(f"[ERROR] Unexpected error while writing vibration: {e}")
            return False
        

    async def get_latest_data(self):
        """Provide the latest register data for external use."""
        #return self.latest_data.copy()
        return self.latest_data.copy()
        #with self.lock:
         #   return self.latest_data.copy() 

    async def update_data(self, interval=0.1):
        """Continuously fetches data every 'interval' seconds."""
        print("[INFO] Starting data update loop...")
        while True:
            await self.fetch_register_data()
            await asyncio.sleep(interval)

    async def run(self):
        """Initial setup and start the update loop."""
        print("[INFO] Assigning registers...")
        self.assign_registers()
        await self.connect()  # Ensure connection is established
        asyncio.create_task(self.update_data())  # Run update in background

        
controller = AzimuthController(connection_type="RTU")
#asyncio.create_task(controller.connect())  # Ensures async connection setup
