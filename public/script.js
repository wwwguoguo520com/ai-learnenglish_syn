const state = {
    annotations: [],
    activeRange: null,
    editingId: null,
    lastCategory: null,
    lastCustomCategory: '',
    lastColor: null,
    lastUnderline: false,
    lastBold: false,
    lastStrikethrough: false,
    lastBorderStyle: 'none',
    lastEmoji: '',
    lastShowNoteBelow: false,
    lastCustomBgColor: '',
    lastFontFamily: '',
    lastUnderlineOnly: false,
    lastTextColor: 'default',
    lastFontSize: 'medium',
    lastDashed: false,
    lastSlash: false,
    lastCustomTextColor: null,
    lastUnderlineColor: null,
    lastBorderColor: null,
    autoSync: true,
    inputCollapsed: true,
    documents: [],
    activeDocumentId: null,
    readerWidth: 55,
    readerFontSize: 16,
    readerLineHeight: 1.6,
    theme: 'light',
    batchMode: false,
    selectedAnnotations: new Set(),
    currentHighlightIndex: -1,
    annotationTemplates: [],
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,
    // 断点连接标注
    lastAnnotationText: '',
    lastAnnotationTime: 0,
    lastAnnotationId: null,
    // AI配置
    aiConfig: {
        apiKey: '',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-3.5-turbo',
        customModel: '',
        autoApply: true,
        analyzeSelection: false
    },
    gistConfig: {
        token: '',
        gistId: '',
        filename: 'reading-annotator.json',
        autoSync: false,
        lastSyncAt: null,
        status: 'idle'
    },
    // 生词本
    vocabBook: [],
    reviewState: {
        cards: [],
        currentIndex: 0,
        showingBack: false
    },
    // TTS状态
    ttsState: {
        speaking: false,
        paused: false,
        currentText: '',
        rate: 1.0,
        pitch: 1.0,
        voice: null
    },
    // 自定义类别配置（扩展支持默认样式）
    customCategories: [
        {
            id: 'vocab',
            label: '生词',
            applyStyle: true,
            defaultStyle: {
                color: null,
                textColor: null,
                bold: true,
                underline: false,
                borderStyle: 'none',
                borderColor: null,
                underlineColor: null
            }
        },
        {
            id: 'phrase',
            label: '词组',
            applyStyle: true,
            defaultStyle: {
                color: null,
                textColor: null,
                bold: false,
                underline: true,
                borderStyle: 'none',
                borderColor: null,
                underlineColor: null
            }
        },
        {
            id: 'difficulty',
            label: '疑难',
            applyStyle: true,
            defaultStyle: {
                color: 'sunset',
                textColor: null,
                bold: false,
                underline: false,
                borderStyle: 'none',
                borderColor: null,
                underlineColor: null
            }
        },
        {
            id: 'keypoint',
            label: '重点',
            applyStyle: true,
            defaultStyle: {
                color: 'honey',
                textColor: null,
                bold: false,
                underline: false,
                borderStyle: 'none',
                borderColor: null,
                underlineColor: null
            }
        },
        {
            id: 'translation',
            label: '翻译',
            applyStyle: true,
            defaultStyle: {
                color: null,
                textColor: null,
                bold: false,
                underline: false,
                borderStyle: 'none',
                borderColor: null,
                underlineColor: null
            }
        }
    ]
};

const dom = {};

const QUICK_TEMPLATES = {
    Paragraph: `In an era defined by relentless information flows, the ability to read analytically has become a critical survival skill. Effective readers question the author's assumptions, test arguments against prior knowledge, and translate insights into practice.`,
    Vocabulary: `1. resilience (n.) — the capacity to recover quickly from difficulties\n2. deliberate (adj.) — done consciously and intentionally\n3. synthesize (v.) — combine into a coherent whole`
};

const CATEGORY_LABELS = {
    vocab: '生词',
    phrase: '词组',
    difficulty: '疑难',
    keypoint: '重点',
    translation: '翻译',
    custom: '自定义',
    // 语法分析类别
    mainSubject: '主要主语',
    clauseSubject: '从句主语',
    mainVerb: '主要谓语',
    clauseVerb: '从句谓语',
    object: '宾语表语',
    attribute: '定语',
    adverbial: '状语',
    conjunction: '连词',
    clauseMarker: '从句引导词'
};

// 语法标注符号配置
const GRAMMAR_SYMBOLS = {
    attribute: { prefix: '(', suffix: ')' },
    adverbial: { prefix: '[', suffix: ']' },
    clauseMarker: { prefix: '{', suffix: '}' }
};

const STORAGE_KEY = 'reading-annotator:data:v1';
const DEFAULT_READER_WIDTH = 55;
const MIN_READER_WIDTH = 35;
const MAX_READER_WIDTH = 100;

const HIGHLIGHT_COLORS = new Set(['honey', 'mint', 'sky', 'orchid', 'sunset']);
let gistAutoSyncTimer = null;
let gistAutoSyncSuspended = false;
let gistSyncInFlight = false;
const GIST_SYNC_DEBOUNCE_MS = 5000;


document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    bindEvents();
    initializeAppState();
    initToolbarTabs(); // v4.2.4: 初始化工具栏选项卡
    initStickyToolbar(); // 初始化粘性工具栏
    initCategoryManagement(); // 初始化类别管理
    initColorPicker(); // 初始化颜色选择器

    // 标记初始化完成，供reader.html使用
    window.appInitialized = true;
    window.state = state; // Expose state for debugging
    window.dispatchEvent(new Event('appReady'));
});

function cacheDom() {
    dom.sourceText = document.getElementById('sourceText');
    dom.loadTextBtn = document.getElementById('loadTextBtn');
    dom.clearInputBtn = document.getElementById('clearInputBtn');
    dom.inputPanel = document.getElementById('inputPanel');
    dom.layout = document.querySelector('.layout');
    dom.toggleInputPanelBtn = document.getElementById('toggleInputPanelBtn');
    dom.readingArea = document.getElementById('readingArea');
    dom.selectionToolbar = document.getElementById('selectionToolbar');
    dom.annotationForm = document.getElementById('annotationForm');
    dom.categoryButtons = dom.annotationForm.querySelectorAll('.category-buttons button');
    dom.customCategoryInput = document.getElementById('customCategoryInput');
    dom.colorButtons = dom.annotationForm.querySelectorAll('.color-palette button');
    dom.underlineToggle = document.getElementById('underlineToggle');
    dom.noteInput = document.getElementById('noteInput');
    dom.tagsInput = document.getElementById('tagsInput');
    dom.cancelAnnotationBtn = document.getElementById('cancelAnnotationBtn');
    dom.annotationList = document.getElementById('annotationList');
    dom.annotationItemTemplate = document.getElementById('annotationItemTemplate');
    dom.copyAnnotationsBtn = document.getElementById('copyAnnotationsBtn');
    dom.exportJsonBtn = document.getElementById('exportJsonBtn');
    dom.exportMarkdownBtn = document.getElementById('exportMarkdownBtn');
    dom.importJsonBtn = document.getElementById('importJsonBtn');
    dom.importJsonInput = document.getElementById('importJsonInput');
    dom.toggleNotesBtn = document.getElementById('toggleNotesBtn');
    dom.clearHighlightsBtn = document.getElementById('clearHighlightsBtn');
    dom.enterBatchModeBtn = document.getElementById('enterBatchModeBtn');
    dom.batchOperations = document.querySelector('.batch-operations');
    dom.selectAllBtn = document.getElementById('selectAllBtn');
    dom.deselectAllBtn = document.getElementById('deselectAllBtn');
    dom.batchDeleteBtn = document.getElementById('batchDeleteBtn');
    dom.batchColorSelect = document.getElementById('batchColorSelect');
    dom.toggleBatchModeBtn = document.getElementById('toggleBatchModeBtn');
    dom.categoryFilter = document.getElementById('categoryFilter');
    dom.tagFilter = document.getElementById('tagFilter');
    dom.searchFilter = document.getElementById('searchFilter');
    dom.clearFilterBtn = document.getElementById('clearFilterBtn');
    dom.autoSyncToggle = document.getElementById('autoSyncToggle');
    dom.quickTemplateButtons = document.querySelectorAll('.quick-templates button[data-template]');
    dom.annotationsPanel = document.querySelector('.annotations-panel');
    dom.summaryElements = {};
    dom.categoryMetrics = document.getElementById('categoryMetrics');
    dom.documentList = document.getElementById('documentList');
    dom.documentEmptyState = document.getElementById('documentEmptyState');
    dom.readerWidthSlider = document.getElementById('readerWidthSlider');
    dom.readerWidthValue = document.getElementById('readerWidthValue');
    dom.readerFontSizeSlider = document.getElementById('readerFontSizeSlider');
    dom.readerFontSizeValue = document.getElementById('readerFontSizeValue');
    dom.readerLineHeightSlider = document.getElementById('readerLineHeightSlider');
    dom.readerLineHeightValue = document.getElementById('readerLineHeightValue');
    dom.backupDataBtn = document.getElementById('backupDataBtn');
    dom.restoreDataBtn = document.getElementById('restoreDataBtn');
    dom.restoreDataInput = document.getElementById('restoreDataInput');
    dom.syncGistBtn = document.getElementById('syncGistBtn');
    dom.gistSettingsBtn = document.getElementById('gistSettingsBtn');
    dom.gistSettingsModal = document.getElementById('gistSettingsModal');
    dom.gistSettingsOverlay = dom.gistSettingsModal ? dom.gistSettingsModal.querySelector('.shortcuts-modal__overlay') : null;
    dom.closeGistSettingsBtn = document.getElementById('closeGistSettingsBtn');
    dom.saveGistSettingsBtn = document.getElementById('saveGistSettingsBtn');
    dom.gistSyncFromModalBtn = document.getElementById('gistSyncFromModalBtn');
    dom.gistTokenInput = document.getElementById('gistTokenInput');
    dom.gistIdInput = document.getElementById('gistIdInput');
    dom.gistFilenameInput = document.getElementById('gistFilenameInput');
    dom.gistAutoSyncToggle = document.getElementById('gistAutoSyncToggle');
    dom.gistStatusText = document.getElementById('gistStatusText');
    dom.gistLastSyncValue = document.getElementById('gistLastSyncValue');
    dom.quickHighlightBtn = document.getElementById('quickHighlightBtn');
    dom.saveTemplateBtn = document.getElementById('saveTemplateBtn');
    dom.loadTemplateBtn = document.getElementById('loadTemplateBtn');
    dom.formatBoldToggle = document.getElementById('formatBoldToggle');
    dom.formatUnderlineToggle = document.getElementById('formatUnderlineToggle');
    dom.formatStrikethroughToggle = document.getElementById('formatStrikethroughToggle');
    dom.formatColorButtons = document.querySelectorAll('.formatting-toolbar [data-color]');
    dom.formatBorderButtons = document.querySelectorAll('.format-border-btn');
    dom.formatEmojiButtons = document.querySelectorAll('.format-emoji-btn');
    dom.formatCategoryButtons = document.querySelectorAll('.format-category-btn');
    dom.formatApplyBtn = document.getElementById('formatApplyBtn');
    dom.manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
    dom.categoryManageModal = document.getElementById('categoryManageModal');
    dom.categoryList = document.getElementById('categoryList');
    dom.addCategoryBtn = document.getElementById('addCategoryBtn');
    dom.closeCategoryManageBtn = document.getElementById('closeCategoryManageBtn');
    // 新增功能DOM元素
    dom.formatDashedToggle = document.getElementById('formatDashedToggle');
    dom.formatSlashToggle = document.getElementById('formatSlashToggle');
    dom.textColorBtn = document.getElementById('textColorBtn');
    dom.underlineColorBtn = document.getElementById('underlineColorBtn');
    dom.squareBorderColorBtn = document.getElementById('squareBorderColorBtn');
    dom.roundBorderColorBtn = document.getElementById('roundBorderColorBtn');
    dom.colorPickerPanel = document.getElementById('colorPickerPanel');
    dom.colorGrid = document.getElementById('colorGrid');
    dom.undoBtn = document.getElementById('undoBtn');
    dom.redoBtn = document.getElementById('redoBtn');
    dom.boldToggle = document.getElementById('boldToggle');
    dom.noteInput = document.getElementById('noteInput');
    dom.tagsInput = document.getElementById('tagsInput');
    dom.cancelAnnotationBtn = document.getElementById('cancelAnnotationBtn');
    dom.underlineOnlyToggle = document.getElementById('underlineOnlyToggle');
    dom.textColorSelect = document.getElementById('textColorSelect');
    dom.fontSizeSelect = document.getElementById('fontSizeSelect');
    dom.importMarkdownBtn = document.getElementById('importMarkdownBtn');
    dom.importMarkdownInput = document.getElementById('importMarkdownInput');
    dom.tooltip = null; // 将动态创建
    dom.shortcutsModal = document.getElementById('shortcutsModal');
    dom.showShortcutsBtn = document.getElementById('showShortcutsBtn');
    dom.closeShortcutsBtn = document.getElementById('closeShortcutsBtn');
    dom.grammarGuideModal = document.getElementById('grammarGuideModal');
    dom.showGrammarGuideBtn = document.getElementById('showGrammarGuideBtn');
    dom.closeGrammarGuideBtn = document.getElementById('closeGrammarGuideBtn');
    dom.statsModal = document.getElementById('statsModal');
    dom.showStatsBtn = document.getElementById('showStatsBtn');
    dom.closeStatsBtn = document.getElementById('closeStatsBtn');
    dom.themeToggleBtn = document.getElementById('themeToggleBtn');
    dom.highlightContextMenu = document.getElementById('highlightContextMenu');
    dom.strikethroughToggle = document.getElementById('strikethroughToggle');
    dom.showNoteBelow = document.getElementById('showNoteBelow');
    dom.borderStyleButtons = document.querySelectorAll('.border-style-btn');
    dom.emojiButtons = document.querySelectorAll('.emoji-btn');
    dom.customBgColor = document.getElementById('customBgColor');
    dom.fontFamilySelect = document.getElementById('fontFamilySelect');
    // AI相关
    dom.aiSettingsModal = document.getElementById('aiSettingsModal');
    dom.showAISettingsBtn = document.getElementById('showAISettingsBtn');
    dom.closeAISettingsBtn = document.getElementById('closeAISettingsBtn');
    dom.saveAISettingsBtn = document.getElementById('saveAISettingsBtn');
    dom.aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
    dom.aiApiKey = document.getElementById('aiApiKey');
    dom.aiApiEndpoint = document.getElementById('aiApiEndpoint');
    dom.aiModel = document.getElementById('aiModel');
    dom.aiCustomModel = document.getElementById('aiCustomModel');
    dom.aiAutoApply = document.getElementById('aiAutoApply');
    dom.aiAnalyzeSelection = document.getElementById('aiAnalyzeSelection');
    dom.aiExplainBtn = document.getElementById('aiExplainBtn');
    dom.aiTranslateModal = document.getElementById('aiTranslateModal');
    dom.closeAITranslateBtn = document.getElementById('closeAITranslateBtn');
    dom.aiTranslateOriginal = document.getElementById('aiTranslateOriginal');
    dom.aiTranslateResult = document.getElementById('aiTranslateResult');
    dom.aiTranslateApplyBtn = document.getElementById('aiTranslateApplyBtn');
    dom.aiTranslateRetryBtn = document.getElementById('aiTranslateRetryBtn');
    dom.quickTranslateBtn = document.getElementById('quickTranslateBtn');
    // 生词本相关
    dom.vocabBookModal = document.getElementById('vocabBookModal');
    dom.showVocabBookBtn = document.getElementById('showVocabBookBtn');
    dom.closeVocabBookBtn = document.getElementById('closeVocabBookBtn');
    dom.vocabBookList = document.getElementById('vocabBookList');
    dom.vocabBookCount = document.getElementById('vocabBookCount');
    dom.reviewVocabBtn = document.getElementById('reviewVocabBtn');
    dom.exportAnkiBtn = document.getElementById('exportAnkiBtn');
    dom.clearVocabBookBtn = document.getElementById('clearVocabBookBtn');
    dom.vocabReviewModal = document.getElementById('vocabReviewModal');
    dom.closeVocabReviewBtn = document.getElementById('closeVocabReviewBtn');
    dom.reviewProgress = document.getElementById('reviewProgress');
    dom.reviewWord = document.getElementById('reviewWord');
    dom.reviewNote = document.getElementById('reviewNote');
    dom.reviewCardFront = document.getElementById('reviewCardFront');
    dom.reviewCardBack = document.getElementById('reviewCardBack');
    dom.reviewPrevBtn = document.getElementById('reviewPrevBtn');
    dom.reviewNextBtn = document.getElementById('reviewNextBtn');
    dom.reviewMarkKnownBtn = document.getElementById('reviewMarkKnownBtn');
    dom.reviewMarkUnknownBtn = document.getElementById('reviewMarkUnknownBtn');
    // TTS相关
    dom.ttsControls = document.getElementById('ttsControls');
    dom.ttsPlayBtn = document.getElementById('ttsPlayBtn');
    dom.ttsStopBtn = document.getElementById('ttsStopBtn');
    dom.ttsStatus = document.getElementById('ttsStatus');
    dom.ttsRate = document.getElementById('ttsRate');
    dom.ttsRateValue = document.getElementById('ttsRateValue');
    dom.ttsSettingsBtn = document.getElementById('ttsSettingsBtn');
    document.querySelectorAll('[data-summary]').forEach(element => {
        dom.summaryElements[element.dataset.summary] = element;
    });
}

function bindEvents() {
    // Input page elements
    if (dom.loadTextBtn) {
        dom.loadTextBtn.addEventListener('click', handleLoadText);
    }
    if (dom.clearInputBtn && dom.sourceText) {
        dom.clearInputBtn.addEventListener('click', () => dom.sourceText.value = '');
    }

    // Reader page elements
    if (dom.clearHighlightsBtn) {
        dom.clearHighlightsBtn.addEventListener('click', clearAllHighlights);
    }
    if (dom.toggleNotesBtn) {
        dom.toggleNotesBtn.addEventListener('click', toggleAnnotationPanel);
    }
    if (dom.toggleInputPanelBtn) {
        dom.toggleInputPanelBtn.addEventListener('click', toggleInputPanelCollapsed);
    }

    if (dom.readingArea) {
        dom.readingArea.addEventListener('pointerup', (e) => scheduleSelectionCheck(e));
        dom.readingArea.addEventListener('keyup', (e) => scheduleSelectionCheck(e));
        dom.readingArea.addEventListener('keydown', handleReaderKeyboardShortcuts);
    }

    if (dom.annotationForm) {
        dom.annotationForm.addEventListener('submit', handleAnnotationSubmit);
    }
    if (dom.cancelAnnotationBtn) {
        dom.cancelAnnotationBtn.addEventListener('click', () => {
            hideToolbar();
            window.getSelection()?.removeAllRanges();
        });
    }

    // 折叠/展开高级选项
    const toggleAdvancedBtn = document.getElementById('toggleAdvancedBtn');
    const toolbarAdvanced = document.querySelector('.toolbar-advanced');
    if (toggleAdvancedBtn && toolbarAdvanced) {
        toggleAdvancedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toolbarAdvanced.classList.toggle('hidden');
            toggleAdvancedBtn.classList.toggle('active');
        });
    }

    if (dom.categoryButtons) {
        dom.categoryButtons.forEach(btn => btn.addEventListener('click', () => handleCategorySelection(btn)));
    }
    if (dom.colorButtons) {
        dom.colorButtons.forEach(btn => btn.addEventListener('click', () => handleColorSelection(btn)));
    }
    if (dom.underlineToggle) {
        dom.underlineToggle.addEventListener('change', event => {
            state.lastUnderline = event.target.checked;
            updateLivePreview();
        });
    }

    if (dom.strikethroughToggle) {
        dom.strikethroughToggle.addEventListener('change', event => {
            state.lastStrikethrough = event.target.checked;
            updateLivePreview();
        });
    }

    if (dom.showNoteBelow) {
        dom.showNoteBelow.addEventListener('change', event => {
            state.lastShowNoteBelow = event.target.checked;
        });
    }

    if (dom.borderStyleButtons) {
        dom.borderStyleButtons.forEach(btn => {
            btn.addEventListener('click', () => handleBorderStyleSelection(btn));
        });
    }

    if (dom.emojiButtons) {
        dom.emojiButtons.forEach(btn => {
            btn.addEventListener('click', () => handleEmojiSelection(btn));
        });
    }
    refreshGistSettingsUI();

    if (dom.customBgColor) {
        dom.customBgColor.addEventListener('input', event => {
            state.lastCustomBgColor = event.target.value;
            updateLivePreview();
        });
    }

    if (dom.fontFamilySelect) {
        dom.fontFamilySelect.addEventListener('change', event => {
            state.lastFontFamily = event.target.value;
            updateLivePreview();
        });
    }

    if (dom.copyAnnotationsBtn) {
        dom.copyAnnotationsBtn.addEventListener('click', copyAnnotationsToClipboard);
    }
    if (dom.exportJsonBtn) {
        dom.exportJsonBtn.addEventListener('click', exportAnnotationsAsJson);
    }
    if (dom.exportMarkdownBtn) {
        dom.exportMarkdownBtn.addEventListener('click', exportAnnotationsAsMarkdown);
    }
    if (dom.importJsonBtn && dom.importJsonInput) {
        dom.importJsonBtn.addEventListener('click', () => dom.importJsonInput.click());
        dom.importJsonInput.addEventListener('change', handleJsonImport);
    }

    // 批量操作
    if (dom.enterBatchModeBtn) {
        dom.enterBatchModeBtn.addEventListener('click', () => toggleBatchMode(true));
    }
    if (dom.toggleBatchModeBtn) {
        dom.toggleBatchModeBtn.addEventListener('click', () => toggleBatchMode(false));
    }
    if (dom.selectAllBtn) {
        dom.selectAllBtn.addEventListener('click', selectAllAnnotations);
    }
    if (dom.deselectAllBtn) {
        dom.deselectAllBtn.addEventListener('click', deselectAllAnnotations);
    }
    if (dom.batchDeleteBtn) {
        dom.batchDeleteBtn.addEventListener('click', batchDeleteAnnotations);
    }
    if (dom.batchColorSelect) {
        dom.batchColorSelect.addEventListener('change', handleBatchColorChange);
    }
    if (dom.annotationList) {
        dom.annotationList.addEventListener('click', handleAnnotationActions);
        dom.annotationList.addEventListener('keydown', handleAnnotationListKeyboardShortcuts);
    }

    if (dom.categoryFilter) {
        dom.categoryFilter.addEventListener('change', renderAnnotationList);
    }
    if (dom.tagFilter) {
        dom.tagFilter.addEventListener('keydown', handleTagFilterInput);
    }
    if (dom.searchFilter) {
        dom.searchFilter.addEventListener('input', renderAnnotationList);
    }
    if (dom.clearFilterBtn) {
        dom.clearFilterBtn.addEventListener('click', resetFilters);
    }
    if (dom.autoSyncToggle) {
        dom.autoSyncToggle.addEventListener('change', event => {
            state.autoSync = Boolean(event.target.checked);
            persistState();
        });
    }

    if (dom.quickTemplateButtons) {
        dom.quickTemplateButtons.forEach(btn => {
            btn.addEventListener('click', () => insertTemplate(btn.dataset.template));
        });
    }

    if (dom.documentList) {
        dom.documentList.addEventListener('click', handleDocumentListClick);
    }
    if (dom.readerWidthSlider) {
        dom.readerWidthSlider.addEventListener('input', handleReaderWidthInput);
        dom.readerWidthSlider.addEventListener('change', handleReaderWidthCommit);
    }
    if (dom.readerFontSizeSlider) {
        dom.readerFontSizeSlider.addEventListener('input', handleReaderFontSizeInput);
    }
    if (dom.readerLineHeightSlider) {
        dom.readerLineHeightSlider.addEventListener('input', handleReaderLineHeightInput);
    }
    if (dom.backupDataBtn) {
        dom.backupDataBtn.addEventListener('click', exportDataBackup);
    }
    if (dom.restoreDataBtn && dom.restoreDataInput) {
        dom.restoreDataBtn.addEventListener('click', () => dom.restoreDataInput.click());
        dom.restoreDataInput.addEventListener('change', handleDataRestore);
    }
    if (dom.syncGistBtn) {
        dom.syncGistBtn.addEventListener('click', () => syncDataToGist({ manual: true }));
    }
    if (dom.gistSettingsBtn) {
        dom.gistSettingsBtn.addEventListener('click', openGistSettingsModal);
    }
    if (dom.closeGistSettingsBtn) {
        dom.closeGistSettingsBtn.addEventListener('click', closeGistSettingsModal);
    }
    if (dom.gistSettingsOverlay) {
        dom.gistSettingsOverlay.addEventListener('click', closeGistSettingsModal);
    }
    if (dom.saveGistSettingsBtn) {
        dom.saveGistSettingsBtn.addEventListener('click', handleGistSettingsSave);
    }
    if (dom.gistSyncFromModalBtn) {
        dom.gistSyncFromModalBtn.addEventListener('click', () => syncDataToGist({ manual: true }));
    }
    if (dom.gistAutoSyncToggle) {
        dom.gistAutoSyncToggle.addEventListener('change', handleGistAutoSyncToggle);
    }
    if (dom.quickHighlightBtn) {
        dom.quickHighlightBtn.addEventListener('click', handleQuickHighlight);
    }
    if (dom.saveTemplateBtn) {
        dom.saveTemplateBtn.addEventListener('click', saveAnnotationTemplate);
    }
    if (dom.loadTemplateBtn) {
        dom.loadTemplateBtn.addEventListener('click', loadAnnotationTemplate);
    }

    document.addEventListener('pointerdown', handleOutsideClick, true);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange, true);

    // 撤销/重做按钮
    if (dom.undoBtn) {
        dom.undoBtn.addEventListener('click', undo);
    }
    if (dom.redoBtn) {
        dom.redoBtn.addEventListener('click', redo);
    }

    // 撤销/重做快捷键
    document.addEventListener('keydown', (event) => {
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        const modKey = isMac ? event.metaKey : event.ctrlKey;

        if (modKey && event.key === 'z' && !event.shiftKey) {
            event.preventDefault();
            undo();
        } else if (modKey && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
            event.preventDefault();
            redo();
        }
    });

    if (dom.formatBoldToggle) {
        dom.formatBoldToggle.addEventListener('click', () => {
            setBoldState(!state.lastBold, { persist: true });
        });
    }
    if (dom.formatUnderlineToggle) {
        dom.formatUnderlineToggle.addEventListener('click', () => {
            setUnderlineState(!state.lastUnderline, { persist: true });
        });
    }
    if (dom.formatColorButtons) {
        dom.formatColorButtons.forEach(btn => {
            btn.addEventListener('click', () => handleColorSelection(btn, { persist: true }));
        });
    }
    if (dom.formatApplyBtn) {
        dom.formatApplyBtn.addEventListener('click', applyQuickFormat);
    }

    // formatting-toolbar 新样式按钮
    if (dom.formatStrikethroughToggle) {
        dom.formatStrikethroughToggle.addEventListener('click', () => {
            state.lastStrikethrough = !state.lastStrikethrough;
            dom.formatStrikethroughToggle.classList.toggle('active', state.lastStrikethrough);
            if (dom.strikethroughToggle) {
                dom.strikethroughToggle.checked = state.lastStrikethrough;
            }
            updateLivePreview();
            persistState();
        });
    }

    if (dom.formatBorderButtons) {
        dom.formatBorderButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                handleBorderStyleSelection(btn);
            });
        });
    }

    // 初始化类别按钮（包括预设和自定义）
    if (dom.formatCategoryButtons) {
        dom.formatCategoryButtons.forEach(btn => {
            btn.addEventListener('click', () => handleFormatCategorySelection(btn));
        });
    }

    // 渲染自定义类别按钮
    renderCategoryButtons();

    if (dom.formatEmojiButtons) {
        dom.formatEmojiButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                handleEmojiSelection(btn);
            });
        });
    }

    if (dom.boldToggle) {
        dom.boldToggle.addEventListener('change', event => {
            setBoldState(event.target.checked);
        });
    }

    // 新增功能的事件监听
    if (dom.formatDashedToggle) {
        dom.formatDashedToggle.addEventListener('click', () => {
            state.lastDashed = !state.lastDashed;
            dom.formatDashedToggle.classList.toggle('active', state.lastDashed);
            dom.formatDashedToggle.setAttribute('aria-pressed', String(state.lastDashed));
            persistState();
        });
    }

    if (dom.formatSlashToggle) {
        dom.formatSlashToggle.addEventListener('click', () => {
            state.lastSlash = !state.lastSlash;
            dom.formatSlashToggle.classList.toggle('active', state.lastSlash);
            dom.formatSlashToggle.setAttribute('aria-pressed', String(state.lastSlash));
            persistState();
        });
    }

    // 边框按钮点击时设置边框状态并显示颜色选择按钮
    document.querySelectorAll('.format-border-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleBorderSelection(btn);
            const borderType = btn.dataset.border;

            // 显示/隐藏对应的颜色按钮
            if (state.lastBorderStyle === 'square' && dom.squareBorderColorBtn) {
                dom.squareBorderColorBtn.classList.remove('hidden');
                dom.roundBorderColorBtn?.classList.add('hidden');
            } else if (state.lastBorderStyle === 'round' && dom.roundBorderColorBtn) {
                dom.roundBorderColorBtn.classList.remove('hidden');
                dom.squareBorderColorBtn?.classList.add('hidden');
            } else {
                // 取消边框时隐藏所有颜色按钮
                dom.squareBorderColorBtn?.classList.add('hidden');
                dom.roundBorderColorBtn?.classList.add('hidden');
            }
        });
    });

    if (dom.underlineOnlyToggle) {
        dom.underlineOnlyToggle.addEventListener('change', event => {
            state.lastUnderlineOnly = event.target.checked;
        });
    }
    if (dom.textColorSelect) {
        dom.textColorSelect.addEventListener('change', event => {
            state.lastTextColor = event.target.value;
        });
    }
    if (dom.fontSizeSelect) {
        dom.fontSizeSelect.addEventListener('change', event => {
            state.lastFontSize = event.target.value;
        });
    }
    if (dom.importMarkdownBtn && dom.importMarkdownInput) {
        dom.importMarkdownBtn.addEventListener('click', () => dom.importMarkdownInput.click());
        dom.importMarkdownInput.addEventListener('change', handleMarkdownImport);
    }

    // 支持直接粘贴Markdown格式文本
    if (dom.sourceText) {
        dom.sourceText.addEventListener('paste', handleMarkdownPaste);
    }

    // 添加快捷键支持
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // 键盘导航
    document.addEventListener('keydown', handleAnnotationNavigation);

    // 快捷键面板控制
    if (dom.showShortcutsBtn) {
        dom.showShortcutsBtn.addEventListener('click', showShortcutsModal);
    }
    if (dom.closeShortcutsBtn) {
        dom.closeShortcutsBtn.addEventListener('click', hideShortcutsModal);
    }

    // 语法指南面板控制
    if (dom.showGrammarGuideBtn) {
        dom.showGrammarGuideBtn.addEventListener('click', showGrammarGuideModal);
    }
    if (dom.closeGrammarGuideBtn) {
        dom.closeGrammarGuideBtn.addEventListener('click', hideGrammarGuideModal);
    }

    // 统计面板控制
    if (dom.showStatsBtn) {
        dom.showStatsBtn.addEventListener('click', showStatsModal);
    }
    if (dom.closeStatsBtn) {
        dom.closeStatsBtn.addEventListener('click', hideStatsModal);
    }

    // 主题切换
    if (dom.themeToggleBtn) {
        dom.themeToggleBtn.addEventListener('click', toggleTheme);
    }
    if (dom.shortcutsModal) {
        dom.shortcutsModal.querySelector('.shortcuts-modal__overlay')?.addEventListener('click', hideShortcutsModal);
    }
    if (dom.grammarGuideModal) {
        dom.grammarGuideModal.querySelector('.shortcuts-modal__overlay')?.addEventListener('click', hideGrammarGuideModal);
    }
    if (dom.statsModal) {
        dom.statsModal.querySelector('.shortcuts-modal__overlay')?.addEventListener('click', hideStatsModal);
    }

    // AI设置相关
    if (dom.showAISettingsBtn) {
        dom.showAISettingsBtn.addEventListener('click', showAISettingsModal);
    }
    if (dom.closeAISettingsBtn) {
        dom.closeAISettingsBtn.addEventListener('click', hideAISettingsModal);
    }
    if (dom.saveAISettingsBtn) {
        dom.saveAISettingsBtn.addEventListener('click', saveAISettings);
    }
    if (dom.aiAnalyzeBtn) {
        dom.aiAnalyzeBtn.addEventListener('click', handleAIAnalyze);
    }
    if (dom.aiSettingsModal) {
        dom.aiSettingsModal.querySelector('.shortcuts-modal__overlay')?.addEventListener('click', hideAISettingsModal);
    }

    // AI翻译和解释
    if (dom.aiExplainBtn) {
        dom.aiExplainBtn.addEventListener('click', handleAIExplain);
    }
    if (dom.closeAITranslateBtn) {
        dom.closeAITranslateBtn.addEventListener('click', hideAITranslateModal);
    }
    if (dom.aiTranslateModal) {
        dom.aiTranslateModal.querySelector('.shortcuts-modal__overlay')?.addEventListener('click', hideAITranslateModal);
    }
    if (dom.aiTranslateApplyBtn) {
        dom.aiTranslateApplyBtn.addEventListener('click', applyAITranslation);
    }
    if (dom.aiTranslateRetryBtn) {
        dom.aiTranslateRetryBtn.addEventListener('click', retryAITranslation);
    }
    if (dom.quickTranslateBtn) {
        dom.quickTranslateBtn.querySelector('button')?.addEventListener('click', handleQuickTranslate);
    }

    // 阅读区域选中文本显示翻译按钮
    // 已由pointerup事件处理，移除重复的mouseup监听器以避免冲突
    // dom.readingArea.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('selectionchange', handleSelectionChange);

    // 生词本相关
    if (dom.showVocabBookBtn) {
        dom.showVocabBookBtn.addEventListener('click', showVocabBookModal);
    }
    if (dom.closeVocabBookBtn) {
        dom.closeVocabBookBtn.addEventListener('click', hideVocabBookModal);
    }
    if (dom.vocabBookModal) {
        dom.vocabBookModal.querySelector('.shortcuts-modal__overlay')?.addEventListener('click', hideVocabBookModal);
    }
    if (dom.reviewVocabBtn) {
        dom.reviewVocabBtn.addEventListener('click', startVocabReview);
    }
    if (dom.exportAnkiBtn) {
        dom.exportAnkiBtn.addEventListener('click', exportToAnki);
    }
    if (dom.clearVocabBookBtn) {
        dom.clearVocabBookBtn.addEventListener('click', clearVocabBook);
    }
    if (dom.closeVocabReviewBtn) {
        dom.closeVocabReviewBtn.addEventListener('click', hideVocabReviewModal);
    }
    if (dom.vocabReviewModal) {
        dom.vocabReviewModal.querySelector('.shortcuts-modal__overlay')?.addEventListener('click', hideVocabReviewModal);
    }
    if (dom.reviewPrevBtn) {
        dom.reviewPrevBtn.addEventListener('click', showPreviousReviewCard);
    }
    if (dom.reviewNextBtn) {
        dom.reviewNextBtn.addEventListener('click', showNextReviewCard);
    }
    if (dom.reviewMarkKnownBtn) {
        dom.reviewMarkKnownBtn.addEventListener('click', markAsKnown);
    }
    if (dom.reviewMarkUnknownBtn) {
        dom.reviewMarkUnknownBtn.addEventListener('click', markAsUnknown);
    }

    // TTS相关
    if (dom.ttsPlayBtn) {
        dom.ttsPlayBtn.addEventListener('click', toggleTTSPlayPause);
    }
    if (dom.ttsStopBtn) {
        dom.ttsStopBtn.addEventListener('click', stopTTS);
    }
    if (dom.ttsRate) {
        dom.ttsRate.addEventListener('input', updateTTSRate);
    }
    if (dom.ttsSettingsBtn) {
        dom.ttsSettingsBtn.addEventListener('click', showTTSSettings);
    }

    // 快捷菜单事件 - 使用 mouseover 而不是 click
    if (dom.readingArea) {
        dom.readingArea.addEventListener('mouseover', handleHighlightHover);
        dom.readingArea.addEventListener('mouseout', handleHighlightMouseOut);
    }
    document.addEventListener('click', hideContextMenu);
    if (dom.highlightContextMenu) {
        dom.highlightContextMenu.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', handleContextMenuAction);
        });
    }

    // 初始化formatting-toolbar的默认状态
    if (dom.formatCategoryButtons && dom.formatCategoryButtons.length > 0) {
        // 如果有保存的类别，选中它
        if (state.lastCategory) {
            const activeBtn = Array.from(dom.formatCategoryButtons).find(btn => btn.dataset.category === state.lastCategory);
            if (activeBtn) {
                activeBtn.classList.add('active');
                console.log('[DEBUG] 🔄 恢复上次选中的类别', { category: state.lastCategory });
            }
        } else {
            console.log('[DEBUG] ⭕ 类别默认不选中');
        }
    }

    // 初始化颜色选择
    if (dom.formatColorButtons && dom.formatColorButtons.length > 0) {
        if (state.lastColor) {
            const activeBtn = Array.from(dom.formatColorButtons).find(btn => btn.dataset.color === state.lastColor);
            if (activeBtn) {
                activeBtn.classList.add('active');
                console.log('[DEBUG] 🔄 恢复上次选中的颜色', { color: state.lastColor });
            }
        } else {
            console.log('[DEBUG] ⭕ 颜色默认不选中');
        }
    }
}

// 显示快捷键面板
function showShortcutsModal() {
    if (dom.shortcutsModal) {
        dom.shortcutsModal.classList.remove('hidden');
    }
}

// 隐藏快捷键面板
function hideShortcutsModal() {
    if (dom.shortcutsModal) {
        dom.shortcutsModal.classList.add('hidden');
    }
}

// 显示语法指南面板
function showGrammarGuideModal() {
    if (dom.grammarGuideModal) {
        dom.grammarGuideModal.classList.remove('hidden');
    }
}

// 隐藏语法指南面板
function hideGrammarGuideModal() {
    if (dom.grammarGuideModal) {
        dom.grammarGuideModal.classList.add('hidden');
    }
}

// 显示统计面板
function showStatsModal() {
    if (dom.statsModal) {
        calculateAndDisplayStats();
        dom.statsModal.classList.remove('hidden');
    }
}

// 隐藏统计面板
function hideStatsModal() {
    if (dom.statsModal) {
        dom.statsModal.classList.add('hidden');
    }
}

// 计算并显示统计数据
function calculateAndDisplayStats() {
    const annotations = state.annotations;

    // 总体统计
    const totalCount = annotations.length;
    const wordCount = annotations.reduce((sum, a) => sum + a.text.split(/\s+/).length, 0);
    const categories = new Set(annotations.map(a => a.category));
    const allTags = annotations.flatMap(a => a.tags);
    const uniqueTags = new Set(allTags);

    document.getElementById('statTotalCount').textContent = totalCount;
    document.getElementById('statWordCount').textContent = wordCount;
    document.getElementById('statCategoryCount').textContent = categories.size;
    document.getElementById('statTagCount').textContent = uniqueTags.size;

    // 类别分布
    const categoryCount = {};
    annotations.forEach(a => {
        const cat = a.category === 'custom' ? (a.customCategory || 'custom') : a.category;
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const chartContainer = document.getElementById('statsCategoryChart');
    chartContainer.innerHTML = '';
    const maxCount = Math.max(...Object.values(categoryCount), 1);

    Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
            const percentage = (count / maxCount * 100).toFixed(1);
            const label = CATEGORY_LABELS[cat] || cat;
            const barHtml = `
                <div class="chart-bar">
                    <div class="chart-bar-label">${label}</div>
                    <div class="chart-bar-track">
                        <div class="chart-bar-fill" style="width: ${percentage}%">
                            <span class="chart-bar-value">${count}</span>
                        </div>
                    </div>
                </div>
            `;
            chartContainer.insertAdjacentHTML('beforeend', barHtml);
        });

    // 词频统计 (Top 10)
    const wordFreq = {};
    annotations.forEach(a => {
        const words = a.text.toLowerCase().split(/\s+/);
        words.forEach(word => {
            if (word.length > 2) { // 忽略太短的词
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });
    });

    const wordFreqContainer = document.getElementById('statsWordFreq');
    wordFreqContainer.innerHTML = '';

    Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([word, count], index) => {
            const itemHtml = `
                <div class="stats-list-item">
                    <div class="stats-list-rank">${index + 1}</div>
                    <div class="stats-list-word">${word}</div>
                    <div class="stats-list-count">${count}次</div>
                </div>
            `;
            wordFreqContainer.insertAdjacentHTML('beforeend', itemHtml);
        });

    // 热门标签
    const tagFreq = {};
    allTags.forEach(tag => {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
    });

    const tagContainer = document.getElementById('statsTagCloud');
    tagContainer.innerHTML = '';

    Object.entries(tagFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([tag, count]) => {
            const tagHtml = `<div class="stats-tag">${tag} (${count})</div>`;
            tagContainer.insertAdjacentHTML('beforeend', tagHtml);
        });

    if (Object.keys(tagFreq).length === 0) {
        tagContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">暂无标签</p>';
    }
}

// 鼠标悬停标注显示快捷菜单
let currentHighlightId = null;
let hoverTimeout = null;

function handleHighlightHover(event) {
    console.log('[DEBUG] 🖱️ 鼠标悬停事件触发', event.target);
    const highlight = event.target.closest('.highlight');
    if (!highlight) {
        console.log('[DEBUG] ❌ 未找到highlight元素');
        hideTooltip();
        return;
    }

    const annotationId = highlight.dataset.id;
    console.log('[DEBUG] ✅ 找到highlight元素', { annotationId, text: highlight.textContent.substring(0, 20) });

    // 清除之前的延迟
    if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        console.log('[DEBUG] 🔄 清除之前的延迟');
    }

    // 立即显示tooltip，传递鼠标位置
    showHighlightTooltip(highlight, event);

    // 立即显示菜单（无延迟）
    console.log('[DEBUG] ⚡ 立即显示菜单');
    currentHighlightId = annotationId;

    // 更新菜单文本（写笔记/编辑笔记）
    updateNoteMenuText(annotationId);

    // 显示快捷菜单，使用鼠标位置而不是标注位置
    // 这样对于换行的多片段标注，菜单会显示在鼠标附近
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    console.log('[DEBUG] 📍 菜单定位在鼠标位置', { x: mouseX, y: mouseY });
    showContextMenu(mouseX, mouseY, highlight);
}

function handleHighlightMouseOut(event) {
    const highlight = event.target.closest('.highlight');
    if (!highlight) return;

    console.log('[DEBUG] 🚶 鼠标离开标注', { target: event.target, relatedTarget: event.relatedTarget });

    // 检查是否移动到菜单上
    const relatedTarget = event.relatedTarget;
    if (relatedTarget && (relatedTarget === dom.highlightContextMenu || dom.highlightContextMenu.contains(relatedTarget))) {
        console.log('[DEBUG] 🎯 移动到菜单上，保持菜单显示');
        // 移到菜单上，保持tooltip隐藏但菜单显示
        hideTooltip();
        return;
    }

    console.log('[DEBUG] 🚫 离开标注且未移到菜单，延迟关闭');
    // 隐藏tooltip
    hideTooltip();

    // 添加短暂延迟，给用户时间移动到菜单
    if (hoverTimeout) {
        clearTimeout(hoverTimeout);
    }
    hoverTimeout = setTimeout(() => {
        // 再次检查鼠标是否在菜单上
        if (!dom.highlightContextMenu.matches(':hover')) {
            console.log('[DEBUG] ⏱️ 延迟后确认关闭菜单');
            hideContextMenu();
        } else {
            console.log('[DEBUG] ⏱️ 延迟后发现鼠标在菜单上，保持显示');
        }
    }, 150); // 150ms延迟
}

function updateNoteMenuText(annotationId) {
    console.log('[DEBUG] 📝 更新笔记菜单文本', { annotationId });
    const annotation = state.annotations.find(a => a.id === annotationId);
    const noteMenuText = document.getElementById('noteMenuText');
    const noteButton = document.querySelector('[data-action="note"]');
    console.log('[DEBUG] 📋 查找结果', {
        annotation: annotation ? { id: annotation.id, hasNote: !!annotation.note } : null,
        menuElement: !!noteMenuText,
        button: !!noteButton
    });
    if (noteMenuText && annotation) {
        const text = annotation.note ? '编辑笔记' : '写笔记';
        noteMenuText.textContent = text;
        // 同时更新title属性
        if (noteButton) {
            noteButton.title = text;
        }
        console.log('[DEBUG] ✅ 菜单文本和title已更新为:', text);
    } else {
        console.error('[ERROR] ❌ 更新失败:', { noteMenuText: !!noteMenuText, annotation: !!annotation });
    }
}

function showContextMenu(x, y, highlightElement) {
    console.log('[DEBUG] 🎯 显示快捷菜单', { x, y });
    if (!dom.highlightContextMenu) {
        console.error('[ERROR] ❌ highlightContextMenu元素不存在');
        return;
    }

    dom.highlightContextMenu.classList.remove('hidden');
    console.log('[DEBUG] 👁️ 菜单visible类已移除');

    // 定位菜单在标注上方
    const menuRect = dom.highlightContextMenu.getBoundingClientRect();
    let left = x;
    let top = y - menuRect.height - 5; // 在标注上方，留5px间距

    // 防止菜单超出视口左侧
    if (left < 10) {
        left = 10;
        console.log('[DEBUG] 🔄 调整X位置防止左侧溢出', { original: x, adjusted: left });
    }
    // 防止菜单超出视口右侧
    if (left + menuRect.width > window.innerWidth) {
        left = window.innerWidth - menuRect.width - 10;
        console.log('[DEBUG] 🔄 调整X位置防止右侧溢出', { original: x, adjusted: left });
    }
    // 如果上方空间不足，显示在下方
    if (top < 10) {
        const highlightRect = highlightElement ? highlightElement.getBoundingClientRect() : null;
        if (highlightRect) {
            top = highlightRect.bottom + 5; // 显示在标注下方
            console.log('[DEBUG] 🔄 上方空间不足，显示在下方', { original: y, adjusted: top });
        } else {
            top = 10;
        }
    }

    dom.highlightContextMenu.style.left = `${left}px`;
    dom.highlightContextMenu.style.top = `${top}px`;
    console.log('[DEBUG] ✅ 菜单已定位在标注上方', { left, top, menuSize: { width: menuRect.width, height: menuRect.height } });
}

function hideContextMenu(event) {
    if (!dom.highlightContextMenu) return;

    // 如果点击的是菜单本身或笔记编辑器，不隐藏
    if (event && (dom.highlightContextMenu.contains(event.target) || event.target.closest('.inline-note-editor'))) {
        return;
    }

    dom.highlightContextMenu.classList.add('hidden');
    currentHighlightId = null;
}

// 当鼠标离开菜单时隐藏
if (dom.highlightContextMenu) {
    dom.highlightContextMenu.addEventListener('mouseleave', (event) => {
        console.log('[DEBUG] 🚶 鼠标离开菜单', { relatedTarget: event.relatedTarget });

        // 检查是否移回到标注元素上
        const relatedTarget = event.relatedTarget;
        const isMovingToHighlight = relatedTarget && relatedTarget.closest('.highlight');

        if (isMovingToHighlight) {
            console.log('[DEBUG] 🎯 移回到标注上，保持菜单显示');
            return;
        }

        // 离开菜单且不是移到标注上，延迟隐藏
        console.log('[DEBUG] 🚫 离开菜单，延迟关闭');
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }
        hoverTimeout = setTimeout(() => {
            // 再次检查鼠标是否在标注或菜单上
            const currentHighlight = currentHighlightId ? document.querySelector(`[data-id="${currentHighlightId}"]`) : null;
            if (!dom.highlightContextMenu.matches(':hover') && (!currentHighlight || !currentHighlight.matches(':hover'))) {
                console.log('[DEBUG] ⏱️ 延迟后确认关闭菜单');
                hideContextMenu();
            } else {
                console.log('[DEBUG] ⏱️ 延迟后发现鼠标在菜单或标注上，保持显示');
            }
        }, 150); // 150ms延迟
    });

    // 当鼠标进入菜单时，清除可能存在的关闭延迟
    dom.highlightContextMenu.addEventListener('mouseenter', () => {
        console.log('[DEBUG] 🖱️ 鼠标进入菜单，清除关闭延迟');
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    });
}

function handleContextMenuAction(event) {
    const action = event.currentTarget.dataset.action;
    const annotationId = currentHighlightId;
    console.log('[DEBUG] 🎬 快捷菜单操作触发', { action, annotationId });

    hideContextMenu();

    if (!annotationId) {
        console.error('[ERROR] ❌ 未找到当前高亮ID');
        return;
    }

    if (action === 'copy') {
        console.log('[DEBUG] 📋 执行复制文本操作');
        // 复制标注文本
        const annotation = state.annotations.find(a => a.id === annotationId);
        if (annotation) {
            navigator.clipboard.writeText(annotation.text).then(() => {
                console.log('[DEBUG] ✅ 文本已复制到剪贴板', { text: annotation.text });
                // 显示简短提示
                showToast('已复制到剪贴板');
            }).catch(err => {
                console.error('[ERROR] ❌ 复制失败', err);
                showToast('复制失败');
            });
        }
    } else if (action === 'note') {
        console.log('[DEBUG] 📝 执行写笔记/编辑笔记操作');
        // 写笔记/编辑笔记
        const annotation = state.annotations.find(a => a.id === annotationId);
        const highlight = dom.readingArea.querySelector(`.highlight[data-id="${annotationId}"]`);
        console.log('[DEBUG] 🔍 查找结果', {
            annotation: annotation ? { id: annotation.id, text: annotation.text.substring(0, 20), hasNote: !!annotation.note } : null,
            highlight: !!highlight
        });
        if (annotation && highlight) {
            console.log('[DEBUG] ✅ 准备显示笔记编辑器');
            showInlineNoteEditor(highlight, annotation);
        } else {
            console.error('[ERROR] ❌ 无法显示笔记编辑器', { hasAnnotation: !!annotation, hasHighlight: !!highlight });
        }
    } else if (action === 'translate') {
        // AI翻译标注文本
        const annotation = state.annotations.find(a => a.id === annotationId);
        if (annotation) {
            showAITranslate(annotation.text);
        }
    } else if (action === 'addToVocab') {
        // 添加到生词本
        const annotation = state.annotations.find(a => a.id === annotationId);
        if (annotation) {
            addToVocabBook(annotation);
        }
    } else if (action === 'speak') {
        // 朗读标注文本
        const annotation = state.annotations.find(a => a.id === annotationId);
        if (annotation) {
            speakText(annotation.text);
        }
    } else if (action === 'edit') {
        // 编辑标注
        const highlight = dom.readingArea.querySelector(`.highlight[data-id="${annotationId}"]`);
        if (highlight) {
            prepareEditingExisting(highlight);
        }
    } else if (action === 'delete') {
        // 删除标注
        deleteAnnotation(annotationId);
    }
}

// 显示行内笔记编辑器
function showInlineNoteEditor(highlight, annotation) {
    console.log('[DEBUG] 🖊️ 显示行内笔记编辑器', { annotationId: annotation.id, existingNote: annotation.note });

    try {
        // 移除已存在的编辑器
        const existingEditor = document.querySelector('.inline-note-editor');
        if (existingEditor) {
            console.log('[DEBUG] 🗑️ 移除已存在的编辑器');
            existingEditor.remove();
        }

        // 创建编辑器
        const editor = document.createElement('div');
        editor.className = 'inline-note-editor';
        editor.innerHTML = `
            <textarea class="inline-note-textarea" placeholder="输入笔记内容..." rows="4">${annotation.note || ''}</textarea>
            <div class="inline-note-actions">
                <button class="inline-note-delete" type="button">删除</button>
                <button class="inline-note-save" type="button">保存</button>
            </div>
        `;

        // 定位编辑器 - 使用 fixed 定位，相对于视口
        const rect = highlight.getBoundingClientRect();
        editor.style.position = 'fixed';
        editor.style.left = `${rect.left}px`;
        editor.style.top = `${rect.bottom + 5}px`;
        editor.style.zIndex = '10000';

        // 先添加到DOM以便获取尺寸
        document.body.appendChild(editor);
        const editorRect = editor.getBoundingClientRect();

        // 调整水平位置 - 防止超出视口右侧
        if (editorRect.right > window.innerWidth) {
            editor.style.left = `${window.innerWidth - editorRect.width - 10}px`;
        }
        // 防止超出视口左侧
        if (editorRect.left < 0) {
            editor.style.left = '10px';
        }

        // 调整垂直位置 - 如果下方空间不足，显示在标注上方
        if (editorRect.bottom > window.innerHeight) {
            editor.style.top = `${rect.top - editorRect.height - 5}px`;
            console.log('[DEBUG] 📍 编辑器定位在标注上方');
        }

        console.log('[DEBUG] 📍 编辑器最终定位', { left: editor.style.left, top: editor.style.top });

        // 获取文本框
        const textarea = editor.querySelector('.inline-note-textarea');
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        console.log('[DEBUG] 🎯 文本框已聚焦');

        // 保存按钮
        const saveBtn = editor.querySelector('.inline-note-save');
        saveBtn.addEventListener('click', () => {
            console.log('[DEBUG] 💾 保存按钮被点击');
            const noteText = textarea.value.trim();
            console.log('[DEBUG] 📄 笔记内容', { length: noteText.length, preview: noteText.substring(0, 50) });

            annotation.note = noteText;
            console.log('[DEBUG] 📝 笔记已更新到annotation对象');

            try {
                persistState();
                console.log('[DEBUG] 💾 状态已持久化');

                renderAnnotationsList();
                console.log('[DEBUG] 🔄 注释列表已重新渲染');

                // 更新高亮上的笔记指示器
                updateNoteIndicator(highlight, annotation);
                console.log('[DEBUG] 🏷️ 笔记指示器已更新');

                editor.remove();
                console.log('[DEBUG] 🗑️ 编辑器已移除');

                if (typeof showToast === 'function') {
                    showToast('✓ 笔记已保存', 'success');
                    console.log('[DEBUG] ✅ 成功提示已显示');
                }
            } catch (error) {
                console.error('[ERROR] ❌ 保存笔记时出错', error);
                if (typeof showToast === 'function') {
                    showToast('❌ 保存失败: ' + error.message, 'error');
                }
            }
        });

        // 删除按钮
        const deleteBtn = editor.querySelector('.inline-note-delete');
        deleteBtn.addEventListener('click', () => {
            console.log('[DEBUG] 🗑️ 删除按钮被点击');
            if (annotation.note && !confirm('确定要删除这个笔记吗？')) {
                console.log('[DEBUG] ⛔ 用户取消删除');
                return;
            }
            console.log('[DEBUG] ✅ 用户确认删除');

            try {
                annotation.note = '';
                console.log('[DEBUG] 📝 笔记已清空');

                persistState();
                console.log('[DEBUG] 💾 状态已持久化');

                renderAnnotationsList();
                console.log('[DEBUG] 🔄 注释列表已重新渲染');

                // 移除笔记指示器
                updateNoteIndicator(highlight, annotation);
                console.log('[DEBUG] 🏷️ 笔记指示器已移除');

                // 隐藏tooltip
                hideTooltip();
                console.log('[DEBUG] 💬 Tooltip已隐藏');

                editor.remove();
                console.log('[DEBUG] 🗑️ 编辑器已移除');

                if (typeof showToast === 'function') {
                    showToast('✓ 笔记已删除', 'info');
                    console.log('[DEBUG] ✅ 删除提示已显示');
                }
            } catch (error) {
                console.error('[ERROR] ❌ 删除笔记时出错', error);
                if (typeof showToast === 'function') {
                    showToast('❌ 删除失败: ' + error.message, 'error');
                }
            }
        });

        // 按 Enter 键保存（Shift+Enter 换行）
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                console.log('[DEBUG] ⌨️ Enter键按下，触发保存');
                e.preventDefault();
                saveBtn.click();
            }
            if (e.key === 'Escape') {
                console.log('[DEBUG] ⌨️ Escape键按下，关闭编辑器');
                editor.remove();
            }
        });

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', function closeEditor(e) {
                if (!editor.contains(e.target) && e.target !== highlight) {
                    console.log('[DEBUG] 🖱️ 点击外部，关闭编辑器');
                    editor.remove();
                    document.removeEventListener('click', closeEditor);
                }
            });
        }, 100);

    } catch (error) {
        console.error('[ERROR] ❌ 创建笔记编辑器时出错', error);
        if (typeof showToast === 'function') {
            showToast('❌ 无法打开笔记编辑器: ' + error.message, 'error');
        }
    }
}

// 渲染注释列表
function renderAnnotationsList() {
    console.log('[DEBUG] 📋 渲染注释列表', { count: state.annotations?.length });
    if (!dom.annotationsList) {
        console.warn('[WARN] ⚠️ annotationsList元素不存在');
        return;
    }

    try {
        // 清空列表
        dom.annotationsList.innerHTML = '';

        // 如果没有注释，显示空状态
        if (!state.annotations || state.annotations.length === 0) {
            dom.annotationsList.innerHTML = '<p style="color: var(--text-muted); padding: 16px; text-align: center;">暂无标注</p>';
            console.log('[DEBUG] 📭 注释列表为空');
            return;
        }

        // 渲染每个注释
        state.annotations.forEach((annotation, index) => {
            const item = document.createElement('div');
            item.className = 'annotation-item';
            item.dataset.id = annotation.id;

            const categoryLabel = annotation.category || '未分类';
            const colorStyle = annotation.color ? `style="background: var(--${annotation.color})"` : '';
            const notePreview = annotation.note ? `<p class="annotation-note">${annotation.note}</p>` : '';

            item.innerHTML = `
                <div class="annotation-header">
                    <span class="annotation-category" ${colorStyle}>${categoryLabel}</span>
                    <span class="annotation-index">#${index + 1}</span>
                </div>
                <p class="annotation-text">${annotation.text}</p>
                ${notePreview}
            `;

            dom.annotationsList.appendChild(item);
        });

        console.log('[DEBUG] ✅ 注释列表渲染完成', { rendered: state.annotations.length });
    } catch (error) {
        console.error('[ERROR] ❌ 渲染注释列表失败', error);
    }
}

// 更新笔记指示器
function updateNoteIndicator(highlight, annotation) {
    console.log('[DEBUG] 🏷️ 更新笔记指示器', { annotationId: annotation.id, hasNote: !!annotation.note });
    // 移除已存在的指示器
    const existingIndicator = highlight.querySelector('.note-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // 如果有笔记，添加指示器
    if (annotation.note && annotation.note.trim()) {
        const indicator = document.createElement('span');
        indicator.className = 'note-indicator';
        indicator.textContent = '⋯';
        indicator.title = annotation.note;
        highlight.appendChild(indicator);
    }
}

// 快捷键处理
function handleKeyboardShortcuts(event) {
    // 如果在输入框中，不处理快捷键
    const target = event.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
    }

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const modKey = isMac ? event.metaKey : event.ctrlKey;

    // Ctrl/Cmd + 数字键：选择颜色（同时设置对应类别）
    if (modKey && event.key >= '1' && event.key <= '5') {
        event.preventDefault();
        const colors = ['honey', 'mint', 'sky', 'orchid', 'sunset'];
        const colorIndex = parseInt(event.key) - 1;
        const color = colors[colorIndex];

        // 如果已选中该颜色，取消选择
        if (state.lastColor === color) {
            state.lastColor = null;
            updateActiveColorButtons(dom.colorButtons, null);
            updateActiveColorButtons(dom.formatColorButtons, null);
            // 取消颜色时不改变类别
        } else {
            // 选择颜色会自动设置对应类别
            setHighlightColor(color, { persist: true });
        }

        // 视觉反馈
        flashColorButton(color);
        return;
    }

    // Ctrl/Cmd + B：切换加粗
    if (modKey && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        const newBoldState = !state.lastBold;
        setBoldState(newBoldState);
        flashFormatButton('bold');
        return;
    }

    // Ctrl/Cmd + U：切换下划线
    if (modKey && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        const newUnderlineState = !state.lastUnderline;
        setUnderlineState(newUnderlineState);
        flashFormatButton('underline');
        return;
    }

    // Ctrl/Cmd + Q：切换快速标注模式
    if (modKey && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        applyQuickFormat();
        return;
    }

    // Esc：取消选择/退出快速标注模式
    if (event.key === 'Escape') {
        if (quickAnnotationMode) {
            applyQuickFormat(); // 退出快速标注模式
        } else {
            hideToolbar();
            window.getSelection()?.removeAllRanges();
        }
        return;
    }
}

// 视觉反馈：颜色按钮闪烁
function flashColorButton(color) {
    const buttons = [...(dom.formatColorButtons || []), ...(dom.colorButtons || [])];
    buttons.forEach(btn => {
        if (btn.dataset.color === color) {
            btn.style.animation = 'none';
            setTimeout(() => {
                btn.style.animation = 'flash-feedback 0.5s ease';
            }, 10);
        }
    });
}

// 视觉反馈：格式按钮闪烁
function flashFormatButton(type) {
    let button;
    if (type === 'bold') {
        button = dom.formatBoldToggle;
    } else if (type === 'underline') {
        button = dom.formatUnderlineToggle;
    }

    if (button) {
        button.style.animation = 'none';
        setTimeout(() => {
            button.style.animation = 'flash-feedback 0.5s ease';
        }, 10);
    }
}

function handleViewportChange() {
    if (!dom.selectionToolbar.classList.contains('hidden') && state.activeRange) {
        positionToolbar(state.activeRange);
    }
}

function toggleInputPanelCollapsed() {
    setInputPanelCollapsed(!state.inputCollapsed, { persist: true });
}

function setInputPanelCollapsed(collapsed, options = {}) {
    const { skipFocus = false, persist = false } = options;
    state.inputCollapsed = collapsed;

    if (dom.layout) {
        dom.layout.classList.toggle('input-collapsed', collapsed);
    }
    if (dom.inputPanel) {
        dom.inputPanel.hidden = collapsed;
    }
    if (dom.toggleInputPanelBtn) {
        dom.toggleInputPanelBtn.textContent = collapsed ? '展开输入面板' : '折叠输入面板';
        dom.toggleInputPanelBtn.setAttribute('aria-expanded', String(!collapsed));
        if (collapsed && !skipFocus && dom.inputPanel && dom.inputPanel.contains(document.activeElement)) {
            dom.toggleInputPanelBtn.focus();
        }
    }

    if (!collapsed && !skipFocus && dom.sourceText) {
        dom.sourceText.focus();
    }

    if (persist) {
        persistState();
    }
}

function setBoldState(enabled, options = {}) {
    const { syncForm = true, syncToolbar = true, persist = false } = options;
    state.lastBold = Boolean(enabled);
    if (syncForm && dom.boldToggle) {
        dom.boldToggle.checked = state.lastBold;
    }
    if (syncToolbar && dom.formatBoldToggle) {
        dom.formatBoldToggle.classList.toggle('active', state.lastBold);
        dom.formatBoldToggle.setAttribute('aria-pressed', String(state.lastBold));
    }
    if (persist) {
        persistState();
    }
    updateLivePreview();
}

function setUnderlineState(enabled, options = {}) {
    const { syncForm = true, syncToolbar = true, persist = false } = options;
    state.lastUnderline = Boolean(enabled);
    if (syncForm && dom.underlineToggle) {
        dom.underlineToggle.checked = state.lastUnderline;
    }
    if (syncToolbar && dom.formatUnderlineToggle) {
        dom.formatUnderlineToggle.classList.toggle('active', state.lastUnderline);
        dom.formatUnderlineToggle.setAttribute('aria-pressed', String(state.lastUnderline));
    }
    // 显示/隐藏颜色选择按钮
    if (dom.underlineColorBtn) {
        if (state.lastUnderline) {
            dom.underlineColorBtn.classList.remove('hidden');
        } else {
            dom.underlineColorBtn.classList.add('hidden');
            // 取消下划线时，清除下划线颜色设置
            state.lastUnderlineColor = null;
            if (dom.underlineColorBtn.style) {
                dom.underlineColorBtn.style.background = '';
            }
        }
    }
    if (persist) {
        persistState();
    }
    updateLivePreview();
}

// 颜色与类别映射
const COLOR_CATEGORY_MAP = {
    'honey': 'vocab',      // 蜜糖色 → 生词
    'mint': 'phrase',      // 薄荷色 → 词组
    'orchid': 'difficulty', // 兰花色 → 疑难
    'sunset': 'keypoint',   // 落日色 → 重点
    'sky': 'translation'    // 天空色 → 翻译
};

function setHighlightColor(color, options = {}) {
    console.log('[DEBUG] 🎨 设置高亮颜色', { color, currentColor: state.lastColor });
    const { persist = false } = options;

    // 允许 color 为 null
    if (color === null || color === undefined) {
        state.lastColor = null;
        console.log('[DEBUG] ⭕ 颜色已清空');
    } else if (HIGHLIGHT_COLORS.has(color)) {
        state.lastColor = color;
        console.log('[DEBUG] ✅ 颜色已设置', { color });

        // 自动设置对应的类别（仅当颜色有效时）
        if (COLOR_CATEGORY_MAP[color]) {
            state.lastCategory = COLOR_CATEGORY_MAP[color];
            console.log('[DEBUG] 🔗 自动设置关联类别', { category: state.lastCategory });
            // 更新类别按钮状态
            if (dom.categoryButtons) {
                dom.categoryButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.category === state.lastCategory);
                });
            }
        }
    } else {
        console.warn('[WARN] ⚠️ 无效的颜色', { color });
        return;
    }

    updateActiveColorButtons(dom.colorButtons, state.lastColor);
    updateActiveColorButtons(dom.formatColorButtons, state.lastColor);
    if (persist) {
        persistState();
    }
}

function updateActiveColorButtons(buttons, color) {
    if (!buttons || typeof buttons.forEach !== 'function') return;
    buttons.forEach(btn => {
        const isActive = btn.dataset.color === color;
        btn.classList.toggle('active', isActive);
        if (btn.classList && btn.classList.contains('format-color')) {
            btn.setAttribute('aria-pressed', String(isActive));
        }
    });
}

function resolveCustomCategoryValue() {
    if (state.lastCategory !== 'custom') {
        return '';
    }
    if (dom.customCategoryInput && dom.customCategoryInput.value.trim()) {
        return dom.customCategoryInput.value.trim();
    }
    return state.lastCustomCategory || '';
}


let selectionCheckHandle = null;
let quickAnnotationMode = false; // 快速标注模式开关
let lastPointerEvent = null; // 保存最后的鼠标事件

// 节流函数 - 性能优化
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func.apply(this, args);
        }
    };
}

function scheduleSelectionCheck(event) {
    // 保存鼠标事件（如果是鼠标事件）
    if (event && event.clientX !== undefined && event.clientY !== undefined) {
        lastPointerEvent = { clientX: event.clientX, clientY: event.clientY };
    }

    if (selectionCheckHandle) {
        clearTimeout(selectionCheckHandle);
    }
    selectionCheckHandle = setTimeout(handleTextSelection, 0);
}

function handleTextSelection() {
    selectionCheckHandle = null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        hideToolbar();
        return;
    }

    const range = selection.getRangeAt(0);
    if (!range || selection.toString().trim().length === 0) {
        hideToolbar();
        return;
    }

    if (!dom.readingArea.contains(range.commonAncestorContainer)) {
        hideToolbar();
        return;
    }

    // 如果是快速标注模式，直接应用样式
    if (quickAnnotationMode) {
        applyQuickAnnotationToSelection(range);
        return;
    }

    // 检查是否选中了已有标注
    const highlight = getHighlightAncestor(range.commonAncestorContainer);
    if (highlight) {
        // 获取选中的文本
        const selectedText = selection.toString().trim();

        // 检查是否选中了整个标注的内容（考虑嵌套情况）
        // 创建一个临时range来获取该highlight的完整文本范围
        const highlightRange = document.createRange();
        highlightRange.selectNodeContents(highlight);
        const highlightFullText = highlightRange.toString().trim();

        // 如果选中的是整个标注的内容，进入编辑模式
        // 否则，允许创建嵌套标注
        if (selectedText === highlightFullText && range.toString() === highlightFullText) {
            console.log('[DEBUG] ✏️ 完全选中标注，进入编辑模式');
            prepareEditingExisting(highlight);
            return;
        }

        // 部分选中，允许创建嵌套标注
        console.log('[DEBUG] 🔄 部分选中标注，允许创建嵌套标注', {
            selected: selectedText.substring(0, 20) + '...',
            highlight: highlightFullText.substring(0, 20) + '...'
        });
    }

    if (!isRangeWithinSingleParagraph(range)) {
        showToast('暂不支持跨段落标注，请在单个段落内划线', 'warning');
        selection.removeAllRanges();
        hideToolbar();
        return;
    }

    // 支持叠加标注，移除对已有标注的检查
    state.activeRange = range.cloneRange();
    state.editingId = null;
    resetToolbarForm();
    showToolbar(range);
}

function getHighlightAncestor(node) {
    if (!node) return null;
    if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('highlight')) {
        return node;
    }
    return node.parentElement ? getHighlightAncestor(node.parentElement) : null;
}

function prepareEditingExisting(highlight) {
    const annotationId = highlight.dataset.id;
    const record = state.annotations.find(item => item.id === annotationId);
    if (!record) return;

    state.editingId = annotationId;

    // 处理多片段标注：找到所有相同data-id的片段
    const allFragments = dom.readingArea.querySelectorAll(`.highlight[data-id="${annotationId}"]`);

    if (allFragments.length > 1) {
        // 多片段：创建跨越所有片段的range
        const range = document.createRange();
        const firstFragment = allFragments[0];
        const lastFragment = allFragments[allFragments.length - 1];

        range.setStartBefore(firstFragment);
        range.setEndAfter(lastFragment);
        state.activeRange = range;

        console.log('[DEBUG] ✏️ 编辑多片段标注', {
            id: annotationId,
            fragments: allFragments.length
        });
    } else {
        // 单片段：使用原有逻辑
        state.activeRange = createRangeFromElement(highlight);
    }

    resetToolbarForm();
    activateCategory(record.category, record.customCategory);
    setHighlightColor(record.color);
    setBoldState(Boolean(record.bold));
    setUnderlineState(record.underline);

    // 恢复删除线
    if (dom.strikethroughToggle) {
        dom.strikethroughToggle.checked = Boolean(record.strikethrough);
        state.lastStrikethrough = Boolean(record.strikethrough);
    }
    if (dom.formatStrikethroughToggle) {
        dom.formatStrikethroughToggle.classList.toggle('active', Boolean(record.strikethrough));
    }

    // 恢复边框样式
    state.lastBorderStyle = record.borderStyle || 'none';
    if (dom.borderStyleButtons) {
        dom.borderStyleButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.border === state.lastBorderStyle);
        });
    }
    if (dom.formatBorderButtons) {
        dom.formatBorderButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.border === state.lastBorderStyle);
        });
    }

    // 恢复Emoji
    state.lastEmoji = record.emoji || '';
    if (dom.emojiButtons) {
        dom.emojiButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.emoji === state.lastEmoji);
        });
    }
    if (dom.formatEmojiButtons) {
        dom.formatEmojiButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.emoji === state.lastEmoji);
        });
    }

    // 恢复虚线和斜杠
    state.lastDashed = Boolean(record.dashed);
    state.lastSlash = Boolean(record.slash);
    if (dom.formatDashedToggle) {
        dom.formatDashedToggle.classList.toggle('active', state.lastDashed);
        dom.formatDashedToggle.setAttribute('aria-pressed', String(state.lastDashed));
    }
    if (dom.formatSlashToggle) {
        dom.formatSlashToggle.classList.toggle('active', state.lastSlash);
        dom.formatSlashToggle.setAttribute('aria-pressed', String(state.lastSlash));
    }

    // 恢复自定义颜色
    state.lastCustomTextColor = record.customTextColor || null;
    state.lastUnderlineColor = record.underlineColor || null;
    state.lastBorderColor = record.borderColor || null;

    if (record.category === 'custom') {
        state.lastCustomCategory = record.customCategory || '';
        if (dom.customCategoryInput) {
            dom.customCategoryInput.value = record.customCategory || '';
        }
    }
    if (dom.underlineOnlyToggle) {
        dom.underlineOnlyToggle.checked = Boolean(record.underlineOnly);
        state.lastUnderlineOnly = Boolean(record.underlineOnly);
    }
    if (dom.textColorSelect) {
        dom.textColorSelect.value = record.textColor || 'default';
        state.lastTextColor = record.textColor || 'default';
    }
    if (dom.fontSizeSelect) {
        dom.fontSizeSelect.value = record.fontSize || 'medium';
        state.lastFontSize = record.fontSize || 'medium';
    }
    dom.noteInput.value = record.note;
    dom.tagsInput.value = record.tags.join(', ');

    showToolbar(highlight.getBoundingClientRect(), true);
}

function createRangeFromElement(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range;
}

function isRangeWithinSingleParagraph(range) {
    const start = getParagraphAncestor(range.startContainer);
    const end = getParagraphAncestor(range.endContainer);
    return start && end && start === end;
}

function getParagraphAncestor(node) {
    while (node && node !== dom.readingArea) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') {
            return node;
        }
        node = node.parentNode;
    }
    return null;
}

function showToolbar(target, isEditing = false) {
    dom.selectionToolbar.classList.remove('hidden');

    // 显示标注工具栏时，隐藏翻译按钮（避免冲突）
    hideQuickTranslateBtn();

    if (target instanceof DOMRect) {
        positionToolbarFromRect(target);
    } else {
        positionToolbar(target);
    }

    dom.selectionToolbar.dataset.mode = isEditing ? 'edit' : 'create';

    if (!isEditing) {
        updateLivePreview();
    }
}

function positionToolbar(range) {
    const rect = range.getBoundingClientRect();
    positionToolbarFromRect(rect);
}

function positionToolbarFromRect(rect) {
    const toolbar = dom.selectionToolbar;
    const toolbarRect = toolbar.getBoundingClientRect();

    let top, left;

    // 优先使用鼠标位置（如果有）
    if (lastPointerEvent && lastPointerEvent.clientX && lastPointerEvent.clientY) {
        // 使用鼠标位置，工具栏显示在鼠标上方
        top = window.scrollY + lastPointerEvent.clientY - toolbarRect.height - 16;
        left = window.scrollX + lastPointerEvent.clientX - (toolbarRect.width / 2);

        console.log('[DEBUG] 📍 使用鼠标位置定位工具栏', {
            mouseX: lastPointerEvent.clientX,
            mouseY: lastPointerEvent.clientY
        });
    } else {
        // 回退到使用选区位置
        const selectionHeight = rect.bottom - rect.top;
        const useTop = selectionHeight > 100; // 如果选区超过100px高，认为是多行

        if (useTop) {
            // 多行选区：显示在选区顶部上方
            top = window.scrollY + rect.top - toolbarRect.height - 16;
        } else {
            // 单行或短选区：显示在选区上方
            top = window.scrollY + rect.top - toolbarRect.height - 8;
        }

        left = window.scrollX + rect.left + (rect.width / 2) - (toolbarRect.width / 2);

        console.log('[DEBUG] 📍 使用选区位置定位工具栏');
    }

    // 确保工具栏不超出视口
    const viewportWidth = window.innerWidth;
    toolbar.style.top = `${Math.max(top, window.scrollY + 12)}px`;
    toolbar.style.left = `${Math.max(12, Math.min(left, viewportWidth - toolbarRect.width - 12))}px`;
}

function hideToolbar() {
    // 清除预览
    if (previewHighlight && previewHighlight.parentNode) {
        const parent = previewHighlight.parentNode;
        while (previewHighlight.firstChild) {
            parent.insertBefore(previewHighlight.firstChild, previewHighlight);
        }
        parent.removeChild(previewHighlight);
        parent.normalize();
        previewHighlight = null;
    }

    dom.selectionToolbar.classList.add('hidden');
    state.activeRange = null;
    state.editingId = null;

    // 隐藏标注工具栏时，也隐藏翻译按钮
    hideQuickTranslateBtn();
}

/**
 * 工具栏选项卡切换功能 v4.2.4
 * 优化工具栏布局，将内容分组到不同选项卡
 */
function initToolbarTabs() {
    const tabs = document.querySelectorAll('.toolbar-tab');
    const tabContents = document.querySelectorAll('.toolbar-tab-content');

    if (tabs.length === 0 || tabContents.length === 0) {
        // 如果没有找到选项卡元素，说明HTML还没更新，跳过初始化
        return;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const targetTab = tab.dataset.tab;

            // 移除所有 active 状态
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // 添加当前选中的 active 状态
            tab.classList.add('active');
            const targetContent = document.querySelector(`[data-tab-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

function handleOutsideClick(event) {
    if (dom.selectionToolbar.classList.contains('hidden')) {
        return;
    }
    const target = event.target;
    if (!dom.selectionToolbar.contains(target)) {
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0 || !dom.readingArea.contains(target)) {
            hideToolbar();
        }
    }
}

function handleCategorySelection(button) {
    console.log('[DEBUG] 📂 类别按钮点击', { category: button.dataset.category });
    const category = button.dataset.category;
    const isActive = button.classList.contains('active');

    // 支持取消选择：如果已选中，则取消选中
    if (isActive) {
        button.classList.remove('active');
        state.lastCategory = null;
        console.log('[DEBUG] ⭕ 取消类别选择');
        if (dom.customCategoryInput) {
            dom.customCategoryInput.classList.add('hidden');
        }
    } else {
        // 取消其他按钮的选中状态
        if (dom.categoryButtons) {
            dom.categoryButtons.forEach(btn => btn.classList.remove('active'));
        }
        button.classList.add('active');
        state.lastCategory = category;
        console.log('[DEBUG] ✅ 类别已选中', { category });

        if (category === 'custom') {
            if (dom.customCategoryInput) {
                dom.customCategoryInput.classList.remove('hidden');
                if (state.lastCustomCategory) {
                    dom.customCategoryInput.value = state.lastCustomCategory;
                }
                dom.customCategoryInput.focus();
            }
        } else {
            if (dom.customCategoryInput) {
                dom.customCategoryInput.classList.add('hidden');
            }
        }
    }
}

function activateCategory(category, customLabel) {
    const targetButton = Array.from(dom.categoryButtons).find(btn => btn.dataset.category === category);
    if (targetButton) {
        handleCategorySelection(targetButton);
        if (category === 'custom' && customLabel) {
            dom.customCategoryInput.value = customLabel;
        }
    }
}

let previewHighlight = null;

function updateLivePreview() {
    // 移除旧的预览
    if (previewHighlight && previewHighlight.parentNode) {
        const parent = previewHighlight.parentNode;
        while (previewHighlight.firstChild) {
            parent.insertBefore(previewHighlight.firstChild, previewHighlight);
        }
        parent.removeChild(previewHighlight);
        parent.normalize();
        previewHighlight = null;
    }

    if (!state.activeRange) return;

    try {
        const range = state.activeRange;
        const selectedText = range.toString();
        if (!selectedText.trim()) return;

        // 创建临时预览高亮
        const mark = document.createElement('mark');
        mark.className = 'highlight highlight-preview';
        mark.dataset.preview = 'true';

        // 只在有颜色时才设置data-color
        if (state.lastColor) {
            mark.dataset.color = state.lastColor;
            console.log('[DEBUG] 🎨 预览颜色', { color: state.lastColor });
        } else {
            console.log('[DEBUG] ⭕ 无颜色预览');
        }

        if (state.lastBold) {
            mark.dataset.bold = 'true';
            console.log('[DEBUG] 🔤 预览加粗');
        }
        if (state.lastUnderline) {
            mark.dataset.underline = 'true';
            console.log('[DEBUG] 📏 预览下划线');
        }
        if (state.lastStrikethrough) {
            mark.dataset.strikethrough = 'true';
            console.log('[DEBUG] ╱ 预览删除线');
        }
        if (state.lastBorderStyle && state.lastBorderStyle !== 'none') {
            mark.dataset.border = state.lastBorderStyle;
            console.log('[DEBUG] 🔲 预览边框', { borderStyle: state.lastBorderStyle });
        }
        if (state.lastEmoji) {
            mark.dataset.emoji = state.lastEmoji;
        }
        if (state.lastCustomBgColor) {
            mark.style.backgroundColor = state.lastCustomBgColor;
        }
        if (state.lastFontFamily) {
            mark.style.fontFamily = state.lastFontFamily;
        }

        // 预览虚线和斜杠样式
        if (state.lastDashed) {
            mark.dataset.dashed = 'true';
            console.log('[DEBUG] 〰️ 预览虚线下划线');
        }
        if (state.lastSlash) {
            mark.dataset.slash = 'true';
            console.log('[DEBUG] / / 预览斜杠分割');
        }

        // 预览自定义颜色
        if (state.lastCustomTextColor) {
            mark.style.color = state.lastCustomTextColor;
            console.log('[DEBUG] 🎨 预览自定义文字颜色', { color: state.lastCustomTextColor });
        }
        if (state.lastUnderlineColor && state.lastUnderline) {
            mark.style.textDecorationColor = state.lastUnderlineColor;
            console.log('[DEBUG] 📏 预览下划线颜色', { color: state.lastUnderlineColor });
        }
        if (state.lastBorderColor && state.lastBorderStyle && state.lastBorderStyle !== 'none') {
            mark.style.borderColor = state.lastBorderColor;
            console.log('[DEBUG] 🔲 预览边框颜色', { color: state.lastBorderColor });
        }

        range.surroundContents(mark);
        previewHighlight = mark;

        // 更新 activeRange 以包含新的标记
        const newRange = document.createRange();
        newRange.selectNodeContents(mark);
        state.activeRange = newRange;
    } catch (error) {
        console.error('Preview error:', error);
    }
}

function handleColorSelection(button, options = {}) {
    if (!button || !button.dataset.color) return;
    const clickedColor = button.dataset.color;
    console.log('[DEBUG] 🎨 颜色按钮点击', { clickedColor, currentColor: state.lastColor });

    // 如果点击的是已选中的颜色，取消选择
    if (state.lastColor === clickedColor) {
        state.lastColor = null;
        console.log('[DEBUG] ⭕ 取消颜色选择');
        updateActiveColorButtons(dom.colorButtons, null);
        updateActiveColorButtons(dom.formatColorButtons, null);
        if (options.persist) {
            persistState();
        }
    } else {
        // 选中新颜色
        console.log('[DEBUG] ✅ 颜色已选中', { color: clickedColor });
        setHighlightColor(clickedColor, options);
    }
    updateLivePreview();
}

function activateColor(color) {
    setHighlightColor(color);
}

function handleBorderStyleSelection(button) {
    if (!button || !button.dataset.border) return;
    const borderStyle = button.dataset.border;
    const isActive = button.classList.contains('active');

    // 支持取消选择：如果已选中，则取消选中
    if (isActive) {
        button.classList.remove('active');
        state.lastBorderStyle = 'none';
        // 取消边框时，清除边框颜色设置
        state.lastBorderColor = null;
        if (dom.squareBorderColorBtn?.style) {
            dom.squareBorderColorBtn.style.background = '';
        }
        if (dom.roundBorderColorBtn?.style) {
            dom.roundBorderColorBtn.style.background = '';
        }
    } else {
        // 取消其他按钮的选中状态（包括formatting-toolbar和selection-toolbar）
        if (dom.borderStyleButtons) {
            dom.borderStyleButtons.forEach(btn => btn.classList.remove('active'));
        }
        if (dom.formatBorderButtons) {
            dom.formatBorderButtons.forEach(btn => btn.classList.remove('active'));
        }
        button.classList.add('active');
        state.lastBorderStyle = borderStyle;
    }
    updateLivePreview();
    persistState();
}

function handleEmojiSelection(button) {
    if (!button) return;
    const emoji = button.dataset.emoji || '';
    const isActive = button.classList.contains('active');

    // 支持取消选择：如果已选中，则取消选中
    if (isActive) {
        button.classList.remove('active');
        state.lastEmoji = '';
    } else {
        // 取消其他按钮的选中状态（包括formatting-toolbar和selection-toolbar）
        if (dom.emojiButtons) {
            dom.emojiButtons.forEach(btn => btn.classList.remove('active'));
        }
        if (dom.formatEmojiButtons) {
            dom.formatEmojiButtons.forEach(btn => btn.classList.remove('active'));
        }
        button.classList.add('active');
        state.lastEmoji = emoji;
    }
    updateLivePreview();
    persistState();
}

function resetToolbarForm() {
    console.log('[DEBUG] 🔄 重置工具栏表单');

    // 同步 selection-toolbar 和 formatting-toolbar 的类别按钮
    dom.categoryButtons.forEach(btn => btn.classList.remove('active'));
    if (dom.formatCategoryButtons) {
        dom.formatCategoryButtons.forEach(btn => btn.classList.remove('active'));
    }

    // 只在有保存的类别时才选中
    if (state.lastCategory) {
        // 同步 selection-toolbar 类别按钮
        const defaultButton = Array.from(dom.categoryButtons).find(btn => btn.dataset.category === state.lastCategory);
        if (defaultButton) {
            handleCategorySelection(defaultButton);
            console.log('[DEBUG] ✅ 恢复类别选择（selection-toolbar）', { category: state.lastCategory });
        }

        // 同步 formatting-toolbar 类别按钮
        if (dom.formatCategoryButtons) {
            const formatButton = Array.from(dom.formatCategoryButtons).find(btn => btn.dataset.category === state.lastCategory);
            if (formatButton) {
                formatButton.classList.add('active');
                console.log('[DEBUG] ✅ 恢复类别选择（formatting-toolbar）', { category: state.lastCategory });
            }
        }
    } else {
        console.log('[DEBUG] ⭕ 不选中任何类别');
    }

    if (state.lastColor) {
        setHighlightColor(state.lastColor);
        console.log('[DEBUG] ✅ 恢复颜色选择', { color: state.lastColor });
    } else {
        console.log('[DEBUG] ⭕ 不选中任何颜色');
    }
    setBoldState(state.lastBold);
    setUnderlineState(state.lastUnderline);

    // 重置 selection-toolbar 样式选项
    if (dom.strikethroughToggle) {
        dom.strikethroughToggle.checked = state.lastStrikethrough;
    }
    if (dom.showNoteBelow) {
        dom.showNoteBelow.checked = state.lastShowNoteBelow;
    }

    // 重置 selection-toolbar 边框样式按钮
    if (dom.borderStyleButtons) {
        dom.borderStyleButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.border === state.lastBorderStyle);
        });
    }

    // 重置 selection-toolbar Emoji按钮
    if (dom.emojiButtons) {
        dom.emojiButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.emoji === state.lastEmoji);
        });
    }

    // 重置 formatting-toolbar 样式按钮
    if (dom.formatStrikethroughToggle) {
        dom.formatStrikethroughToggle.classList.toggle('active', state.lastStrikethrough);
        dom.formatStrikethroughToggle.setAttribute('aria-pressed', String(state.lastStrikethrough));
    }

    if (dom.formatDashedToggle) {
        dom.formatDashedToggle.classList.toggle('active', state.lastDashed);
        dom.formatDashedToggle.setAttribute('aria-pressed', String(state.lastDashed));
    }

    if (dom.formatSlashToggle) {
        dom.formatSlashToggle.classList.toggle('active', state.lastSlash);
        dom.formatSlashToggle.setAttribute('aria-pressed', String(state.lastSlash));
    }

    // 重置 formatting-toolbar 边框按钮
    if (dom.formatBorderButtons) {
        dom.formatBorderButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.border === state.lastBorderStyle);
        });
    }

    // 重置 formatting-toolbar Emoji按钮
    if (dom.formatEmojiButtons) {
        dom.formatEmojiButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.emoji === state.lastEmoji);
        });
    }

    // 重置自定义样式
    if (dom.customBgColor) {
        dom.customBgColor.value = state.lastCustomBgColor || '#ffeb3b';
    }
    if (dom.fontFamilySelect) {
        dom.fontFamilySelect.value = state.lastFontFamily || '';
    }

    dom.noteInput.value = '';
    dom.tagsInput.value = '';
    if (dom.customCategoryInput) {
        dom.customCategoryInput.value = state.lastCategory === 'custom' ? (state.lastCustomCategory || '') : '';
    }
}

function handleAnnotationSubmit(event) {
    event.preventDefault();
    const range = state.activeRange;

    // 编辑模式：从已有记录获取文本；创建模式：从range获取文本
    let selectionText;
    if (state.editingId) {
        const record = state.annotations.find(item => item.id === state.editingId);
        if (record) {
            selectionText = record.text;
        } else {
            showToast('找不到要编辑的标注', 'error');
            return;
        }
    } else {
        // 创建模式：使用统一的文本提取函数
        selectionText = getSelectionText({ range, fallbackToSelection: true });

        // 如果无法获取文本，提示错误
        if (!selectionText) {
            console.warn('handleAnnotationSubmit: 创建模式下无法获取文本', {
                hasActiveRange: !!state.activeRange,
                hasRange: !!range,
                hasPreviewHighlight: !!previewHighlight,
                toolbarMode: dom.selectionToolbar?.dataset.mode
            });
            showToast('请先选择需要标注的文本', 'warning');
            hideToolbar();
            return;
        }
    }

    let category = state.lastCategory;
    let customCategory = '';

    // 检查是否为自定义类别（ID格式为 custom_xxx）
    const isCustomCategory = category && category.startsWith('custom_');

    if (isCustomCategory) {
        // 自定义类别：category 设为 'custom'，customCategory 设为类别ID
        customCategory = category;
        category = 'custom';
    } else if (category === 'custom') {
        // 传统的自定义类别输入方式
        customCategory = resolveCustomCategoryValue();
    }

    const bold = dom.boldToggle ? dom.boldToggle.checked : state.lastBold;
    const underline = dom.underlineToggle ? dom.underlineToggle.checked : state.lastUnderline;
    const strikethrough = dom.strikethroughToggle ? dom.strikethroughToggle.checked : state.lastStrikethrough;
    const borderStyle = state.lastBorderStyle;
    const emoji = state.lastEmoji;
    const showNoteBelow = dom.showNoteBelow ? dom.showNoteBelow.checked : state.lastShowNoteBelow;
    const customBgColor = state.lastCustomBgColor;
    const fontFamily = state.lastFontFamily;
    const underlineOnly = dom.underlineOnlyToggle ? dom.underlineOnlyToggle.checked : state.lastUnderlineOnly;
    const textColor = dom.textColorSelect ? dom.textColorSelect.value : state.lastTextColor;
    const fontSize = dom.fontSizeSelect ? dom.fontSizeSelect.value : state.lastFontSize;
    const note = dom.noteInput.value.trim();
    const tags = parseTags(dom.tagsInput.value);

    if (category === 'custom' && !customCategory) {
        showToast('请选择或填写类别名称', 'warning');
        return;
    }
    if (category === 'custom') {
        state.lastCustomCategory = customCategory;
    }

    submitAnnotation({
        category,
        customCategory,
        color: state.lastColor,
        underline,
        bold,
        strikethrough,
        borderStyle,
        emoji,
        showNoteBelow,
        customBgColor,
        fontFamily,
        underlineOnly,
        textColor,
        fontSize,
        note,
        tags,
        range,
        textOverride: selectionText
    });
}


function createNewAnnotation({ text, category, customCategory, color, underline, bold, strikethrough, borderStyle, emoji, showNoteBelow, customBgColor, fontFamily, underlineOnly, textColor, fontSize, note, tags, range, dashed, slash, customTextColor, underlineColor, borderColor }) {
    const activeDocument = getActiveDocument();
    if (!activeDocument) {
        showToast('请先创建或选择一篇短文', 'warning');
        return;
    }

    const now = Date.now();
    const timeDiff = now - state.lastAnnotationTime;

    // 断点连接检测：1秒内标注相同文本
    if (timeDiff < 1000 && text === state.lastAnnotationText && state.lastAnnotationId) {
        const lastRecord = state.annotations.find(a => a.id === state.lastAnnotationId);
        if (lastRecord) {
            // 找到上次标注，将当前标注与之关联
            if (!lastRecord.linkedAnnotations) {
                lastRecord.linkedAnnotations = [];
            }

            const timestamp = new Date().toISOString();
            const linkedRecord = {
                id: generateId(),
                text,
                category,
                customCategory,
                color,
                underline,
                bold,
                strikethrough: strikethrough || false,
                borderStyle: borderStyle || 'none',
                emoji: emoji || '',
                showNoteBelow: showNoteBelow || false,
                customBgColor: customBgColor || '',
                fontFamily: fontFamily || '',
                underlineOnly: underlineOnly || false,
                textColor: textColor || 'default',
                fontSize: fontSize || 'medium',
                dashed: dashed || false,
                slash: slash || false,
                customTextColor: customTextColor,
                underlineColor: underlineColor,
                borderColor: borderColor,
                note,
                tags,
                createdAt: timestamp,
                linkedTo: state.lastAnnotationId
            };

            applyHighlight(range, linkedRecord);
            state.annotations.push(linkedRecord);
            lastRecord.linkedAnnotations.push(linkedRecord.id);

            // 更新连接提示
            if (typeof showToast === 'function') {
                showToast(`✓ 已连接到前一个"${text}"标注`, 'success');
            }

            // 更新断点状态
            state.lastAnnotationText = text;
            state.lastAnnotationTime = now;
            state.lastAnnotationId = linkedRecord.id;

            activeDocument.updatedAt = timestamp;
            saveHistory('create', linkedRecord);

            if (state.autoSync) {
                renderAnnotationList();
            } else {
                updateAnnotationSummary();
            }
            renderDocumentList();
            persistState();
            return;
        }
    }

    // 正常创建新标注
    const timestamp = new Date().toISOString();
    const record = {
        id: generateId(),
        text,
        category,
        customCategory,
        color,
        underline,
        bold,
        strikethrough: strikethrough || false,
        borderStyle: borderStyle || 'none',
        emoji: emoji || '',
        showNoteBelow: showNoteBelow || false,
        customBgColor: customBgColor || '',
        fontFamily: fontFamily || '',
        underlineOnly: underlineOnly || false,
        textColor: textColor || 'default',
        fontSize: fontSize || 'medium',
        dashed: dashed || false,
        slash: slash || false,
        customTextColor: customTextColor,
        underlineColor: underlineColor,
        borderColor: borderColor,
        note,
        tags,
        createdAt: timestamp
    };

    applyHighlight(range, record);
    state.annotations.push(record);
    activeDocument.updatedAt = timestamp;

    // 更新断点连接状态
    state.lastAnnotationText = text;
    state.lastAnnotationTime = now;
    state.lastAnnotationId = record.id;

    // 保存到历史记录
    saveHistory('create', record);

    if (state.autoSync) {
        renderAnnotationList();
    } else {
        updateAnnotationSummary();
    }
    renderDocumentList();
    persistState();

    // 创建标注后，清除临时颜色设置，避免下次标注自动应用
    // 注意：不清除 customTextColor，因为那是全局文字颜色设置
    state.lastUnderlineColor = null;
    state.lastBorderColor = null;
    // 同时清除按钮的视觉状态
    if (dom.underlineColorBtn?.style) {
        dom.underlineColorBtn.style.background = '';
    }
    if (dom.squareBorderColorBtn?.style) {
        dom.squareBorderColorBtn.style.background = '';
    }
    if (dom.roundBorderColorBtn?.style) {
        dom.roundBorderColorBtn.style.background = '';
    }
}

function updateExistingAnnotation({ id, text, category, customCategory, color, underline, bold, strikethrough, borderStyle, emoji, showNoteBelow, customBgColor, fontFamily, underlineOnly, textColor, fontSize, note, tags, dashed, slash, customTextColor, underlineColor, borderColor }) {
    const record = state.annotations.find(item => item.id === id);
    if (!record) return;

    // 保存旧值用于撤销
    const oldValue = JSON.parse(JSON.stringify(record));

    record.text = text;
    record.category = category;
    record.customCategory = customCategory;
    record.color = color;
    record.underline = underline;
    record.bold = Boolean(bold);
    record.strikethrough = Boolean(strikethrough);
    record.borderStyle = borderStyle || 'none';
    record.emoji = emoji || '';
    record.showNoteBelow = Boolean(showNoteBelow);
    record.customBgColor = customBgColor || '';
    record.fontFamily = fontFamily || '';
    record.underlineOnly = Boolean(underlineOnly);
    record.textColor = textColor || 'default';
    record.fontSize = fontSize || 'medium';
    record.note = note;
    record.tags = tags;
    record.dashed = Boolean(dashed);
    record.slash = Boolean(slash);
    record.customTextColor = customTextColor;
    record.underlineColor = underlineColor;
    record.borderColor = borderColor;
    record.updatedAt = new Date().toISOString();

    // 更新所有相同data-id的DOM片段（可能有多个，如换行标注）
    const highlights = dom.readingArea.querySelectorAll(`.highlight[data-id="${id}"]`);
    highlights.forEach(highlight => {
        highlight.dataset.category = category;
        highlight.dataset.color = color;
        highlight.dataset.underline = underline;
        highlight.dataset.bold = String(record.bold);

        // 删除线：像 dashed/slash 一样，false 时删除属性
        if (record.strikethrough) {
            highlight.dataset.strikethrough = 'true';
        } else {
            delete highlight.dataset.strikethrough;
        }
        if (record.borderStyle && record.borderStyle !== 'none') {
            highlight.dataset.border = record.borderStyle;

            // 根据文本长度动态设置边框宽度和内边距
            const textLength = record.text.length;
            let borderWidth, paddingY, paddingX;

            if (textLength <= 5) {
                borderWidth = '1px';
                paddingY = 2;
                paddingX = record.borderStyle === 'round' ? 4 : 3;
            } else if (textLength <= 15) {
                borderWidth = '1.5px';
                paddingY = 3;
                paddingX = record.borderStyle === 'round' ? 5 : 4;
            } else if (textLength <= 30) {
                borderWidth = '2px';
                paddingY = 4;
                paddingX = record.borderStyle === 'round' ? 6 : 5;
            } else {
                borderWidth = '2.5px';
                paddingY = 5;
                paddingX = record.borderStyle === 'round' ? 7 : 6;
            }

            // 根据嵌套层级增加额外的内边距，避免边框重叠
            const nestLevel = parseInt(highlight.dataset.nestLevel || '0', 10);
            if (nestLevel > 0) {
                paddingY += nestLevel * 3; // 每层增加3px垂直间距
                paddingX += nestLevel * 2; // 每层增加2px水平间距
            }

            highlight.style.setProperty('--border-width', borderWidth);
            highlight.style.setProperty('--border-padding-y', `${paddingY}px`);
            highlight.style.setProperty('--border-padding-x', `${paddingX}px`);
        } else {
            delete highlight.dataset.border;
            highlight.style.removeProperty('--border-width');
            highlight.style.removeProperty('--border-padding-y');
            highlight.style.removeProperty('--border-padding-x');
        }
        if (record.emoji) {
            highlight.dataset.emoji = record.emoji;
        } else {
            delete highlight.dataset.emoji;
        }
        if (record.customBgColor) {
            highlight.style.backgroundColor = record.customBgColor;
        } else {
            highlight.style.backgroundColor = '';
        }
        if (record.fontFamily) {
            highlight.style.fontFamily = record.fontFamily;
        } else {
            highlight.style.fontFamily = '';
        }
        highlight.dataset.underlineOnly = String(record.underlineOnly);
        highlight.dataset.textColor = record.textColor;
        highlight.dataset.fontSize = record.fontSize;

        // 应用新功能样式
        if (record.dashed) {
            highlight.dataset.dashed = 'true';
        } else {
            delete highlight.dataset.dashed;
        }
        if (record.slash) {
            highlight.dataset.slash = 'true';
        } else {
            delete highlight.dataset.slash;
        }
        if (record.customTextColor) {
            highlight.style.color = record.customTextColor;
        } else {
            highlight.style.color = '';
        }
        if (record.underlineColor && record.underline) {
            highlight.style.textDecorationColor = record.underlineColor;
        } else {
            highlight.style.textDecorationColor = '';
        }
        if (record.borderColor && record.borderStyle && record.borderStyle !== 'none') {
            highlight.style.borderColor = record.borderColor;
        } else if (!record.borderColor) {
            highlight.style.borderColor = '';
        }

        if (record.note) {
            highlight.dataset.note = record.note;
        } else {
            delete highlight.dataset.note;
        }
        highlight.replaceChildren(document.createTextNode(text));
        if (category === 'custom' && customCategory) {
            highlight.dataset.customCategory = customCategory;
        } else {
            highlight.removeAttribute('data-custom-category');
        }
    }); // 结束 forEach

    const activeDocument = getActiveDocument();
    if (activeDocument) {
        activeDocument.updatedAt = record.updatedAt;
    }

    renderAnnotationList();
    renderDocumentList();

    // 保存到历史记录用于撤销/重做
    const newValue = JSON.parse(JSON.stringify(record));
    saveHistory('update', { oldValue, newValue });

    persistState();
}

/**
 * 创建标注元素（用于单行或换行片段）
 * @param {Object} record - 标注记录
 * @param {number} nestLevel - 嵌套层级
 * @returns {HTMLElement} 标注元素
 */
function createHighlightElement(record, nestLevel) {
    const highlight = document.createElement('span');
    highlight.className = 'highlight';
    highlight.dataset.id = record.id;
    highlight.dataset.category = record.category;

    // 背景颜色优先级：customBgColor > color
    // 确保两者互斥，避免CSS冲突
    if (record.customBgColor) {
        // 使用自定义背景色时，不设置data-color属性
        highlight.style.backgroundColor = record.customBgColor;
    } else if (record.color) {
        // 使用预设颜色时，设置data-color属性（由CSS控制背景）
        highlight.dataset.color = record.color;
    }

    highlight.dataset.underline = String(record.underline);
    highlight.dataset.bold = String(Boolean(record.bold));

    if (record.strikethrough) {
        highlight.dataset.strikethrough = 'true';
    }

    highlight.dataset.nestLevel = String(nestLevel);

    if (record.borderStyle && record.borderStyle !== 'none') {
        highlight.dataset.border = record.borderStyle;

        const textLength = record.text.length;
        let borderWidth, paddingY, paddingX;

        if (textLength <= 5) {
            borderWidth = '1px';
            paddingY = 2;
            paddingX = record.borderStyle === 'round' ? 4 : 3;
        } else if (textLength <= 15) {
            borderWidth = '1.5px';
            paddingY = 3;
            paddingX = record.borderStyle === 'round' ? 5 : 4;
        } else if (textLength <= 30) {
            borderWidth = '2px';
            paddingY = 4;
            paddingX = record.borderStyle === 'round' ? 6 : 5;
        } else {
            borderWidth = '2.5px';
            paddingY = 5;
            paddingX = record.borderStyle === 'round' ? 7 : 6;
        }

        if (nestLevel > 0) {
            paddingY += nestLevel * 3;
            paddingX += nestLevel * 2;
        }

        highlight.style.setProperty('--border-width', borderWidth);
        highlight.style.setProperty('--border-padding-y', `${paddingY}px`);
        highlight.style.setProperty('--border-padding-x', `${paddingX}px`);
    }

    if (record.emoji) {
        highlight.dataset.emoji = record.emoji;
    }
    // customBgColor 已在前面处理，此处无需重复设置
    if (record.fontFamily) {
        highlight.style.fontFamily = record.fontFamily;
    }
    highlight.dataset.underlineOnly = String(Boolean(record.underlineOnly));
    highlight.dataset.textColor = record.textColor || 'default';
    highlight.dataset.fontSize = record.fontSize || 'medium';

    if (record.dashed) {
        highlight.dataset.dashed = 'true';
    }
    if (record.slash) {
        highlight.dataset.slash = 'true';
    }
    if (record.customTextColor) {
        highlight.style.color = record.customTextColor;
    }
    if (record.underlineColor && record.underline) {
        highlight.style.textDecorationColor = record.underlineColor;
    }
    if (record.borderColor && record.borderStyle && record.borderStyle !== 'none') {
        highlight.style.borderColor = record.borderColor;
    }

    if (record.note) {
        highlight.dataset.note = record.note;
    }
    if (record.category === 'custom' && record.customCategory) {
        highlight.dataset.customCategory = record.customCategory;
    }

    // 应用叠加样式
    if (nestLevel > 0) {
        if (record.underline) {
            const offset = nestLevel * 3;
            highlight.style.textDecorationThickness = '2px';
            highlight.style.textUnderlineOffset = `${offset}px`;
        }

        if (record.color && !record.customBgColor) {
            const opacity = Math.max(0.3, 1 - nestLevel * 0.15);
            highlight.style.setProperty('--highlight-opacity', opacity);
        }
    }

    return highlight;
}

/**
 * 按行拆分range为多个range片段
 * @param {Range} range - 要拆分的range
 * @returns {Array<Range>} range片段数组
 */
function splitRangeByLine(range) {
    const rects = Array.from(range.getClientRects());
    const fragments = [];

    if (rects.length <= 1) {
        // 单行，直接返回
        fragments.push(range.cloneRange());
        return fragments;
    }

    // 多行：需要按rect拆分
    // 策略：遍历range中的所有文本节点，根据它们的位置分组到不同的行

    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    // 获取range包含的所有文本节点
    const textNodes = [];
    const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                if (range.intersectsNode(node)) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        }
    );

    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }

    if (textNodes.length === 0) {
        fragments.push(range.cloneRange());
        return fragments;
    }

    // 按行分组文本节点
    const lineGroups = [];
    let currentLineTop = null;
    let currentGroup = [];

    textNodes.forEach(textNode => {
        const tempRange = document.createRange();
        tempRange.selectNodeContents(textNode);
        const rect = tempRange.getBoundingClientRect();

        if (currentLineTop === null || Math.abs(rect.top - currentLineTop) < 5) {
            // 同一行
            currentLineTop = rect.top;
            currentGroup.push(textNode);
        } else {
            // 新行
            if (currentGroup.length > 0) {
                lineGroups.push(currentGroup);
            }
            currentGroup = [textNode];
            currentLineTop = rect.top;
        }
    });

    if (currentGroup.length > 0) {
        lineGroups.push(currentGroup);
    }

    // 为每组创建range
    lineGroups.forEach((group, groupIndex) => {
        if (group.length === 0) return;

        const fragmentRange = document.createRange();
        const firstNode = group[0];
        const lastNode = group[group.length - 1];

        // 设置起点
        if (firstNode === startContainer) {
            fragmentRange.setStart(firstNode, startOffset);
        } else {
            fragmentRange.setStart(firstNode, 0);
        }

        // 设置终点
        if (lastNode === endContainer) {
            fragmentRange.setEnd(lastNode, endOffset);
        } else {
            fragmentRange.setEnd(lastNode, lastNode.textContent.length);
        }

        fragments.push(fragmentRange);
    });

    return fragments.length > 0 ? fragments : [range.cloneRange()];
}

function applyHighlight(range, record) {
    // 如果没有range，尝试通过文本查找并创建range
    if (!range && record.text) {
        const walker = document.createTreeWalker(
            dom.readingArea,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let textNode;
        while (textNode = walker.nextNode()) {
            const index = textNode.textContent.indexOf(record.text);
            if (index >= 0) {
                range = document.createRange();
                range.setStart(textNode, index);
                range.setEnd(textNode, index + record.text.length);
                break;
            }
        }

        // 如果仍然找不到range，则无法应用高亮
        if (!range) {
            console.error('❌ 无法为标注创建高亮，未找到匹配的文本:', record.text);
            record._notApplied = true; // 标记为未应用
            return false; // 返回失败标志
        }
    }

    if (!range) {
        console.error('❌ 无法应用高亮：缺少range对象');
        record._notApplied = true; // 标记为未应用
        return false; // 返回失败标志
    }

    // 检测叠加层级
    const fragment = range.cloneContents();
    let nestLevel = 0;
    if (fragment.querySelector) {
        const existingHighlights = fragment.querySelectorAll('.highlight');
        if (existingHighlights.length > 0) {
            // 找到最大层级
            existingHighlights.forEach(hl => {
                const level = parseInt(hl.dataset.nestLevel || '0', 10);
                if (level >= nestLevel) {
                    nestLevel = level + 1;
                }
            });
        }
    }

    // 使用统一的函数创建标注元素
    const highlight = createHighlightElement(record, nestLevel);

    // 检测是否跨行，如果跨行则拆分为多个标注
    const rects = range.getClientRects();
    const isMultiLine = rects.length > 1;

    if (isMultiLine) {
        console.log('[DEBUG] 🔀 检测到换行标注，拆分为', rects.length, '个片段');

        // 为跨行标注创建多个span
        const fragments = splitRangeByLine(range);
        const allHighlights = [];

        fragments.forEach((fragmentRange, index) => {
            const fragmentHighlight = createHighlightElement(record, nestLevel);
            const fragmentContents = fragmentRange.extractContents();

            // 添加语法符号（只在第一个和最后一个片段）
            const symbols = GRAMMAR_SYMBOLS[record.category];
            if (symbols) {
                if (symbols.prefix && index === 0) {
                    const prefixNode = document.createTextNode(symbols.prefix);
                    fragmentHighlight.appendChild(prefixNode);
                }
                fragmentHighlight.appendChild(fragmentContents);
                if (symbols.suffix && index === fragments.length - 1) {
                    const suffixNode = document.createTextNode(symbols.suffix);
                    fragmentHighlight.appendChild(suffixNode);
                }
            } else {
                fragmentHighlight.appendChild(fragmentContents);
            }

            // 只在最后一个片段添加笔记指示器
            if (index === fragments.length - 1 && record.note && record.note.trim()) {
                const indicator = document.createElement('span');
                indicator.className = 'note-indicator';
                indicator.textContent = '⋯';
                indicator.title = record.note;
                fragmentHighlight.appendChild(indicator);
            }

            fragmentRange.insertNode(fragmentHighlight);
            allHighlights.push(fragmentHighlight);
        });

        // 将range移到最后一个片段之后
        if (allHighlights.length > 0) {
            range.setStartAfter(allHighlights[allHighlights.length - 1]);
        }
    } else {
        // 单行标注，使用原有逻辑
        const contents = range.extractContents();

        // 添加语法符号（如果有）
        const symbols = GRAMMAR_SYMBOLS[record.category];
        if (symbols) {
            if (symbols.prefix) {
                const prefixNode = document.createTextNode(symbols.prefix);
                highlight.appendChild(prefixNode);
            }
            highlight.appendChild(contents);
            if (symbols.suffix) {
                const suffixNode = document.createTextNode(symbols.suffix);
                highlight.appendChild(suffixNode);
            }
        } else {
            highlight.appendChild(contents);
        }

        // 如果有笔记，添加笔记指示器
        if (record.note && record.note.trim()) {
            const indicator = document.createElement('span');
            indicator.className = 'note-indicator';
            indicator.textContent = '⋯';
            indicator.title = record.note;
            highlight.appendChild(indicator);
        }

        // 如果需要在下方显示注释
        if (record.showNoteBelow && record.note) {
            const wrapper = document.createElement('span');
            wrapper.className = 'highlight-with-note';

            wrapper.appendChild(highlight);

            const noteBelow = document.createElement('span');
            noteBelow.className = 'highlight-note-below';
            // 支持换行：将 \n 转换为 <br> 标签
            noteBelow.innerHTML = escapeHtml(record.note).replace(/\n/g, '<br>');
            wrapper.appendChild(noteBelow);

            range.insertNode(wrapper);
            range.setStartAfter(wrapper);
        } else {
            range.insertNode(highlight);
            range.setStartAfter(highlight);
        }
    }

    range.collapse(true);
    return true; // 返回成功标志
}

/**
 * 统一的文本提取函数
 * @param {Object} options - 选项
 * @param {Range} options.range - 要提取文本的range对象
 * @param {boolean} options.fallbackToSelection - 是否回退到浏览器selection
 * @param {string} options.textOverride - 直接使用的文本覆盖
 * @returns {string|null} 提取的文本或null
 */
function getSelectionText(options = {}) {
    const {
        range = state.activeRange,
        fallbackToSelection = true,
        textOverride = null
    } = options;

    // 优先级1: 使用明确提供的文本覆盖
    if (textOverride && textOverride.trim()) {
        return textOverride.trim();
    }

    // 优先级2: 从range获取
    if (range && !range.collapsed) {
        const text = range.toString().trim();
        if (text) return text;
    }

    // 优先级3: 从预览高亮获取
    if (previewHighlight && previewHighlight.textContent) {
        const text = previewHighlight.textContent.trim();
        if (text) {
            console.log('[DEBUG] 📝 从预览高亮获取文本:', text);
            return text;
        }
    }

    // 优先级4: 从浏览器selection获取（仅在允许时）
    if (fallbackToSelection) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            const text = sel.toString().trim();
            if (text) {
                console.log('[DEBUG] 📝 从浏览器selection获取文本:', text);
                return text;
            }
        }
    }

    return null;
}

function generateId() {
    return `anno-${Math.random().toString(16).slice(2)}-${Date.now().toString(36)}`;
}

function generateDocumentId() {
    return `doc-${Math.random().toString(16).slice(2)}-${Date.now().toString(36)}`;
}

function parseTags(value) {
    if (!value) return [];
    return value.split(',').map(tag => tag.trim()).filter(Boolean);
}

function handleLoadText() {
    const raw = dom.sourceText.value;
    if (!raw.trim()) {
        showToast('请先粘贴需要整理的英语短文', 'warning');
        return;
    }

    const documentRecord = createDocumentFromInput(raw);
    if (!documentRecord) {
        showToast('未能创建短文，请重试', 'error');
        return;
    }

    state.documents.push(documentRecord);
    dom.sourceText.value = '';

    renderDocumentList();
    setActiveDocument(documentRecord.id, { skipPersist: true });
    updateDocumentEmptyState();
    persistState();
}

function renderSourceIntoReader(rawText) {
    const cleanText = rawText.replace(/\r\n/g, '\n');
    const paragraphs = cleanText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

    if (paragraphs.length === 0) {
        dom.readingArea.innerHTML = '<p class="placeholder">未检测到有效段落。</p>';
        return;
    }

    const html = paragraphs.map(paragraph => {
        const processedParagraph = highlightOptions(paragraph);
        return `<p>${processedParagraph.replace(/\n/g, '<br>')}</p>`;
    }).join('');
    dom.readingArea.innerHTML = html;
}

// 识别并高亮显示选项（A. B. C. D. 或 1. 2. 3. 4.）
function highlightOptions(text) {
    // 性能优化：如果文本太长（超过1000字符），不进行选项识别
    if (text.length > 1000) {
        return escapeHtml(text);
    }

    // 匹配模式：
    // A. 或 A) 或 (A)
    // 1. 或 1) 或 (1)
    const optionPatterns = [
        // 字母选项：A. B. C. D.
        /^([A-D])\.\s+(.+)$/gm,
        // 字母选项：A) B) C) D)
        /^([A-D])\)\s+(.+)$/gm,
        // 字母选项：(A) (B) (C) (D)
        /^\(([A-D])\)\s+(.+)$/gm,
        // 数字选项：1. 2. 3. 4.
        /^([1-4])\.\s+(.+)$/gm,
        // 数字选项：1) 2) 3) 4)
        /^([1-4])\)\s+(.+)$/gm,
        // 数字选项：(1) (2) (3) (4)
        /^\(([1-4])\)\s+(.+)$/gm
    ];

    let result = escapeHtml(text);

    // 尝试每个模式
    for (const pattern of optionPatterns) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length >= 2) { // 至少有2个选项才认为是选择题
            // 替换所有匹配项
            result = text.replace(pattern, (match, marker, content) => {
                const escapedContent = escapeHtml(content);
                return `<span class="option-line"><span class="option-marker">${escapeHtml(marker)}.</span>${escapedContent}</span>`;
            });
            break; // 找到一个匹配的模式就停止
        }
    }

    return result;
}

function escapeHtml(input) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return input.replace(/[&<>"']/g, char => map[char]);
}

function clearAnnotationsState() {
    if (Array.isArray(state.annotations)) {
        state.annotations.length = 0;
    } else {
        state.annotations = [];
    }
    renderAnnotationList();
}

function clearAllHighlights() {
    const activeDocument = getActiveDocument();
    if (!activeDocument) {
        alert('请先创建或选择一篇短文再清除标注。');
        return;
    }

    // 如果没有标注，直接返回
    if (state.annotations.length === 0) {
        alert('当前没有标注可清除。');
        return;
    }

    // 确认操作
    if (!confirm(`确定要清除所有 ${state.annotations.length} 条标注吗？此操作可撤销。`)) {
        return;
    }

    // 保存所有标注用于撤销
    const allAnnotations = JSON.parse(JSON.stringify(state.annotations));
    console.log('[DEBUG] 🗑️ 清除所有标注', {
        count: allAnnotations.length
    });

    // 清除DOM中的高亮
    const highlights = dom.readingArea.querySelectorAll('.highlight');
    highlights.forEach(node => {
        const parent = node.parentNode;
        if (!parent) return;
        while (node.firstChild) {
            parent.insertBefore(node.firstChild, node);
        }
        parent.removeChild(node);
        parent.normalize();
    });

    // 清除状态
    clearAnnotationsState();

    // 保存到历史记录（使用新的动作类型）
    saveHistory('clearAll', allAnnotations);

    touchActiveDocument();
    renderDocumentList();
    persistState();

    showToast(`已清除 ${allAnnotations.length} 条标注（可按 Ctrl+Z 撤销）`, 'success');
}

function toggleAnnotationPanel() {
    dom.annotationsPanel.classList.toggle('hidden');
}

function insertTemplate(key) {
    const template = QUICK_TEMPLATES[key];
    if (!template) return;
    if (dom.sourceText.value) {
        dom.sourceText.value = `${dom.sourceText.value}\n\n${template}`;
    } else {
        dom.sourceText.value = template;
    }
}

function copyAnnotationsToClipboard() {
    if (state.annotations.length === 0) {
        showToast('暂无标注可复制', 'info');
        return;
    }
    const filtered = getFilteredAnnotations();
    if (!filtered.length) {
        showToast('筛选条件下暂无标注可复制', 'info');
        return;
    }
    const text = filtered.map(item => {
        const label = item.category === 'custom' ? item.customCategory : CATEGORY_LABELS[item.category] || item.category;
        const tagText = item.tags.length ? ` #${item.tags.join(' #')}` : '';
        const note = item.note ? `\n释义：${item.note}` : '';
        return `[${label}] ${item.text}${tagText}${note}`;
    }).join('\n\n');

    navigator.clipboard.writeText(text).then(() => {
        showToast('标注内容已复制到剪贴板', 'success');
    }).catch(() => {
        showToast('复制失败，请检查浏览器权限', 'error');
    });
}

function exportAnnotationsAsJson() {
    if (state.annotations.length === 0) {
        showToast('暂无标注可导出', 'info');
        return;
    }
    const filtered = getFilteredAnnotations();
    if (!filtered.length) {
        showToast('筛选条件下暂无标注可导出', 'info');
        return;
    }
    const data = JSON.stringify(filtered, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `annotations-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportAnnotationsAsMarkdown() {
    if (state.annotations.length === 0) {
        alert('暂无标注可导出。');
        return;
    }

    const activeDoc = getActiveDocument();
    const docTitle = activeDoc ? activeDoc.title : '英语标注文档';
    const filtered = getFilteredAnnotations();

    if (!filtered.length) {
        alert('筛选条件下暂无标注可导出。');
        return;
    }

    // 按类别分组
    const grouped = {};
    filtered.forEach(item => {
        const cat = item.category === 'custom' ? (item.customCategory || 'custom') : item.category;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    // 生成Markdown内容
    let markdown = `# ${docTitle}\n\n`;
    markdown += `> 📚 英语阅读标注文档 | 导出时间: ${new Date().toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    // 原文（如果有）
    if (activeDoc && activeDoc.content) {
        markdown += `## 📖 原文\n\n`;
        markdown += `${activeDoc.content}\n\n`;
        markdown += `---\n\n`;
    }

    // 标注内容
    markdown += `## 🎯 标注内容\n\n`;
    markdown += `**总计**: ${filtered.length} 条标注\n\n`;

    Object.entries(grouped).forEach(([cat, items]) => {
        const label = CATEGORY_LABELS[cat] || cat;
        markdown += `### ${label} (${items.length})\n\n`;

        items.forEach((item, index) => {
            markdown += `${index + 1}. **${item.text}**`;

            if (item.note) {
                markdown += `\n   - 📝 ${item.note}`;
            }

            if (item.tags && item.tags.length > 0) {
                markdown += `\n   - 🏷️ ${item.tags.map(t => `\`${t}\``).join(', ')}`;
            }

            markdown += `\n\n`;
        });
    });

    markdown += `---\n\n`;
    markdown += `📊 **统计**: `;
    const categoryNames = Object.keys(grouped).map(cat => CATEGORY_LABELS[cat] || cat);
    markdown += categoryNames.join(' | ');
    markdown += `\n\n`;
    markdown += `*由英语短文阅读标注工具生成*\n`;

    // 下载
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle}-annotations-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function handleJsonImport(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file) return;

        if (!getActiveDocument()) {
        alert('请先选择一篇短文，再导入标注。');
        input.value = '';
        return;
    }

try {
        const rawText = await readFileAsText(file);
        const parsed = JSON.parse(rawText);
        const records = normalizeImportedAnnotations(parsed);
        if (!records.length) {
            alert('未检测到可导入的标注数据。');
            return;
        }

        if (state.annotations.length > 0) {
            const confirmReplace = window.confirm('导入新数据将覆盖当前标注，是否继续？');
            if (!confirmReplace) {
                return;
            }
        }

        if (state.annotations.length) {
            clearAllHighlights();
        }

        const stats = applyImportedAnnotations(records);
        const hasCategoryFilter = dom.categoryFilter && dom.categoryFilter.value !== 'all';
        const hasTagFilter = dom.tagFilter && dom.tagFilter.dataset.activeTag;
        if (hasCategoryFilter || hasTagFilter) {
            resetFilters();
        } else {
            renderAnnotationList();
        }

        const importedCount = records.length;
        const appliedCount = stats.highlighted;
        const unmatched = importedCount - appliedCount;
        const messages = [`成功导入 ${importedCount} 条标注。`];

        if (stats.idConflicts > 0) {
            messages.push(`⚠️ 检测到 ${stats.idConflicts} 个ID冲突，已自动重新生成ID。`);
        }

        if (unmatched > 0) {
            messages.push(`其中 ${unmatched} 条未在当前阅读内容中找到匹配文本。`);
            const samples = stats.unmatched.slice(0, 3).map(text => `"${text.slice(0, 24)}${text.length > 24 ? '…' : ''}"`);
            if (samples.length) {
                messages.push(`示例：${samples.join('、')}`);
            }
        }
        alert(messages.join('\n'));
    } catch (error) {
        console.error('Failed to import annotations:', error);
        alert('导入失败，请确认文件格式为有效的 JSON。');
    } finally {
        input.value = '';
    }
}

function normalizeImportedAnnotations(input) {
    const payload = Array.isArray(input)
        ? input
        : (input && Array.isArray(input.annotations) ? input.annotations : []);

    return payload.map(normalizeImportedRecord).filter(Boolean);
}

function readFileAsText(file) {
    if (typeof file.text === 'function') {
        return file.text();
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result || '');
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

function normalizeImportedRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const text = typeof raw.text === 'string' ? raw.text.trim() : '';
    const category = typeof raw.category === 'string' ? raw.category.trim() : '';
    if (!text || !category) return null;

    const record = {
        id: typeof raw.id === 'string' && raw.id ? raw.id : generateId(),
        text,
        category,
        customCategory: typeof raw.customCategory === 'string' ? raw.customCategory.trim() : '',
        color: validateHighlightColor(raw.color),
        underline: Boolean(raw.underline),
        bold: Boolean(raw.bold),
        underlineOnly: Boolean(raw.underlineOnly),
        textColor: typeof raw.textColor === 'string' ? raw.textColor : 'default',
        fontSize: typeof raw.fontSize === 'string' ? raw.fontSize : 'medium',
        note: typeof raw.note === 'string' ? raw.note : '',
        tags: Array.isArray(raw.tags) ? raw.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
    };

    if (raw.updatedAt && typeof raw.updatedAt === 'string') {
        record.updatedAt = raw.updatedAt;
    }

    return record;
}

function validateHighlightColor(color) {
    if (typeof color === 'string' && HIGHLIGHT_COLORS.has(color)) {
        return color;
    }
    return state.lastColor || 'honey';
}

/**
 * 清理孤儿标注引用
 * 检测并清理linkedTo和linkedAnnotations中指向不存在ID的引用
 */
function cleanupOrphanedLinkedAnnotations() {
    const validIds = new Set(state.annotations.map(a => a.id));
    let orphanCount = 0;

    state.annotations.forEach(annotation => {
        // 清理无效的linkedTo引用
        if (annotation.linkedTo && !validIds.has(annotation.linkedTo)) {
            console.warn('[CLEANUP] 🔍 检测到孤儿标注（linkedTo指向不存在的ID）:', {
                id: annotation.id,
                text: annotation.text.substring(0, 30),
                invalidLinkedTo: annotation.linkedTo
            });
            delete annotation.linkedTo;
            orphanCount++;
        }

        // 清理linkedAnnotations数组中的无效ID
        if (annotation.linkedAnnotations && annotation.linkedAnnotations.length > 0) {
            const originalLength = annotation.linkedAnnotations.length;
            annotation.linkedAnnotations = annotation.linkedAnnotations.filter(id => {
                const isValid = validIds.has(id);
                if (!isValid) {
                    console.warn('[CLEANUP] 🔍 检测到无效的子标注引用:', {
                        parentId: annotation.id,
                        invalidChildId: id
                    });
                }
                return isValid;
            });

            const removedCount = originalLength - annotation.linkedAnnotations.length;
            if (removedCount > 0) {
                orphanCount += removedCount;
                console.log('[CLEANUP] ✅ 已清理无效的子标注引用', {
                    parentId: annotation.id,
                    removed: removedCount,
                    remaining: annotation.linkedAnnotations.length
                });
            }
        }
    });

    if (orphanCount > 0) {
        console.log('[CLEANUP] ✅ 孤儿引用清理完成', { totalCleaned: orphanCount });
        showToast(`检测并清理了 ${orphanCount} 个孤儿引用`, 'info');
        persistState();
        return orphanCount;
    }

    return 0;
}

function applyImportedAnnotations(records) {
    const stats = {
        highlighted: 0,
        unmatched: [],
        idConflicts: 0
    };

    // 获取所有现有标注的ID集合
    const existingIds = new Set(state.annotations.map(item => item.id));

    // ID映射表：oldId -> newId (用于更新linkedTo和linkedAnnotations引用)
    const idMapping = {};

    // 第一步：处理ID冲突，建立映射表
    records.forEach(record => {
        const cloned = { ...record, tags: [...record.tags] };

        // 检查ID冲突，如果冲突则生成新ID
        if (existingIds.has(cloned.id)) {
            const oldId = cloned.id;
            cloned.id = generateId();
            idMapping[oldId] = cloned.id; // 记录ID映射
            existingIds.add(cloned.id);
            stats.idConflicts++;
            console.log('[DEBUG] ⚠️ 导入时检测到ID冲突，已重新生成', {
                oldId,
                newId: cloned.id,
                text: cloned.text.substring(0, 30)
            });
        } else {
            existingIds.add(cloned.id);
        }
    });

    // 第二步：更新所有标注的linkedTo和linkedAnnotations引用
    records.forEach(record => {
        // 更新linkedTo引用
        if (record.linkedTo && idMapping[record.linkedTo]) {
            const oldLinkedTo = record.linkedTo;
            record.linkedTo = idMapping[oldLinkedTo];
            console.log('[DEBUG] 🔗 更新linkedTo引用', {
                id: record.id,
                oldLinkedTo,
                newLinkedTo: record.linkedTo
            });
        }

        // 更新linkedAnnotations数组中的引用
        if (record.linkedAnnotations && record.linkedAnnotations.length > 0) {
            const originalArr = [...record.linkedAnnotations];
            record.linkedAnnotations = record.linkedAnnotations.map(linkedId => {
                return idMapping[linkedId] || linkedId;
            });

            if (JSON.stringify(originalArr) !== JSON.stringify(record.linkedAnnotations)) {
                console.log('[DEBUG] 🔗 更新linkedAnnotations引用', {
                    parentId: record.id,
                    oldArray: originalArr,
                    newArray: record.linkedAnnotations
                });
            }
        }
    });

    // 第三步：应用标注到DOM
    records.forEach(record => {
        const range = findRangeForText(record.text);
        if (range) {
            applyHighlight(range, record);
            stats.highlighted += 1;
        } else {
            stats.unmatched.push(record.text);
        }
        state.annotations.push(record);
    });

    const activeDocument = getActiveDocument();
    if (activeDocument) {
        activeDocument.updatedAt = new Date().toISOString();
    }

    // 第四步：清理孤儿引用
    const orphansCleaned = cleanupOrphanedLinkedAnnotations();
    if (orphansCleaned > 0) {
        console.log('[IMPORT] ✅ 导入后清理了孤儿引用', { count: orphansCleaned });
    }

    if (state.autoSync) {
        renderAnnotationList();
    } else {
        updateAnnotationSummary();
    }
    renderDocumentList();
    persistState();
    return stats;
}

function findRangeForText(text, usedRanges = []) {
    if (!dom.readingArea) return null;
    const walker = document.createTreeWalker(dom.readingArea, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node || !node.nodeValue) continue;

        // 在当前节点中查找所有匹配位置
        let searchIndex = 0;
        while (searchIndex < node.nodeValue.length) {
            const index = node.nodeValue.indexOf(text, searchIndex);
            if (index === -1) break;

            // 检查这个位置是否已被使用
            const isUsed = usedRanges.some(used =>
                used.node === node &&
                used.startOffset === index &&
                used.endOffset === index + text.length
            );

            if (!isUsed) {
                // 找到未使用的位置
                const range = document.createRange();
                range.setStart(node, index);
                range.setEnd(node, index + text.length);
                return range;
            }

            // 继续查找下一个匹配
            searchIndex = index + 1;
        }
    }

    return null;
}

function handleAnnotationActions(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const item = event.target.closest('.annotation-item');
    if (!item) return;
    const id = item.dataset.id;

    switch (button.dataset.action) {
        case 'delete':
            deleteAnnotation(id);
            break;
        case 'locate':
            locateAnnotation(id);
            break;
        case 'edit':
            editAnnotationFromList(id);
            break;
    }
}

function deleteAnnotation(id) {
    const activeDocument = getActiveDocument();
    if (!activeDocument) {
        return;
    }

    // 保存旧值用于撤销
    const index = state.annotations.findIndex(item => item.id === id);
    if (index === -1) {
        return;
    }

    // 获取要删除的标注记录
    const record = state.annotations[index];

    // 准备撤销数据：包含所有被删除的标注及其索引位置
    const undoData = {
        mainRecord: JSON.parse(JSON.stringify(record)),
        mainIndex: index, // 保存主标注的原始索引
        linkedRecords: [],
        linkedIndices: {}, // 保存子标注的原始索引
        parentRecord: null
    };

    // 情况1：如果这是主标注，同时删除所有连接的子标注
    if (record.linkedAnnotations && record.linkedAnnotations.length > 0) {
        console.log('[DEBUG] 🗑️ 删除主标注及其子标注', {
            mainId: id,
            linkedCount: record.linkedAnnotations.length
        });

        // 先收集所有子标注的信息，然后再删除（避免索引变化问题）
        const linkedToDelete = [];
        record.linkedAnnotations.forEach(linkedId => {
            const linkedIndex = state.annotations.findIndex(item => item.id === linkedId);
            const linkedRecord = state.annotations[linkedIndex];
            if (linkedRecord) {
                undoData.linkedRecords.push(JSON.parse(JSON.stringify(linkedRecord)));
                undoData.linkedIndices[linkedId] = linkedIndex; // 保存子标注的原始索引
                linkedToDelete.push({ id: linkedId, index: linkedIndex });
            }
        });

        // 删除所有子标注（从后往前删除，避免索引变化）
        linkedToDelete.sort((a, b) => b.index - a.index).forEach(({ id, index }) => {
            // 删除子标注的所有DOM片段（可能有多个，如换行标注）
            const linkedHighlights = dom.readingArea.querySelectorAll(`.highlight[data-id="${id}"]`);
            linkedHighlights.forEach(linkedHighlight => {
                const parent = linkedHighlight.parentNode;
                while (linkedHighlight.firstChild) {
                    parent.insertBefore(linkedHighlight.firstChild, linkedHighlight);
                }
                parent.removeChild(linkedHighlight);
                parent.normalize();
            });

            // 从数组中删除
            state.annotations.splice(index, 1);
        });
    }

    // 情况2：如果这是子标注，从主标注的 linkedAnnotations 中移除
    if (record.linkedTo) {
        console.log('[DEBUG] 🗑️ 删除子标注，清理主标注引用', {
            childId: id,
            parentId: record.linkedTo
        });

        const parentRecord = state.annotations.find(item => item.id === record.linkedTo);
        if (parentRecord) {
            // 保存主标注的当前状态用于撤销
            undoData.parentRecord = JSON.parse(JSON.stringify(parentRecord));

            if (parentRecord.linkedAnnotations) {
                const linkIndex = parentRecord.linkedAnnotations.indexOf(id);
                if (linkIndex !== -1) {
                    parentRecord.linkedAnnotations.splice(linkIndex, 1);
                }
            }
        }
    }

    // 删除主标注的所有DOM片段（可能有多个，如换行标注）
    const highlights = dom.readingArea.querySelectorAll(`.highlight[data-id="${id}"]`);
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        while (highlight.firstChild) {
            parent.insertBefore(highlight.firstChild, highlight);
        }
        parent.removeChild(highlight);
        parent.normalize();
    });

    // 从数组中删除主标注
    state.annotations.splice(index, 1);

    // 清理空的 highlight 元素
    cleanEmptyHighlights();

    // 保存到历史记录（包含完整的删除信息）
    saveHistory('delete', undoData);
    activeDocument.updatedAt = new Date().toISOString();

    renderAnnotationList();
    renderDocumentList();
    persistState();
}

function locateAnnotation(id) {
    const highlight = dom.readingArea.querySelector(`.highlight[data-id="${id}"]`);
    if (!highlight) return;
    highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlight.classList.add('pulse');
    setTimeout(() => highlight.classList.remove('pulse'), 1200);
}

function editAnnotationFromList(id) {
    const highlight = dom.readingArea.querySelector(`.highlight[data-id="${id}"]`);
    if (!highlight) return;

    const range = document.createRange();
    range.selectNodeContents(highlight);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    prepareEditingExisting(highlight);
}

function handleAnnotationListKeyboardShortcuts(event) {
    if (event.defaultPrevented) return;
    if (!event.altKey) return;
    if (typeof event.key !== 'string' || event.key.toLowerCase() !== 'e') return;

    const item = event.target.closest ? event.target.closest('.annotation-item') : null;
    if (!item || !item.dataset.id) return;

    event.preventDefault();
    editAnnotationFromList(item.dataset.id);
}

function handleReaderKeyboardShortcuts(event) {
    if (event.defaultPrevented) return;
    if (!event.altKey) return;
    if (typeof event.key !== 'string' || event.key.toLowerCase() !== 'e') return;

    let highlight = event.target && event.target.closest ? event.target.closest('.highlight') : null;
    if (!highlight) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            highlight = getHighlightAncestor(range.commonAncestorContainer);
        }
    }

    if (!highlight) return;

    event.preventDefault();
    prepareEditingExisting(highlight);
}

function renderAnnotationList() {
    dom.annotationList.innerHTML = '';
    const annotations = getFilteredAnnotations();

    if (!annotations.length) {
        dom.annotationList.innerHTML = '<p class="empty">暂无标注</p>';
        updateAnnotationSummary();
        return;
    }

    // 按类别分组
    const groupedByCategory = {};
    annotations.forEach(record => {
        const categoryKey = record.category === 'custom' ? record.customCategory : record.category;
        if (!groupedByCategory[categoryKey]) {
            groupedByCategory[categoryKey] = [];
        }
        groupedByCategory[categoryKey].push(record);
    });

    const fragment = document.createDocumentFragment();

    // 按类别顺序渲染
    const categoryOrder = ['vocab', 'phrase', 'difficulty', 'keypoint', 'translation'];

    categoryOrder.forEach(categoryKey => {
        if (groupedByCategory[categoryKey]) {
            const group = createCategoryGroup(categoryKey, groupedByCategory[categoryKey]);
            fragment.appendChild(group);
            delete groupedByCategory[categoryKey];
        }
    });

    // 渲染自定义类别和其他类别
    Object.keys(groupedByCategory).forEach(categoryKey => {
        const group = createCategoryGroup(categoryKey, groupedByCategory[categoryKey]);
        fragment.appendChild(group);
    });

    dom.annotationList.appendChild(fragment);
    updateAnnotationSummary();
}

function createCategoryGroup(categoryKey, records) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'annotation-group';

    // 类别标题
    const header = document.createElement('div');
    header.className = 'annotation-group-header';
    const label = getCategoryLabel(categoryKey);
    header.innerHTML = `
        <h3>${label}</h3>
        <span class="count">${records.length}</span>
    `;
    groupDiv.appendChild(header);

    // 标注项列表
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'annotation-group-items';

    records.forEach(record => {
        const item = document.createElement('div');
        item.className = 'annotation-item-simple';
        item.dataset.id = record.id;

        // 计算出现次数（包括连接的标注）
        const occurrenceCount = 1 + (record.linkedAnnotations ? record.linkedAnnotations.length : 0);
        const countBadge = occurrenceCount > 1 ? `<span class="occurrence-badge" title="出现${occurrenceCount}次">×${occurrenceCount}</span>` : '';

        // 文本和备注
        item.innerHTML = `
            <div class="annotation-text" data-id="${record.id}">
                ${escapeHtml(record.text)}
                ${countBadge}
            </div>
            ${record.note ? `<div class="annotation-note">${escapeHtml(record.note).replace(/\n/g, '<br>')}</div>` : ''}
            ${record.tags.length ? `<div class="annotation-tags">${record.tags.map(tag => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join(' ')}</div>` : ''}
        `;

        // 点击文本定位到第一个标注
        const textElement = item.querySelector('.annotation-text');
        textElement.addEventListener('click', () => {
            if (occurrenceCount > 1) {
                // 如果有多个出现，显示所有位置
                highlightAllOccurrences(record);
            } else {
                locateAnnotation(record.id);
            }
        });

        itemsDiv.appendChild(item);
    });

    groupDiv.appendChild(itemsDiv);
    return groupDiv;
}

function getFilteredAnnotations() {
    const category = dom.categoryFilter.value || 'all';
    const tagFilterValue = dom.tagFilter.dataset.activeTag || '';
    const searchQuery = (dom.searchFilter.value || '').trim().toLowerCase();

    return state.annotations.filter(item => {
        // 过滤掉已被连接的子标注（只显示主标注）
        if (item.linkedTo) {
            return false;
        }

        // 只过滤掉明确标记为未应用的标注
        // 注释掉 DOM 检查，因为它可能在渲染时机上有问题
        if (item._notApplied) {
            return false;
        }

        const categoryMatch = category === 'all' || item.category === category;
        const tagMatch = !tagFilterValue || item.tags.includes(tagFilterValue);

        // 搜索匹配：检查标注文本、注释、标签
        const searchMatch = !searchQuery ||
            item.text.toLowerCase().includes(searchQuery) ||
            (item.note && item.note.toLowerCase().includes(searchQuery)) ||
            (item.customCategory && item.customCategory.toLowerCase().includes(searchQuery)) ||
            item.tags.some(tag => tag.toLowerCase().includes(searchQuery));

        return categoryMatch && tagMatch && searchMatch;
    });
}

function handleTagFilterInput(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const value = event.target.value.trim();
    event.target.dataset.activeTag = value;
    renderAnnotationList();
}

function resetFilters() {
    dom.categoryFilter.value = 'all';
    dom.tagFilter.value = '';
    delete dom.tagFilter.dataset.activeTag;
    dom.searchFilter.value = '';
    renderAnnotationList();
}

function updateAnnotationSummary() {
    if (!dom.summaryElements) return;

    const total = state.annotations.length;
    setSummaryValue('total', total);

    const categorySet = new Set();
    state.annotations.forEach(record => {
        if (record.category === 'custom') {
            categorySet.add(record.customCategory || 'custom');
        } else {
            categorySet.add(record.category);
        }
    });
    setSummaryValue('categories', categorySet.size);

    const tagTotal = state.annotations.reduce((sum, record) => sum + record.tags.length, 0);
    setSummaryValue('tags', tagTotal);

    const latestTimestamp = state.annotations.reduce((latest, record) => {
        const stamp = record.updatedAt || record.createdAt;
        if (!stamp) return latest;
        const value = Date.parse(stamp);
        return Number.isNaN(value) ? latest : Math.max(latest, value);
    }, 0);

    if (latestTimestamp) {
        setSummaryValue('updated', formatSummaryTimestamp(latestTimestamp));
    } else {
        setSummaryValue('updated', '—');
    }

    renderCategoryMetrics(total);
}

function setSummaryValue(key, value) {
    const element = dom.summaryElements?.[key];
    if (!element) return;
    element.textContent = String(value);
}

function formatSummaryTimestamp(timestamp) {
    try {
        const formatter = new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        return formatter.format(new Date(timestamp));
    } catch (error) {
        const date = new Date(timestamp);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d} ${h}:${min}`;
    }
}

function renderCategoryMetrics(totalAnnotations) {
    if (!dom.categoryMetrics) return;

    dom.categoryMetrics.innerHTML = '';

    if (!totalAnnotations) {
        dom.categoryMetrics.innerHTML = '<p class="empty">暂无分类数据</p>';
        return;
    }

    const distribution = getCategoryDistribution();
    const fragment = document.createDocumentFragment();

    distribution.forEach(bucket => {
        const card = document.createElement('article');
        card.className = 'metric-card';
        if (bucket.isCustom) {
            card.classList.add('custom');
        }
        card.dataset.category = bucket.datasetCategory;

        const label = document.createElement('p');
        label.className = 'metric-label';
        label.textContent = bucket.label;

        const value = document.createElement('p');
        value.className = 'metric-value';
        value.textContent = `${bucket.count} 条`;

        const share = document.createElement('p');
        share.className = 'metric-share';
        share.textContent = formatCategoryShare(bucket.count, totalAnnotations);

        card.append(label, value, share);
        fragment.appendChild(card);
    });

    dom.categoryMetrics.appendChild(fragment);
}

function getCategoryDistribution() {
    const distribution = new Map();

    state.annotations.forEach(record => {
        const isCustom = record.category === 'custom';
        const key = isCustom ? (record.customCategory || 'custom') : record.category;
        const datasetCategory = isCustom ? 'custom' : record.category;
        const label = isCustom
            ? (record.customCategory || '自定义')
            : (CATEGORY_LABELS[record.category] || record.category);

        if (!distribution.has(key)) {
            distribution.set(key, { key, label, count: 0, datasetCategory, isCustom });
        }
        distribution.get(key).count += 1;
    });

    const baseOrder = ['vocab', 'phrase', 'difficulty', 'keypoint', 'translation'];
    const ordered = [];

    baseOrder.forEach(key => {
        if (distribution.has(key)) {
            ordered.push(distribution.get(key));
        }
    });

    distribution.forEach((value, key) => {
        if (!baseOrder.includes(key)) {
            ordered.push(value);
        }
    });

    return ordered;
}

function formatCategoryShare(count, total) {
    if (!total) return '占比 —';
    const percentage = Math.round((count / total) * 100);
    return `占比 ${percentage}%`;
}

function initializeAppState() {
    const persisted = restoreStateFromStorage();
    if (persisted) {
        console.log('Initializing from localStorage:', {
            documents: persisted.documents?.length || 0,
            activeDocumentId: persisted.activeDocumentId
        });
        loadDataFromPayload(persisted, { skipPersist: true });
        applyTheme();
        return;
    }
    console.log('No persisted data, using defaults');

    applyTheme();
    state.readerWidth = clampReaderWidth(state.readerWidth ?? DEFAULT_READER_WIDTH);
    applyReaderWidth(state.readerWidth);
    updateReaderWidthValue(state.readerWidth);

    // 初始化字体大小和行间距
    applyReaderFontSize(state.readerFontSize);
    updateReaderFontSizeValue(state.readerFontSize);
    if (dom.readerFontSizeSlider) {
        dom.readerFontSizeSlider.value = state.readerFontSize;
    }

    applyReaderLineHeight(state.readerLineHeight);
    updateReaderLineHeightValue(state.readerLineHeight);
    if (dom.readerLineHeightSlider) {
        dom.readerLineHeightSlider.value = state.readerLineHeight;
    }

    if (dom.autoSyncToggle) {
        dom.autoSyncToggle.checked = state.autoSync;
    }

    setInputPanelCollapsed(state.inputCollapsed, { skipFocus: true });
    renderDocumentList();
    updateDocumentEmptyState();
    renderAnnotationList();

    // 初始化新样式选项的默认状态
    if (dom.borderStyleButtons && dom.borderStyleButtons.length > 0) {
        const defaultBorderBtn = Array.from(dom.borderStyleButtons).find(btn => btn.dataset.border === 'none');
        if (defaultBorderBtn) {
            defaultBorderBtn.classList.add('active');
        }
    }

    if (dom.emojiButtons && dom.emojiButtons.length > 0) {
        const defaultEmojiBtn = Array.from(dom.emojiButtons).find(btn => !btn.dataset.emoji || btn.dataset.emoji === '');
        if (defaultEmojiBtn) {
            defaultEmojiBtn.classList.add('active');
        }
    }
    refreshGistSettingsUI();
}

function restoreStateFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return sanitizePersistedData(parsed);
    } catch (error) {
        console.warn('无法从缓存中恢复学习数据：', error);
        return null;
    }
}

function sanitizePersistedData(raw) {
    if (!raw || typeof raw !== 'object') {
        return {
            version: 1,
            autoSync: true,
            lastCategory: state.lastCategory,
            lastColor: state.lastColor,
            lastUnderline: state.lastUnderline,
            lastBold: state.lastBold,
            lastStrikethrough: state.lastStrikethrough,
            lastBorderStyle: state.lastBorderStyle,
            lastEmoji: state.lastEmoji,
            lastDashed: state.lastDashed,
            lastSlash: state.lastSlash,
            lastCustomTextColor: state.lastCustomTextColor,
            lastUnderlineColor: state.lastUnderlineColor,
            lastBorderColor: state.lastBorderColor,
            lastCustomCategory: state.lastCustomCategory,
            customCategories: state.customCategories,
            inputCollapsed: true,
            readerWidth: DEFAULT_READER_WIDTH,
            readerFontSize: 16,
            readerLineHeight: 1.6,
            theme: 'light',
            annotationTemplates: [],
            aiConfig: state.aiConfig,
            vocabBook: [],
            activeDocumentId: null,
            gistConfig: sanitizeGistConfig(null),
            documents: []
        };
    }

    const documents = Array.isArray(raw.documents)
        ? raw.documents.map(sanitizeDocumentRecord).filter(Boolean)
        : [];

    return {
        version: Number.isInteger(raw.version) ? raw.version : 1,
        autoSync: raw.autoSync !== undefined ? Boolean(raw.autoSync) : state.autoSync,
        lastCategory: typeof raw.lastCategory === 'string' ? raw.lastCategory : state.lastCategory,
        lastColor: raw.lastColor === null ? null : (typeof raw.lastColor === 'string' ? raw.lastColor : state.lastColor),
        lastUnderline: raw.lastUnderline !== undefined ? Boolean(raw.lastUnderline) : state.lastUnderline,
        lastBold: raw.lastBold !== undefined ? Boolean(raw.lastBold) : state.lastBold,
        lastStrikethrough: raw.lastStrikethrough !== undefined ? Boolean(raw.lastStrikethrough) : state.lastStrikethrough,
        lastBorderStyle: typeof raw.lastBorderStyle === 'string' ? raw.lastBorderStyle : state.lastBorderStyle,
        lastEmoji: typeof raw.lastEmoji === 'string' ? raw.lastEmoji : state.lastEmoji,
        lastDashed: raw.lastDashed !== undefined ? Boolean(raw.lastDashed) : state.lastDashed,
        lastSlash: raw.lastSlash !== undefined ? Boolean(raw.lastSlash) : state.lastSlash,
        lastCustomTextColor: raw.lastCustomTextColor || state.lastCustomTextColor,
        lastUnderlineColor: raw.lastUnderlineColor || state.lastUnderlineColor,
        lastBorderColor: raw.lastBorderColor || state.lastBorderColor,
        lastCustomCategory: typeof raw.lastCustomCategory === 'string' ? raw.lastCustomCategory : state.lastCustomCategory,
        customCategories: Array.isArray(raw.customCategories) ? raw.customCategories : state.customCategories,
        inputCollapsed: typeof raw.inputCollapsed === 'boolean' ? raw.inputCollapsed : true,
        readerWidth: clampReaderWidth(raw.readerWidth ?? DEFAULT_READER_WIDTH),
        readerFontSize: typeof raw.readerFontSize === 'number' ? raw.readerFontSize : 16,
        readerLineHeight: typeof raw.readerLineHeight === 'number' ? raw.readerLineHeight : 1.6,
        theme: typeof raw.theme === 'string' ? raw.theme : 'light',
        annotationTemplates: Array.isArray(raw.annotationTemplates) ? raw.annotationTemplates : [],
        aiConfig: raw.aiConfig && typeof raw.aiConfig === 'object' ? {
            apiKey: typeof raw.aiConfig.apiKey === 'string' ? raw.aiConfig.apiKey : '',
            apiEndpoint: typeof raw.aiConfig.apiEndpoint === 'string' ? raw.aiConfig.apiEndpoint : 'https://api.openai.com/v1/chat/completions',
            model: typeof raw.aiConfig.model === 'string' ? raw.aiConfig.model : 'gpt-3.5-turbo',
            customModel: typeof raw.aiConfig.customModel === 'string' ? raw.aiConfig.customModel : '',
            autoApply: typeof raw.aiConfig.autoApply === 'boolean' ? raw.aiConfig.autoApply : true,
            analyzeSelection: typeof raw.aiConfig.analyzeSelection === 'boolean' ? raw.aiConfig.analyzeSelection : false
        } : state.aiConfig,
        vocabBook: Array.isArray(raw.vocabBook) ? raw.vocabBook : [],
        activeDocumentId: typeof raw.activeDocumentId === 'string' ? raw.activeDocumentId : null,
        gistConfig: sanitizeGistConfig(raw.gistConfig),
        documents
    };
}

function sanitizeGistConfig(raw) {
    if (!raw || typeof raw !== 'object') {
        return {
            token: '',
            gistId: '',
            filename: 'reading-annotator.json',
            autoSync: false,
            lastSyncAt: null,
            status: 'idle'
        };
    }

    const filename = typeof raw.filename === 'string' && raw.filename.trim()
        ? raw.filename.trim()
        : 'reading-annotator.json';

    return {
        token: typeof raw.token === 'string' ? raw.token.trim() : '',
        gistId: typeof raw.gistId === 'string' ? raw.gistId.trim() : '',
        filename,
        autoSync: Boolean(raw.autoSync),
        lastSyncAt: typeof raw.lastSyncAt === 'string' ? raw.lastSyncAt : null,
        status: typeof raw.status === 'string' ? raw.status : 'idle'
    };
}

function sanitizeDocumentRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const content = typeof raw.content === 'string' ? raw.content : '';
    const annotations = Array.isArray(raw.annotations)
        ? raw.annotations.map(sanitizeAnnotationRecord).filter(Boolean)
        : [];

    const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
    const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt;

    return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : generateDocumentId(),
        title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : generateDocumentTitle(content),
        content,
        annotations,
        createdAt,
        updatedAt
    };
}

function sanitizeAnnotationRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const text = typeof raw.text === 'string' ? raw.text : '';
    const category = typeof raw.category === 'string' ? raw.category : '';
    if (!text || !category) return null;

    const record = {
        id: typeof raw.id === 'string' && raw.id ? raw.id : generateId(),
        text,
        category,
        customCategory: typeof raw.customCategory === 'string' ? raw.customCategory : '',
        color: raw.color === null ? null : (typeof raw.color === 'string' && HIGHLIGHT_COLORS.has(raw.color) ? raw.color : null),
        underline: Boolean(raw.underline),
        bold: Boolean(raw.bold),
        strikethrough: Boolean(raw.strikethrough),
        borderStyle: typeof raw.borderStyle === 'string' ? raw.borderStyle : 'none',
        emoji: typeof raw.emoji === 'string' ? raw.emoji : '',
        showNoteBelow: Boolean(raw.showNoteBelow),
        customBgColor: typeof raw.customBgColor === 'string' ? raw.customBgColor : '',
        fontFamily: typeof raw.fontFamily === 'string' ? raw.fontFamily : '',
        underlineOnly: Boolean(raw.underlineOnly),
        textColor: typeof raw.textColor === 'string' ? raw.textColor : 'default',
        fontSize: typeof raw.fontSize === 'string' ? raw.fontSize : 'medium',
        dashed: Boolean(raw.dashed),
        slash: Boolean(raw.slash),
        customTextColor: raw.customTextColor || null,
        underlineColor: raw.underlineColor || null,
        borderColor: raw.borderColor || null,
        note: typeof raw.note === 'string' ? raw.note : '',
        tags: Array.isArray(raw.tags) ? raw.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
    };

    if (raw.updatedAt && typeof raw.updatedAt === 'string') {
        record.updatedAt = raw.updatedAt;
    }

    if (raw.linkedTo) {
        record.linkedTo = raw.linkedTo;
    }

    if (Array.isArray(raw.linkedAnnotations)) {
        record.linkedAnnotations = raw.linkedAnnotations;
    }

    return record;
}

function buildPersistedPayload() {
    return {
        version: 1,
        autoSync: state.autoSync,
        lastCategory: state.lastCategory,
        lastColor: state.lastColor,
        lastUnderline: state.lastUnderline,
        lastBold: state.lastBold,
        lastStrikethrough: state.lastStrikethrough,
        lastBorderStyle: state.lastBorderStyle,
        lastEmoji: state.lastEmoji,
        lastDashed: state.lastDashed,
        lastSlash: state.lastSlash,
        lastCustomTextColor: state.lastCustomTextColor,
        lastUnderlineColor: state.lastUnderlineColor,
        lastBorderColor: state.lastBorderColor,
        lastCustomCategory: state.lastCustomCategory,
        customCategories: state.customCategories,
        inputCollapsed: state.inputCollapsed,
        readerWidth: state.readerWidth,
        readerFontSize: state.readerFontSize,
        readerLineHeight: state.readerLineHeight,
        theme: state.theme,
        annotationTemplates: state.annotationTemplates,
        aiConfig: state.aiConfig,
        vocabBook: state.vocabBook,
        activeDocumentId: state.activeDocumentId,
        gistConfig: sanitizeGistConfig(state.gistConfig),
        documents: state.documents.map(doc => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            annotations: doc.annotations.map(record => ({
                id: record.id,
                text: record.text,
                category: record.category,
                customCategory: record.customCategory,
                color: record.color,
                underline: record.underline,
                bold: record.bold,
                strikethrough: record.strikethrough,
                borderStyle: record.borderStyle,
                emoji: record.emoji,
                showNoteBelow: record.showNoteBelow,
                customBgColor: record.customBgColor,
                fontFamily: record.fontFamily,
                underlineOnly: record.underlineOnly,
                textColor: record.textColor,
                fontSize: record.fontSize,
                dashed: record.dashed,
                slash: record.slash,
                customTextColor: record.customTextColor,
                underlineColor: record.underlineColor,
                borderColor: record.borderColor,
                note: record.note,
                tags: [...record.tags],
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
                linkedTo: record.linkedTo,
                linkedAnnotations: record.linkedAnnotations
            }))
        }))
    };
}

function persistState() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    try {
        const payload = buildPersistedPayload();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        maybeQueueGistAutoSync();
    } catch (error) {
        console.warn('无法写入本地缓存：', error);
    }
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    persistState();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    if (dom.themeToggleBtn) {
        const icon = dom.themeToggleBtn.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = state.theme === 'light' ? '🌙' : '☀️';
        }
    }
}

// 标注模板功能
function saveAnnotationTemplate() {
    const templateName = prompt('请输入模板名称：', `模板${state.annotationTemplates.length + 1}`);
    if (!templateName) return;

    const template = {
        id: `tmpl-${Date.now()}`,
        name: templateName,
        category: state.lastCategory,
        customCategory: state.lastCustomCategory,
        color: state.lastColor,
        underline: state.lastUnderline,
        bold: state.lastBold,
        strikethrough: state.lastStrikethrough,
        borderStyle: state.lastBorderStyle,
        emoji: state.lastEmoji,
        showNoteBelow: state.lastShowNoteBelow,
        customBgColor: state.lastCustomBgColor,
        fontFamily: state.lastFontFamily,
        underlineOnly: state.lastUnderlineOnly,
        textColor: state.lastTextColor,
        fontSize: state.lastFontSize,
        createdAt: new Date().toISOString()
    };

    state.annotationTemplates.push(template);
    persistState();

    alert(`模板 "${templateName}" 已保存！\n当前共有 ${state.annotationTemplates.length} 个模板。`);
}

function loadAnnotationTemplate() {
    if (state.annotationTemplates.length === 0) {
        alert('暂无已保存的模板。请先保存一个模板。');
        return;
    }

    // 构建模板选择列表
    let message = '请选择要加载的模板（输入序号）：\n\n';
    state.annotationTemplates.forEach((tmpl, index) => {
        const catLabel = tmpl.category === 'custom' ? tmpl.customCategory : (CATEGORY_LABELS[tmpl.category] || tmpl.category);
        message += `${index + 1}. ${tmpl.name} (${catLabel})\n`;
    });
    message += `\n输入 0 删除所有模板`;

    const choice = prompt(message);
    if (!choice) return;

    const index = parseInt(choice) - 1;

    if (choice === '0') {
        if (confirm('确定要删除所有模板吗？')) {
            state.annotationTemplates = [];
            persistState();
            alert('所有模板已删除。');
        }
        return;
    }

    if (index < 0 || index >= state.annotationTemplates.length) {
        alert('无效的选择！');
        return;
    }

    const template = state.annotationTemplates[index];

    // 应用模板
    state.lastCategory = template.category;
    state.lastCustomCategory = template.customCategory || '';
    state.lastColor = template.color;
    state.lastUnderline = template.underline;
    state.lastBold = template.bold;
    state.lastStrikethrough = template.strikethrough;
    state.lastBorderStyle = template.borderStyle || 'none';
    state.lastEmoji = template.emoji || '';
    state.lastShowNoteBelow = template.showNoteBelow || false;
    state.lastCustomBgColor = template.customBgColor || '';
    state.lastFontFamily = template.fontFamily || '';
    state.lastUnderlineOnly = template.underlineOnly || false;
    state.lastTextColor = template.textColor || 'default';
    state.lastFontSize = template.fontSize || 'medium';

    // 更新UI
    updateFormFromState();
    alert(`已加载模板 "${template.name}"！`);
}

function updateFormFromState() {
    // 更新类别按钮
    document.querySelectorAll('.category-buttons button[data-category]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === state.lastCategory);
    });

    // 更新颜色
    document.querySelectorAll('.color-palette button[data-color]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === state.lastColor);
    });

    // 更新复选框
    if (dom.boldToggle) dom.boldToggle.checked = state.lastBold;
    if (dom.underlineToggle) dom.underlineToggle.checked = state.lastUnderline;
    if (dom.strikethroughToggle) dom.strikethroughToggle.checked = state.lastStrikethrough;
    if (dom.showNoteBelow) dom.showNoteBelow.checked = state.lastShowNoteBelow;

    // 更新边框样式
    if (dom.borderStyleButtons) {
        dom.borderStyleButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.border === state.lastBorderStyle);
        });
    }

    // 更新Emoji
    if (dom.emojiButtons) {
        dom.emojiButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.emoji === state.lastEmoji);
        });
    }

    // 更新自定义背景颜色
    if (dom.customBgColor) dom.customBgColor.value = state.lastCustomBgColor || '#ffffff';

    // 更新字体
    if (dom.fontFamilySelect) dom.fontFamilySelect.value = state.lastFontFamily || '';

    updateLivePreview();
}

// 键盘导航标注功能
function handleAnnotationNavigation(event) {
    // 只在阅读区域有焦点或没有输入框焦点时才处理
    const target = event.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
    }

    const highlights = Array.from(dom.readingArea.querySelectorAll('.highlight'));
    if (highlights.length === 0) return;

    let shouldNavigate = false;
    let newIndex = state.currentHighlightIndex;

    switch(event.key) {
        case 'ArrowDown':
        case 'j': // Vim风格
            event.preventDefault();
            newIndex = (state.currentHighlightIndex + 1) % highlights.length;
            shouldNavigate = true;
            break;
        case 'ArrowUp':
        case 'k': // Vim风格
            event.preventDefault();
            newIndex = state.currentHighlightIndex - 1;
            if (newIndex < 0) newIndex = highlights.length - 1;
            shouldNavigate = true;
            break;
        case 'Home':
            event.preventDefault();
            newIndex = 0;
            shouldNavigate = true;
            break;
        case 'End':
            event.preventDefault();
            newIndex = highlights.length - 1;
            shouldNavigate = true;
            break;
    }

    if (shouldNavigate) {
        state.currentHighlightIndex = newIndex;
        const targetHighlight = highlights[newIndex];
        targetHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetHighlight.classList.add('pulse');
        setTimeout(() => targetHighlight.classList.remove('pulse'), 1200);
    }
}

// 批量操作功能
function toggleBatchMode(enable) {
    state.batchMode = enable;
    state.selectedAnnotations.clear();

    if (dom.batchOperations) {
        dom.batchOperations.style.display = enable ? 'flex' : 'none';
    }
    if (dom.enterBatchModeBtn) {
        dom.enterBatchModeBtn.style.display = enable ? 'none' : 'inline-block';
    }

    renderAnnotationList();
}

function selectAllAnnotations() {
    const filtered = getFilteredAnnotations();
    filtered.forEach(item => state.selectedAnnotations.add(item.id));
    renderAnnotationList();
}

function deselectAllAnnotations() {
    state.selectedAnnotations.clear();
    renderAnnotationList();
}

function batchDeleteAnnotations() {
    if (state.selectedAnnotations.size === 0) {
        alert('请先选择要删除的标注');
        return;
    }

    if (!confirm(`确定要删除选中的 ${state.selectedAnnotations.size} 条标注吗？`)) {
        return;
    }

    // 过滤掉子标注：如果子标注的主标注也被选中，则只删除主标注即可
    const idsToDelete = Array.from(state.selectedAnnotations).filter(id => {
        const record = state.annotations.find(item => item.id === id);
        if (!record) return false;

        // 如果这是子标注，检查其主标注是否也被选中
        if (record.linkedTo) {
            // 如果主标注也被选中，跳过这个子标注（主标注会自动删除它）
            if (state.selectedAnnotations.has(record.linkedTo)) {
                console.log('[DEBUG] 🔗 跳过子标注（主标注已选中）', {
                    childId: id,
                    parentId: record.linkedTo
                });
                return false;
            }
        }

        return true;
    });

    console.log('[DEBUG] 🗑️ 批量删除', {
        selected: state.selectedAnnotations.size,
        actualDelete: idsToDelete.length
    });

    // 在删除前，先清理所有主标注的linkedAnnotations引用
    // 这样可以避免删除子标注时主标注的linkedAnnotations数组残留无效ID
    const idsToDeleteSet = new Set(idsToDelete);

    state.annotations.forEach(annotation => {
        if (annotation.linkedAnnotations && annotation.linkedAnnotations.length > 0) {
            const originalLength = annotation.linkedAnnotations.length;
            // 移除被删除的子标注ID
            annotation.linkedAnnotations = annotation.linkedAnnotations.filter(
                linkedId => !idsToDeleteSet.has(linkedId)
            );

            if (annotation.linkedAnnotations.length < originalLength) {
                console.log('[DEBUG] 🔗 清理主标注的连接引用', {
                    parentId: annotation.id,
                    removed: originalLength - annotation.linkedAnnotations.length,
                    remaining: annotation.linkedAnnotations.length
                });
            }
        }
    });

    // 删除过滤后的标注
    idsToDelete.forEach(id => {
        deleteAnnotation(id);
    });

    state.selectedAnnotations.clear();
    renderAnnotationList();
}

function handleBatchColorChange(event) {
    const color = event.target.value;
    if (!color) return;

    if (state.selectedAnnotations.size === 0) {
        alert('请先选择要修改的标注');
        event.target.value = '';
        return;
    }

    state.selectedAnnotations.forEach(id => {
        const record = state.annotations.find(item => item.id === id);
        if (record) {
            record.color = color;
            const highlight = dom.readingArea.querySelector(`.highlight[data-id="${id}"]`);
            if (highlight) {
                highlight.dataset.color = color;
            }
        }
    });

    event.target.value = '';
    renderAnnotationList();
    persistState();
}

function handleAnnotationCheckboxChange(event) {
    const checkbox = event.target;
    const id = checkbox.value;

    if (checkbox.checked) {
        state.selectedAnnotations.add(id);
    } else {
        state.selectedAnnotations.delete(id);
    }
}

// 撤销/重做功能
function saveHistory(action, data) {
    // 移除当前索引之后的所有历史记录
    state.history = state.history.slice(0, state.historyIndex + 1);

    // 添加新的历史记录
    state.history.push({
        action,
        data: JSON.parse(JSON.stringify(data)),
        timestamp: Date.now()
    });

    // 限制历史记录大小
    if (state.history.length > state.maxHistorySize) {
        state.history.shift();
    } else {
        state.historyIndex++;
    }

    updateUndoRedoButtons();
}

function undo() {
    if (state.historyIndex < 0) return;

    const historyItem = state.history[state.historyIndex];
    applyHistoryAction(historyItem, true);

    state.historyIndex--;
    updateUndoRedoButtons();
}

function redo() {
    if (state.historyIndex >= state.history.length - 1) return;

    state.historyIndex++;
    const historyItem = state.history[state.historyIndex];
    applyHistoryAction(historyItem, false);

    updateUndoRedoButtons();
}

function applyHistoryAction(historyItem, isUndo) {
    const { action, data } = historyItem;

    switch (action) {
        case 'create':
            if (isUndo) {
                // 撤销创建 = 删除
                deleteAnnotationDirect(data.id);
            } else {
                // 重做创建
                restoreAnnotation(data);
            }
            break;
        case 'update':
            if (isUndo) {
                // 撤销更新 = 恢复旧值
                restoreAnnotation(data.oldValue);
            } else {
                // 重做更新 = 应用新值
                restoreAnnotation(data.newValue);
            }
            break;
        case 'delete':
            if (isUndo) {
                // 撤销删除 = 恢复所有被删除的标注
                // 兼容旧格式：如果data.mainRecord不存在，说明是旧格式
                if (data.mainRecord) {
                    restoreDeletedAnnotations(data);
                } else {
                    // 旧格式：直接恢复单个标注
                    restoreAnnotation(data);
                }
            } else {
                // 重做删除
                if (data.mainRecord) {
                    redoDelete(data);
                } else {
                    // 旧格式：直接删除
                    deleteAnnotationDirect(data.id);
                }
            }
            break;
        case 'clearAll':
            if (isUndo) {
                // 撤销清除 = 恢复所有标注
                restoreAllAnnotations(data);
            } else {
                // 重做清除 = 再次清除所有
                redoClearAll();
            }
            break;
    }
}

function deleteAnnotationDirect(id) {
    const index = state.annotations.findIndex(item => item.id === id);
    if (index === -1) return;

    const record = state.annotations[index];

    // 如果是主标注，同时删除所有连接的子标注
    if (record.linkedAnnotations && record.linkedAnnotations.length > 0) {
        record.linkedAnnotations.forEach(linkedId => {
            const linkedHighlight = dom.readingArea.querySelector(`.highlight[data-id="${linkedId}"]`);
            if (linkedHighlight) {
                const parent = linkedHighlight.parentNode;
                while (linkedHighlight.firstChild) {
                    parent.insertBefore(linkedHighlight.firstChild, linkedHighlight);
                }
                parent.removeChild(linkedHighlight);
                parent.normalize();
            }

            const linkedIndex = state.annotations.findIndex(item => item.id === linkedId);
            if (linkedIndex !== -1) {
                state.annotations.splice(linkedIndex, 1);
            }
        });
    }

    // 如果是子标注，从主标注的 linkedAnnotations 中移除
    if (record.linkedTo) {
        const parentRecord = state.annotations.find(item => item.id === record.linkedTo);
        if (parentRecord && parentRecord.linkedAnnotations) {
            const linkIndex = parentRecord.linkedAnnotations.indexOf(id);
            if (linkIndex !== -1) {
                parentRecord.linkedAnnotations.splice(linkIndex, 1);
            }
        }
    }

    // 删除主标注的所有DOM片段（可能有多个，如换行标注）
    const highlights = dom.readingArea.querySelectorAll(`.highlight[data-id="${id}"]`);
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        while (highlight.firstChild) {
            parent.insertBefore(highlight.firstChild, highlight);
        }
        parent.removeChild(highlight);
        parent.normalize();
    });

    // 删除主标注
    state.annotations.splice(index, 1);

    // 清理空的 highlight 元素
    cleanEmptyHighlights();
}

// 清理所有空的 highlight 元素
function cleanEmptyHighlights() {
    const allHighlights = dom.readingArea.querySelectorAll('.highlight');
    allHighlights.forEach(highlight => {
        // 检查是否为空（没有文本内容）
        if (!highlight.textContent || highlight.textContent.trim() === '') {
            const parent = highlight.parentNode;
            if (parent) {
                parent.removeChild(highlight);
                parent.normalize();
            }
        }
    });
}

function renderAllHighlights() {
    // 清除所有现有的高亮
    const existingHighlights = dom.readingArea.querySelectorAll('.highlight');
    existingHighlights.forEach(highlight => {
        const parent = highlight.parentNode;
        if (parent) {
            while (highlight.firstChild) {
                parent.insertBefore(highlight.firstChild, highlight);
            }
            parent.removeChild(highlight);
            parent.normalize();
        }
    });

    // 跟踪失败的标注
    const failedAnnotations = [];
    const successCount = { applied: 0, failed: 0 };

    // 重新应用所有标注
    state.annotations.forEach(record => {
        const range = findRangeForText(record.text);
        if (range) {
            const success = applyHighlight(range, record);
            if (success) {
                successCount.applied++;
                delete record._notApplied; // 清除失败标记
            } else {
                successCount.failed++;
                record._notApplied = true;
                failedAnnotations.push({
                    id: record.id,
                    text: record.text.substring(0, 30),
                    reason: 'applyHighlight返回false'
                });
            }
        } else {
            successCount.failed++;
            record._notApplied = true;
            failedAnnotations.push({
                id: record.id,
                text: record.text.substring(0, 30),
                reason: '文本在当前文档中未找到'
            });
        }
    });

    // 如果有失败的标注，记录日志并可选地提示用户
    if (failedAnnotations.length > 0) {
        console.warn('[renderAllHighlights] ⚠️ 部分标注无法应用到DOM:', {
            total: state.annotations.length,
            success: successCount.applied,
            failed: successCount.failed,
            failedList: failedAnnotations
        });

        // 如果失败数量较多，提示用户
        if (failedAnnotations.length > 5 || failedAnnotations.length > state.annotations.length * 0.2) {
            console.warn('[renderAllHighlights] 失败比例较高，建议检查文档内容是否已改变');

            // 可选：在控制台显示详细信息，不打扰用户
            // 用户可以通过标注列表看到哪些标注有问题（可以添加视觉标记）
        }
    } else {
        console.log('[renderAllHighlights] ✅ 所有标注已成功应用', {
            count: successCount.applied
        });
    }

    // 清理空的 highlight 元素
    cleanEmptyHighlights();
}

function restoreAnnotation(record) {
    // 先删除同ID的标注（如果存在）
    const existingIndex = state.annotations.findIndex(item => item.id === record.id);
    if (existingIndex !== -1) {
        state.annotations.splice(existingIndex, 1);
    }

    // 添加标注到数组
    state.annotations.push(record);

    // 重新渲染阅读区
    const activeDocument = getActiveDocument();
    if (activeDocument) {
        loadTextIntoReader(activeDocument.content);
        renderAllHighlights();
    }

    renderAnnotationList();
    persistState();
}

// 恢复被删除的标注（包括连接关系）
function restoreDeletedAnnotations(data) {
    console.log('[DEBUG] ↩️ 撤销删除，恢复标注', data);

    const activeDocument = getActiveDocument();
    if (!activeDocument) return;

    // 收集所有要恢复的标注及其索引位置
    const recordsToRestore = [];

    // 情况1：恢复主标注及其所有子标注
    if (data.linkedRecords && data.linkedRecords.length > 0) {
        // 收集所有子标注及其索引
        data.linkedRecords.forEach(linkedRecord => {
            const existingIndex = state.annotations.findIndex(item => item.id === linkedRecord.id);
            if (existingIndex === -1) {
                const originalIndex = data.linkedIndices?.[linkedRecord.id] ?? state.annotations.length;
                recordsToRestore.push({ record: linkedRecord, index: originalIndex });
            }
        });

        // 收集主标注及其索引
        const mainExists = state.annotations.findIndex(item => item.id === data.mainRecord.id);
        if (mainExists === -1) {
            const originalIndex = data.mainIndex ?? state.annotations.length;
            recordsToRestore.push({ record: data.mainRecord, index: originalIndex });
        }

        console.log('[DEBUG] ✅ 准备恢复主标注及其子标注', {
            mainId: data.mainRecord.id,
            linkedCount: data.linkedRecords.length,
            recordsToRestore: recordsToRestore.length
        });
    }
    // 情况2：恢复子标注，并更新主标注的引用
    else if (data.parentRecord) {
        // 恢复子标注
        const childIndex = state.annotations.findIndex(item => item.id === data.mainRecord.id);
        if (childIndex === -1) {
            const originalIndex = data.mainIndex ?? state.annotations.length;
            recordsToRestore.push({ record: data.mainRecord, index: originalIndex });
        }

        // 恢复主标注的 linkedAnnotations 数组
        const parentIndex = state.annotations.findIndex(item => item.id === data.parentRecord.id);
        if (parentIndex !== -1) {
            state.annotations[parentIndex].linkedAnnotations = [...data.parentRecord.linkedAnnotations];
        } else {
            console.warn('[DEBUG] ⚠️ 主标注未找到，无法恢复linkedAnnotations引用', {
                parentId: data.parentRecord.id
            });
        }

        console.log('[DEBUG] ✅ 恢复子标注并更新主标注引用', {
            childId: data.mainRecord.id,
            parentId: data.parentRecord.id
        });
    }
    // 情况3：普通标注（无连接关系）
    else {
        const index = state.annotations.findIndex(item => item.id === data.mainRecord.id);
        if (index === -1) {
            const originalIndex = data.mainIndex ?? state.annotations.length;
            recordsToRestore.push({ record: data.mainRecord, index: originalIndex });
        }
    }

    // 按索引位置排序，确保恢复顺序正确
    recordsToRestore.sort((a, b) => a.index - b.index);

    // 依次插入标注到正确的索引位置
    recordsToRestore.forEach(({ record, index }) => {
        // 确保索引不超出范围
        const insertIndex = Math.min(index, state.annotations.length);
        state.annotations.splice(insertIndex, 0, record);
        console.log('[DEBUG] 📍 插入标注到索引', {
            id: record.id,
            text: record.text.substring(0, 20),
            index: insertIndex
        });
    });

    // 重新渲染
    loadTextIntoReader(activeDocument.content);
    renderAllHighlights();
    renderAnnotationList();
    persistState();
}

// 重做删除操作
function redoDelete(data) {
    console.log('[DEBUG] ↪️ 重做删除', data);

    // deleteAnnotationDirect 会自动处理连接关系
    // 所以只需要删除主标注即可
    deleteAnnotationDirect(data.mainRecord.id);

    renderAnnotationList();
    persistState();
}

// 恢复所有标注（撤销清除所有操作）
function restoreAllAnnotations(allAnnotations) {
    console.log('[DEBUG] ↩️ 撤销清除，恢复所有标注', { count: allAnnotations.length });

    const activeDocument = getActiveDocument();
    if (!activeDocument) return;

    // 恢复所有标注到 state
    state.annotations = JSON.parse(JSON.stringify(allAnnotations));

    // 重新渲染阅读区域并显示所有高亮
    loadTextIntoReader(activeDocument.content);
    renderAllHighlights();
    renderAnnotationList();
    persistState();

    showToast(`已恢复 ${allAnnotations.length} 条标注`, 'success');
}

// 重做清除所有标注
function redoClearAll() {
    console.log('[DEBUG] ↪️ 重做清除所有标注');

    // 清除DOM中的高亮
    const highlights = dom.readingArea.querySelectorAll('.highlight');
    highlights.forEach(node => {
        const parent = node.parentNode;
        if (!parent) return;
        while (node.firstChild) {
            parent.insertBefore(node.firstChild, node);
        }
        parent.removeChild(node);
        parent.normalize();
    });

    // 清除状态
    clearAnnotationsState();
    renderAnnotationList();
    persistState();

    showToast('已清除所有标注', 'success');
}

function updateUndoRedoButtons() {
    if (dom.undoBtn) {
        dom.undoBtn.disabled = state.historyIndex < 0;
    }
    if (dom.redoBtn) {
        dom.redoBtn.disabled = state.historyIndex >= state.history.length - 1;
    }
}

function renderDocumentList() {
    if (!dom.documentList) return;

    dom.documentList.innerHTML = '';
    if (!state.documents.length) {
        updateDocumentEmptyState();
        return;
    }

    const fragment = document.createDocumentFragment();
    state.documents.forEach(doc => {
        fragment.appendChild(createDocumentListItem(doc));
    });
    dom.documentList.appendChild(fragment);
    updateDocumentEmptyState();
}

function createDocumentListItem(doc) {
    const item = document.createElement('li');
    item.className = 'document-item';
    item.dataset.id = doc.id;
    if (doc.id === state.activeDocumentId) {
        item.classList.add('active');
    }

    const titleButton = document.createElement('button');
    titleButton.type = 'button';
    titleButton.className = 'document-item__title';
    titleButton.dataset.action = 'activate';
    titleButton.textContent = doc.title;

    const meta = document.createElement('span');
    meta.className = 'document-item__meta';
    meta.textContent = formatDocumentMeta(doc);

    const actions = document.createElement('div');
    actions.className = 'document-item__actions';

    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.dataset.action = 'rename';
    renameBtn.textContent = '重命名';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.textContent = '删除';

    actions.append(renameBtn, deleteBtn);
    item.append(titleButton, meta, actions);
    return item;
}

function formatDocumentMeta(doc) {
    const count = doc.annotations.length;
    const timestamp = doc.updatedAt || doc.createdAt;
    const label = `${count} 条标注`;
    if (!timestamp) return label;
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) return label;
    return `${label} · 更新 ${formatSummaryTimestamp(parsed)}`;
}

function updateDocumentEmptyState() {
    if (!dom.documentEmptyState) return;
    dom.documentEmptyState.classList.toggle('hidden', state.documents.length > 0);
}

function handleDocumentListClick(event) {
    const target = event.target;
    const item = target.closest('.document-item');
    if (!item) return;
    const docId = item.dataset.id;
    if (!docId) return;

    const action = target.dataset.action || 'activate';
    if (action === 'activate') {
        if (docId !== state.activeDocumentId) {
            setActiveDocument(docId);
        }
        return;
    }

    if (action === 'rename') {
        const doc = state.documents.find(record => record.id === docId);
        if (!doc) return;
        const nextTitle = window.prompt('请输入新的短文名称：', doc.title);
        if (nextTitle === null) return;
        const trimmed = nextTitle.trim();
        if (!trimmed) {
            alert('名称不能为空。');
            return;
        }
        doc.title = trimmed;
        doc.updatedAt = new Date().toISOString();
        renderDocumentList();
        persistState();
        return;
    }

    if (action === 'delete') {
        const confirmed = window.confirm('删除后将无法恢复该短文及其标注，确认继续？');
        if (!confirmed) return;
        const index = state.documents.findIndex(record => record.id === docId);
        if (index === -1) return;
        state.documents.splice(index, 1);
        if (state.activeDocumentId === docId) {
            if (state.documents.length) {
                const fallback = state.documents[Math.max(0, index - 1)];
                setActiveDocument(fallback.id, { skipPersist: true });
            } else {
                state.activeDocumentId = null;
                state.annotations = [];
                if (dom.readingArea) {
                    dom.readingArea.innerHTML = '<p class="placeholder">请粘贴短文后开始标注。</p>';
                }
                renderAnnotationList();
                updateAnnotationSummary();
            }
        } else {
            renderAnnotationList();
        }
        renderDocumentList();
        updateDocumentEmptyState();
        persistState();
    }
}

function setActiveDocument(documentId, options = {}) {
    const { skipPersist = false, restoreScroll = false } = options;
    const doc = state.documents.find(record => record.id === documentId);

    if (!doc) {
        console.error('Document not found:', {
            requestedId: documentId,
            availableDocuments: state.documents.map(d => ({ id: d.id, title: d.title }))
        });

        if (dom.readingArea) {
            dom.readingArea.innerHTML = '<p class="placeholder" style="color: #dc2626;">未找到指定的文档。<br><a href="input.html" style="color: var(--primary); text-decoration: underline;">返回输入页面</a></p>';
        }
        return;
    }

    state.activeDocumentId = doc.id;
    state.annotations = doc.annotations || [];

    renderActiveDocument(doc, { restoreScroll });
    renderDocumentList();
    renderAnnotationList();

    if (!skipPersist) {
        persistState();
    }
}

function getActiveDocument() {
    if (!state.activeDocumentId) return null;
    return state.documents.find(doc => doc.id === state.activeDocumentId) || null;
}

function renderActiveDocument(doc, options = {}) {
    renderSourceIntoReader(doc.content);
    hydrateActiveAnnotations(doc);
    if (!options.restoreScroll && dom.readingArea) {
        dom.readingArea.scrollTop = 0;
    }
}

function hydrateActiveAnnotations(doc) {
    if (!dom.readingArea || !Array.isArray(doc.annotations)) return;

    // 跟踪已使用的文本位置，避免重复标注同一位置
    const usedRanges = [];

    doc.annotations.forEach(record => {
        const range = findRangeForText(record.text, usedRanges);
        if (range) {
            applyHighlight(range, record);
            // 记录已使用的range，避免重复
            usedRanges.push({
                node: range.startContainer,
                startOffset: range.startOffset,
                endOffset: range.endOffset
            });
        } else {
            console.warn('[DEBUG] ⚠️ 无法恢复标注:', {
                text: record.text.substring(0, 50) + (record.text.length > 50 ? '...' : ''),
                id: record.id,
                category: record.category
            });
        }
    });
}

function createDocumentFromInput(rawText) {
    if (typeof rawText !== 'string') return null;
    const normalized = rawText.replace(/\r\n/g, '\n').trim();
    if (!normalized) return null;

    const timestamp = new Date().toISOString();
    return {
        id: generateDocumentId(),
        title: generateDocumentTitle(normalized),
        content: normalized,
        annotations: [],
        createdAt: timestamp,
        updatedAt: timestamp
    };
}

function generateDocumentTitle(rawText) {
    const condensed = rawText.replace(/\s+/g, ' ').trim();
    if (!condensed) {
        return `短文 ${state.documents.length + 1}`;
    }
    return condensed.length > 36 ? `${condensed.slice(0, 36)}…` : condensed;
}

function handleReaderWidthInput(event) {
    const value = clampReaderWidth(event.target.value);
    state.readerWidth = value;
    applyReaderWidth(value);
    updateReaderWidthValue(value);
}

function handleReaderWidthCommit() {
    persistState();
}

function handleReaderFontSizeInput(event) {
    const value = Number.parseInt(event.target.value, 10);
    state.readerFontSize = value;
    applyReaderFontSize(value);
    updateReaderFontSizeValue(value);
    persistState();
}

function handleReaderLineHeightInput(event) {
    const value = Number.parseFloat(event.target.value);
    state.readerLineHeight = value;
    applyReaderLineHeight(value);
    updateReaderLineHeightValue(value);
    persistState();
}

function applyReaderFontSize(size) {
    if (dom.readingArea) {
        dom.readingArea.style.fontSize = `${size}px`;
    }
}

function applyReaderLineHeight(height) {
    if (dom.readingArea) {
        dom.readingArea.style.lineHeight = height;
    }
}

function updateReaderFontSizeValue(size) {
    if (dom.readerFontSizeValue) {
        dom.readerFontSizeValue.textContent = `${size}px`;
    }
}

function updateReaderLineHeightValue(height) {
    if (dom.readerLineHeightValue) {
        dom.readerLineHeightValue.textContent = height.toFixed(1);
    }
}

function clampReaderWidth(value) {
    const numeric = Number.parseInt(value, 10);
    if (Number.isNaN(numeric)) return DEFAULT_READER_WIDTH;
    return Math.min(MAX_READER_WIDTH, Math.max(MIN_READER_WIDTH, numeric));
}

function applyReaderWidth(value) {
    const reader = clampReaderWidth(value);
    const annotation = 100 - reader;
    const readerFr = (reader / 10).toFixed(1);
    const annotationFr = (annotation / 10).toFixed(1);

    document.documentElement.style.setProperty('--reader-column', `${readerFr}fr`);
    document.documentElement.style.setProperty('--annotation-column', `${annotationFr}fr`);
    document.documentElement.style.setProperty('--reader-column-collapsed', `${readerFr}fr`);
    document.documentElement.style.setProperty('--annotation-column-collapsed', `${annotationFr}fr`);
}

function updateReaderWidthValue(value) {
    if (dom.readerWidthValue) {
        dom.readerWidthValue.textContent = `${value}%`;
    }
    if (dom.readerWidthSlider && dom.readerWidthSlider.value !== String(value)) {
        dom.readerWidthSlider.value = String(value);
    }
}

function touchActiveDocument() {
    const doc = getActiveDocument();
    if (!doc) return null;
    doc.updatedAt = new Date().toISOString();
    return doc;
}

function loadDataFromPayload(payload, options = {}) {
    const data = sanitizePersistedData(payload);
    console.log('loadDataFromPayload:', {
        documents: data.documents?.length || 0,
        documentIds: data.documents?.map(d => d.id) || [],
        activeDocumentId: data.activeDocumentId
    });

    state.autoSync = data.autoSync;
    state.lastCategory = data.lastCategory;
    state.lastColor = data.lastColor;
    state.lastUnderline = data.lastUnderline;
    state.lastBold = data.lastBold ?? false;
    state.lastStrikethrough = data.lastStrikethrough ?? false;
    state.lastBorderStyle = data.lastBorderStyle ?? 'none';
    state.lastEmoji = data.lastEmoji ?? '';
    state.lastDashed = data.lastDashed ?? false;
    state.lastSlash = data.lastSlash ?? false;
    state.lastCustomTextColor = data.lastCustomTextColor ?? null;
    state.lastUnderlineColor = data.lastUnderlineColor ?? null;
    state.lastBorderColor = data.lastBorderColor ?? null;
    state.lastCustomCategory = data.lastCustomCategory ?? '';
    state.customCategories = data.customCategories ?? state.customCategories;
    state.inputCollapsed = data.inputCollapsed;
    state.readerWidth = data.readerWidth;
    state.readerFontSize = data.readerFontSize ?? 16;
    state.readerLineHeight = data.readerLineHeight ?? 1.6;
    state.theme = data.theme ?? 'light';
    state.annotationTemplates = data.annotationTemplates ?? [];
    state.aiConfig = data.aiConfig ?? state.aiConfig;
    state.gistConfig = sanitizeGistConfig(data.gistConfig);
    state.vocabBook = data.vocabBook ?? [];
    state.activeDocumentId = data.activeDocumentId;
    state.documents = data.documents;

    applyReaderWidth(state.readerWidth);
    updateReaderWidthValue(state.readerWidth);

    applyReaderFontSize(state.readerFontSize);
    updateReaderFontSizeValue(state.readerFontSize);
    if (dom.readerFontSizeSlider) {
        dom.readerFontSizeSlider.value = state.readerFontSize;
    }

    applyReaderLineHeight(state.readerLineHeight);
    updateReaderLineHeightValue(state.readerLineHeight);
    if (dom.readerLineHeightSlider) {
        dom.readerLineHeightSlider.value = state.readerLineHeight;
    }

    if (dom.autoSyncToggle) {
        dom.autoSyncToggle.checked = state.autoSync;
    }

    setInputPanelCollapsed(state.inputCollapsed, { skipFocus: true });
    renderDocumentList();
    updateDocumentEmptyState();

    // Skip auto-loading if this is reader page (will be handled by reader.html)
    if (!window.isReaderPage) {
        const activeDoc = state.documents.find(doc => doc.id === state.activeDocumentId) || state.documents[0];
        if (activeDoc) {
            setActiveDocument(activeDoc.id, { skipPersist: true });
        } else {
            state.activeDocumentId = null;
            state.annotations = [];
            if (dom.readingArea) {
                dom.readingArea.innerHTML = '<p class="placeholder">请粘贴短文后开始标注。</p>';
            }
            renderAnnotationList();
            updateAnnotationSummary();
        }
    }

    refreshGistSettingsUI();
    maybeQueueGistAutoSync();

    if (!options.skipPersist) {
        persistState();
    }
}

function openGistSettingsModal() {
    if (!dom.gistSettingsModal) return;
    refreshGistSettingsUI();
    dom.gistSettingsModal.classList.remove('hidden');
    if (dom.gistTokenInput) {
        setTimeout(() => dom.gistTokenInput.focus(), 50);
    }
}

function closeGistSettingsModal() {
    if (!dom.gistSettingsModal) return;
    dom.gistSettingsModal.classList.add('hidden');
}

function handleGistSettingsSave() {
    const token = dom.gistTokenInput ? dom.gistTokenInput.value.trim() : '';
    const gistId = dom.gistIdInput ? dom.gistIdInput.value.trim() : '';
    const filenameInput = dom.gistFilenameInput ? dom.gistFilenameInput.value.trim() : '';
    const filename = filenameInput || 'reading-annotator.json';
    const autoSync = dom.gistAutoSyncToggle ? dom.gistAutoSyncToggle.checked : false;

    const nextConfig = sanitizeGistConfig({
        token,
        gistId,
        filename,
        autoSync,
        lastSyncAt: state.gistConfig && state.gistConfig.lastSyncAt ? state.gistConfig.lastSyncAt : null,
        status: state.gistConfig && state.gistConfig.status ? state.gistConfig.status : 'idle'
    });
    nextConfig.status = autoSync ? 'idle' : nextConfig.status;

    state.gistConfig = nextConfig;
    if (!autoSync && gistAutoSyncTimer) {
        clearTimeout(gistAutoSyncTimer);
        gistAutoSyncTimer = null;
    }
    refreshGistSettingsUI();
    closeGistSettingsModal();


    gistAutoSyncSuspended = true;
    persistState();
    gistAutoSyncSuspended = false;
    if (state.gistConfig.autoSync) {
        maybeQueueGistAutoSync();
    }


    if (typeof showToast === 'function') {
        showToast('Gist 设置已保存', 'success');
    } else {
        alert('Gist 设置已保存');
    }
}

function handleGistAutoSyncToggle(event) {
    const enabled = Boolean(event && event.target ? event.target.checked : false);
    state.gistConfig = sanitizeGistConfig(Object.assign({}, state.gistConfig, { autoSync: enabled }));
    if (!enabled && gistAutoSyncTimer) {
        clearTimeout(gistAutoSyncTimer);
        gistAutoSyncTimer = null;
    }
    refreshGistSettingsUI();
    gistAutoSyncSuspended = true;
    persistState();
    gistAutoSyncSuspended = false;
    if (enabled) {
        maybeQueueGistAutoSync();
    }
}

function refreshGistSettingsUI() {
    state.gistConfig = sanitizeGistConfig(state.gistConfig);

    if (dom.gistTokenInput && document.activeElement !== dom.gistTokenInput) {
        dom.gistTokenInput.value = state.gistConfig.token || '';
    }
    if (dom.gistIdInput && document.activeElement !== dom.gistIdInput) {
        dom.gistIdInput.value = state.gistConfig.gistId || '';
    }
    if (dom.gistFilenameInput && document.activeElement !== dom.gistFilenameInput) {
        dom.gistFilenameInput.value = state.gistConfig.filename || 'reading-annotator.json';
    }
    if (dom.gistAutoSyncToggle) {
        dom.gistAutoSyncToggle.checked = Boolean(state.gistConfig.autoSync);
    }
    if (dom.gistStatusText) {
        const statusLabels = {
            syncing: '同步中',
            success: '已同步',
            error: '同步失败',
            idle: '未同步'
        };
        dom.gistStatusText.textContent = statusLabels[state.gistConfig.status] || '未同步';
    }
    if (dom.gistLastSyncValue) {
        dom.gistLastSyncValue.textContent = state.gistConfig.lastSyncAt ? formatGistTimestamp(state.gistConfig.lastSyncAt) : '尚无记录';
    }
}

function formatGistTimestamp(value) {
    if (!value) return '';
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString();
    } catch (error) {
        console.warn('[gist] 无法格式化时间', value, error);
        return value;
    }
}

function maybeQueueGistAutoSync() {
    if (gistAutoSyncSuspended) return;
    const config = sanitizeGistConfig(state.gistConfig);
    if (!config.autoSync || !config.token || !config.filename) {
        return;
    }
    if (gistSyncInFlight) return;
    if (gistAutoSyncTimer) {
        clearTimeout(gistAutoSyncTimer);
    }
    gistAutoSyncTimer = setTimeout(() => {
        gistAutoSyncTimer = null;
        syncDataToGist({ silent: true });
    }, GIST_SYNC_DEBOUNCE_MS);
}

async function syncDataToGist({ manual = false, silent = false } = {}) {
    const config = sanitizeGistConfig(state.gistConfig);
    if (!config.token) {
        if (!silent) {
            alert('请先在 Gist 设置中填写个人访问令牌 (PAT)。');
        }
        return;
    }

    if (typeof fetch !== 'function') {
        if (!silent) {
            alert('当前浏览器不支持 fetch，无法同步到 Gist。');
        }
        return;
    }

    if (gistSyncInFlight) {
        if (!silent && typeof showToast === 'function') {
            showToast('正在同步，请稍候…', 'info');
        }
        return;
    }

    if (gistAutoSyncTimer) {
        clearTimeout(gistAutoSyncTimer);
        gistAutoSyncTimer = null;
    }

    const filename = config.filename || 'reading-annotator.json';
    const payload = buildPersistedPayload();
    const timestamp = new Date().toISOString();
    payload.syncedAt = timestamp;

    const body = {
        description: 'Reading Annotator 数据同步',
        files: {
            [filename]: {
                content: JSON.stringify(payload, null, 2)
            }
        },
    };

    const isUpdate = Boolean(config.gistId);
    if (!isUpdate) {
        body.public = false;
    }
    const url = isUpdate ? `https://api.github.com/gists/${config.gistId}` : 'https://api.github.com/gists';
    const method = isUpdate ? 'PATCH' : 'POST';

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${config.token}`
    };

    gistSyncInFlight = true;
    state.gistConfig.status = 'syncing';
    refreshGistSettingsUI();

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gist API 返回错误：${response.status} ${errorText}`);
        }

        const data = await response.json();
        if (!isUpdate && data && typeof data.id === 'string') {
            state.gistConfig.gistId = data.id;
        }
        state.gistConfig.lastSyncAt = timestamp;
        state.gistConfig.status = 'success';

        if (manual && typeof showToast === 'function') {
            showToast('已同步到 Gist', 'success');
        }
    } catch (error) {
        console.error('[gist] 同步失败', error);
        state.gistConfig.status = 'error';
        if (!silent) {
            if (typeof showToast === 'function') {
                showToast('同步 Gist 失败，请检查网络和令牌设置', 'error');
            } else {
                alert('同步 Gist 失败，请检查网络和令牌设置');
            }
        }
    } finally {
        gistSyncInFlight = false;
        gistAutoSyncSuspended = true;
        persistState();
        gistAutoSyncSuspended = false;
        refreshGistSettingsUI();
    }
}

function exportDataBackup() {
    const payload = buildPersistedPayload();
    payload.generatedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[T:]/g, '-').split('.')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `reading-annotator-backup-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('备份文件已生成并下载。');
}

async function handleDataRestore(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file) return;

    try {
        const rawText = await readFileAsText(file);
        const parsed = JSON.parse(rawText);
        loadDataFromPayload(parsed);
        alert('数据恢复成功。');
    } catch (error) {
        console.error('恢复失败：', error);
        alert('数据恢复失败，请确认文件格式正确。');
    } finally {
        input.value = '';
    }
}

function submitAnnotation({ category, customCategory, color, underline, bold, strikethrough, borderStyle, emoji, showNoteBelow, customBgColor, fontFamily, underlineOnly, textColor, fontSize, note, tags, range, textOverride, dashed, slash, customTextColor, underlineColor, borderColor }) {
    const activeDocument = getActiveDocument();
    if (!activeDocument) {
        alert('请先创建或选择一篇短文。');
        return;
    }

    // 如果有预览高亮，先移除并获取范围
    let sourceRange = range || state.activeRange;
    let textToHighlight = textOverride;

    if (previewHighlight && previewHighlight.parentNode) {
        const parent = previewHighlight.parentNode;
        const textContent = previewHighlight.textContent;

        // 保存文本内容以便后续使用
        if (!textToHighlight) {
            textToHighlight = textContent;
        }

        // 创建新的范围
        const newRange = document.createRange();
        newRange.selectNodeContents(previewHighlight);

        // 移除预览元素
        while (previewHighlight.firstChild) {
            parent.insertBefore(previewHighlight.firstChild, previewHighlight);
        }
        parent.removeChild(previewHighlight);
        parent.normalize();

        // 重新选择文本 - 遍历所有文本节点查找匹配
        const selection = window.getSelection();
        selection.removeAllRanges();

        let found = false;
        const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null, false);
        let currentNode;

        while (currentNode = walker.nextNode()) {
            const text = currentNode.textContent;
            const index = text.indexOf(textContent);
            if (index >= 0) {
                newRange.setStart(currentNode, index);
                newRange.setEnd(currentNode, index + textContent.length);
                sourceRange = newRange;
                found = true;
                break;
            }
        }

        // 如果没有找到匹配的文本节点，但我们有文本内容，仍然可以继续
        if (!found && textToHighlight) {
            sourceRange = null; // 将在下面处理
        }

        previewHighlight = null;
    }

    // 使用统一的文本提取函数
    let text = getSelectionText({
        range: sourceRange,
        fallbackToSelection: true,
        textOverride: textOverride || textToHighlight
    });

    // 如果编辑模式，从记录中获取文本作为最后的备用
    if (!text && state.editingId) {
        const record = state.annotations.find(item => item.id === state.editingId);
        if (record && record.text) {
            text = record.text;
            console.log('submitAnnotation: 从编辑记录中恢复文本', text);
        }
    }

    // 如果没有任何文本内容，才提示错误
    if (!text || !text.trim()) {
        console.warn('submitAnnotation: 没有可标注的文本', {
            textOverride,
            textToHighlight,
            sourceRange,
            editingId: state.editingId,
            hasPreviewHighlight: !!previewHighlight
        });

        // 提供更有帮助的错误提示
        if (state.editingId) {
            alert('编辑标注失败：无法获取标注文本。请刷新页面后重试。');
        } else {
            alert('请先选择需要标注的文本。\n\n提示：\n1. 在阅读区用鼠标拖动选择文本\n2. 确保文本被高亮选中\n3. 然后在弹出的工具栏中进行标注');
        }
        return;
    }

    if (category === 'custom') {
        const label = (customCategory || '').trim();
        if (!label) {
            alert('请填写自定义类别名称。');
            return;
        }
        state.lastCustomCategory = label;
        customCategory = label;
    }

    if (color !== null && color !== undefined) {
        setHighlightColor(color);
    }
    setBoldState(Boolean(bold));
    setUnderlineState(Boolean(underline));

    const payload = {
        text,
        category,
        customCategory,
        color: state.lastColor,
        underline: state.lastUnderline,
        bold: state.lastBold,
        strikethrough: Boolean(strikethrough),
        borderStyle: borderStyle || 'none',
        emoji: emoji || '',
        showNoteBelow: Boolean(showNoteBelow),
        customBgColor: customBgColor || '',
        fontFamily: fontFamily || '',
        underlineOnly: Boolean(underlineOnly),
        textColor: textColor || 'default',
        fontSize: fontSize || 'medium',
        note,
        tags,
        dashed: dashed !== undefined ? Boolean(dashed) : (state.lastDashed || false),
        slash: slash !== undefined ? Boolean(slash) : (state.lastSlash || false),
        customTextColor: customTextColor !== undefined ? customTextColor : state.lastCustomTextColor,
        underlineColor: underlineColor !== undefined ? underlineColor : null,
        borderColor: borderColor !== undefined ? borderColor : null
    };

    if (state.editingId) {
        updateExistingAnnotation({
            id: state.editingId,
            ...payload
        });
    } else {
        createNewAnnotation({
            ...payload,
            range: sourceRange
        });
    }    hideToolbar();
    window.getSelection()?.removeAllRanges();
}

function handleQuickHighlight() {
    if (!state.activeRange) {
        console.warn('handleQuickHighlight: 缺少activeRange');
        alert('请选择需要快速划线的文本。');
        return;
    }
    if (dom.selectionToolbar.dataset.mode === 'edit') {
        alert('当前处于编辑模式，请使用保存按钮。');
        return;
    }

    const category = state.lastCategory;
    const customCategory = category === 'custom' ? dom.customCategoryInput.value.trim() : '';
    if (category === 'custom' && !customCategory) {
        alert('请先填写自定义类别名称。');
        return;
    }

    // 使用统一的文本提取函数
    const selectedText = getSelectionText({ range: state.activeRange, fallbackToSelection: true });
    if (!selectedText) {
        console.warn('handleQuickHighlight: 无法获取文本', {
            hasActiveRange: !!state.activeRange,
            rangeCollapsed: state.activeRange?.collapsed
        });
        alert('快捷划线失败：选中的文本为空。\n\n提示：请先拖动鼠标选择要标注的文本。');
        return;
    }

    submitAnnotation({
        category,
        customCategory,
        color: state.lastColor,
        underline: state.lastUnderline,
        bold: state.lastBold,
        underlineOnly: state.lastUnderlineOnly,
        textColor: state.lastTextColor,
        fontSize: state.lastFontSize,
        strikethrough: state.lastStrikethrough,
        borderStyle: state.lastBorderStyle,
        emoji: state.lastEmoji,
        dashed: state.lastDashed,
        slash: state.lastSlash,
        customTextColor: state.lastCustomTextColor,
        // 只有当对应的样式被激活且颜色已设置时，才应用颜色
        underlineColor: (state.lastUnderline && state.lastUnderlineColor) ? state.lastUnderlineColor : null,
        borderColor: (state.lastBorderStyle !== 'none' && state.lastBorderColor) ? state.lastBorderColor : null,
        note: '',
        tags: [],
        range: state.activeRange,
        textOverride: selectedText
    });
}

// 切换快速标注模式
function applyQuickFormat() {
    quickAnnotationMode = !quickAnnotationMode;

    const toolbar = document.querySelector('.formatting-toolbar');

    // 更新按钮样式
    if (dom.formatApplyBtn) {
        if (quickAnnotationMode) {
            // 进入快速标注模式
            dom.formatApplyBtn.classList.add('active');
            dom.formatApplyBtn.textContent = '✓ 退出快速标注';
            dom.formatApplyBtn.style.background = '#0f172a';
            dom.formatApplyBtn.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.2)';

            // 工具栏高亮提示
            if (toolbar) {
                toolbar.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.3), 0 0 0 2px rgba(15, 23, 42, 0.8)';
                toolbar.style.background = 'linear-gradient(135deg, #e8f0ff 0%, #e0e9ff 100%)';
            }

            showToast('✓ 快速标注模式已开启，选择文字即可自动标注！', 'success');
        } else {
            // 退出快速标注模式
            dom.formatApplyBtn.classList.remove('active');
            dom.formatApplyBtn.textContent = '快速标注';
            dom.formatApplyBtn.style.background = '';
            dom.formatApplyBtn.style.boxShadow = '';

            // 恢复工具栏样式
            if (toolbar) {
                toolbar.style.boxShadow = '';
                toolbar.style.background = '';
            }

            showToast('✓ 快速标注模式已关闭', 'info');
        }
    }

    // 如果进入快速标注模式，隐藏可能存在的对话框
    if (quickAnnotationMode) {
        hideToolbar();
    }
}

// 在快速标注模式下应用标注 - 整合quick-mode-demo逻辑
function applyQuickAnnotationToSelection(range) {
    // 确保有类别选择，如果没有则使用第一个自定义类别
    if (!state.lastCategory && state.customCategories && state.customCategories.length > 0) {
        state.lastCategory = state.customCategories[0].id;
        console.log('[DEBUG] 🔄 自动选择默认类别', { category: state.lastCategory });

        // 更新类别按钮状态
        document.querySelectorAll('.format-category-btn').forEach(btn => {
            if (btn.dataset.category === state.lastCategory) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    console.log('[DEBUG] ⚡ 快速标注模式触发', {
        hasColor: !!state.lastColor,
        hasCategory: !!state.lastCategory,
        category: state.lastCategory,
        hasBold: state.lastBold,
        hasUnderline: state.lastUnderline,
        hasBorder: state.lastBorderStyle && state.lastBorderStyle !== 'none'
    });

    // 验证0：必须有类别
    if (!state.lastCategory) {
        if (typeof showToast === 'function') {
            showToast('⚠️ 请先选择标注类别', 'warning');
        }
        window.getSelection()?.removeAllRanges();
        return;
    }

    // 验证1：不支持跨段落标注
    if (!isRangeWithinSingleParagraph(range)) {
        if (typeof showToast === 'function') {
            showToast('⚠️ 不支持跨段落标注', 'warning');
        }
        window.getSelection()?.removeAllRanges();
        return;
    }

    // 验证2：必须有活动文档
    const activeDocument = getActiveDocument();
    if (!activeDocument) {
        if (typeof showToast === 'function') {
            showToast('⚠️ 请先加载短文到阅读区', 'warning');
        }
        window.getSelection()?.removeAllRanges();
        return;
    }

    const text = range.toString();
    const now = Date.now();
    const timeDiff = now - state.lastAnnotationTime;

    // 断点连接检测：1秒内标注相同文本
    if (timeDiff < 1000 && text === state.lastAnnotationText && state.lastAnnotationId) {
        const lastRecord = state.annotations.find(a => a.id === state.lastAnnotationId);
        if (lastRecord) {
            // 找到上次标注，将当前标注与之关联
            if (!lastRecord.linkedAnnotations) {
                lastRecord.linkedAnnotations = [];
            }

            const timestamp = new Date().toISOString();

            // 检查类别的 applyStyle 设置
            const categoryConfig = state.customCategories.find(c => c.id === state.lastCategory);
            const shouldApplyStyle = categoryConfig ? categoryConfig.applyStyle : true;

            const linkedRecord = {
                id: generateId(),
                text,
                category: state.lastCategory,
                customCategory: state.lastCategory === 'custom' ? (state.lastCustomCategory || '') : '',
                color: shouldApplyStyle ? state.lastColor : null,
                underline: shouldApplyStyle ? state.lastUnderline : false,
                bold: shouldApplyStyle ? state.lastBold : false,
                underlineOnly: shouldApplyStyle ? state.lastUnderlineOnly : false,
                textColor: shouldApplyStyle ? state.lastTextColor : 'default',
                fontSize: shouldApplyStyle ? state.lastFontSize : 'medium',
                strikethrough: shouldApplyStyle ? (state.lastStrikethrough || false) : false,
                borderStyle: shouldApplyStyle ? (state.lastBorderStyle || 'none') : 'none',
                emoji: shouldApplyStyle ? (state.lastEmoji || '') : '',
                dashed: shouldApplyStyle ? (state.lastDashed || false) : false,
                slash: shouldApplyStyle ? (state.lastSlash || false) : false,
                customTextColor: shouldApplyStyle ? state.lastCustomTextColor : null,
                underlineColor: shouldApplyStyle ? state.lastUnderlineColor : null,
                borderColor: shouldApplyStyle ? state.lastBorderColor : null,
                note: '',
                tags: [],
                createdAt: timestamp,
                linkedTo: state.lastAnnotationId
            };

            applyHighlight(range, linkedRecord);
            state.annotations.push(linkedRecord);
            lastRecord.linkedAnnotations.push(linkedRecord.id);

            // 更新连接提示
            if (typeof showToast === 'function') {
                showToast(`✓ 已连接到前一个"${text}"标注`, 'success');
            }

            // 更新断点状态
            state.lastAnnotationText = text;
            state.lastAnnotationTime = now;
            state.lastAnnotationId = linkedRecord.id;

            activeDocument.updatedAt = timestamp;

            if (state.autoSync) {
                renderAnnotationList();
            } else {
                updateAnnotationSummary();
            }
            renderDocumentList();
            persistState();

            window.getSelection()?.removeAllRanges();
            return;
        }
    }

    // 正常创建新标注
    const timestamp = new Date().toISOString();

    // 检查类别的 applyStyle 设置
    const categoryConfig = state.customCategories.find(c => c.id === state.lastCategory);
    const shouldApplyStyle = categoryConfig ? categoryConfig.applyStyle : true;

    const record = {
        id: generateId(),
        text,
        category: state.lastCategory,
        customCategory: state.lastCategory === 'custom' ? (state.lastCustomCategory || '') : '',
        color: shouldApplyStyle ? state.lastColor : null,
        underline: shouldApplyStyle ? state.lastUnderline : false,
        bold: shouldApplyStyle ? state.lastBold : false,
        underlineOnly: shouldApplyStyle ? state.lastUnderlineOnly : false,
        textColor: shouldApplyStyle ? state.lastTextColor : 'default',
        fontSize: shouldApplyStyle ? state.lastFontSize : 'medium',
        strikethrough: shouldApplyStyle ? (state.lastStrikethrough || false) : false,
        borderStyle: shouldApplyStyle ? (state.lastBorderStyle || 'none') : 'none',
        emoji: shouldApplyStyle ? (state.lastEmoji || '') : '',
        dashed: shouldApplyStyle ? (state.lastDashed || false) : false,
        slash: shouldApplyStyle ? (state.lastSlash || false) : false,
        customTextColor: shouldApplyStyle ? state.lastCustomTextColor : null,
        underlineColor: shouldApplyStyle ? state.lastUnderlineColor : null,
        borderColor: shouldApplyStyle ? state.lastBorderColor : null,
        note: '',
        tags: [],
        createdAt: timestamp
    };

    console.log('[DEBUG] 📝 创建快速标注', {
        text: text.substring(0, 20),
        category: record.category,
        color: record.color,
        bold: record.bold,
        underline: record.underline,
        borderStyle: record.borderStyle
    });

    // 应用高亮
    applyHighlight(range, record);
    state.annotations.push(record);
    activeDocument.updatedAt = timestamp;

    // 更新断点连接状态
    state.lastAnnotationText = text;
    state.lastAnnotationTime = now;
    state.lastAnnotationId = record.id;

    // 更新UI
    if (state.autoSync) {
        renderAnnotationList();
    } else {
        updateAnnotationSummary();
    }
    renderDocumentList();
    persistState();

    // 清除选择
    window.getSelection()?.removeAllRanges();

    // 显示成功提示
    if (typeof showToast === 'function') {
        const styleInfo = [];
        if (state.lastBold) styleInfo.push('加粗');
        if (state.lastUnderline) styleInfo.push('下划线');
        if (state.lastStrikethrough) styleInfo.push('删除线');

        const message = styleInfo.length > 0
            ? `✓ 已快速标注 (${styleInfo.join('+')})`
            : '✓ 已快速标注';

        showToast(message, 'success');
    }
}

// Tooltip悬浮提示功能
function createTooltip() {
    if (dom.tooltip) return dom.tooltip;
    const tooltip = document.createElement('div');
    tooltip.className = 'highlight-tooltip';
    document.body.appendChild(tooltip);
    dom.tooltip = tooltip;
    return tooltip;
}

function showHighlightTooltip(target, mouseEvent = null) {
    console.log('[DEBUG] 💬 准备显示tooltip');
    if (!target.classList || !target.classList.contains('highlight')) {
        console.log('[DEBUG] ❌ 不是highlight元素');
        hideTooltip();
        return;
    }

    const annotationId = target.dataset.id;
    const record = state.annotations.find(item => item.id === annotationId);
    console.log('[DEBUG] 📋 查找笔记', {
        annotationId,
        hasRecord: !!record,
        hasNote: record?.note ? true : false,
        notePreview: record?.note?.substring(0, 30)
    });

    if (!record || !record.note || !record.note.trim()) {
        console.log('[DEBUG] ⭕ 无笔记内容，隐藏tooltip');
        hideTooltip();
        return;
    }

    const tooltip = createTooltip();
    // 支持换行：将 \n 转换为 <br> 标签，并保��white-space: pre-wrap以保留格式
    tooltip.innerHTML = escapeHtml(record.note).replace(/\n/g, '<br>');
    tooltip.style.whiteSpace = 'pre-wrap';
    console.log('[DEBUG] ✅ Tooltip内容已设置');

    // 先设置位置为不可见，避免闪烁
    tooltip.style.opacity = '0';
    tooltip.classList.add('visible');

    // 在下一帧中定位tooltip，避免重排
    requestAnimationFrame(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        let left, top;

        // 如果有鼠标事件，使用鼠标位置；否则使用标注位置
        if (mouseEvent && mouseEvent.clientX !== undefined) {
            // 使用鼠标位置（适用于换行标注）
            left = mouseEvent.clientX - (tooltipRect.width / 2);
            top = mouseEvent.clientY + 20 + window.scrollY; // 鼠标下方20px
            console.log('[DEBUG] 💬 Tooltip定位在鼠标位置', { mouseX: mouseEvent.clientX, mouseY: mouseEvent.clientY });
        } else {
            // 使用标注位置（向后兼容）
            const rect = target.getBoundingClientRect();
            left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            top = rect.bottom + 10 + window.scrollY;
            console.log('[DEBUG] 💬 Tooltip定位在标注位置');
        }

        // 确保tooltip不超出视口
        const viewportWidth = window.innerWidth;
        left = Math.max(10, Math.min(left, viewportWidth - tooltipRect.width - 10));

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.opacity = '1';

        console.log('[DEBUG] 💬 Tooltip定位完成', {
            tooltip位置: { left, top },
            tooltip尺寸: { width: tooltipRect.width, height: tooltipRect.height }
        });
    });
}

function handleHighlightLeave(event) {
    const target = event.target;
    if (!target.classList || !target.classList.contains('highlight')) {
        return;
    }
    hideTooltip();
}

function hideTooltip() {
    console.log('[DEBUG] 🚫 隐藏tooltip');
    if (dom.tooltip) {
        dom.tooltip.classList.remove('visible');
        dom.tooltip.style.opacity = '0';
        console.log('[DEBUG] ✅ Tooltip已隐藏');
    } else {
        console.log('[DEBUG] ⚠️ tooltip元素不存在');
    }
}

// Markdown导入功能
async function handleMarkdownImport(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file) return;

    try {
        const rawText = await readFileAsText(file);
        const plainText = parseMarkdownToPlainText(rawText);

        if (dom.sourceText) {
            dom.sourceText.value = plainText;
        }

        alert('Markdown文件已成功导入！');
    } catch (error) {
        console.error('Markdown导入失败：', error);
        alert('Markdown导入失败，请确认文件格式正确。');
    } finally {
        input.value = '';
    }
}

// 处理粘贴Markdown格式文本
function handleMarkdownPaste(event) {
    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');

    // 检测是否为Markdown格式
    if (isMarkdownFormat(pastedText)) {
        event.preventDefault();

        // 转换为纯文本
        const plainText = parseMarkdownToPlainText(pastedText);

        // 插入到光标位置
        const textarea = event.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = textarea.value;

        textarea.value = currentValue.substring(0, start) + plainText + currentValue.substring(end);

        // 设置光标位置
        const newCursorPos = start + plainText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);

        // 显示提示
        showToast('✓ 检测到Markdown格式，已自动转换为纯文本', 'success');
        console.log('✓ 检测到Markdown格式，已自动转换为纯文本');
    }
}

// 检测是否为Markdown格式
function isMarkdownFormat(text) {
    if (!text || text.length < 10) return false;

    const markdownPatterns = [
        /^#{1,6}\s+/m,           // 标题
        /\*\*.*\*\*/,            // 粗体
        /__.*__/,                // 粗体
        /\[.*\]\(.*\)/,          // 链接
        /!\[.*\]\(.*\)/,         // 图片
        /^```/m,                 // 代码块
        /^>\s+/m,                // 引用
        /^[\*\-\+]\s+/m,         // 无序列表
        /^\d+\.\s+/m             // 有序列表
    ];

    // 如果匹配到3个或以上Markdown特征，认为是Markdown格式
    const matchCount = markdownPatterns.filter(pattern => pattern.test(text)).length;
    return matchCount >= 2;
}

// 简单的Markdown解析器（转换为纯文本）
function parseMarkdownToPlainText(markdown) {
    let text = markdown;

    // 移除标题标记
    text = text.replace(/^#{1,6}\s+/gm, '');

    // 移除粗体/斜体标记
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');

    // 移除链接，保留文本
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // 移除图片
    text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');

    // 移除代码块标记
    text = text.replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
    });

    // 移除行内代码标记
    text = text.replace(/`([^`]+)`/g, '$1');

    // 移除引用标记
    text = text.replace(/^>\s+/gm, '');

    // 移除列表标记
    text = text.replace(/^[\*\-\+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');

    // 移除水平线
    text = text.replace(/^(\*{3,}|-{3,}|_{3,})$/gm, '');

    // 清理多余的空行
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
}

// ======================== AI语法分析功能 ========================

function showAISettingsModal() {
    if (!dom.aiSettingsModal) return;

    // 加载已保存的设置
    dom.aiApiKey.value = state.aiConfig.apiKey || '';
    dom.aiApiEndpoint.value = state.aiConfig.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    dom.aiModel.value = state.aiConfig.model || 'gpt-3.5-turbo';
    dom.aiCustomModel.value = state.aiConfig.customModel || '';
    dom.aiAutoApply.checked = state.aiConfig.autoApply !== false;
    dom.aiAnalyzeSelection.checked = state.aiConfig.analyzeSelection || false;

    dom.aiSettingsModal.classList.remove('hidden');
}

function hideAISettingsModal() {
    if (!dom.aiSettingsModal) return;
    dom.aiSettingsModal.classList.add('hidden');
}

function saveAISettings() {
    state.aiConfig.apiKey = dom.aiApiKey.value.trim();
    state.aiConfig.apiEndpoint = dom.aiApiEndpoint.value.trim() || 'https://api.openai.com/v1/chat/completions';
    state.aiConfig.model = dom.aiModel.value;
    state.aiConfig.customModel = dom.aiCustomModel.value.trim();
    state.aiConfig.autoApply = dom.aiAutoApply.checked;
    state.aiConfig.analyzeSelection = dom.aiAnalyzeSelection.checked;

    persistState();
    alert('AI设置已保存！');
    hideAISettingsModal();
}

async function handleAIAnalyze() {
    // 检查API配置
    if (!state.aiConfig.apiKey) {
        alert('请先配置AI API密钥。点击"🤖 AI"按钮进行设置。');
        showAISettingsModal();
        return;
    }

    // 获取要分析的文本
    let textToAnalyze = '';
    if (state.aiConfig.analyzeSelection) {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            textToAnalyze = selection.toString().trim();
        } else {
            alert('请先选中要分析的文本。');
            return;
        }
    } else {
        textToAnalyze = dom.readingArea.textContent.trim();
        if (!textToAnalyze) {
            alert('阅读区域没有文本。请先加载文本。');
            return;
        }
    }

    // 显示加载状态
    const originalText = dom.aiAnalyzeBtn.textContent;
    dom.aiAnalyzeBtn.textContent = '🤖 分析中...';
    dom.aiAnalyzeBtn.disabled = true;

    try {
        const result = await callAIAPI(textToAnalyze);

        if (state.aiConfig.autoApply) {
            applyAIAnnotations(result);
            alert('AI语法分析完成！已自动应用标注。');
        } else {
            console.log('AI分析结果：', result);
            alert('AI语法分析完成！请查看控制台查看结果。');
        }
    } catch (error) {
        console.error('AI分析失败：', error);
        alert('AI分析失败：' + error.message);
    } finally {
        dom.aiAnalyzeBtn.textContent = originalText;
        dom.aiAnalyzeBtn.disabled = false;
    }
}

// 验证AI配置
function validateAIConfig() {
    if (!state.aiConfig.apiKey || state.aiConfig.apiKey.trim() === '') {
        throw new Error('请先在AI设置中配置API密钥');
    }
    if (!state.aiConfig.apiEndpoint || state.aiConfig.apiEndpoint.trim() === '') {
        throw new Error('请先在AI设置中配置API端点');
    }
    const model = state.aiConfig.model === 'custom' ? state.aiConfig.customModel : state.aiConfig.model;
    if (!model || model.trim() === '') {
        throw new Error('请先在AI设置中选择模型');
    }
    return model;
}

async function callAIAPI(text) {
    const model = validateAIConfig();

    const systemPrompt = `你是一个英语语法分析专家。请分析以下英文文本的句子成分，并以JSON格式返回结果。

对每个需要标注的词或短语，返回以下信息：
- text: 原文文本
- category: 语法类别（使用以下之一）
  - mainSubject: 主要主语
  - clauseSubject: 从句主语
  - mainVerb: 主要谓语
  - clauseVerb: 从句谓语
  - object: 宾语表语
  - attribute: 定语
  - adverbial: 状语
  - conjunction: 连词
  - clauseMarker: 从句引导词
- start: 文本在原文中的起始位置（字符索引）
- end: 文本在原文中的结束位置（字符索引）

返回格式示例：
{
  "annotations": [
    {"text": "The book", "category": "mainSubject", "start": 0, "end": 8},
    {"text": "that", "category": "clauseMarker", "start": 9, "end": 13},
    {"text": "I", "category": "clauseSubject", "start": 14, "end": 15}
  ]
}

只返回JSON，不要添加任何解释文字。`;

    const requestBody = {
        model: model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 2000
    };

    const response = await fetch(state.aiConfig.apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.aiConfig.apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // 解析AI返回的内容
    const content = data.choices?.[0]?.message?.content || '';

    // 尝试解析JSON
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    } else {
        throw new Error('AI返回的内容不是有效的JSON格式');
    }
}

function applyAIAnnotations(aiResult) {
    if (!aiResult || !aiResult.annotations || !Array.isArray(aiResult.annotations)) {
        throw new Error('AI返回的数据格式不正确');
    }

    const readingText = dom.readingArea.textContent;
    let appliedCount = 0;

    // 按照位置从后往前应用，避免位置偏移
    const sortedAnnotations = [...aiResult.annotations].sort((a, b) => b.start - a.start);

    for (const annotation of sortedAnnotations) {
        try {
            const { text, category, start, end } = annotation;

            // 验证类别
            if (!CATEGORY_LABELS[category]) {
                console.warn(`未知的语法类别: ${category}`);
                continue;
            }

            // 在阅读区域中查找并选中文本
            const range = findTextInReadingArea(text, start);
            if (!range) {
                console.warn(`无法找到文本: "${text}" at position ${start}`);
                continue;
            }

            // 创建标注记录
            const record = {
                id: `anno-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: text,
                category: category,
                customCategory: '',
                color: 'honey',
                note: '',
                tags: [],
                underline: false,
                bold: false,
                strikethrough: false,
                borderStyle: 'none',
                emoji: '',
                showNoteBelow: false,
                customBgColor: '',
                fontFamily: '',
                underlineOnly: false,
                textColor: 'default',
                fontSize: 'medium'
            };

            // 应用高亮
            applyHighlight(range, record);
            state.annotations.push(record);
            appliedCount++;

        } catch (error) {
            console.error('应用标注失败:', annotation, error);
        }
    }

    // 保存状态并刷新显示
    saveSnapshot();
    persistState();
    renderAnnotationList();

    console.log(`成功应用 ${appliedCount} 个AI标注`);
}

function findTextInReadingArea(text, preferredStart) {
    const readingText = dom.readingArea.textContent;

    // 首先尝试在建议的位置查找
    if (preferredStart >= 0 && preferredStart < readingText.length) {
        const actualText = readingText.substring(preferredStart, preferredStart + text.length);
        if (actualText === text) {
            return createRangeAtPosition(preferredStart, preferredStart + text.length);
        }
    }

    // 如果建议位置不匹配，则搜索整个文本
    const index = readingText.indexOf(text);
    if (index !== -1) {
        return createRangeAtPosition(index, index + text.length);
    }

    return null;
}

function createRangeAtPosition(startPos, endPos) {
    const walker = document.createTreeWalker(
        dom.readingArea,
        NodeFilter.SHOW_TEXT,
        null
    );

    let currentPos = 0;
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeLength = node.textContent.length;

        if (!startNode && currentPos + nodeLength >= startPos) {
            startNode = node;
            startOffset = startPos - currentPos;
        }

        if (currentPos + nodeLength >= endPos) {
            endNode = node;
            endOffset = endPos - currentPos;
            break;
        }

        currentPos += nodeLength;
    }

    if (startNode && endNode) {
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return range;
    }

    return null;
}

// ======================== AI翻译和解释功能 ========================

let currentTranslateText = '';
let currentTranslation = '';

function hideAITranslateModal() {
    if (!dom.aiTranslateModal) return;
    dom.aiTranslateModal.classList.add('hidden');
}

async function showAITranslate(text) {
    if (!state.aiConfig.apiKey) {
        showToast('请先配置AI API密钥', 'warning');
        showAISettingsModal();
        return;
    }

    currentTranslateText = text;
    dom.aiTranslateOriginal.textContent = text;
    dom.aiTranslateResult.innerHTML = '<p style="color: var(--text-secondary); margin: 0;">正在翻译...</p>';
    dom.aiTranslateModal.classList.remove('hidden');

    try {
        const translation = await callAITranslate(text);
        currentTranslation = translation;
        dom.aiTranslateResult.innerHTML = `<p style="margin: 0; line-height: 1.6;">${translation}</p>`;
    } catch (error) {
        console.error('AI翻译失败：', error);
        dom.aiTranslateResult.innerHTML = `<p style="color: #dc2626; margin: 0;">翻译失败: ${error.message}</p>`;
    }
}

async function callAITranslate(text) {
    const model = validateAIConfig();

    const systemPrompt = `你是一个专业的英语翻译。请将用户提供的英文翻译成中文。要求：
1. 翻译准确、流畅、自然
2. 保留原文的语气和风格
3. 如果是单词，提供：音标、词性、常用释义、例句
4. 如果是短语或句子，提供：直译和意译
5. 只返回翻译结果，不要添加额外说明`;

    const requestBody = {
        model: model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 500
    };

    const response = await fetch(state.aiConfig.apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.aiConfig.apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '翻译失败';
}

function applyAITranslation() {
    if (!currentTranslation) return;
    dom.noteInput.value = currentTranslation;
    hideAITranslateModal();
}

function retryAITranslation() {
    if (!currentTranslateText) return;
    showAITranslate(currentTranslateText);
}

async function handleAIExplain() {
    if (!state.aiConfig.apiKey) {
        alert('请先配置AI API密钥。点击"🤖 AI"按钮进行设置。');
        showAISettingsModal();
        return;
    }

    // 获取当前选中的文本（从activeRange或表单中）
    let text = '';
    if (state.activeRange) {
        text = state.activeRange.toString().trim();
    }

    if (!text) {
        alert('请先选中要解释的文本。');
        return;
    }

    const originalBtnText = dom.aiExplainBtn.textContent;
    dom.aiExplainBtn.textContent = '🤖 生成中...';
    dom.aiExplainBtn.disabled = true;

    try {
        const explanation = await callAIExplain(text);
        dom.noteInput.value = explanation;
    } catch (error) {
        console.error('AI解释失败：', error);
        alert('AI解释失败：' + error.message);
    } finally {
        dom.aiExplainBtn.textContent = originalBtnText;
        dom.aiExplainBtn.disabled = false;
    }
}

async function callAIExplain(text) {
    const model = validateAIConfig();

    let systemPrompt = '';

    // 判断是单词还是短语/句子
    const isWord = text.trim().split(/\s+/).length === 1;

    if (isWord) {
        systemPrompt = `你是一个英语词汇专家。请对用户提供的英语单词进行详细解释，包括：
1. 音标（英式和美式）
2. 词性（可能有多个）
3. 中文释义（常用的2-3个）
4. 常用短语搭配（1-2个）
5. 例句（1个，带中文翻译）

格式示例：
**单词**: example
**音标**: /ɪɡˈzɑːmpl/ (美) /ɪɡˈzɑːmpl/ (英)
**词性**: n. 名词
**释义**:
1. 例子；实例
2. 榜样；典范
**搭配**: for example (例如)
**例句**: This is a good example of modern architecture. (这是现代建筑的一个好例子。)

请用这种格式回复，内容简洁专业。`;
    } else {
        systemPrompt = `你是一个英语教学专家。请对用户提供的英语短语或句子进行解释，包括：
1. 中文翻译（准确、地道）
2. 语法分析（如果是句子，简要说明句子结构）
3. 重点词汇或短语（1-2个）
4. 使用场景或注意事项

格式示例：
**翻译**: [中文翻译]
**分析**: [语法结构或短语用法]
**重点**: [关键词汇]
**提示**: [使用场景]

请用这种格式回复，内容简洁实用。`;
    }

    const requestBody = {
        model: model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 500
    };

    const response = await fetch(state.aiConfig.apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.aiConfig.apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '解释失败';
}

// 处理文本选中，显示快速翻译按钮（重命名避免与标注功能冲突）
function handleTextSelectionForTranslate(event) {
    // 延迟一点检查选中状态，确保selection已更新
    setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        // 如果标注工具栏已显示，不显示翻译按钮（避免冲突）
        if (dom.selectionToolbar && !dom.selectionToolbar.classList.contains('hidden')) {
            hideQuickTranslateBtn();
            return;
        }

        // 如果在快速标注模式，不显示翻译按钮
        if (quickAnnotationMode) {
            hideQuickTranslateBtn();
            return;
        }

        if (text && text.length > 0 && dom.readingArea.contains(selection.anchorNode)) {
            // 显示快速翻译按钮
            showQuickTranslateBtn(selection);
        } else {
            hideQuickTranslateBtn();
        }
    }, 10);
}

function handleSelectionChange() {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (!text || text.length === 0) {
        hideQuickTranslateBtn();
    }
}

function showQuickTranslateBtn(selection) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const btn = dom.quickTranslateBtn;
    const btnHeight = 32; // 预估按钮高度

    btn.style.top = `${window.scrollY + rect.top - btnHeight - 8}px`;
    btn.style.left = `${window.scrollX + rect.left + (rect.width / 2) - 40}px`; // 40是按钮宽度的一半（预估）

    btn.classList.remove('hidden');
}

function hideQuickTranslateBtn() {
    if (dom.quickTranslateBtn) {
        dom.quickTranslateBtn.classList.add('hidden');
    }
}

function handleQuickTranslate() {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text) {
        showAITranslate(text);
        hideQuickTranslateBtn();
    }
}

// ======================== 生词本功能 ========================

function showVocabBookModal() {
    if (!dom.vocabBookModal) return;

    renderVocabBook();
    dom.vocabBookModal.classList.remove('hidden');
}

function hideVocabBookModal() {
    if (!dom.vocabBookModal) return;
    dom.vocabBookModal.classList.add('hidden');
}

function renderVocabBook() {
    const vocabCount = state.vocabBook.length;
    dom.vocabBookCount.textContent = vocabCount;

    if (vocabCount === 0) {
        dom.vocabBookList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">暂无生词。在标注上右键点击"加入生词本"开始收集。</p>';
        return;
    }

    let html = '<div style="display: grid; gap: 12px;">';

    state.vocabBook.forEach((vocab, index) => {
        const masteredClass = vocab.mastered ? 'opacity: 0.6;' : '';
        const masteredBadge = vocab.mastered ? '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">✓ 已掌握</span>' : '';

        html += `
            <div style="background: rgba(47, 84, 235, 0.05); border-radius: 8px; padding: 12px; ${masteredClass}">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 8px 0; font-size: 18px; color: var(--primary);">
                            ${vocab.word}
                            ${masteredBadge}
                        </h4>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${vocab.note || '暂无释义'}</p>
                        ${vocab.tags && vocab.tags.length > 0 ? `
                            <div style="margin-top: 8px;">
                                ${vocab.tags.map(tag => `<span style="background: rgba(47, 84, 235, 0.1); color: var(--primary); padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 4px;">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                        <p style="margin: 8px 0 0 0; font-size: 12px; color: var(--text-secondary);">
                            添加时间: ${new Date(vocab.addedAt).toLocaleDateString()}
                            ${vocab.reviewCount > 0 ? ` | 复习次数: ${vocab.reviewCount}` : ''}
                        </p>
                    </div>
                    <button onclick="removeFromVocabBook('${vocab.id}')" style="background: none; border: none; color: #dc2626; cursor: pointer; padding: 4px 8px; font-size: 18px;" title="删除">✕</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    dom.vocabBookList.innerHTML = html;
}

function addToVocabBook(annotation) {
    // 检查是否已存在
    const exists = state.vocabBook.some(v => v.word.toLowerCase() === annotation.text.toLowerCase());
    if (exists) {
        showToast('该词已在生词本中', 'info');
        return;
    }

    const vocab = {
        id: `vocab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        word: annotation.text,
        note: annotation.note || '',
        tags: annotation.tags || [],
        addedAt: new Date().toISOString(),
        mastered: false,
        reviewCount: 0,
        annotationId: annotation.id
    };

    state.vocabBook.push(vocab);
    persistState();

    showToast(`"${annotation.text}" 已添加到生词本`, 'success');
}

function removeFromVocabBook(vocabId) {
    if (!confirm('确定要从生词本中删除这个词吗？')) return;

    state.vocabBook = state.vocabBook.filter(v => v.id !== vocabId);
    persistState();
    renderVocabBook();
}

function clearVocabBook() {
    if (!confirm('确定要清空整个生词本吗？此操作不可恢复！')) return;

    state.vocabBook = [];
    persistState();
    renderVocabBook();
}

// ======================== 生词复习功能 ========================

function startVocabReview() {
    if (state.vocabBook.length === 0) {
        alert('生词本为空，请先添加一些生词。');
        return;
    }

    // 准备复习卡片（随机打乱）
    state.reviewState.cards = [...state.vocabBook]
        .sort(() => Math.random() - 0.5);
    state.reviewState.currentIndex = 0;
    state.reviewState.showingBack = false;

    hideVocabBookModal();
    showVocabReviewModal();
}

function showVocabReviewModal() {
    if (!dom.vocabReviewModal) return;

    showCurrentReviewCard();
    dom.vocabReviewModal.classList.remove('hidden');
}

function hideVocabReviewModal() {
    if (!dom.vocabReviewModal) return;
    dom.vocabReviewModal.classList.add('hidden');
}

function showCurrentReviewCard() {
    const { cards, currentIndex } = state.reviewState;

    if (cards.length === 0) {
        hideVocabReviewModal();
        alert('复习完成！');
        return;
    }

    const card = cards[currentIndex];

    // 更新进度
    dom.reviewProgress.textContent = `${currentIndex + 1} / ${cards.length}`;

    // 显示正面
    dom.reviewWord.textContent = card.word;
    dom.reviewNote.innerHTML = card.note || '暂无释义';

    // 重置为显示正面
    state.reviewState.showingBack = false;
    dom.reviewCardFront.classList.remove('hidden');
    dom.reviewCardBack.classList.add('hidden');
}

function flipReviewCard() {
    state.reviewState.showingBack = !state.reviewState.showingBack;

    if (state.reviewState.showingBack) {
        dom.reviewCardFront.classList.add('hidden');
        dom.reviewCardBack.classList.remove('hidden');
    } else {
        dom.reviewCardFront.classList.remove('hidden');
        dom.reviewCardBack.classList.add('hidden');
    }
}

// 添加全局函数供HTML调用
window.flipReviewCard = flipReviewCard;

function showPreviousReviewCard() {
    if (state.reviewState.currentIndex > 0) {
        state.reviewState.currentIndex--;
        showCurrentReviewCard();
    }
}

function showNextReviewCard() {
    if (state.reviewState.currentIndex < state.reviewState.cards.length - 1) {
        state.reviewState.currentIndex++;
        showCurrentReviewCard();
    } else {
        // 最后一张卡片
        hideVocabReviewModal();
        alert('复习完成！');
        showVocabBookModal();
    }
}

function markAsKnown() {
    const { cards, currentIndex } = state.reviewState;
    const card = cards[currentIndex];

    // 在原生词本中标记为已掌握
    const vocabIndex = state.vocabBook.findIndex(v => v.id === card.id);
    if (vocabIndex !== -1) {
        state.vocabBook[vocabIndex].mastered = true;
        state.vocabBook[vocabIndex].reviewCount++;
    }

    persistState();

    // 从复习队列中移除
    state.reviewState.cards.splice(currentIndex, 1);

    if (state.reviewState.cards.length === 0) {
        hideVocabReviewModal();
        alert('所有单词已复习完成！');
        showVocabBookModal();
    } else {
        // 调整索引
        if (state.reviewState.currentIndex >= state.reviewState.cards.length) {
            state.reviewState.currentIndex = state.reviewState.cards.length - 1;
        }
        showCurrentReviewCard();
    }
}

function markAsUnknown() {
    const { cards, currentIndex } = state.reviewState;
    const card = cards[currentIndex];

    // 增加复习次数
    const vocabIndex = state.vocabBook.findIndex(v => v.id === card.id);
    if (vocabIndex !== -1) {
        state.vocabBook[vocabIndex].reviewCount++;
    }

    persistState();

    // 继续下一张
    showNextReviewCard();
}

// ======================== Anki导出功能 ========================

function exportToAnki() {
    if (state.vocabBook.length === 0) {
        alert('生词本为空，无法导出。');
        return;
    }

    // 生成CSV内容
    let csv = '\ufeff'; // UTF-8 BOM
    csv += '单词,释义,标签,添加时间,复习次数,掌握状态\n';

    state.vocabBook.forEach(vocab => {
        const word = escapeCSV(vocab.word);
        const note = escapeCSV(vocab.note || '');
        const tags = escapeCSV(vocab.tags.join(', '));
        const addedAt = new Date(vocab.addedAt).toLocaleDateString();
        const reviewCount = vocab.reviewCount || 0;
        const mastered = vocab.mastered ? '已掌握' : '未掌握';

        csv += `${word},${note},${tags},${addedAt},${reviewCount},${mastered}\n`;
    });

    // 下载文件
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `生词本-Anki-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('Anki卡片已导出！可在Anki中导入该CSV文件。');
}

function escapeCSV(text) {
    if (typeof text !== 'string') return '';

    // 如果包含逗号、引号或换行符，需要用引号包裹并转义引号
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
}

// 添加全局函数供HTML调用
window.removeFromVocabBook = removeFromVocabBook;

// ======================== TTS文本朗读功能 ========================

function speakText(text) {
    if (!('speechSynthesis' in window)) {
        alert('您的浏览器不支持文本朗读功能。');
        return;
    }

    // 停止当前朗读
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = state.ttsState.rate;
    utterance.pitch = state.ttsState.pitch;
    utterance.lang = 'en-US';

    if (state.ttsState.voice) {
        utterance.voice = state.ttsState.voice;
    }

    utterance.onstart = () => {
        state.ttsState.speaking = true;
        state.ttsState.currentText = text;
        updateTTSStatus('朗读中...');
        showTTSControls();
    };

    utterance.onend = () => {
        state.ttsState.speaking = false;
        updateTTSStatus('就绪');
    };

    utterance.onerror = (event) => {
        console.error('TTS错误:', event);
        state.ttsState.speaking = false;
        updateTTSStatus('错误');
        alert('朗读失败：' + (event.error || '未知错误'));
    };

    window.speechSynthesis.speak(utterance);
}

function toggleTTSPlayPause() {
    if (!('speechSynthesis' in window)) {
        alert('您的浏览器不支持文本朗读功能。');
        return;
    }

    const synth = window.speechSynthesis;

    if (state.ttsState.speaking && !state.ttsState.paused) {
        // 暂停
        synth.pause();
        state.ttsState.paused = true;
        updateTTSStatus('已暂停');
        dom.ttsPlayBtn.textContent = '▶️';
    } else if (state.ttsState.paused) {
        // 继续
        synth.resume();
        state.ttsState.paused = false;
        updateTTSStatus('朗读中...');
        dom.ttsPlayBtn.textContent = '⏸️';
    } else {
        // 朗读全文
        const text = dom.readingArea.textContent.trim();
        if (!text || text === '点击"载入到阅读区"后开始标注。选中文本即可调出操作菜单。') {
            alert('阅读区域没有文本。');
            return;
        }
        speakText(text);
        dom.ttsPlayBtn.textContent = '⏸️';
    }
}

function stopTTS() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        state.ttsState.speaking = false;
        state.ttsState.paused = false;
        updateTTSStatus('已停止');
        dom.ttsPlayBtn.textContent = '🔊';
    }
}

function updateTTSRate() {
    const rate = parseFloat(dom.ttsRate.value);
    state.ttsState.rate = rate;
    dom.ttsRateValue.textContent = rate.toFixed(1) + 'x';
}

function updateTTSStatus(status) {
    if (dom.ttsStatus) {
        dom.ttsStatus.textContent = status;
    }
}

function showTTSControls() {
    if (dom.ttsControls) {
        dom.ttsControls.classList.remove('hidden');
    }
}

function showTTSSettings() {
    if (!('speechSynthesis' in window)) {
        alert('您的浏览器不支持文本朗读功能。');
        return;
    }

    // 获取可用的语音列表
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));

    if (englishVoices.length === 0) {
        alert('未找到英语语音。请确保浏览器已加载语音列表。');
        return;
    }

    let message = '请选择英语发音：\n\n';
    englishVoices.forEach((voice, index) => {
        message += `${index + 1}. ${voice.name} (${voice.lang})\n`;
    });

    const choice = prompt(message);
    if (choice) {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < englishVoices.length) {
            state.ttsState.voice = englishVoices[index];
            alert(`已选择: ${englishVoices[index].name}`);
        }
    }
}

// ======================== 快速标注功能 v4.1 ========================

// 智能默认值配置
const CATEGORY_DEFAULTS = {
    vocab: {
        color: null,
        bold: true,
        emoji: '⭐',
        borderStyle: 'none'
    },
    phrase: {
        color: null,
        underline: true,
        emoji: '',
        borderStyle: 'none'
    },
    difficulty: {
        color: null,
        bold: true,
        emoji: '❗',
        borderStyle: 'round'
    },
    keypoint: {
        color: null,
        bold: true,
        emoji: '💡',
        borderStyle: 'square'
    },
    translation: {
        color: null,
        underline: true,
        emoji: '',
        borderStyle: 'none'
    }
};

// 快速标注函数
function quickAnnotate(category) {
    if (!state.activeRange) {
        showToast('请先选中要标注的文本', 'warning');
        return;
    }

    const selectedText = state.activeRange.toString().trim();

    if (!selectedText) {
        showToast('请先选中要标注的文本', 'warning');
        return;
    }

    // 查找类别配置
    const categoryConfig = state.customCategories.find(c => c.id === category);
    const applyStyle = categoryConfig ? categoryConfig.applyStyle : true;

    // 获取默认样式（如果存在）
    const defaults = CATEGORY_DEFAULTS[category] || {};

    state.lastCategory = category;

    // 如果应用样式，使用默认样式；否则使用无样式配置
    if (applyStyle) {
        // 对于自定义类别，如果没有默认样式，使用基础样式
        state.lastColor = defaults.color !== undefined ? defaults.color : null;
        state.lastBold = defaults.bold !== undefined ? defaults.bold : false;
        state.lastUnderline = defaults.underline !== undefined ? defaults.underline : false;
        state.lastStrikethrough = false;
        state.lastBorderStyle = defaults.borderStyle || 'none';
        state.lastEmoji = defaults.emoji || '';
    } else {
        // 仅标注类别，不应用任何样式
        state.lastColor = null;
        state.lastBold = false;
        state.lastUnderline = false;
        state.lastStrikethrough = false;
        state.lastBorderStyle = 'none';
        state.lastEmoji = '';
    }

    const annotation = {
        id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: selectedText,
        category: category,
        customCategory: category === 'custom' ? (state.lastCustomCategory || '自定义') : '',
        color: state.lastColor,
        underline: state.lastUnderline,
        bold: state.lastBold,
        strikethrough: state.lastStrikethrough,
        borderStyle: state.lastBorderStyle,
        emoji: state.lastEmoji,
        dashed: state.lastDashed || false,
        slash: state.lastSlash || false,
        customTextColor: state.lastCustomTextColor,
        underlineColor: state.lastUnderlineColor,
        borderColor: state.lastBorderColor,
        note: '',
        tags: [],
        timestamp: new Date().toISOString(),
        showNoteBelow: false
    };

    try {
        applyHighlight(state.activeRange, annotation);
        state.annotations.push(annotation);
        persistState();
        renderAnnotationsList();
        dom.selectionToolbar.classList.add('hidden');
        window.getSelection().removeAllRanges();
        state.activeRange = null;
        showSuccessToast('✓ 标注已保存');
    } catch (error) {
        console.error('快速标注失败:', error);
        showToast('标注失败: ' + error.message, 'error');
    }
}

// 成功提示
function showSuccessToast(message) {
    showToast(message, 'success');
}

// 通用Toast提示函数
function showToast(message, type = 'success') {
    // 移除已存在的toast
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = 'toast-notification';

    // 根据类型设置颜色
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };

    // 根据类型设置图标
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span style="font-size: 18px; margin-right: 8px;">${icons[type] || ''}</span>
        <span>${message}</span>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.success};
        color: white;
        padding: 14px 20px;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 导出到全局
window.showToast = showToast;

// CSS动画
const quickStyle = document.createElement('style');
quickStyle.textContent = `
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
`;
document.head.appendChild(quickStyle);

// 导出函数
window.quickAnnotate = quickAnnotate;

console.log('✅ 快速标注功能已加载 v4.1');

// ======================== AI语法分析增强功能 v4.2 ========================

/**
 * 增强版AI语法分析 - 支持逐句分析
 * 改进点：
 * 1. 支持按句子拆分，逐句分析
 * 2. 显示分析进度
 * 3. 更好的错误处理和用户反馈
 * 4. 支持暂停/继续功能
 */

let aiAnalysisState = {
    isAnalyzing: false,
    currentSentence: 0,
    totalSentences: 0,
    shouldStop: false
};

// 将文本分割为句子
function splitIntoSentences(text) {
    // 使用正则表达式分割句子，保留标点符号
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

// 增强版AI分析 - 替代原有的handleAIAnalyze
async function handleAIAnalyzeEnhanced() {
    // 检查API配置
    if (!state.aiConfig.apiKey) {
        showToast('⚠️ 请先配置AI API密钥', 'warning');
        showAISettingsModal();
        return;
    }

    // 获取要分析的文本
    let textToAnalyze = '';
    if (state.aiConfig.analyzeSelection) {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            textToAnalyze = selection.toString().trim();
        } else {
            showToast('⚠️ 请先选中要分析的文本', 'warning');
            return;
        }
    } else {
        textToAnalyze = dom.readingArea.textContent.trim();
        if (!textToAnalyze) {
            showToast('⚠️ 阅读区域没有文本', 'warning');
            return;
        }
    }

    // 询问用户是否按句子逐个分析
    const useSentenceMode = confirm('是否按句子逐个分析？\n\n点击"确定"：逐句分析（推荐，结果更准确）\n点击"取消"：整体分析（速度更快）');

    if (useSentenceMode) {
        await analyzeBySentences(textToAnalyze);
    } else {
        await analyzeWholeText(textToAnalyze);
    }
}

// 按句子逐个分析
async function analyzeBySentences(text) {
    const sentences = splitIntoSentences(text);
    aiAnalysisState.totalSentences = sentences.length;
    aiAnalysisState.currentSentence = 0;
    aiAnalysisState.shouldStop = false;
    aiAnalysisState.isAnalyzing = true;

    // 显示进度
    showToast(`📊 开始分析 ${sentences.length} 个句子...`, 'info');

    const originalText = dom.aiAnalyzeBtn.textContent;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sentences.length; i++) {
        if (aiAnalysisState.shouldStop) {
            showToast('⏹️ 分析已停止', 'info');
            break;
        }

        aiAnalysisState.currentSentence = i + 1;
        const sentence = sentences[i];

        // 更新按钮状态
        dom.aiAnalyzeBtn.textContent = `🤖 分析中 ${i + 1}/${sentences.length}`;
        dom.aiAnalyzeBtn.disabled = true;

        try {
            showToast(`🔍 正在分析第 ${i + 1}/${sentences.length} 句...`, 'info');

            const result = await callAIAPI(sentence);

            if (state.aiConfig.autoApply && result && result.annotations) {
                applyAIAnnotations(result);
                successCount++;
                showToast(`✓ 第 ${i + 1} 句分析完成`, 'success');
            }

            // 延迟避免API限流
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`第 ${i + 1} 句分析失败:`, error);
            errorCount++;
            showToast(`✗ 第 ${i + 1} 句分析失败: ${error.message}`, 'error');
        }
    }

    // 恢复按钮状态
    dom.aiAnalyzeBtn.textContent = originalText;
    dom.aiAnalyzeBtn.disabled = false;
    aiAnalysisState.isAnalyzing = false;

    // 显示最终结果
    showToast(`🎉 分析完成！成功: ${successCount}, 失败: ${errorCount}`, 'success');
}

// 整体分析（原有方式）
async function analyzeWholeText(text) {
    const originalText = dom.aiAnalyzeBtn.textContent;
    dom.aiAnalyzeBtn.textContent = '🤖 分析中...';
    dom.aiAnalyzeBtn.disabled = true;

    try {
        const result = await callAIAPI(text);

        if (state.aiConfig.autoApply) {
            applyAIAnnotations(result);
            showToast('✓ AI语法分析完成！已自动应用标注', 'success');
        } else {
            console.log('AI分析结果：', result);
            showToast('✓ AI语法分析完成！请查看控制台', 'info');
        }
    } catch (error) {
        console.error('AI分析失败：', error);
        showToast(`✗ AI分析失败: ${error.message}`, 'error');
    } finally {
        dom.aiAnalyzeBtn.textContent = originalText;
        dom.aiAnalyzeBtn.disabled = false;
    }
}

// 停止分析
function stopAIAnalysis() {
    if (aiAnalysisState.isAnalyzing) {
        aiAnalysisState.shouldStop = true;
        showToast('⏹️ 正在停止分析...', 'info');
    }
}

// 改进的AI调用函数 - 增强Prompt
async function callAIAPIEnhanced(text) {
    const model = validateAIConfig();

    const systemPrompt = `你是一个专业的英语语法分析专家。请仔细分析以下英文句子的语法成分，并以JSON格式返回结果。

分析要求：
1. 识别所有主要句子成分
2. 区分主句和从句
3. 准确定位每个成分在原文中的位置

语法类别说明：
- mainSubject: 主句的主语（黑色加粗）
- clauseSubject: 从句的主语（绿色加粗）
- mainVerb: 主句的谓语动词（红色加粗）
- clauseVerb: 从句的谓语动词（深红色加粗）
- object: 宾语或表语（橙色）
- attribute: 定语（紫色，会自动添加括号）
- adverbial: 状语（蓝色，会自动添加方括号）
- conjunction: 连词（蓝绿色）
- clauseMarker: 从句引导词（粉色，会自动添加花括号）

返回JSON格式：
{
  "annotations": [
    {"text": "需要标注的文本", "category": "语法类别", "start": 起始位置, "end": 结束位置}
  ]
}

重要：只返回JSON，不要添加任何解释。确保start和end位置准确。`;

    const requestBody = {
        model: model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请分析这个句子：\n\n${text}` }
        ],
        temperature: 0.2,
        max_tokens: 3000
    };

    const response = await fetch(state.aiConfig.apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.aiConfig.apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 提取JSON
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        // 验证结果格式
        if (!result.annotations || !Array.isArray(result.annotations)) {
            throw new Error('AI返回格式错误：缺少annotations数组');
        }
        return result;
    } else {
        throw new Error('AI返回的内容不是有效的JSON格式');
    }
}

// 替换原有的AI分析函数
if (typeof handleAIAnalyze !== 'undefined') {
    // 保存原函数引用
    window.handleAIAnalyzeOriginal = handleAIAnalyze;
}

// 使用增强版本
window.handleAIAnalyze = handleAIAnalyzeEnhanced;
window.stopAIAnalysis = stopAIAnalysis;

console.log('✅ AI语法分析增强功能已加载 v4.2 - 支持逐句分析');

// 初始化粘性工具栏
function initStickyToolbar() {
    const toolbar = document.querySelector('.formatting-toolbar');
    if (!toolbar) return;

    // 创建一个观察元素，用于检测工具栏是否粘住
    const sentinelTop = document.createElement('div');
    sentinelTop.className = 'toolbar-sentinel-top';
    sentinelTop.style.cssText = 'position: absolute; top: -1px; height: 1px; width: 1px;';
    toolbar.parentElement.insertBefore(sentinelTop, toolbar);

    // 使用 IntersectionObserver 检测工具栏粘性状态
    const observer = new IntersectionObserver(
        ([entry]) => {
            // 当 sentinel 不可见时，工具栏处于粘性状态
            if (!entry.isIntersecting) {
                toolbar.classList.add('is-stuck');
            } else {
                toolbar.classList.remove('is-stuck');
            }
        },
        { threshold: [0], rootMargin: '0px' }
    );

    observer.observe(sentinelTop);
}

// 高亮显示所有连接的标注
function highlightAllOccurrences(record) {
    // 移除之前的临时高亮
    document.querySelectorAll('.highlight.temp-highlight').forEach(el => {
        el.classList.remove('temp-highlight');
    });

    // 获取所有相关的标注ID
    const allIds = [record.id];
    if (record.linkedAnnotations && record.linkedAnnotations.length > 0) {
        allIds.push(...record.linkedAnnotations);
    }

    // 高亮所有相关标注
    allIds.forEach((id, index) => {
        const highlightEl = document.querySelector(`.highlight[data-id="${id}"]`);
        if (highlightEl) {
            highlightEl.classList.add('temp-highlight');

            // 滚动到第一个
            if (index === 0) {
                highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });

    // 3秒后移除临时高亮
    setTimeout(() => {
        document.querySelectorAll('.highlight.temp-highlight').forEach(el => {
            el.classList.remove('temp-highlight');
        });
    }, 3000);

    // 显示提示
    if (typeof showToast === 'function') {
        showToast(`✓ 已高亮 ${allIds.length} 处"${record.text}"`, 'info');
    }
}

// ======================== 类别管理功能 ========================

function showCategoryManageModal() {
    renderCategoryList();
    dom.categoryManageModal.classList.remove('hidden');
}

function hideCategoryManageModal() {
    dom.categoryManageModal.classList.add('hidden');
}

function renderCategoryList() {
    if (!dom.categoryList) return;

    const html = state.customCategories.map((cat, index) => {
        // 确保defaultStyle存在
        const style = cat.defaultStyle || {
            color: null,
            textColor: null,
            bold: false,
            underline: false,
            borderStyle: 'none',
            borderColor: null,
            underlineColor: null
        };

        return `
        <div class="category-item" style="border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px; overflow: hidden;">
            <!-- 类别基本信息 -->
            <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: #f8f9fa;">
                <input type="text" value="${cat.label}" data-index="${index}" class="category-label-input" style="flex: 1; padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-weight: 500;">
                <label style="display: flex; align-items: center; gap: 5px; white-space: nowrap;">
                    <input type="checkbox" ${cat.applyStyle ? 'checked' : ''} data-index="${index}" class="category-style-toggle">
                    <span style="font-size: 13px;">应用样式</span>
                </label>
                <button type="button" class="category-style-config-btn ghost-btn" data-index="${index}" style="padding: 4px 8px; font-size: 12px;">⚙️ 样式配置</button>
                <button type="button" class="category-delete-btn ghost-btn" data-index="${index}" style="padding: 4px 8px; font-size: 12px;">🗑️</button>
            </div>

            <!-- 样式配置区域（可折叠） -->
            <div class="category-style-config" data-index="${index}" style="display: none; padding: 16px; background: #fff; border-top: 1px solid #e0e0e0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <!-- 背景颜色 -->
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #666;">背景颜色</label>
                        <select data-index="${index}" data-property="color" class="category-style-input" style="width: 100%; padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                            <option value="">无</option>
                            <option value="honey" ${style.color === 'honey' ? 'selected' : ''}>🍯 蜜糖色</option>
                            <option value="mint" ${style.color === 'mint' ? 'selected' : ''}>🌿 薄荷色</option>
                            <option value="sky" ${style.color === 'sky' ? 'selected' : ''}>☁️ 天空色</option>
                            <option value="orchid" ${style.color === 'orchid' ? 'selected' : ''}>🌸 兰花色</option>
                            <option value="sunset" ${style.color === 'sunset' ? 'selected' : ''}>🌅 落日色</option>
                        </select>
                    </div>

                    <!-- 文本颜色 -->
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #666;">文本颜色</label>
                        <input type="color" data-index="${index}" data-property="textColor" class="category-style-input" value="${style.textColor || '#000000'}" style="width: 100%; height: 34px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                        <button type="button" class="category-clear-color-btn" data-index="${index}" data-property="textColor" style="font-size: 11px; padding: 2px 6px; margin-top: 4px;">清除</button>
                    </div>

                    <!-- 文本样式 -->
                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #666;">文本样式</label>
                        <div style="display: flex; gap: 16px;">
                            <label style="display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" data-index="${index}" data-property="bold" class="category-style-input" ${style.bold ? 'checked' : ''}>
                                <span style="font-size: 13px; font-weight: bold;">加粗</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" data-index="${index}" data-property="underline" class="category-style-input" ${style.underline ? 'checked' : ''}>
                                <span style="font-size: 13px; text-decoration: underline;">下划线</span>
                            </label>
                        </div>
                    </div>

                    <!-- 边框样式 -->
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #666;">边框样式</label>
                        <select data-index="${index}" data-property="borderStyle" class="category-style-input" style="width: 100%; padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                            <option value="none" ${style.borderStyle === 'none' ? 'selected' : ''}>无</option>
                            <option value="square" ${style.borderStyle === 'square' ? 'selected' : ''}>□ 方框</option>
                            <option value="round" ${style.borderStyle === 'round' ? 'selected' : ''}>○ 圆框</option>
                            <option value="dashed" ${style.borderStyle === 'dashed' ? 'selected' : ''}>-- 虚线</option>
                        </select>
                    </div>

                    <!-- 边框颜色 -->
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #666;">边框颜色</label>
                        <input type="color" data-index="${index}" data-property="borderColor" class="category-style-input" value="${style.borderColor || '#2563eb'}" style="width: 100%; height: 34px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                        <button type="button" class="category-clear-color-btn" data-index="${index}" data-property="borderColor" style="font-size: 11px; padding: 2px 6px; margin-top: 4px;">清除</button>
                    </div>

                    <!-- 下划线颜色 -->
                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #666;">下划线颜色</label>
                        <input type="color" data-index="${index}" data-property="underlineColor" class="category-style-input" value="${style.underlineColor || '#2563eb'}" style="width: 200px; height: 34px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                        <button type="button" class="category-clear-color-btn" data-index="${index}" data-property="underlineColor" style="font-size: 11px; padding: 2px 6px; margin-left: 8px;">清除</button>
                    </div>
                </div>

                <!-- 预览 -->
                <div style="margin-top: 16px; padding: 12px; background: #f8f9fa; border-radius: 6px;">
                    <span style="font-size: 12px; color: #666; display: block; margin-bottom: 8px;">预览效果：</span>
                    <span class="category-style-preview" data-index="${index}" style="font-size: 16px; ${generatePreviewStyle(style)}">示例文本 Sample Text</span>
                </div>
            </div>
        </div>
        `;
    }).join('');

    dom.categoryList.innerHTML = html;

    // 绑定事件
    dom.categoryList.querySelectorAll('.category-label-input').forEach(input => {
        input.addEventListener('change', handleCategoryLabelChange);
    });

    dom.categoryList.querySelectorAll('.category-style-toggle').forEach(checkbox => {
        checkbox.addEventListener('change', handleCategoryStyleToggle);
    });

    dom.categoryList.querySelectorAll('.category-delete-btn').forEach(btn => {
        btn.addEventListener('click', handleCategoryDelete);
    });

    dom.categoryList.querySelectorAll('.category-style-config-btn').forEach(btn => {
        btn.addEventListener('click', handleCategoryStyleConfigToggle);
    });

    dom.categoryList.querySelectorAll('.category-style-input').forEach(input => {
        input.addEventListener('change', handleCategoryStylePropertyChange);
        input.addEventListener('input', handleCategoryStylePropertyChange);
    });

    dom.categoryList.querySelectorAll('.category-clear-color-btn').forEach(btn => {
        btn.addEventListener('click', handleCategoryClearColor);
    });
}

// 生成预览样式
function generatePreviewStyle(style) {
    const styles = [];

    if (style.color) {
        // 使用CSS类
        styles.push(`background-color: var(--color-${style.color})`);
    }
    if (style.textColor) {
        styles.push(`color: ${style.textColor}`);
    }
    if (style.bold) {
        styles.push('font-weight: bold');
    }
    if (style.underline) {
        styles.push('text-decoration: underline');
        if (style.underlineColor) {
            styles.push(`text-decoration-color: ${style.underlineColor}`);
        }
    }
    if (style.borderStyle && style.borderStyle !== 'none') {
        const borderColor = style.borderColor || '#2563eb';
        if (style.borderStyle === 'round') {
            styles.push(`border: 2px solid ${borderColor}`);
            styles.push('border-radius: 12px');
            styles.push('padding: 2px 8px');
        } else if (style.borderStyle === 'square') {
            styles.push(`border: 2px solid ${borderColor}`);
            styles.push('border-radius: 2px');
            styles.push('padding: 2px 6px');
        } else if (style.borderStyle === 'dashed') {
            styles.push(`border: 2px dashed ${borderColor}`);
            styles.push('border-radius: 2px');
            styles.push('padding: 2px 6px');
        }
    }

    return styles.join('; ');
}

// 切换样式配置区域显示
function handleCategoryStyleConfigToggle(event) {
    const index = event.target.dataset.index;
    const configDiv = dom.categoryList.querySelector(`.category-style-config[data-index="${index}"]`);
    if (configDiv) {
        const isHidden = configDiv.style.display === 'none';
        configDiv.style.display = isHidden ? 'block' : 'none';
        event.target.textContent = isHidden ? '⚙️ 关闭配置' : '⚙️ 样式配置';
    }
}

// 处理样式属性变化
function handleCategoryStylePropertyChange(event) {
    const index = parseInt(event.target.dataset.index);
    const property = event.target.dataset.property;
    const cat = state.customCategories[index];

    if (!cat.defaultStyle) {
        cat.defaultStyle = {
            color: null,
            textColor: null,
            bold: false,
            underline: false,
            borderStyle: 'none',
            borderColor: null,
            underlineColor: null
        };
    }

    // 根据输入类型处理值
    if (event.target.type === 'checkbox') {
        cat.defaultStyle[property] = event.target.checked;
    } else if (event.target.type === 'color') {
        cat.defaultStyle[property] = event.target.value;
    } else if (property === 'color' || property === 'borderStyle') {
        cat.defaultStyle[property] = event.target.value || null;
    } else {
        cat.defaultStyle[property] = event.target.value;
    }

    persistState();

    // 更新预览
    const previewEl = dom.categoryList.querySelector(`.category-style-preview[data-index="${index}"]`);
    if (previewEl) {
        previewEl.style.cssText = generatePreviewStyle(cat.defaultStyle) + '; font-size: 16px;';
    }

    showToast('样式已更新', 'success');
}

// 清除颜色
function handleCategoryClearColor(event) {
    const index = parseInt(event.target.dataset.index);
    const property = event.target.dataset.property;
    const cat = state.customCategories[index];

    if (cat.defaultStyle) {
        cat.defaultStyle[property] = null;
    }

    persistState();

    // 重新渲染
    renderCategoryList();

    showToast('颜色已清除', 'success');
}

function handleCategoryLabelChange(event) {
    const index = parseInt(event.target.dataset.index);
    const newLabel = event.target.value.trim();

    if (!newLabel) {
        showToast('类别名称不能为空', 'warning');
        event.target.value = state.customCategories[index].label;
        return;
    }

    state.customCategories[index].label = newLabel;
    persistState();
    renderCategoryButtons();
    showToast('类别已更新', 'success');
}

function handleCategoryStyleToggle(event) {
    const index = parseInt(event.target.dataset.index);
    state.customCategories[index].applyStyle = event.target.checked;
    persistState();
    showToast(event.target.checked ? '已启用样式' : '已禁用样式（仅标注类别）', 'success');
}

function handleCategoryDelete(event) {
    const index = parseInt(event.target.dataset.index);
    const category = state.customCategories[index];

    if (confirm(`确定要删除类别"${category.label}"吗？`)) {
        state.customCategories.splice(index, 1);
        persistState();
        renderCategoryList();
        renderCategoryButtons();
        showToast('类别已删除', 'success');
    }
}

function handleAddCategory() {
    const newCategory = {
        id: `custom_${Date.now()}`,
        label: '新类别',
        applyStyle: true
    };

    state.customCategories.push(newCategory);
    persistState();
    renderCategoryList();
    renderCategoryButtons();
    showToast('类别已添加', 'success');
}

function renderCategoryButtons() {
    const container = document.querySelector('.category-group');
    if (!container) return;

    // 保存当前选中的类别
    const currentCategory = state.lastCategory;

    // 移除所有已存在的自定义类别按钮（避免重复）
    container.querySelectorAll('.format-category-btn[data-category^="custom_"]').forEach(btn => {
        btn.remove();
    });

    // 获取设置按钮，用于在它之前插入自定义按钮
    const settingsBtn = container.querySelector('#manageCategoriesBtn');

    // 添加自定义类别按钮
    state.customCategories.forEach(cat => {
        // 检查是否已存在该按钮，避免重复添加
        if (container.querySelector(`[data-category="${cat.id}"]`)) {
            return;
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'format-category-btn';
        btn.dataset.category = cat.id;
        btn.title = cat.applyStyle ? cat.label : `${cat.label}（仅类别）`;
        btn.textContent = cat.label;

        // 恢复选中状态
        if (cat.id === currentCategory) {
            btn.classList.add('active');
        }

        // 如果不应用样式，添加特殊标记
        if (!cat.applyStyle) {
            btn.style.opacity = '0.7';
            btn.style.fontStyle = 'italic';
        }

        // 绑定点击事件
        btn.addEventListener('click', () => handleFormatCategorySelection(btn));

        // 在设置按钮之前插入
        if (settingsBtn) {
            container.insertBefore(btn, settingsBtn);
        } else {
            container.appendChild(btn);
        }
    });

    // 更新 dom.formatCategoryButtons 引用
    dom.formatCategoryButtons = container.querySelectorAll('.format-category-btn');
}

function getCategoryLabel(categoryId) {
    // 先查找自定义类别
    const customCat = state.customCategories.find(c => c.id === categoryId);
    if (customCat) {
        return customCat.label;
    }
    // 回退到预设标签
    return CATEGORY_LABELS[categoryId] || categoryId;
}

function handleFormatCategorySelection(btn) {
    const category = btn.dataset.category;
    const isActive = btn.classList.contains('active');
    console.log('[DEBUG] 📂 格式化工具栏类别按钮点击', { category, isActive });

    // 支持取消选择：如果已选中，则取消选中
    if (isActive) {
        btn.classList.remove('active');
        state.lastCategory = null;
        console.log('[DEBUG] ⭕ 取消类别选择');
    } else {
        // 取消其他按钮的选中状态
        document.querySelectorAll('.format-category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.lastCategory = category;
        console.log('[DEBUG] ✅ 类别已选中', { category });

        // 检查类别的 applyStyle 设置和默认样式
        const categoryConfig = state.customCategories.find(c => c.id === category);

        if (categoryConfig && !categoryConfig.applyStyle) {
            // 仅分类模式：清除所有格式状态
            state.lastColor = null;
            state.lastBold = false;
            state.lastUnderline = false;
            state.lastDashed = false;
            state.lastSlash = false;
            state.lastBorderStyle = 'none';
            state.lastCustomTextColor = null;
            state.lastUnderlineColor = null;
            state.lastBorderColor = null;

            // 清除UI状态
            updateActiveColorButtons(dom.colorButtons, null);
            updateActiveColorButtons(dom.formatColorButtons, null);
            if (dom.formatBoldToggle) dom.formatBoldToggle.classList.remove('active');
            if (dom.formatUnderlineToggle) dom.formatUnderlineToggle.classList.remove('active');
            if (dom.formatDashedToggle) dom.formatDashedToggle.classList.remove('active');
            if (dom.formatSlashToggle) dom.formatSlashToggle.classList.remove('active');

            document.querySelectorAll('.format-border-btn').forEach(b => b.classList.remove('active'));

            console.log('[DEBUG] 🚫 仅分类模式：已清除所有格式');
        } else if (categoryConfig && categoryConfig.defaultStyle) {
            // 应用类别的默认样式
            const style = categoryConfig.defaultStyle;
            console.log('[DEBUG] 🎨 应用类别默认样式', style);

            // 应用背景颜色
            state.lastColor = style.color || null;
            updateActiveColorButtons(dom.colorButtons, style.color);
            updateActiveColorButtons(dom.formatColorButtons, style.color);

            // 应用文本样式
            state.lastBold = style.bold || false;
            state.lastUnderline = style.underline || false;

            // 更新按钮状态
            if (dom.formatBoldToggle) {
                if (state.lastBold) {
                    dom.formatBoldToggle.classList.add('active');
                } else {
                    dom.formatBoldToggle.classList.remove('active');
                }
            }

            if (dom.formatUnderlineToggle) {
                if (state.lastUnderline) {
                    dom.formatUnderlineToggle.classList.add('active');
                } else {
                    dom.formatUnderlineToggle.classList.remove('active');
                }
            }

            // 应用边框样式
            state.lastBorderStyle = style.borderStyle || 'none';
            state.lastBorderColor = style.borderColor || null;

            // 更新边框按钮状态
            document.querySelectorAll('.format-border-btn').forEach(b => {
                if (b.dataset.border === state.lastBorderStyle) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });

            // 应用文本颜色
            state.lastCustomTextColor = style.textColor || null;
            if (dom.textColorBtn && style.textColor) {
                dom.textColorBtn.style.background = `linear-gradient(135deg, ${style.textColor} 0%, ${style.textColor} 100%)`;
            } else if (dom.textColorBtn) {
                dom.textColorBtn.style.background = '';
            }

            // 应用下划线颜色
            state.lastUnderlineColor = style.underlineColor || null;
            if (dom.underlineColorBtn) {
                if (state.lastUnderline && style.underlineColor) {
                    dom.underlineColorBtn.classList.remove('hidden');
                    dom.underlineColorBtn.style.background = `linear-gradient(135deg, ${style.underlineColor} 0%, ${style.underlineColor} 100%)`;
                } else {
                    dom.underlineColorBtn.classList.add('hidden');
                    dom.underlineColorBtn.style.background = '';
                }
            }

            console.log('[DEBUG] ✅ 默认样式已应用', {
                color: state.lastColor,
                bold: state.lastBold,
                underline: state.lastUnderline,
                borderStyle: state.lastBorderStyle,
                textColor: state.lastCustomTextColor
            });
        }
    }
    persistState();
}

// 初始化类别管理
function initCategoryManagement() {
    // 清理可能重复的预设类别按钮
    const container = document.querySelector('.category-group');
    if (container) {
        // 预设类别列表
        const presetCategories = ['vocab', 'phrase', 'difficulty', 'keypoint', 'translation'];

        presetCategories.forEach(category => {
            // 找到所有该类别的按钮
            const buttons = container.querySelectorAll(`[data-category="${category}"]`);
            // 如果有多个，只保留第一个，删除其余的
            if (buttons.length > 1) {
                for (let i = 1; i < buttons.length; i++) {
                    buttons[i].remove();
                }
            }
        });
    }

    if (dom.manageCategoriesBtn) {
        dom.manageCategoriesBtn.addEventListener('click', showCategoryManageModal);
    }

    if (dom.closeCategoryManageBtn) {
        dom.closeCategoryManageBtn.addEventListener('click', hideCategoryManageModal);
    }

    if (dom.addCategoryBtn) {
        dom.addCategoryBtn.addEventListener('click', handleAddCategory);
    }

    // 渲染初始按钮
    renderCategoryButtons();
}

// ======================== 颜色选择功能 ========================

// 7种颜色 × 3种深浅 = 21种预设颜色
const PRESET_COLORS = {
    red: {
        light: '#fca5a5',   // 浅红
        medium: '#ef4444',  // 中红
        dark: '#991b1b'     // 深红
    },
    orange: {
        light: '#fdba74',   // 浅橙
        medium: '#f97316',  // 中橙
        dark: '#9a3412'     // 深橙
    },
    yellow: {
        light: '#fde047',   // 浅黄
        medium: '#eab308',  // 中黄
        dark: '#854d0e'     // 深黄
    },
    green: {
        light: '#86efac',   // 浅绿
        medium: '#22c55e',  // 中绿
        dark: '#166534'     // 深绿
    },
    blue: {
        light: '#93c5fd',   // 浅蓝
        medium: '#3b82f6',  // 中蓝
        dark: '#1e3a8a'     // 深蓝
    },
    purple: {
        light: '#c4b5fd',   // 浅紫
        medium: '#8b5cf6',  // 中紫
        dark: '#5b21b6'     // 深紫
    },
    gray: {
        light: '#d1d5db',   // 浅灰
        medium: '#6b7280',  // 中灰
        dark: '#1f2937'     // 深灰
    }
};

let currentColorTarget = null; // 当前正在选择颜色的目标类型

function initColorPicker() {
    // 渲染颜色网格
    renderColorGrid();

    // 使用事件委托为颜色网格绑定点击事件（避免内存泄漏）
    if (dom.colorGrid) {
        dom.colorGrid.addEventListener('click', (e) => {
            const option = e.target.closest('.color-option');
            if (option) {
                const color = option.dataset.color;
                selectColor(color);
            }
        });
    }

    // 绑定颜色按钮事件
    if (dom.textColorBtn) {
        dom.textColorBtn.addEventListener('click', (e) => showColorPicker(e, 'text'));
    }
    if (dom.underlineColorBtn) {
        dom.underlineColorBtn.addEventListener('click', (e) => showColorPicker(e, 'underline'));
    }
    if (dom.squareBorderColorBtn) {
        dom.squareBorderColorBtn.addEventListener('click', (e) => showColorPicker(e, 'border'));
    }
    if (dom.roundBorderColorBtn) {
        dom.roundBorderColorBtn.addEventListener('click', (e) => showColorPicker(e, 'border'));
    }

    // 点击其他地方关闭面板
    document.addEventListener('click', (e) => {
        if (dom.colorPickerPanel && !dom.colorPickerPanel.classList.contains('hidden')) {
            if (!dom.colorPickerPanel.contains(e.target) &&
                !e.target.classList.contains('color-select-btn')) {
                hideColorPicker();
            }
        }
    });
}

function renderColorGrid() {
    if (!dom.colorGrid) return;

    const colorOrder = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];
    const shadeOrder = ['light', 'medium', 'dark'];

    let html = '';
    shadeOrder.forEach(shade => {
        colorOrder.forEach(colorName => {
            const colorValue = PRESET_COLORS[colorName][shade];
            html += `<div class="color-option"
                         data-color="${colorValue}"
                         style="background-color: ${colorValue};"
                         title="${colorName} - ${shade}"></div>`;
        });
    });

    dom.colorGrid.innerHTML = html;

    // 注意：事件监听器在 initColorPicker 中通过事件委托统一绑定
    // 不在这里单独绑定，避免内存泄漏
}

function showColorPicker(event, target) {
    event.stopPropagation();
    currentColorTarget = target;

    if (!dom.colorPickerPanel) return;

    // 显示面板
    dom.colorPickerPanel.classList.remove('hidden');

    // 定位到按钮附近
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();

    dom.colorPickerPanel.style.left = `${rect.left}px`;
    dom.colorPickerPanel.style.top = `${rect.bottom + 5}px`;

    // 防止超出视口
    setTimeout(() => {
        const panelRect = dom.colorPickerPanel.getBoundingClientRect();
        if (panelRect.right > window.innerWidth) {
            dom.colorPickerPanel.style.left = `${window.innerWidth - panelRect.width - 10}px`;
        }
        if (panelRect.bottom > window.innerHeight) {
            dom.colorPickerPanel.style.top = `${rect.top - panelRect.height - 5}px`;
        }
    }, 0);

    // 高亮当前选中的颜色
    updateSelectedColor();
}

function hideColorPicker() {
    if (dom.colorPickerPanel) {
        dom.colorPickerPanel.classList.add('hidden');
    }
    currentColorTarget = null;
}

function updateSelectedColor() {
    if (!dom.colorGrid) return;

    let currentColor = null;
    switch (currentColorTarget) {
        case 'text':
            currentColor = state.lastCustomTextColor;
            break;
        case 'underline':
            currentColor = state.lastUnderlineColor;
            break;
        case 'border':
            currentColor = state.lastBorderColor;
            break;
    }

    // 移除所有选中状态
    dom.colorGrid.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    // 添加当前选中状态
    if (currentColor) {
        const selectedOption = dom.colorGrid.querySelector(`[data-color="${currentColor}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    }
}

function selectColor(color) {
    switch (currentColorTarget) {
        case 'text':
            state.lastCustomTextColor = color;
            if (dom.textColorBtn) {
                dom.textColorBtn.style.background = color;
            }
            break;
        case 'underline':
            state.lastUnderlineColor = color;
            if (dom.underlineColorBtn) {
                dom.underlineColorBtn.style.background = color;
            }
            break;
        case 'border':
            state.lastBorderColor = color;
            if (dom.squareBorderColorBtn) {
                dom.squareBorderColorBtn.style.background = color;
            }
            if (dom.roundBorderColorBtn) {
                dom.roundBorderColorBtn.style.background = color;
            }
            break;
    }

    persistState();
    updateSelectedColor();
    hideColorPicker();
}
