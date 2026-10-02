"""Traducción local al español (argostranslate) con correcciones de marca."""
import re
import sys

from common import clean


# El traductor automático deforma algunos nombres propios; se corrigen después de traducir.
ES_FIXES = [("Antrópico", "Anthropic"), ("Antrópica", "Anthropic"), ("Antropic", "Anthropic"), ("Antropico", "Anthropic")]


def fix_es(text):
    for bad, good in ES_FIXES:
        text = text.replace(bad, good)
    return text


_translate = None


def get_translator():
    """Traductor inglés->español local (argostranslate). Devuelve None si no está disponible."""
    global _translate
    if _translate is not None:
        return _translate or None
    try:
        import argostranslate.package as pkg
        import argostranslate.translate as tr

        def find():
            langs = {l.code: l for l in tr.get_installed_languages()}
            if "en" in langs and "es" in langs:
                t = langs["en"].get_translation(langs["es"])
                if t:
                    return t
            return None

        t = find()
        if t is None:
            pkg.update_package_index()
            cand = next(p for p in pkg.get_available_packages() if p.from_code == "en" and p.to_code == "es")
            pkg.install_from_path(cand.download())
            t = find()
        _translate = t.translate if t else False
    except Exception as e:  # sin traductor se muestra el original
        print(f"Traductor no disponible: {e}", file=sys.stderr)
        _translate = False
    return _translate or None


def translate_items(items, limit=200):
    """Traduce al español título y resumen de las noticias que aún no lo tienen."""
    pending = [i for i in items if not i.get("title_es")][:limit]
    if not pending:
        return 0
    tr = get_translator()
    if not tr:
        return 0
    done = 0
    for i in pending:
        try:
            i["title_es"] = fix_es(tr(i["title"]).strip())
            if i.get("summary"):
                i["summary_es"] = fix_es(tr(i["summary"]).strip())
            done += 1
        except Exception as e:
            print(f"No se pudo traducir '{i['title'][:50]}': {e}", file=sys.stderr)
    return done


def translate_descriptions(models, previous_models, limit=450):
    """Traduce al español las descripciones de los modelos; reutiliza las ya traducidas si no cambiaron."""
    prev = {m["id"]: m for m in previous_models}
    pending = []
    for m in models:
        old = prev.get(m["id"])
        if old and old.get("description") == m.get("description") and old.get("description_es"):
            m["description_es"] = fix_es(old["description_es"])
        elif m.get("description") and not m["id"].startswith("~") and not m["id"].endswith(":batch"):
            pending.append(m)
    if not pending:
        return 0
    tr = get_translator()
    if not tr:
        return 0
    done = 0
    for m in pending[:limit]:
        try:
            m["description_es"] = fix_es(tr(m["description"]).strip())
            done += 1
        except Exception as e:
            print(f"No se pudo traducir la descripción de {m['id']}: {e}", file=sys.stderr)
    return done
