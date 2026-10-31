from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.models.database import get_db, DependencyNode, DependencyEdge, Project
from app.schemas.schemas import DependencyGraphResponse, DependencyNodeResponse, DependencyEdgeResponse

router = APIRouter(prefix="/dependencies", tags=["dependencies"])

@router.get("/{project_id}", response_model=DependencyGraphResponse)
def get_dependencies_graph(
    project_id: str,
    node_type: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    nodes_query = db.query(DependencyNode).filter(DependencyNode.project_id == project_id)
    if node_type:
        nodes_query = nodes_query.filter(DependencyNode.node_type == node_type)
    if risk_level:
        nodes_query = nodes_query.filter(DependencyNode.risk_level == risk_level)
    nodes = nodes_query.all()

    node_keys = {n.node_key for n in nodes}

    # Fetch edges
    all_edges = db.query(DependencyEdge).filter(DependencyEdge.project_id == project_id).all()
    # Filter edges if node filtering was applied
    if node_type or risk_level:
        edges = [e for e in all_edges if e.source_key in node_keys or e.target_key in node_keys]
    else:
        edges = all_edges

    stats = {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "modules_count": sum(1 for n in nodes if n.node_type == "module"),
        "functions_count": sum(1 for n in nodes if n.node_type == "function"),
        "endpoints_count": sum(1 for n in nodes if n.node_type in ("endpoint", "api")),
        "tables_count": sum(1 for n in nodes if n.node_type == "table"),
        "high_risk_count": sum(1 for n in nodes if n.risk_level == "high")
    }

    return DependencyGraphResponse(
        nodes=nodes,
        edges=edges,
        stats=stats
    )
