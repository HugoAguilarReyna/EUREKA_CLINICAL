import os
from pymongo import MongoClient
from neo4j import GraphDatabase

def wipe_all():
    print("Wiping MongoDB...")
    mongo_uri = "mongodb://localhost:27018/"
    client = MongoClient(mongo_uri)
    db = client['eureka']
    for collection in db.list_collection_names():
        db[collection].drop()
        print(f"Dropped MongoDB collection: {collection}")

    print("Wiping Neo4j...")
    neo4j_uri = "bolt://localhost:7688"
    driver = GraphDatabase.driver(neo4j_uri, auth=("neo4j", "eureka_secret"))
    with driver.session() as session:
        result = session.run("MATCH (n) DETACH DELETE n")
        print("Deleted all Neo4j nodes.")

if __name__ == "__main__":
    wipe_all()
