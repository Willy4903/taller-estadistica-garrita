#!/usr/bin/env python3
"""Actualiza los datos reales de la Liga 1 2026 y las noticias de Universitario.

Fuentes (todas públicas):
  - liga1.pe/tabla-de-posiciones      tablas oficiales de Clausura, Apertura y Acumulado (control de calidad)
  - futbolperuano.com                 todos los partidos con marcador (Apertura y Clausura) y tabla del Clausura
  - depor.com (RSS + nota del día)    tablas de Clausura y Acumulado (segundo control)
  - universitario.pe                  noticias, calendario y próximo partido de la U

Escribe site/liga1/data/live.json. Si una fuente falla se conserva el último dato válido y se deja el motivo en "sources".
"""
import json
import re
import sys
import time
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import LIMA, ROOT  # noqa: E402

OUT = ROOT / "site" / "liga1" / "data" / "live.json"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "es-PE,es;q=0.9"}
NF = 17
IDS = ["UNI", "ALI", "CRI", "MEL", "CIE", "GAR", "CHA", "SBO", "GRA", "ADT", "AAT", "JPI", "CUS", "COM", "UTC", "HUA", "MOQ", "CAJ"]
MONTHS = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
          "setiembre": 9, "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}
UNI_SITE = "https://universitario.pe"


# ---------- red ----------
def get(url, tries=3, timeout=40):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "ignore")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"{url}: {last}")


# ---------- equipos ----------
def fold(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


RULES = [("alianza atl", "AAT"), ("sullana", "AAT"), ("alianza lima", "ALI"), ("universitario", "UNI"), ("cristal", "CRI"),
         ("melgar", "MEL"), ("cienciano", "CIE"), ("garcilaso", "GAR"), ("chankas", "CHA"), ("sport boys", "SBO"),
         ("grau", "GRA"), ("atletico", "AAT"), ("juan pablo", "JPI"), ("comerciantes", "COM"), ("huancayo", "HUA"),
         ("moquegua", "MOQ"), ("cusco", "CUS"), ("cajamarca", "CAJ")]


def team_id(name):
    t = fold(name)
    words = set(t.split())
    if "utc" in words or "tecnica" in words:
        return "UTC"
    if "adt" in words or "tarma" in words:
        return "ADT"
    for key, tid in RULES:
        if key in t:
            return tid
    return None


# ---------- tablas de posiciones ----------
def to_int(s):
    m = re.search(r"-?\d+", (s or "").replace("+", ""))
    return int(m.group()) if m else None


def parse_standings(table):
    """Lee una tabla de posiciones por el nombre de sus columnas (sirve para liga1.pe, futbolperuano y depor)."""
    rows = table.find_all("tr")
    if len(rows) < 2:
        return None
    heads = [fold(c.get_text(" ", strip=True)) for c in rows[0].find_all(["th", "td"])]

    def col(*names):
        for n in names:
            if n in heads:
                return heads.index(n)
        return None
    ix = {"club": col("club", "equipo"), "pj": col("pj"), "pg": col("pg"), "pe": col("pe"), "pp": col("pp"),
          "gf": col("gf"), "gc": col("gc"), "dg": col("dg", "dif"), "pts": col("ptos", "pts", "puntos")}
    if None in (ix["club"], ix["pj"], ix["pts"]):
        return None
    out = []
    for tr in rows[1:]:
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
        if len(cells) <= max(v for v in ix.values() if v is not None):
            continue
        tid = team_id(cells[ix["club"]])
        if not tid:
            continue
        row = {"id": tid}
        for k in ("pj", "pg", "pe", "pp", "gf", "gc", "dg", "pts"):
            row[k] = to_int(cells[ix[k]]) if ix[k] is not None else None
        out.append(row)
    return out if len(out) == len(IDS) and len({r["id"] for r in out}) == len(IDS) else None


def parse_official(html):
    """liga1.pe publica tres tablas; se clasifican por sus datos, no por el orden."""
    soup = BeautifulSoup(html, "lxml")
    tables = [parse_standings(t) for t in soup.select("table.tabla-posiciones")]
    tables = [t for t in tables if t]
    if len(tables) != 3:
        raise ValueError(f"se esperaban 3 tablas y hay {len(tables)}")
    tables.sort(key=lambda t: sum(r["pj"] for r in t), reverse=True)
    total = tables[0]
    rest = tables[1:]
    full = [t for t in rest if all(r["pj"] == NF for r in t)]
    if len(full) != 1:
        raise ValueError("no se pudo distinguir el Apertura del Clausura")
    apertura = full[0]
    clausura = [t for t in rest if t is not apertura][0]
    return {"A": apertura, "C": clausura, "T": total}


def parse_depor(feed_xml):
    items = BeautifulSoup(feed_xml, "xml").find_all("item")
    for it in items:
        title = it.find("title").get_text(" ", strip=True) if it.find("title") else ""
        if re.search(r"tabla de posiciones", title, re.I) and re.search(r"liga 1", title, re.I):
            link = it.find("link").get_text(strip=True)
            soup = BeautifulSoup(get(link), "lxml")
            out = {"url": link}
            for t in soup.find_all("table"):
                rows = parse_standings(t)
                if not rows:
                    continue
                prev = t.find_previous(["h1", "h2", "h3", "h4", "p"])
                label = fold(prev.get_text(" ", strip=True)) if prev else ""
                if "acumulad" in label:
                    out["T"] = rows
                elif "clausura" in label:
                    out["C"] = rows
            return out
    raise ValueError("sin nota de tabla de posiciones en el RSS")


# ---------- partidos ----------
def parse_date_es(text):
    m = re.search(r"(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\s+(?:de\s+)?(\d{4})", (text or "").lower())
    if not m or fold(m.group(2)) not in MONTHS:
        return None
    return f"{int(m.group(3)):04d}-{MONTHS[fold(m.group(2))]:02d}-{int(m.group(1)):02d}"


def to_24h(text):
    m = re.search(r"(\d{1,2}):(\d{2})\s*([AP]M)?", (text or "").upper())
    if not m:
        return None
    h, mi, ap = int(m.group(1)), m.group(2), m.group(3)
    if ap == "PM" and h < 12:
        h += 12
    if ap == "AM" and h == 12:
        h = 0
    return f"{h:02d}:{mi}"


DAY_RE = re.compile(r"^\s*(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b", re.I)


def parse_matches(html, torneo):
    soup = BeautifulSoup(html, "lxml")
    out, seen = [], set()
    for head in soup.select(".event-header"):
        m = re.search(r"Fecha\s+(\d+)", head.get_text(" ", strip=True))
        if not m:
            continue
        fecha = int(m.group(1))
        target = head.get("data-bs-target")
        box = soup.select_one(target) if target and target.startswith("#") else None
        if box is None:
            box = head.find_next_sibling()
        if box is None:
            continue
        for mt in box.select(".match"):
            h = mt.select_one(".local-team .team-name")
            a = mt.select_one(".visit-team .team-name")
            if not h or not a:
                continue
            hid, aid = team_id(h.get_text(" ", strip=True)), team_id(a.get_text(" ", strip=True))
            if not hid or not aid or hid == aid or (fecha, hid, aid) in seen:
                continue
            seen.add((fecha, hid, aid))
            timer = fold((mt.select_one(".match-time .timer") or mt).get_text(" ", strip=True))
            lr, vr = mt.select_one(".local-result"), mt.select_one(".visit-result")
            hg = to_int(lr.get_text(" ", strip=True)) if lr else None
            ag = to_int(vr.get_text(" ", strip=True)) if vr else None
            played = ("jugado" in timer or "final" in timer) and hg is not None and ag is not None
            day = mt.find_previous(string=DAY_RE)
            hour = mt.select_one(".match-hour")
            out.append({"t": torneo, "f": fecha, "h": hid, "a": aid, "hg": hg if played else None, "ag": ag if played else None,
                        "date": parse_date_es(day) if day else None, "time": to_24h(hour.get_text(" ", strip=True)) if hour else None})
    return out


def valid_fixtures(fx):
    """Un torneo completo tiene 17 fechas de 9 partidos y cada club juega una vez por fecha."""
    if not (140 <= len(fx) <= 160):
        return False
    for f in range(1, NF + 1):
        ms = [x for x in fx if x["f"] == f]
        teams = [x["h"] for x in ms] + [x["a"] for x in ms]
        if not ms or len(teams) != len(set(teams)):
            return False
    return True


# ---------- cálculo para el control de calidad ----------
def tally(fixtures, torneo):
    m = {i: {"id": i, "pj": 0, "pts": 0, "gf": 0, "gc": 0} for i in IDS}
    for f in fixtures:
        if f["t"] != torneo or f["hg"] is None:
            continue
        for me, mine, his in ((f["h"], f["hg"], f["ag"]), (f["a"], f["ag"], f["hg"])):
            r = m[me]
            r["pj"] += 1
            r["gf"] += mine
            r["gc"] += his
            r["pts"] += 3 if mine > his else 1 if mine == his else 0
    return m


def compare(rows, computed, adjust=None):
    """Cuenta los clubes cuyos puntos y partidos coinciden con la tabla de referencia."""
    ok, diffs = 0, []
    for r in rows:
        c = computed[r["id"]]
        pts = c["pts"] + (adjust or {}).get(r["id"], 0)
        if r["pts"] == pts and r["pj"] == c["pj"]:
            ok += 1
        else:
            diffs.append(f'{r["id"]}: fuente {r["pts"]} pts/{r["pj"]} PJ, partidos {pts} pts/{c["pj"]} PJ')
    return ok, diffs


def infer_missing(fixtures, official_c, today):
    """Completa partidos ya jugados que la fuente de calendario aún no marca con marcador.

    Liga1.pe actualiza su tabla antes que los calendarios. Si dos clubes tienen un partido más en la tabla oficial del
    Clausura que en la suma de marcadores, y los goles a favor y en contra de ambos cuadran con un partido pendiente
    entre ellos de fecha ya pasada, ese es el marcador."""
    comp = tally(fixtures, "C")
    gap = {}
    for r in official_c:
        c = comp[r["id"]]
        if r["pj"] == c["pj"] + 1:
            gap[r["id"]] = (r["gf"] - c["gf"], r["gc"] - c["gc"])
    done = []
    for f in fixtures:
        if f["t"] != "C" or f["hg"] is not None or not f.get("date") or f["date"] > today:
            continue
        h, a = gap.get(f["h"]), gap.get(f["a"])
        if h and a and h[0] == a[1] and h[1] == a[0]:
            f["hg"], f["ag"], f["inf"] = h[0], a[0], 1
            done.append(f'{f["h"]} {f["hg"]}-{f["ag"]} {f["a"]}')
            gap.pop(f["h"]); gap.pop(f["a"])
    return done


def compute_adjust(official, fixtures, old=None):
    """Ajustes por club (sanciones) para que la página coincida con el Acumulado oficial.

    C: tabla oficial del Clausura menos la suma de partidos.
    Resto: d = Acumulado oficial - (suma de partidos A + suma de partidos C + ajuste C).
      Si la tabla oficial de Apertura explica ese descuento (UTC), el ajuste va al Apertura (A).
      Si no, es un descuento que solo figura en el Acumulado (T). Ejemplo: Sport Boys, Cajamarca y ADT.
    La tabla de Apertura de Liga1.pe no se usa para los puntos: puede quedar desactualizada y contradecir a su propio
    Acumulado (Alianza Lima 38 frente a 40, que es lo que suman los marcadores).
    Un ajuste solo se recalcula si la tabla oficial y los partidos tienen los mismos partidos jugados;
    si no, se conserva el anterior (las fuentes se actualizan a distinta hora)."""
    old = old or {}
    compA, compC = tally(fixtures, "A"), tally(fixtures, "C")
    adj = {k: dict(old.get(k, {})) for k in ("A", "C", "T")}
    offA = {r["id"]: r for r in official["A"]}
    offC = {r["id"]: r for r in official["C"]}
    for i, r in offC.items():
        if r["pj"] == compC[i]["pj"]:
            adj["C"][i] = r["pts"] - compC[i]["pts"]
    for r in official["T"]:
        i = r["id"]
        if r["pj"] != compA[i]["pj"] + compC[i]["pj"] or offC[i]["pj"] != compC[i]["pj"]:
            continue
        d = r["pts"] - compA[i]["pts"] - compC[i]["pts"] - adj["C"].get(i, 0)
        in_a = offA[i]["pts"] - compA[i]["pts"] if offA[i]["pj"] == compA[i]["pj"] else 0
        adj["A"][i] = in_a if in_a == d else 0
        adj["T"][i] = d - adj["A"][i]
    return {k: {i: v for i, v in dd.items() if v} for k, dd in adj.items()}


# ---------- Universitario ----------
CARD_RE = re.compile(r"([A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+?)\s*·\s*(\d{2}/\d{2}/\d{4})\s*(.*)")


def uni_image(src):
    if not src:
        return None
    if src.startswith("/"):
        src = UNI_SITE + src
    return re.sub(r"([?&])w=\d+", r"\g<1>w=640", src)


def parse_news(html, limit=8):
    soup = BeautifulSoup(html, "lxml")
    cards = {}
    for a in soup.select('a[href^="/noticias/"]'):
        href = a["href"].split("?")[0].rstrip("/")
        if href in ("/noticias", ""):
            continue
        text = a.get_text(" ", strip=True)
        m = CARD_RE.match(text)
        img = a.find("img")
        card = cards.setdefault(href, {"url": UNI_SITE + href})
        if m:
            card.setdefault("category", m.group(1).strip())
            d, mo, y = m.group(2).split("/")
            card.setdefault("date", f"{y}-{mo}-{d}")
            if m.group(3):
                card.setdefault("title", m.group(3).strip())
        if img is not None:
            if img.get("alt"):
                card["title"] = img["alt"].strip()
            card.setdefault("image", uni_image(img.get("src")))
    news = [c for c in cards.values() if c.get("title") and c.get("date")]
    news.sort(key=lambda c: c["date"], reverse=True)
    return news[:limit]


def enrich_news(news):
    for n in news:
        try:
            soup = BeautifulSoup(get(n["url"], tries=2, timeout=30), "lxml")
            og = {m.get("property"): m.get("content") for m in soup.find_all("meta") if (m.get("property") or "").startswith("og:")}
            if og.get("og:description"):
                n["summary"] = og["og:description"].strip()
            if og.get("og:image"):
                n["image"] = og["og:image"]
            if og.get("og:title"):
                n["title"] = og["og:title"].strip()
        except Exception as e:  # noqa: BLE001
            n["note"] = f"sin detalle: {e}"[:120]
        time.sleep(0.4)
    return news


def extract_uni_matches(html):
    """universitario.pe incrusta su calendario como JSON dentro de la página."""
    best, text = [], html
    for _ in range(4):
        rows = []
        for o in re.findall(r'\{"id":"[^"]*","competition":"[^"]*".*?"team":"[^"]*"\}', text):
            try:
                rows.append(json.loads(o))
            except ValueError:
                pass
        if len(rows) > len(best):
            best = rows
        text = text.replace('\\"', '"').replace("\\\\", "\\")
    return best


def uni_block(matches, now_utc_iso):
    mine = [m for m in matches if m.get("team") == "Fútbol masculino"]
    mine.sort(key=lambda m: m.get("startsAt", ""))

    def view(m):
        return {"competition": m.get("competition"), "stage": m.get("stage"), "home": m.get("home"), "homeId": team_id(m.get("home")),
                "away": m.get("away"), "awayId": team_id(m.get("away")), "startsAt": m.get("startsAt"), "time": m.get("time"),
                "venue": m.get("venue"), "city": m.get("city"), "homeScore": m.get("homeScore"), "awayScore": m.get("awayScore"),
                "finished": bool(m.get("finished"))}
    nxt = next((m for m in mine if not m.get("finished") and m.get("startsAt", "") >= now_utc_iso), None)
    done = [m for m in mine if m.get("finished")]
    return {"next": view(nxt) if nxt else None, "last": [view(m) for m in done[-5:]][::-1], "matches": len(mine)}


# ---------- principal ----------
def main():
    now = datetime.now(LIMA)
    prev = {}
    try:
        prev = json.loads(OUT.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        pass
    out = {k: prev[k] for k in ("fixtures", "official", "adjust", "uni") if k in prev}
    sources, checks = [], []

    def log(name, url, ok, detail=""):
        sources.append({"name": name, "url": url, "ok": ok, "detail": detail, "at": now.isoformat(timespec="minutes")})
        print(("OK   " if ok else "FALLÓ"), name, "-", detail)

    # 1) Partidos con marcador
    fx = []
    for torneo, url in (("A", "https://www.futbolperuano.com/liga-1/resultados"), ("C", "https://www.futbolperuano.com/liga-1/clausura/")):
        try:
            part = parse_matches(get(url), torneo)
            if not valid_fixtures(part):
                raise ValueError(f"calendario incompleto ({len(part)} partidos)")
            fx += part
            log(f"FutbolPeruano {torneo}", url, True, f"{len(part)} partidos, {sum(1 for x in part if x['hg'] is not None)} jugados")
        except Exception as e:  # noqa: BLE001
            log(f"FutbolPeruano {torneo}", url, False, str(e)[:200])
            fx = []
            break
    if fx:
        out["fixtures"] = fx
    fixtures = out.get("fixtures", [])

    # 2) Tablas oficiales
    official = None
    url = "https://liga1.pe/tabla-de-posiciones/"
    try:
        official = parse_official(get(url))
        out["official"] = official
        log("Liga1.pe tablas", url, True, "Clausura, Apertura y Acumulado")
    except Exception as e:  # noqa: BLE001
        log("Liga1.pe tablas", url, False, str(e)[:200])
        official = out.get("official")

    if official and fixtures:
        filled = infer_missing(fixtures, official["C"], now.strftime("%Y-%m-%d"))
        if filled:
            log("Marcadores completados con la tabla de Liga1.pe", "https://liga1.pe/tabla-de-posiciones/", True, "; ".join(filled))

    # 3) Controles cruzados
    others = {}
    url = "https://www.futbolperuano.com/liga-1/clausura/tabla-de-posiciones"
    try:
        soup = BeautifulSoup(get(url), "lxml")
        t = next((r for r in (parse_standings(x) for x in soup.find_all("table")) if r), None)
        if not t:
            raise ValueError("sin tabla legible")
        others["FutbolPeruano"] = {"C": t}
        log("FutbolPeruano tabla Clausura", url, True, "18 clubes")
    except Exception as e:  # noqa: BLE001
        log("FutbolPeruano tabla Clausura", url, False, str(e)[:200])
    url = "https://depor.com/arc/outboundfeeds/rss/category/futbol-peruano/?outputType=xml"
    try:
        d = parse_depor(get(url))
        others["Depor"] = d
        log("Depor tablas", d["url"], True, ", ".join(k for k in d if k != "url"))
    except Exception as e:  # noqa: BLE001
        log("Depor tablas", url, False, str(e)[:200])

    fp = others.get("FutbolPeruano", {}).get("C")
    if fixtures and fp and all(r.get("gf") is not None and r.get("gc") is not None for r in fp):
        filled = infer_missing(fixtures, fp, now.strftime("%Y-%m-%d"))
        if filled:
            log("Marcadores completados con la tabla de FutbolPeruano", "https://www.futbolperuano.com/liga-1/clausura/tabla-de-posiciones", True, "; ".join(filled))

    # 4) Ajustes: diferencia entre cada tabla oficial y la suma de los partidos (sanciones y correcciones de la liga).
    #    La página muestra las tablas tal como las publica Liga1.pe: Apertura, Clausura y Acumulado.
    adjust = {"A": {}, "C": {}, "T": {}}
    if official and fixtures:
        adjust = compute_adjust(official, fixtures, prev.get("adjust"))
        out["adjust"] = adjust
        compA, compC = tally(fixtures, "A"), tally(fixtures, "C")
        shown_A = {i: compA[i]["pts"] + adjust["A"].get(i, 0) for i in IDS}
        stale = {r["id"]: [r["pts"], shown_A[r["id"]]] for r in official["A"] if r["pts"] != shown_A[r["id"]] and r["id"] not in adjust["T"]}
        out["notes"] = {"apertura_liga1pe": stale}
        if stale:
            checks.append({"tabla": "Apertura de Liga1.pe frente al Acumulado oficial (la página usa el Acumulado)", "coinciden": len(IDS) - len(stale), "de": len(IDS),
                           "diferencias": [f"{k}: Liga1.pe {v[0]} frente a {v[1]}" for k, v in stale.items()]})
        ok, diffs = compare(official["C"], compC, adjust.get("C"))
        checks.append({"tabla": "Liga1.pe C vs partidos", "coinciden": ok, "de": len(IDS), "diferencias": diffs})
        both = {i: {"pj": compA[i]["pj"] + compC[i]["pj"], "pts": compA[i]["pts"] + compC[i]["pts"]} for i in IDS}
        tot_adj = {i: adjust["A"].get(i, 0) + adjust["C"].get(i, 0) + adjust["T"].get(i, 0) for i in IDS}
        ok, diffs = compare(official["T"], both, tot_adj)
        checks.append({"tabla": "Liga1.pe Acumulado vs partidos", "coinciden": ok, "de": len(IDS), "diferencias": diffs})
        if any(adjust.values()):
            print("Ajustes por sanción:", adjust)
    if fixtures:
        for src, tabs in others.items():
            for torneo, rows in tabs.items():
                if torneo in ("A", "C"):
                    ok, diffs = compare(rows, tally(fixtures, torneo), adjust.get(torneo))
                elif torneo == "T":
                    cA, cC = tally(fixtures, "A"), tally(fixtures, "C")
                    both = {i: {"pj": cA[i]["pj"] + cC[i]["pj"], "pts": cA[i]["pts"] + cC[i]["pts"]} for i in IDS}
                    ok, diffs = compare(rows, both, {i: adjust["A"].get(i, 0) + adjust["C"].get(i, 0) + adjust["T"].get(i, 0) for i in IDS})
                else:
                    continue
                checks.append({"tabla": f"{src} {torneo} vs partidos", "coinciden": ok, "de": len(IDS), "diferencias": diffs})
    for c in checks:
        print(f'  control {c["tabla"]}: {c["coinciden"]}/{c["de"]}', *c["diferencias"][:6], sep="\n      ")

    # 5) Universitario: noticias, calendario y próximo partido
    uni = dict(out.get("uni") or {})
    try:
        home = get(UNI_SITE + "/")
        news = enrich_news(parse_news(home))
        if not news:
            raise ValueError("sin noticias legibles")
        uni["news"] = news
        log("universitario.pe noticias", UNI_SITE + "/noticias", True, f"{len(news)} notas, la más reciente {news[0]['date']}")
        rows = extract_uni_matches(home)
        try:
            cal = extract_uni_matches(get(UNI_SITE + "/calendario"))
            rows = cal if len(cal) > len(rows) else rows
        except Exception as e:  # noqa: BLE001
            print("  calendario aparte no disponible:", e)
        block = uni_block(rows, datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"))
        if block["matches"]:
            uni.update(block)
            nxt = block["next"]
            log("universitario.pe calendario", UNI_SITE + "/calendario", True,
                f'{block["matches"]} partidos del primer equipo; próximo: {nxt and (nxt["stage"] + " " + str(nxt["home"]) + " vs " + str(nxt["away"]))}')
        else:
            log("universitario.pe calendario", UNI_SITE + "/calendario", False, "sin partidos legibles")
    except Exception as e:  # noqa: BLE001
        log("universitario.pe noticias", UNI_SITE, False, str(e)[:200])
    uni["source"] = UNI_SITE
    out["uni"] = uni

    out.update({"season": 2026, "updated_at": now.isoformat(timespec="minutes"), "sources": sources, "checks": checks,
                "complete": bool(out.get("fixtures"))})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Escrito {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB), fuentes OK: {sum(s['ok'] for s in sources)}/{len(sources)}")
    return 0 if out.get("fixtures") else 1


if __name__ == "__main__":
    sys.exit(main())
