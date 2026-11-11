"""
Tests for the HTTP API, including the limits that keep one request from
occupying the server. Skipped where Sage is not installed.
"""
import json
import os
import random
import time

import pytest

pytest.importorskip("sage.all")
pytest.importorskip("httpx")

from fastapi.testclient import TestClient
from sage.all import DiGraph, Graph, Permutation

import app as backend


@pytest.fixture(scope="module")
def client():
    return TestClient(backend.app)


def graph(n, edges, directed=False):
    return {"vertices": list(range(n)), "edges": edges, "directed": directed}


def cycle(n):
    return [[i, (i + 1) % n] for i in range(n)]


def complete(n):
    return [[i, j] for i in range(n) for j in range(i + 1, n)]


def grid(rows, cols):
    edges = []
    for r in range(rows):
        for c in range(cols):
            v = r * cols + c
            if c + 1 < cols:
                edges.append([v, v + 1])
            if r + 1 < rows:
                edges.append([v, v + cols])
    return edges


@pytest.fixture(scope="module", autouse=True)
def forked():
    """
    The PIDs of every computation the backend forks during this module.

    Leak checks go by these, and not by "this process has no children": a
    full Sage installation keeps a helper process of its own alive, which is
    none of the backend's business.
    """
    pids = []
    real_fork = os.fork

    def fork():
        pid = real_fork()
        if pid:
            pids.append(pid)
        return pid

    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(os, "fork", fork)
        yield pids
    assert running(pids) == [], "a computation outlived the test module"


def running(pids):
    """Those of ``pids`` that are still live (non-zombie) processes, with their command lines."""
    found = []
    for pid in pids:
        try:
            with open(f"/proc/{pid}/stat") as f:
                state = f.read().rsplit(")", 1)[1].split()[0]
            with open(f"/proc/{pid}/cmdline") as f:
                command = f.read().replace("\0", " ").strip()
        except OSError:
            continue
        if state != "Z":
            found.append((pid, command))
    return found


def settled(pids, expected=0):
    """Wait briefly for the number of running computations to reach ``expected``."""
    deadline = time.monotonic() + 2
    while len(running(pids)) != expected and time.monotonic() < deadline:
        time.sleep(0.05)
    return running(pids)


# --- results

def test_hops(client):
    r = client.post("/hops", json=graph(8, cycle(8)))
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 4 and not body["more"]
    assert body["hops"][0] == {"one_line": [2, 1, 4, 3, 6, 5, 8, 7],
                               "cycle": "(1,2)(3,4)(5,6)(7,8)"}
    assert body["hops"][1]["cycle"] == "(1,2,3,4,5,6,7,8)"


def test_hop_notation_matches_sage(client):
    for p in client.post("/hops", json=graph(6, complete(6))).json()["hops"][:50]:
        assert p["cycle"] == Permutation(p["one_line"]).cycle_string()


def test_hops_directed(client):
    r = client.post("/hops", json=graph(3, [[0, 1], [1, 2], [2, 0]], True))
    assert r.json()["hops"] == [{"one_line": [2, 3, 1], "cycle": "(1,2,3)"}]


def test_one_hop(client):
    body = client.post("/hop", json=graph(16, grid(4, 4))).json()
    assert body["count"] == 1
    check = client.post("/verify-hop", json={**graph(16, grid(4, 4)),
                                             "one_line": body["hops"][0]["one_line"]})
    assert check.json() == {"valid": True}
    assert client.post("/hop", json=graph(3, [[0, 1], [1, 2]])).json() == \
        {"hops": [], "count": 0, "more": False}


@pytest.mark.parametrize("n, edges, leap_n, expected", [
    (8, cycle(8), 1, {"structure": "(C4 x C4) : C2", "order": 32}),
    (8, cycle(8), 2, {"structure": "C4 x C4", "order": 16}),
    (4, cycle(4), 1, {"structure": "D8", "order": 8}),
    (8, complete(8), 1, {"structure": "S8", "order": 40320}),
    (3, [[0, 1], [1, 2]], 1, {"structure": "1", "order": 1}),
    (16, grid(4, 4), 1, {"structure": "S8 ≀ C2", "order": 3251404800}),
    (25, grid(5, 5), 1, {"structure": "1", "order": 1}),
])
def test_leap_group(client, n, edges, leap_n, expected):
    r = client.post(f"/leap-group?n={leap_n}", json=graph(n, edges))
    assert r.status_code == 200
    body = r.json()
    assert {k: body[k] for k in expected} == expected
    assert body["order_str"] == str(expected["order"])


def test_large_orders_are_exact_as_strings(client):
    body = client.post("/leap-group", json=graph(30, complete(30))).json()
    assert body["structure"] == "S30"
    assert body["order_str"] == "265252859812191058636308480000000"   # 30!


def test_verify_hop(client):
    base = graph(4, cycle(4))
    assert client.post("/verify-hop", json={**base, "one_line": [2, 3, 4, 1]}).json() == {"valid": True}
    assert client.post("/verify-hop", json={**base, "one_line": [3, 4, 1, 2]}).json() == {"valid": False}
    # Follows edges, but two vertices share an image.
    assert client.post("/verify-hop", json={**base, "one_line": [2, 1, 2, 1]}).json() == {"valid": False}
    assert client.post("/verify-hop", json={**base, "one_line": [2, 3, 4]}).status_code == 422
    assert client.post("/verify-hop", json={**base, "one_line": [2, 3, 4, 9]}).status_code == 422


# --- limits

def test_rejects_malformed_graphs(client):
    assert client.post("/hops", json={"vertices": [0, 1, 5], "edges": [[0, 1]]}).status_code == 422
    assert client.post("/hops", json=graph(3, [[0, 7]])).status_code == 422
    assert client.post("/hops", json=graph(3, [[0, -1]])).status_code == 422
    # Any order of 0..n-1 is fine.
    r = client.post("/hops", json={"vertices": [2, 0, 1], "edges": [[0, 1], [1, 2], [2, 0]]})
    assert r.status_code == 200 and r.json()["count"] == 2


def test_rejects_oversized_graphs_without_computing(client):
    started = time.monotonic()
    r = client.post("/hops", json=graph(100000, []))
    assert r.status_code == 422 and "100000" in r.json()["detail"]
    r = client.post("/verify-hop", json={**graph(50000, []), "one_line": []})
    assert r.status_code == 422
    assert time.monotonic() - started < 2


@pytest.mark.parametrize("n", [0, -1, 101])
def test_rejects_leap_n_out_of_range(client, n):
    assert client.post(f"/leap-group?n={n}", json=graph(4, cycle(4))).status_code == 422


def test_hop_list_is_capped(client, monkeypatch):
    monkeypatch.setattr(backend, "LEAPER_MAX_HOPS_RETURNED", 10)
    body = client.post("/hops", json=graph(6, complete(6))).json()     # 265 hops
    assert len(body["hops"]) == 10 and body["count"] == 265 and not body["more"]
    monkeypatch.setattr(backend, "LEAPER_MAX_HOPS_COUNTED", 50)
    body = client.post("/hops", json=graph(6, complete(6))).json()
    assert len(body["hops"]) == 10 and body["count"] == 50 and body["more"]


def spin_forever(*args, **kwargs):
    while True:
        pass


def test_timeout_kills_the_computation(client, monkeypatch, forked):
    monkeypatch.setattr(backend, "LEAPER_TIMEOUT_SECONDS", 1.5)
    monkeypatch.setattr(backend, "leap_group_from_adjacency", spin_forever)
    before = len(forked)
    started = time.monotonic()
    r = client.post("/leap-group", json=graph(4, cycle(4)))
    assert r.status_code == 504
    assert 1.4 < time.monotonic() - started < 4
    assert len(forked) == before + 1
    assert settled(forked) == []


def test_structure_description_is_time_boxed(client, monkeypatch, forked):
    # GAP's StructureDescription takes minutes on this group (order 2 * 8!^2)
    # when it is not recognized; the order must still come back.
    monkeypatch.setattr(backend, "LEAPER_STRUCTURE_SECONDS", 1)
    monkeypatch.setattr(backend, "recognize_group", lambda group, n: None)
    started = time.monotonic()
    r = client.post("/leap-group", json=graph(16, grid(4, 4)))
    assert r.status_code == 200
    assert r.json() == {"structure": None, "order": 3251404800, "order_str": "3251404800"}
    assert time.monotonic() - started < 5
    assert settled(forked) == []


def test_crashed_computation_is_reported(client, monkeypatch, forked):
    monkeypatch.setattr(backend, "leap_group_from_adjacency",
                        lambda *args, **kwargs: os._exit(3))
    r = client.post("/leap-group", json=graph(4, cycle(4)))
    assert r.status_code == 500
    assert settled(forked) == []


def test_busy_server_turns_requests_away(client, monkeypatch, forked):
    import threading
    monkeypatch.setattr(backend, "LEAPER_TIMEOUT_SECONDS", 3)
    monkeypatch.setattr(backend, "QUEUE_WAIT_SECONDS", 0.5)
    monkeypatch.setattr(backend, "leap_group_from_adjacency", spin_forever)
    slots = backend.LEAPER_MAX_CONCURRENT
    codes = []
    def post():
        codes.append(client.post("/leap-group", json=graph(4, cycle(4))).status_code)
    threads = [threading.Thread(target=post) for _ in range(slots + 1)]
    try:
        for t in threads:
            t.start()
            time.sleep(0.1)
        at_once = len(settled(forked, expected=slots))
    finally:
        # Always wait for the requests, so a failure here cannot leak
        # computations (and their log lines) into the next test.
        for t in threads:
            t.join()
    assert at_once == slots
    assert sorted(codes) == [503] + [504] * slots
    assert settled(forked) == []


# --- logging

def test_each_computation_logs_one_json_line(client, capsys):
    client.post("/leap-group?n=2", json=graph(8, cycle(8)),
                headers={"Origin": "https://example.org", "User-Agent": "pytest"})
    client.post("/hops", json=graph(3, [[0, 7]]))
    lines = [json.loads(line) for line in capsys.readouterr().out.splitlines()
             if line.startswith("{")]
    ok, rejected = lines
    assert ok["event"] == "computation" and ok["endpoint"] == "leap-group"
    assert ok["outcome"] == "ok" and ok["leap_n"] == 2
    assert (ok["vertices"], ok["edges"], ok["graph6"]) == (8, 8, Graph(cycle(8)).graph6_string())
    assert (ok["structure"], ok["order_str"], ok["hops"]) == ("C4 x C4", "16", 4)
    assert (ok["origin"], ok["user_agent"]) == ("https://example.org", "pytest")
    assert rejected["outcome"] == "rejected" and "detail" in rejected


def test_graph_strings_match_sage():
    rng = random.Random(1)
    for _ in range(150):
        n = rng.choice([0, 1, 2, 5, 9, 12, 62, 63, 70])
        p = 0.4 if n < 20 else 0.05
        e = [(i, j) for i in range(n) for j in range(i + 1, n) if rng.random() < p]
        G = Graph([list(range(n)), e], format="vertices_and_edges")
        assert backend.graph_string(n, e, False) == G.graph6_string()
        d = [(i, j) for i in range(n) for j in range(n) if i != j and rng.random() < p]
        D = DiGraph([list(range(n)), d], format="vertices_and_edges")
        assert backend.graph_string(n, d, True) == D.dig6_string()
