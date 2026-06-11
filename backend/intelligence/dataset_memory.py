from beanie import Document
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class DatasetHistoryRecord(Document):
    dataset_id: str
    dataset_name: str
    created_at: datetime
    source: str
    
    rows: int
    columns: int
    target_variable: str
    
    metrics: Dict[str, Any]
    insights: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    
    top_risks: List[Dict[str, Any]]
    top_features: List[Dict[str, Any]]
    
    quality_score: float
    system_snapshot: Dict[str, Any]
    
    class Settings:
        name = "DatasetHistory"

class DatasetMemoryEngine:
    def __init__(self):
        pass

    async def register_snapshot(self, 
                                dataset_name: str, 
                                source: str,
                                rows: int,
                                columns: int,
                                target_variable: str,
                                metrics: Dict[str, Any],
                                insights: List[Dict[str, Any]],
                                alerts: List[Dict[str, Any]],
                                recommendations: List[Dict[str, Any]],
                                top_risks: List[Dict[str, Any]],
                                top_features: List[Dict[str, Any]],
                                quality_score: float,
                                system_snapshot: Dict[str, Any]) -> DatasetHistoryRecord:
        
        # We use a timestamp-based ID for clear chronological ordering if needed
        dt = datetime.utcnow()
        dataset_id = f"SNAP_{dt.strftime('%Y%m%d%H%M%S')}_{dataset_name.replace(' ', '_')}"
        
        record = DatasetHistoryRecord(
            dataset_id=dataset_id,
            dataset_name=dataset_name,
            created_at=dt,
            source=source,
            rows=rows,
            columns=columns,
            target_variable=target_variable,
            metrics=metrics,
            insights=insights,
            alerts=alerts,
            recommendations=recommendations,
            top_risks=top_risks,
            top_features=top_features,
            quality_score=quality_score,
            system_snapshot=system_snapshot
        )
        await record.insert()
        return record

    async def get_history(self) -> List[DatasetHistoryRecord]:
        return await DatasetHistoryRecord.find_all().sort("-created_at").to_list()

    async def get_snapshot(self, dataset_id: str) -> Optional[DatasetHistoryRecord]:
        return await DatasetHistoryRecord.find_one(DatasetHistoryRecord.dataset_id == dataset_id)

    async def get_latest_snapshot(self) -> Optional[DatasetHistoryRecord]:
        docs = await DatasetHistoryRecord.find_all().sort("-created_at").limit(1).to_list()
        return docs[0] if docs else None
        
    async def get_timeline(self) -> List[Dict[str, Any]]:
        docs = await DatasetHistoryRecord.find_all().sort("created_at").to_list()
        timeline = []
        for doc in docs:
            # We calculate a simple risk score for the timeline representation
            risk_score = doc.quality_score / 100.0 if doc.quality_score else 0.5
            if doc.top_risks:
                # If we have real top risks, we can derive the score from them, but for now we fallback
                pass
            
            timeline.append({
                "dataset_id": doc.dataset_id,
                "dataset_name": doc.dataset_name,
                "upload_date": doc.created_at.isoformat(),
                "patients": doc.rows,
                "risk_score": risk_score
            })
        return timeline
