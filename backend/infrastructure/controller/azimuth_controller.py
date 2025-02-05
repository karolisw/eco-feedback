import time
import threading
from pymodbus import FramerType
from pymodbus.client import ModbusSerialClient, ModbusTcpClient # Handles Modbus communication for RTU (serial) and TCP (Ethernet).
from pymodbus.payload import BinaryPayloadDecoder # Decodes modbus' register values (e.g., FLOAT, INT).
from pymodbus.constants import Endian # Defines how data bytes are ordered.
from pymodbus.exceptions import ModbusIOException # Handles Modbus communication errors.    
import numpy as np
import yaml

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

    """
    def connect(self):
        if self.connection_type == "RTU":
            print(f"Connecting to {self.port} with baudrate {self.baudrate}, stopbits, parity='N', slave_id={self.slave_id}")
            #self.client = ModbusSerialClient(port=self.port, baudrate=self.baudrate, stopbits=1, bytesize=8, parity="N")
            self.client = ModbusSerialClient(port=self.port, baudrate=self.baudrate, stopbits=1, bytesize=8, parity="N", retries=10)
        else:
            self.client = ModbusTcpClient(host=self.ip, port=self.tcp_port)
            
        # Connect
        if not self.client.connect():
            print("[ERROR] Failed to connect to azimuth controller.")
            return False
        return True
        """
            
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
                    if result:
                        decoder = BinaryPayloadDecoder.fromRegisters(result.registers, byteorder=Endian.BIG, wordorder=Endian.LITTLE)
                        data_values[key] = round(decoder.decode_32bit_float(), 3)

                elif reg_type == 'HREG':
                    result = self.client.read_holding_registers(address, count=1, slave=self.slave_id)
                    data_values[key] = result.registers[0] if result else None

                elif reg_type == 'IREG' and data_type == 'FLOAT':
                    result = self.client.read_input_registers(address, count=2, slave=self.slave_id)
                    if result:
                        decoder = BinaryPayloadDecoder.fromRegisters(result.registers, byteorder=Endian.BIG, wordorder=Endian.LITTLE)
                        data_values[key] = round(decoder.decode_32bit_float(), 3)

                elif reg_type == 'IREG':
                    result = self.client.read_input_registers(address, count=1, slave=self.slave_id)
                    data_values[key] = result.registers[0] if result else None

            except ModbusIOException as e:
                print(f"[ERROR] Modbus IO Exception while reading {reg_type} {address}: {e}")
            except Exception as e:
                print(f"[ERROR] Unexpected error while reading {reg_type} {address}: {e}")

        return data_values

    # Main Loop to Continuously Update Data
    def update_data(self):
        """Continuously fetches data every second."""
        while True:
            if not self.client.connect():
                print("[ERROR] Failed to connect to Modbus server.")
                break

            data = self.fetch_register_data(self.registers)
            print("[DATA UPDATE] length:", len(data))  # Print updated values

            time.sleep(1)

 


    """
    def safe_modbus_read(self, reg_type, address, count, slave):
        if reg_type == "COIL" and address not in self.valid_coils:
            print(f"Skipping invalid COIL: {address}")
            return None
        if reg_type == "HREG" and address not in self.valid_hregs:
            print(f"Skipping invalid HREG: {address}")
            return None
        if reg_type == "IREG" and address not in self.valid_iregs:
            print(f"Skipping invalid IREG: {address}")
            return None
        # Perform Modbus read operation

        if reg_type == "IREG":
            return self.client.read_input_registers(address=address, count=count, slave=slave)
        if reg_type == "HREG":
            return self.client.read_holding_registers(address, count=count)
        if reg_type == "COIL":
            return self.client.read_coils(address, count=count)
        
        return None

    

    def fetch_data(self):
        #Fetches all relevant data from the azimuth controller.
        if not self.client or not self.client.connected:
            print("[WARNING] Attempted to fetch data while disconnected.")
            return {}

        data_dict = {}
        for row in self.data:
            register_type = row[2]  # COIL, ISTS, HREG, IREG
            address = int(row[3].strip("x")) if row[3] else None 

            #print("address", address)
            data_type = row[6]  # FLOAT, INT, etc.
            # print("the address is", address)
            # Validate address
            if address is None:
                continue
            # Convert address to hex before checking
            #hex_address = hex(address)  # Convert integer to hex format
            #print("hex address of address {address}", hex_address)
            
            if register_type == "COIL" and hex_address not in self.valid_coils:
                continue
            if register_type == "HREG" and hex_address not in self.valid_hregs:
                continue
            if register_type == "IREG" and hex_address not in self.valid_iregs:
                continue
                
            
            # Ensure we're comparing against decimal numbers
            if register_type == "COIL" and address not in self.valid_coils:
                print(f"[DEBUG] Skipping {register_type} at address {address} (not in valid list)")
                continue
            if register_type == "HREG" and address not in self.valid_hregs:
                print(f"[DEBUG] Skipping {register_type} at address {address} (not in valid list)")
                continue
            if register_type == "IREG" and address not in self.valid_iregs:
                print(f"[DEBUG] Skipping {register_type} at address {address} (not in valid list)")
                continue
            print(f"[DEBUG] Reading {register_type} at address {address}")
            try:
                if register_type in ["COIL", "ISTS"]:
                    if register_type == "COIL":
                        result = self.client.read_coils(address, count=1, slave=self.slave_id)

                    if result.isError():
                        print(f"[ERROR] Could not read {register_type} {address}: {result}")
                        continue  # Skip invalid register

                    data_dict[address] = result.bits[0] 

                elif register_type in ["HREG", "IREG"]:
                    # This is because FLOATs are stored in two registers (32 bits) and one register is 16 bits
                    count = 2 if data_type == "FLOAT" else 1

                    if register_type == "HREG":
                        result = self.client.read_holding_registers(address, count=count, slave=self.slave_id)
                    else:
                        result = self.client.read_input_registers(address, count=count, slave=self.slave_id)

                    if result.isError():
                        print(f"[ERROR] Could not read {register_type} {address}: {result}")
                        continue  # Skip invalid register

                    if len(result.registers) < count:
                        print(f"[ERROR] Could not read {register_type} {address}: Response too short.")
                        continue

                    if data_type == "FLOAT":
                        decoder = BinaryPayloadDecoder.fromRegisters(
                            result.registers, byteorder=Endian.BIG, wordorder=Endian.LITTLE
                        )
                        value = decoder.decode_32bit_float()
                        data_dict[address] = round(value, 3)
                    else:
                        value = result.registers[0]
                        data_dict[address] = value if value < 32768 else value - 65536  # Convert to signed int

            except ModbusIOException as e:
                print(f"[ERROR] Modbus IO Exception while reading {register_type} {address}: {e}")
            except Exception as e:
                print(f"[ERROR] Unexpected exception while reading {register_type} {address}: {e}")
        return data_dict


    
    def update_continuously(self, interval=1):
        Continuously fetch data and update the system.
        self.running = True
        while self.running:
            data = self.fetch_data()
            print("[DATA UPDATE length]:", len(data)) 
            time.sleep(interval)

    def start_update_thread(self):
        Starts a separate thread to fetch data continuously.
        thread = threading.Thread(target=self.update_continuously, daemon=True)
        thread.start()

    def stop_update_thread(self):
        self.running = False


    def test_read_register(self, address=1):
        if not self.client:
            print("[ERROR] No Modbus connection.")
            return
        
        try:
            result = self.client.read_holding_registers(address, count=1, slave=self.slave_id)
            if result.isError():
                print(f"[ERROR] Modbus response error: {result}")
            else:
                print(f"[SUCCESS] Register {address}: {result.registers[0]}")
        except Exception as e:
            print(f"[ERROR] Exception while reading register {address}: {e}")
    
    def test2(self):
       # Example: Read ANGLE (IREG, address x02, count=2 for FLOAT)
        address = 0x02  # x02 in hex
        count = 2       # FLOAT type requires 2 registers
        slave_id = 1    # Slave ID

        # Read input registers
        response = self.client.read_input_registers(address=address, count=count, slave=slave_id)

        # Check if the response is valid
        if not response.isError():
            # Access the registers from the response
            registers = response.registers

            # Use convert_from_registers to decode the float value
            angle = self.client.convert_from_registers(
                registers,
                byteorder=Endian.BIG,
                wordorder=Endian.LITTLE,
                formatter="float"
            )
            print(f"ANGLE: {angle}")
        else:
            print(f"Failed to read ANGLE: {response}")
    """
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
    """
    controller = AzimuthController(connection_type="RTU", port="COM3", ip="127.0.0.1", tcp_port=5002, baudrate=38400, slave_id=1, csv_file="Interfacing Overview - Export.csv")
    

    if controller.connect():
        print("connected")
        
        test = controller.test2()
        
        # call safe_modbus_read with hex literal
        result = controller.safe_modbus_read(reg_type="IREG", address=0x01, count=8, slave=1)
        print ("result from hex search", result.registers)
        # Call safe_modbus_read with addresses 0-10
        for i in range(10):
            result = controller.safe_modbus_read(reg_type="IREG", address=i, count=2, slave=1)
            print(f"Result {i}: {result}")
        
        
        #result = controller.safe_modbus_read(reg_type="IREG", address=1, count=8, slave=1)
        #print ("result", result)
        
        
        #controller.test_read_register(1)  # Test register 1
        #controller.start_update_thread()
        time.sleep(10)  # Fetch data for 10 seconds
        controller.stop_update_thread()
        #controller.disconnect()
    else:
        print("Failed to connect.")
"""