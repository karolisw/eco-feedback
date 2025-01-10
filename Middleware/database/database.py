# Database connection and query handling - This is where the runs are stored and retrieved from the database

from sqlalchemy import create_engine, Table, Column, Integer, Float, MetaData
from config import DB_CONNECTION_STRING
class Database:
    def __init__(self):
        self.engine = create_engine(DB_CONNECTION_STRING)
        self.metadata = MetaData()
        self.data_table = Table(
            'data', self.metadata,
            Column('id', Integer, primary_key=True),
            Column('eco_score', Float),
            Column('consumption', Float),
            Column('emissions', Float),
        )
        self.metadata.create_all(self.engine)

    def store_data(self, sim_data, eco_score, consumption, emissions):
        with self.engine.connect() as conn:
            conn.execute(
                self.data_table.insert(),
                {
                    "eco_score": eco_score,
                    "consumption": consumption,
                    "emissions": emissions,
                }
            )
