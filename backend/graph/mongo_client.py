import os
from pymongo import MongoClient

class MongoDBClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoDBClient, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        mongo_uri = os.getenv(
            "MONGO_URI",
            "mongodb://localhost:27017/eureka_db",
        )
        self.client = MongoClient(mongo_uri)
        self.db = self.client.get_default_database()
        self._initialized = True

    def get_collection(self, name: str):
        return self.db[name]

    def close(self):
        self.client.close()
