"""Pydantic schemas for request validation and response serialization."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500, description="Task title")
    description: Optional[str] = Field(default="", max_length=5000, description="Optional notes")


class TaskCreate(TaskBase):
    completed: bool = False


class TaskUpdate(BaseModel):
    """All fields optional so PATCH can update just one thing at a time."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=5000)
    completed: Optional[bool] = None


class TaskOut(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    completed: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TaskStats(BaseModel):
    total: int
    completed: int
    active: int
