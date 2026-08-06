# carpeta-share

Comparte carpetas de tu computadora con otras personas mediante un enlace
único. El invitado abre el enlace y obtiene VS Code conectado a esa carpeta
**en tu máquina**: puede editar archivos, usar una terminal real, activar tus
entornos de conda y ejecutar notebooks — todo confinado a esa carpeta, sin
ver el resto de tu sistema.

Hay **dos tipos de enlace**, y el flujo de compartir siempre te deja elegir:

| | Enlace **web** | Enlace **VS Code escritorio** |
|---|---|---|
| El invitado instala | **Nada** — abre la URL en su navegador | VS Code + Remote-SSH + Tailscale (una vez) |
| Protección | Contraseña opcional (**con clave o no**) | Llave SSH (siempre) |
| Exposición | URL pública en internet (Tailscale Funnel) | Solo tu red privada Tailscale |
| Experiencia | VS Code en el navegador (code-server) | VS Code nativo de escritorio |

**Cómo funciona por dentro:** usuarios invitados dedicados del sistema (sin
contraseña de login, sin sudo) + ACLs del sistema de archivos; el modo web usa
code-server publicado con Tailscale Funnel (sin abrir puertos en el router), y
el modo escritorio usa SSH por llave dentro de Tailscale con enlaces
`vscode://vscode-remote/ssh-remote+…`.

---

## Instalación (anfitrión) — 3 pasos

1. **Ejecuta el instalador** (macOS o Linux):

   ```bash
   cd carpeta-share
   ./setup.sh
   ```

   Verifica/instala Tailscale, activa SSH, instala el CLI `carpeta-share`,
   el clic derecho de Finder/Nautilus y la extensión de VS Code.

2. **Enciende Tailscale** e inicia sesión: abre la app o corre `tailscale up`.

3. **Comparte tu equipo con cada invitado** desde el panel de Tailscale:
   <https://login.tailscale.com/admin/machines> → tu equipo → menú **⋯** →
   **Share…** → envíale el enlace de invitación. El invitado lo acepta con su
   propia cuenta de Tailscale y solo ve **este** equipo, no tu red.

> **macOS:** en Ajustes del Sistema → General → Compartir → **Sesión remota**,
> activa también "Permitir acceso total al disco para los usuarios remotos" si
> vas a compartir carpetas dentro de Escritorio/Documentos/Descargas (macOS
> las protege aparte).

---

## Compartir una carpeta

### Modo web — el invitado NO instala nada

```bash
carpeta-share compartir ~/Proyectos/tesis --web --con-contrasena   # recomendado
carpeta-share compartir ~/Proyectos/tesis --web --sin-contrasena   # URL abierta
```

Obtienes una URL `https://tu-equipo.xxxx.ts.net/` (queda en tu portapapeles)
y, si elegiste con contraseña, una contraseña generada. El invitado abre la
URL en **cualquier navegador** — computadora, tablet o celular — y ve VS Code
completo con editor, terminal, conda y notebooks. No instala absolutamente
nada.

La primera vez, Tailscale te pedirá habilitar **Funnel** y **HTTPS** en tu
tailnet: el propio comando te muestra el enlace del panel; es un clic, una
sola vez.

Cosas que debes saber del modo web:

* La URL es **pública en internet**: cualquiera que la tenga puede intentar
  entrar. Por eso el flujo te ofrece la opción **con contraseña** (envíala
  por un canal distinto al del enlace) o **sin contraseña** (solo para cosas
  no sensibles).
* Corre como un usuario invitado confinado igual que el modo escritorio
  (sin sudo, solo la carpeta, conda en solo lectura).
* Usa el marketplace Open VSX (la extensión de Jupyter está disponible; el
  invitado la instala dentro del propio VS Code web con dos clics).
* Si reinicias tu equipo, repite el mismo comando `compartir --web` para
  relanzar el servidor; los permisos y la contraseña se conservan.
* Hay un máximo de **3 enlaces web simultáneos** (límite de puertos de
  Funnel: 443, 8443 y 10000).

### Modo VS Code escritorio

El invitado instala una sola vez VS Code + Remote-SSH + Tailscale (y acepta
tu invitación de nodo compartido). A cambio, el enlace nunca sale de tu red
privada y la autenticación es siempre por llave SSH. Dos variantes:

#### Modo A — con llave (recomendado)

El invitado genera su llave **una sola vez** y te manda la parte pública:

```bash
# (en la máquina del invitado)
ssh-keygen -t ed25519            # Enter a todo; crea ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub        # ← te envía ESTA línea (empieza con ssh-ed25519)
```

Tú lo das de alta y compartes:

```bash
carpeta-share invitado agregar ana "ssh-ed25519 AAAA... ana@laptop"
carpeta-share compartir ~/Proyectos/tesis --con ana
```

#### Modo B — sin llave (el invitado no sabe/quiere generar llaves)

```bash
carpeta-share compartir ~/Proyectos/tesis --sin-clave
```

La herramienta genera el par de llaves por ti, crea el usuario invitado y
deja un **paquete** en `~/CarpetaShare-Accesos/<nombre>/` con la llave
privada + `LEEME.txt` (instrucciones paso a paso + el enlace). Envíale la
carpeta completa (zip) por un canal razonablemente privado. Es menos seguro
que el modo A porque la llave privada viaja por tu canal de envío.

### Desde la interfaz gráfica

* **Finder (macOS):** clic derecho sobre una carpeta → *Acciones rápidas* →
  **Compartir carpeta con VS Code**. Si el menú no aparece tras instalar,
  ábrela una vez con Automator:
  `open ~/Library/Services/"Compartir carpeta con VS Code.workflow"`
* **Nautilus (Linux):** clic derecho → *Scripts* → **Compartir carpeta con VS
  Code** (en KDE/Dolphin aparece directamente en el menú contextual).
* **VS Code:** clic derecho sobre una carpeta en el explorador →
  **Compartir carpeta…** → eliges enlace web (con o sin contraseña),
  invitado existente o "nuevo acceso sin llave" → el enlace queda copiado.

En todos los casos el enlace queda **copiado en tu portapapeles**, listo para
WhatsApp o correo.

---

## Qué necesita instalar el invitado

**Enlace web: nada.** Abre la URL en su navegador y escribe la contraseña si
el enlace la lleva. Eso es todo.

**Enlace VS Code escritorio** (una sola vez):

1. **VS Code de escritorio** + extensión **Remote - SSH** (y **Jupyter** si
   usará notebooks).
2. **Tailscale**, con sesión iniciada en su propia cuenta.
3. **Aceptar tu invitación** de nodo compartido de Tailscale.
4. Haberte dado su llave pública (modo A) **o** instalar el paquete de acceso
   que le enviaste (modo B; el `LEEME.txt` lo guía).

Después, solo abre el enlace `vscode://…` que le mandaste: su VS Code se
conecta y abre la carpeta. La primera conexión tarda un poco (VS Code instala
su componente remoto en tu máquina, dentro del home del invitado).

## Notebooks y conda (invitado)

* La terminal integrada ya trae `conda` configurado: `conda activate <env>`
  activa **tus** entornos (solo lectura — puede usarlos, no modificarlos).
* `conda create -n suyo python=3.12` funciona: sus entornos y paquetes se
  guardan en **su** home de invitado (`CONDA_ENVS_PATH`/`CONDA_PKGS_DIRS`),
  nunca en tu instalación.
* En un `.ipynb`, con la extensión Jupyter, el selector de kernel muestra los
  entornos de conda del anfitrión; el notebook se ejecuta en tu máquina.

---

## Administración diaria

```bash
carpeta-share estado                          # invitados, carpetas, Tailscale/SSH
carpeta-share dejar-de-compartir <carpeta>    # retira las ACLs
carpeta-share invitado suspender ana          # corta el acceso (reversible)
carpeta-share invitado reactivar ana
carpeta-share invitado eliminar ana           # borra usuario, ACLs y bloque sshd
```

Las acciones destructivas piden confirmación; añade `--si` para saltarla.

## Seguridad

**Lo que el invitado SÍ puede hacer:**

* Leer/escribir la carpeta compartida (y solo esa).
* Usar una terminal como su usuario invitado, ejecutar scripts y notebooks.
* Usar tus entornos de conda en solo lectura y crear entornos propios.
* Redirigir puertos TCP (necesario para Remote-SSH/Jupyter).

**Seguridad específica del modo web:**

* La URL de Funnel es alcanzable desde todo internet; la contraseña del
  enlace es la única barrera. Prefiere siempre **con contraseña** y envíala
  por un canal distinto al del enlace.
* code-server corre solo en `127.0.0.1` (nadie de tu red local entra
  directo) y como el usuario invitado confinado, nunca como tú.
* `carpeta-share dejar-de-compartir <carpeta>` apaga el servidor **y**
  despublica la URL de Funnel al instante.

**Lo que NO puede hacer (ambos modos):**

* Entrar con contraseña de sistema (no existe: los usuarios invitados tienen
  el login bloqueado; en SSH además sshd la rechaza).
* Usar `sudo` (no es administrador) ni leer tu home u otras carpetas: los
  directorios padres solo tienen permiso de *tránsito* (atravesar sin listar).
* Modificar tu conda, usar tu agente SSH o tu pantalla (agent/X11 forwarding
  deshabilitados por bloque `Match User` en sshd).

**Revocar acceso en un comando:**

```bash
carpeta-share invitado suspender ana   # inmediato y reversible
# o, definitivo:
carpeta-share invitado eliminar ana --si
```

También puedes dejar de compartir tu equipo desde el panel de Tailscale
(corta la red por completo).

**Límites honestos:** el invitado ejecuta código real en tu máquina como un
usuario sin privilegios. Eso es lo que pediste (kernels, terminal), pero
significa que puede consumir CPU/RAM/disco y acceder a Internet desde tu IP.
Comparte solo con gente en la que confíes a ese nivel. Revisa además que tu
home no sea legible por otros (`chmod 750 ~` si hace falta; el CLI te avisa).

## Desinstalar

```bash
# primero elimina los invitados (revierte usuarios, ACLs y sshd_config):
carpeta-share invitado eliminar <nombre>
./setup.sh --uninstall
```

## Pruebas

Checklist completo de verificación manual en [PRUEBAS.md](PRUEBAS.md).
