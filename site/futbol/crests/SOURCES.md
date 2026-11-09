# Escudos de clubes

Assets locales vinculados por competición y nombre exacto del club. No se usa coincidencia difusa.

Fuentes de las colecciones de imágenes:
- https://github.com/diegosy12/Escudos_Futbol_2025-26
- https://github.com/luukhopman/football-logos
- https://github.com/juanmaioli/EscudosDeFutbol
- https://github.com/football-logos/football-crests
- https://github.com/JoseArroyave/football-logos

`manifest.json` registra para cada identidad el archivo seleccionado, la ruta de origen y SHA-256. Las versiones de escudos corresponden al archivo de cada colección; no se afirma que todos sean la última variante de marca del club. Las marcas pertenecen a sus titulares y se muestran con fines de identificación editorial.

Las imágenes faltantes se pueden completar con `scripts/update_cancha_crests.py`, que verifica la identidad exacta en ESPN y conserva la procedencia. No se asignan escudos de clubes con nombres parecidos. Se distingue Universidad Católica de Ecuador de la de Chile, y Libertad de Ecuador de la de Paraguay.
