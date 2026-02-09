import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from fastapi import FastAPI, HTTPException
from models import GraphInput, LeapGroupResponse

from sage.all import Graph, PermutationGroup, matrix, ZZ

from leaper.leaper import leap_n

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


