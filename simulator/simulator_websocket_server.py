import logging
from websocket_server import WebsocketServer
import json

# Store connected dashboard clients as a list (not a set)
dashboard_clients = []

def new_client(client, server):
    """Handles a new dashboard client connection."""
    print(f"Dashboard connected: {client['id']}")
    dashboard_clients.append(client)  # Use append() instead of add()

def client_left(client, server):
    """Handles a dashboard client disconnection."""
    print(f"Dashboard disconnected: {client['id']}")
    if client in dashboard_clients:
        dashboard_clients.remove(client)  # Use remove() instead of discard()

def message_received(client, server, message):
    """Handles messages from the simulator and forwards them to dashboards."""
    try:
        data = json.loads(message)
        print(f"Received from simulator: {data}")

        # Forward data to all connected dashboard clients
        for dashboard_client in dashboard_clients:
            server.send_message(dashboard_client, json.dumps(data))

    except Exception as e:
        print(f"Error processing message: {e}")

# Create WebSocket server
server = WebsocketServer(host="localhost", port=8003, loglevel=logging.INFO)

# Set up event handlers
server.set_fn_new_client(new_client)
server.set_fn_client_left(client_left)
server.set_fn_message_received(message_received)

print("WebSocket server running on ws://localhost:8003")
server.run_forever()
