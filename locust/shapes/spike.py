"""Spike shape — sudden flash-crowd, e.g. a viral social-media post.

50 baseline → step-jump to 800 in 20 s → hold 60 s → drop back to 50.
Total runtime ~3 min. Shows whether the cache + connection pools
recover gracefully once the surge ends, or whether the stack carries
a "long tail" of degraded latency.
"""
from locust import LoadTestShape


class SpikeShape(LoadTestShape):
    stages = [
        {"duration": 60,  "users": 50,  "spawn_rate": 10},   # warm-up baseline
        {"duration": 80,  "users": 800, "spawn_rate": 100},  # spike
        {"duration": 140, "users": 800, "spawn_rate": 100},  # hold the spike
        {"duration": 200, "users": 50,  "spawn_rate": 100},  # drain
        {"duration": 240, "users": 50,  "spawn_rate": 10},   # post-spike steady
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None
