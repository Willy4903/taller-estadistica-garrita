/* Biblioteca de modelos: proveedores, familias y versiones, y orientación de uso calculada con precio, contexto y capacidades. */
(function () {
  "use strict";
  const I_ROOT = window.IAR.ROOT;
  const { esc, nf, ico, fmtCtx, fmtPrice, fmtDate, daysAgo } = window.IAR;
  let models = [];
  const setModels = (m) => { models = m; thrCache = null; };

  // slug de OpenRouter -> [archivo de icono, nombre visible, color]
  const PROV = {
    openai: ["openai", "OpenAI", "#10a37f"], anthropic: ["anthropic", "Anthropic", "#d97757"], google: ["google", "Google", "#4285f4"],
    "meta-llama": ["meta", "Meta", "#0866ff"], mistralai: ["mistral", "Mistral AI", "#fa520f"], deepseek: ["deepseek", "DeepSeek", "#4d6bfe"],
    qwen: ["qwen", "Qwen", "#615ced"], "x-ai": ["xai", "xAI"], cohere: ["cohere", "Cohere", "#39a98c"], microsoft: ["microsoft", "Microsoft", "#00a4ef"],
    nvidia: ["nvidia", "NVIDIA", "#76b900"], amazon: ["aws", "Amazon", "#ff9900"], perplexity: ["perplexity", "Perplexity", "#22b8cd"],
    moonshotai: ["moonshot", "Moonshot AI"], "z-ai": ["zai", "Z.ai"], minimax: ["minimax", "MiniMax", "#f23f5d"], ai21: ["ai21", "AI21 Labs", "#e91e63"],
    baidu: ["baidu", "Baidu", "#2932e1"], tencent: ["tencent", "Tencent", "#0052d9"], bytedance: ["bytedance", "ByteDance", "#3c8cff"],
    "bytedance-seed": ["bytedance", "ByteDance Seed", "#3c8cff"], stepfun: ["stepfun", "StepFun", "#3b82f6"], inflection: ["inflection", "Inflection"],
    nousresearch: ["nousresearch", "Nous Research"], liquid: ["liquid", "Liquid AI"], "ibm-granite": ["ibm", "IBM", "#4589ff"], "arcee-ai": ["arcee", "Arcee AI", "#a78bfa"],
    inception: ["inception", "Inception"], openrouter: ["openrouter", "OpenRouter", "#6566f1"], huggingface: ["huggingface", "Hugging Face", "#ffd21e"],
    meta: ["meta", "Meta", "#0866ff"], xiaomi: ["xiaomimimo", "Xiaomi", "#ff6900"], "aion-labs": ["aionlabs", "Aion Labs"], inclusionai: ["antgroup", "inclusionAI", "#1677ff"],
    morph: ["morph", "Morph"], perceptron: ["perceptron", "Perceptron"], poolside: ["poolside", "Poolside"], relace: ["relace", "Relace"], sakana: ["sakana", "Sakana AI"],
    upstage: ["upstage", "Upstage", "#7c5cff"],
    alibaba: ["alibaba", "Alibaba", "#ff6a00"], thudm: ["zhipu", "Zhipu AI", "#3b82f6"], apple: ["apple", "Apple"], rekaai: ["reka", "Reka"],
  };
  const norm = (slug) => String(slug).replace(/^~/, "");
  const provName = (slug) => (PROV[norm(slug)] ? PROV[norm(slug)][1] : norm(slug));
  function provIcon(slug) {
    slug = norm(slug);
    const p = PROV[slug];
    if (p) {
      const col = p[2] ? "--c:" + p[2] + ";" : "";
      return `<span class="pi" style="${col}-webkit-mask-image:url(${I_ROOT}icons/${p[0]}.svg);mask-image:url(${I_ROOT}icons/${p[0]}.svg)" role="img" aria-label="${esc(p[1])}"></span>`;
    }
    return `<span class="pi mono" aria-hidden="true">${esc((slug[0] || "?").toUpperCase())}</span>`;
  }
  const provTag = (slug) => `<span class="provtag">${provIcon(slug)}<span>${esc(provName(slug))}</span></span>`;
  const INPUT_ES = { image: "imágenes", file: "archivos", audio: "audio", video: "video" };
  // ---- Nueva versión frente a la anterior de la misma familia ----
  function family(m) {
    let n = m.name.includes(": ") ? m.name.split(": ").slice(1).join(": ") : m.name;
    n = n.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\bv?\d+(\.\d+)*[a-z]?\b/g, " ")
      .replace(/\b(preview|beta|exp|experimental|latest|batch)\b/g, " ").replace(/[^a-z ]/g, " ");
    return norm(m.provider) + "|" + n.split(/\s+/).filter(Boolean).join(" ");
  }
  function versionPairs(list) {
    const groups = {};
    list.forEach((m) => { (groups[family(m)] = groups[family(m)] || []).push(m); });
    const out = [];
    Object.values(groups).forEach((g) => {
      g.sort((a, b) => b.created.localeCompare(a.created));
      const cur = g[0], prev = g.find((m) => m.created < cur.created && m.name !== cur.name);
      if (!prev || daysAgo(cur.created) > 90) return;
      const d = (a, b) => (a > 0 && b > 0 ? Math.round(((a - b) / b) * 100) : null);
      out.push({ cur, prev, dIn: d(cur.price_in, prev.price_in), dOut: d(cur.price_out, prev.price_out), same: cur.context === prev.context });
    });
    return out.sort((a, b) => b.cur.created.localeCompare(a.cur.created) || a.cur.name.localeCompare(b.cur.name));
  }
  // Excluye variantes (:batch, alias "~", enrutadores) para no contar dos veces el mismo modelo.
  function baseModels(list) {
    const ids = new Set(list.map((m) => m.id));
    return list.filter((m) => {
      if (m.id.startsWith("~") || m.provider === "openrouter" || m.id.endsWith(":batch")) return false;
      const root = m.id.split(":")[0];
      return !(m.id.includes(":") && ids.has(root));
    });
  }
  const between = (list, a, b) => list.filter((m) => { const d = daysAgo(m.created); return d >= a && d < b; });
  const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);
  const signed = (n) => (n > 0 ? "+" : "") + n + "%";
  const paid = (list) => list.filter((m) => m.price_in > 0);
  // Laboratorios y proveedores de primera línea (el resto queda en el comparador).
  const MAJOR = new Set(["openai", "anthropic", "google", "meta-llama", "meta", "mistralai", "deepseek", "qwen", "x-ai", "microsoft", "nvidia", "amazon",
    "moonshotai", "z-ai", "minimax", "cohere", "perplexity", "bytedance-seed", "tencent", "baidu", "xiaomi", "ibm-granite", "stepfun", "ai21", "alibaba"]);
  const isMajor = (m) => MAJOR.has(norm(m.provider));
  // ---- Para qué sirve cada modelo ----
  // Orientación calculada con precio, contexto y capacidades (no es una evaluación de calidad) más la descripción del proveedor.
  let thrCache = null;
  function thr() {
    if (thrCache) return thrCache;
    const b = models.filter((m) => isMajor(m) && m.price_in > 0 && m.price_out > 0).map((m) => (m.price_in * 3 + m.price_out) / 4).sort((x, y) => x - y);
    thrCache = { lo: b[Math.floor(b.length / 3)] || 0.6, hi: b[Math.floor((b.length * 2) / 3)] || 3 };
    return thrCache;
  }
  const money = (v) => (v == null ? "n/d" : v === 0 ? "Gratis" : v < 0.01 ? "menos de $0.01" : "$" + v.toFixed(v < 1 ? 3 : 2));
  function uses(m) {
    const tags = [], good = [], care = [];
    const nm = (m.id + " " + m.name).toLowerCase(), ds = (m.description || "").toLowerCase();
    const bl = m.price_in > 0 && m.price_out > 0 ? (m.price_in * 3 + m.price_out) / 4 : null;
    const words = Math.round((m.context * 0.75) / 1000) * 1000;
    const add = (ic, t, why) => { tags.push({ ic, t }); good.push({ t, why }); };
    if (m.price_in === 0 && m.price_out === 0) add("zap", "Probar sin costo", "no cobra por token: sirve para prototipos y pruebas, aunque suele tener límites de uso o menor disponibilidad.");
    if (/code|coder|codex|devstral|codestral/.test(nm) || /\b(coding|programming|software engineering)\b/.test(ds)) add("code", "Programación", "orientado a escribir, revisar y depurar código.");
    if (m.reasoning) { add("brain", "Razonamiento complejo", "piensa paso a paso antes de responder: útil en matemáticas, lógica, análisis y planificación."); care.push("Más lento y con más tokens por respuesta que un modelo sin razonamiento; sobra para tareas simples."); }
    if (m.context >= 500000) add("file-search", "Documentos extensos", `su contexto de ${fmtCtx(m.context)} tokens (≈ ${nf.format(words)} palabras) permite analizar contratos, informes o bases de código completas de una vez.`);
    else if (m.context >= 128000) good.push({ t: "Contexto amplio", why: `con ${fmtCtx(m.context)} tokens (≈ ${nf.format(words)} palabras) maneja manuales e informes largos.` });
    else if (m.context > 0 && m.context <= 64000) care.push(`Contexto de ${fmtCtx(m.context)}: para documentos largos hay que dividirlos en partes.`);
    const ins = m.inputs || [];
    if (ins.includes("image")) add("image", "Analizar imágenes", "acepta imágenes: capturas, gráficos, facturas o documentos escaneados.");
    if (ins.includes("audio") || ins.includes("video")) add("mic", "Audio y video", "puede procesar " + [ins.includes("audio") && "audio", ins.includes("video") && "video"].filter(Boolean).join(" y ") + ".");
    if (/flash|mini|lite|nano|haiku|small|instant|turbo|fast/.test(nm)) add("timer", "Respuestas rápidas", "versión ligera pensada para velocidad y bajo costo: chatbots, clasificación y extracción a gran volumen.");
    if (/sonar|search|online/.test(nm) || /web search|real-time|up-to-date information/.test(ds)) add("search", "Búsqueda con fuentes", "consulta información actual de la web y suele citar fuentes.");
    if (/image|banana|imagen|flux|dall|diffusion/.test(nm) && !/vision/.test(nm)) add("image", "Generación de imágenes", "orientado a crear o editar imágenes.");
    if (/\b(tts|whisper|voice|speech|realtime|audio)\b/.test(nm)) add("mic", "Voz y audio", "orientado a conversación por voz o transcripción.");
    if (/creative|roleplay|role-play|storytelling|fiction/.test(ds) || /euryale|story|\brp\b|roleplay/.test(nm)) add("pen-line", "Escritura creativa", "pensado para relatos, personajes y conversación con estilo.");
    if (/agentic|tool use|tool calling|function calling|\bagents?\b/.test(ds)) add("bot", "Agentes y herramientas", "diseñado para usar herramientas y resolver tareas de varios pasos.");
    if (/multilingual|\b\d{2,3}\+? languages\b/.test(ds)) add("languages", "Varios idiomas", "buen soporte para trabajar en múltiples idiomas.");
    if (/\b(math|mathematical|stem|scientific)\b/.test(ds)) add("calculator", "Matemáticas y ciencia", "destaca en problemas matemáticos y científicos según su descripción.");
    if (bl != null && bl < thr().lo) add("coins", "Alto volumen a bajo costo", `con ≈ ${money(bl)} por millón de tokens conviene para procesar grandes cantidades: clasificar, resumir o atender consultas.`);
    if (bl != null && bl >= thr().hi) { add("target", "Tareas críticas", `gama alta (≈ ${money(bl)} por millón de tokens): para casos donde importa la calidad, como análisis complejo, código difícil y agentes.`); care.push("Cuesta bastante más que las opciones medias y económicas: resérvalo para donde aporte valor."); }
    if (m.price_in > 0 && m.price_out / m.price_in >= 5) care.push(`La salida cuesta ${Math.round(m.price_out / m.price_in)} veces la entrada: ojo con las respuestas muy largas.`);
    if (!tags.length) add("message-square", "Uso general", "conversación, redacción, resumen y consultas cotidianas.");
    return { tags: tags.slice(0, 4), good: good.slice(0, 5), care: care.slice(0, 3) };
  }
  function costExamples(m) {
    if (m.price_in == null || m.price_out == null) return [];
    const c = (tin, tout) => (tin * m.price_in + tout * m.price_out) / 1e6;
    const out = [["message-square", "1,000 conversaciones de soporte (≈ 1,500 tokens de entrada y 500 de salida cada una)", c(1.5e6, 0.5e6)]];
    if (m.context >= 40000) out.push(["file-text", "Resumir un informe de 50 páginas (≈ 35,000 tokens) en un resumen de 1,000 tokens", c(35000, 1000)]);
    if (m.context >= 140000) out.push(["book-open", `Analizar un libro de ${nf.format(100000)} palabras (≈ 133,000 tokens) y responder con 2,000 tokens`, c(133000, 2000)]);
    return out;
  }
  function descText(m) {
    if (m.description_es) return { t: m.description_es, en: false };
    if (m.description) return { t: m.description, en: true };
    return null;
  }

  Object.assign(window.IAR, { PROV, norm, provName, provIcon, provTag, family, versionPairs, baseModels, MAJOR, isMajor, uses, costExamples, descText, money, setModels, INPUT_ES, between, pct, signed, paid });
})();
