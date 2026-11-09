#!/usr/bin/env python3
"""Completa escudos pendientes por identidad exacta de club en ESPN; sin búsquedas difusas."""
import hashlib
import json
from pathlib import Path
import sys
import unicodedata
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1] / 'site/futbol'
PENDING = {'ecu': {'El Nacional': ['El Nacional', 'CD El Nacional'], 'Vinotinto': ['Vinotinto', 'Vinotinto FC', 'Vinotinto del Ecuador']},
           'uel': {'Qarabağ': ['Qarabağ', 'Qarabag', 'Qarabag FK', 'FK Qarabag'], 'RFS': ['RFS', 'Rīgas Futbola Skola', 'Riga Futbola Skola']}}
LEAGUES = {'ecu': 'ecu.1', 'uel': 'uefa.europa'}


def normalize(name):
    return ''.join(c for c in unicodedata.normalize('NFD', name).encode('ascii', 'ignore').decode().casefold() if c.isalnum())


def request(url):
    with urlopen(Request(url, headers={'User-Agent': 'WillyStats/1.0'}), timeout=20) as response:
        return response.read()


def main():
    path = ROOT / 'crests/manifest.json'
    manifest = json.loads(path.read_text())
    failures = []
    for league, clubs in PENDING.items():
        missing = {club: aliases for club, aliases in clubs.items() if league + ':' + club not in manifest['clubs']}
        if not missing:
            continue
        for season in [2025, 2024, 2026]:
            if not missing:
                break
            url = f'https://site.api.espn.com/apis/site/v2/sports/soccer/{LEAGUES[league]}/teams?limit=1000&season={season}'
            try:
                payload = json.loads(request(url))
                teams = [item['team'] for sport in payload.get('sports', []) for competition in sport.get('leagues', []) for item in competition.get('teams', [])]
                for club, aliases in list(missing.items()):
                    wanted = {normalize(a) for a in aliases}
                    candidates = [t for t in teams if wanted.intersection(normalize(t.get(k, '')) for k in ['displayName', 'name', 'shortDisplayName'])]
                    unique = {str(t['id']): t for t in candidates}
                    if len(unique) != 1:
                        continue
                    team = next(iter(unique.values()))
                    logo = next((l['href'] for l in team.get('logos', []) if urlparse(l.get('href', '')).scheme == 'https' and urlparse(l['href']).hostname in ['a.espncdn.com', 'a1.espncdn.com', 'a2.espncdn.com', 'a3.espncdn.com', 'a4.espncdn.com']), None)
                    if not logo:
                        continue
                    image = request(logo)
                    if not image.startswith(b'\x89PNG\r\n\x1a\n'):
                        raise ValueError('El escudo no es PNG')
                    sha = hashlib.sha256(image).hexdigest()
                    file = 'crests/' + sha[:20] + '.png'
                    (ROOT / file).write_bytes(image)
                    manifest['clubs'][league + ':' + club] = {'file': file, 'source': 'ESPN', 'source_url': logo, 'team_id': str(team['id']), 'provider_name': team['displayName'], 'sha256': sha}
                    print(f'OK {league}: {club} -> ESPN {team["id"]} {team["displayName"]}', flush=True)
                    del missing[club]
            except Exception as error:
                print(f'Consulta {league}/{season}: {error}', file=sys.stderr, flush=True)
        failures.extend(league + ':' + club for club in missing)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n')
    temp.replace(path)
    if failures:
        print('Pendientes de verificar: ' + ', '.join(failures), file=sys.stderr)
    return int(bool(failures))


if __name__ == '__main__':
    sys.exit(main())
