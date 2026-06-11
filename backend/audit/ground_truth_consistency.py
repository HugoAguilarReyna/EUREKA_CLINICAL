import pandas as pd
from pymongo import MongoClient
from neo4j import GraphDatabase
import sys
import json

def audit_consistency():
    results = {}
    
    # 1. Leer CSV original
    try:
        df = pd.read_csv('/app/act_liver_disease.csv')
        results['csv_rows'] = len(df)
        results['csv_columns'] = list(df.columns)
        results['csv_nulls'] = int(df.isnull().sum().sum())
    except Exception as e:
        results['csv_error'] = str(e)
        
    # 2. Leer MongoDB (Latest Snapshot)
    try:
        client = MongoClient('mongodb://mongodb:27017')
        db = client['eureka_db']
        snap = db.DatasetHistory.find_one(sort=[('created_at', -1)])
        results['mongo_latest_rows'] = snap['rows'] if snap else 0
        results['mongo_latest_target'] = snap['target_variable'] if snap else None
    except Exception as e:
        results['mongo_error'] = str(e)
        
    # 3. Leer Neo4j
    try:
        neo_driver = GraphDatabase.driver('bolt://neo4j:7687', auth=('neo4j', 'eureka_secret'))
        with neo_driver.session() as s:
            results['neo4j_datasets'] = s.run('MATCH (n:DatasetMetadata) RETURN count(n) as c').single()[0]
            results['neo4j_patients'] = s.run('MATCH (n:Patient) RETURN count(n) as c').single()[0]
            results['neo4j_metrics'] = s.run('MATCH (n:LaboratoryMetric) RETURN count(n) as c').single()[0]
            results['neo4j_relationships'] = s.run('MATCH ()-[r]-() RETURN count(r) as c').single()[0]
    except Exception as e:
        results['neo4j_error'] = str(e)
        
    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    audit_consistency()
