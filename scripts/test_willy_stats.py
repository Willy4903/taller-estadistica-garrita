"""Pruebas offline de contrato: API-Football, cálculos, ausencia de datos y preservación."""
from pathlib import Path
import json
import tempfile
import unittest
from unittest.mock import patch
import update_willy_stats as w

class WillyStatsTests(unittest.TestCase):
    def test_selects_exact_country_and_current_season(self):
        catalog=[
            {"league":{"id":39,"name":"Premier League"},"country":{"name":"England"},
             "seasons":[{"year":2025,"current":False},{"year":2026,"current":True}]},
            {"league":{"id":99,"name":"Premier League"},"country":{"name":"Russia"},
             "seasons":[{"year":2026,"current":True}]},
        ]
        self.assertEqual(w.select_league(catalog,"eng"),(39,2026,"Premier League"))

    def test_ambiguous_league_rejected(self):
        catalog=[{"league":{"id":x,"name":"Serie A"},"country":{"name":"Italy"},
                  "seasons":[{"year":2026,"current":True}]} for x in [1,2]]
        with self.assertRaisesRegex(ValueError,"2 competiciones"):
            w.select_league(catalog,"ita")

    def test_standings_preserve_deductions_and_form(self):
        payload=[{"league":{"standings":[[
            {"team":{"name":"Club Uno"},"rank":1,
             "all":{"played":3,"win":2,"draw":1,"lose":0,"goals":{"for":6,"against":2}},
             "points":6,"form":"WWD"},
        ]]}}]
        rows=w.normalize_standings(payload)[0]["rows"]
        self.assertEqual(rows[0]["pts"],6) # sanción: nunca recalcular a 7
        self.assertEqual(rows[0]["dg"],4)
        self.assertEqual(rows[0]["form"],["V","V","E"])

    def test_missing_score_is_not_fabricated(self):
        events=[{"fixture":{"id":100,"date":"2026-11-09T20:00:00Z",
                            "status":{"short":"FT"}},
                 "teams":{"home":{"name":"A"},"away":{"name":"B"}},
                 "goals":{"home":2,"away":None}}]
        with self.assertRaises(ValueError):
            w.normalize_fixtures(events,False)

    def test_upcoming_and_results_are_separated(self):
        rows=[{"fixture":{"id":1,"date":"2026-11-11T20:00:00Z",
                          "status":{"short":"NS"}},
               "teams":{"home":{"name":"Local"},"away":{"name":"Visita"}},
               "goals":{"home":None,"away":None}},
              {"fixture":{"id":2,"date":"2026-11-08T20:00:00Z",
                          "status":{"short":"FT"}},
               "teams":{"home":{"name":"Equipo A"},"away":{"name":"Equipo B"}},
               "goals":{"home":1,"away":0}}]
        self.assertEqual(len(w.normalize_fixtures(rows,True)),1)
        self.assertEqual(len(w.normalize_fixtures(rows,False)),1)
        self.assertEqual(w.normalize_fixtures(rows,False)[0]["hg"],1)

    def test_no_key_keeps_existing_file_unchanged(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"snapshot.json"
            previous={"schema_version":1,"competitions":{"eng":{"season":"2025","updated_at":"2025-01-01"}}}
            path.write_text(json.dumps(previous),encoding="utf-8")
            with self.assertRaisesRegex(ValueError,"API_FOOTBALL_KEY"):
                w.update(path,"",["eng"])
            self.assertEqual(json.loads(path.read_text()),previous)

    def test_bad_new_data_preserves_old_snapshot(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"snapshot.json"
            previous={"schema_version":1,"competitions":{"eng":{"season":"2025","updated_at":"2025-01-01"}}}
            path.write_text(json.dumps(previous),encoding="utf-8")
            catalog=[{"league":{"id":39,"name":"Premier League"},
                      "country":{"name":"England"},
                      "seasons":[{"year":2026,"current":True}]}]
            def mock_get(path,params,key):
                return catalog if path=="leagues" else []
            with patch.object(w,"api_get",side_effect=mock_get):
                self.assertEqual(w.update(path,"test-key",["eng"]),1)
            self.assertEqual(json.loads(path.read_text()),previous)

if __name__=="__main__":
    unittest.main()
