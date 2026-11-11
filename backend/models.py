from pydantic import BaseModel

class GraphInput(BaseModel):
  vertices: list[int]
  edges: list[tuple[int,int]]
  directed: bool = False

class LeapGroupResponse(BaseModel):
  # None if GAP could not describe the group in the time allowed.
  structure: str | None
  order: int
  # The order again as a decimal string: orders beyond 2^53 lose digits when
  # JavaScript reads them as numbers.
  order_str: str

class HopData(BaseModel):
  one_line: list[int]
  cycle: str

class HopsResponse(BaseModel):
  # At most LEAPER_MAX_HOPS_RETURNED hops, in lexicographic order.
  hops: list[HopData]
  # How many hops were counted; can exceed len(hops).
  count: int
  # True if counting stopped early, so the graph has more than `count` hops.
  more: bool = False

class VerifyHopRequest(BaseModel):
  vertices: list[int]
  edges: list[tuple[int,int]]
  one_line: list[int]
  directed: bool = False