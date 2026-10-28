"""Sondeo de fuentes de la Liga 1: imprime la estructura de cada página para escribir los lectores (se ejecuta a mano en Actions)."""
import re
import sys
import urllib.request
from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "es-PE,es;q=0.9"}
ARTICLES = [
    "https://www.infobae.com/peru/deportes/2026/10/27/tabla-de-posiciones-liga-1-peru-2026-en-vivo-hoy-partidos-fecha-14-torneo-clausura-acumulada-alianza-lima-sporting-cristal-universitario-melgar-sport-huancayo-sport-boys/",
    "https://larepublica.pe/deportes/2026/10/27/tabla-de-posiciones-torneo-clausura-y-acumulado-de-la-liga-1-2026-actualizado-en-vivo-2602530",
    "https://depor.com/futbol-peruano/descentralizado/tabla-de-posiciones-liga-1-peru-2026-en-vivo-acumulado-y-resultados-de-la-fecha-14-del-torneo-clausura-sport-huancayo-universitario-sporting-cristal-alianza-lima-noticia/",
    "https://libero.pe/futbol-peruano/liga-1/2026/10/27/tabla-acumulada-de-liga-1-2026-peru-fecha-14-alianza-lima-sporting-cristal-universitario-1213299",
    "https://libero.pe/futbol-peruano/liga-1/2026/10/27/tabla-de-posiciones-del-torneo-clausura-2026-fecha-14-de-liga-1-alianza-lima-sporting-cristal-universitario-1670949",
    "https://www.futbolperuano.com/liga-1/noticias/la-tabla-acumulada-de-la-liga-1-tras-la-fecha-4-del-torneo-clausura-2026-595408",
]
INDEXES = [
    "https://universitario.pe/",
    "https://universitario.pe/feed/",
    "https://universitario.pe/wp-json/wp/v2/posts?per_page=5",
    "https://www.infobae.com/arc/outboundfeeds/rss/category/peru/deportes/?outputType=xml",
    "https://larepublica.pe/arc/outboundfeeds/rss/category/deportes/?outputType=xml",
    "https://depor.com/arc/outboundfeeds/rss/category/futbol-peruano/?outputType=xml",
    "https://libero.pe/arc/outboundfeeds/rss/?outputType=xml",
    "https://libero.pe/futbol-peruano/liga-1/",
    "https://www.futbolperuano.com/liga-1",
    "https://www.liga1.pe/",
]


def get(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.geturl(), r.headers.get("content-type", ""), r.read()
    except Exception as e:  # noqa: BLE001
        return None, url, "", str(e).encode()


def show_tables(soup):
    tables = soup.find_all("table")
    print(f"  tablas: {len(tables)}")
    for i, t in enumerate(tables[:8]):
        rows = t.find_all("tr")
        print(f"  [tabla {i}] filas={len(rows)}")
        for tr in rows[:3]:
            print("     |", " | ".join(c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"]))[:200])


def probe_article(url):
    print("=" * 100)
    print("ARTÍCULO", url)
    st, final, ct, body = get(url)
    print("  estado", st, "tipo", ct, "bytes", len(body), "final", final if final != url else "")
    if st != 200:
        print("  error:", body[:200])
        return
    soup = BeautifulSoup(body, "lxml")
    print("  título:", soup.title.get_text(strip=True) if soup.title else None)
    show_tables(soup)
    txt = soup.get_text(" ", strip=True)
    for m in list(re.finditer(r"Universitario", txt))[:3]:
        print("  ...", txt[max(0, m.start() - 80): m.start() + 160].replace("\n", " "))
    jl = soup.find_all("script", type="application/ld+json")
    print("  ld+json:", len(jl), "| __NEXT_DATA__:", bool(soup.find("script", id="__NEXT_DATA__")), "| fusion:", "Fusion.globalContent" in body.decode("utf-8", "ignore"))


def probe_index(url):
    print("=" * 100)
    print("ÍNDICE", url)
    st, final, ct, body = get(url)
    print("  estado", st, "tipo", ct, "bytes", len(body), "final", final if final != url else "")
    if st != 200:
        print("  error:", body[:200])
        return
    text = body.decode("utf-8", "ignore")
    if "xml" in ct or text.lstrip().startswith("<?xml"):
        soup = BeautifulSoup(text, "xml")
        items = soup.find_all(["item", "entry", "url"])
        print("  items:", len(items))
        hits = 0
        for it in items:
            tt = it.find(["title"]).get_text(strip=True) if it.find("title") else ""
            lk = it.find(["link", "loc"]).get_text(strip=True) if it.find(["link", "loc"]) else ""
            if hits < 6 and re.search(r"tabla|acumulad|clausura|universitario", tt + lk, re.I):
                print("   *", tt[:100], lk[:140]); hits += 1
        for it in items[:4]:
            print("   -", (it.find("title").get_text(strip=True) if it.find("title") else "")[:100])
    elif text.lstrip().startswith("[") or text.lstrip().startswith("{"):
        print("  json:", text[:600])
    else:
        soup = BeautifulSoup(text, "lxml")
        print("  título:", soup.title.get_text(strip=True) if soup.title else None)
        links = [(a.get_text(" ", strip=True), a["href"]) for a in soup.find_all("a", href=True)]
        seen = 0
        for t, h in links:
            if seen < 25 and re.search(r"noticia|news|tabla|acumulad|fecha|post|20\d\d/", h, re.I) and len(t) > 12:
                print("   >", t[:90], h[:140]); seen += 1
        show_tables(soup)


if __name__ == "__main__":
    for u in INDEXES:
        probe_index(u)
    for u in ARTICLES:
        probe_article(u)
