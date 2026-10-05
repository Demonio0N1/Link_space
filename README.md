# Link_space

Comparte carpetas y archivos de tu computadora con **un enlace único**, sin
subir nada a la nube y sin abrir puertos en tu router. Todo sale directo de tu
máquina a través de [Tailscale](https://tailscale.com).

El proyecto vive en [`carpeta-share/`](carpeta-share/) e instala dos comandos:

* **`linkspace`** — el atajo de una palabra: entras a una carpeta, lo escribes
  y sales con un enlace en el portapapeles.
* **`carpeta-share`** — el CLI completo: invitados, permisos, panel en vivo,
  revocación.

Funciona en **macOS y Linux**.

## Tres formas de compartir

| | Enlace **web** | Enlace **VS Code escritorio** | Enlace de **solo descarga** |
|---|---|---|---|
| Qué recibe el invitado | VS Code en el navegador, con terminal y notebooks | Su VS Code nativo conectado por SSH | El archivo, o la carpeta en un `.zip` |
| El invitado instala | Nada | VS Code + Remote-SSH + Tailscale (una vez) | Nada |
| Protección | Contraseña opcional | Llave SSH | Token único dentro del enlace |
| Exposición | URL pública (Tailscale Funnel) | Solo tu red privada Tailscale | URL pública (el mismo Funnel) |
| Acceso a tu equipo | Editor + terminal, confinado a esa carpeta | Editor + terminal, confinado a esa carpeta | Ninguno: solo bajar eso |

## Instalación

```bash
git clone https://github.com/Demonio0N1/Link_space.git
cd Link_space/carpeta-share
./setup.sh          # verifica/instala Tailscale, activa SSH e instala los comandos
tailscale up        # o abre la app de Tailscale e inicia sesión
```

Requisitos: `python3` y Tailscale. Opcionales: `code-server` (para el modo
web; `setup.sh` ofrece instalarlo) y VS Code + `npm` (para la extensión con
el clic derecho "Compartir carpeta…").

## Uso en 30 segundos

```bash
# VS Code en el navegador para quien tenga el enlace (te pregunta la contraseña)
cd ~/Proyectos/tesis
linkspace

# Solo entregar algo: un enlace que únicamente permite descargarlo
linkspace descarga                          # la carpeta actual, como .zip
linkspace descarga ~/Documentos/informe.pdf # un archivo suelto

# Ver quién está conectado ahora mismo y cortar accesos
linkspace panel
```

Lo mismo con el CLI completo:

| Quiero… | Comando |
|---|---|
| VS Code web con contraseña generada | `carpeta-share compartir <carpeta> --web --con-contrasena` |
| VS Code web con mi contraseña | `carpeta-share compartir <carpeta> --web --contrasena "MiClave123"` |
| Un enlace de solo descarga | `carpeta-share compartir <archivo-o-carpeta> --descarga` |
| VS Code de escritorio (el invitado me dio su llave) | `carpeta-share invitado agregar ana "ssh-ed25519 AAAA…"` y `carpeta-share compartir <carpeta> --con ana` |
| VS Code de escritorio sin que el invitado genere llaves | `carpeta-share compartir <carpeta> --sin-clave` |
| Ver todo lo compartido | `carpeta-share estado` |
| Panel interactivo (uso en vivo, revocar) | `carpeta-share panel` |
| Dejar de compartir una carpeta | `carpeta-share dejar-de-compartir <carpeta>` |
| Revocar solo un enlace de descarga | `carpeta-share dejar-de-compartir <ruta> --descarga` |
| Cortar a un invitado | `carpeta-share invitado suspender\|reactivar\|eliminar <nombre>` |
| Actualizar a la última versión | `carpeta-share actualizar` |

También hay clic derecho en **Finder** (Acciones rápidas), **Nautilus/Dolphin**
y en el explorador de **VS Code**.

## Cómo funciona

```
 invitado ──https──▶ Tailscale Funnel ──▶ 127.0.0.1 en tu equipo
                                            ├─ /     code-server (modo web), como usuario invitado confinado
                                            └─ /dl   servidor de solo descarga (un token por archivo o carpeta)

 invitado ──ssh (red privada Tailscale)──▶ usuario invitado confinado (modo VS Code escritorio)
```

* **Modos web y escritorio:** cada invitado es un usuario real del sistema, sin
  contraseña utilizable y sin `sudo`. Solo recibe permisos (ACLs) sobre la
  carpeta compartida; el resto de tu disco no lo ve. Puede usar tus entornos
  de conda en solo lectura y crear los suyos.
* **Modo solo descarga:** no hay usuario, editor ni terminal. Un servidor
  mínimo de solo lectura, que escucha únicamente en `127.0.0.1`, entrega lo
  registrado para cada token (192 bits aleatorios); la carpeta se comprime al
  vuelo. Se publica en la ruta `/dl` del mismo Funnel que usa el modo web, así
  que no gasta puertos extra.
* **Nada sale de tu equipo hasta que alguien abre el enlace**, y revocar es un
  comando: el acceso se corta al instante.

## Seguridad, en corto

* Los enlaces **web** y de **descarga** son URLs públicas: quien tenga el
  enlace (y la contraseña, si la pusiste) entra. Envía la contraseña por un
  canal distinto y trata los enlaces de descarga como contraseñas.
* En los modos web y escritorio el invitado **ejecuta código en tu máquina**
  como un usuario sin privilegios: comparte solo con gente de confianza.
* El modo solo descarga no permite subir, listar ni modificar nada, y la URL
  no lleva rutas: solo se puede bajar exactamente lo que compartiste.

El detalle de qué puede y qué no puede hacer un invitado está en la
[documentación completa](carpeta-share/README.md#seguridad).

## Estructura del repositorio

```
carpeta-share/
├── bin/
│   ├── carpeta-share             CLI principal (bash + python3)
│   ├── carpeta-share-descargas   servidor del modo solo descarga (python3, sin dependencias)
│   └── linkspace                 atajo interactivo
├── setup.sh                      instalador / actualizador / desinstalador
├── vscode-extension/             extensión: clic derecho → "Compartir carpeta…"
├── README.md                     documentación completa
└── PRUEBAS.md                    checklist de verificación manual
```

## Documentación

* [Guía completa](carpeta-share/README.md): instalación paso a paso, cada modo
  en detalle, qué instala el invitado, notebooks y conda, administración y
  seguridad.
* [Checklist de pruebas](carpeta-share/PRUEBAS.md).

## Actualizar y desinstalar

```bash
carpeta-share actualizar        # git pull + reinstalar, sin tocar tu configuración

carpeta-share invitado eliminar <nombre>   # primero revoca accesos…
cd Link_space/carpeta-share && ./setup.sh --uninstall
```
