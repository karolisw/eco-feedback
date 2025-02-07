import logging
import os
import csv
import numpy as np
import customtkinter as ctk
import sys
import time
import threading
from serial.tools import list_ports
from pymodbus.client import ModbusSerialClient, ModbusTcpClient
from pymodbus.payload import BinaryPayloadBuilder, BinaryPayloadDecoder
from pymodbus.constants import Endian
from pymodbus.exceptions import ModbusIOException
from pymodbus.client.mixin import ModbusClientMixin

logger = logging.getLogger("modbus")
logging.basicConfig(level=logging.INFO)

# Maximum number of rows
max_rows = 12

# Config directory
CONFIG_DIR = "./modbus_config/"

# Setup customtkinter
ctk.set_appearance_mode("System")
ctk.set_default_color_theme("blue")

class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        # Set up window
        self.protocol("WM_DELETE_WINDOW", self.on_closing)
        self.title("Controller Configuration")
        self.title_font = ctk.CTkFont(size=16, weight="bold", underline=True)
        self.DATATYPE = ModbusClientMixin.DATATYPE
        
        # Boolean to check whether connecting/connected
        self.connecting = False
        self.selected = None
        self.updating_from_read = False
        
        # Frame for app settings
        frame = ctk.CTkFrame(self)
        frame.pack(padx=20, pady=(20, 5), ipadx=15, ipady=5)
              
        # Modbus type
        lbl = ctk.CTkLabel(frame, text="Type:")
        lbl.grid(column=0, row=0, sticky='e', padx=(25, 10), pady=(5, 0))
        self.type_var = ctk.StringVar()
        self.type_dropdown = ctk.CTkComboBox(frame, values=["RTU", "TCP"], variable=self.type_var, command=self.update_mb_type)
        self.type_dropdown.set("RTU")
        self.type_dropdown.grid(column=1, row=0, sticky='w', padx=10, pady=(10, 5))
        
        # IP address
        lbl = ctk.CTkLabel(frame, text="IP Address:")
        lbl.grid(column=0, row=1, sticky='e', padx=(25, 10))
        self.ip_var = ctk.StringVar(frame, "127.0.0.1")
        self.ip_entry = ctk.CTkEntry(frame)
        self.ip_entry.configure(textvariable=self.ip_var)
        self.ip_entry.grid(column=1, row=1, sticky='w', padx=10, pady=5)
        
        # TCP port
        lbl = ctk.CTkLabel(frame, text="TCP Port:")
        lbl.grid(column=0, row=2, sticky='e', padx=(25, 10), pady=(0, 5))
        self.tcp_port_var = ctk.IntVar(frame, 5001)
        self.tcp_port_entry = ctk.CTkEntry(frame)
        self.tcp_port_entry.configure(textvariable=self.tcp_port_var)
        self.tcp_port_entry.grid(column=1, row=2, sticky='w', padx=10, pady=(5, 10))

        # Com port
        lbl = ctk.CTkLabel(frame, text="COM Port:")
        lbl.grid(column=2, row=0, sticky='e', padx=(25, 10), pady=(5, 0))
        self.com_var = ctk.StringVar()
        self.com_ports = {}
        preferred_port = None
        for port in list_ports.comports():
            key = f"{port.description} ({port.device.strip('/dev/tty')})" if os.name == "posix" else f"{port.description}"
            self.com_ports[key] = port.device
            if "CH340" in port.description or "ttyUSB0" in port.device:
                preferred_port = key
        self.com_dropdown = ctk.CTkComboBox(frame, values=self.com_ports.keys(), variable=self.com_var)
        if preferred_port: self.com_dropdown.set(preferred_port)
        elif len(self.com_ports.keys()) != 0: self.com_dropdown.set(list(self.com_ports.keys())[0])
        self.com_dropdown.grid(column=3, row=0, sticky='w', padx=10, pady=(10, 5))
        
        # Baud rate
        lbl = ctk.CTkLabel(frame, text="Baud Rate:")
        lbl.grid(column=2, row=1, sticky='e', padx=(25, 10))
        self.baud_var = ctk.StringVar()
        baud_rates = ["110", "300", "600", "1200", "2400", "4800", "9600", "14400", "19200", "38400", "57600", "115200", "128000", "256000"]
        self.baud_dropdown = ctk.CTkComboBox(frame, values=baud_rates, variable=self.baud_var)
        self.baud_dropdown.set(baud_rates[9])
        self.baud_dropdown.grid(column=3, row=1, sticky='w', padx=10, pady=5)
        
        # Slave ID
        lbl = ctk.CTkLabel(frame, text="Slave ID:")
        lbl.grid(column=2, row=2, sticky='e', padx=(25, 10), pady=(0, 5))
        self.slave_var = ctk.IntVar(frame, 1)
        self.slave_entry = ctk.CTkEntry(frame)
        self.slave_entry.configure(textvariable=self.slave_var)
        self.slave_entry.grid(column=3, row=2, sticky='w', padx=10, pady=(5, 10))
        
        # (Dis)connect buttons
        self.button_connect = ctk.CTkButton(frame, text="Connect", command=self.connect)
        self.button_connect.grid(column=4, row=0, sticky='w', padx=10, pady=(10, 5))
        self.button_disconnect = ctk.CTkButton(frame, text="Disconnect", command=self.disconnect, state="disabled")
        self.button_disconnect.grid(column=4, row=1, sticky='w', padx=10, pady=5)
        self.status_lbl = ctk.CTkLabel(frame, text="Status: DISCONNECTED")
        self.status_lbl.grid(column=4, row=2, sticky='w', padx=10, pady=(0, 5))
        
        # Update input field states
        self.update_mb_type()
        
        # Dropdown containing possible startup configurations
        ctk.CTkLabel(frame, text="Startup Config:").grid(column=2, row=3, sticky='e', padx=(10, 5), pady=5)
        self.config_files = self.get_config_files()
        self.selected_config = ctk.StringVar(value=self.config_files[0] if self.config_files else "")
        self.config_dropdown = ctk.CTkComboBox(frame, values=self.config_files, variable=self.selected_config, command=self.load_selected_config)
        self.config_dropdown.grid(column=3, row=3, sticky='w', padx=(5, 10), pady=5)
        
        # Input field for name of config file to save
        lbl = ctk.CTkLabel(frame, text="Save config as:")
        lbl.grid(column=2, row=4, sticky='e', padx=(10, 5), pady=5)
        self.filename_var = ctk.StringVar(value="config_1")  # Default name
        self.filename_entry = ctk.CTkEntry(frame, textvariable=self.filename_var, width=140)
        self.filename_entry.grid(column=3, row=4, sticky='w', padx=(5, 10), pady=5)

        # Add Save Button to GUI
        self.button_save = ctk.CTkButton(frame, text="Save", command=self.save_settings)
        self.button_save.grid(column=4, row=4, sticky='w', padx=10, pady=(10, 5))

        # Create tab view
        self.tab_view = ctk.CTkTabview(self, command=self.update_once, height=0)
        self.tab_view.pack(padx=20, pady=(10, 20), ipadx=15, ipady=6)
        
        # Modbus variables
        self.client = None
        self.slave = 1
        self.variables = {}
        
        # Using the first config file in the list as data for create_tabs(data)
        first_config_file = CONFIG_DIR +  self.get_config_files()[0]
        self.data = self.read_csv(first_config_file)
        
        # Process and create tabs
        self.create_tabs(self.data)
        
        # Thread for updates
        self.update_thread = threading.Thread(target=self.update)
        self.update_thread.daemon = True
        self.update_thread.start()
        
    def ask_replace_file(self, filename):
        """Asks the user if they want to replace an existing configuration file."""
        
        popup = ctk.CTkToplevel(self)
        popup.title("Confirm Overwrite")
        popup.geometry("350x150")

        lbl = ctk.CTkLabel(popup, text=f"A file named '{filename}.csv' already exists.\nDo you want to replace it?", wraplength=320)
        lbl.pack(pady=15)

        decision = ctk.BooleanVar(value=False)

        def yes_action():
            decision.set(True)
            popup.destroy()

        def no_action():
            decision.set(False)
            popup.destroy()

        btn_yes = ctk.CTkButton(popup, text="Yes", command=yes_action)
        btn_yes.pack(side="left", expand=True, padx=10, pady=10)

        btn_no = ctk.CTkButton(popup, text="No", command=no_action)
        btn_no.pack(side="right", expand=True, padx=10, pady=10)

        popup.wait_window()  # Wait for user input
        return decision.get()
    
    def update_config_dropdown(self):
        """Updates the dropdown menu with the latest configuration files."""
        self.config_files = self.get_config_files()  # Refresh the file list
        self.config_dropdown.configure(values=self.config_files)  # Update dropdown values
        
        # Optionally, set the latest file as selected
        if self.config_files:
            self.selected_config.set(self.config_files[-1])  # Set the newest file as default

        
    def save_settings(self):
        """Saves the current GUI settings to a CSV file."""
        #filename = "user_saved_settings.csv"  # Define the output CSV file
        
        # Get the filename from the user input
        config_name = self.filename_var.get().strip()
        
        # Ensure a valid filename is provided
        if not config_name:
            logger.info("File name cannot be empty.")
            return
        
        # Ensure the folder exists
        save_dir = "./modbus_config"
        os.makedirs(save_dir, exist_ok=True)
        
        # Define the full file path
        filename = os.path.join(save_dir, f"{config_name}.csv")
        
        # Check if the file already exists
        if os.path.exists(filename):
            should_replace = self.ask_replace_file(config_name)
            if not should_replace:
                logger.info("File not saved. User chose not to overwrite.")
                return
        

        try:
            with open(filename, mode="w", newline="") as file:
                writer = csv.writer(file)

                # Write header row (matching default format)
                writer.writerow([
                    "SECTION", "NAME", "REG", "ADD", "CAN", "R-ONLY", "TYPE", "GEN", "AX1", "AX2", 
                    "DEF", "MIN", "MAX", "UNIT", "PER", "SECURE", "DEV", "SECTION_INDEX"
                ])
                                
                # Define the allowed IREG addresses that should be included
                allowed_ireg_addresses = {100, 102, 104, 106 }#, 200, 202, 204, 206}

                # Iterate through variables to save their current values
                for key, entry in self.variables.items():
                    
                    address = entry.get("address", 0)
                    reg_type = entry.get("reg_type", "")
                    
                    # Skip addresses >= 100 unless they are in the allowed IREG list
                    if address >= 100 and (reg_type != "IREG" or address not in allowed_ireg_addresses):
                        continue
                    
                    # Adjust IREG addresses to remove offset (e.g., 100 → 0, 102 → 2, etc.)
                    adjusted_address = address - 100 if reg_type == "IREG" and address in allowed_ireg_addresses else address
                    
                    # Format address to always be two digits (e.g., x01 instead of x1)
                    formatted_address = f"x{adjusted_address:02d}"
                    
                    # Clean NAME (remove colon `:` at the end and ensure uppercase)
                    name = entry.get("label", "").rstrip(":").upper()
                
                    # Replace NaN values in MIN and MAX with an empty string
                    min_value = "" if np.isnan(entry.get("min", np.nan)) else entry.get("min", "")
                    max_value = "" if np.isnan(entry.get("max", np.nan)) else entry.get("max", "")

                    # Get DEF value and convert True → 1, False → 0
                    raw_def_value = entry.get("var").get() if entry.get("var") else 0
                    def_value = 1 if raw_def_value is True else (0 if raw_def_value is False else raw_def_value)
                    
                    writer.writerow([
                        entry.get("tab", "Unknown"),  # SECTION
                        name,  # NAME (formatted)
                        reg_type,  # REG (COIL/HREG/etc.)
                        formatted_address,  # ADD (adjusted for IREG)
                        "",  # CAN (empty)
                        "X" if entry.get("read_only", False) else "",  # R-ONLY
                        entry.get("data_type", ""),  # TYPE
                        "X" if entry.get("is_general", False) else "",  # GEN
                        "X" if entry.get("is_axial", False) else "",  # AX1
                        "X" if entry.get("is_axial", False) else "",  # AX2
                        def_value, # DEF
                        min_value,  # MIN (empty string if NaN)
                        max_value,  # MAX (empty string if NaN)
                        entry.get("unit", ""),  # UNIT
                        "X" if entry.get("persistent", False) else "",  # PER
                        "",  # SECURE (empty)
                        "",  # DEV (empty)
                        "1",  # SECTION_INDEX (default to 1)
                    ])

            logger.info(f"Settings saved to {filename}")
            
            # Updating the drop down
            self.update_config_dropdown()

        except Exception as e:
            logger.error(f"Error saving settings: {e}")
      
    # Connect
    def connect(self):
        
        # Update status and connect button
        self.connecting = True
        self.status_lbl.configure(text="Status: CONNECTING")
        self.button_connect.configure(state="disabled")
        self.button_disconnect.configure(state="disabled")
        # self.button_read.configure(state="disabled")
        
        # Make either RTU or TCP connection
        if self.type_dropdown.get() == "RTU":
            # Get slave address and check if it is numeric
            try:
                self.slave = int(self.slave_entry.get())
            except:
                logger.error("Invalid slave address")
                return
            port = self.com_ports[self.com_dropdown.get()]
            baudrate = int(self.baud_dropdown.get())
            self.client = ModbusSerialClient(port=port, baudrate=baudrate, stopbits=1, bytesize=8, parity='N')
        else:
            # Get slave address and check if it is numeric
            try:
                tcp_port = int(self.tcp_port_entry.get())
            except:
                logger.error("Invalid TCP port")
                return
            host = self.ip_entry.get()
            self.client = ModbusTcpClient(host, tcp_port)
        
        
        # Connect to modbus
        self.client.connect()
        # Write the CSV values to Modbus registers to prevent UI reset
        self.write_initial_registers()
        
        serial = self.client.read_holding_registers(80, count=1, slave=self.slave)
        if type(serial) == ModbusIOException:
            self.disconnect()
            self.button_connect.configure(state="normal")
            self.button_disconnect.configure(state="disabled")
            logger.error("Could not connect")
        else:
            self.enable_all(True)
            self.status_lbl.configure(text="Status: CONNECTED")
            self.button_connect.configure(state="disabled")
            self.button_disconnect.configure(state="normal")
            # self.button_read.configure(state="normal")
                
        # Update status and connect button
        self.connecting = False
    
    # Connect
    def disconnect(self):
        if self.client and self.client.connected:
            self.client.close()
            self.client = None
        self.enable_all(False)
        self.status_lbl.configure(text="Status: DISCONNECTED")
        self.button_connect.configure(state="normal")
        self.button_disconnect.configure(state="disabled")
        # self.button_read.configure(state="disabled")
        
    # Update connetion setting fields
    def update_mb_type(self, *args):
        if self.type_dropdown.get() == "RTU":
            self.ip_entry.configure(state="disabled")
            self.tcp_port_entry.configure(state="disabled")
            self.com_dropdown.configure(state="normal")
            self.baud_dropdown.configure(state="normal")
            self.slave_entry.configure(state="normal")
        else:
            self.ip_entry.configure(state="normal")
            self.tcp_port_entry.configure(state="normal")
            self.com_dropdown.configure(state="disabled")
            self.baud_dropdown.configure(state="disabled")
            self.slave_entry.configure(state="disabled")            

    # Update function
    def update(self):
        while True:
            
            # Update parameters
            if not self.connecting and self.client and self.client.connected:
                for var in self.variables:
                    if self.variables[var]['tab'] == self.tab_view.get() and var != self.selected:
                        try:
                            self.read_register(var)
                            time.sleep(0.1)
                        except:
                            logger.error("Connection lost")
                            self.disconnect()
            
            time.sleep(2)
            
    # Update function
    def update_once(self):
        if not self.connecting and self.client and self.client.connected:
            for var in self.variables:
                if self.variables[var]['tab'] == self.tab_view.get() and var != self.selected:
                    try:
                        self.read_register(var)
                    except:
                        logger.info("Connection lost")
                        self.disconnect()
    
    # Change enable/disable
    def enable_all(self, enable = True):
        """Enable or disable UI elements based on the connection state."""

        for key in self.variables:
            if not self.variables[key]['reg_type'] in ["ISTS", "IREG"]:
                self.variables[key]['element'].configure(state="normal" if enable else "disabled")
                
        # Disable startup config dropdown when connected
        self.config_dropdown.configure(state="normal" if not enable else "disabled")
        
    def get_config_files(self):
        """List all CSV configuration files in the modbus_config directory."""
        os.makedirs(CONFIG_DIR, exist_ok=True)
        return [f for f in os.listdir(CONFIG_DIR) if f.endswith(".csv")]
    
    def load_selected_config(self, *args):
        """Loads the selected configuration file and updates the GUI."""
        selected_file = self.selected_config.get()
        file_path = os.path.join(CONFIG_DIR, selected_file)
        
        if not os.path.exists(file_path):
            logger.error(f"Configuration file {selected_file} not found.")
            return
        
        self.data = self.read_csv(file_path)
        logger.info(f"Loaded configuration: {selected_file}")
        
        # Get the list of existing tabs and delete them properly
        self.tab_view.destroy()
        self.variables.clear()
        
        # Create new tabs
        self.create_tabs(self.data)

        

    # Using numpy to read the CSV file
    def read_csv(self, filename):
        try:
            data = np.genfromtxt(filename, delimiter=',', dtype='str', skip_header=1)
            return data
        except Exception as e:
            logger.error("Failed to read the CSV file: {}".format(e))
            sys.exit()
    
    def create_tabs(self, data):
        """Creates tabs and dynamically generates input fields based on the CSV file."""
        
        # Create new tab view (not a great solution - but it works)
        self.tab_view = ctk.CTkTabview(self, command=self.update_once, height=0)
        self.tab_view.pack(padx=20, pady=(10, 20), ipadx=15, ipady=6)
        
        tabs_data = {}
        for row in data:
            tab_name = row[0].title().replace("_", " ")  # Extract tab name
            if tab_name not in tabs_data:
                tabs_data[tab_name] = []
            tabs_data[tab_name].append(row)

        for tab_name, fields in tabs_data.items():
            self.tab_view.add(tab_name)
            tab = self.tab_view.tab(tab_name)
            cols = int(np.ceil(len(tabs_data[tab_name]) / max_rows))
            rows = int(np.ceil(len(tabs_data[tab_name]) / cols))

            for col in range(5 * cols):
                tab.grid_columnconfigure(col, weight=1)

            for n in range(cols):
                lbl = ctk.CTkLabel(tab, text="GEN", font=self.title_font)
                lbl.grid(column=5*n+1, row=0, sticky='', padx=(10, 10), pady=4)
                lbl = ctk.CTkLabel(tab, text="PRI", font=self.title_font)
                lbl.grid(column=5*n+2, row=0, sticky='', padx=(10, 10), pady=4)
                lbl = ctk.CTkLabel(tab, text="SEC", font=self.title_font)
                lbl.grid(column=5*n+3, row=0, sticky='', padx=(10, 10), pady=4)

            for n in range(len(fields)):
                tab_name = fields[n][0].title().replace("_", " ")
                label = fields[n][1].title().replace("_", " ") + ":"
                reg_type = fields[n][2]
                address = np.nan if fields[n][3][1:] == "" else int(fields[n][3].strip("x"))
                read_only = fields[n][5] == "X"
                data_type = fields[n][6]
                is_general = fields[n][7] == "X"
                is_axis_1 = fields[n][8] == "X"
                is_axis_2 = fields[n][9] == "X"
                default_value = fields[n][10]  # DEF Column from CSV
                minimum = np.nan if fields[n][11] == "" else float(fields[n][11])
                maximum = np.nan if fields[n][12] == "" else float(fields[n][12])
                unit = fields[n][13]
                persistent = fields[n][14] == "X"
                x = n // rows
                y = n % rows

                if reg_type in ['COIL', 'ISTS', 'HREG', 'IREG']:
                    lbl = ctk.CTkLabel(tab, text=label)
                    lbl.grid(column=5*x, row=y+1, sticky='e', padx=(40, 10), pady=4)

                    for offset in [0, 1, 2]:
                        if (offset == 0 and is_general) or (offset != 0 and is_axis_1):
                            key = reg_type + '_' + str(int(address) + 100 * offset)

                            if key in self.variables:
                                logger.info("Duplicate key detected:", key)
                                return

                            # Convert DEF values properly
                            if reg_type == "COIL":
                                default_value = bool(int(default_value)) if default_value else False
                                var = ctk.BooleanVar(value=default_value)
                            elif reg_type in ["HREG", "IREG"]:
                                var = ctk.StringVar(value=str(default_value) if default_value else "0")

                            self.variables[key] = {
                                'tab': tab_name,
                                'label': label.rstrip(":"),  # Remove trailing colon
                                'reg_type': reg_type,
                                'address': address + 100 * offset,
                                'read_only': read_only,
                                'data_type': data_type,
                                'is_general': is_general,
                                'is_axial': is_axis_1,
                                'default': default_value,
                                'min': minimum,
                                'max': maximum,
                                'unit': unit,
                                'persistent': persistent,
                                'x': x,
                                'y': y,
                                'var': var,  # Store variable for UI control
                            }
                                                       
                            if reg_type == 'COIL':
                                checkbox = ctk.CTkCheckBox(tab, text="", variable=var, command=lambda k=key: self.write_register(k))
                                checkbox.grid(column=5*x+offset+1, row=y+1, sticky='', padx=(6, 0))
                                self.variables[key]['element'] = checkbox
                                
                            elif reg_type in ['HREG', 'IREG']:
                                entry = ctk.CTkEntry(tab, width=60, textvariable=var, state="normal")
                                entry.grid(column=5*x+offset+1, row=y+1, sticky='', padx=6)
                                var.trace_add("write", lambda *args, k=key: self.write_register(k))  
                                self.variables[key]['element'] = entry  
                            
    
    def write_initial_registers(self):
        """Writes all initial values from the CSV to the Modbus registers to prevent resets."""
        if not self.client or not self.client.connected:
            logger.info("Not connected to Modbus. Skipping initial write.")
            return

        logger.info("Writing initial values to Modbus...")

        for key, entry in self.variables.items():
            address = entry["address"]
            reg_type = entry["reg_type"]
            value = entry["var"].get()  # Get the value from the UI

            try:
                if reg_type == "COIL":
                    self.client.write_coil(address, bool(value))  # Convert 0/1 to True/False
                elif reg_type == "HREG":
                    if entry["data_type"] == "FLOAT":
                        self.client.write_registers(address=address, values=self.client.convert_to_registers(float(value)))
                    else:
                        self.client.write_register(address=address, value=int(value))
                elif reg_type == "IREG":
                    # IREGs are read-only, so we don't write to them
                    continue
                logger.info(f"Wrote {value} to {reg_type} at x{address:02d}")
            except Exception as e:
                logger.error(f"Failed to write {value} to {reg_type} at x{address:02d}: {e}")

    
    def read_register(self, key):
        """Reads values from Modbus registers and updates the GUI elements."""
        
        # Only try reading if connected
        if self.client and self.client.connected:

            # Read from register
            self.updating_from_read = True
            try:
                new_value = None  # Initialize to None to represent no new value yet
                address = self.variables[key]['address']
                reg_type = self.variables[key]['reg_type']
                data_type = self.variables[key]['data_type']

                if reg_type == 'COIL':
                    coils = self.client.read_coils(address, slave=self.slave)
                    if coils.isError():
                        logger.error(f"Error reading COIL {address}")
                    else:
                        new_value = coils.bits[0]

                elif reg_type == 'ISTS':
                    istss = self.client.read_discrete_inputs(address, slave=self.slave)
                    if istss.isError():
                        logger.error(f"Error reading ISTS {address}")
                    else:
                        new_value = istss.bits[0]

                elif reg_type == 'HREG' and data_type == 'FLOAT':
                    hregs = self.client.read_holding_registers(address, count=2, slave=self.slave)
                    if hregs.isError():
                        logger.error(f"Error reading HREG (FLOAT) {address}")
                    else:
                        value = self.client.convert_from_registers(hregs.registers, float, byteorder=Endian.BIG, wordorder=Endian.LITTLE)
                        new_value = str(round(value, 3))

                elif reg_type == 'HREG':
                    hregs = self.client.read_holding_registers(address, count=1, slave=self.slave)
                    if hregs.isError():
                        logger.error(f"Error reading HREG {address}")
                    else:
                        value = hregs.registers[0] - (data_type == "INT" and hregs.registers[0] > 32767) * 65536
                        new_value = str(round(value, 3))

                elif reg_type == 'IREG' and data_type == 'FLOAT':
                    iregs = self.client.read_input_registers(address, count=2, slave=self.slave)
                    if iregs.isError():
                        logger.error(f"Error reading IREG (FLOAT) {address}")
                    else: 
                        value = self.client.convert_from_registers(iregs.registers, self.DATATYPE.FLOAT32, word_order="little")
                        new_value = str(round(value, 3))

                elif reg_type == 'IREG':
                    iregs = self.client.read_input_registers(address, count=1, slave=self.slave)
                    if iregs.isError():
                        logger.error(f"Error reading IREG {address}")
                    else:
                        value = iregs.registers[0] - (data_type == "INT" and iregs.registers[0] > 32767) * 65536
                        new_value = str(round(value, 3))

                # Check if the new value is different from the current value and update if so
                if new_value is not None and new_value != self.variables[key]['var'].get():
                    self.variables[key]['var'].set(new_value)
                return new_value

            except Exception as e:
                logger.error(f"Could not read {reg_type} {address}: {str(e)}")
            finally:
                self.updating_from_read = False


    def write_register(self, key):
        """Writes user changes to Modbus without overriding UI input."""
        
        if not self.client or not self.client.connected:
            logger.info(f"Not connected, skipping write for {key}")
            return

        val = self.variables[key]['var'].get()
        if (val == ""):
            return

        try:
            if self.variables[key]['reg_type'] == "COIL":
                val = bool(int(val))
                self.client.write_coil(address=self.variables[key]['address'], value=val, slave=self.slave)
                logger.info(f"Wrote {val} to COIL {self.variables[key]['address']}")

            elif self.variables[key]['reg_type'] == "HREG":
                val = int(val)
                self.client.write_register(address=self.variables[key]['address'], value=val, slave=self.slave)
                logger.info(f"Wrote {val} to HREG {self.variables[key]['address']}")

            self.variables[key]['var'].set(val)

        except Exception as e:
            logger.error(f"Error writing {val} to {key}: {e}")

    # Close window and stop script when closing
    def on_closing(self):
        if self.client:
            logger.info("Releasing COM3 before exit...")
            self.client.close()
            self.client = None
        self.disconnect()
        self.destroy()
        sys.exit()

# Start and run the app
app = App()
app.mainloop()
