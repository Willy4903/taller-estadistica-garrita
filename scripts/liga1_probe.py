"""Sondeo de fuentes de la Liga 1 (cuarta ronda): estructura de partidos en futbolperuano y datos del calendario de la U."""
import json
import re
import urllib.request
from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "es-PE,es;q=0.9"}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "ignore")


def squeeze(html, n):
    return re.sub(r"\n\s*\n+", "\n", re.sub(r"(data:image/gif;base64,[A-Za-z0-9+/=]+)", "GIF", html))[:n]


for url in ["https://www.futbolperuano.com/liga-1/clausura/", "https://www.futbolperuano.com/liga-1/resultados"]:
    print("=" * 100, "\n", url)
    soup = BeautifulSoup(get(url), "lxml")
    lt = soup.select(".local-team")
    print("local-team:", len(lt), "| visit-team:", len(soup.select(".visit-team")))
    first = lt[0]
    node = first
    for _ in range(8):
        node = node.parent
        if node is None:
            break
        if node.select(".visit-team"):
            break
    print("--- contenedor del primer partido (clase:", node.get("class"), ")")
    print(squeeze(node.prettify(), 3200))
    # encabezados de fecha
    heads = [t for t in soup.find_all(string=re.compile(r"^\s*Fecha\s+\d+\s*$"))]
    print("encabezados 'Fecha N':", len(heads), [h.strip() for h in heads[:5]], "...", [h.strip() for h in heads[-3:]])
    if heads:
        p = heads[0].parent
        print("padre del encabezado:", p.name, p.get("class"), "| abuelo:", p.parent.name, p.parent.get("class"))
        print(squeeze(p.parent.prettify(), 700))

print("=" * 100, "\n universitario.pe calendario (JSON incrustado)")
html = get("https://universitario.pe/calendario")
txt = html.replace('\\"', '"').replace("\\\\", "\\")
objs = re.findall(r'\{"id":"\d+","competition":.*?"team":"[^"]+"\}', txt)
print("objetos partido:", len(objs))
rows = []
for o in objs:
    try:
        rows.append(json.loads(o))
    except ValueError:
        pass
print("válidos:", len(rows))
fm = [r for r in rows if r.get("team") == "Fútbol masculino"]
print("fútbol masculino:", len(fm), "| competiciones:", sorted({r["competition"] for r in fm}))
for r in sorted(fm, key=lambda x: x["startsAt"])[-8:]:
    print("  ", r["startsAt"], r["competition"], "|", r["stage"], "|", r["home"], r.get("homeScore"), "-", r.get("awayScore"), r["away"], "| fin:", r["finished"], "|", r["venue"])
print("claves:", sorted(rows[0].keys()))
