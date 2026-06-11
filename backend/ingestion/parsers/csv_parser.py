import pandas as pd
import io
from typing import Union
from backend.ingestion.models.upload_dtos import ParsedDocumentDTO

def parse_csv(file_data: Union[bytes, str], file_name: str) -> ParsedDocumentDTO:
    if isinstance(file_data, bytes):
        df = pd.read_csv(io.BytesIO(file_data))
    else:
        df = pd.read_csv(file_data)
    
    import numpy as np
    
    # Fill nan with None to avoid JSON serialization issues
    df = df.where(pd.notnull(df), None)
    
    content = []
    for row in df.to_dict(orient="records"):
        clean_row = {}
        for k, v in row.items():
            if isinstance(v, (np.int64, np.int32, np.integer)):
                clean_row[k] = int(v)
            elif isinstance(v, (np.float64, np.float32, np.floating)):
                clean_row[k] = float(v)
            else:
                clean_row[k] = v
        content.append(clean_row)
        
    return ParsedDocumentDTO(file_name=file_name, file_type="csv", content=content)
