from pydantic import BaseModel

class GraphInput(BaseModel):
  vertices: list[int]
  edges: list[tuple[int,int]]
  directed: bool = False

class LeapGroupResponse(BaseModel):
  structure: str
  order: int

class HopData(BaseModel):
  one_line: list[int]
  cycle: str

class HopsResponse(BaseModel):
  hops: list[HopData]
  count: int

class VerifyHopRequest(BaseModel):
  vertices: list[int]
  edges: list[tuple[int,int]]
  one_line: list[int]
  directed: bool = False