"""Anuncios oficiales de OpenAI: feeds de su blog (fuente de nivel 1)."""
from feeds import fetch_feeds

SOURCES = ['OpenAI']


def fetch():
    return fetch_feeds(SOURCES)
