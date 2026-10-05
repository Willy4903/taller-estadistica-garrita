/* Talleres: formulario de inscripción y botones de contacto. Usa el WhatsApp o el correo definidos en content/talleres.json. */
(function () {
  "use strict";
  const I = window.IAR;
  if (!I) return;
  const { $, $$, track, journey } = I;

  I.siteCfg().then((cfg) => {
    const c = (cfg && cfg.contacto) || {};
    const direct = !!(c.whatsapp || c.email);

    // Botones "Consultar por mensaje": solo se muestran si hay un canal directo configurado.
    $$("[data-contact]").forEach((a) => {
      if (!direct) return;
      const l = I.contactLink(cfg, c.mensaje || "");
      a.href = l.href; a.hidden = false;
      if (l.kind === "whatsapp") { a.target = "_blank"; a.rel = "noopener"; a.textContent = "Consultar por WhatsApp"; }
    });

    const form = $("#enroll");
    if (!form) return;
    const st = $("#enroll-st");
    if (!direct && st) st.textContent = "Al enviar te llevamos a la web de WG IA Estratégica para completar tu inscripción.";

    let started = false;
    form.addEventListener("input", () => { if (!started) { started = true; track("formulario_iniciado", { taller: form.taller.value }); } });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nombre = form.nombre.value.trim(), medio = form.medio.value.trim();
      if (!nombre || !medio || !form.ok.checked) {
        st.textContent = "Completa tu nombre, tu correo o WhatsApp y acepta que te contactemos.";
        (!nombre ? form.nombre : !medio ? form.medio : form.ok).focus();
        return;
      }
      const opt = form.taller.options[form.taller.selectedIndex];
      const text = `${c.mensaje || "Hola, quiero información sobre el taller: "}${opt.textContent}. Soy ${nombre}. Mi contacto: ${medio}.${form.msg.value.trim() ? " " + form.msg.value.trim() : ""}`;
      const l = I.contactLink(cfg, text);
      // Solo se registra el evento y el taller; el nombre y el contacto van únicamente al canal de WG IA Estratégica.
      track("inscripcion_enviada", { taller: form.taller.value, canal: l.kind });
      journey.mark("inscripcion");
      st.textContent = l.kind === "web" ? "Te llevamos a la web de WG IA Estratégica para completar tu inscripción." : "Listo. Se abrió tu mensaje con los datos para enviarlo.";
      window.open(l.href, l.kind === "email" ? "_self" : "_blank", "noopener");
    });
  });
})();
