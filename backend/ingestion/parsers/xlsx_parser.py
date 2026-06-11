import pandas as pd
import io
from typing import Union
from backend.ingestion.models.upload_dtos import ParsedDocumentDTO

def parse_xlsx(file_data: Union[bytes, str], file_name: str) -> ParsedDocumentDTO:
    if isinstance(file_data, bytes):
        df = pd.read_excel(io.BytesIO(file_data))
    else:
        df = pd.read_excel(file_data)
        
    df = df.where(pd.notnull(df), None)
    content = df.to_dict(orient="records")
    return ParsedDocumentDTO(file_name=file_name, file_type="xlsx", content=content)
