#!/usr/bin/env python3
"""Ejecuta el lector de goleadores en modo resumen (no escribe archivos)."""
import subprocess
import sys

sys.exit(subprocess.call([sys.executable, "scripts/fetch_liga1_players.py", "--dump"]))
