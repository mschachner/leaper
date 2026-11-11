import json
import os
import pickle
import resource
import select
import signal
import struct
import sys
import threading
import time
import warnings

leaper_paths = [
    os.path.join(os.path.dirname(__file__), '..', 'src'),  # local dev
    os.path.dirname(__file__),                               # Docker (/app)
]
for p in leaper_paths:
    leaper_dir = os.path.join(p, 'leaper')
    if os.path.isdir(leaper_dir):
        sys.path.insert(0, p)
        break

from fastapi import FastAPI, HTTPException, Request, Response
from models import GraphInput, LeapGroupResponse, HopsResponse, VerifyHopRequest

from leaper import hopsearch
from leaper.leaper import leap_group_from_adjacency, recognize_group

app = FastAPI(
  title="Leaper API",
  description="API for calculating leap groups of graphs"
)

from fastapi.middleware.cors import CORSMiddleware

allowed_origins = [
  "http://localhost:5173",
  "http://localhost:4173",
]

production_origin = os.environ.get("CORS_ORIGIN")
if production_origin:
  allowed_origins.append(production_origin)

app.add_middleware(
  CORSMiddleware,
  allow_origins=allowed_origins,
  allow_methods=["*"],
  allow_headers=["*"],
)

# Limits. Each can be overridden with an environment variable of the same
# name.

def _env_number(name, default, cast):
  try:
    return cast(os.environ.get(name, default))
  except ValueError:
    return cast(default)

# Largest graph for /hops, /hop and /leap-group.
LEAPER_MAX_VERTICES      = _env_number("LEAPER_MAX_VERTICES", 100, int)
# Checking a single drawn hop is cheap, so /verify-hop gets a higher cap.
LEAPER_MAX_VERIFY_VERTICES = _env_number("LEAPER_MAX_VERIFY_VERTICES", 500, int)
# A computation is killed after this long.
LEAPER_TIMEOUT_SECONDS   = _env_number("LEAPER_TIMEOUT_SECONDS", 30, float)
# Once a leap group's order is known, how long GAP gets to describe its
# structure before the order is returned on its own.
LEAPER_STRUCTURE_SECONDS = _env_number("LEAPER_STRUCTURE_SECONDS", 10, float)
# Computations running at once; further requests wait their turn.
LEAPER_MAX_CONCURRENT    = _env_number("LEAPER_MAX_CONCURRENT", 2, int)
# Largest n for the n-th leap group.
LEAPER_MAX_LEAP_N        = _env_number("LEAPER_MAX_LEAP_N", 100, int)
# /hops lists at most this many hops, and stops counting at the second number.
LEAPER_MAX_HOPS_RETURNED = _env_number("LEAPER_MAX_HOPS_RETURNED", 20_000, int)
LEAPER_MAX_HOPS_COUNTED  = _env_number("LEAPER_MAX_HOPS_COUNTED", 2_000_000, int)

# How long a request waits for a free computation slot before giving up.
QUEUE_WAIT_SECONDS = 10

# Messages shown to the user by the frontend (as the error under the Compute
# buttons). Reword freely; the {placeholders} are filled in below.
MSG_TOO_MANY_VERTICES = "This graph has {n} vertices; the server computes on at most {limit}."
MSG_BAD_VERTICES      = "Vertex ids must be exactly 0, 1, ..., n-1."
MSG_BAD_EDGE          = "Edge {edge} refers to a vertex that is not in the graph."
MSG_TOO_MANY_EDGES    = "Too many edges for a graph on {n} vertices."
MSG_BAD_LEAP_N        = "n must be between 1 and {limit}."
MSG_BAD_ONE_LINE      = "The permutation must have one entry per vertex, each between 1 and n."
MSG_TIMEOUT           = "Computation stopped after {seconds} seconds."
MSG_BUSY              = "The server is busy with other computations. Try again in a moment."
MSG_CRASHED           = "The computation ended unexpectedly."

# Logging: one JSON line per computation on stdout. Railway parses JSON log
# lines, so the fields are filterable there (e.g. @outcome:timeout).

def graph_string(n, edges, directed):
  """
  The graph6 string (undirected) or Sage dig6 string (directed) of the graph
  as labeled by the client. Not canonical: isomorphic graphs with different
  labelings give different strings.
  """
  if n > 258047:
    return None
  adj = [[False] * n for _ in range(n)]
  for u, v in edges:
    adj[u][v] = True
    if not directed:
      adj[v][u] = True
  if directed:
    bits = [adj[i][j] for i in range(n) for j in range(n)]
  else:
    bits = [adj[i][j] for j in range(n) for i in range(j)]
  bits += [False] * (-len(bits) % 6)
  if n <= 62:
    chars = [chr(63 + n)]
  else:
    chars = ["~"] + [chr(63 + ((n >> shift) & 63)) for shift in (12, 6, 0)]
  for k in range(0, len(bits), 6):
    value = 0
    for b in bits[k:k + 6]:
      value = (value << 1) | b
    chars.append(chr(63 + value))
  return "".join(chars)

def log_computation(request, endpoint, outcome, started, **fields):
  record = {
    "level": "info" if outcome in ("ok", "partial", "rejected") else "warn",
    "message": f"{endpoint} {outcome}",
    "event": "computation",
    "endpoint": endpoint,
    "outcome": outcome,
    "duration_ms": round((time.monotonic() - started) * 1000),
    "origin": request.headers.get("origin"),
    "user_agent": (request.headers.get("user-agent") or "")[:200] or None,
  }
  record.update(fields)
  print(json.dumps(record), flush=True)

# Validation. Runs before any computation, so an oversized or malformed
# request costs nothing.

def check_graph(data, max_vertices=None):
  """
  Return (fields, error): fields describes the graph for the log line, and
  error is a message if the graph is rejected, else None.
  """
  if max_vertices is None:
    max_vertices = LEAPER_MAX_VERTICES
  n = len(data.vertices)
  fields = {"vertices": n, "edges": len(data.edges), "directed": data.directed}
  if n > max_vertices:
    return fields, MSG_TOO_MANY_VERTICES.format(n=n, limit=max_vertices)
  if sorted(data.vertices) != list(range(n)):
    return fields, MSG_BAD_VERTICES
  if len(data.edges) > n * n:
    return fields, MSG_TOO_MANY_EDGES.format(n=n)
  for u, v in data.edges:
    if not (0 <= u < n and 0 <= v < n):
      return fields, MSG_BAD_EDGE.format(edge=[u, v])
  key = "dig6" if data.directed else "graph6"
  fields[key] = graph_string(n, data.edges, data.directed)
  return fields, None

def adjacency_of(data):
  return hopsearch.adjacency(len(data.vertices), data.edges, data.directed)

# Running a computation so that it can be stopped. Each computation runs in a
# forked child process, which the parent kills at the timeout. (A thread
# cannot be killed, which is how a single request once occupied a core for
# weeks.) The child also carries a CPU-time limit of its own, enforced by the
# kernel, in case the parent is not around to kill it.

# Python 3.12+ warns on every fork from a process that has threads. The child
# here touches nothing the server's other threads use: it computes, writes to
# its own pipe, and exits without running any cleanup.
warnings.filterwarnings("ignore", category=DeprecationWarning,
                        message=".*multi-threaded.*fork.*")

_slots = threading.BoundedSemaphore(LEAPER_MAX_CONCURRENT)

def _write_frame(fd, payload):
  data = pickle.dumps(payload)
  data = struct.pack("!Q", len(data)) + data
  while data:
    data = data[os.write(fd, data):]

def _child_main(job, write_fd):
  code = 1
  try:
    cpu_limit = int(LEAPER_TIMEOUT_SECONDS) + 5
    resource.setrlimit(resource.RLIMIT_CPU, (cpu_limit, cpu_limit + 5))
    try:
      payload = ("ok", job(lambda value: _write_frame(write_fd, ("partial", value))))
    except BaseException as e:
      payload = ("error", f"{type(e).__name__}: {e}")
    _write_frame(write_fd, payload)
    code = 0
  finally:
    os._exit(code)

def run_stoppable(job):
  """
  Run job(emit) in a child process. Returns one of
    ("ok", result), ("partial", value), ("error", message),
    ("timeout", None), ("crashed", None), ("busy", None).

  The job may call emit(value) once it has something worth keeping. From
  then on it has LEAPER_STRUCTURE_SECONDS left, and if it does not finish,
  the last emitted value is returned as ("partial", value).
  """
  if not _slots.acquire(timeout=QUEUE_WAIT_SECONDS):
    return ("busy", None)
  try:
    read_fd, write_fd = os.pipe()
    pid = os.fork()
    if pid == 0:
      os.close(read_fd)
      _child_main(job, write_fd)  # never returns
    os.close(write_fd)
    deadline = time.monotonic() + LEAPER_TIMEOUT_SECONDS
    buffer = bytearray()
    partial = None
    exited = False
    outcome = None
    try:
      while outcome is None:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
          outcome = ("timeout", None) if partial is None else ("partial", partial[0])
          break
        ready, _, _ = select.select([read_fd], [], [], min(remaining, 0.5))
        if ready:
          chunk = os.read(read_fd, 1 << 16)
          buffer.extend(chunk)
          while len(buffer) >= 8:
            size = struct.unpack("!Q", bytes(buffer[:8]))[0]
            if len(buffer) < 8 + size:
              break
            kind, value = pickle.loads(bytes(buffer[8:8 + size]))
            del buffer[:8 + size]
            if kind == "partial":
              partial = (value,)
              deadline = min(deadline, time.monotonic() + LEAPER_STRUCTURE_SECONDS)
            else:
              outcome = (kind, value)
              break
          if outcome is None and not chunk:
            outcome = ("crashed", None)
        elif exited:
          # The child is gone and the pipe has nothing more to give.
          outcome = ("crashed", None)
        else:
          # Not EOF-based: another request's child may hold a copy of this
          # pipe's write end, so check on the child directly.
          done, _ = os.waitpid(pid, os.WNOHANG)
          if done:
            pid = None
            exited = True
    finally:
      os.close(read_fd)
      if pid is not None:
        try:
          os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
          pass
        os.waitpid(pid, 0)
    return outcome
  finally:
    _slots.release()

def respond(request, endpoint, started, fields, job):
  """
  Run job(emit), which returns (body, summary): body is the JSON-serializable
  response, summary is extra fields for the log line. emit takes the same
  pair. The child serializes the body, so a large result never becomes
  Python objects in this process.
  """
  def serialize(pair):
    body, summary = pair
    return json.dumps(body, separators=(",", ":")).encode(), summary

  status, value = run_stoppable(
    lambda emit: serialize(job(lambda pair: emit(serialize(pair)))))
  if status in ("ok", "partial"):
    body, summary = value
    log_computation(request, endpoint, status, started, **fields, **summary)
    return Response(content=body, media_type="application/json")

  if status == "timeout":
    code, outcome = 504, "timeout"
    detail = MSG_TIMEOUT.format(seconds=round(LEAPER_TIMEOUT_SECONDS))
  elif status == "busy":
    code, detail, outcome = 503, MSG_BUSY, "busy"
  elif status == "crashed":
    code, detail, outcome = 500, MSG_CRASHED, "crashed"
  else:
    code, detail, outcome = 500, value, "error"
  log_computation(request, endpoint, outcome, started, **fields, detail=detail)
  raise HTTPException(status_code=code, detail=detail)

def reject(request, endpoint, started, fields, detail):
  log_computation(request, endpoint, "rejected", started, **fields, detail=detail)
  raise HTTPException(status_code=422, detail=detail)

def hop_data(p):
  """
  A hop as the API reports it: 1-indexed one-line notation, and disjoint
  cycles with fixed points omitted.
  """
  seen = [False] * len(p)
  cycles = []
  for start in range(len(p)):
    if seen[start] or p[start] == start:
      continue
    cycle = []
    v = start
    while not seen[v]:
      seen[v] = True
      cycle.append(str(v + 1))
      v = p[v]
    cycles.append("(" + ",".join(cycle) + ")")
  return {"one_line": [x + 1 for x in p], "cycle": "".join(cycles) or "()"}

# Start GAP once here, so that each child inherits it instead of starting its
# own.
recognize_group(leap_group_from_adjacency([[1], [0]])[0], 2)

# Endpoints

@app.get("/")
def root():
  return {"message": "Leaper API is running"}

@app.get("/health")
def health():
  return {"status": "ok"}


@app.post("/leap-group", response_model=LeapGroupResponse)
def get_leap_group(request: Request, graph: GraphInput, n: int = 1):
  started = time.monotonic()
  fields, error = check_graph(graph)
  fields["leap_n"] = n
  if error:
    reject(request, "leap-group", started, fields, error)
  if not 1 <= n <= LEAPER_MAX_LEAP_N:
    reject(request, "leap-group", started, fields,
           MSG_BAD_LEAP_N.format(limit=LEAPER_MAX_LEAP_N))

  def job(emit):
    adj = adjacency_of(graph)
    group, info = leap_group_from_adjacency(adj, n)
    order = int(group.Order())
    body = {
      "structure": recognize_group(group, len(adj)),
      "order": order,
      # Orders beyond 2^53 lose digits as JSON numbers, so send a string too.
      "order_str": str(order),
    }
    summary = {"structure": body["structure"], "order_str": body["order_str"],
               "hops": info["hops"], "hops_complete": info["complete"]}
    if body["structure"] is None:
      # GAP can take minutes on a large group; keep the order if it does.
      emit((body, summary))
      name = str(group.StructureDescription())
      body = {**body, "structure": name}
      summary = {**summary, "structure": name}
    return body, summary

  return respond(request, "leap-group", started, fields, job)

@app.post("/hops", response_model=HopsResponse)
def get_hops(request: Request, graph: GraphInput):
  started = time.monotonic()
  fields, error = check_graph(graph)
  if error:
    reject(request, "hops", started, fields, error)

  def job(emit):
    listed = []
    count = 0
    more = False
    for p in hopsearch.iter_hops(adjacency_of(graph)):
      if count == LEAPER_MAX_HOPS_COUNTED:
        more = True
        break
      count += 1
      if count <= LEAPER_MAX_HOPS_RETURNED:
        listed.append(hop_data(p))
    body = {
      "hops": listed,
      "count": count,            # hops counted
      "more": more,              # True if counting stopped early
    }
    return body, {"hops": count, "hops_complete": not more}

  return respond(request, "hops", started, fields, job)


@app.post("/hop", response_model=HopsResponse)
def get_one_hop(request: Request, graph: GraphInput):
  started = time.monotonic()
  fields, error = check_graph(graph)
  if error:
    reject(request, "hop", started, fields, error)

  def job(emit):
    p = hopsearch.find_hop(adjacency_of(graph))
    found = [hop_data(p)] if p is not None else []
    return {"hops": found, "count": len(found), "more": False}, {"has_hop": bool(found)}

  return respond(request, "hop", started, fields, job)

@app.post("/verify-hop")
def verify_hop(request: Request, req: VerifyHopRequest):
  started = time.monotonic()
  fields, error = check_graph(req, LEAPER_MAX_VERIFY_VERTICES)
  if error:
    reject(request, "verify-hop", started, fields, error)
  n = len(req.vertices)
  if len(req.one_line) != n or any(not 1 <= x <= n for x in req.one_line):
    reject(request, "verify-hop", started, fields, MSG_BAD_ONE_LINE)

  valid = hopsearch.is_hop(adjacency_of(req), [x - 1 for x in req.one_line])
  log_computation(request, "verify-hop", "ok", started, **fields, valid=valid)
  return { "valid": valid }
