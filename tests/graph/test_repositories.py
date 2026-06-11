import pytest
from unittest.mock import MagicMock
from backend.graph.repositories.asset_repository import AssetRepository
from backend.graph.repositories.case_repository import CaseRepository
from backend.graph.repositories.governance_repository import GovernanceRepository


def test_asset_repository_upsert(mock_mongo):
    repo = AssetRepository()
    doc = {"asset_id": "asset_123", "asset_type": "ClinicalPattern", "confidence": 0.9}
    
    repo.upsert_asset(doc)
    mock_mongo["collection"].replace_one.assert_called_once_with(
        {"asset_id": "asset_123"}, doc, upsert=True
    )


def test_asset_repository_upsert_invalid():
    repo = AssetRepository()
    with pytest.raises(ValueError):
        repo.upsert_asset({"type": "ClinicalPattern"})


def test_asset_repository_get(mock_mongo):
    repo = AssetRepository()
    mock_mongo["collection"].find_one.return_value = {"asset_id": "asset_123", "clinical_relevance": "high"}
    
    result = repo.get_asset("asset_123")
    assert result["asset_id"] == "asset_123"
    mock_mongo["collection"].find_one.assert_called_once_with({"asset_id": "asset_123"}, {"_id": 0})


def test_asset_repository_list(mock_mongo):
    repo = AssetRepository()
    mock_cursor = MagicMock()
    mock_cursor_skip = MagicMock()
    mock_cursor_limit = MagicMock()
    
    mock_cursor.skip.return_value = mock_cursor_skip
    mock_cursor_skip.limit.return_value = mock_cursor_limit
    mock_cursor_limit.__iter__.return_value = iter([{"asset_id": "1"}, {"asset_id": "2"}])
    
    mock_mongo["collection"].find.return_value = mock_cursor
    
    result = repo.list_assets(skip=10, limit=20)
    assert len(result) == 2
    mock_cursor.skip.assert_called_once_with(10)
    mock_cursor_skip.limit.assert_called_once_with(20)


def test_case_repository_upsert(mock_mongo):
    repo = CaseRepository()
    doc = {"case_id": "case_1", "patient_id": "p_1"}
    
    repo.upsert_case(doc)
    mock_mongo["collection"].replace_one.assert_called_once_with(
        {"case_id": "case_1"}, doc, upsert=True
    )


def test_case_repository_get(mock_mongo):
    repo = CaseRepository()
    mock_mongo["collection"].find_one.return_value = {"case_id": "case_1", "status": "UPLOADED"}
    
    result = repo.get_case("case_1")
    assert result["status"] == "UPLOADED"


def test_governance_repository_upsert(mock_mongo):
    repo = GovernanceRepository()
    doc = {"governance_id": "gov_1", "asset_id": "asset_123", "action": "approve"}
    
    repo.upsert_governance_event(doc)
    mock_mongo["collection"].replace_one.assert_called_once_with(
        {"governance_id": "gov_1"}, doc, upsert=True
    )


def test_governance_repository_get_trail(mock_mongo):
    repo = GovernanceRepository()
    mock_cursor = MagicMock()
    mock_cursor_sort = MagicMock()
    
    mock_cursor.sort.return_value = mock_cursor_sort
    mock_cursor_sort.__iter__.return_value = iter([{"governance_id": "gov_1"}, {"governance_id": "gov_2"}])
    mock_mongo["collection"].find.return_value = mock_cursor
    
    result = repo.get_governance_trail("asset_123")
    assert len(result) == 2
    mock_mongo["collection"].find.assert_called_once_with({"asset_id": "asset_123"}, {"_id": 0})
