"""Smoke shape — quick "did we break anything?" check before bigger runs.

Ramps 0 → 50 users over 60 s, holds 50 for 60 s, ramps back to 0.
Total runtime ~2 min. Catches obvious regressions in <90 s wall-clock.
"""
from locust import LoadTestShape


class SmokeShape(LoadTestShape):
    stages = [
        {"duration": 60,  "users": 50,  "spawn_rate": 5},
        {"duration": 120, "users": 50,  "spawn_rate": 5},
        {"duration": 150, "users": 0,   "spawn_rate": 10},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None
