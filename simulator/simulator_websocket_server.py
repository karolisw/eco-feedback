import os
import json
import logging
import subprocess
from websocket_server import WebsocketServer

dashboard_clients = []
simulation_running = False 
simulation_process = None  

# Create WebSocket server
server = WebsocketServer(host="localhost", port=8003, loglevel=logging.INFO)

def new_client(client, server):
    """Handles a new dashboard client connection."""
    print(f"New client connected: {client['id']}")
    if client not in dashboard_clients:
        dashboard_clients.append(client)

def client_left(client, server):
    """Handles a dashboard client disconnection."""
    print(f"Dashboard disconnected: {client['id']}")
    if client:  # Check if client is still connected
        if client in dashboard_clients:
            dashboard_clients.remove(client)  # Use remove() instead of discard()

def message_received(client, server, message):
    """Handles messages from both the simulator and the dashboard."""
    global simulation_running, simulation_process
    try:
        data = json.loads(message)

        # Check if this is a command from the dashboard
        if "command" in data:
            if data["command"] == "stop_simulation":
                print("Simulation stopped by dashboard command.")
                simulation_running = False  # Stop the simulation loop
                # TODO Does this stop the simulation (index.html)? No it does not.
                if simulation_process:
                    print("terminating simulation process")
                    simulation_process.terminate()  # Kill the process
                    simulation_process = None
                return
            if data["command"] == "start_simulation":
                print("Simulation started by dashboard command.")
                simulation_running = True  # Start simulation
                if simulation_process is None:
                    simulation_process = subprocess.Popen(["python", "-m", "http.server", "8002"])
                return
            
        # If not a command, assume it's simulator data and forward it
        if simulation_running:
            for dashboard_client in dashboard_clients:
                server.send_message(dashboard_client, json.dumps(data))


    except Exception as e:
        print(f"Error processing message: {e}")


# Set up event handlers
server.set_fn_new_client(new_client)
server.set_fn_client_left(client_left)
server.set_fn_message_received(message_received)

print("WebSocket server running on ws://localhost:8003")
server.run_forever()
