#!/usr/bin/env python3
"""Goleadores de la Liga 1 2026 (Apertura, Clausura y acumulado) para la página de la U.

Fuente (páginas públicas de futbolperuano.com):
  - /liga-1/goleadores             tabla de goleadores del Apertura
  - /liga-1/clausura/goleadores    tabla de goleadores del Clausura
El acumulado es la suma de ambas tablas (un jugador que cambió de club suma sus goles de los dos clubes).

Escribe site/liga1/data/players.json. Si una fuente falla se conserva el último dato válido.
Uso: python scripts/fetch_liga1_players.py [--dump]   (--dump imprime un resumen y no escribe el archivo)
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import LIMA, ROOT  # noqa: E402
from fetch_liga1 import fold, get, team_id  # noqa: E402

OUT = ROOT / "site" / "liga1" / "data" / "players.json"
SOURCES = {"A": "https://www.futbolperuano.com/liga-1/goleadores", "C": "https://www.futbolperuano.com/liga-1/clausura/goleadores"}

# La fuente a veces escribe a un mismo jugador con dos nombres distintos dentro del mismo club.
# Clave: (club, nombre normalizado de la variante) -> nombre normalizado canónico.
ALIASES = {
    ("ALI", "c eryc"): "e castillo",
}


def key_of(name):
    """Inicial del nombre + apellido(s) normalizados: 'Brandon Palacios' y 'B. Palacios' dan la misma clave."""
    tokens = fold(name).split()
    if not tokens:
        return ""
    if len(tokens) == 1:
        return tokens[0]
    return tokens[0][0] + " " + " ".join(tokens[1:])


def parse_scorers(html):
    soup = BeautifulSoup(html, "lxml")
    out = []
    for tr in soup.select("tr.jugador"):
        tds = tr.find_all("td")
        if len(tds) < 5:
            continue
        strings = list(tds[1].stripped_strings)
        name = (strings[0] if strings else "").strip()
        team_txt = tds[3].get_text(" ", strip=True)
        img = tds[2].find("img")
        tid = team_id(team_txt) or team_id(img.get("alt", "") if img else "")
        m = re.search(r"\d+", tds[4].get_text())
        if not name or not tid or not m:
            continue
        out.append({"n": name, "t": tid, "g": int(m.group())})
    return out


def prefix_of(short, long_):
    """True si 'short' es la misma inicial y un apellido que empieza igual que 'long_' (J. Lucumi / J. Lucumi Cuero)."""
    return short != long_ and long_.startswith(short + " ") and short[:1] == long_[:1] and " " in short


def collapse(rows):
    """Une duplicados del mismo club (alias y variantes del apellido) dentro de un torneo."""
    keys_by_team = {}
    for r in rows:
        keys_by_team.setdefault(r["t"], set()).add(key_of(r["n"]))
    acc = {}
    for r in rows:
        k = key_of(r["n"])
        k = ALIASES.get((r["t"], k), k)
        longer = [o for o in keys_by_team[r["t"]] if prefix_of(k, o)]
        if longer:
            k = max(longer, key=len)
        cur = acc.get((r["t"], k))
        if cur:
            cur["g"] += r["g"]
            if len(r["n"]) > len(cur["n"]):
                cur["n"] = r["n"]
        else:
            acc[(r["t"], k)] = {"n": r["n"], "t": r["t"], "g": r["g"], "k": k}
    return list(acc.values())


def ranked(items):
    items = sorted(items, key=lambda x: (-x["g"], x["n"]))
    for it in items:
        it["r"] = 1 + sum(1 for o in items if o["g"] > it["g"])
    return items


def merge_total(a_rows, c_rows):
    """Acumulado: suma por jugador. Si el mismo nombre aparece con otro club en el otro torneo (traspaso) se une."""
    # variantes del apellido entre torneos (M. Rasmussen / M. Rasmussen Grados): se unen si nunca coinciden en un mismo torneo
    a_keys, c_keys = {r["k"] for r in a_rows}, {r["k"] for r in c_rows}
    alias = {}
    for ka in a_keys | c_keys:
        for kb in a_keys | c_keys:
            if prefix_of(ka, kb) and not ((ka in a_keys and kb in a_keys) or (ka in c_keys and kb in c_keys)):
                alias[ka] = kb
    by_key = {}
    for tor, rows in (("A", a_rows), ("C", c_rows)):
        for r in rows:
            by_key.setdefault(alias.get(r["k"], r["k"]), []).append((tor, r))
    total = []
    for k, entries in by_key.items():
        a_teams = [r["t"] for tor, r in entries if tor == "A"]
        c_teams = [r["t"] for tor, r in entries if tor == "C"]
        homonyms = len(a_teams) > 1 or len(c_teams) > 1
        if homonyms:
            # mismo nombre en varios clubes del mismo torneo: se trata como jugadores distintos
            by_team = {}
            for tor, r in entries:
                d = by_team.setdefault(r["t"], {"n": r["n"], "t": r["t"], "a": 0, "c": 0})
                d["a" if tor == "A" else "c"] += r["g"]
            total.extend(by_team.values())
            continue
        a = next((r for tor, r in entries if tor == "A"), None)
        c = next((r for tor, r in entries if tor == "C"), None)
        cur = c or a
        item = {"n": cur["n"], "t": cur["t"], "a": a["g"] if a else 0, "c": c["g"] if c else 0}
        if a and c and a["t"] != c["t"]:
            item["from"] = a["t"]
        total.append(item)
    for it in total:
        it["g"] = it["a"] + it["c"]
    return ranked(total)


def build():
    parsed = {}
    for tor, url in SOURCES.items():
        parsed[tor] = collapse(parse_scorers(get(url)))
        if len(parsed[tor]) < 20:
            raise RuntimeError(f"{url}: solo {len(parsed[tor])} jugadores, la página cambió de formato")
    total = merge_total(parsed["A"], parsed["C"])
    for tor in ("A", "C"):
        parsed[tor] = ranked(parsed[tor])
        for it in parsed[tor]:
            it.pop("k", None)
    return {
        "updated_at": datetime.now(LIMA).isoformat(timespec="minutes"),
        "sources": SOURCES,
        "scorers": {"A": parsed["A"], "C": parsed["C"], "T": total},
    }


def main():
    dump = "--dump" in sys.argv
    try:
        data = build()
    except Exception as e:  # noqa: BLE001
        print("No se pudieron actualizar los goleadores:", e)
        return 1
    if dump:
        for tor in ("A", "C"):
            by = {}
            for it in data["scorers"][tor]:
                by.setdefault(it["t"], []).append(f'{it["n"]} {it["g"]}')
            print(f"\n--- {tor}: {len(data['scorers'][tor])} jugadores, {sum(i['g'] for i in data['scorers'][tor])} goles")
            for t, v in sorted(by.items()):
                print(f"  {t}: " + " | ".join(v))
        print("\n--- ACUMULADO (primeros 30)")
        for it in data["scorers"]["T"][:30]:
            print(f'  {it["r"]:>2} {it["n"]:<22} {it["t"]}  total {it["g"]} (A {it["a"]} + C {it["c"]}){"  desde " + it["from"] if it.get("from") else ""}')
        print("  jugadores con traspaso:", [(i["n"], i["from"], i["t"]) for i in data["scorers"]["T"] if i.get("from")])
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"players.json: {len(data['scorers']['T'])} jugadores en el acumulado")
    return 0


if __name__ == "__main__":
    sys.exit(main())
