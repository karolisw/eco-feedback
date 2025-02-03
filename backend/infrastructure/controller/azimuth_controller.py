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

# Draft, but this is an example of how to use the AzimuthController class
if __name__ == "__main__":
    
    # This would be what we get from the GUI
    controller = AzimuthController(connection_type="RTU", port="COM3", baudrate=9600, slave_id=1, csv_file="Interfacing Overview - Export.csv")

    if controller.connect():
        controller.start_update_thread()
        time.sleep(10)  # Fetch data for 10 seconds
        controller.stop_update_thread()
        controller.disconnect()
