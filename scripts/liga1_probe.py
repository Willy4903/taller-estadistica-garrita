"""Sondeo de fuentes de la Liga 1 (segunda ronda): vuelca tablas completas y estructura de noticias."""
import re
import urllib.request
from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "es-PE,es;q=0.9"}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.geturl(), r.read().decode("utf-8", "ignore")
    except Exception as e:  # noqa: BLE001
        return None, url, f"ERROR {e}"


def head(title):
    print("\n" + "=" * 100 + "\n" + title)


def dump_tables(url, maxrows=22):
    head("TABLAS " + url)
    st, final, body = get(url)
    print("estado", st, "final", final, "bytes", len(body))
    if st != 200:
        print(body[:200]); return None
    soup = BeautifulSoup(body, "lxml")
    print("título:", soup.title.get_text(strip=True) if soup.title else None)
    for i, t in enumerate(soup.find_all("table")):
        rows = t.find_all("tr")
        print(f"[tabla {i}] filas={len(rows)} clases={t.get('class')} caption={(t.find('caption').get_text(strip=True) if t.find('caption') else '')}")
        prev = t.find_previous(["h1", "h2", "h3", "h4"])
        print("   encabezado previo:", prev.get_text(' ', strip=True)[:100] if prev else None)
        for tr in rows[:maxrows]:
            print("   |", " | ".join(c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"]))[:170])
    return soup


def links(soup, pat, limit=30):
    seen = 0
    for a in soup.find_all("a", href=True):
        if seen < limit and re.search(pat, a["href"] + " " + a.get_text(" ", strip=True), re.I):
            print("   >", a.get_text(" ", strip=True)[:70], a["href"][:130]); seen += 1


# 1. páginas oficiales / especializadas de tabla
s = dump_tables("https://liga1.pe/tabla-de-posiciones/", 24)
if s:
    links(s, r"tabla|fixture|resultado|calendario|apertura|clausura|acumulad")
s = dump_tables("https://www.futbolperuano.com/liga-1/clausura/tabla-de-posiciones", 24)
if s:
    links(s, r"tabla|fixture|resultado|calendario|apertura|clausura|acumulad")
for u in ["https://www.futbolperuano.com/liga-1/apertura/tabla-de-posiciones",
          "https://www.futbolperuano.com/liga-1/acumulado/tabla-de-posiciones",
          "https://www.futbolperuano.com/liga-1/tabla-acumulada",
          "https://www.futbolperuano.com/liga-1/fixture",
          "https://www.futbolperuano.com/liga-1/clausura/fixture",
          "https://www.futbolperuano.com/liga-1/resultados",
          "https://liga1.pe/fixture/", "https://liga1.pe/resultados/", "https://liga1.pe/calendario/"]:
    st, final, body = get(u)
    n = len(BeautifulSoup(body, "lxml").find_all("table")) if st == 200 else "-"
    print("sonda", u, "->", st, final if final != u else "", "tablas:", n)

# 2. artículo de Depor: tablas completas (clausura, acumulado, fixture del día)
dump_tables("https://depor.com/futbol-peruano/descentralizado/tabla-de-posiciones-liga-1-peru-2026-en-vivo-acumulado-y-resultados-de-la-fecha-14-del-torneo-clausura-sport-huancayo-universitario-sporting-cristal-alianza-lima-noticia/", 24)

# 3. Universitario: portada, listado de noticias y una nota
head("UNIVERSITARIO.PE portada")
st, final, body = get("https://universitario.pe/")
soup = BeautifulSoup(body, "lxml")
for m in soup.find_all("meta", property=re.compile("og:")):
    print("   meta", m.get("property"), (m.get("content") or "")[:100])
cards = [a for a in soup.find_all("a", href=re.compile(r"^/noticias/"))]
print("tarjetas /noticias/:", len(cards))
for a in cards[:4]:
    print("   ---", a["href"]); print(a.prettify()[:900])
txt = soup.get_text(" ", strip=True)
for m in list(re.finditer(r"(?i)pr[oó]ximo|fixture|calendario|\bvs\b", txt))[:6]:
    print("   ...", txt[max(0, m.start() - 60): m.start() + 140])
for u in ["https://universitario.pe/noticias", "https://universitario.pe/noticias?categoria=F%C3%BAtbol%20masculino"]:
    st, final, body = get(u)
    s2 = BeautifulSoup(body, "lxml")
    print("lista", u, st, "tarjetas:", len(s2.find_all("a", href=re.compile(r"^/noticias/"))))
head("UNIVERSITARIO.PE nota")
st, final, body = get("https://universitario.pe/noticias/plan-de-actividades-del-primer-equipo-de-universitario-de-deportes-34")
s3 = BeautifulSoup(body, "lxml")
print("estado", st, "título:", s3.title.get_text(strip=True) if s3.title else None)
for m in s3.find_all("meta"):
    if m.get("property", "").startswith("og:") or m.get("name") in ("description", "twitter:image"):
        print("   meta", m.get("property") or m.get("name"), (m.get("content") or "")[:120])
for p in s3.find_all("p")[:6]:
    print("   p:", p.get_text(" ", strip=True)[:140])
print("   ld+json:", [x.get_text()[:300] for x in s3.find_all("script", type="application/ld+json")][:2])
