"""
EPIC 10.0B.5 — Background Job Execution Manager
Handles async job creation, status tracking, and persistence.
"""

import uuid
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pymongo.database import Database

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """Job status enumeration."""
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BackgroundJobManager:
    """
    Manages background job execution, persistence, and status tracking.
    
    Jobs are stored in MongoDB for persistence across Render restarts.
    Execution happens via asyncio.create_task() for non-blocking operations.
    """

    def __init__(self, mongo_db: Database):
        self.mongo = mongo_db
        self.jobs_collection = mongo_db["background_jobs"]
        self.running_tasks: Dict[str, asyncio.Task] = {}

        # Ensure indexes
        self._ensure_indexes()

    def _ensure_indexes(self) -> None:
        """Create MongoDB indexes for efficient job queries."""
        try:
            self.jobs_collection.create_index("job_id", unique=True)
            self.jobs_collection.create_index("status")
            self.jobs_collection.create_index("created_at")
            logger.info("Background jobs indexes created/verified")
        except Exception as e:
            logger.warning(f"Failed to create indexes: {e}")

    def create_job(
        self,
        job_type: str,
        payload: Dict[str, Any],
        user_id: str = None,
    ) -> str:
        """
        Create a new background job.
        
        Args:
            job_type: Type of job (e.g., 'dataset_ingest', 'graph_rebuild')
            payload: Job-specific data
            user_id: Optional user ID for tracking
            
        Returns:
            job_id (UUID)
        """
        job_id = str(uuid.uuid4())

        job_doc = {
            "job_id": job_id,
            "type": job_type,
            "status": JobStatus.QUEUED,
            "payload": payload,
            "user_id": user_id,
            "created_at": datetime.now(),
            "started_at": None,
            "completed_at": None,
            "error": None,
            "result": None,
            "progress": 0,
        }

        self.jobs_collection.insert_one(job_doc)
        logger.info(f"Job created: {job_id} (type: {job_type})")

        return job_id

    async def execute_job(
        self,
        job_id: str,
        coroutine,
    ) -> None:
        """
        Execute a job asynchronously and track its status.
        
        Args:
            job_id: ID of the job
            coroutine: Async function to execute
        """
        try:
            # Update status to RUNNING
            self._update_job_status(job_id, JobStatus.RUNNING, started_at=datetime.now())

            # Execute the coroutine
            result = await coroutine

            # Update status to COMPLETED
            self._update_job_status(
                job_id,
                JobStatus.COMPLETED,
                completed_at=datetime.now(),
                result=result,
            )

            logger.info(f"Job completed: {job_id}")

        except Exception as e:
            logger.error(f"Job failed: {job_id} - {str(e)}", exc_info=True)

            # Update status to FAILED
            self._update_job_status(
                job_id,
                JobStatus.FAILED,
                completed_at=datetime.now(),
                error=str(e),
            )

    def schedule_job(
        self,
        job_id: str,
        coroutine,
    ) -> None:
        """
        Schedule a job for background execution via asyncio.
        
        Args:
            job_id: ID of the job
            coroutine: Async function to execute
        """
        try:
            # Create and store the task
            task = asyncio.create_task(self.execute_job(job_id, coroutine))
            self.running_tasks[job_id] = task

            logger.info(f"Job scheduled: {job_id}")

        except Exception as e:
            logger.error(f"Failed to schedule job {job_id}: {str(e)}", exc_info=True)
            self._update_job_status(
                job_id,
                JobStatus.FAILED,
                error=f"Scheduling failed: {str(e)}",
            )

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the current status of a job.
        
        Args:
            job_id: ID of the job
            
        Returns:
            Job document or None if not found
        """
        job = self.jobs_collection.find_one({"job_id": job_id})

        if job:
            # Remove MongoDB internal ID for API response
            job.pop("_id", None)

        return job

    def update_job_progress(
        self,
        job_id: str,
        progress: int,
        message: str = None,
    ) -> None:
        """
        Update job progress (0-100).
        
        Args:
            job_id: ID of the job
            progress: Progress percentage (0-100)
            message: Optional status message
        """
        update = {
            "progress": min(100, max(0, progress)),
        }

        if message:
            update["progress_message"] = message

        self.jobs_collection.update_one(
            {"job_id": job_id},
            {"$set": update},
        )

        logger.debug(f"Job {job_id} progress: {progress}%")

    def _update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        **kwargs,
    ) -> None:
        """Internal method to update job status."""
        update = {"status": status}
        update.update(kwargs)

        self.jobs_collection.update_one(
            {"job_id": job_id},
            {"$set": update},
        )

        logger.info(f"Job {job_id} status updated to: {status}")

    def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a running job.
        
        Args:
            job_id: ID of the job
            
        Returns:
            True if cancelled, False if not found or already completed
        """
        job = self.get_job_status(job_id)

        if not job:
            logger.warning(f"Job not found: {job_id}")
            return False

        if job["status"] in [JobStatus.COMPLETED, JobStatus.FAILED]:
            logger.warning(f"Cannot cancel completed job: {job_id}")
            return False

        # Cancel the asyncio task if it exists
        if job_id in self.running_tasks:
            task = self.running_tasks[job_id]
            task.cancel()
            del self.running_tasks[job_id]
            logger.info(f"Task cancelled: {job_id}")

        # Update status in database
        self._update_job_status(job_id, JobStatus.CANCELLED)

        return True

    def get_job_history(
        self,
        job_type: str = None,
        limit: int = 50,
        skip: int = 0,
    ) -> list:
        """
        Get job history with optional filtering.
        
        Args:
            job_type: Optional filter by job type
            limit: Maximum results
            skip: Skip N results (for pagination)
            
        Returns:
            List of job documents
        """
        query = {}

        if job_type:
            query["type"] = job_type

        jobs = list(
            self.jobs_collection.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        # Remove MongoDB internal IDs
        for job in jobs:
            job.pop("_id", None)

        return jobs

    def cleanup_old_jobs(self, days: int = 7) -> int:
        """
        Remove job records older than N days.
        
        Args:
            days: Number of days to keep
            
        Returns:
            Number of jobs deleted
        """
        from datetime import timedelta

        cutoff_date = datetime.now() - timedelta(days=days)

        result = self.jobs_collection.delete_many({"created_at": {"$lt": cutoff_date}})

        logger.info(f"Cleaned up {result.deleted_count} old jobs")

        return result.deleted_count

    def get_job_summary(self) -> Dict[str, Any]:
        """
        Get summary statistics of all jobs.
        
        Returns:
            Dictionary with job statistics
        """
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1},
                }
            }
        ]

        results = list(self.jobs_collection.aggregate(pipeline))

        summary = {status.value: 0 for status in JobStatus}

        for result in results:
            status = result["_id"]
            count = result["count"]
            if status in summary:
                summary[status] = count

        return summary
