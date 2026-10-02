"""arXiv cs.AI: artículos recientes (feed Atom oficial)."""
import re

from common import clean, fetch_text


ARXIV_URL = ("https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate"
             "&sortOrder=descending&max_results=25")


def collect_papers():
    """Últimos artículos de arXiv cs.AI (feed Atom oficial), con título y resumen traducidos."""
    import xml.etree.ElementTree as ET
    ns = {"a": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(fetch_text(ARXIV_URL))
    out = []
    for e in root.findall("a:entry", ns):
        g = lambda t: (e.findtext("a:" + t, "", ns) or "").strip()
        link = g("id")
        authors = [(a.findtext("a:name", "", ns) or "").strip() for a in e.findall("a:author", ns)]
        out.append({"title": re.sub(r"\s+", " ", g("title")), "summary": clean(g("summary"), 300),
                    "link": link, "published": g("published"),
                    "authors": ", ".join(authors[:3]) + (" y otros" if len(authors) > 3 else "")})
    return out



