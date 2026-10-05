/**
 * Receptor de eventos anónimos de IA Radar (Google Apps Script).
 *
 * Qué guarda: fecha (hora de Lima), nombre del evento, página y, si existen, taller y canal.
 * Qué no guarda: nombres, correos, teléfonos, IP ni identificadores de navegador.
 *
 * Puesta en marcha (5 minutos):
 * 1. Crea una hoja de cálculo de Google nueva y abre Extensiones > Apps Script.
 * 2. Pega este archivo completo y guarda.
 * 3. Implementar > Nueva implementación > Tipo: Aplicación web.
 *    Ejecutar como: Yo. Quién tiene acceso: Cualquier persona.
 * 4. Copia la URL que termina en /exec y pégala en site/content/talleres.json, campo analitica.endpoint.
 * 5. Los eventos aparecen en la pestaña "eventos". Para ver totales, crea una tabla dinámica por la columna "evento".
 */
const HOJA = "eventos";
const ENCABEZADO = ["fecha_lima", "evento", "pagina", "taller", "canal", "detalle"];

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!d.e) return salida({ ok: false, error: "sin evento" });
    const libro = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);
    if (hoja.getLastRow() === 0) hoja.appendRow(ENCABEZADO);
    const p = d.p || {};
    const fecha = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd HH:mm:ss");
    hoja.appendRow([fecha, corto(d.e), corto(d.page), corto(p.taller), corto(p.canal), corto(p.to || p.nivel || "")]);
    return salida({ ok: true });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  }
}

function corto(v) {
  return String(v == null ? "" : v).slice(0, 120);
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
