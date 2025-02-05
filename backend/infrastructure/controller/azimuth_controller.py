import time
from pymodbus import FramerType
from pymodbus.client import ModbusSerialClient, ModbusTcpClient # Handles Modbus communication for RTU (serial) and TCP (Ethernet).
from pymodbus.constants import Endian # Defines how data bytes are ordered.
from pymodbus.exceptions import ModbusIOException # Handles Modbus communication errors.    
import numpy as np
import yaml
from pymodbus.client.mixin import ModbusClientMixin 


# Import configurations for connecting to the azimuth controller
config = yaml.safe_load(open("config.yaml"))

class AzimuthController:
    def __init__(self, connection_type="RTU"):
        """
        Initializes the azimuth controller communication.

        :param connection_type: "RTU" for serial, "TCP" for Ethernet.
        """
        self.connection_type = connection_type.upper()
        self.client = None
        self.registers = {}

        # Load Modbus parameters from config
        self.slave_id = config["rtu"]["slave_id"]
        self.max_attempts = config["MAX_ATTEMPTS"]
        self.retry_delay = config["RETRY_DELAY"]

        if self.connection_type == "RTU":
            self.port = config["rtu"]["port"]
            self.baudrate = config["rtu"]["baudrate"]
            self.stopbits = config["rtu"]["stopbits"]
            self.bytesize = config["rtu"]["bytesize"]
            self.parity = config["rtu"]["parity"]
            self.csv_file = config["rtu"]["csv_file"]
        else:
            self.ip = config["tcp"]["ip"]
            self.tcp_port = config["tcp"]["tcp_port"]

        self.DATATYPE = ModbusClientMixin.DATATYPE
        self.connect()

            
    def connect(self, max_attempts=5, delay=1):
        """Attempts to connect with retries."""
        print(f"Connecting to {self.port} with baudrate {self.baudrate}, stopbits=1, parity='N', slave_id={self.slave_id}")

        if self.client:
            print("[INFO] Closing previous connection...")
            self.client.close()

        self.client = ModbusSerialClient(framer=FramerType.RTU,port=self.port, baudrate=self.baudrate, stopbits=1, bytesize=8, parity="N")

        # Retry loop for connection attempts
        for attempt in range(max_attempts):
            socket = self.client.connect()
            if socket:
                print(f"[INFO] Connection established on attempt {attempt + 1}")
                return True
            else:
                print(f"[WARNING] Connection attempt {attempt + 1} failed. Retrying in {delay} seconds...")
                time.sleep(delay)

        print("[ERROR] Failed to connect after multiple attempts.")
        return False
    
    def disconnect(self):
        """Disconnects the Modbus connection."""
        if self.client:
            self.client.close()
            self.client = None
            print("[INFO] Disconnected from azimuth controller.")

    def read_csv(self, filename):
        """Reads the CSV file and extracts register configurations."""
        try:
            data = np.genfromtxt(filename, delimiter=",", dtype="str", skip_header=1)
            return data
        except Exception as e:
            print(f"[ERROR] Failed to read CSV file: {e}")
            return None


    # Function to Assign Registers
    def assign_registers(self, data):
        """Creates a dictionary of registers based on the CSV file."""
        regs = {}

        for row in data:
            reg_type = row[2]  # COIL, ISTS, HREG, IREG
            address = int(row[3].strip("x")) if row[3] else None 
            data_type = row[6]  # FLOAT, INT, etc.

            key = f"{reg_type}_{address}"
            regs[key] = {
                'reg_type': reg_type,
                'address': address,
                'data_type': data_type
            }
        
        self.registers = regs

    # Function to Fetch Register Data
    def fetch_register_data(self, registers):
        """Fetches data from all registers."""
        if not self.client or not self.client.connected:
            print("[WARNING] Not connected to Modbus.")
            return

        data_values = {}

        for key, reg in registers.items():
            reg_type = reg['reg_type']
            address = reg['address']
            data_type = reg['data_type']

            try:
                if reg_type == 'COIL':
                    result = self.client.read_coils(address, count=1, slave=self.slave_id)
                    data_values[key] = result.bits[0] if result else None

                elif reg_type == 'ISTS':
                    result = self.client.read_discrete_inputs(address, count=1, slave=self.slave_id)
                    data_values[key] = result.bits[0] if result else None

                elif reg_type == 'HREG' and data_type == 'FLOAT':
                    result = self.client.read_holding_registers(address, count=2, slave=self.slave_id)
                    if result and result.registers:
                        value = self.client.convert_from_registers(result.registers, float, byteorder=Endian.BIG, wordorder=Endian.LITTLE)
                        data_values[key] = round(value, 3)

                elif reg_type == 'HREG':
                    result = self.client.read_holding_registers(address, count=1, slave=self.slave_id)
                    data_values[key] = result.registers[0] if result else None

                elif reg_type == 'IREG' and data_type == 'FLOAT':
                    for offset in [100, 200]:  
                        offset_address = address + offset
                        result = self.client.read_input_registers(offset_address, count=2, slave=self.slave_id)
                        if result and result.registers:
                            value = self.client.convert_from_registers(result.registers, self.DATATYPE.FLOAT32, word_order="little")
                            new_value = str(round(value, 3))
                            data_values[key] = new_value

            except ModbusIOException as e:
                print(f"[ERROR] Modbus IO Exception while reading {reg_type} {address}: {e}")
            except Exception as e:
                print(f"[ERROR] Unexpected error while reading {reg_type} {address}: {e}")

        return data_values

    # Main Loop to Continuously Update Data
    def update_data(self):
        """Continuously fetches data every second."""
        while True:
            data = self.fetch_register_data(self.registers)
            print("[DATA UPDATE] :", len(data))  # Print updated values
            print(data)
            time.sleep(10)


    def run(self):
        print("[INFO] Reading CSV file...")
        csv_data = self.read_csv("Interfacing Overview - Export.csv")
        
        if csv_data is None:
            print("[ERROR] Could not load CSV data. Exiting.")
            exit(1)
        
        print("[INFO] Assigning registers...")
        self.assign_registers(csv_data)
        
        print("[INFO] Starting data update loop...")
        try:
            self.update_data()
        except KeyboardInterrupt:
            print("[INFO] Stopping script...")
            self.client.close()
            
# Draft, but this is an example of how to use the AzimuthController class
if __name__ == "__main__":
    controller = AzimuthController(connection_type="RTU")
    controller.run()
  