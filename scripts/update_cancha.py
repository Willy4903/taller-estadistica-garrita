#!/usr/bin/env python3
"""Capturas actuales de ESPN: tablas, próximos partidos y resultados, sin claves.

No acepta temporadas anteriores a la solicitada. Conserva la última captura
válida por liga si falla su actualización y registra el resultado de cada fuente.
"""
import argparse
import gzip
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CODES = dict(per='per.1', bra='bra.1', arg='arg.1', col='col.1', ecu='ecu.1', sud='conmebol.sudamericana', lib='conmebol.libertadores', ita='ita.1', esp='esp.1', eng='eng.1', ger='ger.1', fra='fra.1', ucl='uefa.champions', uel='uefa.europa')
EUROPE = {'ita', 'esp', 'eng', 'ger', 'fra', 'ucl', 'uel'}


def _decode(response):
    raw = response.read()
    if raw[:2] == b'\x1f\x8b':
        raw = gzip.decompress(raw)
    return raw


def fetch(url):
    request = Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; WillyStats/1.0)', 'Accept': 'application/json',
                                    'Accept-Encoding': 'identity'})
    try:
        with urlopen(request, timeout=25) as response:
            return json.loads(_decode(response).decode('utf-8'))
    except HTTPError as error:
        try:
            detail = _decode(error)[:400].decode('utf-8', errors='replace')
        except Exception:
            detail = ''
        raise ValueError(f'HTTP {error.code} en {url.split("?")[0]}: {detail[:250]}') from error


def expected_season(league, now):
    return now.year - (league in EUROPE and now.month < 7)


def season_info(payload, expected):
    """Comprueba el año que devuelve el proveedor, no solo el solicitado en la URL."""
    selected = payload.get('season')
    if not selected:
        seasons = payload.get('seasons') or []
        selected = next((s for s in seasons if s.get('current') or s.get('isCurrent')), seasons[0] if seasons else None)
    year = selected.get('year') if isinstance(selected, dict) else selected
    label = (selected.get('displayName') or selected.get('name')) if isinstance(selected, dict) else None
    label = payload.get('seasonDisplay') or label
    if year is None and label:
        match = re.search(r'\b(20\d{2})\b', label)
        year = int(match[1]) if match else None
    if year is None or int(year) != expected:
        raise ValueError(f'Temporada de la respuesta {year!r}; se requiere {expected}. Metadata: {selected!r}; campos: {list(payload)[:12]}')
    return str(label or expected), int(year)


def normalize_standings(payload):
    groups = []

    def visit(node):
        table = node.get('standings') or {}
        if table.get('entries'):
            rows = []
            for entry in table['entries']:
                stats = {s['name']: s.get('value', s.get('displayValue')) for s in entry.get('stats', [])}

                def number(*names):
                    for name in names:
                        if stats.get(name) is not None:
                            raw = float(stats[name])
                            if not raw.is_integer():
                                raise ValueError(f'Estadística no entera: {name}')
                            return int(raw)
                    raise ValueError(f'Estadística ausente: {names}')

                team = entry['team']
                row = {'name': team['displayName'], 'team_id': str(team.get('id', '')), 'rank': number('rank'),
                       'pj': number('gamesPlayed'), 'g': number('wins'), 'e': number('ties', 'draws'), 'p': number('losses'),
                       'gf': number('pointsFor', 'goalsFor'), 'gc': number('pointsAgainst', 'goalsAgainst'),
                       'pts': number('points'), 'form': [], 'zone': 'none'}
                row['dg'] = row['gf'] - row['gc']
                logos = team.get('logos') or []
                row['logo'] = logos[0].get('href') if logos else None
                if row['pj'] != row['g'] + row['e'] + row['p'] or min(row[k] for k in ['pj', 'g', 'e', 'p', 'gf', 'gc']) < 0:
                    raise ValueError('Estadísticas de partidos incoherentes')
                rows.append(row)
            if len({r['name'] for r in rows}) != len(rows) or len({r['rank'] for r in rows}) != len(rows):
                raise ValueError('Identidades o posiciones repetidas dentro de un grupo')
            groups.append({'name': node.get('name') or table.get('name') or 'Tabla general', 'rows': sorted(rows, key=lambda r: r['rank'])})
        else:
            for child in node.get('children', []):
                visit(child)
    visit(payload)
    if not groups:
        raise ValueError('No hay clasificaciones disponibles en esta fase')
    return groups


def normalize_fixtures(payload, now, upcoming=True):
    games, seen = [], set()
    for event in payload.get('events', []):
        for match in event.get('competitions', []):
            status = match.get('status', event.get('status', {})).get('type', {})
            date = match.get('date') or event.get('date')
            if not date:
                continue
            when = datetime.fromisoformat(date.replace('Z', '+00:00'))
            if upcoming and (status.get('state') != 'pre' or when < now):
                continue
            if not upcoming and (status.get('state') != 'post' or when > now):
                continue
            teams = {c['homeAway']: c for c in match.get('competitors', [])}
            if set(teams) != {'home', 'away'}:
                continue
            home, away = teams['home'], teams['away']
            ident = str(match.get('id') or event.get('id') or home['team']['displayName'] + away['team']['displayName'] + date)
            if ident in seen:
                continue
            seen.add(ident)
            game = {'id': ident, 'home': home['team']['displayName'], 'away': away['team']['displayName'],
                    'home_id': str(home['team'].get('id', '')), 'away_id': str(away['team'].get('id', '')),
                    'date': date, 'hg': None, 'ag': None, 'demo': False, 'status': status.get('name')}
            if not upcoming:
                def score(team):
                    value = team.get('score')
                    if isinstance(value, dict):
                        value = value.get('value', value.get('displayValue'))
                    if value is None:
                        raise ValueError('Resultado terminado sin marcador')
                    return int(value)
                game['hg'], game['ag'] = score(home), score(away)
            game['round'] = match.get('week', {}).get('number') or event.get('week', {}).get('number')
            games.append(game)
    return sorted(games, key=lambda g: g['date'], reverse=not upcoming)


def scoreboard(code, start, end, warnings):
    """Partidos del rango. Si el proveedor los rechaza, la tabla se publica igual y queda el aviso."""
    span = start.strftime('%Y%m%d') + '-' + end.strftime('%Y%m%d')
    base = f'https://site.api.espn.com/apis/site/v2/sports/soccer/{code}/scoreboard'
    failures = []
    for query in (f'?limit=300&dates={span}', f'?dates={span}'):
        try:
            return fetch(base + query)
        except Exception as error:
            failures.append(str(error)[:200])
    warnings.append(f'Partidos {span} no disponibles: ' + ' / '.join(failures))
    return {'events': []}


def refresh(league, now):
    code, season = CODES[league], expected_season(league, now)
    routes = [f'https://site.api.espn.com/apis/v2/sports/soccer/{code}/standings?season={season}',
              f'https://site.api.espn.com/apis/v2/sports/soccer/{code}/standings',
              f'https://site.web.api.espn.com/apis/v2/sports/soccer/{code}/standings?region=us&lang=en&contentorigin=espn&season={season}']
    errors = []
    for endpoint in routes:
        try:
            payload = fetch(endpoint)
            label, year = season_info(payload, season)
            break
        except Exception as error:
            errors.append(str(error))
    else:
        raise ValueError(' / '.join(errors))
    groups = normalize_standings(payload)
    warnings = []
    future = scoreboard(code, now, now + timedelta(days=21), warnings)
    past = scoreboard(code, now - timedelta(days=35), now, warnings)
    results = normalize_fixtures(past, now, upcoming=False)
    for group in groups:
        for row in group['rows']:
            matches = [m for m in reversed(results) if row['team_id'] and row['team_id'] in [m['home_id'], m['away_id']]]
            for game in matches[-5:]:
                gf, gc = (game['hg'], game['ag']) if game['home_id'] == row['team_id'] else (game['ag'], game['hg'])
                row['form'].append('V' if gf > gc else 'E' if gf == gc else 'D')
    default_group = 0
    if league in ['per', 'arg', 'col'] and now.month >= 7:
        default_group = next((i for i, g in enumerate(groups) if 'clausura' in g['name'].casefold()), 0)
    return {'provider': 'ESPN', 'season': label, 'season_year': year, 'historical': False,
            'source': f'https://www.espn.com/soccer/standings/_/league/{code}/season/{season}',
            'updated_at': now.isoformat(), 'groups': groups, 'default_group': default_group,
            'fixtures': normalize_fixtures(future, now), 'results': results, 'warnings': warnings,
            'methodology': 'Orden y puntos del proveedor, incluidas sanciones. Últimos resultados de los 35 días consultados; no es un marcador en vivo.'}


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--league', choices=CODES, action='append')
    parser.add_argument('--output', type=Path, default=ROOT / 'site/futbol/data/snapshot.json')
    args = parser.parse_args()
    old = json.loads(args.output.read_text()) if args.output.exists() else {'schema_version': 1, 'competitions': {}}
    if old.get('schema_version') != 1:
        raise ValueError('Versión de instantánea incompatible')
    now = datetime.now(timezone.utc)
    health = {'checked_at': now.isoformat(), 'provider': 'ESPN', 'competitions': {}}
    selected = args.league or list(CODES)
    with ThreadPoolExecutor(max_workers=3) as pool:
        jobs = {pool.submit(refresh, league, now): league for league in selected}
        for job in as_completed(jobs):
            league = jobs[job]
            try:
                data = job.result()
                old['competitions'][league] = data
                health['competitions'][league] = {'ok': True, 'season': data['season'], 'rows': sum(len(g['rows']) for g in data['groups']), 'fixtures': len(data['fixtures']), 'results': len(data['results'])}
                print(f'OK {league}: {health["competitions"][league]}', flush=True)
            except Exception as error:
                health['competitions'][league] = {'ok': False, 'error': str(error)[:300], 'retained_previous': league in old['competitions']}
                print(f'ERROR {league}: {error}. Se conserva la captura anterior si existe.', file=sys.stderr, flush=True)
    atomic_json(args.output, old)
    atomic_json(args.output.with_name('health.json'), health)
    return int(any(not v['ok'] for v in health['competitions'].values()))


if __name__ == '__main__':
    sys.exit(main())
