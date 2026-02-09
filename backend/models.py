from pydantic import BaseModel

class GraphInput(BaseModel):
  vertices: list[int]
  edges: list[tuple[int,int]]
  # directed: bool = False

class LeapGroupResponse(BaseModel):
  structure: str
  order: int
