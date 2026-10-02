"""Anuncios oficiales de Google DeepMind: feeds de su blog (fuente de nivel 1)."""
from feeds import fetch_feeds

SOURCES = ['Google DeepMind', 'Google AI']


def fetch():
    return fetch_feeds(SOURCES)
