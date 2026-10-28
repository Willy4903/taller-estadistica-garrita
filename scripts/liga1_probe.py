"""Sondeo de fuentes de la Liga 1 (tercera ronda): calendario de partidos y próximo partido de la U."""
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


def head(t):
    print("\n" + "=" * 100 + "\n" + t)


def around(soup, pattern, up=3, limit=1400, count=1):
    n = 0
    for s in soup.find_all(string=re.compile(pattern)):
        node = s.parent
        for _ in range(up):
            if node.parent is not None and node.parent.name not in ("body", "html"):
                node = node.parent
        print("--- bloque alrededor de", repr(s.strip()[:60]))
        print(re.sub(r"\n\s*\n+", "\n", node.prettify())[:limit])
        n += 1
        if n >= count:
            break


for u in ["https://liga1.pe/fixture/", "https://www.futbolperuano.com/liga-1/resultados", "https://www.futbolperuano.com/liga-1/clausura/",
          "https://universitario.pe/calendario", "https://universitario.pe/fixture", "https://universitario.pe/futbol-masculino/calendario"]:
    head("PÁGINA " + u)
    st, final, body = get(u)
    print("estado", st, "final", final, "bytes", len(body))
    if st != 200:
        continue
    soup = BeautifulSoup(body, "lxml")
    print("título:", soup.title.get_text(strip=True) if soup.title else None, "| tablas:", len(soup.find_all("table")))
    txt = soup.get_text(" ", strip=True)
    print("muestra:", txt[:300])
    for m in list(re.finditer(r"(?i)fecha\s*15", txt))[:2]:
        print("   ...", txt[max(0, m.start() - 120): m.start() + 260])
    for a in soup.find_all("a", href=True):
        if re.search(r"fixture|calendario|resultados|fecha-1[4-7]", a["href"], re.I):
            print("   >", a.get_text(" ", strip=True)[:50], a["href"][:110])
    around(soup, r"(?i)fecha\s*15|Alianza Atl", up=3, limit=1500)

head("UNIVERSITARIO.PE próximo partido")
st, final, body = get("https://universitario.pe/")
soup = BeautifulSoup(body, "lxml")
around(soup, r"Próximo Partido", up=4, limit=3500)
for a in soup.find_all("a", href=True):
    if re.search(r"calendario|partido|fixture|tabla", a["href"] + a.get_text(), re.I):
        print("   >", a.get_text(" ", strip=True)[:60], a["href"][:110])
print("scripts next data:", bool(soup.find("script", id="__NEXT_DATA__")))
for sc in soup.find_all("script"):
    t = sc.string or ""
    if "Fecha 15" in t or "Clausura" in t:
        i = t.find("Clausura")
        print("   script:", t[max(0, i - 300): i + 700].replace("\n", " "))
        break
