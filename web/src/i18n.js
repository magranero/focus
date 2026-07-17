import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      app: { tagline: 'Your day, at a glance.' },
      onboarding: {
        welcome: 'Welcome to FOCUS',
        intro: 'Your personal start page, built by AI, running 100% on your machine.',
        pickProvider: 'Connect an AI to power your widgets',
        apiKey: 'API key',
        baseUrl: 'Ollama URL',
        test: 'Test connection',
        testing: 'Testing…',
        connected: 'Connected!',
        continue: 'Continue',
        keyHint: 'Stored encrypted on your machine. It never leaves your computer.',
        ollamaHint: 'No API key needed — FOCUS talks to your local Ollama.',
        skip: 'I’ll do this later'
      },
      wizard: {
        step1: 'Choose a template',
        step1Sub: 'How should your page be organized? You can rearrange everything later.',
        step2: 'Pick your widgets',
        step2Sub: 'These come free with FOCUS. Toggle the ones you want.',
        step3: 'Create your own with AI',
        step3Sub: 'From now on, click any empty space on your page and describe a widget: “weather in Madrid”, “days until my holidays”, “my unread emails”… AI builds it while you keep working.',
        step3Tip: 'If a widget needs an API key or credentials, a red dot will appear — click it to finish the setup. Widgets show sample data until then.',
        tryNow: 'Try it now (optional)',
        tryPlaceholder: 'e.g. A countdown to the 2026 World Cup final',
        back: 'Back',
        next: 'Next',
        finish: 'Open my page'
      },
      templates: {
        overview: 'Overview',
        overviewDesc: 'Everything at a glance — the classic start page.',
        minimal: 'Minimal',
        minimalDesc: 'Just a clock and a search bar. Zen.',
        dashboard: 'Dashboard',
        dashboardDesc: 'Dense grid for data lovers.',
        sidebar: 'Sidebar',
        sidebarDesc: 'Essentials on the left, content on the right.'
      },
      dash: {
        addWidget: 'Add widget',
        marketplace: 'Marketplace',
        settings: 'Settings',
        emptyHint: 'Click any empty space to create a widget with AI',
        generating_one: '{{count}} widget generating…',
        generating_other: '{{count}} widgets generating…',
        setupNeeded: 'This widget needs configuration',
        remove: 'Remove',
        configure: 'Configure',
        editAI: 'Edit with AI',
        publish: 'Export for Marketplace'
      },
      creator: {
        title: 'Create a widget with AI',
        editTitle: 'Edit “{{name}}” with AI',
        editPlaceholder: 'Tell the agent what to change: “bigger digits”, “add seconds”, “use Fahrenheit”…',
        placeholder: 'Describe it: “La Liga standings”, “time in Tokyo”, “my website visits”…',
        create: 'Create',
        credWarning_one: 'We detected a credential in your text. It was moved to encrypted settings automatically — please don’t paste keys here again 🙏',
        credWarning_other: 'We detected {{count}} credentials in your text. They were moved to encrypted settings automatically — please don’t paste keys here again 🙏',
        queued: 'On it! Your widget is being generated in the background.'
      },
      settings: {
        title: 'Settings',
        language: 'Language',
        ai: 'AI provider',
        marketplaceUrl: 'Marketplace URL',
        save: 'Save',
        saved: 'Saved',
        startPage: 'Use FOCUS as your start page',
        startPageHelp: 'Copy this address and set it as your browser’s home page:',
        widgetSettings: 'Widget settings',
        aiPing: 'Test AI',
        close: 'Close',
        app: 'Application',
        trayHint: 'FOCUS lives in your menu bar (the ◎ icon): open your page, settings or quit from there. You can also quit right here:',
        quit: 'Quit FOCUS',
        quitDone: 'FOCUS is closed. See you tomorrow!'
      },
      widgetSettings: {
        title: 'Configure “{{name}}”',
        secretHint: 'Stored encrypted. Never leaves your machine.',
        save: 'Save',
        cancel: 'Cancel'
      },
      market: {
        title: 'Widget Marketplace',
        free: 'Free',
        install: 'Install',
        installed: 'Installed!',
        buy: 'Buy on the Marketplace',
        redeemTitle: 'Already bought a widget?',
        redeemPlaceholder: 'Paste your install code',
        redeem: 'Install',
        connected: 'Connected to {{url}}',
        sampleNote: 'Not connected — showing sample catalog'
      },
      errors: { generic: 'Something went wrong' }
    }
  },
  es: {
    translation: {
      app: { tagline: 'Tu día, de un vistazo.' },
      onboarding: {
        welcome: 'Bienvenido a FOCUS',
        intro: 'Tu página de inicio personal, creada por IA y funcionando 100% en tu equipo.',
        pickProvider: 'Conecta una IA para dar vida a tus widgets',
        apiKey: 'API key',
        baseUrl: 'URL de Ollama',
        test: 'Probar conexión',
        testing: 'Probando…',
        connected: '¡Conectado!',
        continue: 'Continuar',
        keyHint: 'Se guarda cifrada en tu equipo. Nunca sale de tu ordenador.',
        ollamaHint: 'Sin API key — FOCUS habla con tu Ollama local.',
        skip: 'Lo haré más tarde'
      },
      wizard: {
        step1: 'Elige una plantilla',
        step1Sub: '¿Cómo se organiza tu página? Podrás recolocarlo todo después.',
        step2: 'Elige tus widgets',
        step2Sub: 'Estos vienen gratis con FOCUS. Activa los que quieras.',
        step3: 'Crea los tuyos con IA',
        step3Sub: 'A partir de ahora, haz clic en cualquier espacio vacío de tu página y describe un widget: «el tiempo en Madrid», «días hasta mis vacaciones», «mis emails sin leer»… La IA lo construye mientras tú sigues a lo tuyo.',
        step3Tip: 'Si un widget necesita una API key o credenciales, aparecerá una bolita roja: haz clic para terminar la configuración. Hasta entonces muestra datos de ejemplo.',
        tryNow: 'Pruébalo ahora (opcional)',
        tryPlaceholder: 'ej. Una cuenta atrás para la final del Mundial 2026',
        back: 'Atrás',
        next: 'Siguiente',
        finish: 'Abrir mi página'
      },
      templates: {
        overview: 'Vista general',
        overviewDesc: 'Todo de un vistazo: la página de inicio clásica.',
        minimal: 'Minimalista',
        minimalDesc: 'Solo un reloj y un buscador. Zen.',
        dashboard: 'Dashboard',
        dashboardDesc: 'Rejilla densa para amantes de los datos.',
        sidebar: 'Barra lateral',
        sidebarDesc: 'Lo esencial a la izquierda, el contenido a la derecha.'
      },
      dash: {
        addWidget: 'Añadir widget',
        marketplace: 'Marketplace',
        settings: 'Ajustes',
        emptyHint: 'Haz clic en un espacio vacío para crear un widget con IA',
        generating_one: '{{count}} widget generándose…',
        generating_other: '{{count}} widgets generándose…',
        setupNeeded: 'Este widget necesita configuración',
        remove: 'Eliminar',
        configure: 'Configurar',
        editAI: 'Editar con IA',
        publish: 'Exportar para el Marketplace'
      },
      creator: {
        title: 'Crear un widget con IA',
        editTitle: 'Editar «{{name}}» con IA',
        editPlaceholder: 'Dile al agente qué cambiar: «dígitos más grandes», «añade segundos», «usa Fahrenheit»…',
        placeholder: 'Descríbelo: «clasificación de La Liga», «hora en Tokio», «las visitas de mi web»…',
        create: 'Crear',
        credWarning_one: 'Detectamos una credencial en tu texto. La hemos movido automáticamente a los ajustes cifrados. Por favor, no vuelvas a pegar claves aquí 🙏',
        credWarning_other: 'Detectamos {{count}} credenciales en tu texto. Las hemos movido automáticamente a los ajustes cifrados. Por favor, no vuelvas a pegar claves aquí 🙏',
        queued: '¡Marchando! Tu widget se está generando en segundo plano.'
      },
      settings: {
        title: 'Ajustes',
        language: 'Idioma',
        ai: 'Proveedor de IA',
        marketplaceUrl: 'URL del Marketplace',
        save: 'Guardar',
        saved: 'Guardado',
        startPage: 'Usa FOCUS como página de inicio',
        startPageHelp: 'Copia esta dirección y ponla como página de inicio de tu navegador:',
        widgetSettings: 'Ajustes del widget',
        aiPing: 'Probar IA',
        close: 'Cerrar',
        app: 'Aplicación',
        trayHint: 'FOCUS vive en tu barra de menús (el icono ◎): desde ahí puedes abrir tu página, los ajustes o salir. También puedes salir desde aquí:',
        quit: 'Salir de FOCUS',
        quitDone: 'FOCUS está cerrado. ¡Hasta mañana!'
      },
      widgetSettings: {
        title: 'Configurar «{{name}}»',
        secretHint: 'Se guarda cifrada. Nunca sale de tu equipo.',
        save: 'Guardar',
        cancel: 'Cancelar'
      },
      market: {
        title: 'Marketplace de widgets',
        free: 'Gratis',
        install: 'Instalar',
        installed: '¡Instalado!',
        buy: 'Comprar en el Marketplace',
        redeemTitle: '¿Ya compraste un widget?',
        redeemPlaceholder: 'Pega tu código de instalación',
        redeem: 'Instalar',
        connected: 'Conectado a {{url}}',
        sampleNote: 'Sin conexión — mostrando catálogo de ejemplo'
      },
      errors: { generic: 'Algo ha ido mal' }
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
