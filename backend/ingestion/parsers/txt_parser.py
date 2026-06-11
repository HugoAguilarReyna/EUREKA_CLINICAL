from typing import Union
from backend.ingestion.models.upload_dtos import ParsedDocumentDTO

def parse_txt(file_data: Union[bytes, str], file_name: str) -> ParsedDocumentDTO:
    if isinstance(file_data, bytes):
        text = file_data.decode("utf-8", errors="replace")
    else:
        with open(file_data, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
            
    return ParsedDocumentDTO(file_name=file_name, file_type="txt", content=text)
