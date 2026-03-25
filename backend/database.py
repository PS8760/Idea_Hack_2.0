from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

client: AsyncIOMotorClient = None
db = None

async def connect_db():
    global client, db
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "smart-resolve")

    # If separate user/pass env vars are provided, build the URL safely
    mongo_user = os.getenv("MONGO_USER")
    mongo_pass = os.getenv("MONGO_PASS")
    mongo_host = os.getenv("MONGO_HOST")
    if mongo_user and mongo_pass and mongo_host:
        from urllib.parse import quote_plus
        mongo_url = f"mongodb+srv://{quote_plus(mongo_user)}:{quote_plus(mongo_pass)}@{mongo_host}/{db_name}?retryWrites=true&w=majority"

    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    try:
        await db.users.create_index("email", unique=True)
        await db.complaints.create_index("created_at")
        print(f"Connected to MongoDB: {db_name}")
    except Exception as e:
        print(f"Warning: MongoDB index creation failed: {e}")

async def close_db():
    if client:
        client.close()

def get_db():
    return db
