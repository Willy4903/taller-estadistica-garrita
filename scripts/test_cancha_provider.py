"""Contratos del proveedor: fases, sanciones, calendario y fallos sin pérdida de datos."""
from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import update_cancha as provider


def entry(name, rank=1):
    stats = dict(rank=rank, gamesPlayed=3, wins=2, ties=1, losses=0, pointsFor=5, pointsAgainst=2, points=6)
    # Seis puntos incluyen una deducción: no deben recalcularse como siete.
    return {'team': {'displayName': name}, 'stats': [{'name': k, 'value': v} for k, v in stats.items()]}


class ProviderTests(unittest.TestCase):
    def test_groups_and_sanctions(self):
        payload = {'children': [{'name': 'A', 'standings': {'entries': [entry('Club A')]}},
                                {'name': 'B', 'standings': {'entries': [entry('Club B')]}}]}
        groups = provider.normalize_standings(payload)
        self.assertEqual([g['name'] for g in groups], ['A', 'B'])
        self.assertEqual(groups[0]['rows'][0]['pts'], 6)
        self.assertEqual(groups[0]['rows'][0]['dg'], 3)

    def test_missing_statistics_rejected(self):
        bad = entry('Incompleto')
        bad['stats'] = []
        with self.assertRaises(ValueError):
            provider.normalize_standings({'standings': {'entries': [bad]}})

    def test_only_upcoming_matches(self):
        def event(state, date):
            return {'competitions': [{'status': {'type': {'state': state}}, 'date': date,
                'competitors': [{'homeAway': 'home', 'team': {'displayName': 'Local'}},
                                {'homeAway': 'away', 'team': {'displayName': 'Visita'}}]}]}
        games = provider.normalize_fixtures({'events': [event('post', '2026-11-10T20:00Z'),
            event('pre', '2026-11-08T20:00Z'), event('pre', '2026-11-10T20:00Z')]}, datetime(2026, 11, 9, tzinfo=timezone.utc))
        self.assertEqual(len(games), 1)
        self.assertFalse(games[0]['demo'])

    def test_season_must_match_provider_response(self):
        label, year = provider.season_info({'seasons': [{'year': 2026, 'displayName': '2026-27'}]}, 2026)
        self.assertEqual((label, year), ('2026-27', 2026))
        with self.assertRaises(ValueError):
            provider.season_info({'season': {'year': 2024}}, 2026)
        with self.assertRaises(ValueError):
            provider.season_info({}, 2026)

    def test_calendar_year_vs_european_season(self):
        now = datetime(2026, 2, 1, tzinfo=timezone.utc)
        self.assertEqual(provider.expected_season('per', now), 2026)
        self.assertEqual(provider.expected_season('eng', now), 2025)

    def test_completed_scores_are_kept_and_upcoming_are_not_invented(self):
        base = {'id': '1', 'date': '2026-11-08T20:00Z', 'status': {'type': {'state': 'post'}},
                'competitors': [{'homeAway': 'home', 'score': '2', 'team': {'displayName': 'A', 'id': '10'}},
                                {'homeAway': 'away', 'score': '1', 'team': {'displayName': 'B', 'id': '20'}}]}
        now = datetime(2026, 11, 9, tzinfo=timezone.utc)
        games = provider.normalize_fixtures({'events': [{'competitions': [base]}]}, now, False)
        self.assertEqual((games[0]['hg'], games[0]['ag']), (2, 1))
        self.assertFalse(provider.normalize_fixtures({'events': [{'competitions': [base]}]}, now, True))

    def test_refresh_uses_supported_endpoint_and_validates_year(self):
        urls=[]
        def fake_fetch(url):
            urls.append(url)
            if '/standings' in url:
                return {'season': {'year': 2026}, 'standings': {'entries': [entry('Club A')]}}
            if '/scoreboard?' in url:
                return {'events': []}
            raise AssertionError(url)
        with patch.object(provider,'fetch',side_effect=fake_fetch):
            result=provider.refresh('eng',datetime(2026,11,9,tzinfo=timezone.utc))
        self.assertEqual(result['season_year'],2026)
        self.assertTrue(result['historical'] is False)
        self.assertTrue(urls[0].endswith('/eng.1/standings'),urls[0])
        self.assertEqual(len(urls),3)

    def test_failed_refresh_preserves_snapshot(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'snapshot.json'
            previous = {'schema_version': 1, 'competitions': {'eng': {'season': 'Anterior', 'groups': []}}}
            path.write_text(json.dumps(previous))
            with patch('sys.argv', ['update_cancha.py', '--league', 'eng', '--output', str(path)]), patch.object(provider, 'fetch', side_effect=OSError('sin conexión')):
                self.assertEqual(provider.main(), 1)
            self.assertEqual(json.loads(path.read_text()), previous)


if __name__ == '__main__':
    unittest.main()
