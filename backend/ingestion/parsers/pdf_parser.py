import io
import PyPDF2
from typing import Union
from backend.ingestion.models.upload_dtos import ParsedDocumentDTO

def parse_pdf(file_data: Union[bytes, str], file_name: str) -> ParsedDocumentDTO:
    text = ""
    if isinstance(file_data, bytes):
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_data))
    else:
        pdf_reader = PyPDF2.PdfReader(file_data)
        
    for page in pdf_reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
            
    return ParsedDocumentDTO(file_name=file_name, file_type="pdf", content=text)
