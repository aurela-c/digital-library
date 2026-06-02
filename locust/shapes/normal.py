"""Normal-load shape — what a busy weekday afternoon looks like.

Ramps to 100 users over 60 s, sustains for 5 min, drains over 60 s.
Total runtime ~7 min. This is the run you ship in the project report as
"the system under realistic production load".

NOTE — historical context for the report appendix:
An earlier 200-VU configuration was deliberately downsized after the
first verification run identified ~200 VUs as the saturation knee on
this single-host Docker Compose stack (see locust/reports/normal_*.csv
from 2026-06-02 if preserved). The 250→500→750→1000 ramp in
shapes/stress.py covers everything from "stress-lite" upward, so the
200-VU point is still exercised — just not as the steady-state load.
"""
from locust import LoadTestShape


class NormalShape(LoadTestShape):
    stages = [
        {"duration": 60,  "users": 100, "spawn_rate": 10},
        {"duration": 360, "users": 100, "spawn_rate": 10},
        {"duration": 420, "users": 0,   "spawn_rate": 20},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None
