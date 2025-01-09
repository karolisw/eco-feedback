import React, { useEffect, useState } from 'react';

function Dashboard() {
    const [data, setData] = useState({ speed: 0, direction: 0, consumption: 0, emissions: 0, eco_score: 100 });

    useEffect(() => {
        const socket = new WebSocket("ws://localhost:8000/ws");

        socket.onmessage = (event) => {
            const newData = JSON.parse(event.data);
            setData(newData);
        };

        return () => {
            socket.close();
        };
    }, []);

    return (
        <div>
            <h1>Ship Dashboard</h1>
            <p>Speed: {data.speed}</p>
            <p>Direction: {data.direction}</p>
            <p>Consumption: {data.consumption}</p>
            <p>Emissions: {data.emissions}</p>
            <p>Eco-Score: {data.eco_score}</p>
        </div>
    );
}

export default Dashboard;
