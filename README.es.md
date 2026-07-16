# ◎ FOCUS

**Tu página de inicio personal con IA. 100% local, 100% tuya.**

*Read this in [English](README.md).*

FOCUS es una pequeña app de escritorio (Windows / macOS) que sirve una página
de inicio preciosa y totalmente personalizada en `http://localhost:8642`.
Ponla como página de inicio de tu navegador y ve tu día de un vistazo — y crea
cualquier widget que imagines simplemente describiéndolo. La IA lo construye
por ti, en local.

## Cómo funciona

1. **Conecta una IA** — usa tu propia API key (OpenAI, Anthropic, Google
   Gemini) o un [Ollama](https://ollama.com) local — sin key y sin que nada
   salga de tu equipo.
2. **Tres pasos hasta tu página**
   1. *Elige plantilla* — Vista general (el clásico "todo de un vistazo"),
      Minimalista, Dashboard o Barra lateral.
   2. *Elige widgets* — reloj y hora mundial, el tiempo (sin API key), cuenta
      atrás, tareas, noticias RSS, espacio en disco, webcam/embed, enlaces
      rápidos, buscador.
   3. *Crea los tuyos con IA* — haz clic en cualquier espacio vacío, describe
      el widget («clasificación de La Liga», «hora en Tokio», «días hasta mis
      vacaciones») y un agente lo construye en segundo plano mientras sigues a
      lo tuyo. Crea tantos en paralelo como quieras.

## Características

- 🧠 **Creador de widgets con IA** — agentes en segundo plano generan widgets
  desde lenguaje natural; un placeholder reserva el espacio al instante.
- 🔴 **Notificaciones con bolita roja** — si un widget necesita una API key o
  un permiso, aparece una bolita roja; haz clic para terminar la configuración.
  Mientras tanto el widget muestra **datos de ejemplo** realistas.
- 🔒 **Las credenciales no salen de casa** — las claves se cifran con el
  llavero del sistema (Keychain / DPAPI vía `safeStorage` de Electron). Los
  widgets corren en iframes aislados y nunca ven secretos: las peticiones
  pasan por un proxy local que sustituye los placeholders `{{settings.clave}}`
  en el servidor. Si pegas una credencial en el cuadro de la IA, FOCUS la
  detecta, la mueve automáticamente a los ajustes cifrados y te avisa (con
  cariño) de que no lo vuelvas a hacer.
- 🛍️ **Marketplace** — instala widgets de la comunidad, gratis o de pago, y
  publica los tuyos (siempre exportados **sin** credenciales).
- 🌍 **Inglés y español** de serie.
- 🖥️ App de bandeja: arranca al iniciar sesión, sirve tu página y no molesta.

## Instalar

Descarga la última versión para macOS (.dmg) o Windows (.exe) desde
[Releases](https://github.com/magranero/focus/releases), ejecútala y pon
`http://localhost:8642` como página de inicio del navegador (Ajustes → botón
de copiar).

## Ejecutar desde el código

```bash
git clone https://github.com/magranero/focus.git
cd focus
npm install
npm start          # compila la UI y lanza la app de bandeja
# o, para desarrollo:
npm run dev        # servidor local :8642 + Vite :5173
```

## Crear widgets a mano

Un widget es una carpeta autocontenida: un `manifest.json` y un `index.html`
renderizado en un iframe aislado con una pequeña API puente `focus.*`.
La especificación completa está en [docs/widget-spec.md](docs/widget-spec.md).

## Contribuir

¡PRs bienvenidas! Mira [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[MIT](LICENSE)
