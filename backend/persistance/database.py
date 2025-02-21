# Database connection and query handling - This is where the runs are stored and retrieved from the database
import sqlite3

import sqlite3
import asyncio

class Database:
    def __init__(self, db_name="runs.db"):
        self.db_name = db_name
        self._ensure_table_exists()

    def _ensure_table_exists(self):
        """Ensure the table exists before inserting data."""
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS Run (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_time REAL NOT NULL,
                    total_consumption REAL NOT NULL,
                    configuration_number INTEGER NOT NULL,
                    average_speed REAL NOT NULL,
                    average_rpm REAL NOT NULL
                )
            ''')
            conn.commit()
            
    async def store_data(self, run_time, total_consumption, configuration_number, average_speed, average_rpm):
        """Store run data asynchronously in a separate thread to prevent blocking."""
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None, 
            self._store_data_sync, 
            run_time, total_consumption, configuration_number, average_speed, average_rpm
        )

    def _store_data_sync(self, run_time, total_consumption, configuration_number, average_speed, average_rpm):
        """Insert a new record into the database (blocking function)."""
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO Run (run_time, total_consumption, configuration_number, average_speed, average_rpm)
                VALUES (?, ?, ?, ?, ?)
            ''', (run_time, total_consumption, configuration_number, average_speed, average_rpm))
            conn.commit()

    def clear_data(self):
        """Remove all data from database."""
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM Run")
            conn.commit()

    def close(self):
        """Close the database connection."""
        pass  # No need for explicit closing when using `with sqlite3.connect`
