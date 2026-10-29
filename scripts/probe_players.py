#!/usr/bin/env python3
"""Sondeo de fuentes públicas con estadísticas de jugadores de la Liga 1 (solo lectura, imprime un resumen)."""
import re
import sys
import urllib.request

from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "es-PE,es;q=0.9,en;q=0.8"}
URLS = [
    "https://africa.espn.com/football/stats/_/league/PER.1/view/scoring",
    "https://www.espn.com/soccer/stats/_/league/PER.1/view/scoring",
    "https://www.espn.com/soccer/stats/_/league/PER.1/view/assists",
    "https://www.espn.com/soccer/stats/_/league/PER.1/view/discipline",
    "https://www.futbolperuano.com/liga-1/goleadores",
    "https://www.futbolperuano.com/liga-1/estadisticas",
    "https://www.futbolperuano.com/liga-1/noticias/asi-marcha-la-tabla-de-goleadores-de-la-liga-1-2026-tras-el-inicio-del-clausura-594823",
    "https://liga1.pe/goleadores/",
    "https://liga1.pe/estadisticas/",
    "https://liga1.pe/tabla-de-goleadores/",
    "https://dailysports.net/tournaments/peru-primera-division/top-scorers/",
    "https://en.wikipedia.org/wiki/2026_Liga_1_(Peru)",
    "https://www.fotmob.com/teams/4412/stats/sport-boys-association",
    "https://www.transfermarkt.com/liga-1/torschuetzenliste/wettbewerb/PER1",
    "https://www.transfermarkt.com/liga-1/verletztespieler/wettbewerb/PER1",
]


def get(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


for u in URLS:
    code, body = get(u)
    soup = BeautifulSoup(body, "lxml") if body and code == 200 else None
    title = (soup.title.get_text(strip=True) if soup and soup.title else "")[:100]
    print(f"\n=== {code} {len(body):>8} B  {u}\n    título: {title}")
    if not soup:
        print("    ", body[:120].replace("\n", " "))
        continue
    nj = bool(soup.find("script", id="__NEXT_DATA__"))
    tables = soup.find_all("table")
    print(f"    tablas: {len(tables)}  next_data: {nj}")
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
    for kw in ("Castillo", "Garcés", "Garces", "Hohberg", "Callejo", "lesion", "Lesion"):
        i = text.find(kw)
        if i >= 0:
            print(f"    [{kw}] …{text[max(0, i - 120):i + 220]}…")
            break
    for t in tables[:2]:
        rows = t.find_all("tr")[:4]
        for r in rows:
            print("    |", " | ".join(c.get_text(" ", strip=True) for c in r.find_all(["th", "td"]))[:200])
sys.exit(0)
