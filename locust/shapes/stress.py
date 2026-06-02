"""Stress shape — satisfies SRS §3.4's "1000+ concurrent users" line.

Ramps to 1000 users over 4 min, sustains for 8 min, drains over 2 min.
Total runtime ~14 min. Use to find:
  - the saturation knee of the borrow/return flow
  - whether MySQL row-level UPDATE contention causes 5xx
  - which Node service's event loop is the first to back up

Run with 4 locust workers for a clean 1000-VU distribution.
"""
from locust import LoadTestShape


class StressShape(LoadTestShape):
    stages = [
        {"duration": 60,   "users": 250,  "spawn_rate": 10},
        {"duration": 120,  "users": 500,  "spawn_rate": 10},
        {"duration": 180,  "users": 750,  "spawn_rate": 10},
        {"duration": 240,  "users": 1000, "spawn_rate": 10},
        {"duration": 720,  "users": 1000, "spawn_rate": 10},
        {"duration": 840,  "users": 0,    "spawn_rate": 30},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None
