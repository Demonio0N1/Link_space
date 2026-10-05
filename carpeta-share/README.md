# carpeta-share

Comparte carpetas de tu computadora con otras personas mediante un enlace
único. El invitado abre el enlace y obtiene VS Code conectado a esa carpeta
**en tu máquina**: puede editar archivos, usar una terminal real, activar tus
entornos de conda y ejecutar notebooks — todo confinado a esa carpeta, sin
ver el resto de tu sistema.

Hay **tres tipos de enlace**, y el flujo de compartir siempre te deja elegir:

| | Enlace **web** | Enlace **VS Code escritorio** | Enlace de **solo descarga** |
|---|---|---|---|
| Qué recibe el invitado | VS Code en el navegador (code-server) | VS Code nativo de escritorio | El archivo, o la carpeta en un `.zip` |
| El invitado instala | **Nada** — abre la URL en su navegador | VS Code + Remote-SSH + Tailscale (una vez) | **Nada** — abre la URL y se descarga |
| Protección | Contraseña opcional (**con clave o no**) | Llave SSH (siempre) | Token único dentro del enlace |
| Exposición | URL pública en internet (Tailscale Funnel) | Solo tu red privada Tailscale | URL pública (el mismo Funnel) |
| Acceso a tu equipo | Editor + terminal, confinado a la carpeta | Editor + terminal, confinado a la carpeta | **Ninguno**: solo bajar eso |

**Cómo funciona por dentro:** usuarios invitados dedicados del sistema (sin
contraseña de login, sin sudo) + ACLs del sistema de archivos; el modo web usa
code-server publicado con Tailscale Funnel (sin abrir puertos en el router), y
el modo escritorio usa SSH por llave dentro de Tailscale con enlaces
`vscode://vscode-remote/ssh-remote+…`. El modo solo descarga no crea usuarios
ni da terminal: un servidor mínimo de solo lectura, en loopback, publicado en
la ruta `/dl` de ese mismo Funnel.

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

### El atajo: `linkspace`

Entra a la carpeta y escribe una sola palabra:

```
$ cd ~/Proyectos/tesis
$ linkspace
📁 Carpeta a compartir: /Users/tu/Proyectos/tesis

¿Proteger el enlace con contraseña?
  1) Sí, generar una segura (recomendado)
  2) Sí, escribir la mía
  3) No — cualquiera con el enlace podrá entrar

Opción [1]:
```

Y obtienes la URL (ya copiada al portapapeles) con la contraseña elegida.
También acepta una ruta: `linkspace ~/otra/carpeta`.

### Modo web — el invitado NO instala nada

```bash
carpeta-share compartir ~/Proyectos/tesis --web --con-contrasena   # contraseña generada
carpeta-share compartir ~/Proyectos/tesis --web --contrasena "MiClave123"  # la tuya
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
  Funnel: 443, 8443 y 10000). Los enlaces de solo descarga no cuentan: van
  todos por la ruta `/dl` de uno de esos puertos.

### Modo solo descarga — un enlace para bajar y nada más

Para cuando solo quieres **entregar** algo: sin editor, sin terminal y sin
que nadie entre a tu equipo. Vale para una carpeta (se baja como `.zip`) o
para un archivo suelto:

```bash
carpeta-share compartir ~/Proyectos/tesis --descarga         # carpeta → tesis.zip
carpeta-share compartir ~/Documentos/informe.pdf --descarga  # archivo tal cual
linkspace descarga                                           # atajo: la carpeta actual
linkspace descarga ~/Documentos/informe.pdf
```

Obtienes un enlace único (queda en tu portapapeles), del estilo
`https://tu-equipo.xxxx.ts.net/dl/Zk3…token…`. Quien lo abre —desde
cualquier navegador, o con `curl -OJ <enlace>`— recibe la descarga
directamente. No instala nada y no necesita Tailscale.

Cosas que debes saber del modo solo descarga:

* **El token es la llave**: cualquiera que tenga el enlace puede descargar.
  Trátalo como una contraseña. Cada archivo o carpeta tiene su propio token;
  repetir el comando sobre la misma ruta devuelve el mismo enlace.
* **Reutiliza el Funnel del modo web**: se publica en la ruta `/dl` del puerto
  que ya use un enlace web tuyo (o, si no hay ninguno, en el primero de Funnel
  que esté libre: normalmente el 443), así que convive
  con ellos y no consume ninguno de los 3 puertos de Funnel. Nunca se monta
  sobre un `tailscale serve` tuyo que no sea de carpeta-share.
* **La carpeta se comprime al vuelo**, sin archivos temporales, con lo que
  haya en ese momento: si cambias algo, la próxima descarga ya lo trae. Los
  enlaces simbólicos que apunten fuera de la carpeta no se incluyen.
* **No hace falta root** (en macOS): no se crean usuarios ni ACLs. El
  servidor corre como tú, solo en `127.0.0.1`, y únicamente sabe entregar lo
  que registraste. En Linux, Tailscale pide `sudo` para tocar Funnel salvo
  que seas su *operator* (`sudo tailscale set --operator=$USER`).
* **Revocar** es inmediato: `carpeta-share dejar-de-compartir <ruta>
  --descarga` (o desde el panel). Al revocar el último enlace se apaga el
  servidor y se despublica `/dl`.
* Si reinicias tu equipo, repite `compartir <ruta> --descarga` con cualquiera
  de tus rutas: relanza el servidor y **todos** los enlaces vuelven a
  funcionar, con sus mismos tokens.
* `carpeta-share estado` y el panel muestran cuántas descargas completas
  lleva cada enlace (registro en `~/.config/carpeta-share/descargas.log`).

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
  **Compartir carpeta…** → eliges enlace web (con o sin contraseña), solo
  descarga, invitado existente o "nuevo acceso sin llave" → el enlace queda
  copiado. Sobre un **archivo**: clic derecho → **Compartir enlace de
  descarga…**

En Finder y Nautilus el menú de opciones incluye también **Enlace de SOLO
DESCARGA (.zip)**.

En todos los casos el enlace queda **copiado en tu portapapeles**, listo para
WhatsApp o correo.

---

## Qué necesita instalar el invitado

**Enlace web: nada.** Abre la URL en su navegador y escribe la contraseña si
el enlace la lleva. Eso es todo.

**Enlace de solo descarga: nada.** Abre la URL y el navegador descarga el
archivo (o el `.zip` de la carpeta).

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

### Panel de conexiones

```bash
carpeta-share panel     # o: linkspace panel
```

Un panel interactivo en la terminal que muestra cada carpeta compartida y su
estado **en vivo**:

```
════════════════ carpeta-share · panel ════════════════  18:42:10

  CARPETAS COMPARTIDAS
   1) [WEB] ~/Proyectos/tesis
        invitado web1       ● EN USO (2 conexión/es)
        https://mi-equipo.tailxxxx.ts.net/  (contraseña: f52pFbTSLyXR)
   2) [SSH] ~/Proyectos/datos
        invitado ana        ○ libre
   3) [DESCARGA] ~/Documentos/informe.pdf
        archivo · 4 descarga/s completada/s
        https://mi-equipo.tailxxxx.ts.net/dl/Zk3vQ…

  INVITADOS
   4) ana          usuario cs-ana      modo clave    activo
   5) web1         usuario cs-web1     modo web      activo

  [número] gestionar · [Enter] refrescar · [q] salir
```

`● EN USO` significa que hay conexiones abiertas en este momento (pestañas
del navegador en modo web, sesiones SSH en modo escritorio). Eliges un número
y puedes **cerrar el enlace**, **suspender** (corta las sesiones al instante,
reversible), **eliminar al invitado por completo** o **revocar un enlace de
descarga** — sin recordar comandos.

### Comandos sueltos

```bash
carpeta-share estado                          # invitados, carpetas, Tailscale/SSH
carpeta-share dejar-de-compartir <carpeta>    # retira las ACLs (y su enlace de descarga)
carpeta-share dejar-de-compartir <ruta> --descarga   # revoca solo el enlace de descarga
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

**Seguridad específica del modo solo descarga:**

* El enlace **solo permite descargar** lo que registraste para ese token: no
  hay editor, terminal, subida de archivos ni listado de carpetas. La URL no
  lleva rutas —solo el token—, así que no existe forma de pedir otro archivo.
* El token (192 bits aleatorios) es la única barrera, y la URL es alcanzable
  desde todo internet. No hay contraseña aparte: si el enlace se filtra,
  revócalo y genera otro.
* El servidor corre como **tu** usuario (nunca como root), escucha solo en
  `127.0.0.1` y relee el estado en cada petición: un enlace revocado deja de
  funcionar en el acto.

**Lo que NO puede hacer (modos web y escritorio):**

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

## Actualizar

```bash
carpeta-share actualizar     # o: linkspace actualizar
```

Hace `git pull` en el repositorio, reinstala los comandos y actualiza la
extensión de VS Code, sin preguntas. (Equivale a `./setup.sh --actualizar`
dentro del repo.) Tu configuración, invitados y carpetas compartidas no se
tocan.

## Desinstalar

```bash
# primero elimina los invitados (revierte usuarios, ACLs y sshd_config):
carpeta-share invitado eliminar <nombre>
./setup.sh --uninstall
```

## Pruebas

Checklist completo de verificación manual en [PRUEBAS.md](PRUEBAS.md).
