from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from fpdf import FPDF
import datetime

from backend.intelligence.dataset_memory import DatasetMemoryEngine
from backend.intelligence.comparison_engine import ComparisonEngine

router = APIRouter(prefix="/knowledge/reports", tags=["reports"])

class PDFReport(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(0, 51, 102)
        self.cell(0, 10, "EUREKA EXECUTIVE DECISION REPORT", border=False, ln=1, align="C")
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}", border=False, ln=1, align="C")
        self.ln(5)

    def chapter_title(self, title):
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(0, 51, 102)
        self.cell(0, 10, title, ln=1, border="B")
        self.ln(4)

    def chapter_body(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(0, 0, 0)
        self.multi_cell(0, 6, text)
        self.ln(4)
        
    def add_finding_card(self, finding: dict):
        # Format finding nicely
        self.set_font("Helvetica", "B", 10)
        
        # Color based on severity
        sev = finding.get('severity', 'LOW')
        if sev == 'CRITICAL': self.set_text_color(220, 38, 38)
        elif sev == 'HIGH': self.set_text_color(234, 88, 12)
        elif sev == 'MEDIUM': self.set_text_color(202, 138, 4)
        else: self.set_text_color(34, 197, 94)
            
        self.cell(0, 6, f"[{sev}] {finding.get('finding', '')}", ln=1)
        self.set_text_color(0, 0, 0)
        self.set_font("Helvetica", "", 10)
        
        impact = finding.get('impact', '')
        rec = finding.get('recommendation', '')
        val_prev = finding.get('previous_value', 0)
        val_curr = finding.get('current_value', 0)
        
        self.multi_cell(0, 6, f"Impact: {impact}")
        self.multi_cell(0, 6, f"Shift: {val_prev}% -> {val_curr}%")
        
        self.set_font("Helvetica", "B", 10)
        self.multi_cell(0, 6, f"Action: {rec}")
        self.ln(4)

@router.get("/executive-pdf")
async def generate_executive_pdf():
    # 1. Gather Data
    mem_engine = DatasetMemoryEngine()
    history = await mem_engine.get_history()
    
    if len(history) < 2:
        raise HTTPException(status_code=400, detail="Insufficient snapshots for report")
        
    snapshot_b = history[0] # newer
    snapshot_a = history[1] # older
    
    comp_engine = ComparisonEngine()
    comparisons = comp_engine.compare_snapshots(snapshot_a, snapshot_b)
    findings = [c.model_dump() for c in comparisons]
    
    # Categorize
    criticals = [f for f in findings if f["severity"] in ["CRITICAL", "HIGH"] and f["delta"] > 0]
    improvements = [f for f in findings if f["delta"] < 0]
    emerging = [f for f in findings if f["previous_value"] == 0 and f["current_value"] > 0]
    
    # 2. Build PDF
    pdf = PDFReport()
    pdf.add_page()
    
    # Exec Summary
    pdf.chapter_title("1. Executive Summary")
    summary_text = (
        f"This report compares organizational states between '{snapshot_a.dataset_name}' "
        f"and '{snapshot_b.dataset_name}'. "
        f"We detected {len(criticals)} critical deteriorations, {len(improvements)} improvements, "
        f"and {len(emerging)} emerging risks."
    )
    pdf.chapter_body(summary_text)
    
    # What Changed
    pdf.chapter_title("2. What Changed & Recommendations")
    if not criticals:
        pdf.chapter_body("No significant negative changes detected.")
    for f in criticals:
        pdf.add_finding_card(f)
        
    # Emerging Risks
    pdf.chapter_title("3. Emerging Risks")
    if not emerging:
        pdf.chapter_body("No new emerging risks detected.")
    for f in emerging:
        pdf.add_finding_card(f)
        
    # Improvements
    pdf.chapter_title("4. Improvements")
    if not improvements:
        pdf.chapter_body("No significant improvements detected.")
    for f in improvements:
        pdf.add_finding_card(f)
        
    # Confidence & Evidence
    pdf.chapter_title("5. Confidence Analysis & Evidence Appendix")
    evidence_text = (
        "All findings above have been validated via 2-tailed Z-Tests (90% confidence threshold) "
        "and Business Impact Heuristics. Noise (<3% relative shift) was suppressed.\n"
        f"Older Dataset: {snapshot_a.dataset_id} (N={snapshot_a.rows})\n"
        f"Newer Dataset: {snapshot_b.dataset_id} (N={snapshot_b.rows})"
    )
    pdf.chapter_body(evidence_text)
    
    pdf_bytes = bytes(pdf.output())
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=eureka_executive_report.pdf"}
    )
