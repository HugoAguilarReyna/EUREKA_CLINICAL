import pandas as pd
import io
from typing import Union
from backend.ingestion.models.upload_dtos import ParsedDocumentDTO

def parse_csv(file_data: Union[bytes, str], file_name: str) -> ParsedDocumentDTO:
    if isinstance(file_data, bytes):
        df = pd.read_csv(io.BytesIO(file_data))
    else:
        df = pd.read_csv(file_data)
    
    # Fill nan with None to avoid JSON serialization issues
    df = df.where(pd.notnull(df), None)
    content = df.to_dict(orient="records")
    return ParsedDocumentDTO(file_name=file_name, file_type="csv", content=content)
