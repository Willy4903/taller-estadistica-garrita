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
