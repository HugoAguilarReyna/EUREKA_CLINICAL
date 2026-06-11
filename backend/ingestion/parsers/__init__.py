from .csv_parser import parse_csv
from .xlsx_parser import parse_xlsx
from .json_parser import parse_json
from .txt_parser import parse_txt
from .md_parser import parse_md
from .pdf_parser import parse_pdf
from .docx_parser import parse_docx
from .html_parser import parse_html

__all__ = [
    "parse_csv",
    "parse_xlsx",
    "parse_json",
    "parse_txt",
    "parse_md",
    "parse_pdf",
    "parse_docx",
    "parse_html",
]
