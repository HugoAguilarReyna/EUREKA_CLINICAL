import json
from typing import Union
from backend.ingestion.models.upload_dtos import ParsedDocumentDTO

def parse_json(file_data: Union[bytes, str], file_name: str) -> ParsedDocumentDTO:
    if isinstance(file_data, bytes):
        data = json.loads(file_data.decode("utf-8"))
    else:
        with open(file_data, "r", encoding="utf-8") as f:
            data = json.load(f)
            
    if not isinstance(data, list):
        data = [data]
        
    return ParsedDocumentDTO(file_name=file_name, file_type="json", content=data)
