"""Otros laboratorios y prensa especializada (nivel 4 de evidencia salvo laboratorios): feeds RSS/Atom."""
from feeds import FEEDS, fetch_feeds

MAIN = {"OpenAI", "Anthropic", "Google DeepMind", "Google AI", "xAI"}
SOURCES = {f[1] for f in FEEDS} - MAIN


def fetch():
    return fetch_feeds(SOURCES)
