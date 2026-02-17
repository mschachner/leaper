import http
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from fastapi import FastAPI, HTTPException
from models import GraphInput, LeapGroupResponse, HopsResponse, HopData, VerifyHopRequest

from sage.all import Graph, PermutationGroup, matrix, ZZ

from leaper.leaper import leap_n, hops, is_hop

app = FastAPI(
  title="Leaper API",
  description="API for calculating leap groups of graphs"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173"],
  allow_methods=["*"],
  allow_headers=["*"],
)

def build_sage_graph(data: GraphInput):
  m = matrix(ZZ, len(data.vertices), len(data.vertices))
  for u, v in data.edges:
    m[u-1, v-1] = 1
    m[v-1, u-1] = 1
  return Graph(m, format='adjacency_matrix')

# Endpoints

@app.get("/")
def root():
  return {"message": "Leaper API is running"}


@app.post("/leap-group", response_model=LeapGroupResponse)
def get_leap_group(graph: GraphInput, n: int = 1):
  G = build_sage_graph(graph)
  try:
    lg = leap_n(G, n)
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
  return LeapGroupResponse(
    structure=lg.structure_description(),
    order=lg.order(),
  )

@app.post("/hops", response_model=HopsResponse)
def get_hops(graph: GraphInput):
  G = build_sage_graph(graph)
  try:
    h = hops(G)
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

  hop_list =[]
  for p in h:
    hop_list.append(HopData(
      one_line=list(p),
      cycle=p.cycle_string(),
    ))

  return HopsResponse(hops=hop_list, count=len(hop_list))


@app.post("/hop", response_model=HopsResponse)
def get_one_hop(graph: GraphInput):
  G = build_sage_graph(graph)
  try:
    h = hops(G)
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

  if len(h) == 0:
    return HopsResponse(hops = [], count=0)

  first = h[0]
  hop_data = HopData(
    one_line = list(first),
    cycle = first.cycle_string(),
  )
  return HopsResponse(hops=[hop_data], count=1)

@app.post("/verify-hop")
def verify_hop(req: VerifyHopRequest):
  n = len(req.vertices)
  m = matrix(ZZ, n, n)
  for u, v in req.edges:
    m[u, v] = 1
    m[v, u] = 1
  G = Graph(m, format='adjacency_matrix')
  # G has 0-indexed vertices. Convert 1-indexed one-line to 0-indexed list
  # so is_hop can use p[v] with list indexing.
  perm_0 = [x - 1 for x in req.one_line]
  valid = is_hop(G, perm_0)
  return { "valid": valid }