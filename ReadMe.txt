### Flow Explanation:
Controller → Middleware: The controller sends changes in speed and direction to the middleware.
Middleware → Simulator: Middleware sends the updated speed and direction to the simulator via the API.
Simulator → Middleware: Simulator responds with additional data (e.g., environmental factors like wave angle, wind speed).
Middleware (Calculations): Middleware calculates consumption, emissions, and eco-score using the simulator data and controller inputs.
Middleware → Visual Interface: Middleware sends the aggregated data (speed, direction, consumption, etc.) to the React frontend.
