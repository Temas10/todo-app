"""FastAPI application for the To-Do List app.

Exposes a small REST API under /api/tasks and serves the single-page
frontend (static files) from /static, mounted at the root URL.
"""
import os
from pathlib import Path
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db, init_db

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="To-Do List API",
    description="A simple task manager with persistent SQLite storage.",
    version="1.0.0",
)

# CORS — open for everyone so the static frontend (served from /) can call
# /api even when deployed on a different origin during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
@app.get("/api/tasks", response_model=List[schemas.TaskOut], tags=["tasks"])
def list_tasks(
    completed: Optional[bool] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Filter by title substring"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Task)
    if completed is not None:
        query = query.filter(models.Task.completed == completed)
    if search:
        query = query.filter(models.Task.title.ilike(f"%{search}%"))
    return query.order_by(models.Task.created_at.desc()).all()


@app.post(
    "/api/tasks",
    response_model=schemas.TaskOut,
    status_code=status.HTTP_201_CREATED,
    tags=["tasks"],
)
def create_task(payload: schemas.TaskCreate, db: Session = Depends(get_db)):
    task = models.Task(
        title=payload.title.strip(),
        description=(payload.description or "").strip(),
        completed=payload.completed,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.get("/api/tasks/{task_id}", response_model=schemas.TaskOut, tags=["tasks"])
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.patch("/api/tasks/{task_id}", response_model=schemas.TaskOut, tags=["tasks"])
def update_task(
    task_id: int,
    payload: schemas.TaskUpdate,
    db: Session = Depends(get_db),
):
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "title" in update_data and update_data["title"] is not None:
        update_data["title"] = update_data["title"].strip()
    if "description" in update_data and update_data["description"] is not None:
        update_data["description"] = update_data["description"].strip()

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["tasks"])
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


@app.delete("/api/tasks", status_code=status.HTTP_204_NO_CONTENT, tags=["tasks"])
def delete_completed_tasks(
    completed: bool = Query(True, description="Delete only completed tasks"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Task)
    if completed:
        query = query.filter(models.Task.completed == completed)
    query.delete(synchronize_session=False)
    db.commit()


@app.get("/api/stats", response_model=schemas.TaskStats, tags=["tasks"])
def task_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(models.Task.id)).scalar() or 0
    completed = db.query(func.count(models.Task.id)).filter(models.Task.completed).scalar() or 0
    return schemas.TaskStats(total=total, completed=completed, active=total - completed)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Static frontend
# ---------------------------------------------------------------------------
# Mount the /static path for CSS/JS so the HTML can reference clean URLs.
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", include_in_schema=False)
def root():
    """Serve the single-page app at the root URL."""
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    raise HTTPException(status_code=404, detail="index.html not found")


@app.on_event("startup")
def on_startup():
    init_db()
