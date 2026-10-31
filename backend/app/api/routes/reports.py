from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import HTMLResponse, PlainTextResponse
from sqlalchemy.orm import Session

from app.models.database import get_db, Project
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/{project_id}/data")
def get_report_json(project_id: str, db: Session = Depends(get_db)):
    try:
        return ReportService.generate_full_report_data(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{project_id}/markdown", response_class=PlainTextResponse)
def get_report_markdown(project_id: str, db: Session = Depends(get_db)):
    try:
        md = ReportService.generate_markdown_report(db, project_id)
        return PlainTextResponse(
            content=md,
            headers={"Content-Disposition": f"attachment; filename=legacylens_report_{project_id}.md"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{project_id}/html", response_class=HTMLResponse)
def get_report_html(project_id: str, db: Session = Depends(get_db)):
    try:
        data = ReportService.generate_full_report_data(db, project_id)
        meta = data["metadata"]
        
        # Build printable HTML
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LegacyLens AI - Modernization Report ({meta['project_name']})</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; max-width: 900px; margin: 0 auto; }}
    h1 {{ color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }}
    h2 {{ color: #1e1b4b; margin-top: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }}
    th, td {{ border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }}
    th {{ background: #f8fafc; font-weight: 600; }}
    code {{ background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }}
    .badge {{ display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; }}
    .badge-verified {{ background: #dcfce7; color: #166534; }}
    .badge-conflicting {{ background: #fee2e2; color: #991b1b; }}
    .badge-inferred {{ background: #fef3c7; color: #92400e; }}
    .badge-high {{ background: #fee2e2; color: #991b1b; }}
    .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }}
  </style>
</head>
<body>
  <h1>LegacyLens AI Modernization Report</h1>
  <div style="color: #64748b; margin-bottom: 24px;">
    <strong>Project:</strong> {meta['project_name']} (ID: {meta['project_id']})<br>
    <strong>Generated:</strong> {meta['generated_at']} UTC | <strong>Agent:</strong> {meta['agent']}
  </div>

  <h2>1. Executive Summary</h2>
  <div class="card">
    <p><strong>Primary Languages:</strong> {', '.join(meta['languages'].keys()) or 'None'}</p>
    <p><strong>Frameworks Identified:</strong> {', '.join(meta['frameworks']) or 'None'}</p>
    <p><strong>Files Analyzed:</strong> {meta.get('stats', {}).get('file_count', 0)} ({meta.get('stats', {}).get('total_loc', 0)} LOC)</p>
    <p><strong>Reconstructed Rules:</strong> {len(data['business_rules'])} | <strong>Obsolete Findings:</strong> {len(data['obsolete_findings'])}</p>
  </div>

  <h2>2. Business Rules Reconstruction Catalogue</h2>
  <table>
    <thead>
      <tr>
        <th>Rule Code</th>
        <th>Description</th>
        <th>Source Location</th>
        <th>Status</th>
        <th>Confidence</th>
      </tr>
    </thead>
    <tbody>
      {''.join(f'''<tr>
        <td><code>{r["rule_code"]}</code></td>
        <td>{r["description"]}</td>
        <td><code>{r["source_file"]}:{r["line_range"]}</code></td>
        <td><span class="badge badge-{r["status"]}">{r["status"].upper()}</span></td>
        <td>{r["confidence"]*100:.0f}%</td>
      </tr>''' for r in data["business_rules"])}
    </tbody>
  </table>

  <h2>3. Multi-Signal Obsolete Code Findings</h2>
  {''.join(f'''<div class="card">
    <div style="font-weight: 600; font-size: 16px;"><code>{o["component"]}</code> ({o["file"]}:{o["line"]})</div>
    <div style="margin-top: 6px;"><strong>Classification:</strong> <span class="badge badge-{o['category']}">{o["category"].upper()}</span> (Conf: {o["confidence"]*100:.0f}%)</div>
    <div style="margin-top: 4px;"><strong>Signals:</strong> {', '.join(o["signals"])}</div>
    <div style="margin-top: 4px;"><strong>Recommendation:</strong> {o["recommendation"]}</div>
    <div style="margin-top: 4px;"><strong>Business Impact:</strong> {o["impact"]}</div>
  </div>''' for o in data["obsolete_findings"])}

  <h2>4. Phased Modernization Roadmap</h2>
  {''.join(f'''<div class="card">
    <h3 style="margin-top: 0;">Phase {p.get("phase_number")}: {p.get("title")}</h3>
    <p>{p.get("description")}</p>
    <p><strong>Target Components:</strong> {', '.join(p.get("target_components", []))}</p>
    <p><strong>Risk Mitigation:</strong> {p.get("risk_mitigation")}</p>
    <p><strong>Estimated Effort:</strong> {p.get("estimated_effort")}</p>
  </div>''' for p in data["modernization_plan"])}

  <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; color: #94a3b8; font-size: 12px; text-align: center;">
    Generated autonomously by LegacyLens AI &bull; Evidence-Driven Legacy Application Modernization
  </div>
</body>
</html>"""
        return HTMLResponse(content=html)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
