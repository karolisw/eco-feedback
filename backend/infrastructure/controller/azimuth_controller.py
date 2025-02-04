import time
import threading
from pymodbus.client import ModbusSerialClient, ModbusTcpClient
from pymodbus.payload import BinaryPayloadDecoder
from pymodbus.constants import Endian
from pymodbus.exceptions import ModbusIOException
import numpy as np

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
        self.connection_type = connection_type
        self.port = port
        self.baudrate = baudrate
        self.ip = ip
        self.tcp_port = tcp_port
        self.slave_id = slave_id
        self.client = None
        self.running = False
        self.data = self.read_csv(csv_file)  # Load register configurations

        # Connect based on type
        self.connect()

    def connect(self):
        """Establishes connection with the azimuth controller."""
        if self.connection_type == "RTU":
            self.client = ModbusSerialClient(port=self.port, baudrate=self.baudrate, stopbits=1, bytesize=8, parity="N")
        else:
            self.client = ModbusTcpClient(self.ip, self.tcp_port)

        # Try connecting
        if not self.client.connect():
            print("[ERROR] Failed to connect to azimuth controller.")
            return False

        print("[INFO] Connected to azimuth controller.")
        return True

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
        
    def fetch_data(self):
        """Fetches all relevant data from the azimuth controller."""
        if not self.client or not self.client.connected:
            print("[WARNING] Attempted to fetch data while disconnected.")
            return {}

        data_dict = {}

        for row in self.data:
            register_type = row[2]  # COIL, ISTS, HREG, IREG
            address = int(row[3].strip("x"), 16) if row[3] else None
            data_type = row[6]  # FLOAT, INT, etc.

            if address is None:
                continue  # Skip invalid rows

            try:
                if register_type in ["COIL", "ISTS"]:
                    # Read single bit values
                    result = self.client.read_coils(address, count=1, slave=self.slave_id) if register_type == "COIL" else self.client.read_discrete_inputs(address, count=1, slave=self.slave_id)
                    data_dict[address] = result.bits[0]

                elif register_type in ["HREG", "IREG"]:
                    if data_type == "FLOAT":
                        # Read 2 registers for 32-bit float
                        result = self.client.read_holding_registers(address, count=2, slave=self.slave_id) if register_type == "HREG" else self.client.read_input_registers(address, count=2, slave=self.slave_id)
                        decoder = BinaryPayloadDecoder.fromRegisters(result.registers, byteorder=Endian.BIG, wordorder=Endian.LITTLE)
                        data_dict[address] = round(decoder.decode_32bit_float(), 3)

                    else:  # Default to INT16
                        result = self.client.read_holding_registers(address, count=1, slave=self.slave_id) if register_type == "HREG" else self.client.read_input_registers(address, count=1, slave=self.slave_id)
                        value = result.registers[0]
                        data_dict[address] = value if value < 32768 else value - 65536  # Convert to signed int

            except Exception as e:
                print(f"[ERROR] Could not read {register_type} {address}: {e}")

        return data_dict

    def update_continuously(self, interval=1):
        """Continuously fetch data and update the system."""
        self.running = True
        while self.running:
            data = self.fetch_data()
            print("[DATA UPDATE]:", data)  # This should update the GUI instead
            time.sleep(interval)

    def start_update_thread(self):
        """Starts a separate thread to fetch data continuously."""
        thread = threading.Thread(target=self.update_continuously, daemon=True)
        thread.start()

    def stop_update_thread(self):
        """Stops the continuous update thread."""
        self.running = False


# Draft, but this is an example of how to use the AzimuthController class
if __name__ == "__main__":
    
    # This would be what we get from the GUI
    controller = AzimuthController(connection_type="RTU", port="COM3", baudrate=9600, slave_id=1, csv_file="Interfacing Overview - Export.csv")

    if controller.connect():
        controller.start_update_thread()
        time.sleep(10)  # Fetch data for 10 seconds
        controller.stop_update_thread()
        controller.disconnect()
