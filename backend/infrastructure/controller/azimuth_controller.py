import time
import threading
from pymodbus import FramerType
from pymodbus.client import ModbusSerialClient, ModbusTcpClient # Handles Modbus communication for RTU (serial) and TCP (Ethernet).
from pymodbus.payload import BinaryPayloadDecoder # Decodes modbus' register values (e.g., FLOAT, INT).
from pymodbus.constants import Endian # Defines how data bytes are ordered.
from pymodbus.exceptions import ModbusIOException # Handles Modbus communication errors.    
import numpy as np
import yaml
from pymodbus.client.mixin import ModbusClientMixin 


# Import configurations for connecting to the azimuth controller
config = yaml.safe_load(open("config.yaml"))

# TODO divide into class that reads data and class that handles/processes the data
class AzimuthController:
    def __init__(self, connection_type="RTU", port=None, baudrate=9600, ip="127.0.0.1", tcp_port=502, slave_id=1, csv_file="Interfacing Overview - Export.csv"):
        """
        Initializes the azimuth controller communication.

        :param connection_type: "RTU" for serial, "TCP" for Ethernet.
        :param port: Serial port for RTU (e.g., "COM3" or "/dev/ttyUSB0").
        :param baudrate: Baud rate for serial communication.
        :param ip: IP address for TCP connection.
        :param tcp_port: Port number for TCP connection.
        :param slave_id: Modbus slave address of the controller.
        :param csv_file: CSV file containing register mappings.
        """
        self.registers = {}
        self.connection_type = connection_type
        self.port = port
        self.baudrate = baudrate
        self.ip = ip
        self.tcp_port = tcp_port
        self.slave_id = slave_id
        self.client = None
        self.running = False
        self.data = self.read_csv(csv_file)  # Load register configurations

        self.DATATYPE = ModbusClientMixin.DATATYPE

        self.valid_coils = [0x00, 0x01, 0x02, 0x03, 0x04,  # Functions and sensors
                            0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,  # LED settings
                            0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,  # Detent settings
                            0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x60, 0x61, 0x62  # Detent settings
                            ]  

        self.valid_hregs = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05,0x06,0x07,  # Functions and sensors
                            0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, # LED settings
                            0x30, 0x31,  # Boundary settings
                            0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49]  # Detent positions

        self.valid_iregs = [0x00, 0x02, 0x04, 0x06]  # Functions and sensors
        # Connect based on type
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
        print("[INFO] Assigned registers:", len(regs))
        print("[INFO] Register keys:", list(regs.keys()))
        print("[INFO] IREG keys:", [k for k in regs.keys() if "IREG" in k])
        print("[INFO] IREG values")

    # Function to Fetch Register Data
    def fetch_register_data(self, registers):
        """Fetches data from all registers."""
        if not self.client or not self.client.connected:
            print("[WARNING] Not connected to Modbus server.")
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
                    for offset in [100, 200]:  # Match GUI logic
                        offset_address = address + offset
                        #print(f"Reading FLOAT IREG at address {offset_address}")  # Debugging
                        result = self.client.read_input_registers(offset_address, count=2, slave=self.slave_id)
                        if result and result.registers:
                            value = self.client.convert_from_registers(result.registers, self.DATATYPE.FLOAT32, word_order="little")
                            new_value = str(round(value, 3))
                            data_values[key] = new_value

            except ModbusIOException as e:
                print(f"[ERROR] Modbus IO Exception while reading {reg_type} {address}: {e}")
            except Exception as e:
                print(f"[ERROR] Unexpected error while reading {reg_type} {address}: {e}")
                print(f"[DEBUG] Failed Response: {result}")

        return data_values

    # Main Loop to Continuously Update Data
    def update_data(self):
        """Continuously fetches data every second."""
        while True:
            if not self.client.connect():
                print("[ERROR] Failed to connect to Modbus server.")
                break

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
    controller = AzimuthController(connection_type="RTU", port="COM3", baudrate=38400, slave_id=1)
    controller.run()
  