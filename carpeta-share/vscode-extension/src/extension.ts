// Extensión mínima: añade "Compartir carpeta…" al menú contextual del
// explorador (solo carpetas). Delega todo el trabajo en el CLI carpeta-share;
// aquí solo elegimos el modo (con llave / sin llave) y mostramos el enlace.
import * as vscode from 'vscode';
import { execFile } from 'child_process';

const CLI = '/usr/local/bin/carpeta-share';

interface Resultado {
  modo: 'ssh' | 'web';
  invitado: string;
  usuario: string;
  host: string;
  enlace: string;
  contrasena: string | null;
  paquete: string | null;
}

function cli(args: string[], timeoutMs = 180000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(CLI, args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr.trim() || err.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('carpetaShare.compartir', async (uri?: vscode.Uri) => {
      // Si se invoca desde la paleta (sin recurso), pedimos la carpeta.
      let carpeta = uri?.fsPath;
      if (!carpeta) {
        const sel = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Compartir esta carpeta',
        });
        if (!sel || sel.length === 0) {
          return;
        }
        carpeta = sel[0].fsPath;
      }

      let invitados: string[] = [];
      try {
        const salida = await cli(['listar-invitados']);
        invitados = salida.split('\n').map((s) => s.trim()).filter(Boolean);
      } catch (e) {
        vscode.window.showErrorMessage(
          `No encuentro el CLI carpeta-share (${(e as Error).message}). Ejecuta setup.sh primero.`
        );
        return;
      }

      // El enlace siempre ofrece las opciones: web con/sin contraseña
      // (cero instalación) o VS Code de escritorio con/sin llave.
      type Item = vscode.QuickPickItem & { args: string[] };
      const items: Item[] = [
        {
          label: '$(globe) Enlace web CON contraseña',
          description: 'El invitado no instala nada: abre la URL en su navegador',
          args: ['--web', '--con-contrasena'],
        },
        {
          label: '$(globe) Enlace web SIN contraseña',
          description: 'URL abierta: cualquiera con el enlace entra — solo para cosas no sensibles',
          args: ['--web', '--sin-contrasena'],
        },
        ...invitados.map((n) => ({
          label: `$(key) ${n}`,
          description: 'VS Code escritorio — usa la llave SSH que ya te dio',
          args: ['--con', n],
        })),
        {
          label: '$(add) Nuevo acceso sin llave (VS Code escritorio)',
          description: 'Genera la llave por ti y crea un paquete para enviárselo al invitado',
          args: ['--sin-clave'],
        },
      ];
      const eleccion = await vscode.window.showQuickPick(items, {
        placeHolder: `¿Con quién compartir "${carpeta}"?`,
      });
      if (!eleccion) {
        return;
      }

      try {
        const salida = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Compartiendo carpeta…' },
          () => cli(['compartir', carpeta!, ...eleccion.args, '--si', '--json'])
        );
        // La escalada gráfica (osascript) puede devolver la salida con \r.
        const linea = salida
          .replace(/\r/g, '\n')
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.startsWith('{'))
          .pop();
        if (!linea) {
          throw new Error(`respuesta inesperada del CLI: ${salida.slice(0, 300)}`);
        }
        const r = JSON.parse(linea) as Resultado;

        await vscode.env.clipboard.writeText(r.enlace);
        const botones = ['Copiar enlace'];
        if (r.contrasena) {
          botones.push('Copiar contraseña');
        }
        if (r.paquete) {
          botones.push('Abrir paquete');
        }
        let mensaje: string;
        if (r.modo === 'web') {
          mensaje = r.contrasena
            ? `Enlace web copiado: ${r.enlace} — Contraseña: ${r.contrasena} (envíala por otro canal). El invitado no instala nada.`
            : `Enlace web SIN contraseña copiado: ${r.enlace} — cualquiera con la URL puede entrar.`;
        } else if (r.paquete) {
          mensaje = 'Enlace copiado. Envía a tu invitado el paquete de acceso completo (llave + instrucciones).';
        } else {
          mensaje = `Enlace para "${r.invitado}" copiado al portapapeles.`;
        }
        const boton = await vscode.window.showInformationMessage(mensaje, ...botones);
        if (boton === 'Copiar enlace') {
          await vscode.env.clipboard.writeText(r.enlace);
          vscode.window.setStatusBarMessage('Enlace copiado al portapapeles', 4000);
        }
        if (boton === 'Copiar contraseña' && r.contrasena) {
          await vscode.env.clipboard.writeText(r.contrasena);
          vscode.window.setStatusBarMessage('Contraseña copiada al portapapeles', 4000);
        }
        if (boton === 'Abrir paquete' && r.paquete) {
          await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(r.paquete));
        }
      } catch (e) {
        vscode.window.showErrorMessage(`No se pudo compartir: ${(e as Error).message}`);
      }
    })
  );
}

export function deactivate() {}
