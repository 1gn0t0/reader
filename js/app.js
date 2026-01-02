/**
 * LECTOR WEB DE NOVELAS - APLICACIÓN PRINCIPAL
 * Vanilla JavaScript (ES6+) - Sin frameworks
 * 
 * Funcionalidades principales:
 * - Carga y navegación del índice JSON
 * - Lectura continua con carga dinámica de secciones
 * - Manejo de múltiples versiones/traducciones
 * - Sistema de configuración persistente (tema, fuente, tamaño)
 */

const NovelReader = (function() {
    'use strict';

    // ========================================
    // CONFIGURACIÓN Y CONSTANTES
    // ========================================
    
    const CONFIG = {
        indexPath: 'data/index.json',
        defaultTheme: 'light',
        defaultFont: 'serif',
        defaultFontSize: 18,
        minFontSize: 14,
        maxFontSize: 28,
        fontSizeStep: 2
    };

    const THEMES = ['light', 'dark', 'sepia'];

    // Estado global de la aplicación
    let appState = {
        novelData: null,
        flatSections: [],
        currentSectionId: null,
        currentVersionId: null,
        loadedSections: [],
        settings: {
            theme: CONFIG.defaultTheme,
            font: CONFIG.defaultFont,
            fontSize: CONFIG.defaultFontSize
        }
    };

    // ========================================
    // FUNCIONES DE ALMACENAMIENTO LOCAL
    // ========================================

    /**
     * Carga las preferencias del usuario desde localStorage
     */
    function loadSettings() {
        try {
            const saved = localStorage.getItem('novelReaderSettings');
            if (saved) {
                appState.settings = { ...appState.settings, ...JSON.parse(saved) };
            }
            
            // Cargar versión preferida
            const preferredVersion = localStorage.getItem('preferredVersionId');
            if (preferredVersion) {
                appState.currentVersionId = preferredVersion;
            }
        } catch (e) {
            console.warn('No se pudieron cargar las configuraciones:', e);
        }
    }

    /**
     * Guarda las preferencias en localStorage
     */
    function saveSettings() {
        try {
            localStorage.setItem('novelReaderSettings', JSON.stringify(appState.settings));
        } catch (e) {
            console.warn('No se pudieron guardar las configuraciones:', e);
        }
    }

    /**
     * Guarda la versión preferida del usuario
     */
    function savePreferredVersion(versionId) {
        try {
            localStorage.setItem('preferredVersionId', versionId);
            appState.currentVersionId = versionId;
        } catch (e) {
            console.warn('No se pudo guardar la versión preferida:', e);
        }
    }

    // ========================================
    // APLICACIÓN DE CONFIGURACIONES
    // ========================================

    /**
     * Aplica el tema seleccionado
     */
    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        appState.settings.theme = theme;
        saveSettings();
        updateSettingButtons();
    }

    /**
     * Aplica la fuente seleccionada
     */
    function applyFont(font) {
        document.body.setAttribute('data-font', font);
        appState.settings.font = font;
        saveSettings();
        updateSettingButtons();
    }

    /**
     * Aplica el tamaño de fuente
     */
    function applyFontSize(size) {
        document.documentElement.style.setProperty('--base-font-size', `${size}px`);
        appState.settings.fontSize = size;
        saveSettings();
        updateFontSizeDisplay();
    }

    /**
     * Actualiza el display del tamaño de fuente
     */
    function updateFontSizeDisplay() {
        const display = document.getElementById('font-size-display');
        if (display) {
            const percentage = Math.round((appState.settings.fontSize / CONFIG.defaultFontSize) * 100);
            display.textContent = `${percentage}%`;
        }
    }

    /**
     * Actualiza los botones activos en el panel de configuración
     */
    function updateSettingButtons() {
        // Actualizar tema
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === appState.settings.theme);
        });

        // Actualizar fuente
        document.querySelectorAll('[data-font]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.font === appState.settings.font);
        });
    }

    // ========================================
    // CARGA Y PROCESAMIENTO DE DATOS
    // ========================================

    /**
     * Carga el archivo index.json
     */
    async function loadNovelData() {
        try {
            const response = await fetch(CONFIG.indexPath);
            if (!response.ok) throw new Error('No se pudo cargar el índice');
            
            appState.novelData = await response.json();
            appState.flatSections = flattenSections(appState.novelData.structure);
            return appState.novelData;
        } catch (error) {
            console.error('Error cargando datos:', error);
            throw error;
        }
    }

    /**
     * Aplana la estructura jerárquica en un array lineal de secciones
     * Esto permite la navegación secuencial (siguiente/anterior)
     */
    function flattenSections(structure) {
        const sections = [];
        
        structure.forEach(chapter => {
            chapter.parts.forEach(part => {
                part.sections.forEach(section => {
                    sections.push({
                        sectionId: section.id,
                        chapterTitle: chapter.title,
                        partTitle: part.title,
                        subtitle: section.subtitle,
                        versions: section.versions
                    });
                });
            });
        });
        
        return sections;
    }

    /**
     * Obtiene información de una sección por su ID
     */
    function getSectionById(sectionId) {
        return appState.flatSections.find(s => s.sectionId === sectionId);
    }

    /**
     * Obtiene el índice de la siguiente sección
     */
    function getNextSectionIndex(currentSectionId) {
        const currentIndex = appState.flatSections.findIndex(s => s.sectionId === currentSectionId);
        if (currentIndex === -1 || currentIndex === appState.flatSections.length - 1) {
            return null;
        }
        return currentIndex + 1;
    }

    // ========================================
    // INICIALIZACIÓN DEL ÍNDICE (index.html)
    // ========================================

    /**
     * Inicializa la página de índice
     */
    async function initIndex() {
        // Cargar y aplicar configuraciones
        loadSettings();
        applyTheme(appState.settings.theme);
        
        // Configurar event listeners para la página de índice
        setupIndexEventListeners();

        try {
            const data = await loadNovelData();
            renderIndex(data);
        } catch (error) {
            document.getElementById('novel-title').textContent = 'Error al cargar';
            console.error(error);
        }
    }

    /**
     * Configura los event listeners para la página de índice
     */
    function setupIndexEventListeners() {
        // Botón flotante para ciclar temas
        const themeCycleBtn = document.getElementById('theme-cycle-btn');
        if (themeCycleBtn) {
            themeCycleBtn.addEventListener('click', () => {
                const currentTheme = appState.settings.theme;
                const currentIndex = THEMES.indexOf(currentTheme);
                const nextIndex = (currentIndex + 1) % THEMES.length;
                const nextTheme = THEMES[nextIndex];
                applyTheme(nextTheme);
            });
        }
    }

    /**
     * Renderiza el índice completo
     */
    function renderIndex(data) {
        // Actualizar header
        document.getElementById('novel-title').textContent = data.meta.title;
        document.getElementById('novel-author').textContent = `por ${data.meta.author}`;

        // Generar lista de capítulos
        const chapterList = document.getElementById('chapter-list');
        chapterList.innerHTML = '';

        data.structure.forEach(chapter => {
            const chapterDiv = document.createElement('div');
            chapterDiv.className = 'chapter-item';

            const chapterTitle = document.createElement('h2');
            chapterTitle.className = 'chapter-title';
            chapterTitle.textContent = chapter.title;
            chapterTitle.tabIndex = 0; // Hacerlo enfocable

            const partsContainer = document.createElement('div');
            partsContainer.className = 'parts-container collapsed'; // Oculto por defecto

            chapter.parts.forEach(part => {
                const partDiv = document.createElement('div');
                partDiv.className = 'part-item';

                const partTitle = document.createElement('h3');
                partTitle.className = 'part-title';
                partTitle.textContent = part.title;
                partDiv.appendChild(partTitle);

                const sectionList = document.createElement('ul');
                sectionList.className = 'section-list';

                part.sections.forEach(section => {
                    const sectionItem = document.createElement('li');
                    sectionItem.className = 'section-item';

                    const sectionLink = document.createElement('a');
                    sectionLink.className = 'section-link';
                    sectionLink.href = `reader.html?sectionId=${section.id}`;
                    sectionLink.textContent = section.subtitle;

                    sectionItem.appendChild(sectionLink);
                    sectionList.appendChild(sectionItem);
                });

                partDiv.appendChild(sectionList);
                partsContainer.appendChild(partDiv);
            });

            chapterDiv.appendChild(chapterTitle);
            chapterDiv.appendChild(partsContainer);
            chapterList.appendChild(chapterDiv);
            
            // Event listener para desplegar/colapsar
            chapterTitle.addEventListener('click', () => {
                partsContainer.classList.toggle('collapsed');
                chapterTitle.classList.toggle('active');
            });

            // Permitir abrir con la tecla Enter por accesibilidad
            chapterTitle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    partsContainer.classList.toggle('collapsed');
                    chapterTitle.classList.toggle('active');
                }
            });
        });
    }

    // ========================================
    // INICIALIZACIÓN DEL LECTOR (reader.html)
    // ========================================

    /**
     * Inicializa la página del lector
     */
    async function initReader() {
        // Cargar configuraciones
        loadSettings();
        applyTheme(appState.settings.theme);
        applyFont(appState.settings.font);
        applyFontSize(appState.settings.fontSize);

        // Configurar event listeners
        setupReaderEventListeners();

        // Cargar datos
        try {
            await loadNovelData();
            
            // Obtener sectionId de la URL
            const urlParams = new URLSearchParams(window.location.search);
            const sectionId = urlParams.get('sectionId');

            if (!sectionId) {
                showError('No se especificó una sección');
                return;
            }

            // Cargar la sección
            await loadSection(sectionId);
        } catch (error) {
            showError('Error al cargar el contenido');
            console.error(error);
        }
    }

    /**
     * Configura todos los event listeners del lector
     */
    function setupReaderEventListeners() {
        // Panel de configuración
        const settingsBtn = document.getElementById('settings-btn');
        const settingsPanel = document.getElementById('settings-panel');
        const settingsClose = document.getElementById('settings-close');

        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });

        settingsClose.addEventListener('click', () => {
            settingsPanel.classList.add('hidden');
        });

        // Cerrar panel al hacer clic fuera
        settingsPanel.addEventListener('click', (e) => {
            if (e.target === settingsPanel) {
                settingsPanel.classList.add('hidden');
            }
        });

        // Botones de tema
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.addEventListener('click', () => {
                applyTheme(btn.dataset.theme);
            });
        });

        // Botones de fuente
        document.querySelectorAll('[data-font]').forEach(btn => {
            btn.addEventListener('click', () => {
                applyFont(btn.dataset.font);
            });
        });

        // Botones de tamaño de fuente
        const decreaseBtn = document.getElementById('font-decrease');
        const increaseBtn = document.getElementById('font-increase');

        decreaseBtn.addEventListener('click', () => {
            const newSize = Math.max(
                CONFIG.minFontSize,
                appState.settings.fontSize - CONFIG.fontSizeStep
            );
            applyFontSize(newSize);
        });

        increaseBtn.addEventListener('click', () => {
            const newSize = Math.min(
                CONFIG.maxFontSize,
                appState.settings.fontSize + CONFIG.fontSizeStep
            );
            applyFontSize(newSize);
        });

        // Botón de cargar siguiente
        const loadNextBtn = document.getElementById('load-next-btn');
        loadNextBtn.addEventListener('click', loadNextSection);
    }

    // ========================================
    // CARGA Y RENDERIZADO DE CONTENIDO
    // ========================================

    /**
     * Carga una sección específica
     */
    async function loadSection(sectionId, append = false) {
        const sectionInfo = getSectionById(sectionId);
        if (!sectionInfo) {
            showError('Sección no encontrada');
            return;
        }

        appState.currentSectionId = sectionId;

        // Siempre actualizar el título principal al cargar una nueva sección
        const readerTitle = document.getElementById('reader-title');
        if (readerTitle) {
            readerTitle.textContent = `${sectionInfo.chapterTitle} - ${sectionInfo.subtitle}`;
        }

        // Determinar qué versión cargar
        let versionToLoad = sectionInfo.versions[0]; // Por defecto la primera

        // Si hay una versión preferida, buscarla
        if (appState.currentVersionId) {
            const preferred = sectionInfo.versions.find(v => v.id === appState.currentVersionId);
            if (preferred) {
                versionToLoad = preferred;
            }
        }

        try {
            // Cargar el archivo de texto
            const response = await fetch(versionToLoad.file_path);
            if (!response.ok) throw new Error('No se pudo cargar el archivo');
            
            const textContent = await response.text();

            if (append) {
                appendSection(sectionInfo, textContent, versionToLoad);
            } else {
                renderSection(sectionInfo, textContent, versionToLoad);
            }

            // Guardar en el historial de secciones cargadas
            appState.loadedSections.push({
                sectionId,
                versionId: versionToLoad.id
            });

            // Actualizar botón de siguiente sección
            updateNextSectionButton();

        } catch (error) {
            showError('Error al cargar el contenido de la sección');
            console.error(error);
        }
    }

    /**
     * Renderiza una sección (reemplaza el contenido)
     */
    function renderSection(sectionInfo, textContent, version) {
        const textContainer = document.getElementById('text-content');
        const versionSelector = document.getElementById('version-selector');

        // El título ahora se actualiza en loadSection()

        // Renderizar selector de versiones si hay más de una
        if (sectionInfo.versions.length > 1) {
            renderVersionSelector(sectionInfo.versions, version.id);
        } else {
            versionSelector.innerHTML = '';
            versionSelector.classList.add('hidden');
        }

        // Renderizar contenido
        textContainer.innerHTML = formatTextContent(textContent);

        // Scroll al inicio
        window.scrollTo(0, 0);
    }

    /**
     * Añade una sección al final del contenido actual (continuidad)
     */
    function appendSection(sectionInfo, textContent, version) {
        const textContainer = document.getElementById('text-content');

        // Crear divisor visual
        const divider = document.createElement('div');
        divider.className = 'section-divider';
        divider.innerHTML = `<h3>${sectionInfo.subtitle}</h3>`;

        // Crear contenedor para el nuevo contenido
        const newContent = document.createElement('div');
        newContent.innerHTML = formatTextContent(textContent);

        textContainer.appendChild(divider);
        textContainer.appendChild(newContent);

        // Scroll suave hacia el nuevo contenido
        divider.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Formatea el texto plano en párrafos HTML
     */
    function formatTextContent(text) {
        const dialogRegex = /^([\w\sÁÉÍÓÚáéíóúñÑ]+):\s*(.*)/;

        return text
            .trim()
            .split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                const match = line.match(dialogRegex);
                if (match) {
                    const name = match[1].trim();
                    const restOfLine = match[2].trim();
                    return `<p><strong>${name}:</strong> ${restOfLine}</p>`;
                } else {
                    return `<p>${line}</p>`;
                }
            })
            .join('');
    }

    /**
     * Renderiza el selector de versiones (tabs)
     */
    function renderVersionSelector(versions, activeVersionId) {
        const selector = document.getElementById('version-selector');
        selector.innerHTML = '';
        selector.classList.remove('hidden');

        versions.forEach(version => {
            const btn = document.createElement('button');
            btn.className = 'version-btn';
            btn.textContent = version.label;
            btn.dataset.versionId = version.id;
            
            if (version.id === activeVersionId) {
                btn.classList.add('active');
            }

            btn.addEventListener('click', () => switchVersion(version.id));
            selector.appendChild(btn);
        });
    }

    /**
     * Cambia a otra versión de la misma sección
     */
    async function switchVersion(versionId) {
        const sectionInfo = getSectionById(appState.currentSectionId);
        const version = sectionInfo.versions.find(v => v.id === versionId);

        if (!version) return;

        try {
            const response = await fetch(version.file_path);
            if (!response.ok) throw new Error('No se pudo cargar la versión');
            
            const textContent = await response.text();
            const textContainer = document.getElementById('text-content');

            // Actualizar contenido
            textContainer.innerHTML = formatTextContent(textContent);

            // Actualizar selector visual
            document.querySelectorAll('.version-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.versionId === versionId);
            });

            // Guardar preferencia
            savePreferredVersion(versionId);

        } catch (error) {
            showError('Error al cambiar de versión');
            console.error(error);
        }
    }

    /**
     * Carga la siguiente sección y la añade al contenido
     */
    async function loadNextSection() {
        const nextIndex = getNextSectionIndex(appState.currentSectionId);
        
        if (nextIndex === null) {
            alert('Has llegado al final del contenido disponible');
            return;
        }

        const nextSection = appState.flatSections[nextIndex];
        // Cargar la siguiente sección, reemplazando el contenido (append: false)
        await loadSection(nextSection.sectionId, false);
    }

    /**
     * Actualiza la visibilidad del botón de siguiente sección
     */
    function updateNextSectionButton() {
        const container = document.getElementById('next-section-container');
        const btn = document.getElementById('load-next-btn');
        
        const nextIndex = getNextSectionIndex(appState.currentSectionId);
        
        if (nextIndex === null) {
            container.classList.add('hidden');
        } else {
            container.classList.remove('hidden');
            const nextSection = appState.flatSections[nextIndex];
            btn.textContent = `Continuar a: ${nextSection.subtitle} →`;
        }
    }

    /**
     * Muestra un mensaje de error
     */
    function showError(message) {
        const textContainer = document.getElementById('text-content');
        if (textContainer) {
            textContainer.innerHTML = `<p class="loading" style="color: var(--secondary-text);">${message}</p>`;
        }
    }

    // ========================================
    // API PÚBLICA
    // ========================================

    return {
        initIndex,
        initReader
    };

})();

// Hacer disponible globalmente
window.NovelReader = NovelReader;