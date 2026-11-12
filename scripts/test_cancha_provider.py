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

    def test_nations_league_uses_biennial_edition(self):
        self.assertEqual(provider.CODES['unl'], 'uefa.nations')
        for year, month, expected in [(2025, 11, 2024), (2026, 11, 2026),
                                      (2027, 2, 2026), (2027, 11, 2026), (2028, 11, 2028)]:
            with self.subTest(year=year, month=month):
                self.assertEqual(provider.expected_season('unl', datetime(year, month, 12, tzinfo=timezone.utc)), expected)

    def test_nations_league_preserves_division_and_group(self):
        payload = {'name': 'UEFA Nations League', 'children': [
            {'name': 'Liga A', 'children': [{'name': 'Grupo 1', 'standings': {'entries': [entry('Selección A')]}}]},
            {'name': 'Liga B', 'children': [{'name': 'Grupo 1', 'standings': {'entries': [entry('Selección B')]}}]}
        ]}
        groups = provider.normalize_standings(payload, preserve_hierarchy=True)
        self.assertEqual([g['name'] for g in groups], ['Liga A · Grupo 1', 'Liga B · Grupo 1'])
        self.assertEqual([g['rows'][0]['name'] for g in groups], ['Selección A', 'Selección B'])
        # Existing competitions retain their original leaf labels.
        self.assertEqual([g['name'] for g in provider.normalize_standings(payload)], ['Grupo 1', 'Grupo 1'])

    def test_nations_refresh_keeps_groups_and_real_match_statuses(self):
        standings = {'season': {'year': 2026, 'displayName': '2026-27 UEFA Nations League'}, 'children': [
            {'name': 'League A', 'children': [{'name': 'Group 1', 'standings': {'entries': [entry('Spain')]}}]},
            {'name': 'League B', 'children': [{'name': 'Group 1', 'standings': {'entries': [entry('Sweden')]}}]}
        ]}

        def event(ident, state, date, home_score=None, away_score=None):
            return {'id': ident, 'competitions': [{'id': ident, 'date': date,
                'status': {'type': {'state': state, 'name': 'STATUS_FINAL' if state == 'post' else 'STATUS_SCHEDULED'}},
                'competitors': [
                    {'homeAway': 'home', 'score': home_score, 'team': {'displayName': 'Spain', 'id': '164'}},
                    {'homeAway': 'away', 'score': away_score, 'team': {'displayName': 'Portugal', 'id': '482'}}]}]}

        def fake(url):
            if 'scoreboard' in url:
                return {'events': [event('past', 'post', '2026-11-10T19:45Z', '2', '1'),
                                   event('next', 'pre', '2026-11-14T19:45Z')]}
            self.assertIn('/uefa.nations/standings', url)
            self.assertIn('season=2026', url)
            return standings

        with patch.object(provider, 'fetch', side_effect=fake):
            data = provider.refresh('unl', datetime(2026, 11, 12, tzinfo=timezone.utc))
        self.assertEqual(data['season_year'], 2026)
        self.assertEqual(data['season'], '2026-27 UEFA Nations League')
        self.assertFalse(data['historical'])
        self.assertEqual([g['name'] for g in data['groups']], ['League A · Group 1', 'League B · Group 1'])
        self.assertEqual([m['id'] for m in data['fixtures']], ['next'])
        self.assertEqual((data['fixtures'][0]['hg'], data['fixtures'][0]['ag']), (None, None))
        self.assertEqual([m['id'] for m in data['results']], ['past'])
        self.assertEqual((data['results'][0]['hg'], data['results'][0]['ag']), (2, 1))

    def test_nations_rejects_old_edition_even_when_requested_route_is_current(self):
        old = {'season': {'year': 2024, 'displayName': '2024-25 UEFA Nations League'},
               'standings': {'entries': [entry('Spain')]}}
        with patch.object(provider, 'fetch', return_value=old) as fetch:
            with self.assertRaisesRegex(ValueError, 'se requiere 2026'):
                provider.refresh('unl', datetime(2027, 11, 12, tzinfo=timezone.utc))
        self.assertEqual(fetch.call_count, 3)
        self.assertTrue(all('standings' in args[0] for args, kwargs in fetch.call_args_list))

    def test_completed_scores_are_kept_and_upcoming_are_not_invented(self):
        base = {'id': '1', 'date': '2026-11-08T20:00Z', 'status': {'type': {'state': 'post'}},
                'competitors': [{'homeAway': 'home', 'score': '2', 'team': {'displayName': 'A', 'id': '10'}},
                                {'homeAway': 'away', 'score': '1', 'team': {'displayName': 'B', 'id': '20'}}]}
        now = datetime(2026, 11, 9, tzinfo=timezone.utc)
        games = provider.normalize_fixtures({'events': [{'competitions': [base]}]}, now, False)
        self.assertEqual((games[0]['hg'], games[0]['ag']), (2, 1))
        self.assertFalse(provider.normalize_fixtures({'events': [{'competitions': [base]}]}, now, True))

    def test_failed_refresh_preserves_snapshot(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'snapshot.json'
            previous = {'schema_version': 1, 'competitions': {'eng': {'season': 'Anterior', 'groups': []}}}
            path.write_text(json.dumps(previous))
            with patch('sys.argv', ['update_cancha.py', '--league', 'eng', '--output', str(path)]), patch.object(provider, 'fetch', side_effect=OSError('sin conexión')):
                self.assertEqual(provider.main(), 1)
            self.assertEqual(json.loads(path.read_text()), previous)

    def test_failed_first_nations_refresh_does_not_invent_capture(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'snapshot.json'
            previous = {'schema_version': 1, 'competitions': {'eng': {'season': 'Anterior', 'groups': []}}}
            path.write_text(json.dumps(previous))
            with patch('sys.argv', ['update_cancha.py', '--league', 'unl', '--output', str(path)]), patch.object(provider, 'fetch', side_effect=OSError('sin conexión')):
                self.assertEqual(provider.main(), 1)
            self.assertEqual(json.loads(path.read_text()), previous)
            health = json.loads(path.with_name('health.json').read_text())
            self.assertFalse(health['competitions']['unl']['ok'])
            self.assertFalse(health['competitions']['unl']['retained_previous'])

    def test_scoreboard_failure_keeps_standings(self):
        standings = {'season': {'year': 2026, 'displayName': '2026'}, 'standings': {'entries': [entry('Club A')]}}

        def fake(url):
            if 'scoreboard' in url:
                raise ValueError('HTTP 400 en scoreboard')
            return standings
        with patch.object(provider, 'fetch', side_effect=fake):
            data = provider.refresh('per', datetime(2026, 11, 9, tzinfo=timezone.utc))
        self.assertEqual(data['groups'][0]['rows'][0]['name'], 'Club A')
        self.assertEqual((data['fixtures'], data['results']), ([], []))
        self.assertEqual(len(data['warnings']), 2)
        self.assertFalse(data['historical'])

    def test_scoreboard_falls_back_to_smaller_ranges(self):
        calls = []

        def fake(url):
            calls.append(url)
            date = url.split('dates=')[1]
            if '-' in date:
                raise ValueError('HTTP 400 rango')
            return {'events': [{'id': date, 'competitions': []}]}
        warnings = []
        with patch.object(provider, 'fetch', side_effect=fake):
            page = provider.scoreboard('per.1', datetime(2026, 11, 9, tzinfo=timezone.utc), datetime(2026, 11, 11, tzinfo=timezone.utc), warnings)
        self.assertEqual([e['id'] for e in page['events']], ['20261109', '20261110', '20261111'])
        self.assertEqual(warnings, [])


if __name__ == '__main__':
    unittest.main()
