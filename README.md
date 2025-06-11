This project is part of a master's thesis exploring how haptic and visual feedback can support fuel-efficient navigation in maritime contexts. The system consists of a real-time dashboard, a simulator interface, and feedback mechanisms connected to a physical azimuth controller. It is developed using React (frontend) and Python (FastAPI) (backend), and communicates with a simulator and hardware through WebSocket and Modbus protocols.

- Real-time dashboard with thrust, angle, RPM, speed, and fuel consumption
- Configurable haptic feedback: **vibration**, **detents**, **resistance**
- Visual guidance and alert zones
- Scenario-based evaluation system
- Dynamic logging for usability testing and analysis

Includes a FastAPI server for haptic control, config handling, and logging, as well as a React application for the dashboard and startup UI, and a Local simulator (3D ship view), excluded from Git and locally referenced.

| Layer     | Technology           |
|-----------|----------------------|
| Frontend  | React, TypeScript    |
| Backend   | FastAPI, Python 3.10 |
| Protocols | WebSockets, Modbus   |
| Simulator | Local 3D interface   |

---

### Prerequisites

- Python 3.10+
- Node.js & npm
- Local simulator folder (not in Git)
- Azimuth controller (USB/serial)

### Backend setup (initialize virtual environment first)
```
pip install -r requirements.txt
cd backend
python ./main.py
```
## Frontend setup
```
cd frontend
npm install
npm run dev
```

## Simulator setuo
```
cd simulator
python ./simulator_websocket_server.py
```
