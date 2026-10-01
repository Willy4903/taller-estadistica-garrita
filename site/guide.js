/* Guía de IA: generativa, agéntica, ética, normatividad y glosario.
   Contenido de referencia (no se actualiza solo); las noticias de regulación sí se leen de data/news.json. */
(function () {
  "use strict";

  const REVIEWED = "octubre de 2026";
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ico = (n, c = "") => `<i class="ui ${c}" style="--i:url(icons/ui/${n}.svg)" aria-hidden="true"></i>`;
  const tip = (t) => ` data-tip="${esc(t)}" tabindex="0"`;
  const root = document.getElementById("guide-root");
  if (!root) return;

  /* ---------- contenido ---------- */
  const GEN_STEPS = [
    { ic: "database", t: "1. Datos y entrenamiento", d: "El modelo se entrena con enormes volúmenes de texto, imágenes, audio o código para aprender patrones del lenguaje y del mundo. No guarda los documentos como una biblioteca: ajusta miles de millones de parámetros (números) que codifican esos patrones." },
    { ic: "file-text", t: "2. Tokenización", d: "El texto se divide en fragmentos llamados tokens (palabras o pedazos de palabra). Un token equivale en promedio a unas tres cuartas partes de una palabra en inglés; en español suele ser algo menos. Los precios y los límites de contexto se miden en tokens." },
    { ic: "brain-circuit", t: "3. Atención (transformers)", d: "La arquitectura transformer permite que cada token \"preste atención\" a los demás tokens del contexto para entender relaciones, como a qué se refiere un pronombre. Es la base de casi todos los modelos actuales." },
    { ic: "zap", t: "4. Predicción del siguiente token", d: "Al responder, el modelo calcula la probabilidad de cada posible siguiente token y elige uno (con algo de azar controlado por la temperatura). Repite el proceso token a token hasta completar la respuesta. Por eso puede sonar convincente y aun así equivocarse." },
    { ic: "user-check", t: "5. Ajuste y alineación", d: "Después del preentrenamiento se refina con ejemplos y retroalimentación humana (por ejemplo RLHF) para que siga instrucciones, sea útil y evite contenido dañino. Los modelos de razonamiento además aprenden a \"pensar\" paso a paso antes de contestar." },
    { ic: "message-square", t: "6. Uso (inferencia)", d: "Tú escribes una instrucción (prompt) y el modelo genera la salida. La calidad depende del contexto que le des, de los documentos que le conectes (RAG) y de la verificación humana posterior." },
  ];
  const GEN_CAN = ["Redactar, resumir y traducir textos", "Generar y revisar código", "Crear imágenes, audio y video sintéticos", "Responder preguntas sobre documentos que le proporcionas", "Analizar imágenes, tablas y archivos (modelos multimodales)"];
  const GEN_LIMITS = [
    ["Alucinaciones", "Puede inventar datos, citas o fuentes con total seguridad. Verifica todo lo importante."],
    ["Sesgos", "Reproduce sesgos presentes en sus datos de entrenamiento."],
    ["Privacidad", "Lo que escribes puede almacenarse o usarse según las condiciones del servicio; no pegues datos sensibles."],
    ["Propiedad intelectual", "Hay debates y litigios abiertos sobre datos de entrenamiento y derechos de autor de lo generado."],
    ["Contenido sintético", "Facilita la desinformación y los deepfakes; por eso las normas exigen etiquetarlo."],
  ];

  const AGENT_STEPS = [
    { ic: "target", t: "Objetivo", d: "Recibe una meta (\"consigue las 5 mejores ofertas y reserva la más barata\"), no solo una pregunta. Define el éxito y los límites." },
    { ic: "list-checks", t: "Planificar", d: "Descompone la meta en pasos, decide el orden y qué herramientas necesita. Puede replanificar si algo falla." },
    { ic: "wrench", t: "Actuar con herramientas", d: "Llama a APIs, busca en la web, ejecuta código, edita archivos o usa un navegador. Aquí es donde pasa de hablar a hacer." },
    { ic: "eye", t: "Observar", d: "Lee el resultado de cada acción (respuesta de una API, error, página web) y evalúa si se acercó al objetivo." },
    { ic: "database", t: "Memoria y reflexión", d: "Guarda lo aprendido durante la tarea (y a veces entre sesiones) para no repetir errores y mantener el contexto." },
    { ic: "user-check", t: "Entrega o aprobación humana", d: "Termina con el resultado o se detiene a pedir permiso antes de acciones sensibles (pagar, enviar, borrar). Es el punto clave de control." },
  ];
  const AUTONOMY = [
    ["N0", "Asistente", "Solo responde preguntas. No actúa.", "#22d3ee"],
    ["N1", "Sugiere", "Propone acciones; tú las ejecutas.", "#34d399"],
    ["N2", "Ejecuta con aprobación", "Actúa, pero pide confirmación en cada paso importante.", "#fbbf24"],
    ["N3", "Ejecuta y avisa", "Actúa por su cuenta y te informa; tú puedes revertir.", "#fb923c"],
    ["N4", "Autónomo", "Opera sin supervisión. Poco recomendable en contextos de alto riesgo.", "#f43f9e"],
  ];
  const AGENT_RISKS = [
    ["Acciones irreversibles", "Borrar datos, enviar dinero o correos no se puede deshacer.", "Aprobación humana y permisos de solo lectura por defecto."],
    ["Inyección de instrucciones", "Una página o documento puede contener órdenes ocultas que desvían al agente.", "Tratar todo contenido externo como no confiable; aislar herramientas."],
    ["Errores en cascada", "Un fallo temprano se arrastra y se amplifica en los pasos siguientes.", "Puntos de control, pruebas y límites de pasos y de gasto."],
    ["Exceso de permisos", "Un agente con acceso amplio puede causar mucho daño si se equivoca.", "Principio de mínimo privilegio y credenciales acotadas."],
    ["Falta de trazabilidad", "Si no queda registro, nadie puede explicar qué hizo y por qué.", "Registros de acciones auditables y responsable humano designado."],
  ];

  const ETHICS = [
    { ic: "eye", c: "#22d3ee", t: "Transparencia y explicabilidad", q: "¿Sabe la persona que interactúa con una IA y por qué se tomó una decisión?", a: "Avisa cuando algo lo genera una IA, documenta datos y limitaciones, y ofrece explicaciones comprensibles." },
    { ic: "users", c: "#8b5cf6", t: "Equidad y no discriminación", q: "¿Funciona igual de bien para todos los grupos de personas?", a: "Prueba el sistema con distintos grupos, revisa los datos de entrenamiento y mide diferencias de error." },
    { ic: "lock", c: "#f43f9e", t: "Privacidad y protección de datos", q: "¿Se usan solo los datos necesarios y con base legal?", a: "Minimiza datos personales, anonimiza, pide consentimiento y evita pegar información sensible en servicios externos." },
    { ic: "shield-check", c: "#34d399", t: "Seguridad y robustez", q: "¿Resiste errores, abusos y ataques?", a: "Realiza pruebas adversarias (red teaming), monitorea en producción y define un plan ante fallos." },
    { ic: "gavel", c: "#fbbf24", t: "Responsabilidad y rendición de cuentas", q: "¿Quién responde si algo sale mal?", a: "Asigna dueños claros, conserva registros y establece canales de reclamo y reparación." },
    { ic: "user-check", c: "#fb923c", t: "Supervisión humana", q: "¿Puede una persona intervenir, corregir o detener el sistema?", a: "Mantén a una persona con autoridad real en decisiones que afecten derechos, salud, dinero o libertad." },
    { ic: "leaf", c: "#a3e635", t: "Sostenibilidad", q: "¿Compensa el costo ambiental del modelo para este uso?", a: "Elige el modelo más pequeño que resuelva la tarea, reutiliza resultados y mide el consumo de energía y agua." },
    { ic: "book-open", c: "#4f8cff", t: "Honestidad e integridad", q: "¿Se respeta la autoría y se evita engañar?", a: "No presentes como propio lo generado donde se exige autoría, cita fuentes verificadas y respeta licencias." },
  ];
  const CHECKLIST = [
    "Verifiqué los datos, cifras y citas importantes con una fuente confiable.",
    "No incluí datos personales, confidenciales ni credenciales en el prompt.",
    "Revisé las condiciones del servicio: dónde se guardan y si se usan para entrenar.",
    "Indiqué cuando el contenido fue generado o asistido por IA, si corresponde.",
    "Comprobé que no vulnera derechos de autor ni licencias.",
    "Revisé el resultado en busca de sesgos o lenguaje discriminatorio.",
    "Una persona responsable revisó y aprobó el resultado antes de usarlo.",
    "Si es un agente, limité sus permisos y exigí aprobación para acciones irreversibles.",
    "Guardé un registro de qué herramienta y qué instrucciones se usaron.",
    "Confirmé que el uso cumple las normas de mi organización y de mi país.",
  ];

  const FRAMEWORKS = [
    { r: "mundo", ic: "globe", c: "#22d3ee", t: "Recomendación de la UNESCO sobre la ética de la IA", y: "2021", d: "Primer instrumento normativo mundial sobre ética de la IA, adoptado por 193 Estados miembros. Parte de derechos humanos, dignidad, diversidad y sostenibilidad.", u: "https://www.unesco.org/es/artificial-intelligence/recommendation-ethics" },
    { r: "mundo", ic: "landmark", c: "#8b5cf6", t: "Principios de la OCDE sobre IA", y: "2019 (actualizados en 2024)", d: "Cinco principios: crecimiento inclusivo, valores centrados en las personas, transparencia, robustez y rendición de cuentas. Base de muchas leyes nacionales.", u: "https://oecd.ai/en/ai-principles" },
    { r: "mundo", ic: "clipboard-check", c: "#34d399", t: "NIST AI Risk Management Framework", y: "2023", d: "Marco voluntario de EE. UU. para gestionar riesgos de IA con cuatro funciones: Gobernar, Mapear, Medir y Gestionar. Muy usado por empresas.", u: "https://www.nist.gov/itl/ai-risk-management-framework" },
    { r: "mundo", ic: "list-checks", c: "#fbbf24", t: "ISO/IEC 42001", y: "2023", d: "Norma internacional certificable para un sistema de gestión de IA: políticas, roles, evaluación de riesgos y mejora continua dentro de una organización.", u: "https://www.iso.org/standard/81230.html" },
    { r: "mundo", ic: "flag", c: "#f43f9e", t: "Convenio Marco del Consejo de Europa sobre IA", y: "2024", d: "Primer tratado internacional jurídicamente vinculante sobre IA, derechos humanos, democracia y Estado de derecho. Está abierto a países fuera de Europa.", u: "https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence" },
    { r: "ue", ic: "scale", c: "#8b5cf6", t: "Reglamento de IA de la Unión Europea (AI Act)", y: "Reglamento (UE) 2024/1689", d: "Primera ley integral sobre IA. Clasifica los sistemas por riesgo (inaceptable, alto, limitado y mínimo), prohíbe ciertas prácticas y fija obligaciones para modelos de propósito general. Las multas llegan hasta 35 millones de euros o 7 % de la facturación mundial.", u: "https://artificialintelligenceact.eu/" },
    { r: "ue", ic: "lock", c: "#f43f9e", t: "RGPD y decisiones automatizadas", y: "2018", d: "El Reglamento General de Protección de Datos se aplica a la IA que trata datos personales y reconoce derechos frente a decisiones basadas únicamente en tratamiento automatizado.", u: "https://eur-lex.europa.eu/eli/reg/2016/679/oj" },
    { r: "peru", ic: "landmark", c: "#fb923c", t: "Ley N.º 31814: promoción del uso de la IA", y: "2023", d: "Ley peruana que promueve el uso de la inteligencia artificial en favor del desarrollo económico y social. Adopta un enfoque basado en riesgos y principios como supervisión humana, transparencia, seguridad y protección de datos. La autoridad técnica-normativa recae en la Presidencia del Consejo de Ministros (Secretaría de Gobierno y Transformación Digital).", u: "https://www.gob.pe/institucion/pcm/normas-legales" },
    { r: "peru", ic: "file-text", c: "#22d3ee", t: "Reglamento de la Ley 31814", y: "2025", d: "Desarrolla la ley: obligaciones según el nivel de riesgo, uso de IA en el sector público y en el privado, y medidas de gobernanza. Se aprobó mediante decreto supremo en 2025; consulta el texto vigente en el Diario Oficial El Peruano.", u: "https://www.gob.pe/institucion/pcm/normas-legales" },
    { r: "peru", ic: "lock", c: "#34d399", t: "Ley de Protección de Datos Personales (Ley 29733)", y: "2011, con reglamento actualizado", d: "Aplica a la IA que trata datos personales: consentimiento, finalidad, proporcionalidad y derechos ARCO (acceso, rectificación, cancelación y oposición). La supervisa la Autoridad Nacional de Protección de Datos Personales.", u: "https://www.gob.pe/anpd" },
    { r: "peru", ic: "target", c: "#fbbf24", t: "Estrategia Nacional de IA y transformación digital", y: "2021 en adelante", d: "Marco de políticas públicas del Perú para el desarrollo y uso de la IA, la gobernanza de datos y la ciudadanía digital.", u: "https://www.gob.pe/institucion/pcm/informes-publicaciones/" },
    { r: "otros", ic: "flag", c: "#fbbf24", t: "China: medidas sobre IA generativa y etiquetado", y: "2023 y 2025", d: "Reglas específicas para servicios de IA generativa (vigentes desde agosto de 2023) y obligación de etiquetar el contenido generado por IA (desde septiembre de 2025).", u: "https://www.cac.gov.cn/" },
    { r: "otros", ic: "landmark", c: "#34d399", t: "Estados Unidos: enfoque sectorial y estatal", y: "En evolución", d: "No existe una ley federal única de IA: se regula por sectores y por estados, con guías como el marco NIST. Las políticas federales han cambiado con las administraciones; verifica la situación actual.", u: "https://www.nist.gov/artificial-intelligence" },
  ];
  const AIACT_TIMELINE = [
    ["1 ago 2024", "Entra en vigor", "El reglamento empieza a existir; las demás reglas se activan por etapas."],
    ["2 feb 2025", "Prácticas prohibidas y alfabetización en IA", "Se prohíben usos de riesgo inaceptable y las organizaciones deben formar a su personal en IA."],
    ["2 ago 2025", "Modelos de propósito general", "Obligaciones de transparencia, documentación técnica y derechos de autor para quienes publican modelos grandes, y estructura de gobernanza."],
    ["2 ago 2026", "Aplicación general", "Fecha prevista para las reglas de sistemas de alto riesgo (Anexo III) y las obligaciones de transparencia. La Comisión Europea propuso aplazar parte de estas fechas; verifica el estado vigente."],
    ["2 ago 2027", "Alto riesgo en productos regulados", "Aplican las reglas para IA integrada en productos ya regulados (por ejemplo dispositivos médicos o maquinaria)."],
  ];
  const TIERS = {
    prohibido: { n: "Riesgo inaceptable", c: "#f43f9e", ic: "ban", m: "Prohibido en la UE. No se puede comercializar ni usar (salvo excepciones muy limitadas)." },
    alto: { n: "Alto riesgo", c: "#fb923c", ic: "octagon-alert", m: "Permitido con requisitos estrictos: gestión de riesgos, datos de calidad, documentación, registro, supervisión humana, precisión y ciberseguridad." },
    limitado: { n: "Riesgo limitado", c: "#fbbf24", ic: "triangle-alert", m: "Permitido con obligaciones de transparencia: avisar que se interactúa con una IA o que el contenido es sintético." },
    minimo: { n: "Riesgo mínimo", c: "#34d399", ic: "circle-check", m: "Sin obligaciones específicas del reglamento. Se recomiendan buenas prácticas y códigos de conducta voluntarios." },
    gpai: { n: "Modelo de propósito general", c: "#8b5cf6", ic: "brain-circuit", m: "Obligaciones propias: documentación técnica, información para quienes lo integran, política de derechos de autor y resumen de los datos de entrenamiento. Con riesgo sistémico, evaluaciones y reporte de incidentes." },
    depende: { n: "Depende del uso", c: "#22d3ee", ic: "scale", m: "El nivel lo define el sector y la decisión que toma el agente. Evalúa caso por caso." },
  };
  const USE_CASES = [
    ["Filtro antispam o recomendador de música", "minimo", "No afecta derechos de forma significativa. Aplica buenas prácticas de privacidad."],
    ["Asistente de código para el equipo", "minimo", "Revisa licencias del código generado y evita exponer secretos o credenciales."],
    ["Chatbot de atención al cliente", "limitado", "Debes informar que la persona habla con una IA y ofrecer acceso a un humano."],
    ["Generar imágenes o videos para marketing", "limitado", "El contenido sintético o los deepfakes deben etiquetarse de forma clara."],
    ["Filtrar currículums y seleccionar personal", "alto", "Empleo es un ámbito de alto riesgo: exige supervisión humana, pruebas de sesgo y registros."],
    ["Evaluar solvencia o conceder créditos", "alto", "Afecta el acceso a servicios esenciales: requiere explicabilidad y control humano."],
    ["Calificar exámenes o decidir admisiones", "alto", "Educación es un ámbito de alto riesgo por el impacto en el futuro de las personas."],
    ["Apoyo al diagnóstico médico", "alto", "Suele ser dispositivo médico: requisitos de seguridad, validación clínica y supervisión profesional."],
    ["Puntuación social de la ciudadanía", "prohibido", "Evaluar a las personas por su conducta social para tratarlas distinto está prohibido."],
    ["Reconocer emociones de empleados o estudiantes", "prohibido", "Prohibido en el trabajo y la educación, salvo razones médicas o de seguridad."],
    ["Reconocimiento facial en tiempo real en la vía pública", "prohibido", "Identificación biométrica remota por la policía: prohibida salvo excepciones tasadas y con autorización."],
    ["Agente autónomo que compra y paga por ti", "depende", "Limita el gasto, exige aprobación humana en pagos y registra cada acción."],
    ["Publicar un modelo de lenguaje propio", "gpai", "Prepara documentación técnica, política de derechos de autor y evaluación de riesgos."],
  ];

  const GLOSSARY = [
    ["Agente de IA", "Sistema que persigue un objetivo de forma autónoma: planifica, usa herramientas y actúa, a diferencia de un chatbot que solo responde."],
    ["Alucinación", "Respuesta falsa o inventada que el modelo presenta con seguridad."],
    ["Alineación", "Proceso para que el comportamiento del modelo siga las intenciones y valores humanos."],
    ["API", "Interfaz que permite a un programa usar un servicio, por ejemplo llamar a un modelo de IA."],
    ["Benchmark", "Prueba estandarizada para comparar modelos (matemática, código, razonamiento, etc.)."],
    ["Contexto (ventana de)", "Cantidad máxima de tokens que el modelo puede considerar a la vez entre tu instrucción y su respuesta."],
    ["Deepfake", "Imagen, audio o video sintético que imita a una persona real."],
    ["Destilación", "Entrenar un modelo pequeño para imitar a uno grande, ganando velocidad y ahorro."],
    ["Embedding", "Representación numérica de un texto o imagen que permite medir su similitud de significado."],
    ["Fine-tuning (ajuste fino)", "Entrenamiento adicional de un modelo con datos propios para una tarea o estilo específico."],
    ["Guardrails", "Reglas y filtros que limitan lo que un modelo o agente puede decir o hacer."],
    ["IA generativa", "IA que crea contenido nuevo (texto, imagen, audio, video, código) a partir de lo aprendido."],
    ["IA agéntica", "IA con capacidad de actuar: planifica pasos, usa herramientas y ejecuta tareas con cierta autonomía."],
    ["Inferencia", "Momento en que el modelo ya entrenado genera una respuesta; es lo que se cobra por token."],
    ["LLM", "Modelo de lenguaje grande: red neuronal entrenada con enormes cantidades de texto."],
    ["MCP (Model Context Protocol)", "Protocolo abierto para conectar modelos y agentes con herramientas y fuentes de datos de forma estándar."],
    ["Mezcla de expertos (MoE)", "Arquitectura que activa solo una parte de los parámetros por token, ganando eficiencia."],
    ["Modelo abierto (open weights)", "Modelo cuyos pesos se publican para que otros lo descarguen, ejecuten y adapten, con licencias variables."],
    ["Multimodal", "Modelo que entiende o genera más de un tipo de dato: texto, imagen, audio o video."],
    ["Parámetros", "Números ajustables dentro de la red neuronal; más parámetros suelen implicar más capacidad y más costo."],
    ["Prompt", "Instrucción o contexto que se le da al modelo para guiar su respuesta."],
    ["Prompt injection", "Ataque que esconde instrucciones en un texto o página para desviar el comportamiento de un modelo o agente."],
    ["RAG", "Generación aumentada por recuperación: el modelo consulta documentos propios antes de responder, reduciendo errores."],
    ["Razonamiento (modelos de)", "Modelos que dedican tiempo a \"pensar\" en pasos intermedios antes de responder, útil en problemas difíciles."],
    ["Red teaming", "Prueba de ataque controlado para encontrar fallos y abusos de un sistema antes de que lo hagan terceros."],
    ["RLHF", "Aprendizaje por refuerzo con retroalimentación humana para que el modelo responda de forma más útil y segura."],
    ["Sesgo algorítmico", "Resultados sistemáticamente injustos para ciertos grupos, a menudo heredados de los datos."],
    ["Temperatura", "Parámetro que controla cuánta variación o azar hay al elegir el siguiente token."],
    ["Token", "Unidad mínima de texto que procesa un modelo: una palabra o un fragmento de palabra."],
    ["Transformer", "Arquitectura de red neuronal basada en atención, base de los modelos de lenguaje actuales."],
  ];

  const ROT = [["generativa", "#22d3ee"], ["agéntica", "#8b5cf6"], ["ética", "#f43f9e"], ["regulada", "#fbbf24"]];
  const MARQUEE = ["IA generativa", "IA agéntica", "Ética", "Normatividad", "Tokens", "RAG", "Multimodal", "Transformers", "Alineación", "Supervisión humana", "Agentes", "Razonamiento", "Privacidad", "Transparencia"];
  const COLORS = ["#22d3ee", "#8b5cf6", "#f43f9e", "#fbbf24", "#34d399", "#fb923c"];

  /* ---------- estructura ---------- */
  const TABS = [
    ["gen", "wand-sparkles", "IA generativa"], ["agent", "workflow", "IA agéntica"], ["etica", "scale", "Ética"],
    ["norma", "gavel", "Normatividad"], ["glos", "book-open", "Glosario"],
  ];
  const marq = MARQUEE.concat(MARQUEE).map((w, i) => `<span style="--c:${COLORS[i % COLORS.length]}">${esc(w)}</span>`).join("");

  root.innerHTML = `
    <div class="marquee" aria-hidden="true"><div class="marquee-in">${marq}</div></div>
    <div class="g-hero">
      <p class="g-kicker">${ico("sparkles")} Guía esencial de inteligencia artificial</p>
      <h2 class="mega">
        <span class="m-line">Entiende la</span>
        <span class="m-line"><span class="neon">IA</span> <span class="rot" id="g-rot" aria-live="polite">${ROT.map((r, i) => `<span class="${i ? "" : "on"}" style="--c:${r[1]}">${esc(r[0])}</span>`).join("")}</span></span>
      </h2>
      <p class="g-lead">Qué es la <b class="tk" style="--c:#22d3ee">IA generativa</b>, cómo funciona la <b class="tk" style="--c:#8b5cf6">IA agéntica</b>, qué dice la <b class="tk" style="--c:#fbbf24">normatividad</b> y cómo usarla con <b class="tk" style="--c:#f43f9e">ética</b>.</p>
    </div>
    <div class="seg g-tabs" id="g-tabs" role="tablist" aria-label="Temas de la guía">
      ${TABS.map((t, i) => `<button role="tab" class="${i ? "" : "on"}" data-t="${t[0]}" aria-selected="${i === 0}">${ico(t[1])}<span>${esc(t[2])}</span></button>`).join("")}
    </div>
    <div id="g-body" class="g-body"></div>
    <p class="g-note">${ico("info")} Contenido de referencia revisado en ${REVIEWED}. Las normas cambian: consulta siempre la fuente oficial antes de tomar decisiones legales.</p>`;

  const body = document.getElementById("g-body");
  const stepper = (items, id) => `<div class="stepper" id="${id}">
    <div class="steps">${items.map((s, i) => `<button class="step${i ? "" : " on"}" data-i="${i}" style="--c:${COLORS[i % COLORS.length]}"${tip(s.t + "\n" + s.d)}><span class="si">${ico(s.ic)}</span><span class="st">${esc(s.t.replace(/^\d+\.\s*/, ""))}</span></button>`).join("")}</div>
    <div class="step-detail fx" style="--a:${COLORS[0]}"><h4>${esc(items[0].t)}</h4><p>${esc(items[0].d)}</p></div></div>`;

  const panels = {
    gen() {
      return `<div class="g-grid g2">
        <article class="g-card fx" style="--a:#22d3ee"><span class="gi">${ico("wand-sparkles")}</span><h3>Qué es</h3>
          <p>La <b class="tk" style="--c:#22d3ee">IA generativa</b> crea contenido nuevo (texto, imágenes, audio, video o código) a partir de patrones aprendidos de grandes cantidades de datos. Responde a una instrucción, pero no actúa por sí sola.</p>
          <ul class="ticks">${GEN_CAN.map((x) => `<li>${ico("circle-check")}${esc(x)}</li>`).join("")}</ul></article>
        <article class="g-card fx" style="--a:#f43f9e"><span class="gi">${ico("triangle-alert")}</span><h3>Límites y riesgos</h3>
          <ul class="risks">${GEN_LIMITS.map((x) => `<li${tip(x[0] + "\n" + x[1])} tabindex="0"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></li>`).join("")}</ul></article>
      </div>
      <h3 class="g-h3">${ico("brain-circuit")} Cómo funciona, paso a paso <small>Toca o pasa el mouse por cada paso</small></h3>
      ${stepper(GEN_STEPS, "st-gen")}`;
    },
    agent() {
      return `<div class="g-grid g2">
        <article class="g-card fx" style="--a:#8b5cf6"><span class="gi">${ico("workflow")}</span><h3>Qué es</h3>
          <p>La <b class="tk" style="--c:#8b5cf6">IA agéntica</b> da un paso más: un agente recibe un objetivo, lo divide en pasos, usa herramientas (buscadores, APIs, código, navegador), recuerda lo que hizo y actúa con cierto grado de autonomía.</p>
          <div class="vs"><div><b class="tk" style="--c:#22d3ee">Generativa</b><span>Responde y crea contenido</span></div><div class="vs-x">vs.</div><div><b class="tk" style="--c:#8b5cf6">Agéntica</b><span>Decide, actúa y verifica</span></div></div></article>
        <article class="g-card fx" style="--a:#fbbf24"><span class="gi">${ico("user-check")}</span><h3>Niveles de autonomía</h3>
          <ol class="levels">${AUTONOMY.map((l) => `<li style="--c:${l[3]}"${tip(l[0] + " · " + l[1] + "\n" + l[2])}><b>${l[0]}</b><span>${esc(l[1])}</span></li>`).join("")}</ol></article>
      </div>
      <h3 class="g-h3">${ico("repeat")} El ciclo de un agente <small>Toca o pasa el mouse por cada etapa</small></h3>
      ${stepper(AGENT_STEPS, "st-agent")}
      <h3 class="g-h3">${ico("octagon-alert")} Riesgos y cómo controlarlos</h3>
      <div class="g-grid g3">${AGENT_RISKS.map((r, i) => `<article class="g-card sm fx" style="--a:${COLORS[(i + 2) % COLORS.length]}"><h4>${esc(r[0])}</h4><p>${esc(r[1])}</p><p class="fix">${ico("shield-check")}<span>${esc(r[2])}</span></p></article>`).join("")}</div>`;
    },
    etica() {
      let saved = [];
      try { saved = JSON.parse(localStorage.getItem("iar-checklist") || "[]"); } catch (e) { saved = []; }
      return `<div class="g-grid g4">${ETHICS.map((e) => `<article class="g-card sm fx" style="--a:${e.c}"${tip(e.t + "\nPregunta clave: " + e.q + "\nCómo aplicarlo: " + e.a)} tabindex="0"><span class="gi" style="--a:${e.c}">${ico(e.ic)}</span><h4>${esc(e.t)}</h4><p class="q">${esc(e.q)}</p></article>`).join("")}</div>
      <h3 class="g-h3">${ico("clipboard-check")} Lista de verificación para usar IA con responsabilidad <small>Tu avance se guarda en este navegador</small></h3>
      <div class="check-wrap fx" style="--a:#34d399">
        <div class="check-prog"><div class="bar"><i id="ck-bar"></i></div><b id="ck-txt"></b></div>
        <ul class="checks" id="ck-list">${CHECKLIST.map((c, i) => `<li><label><input type="checkbox" data-i="${i}" ${saved.includes(i) ? "checked" : ""}><span>${esc(c)}</span></label></li>`).join("")}</ul>
        <p class="check-msg" id="ck-msg"></p>
      </div>`;
    },
    norma() {
      return `<div class="seg g-sub" id="g-reg" role="group" aria-label="Ámbito">
          <button class="on" data-r="peru">Perú</button><button data-r="ue">Unión Europea</button><button data-r="mundo">Mundo</button><button data-r="otros">Otros países</button><button data-r="todos">Todos</button></div>
        <div class="g-grid g3" id="fw-grid"></div>
        <h3 class="g-h3">${ico("hourglass")} Calendario del Reglamento de IA de la UE</h3>
        <ol class="timeline">${AIACT_TIMELINE.map((x, i) => `<li class="fx" style="--a:${COLORS[i % COLORS.length]}"><time>${esc(x[0])}</time><b>${esc(x[1])}</b><span>${esc(x[2])}</span></li>`).join("")}</ol>
        <h3 class="g-h3">${ico("scale")} ¿Qué nivel de riesgo tiene tu uso de IA? <small>Verificador orientativo basado en el enfoque de la UE</small></h3>
        <div class="risk fx" style="--a:#8b5cf6"><div class="uses" id="uses">${USE_CASES.map((u, i) => `<button data-i="${i}"${i ? "" : ' class="on"'}>${esc(u[0])}</button>`).join("")}</div><div class="risk-out" id="risk-out"></div></div>
        <h3 class="g-h3">${ico("flag")} Noticias recientes de regulación y ética</h3>
        <div id="reg-news" class="reg-news"><p class="muted">Cargando noticias…</p></div>`;
    },
    glos() {
      return `<div class="g-tools"><label class="search">${ico("search")}<input type="search" id="gl-q" placeholder="Buscar un término (por ejemplo: token, RAG, agente)" aria-label="Buscar en el glosario"></label><span class="count" id="gl-n"></span></div>
        <div class="gloss" id="gl-list"></div>`;
    },
  };

  /* ---------- comportamiento ---------- */
  function wireStepper(id, items) {
    const box = document.getElementById(id);
    if (!box) return;
    const detail = box.querySelector(".step-detail");
    const set = (i) => {
      box.querySelectorAll(".step").forEach((b, k) => b.classList.toggle("on", k === i));
      detail.style.setProperty("--a", COLORS[i % COLORS.length]);
      detail.innerHTML = `<h4>${esc(items[i].t)}</h4><p>${esc(items[i].d)}</p>`;
    };
    box.querySelectorAll(".step").forEach((b) => {
      b.addEventListener("click", () => set(+b.dataset.i));
      b.addEventListener("mouseenter", () => set(+b.dataset.i));
      b.addEventListener("focus", () => set(+b.dataset.i));
    });
  }
  function wireChecklist() {
    const list = document.getElementById("ck-list");
    if (!list) return;
    const upd = () => {
      const boxes = [...list.querySelectorAll("input")];
      const done = boxes.filter((b) => b.checked).length, pct = Math.round((done / boxes.length) * 100);
      document.getElementById("ck-bar").style.width = pct + "%";
      document.getElementById("ck-txt").textContent = done + " de " + boxes.length + " (" + pct + "%)";
      document.getElementById("ck-msg").textContent = done === boxes.length ? "Listo: tu uso de IA cumple los puntos básicos de responsabilidad." : "Marca cada punto antes de usar o publicar contenido generado con IA.";
      try { localStorage.setItem("iar-checklist", JSON.stringify(boxes.map((b, i) => (b.checked ? i : -1)).filter((i) => i >= 0))); } catch (e) { /* sin almacenamiento */ }
    };
    list.addEventListener("change", upd);
    upd();
  }
  function wireNorma() {
    const grid = document.getElementById("fw-grid");
    const draw = (r) => {
      grid.innerHTML = FRAMEWORKS.filter((f) => r === "todos" || f.r === r).map((f) => `<article class="g-card sm fx" style="--a:${f.c}"${tip(f.t + "\n" + f.d)}>
        <span class="gi" style="--a:${f.c}">${ico(f.ic)}</span><h4>${esc(f.t)}</h4><p class="yr">${esc(f.y)}</p><p>${esc(f.d.length > 150 ? f.d.slice(0, 147).replace(/\s+\S*$/, "") + "…" : f.d)}</p>
        <a href="${esc(f.u)}" target="_blank" rel="noopener noreferrer">Fuente oficial ${ico("external-link")}</a></article>`).join("");
    };
    draw("peru");
    document.getElementById("g-reg").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      document.querySelectorAll("#g-reg button").forEach((x) => x.classList.toggle("on", x === b));
      draw(b.dataset.r);
    });
    const out = document.getElementById("risk-out");
    const show = (i) => {
      const u = USE_CASES[i], t = TIERS[u[1]];
      document.querySelectorAll("#uses button").forEach((b, k) => b.classList.toggle("on", k === i));
      out.style.setProperty("--a", t.c);
      out.innerHTML = `<span class="tier" style="--c:${t.c}">${ico(t.ic)}${esc(t.n)}</span><h4>${esc(u[0])}</h4><p>${esc(t.m)}</p><p class="why">${ico("lightbulb")}<span>${esc(u[2])}</span></p>`;
    };
    show(0);
    document.getElementById("uses").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(+b.dataset.i); });
    // noticias de regulación leídas de la actualización diaria
    fetch("data/news.json?v=" + Date.now()).then((r) => (r.ok ? r.json() : null)).then((d) => {
      const box = document.getElementById("reg-news");
      const items = ((d && d.items) || []).filter((n) => n.topic === "seguridad").slice(0, 4);
      box.innerHTML = items.length ? items.map((n, i) => `<a class="rn fx" style="--a:${COLORS[(i + 2) % COLORS.length]}" href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">
        <span class="rs">${esc(n.source)} · ${esc(new Date(n.published).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }))}</span><b>${esc(n.title_es || n.title)}</b>${ico("external-link")}</a>`).join("")
        : '<p class="muted">Aún no hay noticias de regulación en la última actualización.</p>';
    }).catch(() => { document.getElementById("reg-news").innerHTML = '<p class="muted">No se pudieron cargar las noticias.</p>'; });
  }
  function wireGlos() {
    const list = document.getElementById("gl-list"), q = document.getElementById("gl-q"), n = document.getElementById("gl-n");
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      const rows = GLOSSARY.filter((g) => !s || (g[0] + " " + g[1]).toLowerCase().includes(s));
      n.textContent = rows.length + (rows.length === 1 ? " término" : " términos");
      list.innerHTML = rows.map((g, i) => `<article class="gl fx" style="--a:${COLORS[i % COLORS.length]}"><b>${esc(g[0])}</b><span>${esc(g[1])}</span></article>`).join("") || '<p class="muted">Sin resultados. Prueba con otra palabra.</p>';
    };
    q.addEventListener("input", draw);
    draw();
  }
  function open(name) {
    body.innerHTML = panels[name]();
    body.dataset.t = name;
    if (name === "gen") wireStepper("st-gen", GEN_STEPS);
    if (name === "agent") wireStepper("st-agent", AGENT_STEPS);
    if (name === "etica") wireChecklist();
    if (name === "norma") wireNorma();
    if (name === "glos") wireGlos();
  }
  document.getElementById("g-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#g-tabs button").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
    open(b.dataset.t);
  });
  // permite enlazar a un tema: #guia-norma, #guia-etica...
  const fromHash = () => {
    const m = /^#guia-(gen|agent|etica|norma|glos)$/.exec(location.hash);
    if (!m) return false;
    const b = document.querySelector(`#g-tabs [data-t="${m[1]}"]`);
    if (b) b.click();
    document.getElementById("guia").scrollIntoView({ behavior: "smooth" });
    return true;
  };
  open("gen");
  fromHash();
  window.addEventListener("hashchange", fromHash);

  // palabra que rota en el título
  const rot = document.querySelectorAll("#g-rot span");
  if (rot.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let k = 0;
    setInterval(() => { rot[k].classList.remove("on"); k = (k + 1) % rot.length; rot[k].classList.add("on"); }, 2300);
  }
})();
