import json
import os
import random
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))
sys.path.insert(0, os.path.join(ROOT, "backend"))


def _load(path):
    with open(os.path.join(ROOT, path)) as f:
        return json.load(f)


@pytest.fixture(scope="session")
def database():
    """Every simple graph on 1-8 vertices, with precomputed hops and leap groups."""
    return (_load("frontend/src/data/leapDatabaseCore.json")
            + _load("frontend/public/data/leapDatabaseN8.json"))


@pytest.fixture(scope="session")
def database_sample(database):
    """All graphs on at most 6 vertices, plus a fixed random sample of the rest."""
    small = [e for e in database if e["n"] <= 6]
    rest = [e for e in database if e["n"] > 6]
    return small + random.Random(1).sample(rest, 400)
