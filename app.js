/* Encuesta de Competencias - app.js
   Mantiene el mismo esquema de sesión (localStorage) que Armada_Puestos:
   - usuarioNombre
   - usuarioPerfil
*/

const OPCIONES_COMPETENCIAS_HTML = `
    <option value="">-- Seleccione --</option>
    <optgroup label="Actuación con valores">
        <option value="INE Integridad y Ejemplaridad">INE Integridad y Ejemplaridad</option>
        <option value="CCM Compromiso con la Misión">CCM Compromiso con la Misión</option>
    </optgroup>
    <optgroup label="Liderazgo y mando">
        <option value="LID Liderazgo de Equipos">LID Liderazgo de Equipos</option>
        <option value="MEN Mentoria">MEN Mentoria</option>
        <option value="HUM Humanidad">HUM Humanidad</option>
    </optgroup>
    <optgroup label="Capacidades de análisis y gestión">
        <option value="CAD Capacidad de Decisión">CAD Capacidad de Decisión</option>
        <option value="COM Comunicación">COM Comunicación</option>
        <option value="VES Visión Estratégica">VES Visión Estratégica</option>
        <option value="ORC Organización y Coordinación">ORC Organización y Coordinación</option>
        <option value="POB Planificación de Objetivos">POB Planificación de Objetivos</option>
        <option value="INC Iniciativa y Creatividad">INC Iniciativa y Creatividad</option>
    </optgroup>
    <optgroup label="Capacidades técnicas">
        <option value="CEX Conocimiento Experto">CEX Conocimiento Experto</option>
        <option value="REE Rigor en la Ejecución">REE Rigor en la Ejecución</option>
    </optgroup>
`;

const LS_KEYS = {
  usuarioNombre: 'usuarioNombre',
  usuarioPerfil: 'usuarioPerfil',
  encuestaData: 'encuestaCompetenciasData'
};

function getUsuarioSesion() {
  return {
    nombre: localStorage.getItem(LS_KEYS.usuarioNombre) || '',
    perfil: localStorage.getItem(LS_KEYS.usuarioPerfil) || ''
  };
}

function ensureLoginOrRedirect() {
  const u = getUsuarioSesion();
  if (!u.nombre) {
    // Si no hay sesión, volvemos al login
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function renderUsuarioHeader() {
  const u = getUsuarioSesion();
  const el = document.getElementById('userLine');
  if (!el) return;
  el.textContent = u.nombre ? `Usuario: ${u.nombre}${u.perfil ? ' · ' + u.perfil : ''}` : '';
}

function doLogout() {
  localStorage.removeItem(LS_KEYS.usuarioNombre);
  localStorage.removeItem(LS_KEYS.usuarioPerfil);
  window.location.href = 'login.html';
}

function _readEncuestaData() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS.encuestaData) || '{"responsable":[],"evaluado":[]}');
  } catch {
    return { responsable: [], evaluado: [] };
  }
}

function _writeEncuestaData(data) {
  localStorage.setItem(LS_KEYS.encuestaData, JSON.stringify(data));
}

function showSection(which) {
  const sections = ['responsable', 'evaluado', 'ayuda'];
  sections.forEach(s => {
    const el = document.getElementById(`sec-${s}`);
    if (el) el.style.display = (s === which) ? 'block' : 'none';
  });

  const btnResp = document.getElementById('btnResp');
  const btnEval = document.getElementById('btnEval');
  const btnAyuda = document.getElementById('btnAyuda');

  // En esta app el menú es lateral (mismo estilo que mantenimiento_habilidades)
  const active = 'submenu-item active';
  const inactive = 'submenu-item';
  if (btnResp) btnResp.className = (which === 'responsable') ? active : inactive;
  if (btnEval) btnEval.className = (which === 'evaluado') ? active : inactive;
  if (btnAyuda) btnAyuda.className = (which === 'ayuda') ? active : inactive;

  // ✅ Al entrar en Responsable, renderiza el listado (si existe la función)
  if (which === 'responsable' && typeof initResponsableUI === 'function') {
    initResponsableUI();
  }
}

function limpiarFormulario(tipo) {
  if (tipo === 'responsable') {
    ['r_cod_puesto','r_evaluado','r_competencia','r_nivel','r_obs'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.value = '';
      else el.value = '';
    });
  } else {
    ['e_cod_puesto','e_competencia','e_nivel','e_obs'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.value = '';
      else el.value = '';
    });
  }
}

/**
 * Valida y guarda la encuesta del Responsable
 * Cubre Sección 1 (Competencias) y Sección 2 (Trayectoria)
 */
/**
 * Valida y guarda la encuesta del Responsable
 */
function guardarEncuestaResponsable(tipo) {
    console.log("Iniciando validación para:", tipo);

    if (tipo !== 'responsable') return;

    // --- 1. VALIDACIÓN SECCIÓN 1.1 (VALORACIÓN GLOBAL) ---
    const areasSeccion1 = [
        { id: 'r_valores', nombre: 'Actuación con valores' },
        { id: 'r_liderazgo', nombre: 'Liderazgo y mando' },
        { id: 'r_analisis', nombre: 'Capacidades de análisis y gestión' },
        { id: 'r_tecnicas', nombre: 'Capacidades técnicas' }
    ];

    const resultadosSeccion1 = {};
    for (const area of areasSeccion1) {
        const radio = document.querySelector(`input[name="${area.id}"]:checked`);
        if (!radio) {
            mostrarAlerta(`Sección 1.1: Seleccione valoración en "${area.nombre}".`, "Validación");
            return;
        }
        const obs = document.getElementById(`${area.id}_obs`);
        if (!obs || obs.value.trim() === "") {
            mostrarAlerta(`Sección 1.1: Justificación obligatoria en "${area.nombre}".`, "Validación");
            if (obs) obs.focus();
            return;
        }
        resultadosSeccion1[area.id] = { valor: radio.value, observacion: obs.value.trim() };
    }

    // --- 2. VALIDACIÓN SECCIÓN 2 (2.1 a 2.5) ---
    // NOTA: Separamos la 2.5 si es que solo es un textarea sin radios
    const preguntasRadioS2 = [
        { id: 'r_deseo_unidad', nombre: 'Pregunta 2.1 (Deseo contar con el individuo)' },
        { id: 'r_potencial_empleo', nombre: 'Pregunta 2.2 (Potencial siguiente empleo)' },
        { id: 'r_potencial_especial', nombre: 'Pregunta 2.3 (Especial responsabilidad)' },
        { id: 'r_motivacion_progreso', nombre: 'Pregunta 2.4 (Motivación)' }
    ];

    const resultadosSeccion2 = {};

    // Validar radios 2.1 a 2.4
    for (const area of preguntasRadioS2) {
        const radio = document.querySelector(`input[name="${area.id}"]:checked`);
        if (!radio) {
            mostrarAlerta(`Sección 2: Responda a la ${area.nombre}.`, "Validación");
            return;
        }
        const obs = document.getElementById(`${area.id}_obs`);
        if (!obs || obs.value.trim() === "") {
            mostrarAlerta(`Sección 2: Justificación obligatoria para la ${area.nombre}.`, "Validación");
            if (obs) obs.focus();
            return;
        }
        resultadosSeccion2[area.id] = { valor: radio.value, observacion: obs.value.trim() };
    }

    // Validar Pregunta 2.5 (Suele ser solo observación/recomendación)
    const obs25 = document.getElementById('r_recomendacion_carrera_obs');
    if (!obs25 || obs25.value.trim() === "") {
        mostrarAlerta("Sección 2: Debe completar la recomendación de carrera (Pregunta 2.5).", "Validación");
        if (obs25) obs25.focus();
        return;
    }
    // Si la 2.5 también tiene radio, añade aquí la lógica del radio, si no, solo el texto:
    resultadosSeccion2['r_recomendacion_carrera'] = { observacion: obs25.value.trim() };


    // --- 3. VALIDACIÓN SECCIÓN 1.3 (FORTALEZAS) ---
    const contFort = document.getElementById('contenedor-fortalezas');
    const bloquesFort = contFort ? contFort.querySelectorAll('.eval-block') : [];
    const nombresFortalezas = [];
    
    if (bloquesFort.length === 0) {
        mostrarAlerta("Pregunta 1.3: Debe añadir al menos una fortaleza.", "Aviso");
        return;
    }

    for (const bloque of bloquesFort) {
        const select = bloque.querySelector('select');
        const textarea = bloque.querySelector('textarea');
        
        if (!select || select.value === "") {
            mostrarAlerta("Pregunta 1.3: Seleccione el tipo de competencia en fortalezas.", "Validación");
            if (select) select.focus(); return;
        }
        
        const nombreComp = select.options[select.selectedIndex].text;
        if (nombresFortalezas.includes(nombreComp)) {
            mostrarAlerta(`Pregunta 1.3: La fortaleza "${nombreComp}" está repetida.`, "Validación");
            select.focus(); return;
        }
        nombresFortalezas.push(nombreComp);

        if (!textarea || textarea.value.trim() === "") {
            mostrarAlerta(`Pregunta 1.3: Justifique su valoración de "${nombreComp}".`, "Validación");
            if (textarea) textarea.focus(); return;
        }
    }

    // --- 4. VALIDACIÓN SECCIÓN 1.4 (MEJORAS) ---
    const contDeb = document.getElementById('contenedor-debilidades');
    const bloquesDeb = contDeb ? contDeb.querySelectorAll('.eval-block') : [];
    const nombresDebilidades = [];

    for (const bloque of bloquesDeb) {
        const select = bloque.querySelector('select');
        const textarea = bloque.querySelector('textarea');
        
        if (!select || select.value === "") {
            mostrarAlerta("Pregunta 1.4: Seleccione el área de mejora.", "Validación");
            if (select) select.focus(); return;
        }

        const nombreComp = select.options[select.selectedIndex].text;
        if (nombresDebilidades.includes(nombreComp) || nombresFortalezas.includes(nombreComp)) {
            mostrarAlerta(`Conflicto: "${nombreComp}" ya ha sido seleccionada (está repetida o ya es fortaleza).`, "Error");
            if (select) select.focus(); return;
        }
        nombresDebilidades.push(nombreComp);

        if (!textarea || textarea.value.trim() === "") {
            mostrarAlerta(`Pregunta 1.4: Justifique el área de mejora "${nombreComp}".`, "Validación");
            if (textarea) textarea.focus(); return;
        }
    }

    // --- 5. GUARDADO FINAL ---
    try {
        const data = _readEncuestaData();
        data.responsable = {
            evaluacionCuantitativa: resultadosSeccion1,
            seccionPropuestaDesarrollo: resultadosSeccion2,
            fortalezas: Array.from(bloquesFort).map(b => ({
                tipo: b.querySelector('select').options[b.querySelector('select').selectedIndex].text,
                obs: b.querySelector('textarea').value
            })),
            mejoras: Array.from(bloquesDeb).map(b => ({
                tipo: b.querySelector('select').options[b.querySelector('select').selectedIndex].text,
                obs: b.querySelector('textarea').value
            })),
            fechaRegistro: new Date().toLocaleString()
        };

        localStorage.setItem(LS_KEYS.encuestaData, JSON.stringify(data));

        setTimeout(() => {
            if (confirm("¡Encuesta del Responsable guardada correctamente!\n\n¿Desea CERRAR SESIÓN ahora?")) {
                doLogout();
            } else {
                mostrarAlerta("Los datos se han guardado con éxito.", "Éxito");
            }
        }, 200);

    } catch (error) {
        console.error("Error al guardar:", error);
        mostrarAlerta("Error técnico al intentar guardar en el navegador.", "Error");
    }
}

function guardarEncuestaEvaluado(tipo) {
    console.log("Iniciando validación para:", tipo);

    try {
        // 1. Validar 3.1: Expectativas
        const expectativas = document.querySelectorAll('input[name="e_expectativa"]:checked');
        if (expectativas.length === 0) {
            mostrarAlerta("Pregunta 3.1: Debe seleccionar al menos una expectativa.", "Aviso");
            return;
        }
        
        const obsExpectativas = document.getElementById('e_expectativas_obs');
        if (!obsExpectativas || obsExpectativas.value.trim() === "") {
            mostrarAlerta("Pregunta 3.1: Debe explicar sus expectativas en el cuadro de texto.", "Aviso");
            if (obsExpectativas) obsExpectativas.focus();
            return;
        }

        // 2. Validar 3.2: Comparación Profesional
        const radioComparacion = document.querySelector('input[name="e_comparacion"]:checked');
        if (!radioComparacion) {
            mostrarAlerta("Pregunta 3.2: Seleccione cómo se considera profesionalmente.", "Aviso");
            return;
        }

        // --- CONTROL DE DUPLICADOS CON NOMBRES ---
        const nombresFortalezas = [];
        const nombresMejoras = [];

        // 3. Validar 3.3: Fortalezas
        const contCompetencia = document.getElementById('contenedor-fortalezas-evaluado');
        const bloquesCompetencia = contCompetencia ? contCompetencia.querySelectorAll('.eval-block') : [];
        
        for (const bloque of bloquesCompetencia) {
            const select = bloque.querySelector('select');
            const textarea = bloque.querySelector('textarea');
            
            if (!select || select.value === "") {
                mostrarAlerta("Pregunta 3.3: Seleccione el tipo de Fortaleza.", "Validación");
                if (select) select.focus(); return;
            }
            
            // Obtenemos el texto visible (ej: "Liderazgo")
            const nombreCompetencia = select.options[select.selectedIndex].text;

            if (nombresFortalezas.includes(nombreCompetencia)) {
                mostrarAlerta(`Pregunta 3.3: La competencia "${nombreCompetencia}" ya ha sido incluida como Fortaleza.`, "Validación");
                select.focus(); return;
            }
            nombresFortalezas.push(nombreCompetencia);

            if (!textarea || textarea.value.trim() === "") {
                mostrarAlerta(`Pregunta 3.3: Justifique su fortaleza en "${nombreCompetencia}".`, "Validación");
                if (textarea) textarea.focus(); return;
            }
        }
        
        // 4. Validar 3.4: Mejoras
        const contMejora = document.getElementById('contenedor-debilidades-evaluado');
        const bloquesMejora = contMejora ? contMejora.querySelectorAll('.eval-block') : [];
        
        for (const bloque of bloquesMejora) {
            const select = bloque.querySelector('select');
            const textarea = bloque.querySelector('textarea');
            
            if (!select || select.value === "") {
                mostrarAlerta("Pregunta 3.4: Seleccione el tipo de Mejora.", "Validación");
                if (select) select.focus(); return;
            }

            const nombreCompetencia = select.options[select.selectedIndex].text;

            // Duplicado en la misma sección
            if (nombresMejoras.includes(nombreCompetencia)) {
                mostrarAlerta(`Pregunta 3.4: La competencia "${nombreCompetencia}" ya está en la lista de mejoras.`, "Validación");
                select.focus(); return;
            }

            // CRUCE: ¿Está ya en Fortalezas?
            if (nombresFortalezas.includes(nombreCompetencia)) {
                mostrarAlerta(`Conflicto: "${nombreCompetencia}" no puede ser una Fortaleza y una Mejora al mismo tiempo.`, "Error de Lógica");
                select.focus(); return;
            }
            
            nombresMejoras.push(nombreCompetencia);

            if (!textarea || textarea.value.trim() === "") {
                mostrarAlerta(`Pregunta 3.4: Justifique por qué desea mejorar en "${nombreCompetencia}".`, "Validación");
                if (textarea) textarea.focus(); return;
            }
        }

        // 5. Comentarios Finales
        const elComentarios = document.getElementById('e_comentarios_finales');
        const valorComentarios = elComentarios ? elComentarios.value : "";

        // --- GUARDADO ---
        const data = _readEncuestaData();
        data.evaluado = {
            expectativas_tipos: Array.from(expectativas).map(e => e.value),
            expectativas_obs: obsExpectativas.value,
            comparacion_profesional: radioComparacion.value,
            fortalezas: Array.from(bloquesCompetencia).map(b => ({
                tipo: b.querySelector('select').options[b.querySelector('select').selectedIndex].text,
                obs: b.querySelector('textarea').value
            })),
            mejoras: Array.from(bloquesMejora).map(b => ({
                tipo: b.querySelector('select').options[b.querySelector('select').selectedIndex].text,
                obs: b.querySelector('textarea').value
            })),
            comentariosFinales: valorComentarios,
            fecha: new Date().toLocaleString()
        };

        localStorage.setItem(LS_KEYS.encuestaData, JSON.stringify(data));

        // --- PREGUNTA DE SALIDA ---
        setTimeout(() => {
            if (confirm("¡Encuesta guardada correctamente!\n\n¿Desea CERRAR SESIÓN ahora?")) {
                doLogout();
            } else {
                mostrarAlerta("Datos guardados. Puede seguir en la página.", "Éxito");
            }
        }, 200);

    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta("Error técnico al guardar: " + error.message, "Error");
    }
}

/**
 * Función auxiliar para validar preguntas de la Sección 2 (Radio + Texto)
 */
function validarPreguntaSeccion2(radioName, nombrePregunta, obsId) {
    const radio = document.querySelector(`input[name="${radioName}"]:checked`);
    if (!radio) {
        alert(`Sección 2: Debe seleccionar una opción en la pregunta ${nombrePregunta}.`);
        showRespTab('trayectoria');
        return false;
    }
    const obs = document.getElementById(obsId);
    if (!obs || obs.value.trim() === "") {
        alert(`Sección 2: La justificación de la pregunta ${nombrePregunta} es obligatoria.`);
        showRespTab('trayectoria');
        obs.focus();
        return false;
    }
    return true;
}

/**
 * Lógica final tras validación
 */
function confirmarGuardadoExitoso() {
    // Aquí puedes añadir la lógica para guardar en LocalStorage o enviar al servidor
    alert("✅ VALIDACIÓN CORRECTA\n\nEl informe ha sido validado íntegramente y los datos están listos para ser procesados.");
    
    // Ejemplo: habilitar botón de exportar si lo tuvieras
    const btnExport = document.getElementById('btnExportar');
    if(btnExport) btnExport.disabled = false;
}

function exportJSON() {
  const data = _readEncuestaData();

  const payload = {
    app: 'Encuesta de Competencias',
    exportedAt: new Date().toISOString(),
    data
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'encuesta_competencias_export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function importJSON(evt) {
  const file = evt?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const data = parsed?.data;
      if (!data || typeof data !== 'object') throw new Error('Formato inválido');

      // Normalizamos
      const next = {
        responsable: Array.isArray(data.responsable) ? data.responsable : [],
        evaluado: Array.isArray(data.evaluado) ? data.evaluado : []
      };

      _writeEncuestaData(next);
      alert('Importación completada.');
    } catch (e) {
      alert('No se pudo importar el JSON: ' + (e?.message || 'Error'));
    } finally {
      evt.target.value = '';
    }
  };
  reader.readAsText(file);
}

function resetApp() {
  if (!confirm('Esto borrará todas las encuestas guardadas en este navegador. ¿Continuar?')) return;
  localStorage.removeItem(LS_KEYS.encuestaData);
  alert('Aplicación reiniciada.');
  showSection('responsable');
}


function factoryReset(){
  // Alias usado en otras páginas
  resetApp();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body && document.body.querySelector('form#loginForm')) return;
  if (!ensureLoginOrRedirect()) return;

  renderUsuarioHeader();
  applyRoleMenu();

  const perfil = (localStorage.getItem(LS_KEYS.usuarioPerfil) || "").trim().toUpperCase();
  if (perfil === "EVALUADO") {
    showSection("evaluado");
  } else {
    showSection("responsable"); // <- showSection ya llamará initResponsableUI()
  }
});


function applyRoleMenu(){
  const perfil = (localStorage.getItem(LS_KEYS.usuarioPerfil) || "").trim().toUpperCase();

  const btnResp = document.getElementById("btnResp");
  const btnEval = document.getElementById("btnEval");
  if (!btnResp || !btnEval) return;

  if (perfil === "RESPONSABLE") {
    btnEval.style.display = "none";
    btnResp.style.display = "flex";
  } else if (perfil === "EVALUADO") {
    btnResp.style.display = "none";
    btnEval.style.display = "flex";
  } else {
    btnResp.style.display = "flex";
    btnEval.style.display = "flex";
  }
}


// ===== Responsable: selección de informado + precarga =====

// 1) Datos de ejemplo (REEMPLAZA por tu precarga real)
const DB_INFORMADOS = [
  {
    dni: "12345678X",
    ap1: "Pérez",
    ap2: "García",
    nombre: "Juan",
    empleo: "Capitán",
    escala: "Oficiales",
    cuerpo: "Infantería",
    escalafon: "1023",
    cargo: "Jefe Sección",
    destino: "Madrid",
    ciu: "CIU-001",
    fnac: "10-02-1985",
    fasc: "01-06-2020"
  },
  {
    dni: "87654321Z",
    ap1: "Martínez",
    ap2: "López",
    nombre: "Elena",
    empleo: "Teniente",
    escala: "Oficiales",
    cuerpo: "Logística",
    escalafon: "2044",
    cargo: "Adjunta",
    destino: "Zaragoza",
    ciu: "CIU-002",
    fnac: "14-09-1990",
    fasc: "15-01-2022"
  }
];

// 2) Informante (precargado, no editable). Clave: usuarioNombre (localStorage)
const DB_INFORMANTES = {
  // Ejemplo: "Carlos Holgado Moratilla": {...}
  "Juan Pérez García": {
    ap1: "Pérez",
    ap2: "García",
    nombre: "Juan",
    dni: "00000000A",
    empleo: "Comandante",
    escala: "Oficiales",
    cuerpo: "Estado Mayor",
    escalafon: "0500",
    cargo: "Evaluador",
    destino: "Madrid",
    ciu: "CIU-900"
  }
};

const LS_RESP_SELECTED = "responsableSelectedInformadoDNI";

function _fullName(ap1, ap2, nombre){
  return [ap1, ap2, nombre].filter(Boolean).join(" ");
}

function renderListadoInformados(){
  const tbody = document.getElementById("respListadoInformados");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(DB_INFORMADOS) || DB_INFORMADOS.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "No hay informados para mostrar.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  DB_INFORMADOS.forEach(p => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.onclick = () => selectInformado(p.dni);

    const tdDni = document.createElement("td");
    tdDni.textContent = p.dni;

    const tdNom = document.createElement("td");
    tdNom.textContent = _fullName(p.ap1, p.ap2, p.nombre);

    const tdBtn = document.createElement("td");
    const b = document.createElement("button");
    b.className = "btn-mini";
    b.type = "button";
    b.textContent = "Seleccionar";
    b.onclick = (e) => { e.stopPropagation(); selectInformado(p.dni); };
    tdBtn.appendChild(b);

    tr.appendChild(tdDni);
    tr.appendChild(tdNom);
    tr.appendChild(tdBtn);
    tbody.appendChild(tr);
  });
}

function selectInformado(dni){
  const p = DB_INFORMADOS.find(x => (x.dni || "").toUpperCase() === (dni || "").toUpperCase());
  if (!p) return;

  localStorage.setItem(LS_RESP_SELECTED, p.dni);

  // ✅ Panels (con comprobación)
  const panelList = document.getElementById("resp-select-panel");
  const panelForm = document.getElementById("resp-form-panel");
  if (!panelList || !panelForm) {
    console.error("No encuentro resp-select-panel o resp-form-panel", { panelList, panelForm });
    alert("Error: faltan contenedores 'resp-select-panel' / 'resp-form-panel' en el HTML.");
    return;
  }

	if (panelList) panelList.style.display = "none";
	if (panelForm) panelForm.style.display = "block";

  // Label
  const label = document.getElementById("respSelectedLabel");
  if (label) label.textContent = `${p.dni} · ${_fullName(p.ap1, p.ap2, p.nombre)}`;

  // Rellenar informado (editable salvo DNI)
  _setVal("inf_ap1", p.ap1);
  _setVal("inf_ap2", p.ap2);
  _setVal("inf_nom", p.nombre);
  _setVal("inf_dni", p.dni);
  _setVal("inf_empleo", p.empleo);
  _setVal("inf_escala", p.escala);
  _setVal("inf_cuerpo", p.cuerpo);
  _setVal("inf_escalafon", p.escalafon);
  _setVal("inf_cargo", p.cargo);
  _setVal("inf_destino", p.destino);
  _setVal("inf_ciu", p.ciu);
  _setVal("inf_fnac", p.fnac);
  _setVal("inf_fasc", p.fasc);

  // En competencias: DNI rellenado
  // ✅ OJO: usa el id que tengas en tu HTML (r_evaluado o r_evaluado)
  
  _setVal("r_evaluado", p.dni); // si en tu HTML es r_evaluado, deja SOLO esta línea y borra la otra

  // Rellenar informante (precargado, no editable)
  const u = getUsuarioSesion();
  const info = DB_INFORMANTES[u.nombre] || {
    ap1: "Ruiz de Santolalla",
    ap2: "Alcantara",
    nombre: u.nombre || "Pedro Javier",
    dni: "012345678R",
    empleo: "CF",
    escala: "EOF",
    cuerpo: "CGA",
    escalafon: "2",
    cargo: "OFICINA TÉCNICA DE APOYO AL CICLO DE VIDA S-80",
    destino: "6B120 003",
    ciu: "ARCART-COTALS-OTACV"
  };

  _setVal("eva_ap1", info.ap1);
  _setVal("eva_ap2", info.ap2);
  _setVal("eva_nom", info.nombre);
  _setVal("eva_dni", info.dni);
  _setVal("eva_empleo", info.empleo);
  _setVal("eva_escala", info.escala);
  _setVal("eva_cuerpo", info.cuerpo);
  _setVal("eva_escalafon", info.escalafon);
  _setVal("eva_cargo", info.cargo);
  _setVal("eva_destino", info.destino);
  _setVal("eva_ciu", info.ciu);

  // Abrir tab datos por defecto (solo si existe)
  if (typeof showRespTab === "function") showRespTab("datos");
}

function respBackToList(){
  // Quitar selección
  localStorage.removeItem(LS_RESP_SELECTED);

  // Mostrar listado / ocultar formulario
  const panelForm = document.getElementById("resp-form-panel");
  const panelList = document.getElementById("resp-select-panel");
  if (panelForm) panelForm.style.display = "none";
  if (panelList) panelList.style.display = "block";

  // (Opcional) resetear label
  const label = document.getElementById("respSelectedLabel");
  if (label) label.textContent = "—";

  // (Opcional) volver a la pestaña de datos por defecto
  if (typeof showRespTab === "function") showRespTab("datos");

  // (Opcional) limpiar campos del informado (si quieres que queden vacíos al volver)
  [
    "inf_ap1","inf_ap2","inf_nom","inf_dni","inf_empleo","inf_escala","inf_cuerpo","inf_escalafon",
    "inf_cargo","inf_destino","inf_ciu","inf_fnac","inf_fasc","r_cod_puesto",
    "eva_ap1","eva_ap2","eva_nom","eva_dni","eva_empleo","eva_escala","eva_cuerpo","eva_escalafon",
    "eva_cargo","eva_destino","eva_ciu",
    "r_evaluado","r_competencia","r_nivel","r_obs"
  ].forEach(id => _setVal(id, ""));
}

function _setVal(id, value){
  const el = document.getElementById(id);
  if (!el) return;
  el.value = (value ?? "");
}

// Tabs responsable (mantén si ya la tenías; si existe, no la dupliques)
function showRespTab(tabName) {
    // 1. Lista de IDs de los paneles y los botones
    const tabs = [
        { id: 'datos', panel: 'resp-tab-datos', btn: 'tabRespDatos' },
        { id: 'competencias', panel: 'resp-tab-competencias', btn: 'tabRespComp' },
        { id: 'trayectoria', panel: 'resp-tab-trayectoria', btn: 'tabRespTray' }
    ];

    tabs.forEach(tab => {
        const panelEl = document.getElementById(tab.panel);
        const btnEl = document.getElementById(tab.btn);

        if (tab.id === tabName) {
            // --- ESTILO ACTIVO (Azul Oscuro, Blanco, Negrita) ---
            if (panelEl) panelEl.style.display = 'block';
            if (btnEl) {
                btnEl.classList.add('active');
                btnEl.style.backgroundColor = '#00447b'; // Azul Armada
                btnEl.style.color = '#ffffff';           // Texto Blanco
                btnEl.style.fontWeight = 'bold';
				btnEl.style.fontSize = '1.05rem';   // Tamaño destacado pero contenido
                btnEl.style.borderBottom = '3px solid #ffcc00'; // Opcional: detalle en oro/amarillo
            }
        } else {
            // --- ESTILO INACTIVO (Gris claro) ---
            if (panelEl) panelEl.style.display = 'none';
            if (btnEl) {
                btnEl.classList.remove('active');
                btnEl.style.backgroundColor = '#f1f1f1'; // Fondo gris suave
                btnEl.style.color = '#555';              // Texto gris
                btnEl.style.fontWeight = 'normal';
				btnEl.style.fontSize = '1.0rem';  // Casi igual a la activa para evitar saltos bruscos
                btnEl.style.borderBottom = 'none';
            }
        }
    });
}

function selectOpt(element) {
    // 1. Identificar el grupo de opciones (el contenedor padre)
    const parent = element.closest('.eval-options');
    const options = parent.querySelectorAll('.opt-item');

    // 2. Resetear todos los hermanos del mismo grupo a su estado original (texto oscuro)
    options.forEach(opt => {
        opt.style.color = '#333'; // Volver a texto oscuro
        opt.style.fontWeight = '500';
        opt.style.boxShadow = 'none';
    });

    // 3. Aplicar ESTILO SELECCIONADO al elemento clicado
//    element.style.color = '#ffffff'; // Texto Blanco
    element.style.fontWeight = 'bold';
    
    // Oscurecemos un poco el fondo original para que el blanco resalte más (efecto "press")
    element.style.boxShadow = 'inset 0 0 0 100px rgba(0,0,0,0.2)'; 

    // 4. Marcar el radio button real que está oculto o dentro
    const radio = element.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
}


function selectOptEvaluado(element) {
    // 1. Identificar el grupo de opciones (el contenedor padre)
    const parent = element.closest('.eval-options');
    const options = parent.querySelectorAll('.opt-item');

    // 2. Resetear todos los hermanos del mismo grupo a su estado original (texto oscuro)
    options.forEach(opt => {
        opt.style.color = '#333'; // Volver a texto oscuro
        opt.style.fontWeight = '500';
        opt.style.boxShadow = 'none';
    });

    // 3. Aplicar ESTILO SELECCIONADO al elemento clicado
	//element.style.boxShadow = '#93a9bd';
    element.style.color = '#ffffff'; // Texto Blanco
    element.style.fontWeight = 'bold';
    
    // Oscurecemos un poco el fondo original para que el blanco resalte más (efecto "press")
    element.style.boxShadow = 'inset 0 0 0 100px #93a9bd'; 

    // 4. Marcar el radio button real que está oculto o dentro
    const radio = element.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
}

// Enganche al arranque: cuando entres en Responsable, muestra lista o abre el seleccionado
function initResponsableUI(){
  console.log("initResponsableUI() -> OK");

  const panelList = document.getElementById("resp-select-panel");
  const panelForm = document.getElementById("resp-form-panel");
  const tbody = document.getElementById("respListadoInformados");

  console.log("DOM check:", { panelList, panelForm, tbody });
  console.log("DB_INFORMADOS length:", Array.isArray(DB_INFORMADOS) ? DB_INFORMADOS.length : "NO ARRAY");

  if (!tbody) return;

  // ✅ Siempre mostrar lista al entrar
  if (panelList) panelList.style.display = "block";
  if (panelForm) panelForm.style.display = "none";

  // ✅ Pintar lista
  renderListadoInformados();

  // ❌ NO autoabrir seleccionado guardado
  // const selected = localStorage.getItem(LS_RESP_SELECTED);
  // if (selected) selectInformado(selected);
}


function toggleJustificacion(checkbox){
  const textarea = checkbox.parentElement.nextElementSibling;
  if (!textarea) return;

  if (checkbox.checked){
    textarea.style.display = "block";
  } else {
    textarea.style.display = "none";
    textarea.value = "";
  }
}

let contadorFortalezas = 0;

function agregarFortaleza() {
    contadorFortalezas++;
    const contenedor = document.getElementById('contenedor-fortalezas');
    
    const div = document.createElement('div');
    div.className = 'eval-block'; 
    div.style.marginTop = "15px";
    div.style.borderLeft = "4px solid #00447b"; 
    
    div.innerHTML = `
        <div style="margin-bottom: 5px;">
            <label style="font-weight: bold;">Competencia de especial fortaleza:</label>
        </div>

        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <select id="r_fortaleza_tipo_${contadorFortalezas}" 
                style="width: 70%; height: 38px; padding: 0 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"
                onchange="document.getElementById('r_fortaleza_area_wrapper_${contadorFortalezas}').style.display = (this.value === 'CEX - Conocimiento Experto') ? 'block' : 'none';">
                <option value="">-- Seleccione competencia --</option>
                <optgroup label="Actuación con valores">
                    <option value="INE - Integridad y Ejemplaridad">INE Integridad y Ejemplaridad</option>
                    <option value="CCM Compromiso con la Misión">CCM Compromiso con la Misión</option>
                </optgroup>
                <optgroup label="Liderazgo y mando">
                    <option value="LID - Liderazgo de Equipos">LID Liderazgo de Equipos</option>
                    <option value="MEN Mentoria">MEN Mentoria</option>
                    <option value="HUM Humanidad">HUM Humanidad</option>
                </optgroup>
                <optgroup label="Capacidades de análisis y gestión">
                    <option value="CAD - Capacidad de Decisión">CAD Capacidad de Decisión</option>
                    <option value="COM - Comunicación">COM Comunicación</option>
                    <option value="VES - Visión Estratégica">VES Visión Estratégica</option>
                    <option value="ORC - Organización y Coordinación">ORC Organización y Coordinación</option>
                    <option value="POB - Planificación de Objetivos">POB Planificación de Objetivos</option>
                    <option value="INC - Iniciativa y Creatividad">INC Iniciativa y Creatividad</option>
                </optgroup>
                <optgroup label="Capacidades técnicas">
                    <option value="CEX - Conocimiento Experto">CEX Conocimiento Experto</option>
                    <option value="REE Rigor en la Ejecución">REE Rigor en la Ejecución</option>
                </optgroup>
            </select>
            
            <button type="button" class="btn-mini" 
                style="height: 38px; background:#fee2e2; color:#991b1b; border: 1px solid #f87171; padding: 0 15px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; justify-content: center;" 
                onclick="this.closest('.eval-block').remove()">
                Eliminar
            </button>
        </div>

        <div id="r_fortaleza_area_wrapper_${contadorFortalezas}" style="display: none; margin-bottom: 15px;">
            <div style="margin-bottom: 5px;">
                <label style="font-weight: bold;">Área de experiencia específica:</label>
            </div>
            
            <div class="hint" style="font-size: 0.85rem; color: #666; font-style: italic; margin-bottom: 8px;">
                Haga clic en el botón inferior para añadir una nueva Área de Experiencia.
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <select id="r_fortaleza_area_${contadorFortalezas}" 
                    style="width: 70%; height: 38px; padding: 0 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="">-- Seleccione área de experiencia --</option>
                    <option value="OPE - Operaciones">OPE - Operaciones</option>
                    <option value="INT - Inteligencia y Seguridad">INT - Inteligencia y Seguridad</option>
                    <option value="PYO - Planes y Organización">PYO - Planes y Organización</option>
                    <option value="LOG - Logística">LOG - Logística</option>
                    <option value="PER - Personal">PER - Personal</option>
                    <option value="FYD - Formación y Doctrina">FYD - Formación y Doctrina</option>
                    <option value="CIS - Sistemas de Información y Telecomunicaciones">CIS - Sistemas de Información y Telecomunicaciones</option>
                    <option value="RRI - Relaciones Internacionales">RRI - Relaciones Internacionales</option>
                    <option value="REC - Recursos Económicos">REC - Recursos Económicos</option>
                    <option value="JUR - Jurídico">JUR - Jurídico</option>
                    <option value="SAN - Sanidad">SAN - Sanidad</option>
                    <option value="ING - Ingeniería">ING - Ingeniería</option>
                    <option value="INF - Infraestructura">INF - Infraestructura</option>
                    <option value="ENS - Enseñanza">ENS - Enseñanza</option>
                    <option value="CIV - Cooperación Cívil-Militar">CIV - Cooperación Cívil-Militar</option>
                    <option value="COM - Comunicación Pública">COM - Comunicación Pública</option>
                    <option value="CIB - Ciberdefensa">CIB - Ciberdefensa</option>
                    <option value="CAL - Calidad y Procesos">CAL - Calidad y Procesos</option>
                    <option value="SEG - Seguridad y Prevención">SEG - Seguridad y Prevención</option>
                    <option value="AMB - Medio Ambiente">AMB - Medio Ambiente</option>
                    <option value="TRA - Transportes">TRA - Transportes</option>
                    <option value="ARM - Armamento y Material">ARM - Armamento y Material</option>
                    <option value="INV - Investigación y Desarrollo">INV - Investigación y Desarrollo</option>
                    <option value="PRO - Protocolo">PRO - Protocolo</option>
                    <option value="ADM - Administración">ADM - Administración</option>
                    <option value="OTR - Otras áreas">OTR - Otras áreas</option>
                </select>
            </div>
        </div>
        
        <div class="justification-box">
            <div class="justification-label" style="margin-bottom: 5px;">
                Justifique la fortaleza <span class="required-star">*</span>
            </div>
            <textarea id="r_fortaleza_obs_${contadorFortalezas}" class="required-msg" rows="3" 
                style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"
                placeholder="Argumente detalladamente con ejemplos concretos por qué destaca en esta competencia..."></textarea>
        </div>
    `;
    
    contenedor.appendChild(div);
}

let contadorFortalezasEvaluado = 0;

function agregarFortalezaEvaluado() {
    contadorFortalezasEvaluado++;
    const contenedor = document.getElementById('contenedor-fortalezas-evaluado');
    
    const div = document.createElement('div');
    div.className = 'eval-block'; 
    div.style.marginTop = "15px";
    div.style.borderLeft = "4px solid #00447b"; 
    
    div.innerHTML = `
        <div style="margin-bottom: 5px;">
            <label style="font-weight: bold;">Competencia de especial fortaleza:</label>
        </div>

        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <select id="e_fortaleza_tipo_${contadorFortalezasEvaluado}" 
                style="width: 70%; height: 38px; padding: 0 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"
                onchange="document.getElementById('e_fortaleza_area_wrapper_${contadorFortalezasEvaluado}').style.display = (this.value === 'CEX - Conocimiento Experto') ? 'block' : 'none';">
                <option value="">-- Seleccione competencia --</option>
                <optgroup label="Actuación con valores">
                    <option value="INE - Integridad y Ejemplaridad">INE Integridad y Ejemplaridad</option>
                    <option value="CCM Compromiso con la Misión">CCM Compromiso con la Misión</option>
                </optgroup>
                <optgroup label="Liderazgo y mando">
                    <option value="LID - Liderazgo de Equipos">LID Liderazgo de Equipos</option>
                    <option value="MEN Mentoria">MEN Mentoria</option>
                    <option value="HUM Humanidad">HUM Humanidad</option>
                </optgroup>
                <optgroup label="Capacidades de análisis y gestión">
                    <option value="CAD - Capacidad de Decisión">CAD Capacidad de Decisión</option>
                    <option value="COM - Comunicación">COM Comunicación</option>
                    <option value="VES - Visión Estratégica">VES Visión Estratégica</option>
                    <option value="ORC - Organización y Coordinación">ORC Organización y Coordinación</option>
                    <option value="POB - Planificación de Objetivos">POB Planificación de Objetivos</option>
                    <option value="INC - Iniciativa y Creatividad">INC Iniciativa y Creatividad</option>
                </optgroup>
                <optgroup label="Capacidades técnicas">
                    <option value="CEX - Conocimiento Experto">CEX Conocimiento Experto</option>
                    <option value="REE Rigor en la Ejecución">REE Rigor en la Ejecución</option>
                </optgroup>
            </select>
            
            <button type="button" class="btn-mini" 
                style="height: 38px; background:#fee2e2; color:#991b1b; border: 1px solid #f87171; padding: 0 15px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; justify-content: center;" 
                onclick="this.closest('.eval-block').remove()">
                Eliminar
            </button>
        </div>

        <div id="e_fortaleza_area_wrapper_${contadorFortalezasEvaluado}" style="display: none; margin-bottom: 15px;">
            <div style="margin-bottom: 5px;">
                <label style="font-weight: bold;">Área de experiencia específica:</label>
            </div>
            
            <div class="hint" style="font-size: 0.85rem; color: #666; font-style: italic; margin-bottom: 8px;">
                Haga clic en el botón inferior para añadir una nueva Área de Experiencia.
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <select id="e_fortaleza_area_${contadorFortalezasEvaluado}" 
                    style="width: 70%; height: 38px; padding: 0 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="">-- Seleccione área de experiencia --</option>
                    <option value="OPE - Operaciones">OPE - Operaciones</option>
                    <option value="INT - Inteligencia y Seguridad">INT - Inteligencia y Seguridad</option>
                    <option value="PYO - Planes y Organización">PYO - Planes y Organización</option>
                    <option value="LOG - Logística">LOG - Logística</option>
                    <option value="PER - Personal">PER - Personal</option>
                    <option value="FYD - Formación y Doctrina">FYD - Formación y Doctrina</option>
                    <option value="CIS - Sistemas de Información y Telecomunicaciones">CIS - Sistemas de Información y Telecomunicaciones</option>
                    <option value="RRI - Relaciones Internacionales">RRI - Relaciones Internacionales</option>
                    <option value="REC - Recursos Económicos">REC - Recursos Económicos</option>
                    <option value="JUR - Jurídico">JUR - Jurídico</option>
                    <option value="SAN - Sanidad">SAN - Sanidad</option>
                    <option value="ING - Ingeniería">ING - Ingeniería</option>
                    <option value="INF - Infraestructura">INF - Infraestructura</option>
                    <option value="ENS - Enseñanza">ENS - Enseñanza</option>
                    <option value="CIV - Cooperación Cívil-Militar">CIV - Cooperación Cívil-Militar</option>
                    <option value="COM - Comunicación Pública">COM - Comunicación Pública</option>
                    <option value="CIB - Ciberdefensa">CIB - Ciberdefensa</option>
                    <option value="CAL - Calidad y Procesos">CAL - Calidad y Procesos</option>
                    <option value="SEG - Seguridad y Prevención">SEG - Seguridad y Prevención</option>
                    <option value="AMB - Medio Ambiente">AMB - Medio Ambiente</option>
                    <option value="TRA - Transportes">TRA - Transportes</option>
                    <option value="ARM - Armamento y Material">ARM - Armamento y Material</option>
                    <option value="INV - Investigación y Desarrollo">INV - Investigación y Desarrollo</option>
                    <option value="PRO - Protocolo">PRO - Protocolo</option>
                    <option value="ADM - Administración">ADM - Administración</option>
                    <option value="OTR - Otras áreas">OTR - Otras áreas</option>
                </select>
            </div>
        </div>
        
        <div class="justification-box">
            <div class="justification-label" style="margin-bottom: 5px;">
                Justifique la fortaleza <span class="required-star">*</span>
            </div>
            <textarea id="e_fortaleza_obs_${contadorFortalezasEvaluado}" class="required-msg" rows="3" 
                style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"
                placeholder="Argumente detalladamente con ejemplos concretos por qué destaca en esta competencia..."></textarea>
        </div>
    `;
    
    contenedor.appendChild(div);
}

let contadorMejorasEvaluado = 0;

function agregarDebilidadEvaluado() {
    contadorMejorasEvaluado++;
    const contenedor = document.getElementById('contenedor-debilidades-evaluado');
    
    if (!contenedor) return; 

    const div = document.createElement('div');
    div.className = 'eval-block'; 
    div.style.marginTop = "20px";
    div.style.padding = "15px";
    div.style.backgroundColor = "#f9fafb";
    div.style.borderLeft = "4px solid #708ea0"; 
    div.style.borderRadius = "0 4px 4px 0";
    
    div.innerHTML = `
        <div style="margin-bottom: 10px;">
            <label style="font-weight: bold; color: #00447b;">Competencia a mejorar:</label>
        </div>

        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <select id="e_mejora_tipo_${contadorMejorasEvaluado}" 
                style="width: 70%; height: 40px; padding: 0 10px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; font-size: 0.9rem;"
                onchange="document.getElementById('e_mejora_area_wrapper_${contadorMejorasEvaluado}').style.display = (this.value === 'CEX - Conocimiento Experto') ? 'block' : 'none';">
                <option value="">-- Seleccione competencia --</option>
                <optgroup label="Actuación con valores">
                    <option value="INE - Integridad y Ejemplaridad">INE Integridad y Ejemplaridad</option>
                    <option value="CCM Compromiso con la Misión">CCM Compromiso con la Misión</option>
                </optgroup>
                <optgroup label="Liderazgo y mando">
                    <option value="LID - Liderazgo de Equipos">LID Liderazgo de Equipos</option>
                    <option value="MEN Mentoria">MEN Mentoria</option>
                    <option value="HUM Humanidad">HUM Humanidad</option>
                </optgroup>
                <optgroup label="Capacidades de análisis y gestión">
                    <option value="CAD - Capacidad de Decisión">CAD Capacidad de Decisión</option>
                    <option value="COM - Comunicación">COM Comunicación</option>
                    <option value="VES - Visión Estratégica">VES Visión Estratégica</option>
                    <option value="ORC - Organización y Coordinación">ORC Organización y Coordinación</option>
                    <option value="POB - Planificación de Objetivos">POB Planificación de Objetivos</option>
                    <option value="INC - Iniciativa y Creatividad">INC Iniciativa y Creatividad</option>
                </optgroup>
                <optgroup label="Capacidades técnicas">
                    <option value="CEX - Conocimiento Experto">CEX Conocimiento Experto</option>
                    <option value="REE Rigor en la Ejecución">REE Rigor en la Ejecución</option>
                </optgroup>
            </select>

            <button type="button" class="btn-mini" 
                style="height: 38px; background:#fee2e2; color:#991b1b; border: 1px solid #f87171; padding: 0 15px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; justify-content: center;" 
                onclick="this.closest('.eval-block').remove()">
                Eliminar
            </button>
        </div>

        <div id="e_mejora_area_wrapper_${contadorMejorasEvaluado}" style="display: none; margin-bottom: 15px;">
            <div style="margin-bottom: 5px;">
                <label style="font-weight: bold; color: #00447b;">Área de experiencia específica:</label>
            </div>
            
            <div class="hint" style="font-size: 0.85rem; color: #666; font-style: italic; margin-bottom: 8px;">
                Haga clic en el botón inferior para añadir una nueva Área de Experiencia.
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <select id="e_mejora_area_${contadorMejorasEvaluado}" 
                    style="width: 70%; height: 38px; padding: 0 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; font-family: inherit;">
                    <option value="">-- Seleccione área de experiencia --</option>
                    <option value="OPE - Operaciones">OPE - Operaciones</option>
                    <option value="INT - Inteligencia y Seguridad">INT - Inteligencia y Seguridad</option>
                    <option value="PYO - Planes y Organización">PYO - Planes y Organización</option>
                    <option value="LOG - Logística">LOG - Logística</option>
                    <option value="PER - Personal">PER - Personal</option>
                    <option value="FYD - Formación y Doctrina">FYD - Formación y Doctrina</option>
                    <option value="CIS - Sistemas de Información y Telecomunicaciones">CIS - Sistemas de Información y Telecomunicaciones</option>
                    <option value="RRI - Relaciones Internacionales">RRI - Relaciones Internacionales</option>
                    <option value="REC - Recursos Económicos">REC - Recursos Económicos</option>
                    <option value="JUR - Jurídico">JUR - Jurídico</option>
                    <option value="SAN - Sanidad">SAN - Sanidad</option>
                    <option value="ING - Ingeniería">ING - Ingeniería</option>
                    <option value="INF - Infraestructura">INF - Infraestructura</option>
                    <option value="ENS - Enseñanza">ENS - Enseñanza</option>
                    <option value="CIV - Cooperación Cívil-Militar">CIV - Cooperación Cívil-Militar</option>
                    <option value="COM - Comunicación Pública">COM - Comunicación Pública</option>
                    <option value="CIB - Ciberdefensa">CIB - Ciberdefensa</option>
                    <option value="CAL - Calidad y Procesos">CAL - Calidad y Procesos</option>
                    <option value="SEG - Seguridad y Prevención">SEG - Seguridad y Prevención</option>
                    <option value="AMB - Medio Ambiente">AMB - Medio Ambiente</option>
                    <option value="TRA - Transportes">TRA - Transportes</option>
                    <option value="ARM - Armamento y Material">ARM - Armamento y Material</option>
                    <option value="INV - Investigación y Desarrollo">INV - Investigación y Desarrollo</option>
                    <option value="PRO - Protocolo">PRO - Protocolo</option>
                    <option value="ADM - Administración">ADM - Administración</option>
                    <option value="OTR - Otras áreas">OTR - Otras áreas</option>
                </select>
            </div>
        </div>
        
        <div class="justification-box">
            <div style="margin-bottom: 5px; font-weight: 500;">
                Justifique la Mejora <span style="color:red;">*</span>
            </div>
            <textarea id="e_mejora_obs_${contadorMejorasEvaluado}" class="required-msg" rows="3" 
                style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; box-sizing: border-box; display: block;"
                placeholder="Argumente detalladamente con ejemplos concretos..."></textarea>
        </div>
    `;
    
    contenedor.appendChild(div);
}

let contadorFilas = {
    fortalezas: 0,
    debilidades: 0
};

function agregarFila(tipo) {
    const contenedor = document.getElementById('contenedor-' + tipo);
    if (!contenedor) return;

    contadorFilas[tipo]++;
    const idActual = contadorFilas[tipo];
    const esFortaleza = (tipo === 'fortalezas');
    
    const etiquetaObs = esFortaleza ? 'Justifique la fortaleza' : 'Justifique la debilidad';
    const prefijoId = esFortaleza ? 'r_fortaleza' : 'r_debilidad';

    const div = document.createElement('div');
    div.className = 'eval-block'; 
    
    // Estilos unificados con agregarFortaleza
    div.style.marginTop = "15px";
    div.style.borderLeft = "4px solid #00447b"; 
    
    div.innerHTML = `
        <div style="margin-bottom: 5px;">
            <label style="font-weight: bold;">
                ${esFortaleza ? 'Competencia de especial fortaleza:' : 'Competencia de especial debilidad:'}
            </label>
        </div>

        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <select id="${prefijoId}_tipo_${idActual}" class="${tipo}-sel" 
                style="width: 70%; height: 38px; padding: 0 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"
                onchange="document.getElementById('${prefijoId}_area_wrapper_${idActual}').style.display = (this.value === 'CEX - Conocimiento Experto') ? 'block' : 'none';">
                <option value="">-- Seleccione competencia --</option>
                <optgroup label="Actuación con valores">
                    <option value="INE - Integridad y Ejemplaridad">INE Integridad y Ejemplaridad</option>
                    <option value="CCM - Compromiso con la Misión">CCM Compromiso con la Misión</option>
                </optgroup>
                <optgroup label="Liderazgo y mando">
                    <option value="LID - Liderazgo de Equipos">LID Liderazgo de Equipos</option>
                    <option value="MEN - Mentoria">MEN Mentoria</option>
                    <option value="HUM - Humanidad">HUM Humanidad</option>
                </optgroup>
                <optgroup label="Capacidades de análisis y gestión">
                    <option value="CAD - Capacidad de Decisión">CAD Capacidad de Decisión</option>
                    <option value="COM - Comunicación">COM Comunicación</option>
                    <option value="VES - Visión Estratégica">VES Visión Estratégica</option>
                    <option value="ORC - Organización y Coordinación">ORC Organización y Coordinación</option>
                    <option value="POB - Planificación de Objetivos">POB Planificación de Objetivos</option>
                    <option value="INC - Iniciativa y Creatividad">INC Iniciativa y Creatividad</option>
                </optgroup>
                <optgroup label="Capacidades técnicas">
                    <option value="CEX - Conocimiento Experto">CEX Conocimiento Experto</option>
                    <option value="REE - Rigor en la Ejecución">REE Rigor en la Ejecución</option>
                </optgroup>
            </select>
            
            <button type="button" class="btn-mini"
                style="height: 38px; background:#fee2e2; color:#991b1b; border: 1px solid #f87171; padding: 0 15px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; justify-content: center;" 
                onclick="this.closest('.eval-block').remove()">
                Eliminar
            </button>
        </div>

        <div id="${prefijoId}_area_wrapper_${idActual}" style="display: none; margin-bottom: 15px;">
            <div style="margin-bottom: 5px;">
                <label style="font-weight: bold;">Área de experiencia específica:</label>
            </div>
            
            <div class="hint" style="font-size: 0.85rem; color: #666; font-style: italic; margin-bottom: 8px;">
                Haga clic en el botón inferior para añadir una nueva Área de Experiencia.
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <select id="${prefijoId}_area_${idActual}" 
                    style="width: 70%; height: 38px; padding: 0 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="">-- Seleccione área de experiencia --</option>
                    <option value="OPE - Operaciones">OPE - Operaciones</option>
                    <option value="INT - Inteligencia y Seguridad">INT - Inteligencia y Seguridad</option>
                    <option value="PYO - Planes y Organización">PYO - Planes y Organización</option>
                    <option value="LOG - Logística">LOG - Logística</option>
                    <option value="PER - Personal">PER - Personal</option>
                    <option value="FYD - Formación y Doctrina">FYD - Formación y Doctrina</option>
                    <option value="CIS - Sistemas de Información y Telecomunicaciones">CIS - Sistemas de Información y Telecomunicaciones</option>
                    <option value="RRI - Relaciones Internacionales">RRI - Relaciones Internacionales</option>
                    <option value="REC - Recursos Económicos">REC - Recursos Económicos</option>
                    <option value="JUR - Jurídico">JUR - Jurídico</option>
                    <option value="SAN - Sanidad">SAN - Sanidad</option>
                    <option value="ING - Ingeniería">ING - Ingeniería</option>
                    <option value="INF - Infraestructura">INF - Infraestructura</option>
                    <option value="ENS - Enseñanza">ENS - Enseñanza</option>
                    <option value="CIV - Cooperación Cívil-Militar">CIV - Cooperación Cívil-Militar</option>
                    <option value="COM - Comunicación Pública">COM - Comunicación Pública</option>
                    <option value="CIB - Ciberdefensa">CIB - Ciberdefensa</option>
                    <option value="CAL - Calidad y Procesos">CAL - Calidad y Procesos</option>
                    <option value="SEG - Seguridad y Prevención">SEG - Seguridad y Prevención</option>
                    <option value="AMB - Medio Ambiente">AMB - Medio Ambiente</option>
                    <option value="TRA - Transportes">TRA - Transportes</option>
                    <option value="ARM - Armamento y Material">ARM - Armamento y Material</option>
                    <option value="INV - Investigación y Desarrollo">INV - Investigación y Desarrollo</option>
                    <option value="PRO - Protocolo">PRO - Protocolo</option>
                    <option value="ADM - Administración">ADM - Administración</option>
                    <option value="OTR - Otras áreas">OTR - Otras áreas</option>
                </select>
            </div>
        </div>
        
        <div class="justification-box">
            <div class="justification-label" style="margin-bottom: 5px;">
                ${etiquetaObs} <span class="required-star">*</span>
            </div>
            <textarea id="${prefijoId}_obs_${idActual}" class="${tipo}-obs required-msg" rows="3" 
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"
                placeholder="Argumente detalladamente..."></textarea>
        </div>
    `;
    
    contenedor.appendChild(div);
}

/**
 * Muestra una alerta con el estilo visual de la aplicación
 * @param {string} mensaje - El texto a mostrar
 * @param {string} titulo - (Opcional) Título de la ventana
 */
function mostrarAlerta(mensaje, titulo = "Aviso del Sistema") {
    const modal = document.getElementById('customAlert');
    const msgEl = document.getElementById('alertMessage');
    const titleEl = document.getElementById('alertTitle');

    if (!modal || !msgEl) return;

    msgEl.textContent = mensaje;
    titleEl.textContent = titulo;
    
    // Mostramos el modal usando flex para centrarlo
    modal.style.display = 'flex';
}

function closeAlert() {
    document.getElementById('customAlert').style.display = 'none';
}

// --- EJEMPLO DE INTEGRACIÓN EN TU VALIDACIÓN ---
// Sustituye los alert(...) por mostrarAlerta(...)
function guardarEncuesta(tipo) {
    if (tipo !== 'responsable') return;

    const radio = document.querySelector('input[name="r_valores"]:checked');
    if (!radio) {
        mostrarAlerta("Sección 1: Por favor, seleccione una valoración en 'Actuación con valores'.", "Validación Pendiente");
        showRespTab('competencias');
        return;
    }
    // ... resto del código
}

/**
 * Convierte una fecha YYYY-MM-DD a DD-MM-YYYY
 * @param {string} fechaISO - Ejemplo: "1985-05-15"
 * @returns {string} - Ejemplo: "15-05-1985"
 */
function formatearFechaArmada(fechaISO) {
    if (!fechaISO) return "—";
    const [year, month, day] = fechaISO.split('-');
    return `${day}-${month}-${year}`;
}

// Ejemplo de cómo usarlo cuando rellenas los datos:
function cargarDatosInformado(datos) {
    document.getElementById('inf_nom').value = datos.nombre;
    // ... otros campos ...
    
    // Aplicamos el formato específico DD-MM-YYYY
    document.getElementById('inf_fnac').value = formatearFechaArmada(datos.fechaNacimiento);
    document.getElementById('inf_fasc').value = formatearFechaArmada(datos.fechaAscenso);
}

function toggleMultiSelect(event, element) {
    // 1. Buscamos el checkbox dentro de la tarjeta
    const checkbox = element.querySelector('input[type="checkbox"]');
    if (!checkbox) return;

    // 2. Si el usuario hizo clic directamente en el cuadradito (INPUT)
    if (event.target.tagName === 'INPUT') {
        // El navegador ya cambió el estado del check, solo actualizamos el color
        aplicarColorCheck(element, checkbox.checked);
    } 
    else {
        // 3. Si hizo clic en el texto o en el fondo de la tarjeta
        event.preventDefault(); // Evitamos duplicidad de eventos
        checkbox.checked = !checkbox.checked; // Cambiamos el estado manualmente
        aplicarColorCheck(element, checkbox.checked);
        
        // Disparamos el evento change para que el sistema se entere
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

// Función interna para asegurar que el color cambie SÍ o SÍ
function aplicarColorCheck(element, estaMarcado) {
    if (estaMarcado) {
        element.style.setProperty('background-color', '#93a9bd', 'important');
        element.style.setProperty('color', '#ffffff', 'important');
    } else {
        element.style.setProperty('background-color', '#f0f7ff', 'important');
        element.style.setProperty('color', '#000000', 'important');
    }
}

// Función auxiliar para no repetir código de colores
function actualizarEstiloVisual(element) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    if (!checkbox) return;

    if (checkbox.checked) {
        element.style.setProperty('background-color', '#93a9bd', 'important');
        element.style.setProperty('color', '#ffffff', 'important');
    } else {
        element.style.setProperty('background-color', '#f0f7ff', 'important');
        element.style.setProperty('color', '#000000', 'important');
    }
}

function limpiarFormulario(seccion) {
    const mensaje = seccion === 'responsable' 
        ? "¿Está seguro de que desea borrar todos los datos del Responsable?" 
        : "¿Está seguro de que desea borrar todos los datos del Evaluado?";

    // 1. Usamos confirm nativo para detener la ejecución y esperar al usuario
    if (window.confirm(mensaje)) { 
        
        // 2. Ejecutamos la limpieza técnica
        ejecutarLimpieza(seccion);
        
        // 3. Mostramos tu alerta personalizada de éxito
        const tituloFinal = seccion === 'responsable' ? "Sección Responsable" : "Sección Evaluado";
        if (typeof mostrarAlerta === "function") {
            mostrarAlerta("La sección ha sido reiniciada correctamente.", tituloFinal);
        }
    }
}

function ejecutarLimpieza(seccion) {
    // IMPORTANTE: En tu HTML las secciones usan CLASES (ej: <section class="seccion-evaluado">)
    const claseContenedor = seccion === 'responsable' ? '.seccion-responsable' : '.seccion-evaluado';
    const contenedorPrincipal = document.querySelector(claseContenedor);

    if (!contenedorPrincipal) {
        console.error("No se encontró el contenedor con la clase: " + claseContenedor);
        return;
    }

    // 1. Limpiar todos los inputs (texto, radio, checkbox) y textareas dentro de esa sección
    const elementos = contenedorPrincipal.querySelectorAll('input, textarea, select');
    elementos.forEach(el => {
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
        } else {
            el.value = '';
        }
    });

    // 2. Resetear visualmente los botones (quitar el Azul Niebla)
    const labels = contenedorPrincipal.querySelectorAll('.opt-item');
    labels.forEach(label => {
        label.style.setProperty('background-color', '#f0f7ff', 'important');
        label.style.setProperty('color', '#000000', 'important');
        label.style.setProperty('box-shadow', 'none', 'important');
        label.style.setProperty('border-color', '#00447b', 'important');
    });

    // 3. Limpiar bloques dinámicos (las filas añadidas con el botón "+")
    if (seccion === 'responsable') {
        const contFort = document.getElementById('contenedor-fortalezas');
        if (contFort) contFort.innerHTML = '';
        if (typeof contadorFortalezas !== 'undefined') contadorFortalezas = 0;

        const contDeb = document.getElementById('contenedor-debilidades');
        if (contDeb) contDeb.innerHTML = '';
        if (typeof contadorDebilidades !== 'undefined') contadorDebilidades = 0;
    } else {
        // ID específico de la 3.4 del Evaluado
        const contMejora = document.getElementById('contenedor-debilidades-evaluado');
        if (contMejora) {
            contMejora.innerHTML = '';
        }
        // Reiniciamos el contador que creamos para el evaluado
        if (typeof contadorMejorasEvaluado !== 'undefined') {
            contadorMejorasEvaluado = 0;
        }
    }
}