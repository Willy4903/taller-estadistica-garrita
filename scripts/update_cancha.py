#!/usr/bin/env python3
"""Actualiza únicamente el proyecto independiente Cancha con fuentes públicas ESPN.
Sin claves. Conserva cada última instantánea válida. Salida 1 si alguna fuente falla.
Uso: python scripts/update_cancha.py [--league eng] [--output /tmp/snapshot.json]
"""
import argparse
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CODES = dict(per='per.1', bra='bra.1', arg='arg.1', col='col.1', ecu='ecu.1', sud='conmebol.sudamericana', lib='conmebol.libertadores', ita='ita.1', esp='esp.1', eng='eng.1', ger='ger.1', fra='fra.1', ucl='uefa.champions', uel='uefa.europa')


def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': 'Cancha/1.0', 'Accept': 'application/json'}), timeout=25) as response:
        return json.load(response)


def normalize_standings(payload):
    """Conserva grupos distintos; nunca fusiona rangos de dos fases."""
    groups = []

    def visit(node):
        table = node.get('standings', {})
        if table.get('entries'):
            rows = []
            for entry in table['entries']:
                stats = {s['name']: s.get('value', s.get('displayValue')) for s in entry.get('stats', [])}

                def number(*names):
                    for name in names:
                        if stats.get(name) is not None:
                            return int(float(stats[name]))
                    raise ValueError(f'Estadística ausente: {names}')

                row = {'name': entry['team']['displayName'], 'rank': number('rank'), 'pj': number('gamesPlayed'),
                       'g': number('wins'), 'e': number('ties', 'draws'), 'p': number('losses'),
                       'gf': number('pointsFor', 'goalsFor'), 'gc': number('pointsAgainst', 'goalsAgainst'),
                       'pts': number('points'), 'form': [], 'zone': 'none'}
                row['dg'] = row['gf'] - row['gc']
                if row['pj'] != row['g'] + row['e'] + row['p']:
                    raise ValueError('PJ no coincide con G + E + P')
                # ESPN publica deducciones; no recalculamos puntos ni cupos.
                rows.append(row)
            if len({r['name'] for r in rows}) != len(rows):
                raise ValueError('Equipos repetidos en un grupo')
            rows.sort(key=lambda r: r['rank'])
            groups.append({'name': node.get('name') or table.get('name') or 'Tabla general', 'rows': rows})
        else:
            for child in node.get('children', []):
                visit(child)
    visit(payload)
    if not groups:
        raise ValueError('ESPN no devolvió tablas utilizables para esta etapa')
    return groups


def normalize_fixtures(payload, now):
    games = []
    for event in payload.get('events', []):
        for match in event.get('competitions', []):
            if match.get('status', event.get('status', {})).get('type', {}).get('state') != 'pre':
                continue
            date = match.get('date') or event.get('date')
            when = datetime.fromisoformat(date.replace('Z', '+00:00'))
            if when < now:
                continue
            teams = {c['homeAway']: c['team']['displayName'] for c in match['competitors']}
            games.append({'home': teams['home'], 'away': teams['away'], 'date': date, 'demo': False})
    return sorted(games, key=lambda g: g['date'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--league', choices=CODES, action='append')
    parser.add_argument('--output', type=Path, default=ROOT / 'site/futbol/data/snapshot.json')
    args = parser.parse_args()
    old = json.loads(args.output.read_text()) if args.output.exists() else {'schema_version': 1, 'competitions': {}}
    if old.get('schema_version') != 1:
        raise ValueError('Versión de instantánea incompatible')
    now = datetime.now(timezone.utc)
    dates = now.strftime('%Y%m%d') + '-' + (now + timedelta(days=14)).strftime('%Y%m%d')
    failed = False
    for league in args.league or CODES:
        code = CODES[league]
        try:
            standings = fetch(f'https://site.web.api.espn.com/apis/v2/sports/soccer/{code}/standings')
            groups = normalize_standings(standings)
            fixtures = fetch(f'https://site.api.espn.com/apis/site/v2/sports/soccer/{code}/scoreboard?dates={dates}&limit=1000')
            old['competitions'][league] = {'updated_at': now.isoformat(), 'season': str(standings.get('seasonDisplay') or standings.get('season', 'Temporada de la fuente')),
                'source': f'https://www.espn.com/soccer/standings/_/league/{code}', 'groups': groups,
                'fixtures': normalize_fixtures(fixtures, now)}
            print(f'OK {league}: {sum(len(g["rows"]) for g in groups)} equipos, {len(groups)} grupo(s)')
        except Exception as error:
            failed = True
            print(f'ERROR {league}: {error}. Se conserva la última instantánea, si existe.', file=sys.stderr)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.tmp')
    temporary.write_text(json.dumps(old, ensure_ascii=False, separators=(',', ':')) + '\n')
    temporary.replace(args.output)
    return int(failed)


if __name__ == '__main__':
    sys.exit(main())
