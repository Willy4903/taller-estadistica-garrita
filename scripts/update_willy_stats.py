#!/usr/bin/env python3
"""Publica instantáneas futbolísticas verificables desde la API documentada API-Football.

Requiere API_FOOTBALL_KEY (secreto de GitHub Actions). No usa valores de prueba
como sustitutos. Si una competición falla, conserva su última instantánea real,
con su timestamp original. No afirma que la actualización sea en vivo.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import time
import unicodedata
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "site/futbol/data/snapshot.json"
BASE = "https://v3.football.api-sports.io"

# Nombre exacto del catálogo de competiciones; jamás seleccionar una liga parecida.
SELECTORS = {
    "per": ("Peru", ("Primera División", "Liga 1")),
    "bra": ("Brazil", ("Serie A",)),
    "arg": ("Argentina", ("Liga Profesional Argentina",)),
    "col": ("Colombia", ("Primera A",)),
    "ecu": ("Ecuador", ("Liga Pro", "LigaPro")),
    "lib": (None, ("CONMEBOL Libertadores", "Copa Libertadores")),
    "sud": (None, ("CONMEBOL Sudamericana", "Copa Sudamericana")),
    "ita": ("Italy", ("Serie A",)),
    "esp": ("Spain", ("La Liga",)),
    "eng": ("England", ("Premier League",)),
    "ger": ("Germany", ("Bundesliga",)),
    "fra": ("France", ("Ligue 1",)),
    "ucl": (None, ("UEFA Champions League",)),
    "uel": (None, ("UEFA Europa League",)),
}

def token(value):
    return "".join(c for c in unicodedata.normalize("NFKD", str(value)).casefold()
                   if not unicodedata.combining(c)).strip()

def integer(value, label, min_value=0):
    if isinstance(value, bool) or not isinstance(value, int) or value < min_value:
        raise ValueError(f"{label}: valor inválido {value!r}")
    return value

_last_request = None

def api_get(path, params, key):
    global _last_request
    delay = float(os.environ.get("API_FOOTBALL_MIN_INTERVAL", "0"))
    if delay > 0 and _last_request is not None:
        time.sleep(max(0, delay - (time.monotonic() - _last_request)))
    _last_request = time.monotonic()
    url = BASE + "/" + path + ("?" + urlencode(params) if params else "")
    request = Request(url, headers={"x-apisports-key": key,
                                   "Accept": "application/json",
                                   "User-Agent": "WillyStats/1.0"})
    with urlopen(request, timeout=25) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status} en {path}")
        data = json.load(response)
    if not isinstance(data, dict) or data.get("errors"):
        raise ValueError(f"Respuesta de API-Football con errores en {path}: {data.get('errors') if isinstance(data,dict) else 'formato inválido'}")
    if not isinstance(data.get("response"), list):
        raise ValueError(f"Respuesta sin lista verificable en {path}")
    return data["response"]

def select_league(catalog, code, season_override=None):
    country, names = SELECTORS[code]
    matches = [item for item in catalog
               if token(item.get("league", {}).get("name", "")) in {token(n) for n in names}
               and (country is None or token(item.get("country", {}).get("name", "")) == token(country))]
    # Las copas intercontinentales requieren nombre exacto, no país inferido.
    unique = {item["league"]["id"]: item for item in matches}
    if len(unique) != 1:
        raise ValueError(f"{code}: {len(unique)} competiciones candidatas; no se selecciona por aproximación")
    item = next(iter(unique.values()))
    seasons = item.get("seasons", [])
    if season_override is not None:
        selected = [s["year"] for s in seasons if s.get("year") == season_override]
        if len(selected) != 1:
            raise ValueError(f"{code}: la temporada {season_override} no figura en el catálogo")
    else:
        selected = [s["year"] for s in seasons if s.get("current") is True
                    and isinstance(s.get("year"), int)]
        if len(selected) != 1:
            raise ValueError(f"{code}: no hay una temporada actual inequívoca")
    return integer(item["league"]["id"], "ID de liga", 1), selected[0], item["league"]["name"]

def normalize_standings(items):
    if not items:
        return []
    first = items[0].get("league", {})
    raw_groups = first.get("standings") or []
    groups = []
    for i, group in enumerate(raw_groups):
        rows = []
        for value in group:
            all_games = value.get("all", {})
            goals = all_games.get("goals", {})
            team = value.get("team", {})
            row = {
                "name": str(team.get("name") or "").strip(),
                "rank": integer(value.get("rank"), "rank", 1),
                "pj": integer(all_games.get("played"), "PJ"),
                "g": integer(all_games.get("win"), "G"),
                "e": integer(all_games.get("draw"), "E"),
                "p": integer(all_games.get("lose"), "P"),
                "gf": integer(goals.get("for"), "GF"),
                "gc": integer(goals.get("against"), "GC"),
                "pts": integer(value.get("points"), "PTS", -100),
                "form": [{"W":"V", "D":"E", "L":"D"}[ch] for ch in (value.get("form") or "") if ch in "WDL"][-5:],
            }
            row["dg"] = row["gf"] - row["gc"]
            if not row["name"] or row["pj"] != row["g"] + row["e"] + row["p"]:
                raise ValueError("Club vacío o PJ distinto de G+E+P")
            rows.append(row)
        if not rows:
            continue
        if len({r["name"] for r in rows}) != len(rows):
            raise ValueError("Equipos duplicados dentro de una clasificación")
        rows.sort(key=lambda r: r["rank"])
        if len({r["rank"] for r in rows}) != len(rows):
            raise ValueError("Posiciones duplicadas en una clasificación")
        source_group = group[0].get("group") if group else None
        if source_group and any(item.get("group") != source_group for item in group):
            raise ValueError("Nombre de grupo contradictorio")
        groups.append({"name": str(source_group or ("Tabla general" if len(raw_groups) == 1
                       else "Fase sin nombre en la fuente")), "rows": rows})
    return groups

def normalize_fixtures(events, upcoming):
    games = []
    accepted = {"NS", "TBD"} if upcoming else {"FT", "AET", "PEN"}
    for event in events:
        fixture = event.get("fixture", {})
        status = fixture.get("status", {}).get("short")
        if status not in accepted:
            continue
        when = fixture.get("date")
        home = event.get("teams", {}).get("home", {}).get("name")
        away = event.get("teams", {}).get("away", {}).get("name")
        fixture_id = fixture.get("id")
        if not (isinstance(when, str) and when and home and away and isinstance(fixture_id,int)):
            raise ValueError("Partido sin identificador, fecha o equipos")
        goals = event.get("goals", {})
        hg = None if upcoming else integer(goals.get("home"), "goles local")
        ag = None if upcoming else integer(goals.get("away"), "goles visita")
        games.append({"id":str(fixture_id), "home":home, "away":away, "date":when,
                      "hg":hg, "ag":ag, "status":status, "demo":False})
    return sorted(games, key=lambda m: m["date"], reverse=not upcoming)

def update(output, api_key, selected, season_override=None):
    if not api_key:
        raise ValueError("Falta API_FOOTBALL_KEY; no se publican datos sintéticos")
    old = json.loads(output.read_text(encoding="utf-8")) if output.exists() else {
        "schema_version":1, "competitions":{}}
    if old.get("schema_version") != 1 or not isinstance(old.get("competitions"),dict):
        raise ValueError("Instantánea existente incompatible; se conserva intacta")
    catalog = api_get("leagues", {}, api_key)
    failed = []
    for code in selected:
        try:
            league_id, season, name = select_league(catalog, code, season_override)
            standings = api_get("standings", {"league":league_id,"season":season}, api_key)
            # El plan Free no admite last/next. Consultar la temporada completa,
            # filtrar cronológicamente en Python y nunca fabricar resultados.
            season_events = api_get("fixtures", {"league":league_id,"season":season}, api_key)
            groups = normalize_standings(standings)
            historical = season < datetime.now(timezone.utc).year - 1
            fixtures = [] if historical else normalize_fixtures(season_events, True)[:10]
            results = normalize_fixtures(season_events, False)[:10]
            if not (groups or fixtures or results):
                raise ValueError("Ningún dato verificable para la competición")
            old["competitions"][code] = {
                "provider":"API-Football", "league_id":league_id,
                "season":str(season), "historical":season < datetime.now(timezone.utc).year - 1,
                "source":"https://www.api-football.com/",
                "updated_at":datetime.now(timezone.utc).isoformat(),
                "groups":groups, "fixtures":fixtures, "results":results,
            }
            print(f"OK {code} ({name}): {len(groups)} tablas, {len(fixtures)} próximos, {len(results)} resultados")
        except Exception as exc:
            failed.append(code)
            print(f"ERROR {code}: {exc}; se conserva la última captura", file=sys.stderr)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(".tmp")
    temporary.write_text(json.dumps(old,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    temporary.replace(output)
    return 1 if failed else 0

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--league",choices=SELECTORS,action="append")
    parser.add_argument("--season", type=int, help="Temporada explícita disponible en el plan; ej. 2024")
    parser.add_argument("--output",type=Path,default=DEST)
    args = parser.parse_args()
    try:
        return update(args.output, os.environ.get("API_FOOTBALL_KEY",""),args.league or list(SELECTORS), args.season)
    except Exception as exc:
        print(f"ERROR GLOBAL: {exc}",file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
