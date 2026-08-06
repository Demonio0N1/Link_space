# Checklist de pruebas manuales

Marca cada casilla en orden. Necesitas: tu máquina (anfitrión) y una segunda
máquina (invitado) con su propia cuenta de Tailscale.

## En el anfitrión

### Instalación
- [ ] `./setup.sh` termina sin errores y es re-ejecutable (correrlo 2 veces no rompe nada).
- [ ] `carpeta-share estado` muestra Tailscale activo (con nombre `*.ts.net`) y SSH activo en el puerto 22.
- [ ] macOS: clic derecho sobre una carpeta en Finder → Acciones rápidas → aparece "Compartir carpeta con VS Code". (Si no: `open ~/Library/Services/"Compartir carpeta con VS Code.workflow"` una vez con Automator.)
- [ ] VS Code: clic derecho sobre una carpeta del explorador → aparece "Compartir carpeta…".

### Alta de invitado (modo con llave)
- [ ] `carpeta-share invitado agregar prueba "<llave pública del invitado>"` crea el usuario `cs-prueba`.
- [ ] macOS: `cs-prueba` NO aparece en la pantalla de login. Linux: `passwd -S cs-prueba` muestra `L` (bloqueada).
- [ ] `/etc/ssh/sshd_config` contiene el bloque `# >>> carpeta-share: cs-prueba >>>` y `sshd -t` no da errores.

### Compartir
- [ ] `carpeta-share compartir ~/alguna/carpeta --con prueba` imprime el enlace `vscode://vscode-remote/ssh-remote+cs-prueba@...` y queda en el portapapeles (pégalo para verificar).
- [ ] `carpeta-share compartir <otra carpeta> --sin-clave` crea `~/CarpetaShare-Accesos/acceso1/` con `clave_carpeta_share`, `.pub` y `LEEME.txt` con el enlace.
- [ ] El flujo gráfico (Finder o VS Code) ofrece las dos opciones: invitado con llave y "nuevo acceso sin llave".
- [ ] `carpeta-share estado` lista la carpeta compartida con su invitado.
- [ ] Repetir el mismo `compartir` no duplica ACLs ni entradas en el estado (idempotencia).

### Modo web (enlace en el navegador)
- [ ] `carpeta-share compartir <carpeta> --web --con-contrasena` arranca code-server, activa Funnel e imprime URL `https://…ts.net/` + contraseña (URL en el portapapeles).
- [ ] La primera vez, si Funnel no está habilitado en el tailnet, el error muestra el enlace del panel para activarlo; tras activarlo, el mismo comando funciona.
- [ ] `carpeta-share estado` lista el enlace web con su URL, invitado (`webN`) y contraseña.
- [ ] Repetir el mismo comando es idempotente: conserva URL, puerto y contraseña.
- [ ] El proceso `code-server` corre como el usuario invitado `cs-webN` (verifica con `ps aux | grep code-server`), NO como tu usuario.
- [ ] `curl http://127.0.0.1:<puerto_local>` responde solo en localhost; desde otra máquina de tu LAN el puerto no es accesible.
- [ ] `carpeta-share compartir <otra> --web --sin-contrasena` avisa que cualquiera con la URL puede entrar.
- [ ] `carpeta-share dejar-de-compartir <carpeta>` mata el proceso code-server y la URL pública deja de responder.

### Panel de conexiones
- [ ] `carpeta-share panel` (o `linkspace panel`) lista las carpetas web y SSH con su invitado, URL y contraseña.
- [ ] Con el invitado conectado (navegador abierto o sesión SSH activa), el panel muestra `● EN USO` con el número de conexiones; al cerrar el navegador/sesión y refrescar (Enter), pasa a `○ libre`.
- [ ] Desde el panel, la acción [c] cierra un enlace web (la URL deja de responder al instante).
- [ ] Desde el panel, [s] suspende a un invitado con sesión abierta y su sesión se corta al momento.
- [ ] Desde el panel, [e] elimina un invitado por completo (igual que `invitado eliminar --si`).

### Revocación
- [ ] `carpeta-share dejar-de-compartir <carpeta>` pide confirmación (y `--si` la salta); tras esto el invitado pierde acceso a la carpeta (verifícalo desde el invitado).
- [ ] `carpeta-share invitado suspender prueba` cierra la sesión abierta del invitado y bloquea nuevas conexiones.
- [ ] `carpeta-share invitado reactivar prueba` restaura el acceso.
- [ ] `carpeta-share invitado eliminar prueba` borra el usuario, su home, su bloque en sshd_config y sus ACLs (en la carpeta: `ls -led <carpeta>` en macOS / `getfacl <carpeta>` en Linux ya no muestran `cs-prueba`).

## En la máquina del invitado

### Modo web (no requiere instalar nada)
- [ ] Abrir la URL en un navegador cualquiera muestra la pantalla de contraseña (si el enlace la lleva) y, tras escribirla, VS Code con la carpeta compartida.
- [ ] Con enlace SIN contraseña, la URL abre VS Code directamente.
- [ ] La terminal integrada funciona (`whoami` → `cs-webN`) y `conda activate <env>` funciona.
- [ ] Puede instalar la extensión Jupyter (Open VSX) dentro del VS Code web y ejecutar un notebook con un kernel de conda del anfitrión.
- [ ] El confinamiento aplica igual: `ls /Users/<tu-usuario>` → *Permission denied*; `sudo` no disponible.
- [ ] Funciona también desde un celular o tablet (mismo enlace).

### Conexión (modo VS Code escritorio)
- [ ] Aceptó la invitación del nodo compartido; `tailscale status` muestra tu equipo.
- [ ] Con VS Code + Remote-SSH instalados, **abrir el enlace** abre VS Code conectado con la carpeta compartida como raíz del explorador.
- [ ] Puede crear, editar y borrar archivos dentro de la carpeta y tú ves los cambios al instante.

### Terminal y conda
- [ ] La terminal integrada abre una shell real del anfitrión como `cs-...` (`whoami` lo confirma).
- [ ] `conda env list` muestra los entornos del anfitrión y `conda activate <env>` funciona; `python -c "import sys; print(sys.executable)"` apunta al conda del anfitrión.
- [ ] `pip install` DENTRO de un entorno del anfitrión FALLA (solo lectura).
- [ ] `conda create -n mio python -y` funciona y el entorno queda en el home del invitado (`~/.conda/envs/mio`).
- [ ] Ejecutar un script: `python archivo.py` dentro de la carpeta funciona.

### Notebooks
- [ ] Con la extensión Jupyter, al abrir un `.ipynb` el selector de kernel ofrece los entornos de conda del anfitrión.
- [ ] Una celda con `import sys; sys.executable` ejecuta y muestra el python del entorno elegido (del anfitrión).

### Confinamiento (todo esto debe FALLAR)
- [ ] `ls /Users/<tu-usuario>` (o `/home/<tu-usuario>`) → *Permission denied* (puede atravesar, no listar).
- [ ] `cat` de un archivo tuyo fuera de la carpeta compartida → *Permission denied*.
- [ ] `sudo -l` / `sudo id` → no tiene sudo (pide contraseña que no existe / "not in the sudoers file").
- [ ] `ssh` con contraseña: `ssh -o PubkeyAuthentication=no cs-...@<host>` → rechazado sin siquiera pedir contraseña.
- [ ] Escribir en la instalación de conda del anfitrión (`touch <conda>/test`) → *Permission denied*.
- [ ] `ssh -A` (agent forwarding): `ssh-add -l` dentro de la sesión no ve tu agente.
