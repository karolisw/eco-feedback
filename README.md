# Project Setup Instructions

## Middleware

1. Navigate to the Middleware folder.
2. Create a Python virtual environment:
   python -m venv venv
3. Activate the virtual environment:
   - Windows: venv\Scripts\activate
   - macOS/Linux: source venv/bin/activate
4. Install dependencies:
   pip install -r requirements.txt
5. Run the FastAPI server:
   uvicorn main:app --reload

## Visual

1. Navigate to the Visual folder.
2. Install Node.js dependencies:
   npm install
3. Start the React development server:
   npm start

### Flow Explanation:

Controller → Middleware: The controller sends changes in speed and direction to the middleware.
Middleware → Simulator: Middleware sends the updated speed and direction to the simulator via the API.
Simulator → Middleware: Simulator responds with additional data (e.g., environmental factors like wave angle, wind speed).
Middleware (Calculations): Middleware calculates consumption, emissions, and eco-score using the simulator data and controller inputs.
Middleware → Visual Interface: Middleware sends the aggregated data (speed, direction, consumption, etc.) to the React frontend.

### Activate and run the Python backend in one terminal:

cd Middleware
.\env\Scripts\activate.ps1 # Activate the virtual environment
uvicorn main:app --reload

### Run the React frontend in another terminal:

cd Visual
npm start

# Key Components in the Architecture:

<img src="./images/Architecture_draft_2.png" alt="First draft of the program architecture" width="800"/>

- Middleware: Acts as the core processing unit for calculating eco-scores, consumption, and emissions. Communicates with the simulator via REST API. Sends data to the visual interface (React) via WebSocket.

- Visual Interface (React): Displays the current speed, direction, and consumption. Can receive real-time updates from the middleware via WebSocket.

- Controller: Connects to the middleware. Transmits speed and direction information.

- Database: Connects to the middleware. Stores historical data for analysis or display. Uses the lightweight SQLite3 RDBM system, as this whole system is not very large, and will not surpass the prototype and developmental stage.

- Simulator: Connects to the middleware. Provides environmental data (e.g., wind, wave angles).
