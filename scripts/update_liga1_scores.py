#!/usr/bin/env python3
"""Refresca marcadores de Liga 1 en fechas de partido, sin ejecutar el ETL completo.

Solo escribe live.json si cambian resultados, marcadores en vivo, horarios
o tablas oficiales. Ante un error conserva el archivo publicado.
"""
import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

from common import LIMA, ROOT

DATA = ROOT / "site/liga1/data/live.json"
RESULTS_URL = "https://www.futbolperuano.com/liga-1/clausura/"
OFFICIAL_URL = "https://liga1.pe/tabla-de-posiciones/"


def load_data():
    try:
        data = json.loads(DATA.read_text(encoding="utf-8"))
        if data.get("complete") and len(data.get("fixtures", [])) >= 300:
            return data
    except (OSError, ValueError):
        pass
    return None


def is_match_window(data, now):
    """Desde 90 minutos antes hasta 8 horas después de cada inicio pendiente."""
    for fixture in data["fixtures"]:
        if fixture.get("t") != "C" or fixture.get("hg") is not None:
            continue
        date, hour = fixture.get("date"), fixture.get("time")
        if not date or not hour:
            continue
        try:
            start = datetime.fromisoformat(f"{date}T{hour}").replace(tzinfo=LIMA)
        except ValueError:
            continue
        if start - timedelta(minutes=90) <= now <= start + timedelta(hours=8):
            return True
    return False


def key(match):
    return (match["t"], match["f"], match["h"], match["a"])


def refresh(data, now):
    # Importación tardía: la comprobación de horario no necesita BeautifulSoup.
    from fetch_liga1 import (get, parse_matches, valid_fixtures, parse_official,
                             infer_missing, compute_adjust, tally, compare, IDS)

    new_clausura = parse_matches(get(RESULTS_URL, tries=2, timeout=20), "C")
    if not valid_fixtures(new_clausura):
        raise ValueError(f"Calendario fuente incompleto: {len(new_clausura)} partidos")

    previous = data["fixtures"]
    old_clausura = [f for f in previous if f["t"] == "C"]
    new_index = {key(f): f for f in new_clausura}
    if len(old_clausura) != len(new_clausura) or {key(f) for f in old_clausura} != set(new_index):
        raise ValueError("Cambió la estructura del fixture. Se conserva el último dato hasta la revisión diaria.")

    fixtures = []
    changes = []
    for old in previous:
        f = dict(old)
        if f["t"] == "C":
            fresh = new_index[key(f)]
            for field in ("date", "time"):
                if fresh.get(field):
                    f[field] = fresh[field]
            # No borrar un resultado confirmado si la web de origen retrocede.
            if fresh.get("hg") is not None and fresh.get("ag") is not None:
                if (f.get("hg"), f.get("ag")) != (fresh["hg"], fresh["ag"]):
                    changes.append(f'{f["h"]} {fresh["hg"]}-{fresh["ag"]} {f["a"]}')
                f["hg"], f["ag"] = fresh["hg"], fresh["ag"]
            # Los resultados parciales no se suman como partidos finalizados.
            if f.get("hg") is None and fresh.get("live"):
                f["live"] = fresh["live"]
            else:
                f.pop("live", None)
        fixtures.append(f)

    official = data.get("official")
    try:
        fresh_official = parse_official(get(OFFICIAL_URL, tries=1, timeout=15))
        if fresh_official:
            official = fresh_official
    except Exception as exc:
        print(f"Tabla oficial temporalmente no disponible: {exc}")

    if official:
        inferred = infer_missing(fixtures, official["C"], now.date().isoformat())
        changes.extend(f"Inferido: {label}" for label in inferred)

    updated = dict(data)
    updated["fixtures"] = fixtures
    if official:
        updated["official"] = official
        updated["adjust"] = compute_adjust(official, fixtures, data.get("adjust"))
        comp_a, comp_c = tally(fixtures, "A"), tally(fixtures, "C")
        adj = updated["adjust"]
        shown_a = {i: comp_a[i]["pts"] + adj.get("A", {}).get(i, 0) for i in IDS}
        stale = {r["id"]: [r["pts"], shown_a[r["id"]]] for r in official["A"]
                 if r["pts"] != shown_a[r["id"]] and r["id"] not in adj.get("T", {})}
        updated["notes"] = {"apertura_liga1pe": stale}

        checks = [c for c in data.get("checks", [])
                  if c.get("tabla") not in ("Liga1.pe C vs partidos", "Liga1.pe Acumulado vs partidos")]
        ok, diffs = compare(official["C"], comp_c, adj.get("C"))
        checks.append({"tabla": "Liga1.pe C vs partidos", "coinciden": ok, "de": len(IDS), "diferencias": diffs})
        both = {i: {"pj": comp_a[i]["pj"] + comp_c[i]["pj"],
                    "pts": comp_a[i]["pts"] + comp_c[i]["pts"]} for i in IDS}
        total_adj = {i: sum(adj.get(t, {}).get(i, 0) for t in ("A", "C", "T")) for i in IDS}
        ok, diffs = compare(official["T"], both, total_adj)
        checks.append({"tabla": "Liga1.pe Acumulado vs partidos", "coinciden": ok, "de": len(IDS), "diferencias": diffs})
        updated["checks"] = checks

    significant = ("fixtures", "official", "adjust", "notes")
    if all(updated.get(field) == data.get(field) for field in significant):
        print("Sin cambios en partidos, horarios ni tablas; no se requiere despliegue.")
        return False

    updated["updated_at"] = now.isoformat(timespec="seconds")
    sources = [s for s in data.get("sources", []) if s.get("name") != "Marcadores Clausura (revisión rápida)"]
    sources.append({"name": "Marcadores Clausura (revisión rápida)",
                    "url": RESULTS_URL, "ok": True,
                    "detail": "; ".join(changes[:12]) if changes else "Actualización de marcador en vivo, horario o tabla",
                    "at": updated["updated_at"]})
    updated["sources"] = sources
    DATA.write_text(json.dumps(updated, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Datos actualizados: {', '.join(changes) if changes else 'cambio en fuente'}")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check-window", action="store_true",
                        help="Devuelve 0 si hay un partido en la ventana de revisión; 1 en caso contrario")
    parser.add_argument("--force", action="store_true", help="Revisa aunque no haya un partido programado")
    args = parser.parse_args()

    data = load_data()
    if not data:
        print("No hay datos base completos; el proceso diario debe inicializarlos.")
        return 1
    now = datetime.now(LIMA)
    active = is_match_window(data, now)
    if args.check_window:
        print(f"Ventana de partido activa: {active}; hora de Lima: {now.isoformat(timespec='minutes')}")
        return 0 if active else 1
    if not active and not args.force:
        print("No hay partidos en ventana de actualización.")
        return 0
    try:
        refresh(data, now)
    except Exception as exc:
        print(f"Error consultando resultados; no se reemplazó el archivo publicado: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
