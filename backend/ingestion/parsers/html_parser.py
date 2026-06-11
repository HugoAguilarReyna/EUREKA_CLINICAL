from bs4 import BeautifulSoup
from typing import Union
from backend.ingestion.models.upload_dtos import ParsedDocumentDTO

def parse_html(file_data: Union[bytes, str], file_name: str) -> ParsedDocumentDTO:
    if isinstance(file_data, bytes):
        soup = BeautifulSoup(file_data.decode("utf-8", errors="replace"), "html.parser")
    else:
        with open(file_data, "r", encoding="utf-8", errors="replace") as f:
            soup = BeautifulSoup(f.read(), "html.parser")
            
    text = soup.get_text(separator="\n", strip=True)
    return ParsedDocumentDTO(file_name=file_name, file_type="html", content=text)
