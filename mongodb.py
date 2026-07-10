"""MongoDB connection module for Prayan Railway Route Server."""

import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client: MongoClient | None = None


def connect_to_mongodb():
    """Connect to MongoDB using the URI from .env."""
    global client

    uri = os.getenv("MONGODB_URI")
    if not uri:
        print("MONGODB_URI not set in .env")
        return None

    try:
        client = MongoClient(uri)
        # Ping to verify the connection
        client.admin.command("ping")
        print("You successfully connected to MongoDB!")
        return client
    except Exception as err:
        print(f"Failed to connect to MongoDB: {err}")
        return None


def disconnect_from_mongodb():
    """Close the MongoDB connection."""
    global client
    if client is not None:
        client.close()
        client = None
        print("Disconnected from MongoDB")
