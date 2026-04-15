(function(){
  "use strict";

  window.baseDatosUsuarios = [
    { user: "admin", pass: "1234", nombre: "Juan Pérez García", perfil: "Administrador" },
    { user: "CHM", pass: "armada2026", nombre: "Carlos Holgado Moratilla", perfil: "Administrador" },
    { user: "gestor", pass: "armada2026", nombre: "Elena Martínez", perfil: "Gestor" },
    { user: "mtp", pass: "armada2026", nombre: "MTP", perfil: "Gestor" },   // ← CORREGIDO
    { user: "responsable", pass: "responsable", nombre: "Responsable", perfil: "RESPONSABLE" },
    { user: "evaluado", pass: "evaluado", nombre: "Evaluado", perfil: "EVALUADO" }
  ];

  window.validarCredenciales = function(usuarioInput, passInput){
    usuarioInput = (usuarioInput || "").trim();
    passInput = (passInput || "");

    for (var i=0;i<window.baseDatosUsuarios.length;i++){
      var u = window.baseDatosUsuarios[i];
      if (u.user === usuarioInput && u.pass === passInput) return u;
    }
    return null;
  };

})();