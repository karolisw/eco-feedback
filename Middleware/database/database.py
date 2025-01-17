# Database connection and query handling - This is where the runs are stored and retrieved from the database
import sqlite3

class Database:
    def __init__(self, db_name="runs.db"):
        self.connection = sqlite3.connect(db_name)
        self.cursor = self.connection.cursor()
        self.create_table()

    def create_table(self):
        """Create the Run table if it doesn't already exist."""
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS Run (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eco_score REAL NOT NULL,
                total_emissions REAL NOT NULL,
                run_time REAL NOT NULL,
                configuration_number INTEGER NOT NULL
            )
        ''')
        self.connection.commit()

    def store_data(self, eco_score, total_emissions, run_time, configuration_number):
        """Insert a new record into the Run table."""
        self.cursor.execute('''
            INSERT INTO Run (eco_score, total_emissions, run_time, configuration_number)
            VALUES (?, ?, ?, ?)
        ''', (eco_score, total_emissions, run_time, configuration_number))
        self.connection.commit()

    def close(self):
        """Close the database connection."""
        self.connection.close()
