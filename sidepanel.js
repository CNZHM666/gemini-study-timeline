const STORAGE_PREFIX = "gemini:session:";
const BRANCH_PREFIX = "gemini:branch:";
const MAX_SUMMARY_LENGTH = 72;
// Keep a larger branch history so the sub-question index is not truncated
// when conversations become long.
const MAX_BRANCH_MESSAGES = 600;
const DEFAULT_FOLDER_ID = "folder_default";
const DEFAULT_FOLDER_NAME = "未分类";
const MAX_CONVERSATION_TITLE_LENGTH = 64;
const MAX_NODE_TITLE_LENGTH = 64;
const MAX_FOLDER_NAME_LENGTH = 32;
const MAX_STUDY_NOTE_LENGTH = 3000;
const SETTINGS_KEY = "gemini:settings:v1";
const HOME_KEY = "gemini:home:v1";
const HOME_INDEX_KEY = "gemini:home:index:v1";
const HOME_DEFAULT_FOLDER_ID = "home_default";
const DEFAULT_ACCOUNT_SCOPE = "u0";
const PANEL_NAV_KEY = "gemini:panel:navigate:v1";
const PANEL_NAV_TTL_MS = 120000;
const FOLLOWUP_FOCUS_MAX_WIDTH = 760;
const CONVERSATION_CACHE_TTL_MS = 2 * 60 * 1000;
const CONVERSATION_PRELOAD_LIMIT = 3;
const CONVERSATION_CACHE_MAX_SIZE = 24;
const BRANCH_THREAD_CACHE_MAX_SIZE = 180;
const SCROLL_REQUEST_DEBOUNCE_MS = 130;
const SCROLL_REQUEST_DUPLICATE_WINDOW_MS = 260;
const TIMELINE_TREE_BUILD_CHUNK_SIZE = 80;
const TIMELINE_TREE_SYNC_ENTRY_THRESHOLD = 180;
const TIMELINE_TREE_FRAME_BUDGET_MS = 7;
const TIMELINE_SEARCH_DEBOUNCE_MS = 120;
const PANEL_REFRESH_DEBOUNCE_MS = 180;
const PANEL_REFRESH_MIN_INTERVAL_MS = 600;
const PANEL_RESIZE_SETTLE_MS = 260;
const POST_SELECTION_RENDER_DELAY_MS = 80;
const FORCE_BRANCH_INDEX_AGGREGATE_MODE = true;
const BRANCH_INDEX_AGGREGATE_MAX_MESSAGES = 2400;
const BRANCH_TREE_ENTRY_NODE_PREFIX = "__entry__::";
const HOME_TURN_REFRESH_DEBOUNCE_MS = 900;
const HOME_AUTO_CLASSIFY_MAX_SCAN = 180;
const BRANCH_STATUS_TICK_MS = 900;
const DETAIL_MARKDOWN_CACHE_MAX_SIZE = 48;
const TIMELINE_FOLDER_TONE_COUNT = 6;

const DEFAULT_HOME_AUTO_CLASSIFY_RULE_TEMPLATES = [
  {
    folderName: { zh: "编程开发", en: "Coding Dev" },
    keywords: [
      "代码",
      "编程",
      "开发",
      "调试",
      "bug",
      "报错",
      "javascript",
      "typescript",
      "python",
      "java",
      "c++",
      "react",
      "vue",
      "node",
      "api",
      "sql",
      "算法",
      "数据结构"
    ]
  },
  {
    folderName: { zh: "学习考试", en: "Study Exams" },
    keywords: [
      "学习",
      "复习",
      "考试",
      "题目",
      "作业",
      "笔记",
      "高数",
      "线性代数",
      "概率论",
      "英语",
      "雅思",
      "托福",
      "考研"
    ]
  },
  {
    folderName: { zh: "写作润色", en: "Writing Edit" },
    keywords: [
      "写作",
      "润色",
      "改写",
      "扩写",
      "缩写",
      "文案",
      "公众号",
      "小红书",
      "标题",
      "开头",
      "结尾",
      "邮件",
      "简历"
    ]
  },
  {
    folderName: { zh: "翻译语言", en: "Translation" },
    keywords: [
      "翻译",
      "中译英",
      "英译中",
      "日译中",
      "韩译中",
      "语法",
      "口语",
      "单词",
      "表达",
      "英文",
      "日文",
      "韩文"
    ]
  },
  {
    folderName: { zh: "办公数据", en: "Office Data" },
    keywords: [
      "excel",
      "表格",
      "函数",
      "透视表",
      "ppt",
      "演示",
      "word",
      "报告",
      "周报",
      "数据分析",
      "可视化",
      "统计"
    ]
  },
  {
    folderName: { zh: "产品运营", en: "Product Ops" },
    keywords: [
      "产品",
      "需求",
      "prd",
      "原型",
      "竞品",
      "用户调研",
      "运营",
      "拉新",
      "留存",
      "转化",
      "增长",
      "活动方案"
    ]
  }
];

function cloneHomeAutoClassifyRule(rule) {
  return {
    folderName: String(rule?.folderName || ""),
    keywords: Array.isArray(rule?.keywords) ? [...rule.keywords] : []
  };
}

function getDefaultHomeAutoClassifyRules(locale = currentLocale) {
  const normalizedLocale = normalizeLocale(locale);
  return DEFAULT_HOME_AUTO_CLASSIFY_RULE_TEMPLATES.map((rule) => ({
    folderName: rule.folderName?.[normalizedLocale] || rule.folderName?.zh || "",
    keywords: [...rule.keywords]
  }));
}

function buildHomeAutoClassifyKeywordSignature(keywords = []) {
  return (Array.isArray(keywords) ? keywords : [])
    .map((item) => normalizeSingleLine(item || "", 48).toLowerCase())
    .filter(Boolean)
    .join("|");
}

function localizeDefaultHomeAutoClassifyRules(rules, locale = currentLocale) {
  const normalizedLocale = normalizeLocale(locale);
  const templateMap = new Map(
    DEFAULT_HOME_AUTO_CLASSIFY_RULE_TEMPLATES.map((rule) => [
      buildHomeAutoClassifyKeywordSignature(rule.keywords),
      rule
    ])
  );
  return (Array.isArray(rules) ? rules : []).map((rule) => {
    const signature = buildHomeAutoClassifyKeywordSignature(rule?.keywords);
    const template = templateMap.get(signature);
    if (!template) return cloneHomeAutoClassifyRule(rule);
    const localizedNames = new Set(Object.values(template.folderName || {}));
    const currentName = String(rule?.folderName || "");
    if (!localizedNames.has(currentName)) return cloneHomeAutoClassifyRule(rule);
    return {
      folderName: template.folderName?.[normalizedLocale] || template.folderName?.zh || currentName,
      keywords: [...template.keywords]
    };
  });
}

const timelineListEl = document.getElementById("timelineList");
const timelineEmptyEl = document.getElementById("timelineEmpty");
const detailTitleEl = document.getElementById("detailTitle");
const detailTimeEl = document.getElementById("detailTime");
const detailMarkdownEl = document.getElementById("detailMarkdown") || document.createElement('div');
const openNodeSettingsBtnEl = document.getElementById("openNodeSettingsBtn");
const openNodeNoteBtnEl = document.getElementById("openNodeNoteBtn");
const detailBranchViewEl = document.getElementById("detailBranchView");
const branchTimelineRailEl = document.getElementById("branchTimelineRail");
const branchTimelineRailHeadEl = document.getElementById("branchTimelineRailHead");
const branchTimelineListEl = document.getElementById("branchTimelineList");
const detailSettingsViewEl = document.getElementById("detailSettingsView");
const detailNoteViewEl = document.getElementById("detailNoteView");
const settingsTitleEl = document.getElementById("settingsTitle");
const noteTitleEl = document.getElementById("noteTitle");
const noteHistoryTitleEl = document.getElementById("noteHistoryTitle");
const noteHistoryListEl = document.getElementById("noteHistoryList");
const noteHistoryEmptyEl = document.getElementById("noteHistoryEmpty");
const noteLibraryCurrentBtnEl = document.getElementById("noteLibraryCurrentBtn");
const noteLibraryAllBtnEl = document.getElementById("noteLibraryAllBtn");
const noteLibraryImageBtnEl = document.getElementById("noteLibraryImageBtn");
const noteLibrarySortBtnEl = document.getElementById("noteLibrarySortBtn");
const noteLibrarySearchInputEl = document.getElementById("noteLibrarySearchInput");
const noteLibraryMetaEl = document.getElementById("noteLibraryMeta");
let noteLibraryMistakeBtnEl = null;
let noteLibraryReviewBtnEl = null;
let noteLibraryMarkReviewedBtnEl = null;
let noteLibraryGuideEl = null;
let learningCategoryPanelEl = null;
let learningCategoryTitleEl = null;
let learningCategoryHintEl = null;
let learningCategorySummaryEl = null;
let learningCategoryInputEl = null;
let learningCategoryAddBtnEl = null;
let learningCategoryStatusEl = null;
let learningCategoryListEl = null;
let pendingQuestionBoardEl = null;
let pendingQuestionBoardTitleEl = null;
let pendingQuestionBoardHintEl = null;
let pendingQuestionBoardTabsEl = null;
let pendingQuestionPendingBtnEl = null;
let pendingQuestionReviewBtnEl = null;
let pendingQuestionFollowupBtnEl = null;
let timelineSyncStatusEl = null;
const locateBtnEl = document.getElementById("locateBtn");
const branchMetaEl = document.getElementById("branchMeta");
const branchTreePanelEl = document.getElementById("branchTreePanel");
const branchTreeTitleEl = document.getElementById("branchTreeTitle");
const branchTreeListEl = document.getElementById("branchTreeList");
const branchTreeCollapseAllBtnEl = document.getElementById("branchTreeCollapseAllBtn");
const branchTreeExpandAllBtnEl = document.getElementById("branchTreeExpandAllBtn");
const branchMiniTimelineTitleEl = document.getElementById("branchMiniTimelineTitle");
const branchMiniTimelineListEl = document.getElementById("branchMiniTimelineList");
const branchThreadEl = document.getElementById("branchThread");
const branchComposeEl = document.getElementById("branchCompose");
const branchInputEl = document.getElementById("branchInput");
const branchSendBtnEl = document.getElementById("branchSendBtn");
const branchComposerStatusEl = document.getElementById("branchComposerStatus");
const branchAnchorBarEl = document.getElementById("branchAnchorBar");
const branchAnchorTextEl = document.getElementById("branchAnchorText");
const clearBranchAnchorBtnEl = document.getElementById("clearBranchAnchorBtn");
const branchAddBtnEl = document.getElementById("branchAddBtn");
const branchAddMenuEl = document.getElementById("branchAddMenu");
const branchQuoteSelectionBtnEl = document.getElementById("branchQuoteSelectionBtn");
const branchUploadImageBtnEl = document.getElementById("branchUploadImageBtn");
const branchUploadFileBtnEl = document.getElementById("branchUploadFileBtn");
const branchToolsBtnEl = document.getElementById("branchToolsBtn");
const branchToolsBtnTextEl = document.getElementById("branchToolsBtnText");
const branchToolsPanelEl = document.getElementById("branchToolsPanel");
const contextToolsTitleEl = document.getElementById("contextToolsTitle");
const branchModeBtnEl = document.getElementById("branchModeBtn");
const branchModeLabelEl = document.getElementById("branchModeLabel");
const branchModeMenuEl = document.getElementById("branchModeMenu");
const branchModeThinkingBtnEl = document.getElementById("branchModeThinkingBtn");
const branchModeDirectBtnEl = document.getElementById("branchModeDirectBtn");
const contextSelectionMetaEl = document.getElementById("contextSelectionMeta");
const clearContextBtnEl = document.getElementById("clearContextBtn");
const contextNodeListEl = document.getElementById("contextNodeList");
const sessionMetaEl = document.getElementById("sessionMeta");
const panelTitleEl = document.getElementById("panelTitle");
const workspaceConversationLabelEl = document.getElementById("workspaceConversationLabel");
const workspaceConversationTitleEl = document.getElementById("workspaceConversationTitle");
const refreshBtnEl = document.getElementById("refreshBtn");
const dragHintEl = document.getElementById("dragHint");
const sessionTitleInputEl = document.getElementById("sessionTitleInput");
const saveSessionTitleBtnEl = document.getElementById("saveSessionTitleBtn");
const nodeTitleInputEl = null;
const nodeFolderSelectEl = null;
const saveNodeMetaBtnEl = null;
const studyNoteInputEl = document.getElementById("studyNoteInput");
const studyNoteFileInputEl = document.getElementById("studyNoteFileInput");
const uploadStudyNoteImageBtnEl = document.getElementById("uploadStudyNoteImageBtn");
const studyNoteImagePreviewEl = document.getElementById("studyNoteImagePreview");
const studyNoteImageEl = document.getElementById("studyNoteImage");
const removeStudyNoteImageBtnEl = document.getElementById("removeStudyNoteImageBtn");
const saveStudyNoteBtnEl = document.getElementById("saveStudyNoteBtn");
const generateStudyNoteBtnEl = document.getElementById("generateStudyNoteBtn");
const studyNoteStatusEl = document.getElementById("studyNoteStatus");
const noteQuickFollowupsEl = document.getElementById("noteQuickFollowups");
const noteQuickFollowupsTitleEl = document.getElementById("noteQuickFollowupsTitle");
let completeNextBtnEl = null;
const mainLearningMapEl = document.getElementById("mainLearningMap");
const studyWorkflowActionsEl = document.getElementById("studyWorkflowActions");
const branchWorkspaceEl = document.querySelector(".branch-workspace");
const workspaceViewEl = document.getElementById("workspaceView");
const welcomeViewEl = document.getElementById("welcomeView");
const homeViewEl = document.getElementById("homeView");
const welcomeTitleEl = document.getElementById("welcomeTitle");
const welcomeDescEl = document.getElementById("welcomeDesc");
const welcomeLangLabelEl = document.getElementById("welcomeLangLabel");
const welcomeLangSelectEl = document.getElementById("welcomeLangSelect");
const welcomeContinueBtnEl = document.getElementById("welcomeContinueBtn");
const homeTitleEl = document.getElementById("homeTitle");
const homeSubtitleEl = document.getElementById("homeSubtitle");
const homeLangSelectEl = document.getElementById("homeLangSelect");
const workspaceLangSelectEl = document.getElementById("workspaceLangSelect");
const homeThemeSelectEl = document.getElementById("homeThemeSelect");
const homeTreeDirectionSelectEl = document.getElementById("homeTreeDirectionSelect");
const homeLayoutSelectEl = document.getElementById("homeLayoutSelect");
const workspaceThemeSelectEl = document.getElementById("workspaceThemeSelect");
const lowPowerModeToggleEl = document.getElementById("lowPowerModeToggle");
const exportDataBtnEl = document.getElementById("exportDataBtn");
const importDataBtnEl = document.getElementById("importDataBtn");
const importDataInputEl = document.getElementById("importDataInput");
const dataPortabilityStatusEl = document.getElementById("dataPortabilityStatus");
const backToPreviousPageBtnEl = document.getElementById("backToPreviousPageBtn");
const toggleStudySplitBtnEl = document.getElementById("toggleStudySplitBtn");
const homeRefreshBtnEl = document.getElementById("homeRefreshBtn");
const homeBackupBtnEl = document.getElementById("homeBackupBtn");
const openActiveConversationBtnEl = document.getElementById("openActiveConversationBtn");
const homeNewFolderInputEl = document.getElementById("homeNewFolderInput");
const openSettingsBtnEl = document.getElementById("openSettingsBtn");
const closeSettingsBtnEl = document.getElementById("closeSettingsBtn");
const settingsPanelOverlayEl = document.getElementById("settingsPanelOverlay");
const toggleCreateFolderBtnEl = document.getElementById("toggleCreateFolderBtn");
const toggleMoveFolderBtnEl = document.getElementById("toggleMoveFolderBtn");
const nodeManageCreateRowEl = document.getElementById("nodeManageCreateRow");
const nodeManageMoveRowEl = document.getElementById("nodeManageMoveRow");
const bulkMoveFolderSelectEl = document.getElementById("bulkMoveFolderSelect");
const moveSelectedBtnEl = document.getElementById("moveSelectedBtn");
const newFolderInputEl = document.getElementById("newFolderInput");
const addFolderBtnEl = document.getElementById("addFolderBtn");
const nodeParentFolderSelectEl = document.getElementById("nodeParentFolderSelect");
const moveStatusEl = document.getElementById("moveStatus");
const nodeManageSummaryLabelEl = document.getElementById("nodeManageSummaryLabel");
const homeAddFolderBtnEl = document.getElementById("homeAddFolderBtn");
const homeParentFolderSelectEl = document.getElementById("homeParentFolderSelect");
const homeMoveFolderSelectEl = document.getElementById("homeMoveFolderSelect");
const homeMoveBtnEl = document.getElementById("homeMoveBtn");
const homeStatusEl = document.getElementById("homeStatus");
const homeTodayPanelEl = document.getElementById("homeTodayPanel");
const homeSearchInputEl = document.getElementById("homeSearchInput");
const homeConversationListEl = document.getElementById("homeConversationList");
const homeEmptyEl = document.getElementById("homeEmpty");
const homeManageDetailsEl = document.getElementById("homeManageDetails");
const homeMoveActionsEl = document.getElementById("homeMoveActions");
const homeSelectedHintEl = document.getElementById("homeSelectedHint");
const homeManageSummaryLabelEl = document.getElementById("homeManageSummaryLabel");
const homeManageSummaryMetaEl = document.getElementById("homeManageSummaryMeta");
const homeOpenAutoClassifyBtnEl = document.getElementById("homeOpenAutoClassifyBtn");
const homeDrillSortBtnEl = document.getElementById("homeDrillSortBtn");
const homeDrillBackBtnEl = document.getElementById("homeDrillBackBtn");
const homeAutoClassifyOverlayEl = document.getElementById("homeAutoClassifyOverlay");
const homeAutoClassifyTitleEl = document.getElementById("homeAutoClassifyTitle");
const homeAutoClassifyCloseBtnEl = document.getElementById("homeAutoClassifyCloseBtn");
const homeAutoClassifyGuideEl = document.getElementById("homeAutoClassifyGuideEl");
const homeAutoClassifyEnabledEl = document.getElementById("homeAutoClassifyEnabled");
const homeAutoClassifyFolderInputEl = document.getElementById("homeAutoClassifyFolderInput");
const homeAutoClassifyKeywordsInputEl = document.getElementById("homeAutoClassifyKeywordsInput");
const homeAutoClassifyAddRuleBtnEl = document.getElementById("homeAutoClassifyAddRuleBtn");
const homeAutoClassifyEnabledLabelEl = document.getElementById("homeAutoClassifyEnabledLabel");
const homeAutoClassifyRulesInputEl = document.getElementById("homeAutoClassifyRulesInput");
const homeAutoClassifyOrderHintEl = document.getElementById("homeAutoClassifyOrderHint");
const homeAutoClassifyRuleListEl = document.getElementById("homeAutoClassifyRuleList");
const homeAutoClassifySaveBtnEl = document.getElementById("homeAutoClassifySaveBtn");
const homeAutoClassifyResetBtnEl = document.getElementById("homeAutoClassifyResetBtn");
const homeAutoClassifySaveTipEl = document.getElementById("homeAutoClassifySaveTip");
const homeAutoClassifyAdvancedSummaryEl = document.getElementById("homeAutoClassifyAdvancedSummary");
const workspaceNodePanelTitleEl = document.getElementById("workspaceNodePanelTitle");
const workspacePanelSubtitleEl = document.getElementById("workspacePanelSubtitle");
const workspaceTreeStyleSwitchEl = document.getElementById("workspaceTreeStyleSwitch");
const treeStyleWireBtnEl = document.getElementById("treeStyleWireBtn");
const treeStyleGlassBtnEl = document.getElementById("treeStyleGlassBtn");
const branchSectionTitleEl = document.getElementById("branchSectionTitle");
const studyNoteEyebrowEl = document.getElementById("studyNoteEyebrow");
const studyNoteTitleEl = document.getElementById("studyNoteTitle");
const studyNoteSuggestionsTitleEl = document.getElementById("studyNoteSuggestionsTitle");
const studyActionsTitleEl = document.getElementById("studyActionsTitle");
const studyActionsBarEl = document.getElementById("studyActionsBar");
const timelineSearchInputEl = document.getElementById("timelineSearchInput");
const pickRandomNodeBtnEl = document.getElementById("pickRandomNodeBtn");
const pickReviewNodeBtnEl = document.getElementById("pickReviewNodeBtn");
const markReviewedBtnEl = document.getElementById("markReviewedBtn");
const studyHelperStatusEl = document.getElementById("studyHelperStatus");
const studyScopeBarEl = document.getElementById("studyScopeBar");
const reviewSprintTitleEl = document.getElementById("reviewSprintTitle");
const reviewSprintMetaEl = document.getElementById("reviewSprintMeta");
const startReviewSprintBtnEl = document.getElementById("startReviewSprintBtn");
const nextReviewSprintBtnEl = document.getElementById("nextReviewSprintBtn");
const markReviewedNextBtnEl = document.getElementById("markReviewedNextBtn");
const reviewSprintStatusEl = document.getElementById("reviewSprintStatus");
const mistakeNotebookTitleEl = document.getElementById("mistakeNotebookTitle");
const mistakeNotebookMetaEl = document.getElementById("mistakeNotebookMeta");
const mistakeNotebookStatusEl = document.getElementById("mistakeNotebookStatus");
const mistakeNotebookListEl = document.getElementById("mistakeNotebookList");
const mistakeNotebookEmptyEl = document.getElementById("mistakeNotebookEmpty");
const timelineFilterBarEl = document.getElementById("timelineFilterBar");
const timelineFolderFilterBarEl = document.getElementById("timelineFolderFilterBar");
const timelineSortToggleBtnEl = document.getElementById("timelineSortToggleBtn");
const layoutRootEl = document.getElementById("layoutRoot");
const toggleTimelineBtnEl = document.getElementById("toggleTimelineBtn");
const floatingToggleBtnEl = document.getElementById("floatingToggleBtn");
const quickBackHomeBtnEl = document.getElementById("quickBackHomeBtn");
const quickBackupBtnEl = document.getElementById("quickBackupBtn");
const toggleDensityBtnEl = document.getElementById("toggleDensityBtn");
const compactViewSwitchEl = document.getElementById("compactViewSwitch");
const compactShowChatBtnEl = document.getElementById("compactShowChatBtn");
const compactShowNoteBtnEl = document.getElementById("compactShowNoteBtn");
const homeVideoMountEl = document.getElementById("homeVideoMount");
const workspaceVideoMountEl = document.getElementById("workspaceVideoMount");
const studySplitHandleEl = document.getElementById("studySplitHandle");
const videoModuleContainerEl = document.getElementById("videoModuleContainer");
const videoFocusLayerEl = document.getElementById("videoFocusLayer");
const videoToolsTitleEl = document.getElementById("videoToolsTitle");
const videoEmbedInputEl = document.getElementById("videoEmbedInput");
const loadVideoEmbedBtnEl = document.getElementById("loadVideoEmbedBtn");
const pasteVideoEmbedBtnEl = document.getElementById("pasteVideoEmbedBtn");
const openVideoEmbedTabBtnEl = document.getElementById("openVideoEmbedTabBtn");
const toggleVideoFullscreenBtnEl = document.getElementById("toggleVideoFullscreenBtn");
const clearVideoEmbedBtnEl = document.getElementById("clearVideoEmbedBtn");
const videoEmbedStatusEl = document.getElementById("videoEmbedStatus");
const videoEmbedShellEl = document.getElementById("videoEmbedShell");
const videoEmbedFrameEl = document.getElementById("videoEmbedFrame");
const videoEmbedPlaceholderEl = document.getElementById("videoEmbedPlaceholder");

let markedReady = false;
let currentConversationId = "";
let currentStorageKey = "";
let currentSessionUrl = "";
let currentConversationTitle = "";
let currentMainNote = "";
let currentMainNoteImage = "";
let currentTimelineBookmarks = {};
let currentFolders = normalizeFolders([]);
let collapsedFolderIds = new Set();
let currentEntries = [];
let selectedEntryKey = "";
let selectedContextEntryKeys = new Set();
let currentBranchMessages = [];
let currentConversationBranchIndexMessages = [];
let currentBranchNodeNotes = {};
let branchBusy = false;
let branchLoadToken = 0;
let currentLocale = "zh";
let currentTheme = "gemini";
let themeApplyToken = 0;
let settingsState = {
  welcomeCompleted: false,
  branchDragGuideDismissed: false,
  locale: "zh",
  theme: "gemini",
  timelineCollapsed: false,
  videoEmbedUrl: "",
  workspaceTreeStyle: "glass",
  workspaceUiDensity: "minimal",
  studyScopeMode: "all",
  lowPowerMode: false,
  backupReminderDismissed: false
};
let timelineCollapsed = false;
let workspaceTreeStyle = "glass";
let workspaceUiDensity = "minimal";
let currentView = "welcome";
let currentAccountScope = DEFAULT_ACCOUNT_SCOPE;
let homeFolders = [{ id: HOME_DEFAULT_FOLDER_ID, name: "" }];
let homeConversationFolderMap = {};
let homeCollapsedFolderIds = new Set();
let selectedHomeConversationIds = new Set();
let homeConversations = [];
let homeSearchText = "";
let homeDrillParentConversationId = "";
let homeDrillParentConversationTitle = "";
let homeDrillEntries = [];
let homeDrillSortOrder = "desc";
let homeDraggingConversationId = "";
let workspaceDraggingEntryKey = "";
let homeStorageChangeSyncing = false;
let homeTreeCollapsed = false;
let homeLayoutMode = "mindmap";
let homeTreeDirection = "horizontal";
let homeMindmapCollapsedGroupKeys = new Set();
let workspaceTreeCollapsed = false;
let timelineSearchText = "";
let timelineFilterMode = "all";
let studyScopeMode = "all";
let timelineFolderFilterIds = new Set();
let timelineFolderItemSortOrder = "desc";
let timelineRenderSignature = "";
let timelineBranchMarkerSignature = "";
let timelineFolderFilterRenderSignature = "";
let detailRenderSignature = "";
let branchThreadRenderSignature = "";
let branchTreeRenderSignature = "";
let branchMiniTimelineRenderSignature = "";
let noteHistoryRenderSignature = "";
let learningCategoryRenderSignature = "";
let mainLearningMapRenderSignature = "";
let expandedLearningCategoryFolderId = "";
let expandedMainLearningCategoryFolderId = "";
let pendingQuestionBoardMode = "pending";
let subQuestionWorkbenchOpen = false;
let noteLibraryMode = "current";
let noteLibrarySearchText = "";
let noteLibraryContentFilter = "all";
let noteLibrarySortOrder = "desc";
let globalNoteLibraryCacheDirty = true;
let globalNoteLibraryItems = [];
let noteLibraryRenderToken = 0;
let contextMetaRenderSignature = "";
let nodeManageMode = "create";
let branchAddMenuOpen = false;
let branchToolsOpen = false;
let branchModeMenuOpen = false;
let branchComposerMode = "standard";
let followupFocusMode = false;
let detailMode = "branch";
let reviewSprintActive = false;
let reviewSprintCompletedKeys = new Set();
let currentStudyNoteImageBase64 = "";
let compactWorkspacePane = "chat";
const conversationSnapshotCache = new Map();
const passiveSelectionHintByConversation = new Map();
const branchThreadMemoryCache = new Map();
const branchThreadMissingKeys = new Set();
let pendingScrollRequestTimer = null;
let pendingScrollRequestEntryKey = "";
let pendingScrollRequestToken = 0;
let lastScrollRequestEntryKey = "";
let lastScrollRequestAt = 0;
let timelineSyncState = { status: "idle", count: 0, updatedAt: 0 };
let branchStorageSyncTimer = 0;
const pendingBranchStorageKeys = new Set();
let timelineSearchTimer = null;
let panelRefreshTimer = null;
let panelRefreshInFlight = false;
let panelRefreshLastAt = 0;
let latestHomeRefreshTrace = null;
let homeTurnRefreshTimer = null;
let homeTurnRefreshInFlight = false;
let homeAutoClassifyEnabled = true;
let homeAutoClassifyRules = getDefaultHomeAutoClassifyRules();
const homeAutoClassifyFingerprintCache = new Map();
let homeAutoClassifyRulePreviewTimer = null;
let homeSearchTimer = null;
let homeSidebarSyncTimer = null;
const timelineSearchSourceCache = new Map();
let homeSidebarSyncInFlight = false;
let currentVideoEmbedUrl = "";
let videoEmbedStatusHasError = false;
let videoEmbedPanelMaximized = false;
let studySplitEnabled = false;
let studySplitRatio = 58;
let branchAutoSuggestOwnerEntryKey = "";
let branchAutoSuggestTargetEntryKey = "";
const branchAutoSuggestSeenEntryKeys = new Set();
let manualBranchClassifiedEntryKeys = new Set();
let manualBranchClassifiedEntryOwners = {};
let branchManualSelectLockUntil = 0;
let studySplitDragging = false;
let branchStatusTimer = null;
let learningCategoryStatusTimer = null;
let branchTreeSelectedNodeId = "";
let branchDraftParentNodeId = "";
let branchAnchorQuote = "";
let branchTreeCollapsedNodeIds = new Set();
let branchLoadDebounceTimer = null;
let branchLoadDebounceToken = 0;
let timelineRenderRafId = 0;
let timelineRenderTimer = 0;
let timelineTreeBuildToken = 0;
let activeTimelineButtonKey = "";
let activeTimelineButtonEl = null;
let activeNoteHistoryButtonKey = "";
let activeNoteHistoryButtonEl = null;
let loadConversationToken = 0;
let lastPersistedSessionSignature = "";
let detailMarkdownRenderToken = 0;
let detailMarkdownRenderTimer = null;
let pendingSelectEntryRafId = 0;
let pendingSelectEntryKey = "";
let pendingSelectEntryOptions = null;
let postSelectionRenderTimer = 0;
let panelResizeActive = false;
let deferredResizeRenderPending = false;
const sidePanelPerfTrace = [];
let entryKeysWithBranchQuestions = new Set();
let entryKeysWithBranchAnswers = new Set();
const branchMiniTimelineMemory = new Map();
const timelineButtonMap = new Map();
const timelineBranchPreviewMap = new Map();
let timelineBranchPreviewRafId = 0;
const pendingTimelineBranchPreviewKeys = new Set();
let lastTimelineBranchPreviewSelectedKey = "";
const noteHistoryButtonMap = new Map();
const detailMarkdownHtmlCache = new Map();

const I18N = {
  zh: {
    welcome_title: "欢迎使用 Hajimi Timeline",
    welcome_desc: "请选择语言，然后进入 Gemini 对话总览进行分类管理。",
    welcome_lang_label: "语言",
    welcome_continue: "开始使用",
    home_title: "Hajimi \u5bf9\u8bdd\u603b\u89c8",
    home_subtitle: "可以拉开侧边栏体验全部功能。",
    home_refresh: "刷新列表",
    home_open_active: "打开当前分对话",
    home_layout_mindmap: "导图",
    home_layout_tree: "树状",
    home_layout_grid: "网格",
    home_tree_direction_vertical: "竖向",
    home_tree_direction_horizontal: "横向",
    home_new_folder_ph: "新建总对话分类文件夹（如：学习、写作）",
    home_add_folder: "新建分类",
    home_auto_open: "自动分类",
    home_auto_title: "自动分类",
    home_auto_close: "关闭",
    home_auto_guide: "",
    home_auto_folder_ph: "分类名（例：高数）",
    home_auto_keywords_ph: "关键词，逗号分隔（例：积分,导数）",
    home_auto_add_rule: "添加规则",
    home_auto_enabled: "启用主对话自动分类",
    home_auto_rules_ph: "每行一条规则：分类名: 关键词1, 关键词2",
    home_auto_order_hint: "规则越靠前，优先级越高。",
    home_auto_order_invalid: "检测到 {count} 行格式无效，保存前请修正。",
    home_auto_save_tip: "",
    home_auto_pending_save: "规则已修改，点击保存生效。",
    home_auto_no_rules: "暂无规则。输入后点“添加规则”。",
    home_auto_rule_folder: "分类",
    home_auto_rule_keywords: "关键词",
    home_auto_rule_up: "↑",
    home_auto_rule_down: "↓",
    home_auto_rule_delete: "删",
    home_auto_advanced: "高级：文本模式（可选）",
    home_auto_add_missing: "请先填写分类名和关键词。",
    home_auto_save: "保存规则",
    home_auto_reset: "恢复默认",
    home_auto_rules_invalid: "规则格式无效，请按“分类名: 关键词1, 关键词2”填写。",
    home_auto_saved: "自动分类设置已保存（移动 {moved} 条，新增分类 {folders} 个）。",
    home_auto_reset_done: "已恢复默认自动分类规则。",
    home_auto_save_failed: "自动分类保存失败，请重试。",
    home_auto_reset_failed: "恢复默认规则失败，请重试。",
    home_move_selected: "移动勾选会话",
    home_move_target_prompt: "输入目标分类名称（可选：{options}）",
    home_move_target_not_found: "未找到分类「{name}」，请检查名称后重试。",
    home_move_target_ambiguous: "存在多个同名分类「{name}」，请在树中右键目标节点执行移动。",
    home_empty: "还没有可显示的对话。先在 Gemini 左侧栏打开一个对话，再回来点“刷新列表”。",
    home_status_created: "已创建分类「{name}」。",
    home_status_exists: "分类「{name}」已存在。",
    home_status_select_target: "请选择目标分类。",
    home_status_select_conversations: "请先勾选会话。",
    home_status_moved: "已移动 {count} 个会话到「{name}」。",
    home_selected_hint: "已勾选 {count} 个会话，直接选择分类并点击移动。",
    home_move_hint: "先勾选要移动的会话，再进行分类移动。",
    home_move_target_placeholder: "请选择目标分类",
    home_search_ph: "搜索对话...",
    home_manage_label: "\u7ba1\u7406",
    home_manage_meta: "先勾选会话，再移动；右键树节点可新建并移动",
    home_manage_meta_selected: "已勾选 {count} 个会话，直接选择目标分类后移动",
    home_drill_back: "返回上一级",
    home_drill_sort_desc: "按时间倒序",
    home_drill_sort_asc: "按时间正序",
    home_drill_meta: "当前：{title}（共 {count} 条分对话）",
    home_drill_empty: "该对话暂无可定位的分对话时间点。",
    home_enter_subdialogue: "进入分对话",
    home_open_subdialogue: "打开并定位分对话",
    home_quick_name_required: "请先输入子分类名称。",
    home_quick_create_move_prompt: "在「{parent}」下新建子分类并移动已勾选会话：",
    home_quick_create_move_success: "已在「{parent}」下创建「{name}」，并移动 {count} 个会话。",
    home_quick_move_existing_success: "分类「{name}」已存在，已移动 {count} 个会话。",
    home_quick_create_prompt: "在「{parent}」下新建子分类：",
    home_quick_create_success: "已在「{parent}」下创建「{name}」。",
    home_quick_action_title: "右键：新建子分类 / 重命名",
    home_folder_context_prompt: "当前分类：「{name}」\n输入子分类名称：新建子分类\n输入 =新名称：重命名当前分类",
    home_folder_context_empty: "请输入子分类名称，或使用 =新名称 重命名。",
    home_folder_rename_required: "重命名失败：请填写新名称。",
    home_folder_rename_root_blocked: "根分类不支持重命名。",
    home_folder_renamed: "已将「{old}」重命名为「{name}」。",
    home_status_open_active_fail: "未检测到当前分对话页面。",
    home_status_synced: "已同步左侧会话 {count} 条（新增 {added} 条）。",
    home_status_sync_failed: "左侧会话同步失败，已显示本地数据。",
    home_sync_guide: "请先点击 Gemini 左侧侧边栏，再点击“刷新列表”获取对话。",
    home_imported_hint: "已从 Gemini 左侧导入目录，点击可进入工作台并抓取详情。",
    workspace_folder_exists: "文件夹「{name}」已存在。",
    workspace_folder_created: "已创建文件夹「{name}」。",
    workspace_default_title: "Hajimi Timeline",
    session_ident: "会话标识: {id}",
    workspace_current_conversation: "当前对话",
    workspace_current_conversation_empty: "未选择会话",
    open_gemini_prompt: "请先打开 gemini.google.com 对话。",
    drag_hint: "提示：当前面板较窄，可按住面板左侧边界向左拖动展开工作台。",
    drag_hint_expand: "提示：右侧问题索引已收起，可点击右侧悬浮按钮重新展开。",
    compact_switch_chat: "AI对话",
    compact_switch_note: "笔记区",
    compact_switch_aria: "收缩视图切换",
    branch_followup_records_title: "追问记录",
    back_previous_page: "返回上一页",
    back_overview: "返回总览",
    ui_density_minimal: "极简视图",
    ui_density_full: "完整视图",
    study_split_enable: "双屏学习",
    study_split_disable: "退出双屏",
    refresh: "刷新",
    node_panel_title: "问题索引",
    node_panel_subtitle: "按时间与层级浏览分问题，点击即跳转",
    node_manage_summary: "分类管理",
    node_manage_create_title: "新建分类",
    node_manage_move_title: "移动笔记",
    node_manage_add_tooltip: "创建文件夹",
    node_manage_move_tooltip: "移动已选笔记",
    new_folder_ph: "新建分类（如：数学、写作）",
    new_folder_btn: "新建",
    move_uncategorized_btn: "移动勾选未分类",
    move_select_target_placeholder: "先新建一个目标文件夹",
    timeline_empty: "这里还没有学习记录。先去 Gemini 提一个问题，再回来整理。",
    timeline_filtered_empty: "当前筛选条件下暂无笔记。",
    detail_select_hint: "先在左侧学习队列选择一个问题",
    locate_main: "定位到主对话",
    open_node_settings: "笔记设置",
    open_node_note: "学习笔记",
    settings_title: "笔记设置",
    workspace_settings: "工作台设置",
    note_title: "学习笔记",
    note_history_title: "笔记库",
    note_history_empty: "这里还没有笔记，先从当前题目记一条吧。",
    note_library_current: "当前会话",
    note_library_all: "全部笔记",
    note_library_filter_all: "全部内容",
    note_library_filter_text: "仅文字",
    note_library_filter_image: "仅图片",
    note_library_sort_desc: "最近更新",
    note_library_sort_asc: "最早记录",
    note_library_search_ph: "搜索标题、内容或对话",
    note_library_loading: "正在加载笔记...",
    note_library_empty_all: "暂时还没有保存过任何笔记，先从当前题目记录一条吧。",
    note_library_empty_search: "没有找到匹配的笔记。",
    note_library_result_count: "共 {count} 条",
    node_title_ph: "给当前笔记起标题（便于检索）",
    save_node: "保存笔记设置",
    branch_section_title: "追问导航",
    branch_timeline_title: "时间轴",
    branch_meta_hint: "这里按时间显示当前题目的追问记录；想继续深挖时，可直接在下方输入新的追问。",
    current_only: "仅当前题",
    context_current_only: "当前笔记",
    branch_input_ph: "输入分问题，Ctrl+Enter 发送",
    branch_send: "发送追问",
    composer_add: "上传",
    composer_quote_selection: "引用网页选中段落",
    composer_upload_image: "上传图片",
    composer_upload_file: "上传文件",
    composer_upload_failed: "未能打开上传面板，请先聚焦 Gemini 主页面后重试。",
    composer_tools: "工具",
    composer_mode_thinking: "深度",
    composer_mode_standard: "极速",
    composer_voice_input: "语音输入",
    context_tools_title: "选用上下文",
    context_use: "选用上下文",
    context_selected: "已选上下文",
    study_actions_title: "AI 快捷操作",
    study_action_summary: "一键总结",
    study_action_quiz: "一键自测",
    study_action_mistake: "错题复盘",
    study_action_flashcards: "记忆卡片",
    study_note_eyebrow: "专注笔记",
    study_note_title: "当前分问题笔记",
    study_note_suggestions_title: "笔记建议",
    study_note_ph: "记录该分问题的关键思路、易错点、复习要点...",
    study_note_select_entry_ph: "请先在左侧学习队列选择一个问题，再记录这题的学习笔记...",
    study_note_generate: "一键生成笔记",
    study_note_generating: "正在生成笔记...",
    study_note_generated: "笔记已生成并自动保存，可直接补充修改。",
    study_note_generate_failed: "笔记生成失败，请重试。",
    save_study_note: "保存分问题笔记",
    study_note_saved: "这题笔记已保存到本地，可继续补充或直接完成本题。",
    study_note_cleared: "已清空当前题目的学习笔记。",
    study_note_tag: "有笔记",
    study_note_suggestion_structure: "结构模板",
    study_note_suggestion_steps: "关键步骤",
    study_note_suggestion_pitfalls: "易错点",
    study_note_suggestion_review: "复习清单",
    study_note_suggestion_image: "图片说明",
    study_note_suggestion_applied: "已插入笔记模板，记得按你的理解补充。",
    timeline_search_ph: "搜索分问题...",
    study_pick_random: "抽题",
    study_pick_review: "复习",
    study_mark_reviewed: "标记已复习",
    study_scope_all: "全部节点",
    study_scope_bookmarked: "只看书签",
    study_scope_review: "该回看",
    study_helper_empty: "当前还没有可练习笔记。先保存一条笔记，或切到“该回看”试试。",
    study_helper_random: "已随机抽到：{title}",
    study_helper_review: "已为你定位复习笔记：{title}",
    study_helper_marked: "已记录复习：{title}",
    study_helper_due: "当前模式 {scope} · 该回看 {due} / {total} · 书签 {bookmarked} · 笔记 {noted}",
    study_due_tag: "该回看",
    study_bookmark_important: "重点",
    study_bookmark_review: "该回看",
    study_bookmark_mistake: "易错",
    study_bookmark_mastered: "已掌握",
    study_bookmark_note: "书签备注",
    note_history_branch_tag: "分问题笔记",
    study_time_unreviewed: "未复习",
    study_time_due_now: "该回看",
    study_time_next_review: "下次复习 {time}",
    video_tools_title: "学习视频",
    video_embed_ph: "输入 B 站视频链接 / BV号 / 播放器地址",
    video_embed_load: "加载",
    video_embed_paste: "粘贴链接",
    video_embed_open_tab: "新标签打开",
    video_embed_fullscreen: "放大",
    video_embed_exit_fullscreen: "退出全屏",
    video_embed_clear: "清空",
    video_embed_idle: "可粘贴 B 站课程链接并加载到侧栏。",
    video_embed_loaded: "视频已加载，可边看边问。",
    video_embed_invalid: "链接无效，请输入 B 站视频链接、BV号或播放器地址。",
    video_embed_paste_failed: "无法读取剪贴板，请手动粘贴。",
    video_embed_fullscreen_on: "已进入全屏，按 Esc 可退出。",
    video_embed_fullscreen_off: "已退出全屏。",
    video_embed_fullscreen_fallback: "浏览器限制全屏，已切换为最大化显示。",
    video_embed_focus_on: "已进入视频专注模式。",
    video_embed_focus_off: "已退出视频专注模式。",
    video_embed_placeholder: "加载后可在此播放课程视频",
    video_embed_fallback_hint: "若视频无法嵌入，请点“新标签打开”后继续在侧栏提问。",
    timeline_filter_all: "全部",
    timeline_filter_bookmark: "书签",
    timeline_filter_note: "有批注",
    timeline_filter_due: "该回看",
    timeline_filter_folders_all: "全部分类",
    timeline_sort_desc: "分类内：最新在前",
    timeline_sort_asc: "分类内：最早在前",
    sending: "发送中...",
    context_count: "上下文笔记：{count}",
    context_none_hint: "当前未勾选上下文，将直接发送输入内容。",
    current_node_context: "当前分问题：{title}",
    checkbox_hint: "勾选后，该笔记将作为追问上下文发送给 Gemini",
    folder_count: "{count} 条",
    folder_empty: "这个分类里还没有笔记，先从当前题目保存一条吧。",
    branch_empty: "这条笔记还没有追问记录，想继续深挖的话可以直接在下方提问。",
    you: "你",
    no_content: "(无内容)",
    untitled_node: "未命名笔记",
    uncategorized: "未分类",
    no_gemini_conversation: "未检测到 Gemini 会话",
    branch_no_answer: "未拿到 Gemini 回复，请到主对话查看后再点刷新。",
    send_failed: "发送失败：{error}",
    based_on_nodes: "[基于 {count} 条笔记] {question}",
    branch_stage_prepare: "正在整理上下文（{mode}）...",
    branch_stage_dispatch: "已提交到 Gemini，开始生成中...",
    branch_stage_waiting: "回答生成中（{elapsed}s）...",
    branch_stage_done: "回答完成（{elapsed}s）",
    branch_stage_fallback: "深度模式耗时较长，已自动切换极速重试。",
    branch_stage_error: "追问失败：{error}",
    branch_dispatch_lookup: "正在定位主对话输入栏...",
    branch_dispatch_fill: "正在同步到主对话输入栏...",
    branch_dispatch_ready: "主输入栏已同步，正在等待发送按钮...",
    branch_dispatch_send: "已写入主输入栏，正在自动发送...",
    branch_dispatch_queue: "主输入栏暂未就绪，已进入自动补发队列...",
    branch_dispatch_pending_retry: "正在等待主输入栏恢复后自动补发...",
    branch_dispatch_sent_waiting: "已自动发送到主对话，等待 Gemini 回复...",
    branch_tree_title: "分问题树",
    branch_timeline_mini_title: "追问时间轴",
    branch_tree_collapse_all: "收起",
    branch_tree_expand_all: "展开",
    branch_tree_jump: "跳转锚点",
    branch_question_tag: "分问题",
    branch_answer_tag: "分问题回答",
    branch_level_root: "主追问",
    branch_level_child: "子追问",
    branch_level_deep: "深层追问",
    branch_children_count: "{count} 个追问",
    branch_tree_root: "主问题",
    branch_tree_node: "追问分问题",
    branch_anchor_clear: "清除锚点",
    branch_anchor_from_selection: "锚点：{quote}",
    branch_anchor_none: "未选中锚点",
    branch_timeline_event_created: "创建追问分问题",
    branch_timeline_event_answered: "收到追问回复",
    branch_timeline_event_note: "更新分问题笔记",
    branch_current_session_label: "当前分问题",
    branch_back_main: "回到主对话",
    branch_drag_guide_title: "拖动问题到追问区",
    branch_drag_guide_got_it: "知道了",
    branch_drag_hint: "可从左侧的问题列表直接拖到这里，加入当前追问区，后续继续围绕这一题追问。",
    branch_classified_list_title: "已加入当前追问",
    branch_classified_item_tag: "追问中",
    branch_classified_input_hint: "这些问题已经加入当前追问区。你可以点击查看、移出，或继续输入新的追问把它们串到同一条学习线上。",
    branch_auto_suggest_title: "检测到疑似追问",
    branch_auto_suggest_text: "新问题「{title}」可能属于当前分问题。",
    branch_auto_suggest_apply: "一键归类",
    branch_auto_suggest_dismiss: "忽略",
    branch_auto_suggest_applied: "已按建议归类到当前分问题。",
    branch_auto_suggest_ignored: "已忽略本次自动归类建议。",
    move_status_select_target: "请选择目标文件夹。",
    move_status_select_uncategorized: "请先勾选未分类笔记，然后再移动。",
    move_status_moved: "已移动 {count} 条到「{name}」。",
    move_status_failed: "移动失败，请重试。",
    save_title_btn: "保存标题",
    session_title_ph: "编辑当前对话标题（例如：电路复习）",
    theme_follow_gemini: "跟随 Gemini",
    theme_light: "浅色",
    theme_dark: "\u591c\u95f4\u62a4\u773c",
    toggle_nodes_hide: "\u6536\u8d77\u7d22\u5f15",
    toggle_nodes_show: "\u5c55\u5f00\u7d22\u5f15",
    home_uncategorized_title: "\u672a\u5206\u7c7b",
    main_conversation_note: "👑 主对话概览",
    open_workspace: "进入工作台",
    home_conversation_count: "{count} 个会话"
    ,
    home_tree_root: "全部会话",
    home_tree_tip: "树状目录",
    workspace_tree_root: "顶层分类",
    workspace_note_root: "全部笔记"
    ,
    tree_style_wire: "极简线框",
    tree_style_glass: "卡片玻璃",
    tree_style_aria_label: "对话树风格"
  },
  en: {
    welcome_title: "Welcome to Hajimi Timeline",
    welcome_desc: "Choose your language first, then organize all Gemini conversations.",
    welcome_lang_label: "Language",
    welcome_continue: "Get Started",
    home_title: "Hajimi Conversation Hub",
    home_subtitle: "Expand the sidebar to experience all features.",
    home_refresh: "Refresh List",
    home_open_active: "Open Active Sub-Conversation",
    home_layout_mindmap: "Mindmap",
    home_layout_tree: "Tree",
    home_layout_grid: "Grid",
    home_tree_direction_vertical: "Vertical",
    home_tree_direction_horizontal: "Horizontal",
    home_new_folder_ph: "Create folder for conversations (e.g. Study, Writing)",
    home_add_folder: "New Folder",
    home_auto_open: "Auto Categorization",
    home_auto_title: "Auto Categorization",
    home_auto_close: "Close",
    home_auto_guide: "",
    home_auto_folder_ph: "Folder name (e.g. Calculus)",
    home_auto_keywords_ph: "Keywords, comma-separated (e.g. integral,derivative)",
    home_auto_add_rule: "Add Rule",
    home_auto_enabled: "Enable Main-Conversation Auto Categorization",
    home_auto_rules_ph: "One rule per line: Folder: keyword1, keyword2",
    home_auto_order_hint: "Top rules run first.",
    home_auto_order_invalid: "{count} invalid lines detected. Fix them before saving.",
    home_auto_save_tip: "",
    home_auto_pending_save: "Rules changed. Click Save.",
    home_auto_no_rules: "No rules yet. Add one above.",
    home_auto_rule_folder: "Folder",
    home_auto_rule_keywords: "Keywords",
    home_auto_rule_up: "↑",
    home_auto_rule_down: "↓",
    home_auto_rule_delete: "Del",
    home_auto_advanced: "Advanced: Text Mode (Optional)",
    home_auto_add_missing: "Please fill in both folder and keywords first.",
    home_auto_save: "Save Rules",
    home_auto_reset: "Reset Default",
    home_auto_rules_invalid: "Invalid rule format. Use \"Folder: keyword1, keyword2\".",
    home_auto_saved: "Auto-classification settings saved (moved {moved}, created {folders} folders).",
    home_auto_reset_done: "Default auto-classification rules restored.",
    home_auto_save_failed: "Failed to save auto-classification settings. Please try again.",
    home_auto_reset_failed: "Failed to reset default rules. Please try again.",
    home_move_selected: "Move Selected",
    home_move_target_prompt: "Enter target folder name (available: {options})",
    home_move_target_not_found: "Folder \"{name}\" not found. Please check the name and try again.",
    home_move_target_ambiguous: "Multiple folders named \"{name}\" found. Please right-click the target node in tree view.",
    home_empty: "No conversation is available yet. Open one from Gemini's left sidebar, then come back and click Refresh List.",
    home_status_created: "Created folder \"{name}\".",
    home_status_exists: "Folder \"{name}\" already exists.",
    home_status_select_target: "Please choose a target folder.",
    home_status_select_conversations: "Please select conversations first.",
    home_status_moved: "Moved {count} conversations to \"{name}\".",
    home_selected_hint: "{count} selected. Choose a folder and move now.",
    home_move_hint: "Select conversations first, then move them.",
    home_move_target_placeholder: "Select target folder",
    home_search_ph: "Search conversations...",
    home_manage_label: "Manage",
    home_manage_meta: "Select conversations, then move. Right-click a tree node to create and move.",
    home_manage_meta_selected: "{count} selected. Choose target folder and move now.",
    home_drill_back: "Back",
    home_drill_sort_desc: "Newest First",
    home_drill_sort_asc: "Oldest First",
    home_drill_meta: "Current: {title} ({count} sub-dialog turns)",
    home_drill_empty: "No sub-dialogue timestamps available for this conversation.",
    home_enter_subdialogue: "Enter Sub-dialogues",
    home_open_subdialogue: "Open & Locate Sub-dialogue",
    home_quick_name_required: "Please enter a subfolder name first.",
    home_quick_create_move_prompt: "Create a subfolder under \"{parent}\" and move selected conversations:",
    home_quick_create_move_success: "Created \"{name}\" under \"{parent}\" and moved {count} conversations.",
    home_quick_move_existing_success: "\"{name}\" already exists. Moved {count} conversations.",
    home_quick_create_prompt: "Create a subfolder under \"{parent}\":",
    home_quick_create_success: "Created \"{name}\" under \"{parent}\".",
    home_quick_action_title: "Right-click: create subfolder / rename",
    home_folder_context_prompt: "Current folder: \"{name}\"\nType a name: create subfolder\nType =new name: rename current folder",
    home_folder_context_empty: "Type a subfolder name, or use =new name to rename.",
    home_folder_rename_required: "Rename failed: please enter a new folder name.",
    home_folder_rename_root_blocked: "Root folder cannot be renamed.",
    home_folder_renamed: "Renamed \"{old}\" to \"{name}\".",
    home_status_open_active_fail: "No active Gemini sub-conversation page detected.",
    home_status_synced: "Synced {count} sidebar conversations ({added} new).",
    home_status_sync_failed: "Sidebar sync failed. Showing local data.",
    home_sync_guide: "Open Gemini left sidebar, then click Refresh List to fetch conversations.",
    home_imported_hint: "Imported from Gemini sidebar. Open workspace to fetch details.",
    workspace_folder_exists: "Folder \"{name}\" already exists.",
    workspace_folder_created: "Created folder \"{name}\".",
    workspace_default_title: "Hajimi Timeline",
    session_ident: "Session: {id}",
    workspace_current_conversation: "Current Conversation",
    workspace_current_conversation_empty: "No conversation selected",
    open_gemini_prompt: "Open a gemini.google.com conversation first.",
    drag_hint: "Tip: drag the panel's left edge leftward to expand workspace.",
    drag_hint_expand: "Tip: The question index is collapsed. Click the floating button on the right to expand it.",
    compact_switch_chat: "AI Chat",
    compact_switch_note: "Notes",
    compact_switch_aria: "Compact view switch",
    branch_followup_records_title: "Follow-up Records",
    back_previous_page: "Back",
    back_overview: "Back To Hub",
    ui_density_minimal: "Minimal View",
    ui_density_full: "Full View",
    study_split_enable: "Dual-Screen",
    study_split_disable: "Exit Dual-Screen",
    refresh: "Refresh",
    node_panel_title: "Question Index",
    node_panel_subtitle: "Browse sub-questions by time & hierarchy; click to jump",
    node_manage_summary: "Categories",
    node_manage_create_title: "Create Category",
    node_manage_move_title: "Move Sub-questions",
    node_manage_add_tooltip: "Create folder",
    node_manage_move_tooltip: "Move selected sub-questions",
    new_folder_ph: "Create category (e.g. Math, Writing)",
    new_folder_btn: "New",
    move_uncategorized_btn: "Move Selected Unsorted",
    move_select_target_placeholder: "Create a target folder first",
    timeline_empty: "No learning records yet. Ask Gemini a question first, then come back to organize it.",
    timeline_filtered_empty: "No nodes match current filters.",
    detail_select_hint: "Select a sub-question from the index on the left",
    locate_main: "Locate In Main Chat",
    open_node_settings: "Sub-question Settings",
    open_node_note: "Study Notes",
    settings_title: "Node Settings",
    workspace_settings: "Workspace Settings",
    note_title: "Study Notes",
    note_history_title: "Note Library",
    note_history_empty: "No notes yet. Start with the current question and save one here.",
    note_library_current: "Current",
    note_library_all: "All Notes",
    note_library_filter_all: "All",
    note_library_filter_text: "Text",
    note_library_filter_image: "Images",
    note_library_sort_desc: "Newest",
    note_library_sort_asc: "Oldest",
    note_library_search_ph: "Search notes or conversations",
    note_library_loading: "Loading notes...",
    note_library_empty_all: "No saved notes yet. Start with the current question and keep one here.",
    note_library_empty_search: "No matching notes found.",
    note_library_result_count: "{count} notes",
    node_title_ph: "Rename current sub-question",
    save_node: "Save Sub-question",
    branch_section_title: "Follow-up Navigator",
    branch_timeline_title: "Timeline",
    branch_meta_hint: "This area shows the follow-up history for the current question. To keep digging deeper, type a new follow-up below.",
    current_only: "Current Only",
    context_current_only: "Current Node",
    branch_input_ph: "Ask a sub-question (Ctrl+Enter to send)",
    branch_send: "Send",
    composer_add: "Upload",
    composer_quote_selection: "Quote Selected Text",
    composer_upload_image: "Upload Image",
    composer_upload_file: "Upload File",
    composer_upload_failed: "Could not open upload panel. Focus Gemini page and try again.",
    composer_tools: "Tools",
    composer_mode_thinking: "Deep",
    composer_mode_standard: "Fast",
    composer_voice_input: "Voice Input",
    context_tools_title: "Use Context",
    context_use: "Use Context",
    context_selected: "Context Added",
    study_actions_title: "Quick Actions",
    study_action_summary: "Quick Summary",
    study_action_quiz: "Quick Quiz",
    study_action_mistake: "Mistake Review",
    study_action_flashcards: "Flashcards",
    study_note_eyebrow: "Focus Notes",
    study_note_title: "Current Sub-question Note",
    study_note_suggestions_title: "Note Prompts",
    study_note_ph: "Write key ideas, traps, and your review checklist for this sub-question...",
    study_note_select_entry_ph: "Select a sub-question from the notes index on the left, then write notes for it...",
    study_note_generate: "Auto Generate Note",
    study_note_generating: "Generating note...",
    study_note_generated: "Note generated and auto-saved.",
    study_note_generate_failed: "Failed to generate note. Please try again.",
    save_study_note: "Save Sub-question Note",
    study_note_saved: "This note is saved locally. Keep refining it or finish this question when ready.",
    study_note_cleared: "Study note cleared.",
    study_note_tag: "Has Note",
    study_note_suggestion_structure: "Structure",
    study_note_suggestion_steps: "Steps",
    study_note_suggestion_pitfalls: "Pitfalls",
    study_note_suggestion_review: "Review",
    study_note_suggestion_image: "Image Note",
    study_note_suggestion_applied: "Note prompt inserted.",
    timeline_search_ph: "Search sub-questions...",
    study_pick_random: "Random Sub-question",
    study_pick_review: "Review Sub-question",
    study_mark_reviewed: "Mark Reviewed",
    study_scope_all: "All Nodes",
    study_scope_bookmarked: "Bookmarked",
    study_scope_review: "Review Due",
    study_helper_empty: "No practice notes yet. Save one first, or switch to Review Due.",
    study_helper_random: "Random node selected: {title}",
    study_helper_review: "Review node selected: {title}",
    study_helper_marked: "Marked reviewed: {title}",
    study_helper_due: "Mode {scope} · Review due {due}/{total} · Bookmarked {bookmarked} · Notes {noted}",
    study_due_tag: "Due",
    study_bookmark_important: "Important",
    study_bookmark_review: "Review Due",
    study_bookmark_mistake: "Mistake",
    study_bookmark_mastered: "Mastered",
    study_bookmark_note: "Bookmark Note",
    note_history_branch_tag: "Sub-question Note",
    study_time_unreviewed: "Unreviewed",
    study_time_due_now: "Due",
    study_time_next_review: "Next review {time}",
    video_tools_title: "Study Video",
    video_embed_ph: "Paste Bilibili URL / BV id / player URL",
    video_embed_load: "Load",
    video_embed_paste: "Paste Link",
    video_embed_open_tab: "Open In Tab",
    video_embed_fullscreen: "Fullscreen",
    video_embed_exit_fullscreen: "Exit Fullscreen",
    video_embed_clear: "Clear",
    video_embed_idle: "Paste a Bilibili course URL and load it here.",
    video_embed_loaded: "Video loaded. Learn and ask in one place.",
    video_embed_invalid: "Invalid link. Use Bilibili URL, BV id, or player URL.",
    video_embed_paste_failed: "Clipboard read failed. Please paste manually.",
    video_embed_fullscreen_on: "Entered fullscreen. Press Esc to exit.",
    video_embed_fullscreen_off: "Exited fullscreen.",
    video_embed_fullscreen_fallback: "Fullscreen was blocked. Switched to maximized view.",
    video_embed_focus_on: "Entered video focus mode.",
    video_embed_focus_off: "Exited video focus mode.",
    video_embed_placeholder: "Video player appears here after loading",
    video_embed_fallback_hint: "If embedding fails, use \"Open In Tab\" and keep asking here.",
    timeline_filter_all: "All",
    timeline_filter_bookmark: "Bookmarks",
    timeline_filter_note: "Has Notes",
    timeline_filter_due: "Due",
    timeline_filter_folders_all: "All Categories",
    timeline_sort_desc: "In Category: Newest First",
    timeline_sort_asc: "In Category: Oldest First",
    sending: "Sending...",
    context_count: "Context Nodes: {count}",
    context_none_hint: "No context selected. The input text will be sent directly.",
    current_node_context: "Current Sub-question: {title}",
    checkbox_hint: "Checked nodes will be used as follow-up context",
    folder_count: "{count} items",
    folder_empty: "No notes in this category yet. Save one from the current question first.",
    branch_empty: "No follow-up history for this note yet. Ask the next question below when you want to keep digging.",
    you: "You",
    no_content: "(No content)",
    untitled_node: "Untitled Node",
    uncategorized: "Uncategorized",
    no_gemini_conversation: "No Gemini conversation detected",
    branch_no_answer: "No Gemini response captured. Check main chat then refresh.",
    send_failed: "Send failed: {error}",
    based_on_nodes: "[Based on {count} nodes] {question}",
    branch_stage_prepare: "Preparing context ({mode})...",
    branch_stage_dispatch: "Sent to Gemini. Generating answer...",
    branch_stage_waiting: "Generating answer ({elapsed}s)...",
    branch_stage_done: "Answer ready ({elapsed}s)",
    branch_stage_fallback: "Deep mode took too long. Auto-switched to fast mode.",
    branch_stage_error: "Follow-up failed: {error}",
    branch_dispatch_lookup: "Locating the main conversation composer...",
    branch_dispatch_fill: "Syncing into the main composer...",
    branch_dispatch_ready: "Main composer synced. Waiting for send button...",
    branch_dispatch_send: "Written into the main composer. Auto-sending...",
    branch_dispatch_queue: "Main composer is not ready yet. Queued for auto resend...",
    branch_dispatch_pending_retry: "Waiting to auto resend when the main composer is ready...",
    branch_dispatch_sent_waiting: "Auto-sent to the main conversation. Waiting for Gemini reply...",
    branch_tree_title: "Question Tree",
    branch_timeline_mini_title: "Follow-up Timeline",
    branch_tree_collapse_all: "Collapse",
    branch_tree_expand_all: "Expand",
    branch_tree_jump: "Jump Anchor",
    branch_question_tag: "Branch Q",
    branch_answer_tag: "Branch A",
    branch_level_root: "Root",
    branch_level_child: "Child",
    branch_level_deep: "Deep",
    branch_children_count: "{count} children",
    branch_tree_root: "Main Question",
    branch_tree_node: "Follow-up Sub-question",
    branch_anchor_clear: "Clear Anchor",
    branch_anchor_from_selection: "Anchor: {quote}",
    branch_anchor_none: "No anchor selected",
    branch_timeline_event_created: "Follow-up sub-question created",
    branch_timeline_event_answered: "Follow-up answered",
    branch_timeline_event_note: "Sub-question note updated",
    branch_current_session_label: "Current Sub-question",
    branch_back_main: "Back To Main Chat",
    branch_drag_guide_title: "Drag Questions Here",
    branch_drag_guide_got_it: "Got It",
    branch_drag_hint: "Drag a question from the left list and drop it here to add it into the current follow-up area.",
    branch_classified_list_title: "In Current Follow-up",
    branch_classified_item_tag: "Following",
    branch_classified_input_hint: "These questions are already in the current follow-up area. You can open one, remove it, or type a new follow-up to keep them on the same learning thread.",
    branch_auto_suggest_title: "Likely Follow-up Detected",
    branch_auto_suggest_text: "New question \"{title}\" may belong to the current sub-question.",
    branch_auto_suggest_apply: "Classify",
    branch_auto_suggest_dismiss: "Ignore",
    branch_auto_suggest_applied: "Applied the suggested classification.",
    branch_auto_suggest_ignored: "Ignored this auto-classification suggestion.",
    move_status_select_target: "Please choose a target folder.",
    move_status_select_uncategorized: "Please select uncategorized nodes first.",
    move_status_moved: "Moved {count} nodes to \"{name}\".",
    move_status_failed: "Move failed. Please try again.",
    save_title_btn: "Save Title",
    session_title_ph: "Edit conversation title",
    theme_follow_gemini: "Follow Gemini",
    theme_light: "Light",
    theme_dark: "Night",
    toggle_nodes_hide: "Hide Index",
    toggle_nodes_show: "Show Index",
    home_uncategorized_title: "Uncategorized",
    main_conversation_note: "👑 Main Conversation Overview",
    open_workspace: "Open Workspace",
    home_conversation_count: "{count} conversations"
    ,
    home_tree_root: "All Conversations",
    home_tree_tip: "Tree Directory",
    workspace_tree_root: "Top-Level Category",
    workspace_note_root: "All Notes"
    ,
    tree_style_wire: "Wireframe",
    tree_style_glass: "Glass Cards",
    tree_style_aria_label: "Conversation Tree Style"
  }
};

function t(key, params = {}) {
  const table = I18N[currentLocale] || I18N.zh;
  const fallback = I18N.zh[key] || key;
  let text = table[key] || fallback;
  Object.entries(params).forEach(([k, v]) => {
    text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  });
  return text;
}

function normalizeLocale(locale) {
  return locale === "en" ? "en" : "zh";
}

function normalizeTheme(theme) {
  return theme === "dark" || theme === "light" ? theme : "gemini";
}

function normalizeWorkspaceTreeStyle(style) {
  return style === "wire" ? "wire" : "glass";
}

function normalizeWorkspaceUiDensity(mode) {
  return "minimal";
}

function normalizeCompactWorkspacePane(value) {
  return value === "note" ? "note" : "chat";
}

function getNoteLibraryMistakeLabel() {
  return currentLocale === "en" ? "Mistakes" : "错题本";
}

function getNoteLibraryCurrentLabel() {
  return currentLocale === "en" ? "Current" : "当前";
}

function getNoteLibraryAllLabel() {
  return currentLocale === "en" ? "All" : "全部";
}

function getNoteLibraryReviewActionLabel() {
  return currentLocale === "en" ? "Review" : "去复习";
}

function getNoteLibraryMarkReviewedLabel() {
  return currentLocale === "en" ? "Reviewed" : "已复习";
}

function getNoteLibrarySortLabel() {
  return noteLibrarySortOrder === "asc"
    ? currentLocale === "en" ? "Oldest" : "最早"
    : currentLocale === "en" ? "Latest" : "最新";
}

function getNoteLibraryContentFilterLabel() {
  return t("note_library_filter_image");
}

function getNoteLibraryGuideTitle() {
  return currentLocale === "en" ? "How to mark learning nodes" : "怎么标注学习节点";
}

function getNoteLibraryGuideSteps() {
  if (currentLocale === "en") {
    return [
      "On the Gemini page timeline, right-click a time dot to mark Mistake or Review.",
      "Use Shift + click on a time dot to quickly mark Important."
    ];
  }
  return [
    "回到 Gemini 页面，在时间轴圆点上右键，可标记“易错”或“该回看”。",
    "按住 Shift 再点击时间轴圆点，可以快速标记“重点”。"
  ];
}

function renderNoteLibraryGuide() {
  if (!(noteLibraryGuideEl instanceof HTMLElement)) return;
  noteLibraryGuideEl.innerHTML = "";
  const title = document.createElement("p");
  title.className = "note-library-guide-title";
  title.textContent = getNoteLibraryGuideTitle();
  const list = document.createElement("div");
  list.className = "note-library-guide-steps";
  getNoteLibraryGuideSteps().forEach((text) => {
    const item = document.createElement("p");
    item.className = "note-library-guide-step";
    item.textContent = text;
    list.appendChild(item);
  });
  noteLibraryGuideEl.append(title, list);
}

function getNoteLibraryMistakeLabel() {
  return currentLocale === "en" ? "Mistakes" : "错题本";
}

function getNoteLibraryCurrentLabel() {
  return currentLocale === "en" ? "Current" : "当前";
}

function getNoteLibraryAllLabel() {
  return currentLocale === "en" ? "All" : "全部";
}

function getNoteLibraryReviewActionLabel() {
  return currentLocale === "en" ? "Review" : "去复习";
}

function getNoteLibraryMarkReviewedLabel() {
  return currentLocale === "en" ? "Reviewed" : "标记已复习";
}

function getNoteLibrarySortLabel() {
  return noteLibrarySortOrder === "asc"
    ? currentLocale === "en" ? "Oldest" : "最早"
    : currentLocale === "en" ? "Latest" : "最新";
}

function getNoteLibraryContentFilterLabel() {
  return t("note_library_filter_image");
}

function getNoteLibraryGuideTitle() {
  return currentLocale === "en" ? "How to mark learning nodes" : "如何标注学习节点";
}

function getNoteLibraryGuideSteps() {
  if (currentLocale === "en") {
    return [
      "On the Gemini page timeline, right-click a time dot to mark Mistake or Review.",
      "Use Shift + click on a time dot to quickly mark Important."
    ];
  }
  return [
    "回到 Gemini 页面，在时间轴圆点上右键，可标记“易错”或“该回看”。",
    "按住 Shift 再点击时间轴圆点，可以快速标记“重点”。"
  ];
}

function ensureSimplifiedWorkspaceUi() {
  const scopeSwitch = document.querySelector(".note-library-scope-switch");
  if (scopeSwitch && !document.getElementById("noteLibraryMistakeBtn")) {
    const button = document.createElement("button");
    button.id = "noteLibraryMistakeBtn";
    button.className = "note-library-toggle";
    button.type = "button";
    button.textContent = getNoteLibraryMistakeLabel();
    button.addEventListener("click", () => {
      if (noteLibraryMode === "mistake") return;
      noteLibraryMode = "mistake";
      noteHistoryRenderSignature = "";
      refreshNoteHistoryPanel();
    });
    scopeSwitch.appendChild(button);
  }

  const actions = document.querySelector(".note-library-actions");
  if (actions && !document.getElementById("noteLibraryReviewBtn")) {
    const reviewBtn = document.createElement("button");
    reviewBtn.id = "noteLibraryReviewBtn";
    reviewBtn.className = "note-library-filter-btn";
    reviewBtn.type = "button";
    reviewBtn.addEventListener("click", () => {
      pickSpacedReviewNode().catch((error) => {
        console.error("pickSpacedReviewNode from note library failed", error);
        setStudyHelperStatus(error?.message || "pick review failed", true);
      });
    });

    const markBtn = document.createElement("button");
    markBtn.id = "noteLibraryMarkReviewedBtn";
    markBtn.className = "note-library-filter-btn";
    markBtn.type = "button";
    markBtn.addEventListener("click", () => {
      markCurrentEntryReviewed({ autoNext: false }).catch((error) => {
        console.error("markCurrentEntryReviewed from note library failed", error);
        setStudyHelperStatus(error?.message || "mark reviewed failed", true);
      });
    });

    actions.insertBefore(markBtn, noteLibraryImageBtnEl || actions.firstChild);
    actions.insertBefore(reviewBtn, markBtn);
  }

  const noteToolbar = document.querySelector(".note-library-toolbar");
  if (noteToolbar && !document.getElementById("noteLibraryGuide")) {
    const guide = document.createElement("section");
    guide.id = "noteLibraryGuide";
    guide.className = "note-library-guide";
    noteToolbar.insertAdjacentElement("afterend", guide);
  }

  noteLibraryMistakeBtnEl = document.getElementById("noteLibraryMistakeBtn");
  noteLibraryReviewBtnEl = document.getElementById("noteLibraryReviewBtn");
  noteLibraryMarkReviewedBtnEl = document.getElementById("noteLibraryMarkReviewedBtn");
  noteLibraryGuideEl = document.getElementById("noteLibraryGuide");
  renderNoteLibraryGuide();

  const timelineTools = document.querySelector(".timeline-tools");
  removeStudyFlowGuides();

  if (timelineTools && !document.getElementById("learningCategoryPanel")) {
    const panel = document.createElement("section");
    panel.id = "learningCategoryPanel";
    panel.className = "learning-category-panel";

    const head = document.createElement("div");
    head.className = "learning-category-head";

    const headMain = document.createElement("div");
    headMain.className = "learning-category-head-main";

    const title = document.createElement("p");
    title.id = "learningCategoryTitle";
    title.className = "learning-category-title";

    const hint = document.createElement("p");
    hint.id = "learningCategoryHint";
    hint.className = "learning-category-hint";

    headMain.append(title, hint);

    const summary = document.createElement("span");
    summary.id = "learningCategorySummary";
    summary.className = "learning-category-summary";

    head.append(headMain, summary);

    const createRow = document.createElement("div");
    createRow.className = "learning-category-create";

    const input = document.createElement("input");
    input.id = "learningCategoryInput";
    input.className = "inline-input learning-category-input";
    input.type = "text";
    input.maxLength = 24;

    const addBtn = document.createElement("button");
    addBtn.id = "learningCategoryAddBtn";
    addBtn.className = "ghost-btn ghost-btn-small learning-category-add-btn";
    addBtn.type = "button";

    createRow.append(input, addBtn);

    const status = document.createElement("p");
    status.id = "learningCategoryStatus";
    status.className = "toolbar-status learning-category-status";
    status.hidden = true;

    const list = document.createElement("div");
    list.id = "learningCategoryList";
    list.className = "learning-category-list";

    panel.append(head, createRow, status, list);
    timelineTools.insertAdjacentElement("beforebegin", panel);
  }

  if (timelineListEl && !document.getElementById("pendingQuestionBoard")) {
    const board = document.createElement("section");
    board.id = "pendingQuestionBoard";
    board.className = "pending-question-board";

    const head = document.createElement("div");
    head.className = "pending-question-board-head";

    const title = document.createElement("p");
    title.id = "pendingQuestionBoardTitle";
    title.className = "pending-question-board-title";

    const hint = document.createElement("p");
    hint.id = "pendingQuestionBoardHint";
    hint.className = "pending-question-board-hint";

    const syncStatus = document.createElement("p");
    syncStatus.id = "timelineSyncStatus";
    syncStatus.className = "timeline-sync-status";
    syncStatus.hidden = true;

    const tabs = document.createElement("div");
    tabs.id = "pendingQuestionBoardTabs";
    tabs.className = "pending-question-tabs";
    tabs.setAttribute("role", "tablist");

    const pendingBtn = document.createElement("button");
    pendingBtn.id = "pendingQuestionPendingBtn";
    pendingBtn.className = "pending-question-tab active";
    pendingBtn.type = "button";
    pendingBtn.dataset.mode = "pending";
    pendingBtn.setAttribute("role", "tab");

    const followupBtn = document.createElement("button");
    followupBtn.id = "pendingQuestionFollowupBtn";
    followupBtn.className = "pending-question-tab";
    followupBtn.type = "button";
    followupBtn.dataset.mode = "followup";
    followupBtn.setAttribute("role", "tab");

    tabs.append(pendingBtn, followupBtn);
    head.append(title, hint, syncStatus, tabs);
    timelineListEl.insertAdjacentElement("beforebegin", board);
    board.append(head);
    if (timelineTools) {
      board.appendChild(timelineTools);
    }
    board.appendChild(timelineListEl);
    if (timelineEmptyEl) {
      board.appendChild(timelineEmptyEl);
    }
  }

  learningCategoryPanelEl = document.getElementById("learningCategoryPanel");
  learningCategoryTitleEl = document.getElementById("learningCategoryTitle");
  learningCategoryHintEl = document.getElementById("learningCategoryHint");
  learningCategorySummaryEl = document.getElementById("learningCategorySummary");
  learningCategoryInputEl = document.getElementById("learningCategoryInput");
  learningCategoryAddBtnEl = document.getElementById("learningCategoryAddBtn");
  learningCategoryStatusEl = document.getElementById("learningCategoryStatus");
  learningCategoryListEl = document.getElementById("learningCategoryList");
  pendingQuestionBoardEl = document.getElementById("pendingQuestionBoard");
  pendingQuestionBoardTitleEl = document.getElementById("pendingQuestionBoardTitle");
  pendingQuestionBoardHintEl = document.getElementById("pendingQuestionBoardHint");
  pendingQuestionBoardTabsEl = document.getElementById("pendingQuestionBoardTabs");
  pendingQuestionPendingBtnEl = document.getElementById("pendingQuestionPendingBtn");
  pendingQuestionReviewBtnEl = document.getElementById("pendingQuestionReviewBtn");
  pendingQuestionFollowupBtnEl = document.getElementById("pendingQuestionFollowupBtn");
  timelineSyncStatusEl = document.getElementById("timelineSyncStatus");
  if (!pendingQuestionReviewBtnEl && pendingQuestionBoardTabsEl instanceof HTMLElement) {
    pendingQuestionReviewBtnEl = document.createElement("button");
    pendingQuestionReviewBtnEl.id = "pendingQuestionReviewBtn";
    pendingQuestionReviewBtnEl.className = "pending-question-tab";
    pendingQuestionReviewBtnEl.type = "button";
    pendingQuestionReviewBtnEl.dataset.mode = "review";
    pendingQuestionReviewBtnEl.setAttribute("role", "tab");
    pendingQuestionBoardTabsEl.insertBefore(pendingQuestionReviewBtnEl, pendingQuestionFollowupBtnEl || null);
  }

  const currentTimelineTools = document.querySelector(".timeline-tools");
  if (
    pendingQuestionBoardEl instanceof HTMLElement &&
    learningCategoryPanelEl instanceof HTMLElement &&
    learningCategoryPanelEl.parentElement !== pendingQuestionBoardEl
  ) {
    pendingQuestionBoardEl.appendChild(learningCategoryPanelEl);
  }
  if (
    pendingQuestionBoardEl instanceof HTMLElement &&
    currentTimelineTools instanceof HTMLElement &&
    currentTimelineTools.parentElement !== pendingQuestionBoardEl
  ) {
    pendingQuestionBoardEl.insertBefore(currentTimelineTools, timelineListEl || null);
  }

  if (learningCategoryAddBtnEl && !learningCategoryAddBtnEl.dataset.bound) {
    learningCategoryAddBtnEl.dataset.bound = "1";
    learningCategoryAddBtnEl.addEventListener("click", () => {
      createLearningCategory().catch((error) => {
        console.error("createLearningCategory failed", error);
        setLearningCategoryStatus(error?.message || "create category failed", true);
      });
    });
  }
  if (learningCategoryInputEl && !learningCategoryInputEl.dataset.bound) {
    learningCategoryInputEl.dataset.bound = "1";
    learningCategoryInputEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      createLearningCategory().catch((error) => {
        console.error("createLearningCategory by enter failed", error);
        setLearningCategoryStatus(error?.message || "create category failed", true);
      });
    });
  }
  [pendingQuestionPendingBtnEl, pendingQuestionReviewBtnEl, pendingQuestionFollowupBtnEl].forEach((btn) => {
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const rawMode = String(btn.dataset.mode || "");
      const nextMode = rawMode === "followup" || rawMode === "review" ? rawMode : "pending";
      if (pendingQuestionBoardMode === nextMode) return;
      pendingQuestionBoardMode = nextMode;
      timelineRenderSignature = "";
      renderPendingQuestionBoard();
      renderTimeline();
    });
  });
  renderLearningCategoryPanel();
  renderPendingQuestionBoard();
}

function getLearningCategoryPanelTitle() {
  return currentLocale === "en" ? "Study Categories" : "学习分类";
}

function getPendingQuestionPanelTitle() {
  return currentLocale === "en" ? "Pending Questions" : "待整理问题";
}

function getPendingQuestionPanelSubtitle() {
  return currentLocale === "en"
    ? "Drop to a category for topic grouping. Drop to the follow-up area to keep it as follow-up."
    : "拖到分类卡片 = 主题整理；拖到追问区 = 继续追问。";
}

function getStudyFlowSteps() {
  return [
    {
      step: "1",
      title: currentLocale === "en" ? "Pick" : "\u9009\u9898",
      desc: currentLocale === "en" ? "Choose one question from the queue." : "\u5148\u4ece\u961f\u5217\u91cc\u9009\u4e00\u9898"
    },
    {
      step: "2",
      title: currentLocale === "en" ? "Learn" : "\u5b66\u4e60",
      desc: currentLocale === "en" ? "Ask follow-ups or save notes." : "\u7ee7\u7eed\u8ffd\u95ee\u6216\u4fdd\u5b58\u7b14\u8bb0"
    },
    {
      step: "3",
      title: currentLocale === "en" ? "Finish" : "\u5b8c\u6210",
      desc: currentLocale === "en" ? "Finish this question and move on." : "\u6574\u7406\u597d\u540e\u518d\u5b8c\u6210\u672c\u9898"
    }
  ];
}

function renderStudyFlowGuide() {
  const guide = document.getElementById("studyFlowGuide");
  if (!(guide instanceof HTMLElement)) return;
  guide.setAttribute("aria-label", currentLocale === "en" ? "Study flow" : "\u5b66\u4e60\u6d41\u7a0b");
  guide.innerHTML = "";
  getStudyFlowSteps().forEach((item) => {
    const node = document.createElement("div");
    node.className = "study-flow-step";

    const badge = document.createElement("span");
    badge.className = "study-flow-badge";
    badge.textContent = item.step;

    const text = document.createElement("span");
    text.className = "study-flow-text";

    const title = document.createElement("strong");
    title.textContent = item.title;

    const desc = document.createElement("small");
    desc.textContent = item.desc;

    text.append(title, desc);
    node.append(badge, text);
    guide.appendChild(node);
  });
}

function removeStudyFlowGuides() {
  document.querySelectorAll("#studyFlowGuide, .study-flow-guide").forEach((node) => {
    if (node instanceof HTMLElement) node.remove();
  });
}

function getPendingQuestionSearchPlaceholder() {
  if (pendingQuestionBoardMode === "review") {
    return currentLocale === "en" ? "Search review-due questions..." : "\u641c\u7d22\u8be5\u56de\u770b\u7684\u9898\u76ee...";
  }
  if (pendingQuestionBoardMode === "followup") {
    return currentLocale === "en" ? "Search questions in current follow-up..." : "搜索当前追问区的问题...";
  }
  return currentLocale === "en" ? "Search questions to learn..." : "搜索待学习问题...";
}

function refreshPendingQuestionSearchPlaceholder() {
  if (!(timelineSearchInputEl instanceof HTMLInputElement)) return;
  timelineSearchInputEl.placeholder = getPendingQuestionSearchPlaceholder();
}

function getPendingQuestionBoardTitle() {
  if (pendingQuestionBoardMode === "review") {
    return currentLocale === "en" ? "Review Queue" : "\u56de\u770b\u961f\u5217";
  }
  if (pendingQuestionBoardMode === "followup") {
    return currentLocale === "en" ? "Current Follow-up Area" : "当前追问区";
  }
  return currentLocale === "en" ? "Study Queue" : "学习队列";
}

function getPendingQuestionBoardHint() {
  if (pendingQuestionBoardMode === "review") {
    return currentLocale === "en"
      ? "Only questions that are due now appear here. Newly finished ones stay out of this list until their review time arrives."
      : "这里只显示现在已经到时间的“该回看”题目；刚完成但还没到时间的，不会立刻出现在这里。";
  }
  if (pendingQuestionBoardMode === "followup") {
    return currentLocale === "en"
      ? "Keep only the questions you still want to continue asking about here. You can drag one in from the left list at any time."
      : "这里只放“还想继续追问”的问题；需要时可直接从左侧列表拖进来。";
  }
  return currentLocale === "en"
    ? "Pick a question here, then click Start to open its focused workbench."
    : "先点选题目，再点“开始学习”进入它的专注工作台。";
}

function getPendingQuestionTabLabel(mode) {
  if (mode === "review") {
    return currentLocale === "en" ? "Review" : "\u8be5\u56de\u770b";
  }
  if (mode === "followup") {
    return currentLocale === "en" ? "Follow-up" : "追问区";
  }
  return currentLocale === "en" ? "To Study" : "待学习";
}

function getPendingQuestionEmptyText() {
  if (pendingQuestionBoardMode === "review") {
    return currentLocale === "en"
      ? "Nothing is due for review right now. Newly finished questions will show up here when their review time arrives."
      : "现在还没有到时间的“该回看”题目；刚完成的问题会在到达回看时间后出现在这里。";
  }
  if (pendingQuestionBoardMode === "followup") {
    return currentLocale === "en"
      ? "The current follow-up area is empty. Drag a question from the left list into here when you want to keep asking around the same topic."
      : "当前追问区还是空的；想围绕同一主题继续深挖时，把左侧的问题拖到这里即可。";
  }
  return currentLocale === "en"
    ? "No question is waiting here now. Switch to Review or continue from a category."
    : "当前没有待学习问题了，可切到“该回看”或按分类继续。";
}

function getMainLearningNextMeta(nextEntry, options = {}) {
  const selectedPendingEntry = options?.selectedPendingEntry || null;
  const pendingCount = Number(options?.pendingCount) || 0;
  const counts = options?.counts || { review: 0 };
  const activeEntry = options?.activeEntry || null;

  if (!nextEntry?._runtimeKey) {
    if (Number(counts.review) > 0) {
      return currentLocale === "en"
        ? "The study queue is clear. Switch to Review to revisit what is due now."
        : "待学习队列已清空，可以切到“该回看”处理现在该回看的题目。";
    }
    return currentLocale === "en"
      ? "This conversation is organized for now. You can review it again by category later."
      : "这一轮问题已经整理完了，之后可以按分类回看。";
  }

  if (subQuestionWorkbenchOpen && activeEntry?._runtimeKey === nextEntry._runtimeKey) {
    return currentLocale === "en"
      ? "You are already learning this question. Use the workbench below to continue."
      : "你已经在学习这题了，直接在下方工作台继续即可。";
  }

  if (selectedPendingEntry?._runtimeKey === nextEntry._runtimeKey) {
    return currentLocale === "en"
      ? "This question is selected. Click Start to enter its focused workbench."
      : "这题已经选中，点击“开始学习”就会进入它的专注工作台。";
  }

  if (pendingCount > 1) {
    return currentLocale === "en"
      ? `${pendingCount} questions are waiting. Start here to keep the learning rhythm.`
      : `当前还有 ${pendingCount} 题待学习，建议先从这题开始。`;
  }

  return currentLocale === "en"
    ? "Start here to keep notes, follow-ups, and progress in one place."
    : "从这题开始，笔记、追问和进度都会集中在同一个工作台里。";
}

function getStudyWorkflowActionText() {
  const entry = getSelectedEntry();
  if (!entry) {
    return currentLocale === "en"
      ? "Select one question, finish notes and follow-ups, then complete it here."
      : "先选中一题，整理好笔记和追问后，再在这里完成本题。";
  }

  const title = getEntryTitle(entry) || (currentLocale === "en" ? "Untitled question" : "未命名问题");
  const remaining = getPendingLearningEntries().filter((item) => item?._runtimeKey && item._runtimeKey !== entry._runtimeKey).length;
  if (remaining > 0) {
    return currentLocale === "en"
      ? `Current focus: ${title}. Finish this one and the next queued question opens right away.`
      : `当前聚焦：${title}。完成这题后，会直接切到下一题继续。`;
  }

  return currentLocale === "en"
    ? `Current focus: ${title}. Finish it to wrap up this study round and return to the map.`
    : `当前聚焦：${title}。完成后会结束这一轮学习，并返回学习地图。`;
}

function perfStart() {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

function recordSidePanelPerf(name, startedAt, meta = {}) {
  const duration = Math.round((perfStart() - Number(startedAt || 0)) * 10) / 10;
  const item = {
    at: Date.now(),
    name: String(name || "unknown"),
    duration,
    ...meta
  };
  sidePanelPerfTrace.push(item);
  if (sidePanelPerfTrace.length > 80) sidePanelPerfTrace.shift();
  if (duration >= 120) {
    console.debug("[Hajimi perf]", item);
  }
  return item;
}

window.__hajimiPerf = {
  list: () => sidePanelPerfTrace.slice(),
  table: () => console.table(sidePanelPerfTrace.slice(-30)),
  clear: () => {
    sidePanelPerfTrace.length = 0;
  }
};

function getTimelineSyncStatusText() {
  const count = Number(timelineSyncState?.count || 0);
  if (timelineSyncState.status === "syncing") {
    return currentLocale === "en" ? "Syncing full timeline..." : "\u6b63\u5728\u540c\u6b65\u5b8c\u6574\u65f6\u95f4\u8f74...";
  }
  if (timelineSyncState.status === "done") {
    return currentLocale === "en" ? `Timeline synced · ${count} items` : `\u65f6\u95f4\u8f74\u5df2\u540c\u6b65 · ${count} \u9879`;
  }
  if (timelineSyncState.status === "partial") {
    return currentLocale === "en" ? `Still checking timeline · ${count} items` : `\u6b63\u5728\u8865\u5168\u65f6\u95f4\u8f74 · ${count} \u9879`;
  }
  return "";
}

function setTimelineSyncState(status, count = currentEntries.length) {
  timelineSyncState = {
    status: normalizeSingleLine(status || "idle", 24),
    count: Math.max(0, Number(count) || 0),
    updatedAt: Date.now()
  };
  renderTimelineSyncStatus();
}

function renderTimelineSyncStatus() {
  if (!(timelineSyncStatusEl instanceof HTMLElement)) return;
  const text = getTimelineSyncStatusText();
  timelineSyncStatusEl.textContent = text;
  timelineSyncStatusEl.hidden = !text;
  timelineSyncStatusEl.dataset.status = timelineSyncState.status || "idle";
}

function getBranchFollowupDropHint() {
  return currentLocale === "en"
    ? "Drop here to add this question into the current follow-up area."
    : "拖到这里 = 加入当前追问区，继续围绕这个主题追问。";
}

function getBranchAttachedHint() {
  return currentLocale === "en"
    ? "These questions are already in the current follow-up area. Open one to continue, remove it if it is no longer relevant, or type a new follow-up below."
    : "这些问题已经加入当前追问区。你可以点开继续看，也可以移出；如果还想继续深挖，直接在下方输入新的追问即可。";
}

function getLearningCategoryPanelHint() {
  return currentLocale === "en"
    ? "Drag a question into a category card for topic grouping. Drag it into the follow-up area when you want to keep asking around the same topic."
    : "拖到分类卡片里 = 主题归类；拖到追问区 = 继续围绕同一主题追问。";
}

function getLearningCategoryInputPlaceholder() {
  return currentLocale === "en" ? "Create a category, e.g. Taylor series" : "新建分类，例如：泰勒级数";
}

function getLearningCategoryAddLabel() {
  return currentLocale === "en" ? "Add" : "新建";
}

function getLearningCategoryEmptyText() {
  return currentLocale === "en" ? "No categories yet. Create one and drag questions into it." : "还没有分类。先新建一个分类，再把右侧问题拖进去。";
}

function getLearningCategoryDropHint() {
  return currentLocale === "en" ? "Drop here for topic grouping" : "拖到这里 = 主题分类";
}

function getLearningCategoryDeleteLabel() {
  return currentLocale === "en" ? "Delete" : "删除";
}

function getLearningCategoryRemoveLabel() {
  return currentLocale === "en" ? "Remove" : "移出";
}

function getLearningCategorySummaryText(uncategorizedCount, categoryCount) {
  if (currentLocale === "en") {
    return `${uncategorizedCount} uncategorized / ${categoryCount} categories`;
  }
  return `未分类 ${uncategorizedCount} · 分类 ${categoryCount}`;
}

function getLearningCategoryCountText(count) {
  if (currentLocale === "en") {
    return `${count} item${count === 1 ? "" : "s"}`;
  }
  return `${count} 题`;
}

function getLearningCategoryStatusText(type, payload = {}) {
  if (currentLocale === "en") {
    if (type === "created") return `Created category: ${payload.name || ""}`;
    if (type === "assigned") return `Moved to ${payload.name || ""}`;
    if (type === "removed") return "Moved back to Uncategorized";
    if (type === "deleted") return `Deleted category: ${payload.name || ""}`;
    if (type === "nonempty") return "Remove items inside this category before deleting it.";
    if (type === "duplicate") return "A category with the same name already exists.";
    if (type === "empty-name") return "Enter a category name first.";
  } else {
    if (type === "created") return `已创建分类：${payload.name || ""}`;
    if (type === "assigned") return `已归入分类：${payload.name || ""}`;
    if (type === "removed") return "已移回未分类";
    if (type === "deleted") return `已删除分类：${payload.name || ""}`;
    if (type === "nonempty") return "请先移出分类里的问题，再删除这个分类。";
    if (type === "duplicate") return "已存在同名分类。";
    if (type === "empty-name") return "请先输入分类名称。";
  }
  return "";
}

function setLearningCategoryStatus(message = "", isError = false) {
  if (!(learningCategoryStatusEl instanceof HTMLElement)) return;
  if (learningCategoryStatusTimer) {
    clearTimeout(learningCategoryStatusTimer);
    learningCategoryStatusTimer = null;
  }
  const text = String(message || "").trim();
  learningCategoryStatusEl.hidden = !text;
  learningCategoryStatusEl.textContent = text;
  learningCategoryStatusEl.classList.toggle("is-error", Boolean(isError && text));
  if (!text) return;
  learningCategoryStatusTimer = setTimeout(() => {
    if (!(learningCategoryStatusEl instanceof HTMLElement)) return;
    learningCategoryStatusEl.hidden = true;
    learningCategoryStatusEl.textContent = "";
    learningCategoryStatusEl.classList.remove("is-error");
    learningCategoryStatusTimer = null;
  }, isError ? 3600 : 2200);
}

function getEntryCategoryQuickPlaceholder() {
  return currentLocale === "en" ? "Category" : "分类";
}

function getEntryFollowupQuickLabel() {
  return currentLocale === "en" ? "Follow-up" : "追问";
}

function getEntryUnfollowLabel() {
  return currentLocale === "en" ? "Move out" : "移出追问";
}

function getEntryFollowupSelectedStatus() {
  return currentLocale === "en" ? "Selected as the current follow-up topic." : "已设为当前追问主题。";
}

function getEntryFollowupAddedStatus() {
  return currentLocale === "en" ? "Added to the current follow-up thread." : "已加入当前追问。";
}

function getEntryFollowupRemovedStatus() {
  return currentLocale === "en" ? "Moved back to the follow-up list." : "已移回追问列表。";
}

function getCompleteNextLabel() {
  const currentKey = normalizeSingleLine(selectedEntryKey || "", 200);
  const hasNext = currentKey ? getPendingLearningEntries().some((entry) => entry?._runtimeKey && entry._runtimeKey !== currentKey) : false;
  if (hasNext) {
    return currentLocale === "en" ? "Done, Next" : "完成并进入下一题";
  }
  return currentLocale === "en" ? "Finish" : "完成本题";
}

function getCompleteNextStatusText(done = false, nextReviewAt = 0) {
  const nextReviewText = nextReviewAt ? formatTime(nextReviewAt) : "";
  if (done) {
    if (nextReviewText) {
      return currentLocale === "en"
        ? `This study round is complete. Review will be due around ${nextReviewText}. Returning to the learning map.`
        : `这一轮学习已经整理完成，这题大约会在 ${nextReviewText} 进入“该回看”，正在返回学习地图。`;
    }
    return currentLocale === "en" ? "This study round is complete. Returning to the learning map." : "这一轮学习已经整理完成，正在返回学习地图。";
  }
  if (nextReviewText) {
    return currentLocale === "en"
      ? `This question is done. Review will be due around ${nextReviewText}. The next one is ready in the same workbench.`
      : `这题已经完成，大约会在 ${nextReviewText} 进入“该回看”；下一题已在同一个工作台里准备好了。`;
  }
  return currentLocale === "en" ? "This question is done. The next one is ready in the same workbench." : "这题已经完成，下一题已在同一个工作台里准备好了。";
}

function getWorkbenchEnteredStatusText(entry, source = "") {
  const title = getEntryTitle(entry) || (currentLocale === "en" ? "Untitled question" : "未命名问题");
  if (source === "completeNext") {
    return currentLocale === "en"
      ? `Next up: ${title}. Keep writing notes or asking follow-ups here.`
      : `下一题已切换为：${title}。继续在这里补笔记或追问就好。`;
  }
  return currentLocale === "en"
    ? `Now learning: ${title}. Add notes or ask follow-ups here when you are ready.`
    : `已进入：${title}。现在可以开始记笔记，或继续围绕这题追问。`;
}

function createEntryCategoryQuickSelect(entry, options = {}) {
  if (!entry?._runtimeKey) return null;
  const categories = getWorkspaceLearningCategories();
  if (!categories.length) return null;

  const currentFolderId = ensureValidFolderId(entry?.folderId, currentFolders);
  const select = document.createElement("select");
  select.className = options.className || "entry-category-quick-select";
  select.setAttribute("aria-label", getEntryCategoryQuickPlaceholder());

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = getEntryCategoryQuickPlaceholder();
  placeholder.disabled = currentFolderId !== DEFAULT_FOLDER_ID;
  select.appendChild(placeholder);

  categories.forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = buildSelectFolderLabel(folder.name || getLearningCategoryPanelTitle(), folder.depth || 0);
    select.appendChild(option);
  });

  select.value = currentFolderId !== DEFAULT_FOLDER_ID ? currentFolderId : "";
  ["click", "mousedown", "keydown"].forEach((eventName) => {
    select.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
  });
  select.addEventListener("change", () => {
    const folderId = ensureValidFolderId(select.value, currentFolders);
    if (!folderId || folderId === DEFAULT_FOLDER_ID) return;
    const previousValue = currentFolderId !== DEFAULT_FOLDER_ID ? currentFolderId : "";
    select.disabled = true;
    assignEntryToLearningCategory(entry._runtimeKey, folderId)
      .catch((error) => {
        console.error("assignEntryToLearningCategory by quick select failed", error);
        select.value = previousValue;
        select.disabled = false;
        setLearningCategoryStatus(error?.message || "assign category failed", true);
      });
  });

  return select;
}

async function quickSendEntryToFollowup(entryKey) {
  const targetEntryKey = normalizeSingleLine(entryKey || "", 200);
  if (!targetEntryKey) return false;
  const targetEntry = getEntryByRuntimeKey(targetEntryKey);
  if (!targetEntry) return false;

  const activeEntryKey = normalizeSingleLine(selectedEntryKey || "", 200);
  if (!activeEntryKey || activeEntryKey === targetEntryKey) {
    if (isEntryInLearningCategory(targetEntry)) {
      await removeEntryFromLearningCategory(targetEntryKey);
    }
    setCompactWorkspacePane("chat");
    scheduleSelectEntry(targetEntryKey, { syncScroll: true, force: true, openWorkbench: true });
    if (branchInputEl) branchInputEl.focus();
    setBranchComposerStatus(getEntryFollowupSelectedStatus());
    return true;
  }

  const moved = await classifyEntryToCurrentBranchThreadByDrag(targetEntryKey);
  if (moved) {
    setCompactWorkspacePane("chat");
    if (branchInputEl) branchInputEl.focus();
    setBranchComposerStatus(getEntryFollowupAddedStatus());
    if (pendingQuestionBoardMode === "pending") {
      selectNextPendingEntryAfter(targetEntryKey);
    }
  }
  return moved;
}

async function unclassifyEntryFromBranchThread(entryKey) {
  const targetEntryKey = normalizeSingleLine(entryKey || "", 200);
  if (!targetEntryKey) return false;
  const entry = getEntryByRuntimeKey(targetEntryKey);
  if (!entry || !isEntryManuallyClassified(entry)) return false;

  const changed = clearEntryManualBranchClassification(entry);
  if (!changed) return false;
  await persistCurrentSession({
    entries: currentEntries,
    manualBranchClassifiedEntryKeys: Array.from(manualBranchClassifiedEntryKeys),
    manualBranchClassifiedEntryOwners
  });
  timelineRenderSignature = "";
  branchThreadRenderSignature = "";
  renderTimeline();
  renderLearningCategoryPanel();
  renderBranchThread();
  renderBranchTreePanel();
  renderBranchMiniTimeline();
  setBranchComposerStatus(getEntryFollowupRemovedStatus());
  return true;
}

function getWorkspaceLearningCategories() {
  return getFolderTreeOrder(currentFolders, DEFAULT_FOLDER_ID)
    .filter((folder) => folder?.id && folder.id !== DEFAULT_FOLDER_ID);
}

function getEntryLearningCategoryId(entry) {
  const folderId = ensureValidFolderId(entry?.folderId, currentFolders);
  return folderId === DEFAULT_FOLDER_ID ? "" : folderId;
}

function isEntryInLearningCategory(entry) {
  return Boolean(getEntryLearningCategoryId(entry));
}

function isEntryDueForReviewQueue(entry, now = Date.now()) {
  if (!entry || isVirtualBranchEntry(entry)) return false;
  if (getEntryForcedReviewAt(entry)) return true;
  return Number(entry?.reviewedAt || 0) > 0 && isEntryDueForStudy(entry, now);
}

function getEntryLearningStatus(entry) {
  if (!entry || isVirtualBranchEntry(entry)) return "hidden";
  if (isEntryDueForReviewQueue(entry)) return "review";
  if (Number(entry?.reviewedAt || 0) > 0) return "done";
  if (entryKeysWithBranchAnswers.has(entry?._runtimeKey || "")) return "answered";
  if (isEntryManuallyClassified(entry)) return "attached";
  if (entry?._runtimeKey && selectedEntryKey === entry._runtimeKey && subQuestionWorkbenchOpen) return "studying";
  return "todo";
}

function getEntryLearningStatusLabel(status) {
  if (status === "review") return currentLocale === "en" ? "Review" : "\u5f85\u590d\u4e60";
  if (status === "done") return currentLocale === "en" ? "Done" : "\u5df2\u5b8c\u6210";
  if (status === "studying") return currentLocale === "en" ? "Learning" : "\u5b66\u4e60\u4e2d";
  if (status === "answered") return currentLocale === "en" ? "Answered" : "\u5df2\u8ffd\u95ee";
  if (status === "attached") return currentLocale === "en" ? "Follow-up" : "\u8ffd\u95ee";
  return currentLocale === "en" ? "To Study" : "\u5f85\u5b66";
}

function isEntryPendingForStudy(entry) {
  return getEntryLearningStatus(entry) === "todo";
}

function getLearningStatusCounts(entries = currentEntries) {
  const counts = { total: 0, todo: 0, review: 0, studying: 0, answered: 0, attached: 0, done: 0 };
  (entries || []).forEach((entry) => {
    if (!entry || isVirtualBranchEntry(entry)) return;
    counts.total += 1;
    const status = getEntryLearningStatus(entry);
    if (counts[status] !== undefined) counts[status] += 1;
  });
  return counts;
}

function getEntriesForLearningCategory(folderId) {
  const normalizedFolderId = ensureValidFolderId(folderId, currentFolders);
  if (!normalizedFolderId || normalizedFolderId === DEFAULT_FOLDER_ID) return [];
  return currentEntries
    .filter((entry) => !isVirtualBranchEntry(entry))
    .filter((entry) => ensureValidFolderId(entry?.folderId, currentFolders) === normalizedFolderId)
    .slice()
    .sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
}

function toggleLearningCategoryFolderExpansion(folderId) {
  const normalizedFolderId = ensureValidFolderId(folderId, currentFolders);
  if (!normalizedFolderId || normalizedFolderId === DEFAULT_FOLDER_ID) return;
  expandedLearningCategoryFolderId = expandedLearningCategoryFolderId === normalizedFolderId ? "" : normalizedFolderId;
  learningCategoryRenderSignature = "";
  renderLearningCategoryPanel();
}

function toggleMainLearningCategoryFolderExpansion(folderId) {
  const normalizedFolderId = ensureValidFolderId(folderId, currentFolders) || folderId;
  if (!normalizedFolderId) return;
  expandedMainLearningCategoryFolderId = expandedMainLearningCategoryFolderId === normalizedFolderId ? "" : normalizedFolderId;
  mainLearningMapRenderSignature = "";
  renderMainLearningMap();
}

function getPendingLearningEntries() {
  return currentEntries
    .filter((entry) => {
      if (!isEntryPendingForStudy(entry)) return false;
      if (isEntryInLearningCategory(entry)) return false;
      return true;
    })
    .slice()
    .sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
}

function renderMainLearningMap() {
  if (!(mainLearningMapEl instanceof HTMLElement)) return;

  const realEntries = currentEntries.filter((entry) => !isVirtualBranchEntry(entry));
  const counts = getLearningStatusCounts(realEntries);
  const categories = getWorkspaceLearningCategories();
  const progressPercent = counts.total ? Math.round((counts.done / counts.total) * 100) : 0;
  const pendingEntries = getPendingLearningEntries();
  const activeEntry = getSelectedEntry();
  const selectedPendingEntry = pendingEntries.find((entry) => entry?._runtimeKey === selectedEntryKey) || null;
  const nextEntry = selectedPendingEntry || pendingEntries[0] || realEntries.find((entry) => getEntryLearningStatus(entry) !== "done") || realEntries[0] || null;
  const uncategorizedEntries = realEntries
    .filter((entry) => !isEntryInLearningCategory(entry))
    .filter((entry) => !isEntryManuallyClassified(entry));
  const categoryPreviewData = [
    {
      folder: { id: DEFAULT_FOLDER_ID, name: currentLocale === "en" ? "Uncategorized" : "\u672a\u5206\u7c7b" },
      entries: uncategorizedEntries,
      doneCount: uncategorizedEntries.filter((entry) => Number(entry?.reviewedAt || 0) > 0).length,
      isDefault: true
    },
    ...categories.map((folder) => {
      const entries = getEntriesForLearningCategory(folder.id);
      const doneCount = entries.filter((entry) => Number(entry?.reviewedAt || 0) > 0).length;
      return { folder, entries, doneCount, isDefault: false };
    })
  ].filter((item) => item.entries.length || !item.isDefault);
  const previewCategoryIds = new Set(categoryPreviewData.map((item) => ensureValidFolderId(item.folder.id, currentFolders) || item.folder.id));
  if (!previewCategoryIds.has(expandedMainLearningCategoryFolderId)) {
    expandedMainLearningCategoryFolderId = "";
  }
  const nextSignature = [
    currentLocale,
    currentConversationTitle,
    selectedEntryKey,
    subQuestionWorkbenchOpen ? "open" : "map",
    counts.total,
    counts.todo,
    counts.review,
    counts.studying,
    counts.answered,
    counts.attached,
    counts.done,
    categories.length,
    expandedMainLearningCategoryFolderId,
    nextEntry?._runtimeKey || "",
    selectedPendingEntry?._runtimeKey || "",
    categoryPreviewData.map((item) => `${item.folder.id}:${item.folder.name}:${item.entries.length}:${item.doneCount}`).join("|")
  ].join("::");
  if (nextSignature === mainLearningMapRenderSignature && mainLearningMapEl.childElementCount > 0) return;
  mainLearningMapRenderSignature = nextSignature;

  mainLearningMapEl.innerHTML = "";

  const head = document.createElement("div");
  head.className = "main-learning-map-head";

  const titleWrap = document.createElement("div");
  titleWrap.className = "main-learning-map-title-wrap";

  const eyebrow = document.createElement("p");
  eyebrow.className = "main-learning-map-eyebrow";
  eyebrow.textContent = currentLocale === "en" ? "Main Question Map" : "\u4e3b\u95ee\u9898\u5b66\u4e60\u5730\u56fe";

  const title = document.createElement("h3");
  title.className = "main-learning-map-title";
  title.textContent = currentConversationTitle || (currentLocale === "en" ? "Current conversation" : "\u5f53\u524d\u5bf9\u8bdd");

  titleWrap.append(eyebrow, title);

  const status = document.createElement("div");
  status.className = "main-learning-map-status";
  [
    [currentLocale === "en" ? "To Study" : "\u5f85\u5b66", counts.todo],
    [currentLocale === "en" ? "Review" : "\u5f85\u590d\u4e60", counts.review],
    [currentLocale === "en" ? "In Progress" : "\u8fdb\u884c\u4e2d", counts.studying + counts.answered + counts.attached],
    [currentLocale === "en" ? "Done" : "\u5df2\u5b8c\u6210", counts.done]
  ].forEach(([label, value]) => {
    const pill = document.createElement("span");
    pill.className = "main-learning-map-pill";
    pill.textContent = `${label} ${value}`;
    status.appendChild(pill);
  });

  head.append(titleWrap, status);

  const progress = document.createElement("div");
  progress.className = "main-learning-progress";
  const progressBar = document.createElement("span");
  progressBar.className = "main-learning-progress-bar";
  progressBar.style.width = `${progressPercent}%`;
  const progressText = document.createElement("span");
  progressText.className = "main-learning-progress-text";
  progressText.textContent =
    currentLocale === "en" ? `${progressPercent}% completed` : `\u5df2\u5b8c\u6210 ${progressPercent}%`;
  progress.append(progressBar, progressText);

  {
  const nextCard = document.createElement("section");
  nextCard.className = "main-learning-next-card";
  const nextMain = document.createElement("div");
  nextMain.className = "main-learning-next-main";
  const nextLabel = document.createElement("p");
  nextLabel.className = "main-learning-next-label";
  nextLabel.textContent = subQuestionWorkbenchOpen && activeEntry?._runtimeKey === nextEntry?._runtimeKey
    ? currentLocale === "en" ? "Current Focus" : "当前聚焦"
    : selectedPendingEntry
      ? currentLocale === "en" ? "Selected Question" : "\u5df2\u9009\u9898\u76ee"
      : currentLocale === "en" ? "Suggested Start" : "\u5efa\u8bae\u5148\u5b66";
  const nextTitle = document.createElement("p");
  nextTitle.className = "main-learning-next-title";
  nextTitle.textContent = nextEntry
    ? getEntryTitle(nextEntry) || (currentLocale === "en" ? "Untitled question" : "\u672a\u547d\u540d\u95ee\u9898")
    : currentLocale === "en"
      ? "No questions to study."
      : "\u6682\u65e0\u5f85\u5b66\u4e60\u95ee\u9898";
  const nextMeta = document.createElement("p");
  nextMeta.className = "main-learning-next-meta";
  nextMeta.textContent = getMainLearningNextMeta(nextEntry, {
    selectedPendingEntry,
    pendingCount: pendingEntries.length,
    counts,
    activeEntry
  });
  nextMain.append(nextLabel, nextTitle, nextMeta);
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "main-learning-next-btn";
  nextBtn.textContent = subQuestionWorkbenchOpen && activeEntry?._runtimeKey === nextEntry?._runtimeKey
    ? currentLocale === "en" ? "Continue" : "\u7ee7\u7eed\u5b66\u4e60"
    : currentLocale === "en" ? "Start" : "\u5f00\u59cb\u5b66\u4e60";
  nextBtn.disabled = !nextEntry?._runtimeKey;
  nextBtn.addEventListener("click", () => {
    if (!nextEntry?._runtimeKey) return;
    openSubQuestionWorkbench(nextEntry._runtimeKey, { syncScroll: true, force: true, source: "start" });
  });
  nextCard.append(nextMain, nextBtn);

  const categorySection = document.createElement("section");
  categorySection.className = "main-learning-category-section";
  const categoryHead = document.createElement("div");
  categoryHead.className = "main-learning-category-head";
  const categoryTitle = document.createElement("p");
  categoryTitle.className = "main-learning-category-title";
  categoryTitle.textContent = currentLocale === "en" ? "Study By Category" : "\u6309\u5206\u7c7b\u5b66\u4e60";
  const categoryMeta = document.createElement("span");
  categoryMeta.className = "main-learning-category-meta";
  categoryMeta.textContent = currentLocale === "en" ? `${categoryPreviewData.length} groups` : `${categoryPreviewData.length} \u7ec4`;
  categoryHead.append(categoryTitle, categoryMeta);

  const categoryGrid = document.createElement("div");
  categoryGrid.className = "main-learning-category-grid";
  if (!categoryPreviewData.length) {
    const empty = document.createElement("p");
    empty.className = "main-learning-map-empty";
    empty.textContent = currentLocale === "en"
      ? "Create categories from the queue on the right, then organize questions by topic."
      : "\u5728\u53f3\u4fa7\u5b66\u4e60\u961f\u5217\u521b\u5efa\u5206\u7c7b\uff0c\u518d\u6309\u77e5\u8bc6\u70b9\u6574\u7406\u95ee\u9898\u3002";
    categoryGrid.appendChild(empty);
  } else {
    categoryPreviewData.forEach(({ folder, entries, doneCount, isDefault }) => {
      const normalizedFolderId = ensureValidFolderId(folder.id, currentFolders) || folder.id;
      const isExpanded = expandedMainLearningCategoryFolderId === normalizedFolderId;
      const item = document.createElement("section");
      item.className = `main-learning-category-card${isDefault ? " is-default" : ""}${isExpanded ? " is-expanded" : ""}`;
      item.dataset.folderId = normalizedFolderId;
      const headWrap = document.createElement("div");
      headWrap.className = "main-learning-category-card-head";
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "main-learning-category-card-toggle";
      toggleBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      const name = document.createElement("span");
      name.className = "main-learning-category-card-name";
      name.textContent = folder.name || getLearningCategoryPanelTitle();
      const count = document.createElement("span");
      count.className = "main-learning-category-card-count";
      count.textContent = currentLocale === "en" ? `${entries.length} questions` : `${entries.length} \u9898`;
      const meta = document.createElement("span");
      meta.className = "main-learning-category-card-meta";
      meta.textContent = currentLocale === "en" ? `${doneCount}/${entries.length} done` : `已完成 ${doneCount}/${entries.length}`;
      toggleBtn.append(name, count, meta);
      toggleBtn.addEventListener("click", () => {
        toggleMainLearningCategoryFolderExpansion(normalizedFolderId);
      });
      const bar = document.createElement("span");
      bar.className = "main-learning-category-card-bar";
      const fill = document.createElement("span");
      fill.style.width = `${entries.length ? Math.round((doneCount / entries.length) * 100) : 0}%`;
      bar.appendChild(fill);
      const firstPending = entries.find((entry) => getEntryLearningStatus(entry) !== "done") || entries[0];
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "main-learning-category-card-action";
      actionBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      actionBtn.textContent = isExpanded
        ? (currentLocale === "en" ? "Collapse" : "\u6536\u8d77")
        : (currentLocale === "en" ? "Expand" : "\u5c55\u5f00");
      actionBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleMainLearningCategoryFolderExpansion(normalizedFolderId);
      });
      headWrap.append(toggleBtn, actionBtn);

      const body = document.createElement("div");
      body.className = "main-learning-category-card-body";
      body.hidden = !isExpanded;
      if (!entries.length) {
        const empty = document.createElement("p");
        empty.className = "main-learning-category-entry-empty";
        empty.textContent = currentLocale === "en" ? "No questions in this category yet." : "\u8fd9\u4e2a\u5206\u7c7b\u91cc\u8fd8\u6ca1\u6709\u95ee\u9898\u3002";
        body.appendChild(empty);
      } else {
        const entryList = document.createElement("div");
        entryList.className = "main-learning-category-entry-list";
        entries.forEach((entry) => {
          const entryBtn = document.createElement("button");
          entryBtn.type = "button";
          entryBtn.className = `main-learning-category-entry-btn${entry._runtimeKey === selectedEntryKey ? " active" : ""}`;
          const entryTitle = document.createElement("span");
          entryTitle.className = "main-learning-category-entry-title";
          entryTitle.textContent = getEntryTitle(entry) || t("untitled_node");
          const entryStatus = document.createElement("span");
          const statusKey = getEntryLearningStatus(entry);
          entryStatus.className = `main-learning-category-entry-status is-${statusKey}`;
          entryStatus.textContent = getEntryLearningStatusLabel(statusKey);
          entryBtn.append(entryTitle, entryStatus);
          entryBtn.addEventListener("click", () => {
            setSubQuestionWorkbenchOpen(false);
            scheduleSelectEntry(entry._runtimeKey, { syncScroll: true, force: true, openWorkbench: false });
          });
          entryList.appendChild(entryBtn);
        });
        body.appendChild(entryList);
      }
      if (firstPending?._runtimeKey) {
        const startBtn = document.createElement("button");
        startBtn.type = "button";
        startBtn.className = "main-learning-category-start-btn";
        startBtn.textContent = currentLocale === "en" ? "Start From First" : "\u4ece\u7b2c\u4e00\u9898\u5f00\u59cb";
        startBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          setSubQuestionWorkbenchOpen(false);
          scheduleSelectEntry(firstPending._runtimeKey, { syncScroll: true, force: true, openWorkbench: false });
        });
        body.appendChild(startBtn);
      }

      item.append(headWrap, bar, body);
      bindLearningCategoryDropTarget(item, folder.id);
      categoryGrid.appendChild(item);
    });
  }
  categorySection.append(categoryHead, categoryGrid);
  mainLearningMapEl.append(head, progress, nextCard, categorySection);
  return;
  }

  const body = document.createElement("div");
  body.className = "main-learning-map-body";

  const activeCard = document.createElement("section");
  activeCard.className = "main-learning-map-card main-learning-map-active";
  const activeTitle = document.createElement("p");
  activeTitle.className = "main-learning-map-card-title";
  activeTitle.textContent = currentLocale === "en" ? "Current Workbench" : "\u5f53\u524d\u5de5\u4f5c\u53f0";
  const activeText = document.createElement("p");
  activeText.className = "main-learning-map-card-text";
  activeText.textContent = activeEntry
    ? getEntryTitle(activeEntry) || (currentLocale === "en" ? "Untitled question" : "\u672a\u547d\u540d\u95ee\u9898")
    : currentLocale === "en"
      ? "Pick a question on the right to enter its workbench."
      : "\u4ece\u53f3\u4fa7\u9009\u62e9\u4e00\u4e2a\u5f85\u5b66\u4e60\u95ee\u9898\uff0c\u8fdb\u5165\u5b83\u7684\u5de5\u4f5c\u53f0\u3002";
  activeCard.append(activeTitle, activeText);

  const categoryCard = document.createElement("section");
  categoryCard.className = "main-learning-map-card";
  const categoryTitle = document.createElement("p");
  categoryTitle.className = "main-learning-map-card-title";
  categoryTitle.textContent = currentLocale === "en" ? "Categories & Status" : "\u5206\u7c7b\u548c\u5b66\u4e60\u72b6\u6001";
  const categoryList = document.createElement("div");
  categoryList.className = "main-learning-map-category-list";

  if (!categoryPreviewData.length) {
    const empty = document.createElement("p");
    empty.className = "main-learning-map-empty";
    empty.textContent = currentLocale === "en"
      ? "No categories yet. Finish a few questions, then organize them by topic."
      : "\u6682\u65e0\u5206\u7c7b\u3002\u5148\u5b66\u51e0\u9898\uff0c\u518d\u6309\u77e5\u8bc6\u70b9\u6574\u7406\u3002";
    categoryList.appendChild(empty);
  } else {
    categoryPreviewData.forEach(({ folder, entries, doneCount }) => {
      const item = document.createElement("button");
      item.className = "main-learning-map-category";
      item.type = "button";
      item.textContent = `${folder.name || getLearningCategoryPanelTitle()} · ${doneCount}/${entries.length}`;
      const firstEntry = entries[0];
      if (!firstEntry?._runtimeKey) {
        item.disabled = true;
      }
      bindLearningCategoryDropTarget(item, folder.id);
      categoryList.appendChild(item);
    });
  }

  categoryCard.append(categoryTitle, categoryList);
  body.append(activeCard, categoryCard);
  mainLearningMapEl.append(head, progress, body);
}

function applySubQuestionWorkbenchMode() {
  if (branchWorkspaceEl instanceof HTMLElement) {
    branchWorkspaceEl.classList.toggle("subquestion-workbench-open", subQuestionWorkbenchOpen);
  }
  if (workspaceViewEl instanceof HTMLElement) {
    workspaceViewEl.classList.toggle("subquestion-workbench-open", subQuestionWorkbenchOpen);
  }
}

function setSubQuestionWorkbenchOpen(open) {
  subQuestionWorkbenchOpen = Boolean(open);
  removeStudyFlowGuides();
  applySubQuestionWorkbenchMode();
  if (!subQuestionWorkbenchOpen) {
    renderMainLearningMap();
    renderLearningCategoryPanel();
  }
}

function openSubQuestionWorkbench(entryKey, options = {}) {
  const targetKey = normalizeSingleLine(entryKey || "", 200);
  if (!targetKey) return false;
  const source = normalizeSingleLine(options?.source || "", 40);
  const targetEntry = getEntryByRuntimeKey(targetKey);
  const canOpenFromSource = source === "start" || source === "completeNext" || source === "external";
  if (!subQuestionWorkbenchOpen && !canOpenFromSource) {
    selectEntry(targetKey, {
      syncScroll: Boolean(options?.syncScroll),
      force: options?.force !== false,
      openWorkbench: false
    }).catch((error) => {
      console.error("openSubQuestionWorkbench select-only failed", error);
    });
    return false;
  }
  setSubQuestionWorkbenchOpen(true);
  setCompactWorkspacePane(options?.pane || "chat");
  if (targetEntry && (source === "start" || source === "completeNext")) {
    setStudyNoteStatus(getWorkbenchEnteredStatusText(targetEntry, source));
  }
  selectEntry(targetKey, {
    syncScroll: Boolean(options?.syncScroll),
    force: options?.force !== false,
    openWorkbench: true
  }).catch((error) => {
    console.error("openSubQuestionWorkbench failed", error);
  });
  return true;
}

function selectNextPendingEntryAfter(entryKey) {
  const targetKey = normalizeSingleLine(entryKey || "", 200);
  const pendingEntries = getPendingLearningEntries().filter((entry) => entry?._runtimeKey !== targetKey);
  if (!pendingEntries.length) return false;

  const targetEntry = getEntryByRuntimeKey(targetKey);
  const targetTs = Number(targetEntry?.timestamp) || 0;
  const nextEntry = pendingEntries.find((entry) => Number(entry?.timestamp || 0) > targetTs) || pendingEntries[0];
  if (!nextEntry?._runtimeKey) return false;
  openSubQuestionWorkbench(nextEntry._runtimeKey, { syncScroll: true, force: true, pane: "chat", source: "completeNext" });
  return true;
}

async function completeCurrentAndSelectNext() {
  const currentKey = normalizeSingleLine(selectedEntryKey || "", 200);
  if (!currentKey) {
    setStudyNoteStatus(t("study_note_select_entry_ph"), true);
    return false;
  }
  await saveStudyNote();
  const entry = getEntryByRuntimeKey(currentKey);
  let nextReviewAt = 0;
  if (entry) {
    const now = Date.now();
    const nextCount = Math.max(0, Number(entry.reviewCount || 0)) + 1;
    nextReviewAt = now + getReviewIntervalMs({ ...entry, reviewCount: nextCount });
    currentEntries = currentEntries.map((item) => {
      if (item._runtimeKey !== currentKey) return item;
      return { ...item, reviewedAt: now, reviewCount: nextCount };
    });
    await persistCurrentSession({ entries: currentEntries });
  }
  const moved = selectNextPendingEntryAfter(currentKey);
  renderMainLearningMap();
  setStudyNoteStatus(getCompleteNextStatusText(!moved, nextReviewAt));
  scheduleTimelineRender();
  if (!moved) {
    setSubQuestionWorkbenchOpen(false);
  }
  return true;
}

function clearEntryManualBranchClassification(entry) {
  if (!entry) return false;
  let changed = false;
  if (entry._runtimeKey && manualBranchClassifiedEntryKeys.delete(entry._runtimeKey)) {
    changed = true;
  }
  getManualBranchClassifyTokenCandidates(entry).forEach((token) => {
    if (manualBranchClassifiedEntryKeys.delete(token)) changed = true;
    if (token in manualBranchClassifiedEntryOwners) {
      delete manualBranchClassifiedEntryOwners[token];
      changed = true;
    }
  });
  const fallbackToken = getManualBranchClassifyToken(entry);
  if (fallbackToken && manualBranchClassifiedEntryKeys.delete(fallbackToken)) {
    changed = true;
  }
  if (fallbackToken && fallbackToken in manualBranchClassifiedEntryOwners) {
    delete manualBranchClassifiedEntryOwners[fallbackToken];
    changed = true;
  }
  return changed;
}

async function assignEntryToLearningCategory(entryKey, folderId, options = {}) {
  const targetEntryKey = normalizeSingleLine(entryKey || "", 200);
  const normalizedFolderId = ensureValidFolderId(folderId, currentFolders);
  if (!targetEntryKey || normalizedFolderId === DEFAULT_FOLDER_ID) return false;
  const entry = getEntryByRuntimeKey(targetEntryKey);
  if (!entry) return false;
  const targetFolder = currentFolders.find((folder) => folder.id === normalizedFolderId);
  if (!targetFolder) return false;

  let changed = false;
  currentEntries = currentEntries.map((item) => {
    if (item._runtimeKey !== targetEntryKey) return item;
    if (ensureValidFolderId(item.folderId, currentFolders) === normalizedFolderId) return item;
    changed = true;
    return { ...item, folderId: normalizedFolderId };
  });
  const classificationChanged = options.clearBranch !== false ? clearEntryManualBranchClassification(entry) : false;
  if (!changed && !classificationChanged) return false;

  if (normalizeSingleLine(branchAutoSuggestTargetEntryKey || "", 200) === targetEntryKey) {
    branchAutoSuggestSeenEntryKeys.add(targetEntryKey);
    resetBranchAutoSuggestionState({ keepSeen: true });
  }

  if (classificationChanged) {
    currentBranchMessages = currentBranchMessages.slice();
  }

  await persistCurrentSession({
    entries: currentEntries,
    manualBranchClassifiedEntryKeys: Array.from(manualBranchClassifiedEntryKeys),
    manualBranchClassifiedEntryOwners
  });
  timelineRenderSignature = "";
  learningCategoryRenderSignature = "";
  renderTimeline();
  renderLearningCategoryPanel();
  renderBranchThread();
  renderBranchTreePanel();
  renderBranchMiniTimeline();
  setLearningCategoryStatus(getLearningCategoryStatusText("assigned", { name: targetFolder.name || getLearningCategoryPanelTitle() }));
  if (pendingQuestionBoardMode === "pending" && options.advanceNext !== false) {
    selectNextPendingEntryAfter(targetEntryKey);
  }
  return true;
}

function bindLearningCategoryDropTarget(targetEl, folderId, options = {}) {
  if (!(targetEl instanceof HTMLElement)) return;
  const normalizedFolderId = ensureValidFolderId(folderId, currentFolders);
  if (!normalizedFolderId || normalizedFolderId === DEFAULT_FOLDER_ID) return;

  const clearDropState = () => targetEl.classList.remove("is-drop-over");

  targetEl.addEventListener("dragover", (event) => {
    const draggedEntryKey = getDraggedWorkspaceEntryKeyFromEvent(event);
    if (!draggedEntryKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    targetEl.classList.add("is-drop-over");
  });

  targetEl.addEventListener("dragleave", (event) => {
    const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (relatedTarget && targetEl.contains(relatedTarget)) return;
    clearDropState();
  });

  targetEl.addEventListener("drop", (event) => {
    const draggedEntryKey = getDraggedWorkspaceEntryKeyFromEvent(event);
    clearDropState();
    workspaceDraggingEntryKey = "";
    if (!draggedEntryKey) return;
    event.preventDefault();
    event.stopPropagation();
    assignEntryToLearningCategory(draggedEntryKey, normalizedFolderId, {
      advanceNext: false,
      clearBranch: options.clearBranch
    }).catch((error) => {
      console.error("assignEntryToLearningCategory by drop failed", error);
      setLearningCategoryStatus(error?.message || "assign category failed", true);
    });
  });
}

async function removeEntryFromLearningCategory(entryKey) {
  const targetEntryKey = normalizeSingleLine(entryKey || "", 200);
  if (!targetEntryKey) return false;
  let changed = false;
  currentEntries = currentEntries.map((item) => {
    if (item._runtimeKey !== targetEntryKey) return item;
    if (ensureValidFolderId(item.folderId, currentFolders) === DEFAULT_FOLDER_ID) return item;
    changed = true;
    return { ...item, folderId: DEFAULT_FOLDER_ID };
  });
  if (!changed) return false;
  await persistCurrentSession({ entries: currentEntries });
  timelineRenderSignature = "";
  learningCategoryRenderSignature = "";
  renderTimeline();
  renderLearningCategoryPanel();
  setLearningCategoryStatus(getLearningCategoryStatusText("removed"));
  return true;
}

async function createLearningCategory() {
  if (!currentConversationId || !currentStorageKey) return false;
  const name = normalizeFolderName(learningCategoryInputEl?.value || "");
  if (!name) {
    setLearningCategoryStatus(getLearningCategoryStatusText("empty-name"), true);
    learningCategoryInputEl?.focus();
    return false;
  }
  const duplicated = currentFolders.find((folder) => (folder.name || "").toLowerCase() === name.toLowerCase());
  if (duplicated) {
    setLearningCategoryStatus(getLearningCategoryStatusText("duplicate"), true);
    learningCategoryInputEl?.focus();
    return false;
  }
  currentFolders = [
    ...currentFolders,
    {
      id: normalizeFolderId(createId("folder")),
      name,
      parentId: DEFAULT_FOLDER_ID
    }
  ];
  await persistCurrentSession({ folders: currentFolders });
  if (learningCategoryInputEl) learningCategoryInputEl.value = "";
  learningCategoryRenderSignature = "";
  branchThreadRenderSignature = "";
  renderTimeline();
  renderLearningCategoryPanel();
  renderBranchThread();
  renderBulkMoveFolderOptions();
  setLearningCategoryStatus(getLearningCategoryStatusText("created", { name }));
  return true;
}

async function deleteLearningCategory(folderId) {
  const normalizedFolderId = ensureValidFolderId(folderId, currentFolders);
  if (!normalizedFolderId || normalizedFolderId === DEFAULT_FOLDER_ID) return false;
  const folder = currentFolders.find((item) => item.id === normalizedFolderId);
  if (!folder) return false;
  const hasEntries = currentEntries.some((entry) => ensureValidFolderId(entry?.folderId, currentFolders) === normalizedFolderId);
  const hasChildren = currentFolders.some((item) => ensureValidFolderId(item?.parentId, currentFolders) === normalizedFolderId);
  if (hasEntries || hasChildren) {
    setLearningCategoryStatus(getLearningCategoryStatusText("nonempty"), true);
    return false;
  }
  currentFolders = currentFolders.filter((item) => item.id !== normalizedFolderId);
  timelineFolderFilterIds.delete(normalizedFolderId);
  collapsedFolderIds.delete(normalizedFolderId);
  await persistCurrentSession({ folders: currentFolders, collapsedFolderIds: Array.from(collapsedFolderIds) });
  learningCategoryRenderSignature = "";
  branchThreadRenderSignature = "";
  renderTimeline();
  renderLearningCategoryPanel();
  renderBranchThread();
  renderBulkMoveFolderOptions();
  setLearningCategoryStatus(getLearningCategoryStatusText("deleted", { name: folder.name || "" }));
  return true;
}

function renderLearningCategoryPanel() {
  if (
    !(learningCategoryPanelEl instanceof HTMLElement) ||
    !(learningCategoryTitleEl instanceof HTMLElement) ||
    !(learningCategoryHintEl instanceof HTMLElement) ||
    !(learningCategorySummaryEl instanceof HTMLElement) ||
    !(learningCategoryInputEl instanceof HTMLElement) ||
    !(learningCategoryAddBtnEl instanceof HTMLElement) ||
    !(learningCategoryListEl instanceof HTMLElement)
  ) {
    renderMainLearningMap();
    return;
  }

  const categories = getWorkspaceLearningCategories();
  const uncategorizedCount = currentEntries.filter((entry) => {
    if (isVirtualBranchEntry(entry)) return false;
    if (isEntryInLearningCategory(entry)) return false;
    if (isEntryManuallyClassified(entry)) return false;
    if (entryKeysWithBranchAnswers.has(entry?._runtimeKey || "")) return false;
    return true;
  }).length;
  const signature = [
    currentLocale,
    currentEntries
      .map((entry) => `${entry?._runtimeKey || ""}:${ensureValidFolderId(entry?.folderId, currentFolders)}:${Number(entry?.timestamp) || 0}`)
      .join("|"),
    categories.map((folder) => `${folder.id}:${folder.name || ""}:${folder.parentId || ""}:${folder.depth || 0}`).join("|"),
    expandedLearningCategoryFolderId,
    Array.from(manualBranchClassifiedEntryKeys).sort().join(","),
    Array.from(entryKeysWithBranchAnswers).sort().join(",")
  ].join("::");
  if (signature === learningCategoryRenderSignature) {
    renderMainLearningMap();
    return;
  }
  const categoryIdSet = new Set(categories.map((folder) => folder.id));
  if (!categoryIdSet.has(expandedLearningCategoryFolderId)) {
    expandedLearningCategoryFolderId = "";
  }
  learningCategoryRenderSignature = signature;

  learningCategoryTitleEl.textContent = getLearningCategoryPanelTitle();
  learningCategoryHintEl.textContent = getLearningCategoryPanelHint();
  if (currentLocale !== "en") {
    learningCategoryTitleEl.textContent = "\u6574\u7406\u5206\u7c7b";
    learningCategoryHintEl.textContent = "\u5b66\u5b8c\u540e\u518d\u5f52\u7c7b\uff0c\u628a\u95ee\u9898\u6309\u77e5\u8bc6\u70b9\u6574\u7406\u3002";
  }
  learningCategorySummaryEl.textContent = getLearningCategorySummaryText(uncategorizedCount, categories.length);
  if (currentLocale !== "en") {
    learningCategorySummaryEl.textContent = `\u672a\u5206\u7c7b ${uncategorizedCount} \u9898 / \u5206\u7c7b ${categories.length}`;
  }
  learningCategoryInputEl.placeholder = getLearningCategoryInputPlaceholder();
  learningCategoryAddBtnEl.textContent = getLearningCategoryAddLabel();
  if (currentLocale !== "en") {
    learningCategoryInputEl.placeholder = "\u65b0\u5206\u7c7b\uff0c\u5982\uff1a\u6cf0\u52d2\u5c55\u5f00";
    learningCategoryAddBtnEl.textContent = "\u6dfb\u52a0";
  }

  learningCategoryListEl.innerHTML = "";
  if (!categories.length) {
    const empty = document.createElement("p");
    empty.className = "learning-category-empty";
    empty.textContent = getLearningCategoryEmptyText();
    learningCategoryListEl.appendChild(empty);
    renderMainLearningMap();
    return;
  }

  categories.forEach((folder) => {
    const isExpanded = expandedLearningCategoryFolderId === folder.id;
    const card = document.createElement("section");
    card.className = `learning-category-card ${getTimelineFolderToneClass(folder.id)}${isExpanded ? " is-expanded" : ""}`;
    card.dataset.folderId = folder.id;

    const head = document.createElement("div");
    head.className = "learning-category-card-head";

    const titleBtn = document.createElement("button");
    titleBtn.type = "button";
    titleBtn.className = "learning-category-card-title";
    titleBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    titleBtn.textContent = buildSelectFolderLabel(folder.name || getLearningCategoryPanelTitle(), folder.depth || 0);
    titleBtn.addEventListener("click", () => {
      toggleLearningCategoryFolderExpansion(folder.id);
    });

    const meta = document.createElement("div");
    meta.className = "learning-category-card-meta";

    const entries = getEntriesForLearningCategory(folder.id);
    const count = document.createElement("span");
    count.className = "learning-category-card-count";
    count.textContent = getLearningCategoryCountText(entries.length);
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "learning-category-card-delete";
    deleteBtn.textContent = getLearningCategoryDeleteLabel();
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteLearningCategory(folder.id).catch((error) => {
        console.error("deleteLearningCategory failed", error);
        setLearningCategoryStatus(error?.message || "delete category failed", true);
      });
    });

    meta.append(count, deleteBtn);
    head.append(titleBtn, meta);

    const preview = document.createElement("p");
    preview.className = "learning-category-card-preview";
    preview.hidden = isExpanded;
    preview.textContent = !entries.length
      ? getLearningCategoryDropHint()
      : entries
          .slice(0, 2)
          .map((entry) => getEntryTitle(entry) || t("untitled_node"))
          .join(currentLocale === "en" ? " / " : "\u3001");

    const list = document.createElement("div");
    list.className = "learning-category-entry-list";
    list.hidden = !isExpanded;

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "learning-category-entry-empty";
      empty.textContent = getLearningCategoryDropHint();
      list.appendChild(empty);
    } else {
      entries.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "learning-category-entry-item";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "learning-category-entry-btn";
        openBtn.textContent = getEntryTitle(entry) || t("untitled_node");
        openBtn.addEventListener("click", () => {
          setSubQuestionWorkbenchOpen(false);
          scheduleSelectEntry(entry._runtimeKey, { syncScroll: true, force: true, openWorkbench: false });
        });

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "learning-category-entry-remove";
        removeBtn.textContent = getLearningCategoryRemoveLabel();
        removeBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          removeEntryFromLearningCategory(entry._runtimeKey).catch((error) => {
            console.error("removeEntryFromLearningCategory failed", error);
            setLearningCategoryStatus(error?.message || "remove entry failed", true);
          });
        });

        const actions = document.createElement("div");
        actions.className = "learning-category-entry-actions";

        const followupBtn = document.createElement("button");
        followupBtn.type = "button";
        followupBtn.className = "learning-category-entry-followup";
        followupBtn.textContent = getEntryFollowupQuickLabel();
        followupBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          quickSendEntryToFollowup(entry._runtimeKey).catch((error) => {
            console.error("quickSendEntryToFollowup from category failed", error);
            setBranchComposerStatus(error?.message || "follow-up failed", true);
          });
        });

        actions.append(followupBtn, removeBtn);
        item.append(openBtn, actions);
        list.appendChild(item);
      });
    }

    bindLearningCategoryDropTarget(card, folder.id);

    card.append(head, preview, list);
    learningCategoryListEl.appendChild(card);
  });
  renderMainLearningMap();
}

function renderPendingQuestionBoard() {
  if (
    !(pendingQuestionBoardEl instanceof HTMLElement) ||
    !(pendingQuestionBoardTitleEl instanceof HTMLElement) ||
    !(pendingQuestionBoardHintEl instanceof HTMLElement)
  ) {
    return;
  }
  pendingQuestionBoardEl.dataset.mode = pendingQuestionBoardMode;
  renderTimelineSyncStatus();
  pendingQuestionBoardTitleEl.textContent = getPendingQuestionBoardTitle();
  pendingQuestionBoardHintEl.textContent = getPendingQuestionBoardHint();
  if (pendingQuestionPendingBtnEl instanceof HTMLElement) {
    const active = pendingQuestionBoardMode === "pending";
    pendingQuestionPendingBtnEl.textContent = getPendingQuestionTabLabel("pending");
    pendingQuestionPendingBtnEl.classList.toggle("active", active);
    pendingQuestionPendingBtnEl.setAttribute("aria-selected", active ? "true" : "false");
  }
  if (pendingQuestionReviewBtnEl instanceof HTMLElement) {
    const active = pendingQuestionBoardMode === "review";
    pendingQuestionReviewBtnEl.textContent = getPendingQuestionTabLabel("review");
    pendingQuestionReviewBtnEl.classList.toggle("active", active);
    pendingQuestionReviewBtnEl.setAttribute("aria-selected", active ? "true" : "false");
  }
  if (pendingQuestionFollowupBtnEl instanceof HTMLElement) {
    const active = pendingQuestionBoardMode === "followup";
    pendingQuestionFollowupBtnEl.textContent = getPendingQuestionTabLabel("followup");
    pendingQuestionFollowupBtnEl.classList.toggle("active", active);
    pendingQuestionFollowupBtnEl.setAttribute("aria-selected", active ? "true" : "false");
  }
  refreshPendingQuestionSearchPlaceholder();
}

function ensureCompleteNextButton() {
  if (!(studyWorkflowActionsEl instanceof HTMLElement)) {
    return null;
  }

  let backBtn = document.getElementById("backToLearningMapBtn");
  if (!(backBtn instanceof HTMLElement)) {
    backBtn = document.createElement("button");
    backBtn.id = "backToLearningMapBtn";
    backBtn.className = "ghost-btn ghost-btn-small back-learning-map-btn";
    backBtn.type = "button";
    backBtn.addEventListener("click", () => {
      setSubQuestionWorkbenchOpen(false);
    });
    studyWorkflowActionsEl.appendChild(backBtn);
  }
  backBtn.textContent = currentLocale === "en" ? "Back to Queue" : "\u8fd4\u56de\u9009\u9898";

  let label = document.getElementById("studyWorkflowActionLabel");
  if (!(label instanceof HTMLElement)) {
    label = document.createElement("span");
    label.id = "studyWorkflowActionLabel";
    label.className = "study-workflow-action-label";
    studyWorkflowActionsEl.appendChild(label);
  }
  label.textContent = getStudyWorkflowActionText();

  if (!(completeNextBtnEl instanceof HTMLElement)) {
    completeNextBtnEl = document.getElementById("completeNextBtn");
  }
  if (!(completeNextBtnEl instanceof HTMLElement)) {
    const btn = document.createElement("button");
    btn.id = "completeNextBtn";
    btn.className = "ghost-btn ghost-btn-small complete-next-btn";
    btn.type = "button";
    btn.addEventListener("click", () => {
      completeCurrentAndSelectNext().catch((error) => {
        console.error("completeCurrentAndSelectNext failed", error);
        setStudyNoteStatus(error?.message || "complete next failed", true);
      });
    });
    completeNextBtnEl = btn;
  }
  completeNextBtnEl.textContent = getCompleteNextLabel();
  completeNextBtnEl.disabled = !selectedEntryKey;
  if (completeNextBtnEl.parentElement !== studyWorkflowActionsEl) {
    studyWorkflowActionsEl.appendChild(completeNextBtnEl);
  }
  return completeNextBtnEl;
}

function normalizeStudySplitRatio(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 58;
  return Math.min(74, Math.max(36, Math.round(numeric)));
}

function normalizeStudyScopeMode(value) {
  const normalized = normalizeSingleLine(value || "", 32).toLowerCase();
  return normalized === "bookmarked" || normalized === "review" ? normalized : "all";
}

function normalizeTimelineBookmarkType(value) {
  const normalized = normalizeSingleLine(value || "", 32).toLowerCase();
  return normalized === "review" || normalized === "mistake" || normalized === "mastered" || normalized === "important"
    ? normalized
    : "";
}

function normalizeTimelineBookmarks(raw) {
  const result = {};
  if (!raw || typeof raw !== "object") return result;
  Object.entries(raw).forEach(([entryId, value]) => {
    const normalizedEntryId = normalizeSingleLine(entryId || "", 200);
    if (!normalizedEntryId || !value || typeof value !== "object") return;
    const type = normalizeTimelineBookmarkType(value.type);
    if (!type) return;
    result[normalizedEntryId] = {
      type,
      note: normalizeSingleLine(value.note || "", 240),
      createdAt: Number(value.createdAt) || 0,
      updatedAt: Number(value.updatedAt) || 0
    };
  });
  return result;
}

function normalizeSettings(raw) {
  return {
    welcomeCompleted: Boolean(raw?.welcomeCompleted),
    branchDragGuideDismissed: Boolean(raw?.branchDragGuideDismissed),
    locale: normalizeLocale(raw?.locale),
    theme: normalizeTheme(raw?.theme),
    timelineCollapsed: Boolean(raw?.timelineCollapsed),
    videoEmbedUrl: normalizeSingleLine(raw?.videoEmbedUrl || "", 1200),
    workspaceTreeStyle: normalizeWorkspaceTreeStyle(raw?.workspaceTreeStyle),
    workspaceUiDensity: normalizeWorkspaceUiDensity(raw?.workspaceUiDensity),
    studyScopeMode: normalizeStudyScopeMode(raw?.studyScopeMode),
    lowPowerMode: Boolean(raw?.lowPowerMode),
    backupReminderDismissed: Boolean(raw?.backupReminderDismissed)
  };
}

function normalizeHomeFolderName(name) {
  return normalizeSingleLine(name || "", MAX_FOLDER_NAME_LENGTH);
}

function normalizeHomeFolderId(value) {
  const raw = normalizeSingleLine(value || "", 64).toLowerCase();
  const sanitized = raw.replace(/[^a-z0-9_-]/g, "");
  return sanitized || createId("hfolder");
}

function normalizeHomeFolders(rawFolders) {
  const result = [{ id: HOME_DEFAULT_FOLDER_ID, name: "", parentId: "" }];
  const seen = new Set([HOME_DEFAULT_FOLDER_ID]);
  const blockedNames = new Set(["未分类", "uncategorized"]);
  if (!Array.isArray(rawFolders)) return result;

  const staged = [];
  rawFolders.forEach((item) => {
    const name = normalizeHomeFolderName(item?.name || "");
    if (!name) return;
    if (blockedNames.has(name.toLowerCase())) return;
    let id = normalizeHomeFolderId(item?.id || "");
    if (id === HOME_DEFAULT_FOLDER_ID) id = createId("hfolder");
    if (seen.has(id)) return;
    seen.add(id);
    staged.push({
      id,
      name,
      parentId: normalizeHomeFolderId(item?.parentId || "")
    });
  });
  const validIds = new Set([HOME_DEFAULT_FOLDER_ID, ...staged.map((item) => item.id)]);
  staged.forEach((item) => {
    const parentId =
      item.parentId && item.parentId !== item.id && validIds.has(item.parentId) ? item.parentId : HOME_DEFAULT_FOLDER_ID;
    result.push({ id: item.id, name: item.name, parentId });
  });
  return result;
}

function normalizeHomeCollapsedFolderIds(rawIds, folders = homeFolders) {
  if (!Array.isArray(rawIds)) return [];
  const validIds = new Set((folders || []).map((item) => item.id));
  return rawIds.filter((id, idx) => typeof id === "string" && validIds.has(id) && rawIds.indexOf(id) === idx);
}

function normalizeHomeConversationFolderMap(rawMap, folders = homeFolders) {
  const validIds = new Set((folders || []).map((item) => item.id));
  const result = {};
  if (!rawMap || typeof rawMap !== "object") return result;
  Object.entries(rawMap).forEach(([conversationId, folderId]) => {
    const normalizedConversationId = normalizeConversationId(conversationId);
    if (!normalizedConversationId) return;
    const normalizedFolderId = typeof folderId === "string" && validIds.has(folderId) ? folderId : HOME_DEFAULT_FOLDER_ID;
    result[normalizedConversationId] = normalizedFolderId;
  });
  return result;
}

function normalizeHomeAutoClassifyRules(rawRules) {
  const source = Array.isArray(rawRules) && rawRules.length ? rawRules : getDefaultHomeAutoClassifyRules();
  const normalized = [];
  const seen = new Set();
  source.forEach((rule) => {
    const folderName = normalizeHomeFolderName(rule?.folderName || "");
    if (!folderName) return;
    const keywords = Array.isArray(rule?.keywords)
      ? rule.keywords
          .map((item) => normalizeSingleLine(item || "", 48).toLowerCase())
          .filter(Boolean)
      : [];
    if (!keywords.length) return;
    const dedupKey = `${folderName.toLowerCase()}|${keywords.join("|")}`;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);
    normalized.push({ folderName, keywords: [...new Set(keywords)] });
  });
  return normalized.length ? normalized : getDefaultHomeAutoClassifyRules();
}

function serializeHomeAutoClassifyRules(rules = homeAutoClassifyRules) {
  return normalizeHomeAutoClassifyRules(rules)
    .map((rule) => `${rule.folderName}: ${rule.keywords.join(", ")}`)
    .join("\n");
}

function parseHomeAutoClassifyRulesText(rawText = "") {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return {
      rules: getDefaultHomeAutoClassifyRules(),
      invalidCount: 0
    };
  }
  const parsed = [];
  let invalidCount = 0;
  lines.forEach((line) => {
    const colonIndex = line.indexOf(":");
    const zhColonIndex = line.indexOf("：");
    const splitIndex =
      colonIndex < 0 ? zhColonIndex : zhColonIndex < 0 ? colonIndex : Math.min(colonIndex, zhColonIndex);
    if (splitIndex <= 0) {
      invalidCount += 1;
      return;
    }
    const folderName = normalizeHomeFolderName(line.slice(0, splitIndex));
    if (!folderName) {
      invalidCount += 1;
      return;
    }
    const keywordPart = line.slice(splitIndex + 1);
    const keywords = keywordPart
      .split(/[,\|，、；;]/)
      .map((item) => normalizeSingleLine(item || "", 48).toLowerCase())
      .filter(Boolean);
    if (!keywords.length) {
      invalidCount += 1;
      return;
    }
    parsed.push({ folderName, keywords });
  });
  return { rules: parsed.length ? normalizeHomeAutoClassifyRules(parsed) : [], invalidCount };
}

function buildHomeAutoClassifySourceText(item) {
  const text = `${item?.sidebarTitle || ""}\n${item?.latestQuestion || ""}\n${item?.latestSummary || ""}`;
  return safeText(text).toLowerCase();
}

function getMatchedHomeAutoCategoryName(item, rules = homeAutoClassifyRules) {
  const source = buildHomeAutoClassifySourceText(item);
  if (!source) return "";
  for (const rule of rules || []) {
    const folderName = normalizeHomeFolderName(rule?.folderName || "");
    if (!folderName) continue;
    const keywords = Array.isArray(rule?.keywords) ? rule.keywords : [];
    if (keywords.some((keyword) => keyword && source.includes(String(keyword).toLowerCase()))) {
      return folderName;
    }
  }
  return "";
}

function getHomeFolderDisplayName(folder) {
  if (!folder || folder.id === HOME_DEFAULT_FOLDER_ID) return t("home_uncategorized_title");
  return folder.name || t("home_uncategorized_title");
}

function getFolderTreeOrder(folders = [], rootId = DEFAULT_FOLDER_ID) {
  const childrenMap = new Map();
  (folders || []).forEach((folder) => {
    if (!folder?.id || folder.id === rootId) return;
    const parentId = folder.parentId || rootId;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId).push(folder);
  });
  childrenMap.forEach((list) => {
    list.sort((a, b) => (a.name || "").localeCompare(b.name || "", currentLocale === "en" ? "en" : "zh"));
  });
  const ordered = [];
  const walk = (parentId = rootId, depth = 0) => {
    const children = childrenMap.get(parentId) || [];
    children.forEach((child) => {
      ordered.push({ ...child, depth });
      walk(child.id, depth + 1);
    });
  };
  walk(rootId, 0);
  return ordered;
}

function buildSelectFolderLabel(name = "", depth = 0) {
  const prefix = depth > 0 ? `${"  ".repeat(Math.min(depth, 8))}└ ` : "";
  return `${prefix}${name}`;
}

function getTreeDepthClass(depth = 0) {
  const level = Number.isFinite(depth) ? Math.max(0, Math.floor(depth)) : 0;
  if (level <= 0) return "tree-depth-0";
  if (level === 1) return "tree-depth-1";
  if (level === 2) return "tree-depth-2";
  return "tree-depth-3plus";
}

function ensureHomeFolderId(folderId, folders = homeFolders) {
  const validIds = new Set((folders || []).map((item) => item.id));
  return validIds.has(folderId) ? folderId : HOME_DEFAULT_FOLDER_ID;
}

function showView(viewName) {
  currentView = viewName;
  if (welcomeViewEl) welcomeViewEl.hidden = viewName !== "welcome";
  if (homeViewEl) homeViewEl.hidden = viewName !== "home";
  if (workspaceViewEl) workspaceViewEl.hidden = viewName !== "workspace";
  if (viewName !== "home") {
    setHomeAutoClassifyOverlayVisible(false);
  }
  applyStudySplitLayout();
  syncVideoModulePlacement();
  if (viewName !== "workspace") {
    setDetailMode("branch");
  }
  syncWorkspaceFollowupFocusMode(true);
}

function setHomeStatus(message = "", isError = false) {
  if (!homeStatusEl) return;
  homeStatusEl.textContent = message;
  homeStatusEl.style.color = isError ? "#b42318" : "var(--muted)";
}

function updateHomeAutoClassifyOrderHint(invalidCount = 0) {
  if (!homeAutoClassifyOrderHintEl) return;
  homeAutoClassifyOrderHintEl.textContent =
    invalidCount > 0 ? t("home_auto_order_invalid", { count: invalidCount }) : t("home_auto_order_hint");
  homeAutoClassifyOrderHintEl.style.color = invalidCount > 0 ? "#b42318" : "";
}

function getHomeAutoClassifyRulesFromInput() {
  const parseResult = parseHomeAutoClassifyRulesText(homeAutoClassifyRulesInputEl?.value || "");
  const rules = Array.isArray(parseResult?.rules) ? parseResult.rules.slice() : [];
  return { parseResult, rules };
}

function applyHomeAutoClassifyRulesToInput(rules) {
  if (!homeAutoClassifyRulesInputEl) return;
  homeAutoClassifyRulesInputEl.value = serializeHomeAutoClassifyRules(rules || []);
}

function renderHomeAutoClassifyRuleList() {
  if (!homeAutoClassifyRuleListEl) return;
  const { parseResult, rules } = getHomeAutoClassifyRulesFromInput();
  homeAutoClassifyRuleListEl.innerHTML = "";
  if (!rules.length) {
    const emptyEl = document.createElement("li");
    emptyEl.className = "home-auto-classify-rule-empty";
    emptyEl.textContent = t("home_auto_no_rules");
    homeAutoClassifyRuleListEl.appendChild(emptyEl);
  }
  rules.forEach((rule, index) => {
    const itemEl = document.createElement("li");
    itemEl.className = "home-auto-classify-rule-item";
    itemEl.dataset.index = String(index);

    const indexEl = document.createElement("span");
    indexEl.className = "home-auto-classify-rule-item-index";
    indexEl.textContent = String(index + 1);

    const editorEl = document.createElement("div");
    editorEl.className = "home-auto-classify-rule-editor";

    const folderInputEl = document.createElement("input");
    folderInputEl.className = "inline-input home-auto-classify-rule-input";
    folderInputEl.value = rule.folderName || "";
    folderInputEl.placeholder = t("home_auto_rule_folder");
    folderInputEl.dataset.action = "edit-folder";
    folderInputEl.dataset.index = String(index);

    const keywordsInputEl = document.createElement("input");
    keywordsInputEl.className = "inline-input home-auto-classify-rule-input";
    keywordsInputEl.value = Array.isArray(rule.keywords) ? rule.keywords.join(", ") : "";
    keywordsInputEl.placeholder = t("home_auto_rule_keywords");
    keywordsInputEl.dataset.action = "edit-keywords";
    keywordsInputEl.dataset.index = String(index);
    editorEl.append(folderInputEl, keywordsInputEl);

    const actionsEl = document.createElement("div");
    actionsEl.className = "home-auto-classify-rule-actions";
    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "ghost-btn ghost-btn-small";
    upBtn.textContent = t("home_auto_rule_up");
    upBtn.dataset.action = "move-up";
    upBtn.dataset.index = String(index);
    upBtn.disabled = index === 0;
    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "ghost-btn ghost-btn-small";
    downBtn.textContent = t("home_auto_rule_down");
    downBtn.dataset.action = "move-down";
    downBtn.dataset.index = String(index);
    downBtn.disabled = index === rules.length - 1;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "ghost-btn ghost-btn-small danger";
    removeBtn.textContent = t("home_auto_rule_delete");
    removeBtn.dataset.action = "delete";
    removeBtn.dataset.index = String(index);
    actionsEl.append(upBtn, downBtn, removeBtn);

    itemEl.append(indexEl, editorEl, actionsEl);
    homeAutoClassifyRuleListEl.appendChild(itemEl);
  });
  updateHomeAutoClassifyOrderHint(parseResult.invalidCount || 0);
}

function scheduleHomeAutoClassifyRuleListRender() {
  if (homeAutoClassifyRulePreviewTimer) clearTimeout(homeAutoClassifyRulePreviewTimer);
  homeAutoClassifyRulePreviewTimer = setTimeout(() => {
    homeAutoClassifyRulePreviewTimer = null;
    renderHomeAutoClassifyRuleList();
  }, 120);
}

function reorderHomeAutoClassifyRulesByIndex(fromIndex, toIndex) {
  const { rules } = getHomeAutoClassifyRulesFromInput();
  if (!rules.length) return;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= rules.length || toIndex >= rules.length) return;
  const [moved] = rules.splice(fromIndex, 1);
  rules.splice(toIndex, 0, moved);
  applyHomeAutoClassifyRulesToInput(rules);
  setHomeStatus(t("home_auto_pending_save"));
  renderHomeAutoClassifyRuleList();
}

function updateHomeAutoClassifyRule(index, field, value) {
  const { rules } = getHomeAutoClassifyRulesFromInput();
  if (index < 0 || index >= rules.length) return;
  if (field === "folder") {
    rules[index] = { ...rules[index], folderName: String(value || "").trim() };
  } else {
    const keywords = String(value || "")
      .split(/[,，]/)
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    rules[index] = { ...rules[index], keywords };
  }
  applyHomeAutoClassifyRulesToInput(rules);
}

function removeHomeAutoClassifyRule(index) {
  const { rules } = getHomeAutoClassifyRulesFromInput();
  if (index < 0 || index >= rules.length) return;
  rules.splice(index, 1);
  applyHomeAutoClassifyRulesToInput(rules);
  setHomeStatus(t("home_auto_pending_save"));
  renderHomeAutoClassifyRuleList();
}

function addHomeAutoClassifyRuleFromInputs() {
  const folderName = String(homeAutoClassifyFolderInputEl?.value || "").trim();
  const keywords = String(homeAutoClassifyKeywordsInputEl?.value || "")
    .split(/[,，]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  if (!folderName || !keywords.length) {
    setHomeStatus(t("home_auto_add_missing"), true);
    return;
  }
  const { rules } = getHomeAutoClassifyRulesFromInput();
  rules.push({ folderName, keywords });
  applyHomeAutoClassifyRulesToInput(rules);
  if (homeAutoClassifyFolderInputEl) homeAutoClassifyFolderInputEl.value = "";
  if (homeAutoClassifyKeywordsInputEl) homeAutoClassifyKeywordsInputEl.value = "";
  setHomeStatus(t("home_auto_pending_save"));
  renderHomeAutoClassifyRuleList();
}

function renderHomeAutoClassifySettingsUi() {
  if (homeAutoClassifyEnabledEl) {
    homeAutoClassifyEnabledEl.checked = homeAutoClassifyEnabled !== false;
  }
  if (homeAutoClassifyRulesInputEl && document.activeElement !== homeAutoClassifyRulesInputEl) {
    homeAutoClassifyRulesInputEl.value = serializeHomeAutoClassifyRules(homeAutoClassifyRules);
  }
  renderHomeAutoClassifyRuleList();
}

function setHomeAutoClassifyOverlayVisible(visible) {
  if (!homeAutoClassifyOverlayEl) return;
  homeAutoClassifyOverlayEl.hidden = !visible;
  if (visible) {
    renderHomeAutoClassifySettingsUi();
    if (homeAutoClassifyFolderInputEl) homeAutoClassifyFolderInputEl.focus();
  }
}

async function saveHomeAutoClassifySettings(options = {}) {
  const resetDefaults = options.resetDefaults === true;
  const skipRulesParsing = options.skipRulesParsing === true;
  const previousEnabled = homeAutoClassifyEnabled !== false;
  const previousRulesSignature = serializeHomeAutoClassifyRules(homeAutoClassifyRules);
  const enabled = homeAutoClassifyEnabledEl ? homeAutoClassifyEnabledEl.checked : homeAutoClassifyEnabled;
  let nextRules = getDefaultHomeAutoClassifyRules();
  if (!resetDefaults) {
    if (skipRulesParsing) {
      nextRules = normalizeHomeAutoClassifyRules(homeAutoClassifyRules);
    } else {
      const parseResult = parseHomeAutoClassifyRulesText(homeAutoClassifyRulesInputEl?.value || "");
      if (parseResult.invalidCount > 0) {
        renderHomeAutoClassifyRuleList();
        setHomeStatus(t("home_auto_rules_invalid"), true);
        return;
      }
      nextRules = parseResult.rules;
    }
  }
  const nextRulesSignature = serializeHomeAutoClassifyRules(nextRules);
  if (previousEnabled !== enabled || previousRulesSignature !== nextRulesSignature) {
    homeAutoClassifyFingerprintCache.clear();
  }
  await persistHomeState({
    autoClassifyEnabled: enabled,
    autoClassifyRules: nextRules
  });
  renderHomeAutoClassifySettingsUi();
  const autoResult = await autoClassifyHomeConversations(homeConversations);
  if (autoResult.moved || autoResult.createdFolders) {
    renderHomeConversationList();
  }
  if (resetDefaults) {
    setHomeStatus(t("home_auto_reset_done"));
    return;
  }
  setHomeStatus(
    t("home_auto_saved", {
      moved: autoResult.moved || 0,
      folders: autoResult.createdFolders || 0
    })
  );
}

function getConversationDisplayTitle(item) {
  const customTitle = pickConversationTitle(item?.customTitle || "");
  if (customTitle) return customTitle;
  const importedTitle = pickConversationTitle(item?.sidebarTitle || "", item?.title || "");
  if (importedTitle) return importedTitle;
  const fallback = summarize(item?.latestQuestion || item?.latestSummary || "");
  if (fallback && fallback !== t("no_content")) return fallback;
  const id = (item?.conversationId || "").replace("https://gemini.google.com", "");
  return /^\/(?:u\/\d+\/)?app(?:\/|$)/i.test(id) ? t("workspace_default_title") : (id || t("workspace_default_title"));
}

function getConversationStudyStatsFromEntries(entries = [], timelineBookmarks = {}, now = Date.now()) {
  const list = Array.isArray(entries) ? entries.map(normalizeEntry).filter(isRenderableEntry) : [];
  const bookmarks = normalizeTimelineBookmarks(timelineBookmarks || {});
  let pendingCount = 0;
  let dueCount = 0;
  let reviewDueCount = 0;
  let reviewedCount = 0;
  let noteCount = 0;

  list.forEach((entry) => {
    const reviewedAt = Number(entry?.reviewedAt || 0);
    const reviewCount = Math.max(0, Number(entry?.reviewCount || 0));
    const bookmark = bookmarks[entry?.id || ""] || null;
    const bookmarkAt = Number(bookmark?.updatedAt || bookmark?.createdAt || 0);
    const forcedReview = bookmark?.type === "review" && (!reviewedAt || reviewedAt < bookmarkAt);
    const nextDueAt = reviewedAt ? reviewedAt + getReviewIntervalMs({ ...entry, reviewCount }) : 0;

    if (!reviewedAt) pendingCount += 1;
    if (reviewedAt) reviewedCount += 1;
    if (forcedReview || !reviewedAt || (nextDueAt && nextDueAt <= now)) dueCount += 1;
    if (forcedReview || (reviewedAt && nextDueAt && nextDueAt <= now)) reviewDueCount += 1;
    if (normalizeStudyNote(entry?.studyNote || "") || entry?.studyNoteImage) noteCount += 1;
  });

  return {
    entryCount: list.length,
    pendingCount,
    dueCount,
    reviewDueCount,
    reviewedCount,
    noteCount
  };
}

function getEmptyConversationStudyStats() {
  return {
    entryCount: 0,
    pendingCount: 0,
    dueCount: 0,
    reviewDueCount: 0,
    reviewedCount: 0,
    noteCount: 0
  };
}

function normalizeConversationStudyStats(rawStats) {
  const source = rawStats && typeof rawStats === "object" ? rawStats : {};
  return {
    entryCount: Math.max(0, Number(source.entryCount || 0)),
    pendingCount: Math.max(0, Number(source.pendingCount || 0)),
    dueCount: Math.max(0, Number(source.dueCount || 0)),
    reviewDueCount: Math.max(0, Number(source.reviewDueCount || source.reviewCountDue || 0)),
    reviewedCount: Math.max(0, Number(source.reviewedCount || 0)),
    noteCount: Math.max(0, Number(source.noteCount || 0))
  };
}

function mergeConversationStudyStats(...statsList) {
  return statsList.map(normalizeConversationStudyStats).reduce((best, stats) => {
    if (stats.entryCount > best.entryCount) return stats;
    if (stats.entryCount === best.entryCount && (stats.dueCount + stats.pendingCount) > (best.dueCount + best.pendingCount)) {
      return stats;
    }
    return best;
  }, getEmptyConversationStudyStats());
}

function pruneConversationSnapshotCache() {
  if (conversationSnapshotCache.size <= CONVERSATION_CACHE_MAX_SIZE) return;
  const entries = [...conversationSnapshotCache.entries()].sort(
    (a, b) => (a[1]?.cachedAt || 0) - (b[1]?.cachedAt || 0)
  );
  const removeCount = Math.max(0, conversationSnapshotCache.size - CONVERSATION_CACHE_MAX_SIZE);
  for (let i = 0; i < removeCount; i += 1) {
    const key = entries[i]?.[0];
    if (key) conversationSnapshotCache.delete(key);
  }
}

function mergeConversationSnapshotEntries(...groups) {
  return dedupeEntries(
    groups
      .flatMap((group) => (Array.isArray(group) ? group : []))
      .map((entry) => normalizeEntry(entry))
  );
}

function mergeConversationSnapshotData(conversationId, baseSnapshot, incomingSnapshot) {
  const normalizedConversationId = normalizeConversationId(conversationId);
  const base = baseSnapshot && typeof baseSnapshot === "object" ? baseSnapshot : {};
  const incoming = incomingSnapshot && typeof incomingSnapshot === "object" ? incomingSnapshot : {};
  const folders = normalizeFolders(
    (Array.isArray(incoming.folders) && incoming.folders.length ? incoming.folders : base.folders) || []
  );
  const mergedEntries = mergeConversationSnapshotEntries(base.entries, incoming.entries).map((entry) => ({
    ...entry,
    folderId: ensureValidFolderId(entry.folderId, folders)
  }));
  return {
    sessionUrl: incoming.sessionUrl || base.sessionUrl || normalizedConversationId,
    conversationTitle: pickConversationTitle(incoming.conversationTitle || "", base.conversationTitle || ""),
    mainNote: normalizeStudyNote(incoming.mainNote || base.mainNote || ""),
    mainNoteImage: incoming.mainNoteImage || base.mainNoteImage || "",
    timelineBookmarks: normalizeTimelineBookmarks({
      ...(base.timelineBookmarks || {}),
      ...(incoming.timelineBookmarks || {})
    }),
    branchNodeNotes: normalizeBranchNodeNotes({
      ...(base.branchNodeNotes || {}),
      ...(incoming.branchNodeNotes || {})
    }),
    folders,
    collapsedFolderIds: normalizeCollapsedFolderIds(
      (Array.isArray(incoming.collapsedFolderIds) && incoming.collapsedFolderIds.length
        ? incoming.collapsedFolderIds
        : base.collapsedFolderIds) || [],
      folders
    ),
    manualBranchClassifiedEntryKeys: normalizeManualBranchClassifiedEntryKeys(
      (Array.isArray(incoming.manualBranchClassifiedEntryKeys) && incoming.manualBranchClassifiedEntryKeys.length
        ? incoming.manualBranchClassifiedEntryKeys
        : base.manualBranchClassifiedEntryKeys) || []
    ),
    manualBranchClassifiedEntryOwners: normalizeManualBranchClassifiedEntryOwners({
      ...(base.manualBranchClassifiedEntryOwners || {}),
      ...(incoming.manualBranchClassifiedEntryOwners || {})
    }),
    entries: mergedEntries
  };
}

function setConversationSnapshotCache(conversationId, snapshot) {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!isConcreteConversationId(normalizedConversationId) || !snapshot) return;
  const prevSnapshot = conversationSnapshotCache.get(normalizedConversationId)?.snapshot || null;
  const mergedSnapshot = mergeConversationSnapshotData(normalizedConversationId, prevSnapshot, snapshot);
  conversationSnapshotCache.set(normalizedConversationId, {
    cachedAt: Date.now(),
    snapshot: mergedSnapshot
  });
  pruneConversationSnapshotCache();
}

function getConversationSnapshotFromCache(conversationId) {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!isConcreteConversationId(normalizedConversationId)) return null;
  const hit = conversationSnapshotCache.get(normalizedConversationId);
  if (!hit) return null;
  if (Date.now() - (hit.cachedAt || 0) > CONVERSATION_CACHE_TTL_MS) {
    conversationSnapshotCache.delete(normalizedConversationId);
    return null;
  }
  return hit.snapshot || null;
}

function buildConversationSnapshotFromSession(conversationId, session, options = {}) {
  const normalizedConversationId = normalizeConversationId(conversationId);
  const fallbackTitle = normalizeConversationTitle(options?.fallbackTitle || "");
  const sidebarTitle = normalizeConversationTitle(options?.sidebarTitle || "");
  const sourceSession = session && typeof session === "object" ? session : {};
  const folders = normalizeFolders(sourceSession.folders || []);
  const collapsedFolderIds = normalizeCollapsedFolderIds(sourceSession.collapsedFolderIds || [], folders);
  const entries = dedupeEntries(getEntriesFromSession(sourceSession).map(normalizeEntry)).map((entry) => ({
    ...entry,
    folderId: ensureValidFolderId(entry.folderId, folders)
  }));
  return {
    sessionUrl: sourceSession.url || normalizedConversationId,
    conversationTitle: pickConversationTitle(sourceSession.customTitle || "", fallbackTitle, sidebarTitle),
    mainNote: normalizeStudyNote(sourceSession.mainNote || ""),
    mainNoteImage: sourceSession.mainNoteImage || "",
    timelineBookmarks: normalizeTimelineBookmarks(sourceSession.timelineBookmarks || {}),
    branchNodeNotes: normalizeBranchNodeNotes(sourceSession.branchNodeNotes || {}),
    folders,
    collapsedFolderIds,
    manualBranchClassifiedEntryKeys: normalizeManualBranchClassifiedEntryKeys(
      sourceSession.manualBranchClassifiedEntryKeys || []
    ),
    manualBranchClassifiedEntryOwners: normalizeManualBranchClassifiedEntryOwners(
      sourceSession.manualBranchClassifiedEntryOwners || {}
    ),
    entries
  };
}

function preloadRecentConversationSnapshots(allStorage, conversations) {
  const items = Array.isArray(conversations) ? conversations.slice(0, CONVERSATION_PRELOAD_LIMIT) : [];
  if (!items.length) return;
  const homeIndexKey = getHomeIndexStorageKey(currentAccountScope);
  const homeIndex = normalizeHomeCatalogIndex(allStorage?.[homeIndexKey]);

  items.forEach((item) => {
    const conversationId = normalizeConversationId(item?.conversationId || item?.url || "");
    if (!isConcreteConversationId(conversationId)) return;
    if (conversationId === currentConversationId) return;
    if (getConversationSnapshotFromCache(conversationId)) return;
    const storageKey = toStorageKey(conversationId);
    const session = allStorage?.[storageKey] || {};
    const sidebarTitle = normalizeConversationTitle(homeIndex?.[conversationId]?.sidebarTitle || item?.sidebarTitle || "");
    const fallbackTitle = normalizeConversationTitle(item?.customTitle || getConversationDisplayTitle(item));
    const snapshot = buildConversationSnapshotFromSession(conversationId, session, {
      fallbackTitle,
      sidebarTitle
    });
    setConversationSnapshotCache(conversationId, snapshot);
  });
}

async function applyConversationSnapshot(conversationId, snapshot, options = {}) {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!isConcreteConversationId(normalizedConversationId) || !snapshot) return;
  const mergedSnapshot = mergeConversationSnapshotData(
    normalizedConversationId,
    normalizedConversationId === currentConversationId
      ? {
          sessionUrl: currentSessionUrl,
          conversationTitle: currentConversationTitle,
          mainNote: currentMainNote,
          mainNoteImage: currentMainNoteImage,
          branchNodeNotes: currentBranchNodeNotes,
          folders: currentFolders,
          collapsedFolderIds: Array.from(collapsedFolderIds),
          manualBranchClassifiedEntryKeys: Array.from(manualBranchClassifiedEntryKeys),
          manualBranchClassifiedEntryOwners,
          entries: getPersistableEntries(currentEntries)
        }
      : conversationSnapshotCache.get(normalizedConversationId)?.snapshot || null,
    snapshot
  );

  currentSessionUrl = mergedSnapshot.sessionUrl || normalizedConversationId;
  currentConversationTitle = normalizeConversationTitle(mergedSnapshot.conversationTitle || "");
  currentMainNote = normalizeStudyNote(mergedSnapshot.mainNote || "");
  currentMainNoteImage = mergedSnapshot.mainNoteImage || "";
  currentBranchNodeNotes = normalizeBranchNodeNotes(mergedSnapshot.branchNodeNotes || {});
  currentFolders = normalizeFolders(mergedSnapshot.folders || []);
  collapsedFolderIds = new Set(
    normalizeCollapsedFolderIds(mergedSnapshot.collapsedFolderIds || [], currentFolders)
  );
  manualBranchClassifiedEntryKeys = new Set(
    normalizeManualBranchClassifiedEntryKeys(mergedSnapshot.manualBranchClassifiedEntryKeys || [])
  );
  manualBranchClassifiedEntryOwners = normalizeManualBranchClassifiedEntryOwners(
    mergedSnapshot.manualBranchClassifiedEntryOwners || {}
  );
  currentEntries = assignRuntimeEntryKeys((mergedSnapshot.entries || []).map(normalizeEntry));
  setConversationSnapshotCache(normalizedConversationId, mergedSnapshot);

  const availableKeys = new Set(currentEntries.map((entry) => entry._runtimeKey));
  manualBranchClassifiedEntryKeys = new Set(
    [...manualBranchClassifiedEntryKeys].filter((entryKey) => {
      if (String(entryKey).startsWith("tok:")) return true;
      return availableKeys.has(entryKey);
    })
  );
  if (!selectedEntryKey || !availableKeys.has(selectedEntryKey)) {
    const ownerEntryKey = getManualBranchOwnerEntryKey(selectedEntryKey);
    if (ownerEntryKey && availableKeys.has(ownerEntryKey)) {
      selectedEntryKey = ownerEntryKey;
    } else {
      selectedEntryKey = currentEntries.length ? currentEntries[currentEntries.length - 1]._runtimeKey : "";
    }
  }
  selectedContextEntryKeys = new Set([...selectedContextEntryKeys].filter((entryKey) => availableKeys.has(entryKey)));
  if (!selectedContextEntryKeys.size && selectedEntryKey) {
    selectedContextEntryKeys.add(selectedEntryKey);
  }

  renderSessionMeta();
  renderTimeline();
  renderBulkMoveFolderOptions();
  renderNodeParentFolderOptions(DEFAULT_FOLDER_ID);

  if (selectedEntryKey) {
    scheduleBranchThreadLoad(selectedEntryKey);
  }

  const syncBranchIndex = async () => {
    const allStorage = await storageGet(null);
    if (normalizedConversationId !== currentConversationId) return;
    currentConversationBranchIndexMessages = FORCE_BRANCH_INDEX_AGGREGATE_MODE
      ? buildConversationBranchIndexMessagesFromStore(allStorage, normalizedConversationId)
      : [];
    rebuildEntryKeysWithBranchQuestionsFromStore(allStorage);
    timelineRenderSignature = "";
    learningCategoryRenderSignature = "";
    mainLearningMapRenderSignature = "";
    scheduleTimelineRender();
    renderMainLearningMap();
    if (selectedEntryKey) scheduleBranchThreadLoad(selectedEntryKey);
  };

  if (options?.deferBranchIndex) {
    syncBranchIndex().catch((error) => {
      console.error("deferred branch index sync failed", error);
    });
    return;
  }

  await syncBranchIndex();
}

function isConcreteConversationId(conversationId) {
  return /\/app\/[^/?#]+$/i.test(conversationId || "");
}

function normalizeHomeCatalogIndex(raw, scope = normalizeAccountScope(currentAccountScope)) {
  const result = {};
  const scopeFilter = scope === null ? "" : normalizeAccountScope(scope || currentAccountScope);
  if (!raw || typeof raw !== "object") return result;

  Object.entries(raw).forEach(([key, value]) => {
    const conversationId = normalizeConversationId(value?.conversationId || value?.url || key || "");
    if (!conversationId || !isConcreteConversationId(conversationId)) return;
    if (scopeFilter && getAccountScopeFromConversationId(conversationId) !== scopeFilter) return;
    result[conversationId] = {
      conversationId,
      url: conversationId,
      sidebarTitle: normalizeConversationTitle(value?.sidebarTitle || value?.title || ""),
      updatedAt: Number.isFinite(Number(value?.updatedAt)) ? Number(value.updatedAt) : 0
    };
  });

  return result;
}

function extractConversationCatalog(allStorage, scope = normalizeAccountScope(currentAccountScope)) {
  const map = new Map();
  const scopeFilter = scope === null ? "" : normalizeAccountScope(scope || currentAccountScope);
  Object.entries(allStorage || {}).forEach(([key, value]) => {
    if (!key.startsWith(STORAGE_PREFIX)) return;
    const keyConversationId = key.slice(STORAGE_PREFIX.length);
    const conversationId = normalizeConversationId(value?.conversationId || keyConversationId);
    if (!conversationId) return;
    if (!isConcreteConversationId(conversationId)) return;
    if (scopeFilter && getAccountScopeFromConversationId(conversationId) !== scopeFilter) return;

    const entries = getEntriesFromSession(value).map(normalizeEntry);
    const latestEntry = entries.length ? entries[entries.length - 1] : null;
    const updatedAt = value?.updatedAt || latestEntry?.timestamp || 0;
    const title = normalizeConversationTitle(value?.customTitle || "");
    const studyStats = getConversationStudyStatsFromEntries(entries, value?.timelineBookmarks || {});

    const snapshot = {
      conversationId,
      customTitle: title,
      updatedAt,
      entryCount: entries.length,
      studyStats,
      latestSummary: latestEntry?.summary || "",
      latestQuestion: latestEntry?.question || "",
      url: conversationId
    };

    const old = map.get(conversationId);
    if (!old || snapshot.updatedAt >= old.updatedAt) {
      map.set(conversationId, snapshot);
    }
  });

  return [...map.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function collectHomeCatalogIndexAcrossScopes(allStorage) {
  const merged = {};
  const ingest = (raw) => {
    Object.values(normalizeHomeCatalogIndex(raw, null)).forEach((item) => {
      const conversationId = item.conversationId;
      if (!conversationId) return;
      const old = merged[conversationId];
      if (!old || (item.updatedAt || 0) >= (old.updatedAt || 0)) {
        merged[conversationId] = item;
      }
    });
  };

  ingest(allStorage?.[HOME_INDEX_KEY]);
  Object.entries(allStorage || {}).forEach(([key, value]) => {
    if (!key.startsWith(`${HOME_INDEX_KEY}:`)) return;
    ingest(value);
  });
  return merged;
}

function normalizeSidebarCatalogItems(items) {
  const result = [];
  const seen = new Set();
  const baseTime = Date.now();
  const currentScope = normalizeAccountScope(currentAccountScope);

  (Array.isArray(items) ? items : []).forEach((item, idx) => {
    const conversationId = normalizeConversationId(item?.conversationId || item?.url || "");
    if (!conversationId || !isConcreteConversationId(conversationId) || seen.has(conversationId)) return;
    if (getAccountScopeFromConversationId(conversationId) !== currentScope) return;
    seen.add(conversationId);
    result.push({
      conversationId,
      url: conversationId,
      sidebarTitle: normalizeConversationTitle(item?.title || item?.sidebarTitle || ""),
      updatedAt: baseTime - idx
    });
  });

  return result;
}

function mergeHomeCatalogIndex(existingIndex, sidebarItems) {
  const index = normalizeHomeCatalogIndex(existingIndex);
  let added = 0;
  let updated = 0;

  sidebarItems.forEach((item) => {
    const old = index[item.conversationId];
    const next = {
      conversationId: item.conversationId,
      url: item.conversationId,
      sidebarTitle: item.sidebarTitle || old?.sidebarTitle || "",
      updatedAt: Math.max(item.updatedAt || 0, old?.updatedAt || 0)
    };

    if (!old) {
      index[item.conversationId] = next;
      added += 1;
      return;
    }

    if (next.url !== old.url || next.sidebarTitle !== old.sidebarTitle || next.updatedAt !== old.updatedAt) {
      index[item.conversationId] = next;
      updated += 1;
    }
  });

  return { index, added, updated };
}

function mergeConversationCatalog(localCatalog, importedIndex) {
  const map = new Map();
  (Array.isArray(localCatalog) ? localCatalog : []).forEach((item) => {
    map.set(item.conversationId, {
      ...item,
      sidebarTitle: normalizeConversationTitle(item?.sidebarTitle || "")
    });
  });

  Object.values(normalizeHomeCatalogIndex(importedIndex)).forEach((item) => {
    const old = map.get(item.conversationId);
    if (!old) {
      map.set(item.conversationId, {
        conversationId: item.conversationId,
        customTitle: "",
        sidebarTitle: item.sidebarTitle || "",
        updatedAt: item.updatedAt || 0,
        entryCount: 0,
        studyStats: getEmptyConversationStudyStats(),
        latestSummary: "",
        latestQuestion: "",
        url: item.conversationId
      });
      return;
    }

    map.set(item.conversationId, {
      ...old,
      sidebarTitle: old.sidebarTitle || item.sidebarTitle || "",
      url: item.conversationId,
      updatedAt: Math.max(old.updatedAt || 0, item.updatedAt || 0),
      studyStats: normalizeConversationStudyStats(old.studyStats)
    });
  });

  return [...map.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function buildHomeConversationsFromNative(sidebarItems, localCatalog) {
  const localMap = new Map(
    (Array.isArray(localCatalog) ? localCatalog : []).map((item) => [item.conversationId, item])
  );

  return (Array.isArray(sidebarItems) ? sidebarItems : [])
    .map((item) => {
      const local = localMap.get(item.conversationId) || {};
      return {
        conversationId: item.conversationId,
        customTitle: normalizeConversationTitle(local.customTitle || ""),
        sidebarTitle: normalizeConversationTitle(item.sidebarTitle || local.sidebarTitle || ""),
        updatedAt: Math.max(item.updatedAt || 0, local.updatedAt || 0),
        entryCount: Number.isFinite(Number(local.entryCount)) ? Number(local.entryCount) : 0,
        studyStats: normalizeConversationStudyStats(local.studyStats),
        latestSummary: local.latestSummary || "",
        latestQuestion: local.latestQuestion || "",
        url: item.conversationId
      };
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function renderStudyActionButtons() {
  if (!studyActionsBarEl) return;
  studyActionsBarEl.querySelectorAll(".study-action-btn").forEach((btn) => {
    const action = (btn.dataset.action || "").trim();
    if (!action) return;
    btn.textContent = getStudyActionLabel(action);
  });
}

function renderNoteQuickFollowups() {
  if (noteQuickFollowupsTitleEl instanceof HTMLElement) {
    noteQuickFollowupsTitleEl.textContent = currentLocale === "en" ? "Quick follow-up" : "\u5feb\u6377\u8ffd\u95ee";
  }
  if (!(noteQuickFollowupsEl instanceof HTMLElement)) return;
  noteQuickFollowupsEl.querySelectorAll(".note-quick-followup-btn").forEach((btn) => {
    const action = String(btn.dataset.action || "").trim();
    if (!action) return;
    btn.textContent = getStudyActionLabel(action);
  });
}

function getReviewSprintTitleText() {
  return currentLocale === "en" ? "Review Sprint" : "回看冲刺";
}

function getReviewSprintStartLabel(active = reviewSprintActive) {
  if (currentLocale === "en") return active ? "Stop Sprint" : "Start Sprint";
  return active ? "结束过卡" : "开始过卡";
}

function getReviewSprintNextLabel() {
  return currentLocale === "en" ? "Next Card" : "下一张";
}

function getReviewSprintMarkNextLabel() {
  return currentLocale === "en" ? "Mastered + Next" : "掌握并下一张";
}

function getReviewSprintEmptyText() {
  return currentLocale === "en" ? "No due cards in the review queue." : "回看队列里暂时没有可处理的节点。";
}

function getReviewSprintStatusText(completed, remaining, active = reviewSprintActive) {
  if (!active) {
    return currentLocale === "en" ? "Start a focused pass through due review nodes." : "开始一次专注的回看冲刺。";
  }
  if (!remaining) {
    return currentLocale === "en" ? `Sprint complete. Reviewed ${completed} cards.` : `本轮过卡完成，已处理 ${completed} 张。`;
  }
  return currentLocale === "en"
    ? `In sprint: reviewed ${completed} · remaining ${remaining}`
    : `正在过卡：已完成 ${completed} 张 · 剩余 ${remaining} 张`;
}

function getMistakeNotebookTitleText() {
  return currentLocale === "en" ? "Mistake Notebook" : "专项错题本";
}

function getMistakeNotebookHintText() {
  return currentLocale === "en"
    ? "Only nodes tagged as Mistake are collected here."
    : "这里只收录标记为“易错”的节点。";
}

function getMistakeNotebookEmptyText() {
  return currentLocale === "en" ? "No mistake bookmarks yet." : "还没有易错书签";
}

function getMistakeNotebookMetaText(count) {
  return currentLocale === "en" ? `${count} items` : `${count} 条`;
}

function getMistakeNotebookStatusText(count) {
  if (!count) return getMistakeNotebookHintText();
  return currentLocale === "en"
    ? `Review these high-risk nodes first when drilling.`
    : "建议优先回看这些高风险节点，再做自测。";
}

function getStudyPocketDueText(entry) {
  if (getEntryForcedReviewAt(entry) || isEntryDueForStudy(entry)) {
    return t("study_due_tag");
  }
  const dueAt = getReviewDueAt(entry);
  if (!dueAt) return "";
  return currentLocale === "en" ? `Next ${formatTime(dueAt)}` : `下次 ${formatTime(dueAt)}`;
}

function renderStudyScopeButtons() {
  if (!studyScopeBarEl) return;
  studyScopeBarEl.querySelectorAll(".study-scope-btn").forEach((btn) => {
    const scope = normalizeStudyScopeMode(btn.dataset.studyScope || "");
    btn.textContent = t(`study_scope_${scope}`);
    btn.classList.toggle("active", scope === studyScopeMode);
    btn.setAttribute("aria-pressed", scope === studyScopeMode ? "true" : "false");
  });
}

function renderTimelineFilterButtons() {
  if (!timelineFilterBarEl) return;
  timelineFilterBarEl.querySelectorAll(".timeline-filter-btn").forEach((btn) => {
    const filter = (btn.dataset.filter || "").trim();
    if (!filter) return;
    btn.textContent = t(`timeline_filter_${filter}`);
    btn.classList.toggle("active", filter === timelineFilterMode);
  });
  renderTimelineSortToggleButton();
  renderTimelineFolderFilterButtons();
}

function setStudyScopeMode(mode, persist = true) {
  const nextMode = normalizeStudyScopeMode(mode);
  if (nextMode === studyScopeMode) return;
  studyScopeMode = nextMode;
  settingsState.studyScopeMode = nextMode;
  renderStudyScopeButtons();
  updateStudyProgressHint();
  if (branchToolsOpen) renderReviewSprintPanel();
  if (persist) {
    persistSettingsState().catch((error) => {
      console.error("persist studyScopeMode failed", error);
    });
  }
}

function getStudyScopeLabel(mode = studyScopeMode) {
  return t(`study_scope_${normalizeStudyScopeMode(mode)}`);
}

function getEntryTimelineBookmark(entryOrKey) {
  const entry =
    typeof entryOrKey === "string"
      ? getEntryByRuntimeKey(entryOrKey)
      : entryOrKey && typeof entryOrKey === "object"
        ? entryOrKey
        : null;
  const entryId = normalizeSingleLine(entry?.id || "", 200);
  if (!entryId) return null;
  const bookmark = currentTimelineBookmarks?.[entryId];
  if (!bookmark) return null;
  const type = normalizeTimelineBookmarkType(bookmark.type);
  if (!type) return null;
  return {
    type,
    note: normalizeSingleLine(bookmark.note || "", 240),
    createdAt: Number(bookmark.createdAt) || 0,
    updatedAt: Number(bookmark.updatedAt) || 0
  };
}

function hasEntryTimelineBookmark(entry, expectedType = "") {
  const bookmark = getEntryTimelineBookmark(entry);
  if (!bookmark) return false;
  if (!expectedType) return true;
  return bookmark.type === normalizeTimelineBookmarkType(expectedType);
}

function getEntryTimelineBookmarkTypeLabel(entry) {
  const bookmark = getEntryTimelineBookmark(entry);
  if (!bookmark) return "";
  return t(`study_bookmark_${bookmark.type}`);
}

function getEntryForcedReviewAt(entry) {
  const bookmark = getEntryTimelineBookmark(entry);
  if (!bookmark || bookmark.type !== "review") return 0;
  const reviewedAt = Number(entry?.reviewedAt || 0);
  const bookmarkAt = Number(bookmark.updatedAt || bookmark.createdAt || 0);
  if (!bookmarkAt) return reviewedAt ? 0 : Date.now();
  return reviewedAt >= bookmarkAt ? 0 : bookmarkAt;
}

function isEntryDueForStudy(entry, now = Date.now()) {
  const dueAt = getReviewDueAt(entry);
  return !dueAt || dueAt <= now;
}

function isEntryInStudyScope(entry, scopeMode = studyScopeMode, now = Date.now()) {
  const normalizedScope = normalizeStudyScopeMode(scopeMode);
  if (normalizedScope === "bookmarked") return hasEntryTimelineBookmark(entry);
  if (normalizedScope === "review") {
    return Boolean(getEntryForcedReviewAt(entry)) || isEntryDueForStudy(entry, now);
  }
  return true;
}

function getOrderedReviewEntries(scopeMode = studyScopeMode, options = {}) {
  const now = Number(options?.now) || Date.now();
  return getStudyCandidateEntries({ scopeMode, now })
    .map((entry) => {
      const hasNote = Boolean(normalizeStudyNote(entry.studyNote || ""));
      const bookmark = getEntryTimelineBookmark(entry);
      const dueAt = getReviewDueAt(entry);
      const overdueMs = dueAt ? now - dueAt : Number.MAX_SAFE_INTEGER;
      return { entry, hasNote, bookmarkType: bookmark?.type || "", dueAt, overdueMs };
    })
    .sort((a, b) => {
      const aPinnedReview = a.bookmarkType === "review";
      const bPinnedReview = b.bookmarkType === "review";
      if (aPinnedReview !== bPinnedReview) return aPinnedReview ? -1 : 1;
      if (a.hasNote !== b.hasNote) return a.hasNote ? -1 : 1;
      const aOverdue = a.overdueMs >= 0;
      const bOverdue = b.overdueMs >= 0;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (aOverdue && bOverdue) return b.overdueMs - a.overdueMs;
      const aBookmarked = Boolean(a.bookmarkType);
      const bBookmarked = Boolean(b.bookmarkType);
      if (aBookmarked !== bBookmarked) return aBookmarked ? -1 : 1;
      return (a.dueAt || 0) - (b.dueAt || 0);
    });
}

function getMistakeNotebookEntries() {
  return currentEntries
    .filter((entry) => entry && !isVirtualBranchEntry(entry) && isRenderableEntry(entry))
    .filter((entry) => hasEntryTimelineBookmark(entry, "mistake"))
    .sort((a, b) => {
      const aForced = getEntryForcedReviewAt(a) ? 1 : 0;
      const bForced = getEntryForcedReviewAt(b) ? 1 : 0;
      if (aForced !== bForced) return bForced - aForced;
      const aDue = getReviewDueAt(a) || Number.MAX_SAFE_INTEGER;
      const bDue = getReviewDueAt(b) || Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
}

function renderTimelineSortToggleButton() {
  if (!timelineSortToggleBtnEl) return;
  const isAsc = timelineFolderItemSortOrder === "asc";
  timelineSortToggleBtnEl.classList.toggle("active", isAsc);
  timelineSortToggleBtnEl.setAttribute("aria-pressed", isAsc ? "true" : "false");
  const key = timelineFolderItemSortOrder === "asc" ? "timeline_sort_asc" : "timeline_sort_desc";
  timelineSortToggleBtnEl.textContent = t(key);
  timelineSortToggleBtnEl.setAttribute("aria-label", t(key));
}

function getTimelineFolderToneClass(folderId) {
  const normalizedFolderId = ensureValidFolderId(folderId, currentFolders);
  if (normalizedFolderId === DEFAULT_FOLDER_ID) return "timeline-folder-tone-default";
  let hash = 0;
  for (let i = 0; i < normalizedFolderId.length; i += 1) {
    hash = (hash * 31 + normalizedFolderId.charCodeAt(i)) >>> 0;
  }
  return `timeline-folder-tone-${hash % TIMELINE_FOLDER_TONE_COUNT}`;
}

function buildTimelineEntrySearchSource(entry) {
  const normalizedEntry = entry && typeof entry === "object" ? entry : {};
  const entryKey = String(normalizedEntry._runtimeKey || "");
  const sourceSignature = [
    currentLocale,
    normalizedEntry.title || "",
    normalizedEntry.question || "",
    normalizedEntry.summary || "",
    normalizeStudyNote(normalizedEntry.studyNote || ""),
    (normalizedEntry.answerMarkdown || "").length
  ].join("|");
  const cached = timelineSearchSourceCache.get(entryKey);
  if (cached?.signature === sourceSignature) return cached.value;
  const source = [
    getEntryTitle(normalizedEntry),
    normalizedEntry.question || "",
    normalizedEntry.summary || "",
    normalizeStudyNote(normalizedEntry.studyNote || ""),
    normalizeSingleLine(normalizedEntry.answerMarkdown || "", 360)
  ]
    .join(" ")
    .toLowerCase();
  timelineSearchSourceCache.set(entryKey, { signature: sourceSignature, value: source });
  if (timelineSearchSourceCache.size > 3200) {
    const staleKeys = Array.from(timelineSearchSourceCache.keys()).slice(0, 900);
    staleKeys.forEach((key) => timelineSearchSourceCache.delete(key));
  }
  return source;
}

function buildTimelineFolderFilterStats(entries = currentEntries) {
  const counts = new Map();
  (entries || []).forEach((entry) => {
    const folderId = ensureValidFolderId(entry?.folderId, currentFolders);
    counts.set(folderId, (counts.get(folderId) || 0) + 1);
  });
  return counts;
}

function renderTimelineFolderFilterButtons() {
  if (!timelineFolderFilterBarEl) return;
  const validIds = new Set(currentFolders.map((folder) => folder.id));
  timelineFolderFilterIds = new Set([...timelineFolderFilterIds].filter((id) => validIds.has(id)));
  const stats = buildTimelineFolderFilterStats(currentEntries);
  const orderedFolders = [
    { id: DEFAULT_FOLDER_ID, name: t("uncategorized"), depth: 0 },
    ...getFolderTreeOrder(currentFolders, DEFAULT_FOLDER_ID)
  ];
  const signature = [
    currentLocale,
    Array.from(timelineFolderFilterIds).sort().join(","),
    orderedFolders.map((folder) => `${folder.id}:${folder.name || ""}:${folder.depth || 0}:${stats.get(folder.id) || 0}`).join("|")
  ].join("::");
  if (signature === timelineFolderFilterRenderSignature) return;
  timelineFolderFilterRenderSignature = signature;

  timelineFolderFilterBarEl.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "timeline-folder-filter-btn timeline-folder-filter-btn-all";
  allBtn.dataset.folderAction = "all";
  allBtn.textContent = t("timeline_filter_folders_all");
  allBtn.classList.toggle("active", timelineFolderFilterIds.size === 0);
  allBtn.setAttribute("aria-pressed", timelineFolderFilterIds.size === 0 ? "true" : "false");
  fragment.appendChild(allBtn);

  orderedFolders.forEach((folder) => {
    if (folder.id === DEFAULT_FOLDER_ID && (stats.get(DEFAULT_FOLDER_ID) || 0) === 0) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `timeline-folder-filter-btn ${getTimelineFolderToneClass(folder.id)}`;
    btn.dataset.folderId = folder.id;
    btn.classList.toggle("active", timelineFolderFilterIds.has(folder.id));
    btn.setAttribute("aria-pressed", timelineFolderFilterIds.has(folder.id) ? "true" : "false");
    btn.title = folder.name || t("uncategorized");
    const nameEl = document.createElement("span");
    nameEl.className = "timeline-folder-filter-name";
    const depthPrefix = (folder.depth || 0) > 0 ? `${"· ".repeat(Math.min(folder.depth || 0, 4))}` : "";
    nameEl.textContent = `${depthPrefix}${folder.name || t("uncategorized")}`;
    btn.append(nameEl);
    fragment.appendChild(btn);
  });
  timelineFolderFilterBarEl.appendChild(fragment);
}

function applyLanguageToStaticUi() {
  if (welcomeTitleEl) welcomeTitleEl.textContent = t("welcome_title");
  if (welcomeDescEl) welcomeDescEl.textContent = t("welcome_desc");
  if (welcomeLangLabelEl) welcomeLangLabelEl.textContent = t("welcome_lang_label");
  if (welcomeContinueBtnEl) welcomeContinueBtnEl.textContent = t("welcome_continue");

  if (homeTitleEl) homeTitleEl.textContent = t("home_title");
  if (homeSubtitleEl) homeSubtitleEl.textContent = t("home_subtitle");
  if (homeBackupBtnEl) homeBackupBtnEl.textContent = currentLocale === "en" ? "Backup" : "备份";
  if (quickBackupBtnEl) quickBackupBtnEl.textContent = currentLocale === "en" ? "Backup" : "备份";
  if (homeRefreshBtnEl) homeRefreshBtnEl.textContent = t("home_refresh");
  if (openActiveConversationBtnEl) openActiveConversationBtnEl.textContent = t("home_open_active");
  renderHomeLayoutSelectOptions();
  renderHomeTreeDirectionSelectOptions();
  if (homeSearchInputEl) homeSearchInputEl.placeholder = t("home_search_ph");
  if (homeNewFolderInputEl) homeNewFolderInputEl.placeholder = t("home_new_folder_ph");
  if (homeAddFolderBtnEl) homeAddFolderBtnEl.textContent = t("home_add_folder");
  if (homeOpenAutoClassifyBtnEl) homeOpenAutoClassifyBtnEl.textContent = t("home_auto_open");
  if (homeAutoClassifyTitleEl) homeAutoClassifyTitleEl.textContent = t("home_auto_title");
  if (homeAutoClassifyCloseBtnEl) homeAutoClassifyCloseBtnEl.textContent = t("home_auto_close");
  if (homeAutoClassifyGuideEl) homeAutoClassifyGuideEl.textContent = t("home_auto_guide");
  if (homeAutoClassifyFolderInputEl) homeAutoClassifyFolderInputEl.placeholder = t("home_auto_folder_ph");
  if (homeAutoClassifyKeywordsInputEl) homeAutoClassifyKeywordsInputEl.placeholder = t("home_auto_keywords_ph");
  if (homeAutoClassifyAddRuleBtnEl) homeAutoClassifyAddRuleBtnEl.textContent = t("home_auto_add_rule");
  if (homeAutoClassifyEnabledLabelEl) homeAutoClassifyEnabledLabelEl.textContent = t("home_auto_enabled");
  if (homeAutoClassifyRulesInputEl) homeAutoClassifyRulesInputEl.placeholder = t("home_auto_rules_ph");
  if (homeAutoClassifySaveTipEl) homeAutoClassifySaveTipEl.textContent = t("home_auto_save_tip");
  if (homeAutoClassifyAdvancedSummaryEl) homeAutoClassifyAdvancedSummaryEl.textContent = t("home_auto_advanced");
  if (homeAutoClassifyOrderHintEl) homeAutoClassifyOrderHintEl.textContent = t("home_auto_order_hint");
  if (homeAutoClassifySaveBtnEl) homeAutoClassifySaveBtnEl.textContent = t("home_auto_save");
  if (homeAutoClassifyResetBtnEl) homeAutoClassifyResetBtnEl.textContent = t("home_auto_reset");
  renderHomeAutoClassifySettingsUi();
  if (homeMoveBtnEl) homeMoveBtnEl.textContent = t("home_move_selected");
  if (homeEmptyEl) homeEmptyEl.textContent = t("home_empty");
  if (homeManageSummaryLabelEl) homeManageSummaryLabelEl.textContent = t("home_manage_label");
  if (homeDrillSortBtnEl) {
    homeDrillSortBtnEl.textContent = homeDrillSortOrder === "asc" ? t("home_drill_sort_asc") : t("home_drill_sort_desc");
  }
  if (homeDrillBackBtnEl) homeDrillBackBtnEl.textContent = t("home_drill_back");

  if (backToPreviousPageBtnEl) backToPreviousPageBtnEl.textContent = t("back_previous_page");
  updateStudySplitButtonUi();
  if (quickBackHomeBtnEl) {
    quickBackHomeBtnEl.textContent = t("back_overview");
    quickBackHomeBtnEl.title = t("back_overview");
    quickBackHomeBtnEl.setAttribute("aria-label", t("back_overview"));
  }
  updateCompactWorkspaceSwitchUi();
  updateUiDensityToggleButton();
  if (refreshBtnEl) refreshBtnEl.textContent = t("refresh");
  if (dragHintEl) dragHintEl.textContent = t("drag_hint");
  if (saveSessionTitleBtnEl) saveSessionTitleBtnEl.textContent = t("save_title_btn");
  if (sessionTitleInputEl) sessionTitleInputEl.placeholder = t("session_title_ph");
  if (workspaceConversationLabelEl) workspaceConversationLabelEl.textContent = t("workspace_current_conversation");
  if (workspaceNodePanelTitleEl) workspaceNodePanelTitleEl.textContent = getPendingQuestionPanelTitle();
  if (workspacePanelSubtitleEl) workspacePanelSubtitleEl.textContent = getPendingQuestionPanelSubtitle();
  if (currentLocale !== "en") {
    if (workspaceNodePanelTitleEl) workspaceNodePanelTitleEl.textContent = "\u5b66\u4e60\u961f\u5217";
    if (workspacePanelSubtitleEl) {
      workspacePanelSubtitleEl.textContent = "\u9009\u4e2d\u9898\u76ee\uff0c\u70b9\u51fb\u5f00\u59cb\u5b66\u4e60\u3002";
    }
  }
  renderStudyFlowGuide();
  renderMainLearningMap();
  renderPendingQuestionBoard();
  renderWorkspaceTreeStyleSwitch();
  if (nodeManageSummaryLabelEl) nodeManageSummaryLabelEl.textContent = t("node_manage_summary");
  if (toggleCreateFolderBtnEl) toggleCreateFolderBtnEl.textContent = t("node_manage_create_title");
  if (toggleMoveFolderBtnEl) toggleMoveFolderBtnEl.textContent = t("move_uncategorized_btn");
  if (newFolderInputEl) newFolderInputEl.placeholder = t("new_folder_ph");
  if (addFolderBtnEl) addFolderBtnEl.textContent = t("new_folder_btn");
  if (moveSelectedBtnEl) moveSelectedBtnEl.textContent = t("move_uncategorized_btn");
  if (timelineEmptyEl) timelineEmptyEl.textContent = t("timeline_empty");
  renderTimelineSortToggleButton();
  if (locateBtnEl) locateBtnEl.textContent = t("locate_main");
  if (openSettingsBtnEl) openSettingsBtnEl.textContent = t("workspace_settings");
  if (openNodeSettingsBtnEl) {
    openNodeSettingsBtnEl.title = t("open_node_settings");
    openNodeSettingsBtnEl.setAttribute("aria-label", t("open_node_settings"));
  }
  if (openNodeNoteBtnEl) {
    openNodeNoteBtnEl.title = t("open_node_note");
    openNodeNoteBtnEl.setAttribute("aria-label", t("open_node_note"));
  }
  if (settingsTitleEl) settingsTitleEl.textContent = t("settings_title");
  if (noteTitleEl) noteTitleEl.textContent = t("note_title");
  if (noteHistoryTitleEl) noteHistoryTitleEl.textContent = t("note_history_title");
  if (noteHistoryEmptyEl) noteHistoryEmptyEl.textContent = t("note_history_empty");
  if (noteLibraryCurrentBtnEl) noteLibraryCurrentBtnEl.textContent = getNoteLibraryCurrentLabel();
  if (noteLibraryAllBtnEl) noteLibraryAllBtnEl.textContent = getNoteLibraryAllLabel();
  if (noteLibraryImageBtnEl) {
    noteLibraryImageBtnEl.textContent = getNoteLibraryContentFilterLabel();
  }
  if (noteLibrarySortBtnEl) noteLibrarySortBtnEl.textContent = getNoteLibrarySortLabel();
  if (noteLibrarySearchInputEl) noteLibrarySearchInputEl.placeholder = t("note_library_search_ph");
  renderNoteLibraryGuide();
  renderLearningCategoryPanel();
  if (nodeTitleInputEl) nodeTitleInputEl.placeholder = t("node_title_ph");
  if (saveNodeMetaBtnEl) saveNodeMetaBtnEl.textContent = t("save_node");
  if (studyNoteEyebrowEl) studyNoteEyebrowEl.textContent = t("study_note_eyebrow");
  if (studyNoteTitleEl) studyNoteTitleEl.textContent = t("study_note_title");
  if (studyNoteSuggestionsTitleEl) studyNoteSuggestionsTitleEl.textContent = t("study_note_suggestions_title");
  if (studyNoteInputEl) studyNoteInputEl.placeholder = t("study_note_ph");
  if (generateStudyNoteBtnEl) generateStudyNoteBtnEl.textContent = t("study_note_generate");
  if (saveStudyNoteBtnEl) saveStudyNoteBtnEl.textContent = t("save_study_note");
  ensureCompleteNextButton();
  refreshPendingQuestionSearchPlaceholder();
  if (pickRandomNodeBtnEl) {
    pickRandomNodeBtnEl.textContent = t("study_pick_random");
    pickRandomNodeBtnEl.title = `${t("study_pick_random")} (Ctrl+Alt+R)`;
  }
  if (pickReviewNodeBtnEl) {
    pickReviewNodeBtnEl.textContent = t("study_pick_review");
    pickReviewNodeBtnEl.title = `${t("study_pick_review")} (Ctrl+Alt+L)`;
  }
  if (markReviewedBtnEl) {
    markReviewedBtnEl.textContent = t("study_mark_reviewed");
    markReviewedBtnEl.title = `${t("study_mark_reviewed")} (Ctrl+Alt+M)`;
  }
  if (videoToolsTitleEl) videoToolsTitleEl.textContent = t("video_tools_title");
  if (videoEmbedInputEl) videoEmbedInputEl.placeholder = t("video_embed_ph");
  if (loadVideoEmbedBtnEl) loadVideoEmbedBtnEl.textContent = t("video_embed_load");
  if (pasteVideoEmbedBtnEl) pasteVideoEmbedBtnEl.textContent = t("video_embed_paste");
  if (openVideoEmbedTabBtnEl) openVideoEmbedTabBtnEl.textContent = t("video_embed_open_tab");
  if (clearVideoEmbedBtnEl) clearVideoEmbedBtnEl.textContent = t("video_embed_clear");
  updateVideoFullscreenButtonUi();
  if (videoEmbedPlaceholderEl) videoEmbedPlaceholderEl.textContent = t("video_embed_placeholder");
  if (branchSectionTitleEl) branchSectionTitleEl.textContent = t("branch_section_title");
  if (branchTreeTitleEl) branchTreeTitleEl.textContent = t("branch_tree_title");
  if (branchMiniTimelineTitleEl) branchMiniTimelineTitleEl.textContent = t("branch_timeline_mini_title");
  if (branchTreeCollapseAllBtnEl) branchTreeCollapseAllBtnEl.textContent = t("branch_tree_collapse_all");
  if (branchTreeExpandAllBtnEl) branchTreeExpandAllBtnEl.textContent = t("branch_tree_expand_all");
  if (clearBranchAnchorBtnEl) clearBranchAnchorBtnEl.textContent = t("branch_anchor_clear");
  if (branchTimelineRailHeadEl) branchTimelineRailHeadEl.textContent = t("branch_timeline_title");
  if (studyActionsTitleEl) studyActionsTitleEl.textContent = t("study_actions_title");
  document.querySelectorAll(".study-note-suggestion-btn").forEach((btn) => {
    const action = String(btn.dataset.noteSuggestion || "").trim();
    if (action === "structure") btn.textContent = t("study_note_suggestion_structure");
    if (action === "steps") btn.textContent = t("study_note_suggestion_steps");
    if (action === "pitfalls") btn.textContent = t("study_note_suggestion_pitfalls");
    if (action === "review") btn.textContent = t("study_note_suggestion_review");
  if (action === "image") btn.textContent = t("study_note_suggestion_image");
  });
  renderStudyScopeButtons();
  renderStudyActionButtons();
  renderNoteQuickFollowups();
  if (reviewSprintTitleEl) reviewSprintTitleEl.textContent = getReviewSprintTitleText();
  if (mistakeNotebookTitleEl) mistakeNotebookTitleEl.textContent = getMistakeNotebookTitleText();
  if (mistakeNotebookEmptyEl) mistakeNotebookEmptyEl.textContent = getMistakeNotebookEmptyText();
  renderTimelineFilterButtons();
  if (clearContextBtnEl) clearContextBtnEl.textContent = t("current_only");
  if (contextToolsTitleEl) contextToolsTitleEl.textContent = t("context_tools_title");
  if (branchAddBtnEl) {
    branchAddBtnEl.title = t("composer_add");
    branchAddBtnEl.setAttribute("aria-label", t("composer_add"));
  }
  if (branchQuoteSelectionBtnEl) {
    branchQuoteSelectionBtnEl.textContent = t("composer_quote_selection");
    branchQuoteSelectionBtnEl.title = t("composer_quote_selection");
    branchQuoteSelectionBtnEl.setAttribute("aria-label", t("composer_quote_selection"));
  }
  if (branchUploadImageBtnEl) {
    branchUploadImageBtnEl.textContent = t("composer_upload_image");
    branchUploadImageBtnEl.title = t("composer_upload_image");
    branchUploadImageBtnEl.setAttribute("aria-label", t("composer_upload_image"));
  }
  if (branchUploadFileBtnEl) {
    branchUploadFileBtnEl.textContent = t("composer_upload_file");
    branchUploadFileBtnEl.title = t("composer_upload_file");
    branchUploadFileBtnEl.setAttribute("aria-label", t("composer_upload_file"));
  }
  if (branchToolsBtnTextEl) branchToolsBtnTextEl.textContent = t("composer_tools");
  if (branchToolsBtnEl) {
    branchToolsBtnEl.title = t("composer_tools");
    branchToolsBtnEl.setAttribute("aria-label", t("composer_tools"));
  }
  if (branchModeThinkingBtnEl) branchModeThinkingBtnEl.textContent = t("composer_mode_thinking");
  if (branchModeDirectBtnEl) branchModeDirectBtnEl.textContent = t("composer_mode_standard");
  renderBranchComposerMode();
  if (branchInputEl) branchInputEl.placeholder = t("branch_input_ph");
  if (branchSendBtnEl) {
    const sendLabel = branchBusy ? t("sending") : t("branch_send");
    branchSendBtnEl.title = sendLabel;
    branchSendBtnEl.setAttribute("aria-label", sendLabel);
  }
  updateHomeSelectionUi();
  syncBranchAnchorBar();
  renderNoteHistoryList();
  updateTimelineToggleButton();
  syncVideoEmbedUi();
  syncThemeSelectors();
}

function syncLocaleSelectors() {
  if (welcomeLangSelectEl) welcomeLangSelectEl.value = currentLocale;
  if (homeLangSelectEl) homeLangSelectEl.value = currentLocale;
  if (workspaceLangSelectEl) workspaceLangSelectEl.value = currentLocale;
  if (lowPowerModeToggleEl) lowPowerModeToggleEl.checked = Boolean(settingsState.lowPowerMode);
}

function normalizeHomeLayoutMode(mode = "") {
  const text = String(mode || "").trim().toLowerCase();
  if (text === "mindmap" || text === "grid") return text;
  // Backward compatibility: legacy tree/graph map to current mindmap view.
  if (text === "tree" || text === "graph") return "mindmap";
  return "mindmap";
}

function normalizeHomeTreeDirection(direction = "") {
  const text = String(direction || "").trim().toLowerCase();
  return text === "vertical" ? "vertical" : "horizontal";
}

function getHomeLayoutOptions() {
  return [
    { value: "mindmap", label: t("home_layout_mindmap") },
    { value: "grid", label: t("home_layout_grid") }
  ];
}

function renderHomeLayoutSelectOptions() {
  if (!homeLayoutSelectEl) return;
  const prev = normalizeHomeLayoutMode(homeLayoutSelectEl.value || homeLayoutMode);
  homeLayoutSelectEl.innerHTML = "";
  getHomeLayoutOptions().forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    homeLayoutSelectEl.appendChild(option);
  });
  homeLayoutSelectEl.value = prev;
}

function renderHomeTreeDirectionSelectOptions() {
  if (!homeTreeDirectionSelectEl) return;
  const prev = normalizeHomeTreeDirection(homeTreeDirectionSelectEl.value || homeTreeDirection);
  homeTreeDirectionSelectEl.innerHTML = "";
  const options = [
    { value: "vertical", label: t("home_tree_direction_vertical") },
    { value: "horizontal", label: t("home_tree_direction_horizontal") }
  ];
  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    homeTreeDirectionSelectEl.appendChild(option);
  });
  homeTreeDirectionSelectEl.value = prev;
}

function getThemeOptions() {
  return [
    { value: "gemini", label: t("theme_follow_gemini") },
    { value: "light", label: t("theme_light") },
    { value: "dark", label: t("theme_dark") }
  ];
}

function renderThemeSelectOptions(selectEl) {
  if (!selectEl) return;
  const prev = normalizeTheme(selectEl.value || currentTheme);
  selectEl.innerHTML = "";
  getThemeOptions().forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    selectEl.appendChild(option);
  });
  selectEl.value = prev;
}

function syncThemeSelectors() {
  renderThemeSelectOptions(homeThemeSelectEl);
  renderThemeSelectOptions(workspaceThemeSelectEl);
  if (homeThemeSelectEl) homeThemeSelectEl.value = currentTheme;
  if (workspaceThemeSelectEl) workspaceThemeSelectEl.value = currentTheme;
}

function getSystemTheme() {
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function detectThemeFromGeminiResponse(response) {
  const theme = normalizeTheme(response?.theme || "");
  if (theme === "dark" || theme === "light") return theme;
  return "";
}

async function detectGeminiTheme(preferredConversationId = "") {
  const activeTab = await queryActiveGeminiTab(preferredConversationId || currentConversationId);
  if (!activeTab?.id) return "";
  try {
    const response = await sendMessageWithAutoInject(activeTab.id, { type: "GEMINI_GET_THEME" });
    return detectThemeFromGeminiResponse(response);
  } catch {
    return "";
  }
}

function normalizeComposerMode(mode) {
  const text = String(mode || "")
    .trim()
    .toLowerCase();
  if (!text) return "";
  if (["standard", "direct", "normal"].includes(text)) return "standard";
  if (["thinking", "reasoning"].includes(text)) return "thinking";
  if (text.includes("standard") || text.includes("direct") || text.includes("normal") || text.includes("标准")) {
    return "standard";
  }
  if (text.includes("thinking") || text.includes("reasoning") || text.includes("思考") || text.includes("推理")) {
    return "thinking";
  }
  return "";
}

async function syncBranchComposerModeFromGemini(preferredConversationId = "") {
  const activeTab = await queryActiveGeminiTab(preferredConversationId || currentConversationId);
  if (!activeTab?.id) return false;
  try {
    const response = await sendMessageWithAutoInject(activeTab.id, { type: "GEMINI_GET_COMPOSER_MODE" });
    const nativeMode = normalizeComposerMode(response?.mode || "");
    if (!nativeMode) return false;
    setBranchComposerMode(nativeMode);
    return true;
  } catch {
    return false;
  }
}

async function setNativeComposerMode(mode = "standard", preferredConversationId = "") {
  const targetMode = normalizeComposerMode(mode) || "standard";
  setBranchComposerMode(targetMode);
  const activeTab = await queryActiveGeminiTab(preferredConversationId || currentConversationId);
  if (!activeTab?.id) return false;
  try {
    const response = await sendMessageWithAutoInject(activeTab.id, {
      type: "GEMINI_SET_COMPOSER_MODE",
      mode: targetMode
    });
    const nativeMode = normalizeComposerMode(response?.mode || "");
    if (nativeMode) setBranchComposerMode(nativeMode);
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

async function requestNativeUpload(kind = "file") {
  const uploadKind = kind === "image" ? "image" : "file";
  const activeTab = await queryActiveGeminiTab(currentConversationId);
  if (!activeTab?.id) throw new Error("Gemini tab not found");
  const response = await sendMessageWithAutoInject(activeTab.id, {
    type: "GEMINI_OPEN_UPLOAD_PICKER",
    kind: uploadKind
  });
  if (!response?.ok) {
    throw new Error(response?.error || "upload not available");
  }
  return true;
}

function setDocumentTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", normalized);
}

async function applyTheme(preferredConversationId = "") {
  const token = ++themeApplyToken;
  let resolved = currentTheme;
  if (resolved === "gemini") {
    const geminiTheme = await detectGeminiTheme(preferredConversationId);
    if (token !== themeApplyToken) return;
    resolved = geminiTheme || getSystemTheme();
  }
  setDocumentTheme(resolved);
}

async function loadSettingsState() {
  const result = await storageGet(SETTINGS_KEY);
  settingsState = normalizeSettings(result?.[SETTINGS_KEY]);
  currentLocale = settingsState.locale;
  currentTheme = settingsState.theme;
  timelineCollapsed = Boolean(settingsState.timelineCollapsed);
  currentVideoEmbedUrl = settingsState.videoEmbedUrl || "";
  workspaceTreeStyle = normalizeWorkspaceTreeStyle(settingsState.workspaceTreeStyle);
  workspaceUiDensity = normalizeWorkspaceUiDensity(settingsState.workspaceUiDensity);
  studyScopeMode = normalizeStudyScopeMode(settingsState.studyScopeMode);
  studySplitEnabled = false;
  studySplitRatio = 58;
}

async function persistSettingsState() {
  await storageSet({ [SETTINGS_KEY]: settingsState });
}

function setDataPortabilityStatus(text = "", isError = false) {
  if (!dataPortabilityStatusEl) return;
  dataPortabilityStatusEl.textContent = text;
  dataPortabilityStatusEl.classList.toggle("error", Boolean(isError));
}

function createBackupFileName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `hajimi-timeline-backup-${stamp}.json`;
}

async function exportAllData() {
  const data = await storageGet(null);
  const payload = {
    app: "Hajimi Timeline",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = createBackupFileName();
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setDataPortabilityStatus(currentLocale === "en" ? "Backup exported." : "备份已导出。");
}

function showBackupReminder() {
  if (settingsState.backupReminderDismissed || !studyNoteStatusEl) return;
  const wrapper = document.createElement("span");
  wrapper.className = "backup-reminder-inline";
  const copy = document.createElement("span");
  copy.className = "backup-reminder-copy";
  const title = document.createElement("span");
  title.className = "backup-reminder-title";
  title.textContent = currentLocale === "en" ? "Saved locally" : "已保存到本地";
  const desc = document.createElement("span");
  desc.className = "backup-reminder-desc";
  desc.textContent = currentLocale === "en"
    ? "Export once when you want an extra backup."
    : "担心丢失时，再顺手导出一份备份。";
  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "backup-reminder-btn backup-reminder-btn-primary";
  exportBtn.textContent = currentLocale === "en" ? "Backup now" : "立即备份";
  exportBtn.addEventListener("click", () => {
    settingsState.backupReminderDismissed = true;
    persistSettingsState().catch(() => {});
    exportAllData().catch((error) => {
      console.error("exportAllData from reminder failed", error);
      setStudyNoteStatus(error?.message || "backup failed", true);
    });
  });
  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = "backup-reminder-btn backup-reminder-btn-secondary";
  dismissBtn.textContent = currentLocale === "en" ? "Dismiss" : "知道了";
  dismissBtn.addEventListener("click", () => {
    settingsState.backupReminderDismissed = true;
    persistSettingsState().catch(() => {});
    wrapper.remove();
  });
  const actions = document.createElement("span");
  actions.className = "backup-reminder-actions";
  copy.append(title, desc);
  actions.append(exportBtn, dismissBtn);
  wrapper.append(copy, actions);
  studyNoteStatusEl.replaceChildren(wrapper);
  studyNoteStatusEl.style.color = "var(--muted)";
}

function parseBackupPayload(text) {
  const parsed = JSON.parse(String(text || ""));
  const data = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid backup file");
  }
  return data;
}

async function importAllDataFromFile(file) {
  if (!(file instanceof File)) return;
  const text = await file.text();
  const data = parseBackupPayload(text);
  await storageSet(data);
  await loadSettingsState();
  await loadHomeState();
  applyLanguageToStaticUi();
  syncLocaleSelectors();
  syncThemeSelectors();
  await applyTheme();
  renderHomeConversationList();
  renderTimeline();
  setDataPortabilityStatus(currentLocale === "en" ? "Backup imported. Refresh Gemini tabs to apply page-level settings." : "备份已导入。刷新 Gemini 页面后页面级设置会生效。");
}

async function setLowPowerMode(enabled) {
  settingsState.lowPowerMode = Boolean(enabled);
  if (lowPowerModeToggleEl) lowPowerModeToggleEl.checked = settingsState.lowPowerMode;
  await persistSettingsState();
  setDataPortabilityStatus(
    settingsState.lowPowerMode
      ? (currentLocale === "en" ? "Low footprint mode enabled. Refresh Gemini tabs if needed." : "低占用模式已启用。必要时刷新 Gemini 页面生效。")
      : (currentLocale === "en" ? "Low footprint mode disabled. Refresh Gemini tabs if needed." : "低占用模式已关闭。必要时刷新 Gemini 页面生效。")
  );
}

function markWelcomeSeenOnce() {
  if (settingsState.welcomeCompleted) return;
  settingsState.welcomeCompleted = true;
  persistSettingsState().catch((error) => {
    console.warn("persist welcome completed failed", error);
  });
}

async function setLocale(locale, persist = true) {
  currentLocale = normalizeLocale(locale);
  settingsState.locale = currentLocale;
  homeAutoClassifyRules = localizeDefaultHomeAutoClassifyRules(homeAutoClassifyRules, currentLocale);
  applyLanguageToStaticUi();
  syncLocaleSelectors();
  renderSessionMeta();
  renderContextSelectionMeta();
  renderTimeline();
  renderHomeConversationList();
  if (persist) {
    await persistSettingsState();
  }
}

async function setTheme(theme, persist = true, preferredConversationId = "") {
  currentTheme = normalizeTheme(theme);
  settingsState.theme = currentTheme;
  syncThemeSelectors();
  await applyTheme(preferredConversationId);
  if (persist) {
    await persistSettingsState();
  }
}

async function consumePendingPanelNavigation() {
  const result = await storageGet(PANEL_NAV_KEY);
  const pending = result?.[PANEL_NAV_KEY];
  if (!pending || typeof pending !== "object") return false;

  const createdAt = Number(pending.createdAt) || 0;
  const age = Date.now() - createdAt;
  await storageRemove(PANEL_NAV_KEY).catch(() => {});
  if (age > PANEL_NAV_TTL_MS) return false;
  if (pending.view === "home") {
    await enterHomeView();
    return true;
  }
  if (pending.view === "workspace" && pending.conversationId) {
    await openWorkspaceConversation(pending.conversationId, { requestSnapshot: true });
    return true;
  }
  return false;
}

function updateTimelineToggleButton() {
  if (toggleTimelineBtnEl) {
    toggleTimelineBtnEl.textContent = timelineCollapsed ? t("toggle_nodes_show") : t("toggle_nodes_hide");
  }
  if (floatingToggleBtnEl) {
    floatingToggleBtnEl.hidden = !timelineCollapsed;
    const label = t("toggle_nodes_show");
    floatingToggleBtnEl.title = label;
    floatingToggleBtnEl.setAttribute("aria-label", label);
  }
}

function updateUiDensityToggleButton() {
  if (!toggleDensityBtnEl) return;
  const nextModeIsFull = workspaceUiDensity === "minimal";
  const label = nextModeIsFull ? t("ui_density_full") : t("ui_density_minimal");
  toggleDensityBtnEl.textContent = label;
  toggleDensityBtnEl.title = label;
  toggleDensityBtnEl.setAttribute("aria-label", label);
}

function applyWorkspaceUiDensity() {
  if (workspaceViewEl) {
    workspaceViewEl.classList.add("workspace-minimal");
    workspaceViewEl.classList.remove("workspace-full");
  }
  applySubQuestionWorkbenchMode();
  updateUiDensityToggleButton();
}

async function setWorkspaceUiDensity(mode, persist = true) {
  workspaceUiDensity = "minimal";
  settingsState.workspaceUiDensity = workspaceUiDensity;
  applyWorkspaceUiDensity();
  if (persist) {
    await persistSettingsState();
  }
}

function applyTimelineLayout() {
  if (!layoutRootEl) return;
  layoutRootEl.classList.toggle("layout-timeline-hidden", timelineCollapsed);
  updateTimelineToggleButton();
  updateDragHint();
}

function isCompactWorkspaceMode() {
  return currentView === "workspace";
}

function updateCompactWorkspaceSwitchUi() {
  if (compactViewSwitchEl) {
    compactViewSwitchEl.hidden = !isCompactWorkspaceMode();
  }
  if (compactViewSwitchEl) {
    compactViewSwitchEl.setAttribute("aria-label", t("compact_switch_aria"));
  }
  if (compactShowChatBtnEl) {
    compactShowChatBtnEl.textContent = t("compact_switch_chat");
    const active = compactWorkspacePane === "chat";
    compactShowChatBtnEl.classList.toggle("active", active);
    compactShowChatBtnEl.setAttribute("aria-selected", active ? "true" : "false");
  }
  if (compactShowNoteBtnEl) {
    compactShowNoteBtnEl.textContent = t("compact_switch_note");
    const active = compactWorkspacePane === "note";
    compactShowNoteBtnEl.classList.toggle("active", active);
    compactShowNoteBtnEl.setAttribute("aria-selected", active ? "true" : "false");
  }
}

function applyCompactWorkspaceMode() {
  if (!workspaceViewEl) return;
  const active = isCompactWorkspaceMode();
  workspaceViewEl.classList.toggle("workspace-compact-mode", active);
  workspaceViewEl.classList.toggle("workspace-compact-chat", active && compactWorkspacePane === "chat");
  workspaceViewEl.classList.toggle("workspace-compact-note", active && compactWorkspacePane === "note");
  setBranchToolsOpen(false);
  updateCompactWorkspaceSwitchUi();
}

function setCompactWorkspacePane(pane) {
  compactWorkspacePane = normalizeCompactWorkspacePane(pane);
  detailMode = compactWorkspacePane === "note" ? "note" : "branch";
  applyCompactWorkspaceMode();
}

function renderWorkspaceTreeStyleSwitch() {
  if (workspaceTreeStyleSwitchEl) {
    workspaceTreeStyleSwitchEl.setAttribute("aria-label", t("tree_style_aria_label"));
  }
  if (treeStyleWireBtnEl) {
    treeStyleWireBtnEl.textContent = t("tree_style_wire");
    const active = workspaceTreeStyle === "wire";
    treeStyleWireBtnEl.classList.toggle("active", active);
    treeStyleWireBtnEl.setAttribute("aria-pressed", active ? "true" : "false");
  }
  if (treeStyleGlassBtnEl) {
    treeStyleGlassBtnEl.textContent = t("tree_style_glass");
    const active = workspaceTreeStyle === "glass";
    treeStyleGlassBtnEl.classList.toggle("active", active);
    treeStyleGlassBtnEl.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function applyWorkspaceTreeStyleUi() {
  if (workspaceViewEl) {
    workspaceViewEl.classList.toggle("workspace-tree-style-wire", workspaceTreeStyle === "wire");
    workspaceViewEl.classList.toggle("workspace-tree-style-glass", workspaceTreeStyle !== "wire");
  }
  renderWorkspaceTreeStyleSwitch();
}

async function setWorkspaceTreeStyle(style, persist = true) {
  workspaceTreeStyle = normalizeWorkspaceTreeStyle(style);
  settingsState.workspaceTreeStyle = workspaceTreeStyle;
  applyWorkspaceTreeStyleUi();
  if (persist) {
    await persistSettingsState();
  }
}

async function setTimelineCollapsed(collapsed, persist = true) {
  timelineCollapsed = Boolean(collapsed);
  settingsState.timelineCollapsed = timelineCollapsed;
  applyTimelineLayout();
  if (persist) {
    await persistSettingsState();
  }
}

function isStudySplitActive() {
  return false;
}

function updateStudySplitButtonUi() {
  if (!toggleStudySplitBtnEl) return;
  const active = isStudySplitActive();
  const label = active ? t("study_split_disable") : t("study_split_enable");
  toggleStudySplitBtnEl.textContent = label;
  toggleStudySplitBtnEl.title = label;
  toggleStudySplitBtnEl.setAttribute("aria-label", label);
}

function syncVideoModulePlacement() {
  if (!videoModuleContainerEl) return;
  const target = videoEmbedPanelMaximized
    ? videoFocusLayerEl
    : isStudySplitActive()
      ? workspaceVideoMountEl
      : homeVideoMountEl;
  if (!(target instanceof HTMLElement)) return;
  if (videoModuleContainerEl.parentElement !== target) {
    target.appendChild(videoModuleContainerEl);
  }
}

function applyStudySplitLayout() {
  const active = isStudySplitActive();
  if (detailBranchViewEl) {
    detailBranchViewEl.classList.toggle("workspace-study-split", active);
    detailBranchViewEl.style.setProperty("--study-chat-width", `${studySplitRatio}%`);
  }
  if (workspaceVideoMountEl) workspaceVideoMountEl.hidden = !active;
  if (studySplitHandleEl) studySplitHandleEl.hidden = !active;
  updateStudySplitButtonUi();
}

function setStudySplitRatio(nextRatio, persist = true) {
  studySplitRatio = normalizeStudySplitRatio(nextRatio);
  settingsState.studySplitRatio = studySplitRatio;
  applyStudySplitLayout();
  if (persist) {
    persistSettingsState().catch((error) => {
      console.error("persist studySplitRatio failed", error);
    });
  }
}

function setStudySplitEnabled(enabled, persist = true) {
  studySplitEnabled = Boolean(enabled);
  settingsState.studySplitEnabled = studySplitEnabled;
  applyStudySplitLayout();
  syncVideoModulePlacement();
  if (persist) {
    persistSettingsState().catch((error) => {
      console.error("persist studySplitEnabled failed", error);
    });
  }
}

function handleStudySplitDragMove(event) {
  if (!studySplitDragging || !detailBranchViewEl) return;
  const rect = detailBranchViewEl.getBoundingClientRect();
  if (!rect.width) return;
  const rawRatio = ((event.clientX - rect.left) / rect.width) * 100;
  setStudySplitRatio(rawRatio, false);
}

function stopStudySplitDrag() {
  if (!studySplitDragging) return;
  studySplitDragging = false;
  document.body.style.userSelect = "";
  document.removeEventListener("mousemove", handleStudySplitDragMove);
  document.removeEventListener("mouseup", stopStudySplitDrag);
  setStudySplitRatio(studySplitRatio, true);
}

function startStudySplitDrag(event) {
  if (!isStudySplitActive()) return;
  studySplitDragging = true;
  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", handleStudySplitDragMove);
  document.addEventListener("mouseup", stopStudySplitDrag);
  handleStudySplitDragMove(event);
}

async function loadHomeState() {
  const homeKey = getHomeStorageKey();
  const result = await storageGet(homeKey);
  const raw = result?.[homeKey] || {};
  const folders = normalizeHomeFolders(raw.folders);
  homeFolders = folders;
  homeConversationFolderMap = normalizeHomeConversationFolderMap(raw.conversationFolderMap, folders);
  homeCollapsedFolderIds = new Set(normalizeHomeCollapsedFolderIds(raw.collapsedFolderIds, folders));
  homeLayoutMode = normalizeHomeLayoutMode(raw.layoutMode);
  homeTreeDirection = normalizeHomeTreeDirection(raw.treeDirection);
  homeAutoClassifyEnabled = raw.autoClassifyEnabled !== false;
  homeAutoClassifyRules = localizeDefaultHomeAutoClassifyRules(
    normalizeHomeAutoClassifyRules(raw.autoClassifyRules),
    currentLocale
  );
  homeMindmapCollapsedGroupKeys = new Set(
    Array.isArray(raw.mindmapCollapsedGroupKeys) ? raw.mindmapCollapsedGroupKeys.map((key) => String(key || "")) : []
  );
  if (homeLayoutSelectEl) homeLayoutSelectEl.value = homeLayoutMode;
  if (homeTreeDirectionSelectEl) homeTreeDirectionSelectEl.value = homeTreeDirection;
  renderHomeAutoClassifySettingsUi();
}

async function persistHomeState(overrides = {}) {
  const folders = normalizeHomeFolders(overrides.folders ?? homeFolders);
  const map = normalizeHomeConversationFolderMap(overrides.conversationFolderMap ?? homeConversationFolderMap, folders);
  const collapsedFolderIds = normalizeHomeCollapsedFolderIds(
    overrides.collapsedFolderIds ?? Array.from(homeCollapsedFolderIds),
    folders
  );

  homeFolders = folders;
  homeConversationFolderMap = map;
  homeCollapsedFolderIds = new Set(collapsedFolderIds);
  const nextLayoutMode = normalizeHomeLayoutMode(overrides.layoutMode ?? homeLayoutMode);
  const nextTreeDirection = normalizeHomeTreeDirection(overrides.treeDirection ?? homeTreeDirection);
  const nextMindmapCollapsedGroupKeys = Array.isArray(overrides.mindmapCollapsedGroupKeys)
    ? overrides.mindmapCollapsedGroupKeys.map((key) => String(key || ""))
    : [...homeMindmapCollapsedGroupKeys];
  const nextAutoClassifyEnabled =
    overrides.autoClassifyEnabled === undefined ? homeAutoClassifyEnabled : overrides.autoClassifyEnabled !== false;
  const nextAutoClassifyRules = normalizeHomeAutoClassifyRules(overrides.autoClassifyRules ?? homeAutoClassifyRules);
  homeLayoutMode = nextLayoutMode;
  homeTreeDirection = nextTreeDirection;
  homeMindmapCollapsedGroupKeys = new Set(nextMindmapCollapsedGroupKeys);
  homeAutoClassifyEnabled = nextAutoClassifyEnabled;
  homeAutoClassifyRules = nextAutoClassifyRules;

  const homeKey = getHomeStorageKey();
  await storageSet({
    [homeKey]: {
      folders,
      conversationFolderMap: map,
      collapsedFolderIds,
      layoutMode: nextLayoutMode,
      treeDirection: nextTreeDirection,
      mindmapCollapsedGroupKeys: nextMindmapCollapsedGroupKeys,
      autoClassifyEnabled: nextAutoClassifyEnabled,
      autoClassifyRules: nextAutoClassifyRules
    }
  });
}

function renderHomeMoveFolderOptions() {
  if (!homeMoveFolderSelectEl || !homeMoveBtnEl) return;
  homeMoveFolderSelectEl.innerHTML = "";
  const folders = getFolderTreeOrder(homeFolders, HOME_DEFAULT_FOLDER_ID);

  if (!folders.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = t("move_select_target_placeholder");
    homeMoveFolderSelectEl.appendChild(option);
    homeMoveFolderSelectEl.disabled = true;
    homeMoveBtnEl.disabled = true;
    return;
  }

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = t("home_move_target_placeholder");
  homeMoveFolderSelectEl.appendChild(placeholderOption);
  folders.forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = buildSelectFolderLabel(getHomeFolderDisplayName(folder), folder.depth || 0);
    homeMoveFolderSelectEl.appendChild(option);
  });

  homeMoveFolderSelectEl.value = "";
  homeMoveFolderSelectEl.disabled = false;
  homeMoveBtnEl.disabled = true;
}

function renderHomeParentFolderOptions(selectedParentId = HOME_DEFAULT_FOLDER_ID) {
  if (!homeParentFolderSelectEl) return;
  homeParentFolderSelectEl.innerHTML = "";
  const baseOption = document.createElement("option");
  baseOption.value = HOME_DEFAULT_FOLDER_ID;
  baseOption.textContent = t("home_tree_root");
  homeParentFolderSelectEl.appendChild(baseOption);
  getFolderTreeOrder(homeFolders, HOME_DEFAULT_FOLDER_ID).forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = buildSelectFolderLabel(getHomeFolderDisplayName(folder), folder.depth || 0);
    homeParentFolderSelectEl.appendChild(option);
  });
  homeParentFolderSelectEl.value = ensureHomeFolderId(selectedParentId);
}

function updateHomeSelectionUi() {
  const inDrillView = Boolean(homeDrillParentConversationId);
  const selectionMode = false;

  if (homeViewEl) {
    homeViewEl.classList.toggle("home-selection-mode", selectionMode);
  }

  if (homeMoveActionsEl) {
    homeMoveActionsEl.hidden = true;
  }
  if (homeMoveFolderSelectEl) {
    homeMoveFolderSelectEl.disabled = true;
    homeMoveFolderSelectEl.value = "";
  } else if (homeMoveBtnEl) {
    homeMoveBtnEl.disabled = true;
  }

  if (homeDrillBackBtnEl) {
    homeDrillBackBtnEl.hidden = !inDrillView;
  }
  if (homeDrillSortBtnEl) {
    homeDrillSortBtnEl.hidden = !inDrillView;
    homeDrillSortBtnEl.textContent = homeDrillSortOrder === "asc" ? t("home_drill_sort_asc") : t("home_drill_sort_desc");
  }

  if (homeManageSummaryMetaEl) {
    if (inDrillView) {
      homeManageSummaryMetaEl.textContent = t("home_drill_meta", {
        title: homeDrillParentConversationTitle || t("home_title"),
        count: homeDrillEntries.length
      });
    } else {
      homeManageSummaryMetaEl.textContent = "";
    }
    homeManageSummaryMetaEl.title = homeManageSummaryMetaEl.textContent || "";
  }

}

function getSortedHomeDrillEntries(entries = homeDrillEntries) {
  const sorted = (entries || []).slice().sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
  return homeDrillSortOrder === "asc" ? sorted : sorted.reverse();
}

async function promptHomeMoveTargetFolderId() {
  const folders = getFolderTreeOrder(homeFolders, HOME_DEFAULT_FOLDER_ID);
  if (!folders.length) {
    setHomeStatus(t("home_status_select_target"), true);
    return "";
  }
  const optionNames = folders.map((folder) => getHomeFolderDisplayName(folder)).filter(Boolean);
  const optionsText = optionNames.join(" / ");
  const defaultName = optionNames[0] || "";
  const input = window.prompt(t("home_move_target_prompt", { options: optionsText }), defaultName);
  if (input === null) return "";
  const targetName = normalizeHomeFolderName(input || "");
  if (!targetName) {
    setHomeStatus(t("home_status_select_target"), true);
    return "";
  }
  const matches = folders.filter((folder) => (folder.name || "").toLowerCase() === targetName.toLowerCase());
  if (!matches.length) {
    setHomeStatus(t("home_move_target_not_found", { name: targetName }), true);
    return "";
  }
  if (matches.length > 1) {
    setHomeStatus(t("home_move_target_ambiguous", { name: targetName }), true);
    return "";
  }
  return matches[0].id || "";
}

async function quickCreateHomeSubfolderAndMoveSelected(parentFolderId) {
  const targetFolderId = ensureHomeFolderId(parentFolderId || HOME_DEFAULT_FOLDER_ID, homeFolders);
  const targetFolder = homeFolders.find((item) => item.id === targetFolderId);
  const parentLabel = targetFolderId === HOME_DEFAULT_FOLDER_ID ? t("home_tree_root") : getHomeFolderDisplayName(targetFolder);
  const defaultName = normalizeHomeFolderName(homeNewFolderInputEl?.value || "");
  const input = window.prompt(t("home_quick_create_prompt", { parent: parentLabel }), defaultName);
  if (input === null) return;
  await createHomeFolderAndMoveSelected(targetFolderId, input);
}

async function renameHomeFolder(folderId, rawFolderName) {
  const targetFolderId = ensureHomeFolderId(folderId || HOME_DEFAULT_FOLDER_ID, homeFolders);
  if (targetFolderId === HOME_DEFAULT_FOLDER_ID) {
    setHomeStatus(t("home_folder_rename_root_blocked"), true);
    return false;
  }
  const folderIndex = homeFolders.findIndex((item) => item.id === targetFolderId);
  if (folderIndex < 0) return false;
  const nextName = normalizeHomeFolderName(rawFolderName || "");
  if (!nextName) {
    setHomeStatus(t("home_folder_rename_required"), true);
    return false;
  }
  const targetFolder = homeFolders[folderIndex];
  const parentId = ensureHomeFolderId(targetFolder.parentId || HOME_DEFAULT_FOLDER_ID, homeFolders);
  const duplicated = homeFolders.find(
    (folder) =>
      folder.id !== targetFolderId &&
      ensureHomeFolderId(folder.parentId || HOME_DEFAULT_FOLDER_ID, homeFolders) === parentId &&
      (folder.name || "").toLowerCase() === nextName.toLowerCase()
  );
  if (duplicated) {
    setHomeStatus(t("home_status_exists", { name: nextName }), true);
    return false;
  }
  const previousName = targetFolder.name || t("home_uncategorized_title");
  homeFolders = homeFolders.map((folder) => (folder.id === targetFolderId ? { ...folder, name: nextName } : folder));
  await persistHomeState({ folders: homeFolders });
  setHomeStatus(t("home_folder_renamed", { old: previousName, name: nextName }));
  renderHomeConversationList();
  return true;
}

async function handleHomeFolderContextAction(folderId) {
  const targetFolderId = ensureHomeFolderId(folderId || HOME_DEFAULT_FOLDER_ID, homeFolders);
  const targetFolder = homeFolders.find((item) => item.id === targetFolderId);
  const folderLabel = targetFolderId === HOME_DEFAULT_FOLDER_ID ? t("home_tree_root") : getHomeFolderDisplayName(targetFolder);
  const input = window.prompt(t("home_folder_context_prompt", { name: folderLabel }), "");
  if (input === null) return;
  const trimmed = String(input || "").trim();
  if (!trimmed) {
    setHomeStatus(t("home_folder_context_empty"), true);
    return;
  }
  if (trimmed.startsWith("=")) {
    await renameHomeFolder(targetFolderId, trimmed.slice(1));
    return;
  }
  const createName = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  await createHomeFolderAndMoveSelected(targetFolderId, createName);
}

function leaveHomeDrilldown() {
  homeDrillParentConversationId = "";
  homeDrillParentConversationTitle = "";
  homeDrillEntries = [];
  homeDrillSortOrder = "desc";
  renderHomeConversationList();
}

async function buildHomeConversationDrillEntries(conversationId, fallbackTitle = "") {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!isConcreteConversationId(normalizedConversationId)) return [];
  const cached = getConversationSnapshotFromCache(normalizedConversationId);
  if (cached?.entries?.length) {
    return cached.entries.slice().sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0));
  }

  const allStorage = await storageGet(null);
  const storageKey = toStorageKey(normalizedConversationId);
  const sessions = pickConversationSessions(allStorage, normalizedConversationId).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const latestSession = sessions[0]?.session || allStorage?.[storageKey] || {};
  let entries = dedupeEntries(
    sessions.flatMap((item) => item.entries || []).map(normalizeEntry)
  ).map((entry) => ({
    ...entry,
    folderId: ensureValidFolderId(entry.folderId, normalizeFolders(latestSession.folders || []))
  }));
  if (!entries.length) {
    entries = buildVirtualEntriesFromBranchStore(allStorage, normalizedConversationId);
  }

  const snapshot = buildConversationSnapshotFromSession(normalizedConversationId, latestSession, { fallbackTitle });
  setConversationSnapshotCache(normalizedConversationId, {
    ...snapshot,
    entries
  });
  return entries.slice().sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0));
}

async function enterHomeConversationDrilldown(item) {
  const conversationId = normalizeConversationId(item?.conversationId || item?.url || "");
  if (!isConcreteConversationId(conversationId)) return;
  homeDrillParentConversationId = conversationId;
  homeDrillParentConversationTitle = getConversationDisplayTitle(item);
  selectedHomeConversationIds.clear();
  setHomeStatus("正在加载分对话...");
  try {
    homeDrillEntries = await buildHomeConversationDrillEntries(conversationId, homeDrillParentConversationTitle);
    setHomeStatus("");
  } catch (error) {
    homeDrillEntries = [];
    setHomeStatus(error?.message || "加载分对话失败，请重试。", true);
    console.error("enterHomeConversationDrilldown failed", error);
  }
  renderHomeConversationList();
}

function createHomeDrillEntryNode(entry, parentConversationId, fallbackTitle) {
  const li = document.createElement("li");
  li.className = "timeline-item home-tree-leaf";
  const row = document.createElement("div");
  row.className = "timeline-row";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "timeline-btn";
  button.title = getEntryTitle(entry);

  const titleEl = document.createElement("p");
  titleEl.className = "timeline-summary";
  titleEl.textContent = getEntryTitle(entry);
  const snippetEl = document.createElement("p");
  snippetEl.className = "timeline-snippet";
  snippetEl.textContent = getEntrySnippet(entry) || summarize(entry.answerMarkdown || entry.question || "");
  const timeEl = document.createElement("time");
  timeEl.className = "timeline-time";
  timeEl.dateTime = new Date(entry.timestamp || Date.now()).toISOString();
  timeEl.textContent = `${formatTime(entry.timestamp)} · ${t("home_open_subdialogue")}`;
  button.append(titleEl, snippetEl, timeEl);

  button.addEventListener("click", async () => {
    button.disabled = true;
    setHomeStatus("正在打开并定位分对话...");
    try {
      await openWorkspaceConversation(parentConversationId, {
        requestSnapshot: true,
        fallbackTitle,
        detailMode: "branch",
        locateTarget: {
          entryId: entry.id || "",
          domIndex: Number.isInteger(entry.domIndex) ? entry.domIndex : null,
          timestamp: Number(entry.timestamp) || 0
        }
      });
      setHomeStatus("");
    } catch (error) {
      setHomeStatus(error?.message || "定位失败，请重试。", true);
      console.error("openWorkspaceConversation from home drill failed", error);
    } finally {
      button.disabled = false;
    }
  });

  row.append(button);
  li.append(row);
  return li;
}

function createHomeConversationNode(item, variant = "tree", depth = 0) {
  const li = document.createElement("li");
  const depthClass = getTreeDepthClass(depth);
  li.className = "timeline-item";
  li.classList.add(depthClass);
  if (variant === "mindmap") {
    li.classList.add("home-mindmap-node");
  } else if (variant === "graph") {
    li.classList.add("home-graph-leaf-node");
  } else if (variant === "grid") {
    li.classList.add("home-grid-node");
  } else {
    li.classList.add("home-tree-leaf");
  }

  const row = document.createElement("div");
  row.className = "timeline-row";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "timeline-btn";
  button.classList.add(depthClass);
  button.draggable = true;
  const displayTitle = getConversationDisplayTitle(item);
  button.title = displayTitle;

  const titleEl = document.createElement("p");
  titleEl.className = "timeline-summary";
  titleEl.textContent = displayTitle;

  const snippetEl = document.createElement("p");
  snippetEl.className = "timeline-snippet";
  const hasCapturedData = Boolean(item.latestSummary || item.latestQuestion || (item.entryCount || 0) > 0);
  snippetEl.textContent = hasCapturedData
    ? summarize(item.latestSummary || item.latestQuestion || "")
    : t("home_imported_hint");

  const timeEl = document.createElement("time");
  timeEl.className = "timeline-time";
  timeEl.textContent = `${formatTime(item.updatedAt)} · ${t("open_workspace")}`;

  if (variant === "graph") {
    button.classList.add("home-graph-conversation-btn");
    button.append(titleEl);
  } else {
    button.append(titleEl, snippetEl, timeEl);
  }
  button.addEventListener("click", async () => {
    button.disabled = true;
    setHomeStatus("正在打开工作台...");
    try {
      const conversationId = normalizeConversationId(item?.conversationId || item?.url || "");
      if (!isConcreteConversationId(conversationId)) {
        throw new Error(t("home_status_open_active_fail"));
      }
      await openWorkspaceConversation(conversationId, {
        requestSnapshot: true,
        fallbackTitle: displayTitle,
        detailMode: "branch"
      });
    } catch (error) {
      setHomeStatus(error?.message || "打开工作台失败，请重试。", true);
      console.error("openWorkspaceConversation from home list failed", error);
    } finally {
      button.disabled = false;
    }
  });

  button.addEventListener("dragstart", (event) => {
    homeDraggingConversationId = item.conversationId || "";
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", homeDraggingConversationId);
    }
    li.classList.add("is-dragging");
  });
  button.addEventListener("dragend", () => {
    homeDraggingConversationId = "";
    li.classList.remove("is-dragging");
    document.querySelectorAll("[data-home-drop-target].is-drop-over").forEach((el) => {
      el.classList.remove("is-drop-over");
    });
  });

  if (variant === "graph") {
    row.classList.add("home-graph-leaf-row");
  }
  row.append(button);
  li.appendChild(row);
  return li;
}

async function moveHomeConversationToFolder(conversationId, targetFolderId) {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!isConcreteConversationId(normalizedConversationId)) return false;
  const folderId = ensureHomeFolderId(targetFolderId || HOME_DEFAULT_FOLDER_ID, homeFolders);
  const previousFolderId = ensureHomeFolderId(homeConversationFolderMap[normalizedConversationId], homeFolders);
  if (previousFolderId === folderId) return true;
  homeConversationFolderMap[normalizedConversationId] = folderId;
  await persistHomeState({ conversationFolderMap: homeConversationFolderMap });
  const folderName = folderId === HOME_DEFAULT_FOLDER_ID
    ? t("home_uncategorized_title")
    : getFolderDisplayNameById(folderId, homeFolders) || t("home_uncategorized_title");
  setHomeStatus(t("home_status_moved", { count: 1, name: folderName }));
  renderHomeConversationList();
  return true;
}

function attachHomeFolderDropTarget(targetEl, folderId) {
  if (!targetEl) return;
  targetEl.dataset.homeDropTarget = "1";
  targetEl.addEventListener("dragover", (event) => {
    const draggingId = homeDraggingConversationId || event.dataTransfer?.getData("text/plain") || "";
    if (!draggingId) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    targetEl.classList.add("is-drop-over");
  });
  targetEl.addEventListener("dragleave", () => {
    targetEl.classList.remove("is-drop-over");
  });
  targetEl.addEventListener("drop", async (event) => {
    const draggingId = homeDraggingConversationId || event.dataTransfer?.getData("text/plain") || "";
    targetEl.classList.remove("is-drop-over");
    if (!draggingId) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      await moveHomeConversationToFolder(draggingId, folderId);
    } catch (error) {
      console.error("moveHomeConversationToFolder by drag failed", error);
      setHomeStatus(error?.message || "拖动分类失败，请重试。", true);
    } finally {
      homeDraggingConversationId = "";
    }
  });
}

function createHomeGraphTreeSection(items) {
  const sectionEl = document.createElement("li");
  sectionEl.className = "home-graph";
  sectionEl.classList.add(homeTreeDirection === "horizontal" ? "is-horizontal" : "is-vertical");

  const headEl = document.createElement("div");
  headEl.className = "home-graph-head";
  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "home-graph-root";
  toggleBtn.textContent = `${homeTreeCollapsed ? "\u25B8" : "\u25BE"} ${t("home_tree_root")}`;
  toggleBtn.addEventListener("click", () => {
    homeTreeCollapsed = !homeTreeCollapsed;
    renderHomeConversationList();
  });
  const countEl = document.createElement("span");
  countEl.className = "home-graph-root-count";
  countEl.textContent = t("home_conversation_count", { count: items.length });
  headEl.append(toggleBtn, countEl);

  const canvasEl = document.createElement("div");
  canvasEl.className = "home-graph-canvas";
  canvasEl.hidden = homeTreeCollapsed;

  const treeRootEl = document.createElement("ul");
  treeRootEl.className = "home-graph-tree";

  const folderChildrenMap = getHomeFolderChildrenMap();
  const grouped = getHomeConversationFolderGroups(items);
  const allFolderIds = new Set(homeFolders.map((folder) => folder.id));
  homeCollapsedFolderIds = new Set([...homeCollapsedFolderIds].filter((id) => allFolderIds.has(id)));

  const renderFolderGraphNode = (folderId, depth = 0) => {
    const folder = homeFolders.find((item) => item.id === folderId);
    if (!folder) return null;
    const childFolders = folderChildrenMap.get(folder.id) || [];
    const childItems = grouped.get(folder.id) || [];
    const hasChildren = childFolders.length > 0 || childItems.length > 0;
    const collapsed = homeCollapsedFolderIds.has(folder.id);
    const depthClass = getTreeDepthClass(depth);

    const nodeEl = document.createElement("li");
    nodeEl.className = `home-graph-node ${depthClass}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `home-graph-node-btn ${depthClass}`;
    const folderLabel = folder.id === HOME_DEFAULT_FOLDER_ID ? t("home_uncategorized_title") : folder.name;
    btn.textContent = `${hasChildren ? (collapsed ? "\u25B8" : "\u25BE") : "•"} ${folderLabel}`;
    btn.title = t("home_quick_action_title");
    btn.addEventListener("click", () => {
      if (!hasChildren) return;
      if (homeCollapsedFolderIds.has(folder.id)) {
        homeCollapsedFolderIds.delete(folder.id);
      } else {
        homeCollapsedFolderIds.add(folder.id);
      }
      persistHomeState({ collapsedFolderIds: [...homeCollapsedFolderIds] }).catch((error) => {
        console.error("persistHomeState(collapsedFolderIds) failed", error);
      });
      renderHomeConversationList();
    });
    btn.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleHomeFolderContextAction(folder.id).catch((error) => {
        console.error("handleHomeFolderContextAction failed", error);
        setHomeStatus(error?.message || "分类操作失败，请重试。", true);
      });
    });
    attachHomeFolderDropTarget(btn, folder.id);
    nodeEl.appendChild(btn);

    if (!hasChildren || collapsed) return nodeEl;

    const childrenEl = document.createElement("ul");
    childrenEl.className = "home-graph-children";
    childFolders.forEach((childFolder) => {
      const child = renderFolderGraphNode(childFolder.id, depth + 1);
      if (child) childrenEl.appendChild(child);
    });
    childItems.forEach((item) => {
      const leaf = document.createElement("li");
      leaf.className = "home-graph-leaf";
      leaf.appendChild(createHomeConversationNode(item, "graph", depth + 1));
      childrenEl.appendChild(leaf);
    });
    nodeEl.appendChild(childrenEl);
    return nodeEl;
  };

  const rootChildrenEl = document.createElement("ul");
  rootChildrenEl.className = "home-graph-children";
  rootChildrenEl.hidden = homeTreeCollapsed;
  const topFolders = folderChildrenMap.get(HOME_DEFAULT_FOLDER_ID) || [];
  const topItems = grouped.get(HOME_DEFAULT_FOLDER_ID) || [];
  topFolders.forEach((folder) => {
    const node = renderFolderGraphNode(folder.id, 1);
    if (node) rootChildrenEl.appendChild(node);
  });
  topItems.forEach((item) => {
    const leaf = document.createElement("li");
    leaf.className = "home-graph-leaf";
    leaf.appendChild(createHomeConversationNode(item, "graph", 1));
    rootChildrenEl.appendChild(leaf);
  });
  const rootNodeEl = document.createElement("li");
  rootNodeEl.className = "home-graph-node home-graph-root-node tree-depth-0";
  const rootBtn = document.createElement("button");
  rootBtn.type = "button";
  rootBtn.className = "home-graph-node-btn home-graph-root-node-btn tree-depth-0";
  const hasRootChildren = topFolders.length > 0 || topItems.length > 0;
  rootBtn.textContent = `${hasRootChildren ? (homeTreeCollapsed ? "▸" : "▾") : "•"} ${t("home_tree_root")}`;
  rootBtn.title = t("home_quick_action_title");
  rootBtn.addEventListener("click", () => {
    if (!hasRootChildren) return;
    homeTreeCollapsed = !homeTreeCollapsed;
    renderHomeConversationList();
  });
  rootBtn.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleHomeFolderContextAction(HOME_DEFAULT_FOLDER_ID).catch((error) => {
      console.error("handleHomeFolderContextAction(root) failed", error);
      setHomeStatus(error?.message || "分类操作失败，请重试。", true);
    });
  });
  attachHomeFolderDropTarget(rootBtn, HOME_DEFAULT_FOLDER_ID);
  rootNodeEl.append(rootBtn, rootChildrenEl);
  treeRootEl.appendChild(rootNodeEl);
  canvasEl.appendChild(treeRootEl);
  sectionEl.append(headEl, canvasEl);
  return sectionEl;
}

function populateHomeFolderSelect(selectEl, selectedFolderId = HOME_DEFAULT_FOLDER_ID, options = {}) {
  if (!selectEl) return;
  const includeUncategorized = options.includeUncategorized !== false;
  selectEl.innerHTML = "";
  if (includeUncategorized) {
    const option = document.createElement("option");
    option.value = HOME_DEFAULT_FOLDER_ID;
    option.textContent = t("home_uncategorized_title");
    selectEl.appendChild(option);
  }
  getFolderTreeOrder(homeFolders, HOME_DEFAULT_FOLDER_ID).forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = buildSelectFolderLabel(getHomeFolderDisplayName(folder), folder.depth || 0);
    selectEl.appendChild(option);
  });
  selectEl.value = ensureHomeFolderId(selectedFolderId, homeFolders);
}

function getHomeFolderChildrenMap() {
  const map = new Map();
  homeFolders.forEach((folder) => {
    if (!folder?.id || folder.id === HOME_DEFAULT_FOLDER_ID) return;
    const parentId = ensureHomeFolderId(folder.parentId, homeFolders);
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId).push(folder);
  });
  map.forEach((list) => list.sort((a, b) => (a.name || "").localeCompare(b.name || "", currentLocale === "en" ? "en" : "zh")));
  return map;
}

function getHomeConversationFolderGroups(items) {
  const groups = new Map();
  (items || []).forEach((item) => {
    const folderId = ensureHomeFolderId(homeConversationFolderMap[item.conversationId], homeFolders);
    if (!groups.has(folderId)) groups.set(folderId, []);
    groups.get(folderId).push(item);
  });
  groups.forEach((list) => list.sort((a, b) => Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0)));
  return groups;
}

function getHomeTodaySummary(items = homeConversations) {
  const candidates = (Array.isArray(items) ? items : [])
    .map((item) => ({
      item,
      stats: normalizeConversationStudyStats(item?.studyStats)
    }))
    .filter(({ item }) => isConcreteConversationId(normalizeConversationId(item?.conversationId || item?.url || "")));

  const totals = candidates.reduce(
    (acc, { stats }) => {
      acc.pending += stats.pendingCount;
      acc.due += stats.dueCount;
      acc.review += stats.reviewDueCount;
      acc.notes += stats.noteCount;
      acc.entries += stats.entryCount;
      return acc;
    },
    { pending: 0, due: 0, review: 0, notes: 0, entries: 0 }
  );

  const reviewTarget = candidates
    .filter(({ stats }) => stats.reviewDueCount > 0)
    .sort((a, b) => {
      if (b.stats.reviewDueCount !== a.stats.reviewDueCount) return b.stats.reviewDueCount - a.stats.reviewDueCount;
      return Number(b.item?.updatedAt || 0) - Number(a.item?.updatedAt || 0);
    })[0] || null;

  const studyTarget = candidates
    .filter(({ stats }) => stats.pendingCount > 0)
    .sort((a, b) => {
      if (b.stats.pendingCount !== a.stats.pendingCount) return b.stats.pendingCount - a.stats.pendingCount;
      return Number(b.item?.updatedAt || 0) - Number(a.item?.updatedAt || 0);
    })[0] || null;

  return { totals, reviewTarget, studyTarget };
}

async function openHomeStudyTarget(item, mode = "study") {
  const conversationId = normalizeConversationId(item?.conversationId || item?.url || "");
  if (!isConcreteConversationId(conversationId)) return;
  const displayTitle = getConversationDisplayTitle(item);
  await openWorkspaceConversation(conversationId, {
    requestSnapshot: true,
    fallbackTitle: displayTitle,
    detailMode: "branch"
  });
  if (mode === "review") {
    setStudyScopeMode("review");
    await pickSpacedReviewNode();
    if (selectedEntryKey) setSubQuestionWorkbenchOpen(true);
  }
}

function renderHomeTodayPanel(items = homeConversations) {
  if (!(homeTodayPanelEl instanceof HTMLElement)) return;
  const { totals, reviewTarget, studyTarget } = getHomeTodaySummary(items);
  const hasWork = totals.pending > 0 || totals.review > 0 || totals.notes > 0;

  homeTodayPanelEl.innerHTML = "";
  homeTodayPanelEl.hidden = !homeConversations.length;
  if (!homeConversations.length) return;

  const head = document.createElement("div");
  head.className = "home-today-head";
  const titleWrap = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "home-today-eyebrow";
  eyebrow.textContent = currentLocale === "en" ? "Today" : "\u4eca\u65e5\u5b66\u4e60";
  const title = document.createElement("h2");
  title.className = "home-today-title";
  title.textContent = hasWork
    ? currentLocale === "en" ? "Continue where learning needs action" : "\u5148\u590d\u4e60\uff0c\u518d\u7ee7\u7eed\u5b66\u4e60"
    : currentLocale === "en" ? "No pending study tasks" : "\u4eca\u5929\u6ca1\u6709\u5f85\u5904\u7406\u5b66\u4e60\u4efb\u52a1";
  titleWrap.append(eyebrow, title);

  const stats = document.createElement("div");
  stats.className = "home-today-stats";
  [
    [currentLocale === "en" ? "Review" : "\u5f85\u590d\u4e60", totals.review],
    [currentLocale === "en" ? "To study" : "\u5f85\u5b66", totals.pending],
    [currentLocale === "en" ? "Notes" : "\u7b14\u8bb0", totals.notes]
  ].forEach(([label, value]) => {
    const pill = document.createElement("div");
    pill.className = "home-today-pill";
    const labelEl = document.createElement("span");
    labelEl.className = "home-today-pill-label";
    labelEl.textContent = label;
    const valueEl = document.createElement("strong");
    valueEl.className = "home-today-pill-value";
    valueEl.textContent = String(value);
    pill.append(labelEl, valueEl);
    stats.appendChild(pill);
  });
  head.append(titleWrap);

  const actions = document.createElement("div");
  actions.className = "home-today-actions";
  const actionRow = document.createElement("div");
  actionRow.className = "home-today-action-row";

  const reviewBtn = document.createElement("button");
  reviewBtn.type = "button";
  reviewBtn.className = "home-today-action primary";
  reviewBtn.textContent = currentLocale === "en" ? "Review first" : "\u5148\u590d\u4e60";
  reviewBtn.disabled = !reviewTarget;
  reviewBtn.addEventListener("click", () => {
    if (!reviewTarget?.item) return;
    reviewBtn.disabled = true;
    openHomeStudyTarget(reviewTarget.item, "review")
      .catch((error) => {
        console.error("openHomeStudyTarget(review) failed", error);
        setHomeStatus(error?.message || (currentLocale === "en" ? "Failed to open review target." : "\u6253\u5f00\u590d\u4e60\u4efb\u52a1\u5931\u8d25\u3002"), true);
      })
      .finally(() => {
        reviewBtn.disabled = false;
      });
  });

  const studyBtn = document.createElement("button");
  studyBtn.type = "button";
  studyBtn.className = "home-today-action";
  studyBtn.textContent = currentLocale === "en" ? "Continue study" : "\u7ee7\u7eed\u5b66\u4e60";
  studyBtn.disabled = !studyTarget;
  studyBtn.addEventListener("click", () => {
    if (!studyTarget?.item) return;
    studyBtn.disabled = true;
    openHomeStudyTarget(studyTarget.item, "study")
      .catch((error) => {
        console.error("openHomeStudyTarget(study) failed", error);
        setHomeStatus(error?.message || (currentLocale === "en" ? "Failed to open study target." : "\u6253\u5f00\u5b66\u4e60\u4efb\u52a1\u5931\u8d25\u3002"), true);
      })
      .finally(() => {
        studyBtn.disabled = false;
      });
  });

  const hint = document.createElement("p");
  hint.className = "home-today-hint";
  const target = reviewTarget || studyTarget;
  hint.textContent = target
    ? `${currentLocale === "en" ? "Suggested" : "\u5efa\u8bae"}: ${clampText(getConversationDisplayTitle(target.item), 34)}`
    : currentLocale === "en" ? "Open any conversation below to add new notes." : "\u53ef\u4ece\u4e0b\u65b9\u9009\u62e9\u4e3b\u5bf9\u8bdd\u7ee7\u7eed\u6574\u7406\u3002";

  actionRow.append(reviewBtn, studyBtn);
  actions.append(actionRow, hint);
  homeTodayPanelEl.append(head, stats, actions);
}

function createHomeFolderTreeSection(items, variant = "tree") {
  const isMindmap = variant === "mindmap";
  const sectionEl = document.createElement("li");
  sectionEl.className = isMindmap ? "home-mindmap" : "home-tree-group";

  const headEl = document.createElement("div");
  headEl.className = isMindmap ? "home-mindmap-root-wrap" : "home-tree-head";
  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = isMindmap ? "home-mindmap-root" : "home-tree-toggle";
  toggleBtn.classList.add("tree-depth-0");
  toggleBtn.textContent = `${homeTreeCollapsed ? "\u25B8" : "\u25BE"} ${t("home_tree_root")}`;
  toggleBtn.title = t("home_quick_action_title");
  toggleBtn.addEventListener("click", () => {
    homeTreeCollapsed = !homeTreeCollapsed;
    renderHomeConversationList();
  });
  toggleBtn.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleHomeFolderContextAction(HOME_DEFAULT_FOLDER_ID).catch((error) => {
      console.error("handleHomeFolderContextAction(root tree) failed", error);
      setHomeStatus(error?.message || "分类操作失败，请重试。", true);
    });
  });
  attachHomeFolderDropTarget(toggleBtn, HOME_DEFAULT_FOLDER_ID);
  const countEl = document.createElement("span");
  countEl.className = isMindmap ? "home-mindmap-root-count" : "home-tree-count";
  countEl.textContent = t("home_conversation_count", { count: items.length });
  headEl.append(toggleBtn, countEl);

  const wrapperEl = document.createElement("ul");
  wrapperEl.className = isMindmap ? "home-mindmap-branches" : "home-tree-node-list";
  wrapperEl.hidden = homeTreeCollapsed;

  const folderChildrenMap = getHomeFolderChildrenMap();
  const grouped = getHomeConversationFolderGroups(items);
  const allFolderIds = new Set(homeFolders.map((folder) => folder.id));
  homeCollapsedFolderIds = new Set([...homeCollapsedFolderIds].filter((id) => allFolderIds.has(id)));

  const renderFolderNode = (folderId, parentList, depth = 0) => {
    const folder = homeFolders.find((item) => item.id === folderId);
    if (!folder) return;
    const li = document.createElement("li");
    li.className = isMindmap ? "home-mindmap-branch" : "home-tree-group";
    li.classList.add(getTreeDepthClass(depth));
    const head = document.createElement("div");
    head.className = isMindmap ? "home-mindmap-branch-head" : "home-tree-head";
    const collapsed = homeCollapsedFolderIds.has(folder.id);
    const childFolders = folderChildrenMap.get(folder.id) || [];
    const childItems = grouped.get(folder.id) || [];
    const hasChildren = childFolders.length > 0 || childItems.length > 0;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = isMindmap ? "home-mindmap-branch-toggle" : "home-tree-toggle";
    btn.classList.add(getTreeDepthClass(depth));
    const folderLabel = folder.id === HOME_DEFAULT_FOLDER_ID ? t("home_uncategorized_title") : folder.name;
    const prefix = isMindmap ? "" : `${"  ".repeat(Math.min(depth, 8))}`;
    btn.textContent = `${hasChildren ? (collapsed ? "\u25B8" : "\u25BE") : "•"} ${prefix}${folderLabel}`;
    btn.title = t("home_quick_action_title");
    btn.addEventListener("click", () => {
      if (!hasChildren) return;
      if (homeCollapsedFolderIds.has(folder.id)) {
        homeCollapsedFolderIds.delete(folder.id);
      } else {
        homeCollapsedFolderIds.add(folder.id);
      }
      persistHomeState({ collapsedFolderIds: [...homeCollapsedFolderIds] }).catch((error) => {
        console.error("persistHomeState(collapsedFolderIds) failed", error);
      });
      renderHomeConversationList();
    });
    btn.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleHomeFolderContextAction(folder.id).catch((error) => {
        console.error("handleHomeFolderContextAction(tree) failed", error);
        setHomeStatus(error?.message || "分类操作失败，请重试。", true);
      });
    });
    attachHomeFolderDropTarget(btn, folder.id);
    const meta = document.createElement("span");
    meta.className = isMindmap ? "home-mindmap-branch-count" : "home-tree-count";
    meta.textContent = String(childItems.length);
    head.append(btn, meta);

    const childrenList = document.createElement("ul");
    childrenList.className = isMindmap ? "home-mindmap-children" : "home-tree-node-list";
    childrenList.hidden = collapsed;
    childFolders.forEach((childFolder) => renderFolderNode(childFolder.id, childrenList, depth + 1));
    childItems.forEach((item) => childrenList.appendChild(createHomeConversationNode(item, variant, depth + 1)));
    li.append(head, childrenList);
    parentList.appendChild(li);
  };

  renderFolderNode(HOME_DEFAULT_FOLDER_ID, wrapperEl, 0);
  sectionEl.append(headEl, wrapperEl);
  return sectionEl;
}

function createHomeTreeSection(items) {
  return createHomeFolderTreeSection(items, "tree");
}

function createHomeGridSection(items) {
  const sectionEl = document.createElement("li");
  sectionEl.className = "home-grid-section";
  const gridEl = document.createElement("ul");
  gridEl.className = "home-grid-list";
  items.forEach((item) => gridEl.appendChild(createHomeConversationNode(item, "grid")));
  sectionEl.appendChild(gridEl);
  return sectionEl;
}

function renderHomeConversationList() {
  if (!homeConversationListEl || !homeEmptyEl) return;
  const inDrillView = Boolean(homeDrillParentConversationId);
  const searchText = normalizeSingleLine(homeSearchText || "", 200).toLowerCase();
  homeConversationListEl.innerHTML = "";
  homeConversationListEl.classList.remove("home-layout-mindmap", "home-layout-tree", "home-layout-grid");
  if (!inDrillView) {
    renderHomeParentFolderOptions(homeParentFolderSelectEl?.value || HOME_DEFAULT_FOLDER_ID);
    renderHomeMoveFolderOptions();
  }

  const visibleConversations = searchText
    ? homeConversations.filter((item) => {
        const source = [
          getConversationDisplayTitle(item),
          item?.latestSummary || "",
          item?.latestQuestion || "",
          getHomeFolderDisplayName(homeFolders.find((folder) => folder.id === ensureHomeFolderId(homeConversationFolderMap[item?.conversationId || ""] || HOME_DEFAULT_FOLDER_ID, homeFolders)))
        ].join(" ").toLowerCase();
        return source.includes(searchText);
      })
    : homeConversations;

  renderHomeTodayPanel(visibleConversations);

  if (!visibleConversations.length) {
    homeEmptyEl.style.display = "block";
    homeEmptyEl.textContent = homeConversations.length && searchText
      ? (currentLocale === "en" ? "No matching conversations." : "没有匹配的对话。")
      : t("home_empty");
    updateHomeSelectionUi();
    return;
  }

  homeEmptyEl.style.display = "none";
  const sortedItems = visibleConversations
    .slice()
    .sort((a, b) => Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0));

  const validConversationIds = new Set(visibleConversations.map((item) => item.conversationId));
  selectedHomeConversationIds = new Set(
    [...selectedHomeConversationIds].filter((conversationId) => validConversationIds.has(conversationId))
  );

  if (inDrillView) {
    homeConversationListEl.classList.add("home-layout-tree");
    if (!homeDrillEntries.length) {
      homeEmptyEl.style.display = "block";
      homeEmptyEl.textContent = t("home_drill_empty");
    } else {
      homeEmptyEl.style.display = "none";
      const listEl = document.createElement("ul");
      listEl.className = "home-tree-node-list";
      getSortedHomeDrillEntries(homeDrillEntries).forEach((entry) => {
        listEl.appendChild(
          createHomeDrillEntryNode(entry, homeDrillParentConversationId, homeDrillParentConversationTitle)
        );
      });
      const wrapEl = document.createElement("li");
      wrapEl.className = "home-tree-group";
      wrapEl.appendChild(listEl);
      homeConversationListEl.appendChild(wrapEl);
    }
  } else {
    if (homeLayoutMode === "grid") {
      homeConversationListEl.classList.add("home-layout-grid");
      homeConversationListEl.appendChild(createHomeGridSection(sortedItems));
    } else {
      homeConversationListEl.classList.add("home-layout-mindmap");
      homeConversationListEl.appendChild(createHomeFolderTreeSection(sortedItems, "mindmap"));
    }
    homeEmptyEl.textContent = t("home_empty");
  }

  updateHomeSelectionUi();
}

async function autoClassifyHomeConversations(items = homeConversations) {
  if (!homeAutoClassifyEnabled) return { moved: 0, createdFolders: 0 };
  const rules = normalizeHomeAutoClassifyRules(homeAutoClassifyRules);
  if (!rules.length || !Array.isArray(items) || !items.length) return { moved: 0, createdFolders: 0 };

  const limitedItems = items.slice(0, HOME_AUTO_CLASSIFY_MAX_SCAN);
  let draftFolders = homeFolders.slice();
  const folderIdByName = new Map();
  draftFolders.forEach((folder) => {
    if (!folder?.id || folder.id === HOME_DEFAULT_FOLDER_ID) return;
    const key = String(folder.name || "").toLowerCase();
    if (key && !folderIdByName.has(key)) {
      folderIdByName.set(key, folder.id);
    }
  });

  let nextConversationFolderMap = null;
  let moved = 0;
  let createdFolders = 0;
  for (const item of limitedItems) {
    const conversationId = normalizeConversationId(item?.conversationId || item?.url || "");
    if (!isConcreteConversationId(conversationId)) continue;

    const currentFolderId = ensureHomeFolderId(homeConversationFolderMap[conversationId], draftFolders);
    if (currentFolderId !== HOME_DEFAULT_FOLDER_ID) continue;

    const fingerprint = buildHomeAutoClassifySourceText(item).slice(0, 280);
    if (!fingerprint) continue;
    if (homeAutoClassifyFingerprintCache.get(conversationId) === fingerprint) continue;
    homeAutoClassifyFingerprintCache.set(conversationId, fingerprint);

    const matchedFolderName = getMatchedHomeAutoCategoryName(item, rules);
    if (!matchedFolderName) continue;

    const folderKey = matchedFolderName.toLowerCase();
    let targetFolderId = folderIdByName.get(folderKey) || "";
    if (!targetFolderId) {
      targetFolderId = normalizeHomeFolderId(createId("hfolder"));
      draftFolders = [
        ...draftFolders,
        { id: targetFolderId, name: matchedFolderName, parentId: HOME_DEFAULT_FOLDER_ID }
      ];
      folderIdByName.set(folderKey, targetFolderId);
      createdFolders += 1;
    }
    if (!nextConversationFolderMap) {
      nextConversationFolderMap = { ...homeConversationFolderMap };
    }
    nextConversationFolderMap[conversationId] = targetFolderId;
    moved += 1;
  }

  const validConversationIds = new Set(
    items
      .map((item) => normalizeConversationId(item?.conversationId || item?.url || ""))
      .filter((id) => isConcreteConversationId(id))
  );
  [...homeAutoClassifyFingerprintCache.keys()].forEach((conversationId) => {
    if (!validConversationIds.has(conversationId)) {
      homeAutoClassifyFingerprintCache.delete(conversationId);
    }
  });

  if (!moved && !createdFolders) return { moved: 0, createdFolders: 0 };
  await persistHomeState({
    folders: draftFolders,
    conversationFolderMap: nextConversationFolderMap || homeConversationFolderMap
  });
  return { moved, createdFolders };
}

async function refreshHomeList(options = {}) {
  const skipSidebarSync = Boolean(options.skipSidebarSync);
  const forceFullCollect = options.forceFullCollect === true;
  const activeTab = await queryActiveGeminiTab();
  if (activeTab?.url) {
    currentAccountScope = getAccountScopeFromUrl(activeTab.url);
  }

  const allStorage = await storageGet(null);
  if (!activeTab?.url) {
    currentAccountScope = pickBestAccountScopeFromStorage(allStorage, currentAccountScope);
  }
  const homeIndexKey = getHomeIndexStorageKey();
  let importedIndex = normalizeHomeCatalogIndex(allStorage?.[homeIndexKey]);
  if (!Object.keys(importedIndex).length) {
    importedIndex = normalizeHomeCatalogIndex(allStorage?.[HOME_INDEX_KEY]);
  }
  let nativeSidebarItems = [];

  let syncCount = 0;
  let addedCount = 0;
  let syncFailed = false;
  if (!skipSidebarSync && activeTab?.id) {
    try {
      const response = await sendMessageWithAutoInject(activeTab.id, {
        type: "GEMINI_LIST_SIDEBAR_CONVERSATIONS",
        maxCount: 420,
        forceFull: forceFullCollect,
        forceRounds: 12
      });
      const sidebarItems = normalizeSidebarCatalogItems(response?.conversations);
      nativeSidebarItems = sidebarItems;
      syncCount = sidebarItems.length;
      if (sidebarItems.length) {
        const merged = mergeHomeCatalogIndex(importedIndex, sidebarItems);
        importedIndex = merged.index;
        addedCount = merged.added;
        if (merged.added || merged.updated) {
          await storageSet({ [homeIndexKey]: importedIndex });
        }
      }
    } catch (error) {
      syncFailed = true;
      console.warn("sidebar catalog sync failed", error);
    }
  }

  const localCatalog = extractConversationCatalog(allStorage);
  let usedCrossScopeFallback = false;
  if (!skipSidebarSync && nativeSidebarItems.length) {
    homeConversations = buildHomeConversationsFromNative(nativeSidebarItems, localCatalog);
  } else {
    homeConversations = mergeConversationCatalog(localCatalog, importedIndex);
  }
  if (!homeConversations.length) {
    const fallbackLocalCatalog = extractConversationCatalog(allStorage, null);
    const fallbackImportedIndex = collectHomeCatalogIndexAcrossScopes(allStorage);
    const fallbackMerged = mergeConversationCatalog(fallbackLocalCatalog, fallbackImportedIndex);
    if (fallbackMerged.length) {
      homeConversations = fallbackMerged;
      usedCrossScopeFallback = true;
    }
  }
  let autoClassifiedCount = 0;
  let autoCreatedFolderCount = 0;
  try {
    const autoResult = await autoClassifyHomeConversations(homeConversations);
    autoClassifiedCount = Number(autoResult?.moved || 0);
    autoCreatedFolderCount = Number(autoResult?.createdFolders || 0);
  } catch (error) {
    console.warn("autoClassifyHomeConversations failed", error);
  }
  latestHomeRefreshTrace = {
    at: Date.now(),
    scope: currentAccountScope,
    skipSidebarSync,
    syncCount,
    addedCount,
    autoClassifiedCount,
    autoCreatedFolderCount,
    syncFailed,
    localCatalogCount: localCatalog.length,
    importedIndexCount: Object.keys(importedIndex || {}).length,
    finalHomeConversationCount: homeConversations.length,
    usedCrossScopeFallback
  };
  preloadRecentConversationSnapshots(allStorage, homeConversations);
  if (options.showStatus) {
    if (syncFailed) {
      setHomeStatus(t("home_status_sync_failed"), true);
    } else if (usedCrossScopeFallback) {
      setHomeStatus("已从其他账号范围恢复对话列表。");
    } else if (syncCount > 0) {
      setHomeStatus(t("home_status_synced", { count: syncCount, added: addedCount }));
    } else if (!homeConversations.length) {
      setHomeStatus(t("home_sync_guide"));
    } else {
      setHomeStatus("");
    }
  }
  renderHomeConversationList();
}

function scheduleHomeSidebarSync(delay = 420) {
  if (homeSidebarSyncTimer) clearTimeout(homeSidebarSyncTimer);
  homeSidebarSyncTimer = setTimeout(() => {
    homeSidebarSyncTimer = null;
    if (homeSidebarSyncInFlight) return;
    if (currentView !== "home") return;
    homeSidebarSyncInFlight = true;
    refreshHomeList({ showStatus: false, skipSidebarSync: false })
      .catch((error) => {
        console.warn("deferred home sidebar sync failed", error);
      })
      .finally(() => {
        homeSidebarSyncInFlight = false;
      });
  }, Math.max(120, Number(delay) || 0));
}

function scheduleHomeRefreshFromTurn() {
  if (homeTurnRefreshInFlight) return;
  if (homeTurnRefreshTimer) clearTimeout(homeTurnRefreshTimer);
  homeTurnRefreshTimer = setTimeout(() => {
    homeTurnRefreshTimer = null;
    homeTurnRefreshInFlight = true;
    refreshHomeList({ showStatus: false, skipSidebarSync: true })
      .catch((error) => {
        console.error("refreshHomeList from turn failed", error);
      })
      .finally(() => {
        homeTurnRefreshInFlight = false;
      });
  }, HOME_TURN_REFRESH_DEBOUNCE_MS);
}

async function addHomeFolder() {
  const name = normalizeHomeFolderName(homeNewFolderInputEl?.value || "");
  if (!name) return;
  const parentId = ensureHomeFolderId(homeParentFolderSelectEl?.value || HOME_DEFAULT_FOLDER_ID, homeFolders);
  const duplicated = homeFolders.find(
    (folder) =>
      ensureHomeFolderId(folder.parentId || HOME_DEFAULT_FOLDER_ID, homeFolders) === parentId &&
      (folder.name || "").toLowerCase() === name.toLowerCase()
  );
  if (duplicated) {
    setHomeStatus(t("home_status_exists", { name }));
    homeNewFolderInputEl.value = "";
    return;
  }

  homeFolders = [...homeFolders, { id: normalizeHomeFolderId(createId("hfolder")), name, parentId }];
  await persistHomeState({ folders: homeFolders });
  homeNewFolderInputEl.value = "";
  if (homeParentFolderSelectEl) homeParentFolderSelectEl.value = parentId;
  setHomeStatus(t("home_status_created", { name }));
  renderHomeConversationList();
}

async function createHomeFolderAndMoveSelected(parentFolderId, rawFolderName) {
  const parentId = ensureHomeFolderId(parentFolderId || HOME_DEFAULT_FOLDER_ID, homeFolders);
  const folderName = normalizeHomeFolderName(rawFolderName || "");
  if (!folderName) {
    setHomeStatus(t("home_quick_name_required"), true);
    return false;
  }

  const parentFolder = homeFolders.find((item) => item.id === parentId);
  const parentLabel = parentId === HOME_DEFAULT_FOLDER_ID ? t("home_tree_root") : getHomeFolderDisplayName(parentFolder);
  let created = false;
  let targetFolder = homeFolders.find(
    (folder) =>
      ensureHomeFolderId(folder.parentId || HOME_DEFAULT_FOLDER_ID, homeFolders) === parentId &&
      (folder.name || "").toLowerCase() === folderName.toLowerCase()
  );
  if (!targetFolder) {
    targetFolder = {
      id: normalizeHomeFolderId(createId("hfolder")),
      name: folderName,
      parentId
    };
    homeFolders = [...homeFolders, targetFolder];
    created = true;
  }

  await persistHomeState({ folders: homeFolders });
  setHomeStatus(
    created
      ? t("home_quick_create_success", { parent: parentLabel, name: targetFolder.name })
      : t("home_status_exists", { name: targetFolder.name })
  );
  renderHomeConversationList();
  return true;
}

async function moveSelectedHomeConversationsToFolder(targetFolderId, options = {}) {
  const allowDefault = options.allowDefault === true;
  if (!targetFolderId) {
    setHomeStatus(t("home_status_select_target"), true);
    return false;
  }
  const normalizedTargetFolderId = ensureHomeFolderId(targetFolderId, homeFolders);
  if (!allowDefault && normalizedTargetFolderId === HOME_DEFAULT_FOLDER_ID) {
    setHomeStatus(t("home_status_select_target"), true);
    return false;
  }
  const selected = [...selectedHomeConversationIds];
  if (!selected.length) {
    setHomeStatus(t("home_status_select_conversations"), true);
    return false;
  }

  selected.forEach((conversationId) => {
    homeConversationFolderMap[conversationId] = normalizedTargetFolderId;
  });
  selected.forEach((conversationId) => {
    selectedHomeConversationIds.delete(conversationId);
  });
  await persistHomeState({ conversationFolderMap: homeConversationFolderMap });
  const targetFolder = homeFolders.find((f) => f.id === normalizedTargetFolderId);
  setHomeStatus(
    t("home_status_moved", { count: selected.length, name: getHomeFolderDisplayName(targetFolder) })
  );
  renderHomeConversationList();
  return true;
}

async function moveSelectedHomeConversations() {
  let targetFolderId = homeMoveFolderSelectEl?.value || "";
  if (!targetFolderId && !homeMoveFolderSelectEl) {
    targetFolderId = await promptHomeMoveTargetFolderId();
  }
  await moveSelectedHomeConversationsToFolder(targetFolderId, { allowDefault: false });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function getTabById(tabId) {
  return new Promise((resolve) => {
    if (!Number.isInteger(tabId) || tabId < 0) {
      resolve(null);
      return;
    }
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(tab || null);
    });
  });
}

async function waitForTabConversation(tabId, targetConversationId, timeoutMs = 2600) {
  const normalizedTarget = normalizeConversationId(targetConversationId);
  if (!normalizedTarget || !Number.isInteger(tabId)) return false;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tab = await getTabById(tabId);
    if (tab && toConversationId(tab.url || "") === normalizedTarget) {
      return true;
    }
    await delay(120);
  }
  return false;
}

async function navigateGeminiTabToConversation(conversationId) {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!isConcreteConversationId(normalizedConversationId)) {
    return { ok: false, reason: "invalid_conversation_id", conversationId: normalizedConversationId, tabId: -1 };
  }
  const tab = await queryActiveGeminiTab();
  if (!tab?.id) {
    return { ok: false, reason: "no_gemini_tab", conversationId: normalizedConversationId, tabId: -1 };
  }
  const currentTabConversationId = toConversationId(tab.url || "");
  if (currentTabConversationId === normalizedConversationId) {
    return { ok: true, reason: "already_on_target", conversationId: normalizedConversationId, tabId: tab.id };
  }

  let messageOk = false;
  try {
    const response = await sendMessageWithAutoInject(tab.id, {
      type: "GEMINI_NAVIGATE_TO_CONVERSATION",
      conversationId: normalizedConversationId
    });
    messageOk = Boolean(response?.ok);
  } catch (error) {
    console.warn("navigateGeminiTabToConversation failed", error);
  }

  const matchedAfterMessage = await waitForTabConversation(tab.id, normalizedConversationId, messageOk ? 2400 : 900);
  if (matchedAfterMessage) {
    return { ok: true, reason: "navigated_by_message", conversationId: normalizedConversationId, tabId: tab.id };
  }

  // Hard fallback: directly update tab URL when in-page navigation did not take effect.
  try {
    await new Promise((resolve) => {
      chrome.tabs.update(tab.id, { url: normalizedConversationId, active: true }, () => resolve());
    });
  } catch (error) {
    console.warn("tabs.update fallback failed", error);
  }
  const matchedAfterUpdate = await waitForTabConversation(tab.id, normalizedConversationId, 5200);
  if (matchedAfterUpdate) {
    return { ok: true, reason: "navigated_by_tabs_update", conversationId: normalizedConversationId, tabId: tab.id };
  }

  return { ok: false, reason: "navigation_not_confirmed", conversationId: normalizedConversationId, tabId: tab.id };
}

async function openWorkspaceConversation(conversationId, options = { requestSnapshot: true, navigateTab: true, fallbackTitle: "", detailMode: "branch" }) {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!isConcreteConversationId(normalizedConversationId)) return;
  showView("workspace");
  setSubQuestionWorkbenchOpen(Boolean(options?.openWorkbench || options?.locateTarget || options?.branchNodeId));
  if (options?.detailMode) {
    setDetailMode(options.detailMode);
  }
  let navigationResult = { ok: true, reason: "skipped", conversationId: normalizedConversationId, tabId: -1 };
  if (options?.navigateTab !== false) {
    try {
      navigationResult = await navigateGeminiTabToConversation(normalizedConversationId);
    } catch (error) {
      navigationResult = { ok: false, reason: error?.message || "navigate_error", conversationId: normalizedConversationId, tabId: -1 };
      console.warn("navigateGeminiTabToConversation failed", error);
    }
  }
  await loadConversation(normalizedConversationId, { fallbackTitle: options?.fallbackTitle || "" });
  await applyTheme(normalizedConversationId);
  await syncBranchComposerModeFromGemini(normalizedConversationId);
  if (!options?.locateTarget && !options?.openWorkbench && !options?.branchNodeId) {
    const passiveHint = takePassiveSelectionHint(normalizedConversationId);
    const hintedEntryKey = findEntryRuntimeKeyByLocateTarget(passiveHint);
    if (hintedEntryKey) {
      await selectEntry(hintedEntryKey, { syncScroll: false, force: true, openWorkbench: false });
    }
  }
  if (options?.locateTarget) {
    const targetEntryKey = findEntryRuntimeKeyByLocateTarget(options.locateTarget);
    if (targetEntryKey) {
      await selectEntry(targetEntryKey, { syncScroll: true, force: true, openWorkbench: true });
      if (options?.branchNodeId) {
        await activateBranchNoteView(options.branchNodeId, targetEntryKey, {
          detailMode: options?.detailMode || "note",
          syncScroll: false
        });
      }
    }
  }
  if (!options?.requestSnapshot) return;
  const tab = Number.isInteger(navigationResult?.tabId) && navigationResult.tabId >= 0
    ? await getTabById(navigationResult.tabId)
    : await queryActiveGeminiTab(normalizedConversationId);
  if (tab?.id && toConversationId(tab.url || "") === normalizedConversationId) {
    requestSnapshotFromTab(tab).catch((error) => {
      console.error("requestSnapshotFromTab in openWorkspaceConversation failed", error);
    });
  }
}

async function openActiveSubConversationFromTab() {
  const activeTab = await queryActiveGeminiTab();
  const conversationId = toConversationId(activeTab?.url || "");
  if (!isConcreteConversationId(conversationId)) {
    setHomeStatus(t("home_status_open_active_fail"), true);
    return;
  }
  await openWorkspaceConversation(conversationId, { requestSnapshot: true });
}

async function navigateToPreviousPageInGeminiTab() {
  const activeTab = await queryActiveGeminiTab(currentConversationId);
  if (!activeTab?.id) return false;

  const response = await sendMessageWithAutoInject(activeTab.id, { type: "GEMINI_NAVIGATE_BACK_PAGE" });
  return Boolean(response?.ok);
}

function normalizePathname(pathname) {
  const normalized = (pathname || "/").replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return normalized || "/";
}

function normalizeAccountScope(scope) {
  const text = String(scope || "").trim().toLowerCase();
  const match = text.match(/^u?(\d+)$/);
  if (match?.[1]) return `u${match[1]}`;
  return DEFAULT_ACCOUNT_SCOPE;
}

function getAccountScopeFromPath(pathname) {
  const normalized = normalizePathname(pathname);
  const match = normalized.match(/^\/u\/(\d+)(?=\/|$)/i);
  return normalizeAccountScope(match?.[1] ? `u${match[1]}` : DEFAULT_ACCOUNT_SCOPE);
}

function getAccountScopeFromUrl(value) {
  if (!value) return DEFAULT_ACCOUNT_SCOPE;
  try {
    const url = new URL(value);
    if (url.hostname !== "gemini.google.com") return DEFAULT_ACCOUNT_SCOPE;
    return getAccountScopeFromPath(url.pathname);
  } catch {
    return DEFAULT_ACCOUNT_SCOPE;
  }
}

function getAccountScopeFromConversationId(conversationId) {
  return getAccountScopeFromUrl(conversationId);
}

function pickBestAccountScopeFromStorage(allStorage, fallbackScope = currentAccountScope) {
  const preferred = normalizeAccountScope(fallbackScope || DEFAULT_ACCOUNT_SCOPE);
  const score = new Map();
  const addScore = (scope, delta) => {
    const key = normalizeAccountScope(scope || DEFAULT_ACCOUNT_SCOPE);
    score.set(key, (score.get(key) || 0) + delta);
  };

  Object.keys(allStorage || {}).forEach((key) => {
    if (key.startsWith(`${HOME_INDEX_KEY}:`)) {
      const raw = key.slice(`${HOME_INDEX_KEY}:`.length);
      const scope = normalizeAccountScope(raw || DEFAULT_ACCOUNT_SCOPE);
      const items = allStorage?.[key];
      const count = items && typeof items === "object" ? Object.keys(items).length : 0;
      addScore(scope, Math.max(1, count));
      return;
    }

    if (!key.startsWith(STORAGE_PREFIX)) return;
    const conversationId = normalizeConversationId(key.slice(STORAGE_PREFIX.length));
    if (!conversationId) return;
    addScore(getAccountScopeFromConversationId(conversationId), 2);
  });

  if (!score.size) return preferred;
  let bestScope = preferred;
  let bestScore = score.get(preferred) || 0;
  score.forEach((value, scope) => {
    if (value > bestScore) {
      bestScope = scope;
      bestScore = value;
    }
  });
  return normalizeAccountScope(bestScope || preferred);
}

function getAccountPath(scope = DEFAULT_ACCOUNT_SCOPE) {
  const normalized = normalizeAccountScope(scope);
  return `/u/${normalized.slice(1)}`;
}

function getHomeStorageKey(scope = currentAccountScope) {
  return `${HOME_KEY}:${normalizeAccountScope(scope)}`;
}

function getHomeIndexStorageKey(scope = currentAccountScope) {
  return `${HOME_INDEX_KEY}:${normalizeAccountScope(scope)}`;
}

function normalizeConversationId(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname !== "gemini.google.com") return "";
    const path = normalizePathname(url.pathname);
    const scope = getAccountScopeFromPath(path);
    const accountPath = getAccountPath(scope);
    const pathWithoutAccount = path.replace(/^\/u\/\d+(?=\/|$)/i, "") || "/";
    const chatMatch = pathWithoutAccount.match(/^\/app\/([^/?#]+)/i);
    if (chatMatch?.[1]) return `${url.origin}${accountPath}/app/${chatMatch[1]}`;
    const queryTokenKeys = ["conversation", "conversation_id", "chat_id", "chat", "cid", "c", "id"];
    for (const key of queryTokenKeys) {
      const valueFromQuery = (url.searchParams.get(key) || "").trim();
      if (/^[a-z0-9_-]{6,}$/i.test(valueFromQuery)) {
        return `${url.origin}${accountPath}/app/${valueFromQuery}`;
      }
    }
    if (/^\/app$/i.test(pathWithoutAccount)) return `${url.origin}${accountPath}/app`;
    if (pathWithoutAccount === "/") return `${url.origin}${accountPath}`;
    return `${url.origin}${accountPath}${pathWithoutAccount}`;
  } catch {
    return "";
  }
}

function toConversationId(urlText) {
  return normalizeConversationId(urlText);
}

function toStorageKey(conversationId) {
  return `${STORAGE_PREFIX}${conversationId}`;
}

function toBranchKey(conversationId, entryToken) {
  return `${BRANCH_PREFIX}${conversationId}:${entryToken}`;
}

function rememberBranchThreadCache(key, messages) {
  if (!key) return;
  branchThreadMemoryCache.set(key, Array.isArray(messages) ? messages.slice(-MAX_BRANCH_MESSAGES) : []);
  if (branchThreadMemoryCache.size > BRANCH_THREAD_CACHE_MAX_SIZE) {
    const oldest = branchThreadMemoryCache.keys().next().value;
    if (oldest) branchThreadMemoryCache.delete(oldest);
  }
}

function normalizeSingleLine(value, maxLen = 120) {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function normalizeMultiline(value) {
  return (value || "").replace(/\r\n/g, "\n").trim();
}

function stripSpeakerPrefix(text, role = "any") {
  let result = (text || "").replace(/^[\u200B-\u200D\uFEFF]+/g, "").trim();
  if (!result) return "";

  if (role === "any" || role === "assistant") {
    result = result.replace(/^(?:gemini|assistant)\s*(?:说|回复|回答|said|replied|responded)?\s*[:：-]?\s*/i, "");
    result = result.replace(/^(?:说|回复|回答|said|replied|responded)\s*[:：-]\s*/i, "");
  }
  if (role === "any" || role === "user") {
    result = result.replace(/^(?:你|您|you)\s*(?:说|问|提问|输入|said|asked)?\s*[:：-]?\s*/i, "");
    result = result.replace(/^(?:问|提问|输入|asked)\s*[:：-]\s*/i, "");
  }
  return result.replace(/^[\u200B-\u200D\uFEFF]+/g, "").trim();
}

function safeText(value) {
  return stripSpeakerPrefix((value || "").replace(/\s+/g, " ").trim(), "any");
}

function summarize(text) {
  const normalized = safeText(text);
  if (!normalized) return t("no_content");
  if (normalized.length <= MAX_SUMMARY_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_SUMMARY_LENGTH)}...`;
}

function normalizeConversationTitle(value) {
  const normalized = normalizeSingleLine(value, MAX_CONVERSATION_TITLE_LENGTH)
    .replace(/\s*-\s*Google Gemini\s*$/i, "")
    .trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return "";
  if (/^\/(?:u\/\d+\/)?app(?:\/|$)/i.test(normalized)) return "";
  return normalized;
}

function pickConversationTitle(...candidates) {
  for (const candidate of candidates) {
    const normalized = normalizeConversationTitle(candidate || "");
    if (normalized) return normalized;
  }
  return "";
}

function normalizeNodeTitle(value) {
  return normalizeSingleLine(value, MAX_NODE_TITLE_LENGTH);
}

function normalizeStudyNote(value) {
  return normalizeMultiline(value || "").slice(0, MAX_STUDY_NOTE_LENGTH);
}

function normalizeFolderName(value) {
  return normalizeSingleLine(value, MAX_FOLDER_NAME_LENGTH);
}

function normalizeFolderId(value) {
  const raw = normalizeSingleLine(value, 64).toLowerCase();
  const sanitized = raw.replace(/[^a-z0-9_-]/g, "");
  if (sanitized) return sanitized;
  return createId("folder");
}

function normalizeFolders(rawFolders) {
  const result = [{ id: DEFAULT_FOLDER_ID, name: DEFAULT_FOLDER_NAME, parentId: "" }];
  const seen = new Set([DEFAULT_FOLDER_ID]);
  const blockedNames = new Set(["未分类", "uncategorized"]);
  if (!Array.isArray(rawFolders)) return result;

  const staged = [];
  rawFolders.forEach((item) => {
    const name = normalizeFolderName(item?.name || "");
    if (!name) return;
    if (blockedNames.has(name.toLowerCase())) return;
    let id = normalizeFolderId(item?.id || "");
    if (id === DEFAULT_FOLDER_ID) id = createId("folder");
    if (seen.has(id)) return;
    seen.add(id);
    staged.push({
      id,
      name,
      parentId: normalizeFolderId(item?.parentId || "")
    });
  });
  const validIds = new Set([DEFAULT_FOLDER_ID, ...staged.map((item) => item.id)]);
  staged.forEach((item) => {
    const parentId = item.parentId && item.parentId !== item.id && validIds.has(item.parentId) ? item.parentId : DEFAULT_FOLDER_ID;
    result.push({ id: item.id, name: item.name, parentId });
  });
  return result;
}

function normalizeCollapsedFolderIds(rawIds, folders = currentFolders) {
  if (!Array.isArray(rawIds)) return [];
  const validIds = new Set((folders || []).map((folder) => folder.id));
  const result = [];
  rawIds.forEach((id) => {
    if (typeof id !== "string") return;
    if (!validIds.has(id)) return;
    if (result.includes(id)) return;
    result.push(id);
  });
  return result;
}

function normalizeManualBranchClassifiedEntryKeys(raw) {
  if (!Array.isArray(raw)) return [];
  const result = [];
  raw.forEach((item) => {
    const key = normalizeSingleLine(item || "", 200);
    if (!key || result.includes(key)) return;
    result.push(key);
  });
  return result;
}

function normalizeManualBranchClassifiedEntryOwners(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const result = {};
  Object.keys(source).forEach((keyRaw) => {
    const key = normalizeSingleLine(keyRaw || "", 260);
    const value = normalizeSingleLine(source[keyRaw] || "", 240);
    if (!key || !value) return;
    result[key] = value;
  });
  return result;
}

function getManualBranchClassifyToken(entry) {
  const token = normalizeSingleLine(getBranchEntryToken(entry), 240);
  return token ? `tok:${token}` : "";
}

function getManualBranchClassifyTokenCandidates(entry) {
  const tokens = getBranchEntryTokenCandidates(entry)
    .map((token) => normalizeSingleLine(token || "", 240))
    .filter(Boolean);
  return tokens.map((token) => `tok:${token}`);
}

function isEntryManuallyClassified(entry) {
  if (!entry?._runtimeKey) return false;
  // Backward compatibility: old versions persisted runtime keys directly.
  if (manualBranchClassifiedEntryKeys.has(entry._runtimeKey)) return true;
  const tokenCandidates = getManualBranchClassifyTokenCandidates(entry);
  if (tokenCandidates.some((token) => manualBranchClassifiedEntryKeys.has(token))) return true;
  if (tokenCandidates.some((token) => normalizeSingleLine(manualBranchClassifiedEntryOwners[token] || "", 240))) return true;
  return false;
}

function normalizeBranchNodeNotes(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const normalized = {};
  Object.keys(source).forEach((nodeIdRaw) => {
    const nodeId = normalizeSingleLine(nodeIdRaw || "", 120);
    if (!nodeId || nodeId === "__root__") return;
    const item = source[nodeIdRaw] && typeof source[nodeIdRaw] === "object" ? source[nodeIdRaw] : {};
    const studyNote = normalizeStudyNote(item.studyNote || item.note || "");
    const studyNoteImage = typeof item.studyNoteImage === "string" ? item.studyNoteImage : "";
    const sourceEntryKey = normalizeSingleLine(item.sourceEntryKey || "", 200);
    if (!studyNote && !studyNoteImage) return;
    normalized[nodeId] = {
      studyNote,
      studyNoteImage,
      sourceEntryKey,
      updatedAt: Number(item.updatedAt) || Date.now()
    };
  });
  return normalized;
}

function getActiveBranchNodeIdForNote() {
  const nodeId = normalizeSingleLine(branchTreeSelectedNodeId || "", 120);
  if (!nodeId || nodeId === "__root__" || nodeId.startsWith(BRANCH_TREE_ENTRY_NODE_PREFIX)) return "";
  return nodeId;
}

function getActiveBranchNodeMessage(messages = currentBranchMessages, preferredEntryKey = selectedEntryKey) {
  const selectedNodeId = normalizeSingleLine(branchTreeSelectedNodeId || "", 120);
  if (selectedNodeId && selectedNodeId !== "__root__" && !selectedNodeId.startsWith(BRANCH_TREE_ENTRY_NODE_PREFIX)) {
    const selectedMessage = findBranchQuestionMessageById(selectedNodeId, messages);
    if (selectedMessage) return selectedMessage;
  }
  const targetEntryKey = normalizeSingleLine(preferredEntryKey || "", 200);
  if (targetEntryKey) {
    const scopedUserMessages = (Array.isArray(messages) ? messages : []).filter((message) => {
      if (!message || message.role !== "user") return false;
      const sourceKey = resolveBranchMessageSourceEntryKey(message);
      if (sourceKey && sourceKey === targetEntryKey) return true;
      const answerKey = resolveBranchQuestionAnswerEntryKey(message);
      return answerKey === targetEntryKey;
    });
    if (scopedUserMessages.length) return scopedUserMessages[scopedUserMessages.length - 1];
    // When a target entry is specified but no branch message matches it yet,
    // avoid falling back to stale messages from another entry.
    return null;
  }
  const userMessages = (Array.isArray(messages) ? messages : []).filter((message) => message?.role === "user");
  if (!userMessages.length) return null;
  return userMessages[userMessages.length - 1] || null;
}

function getActiveBranchNodeDisplayTitle() {
  const message = getActiveBranchNodeMessage();
  const title = stripSpeakerPrefix(message?.text || "", "user");
  return clampText(normalizeSingleLine(title, 240), 56);
}

function getBranchNodeMessageById(nodeId, messagesList = []) {
  const normalizedNodeId = normalizeSingleLine(nodeId || "", 120);
  if (!normalizedNodeId) return null;
  for (const messages of messagesList) {
    if (!Array.isArray(messages) || !messages.length) continue;
    const matched = findBranchQuestionMessageById(normalizedNodeId, messages);
    if (matched) return matched;
  }
  return null;
}

function getBranchNodeNoteTitle(nodeId, fallbackEntryKey = "") {
  const message = getBranchNodeMessageById(nodeId, [currentBranchMessages, currentConversationBranchIndexMessages]);
  const title = stripSpeakerPrefix(message?.text || "", "user");
  if (title) return clampText(normalizeSingleLine(title, 240), 56);
  const fallbackEntry = getEntryByRuntimeKey(normalizeSingleLine(fallbackEntryKey || "", 200));
  return fallbackEntry ? getEntryTitle(fallbackEntry) : t("untitled_node");
}

function getBranchNodeNoteSourceEntryKey(nodeId, fallbackEntryKey = "") {
  const message = getBranchNodeMessageById(nodeId, [currentBranchMessages, currentConversationBranchIndexMessages]);
  const resolved = normalizeSingleLine(resolveBranchMessageSourceEntryKey(message) || "", 200);
  if (resolved) return resolved;
  return normalizeSingleLine(fallbackEntryKey || "", 200);
}

function normalizeDedupText(value) {
  return stripSpeakerPrefix(value || "", "any")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\u4e00-\u9fa5 ]/g, "")
    .trim();
}

function isNoiseQuestionText(text) {
  const normalized = normalizeDedupText(text || "");
  if (!normalized) return true;
  if (normalized.length < 2) return true;
  const blockedPhrases = [
    "未检测到用户提问",
    "没有检测到用户提问",
    "当前未检测到用户提问",
    "gemini is an ai tool",
    "是一款ai工具",
    "回答未必正确无误",
    "请核实关键信息",
    "ask gemini",
    "show thinking"
  ];
  return blockedPhrases.some((phrase) => normalized.includes(normalizeDedupText(phrase)));
}

function isRenderableEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (isNoiseQuestionText(entry.question || "")) return false;
  return true;
}

function answerFingerprint(text) {
  return normalizeDedupText(text).slice(0, 180);
}

function normalizeEntry(rawEntry) {
  const entry = rawEntry || {};
  const question = stripSpeakerPrefix(entry.question || "", "user");
  const answerMarkdown = stripSpeakerPrefix(entry.answerMarkdown || "", "assistant");
  return {
    ...entry,
    id: entry.id || createId("turn"),
    timestamp: entry.timestamp || Date.now(),
    question,
    answerMarkdown,
    summary: summarize(answerMarkdown || question || entry.summary || ""),
    nodeTitle: normalizeNodeTitle(entry.nodeTitle || ""),
    studyNote: normalizeStudyNote(entry.studyNote || ""),
    folderId: typeof entry.folderId === "string" ? entry.folderId : DEFAULT_FOLDER_ID
  };
}

function stripRuntimeEntry(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const { _runtimeKey, ...rest } = entry;
  return rest;
}

function isVirtualBranchEntry(entry) {
  return Boolean(entry && entry._isVirtualBranch);
}

function getPersistableEntries(entries = currentEntries) {
  return (entries || [])
    .filter((entry) => !isVirtualBranchEntry(entry))
    .filter((entry) => isRenderableEntry(entry))
    .map(stripRuntimeEntry);
}

function assignRuntimeEntryKeys(entries) {
  const indexMap = new Map();
  return (entries || [])
    .filter((raw) => isRenderableEntry(raw))
    .map((raw) => {
    const entry = normalizeEntry(stripRuntimeEntry(raw));
    const baseId = entry.id || createId("turn");
    const count = indexMap.get(baseId) || 0;
    indexMap.set(baseId, count + 1);
    return {
      ...entry,
      _runtimeKey: `${baseId}::${count}`
    };
    });
}

function getEntryByRuntimeKey(entryKey) {
  if (!entryKey) return null;
  return currentEntries.find((entry) => entry._runtimeKey === entryKey) || null;
}

function findEntryByLocateTargetInEntries(entries, target) {
  const list = Array.isArray(entries) ? entries : [];
  if (!target || !list.length) return null;
  const targetEntryId = normalizeSingleLine(target.entryId || "", 200);
  const targetDomIndex = Number.isInteger(target.domIndex) ? target.domIndex : null;
  const targetTimestamp = Number(target.timestamp) || 0;

  if (targetEntryId && Number.isInteger(targetDomIndex)) {
    const strict = list.find(
      (entry) => entry?.id === targetEntryId && Number.isInteger(entry?.domIndex) && entry.domIndex === targetDomIndex
    );
    if (strict) return strict;
  }
  if (targetEntryId) {
    const byId = list.find((entry) => entry?.id === targetEntryId);
    if (byId) return byId;
  }
  if (targetTimestamp > 0) {
    let nearest = null;
    let minDelta = Number.POSITIVE_INFINITY;
    list.forEach((entry) => {
      const ts = Number(entry?.timestamp) || 0;
      if (!ts) return;
      const delta = Math.abs(ts - targetTimestamp);
      if (delta < minDelta) {
        minDelta = delta;
        nearest = entry;
      }
    });
    if (nearest) return nearest;
  }
  return null;
}

function findEntryRuntimeKeyByLocateTarget(target) {
  if (!target || !Array.isArray(currentEntries) || !currentEntries.length) return "";
  const targetEntryId = normalizeSingleLine(target.entryId || "", 200);
  const targetDomIndex = Number.isInteger(target.domIndex) ? target.domIndex : null;
  const targetTimestamp = Number(target.timestamp) || 0;

  if (targetEntryId && Number.isInteger(targetDomIndex)) {
    const strict = currentEntries.find(
      (entry) => entry?.id === targetEntryId && Number.isInteger(entry?.domIndex) && entry.domIndex === targetDomIndex
    );
    if (strict?._runtimeKey) return strict._runtimeKey;
  }

  if (targetEntryId) {
    const byId = currentEntries.find((entry) => entry?.id === targetEntryId);
    if (byId?._runtimeKey) return byId._runtimeKey;
  }

  if (targetTimestamp > 0) {
    let nearest = null;
    let minDelta = Number.POSITIVE_INFINITY;
    currentEntries.forEach((entry) => {
      const ts = Number(entry?.timestamp) || 0;
      if (!ts) return;
      const delta = Math.abs(ts - targetTimestamp);
      if (delta < minDelta) {
        minDelta = delta;
        nearest = entry;
      }
    });
    if (nearest?._runtimeKey) return nearest._runtimeKey;
  }

  return "";
}

function getBranchEntryToken(entry) {
  const virtualToken = normalizeSingleLine(entry?._branchEntryToken || "", 240);
  if (virtualToken) return virtualToken;
  if (!entry?.id) return "";
  const domIndex = Number.isInteger(entry.domIndex) ? entry.domIndex : -1;
  const timestamp = Number(entry.timestamp) || 0;
  // Stable token: avoid volatile text fingerprints so keys survive reloads.
  return `${entry.id}::${domIndex}::${timestamp}`;
}

function getQuestionSigBranchEntryToken(entry) {
  if (!entry?.id) return "";
  const domIndex = Number.isInteger(entry.domIndex) ? entry.domIndex : -1;
  const timestamp = Number(entry.timestamp) || 0;
  const questionSig = normalizeDedupText(entry.question || "").slice(0, 60);
  return `${entry.id}::${domIndex}::${timestamp}::${questionSig}`;
}

function getLegacyBranchEntryToken(entry) {
  if (!entry?.id) return "";
  const domIndex = Number.isInteger(entry.domIndex) ? entry.domIndex : -1;
  return `${entry.id}::${domIndex}`;
}

function getBranchEntryTokenCandidates(entry) {
  const primary = getBranchEntryToken(entry);
  const questionSigToken = getQuestionSigBranchEntryToken(entry);
  const legacy = getLegacyBranchEntryToken(entry);
  const result = [];
  [primary, questionSigToken, legacy].forEach((token) => {
    const normalized = normalizeSingleLine(token || "", 240);
    if (!normalized || result.includes(normalized)) return;
    result.push(normalized);
  });
  return result;
}

function findEntryRuntimeKeyByBranchToken(token) {
  const normalizedToken = normalizeSingleLine(token || "", 240);
  if (!normalizedToken) return "";
  const matched = currentEntries.find((entry) => getBranchEntryTokenCandidates(entry).includes(normalizedToken));
  return matched?._runtimeKey || "";
}

function getManualBranchClassifiedOwnerToken(entry) {
  if (!entry) return "";
  const tokenCandidates = getManualBranchClassifyTokenCandidates(entry);
  for (const token of tokenCandidates) {
    const ownerToken = normalizeSingleLine(manualBranchClassifiedEntryOwners[token] || "", 240);
    if (ownerToken) return ownerToken;
  }
  return "";
}

function getManualBranchOwnerEntryKey(entryOrKey) {
  const entry = typeof entryOrKey === "string" ? getEntryByRuntimeKey(entryOrKey) : entryOrKey;
  if (!entry) return "";
  const ownerToken = getManualBranchClassifiedOwnerToken(entry);
  if (!ownerToken) return "";
  return findEntryRuntimeKeyByBranchToken(ownerToken);
}

function markEntryManuallyClassified(entry, ownerEntryToken = "") {
  if (!entry) return;
  if (entry._runtimeKey) {
    manualBranchClassifiedEntryKeys.add(entry._runtimeKey);
  }
  const manualTokens = getManualBranchClassifyTokenCandidates(entry);
  if (manualTokens.length) {
    manualTokens.forEach((token) => manualBranchClassifiedEntryKeys.add(token));
    if (ownerEntryToken) {
      manualTokens.forEach((token) => {
        manualBranchClassifiedEntryOwners[token] = ownerEntryToken;
      });
    }
    return;
  }
  const fallbackToken = getManualBranchClassifyToken(entry);
  if (fallbackToken) {
    manualBranchClassifiedEntryKeys.add(fallbackToken);
    if (ownerEntryToken) manualBranchClassifiedEntryOwners[fallbackToken] = ownerEntryToken;
  }
}

function rememberPassiveSelectionHint(conversationId, target) {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!isConcreteConversationId(normalizedConversationId) || !target) return;
  passiveSelectionHintByConversation.set(normalizedConversationId, {
    entryId: normalizeSingleLine(target.entryId || "", 200),
    domIndex: Number.isInteger(target.domIndex) ? target.domIndex : null,
    timestamp: Number(target.timestamp) || 0,
    savedAt: Date.now()
  });
}

function takePassiveSelectionHint(conversationId) {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!isConcreteConversationId(normalizedConversationId)) return null;
  const hint = passiveSelectionHintByConversation.get(normalizedConversationId) || null;
  if (hint) passiveSelectionHintByConversation.delete(normalizedConversationId);
  return hint;
}

function getActiveBranchRootEntryKey(entryKey = selectedEntryKey) {
  const normalizedEntryKey = normalizeSingleLine(entryKey || "", 200);
  if (!normalizedEntryKey) return "";
  return normalizeSingleLine(getManualBranchOwnerEntryKey(normalizedEntryKey) || normalizedEntryKey, 200);
}

function getClassifiedEntriesForOwner(ownerEntryKey = getActiveBranchRootEntryKey()) {
  const normalizedOwnerEntryKey = normalizeSingleLine(ownerEntryKey || "", 200);
  if (!normalizedOwnerEntryKey) return [];
  return currentEntries
    .filter((entry) => entry?._runtimeKey && !isVirtualBranchEntry(entry))
    .filter((entry) => entry._runtimeKey !== normalizedOwnerEntryKey)
    .filter((entry) => normalizeSingleLine(getManualBranchOwnerEntryKey(entry) || "", 200) === normalizedOwnerEntryKey)
    .slice()
    .sort((a, b) => {
      const tsDelta = Number(a?.timestamp || 0) - Number(b?.timestamp || 0);
      if (tsDelta !== 0) return tsDelta;
      return (getEntryTitle(a) || "").localeCompare(getEntryTitle(b) || "", currentLocale === "en" ? "en" : "zh");
    });
}

function getStudyCandidateEntries(options = {}) {
  const scopeMode = normalizeStudyScopeMode(options?.scopeMode ?? studyScopeMode);
  const now = Number(options?.now) || Date.now();
  return currentEntries
    .filter((entry) => entry && !isVirtualBranchEntry(entry) && isRenderableEntry(entry))
    .filter((entry) => isEntryInStudyScope(entry, scopeMode, now));
}

function getStudyScopeEmptyMessage(mode = studyScopeMode) {
  const scopeLabel = getStudyScopeLabel(mode);
  if (normalizeStudyScopeMode(mode) === "all") {
    return t("study_helper_empty");
  }
  if (currentLocale === "en") {
    return `No nodes available in ${scopeLabel}.`;
  }
  return `当前模式 ${scopeLabel} 下没有可用节点。`;
}

function getStudyScopeRedirectMessage(entry, mode = studyScopeMode) {
  const scopeLabel = getStudyScopeLabel(mode);
  const title = clampText(getEntryTitle(entry), 20);
  if (currentLocale === "en") {
    return `Switched to a node in ${scopeLabel}: ${title}`;
  }
  return `已切换到 ${scopeLabel} 模式下的节点：${title}`;
}

function ensureEntryMatchesStudyScope(entry, options = {}) {
  const scopeMode = normalizeStudyScopeMode(options?.scopeMode ?? studyScopeMode);
  if (entry && (scopeMode === "all" || isEntryInStudyScope(entry, scopeMode))) {
    return entry;
  }
  const pool = getStudyCandidateEntries({ scopeMode });
  const replacement = pool.find((item) => item?._runtimeKey !== entry?._runtimeKey) || pool[0] || null;
  if (!replacement) {
    if (options.reportEmpty !== false) {
      setStudyHelperStatus(getStudyScopeEmptyMessage(scopeMode), true);
    }
    return null;
  }
  if (selectedEntryKey !== replacement._runtimeKey) {
    selectedEntryKey = replacement._runtimeKey;
    updateSelectedStyle();
  }
  if (options.renderDetail !== false) {
    renderDetail(replacement);
  }
  if (entry && options.announceRedirect !== false && scopeMode !== "all") {
    setStudyHelperStatus(getStudyScopeRedirectMessage(replacement, scopeMode));
  }
  return replacement;
}

function buildEntryStudyTimeText(entry) {
  const baseTime = formatTime(entry?.timestamp);
  const reviewedAt = Number(entry?.reviewedAt || 0);
  const forcedReviewAt = getEntryForcedReviewAt(entry);
  const dueAt = getReviewDueAt(entry);
  if (forcedReviewAt) {
    return `${baseTime} · ${t("study_time_due_now")}`;
  }
  if (!reviewedAt) {
    return `${baseTime} · ${t("study_time_unreviewed")}`;
  }
  if (!dueAt || dueAt <= Date.now()) {
    return `${baseTime} · ${t("study_time_due_now")}`;
  }
  return `${baseTime} · ${t("study_time_next_review", { time: formatTime(dueAt) })}`;
}

function buildVirtualEntriesFromBranchStore(store, conversationId) {
  const prefix = `${BRANCH_PREFIX}${conversationId}:`;
  const entries = [];
  Object.keys(store || {}).forEach((key) => {
    if (!key.startsWith(prefix)) return;
    const token = key.slice(prefix.length);
    if (!token) return;
    const payload = store[key];
    const messages = Array.isArray(payload?.messages) ? payload.messages : Array.isArray(payload) ? payload : [];
    if (!messages.length) return;
    const latestUser = messages
      .slice()
      .reverse()
      .find((message) => message?.role === "user" && normalizeMultiline(message?.text || ""));
    const latestAssistant = messages
      .slice()
      .reverse()
      .find((message) => message?.role === "assistant" && normalizeMultiline(message?.text || ""));
    const latestTimestamp =
      messages.reduce((max, message) => Math.max(max, Number(message?.timestamp) || 0), 0) || Date.now();
    const question = stripSpeakerPrefix(latestUser?.text || "", "user") || t("branch_tree_node");
    const answerMarkdown = stripSpeakerPrefix(latestAssistant?.text || "", "assistant");
    entries.push({
      id: `branch_virtual_${normalizeSingleLine(token, 96).replace(/[^a-zA-Z0-9_-]/g, "_") || createId("virtual")}`,
      domIndex: -1,
      timestamp: latestTimestamp,
      question,
      answerMarkdown,
      summary: summarize(answerMarkdown || question || t("branch_tree_node")),
      nodeTitle: "",
      studyNote: "",
      folderId: DEFAULT_FOLDER_ID,
      _branchEntryToken: token,
      _isVirtualBranch: true
    });
  });
  entries.sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
  return entries;
}

function upsertOptimisticBranchAnswerEntry(sourceEntry, branchMessage, answerText) {
  const source = sourceEntry && typeof sourceEntry === "object" ? sourceEntry : null;
  const messageId = normalizeSingleLine(branchMessage?.id || "", 120);
  const question = stripSpeakerPrefix(branchMessage?.text || "", "user") || t("branch_tree_node");
  const answerMarkdown = stripSpeakerPrefix(answerText || "", "assistant");
  if (!source || !messageId || !question || !answerMarkdown) return "";

  const baseId = `branch_virtual_${messageId.replace(/[^a-zA-Z0-9_-]/g, "_") || createId("virtual")}`;
  const existingIndex = currentEntries.findIndex(
    (entry) => isVirtualBranchEntry(entry) && normalizeSingleLine(entry?._branchQuestionMessageId || "", 120) === messageId
  );
  const existing = existingIndex >= 0 ? currentEntries[existingIndex] : null;
  const runtimeKey = existing?._runtimeKey || `${baseId}::0`;
  const nextEntry = {
    ...(existing || {}),
    ...normalizeEntry({
      id: baseId,
      domIndex: -1,
      timestamp: Date.now(),
      question,
      answerMarkdown,
      summary: summarize(answerMarkdown || question || t("branch_tree_node")),
      nodeTitle: "",
      studyNote: "",
      folderId: ensureValidFolderId(source.folderId, currentFolders)
    }),
    _runtimeKey: runtimeKey,
    _branchEntryToken: `pending:${messageId}`,
    _branchQuestionMessageId: messageId,
    _isVirtualBranch: true
  };

  if (existingIndex >= 0) {
    currentEntries[existingIndex] = nextEntry;
  } else {
    currentEntries.push(nextEntry);
  }
  currentEntries.sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
  entryKeysWithBranchAnswers.add(runtimeKey);
  scheduleTimelineRender();
  return runtimeKey;
}

function ensureValidFolderId(folderId, folders = currentFolders) {
  const validIds = new Set((folders || []).map((folder) => folder.id));
  if (folderId && validIds.has(folderId)) return folderId;
  return DEFAULT_FOLDER_ID;
}

function getFolderNameById(folderId) {
  if (folderId === DEFAULT_FOLDER_ID) return t("uncategorized");
  return currentFolders.find((folder) => folder.id === folderId)?.name || t("uncategorized");
}

function getEntryTitle(entry) {
  const customTitle = normalizeNodeTitle(entry?.nodeTitle || "");
  if (customTitle) return customTitle;
  return summarize(entry?.question || entry?.summary || entry?.answerMarkdown || t("untitled_node"));
}

function getEntrySnippet(entry) {
  const source = safeText(entry?.answerMarkdown || entry?.question || entry?.summary || "");
  if (!source) return "";
  const snippet = summarize(source);
  return snippet === getEntryTitle(entry) ? "" : snippet;
}

/**
 * 鍘婚噸绛栫暐锛? * 1) 鍏堟寜鏃堕棿鎺掑簭锛屼繚璇佷繚鐣欐祦绋嬬ǔ瀹氾紱
 * 2) 浣跨敤鍥炵瓟鏂囨湰鎸囩汗 + 3 鍒嗛挓鏃堕棿妗朵綔涓鸿繎浼煎悓涓€鏉″洖绛旂殑鍒ゅ畾閿紱
 * 3) 鍚岄敭鍐茬獊鏃朵繚鐣欏洖绛旀洿闀跨殑鐗堟湰锛岄伩鍏嶆祦寮忚緭鍑哄鑷寸殑纰庣墖璁板綍銆? */
function dedupeEntries(entries) {
  const result = [];
  const seen = new Map();

  entries
    .slice()
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .forEach((raw) => {
      const entry = normalizeEntry(raw);
      if (!isRenderableEntry(entry)) return;
      const stableId = normalizeSingleLine(entry.id || "", 180);
      const stableDomKey = Number.isInteger(entry.domIndex) ? `dom:${entry.domIndex}` : "";
      const qfp = normalizeDedupText(entry.question || "").slice(0, 120);
      const fp = answerFingerprint(entry.answerMarkdown || "");
      let dedupeKey = "";
      if (stableId || stableDomKey) {
        dedupeKey = `stable:${stableId || "na"}|${stableDomKey || "na"}`;
      } else if (fp && qfp) {
        const bucket = Math.round((entry.timestamp || 0) / (45 * 1000));
        dedupeKey = `weak:${qfp}|${fp}|${bucket}`;
      }
      if (!dedupeKey) {
        result.push(entry);
        return;
      }
      const index = seen.get(dedupeKey);
      if (index === undefined) {
        seen.set(dedupeKey, result.length);
        result.push(entry);
        return;
      }

      const old = result[index];
      if ((entry.answerMarkdown || "").length > (old.answerMarkdown || "").length) {
        result[index] = {
          ...old,
          ...entry,
          id: old.id || entry.id,
          nodeTitle: normalizeNodeTitle(old.nodeTitle || entry.nodeTitle || ""),
          studyNote: normalizeStudyNote(old.studyNote || entry.studyNote || ""),
          studyNoteImage: old.studyNoteImage || entry.studyNoteImage || "",
          interleavedNotes: { ...(old.interleavedNotes || {}), ...(entry.interleavedNotes || {}) },
          folderId: old.folderId || entry.folderId || DEFAULT_FOLDER_ID
        };
      } else {
        // Merge study notes even if answer length is not strictly greater
        result[index] = {
          ...old,
          nodeTitle: normalizeNodeTitle(old.nodeTitle || entry.nodeTitle || ""),
          studyNote: normalizeStudyNote(old.studyNote || entry.studyNote || ""),
          studyNoteImage: old.studyNoteImage || entry.studyNoteImage || "",
          interleavedNotes: { ...(old.interleavedNotes || {}), ...(entry.interleavedNotes || {}) },
          folderId: old.folderId || entry.folderId || DEFAULT_FOLDER_ID
        };
      }
    });

  return result;
}

function formatTime(ts) {
  const date = new Date(ts || Date.now());
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 9)}`;
}

function clampText(value, maxLen) {
  if (!value) return "";
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen);
}

function compactContextText(text, maxLen = 260) {
  const plain = safeText(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return "";
  if (plain.length <= maxLen) return plain;

  const pieces = plain
    .split(/[。！？!?；;]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  let merged = "";
  for (const piece of pieces) {
    const next = merged ? `${merged}；${piece}` : piece;
    if (next.length > maxLen) break;
    merged = next;
    if (merged.length >= maxLen * 0.75) break;
  }

  if (!merged) return plain.slice(0, maxLen);
  return merged;
}

function buildContextDigest(entry) {
  const questionBrief = compactContextText(entry.question || "", 180);
  const answerBrief = compactContextText(entry.answerMarkdown || entry.summary || "", 300);
  const summaryBrief = compactContextText(entry.summary || summarize(entry.answerMarkdown || entry.question || ""), 120);
  return {
    questionBrief,
    answerBrief,
    summaryBrief
  };
}

function storageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(result);
    });
  });
}

function storageSet(value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(value, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

function storageRemove(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

function getEntriesFromSession(session) {
  if (!session || typeof session !== "object") return [];
  if (Array.isArray(session.entries)) return session.entries;
  if (Array.isArray(session.turns)) return session.turns;
  return [];
}

function pickConversationSessions(allStorage, conversationId) {
  const baseId = normalizeConversationId(conversationId);
  if (!baseId) return [];

  const sessions = [];
  Object.entries(allStorage || {}).forEach(([key, value]) => {
    if (!key.startsWith(STORAGE_PREFIX)) return;

    const keyConversation = key.slice(STORAGE_PREFIX.length);
    const sessionId = normalizeConversationId(value?.conversationId || keyConversation);
    if (!sessionId || sessionId !== baseId) return;

    sessions.push({
      key,
      conversationId: sessionId,
      session: value || {},
      entries: getEntriesFromSession(value),
      updatedAt: value?.updatedAt || 0
    });
  });

  return sessions;
}

function queryActiveGeminiTab(preferredConversationId = "") {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      const currentWindowActive = Array.isArray(activeTabs) ? activeTabs[0] : null;
      const currentWindowActiveId = Number.isInteger(currentWindowActive?.id) ? currentWindowActive.id : -1;

      chrome.tabs.query({ url: "https://gemini.google.com/*", currentWindow: true }, (currentWindowTabs) => {
        const localTabs = Array.isArray(currentWindowTabs) ? currentWindowTabs : [];
        const preferredId = toConversationId(preferredConversationId);
        if (preferredId) {
          const localMatched = localTabs
            .filter((tab) => toConversationId(tab.url || "") === preferredId)
            .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
          if (localMatched.length) {
            resolve(localMatched[0]);
            return;
          }
        }

        const exactCurrentLocal = localTabs.find((tab) => Number.isInteger(tab.id) && tab.id === currentWindowActiveId);
        if (exactCurrentLocal) {
          resolve(exactCurrentLocal);
          return;
        }

        const activeLocal = localTabs.find((tab) => tab.active && tab.windowId >= 0);
        if (activeLocal) {
          resolve(activeLocal);
          return;
        }

        if (localTabs.length) {
          const recentLocal = localTabs.slice().sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
          resolve(recentLocal || null);
          return;
        }

        // Fallback to all windows only when current window has no Gemini tab.
        chrome.tabs.query({ url: "https://gemini.google.com/*" }, (tabs) => {
          if (!Array.isArray(tabs) || !tabs.length) {
            resolve(null);
            return;
          }

          if (preferredId) {
            const matched = tabs
              .filter((tab) => toConversationId(tab.url || "") === preferredId)
              .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
            if (matched.length) {
              resolve(matched[0]);
              return;
            }
          }

          const exactCurrent = tabs.find((tab) => Number.isInteger(tab.id) && tab.id === currentWindowActiveId);
          if (exactCurrent) {
            resolve(exactCurrent);
            return;
          }

          const activeTab = tabs.find((tab) => tab.active && tab.windowId >= 0);
          if (activeTab) {
            resolve(activeTab);
            return;
          }

          const recent = tabs.slice().sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
          resolve(recent || null);
        });
      });
    });
  });
}

function isNoReceiverErrorMessage(message) {
  const text = (message || "").toLowerCase();
  return text.includes("receiving end does not exist") || text.includes("could not establish connection");
}

function ensureContentScriptOnTab(tabId) {
  return new Promise((resolve) => {
    if (!Number.isInteger(tabId) || tabId < 0) {
      resolve(false);
      return;
    }

    chrome.runtime.sendMessage({ type: "GEMINI_ENSURE_CONTENT_SCRIPT", tabId }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false);
        return;
      }
      resolve(Boolean(response?.ok));
    });
  });
}

function sendMessageWithAutoInject(tabId, message) {
  return new Promise((resolve, reject) => {
    const trySend = (retried) => {
      chrome.tabs.sendMessage(tabId, message, async (response) => {
        const errText = chrome.runtime.lastError?.message || "";
        if (!errText) {
          resolve(response);
          return;
        }

        if (!retried && isNoReceiverErrorMessage(errText)) {
          const injected = await ensureContentScriptOnTab(tabId);
          if (injected) {
            trySend(true);
            return;
          }
        }

        reject(new Error(errText || "sendMessage failed"));
      });
    };

    trySend(false);
  });
}

function configureMarked() {
  if (!window.marked || typeof window.marked.parse !== "function") return false;

  const renderer = new window.marked.Renderer();
  renderer.html = () => "";

  window.marked.setOptions({
    gfm: true,
    breaks: false,
    renderer
  });

  return true;
}

/**
 * Markdown 瀹夊叏娓叉煋绛栫暐锛? * 1) marked renderer 鐩存帴绂佺敤鍘熺敓 HTML锛? * 2) 浜屾杩囨护鍗遍櫓鏍囩锛坰cript/iframe/...锛夊拰 on* 浜嬩欢灞炴€э紱
 * 3) 闃绘柇 javascript: URL锛屽閾惧己鍒?noopener銆? */
function sanitizeRenderedHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;

  const blockedTags = ["script", "style", "iframe", "object", "embed", "link", "meta", "base", "form"];
  template.content.querySelectorAll(blockedTags.join(",")).forEach((node) => node.remove());

  template.content.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      if (name.startsWith("on")) node.removeAttribute(attr.name);
      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        node.removeAttribute(attr.name);
      }
    });

    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });

  return template.innerHTML;
}

function renderMarkdown(markdownText) {
  if (!detailMarkdownEl) return;
  if (!markedReady) {
    detailMarkdownEl.textContent = markdownText || t("no_content");
    return;
  }

  const rawHtml = window.marked.parse(markdownText || "");
  const safeHtml = sanitizeRenderedHtml(typeof rawHtml === "string" ? rawHtml : "");
  detailMarkdownEl.innerHTML = safeHtml;

  if (window.hljs && typeof window.hljs.highlightElement === "function") {
    detailMarkdownEl.querySelectorAll("pre code").forEach((block) => {
      window.hljs.highlightElement(block);
    });
  }
}

function getDetailMarkdownCacheKey(entryKey, markdownText = "") {
  const text = String(markdownText || "");
  const head = text.slice(0, 80);
  const tail = text.slice(-80);
  return `${entryKey || ""}|${text.length}|${head}|${tail}`;
}

function rememberDetailMarkdownHtmlCache(cacheKey, html) {
  if (!cacheKey) return;
  detailMarkdownHtmlCache.set(cacheKey, html);
  if (detailMarkdownHtmlCache.size > DETAIL_MARKDOWN_CACHE_MAX_SIZE) {
    const oldest = detailMarkdownHtmlCache.keys().next().value;
    if (oldest) detailMarkdownHtmlCache.delete(oldest);
  }
}

function cancelScheduledDetailMarkdownRender() {
  detailMarkdownRenderToken += 1;
  if (detailMarkdownRenderTimer) {
    clearTimeout(detailMarkdownRenderTimer);
    detailMarkdownRenderTimer = null;
  }
}

function scheduleDetailMarkdownRender(entry) {
  if (!detailMarkdownEl || !entry) return;
  const markdownText = String(entry.answerMarkdown || "");
  const entryKey = entry._runtimeKey || "";
  const token = ++detailMarkdownRenderToken;
  if (detailMarkdownRenderTimer) {
    clearTimeout(detailMarkdownRenderTimer);
    detailMarkdownRenderTimer = null;
  }
  if (!markedReady) {
    detailMarkdownEl.textContent = markdownText || t("no_content");
    return;
  }
  const cacheKey = getDetailMarkdownCacheKey(entryKey, markdownText);
  const cachedHtml = detailMarkdownHtmlCache.get(cacheKey);
  if (cachedHtml) {
    detailMarkdownEl.innerHTML = cachedHtml;
    setTimeout(() => {
      if (token !== detailMarkdownRenderToken) return;
      if (window.hljs && typeof window.hljs.highlightElement === "function") {
        detailMarkdownEl.querySelectorAll("pre code").forEach((block) => {
          window.hljs.highlightElement(block);
        });
      }
    }, 0);
    return;
  }
  detailMarkdownRenderTimer = setTimeout(() => {
    detailMarkdownRenderTimer = null;
    if (token !== detailMarkdownRenderToken) return;
    const rawHtml = window.marked.parse(markdownText || "");
    const safeHtml = sanitizeRenderedHtml(typeof rawHtml === "string" ? rawHtml : "");
    if (token !== detailMarkdownRenderToken) return;
    detailMarkdownEl.innerHTML = safeHtml;
    rememberDetailMarkdownHtmlCache(cacheKey, safeHtml);
    setTimeout(() => {
      if (token !== detailMarkdownRenderToken) return;
      if (window.hljs && typeof window.hljs.highlightElement === "function") {
        detailMarkdownEl.querySelectorAll("pre code").forEach((block) => {
          window.hljs.highlightElement(block);
        });
      }
    }, 0);
  }, 0);
}

function getEntryDetailRenderSignature(entry) {
  if (!entry) return `empty:${currentLocale}`;
  const markdown = String(entry.answerMarkdown || "");
  const title = String(getEntryTitle(entry) || "");
  const branchTitle = String(getActiveBranchNodeDisplayTitle() || "");
  const branchNodeId = normalizeSingleLine(branchTreeSelectedNodeId || "", 120);
  const titleSignature = normalizeSingleLine(title, 240);
  const branchTitleSignature = normalizeSingleLine(branchTitle, 240);
  return [
    currentLocale,
    entry._runtimeKey || "",
    Number(entry.timestamp) || 0,
    markdown.length,
    titleSignature,
    branchNodeId,
    branchTitleSignature,
    Number(entry.reviewCount) || 0,
    Number(entry.reviewedAt) || 0
  ].join("|");
}

function getSelectedEntry() {
  return getEntryByRuntimeKey(selectedEntryKey);
}

function refreshEntryTitlesImmediately(entryKey) {
  const entry = getEntryByRuntimeKey(entryKey);
  if (!entry) return;
  const immediateTitle = getEntryTitle(entry) || currentConversationTitle || t("workspace_default_title");
  if (detailTitleEl) detailTitleEl.textContent = immediateTitle;
  if (panelTitleEl) panelTitleEl.textContent = immediateTitle;
  if (workspaceConversationTitleEl) workspaceConversationTitleEl.textContent = immediateTitle;
}

function getContextEntries() {
  const list = [];
  selectedContextEntryKeys.forEach((entryKey) => {
    const entry = getEntryByRuntimeKey(entryKey);
    if (entry) list.push(entry);
  });
  return list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

function getEffectiveContextEntries(preferredEntry = getSelectedEntry()) {
  const merged = [];
  const seen = new Set();
  const pushEntry = (entry) => {
    if (!entry?._runtimeKey || seen.has(entry._runtimeKey)) return;
    seen.add(entry._runtimeKey);
    merged.push(entry);
  };

  getContextEntries().forEach(pushEntry);
  const anchorEntryKey = normalizeSingleLine(preferredEntry?._runtimeKey || selectedEntryKey || "", 200);
  const rootEntryKey = getActiveBranchRootEntryKey(anchorEntryKey);
  const rootEntry = getEntryByRuntimeKey(rootEntryKey);
  if (rootEntry) pushEntry(rootEntry);
  getClassifiedEntriesForOwner(rootEntryKey).forEach(pushEntry);

  merged.sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0));
  return merged;
}

function renderSessionMeta() {
  if (!currentConversationId) {
    if (panelTitleEl) panelTitleEl.textContent = t("workspace_default_title");
    sessionMetaEl.textContent = t("open_gemini_prompt");
    sessionTitleInputEl.value = "";
    if (workspaceConversationTitleEl) workspaceConversationTitleEl.textContent = t("workspace_current_conversation_empty");
    return;
  }

  const shortId = currentConversationId.replace("https://gemini.google.com", "") || "/";
  const branchTitle = getActiveBranchNodeDisplayTitle();
  const selectedEntryTitle = getEntryTitle(getSelectedEntry());
  const displayTitle = branchTitle || selectedEntryTitle || currentConversationTitle || t("workspace_default_title");
  if (panelTitleEl) panelTitleEl.textContent = displayTitle;
  if (workspaceConversationTitleEl) workspaceConversationTitleEl.textContent = displayTitle;
  sessionMetaEl.textContent = t("session_ident", { id: shortId });

  if (document.activeElement !== sessionTitleInputEl) {
    sessionTitleInputEl.value = currentConversationTitle;
  }
}

function renderNodeFolderOptions(selectedFolderId = DEFAULT_FOLDER_ID) {
  if (!nodeFolderSelectEl) return;
  const validFolderId = ensureValidFolderId(selectedFolderId);
  nodeFolderSelectEl.innerHTML = "";
  const baseOption = document.createElement("option");
  baseOption.value = DEFAULT_FOLDER_ID;
  baseOption.textContent = t("uncategorized");
  nodeFolderSelectEl.appendChild(baseOption);
  getFolderTreeOrder(currentFolders, DEFAULT_FOLDER_ID).forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = buildSelectFolderLabel(folder.name, folder.depth || 0);
    nodeFolderSelectEl.appendChild(option);
  });
  nodeFolderSelectEl.value = validFolderId;
}

function renderNodeParentFolderOptions(selectedParentId = DEFAULT_FOLDER_ID) {
  if (!nodeParentFolderSelectEl) return;
  nodeParentFolderSelectEl.innerHTML = "";
  const baseOption = document.createElement("option");
  baseOption.value = DEFAULT_FOLDER_ID;
  baseOption.textContent = t("workspace_tree_root");
  nodeParentFolderSelectEl.appendChild(baseOption);
  getFolderTreeOrder(currentFolders, DEFAULT_FOLDER_ID).forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = buildSelectFolderLabel(folder.name, folder.depth || 0);
    nodeParentFolderSelectEl.appendChild(option);
  });
  nodeParentFolderSelectEl.value = ensureValidFolderId(selectedParentId, currentFolders);
}

function setMoveStatus(message = "", isError = false) {
  if (!moveStatusEl) return;
  moveStatusEl.textContent = message;
  moveStatusEl.style.color = isError ? "#b42318" : "var(--muted)";
}

function setStudyHelperStatus(message = "", isError = false) {
  if (!studyHelperStatusEl) return;
  studyHelperStatusEl.textContent = message;
  studyHelperStatusEl.style.color = isError ? "#b42318" : "var(--muted)";
}

function clearBranchStatusTimer() {
  if (branchStatusTimer) {
    clearInterval(branchStatusTimer);
    branchStatusTimer = null;
  }
}

function setBranchComposerStatus(message = "", isError = false) {
  if (!branchComposerStatusEl) return;
  branchComposerStatusEl.textContent = message;
  branchComposerStatusEl.hidden = !message;
  branchComposerStatusEl.style.color = isError ? "#b42318" : "var(--muted)";
}

function getBranchAskMode(options = {}) {
  const forced = String(options?.askMode || "").trim().toLowerCase();
  if (forced === "quick" || forced === "fast") return "quick";
  if (forced === "deep" || forced === "thinking") return "deep";
  if (forced === "direct" || forced === "standard") return "quick";
  return branchComposerMode === "thinking" ? "deep" : "quick";
}

function setVideoEmbedStatus(message = "", isError = false) {
  if (!videoEmbedStatusEl) return;
  videoEmbedStatusHasError = isError;
  videoEmbedStatusEl.textContent = message;
  videoEmbedStatusEl.style.color = isError ? "#b42318" : "var(--muted)";
}

function isVideoFullscreenActive() {
  return document.fullscreenElement === videoEmbedShellEl;
}

function applyVideoFocusModeUi() {
  if (document.body) {
    document.body.classList.toggle("video-focus-mode", videoEmbedPanelMaximized);
  }
  if (videoFocusLayerEl) {
    videoFocusLayerEl.hidden = !videoEmbedPanelMaximized;
  }
}

function updateVideoFullscreenButtonUi() {
  if (!toggleVideoFullscreenBtnEl) return;
  const active = videoEmbedPanelMaximized;
  const label = active ? t("video_embed_exit_fullscreen") : t("video_embed_fullscreen");
  toggleVideoFullscreenBtnEl.textContent = label;
  toggleVideoFullscreenBtnEl.title = label;
  toggleVideoFullscreenBtnEl.setAttribute("aria-label", label);
}

function setVideoEmbedPanelMaximized(value) {
  videoEmbedPanelMaximized = Boolean(value);
  applyVideoFocusModeUi();
  syncVideoModulePlacement();
  updateVideoFullscreenButtonUi();
}

async function toggleVideoFullscreen() {
  if (videoEmbedPanelMaximized) {
    setVideoEmbedPanelMaximized(false);
    if (isVideoFullscreenActive() && document.exitFullscreen) {
      await document.exitFullscreen();
    }
    setVideoEmbedStatus(t("video_embed_focus_off"));
    return;
  }
  setVideoEmbedPanelMaximized(true);
  setVideoEmbedStatus(t("video_embed_focus_on"));
}

function resolveVideoEmbedSource(rawValue = "") {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;

  const bvidOnly = raw.match(/^(BV[0-9A-Za-z]+)$/i);
  if (bvidOnly) {
    const bvid = bvidOnly[1];
    return {
      embedUrl: `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&page=1`,
      openUrl: `https://www.bilibili.com/video/${encodeURIComponent(bvid)}`
    };
  }

  let url = null;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  if (url.protocol === "http:") url.protocol = "https:";

  const host = url.hostname.toLowerCase();
  const path = url.pathname || "";

  if (host === "www.bilibili.com" || host === "m.bilibili.com" || host.endsWith(".bilibili.com")) {
    const bvidMatch = path.match(/\/video\/(BV[0-9A-Za-z]+)/i);
    if (bvidMatch) {
      const bvid = bvidMatch[1];
      const page = Number.parseInt(url.searchParams.get("p") || "1", 10);
      const validPage = Number.isFinite(page) && page > 0 ? page : 1;
      return {
        embedUrl: `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&page=${validPage}`,
        openUrl: url.toString()
      };
    }
  }

  if (host === "player.bilibili.com" && path.includes("/player.html")) {
    return { embedUrl: url.toString(), openUrl: url.toString() };
  }

  return { embedUrl: url.toString(), openUrl: url.toString() };
}

function syncVideoEmbedUi() {
  if (videoEmbedInputEl && document.activeElement !== videoEmbedInputEl) {
    videoEmbedInputEl.value = currentVideoEmbedUrl || "";
  }
  if (videoEmbedFrameEl) videoEmbedFrameEl.src = currentVideoEmbedUrl || "";
  if (videoEmbedPlaceholderEl) {
    videoEmbedPlaceholderEl.hidden = Boolean(currentVideoEmbedUrl);
  }
  if (!videoEmbedStatusHasError) {
    setVideoEmbedStatus(currentVideoEmbedUrl ? t("video_embed_loaded") : t("video_embed_idle"));
  }
  updateVideoFullscreenButtonUi();
}

async function persistVideoEmbedUrl(url) {
  currentVideoEmbedUrl = normalizeSingleLine(url || "", 1200);
  settingsState.videoEmbedUrl = currentVideoEmbedUrl;
  syncVideoEmbedUi();
  await persistSettingsState();
}

async function loadVideoEmbedFromInput() {
  const inputText = videoEmbedInputEl?.value || "";
  const resolved = resolveVideoEmbedSource(inputText);
  if (!resolved?.embedUrl) {
    setVideoEmbedStatus(t("video_embed_invalid"), true);
    return;
  }
  await persistVideoEmbedUrl(resolved.embedUrl);
}

async function pasteVideoEmbedLink() {
  if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
    setVideoEmbedStatus(t("video_embed_paste_failed"), true);
    return;
  }
  try {
    const text = (await navigator.clipboard.readText()) || "";
    if (!videoEmbedInputEl) return;
    videoEmbedInputEl.value = text.trim();
    await loadVideoEmbedFromInput();
  } catch {
    setVideoEmbedStatus(t("video_embed_paste_failed"), true);
  }
}

async function openVideoEmbedInTab() {
  const inputText = videoEmbedInputEl?.value || "";
  const resolvedInput = resolveVideoEmbedSource(inputText);
  const resolvedCurrent = resolveVideoEmbedSource(currentVideoEmbedUrl);
  const targetUrl = resolvedInput?.openUrl || resolvedCurrent?.openUrl || "";
  if (!targetUrl) {
    setVideoEmbedStatus(t("video_embed_invalid"), true);
    return;
  }
  await chrome.tabs.create({ url: targetUrl });
}

function getReviewIntervalMs(entry) {
  const count = Math.max(0, Number(entry?.reviewCount || 0));
  if (count <= 0) return 6 * 60 * 60 * 1000;
  const hours = Math.min(96, Math.pow(2, Math.min(6, count - 1)) * 6);
  return hours * 60 * 60 * 1000;
}

function getReviewDueAt(entry) {
  const forcedReviewAt = getEntryForcedReviewAt(entry);
  if (forcedReviewAt) return forcedReviewAt;
  const reviewedAt = Number(entry?.reviewedAt || 0);
  if (!reviewedAt) return 0;
  return reviewedAt + getReviewIntervalMs(entry);
}

function updateStudyProgressHint() {
  if (!studyHelperStatusEl) return;
  const studyEntries = getStudyCandidateEntries();
  const total = studyEntries.length;
  if (!total) {
    setStudyHelperStatus(studyScopeMode === "all" ? "" : getStudyScopeEmptyMessage(studyScopeMode));
    return;
  }
  const now = Date.now();
  const due = studyEntries.filter((entry) => isEntryDueForStudy(entry, now)).length;
  const bookmarked = studyEntries.filter((entry) => hasEntryTimelineBookmark(entry)).length;
  const noted =
    studyEntries.filter((entry) => Boolean(normalizeStudyNote(entry.studyNote || "") || entry.studyNoteImage)).length +
    Object.keys(currentBranchNodeNotes || {}).length;
  setStudyHelperStatus(
    t("study_helper_due", {
      scope: getStudyScopeLabel(),
      due,
      total,
      bookmarked,
      noted
    })
  );
}

function renderReviewSprintPanel() {
  if (reviewSprintTitleEl) reviewSprintTitleEl.textContent = getReviewSprintTitleText();
  const remainingEntries = getOrderedReviewEntries("review");
  const remaining = remainingEntries.length;
  const completed = reviewSprintCompletedKeys.size;
  if (reviewSprintMetaEl) {
    reviewSprintMetaEl.textContent =
      currentLocale === "en" ? `${completed} done · ${remaining} left` : `已过 ${completed} · 剩余 ${remaining}`;
  }
  if (startReviewSprintBtnEl) {
    startReviewSprintBtnEl.textContent = getReviewSprintStartLabel();
    startReviewSprintBtnEl.disabled = branchBusy;
  }
  if (nextReviewSprintBtnEl) {
    nextReviewSprintBtnEl.textContent = getReviewSprintNextLabel();
    nextReviewSprintBtnEl.disabled = !reviewSprintActive || !remaining || branchBusy;
  }
  if (markReviewedNextBtnEl) {
    markReviewedNextBtnEl.textContent = getReviewSprintMarkNextLabel();
    markReviewedNextBtnEl.disabled = !reviewSprintActive || !selectedEntryKey || branchBusy;
  }
  if (reviewSprintStatusEl) {
    reviewSprintStatusEl.textContent = remaining
      ? getReviewSprintStatusText(completed, remaining, reviewSprintActive)
      : reviewSprintActive
        ? getReviewSprintStatusText(completed, 0, true)
        : getReviewSprintEmptyText();
  }
}

function renderMistakeNotebook() {
  if (mistakeNotebookTitleEl) mistakeNotebookTitleEl.textContent = getMistakeNotebookTitleText();
  const entries = getMistakeNotebookEntries();
  if (mistakeNotebookMetaEl) mistakeNotebookMetaEl.textContent = getMistakeNotebookMetaText(entries.length);
  if (mistakeNotebookStatusEl) mistakeNotebookStatusEl.textContent = getMistakeNotebookStatusText(entries.length);
  if (!mistakeNotebookListEl || !mistakeNotebookEmptyEl) return;
  mistakeNotebookListEl.innerHTML = "";
  mistakeNotebookEmptyEl.hidden = entries.length > 0;
  mistakeNotebookEmptyEl.textContent = getMistakeNotebookEmptyText();
  if (!entries.length) return;

  entries.slice(0, 12).forEach((entry) => {
    const item = document.createElement("li");
    item.className = "note-history-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "note-history-btn study-pocket-btn";
    button.dataset.entryKey = entry._runtimeKey;
    button.classList.toggle("active", entry._runtimeKey === selectedEntryKey);

    const title = document.createElement("p");
    title.className = "note-history-title";
    title.textContent = clampText(getEntryTitle(entry), 80);

    const meta = document.createElement("p");
    meta.className = "note-history-meta study-pocket-meta";
    const bookmarkLabel = getEntryTimelineBookmarkTypeLabel(entry) || t("study_bookmark_mistake");
    const dueText = getStudyPocketDueText(entry);
    meta.textContent = [bookmarkLabel, dueText].filter(Boolean).join(" · ");

    const excerpt = document.createElement("p");
    excerpt.className = "note-history-excerpt";
    const bookmark = getEntryTimelineBookmark(entry);
    const noteText = normalizeStudyNote(entry.studyNote || "");
    excerpt.textContent = clampText(bookmark?.note || noteText || normalizeSingleLine(entry.question || "", 200), 120);

    button.append(title, meta, excerpt);
    item.appendChild(button);
    mistakeNotebookListEl.appendChild(item);
  });
}

function refreshStudyToolPanels() {
  updateStudyProgressHint();
  if (branchToolsOpen && branchToolsPanelEl && !branchToolsPanelEl.hidden) {
    renderReviewSprintPanel();
  }
  if (isNotePaneVisible() && noteLibraryMode === "mistake") {
    renderNoteHistoryList();
  }
}

function setStudyNoteStatus(message = "", isError = false) {
  if (!studyNoteStatusEl) return;
  studyNoteStatusEl.textContent = message;
  studyNoteStatusEl.style.color = isError ? "#b42318" : "var(--muted)";
}

function setNodeManageMode(mode = "create") {
  nodeManageMode = mode === "move" ? "move" : "create";
  const showCreate = nodeManageMode === "create";
  if (nodeManageCreateRowEl) nodeManageCreateRowEl.hidden = !showCreate;
  if (nodeManageMoveRowEl) nodeManageMoveRowEl.hidden = showCreate;
  if (toggleCreateFolderBtnEl) toggleCreateFolderBtnEl.classList.toggle("active", showCreate);
  if (toggleMoveFolderBtnEl) toggleMoveFolderBtnEl.classList.toggle("active", !showCreate);
}

function setBranchAddMenuOpen(open) {
  branchAddMenuOpen = Boolean(open);
  if (branchAddMenuEl) branchAddMenuEl.hidden = !branchAddMenuOpen;
  if (branchAddBtnEl) {
    branchAddBtnEl.classList.toggle("active", branchAddMenuOpen);
    branchAddBtnEl.setAttribute("aria-expanded", branchAddMenuOpen ? "true" : "false");
  }
  if (branchAddMenuOpen) {
    setBranchModeMenuOpen(false);
  }
}

function setBranchToolsOpen(open) {
  branchToolsOpen = Boolean(open);
  if (branchToolsPanelEl) branchToolsPanelEl.hidden = !branchToolsOpen;
  if (branchToolsBtnEl) {
    branchToolsBtnEl.classList.toggle("active", branchToolsOpen);
    branchToolsBtnEl.setAttribute("aria-expanded", branchToolsOpen ? "true" : "false");
  }
  if (branchToolsOpen) {
    setBranchAddMenuOpen(false);
  }
  if (!branchToolsOpen) {
    setBranchModeMenuOpen(false);
  } else {
    refreshStudyToolPanels();
  }
}

function setBranchModeMenuOpen(open) {
  branchModeMenuOpen = Boolean(open);
  if (branchModeMenuEl) branchModeMenuEl.hidden = !branchModeMenuOpen;
  if (branchModeBtnEl) branchModeBtnEl.setAttribute("aria-expanded", branchModeMenuOpen ? "true" : "false");
  if (branchModeMenuOpen) {
    setBranchAddMenuOpen(false);
  }
}

function renderBranchComposerMode() {
  const thinkingMode = branchComposerMode === "thinking";
  if (branchModeLabelEl) {
    branchModeLabelEl.textContent = thinkingMode ? t("composer_mode_thinking") : t("composer_mode_standard");
  }
  if (branchModeBtnEl) {
    branchModeBtnEl.classList.toggle("active", thinkingMode);
  }
  if (branchModeThinkingBtnEl) branchModeThinkingBtnEl.classList.toggle("active", thinkingMode);
  if (branchModeDirectBtnEl) branchModeDirectBtnEl.classList.toggle("active", !thinkingMode);
}

function setBranchComposerMode(mode = "standard") {
  branchComposerMode = mode === "thinking" ? "thinking" : "standard";
  renderBranchComposerMode();
}

function setDetailMode(mode = "branch") {
  const supportsNoteView = Boolean(detailNoteViewEl);
  const nextMode =
    mode === "settings"
      ? "settings"
      : mode === "note" && supportsNoteView
        ? "note"
        : "branch";
  detailMode = nextMode;

  if (detailBranchViewEl) detailBranchViewEl.hidden = nextMode !== "branch";
  if (detailSettingsViewEl) detailSettingsViewEl.hidden = nextMode !== "settings";
  if (detailNoteViewEl) detailNoteViewEl.hidden = nextMode !== "note";
  if (detailBranchViewEl) detailBranchViewEl.classList.toggle("detail-view-active", nextMode === "branch");
  if (detailSettingsViewEl) detailSettingsViewEl.classList.toggle("detail-view-active", nextMode === "settings");
  if (detailNoteViewEl) detailNoteViewEl.classList.toggle("detail-view-active", nextMode === "note");

  if (openNodeSettingsBtnEl) openNodeSettingsBtnEl.classList.toggle("active", nextMode === "settings");
  if (openNodeNoteBtnEl) openNodeNoteBtnEl.classList.toggle("active", nextMode === "note");

  if (nextMode === "note") {
    renderNoteHistoryList();
  }

  if (nextMode !== "branch") {
    setBranchToolsOpen(false);
    setBranchAddMenuOpen(false);
  }

  window.requestAnimationFrame(() => {
    if (nextMode === "settings" && nodeTitleInputEl && !nodeTitleInputEl.disabled) {
      nodeTitleInputEl.focus();
      return;
    }
    if (nextMode === "note" && studyNoteInputEl && !studyNoteInputEl.disabled) {
      studyNoteInputEl.focus();
    }
  });
}

function updateNodeToolsAvailability(entry) {
  const disabled = !entry;
  if (openNodeSettingsBtnEl) openNodeSettingsBtnEl.disabled = disabled;
  if (openNodeNoteBtnEl) openNodeNoteBtnEl.disabled = false;
  if (disabled && detailMode === "settings") {
    setDetailMode("branch");
  }
}

function invalidateGlobalNoteLibraryCache() {
  globalNoteLibraryCacheDirty = true;
  noteHistoryRenderSignature = "";
}

function buildGlobalNoteLibraryItemKey(item) {
  const conversationId = normalizeConversationId(item?.conversationId || "");
  const entryId = normalizeSingleLine(item?.entryId || "", 120);
  const domIndex = Number.isInteger(item?.domIndex) ? item.domIndex : "";
  const timestamp = Number(item?.timestamp) || 0;
  return `${conversationId}::${entryId}::${domIndex}::${timestamp}`;
}

function buildCurrentBranchNoteHistoryKey(nodeId) {
  return `branch-note::${normalizeSingleLine(nodeId || "", 120)}`;
}

function buildGlobalBranchNoteLibraryItemKey(conversationId, nodeId) {
  return `${normalizeConversationId(conversationId)}::branch-node::${normalizeSingleLine(nodeId || "", 120)}`;
}

function getActiveNoteHistoryButtonKey() {
  const activeNodeId = getActiveBranchNodeIdForNote();
  if (noteLibraryMode === "mistake") {
    return selectedEntryKey ? `mistake:${selectedEntryKey}` : "";
  }
  if (noteLibraryMode !== "all") {
    return activeNodeId ? buildCurrentBranchNoteHistoryKey(activeNodeId) : selectedEntryKey;
  }
  if (activeNodeId && currentConversationId) {
    return buildGlobalBranchNoteLibraryItemKey(currentConversationId, activeNodeId);
  }
  const entry = getSelectedEntry();
  if (!entry || !currentConversationId) return "";
  return buildGlobalNoteLibraryItemKey({
    conversationId: currentConversationId,
    entryId: entry.id,
    domIndex: entry.domIndex,
    timestamp: entry.timestamp
  });
}

function normalizeNoteLibrarySearchText(value) {
  return normalizeDedupText(value || "");
}

function buildNoteLibrarySearchSource(item) {
  return normalizeDedupText([
    item?.conversationTitle || "",
    item?.title || "",
    item?.question || "",
    item?.excerpt || "",
    item?.folderName || ""
  ].join(" "));
}

function filterNoteLibraryItems(items) {
  const query = normalizeNoteLibrarySearchText(noteLibrarySearchText);
  return (items || []).filter((item) => {
    const hasImage = Boolean(item?.hasImage);
    if (noteLibraryContentFilter === "image" && !hasImage) return false;
    if (!query) return true;
    return buildNoteLibrarySearchSource(item).includes(query);
  });
}

function sortNoteLibraryItems(items) {
  const sorted = (items || []).slice();
  sorted.sort((a, b) => {
    const delta = (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0);
    if (delta !== 0) {
      return noteLibrarySortOrder === "asc" ? delta : -delta;
    }
    return String(a?.key || "").localeCompare(String(b?.key || ""));
  });
  return sorted;
}

function setNoteLibraryMeta(count) {
  if (!noteLibraryMetaEl) return;
  noteLibraryMetaEl.textContent = t("note_library_result_count", { count: String(count || 0) });
}

function getNoteLibraryEmptyText() {
  if (normalizeNoteLibrarySearchText(noteLibrarySearchText)) return t("note_library_empty_search");
  if (noteLibraryContentFilter === "image") {
    return currentLocale === "en" ? "No image notes yet." : "还没有图片笔记。";
  }
  if (noteLibraryMode === "mistake") {
    return currentLocale === "en" ? "No mistake nodes yet." : "还没有易错节点。";
  }
  if (noteLibraryMode === "all") {
    return currentLocale === "en"
      ? "No saved notes yet. Keep short text notes or image notes and they will appear here."
      : "还没有保存过任何笔记。先记录关键思路、易错点或配图笔记，它们会出现在这里。";
  }
  return currentLocale === "en"
    ? "Start with the current question. Save key ideas, traps, or an image note here."
    : "从当前题目开始记录吧，可以先写关键思路、易错点，或保存一条配图笔记。";
}

function renderNoteLibraryControls() {
  if (noteLibraryCurrentBtnEl) {
    const isActive = noteLibraryMode === "current";
    noteLibraryCurrentBtnEl.classList.toggle("active", isActive);
    noteLibraryCurrentBtnEl.setAttribute("aria-pressed", isActive ? "true" : "false");
    noteLibraryCurrentBtnEl.textContent = getNoteLibraryCurrentLabel();
  }
  if (noteLibraryAllBtnEl) {
    const isActive = noteLibraryMode === "all";
    noteLibraryAllBtnEl.classList.toggle("active", isActive);
    noteLibraryAllBtnEl.setAttribute("aria-pressed", isActive ? "true" : "false");
    noteLibraryAllBtnEl.textContent = getNoteLibraryAllLabel();
  }
  if (noteLibraryMistakeBtnEl) {
    const isActive = noteLibraryMode === "mistake";
    noteLibraryMistakeBtnEl.classList.toggle("active", isActive);
    noteLibraryMistakeBtnEl.setAttribute("aria-pressed", isActive ? "true" : "false");
    noteLibraryMistakeBtnEl.textContent = getNoteLibraryMistakeLabel();
  }
  if (noteLibraryImageBtnEl) {
    const label = getNoteLibraryContentFilterLabel();
    const isActive = noteLibraryContentFilter === "image";
    noteLibraryImageBtnEl.classList.toggle("active", isActive);
    noteLibraryImageBtnEl.textContent = label;
    noteLibraryImageBtnEl.setAttribute("aria-pressed", isActive ? "true" : "false");
    noteLibraryImageBtnEl.setAttribute("aria-label", label);
  }
  if (noteLibrarySearchInputEl && noteLibrarySearchInputEl.value !== noteLibrarySearchText) {
    noteLibrarySearchInputEl.value = noteLibrarySearchText;
  }
  if (noteLibrarySortBtnEl) {
    const label = getNoteLibrarySortLabel();
    noteLibrarySortBtnEl.textContent = label;
    noteLibrarySortBtnEl.setAttribute("aria-label", label);
    noteLibrarySortBtnEl.setAttribute("aria-pressed", noteLibrarySortOrder === "asc" ? "true" : "false");
  }
  if (noteLibraryReviewBtnEl) {
    const label = getNoteLibraryReviewActionLabel();
    noteLibraryReviewBtnEl.textContent = label;
    noteLibraryReviewBtnEl.setAttribute("aria-label", label);
  }
  if (noteLibraryMarkReviewedBtnEl) {
    const label = getNoteLibraryMarkReviewedLabel();
    noteLibraryMarkReviewedBtnEl.textContent = label;
    noteLibraryMarkReviewedBtnEl.setAttribute("aria-label", label);
  }
  renderNoteLibraryGuide();
}

function clearNoteHistoryList() {
  noteHistoryListEl.innerHTML = "";
  noteHistoryButtonMap.clear();
  activeNoteHistoryButtonEl = null;
  activeNoteHistoryButtonKey = "";
}

function appendNoteHistoryItem(item, onClick) {
  const li = document.createElement("li");
  li.className = "note-history-item";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "note-history-btn";
  noteHistoryButtonMap.set(item.key, btn);

  if (item.conversationTitle) {
    const context = document.createElement("p");
    context.className = "note-history-context";
    context.textContent = item.conversationTitle;
    btn.appendChild(context);
  }

  const head = document.createElement("div");
  head.className = "note-history-item-head";

  const title = document.createElement("p");
  title.className = "note-history-title";
  title.textContent = item.title;
  head.appendChild(title);

  if (item.hasImage) {
    const badge = document.createElement("span");
    badge.className = "note-history-badge";
    badge.textContent = currentLocale === "en" ? "Image" : "图片";
    head.appendChild(badge);
  }

  const meta = document.createElement("p");
  meta.className = "note-history-meta";
  meta.textContent = item.meta;

  const excerpt = document.createElement("p");
  excerpt.className = "note-history-excerpt";
  excerpt.textContent = item.excerpt;

  btn.append(head, meta, excerpt);
  btn.addEventListener("click", onClick);
  li.appendChild(btn);
  noteHistoryListEl.appendChild(li);
}

async function activateBranchNoteView(nodeId, entryKey = "", options = {}) {
  const normalizedNodeId = normalizeSingleLine(nodeId || "", 120);
  if (!normalizedNodeId) return false;
  const targetEntryKey = normalizeSingleLine(entryKey || selectedEntryKey || "", 200);
  if (targetEntryKey) {
    if (targetEntryKey !== selectedEntryKey) {
      await selectEntry(targetEntryKey, { syncScroll: Boolean(options?.syncScroll), force: true });
    }
    await loadBranchThread(targetEntryKey);
  }
  branchTreeSelectedNodeId = normalizedNodeId;
  branchDraftParentNodeId = normalizedNodeId;
  expandBranchPath(normalizedNodeId, getBranchVisibleMessages());
  detailRenderSignature = "";
  renderBranchTreePanel();
  renderBranchThread();
  renderSessionMeta();
  updateBranchMetaText();
  if (selectedEntryKey) renderDetail(selectedEntryKey);
  if (options?.detailMode) setDetailMode(options.detailMode);
  return true;
}

function renderCurrentNoteHistoryList() {
  if (!noteHistoryListEl || !noteHistoryEmptyEl) return;
  renderNoteLibraryControls();
  if (noteLibraryMode === "mistake") {
    const mistakeItems = sortNoteLibraryItems(
      filterNoteLibraryItems(
        getMistakeNotebookEntries().map((entry) => {
          const bookmark = getEntryTimelineBookmark(entry);
          const rawNoteText = normalizeStudyNote(entry.studyNote || "");
          return {
            key: `mistake:${entry._runtimeKey}`,
            entryKey: entry._runtimeKey,
            title: getEntryTitle(entry),
            question: entry.question || "",
            folderName: getFolderNameById(entry.folderId),
            meta: [t("study_bookmark_mistake"), getStudyPocketDueText(entry)].filter(Boolean).join(" · "),
            hasImage: Boolean(entry.studyNoteImage),
            rawNoteText,
            excerpt: clampText(bookmark?.note || rawNoteText || normalizeSingleLine(entry.question || "", 200), 90),
            timestamp: Number(entry.timestamp) || 0
          };
        })
      )
    );
    const signature = [
      currentLocale,
      noteLibraryMode,
      noteLibraryContentFilter,
      noteLibrarySortOrder,
      normalizeNoteLibrarySearchText(noteLibrarySearchText),
      mistakeItems.map((item) => `${item.key}:${item.timestamp}:${item.excerpt}`).join("|")
    ].join("|");
    if (signature === noteHistoryRenderSignature) {
      updateNoteHistoryActiveStyle();
      setNoteLibraryMeta(mistakeItems.length);
      return;
    }
    noteHistoryRenderSignature = signature;
    clearNoteHistoryList();
    noteHistoryEmptyEl.textContent = getNoteLibraryEmptyText();
    noteHistoryEmptyEl.hidden = mistakeItems.length > 0;
    setNoteLibraryMeta(mistakeItems.length);
    mistakeItems.forEach((item) => {
      appendNoteHistoryItem(item, () => {
        selectEntry(item.entryKey, { syncScroll: false }).then(() => {
          setDetailMode("note");
        }).catch((error) => {
          console.error("selectEntry from mistake notebook failed", error);
        });
      });
    });
    updateNoteHistoryActiveStyle();
    return;
  }
  const entryItems = currentEntries
    .filter((entry) => normalizeStudyNote(entry.studyNote || "") || entry.studyNoteImage)
    .map((entry) => ({
      key: entry._runtimeKey,
      entryKey: entry._runtimeKey,
      title: getEntryTitle(entry),
      question: entry.question || "",
      folderName: getFolderNameById(entry.folderId),
      meta: formatTime(entry.timestamp),
      hasImage: Boolean(entry.studyNoteImage),
      rawNoteText: normalizeStudyNote(entry.studyNote || ""),
      excerpt: clampText(
        normalizeStudyNote(entry.studyNote || "") || (entry.studyNoteImage ? (currentLocale === "en" ? "[Image Note]" : "[图片笔记]") : ""),
        90
      ),
      timestamp: Number(entry.timestamp) || 0
    }));
  const branchNoteItems = Object.keys(currentBranchNodeNotes || {}).map((nodeId) => {
    const note = currentBranchNodeNotes[nodeId] || {};
    const sourceEntryKey = getBranchNodeNoteSourceEntryKey(nodeId, note.sourceEntryKey || "");
    const sourceEntry = getEntryByRuntimeKey(sourceEntryKey);
    const rawNoteText = normalizeStudyNote(note.studyNote || "");
    return {
      key: buildCurrentBranchNoteHistoryKey(nodeId),
      entryKey: sourceEntryKey,
      branchNodeId: nodeId,
      title: getBranchNodeNoteTitle(nodeId, sourceEntryKey),
      question: getBranchNodeNoteTitle(nodeId, sourceEntryKey),
      folderName: sourceEntry ? getFolderNameById(sourceEntry.folderId) : t("uncategorized"),
      meta: `${formatTime(note.updatedAt)} | ${t("note_history_branch_tag")}`,
      hasImage: Boolean(note.studyNoteImage),
      rawNoteText,
      excerpt: clampText(rawNoteText || (note.studyNoteImage ? (currentLocale === "en" ? "[Image Note]" : "[图片笔记]") : ""), 90),
      timestamp: Number(note.updatedAt) || 0
    };
  });
  const items = [...entryItems, ...branchNoteItems];
  const filteredItems = sortNoteLibraryItems(filterNoteLibraryItems(items));
  const signature = [
    currentLocale,
    noteLibraryMode,
    noteLibraryContentFilter,
    noteLibrarySortOrder,
    normalizeNoteLibrarySearchText(noteLibrarySearchText),
    filteredItems
      .map((item) => `${item.key}:${item.timestamp}:${item.excerpt}`)
      .join("|")
  ].join("|");

  if (signature === noteHistoryRenderSignature) {
    updateNoteHistoryActiveStyle();
    setNoteLibraryMeta(filteredItems.length);
    return;
  }

  noteHistoryRenderSignature = signature;
  clearNoteHistoryList();
  noteHistoryEmptyEl.textContent = getNoteLibraryEmptyText();
  noteHistoryEmptyEl.hidden = filteredItems.length > 0;
  setNoteLibraryMeta(filteredItems.length);
  if (!filteredItems.length) return;

  filteredItems.forEach((item) => {
    appendNoteHistoryItem(item, () => {
      if (item.branchNodeId) {
        activateBranchNoteView(item.branchNodeId, item.entryKey, { detailMode: "note", syncScroll: false }).catch((error) => {
          console.error("activateBranchNoteView from note history failed", error);
        });
        return;
      }
      selectEntry(item.entryKey, { syncScroll: false }).then(() => {
        setDetailMode("note");
      }).catch((error) => {
        console.error("selectEntry from note history failed", error);
      });
    });
  });
  updateNoteHistoryActiveStyle();
}

function buildConversationBranchMessageLookupFromStore(allStorage, conversationId) {
  const map = new Map();
  const prefix = `${BRANCH_PREFIX}${conversationId}:`;
  Object.keys(allStorage || {}).forEach((key) => {
    if (!key.startsWith(prefix)) return;
    const payload = allStorage[key];
    const messages = Array.isArray(payload?.messages) ? payload.messages : Array.isArray(payload) ? payload : [];
    messages.forEach((message) => {
      if (!message || message.role !== "user") return;
      const nodeId = normalizeSingleLine(message.id || "", 120);
      if (!nodeId || map.has(nodeId)) return;
      map.set(nodeId, message);
    });
  });
  return map;
}

async function getGlobalNoteLibraryItems(force = false) {
  if (!force && !globalNoteLibraryCacheDirty) return globalNoteLibraryItems;

  const allStorage = await storageGet(null);
  const homeIndex = collectHomeCatalogIndexAcrossScopes(allStorage);
  const catalog = collectAllConversationCatalogFromStorage(allStorage);
  const items = [];

  catalog.forEach((record) => {
    const conversationId = normalizeConversationId(record?.conversationId || "");
    if (!conversationId) return;

    const sessions = pickConversationSessions(allStorage, conversationId).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!sessions.length) return;

    const latestSession = sessions[0]?.session || {};
    const folders = normalizeFolders(latestSession.folders || []);
    const folderNameMap = new Map(folders.map((folder) => [folder.id, folder.name]));
    const branchNodeNotes = normalizeBranchNodeNotes(latestSession.branchNodeNotes || {});
    const branchMessageLookup = buildConversationBranchMessageLookupFromStore(allStorage, conversationId);
    const homeRecord = homeIndex[conversationId] || {};
    const conversationTitle = getConversationDisplayTitle({
      conversationId,
      customTitle: record?.customTitle || homeRecord?.customTitle || latestSession?.customTitle || "",
      latestQuestion: record?.latestQuestion || homeRecord?.latestQuestion || latestSession?.latestQuestion || ""
    });

    const conversationEntries = dedupeEntries(sessions.flatMap((item) => item.entries || []).map(normalizeEntry));
    conversationEntries.forEach((entry) => {
      const noteText = normalizeStudyNote(entry.studyNote || "");
      const hasImage = Boolean(entry.studyNoteImage);
      if (!noteText && !hasImage) return;
      const folderId = ensureValidFolderId(entry.folderId, folders);
      const excerpt = noteText || (currentLocale === "en" ? "[Image Note]" : "[图片笔记]");
      items.push({
        key: buildGlobalNoteLibraryItemKey({
          conversationId,
          entryId: entry.id,
          domIndex: entry.domIndex,
          timestamp: entry.timestamp
        }),
        conversationId,
        entryId: entry.id,
        domIndex: entry.domIndex,
        locateTimestamp: Number(entry.timestamp) || 0,
        timestamp: Number(entry.timestamp) || 0,
        conversationTitle,
        title: getEntryTitle(entry),
        question: entry.question || "",
        folderName: folderNameMap.get(folderId) || t("uncategorized"),
        meta: formatTime(entry.timestamp),
        hasImage,
        rawNoteText: noteText,
        excerpt: clampText(excerpt, 90)
      });
    });

    Object.keys(branchNodeNotes).forEach((nodeId) => {
      const note = branchNodeNotes[nodeId] || {};
      const message = branchMessageLookup.get(nodeId) || null;
      const sourceEntry = findEntryByLocateTargetInEntries(conversationEntries, {
        entryId: normalizeSingleLine(message?.sourceEntryId || "", 200),
        domIndex: Number.isInteger(message?.sourceDomIndex) ? message.sourceDomIndex : null,
        timestamp: Number(message?.sourceTimestamp) || 0
      });
      const title = clampText(
        normalizeSingleLine(stripSpeakerPrefix(message?.text || "", "user"), 240) || getEntryTitle(sourceEntry) || t("untitled_node"),
        90
      );
      const noteText = normalizeStudyNote(note.studyNote || "");
      const hasImage = Boolean(note.studyNoteImage);
      items.push({
        key: buildGlobalBranchNoteLibraryItemKey(conversationId, nodeId),
        conversationId,
        branchNodeId: nodeId,
        entryId: normalizeSingleLine(message?.sourceEntryId || sourceEntry?.id || "", 200),
        domIndex: Number.isInteger(message?.sourceDomIndex)
          ? message.sourceDomIndex
          : (Number.isInteger(sourceEntry?.domIndex) ? sourceEntry.domIndex : undefined),
        locateTimestamp: Number(message?.sourceTimestamp) || Number(sourceEntry?.timestamp) || 0,
        timestamp: Number(note.updatedAt) || Number(message?.timestamp) || Number(sourceEntry?.timestamp) || 0,
        conversationTitle,
        title,
        question: title,
        folderName: sourceEntry ? (folderNameMap.get(ensureValidFolderId(sourceEntry.folderId, folders)) || t("uncategorized")) : t("uncategorized"),
        meta: `${formatTime(note.updatedAt)} | ${t("note_history_branch_tag")}`,
        hasImage,
        rawNoteText: noteText,
        excerpt: clampText(noteText || (hasImage ? (currentLocale === "en" ? "[Image Note]" : "[图片笔记]") : ""), 90)
      });
    });
  });

  globalNoteLibraryItems = items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  globalNoteLibraryCacheDirty = false;
  return globalNoteLibraryItems;
}

async function renderGlobalNoteHistoryList() {
  if (!noteHistoryListEl || !noteHistoryEmptyEl) return;
  renderNoteLibraryControls();
  const token = ++noteLibraryRenderToken;
  clearNoteHistoryList();
  noteHistoryEmptyEl.hidden = false;
  noteHistoryEmptyEl.textContent = t("note_library_loading");
  setNoteLibraryMeta(0);

  const items = await getGlobalNoteLibraryItems();
  if (token !== noteLibraryRenderToken || noteLibraryMode !== "all") return;

  const filteredItems = filterNoteLibraryItems(items);
  const sortedItems = sortNoteLibraryItems(filteredItems);
  const signature = [
    currentLocale,
    noteLibraryMode,
    noteLibraryContentFilter,
    noteLibrarySortOrder,
    normalizeNoteLibrarySearchText(noteLibrarySearchText),
    sortedItems.map((item) => `${item.key}:${item.excerpt}`).join("|")
  ].join("|");

  noteHistoryRenderSignature = signature;
  clearNoteHistoryList();
  noteHistoryEmptyEl.textContent = getNoteLibraryEmptyText();
  noteHistoryEmptyEl.hidden = sortedItems.length > 0;
  setNoteLibraryMeta(sortedItems.length);
  if (!sortedItems.length) return;

  sortedItems.forEach((item) => {
    appendNoteHistoryItem(item, () => {
      openWorkspaceConversation(item.conversationId, {
        requestSnapshot: true,
        navigateTab: true,
        fallbackTitle: item.conversationTitle,
        detailMode: "note",
        locateTarget: {
          entryId: item.entryId,
          domIndex: Number.isInteger(item.domIndex) ? item.domIndex : undefined,
          timestamp: Number(item.locateTimestamp) || Number(item.timestamp) || 0
        },
        branchNodeId: item.branchNodeId || ""
      }).catch((error) => {
        console.error("openWorkspaceConversation from note library failed", error);
      });
    });
  });
  updateNoteHistoryActiveStyle();
}

function renderNoteHistoryList() {
  if (noteLibraryMode === "all") {
    renderGlobalNoteHistoryList().catch((error) => {
      console.error("renderGlobalNoteHistoryList failed", error);
      noteHistoryEmptyEl.hidden = false;
      noteHistoryEmptyEl.textContent = getNoteLibraryEmptyText();
      setNoteLibraryMeta(0);
    });
    return;
  }
  renderCurrentNoteHistoryList();
}

function updateNoteHistoryActiveStyle() {
  const nextKey = getActiveNoteHistoryButtonKey();
  if (activeNoteHistoryButtonKey !== nextKey) {
    if (activeNoteHistoryButtonEl) {
      activeNoteHistoryButtonEl.classList.remove("active");
    }
    activeNoteHistoryButtonEl = noteHistoryButtonMap.get(nextKey) || null;
    if (activeNoteHistoryButtonEl) {
      activeNoteHistoryButtonEl.classList.add("active");
    }
    activeNoteHistoryButtonKey = nextKey;
  }
}

function refreshNoteHistoryPanel() {
  noteHistoryRenderSignature = "";
  renderNoteHistoryList();
  updateNoteHistoryActiveStyle();
}

function isNotePaneVisible() {
  return detailMode === "note" || compactWorkspacePane === "note";
}

function renderBulkMoveFolderOptions() {
  if (!bulkMoveFolderSelectEl || !moveSelectedBtnEl) return;

  bulkMoveFolderSelectEl.innerHTML = "";
  const candidates = getFolderTreeOrder(currentFolders, DEFAULT_FOLDER_ID);

  if (!candidates.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = t("move_select_target_placeholder");
    bulkMoveFolderSelectEl.appendChild(option);
    bulkMoveFolderSelectEl.disabled = true;
    moveSelectedBtnEl.disabled = true;
    return;
  }

  candidates.forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = buildSelectFolderLabel(folder.name, folder.depth || 0);
    bulkMoveFolderSelectEl.appendChild(option);
  });
  bulkMoveFolderSelectEl.disabled = false;
  moveSelectedBtnEl.disabled = false;
}

function getSelectedUncategorizedEntryKeys() {
  const selectedKeys = [];
  selectedContextEntryKeys.forEach((entryKey) => {
    const entry = getEntryByRuntimeKey(entryKey);
    if (!entry) return;
    if (ensureValidFolderId(entry.folderId) === DEFAULT_FOLDER_ID) {
      selectedKeys.push(entryKey);
    }
  });
  return selectedKeys;
}

function renderNodeEditor(entry) {
  const renderStudyNoteSurfaceHeader = (targetEntry) => {
    if (!targetEntry) {
      if (studyNoteEyebrowEl) studyNoteEyebrowEl.textContent = t("study_note_eyebrow");
      if (studyNoteTitleEl) studyNoteTitleEl.textContent = t("study_note_title");
      if (noteTitleEl) noteTitleEl.textContent = t("note_title");
      if (noteHistoryTitleEl) noteHistoryTitleEl.textContent = t("note_history_title");
      return;
    }
    const questionTitle = clampText(getEntryTitle(targetEntry) || t("study_note_title"), 72);
    if (studyNoteEyebrowEl) {
      studyNoteEyebrowEl.textContent = currentLocale === "en" ? "Current Question Notes" : "当前题目笔记";
    }
    if (studyNoteTitleEl) studyNoteTitleEl.textContent = questionTitle;
    if (noteTitleEl) noteTitleEl.textContent = currentLocale === "en" ? "Related Notes" : "相关笔记";
    if (noteHistoryTitleEl) noteHistoryTitleEl.textContent = currentLocale === "en" ? "Note Library" : "笔记库";
  };

  if (!entry) {
    renderStudyNoteSurfaceHeader(null);
    if (nodeTitleInputEl) {
      nodeTitleInputEl.value = "";
      nodeTitleInputEl.disabled = true;
    }
    if (nodeFolderSelectEl) nodeFolderSelectEl.disabled = true;
    if (saveNodeMetaBtnEl) saveNodeMetaBtnEl.disabled = true;
    if (studyNoteInputEl) {
      studyNoteInputEl.value = "";
      studyNoteInputEl.disabled = true;
      studyNoteInputEl.placeholder = t("study_note_select_entry_ph");
    }
    currentStudyNoteImageBase64 = "";
    if (studyNoteImagePreviewEl) {
      studyNoteImagePreviewEl.hidden = true;
    }
    if (studyNoteImageEl) {
      studyNoteImageEl.src = "";
    }
    if (uploadStudyNoteImageBtnEl) uploadStudyNoteImageBtnEl.disabled = true;
    if (saveStudyNoteBtnEl) {
      saveStudyNoteBtnEl.disabled = true;
    }
    if (generateStudyNoteBtnEl) {
      generateStudyNoteBtnEl.disabled = true;
    }
    setStudyNoteStatus("");
    ensureCompleteNextButton();
    renderNodeFolderOptions(DEFAULT_FOLDER_ID);
    renderNodeParentFolderOptions(DEFAULT_FOLDER_ID);
    updateNodeToolsAvailability(null);
    if (isNotePaneVisible()) refreshNoteHistoryPanel();
    return;
  }

  renderStudyNoteSurfaceHeader(entry);
  updateNodeToolsAvailability(entry);
  if (nodeTitleInputEl) {
    nodeTitleInputEl.disabled = false;
    nodeTitleInputEl.value = normalizeNodeTitle(entry.nodeTitle || "");
  }
  if (nodeFolderSelectEl) nodeFolderSelectEl.disabled = false;
  if (saveNodeMetaBtnEl) saveNodeMetaBtnEl.disabled = false;
  const activeNodeId = getActiveBranchNodeIdForNote();
  const activeNodeNote = activeNodeId ? currentBranchNodeNotes[activeNodeId] : null;
  if (studyNoteInputEl) {
    studyNoteInputEl.disabled = false;
    studyNoteInputEl.value = normalizeStudyNote(activeNodeNote?.studyNote || entry.studyNote || "");
    studyNoteInputEl.placeholder = t("study_note_ph") || "记录该分问题的关键思路...";
  }
  if (uploadStudyNoteImageBtnEl) uploadStudyNoteImageBtnEl.disabled = false;
  currentStudyNoteImageBase64 = activeNodeNote?.studyNoteImage || entry.studyNoteImage || "";
  if (studyNoteImagePreviewEl) {
    studyNoteImagePreviewEl.hidden = !currentStudyNoteImageBase64;
  }
  if (studyNoteImageEl) {
    studyNoteImageEl.src = currentStudyNoteImageBase64;
  }
  if (saveStudyNoteBtnEl) {
    saveStudyNoteBtnEl.disabled = false;
  }
  if (generateStudyNoteBtnEl) {
    generateStudyNoteBtnEl.disabled = false;
  }
  setStudyNoteStatus("");
  ensureCompleteNextButton();
  renderNodeFolderOptions(entry.folderId || DEFAULT_FOLDER_ID);
  if (isNotePaneVisible()) refreshNoteHistoryPanel();
}

function renderContextNodeList() {
  if (!contextNodeListEl) return;
  contextNodeListEl.innerHTML = "";

  const contextEntries = getEffectiveContextEntries();
  if (!contextEntries.length) {
    const empty = document.createElement("span");
    empty.className = "context-node-empty";
    empty.textContent = t("context_current_only");
    contextNodeListEl.appendChild(empty);
    return;
  }

  contextEntries.slice(-2).forEach((entry) => {
    const item = document.createElement("span");
    item.className = "context-node-chip";
    item.title = getEntryTitle(entry);
    item.textContent = clampText(getEntryTitle(entry), 24);
    contextNodeListEl.appendChild(item);
  });

  if (contextEntries.length > 2) {
    const more = document.createElement("span");
    more.className = "context-node-chip more";
    more.textContent = `+${contextEntries.length - 2}`;
    contextNodeListEl.appendChild(more);
  }
}

function updateBranchMetaText() {
  const branchTitle = getActiveBranchNodeDisplayTitle();
  if (branchTitle) {
    branchMetaEl.textContent = t("current_node_context", { title: branchTitle });
    return;
  }
  const entry = getSelectedEntry();
  if (!entry) {
    branchMetaEl.textContent = t("branch_meta_hint");
    return;
  }
  branchMetaEl.textContent = t("current_node_context", { title: getEntryTitle(entry) });
}

function renderContextSelectionMeta() {
  const count = getContextEntries().length;
  const contextKey = [...selectedContextEntryKeys].sort().join("|");
  const metaSignature = `${currentLocale}|${selectedEntryKey}|${contextKey}|${timelineRenderSignature}`;
  if (metaSignature === contextMetaRenderSignature) return;
  contextMetaRenderSignature = metaSignature;
  if (contextSelectionMetaEl) contextSelectionMetaEl.textContent = t("context_count", { count });
  if (clearContextBtnEl) clearContextBtnEl.disabled = count === 0;
  renderContextNodeList();
  updateBranchMetaText();
  syncContextChecks();
}

function syncContextChecks() {
  timelineListEl.querySelectorAll(".context-toggle-btn").forEach((btn) => {
    const entryKey = btn.dataset.entryKey || "";
    const selected = selectedContextEntryKeys.has(entryKey);
    btn.classList.toggle("active", selected);
    btn.setAttribute("aria-pressed", selected ? "true" : "false");
    btn.textContent = selected ? t("context_selected") : t("context_use");
  });
}

function toggleContextEntry(entryKey, checked) {
  if (!entryKey) return;
  if (checked) {
    selectedContextEntryKeys.add(entryKey);
    if (!selectedEntryKey) {
      selectedEntryKey = entryKey;
      updateSelectedStyle();
      renderDetail(entryKey);
      scheduleBranchThreadLoad(entryKey);
    }
  } else {
    selectedContextEntryKeys.delete(entryKey);
  }
  renderContextSelectionMeta();
  setBranchBusy(branchBusy);
}

function setBranchBusy(busy) {
  branchBusy = busy;
  if (branchComposeEl) branchComposeEl.setAttribute("aria-busy", busy ? "true" : "false");
  const enabled = Boolean(selectedEntryKey || getContextEntries().length) && !busy;
  branchInputEl.disabled = !enabled;
  if (branchInputEl) branchInputEl.placeholder = enabled ? t("branch_input_ph") : t("detail_select_hint");
  branchSendBtnEl.disabled = !enabled;
  const sendLabel = busy ? t("sending") : t("branch_send");
  branchSendBtnEl.title = sendLabel;
  branchSendBtnEl.setAttribute("aria-label", sendLabel);
  if (branchToolsBtnEl) branchToolsBtnEl.disabled = busy;
  if (branchModeBtnEl) branchModeBtnEl.disabled = busy;
  if (branchAddBtnEl) branchAddBtnEl.disabled = busy;
  if (branchUploadImageBtnEl) branchUploadImageBtnEl.disabled = busy;
  if (branchUploadFileBtnEl) branchUploadFileBtnEl.disabled = busy;
  if (branchModeThinkingBtnEl) branchModeThinkingBtnEl.disabled = busy;
  if (branchModeDirectBtnEl) branchModeDirectBtnEl.disabled = busy;
  if (busy) {
    setBranchAddMenuOpen(false);
    setBranchModeMenuOpen(false);
  }
  if (studyActionsBarEl) {
    studyActionsBarEl.querySelectorAll(".study-action-btn").forEach((btn) => {
      btn.disabled = !enabled;
    });
  }
  if (noteQuickFollowupsEl) {
    noteQuickFollowupsEl.querySelectorAll(".note-quick-followup-btn").forEach((btn) => {
      btn.disabled = !enabled;
    });
  }
  if (startReviewSprintBtnEl) startReviewSprintBtnEl.disabled = busy;
  if (nextReviewSprintBtnEl) nextReviewSprintBtnEl.disabled = busy || !reviewSprintActive;
  if (markReviewedNextBtnEl) markReviewedNextBtnEl.disabled = busy || !reviewSprintActive || !selectedEntryKey;
  if (generateStudyNoteBtnEl) {
    generateStudyNoteBtnEl.disabled = !selectedEntryKey || busy;
  }
  if (!busy && !selectedEntryKey && !getContextEntries().length) {
    clearBranchStatusTimer();
    setBranchComposerStatus("");
  }
}

function createTimelineNode(entry) {
  const li = document.createElement("div");
  li.className = "timeline-item workspace-mindmap-node";
  li.dataset.entryKey = entry._runtimeKey;

  const row = document.createElement("div");
  row.className = "timeline-row";
  row.dataset.entryKey = entry._runtimeKey;

  const button = document.createElement("button");
  button.type = "button";
  const folderId = ensureValidFolderId(entry?.folderId, currentFolders);
  const folderToneClass = getTimelineFolderToneClass(folderId);
  button.className = `timeline-btn timeline-node-btn ${folderToneClass}`;
  button.draggable = true;
  const hasBranchQuestion = entryKeysWithBranchQuestions.has(entry._runtimeKey);
  const hasBranchAnswer = entryKeysWithBranchAnswers.has(entry._runtimeKey);
  const learningStatus = getEntryLearningStatus(entry);
  const isReviewTask = learningStatus === "review";
  li.classList.add("learning-task-item", `is-${learningStatus}`);
  button.classList.add("learning-task-card", `is-${learningStatus}`);
  button.classList.toggle("timeline-node-btn-branch-answer", hasBranchAnswer);
  button.dataset.entryKey = entry._runtimeKey;
  button.dataset.folderId = folderId;
  timelineButtonMap.set(entry._runtimeKey, button);

  const titleEl = document.createElement("p");
  titleEl.className = "timeline-summary";
  titleEl.textContent = getEntryTitle(entry);

  const headEl = document.createElement("div");
  headEl.className = "learning-task-head";
  const statusEl = document.createElement("span");
  statusEl.className = `learning-task-status is-${learningStatus}`;
  statusEl.textContent = getEntryLearningStatusLabel(learningStatus);
  headEl.append(titleEl, statusEl);

  const snippet = getEntrySnippet(entry);
  if (snippet) {
    const snippetEl = document.createElement("p");
    snippetEl.className = "timeline-snippet";
    snippetEl.textContent = snippet;
    button.appendChild(snippetEl);
  }

  const metaEl = document.createElement("div");
  metaEl.className = "timeline-node-meta";

  if (normalizeStudyNote(entry.studyNote || "") || entry.studyNoteImage) {
    const noteDot = document.createElement("span");
    noteDot.className = "timeline-note-dot";
    noteDot.title = t("study_note_tag");
    noteDot.setAttribute("aria-label", t("study_note_tag"));
    metaEl.appendChild(noteDot);
  }
  const folderTag = document.createElement("span");
  folderTag.className = `timeline-folder-tag ${folderToneClass}`;
  const folderLabelPrefix = currentLocale === "en" ? "Category" : "分类";
  folderTag.textContent = `${folderLabelPrefix}·${getFolderNameById(folderId)}`;
  folderTag.title = getFolderNameById(folderId);
  metaEl.appendChild(folderTag);

  const bookmark = getEntryTimelineBookmark(entry);
  if (bookmark) {
    const bookmarkTag = document.createElement("span");
    bookmarkTag.className = `timeline-bookmark-tag is-${bookmark.type}`;
    bookmarkTag.textContent = getEntryTimelineBookmarkTypeLabel(entry);
    metaEl.appendChild(bookmarkTag);
    if (bookmark.note) {
      const bookmarkNoteTag = document.createElement("span");
      bookmarkNoteTag.className = "timeline-bookmark-note-tag";
      bookmarkNoteTag.textContent = t("study_bookmark_note");
      bookmarkNoteTag.title = bookmark.note;
      metaEl.appendChild(bookmarkNoteTag);
    }
  }

  if (hasBranchQuestion) {
    const branchTag = document.createElement("span");
    branchTag.className = "timeline-branch-tag";
    branchTag.textContent = t("branch_question_tag");
    metaEl.appendChild(branchTag);
  }

  if (hasBranchAnswer) {
    const branchAnswerTag = document.createElement("span");
    branchAnswerTag.className = "timeline-branch-answer-tag";
    branchAnswerTag.textContent = t("branch_answer_tag");
    metaEl.appendChild(branchAnswerTag);
  }

  const dueAt = getReviewDueAt(entry);
  if (!dueAt || dueAt <= Date.now()) {
    const dueTag = document.createElement("span");
    dueTag.className = "timeline-due-tag";
    dueTag.textContent = t("study_due_tag");
    metaEl.appendChild(dueTag);
  }

  const timeEl = document.createElement("time");
  timeEl.className = "timeline-time";
  timeEl.dateTime = new Date(entry.timestamp || Date.now()).toISOString();
  timeEl.textContent = buildEntryStudyTimeText(entry);

  button.prepend(headEl);
  metaEl.appendChild(timeEl);
  button.appendChild(metaEl);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setSubQuestionWorkbenchOpen(false);
    scheduleSelectEntry(entry._runtimeKey, { syncScroll: true, force: true, openWorkbench: false });
  });
  button.addEventListener("dragstart", (event) => {
    workspaceDraggingEntryKey = entry._runtimeKey;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/x-gtf-entry-key", entry._runtimeKey);
      event.dataTransfer.setData("text/plain", entry._runtimeKey);
    }
    li.classList.add("is-dragging");
  });
  button.addEventListener("dragend", () => {
    workspaceDraggingEntryKey = "";
    li.classList.remove("is-dragging");
    if (branchThreadEl) branchThreadEl.classList.remove("is-drop-over");
  });
  row.addEventListener("click", () => {
    setSubQuestionWorkbenchOpen(false);
    scheduleSelectEntry(entry._runtimeKey, { syncScroll: true, force: true, openWorkbench: false });
  });

  const quickActions = document.createElement("div");
  quickActions.className = "timeline-quick-actions";
  quickActions.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "learning-task-start-btn";
  startBtn.textContent = isReviewTask
    ? currentLocale === "en" ? "Review" : "\u590d\u4e60"
    : currentLocale === "en" ? "Start" : "\u5f00\u59cb";
  startBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    openSubQuestionWorkbench(entry._runtimeKey, { syncScroll: true, force: true, source: isReviewTask ? "review" : "queue" });
  });
  quickActions.appendChild(startBtn);

  const followupBtn = document.createElement("button");
  followupBtn.type = "button";
  followupBtn.className = "timeline-quick-action-btn";
  const isCurrentFollowupItem = pendingQuestionBoardMode === "followup" && isEntryManuallyClassified(entry);
  followupBtn.textContent = isCurrentFollowupItem ? getEntryUnfollowLabel() : getEntryFollowupQuickLabel();
  followupBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const task = isCurrentFollowupItem
      ? unclassifyEntryFromBranchThread(entry._runtimeKey)
      : quickSendEntryToFollowup(entry._runtimeKey);
    task.catch((error) => {
      console.error("quick follow-up action failed", error);
      setBranchComposerStatus(error?.message || "follow-up action failed", true);
    });
  });
  quickActions.appendChild(followupBtn);

  const categorySelect = createEntryCategoryQuickSelect(entry, {
    className: "entry-category-quick-select timeline-category-select"
  });
  if (categorySelect) {
    quickActions.appendChild(categorySelect);
  }

  row.append(button, quickActions);
  const preview = document.createElement("div");
  preview.className = "timeline-branch-preview";
  preview.dataset.entryKey = entry._runtimeKey;
  timelineBranchPreviewMap.set(entry._runtimeKey, preview);
  row.appendChild(preview);
  li.appendChild(row);
  return li;
}

function syncTimelineNodeBranchState(entryKey) {
  const targetKey = String(entryKey || "").trim();
  if (!targetKey) return;
  const button = timelineButtonMap.get(targetKey);
  if (!(button instanceof HTMLElement)) return;
  const metaEl = button.querySelector(".timeline-node-meta");
  if (!(metaEl instanceof HTMLElement)) return;
  const hasBranchQuestion = entryKeysWithBranchQuestions.has(targetKey);
  const hasBranchAnswer = entryKeysWithBranchAnswers.has(targetKey);
  button.classList.toggle("timeline-node-btn-branch-answer", hasBranchAnswer);

  const syncTag = (selector, shouldShow, className, text) => {
    let tag = metaEl.querySelector(selector);
    if (!shouldShow) {
      if (tag) tag.remove();
      return;
    }
    if (!tag) {
      tag = document.createElement("span");
      tag.className = className;
      const dueTag = metaEl.querySelector(".timeline-due-tag");
      if (dueTag) {
        metaEl.insertBefore(tag, dueTag);
      } else {
        metaEl.appendChild(tag);
      }
    }
    tag.textContent = text;
  };

  syncTag(".timeline-branch-tag", hasBranchQuestion, "timeline-branch-tag", t("branch_question_tag"));
  syncTag(".timeline-branch-answer-tag", hasBranchAnswer, "timeline-branch-answer-tag", t("branch_answer_tag"));
}

function syncTimelineNodeBranchStates() {
  timelineButtonMap.forEach((_, key) => {
    syncTimelineNodeBranchState(key);
  });
}

function renderTimelineBranchPreviewForKey(key) {
  const targetKey = String(key || "");
  if (!targetKey) return;
  const container = timelineBranchPreviewMap.get(targetKey);
  if (!container) return;
  container.innerHTML = "";
  if (targetKey === selectedEntryKey) {
    const nodes = getBranchTreeNodes();
    const childrenMap = getBranchTreeChildrenMap(nodes);
    const roots = (childrenMap.get("__ROOT__") || []).slice().sort((a, b) => Number(a?.createdAt || 0) - Number(b?.createdAt || 0));
    roots.forEach((node) => {
      const item = document.createElement("div");
      item.className = "timeline-branch-item";
      item.style.setProperty("--level", String(Math.max(0, node.level || 0)));
      const title = document.createElement("span");
      title.className = "timeline-branch-title";
      title.textContent = node.title || t("branch_tree_node");
      item.appendChild(title);
      container.appendChild(item);
      const children = childrenMap.get(node.id) || [];
      children
        .slice()
        .sort((a, b) => Number(a?.createdAt || 0) - Number(b?.createdAt || 0))
        .forEach((child) => {
          const sub = document.createElement("div");
          sub.className = "timeline-branch-item";
          sub.style.setProperty("--level", String(Math.max(0, child.level || 0)));
          const tt = document.createElement("span");
          tt.className = "timeline-branch-title";
          tt.textContent = child.title || t("branch_tree_node");
          sub.appendChild(tt);
          container.appendChild(sub);
        });
    });
    return;
  }
  const events = branchMiniTimelineMemory.get(targetKey) || [];
  if (!events.length) return;
  let q = 0;
  let a = 0;
  events.forEach((event) => {
    if (event?.type === "created") q += 1;
    else if (event?.type === "answered") a += 1;
  });
  if (q > 0) {
    const chipQ = document.createElement("span");
    chipQ.className = "timeline-branch-chip";
    chipQ.textContent = `${t("branch_question_tag")}·${q}`;
    container.appendChild(chipQ);
  }
  if (a > 0) {
    const chipA = document.createElement("span");
    chipA.className = "timeline-branch-chip";
    chipA.textContent = `${t("branch_answer_tag")}·${a}`;
    container.appendChild(chipA);
  }
}

function isTimelinePreviewNearViewport(container, margin = 520) {
  if (!(container instanceof HTMLElement) || !container.isConnected) return false;
  const rect = container.getBoundingClientRect();
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 900;
  return rect.bottom >= -margin && rect.top <= viewportH + margin;
}

function renderTimelineBranchPreviews(forceAll = false) {
  if (panelResizeActive) {
    if (forceAll) deferredResizeRenderPending = true;
    return;
  }
  if (forceAll) {
    const keys = new Set();
    if (selectedEntryKey) keys.add(selectedEntryKey);
    if (lastTimelineBranchPreviewSelectedKey) keys.add(lastTimelineBranchPreviewSelectedKey);
    let visibleCount = 0;
    timelineBranchPreviewMap.forEach((container, key) => {
      if (visibleCount >= 24) return;
      if (!isTimelinePreviewNearViewport(container)) return;
      keys.add(key);
      visibleCount += 1;
    });
    keys.forEach((key) => renderTimelineBranchPreviewForKey(key));
    lastTimelineBranchPreviewSelectedKey = selectedEntryKey || "";
    return;
  }
  const keys = new Set(pendingTimelineBranchPreviewKeys);
  pendingTimelineBranchPreviewKeys.clear();
  if (selectedEntryKey) keys.add(selectedEntryKey);
  if (lastTimelineBranchPreviewSelectedKey) keys.add(lastTimelineBranchPreviewSelectedKey);
  keys.forEach((key) => renderTimelineBranchPreviewForKey(key));
  lastTimelineBranchPreviewSelectedKey = selectedEntryKey || "";
}

function scheduleTimelineBranchPreviewRender(targetKey = "") {
  const key = String(targetKey || "").trim();
  if (key) pendingTimelineBranchPreviewKeys.add(key);
  if (selectedEntryKey) pendingTimelineBranchPreviewKeys.add(selectedEntryKey);
  if (lastTimelineBranchPreviewSelectedKey) pendingTimelineBranchPreviewKeys.add(lastTimelineBranchPreviewSelectedKey);
  if (timelineBranchPreviewRafId) return;
  timelineBranchPreviewRafId = window.requestAnimationFrame(() => {
    timelineBranchPreviewRafId = 0;
    renderTimelineBranchPreviews(false);
  });
}

function getWorkspaceFolderChildrenMap() {
  const map = new Map();
  currentFolders.forEach((folder) => {
    if (!folder?.id || folder.id === DEFAULT_FOLDER_ID) return;
    const parentId = ensureValidFolderId(folder.parentId || DEFAULT_FOLDER_ID, currentFolders);
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId).push(folder);
  });
  map.forEach((list) => list.sort((a, b) => (a.name || "").localeCompare(b.name || "", currentLocale === "en" ? "en" : "zh")));
  return map;
}

function getWorkspaceFolderEntryGroups(entries) {
  const groups = new Map();
  (entries || []).forEach((entry) => {
    const folderId = ensureValidFolderId(entry?.folderId, currentFolders);
    if (!groups.has(folderId)) groups.set(folderId, []);
    groups.get(folderId).push(entry);
  });
  groups.forEach((list) => {
    list.sort((a, b) => {
      const delta = Number(a?.timestamp || 0) - Number(b?.timestamp || 0);
      return timelineFolderItemSortOrder === "asc" ? delta : -delta;
    });
  });
  return groups;
}

function getWorkspaceFolderActivityStats(entries) {
  const folderById = new Map(currentFolders.map((folder) => [folder.id, folder]));
  const stats = new Map();
  const ensureStat = (folderId) => {
    const id = ensureValidFolderId(folderId, currentFolders);
    if (!stats.has(id)) {
      stats.set(id, {
        directCount: 0,
        totalCount: 0,
        latestAt: 0
      });
    }
    return stats.get(id);
  };
  ensureStat(DEFAULT_FOLDER_ID);
  currentFolders.forEach((folder) => ensureStat(folder.id));

  (entries || []).forEach((entry) => {
    const folderId = ensureValidFolderId(entry?.folderId, currentFolders);
    const directStat = ensureStat(folderId);
    directStat.directCount += 1;
    const timestamp = Number(entry?.timestamp || 0);
    let cursor = folderId;
    let guard = 0;
    while (cursor && guard < 32) {
      const stat = ensureStat(cursor);
      stat.totalCount += 1;
      if (timestamp > stat.latestAt) stat.latestAt = timestamp;
      if (cursor === DEFAULT_FOLDER_ID) break;
      const parentRaw = folderById.get(cursor)?.parentId || DEFAULT_FOLDER_ID;
      const parentId = ensureValidFolderId(parentRaw, currentFolders);
      if (!parentId || parentId === cursor) break;
      cursor = parentId;
      guard += 1;
    }
  });
  return stats;
}

function expandTimelineFolderPath(folderId) {
  const folderMap = new Map(currentFolders.map((folder) => [folder.id, folder]));
  let cursor = ensureValidFolderId(folderId, currentFolders);
  let guard = 0;
  while (cursor && guard < 32) {
    collapsedFolderIds.delete(cursor);
    if (cursor === DEFAULT_FOLDER_ID) break;
    const parentRaw = folderMap.get(cursor)?.parentId || DEFAULT_FOLDER_ID;
    const parentId = ensureValidFolderId(parentRaw, currentFolders);
    if (!parentId || parentId === cursor) break;
    cursor = parentId;
    guard += 1;
  }
}

function createWorkspaceTreeSection(entries, options = {}) {
  const buildToken = Number(options?.buildToken) || 0;
  const totalEntries = Array.isArray(entries) ? entries.length : 0;
  const buildSync = totalEntries <= TIMELINE_TREE_SYNC_ENTRY_THRESHOLD;
  const sectionEl = document.createElement("div");
  sectionEl.className = "workspace-mindmap";

  const headEl = document.createElement("div");
  headEl.className = "workspace-mindmap-root-wrap";

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "workspace-mindmap-root";
  toggleBtn.textContent = t("workspace_note_root");
  toggleBtn.dataset.collapsed = workspaceTreeCollapsed ? "1" : "0";
  toggleBtn.addEventListener("click", () => {
    workspaceTreeCollapsed = !workspaceTreeCollapsed;
    scheduleTimelineRender();
  });

  headEl.append(toggleBtn);

  const listEl = document.createElement("div");
  listEl.className = "workspace-mindmap-branches";
  listEl.hidden = workspaceTreeCollapsed;
  const folderChildrenMap = getWorkspaceFolderChildrenMap();
  const grouped = getWorkspaceFolderEntryGroups(entries);
  const activityStats = getWorkspaceFolderActivityStats(entries);
  const folderById = new Map(currentFolders.map((folder) => [folder.id, folder]));
  const folderChildrenSortedMap = new Map();
  folderChildrenMap.forEach((items, key) => {
    const sorted = (items || [])
      .slice()
      .sort((a, b) => {
        const aStat = activityStats.get(a.id) || { latestAt: 0, totalCount: 0 };
        const bStat = activityStats.get(b.id) || { latestAt: 0, totalCount: 0 };
        const latestDelta = Number(bStat.latestAt || 0) - Number(aStat.latestAt || 0);
        if (latestDelta !== 0) return latestDelta;
        const countDelta = Number(bStat.totalCount || 0) - Number(aStat.totalCount || 0);
        if (countDelta !== 0) return countDelta;
        return (a.name || "").localeCompare(b.name || "", currentLocale === "en" ? "en" : "zh");
      });
    folderChildrenSortedMap.set(key, sorted);
  });

  const buildTasks = [{ type: "folder", folderId: DEFAULT_FOLDER_ID, parentEl: listEl, depth: 0 }];
  const pushFolderTask = (folderId, parentEl, depth) => {
    buildTasks.push({ type: "folder", folderId, parentEl, depth });
  };
  const pushEntriesTask = (items, parentEl) => {
    if (!Array.isArray(items) || !items.length) return;
    buildTasks.push({ type: "entries", items, parentEl, start: 0 });
  };

  const processTaskChunk = () => {
    if (buildToken && buildToken !== timelineTreeBuildToken) return;
    const frameStart = performance.now();
    let steps = 0;
    while (buildTasks.length && steps < TIMELINE_TREE_BUILD_CHUNK_SIZE) {
      if (!buildSync && steps > 0 && performance.now() - frameStart >= TIMELINE_TREE_FRAME_BUDGET_MS) break;
      const task = buildTasks.shift();
      if (!task) break;
      if (task.type === "folder") {
        const folder = folderById.get(task.folderId);
        if (!folder) continue;
        const childFolders = folderChildrenSortedMap.get(folder.id) || [];
        const childItems = grouped.get(folder.id) || [];
        const hasChildren = childFolders.length > 0 || childItems.length > 0;
        const collapsed = collapsedFolderIds.has(folder.id);
        const folderStat = activityStats.get(folder.id) || { totalCount: childItems.length, latestAt: 0 };

        const itemEl = document.createElement("section");
        itemEl.className = "workspace-mindmap-branch";
        itemEl.classList.add(getTreeDepthClass(task.depth));
        const head = document.createElement("div");
        head.className = "workspace-mindmap-branch-head";
        if (task.depth <= 1) head.classList.add("workspace-mindmap-branch-head-sticky");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "workspace-mindmap-branch-toggle";
        btn.classList.add(getTreeDepthClass(task.depth));
        const label = folder.id === DEFAULT_FOLDER_ID ? t("uncategorized") : folder.name;
        btn.textContent = label;
        btn.dataset.hasChildren = hasChildren ? "1" : "0";
        btn.dataset.collapsed = collapsed ? "1" : "0";
        btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
        btn.addEventListener("click", () => {
          if (!hasChildren) return;
          if (collapsedFolderIds.has(folder.id)) {
            collapsedFolderIds.delete(folder.id);
          } else {
            collapsedFolderIds.add(folder.id);
          }
          persistCurrentSession({ collapsedFolderIds: Array.from(collapsedFolderIds) }).catch((error) => {
            console.error("persistCurrentSession(collapsedFolderIds) failed", error);
          });
          scheduleTimelineRender();
        });
        const tail = document.createElement("div");
        tail.className = "workspace-mindmap-branch-tail";
        const latest = document.createElement("span");
        latest.className = "workspace-mindmap-branch-latest";
        latest.textContent = folderStat.latestAt ? formatTime(folderStat.latestAt) : "--";
        latest.title = folderStat.latestAt ? new Date(folderStat.latestAt).toLocaleString() : "";
        tail.append(latest);
        head.append(btn, tail);

        const children = document.createElement("div");
        children.className = "workspace-mindmap-children";
        children.hidden = collapsed;
        itemEl.append(head, children);
        task.parentEl.appendChild(itemEl);

        if (!collapsed) {
          for (let i = childFolders.length - 1; i >= 0; i -= 1) {
            pushFolderTask(childFolders[i].id, children, task.depth + 1);
          }
          pushEntriesTask(childItems, children);
        }
      } else if (task.type === "entries") {
        if (!task.parentEl || !Array.isArray(task.items) || task.start >= task.items.length) continue;
        const fragment = document.createDocumentFragment();
        const perTaskCount = buildSync ? TIMELINE_TREE_BUILD_CHUNK_SIZE : Math.max(24, Math.floor(TIMELINE_TREE_BUILD_CHUNK_SIZE / 2));
        const end = Math.min(task.items.length, task.start + perTaskCount);
        for (let i = task.start; i < end; i += 1) {
          fragment.appendChild(createTimelineNode(task.items[i]));
        }
        task.parentEl.appendChild(fragment);
        if (end < task.items.length) {
          buildTasks.unshift({ ...task, start: end });
        }
      }
      steps += 1;
    }
    updateSelectedStyle("timelineOnly");
    if (buildTasks.length) {
      if (buildSync) {
        processTaskChunk();
        return;
      }
      window.requestAnimationFrame(processTaskChunk);
      return;
    }
    if (buildToken && buildToken !== timelineTreeBuildToken) return;
    updateSelectedStyle();
    renderTimelineBranchPreviews(true);
  };

  processTaskChunk();

  sectionEl.append(headEl, listEl);
  return sectionEl;
}

function createLearningQueueListSection(entries) {
  const sectionEl = document.createElement("div");
  sectionEl.className = "workspace-mindmap workspace-mindmap-flat";

  const listEl = document.createElement("div");
  listEl.className = "workspace-mindmap-branches workspace-mindmap-flat-list";

  const fragment = document.createDocumentFragment();
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    fragment.appendChild(createTimelineNode(entry));
  });
  listEl.appendChild(fragment);
  sectionEl.appendChild(listEl);
  return sectionEl;
}

function getFilteredTimelineEntries() {
  const searchText = normalizeSingleLine(timelineSearchText || "", 200).toLowerCase();
  const now = Date.now();
  const sourceEntries =
    pendingQuestionBoardMode === "followup"
      ? getClassifiedEntriesForOwner(getActiveBranchRootEntryKey(selectedEntryKey)).filter(Boolean)
      : currentEntries;
  return sourceEntries.filter((entry) => {
    if (pendingQuestionBoardMode === "followup") {
      if (!searchText) return true;
      const hitSource = buildTimelineEntrySearchSource(entry);
      return hitSource.includes(searchText);
    }
    if (pendingQuestionBoardMode === "review") {
      if (!isEntryDueForReviewQueue(entry, now)) return false;
      if (!searchText) return true;
      const hitSource = buildTimelineEntrySearchSource(entry);
      return hitSource.includes(searchText);
    }
    if (isEntryInLearningCategory(entry)) {
      return false;
    }
    if (isEntryManuallyClassified(entry)) {
      return false;
    }
    if (entryKeysWithBranchAnswers.has(entry?._runtimeKey || "")) {
      return false;
    }
    if (Number(entry?.reviewedAt || 0) > 0) {
      return false;
    }
    const folderId = ensureValidFolderId(entry?.folderId, currentFolders);
    if (timelineFolderFilterIds.size > 0 && !timelineFolderFilterIds.has(folderId)) {
      return false;
    }
    if (timelineFilterMode === "bookmark" && !hasEntryTimelineBookmark(entry)) {
      return false;
    }
    if (timelineFilterMode === "note" && !normalizeStudyNote(entry.studyNote || "")) {
      return false;
    }
    if (timelineFilterMode === "due") {
      if (!isEntryDueForStudy(entry, now)) return false;
    }
    if (!searchText) return true;
    const hitSource = buildTimelineEntrySearchSource(entry);
    return hitSource.includes(searchText);
  });
}

function renderBranchThread() {
  if (!branchThreadEl) return;
  const visibleMessages = getBranchVisibleMessages();
  const activeRootEntryKey = getActiveBranchRootEntryKey(selectedEntryKey);
  const classifiedEntries = getClassifiedEntriesForOwner(activeRootEntryKey);
  const classifiedSignature = classifiedEntries
    .map((entry) => `${entry?._runtimeKey || ""}:${Number(entry?.timestamp) || 0}:${(getEntryTitle(entry) || "").length}`)
    .join("|");
  const messageSignature = visibleMessages
    .map(
      (message) =>
        `${message?.id || ""}:${message?.role || ""}:${Number(message?.timestamp) || 0}:${(message?.text || "").length}:${message?.answerEntryId || ""}:${message?.answerEntryKey || ""}:${Number(message?.answerTimestamp) || 0}`
    )
    .join("|");
  const nextSignature = `${currentLocale}|${selectedEntryKey}|${activeRootEntryKey}|${branchTreeSelectedNodeId}|${branchAutoSuggestOwnerEntryKey}|${branchAutoSuggestTargetEntryKey}|${classifiedSignature}|${messageSignature}`;
  if (nextSignature === branchThreadRenderSignature) return;
  branchThreadRenderSignature = nextSignature;
  branchThreadEl.hidden = false;
  branchThreadEl.classList.remove("branch-thread-hidden");
  branchThreadEl.innerHTML = "";

  const appendBranchEmptyDragHint = () => {
    const dragHint = document.createElement("p");
    dragHint.className = "branch-thread-drag-hint";
    dragHint.textContent = getBranchFollowupDropHint();
    branchThreadEl.appendChild(dragHint);
    if (settingsState.branchDragGuideDismissed) return;
    const dragGuide = document.createElement("section");
    dragGuide.className = "branch-thread-drag-guide";
    const dragGuideTitle = document.createElement("p");
    dragGuideTitle.className = "branch-thread-drag-guide-title";
    dragGuideTitle.textContent = t("branch_drag_guide_title");
    const dragGuideText = document.createElement("p");
    dragGuideText.className = "branch-thread-drag-guide-text";
    dragGuideText.textContent = getBranchFollowupDropHint();
    const dragGuideCloseBtn = document.createElement("button");
    dragGuideCloseBtn.type = "button";
    dragGuideCloseBtn.className = "branch-thread-drag-guide-close";
    dragGuideCloseBtn.textContent = t("branch_drag_guide_got_it");
    dragGuideCloseBtn.addEventListener("click", () => {
      settingsState.branchDragGuideDismissed = true;
      persistSettingsState().catch((error) => {
        console.error("persistSettingsState(branchDragGuideDismissed) failed", error);
      });
      dragGuide.remove();
    });
    dragGuide.append(dragGuideTitle, dragGuideText, dragGuideCloseBtn);
    branchThreadEl.appendChild(dragGuide);
  };

  const appendClassifiedEntriesSection = (options = {}) => {
    if (!classifiedEntries.length) return false;
    const section = document.createElement("section");
    section.className = "branch-thread-classified-section";

    const title = document.createElement("p");
    title.className = "branch-thread-classified-title";
    title.textContent = t("branch_classified_list_title");
    section.appendChild(title);

    if (options?.showHint !== false) {
      const hint = document.createElement("p");
      hint.className = "branch-thread-classified-hint";
      hint.textContent = getBranchAttachedHint();
      section.appendChild(hint);
    }

    const list = document.createElement("div");
    list.className = "branch-thread-classified-list";

    classifiedEntries.forEach((entry) => {
      const card = document.createElement("section");
      card.className = "branch-card branch-card-question branch-card-locatable branch-classified-entry-card";
      card.title = t("locate_main");
      card.addEventListener("click", () => {
        sendScrollRequest(entry._runtimeKey, { force: true }).catch((error) => {
          console.error("sendScrollRequest by classified entry failed", error);
        });
      });

      const head = document.createElement("div");
      head.className = "branch-card-head";
      const headMain = document.createElement("div");
      headMain.className = "branch-card-head-main";
      const tag = document.createElement("span");
      tag.className = "branch-role-tag user";
      tag.textContent = t("branch_classified_item_tag");
      headMain.appendChild(tag);
      head.appendChild(headMain);

      const body = document.createElement("p");
      body.className = "branch-question-text";
      body.textContent = getEntryTitle(entry) || t("untitled_node");

      const snippet = getEntrySnippet(entry);
      const actions = document.createElement("div");
      actions.className = "branch-thread-classified-actions";
      const locateBtn = document.createElement("button");
      locateBtn.type = "button";
      locateBtn.className = "branch-thread-session-locate-btn";
      locateBtn.textContent = t("locate_main");
      locateBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        sendScrollRequest(entry._runtimeKey, { force: true }).catch((error) => {
          console.error("sendScrollRequest by classified entry button failed", error);
        });
      });
      actions.appendChild(locateBtn);
      const categorySelect = createEntryCategoryQuickSelect(entry, {
        className: "entry-category-quick-select branch-thread-classified-category-select"
      });
      if (categorySelect) {
        actions.appendChild(categorySelect);
      }
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "branch-thread-session-locate-btn";
      removeBtn.textContent = getEntryUnfollowLabel();
      removeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        unclassifyEntryFromBranchThread(entry._runtimeKey).catch((error) => {
          console.error("unclassifyEntryFromBranchThread failed", error);
          setBranchComposerStatus(error?.message || "move out failed", true);
        });
      });
      actions.appendChild(removeBtn);

      card.append(head, body);
      if (snippet) {
        const snippetEl = document.createElement("p");
        snippetEl.className = "branch-thread-classified-snippet";
        snippetEl.textContent = snippet;
        card.appendChild(snippetEl);
      }
      card.appendChild(actions);
      list.appendChild(card);
    });

    section.appendChild(list);
    branchThreadEl.appendChild(section);
    return true;
  };

  if (!visibleMessages.length) {
    const hasClassifiedEntries = appendClassifiedEntriesSection({ showHint: true });
    if (!hasClassifiedEntries) {
      const empty = document.createElement("p");
      empty.className = "branch-empty";
      empty.textContent = t("branch_empty");
      branchThreadEl.appendChild(empty);
    }
    appendBranchEmptyDragHint();
    renderBranchTreePanel();
    renderBranchMiniTimeline();
    return;
  }

  const getBranchLevelLabel = (level = 0) => {
    if (level <= 0) return t("branch_level_root");
    if (level === 1) return t("branch_level_child");
    return t("branch_level_deep");
  };

  const createCardHead = (level = 0, childCount = 0) => {
    const head = document.createElement("div");
    head.className = "branch-card-head";

    const left = document.createElement("div");
    left.className = "branch-card-head-main";

    const roleTag = document.createElement("span");
    roleTag.className = "branch-role-tag user";
    roleTag.textContent = t("you");

    const relationTag = document.createElement("span");
    relationTag.className = `branch-relation-tag level-${Math.min(2, Math.max(0, level))}`;
    relationTag.textContent = getBranchLevelLabel(level);

    left.append(roleTag, relationTag);
    if (childCount > 0) {
      const childCountTag = document.createElement("span");
      childCountTag.className = "branch-children-count";
      childCountTag.textContent = t("branch_children_count", { count: childCount });
      left.appendChild(childCountTag);
    }

    head.append(left);
    return head;
  };

  const createQuestionCard = (message, options = {}) => {
    const card = document.createElement("section");
    card.className = "branch-card branch-card-question";
    card.dataset.branchNodeId = String(message?.id || "");
    card.dataset.branchMsgId = String(message?.id || "");
    card.dataset.level = String(Math.max(0, Number(options?.level) || 0));
    card.classList.toggle("active", String(message?.id || "") === String(branchTreeSelectedNodeId || ""));
    const targetEntryKey = resolveBranchQuestionAnswerEntryKey(message);
    if (targetEntryKey) {
      card.classList.add("branch-card-locatable");
      card.title = t("locate_main");
      card.addEventListener("click", () => {
        const targetEntryKey = resolveBranchQuestionAnswerEntryKey(message);
        if (!targetEntryKey) return;
        if (targetEntryKey !== selectedEntryKey) {
          selectEntry(targetEntryKey, { syncScroll: true, force: true }).catch((error) => {
            console.error("selectEntry by branch question failed", error);
          });
          return;
        }
        sendScrollRequest(targetEntryKey, { force: true }).catch((error) => {
          console.error("sendScrollRequest by branch question failed", error);
        });
      });
    }

    const body = document.createElement("p");
    body.className = "branch-question-text";
    body.textContent = stripSpeakerPrefix(message.text || "", "user");

    const head = createCardHead(options?.level || 0, Number(options?.childCount) || 0);
    card.append(head, body);
    return card;
  };

  const visibleQuestions = visibleMessages.filter((message) => message?.role === "user");
  const lineage = getBranchLineageState(branchTreeSelectedNodeId, visibleQuestions);
  if (!visibleQuestions.length) {
    const hasClassifiedEntries = appendClassifiedEntriesSection({ showHint: true });
    if (!hasClassifiedEntries) {
      const empty = document.createElement("p");
      empty.className = "branch-empty";
      empty.textContent = t("branch_empty");
      branchThreadEl.appendChild(empty);
    }
    appendBranchEmptyDragHint();
    renderBranchTreePanel();
    renderBranchMiniTimeline();
    return;
  }

  const selectedNodeId = String(lineage.selectedId || "").trim();
  let currentNodeMessage = selectedNodeId
    ? visibleQuestions.find((message) => String(message?.id || "").trim() === selectedNodeId) || null
    : null;
  if (!currentNodeMessage) {
    currentNodeMessage = visibleQuestions[visibleQuestions.length - 1] || null;
  }
  if (currentNodeMessage) {
    const sessionHead = document.createElement("section");
    sessionHead.className = "branch-thread-session-head";
    const sessionMeta = document.createElement("div");
    sessionMeta.className = "branch-thread-session-meta";
    const currentLabel = document.createElement("span");
    currentLabel.className = "branch-thread-session-label";
    currentLabel.textContent = t("branch_current_session_label");
    const actions = document.createElement("div");
    actions.className = "branch-thread-session-actions";
    const locateBtn = document.createElement("button");
    locateBtn.type = "button";
    locateBtn.className = "branch-thread-session-locate-btn";
    locateBtn.textContent = t("locate_main");
    locateBtn.addEventListener("click", () => {
      const nodeId = String(currentNodeMessage?.id || "").trim();
      if (!nodeId) return;
      jumpToBranchNode(nodeId, { syncScroll: true });
    });
    const backMainBtn = document.createElement("button");
    backMainBtn.type = "button";
    backMainBtn.className = "branch-thread-session-locate-btn";
    backMainBtn.textContent = t("branch_back_main");
    const mainEntryKey = resolveBranchMessageSourceEntryKey(currentNodeMessage) || selectedEntryKey || "";
    backMainBtn.disabled = !mainEntryKey;
    backMainBtn.addEventListener("click", () => {
      if (!mainEntryKey) return;
      branchTreeSelectedNodeId = getBranchTreeEntryNodeId(mainEntryKey);
      selectEntry(mainEntryKey, { syncScroll: true, force: true }).catch((error) => {
        console.error("selectEntry by branch main return failed", error);
      });
    });
    const currentTitle = document.createElement("p");
    currentTitle.className = "branch-thread-session-title";
    currentTitle.textContent = stripSpeakerPrefix(currentNodeMessage?.text || "", "user") || t("branch_tree_node");
    const autoSuggestion = resolveBranchAutoSuggestion();
    if (autoSuggestion) {
      const suggestCard = document.createElement("section");
      suggestCard.className = "branch-auto-suggest-card";
      const suggestTitle = document.createElement("p");
      suggestTitle.className = "branch-auto-suggest-title";
      suggestTitle.textContent = t("branch_auto_suggest_title");
      const suggestText = document.createElement("p");
      suggestText.className = "branch-auto-suggest-text";
      suggestText.textContent = t("branch_auto_suggest_text", {
        title: getEntryTitle(autoSuggestion.targetEntry) || t("untitled_node")
      });
      const suggestActions = document.createElement("div");
      suggestActions.className = "branch-auto-suggest-actions";
      const applyBtn = document.createElement("button");
      applyBtn.type = "button";
      applyBtn.className = "branch-auto-suggest-btn primary";
      applyBtn.textContent = t("branch_auto_suggest_apply");
      applyBtn.addEventListener("click", () => {
        classifyEntryToCurrentBranchThreadByDrag(autoSuggestion.targetEntryKey)
          .then(() => {
            branchAutoSuggestSeenEntryKeys.add(autoSuggestion.targetEntryKey);
            resetBranchAutoSuggestionState({ keepSeen: true });
            setBranchComposerStatus(t("branch_auto_suggest_applied"));
            renderBranchThread();
          })
          .catch((error) => {
            console.error("branch auto suggestion apply failed", error);
            setBranchComposerStatus(error?.message || "auto classify failed", true);
          });
      });
      const dismissBtn = document.createElement("button");
      dismissBtn.type = "button";
      dismissBtn.className = "branch-auto-suggest-btn";
      dismissBtn.textContent = t("branch_auto_suggest_dismiss");
      dismissBtn.addEventListener("click", () => {
        branchAutoSuggestSeenEntryKeys.add(autoSuggestion.targetEntryKey);
        resetBranchAutoSuggestionState({ keepSeen: true });
        setBranchComposerStatus(t("branch_auto_suggest_ignored"));
        renderBranchThread();
      });
      suggestActions.append(applyBtn, dismissBtn);
      suggestCard.append(suggestTitle, suggestText, suggestActions);
      sessionHead.appendChild(suggestCard);
    }
    actions.append(locateBtn, backMainBtn);
    sessionMeta.append(currentLabel, actions);
    sessionHead.append(sessionMeta, currentTitle);
    branchThreadEl.appendChild(sessionHead);
  }

  appendClassifiedEntriesSection({ showHint: false });

  const byId = new Map();
  const roots = [];
  visibleQuestions.forEach((message, index) => {
    const nodeId = String(message?.id || `branch-node-${index}`);
    byId.set(nodeId, {
      id: nodeId,
      message,
      parentId: String(message?.parentNodeId || "").trim(),
      timestamp: Number(message?.timestamp) || 0,
      order: index,
      children: []
    });
  });
  byId.forEach((node) => {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      const delta = Number(a?.timestamp || 0) - Number(b?.timestamp || 0);
      if (delta !== 0) return delta;
      return Number(a?.order || 0) - Number(b?.order || 0);
    });
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);

  const renderThreadNode = (node, level = 0) => {
    const turn = document.createElement("article");
    turn.className = "branch-turn";
    turn.dataset.level = String(Math.max(0, level));
    turn.style.setProperty("--branch-thread-level", String(Math.max(0, level)));
    turn.classList.toggle("branch-turn-current", node.id === lineage.selectedId);
    turn.classList.toggle("branch-turn-path", lineage.pathIds.has(node.id));
    turn.classList.toggle("branch-turn-descendant", lineage.descendantIds.has(node.id));
    turn.appendChild(createQuestionCard(node.message, { level, childCount: node.children.length }));

    if (node.children.length) {
      const childrenWrap = document.createElement("div");
      childrenWrap.className = "branch-thread-children";
      node.children.forEach((child) => {
        childrenWrap.appendChild(renderThreadNode(child, level + 1));
      });
      turn.appendChild(childrenWrap);
    }
    return turn;
  };

  roots.forEach((node) => {
    branchThreadEl.appendChild(renderThreadNode(node, 0));
  });

  branchThreadEl.scrollTop = branchThreadEl.scrollHeight;
  renderBranchTreePanel();
  renderBranchMiniTimeline();
}

function getBranchVisibleNodeIdSet() {
  const selectedNodeId = String(branchTreeSelectedNodeId || "").trim();
  if (!selectedNodeId || selectedNodeId === "__root__") return null;
  const childrenMap = new Map();
  const allNodeIds = new Set();
  currentBranchMessages.forEach((message) => {
    if (!message || message.role !== "user" || !message.id) return;
    allNodeIds.add(String(message.id));
    const parentId = String(message.parentNodeId || "").trim() || "__ROOT__";
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId).push(String(message.id));
  });
  if (!allNodeIds.has(selectedNodeId)) return null;
  const visibleIds = new Set([selectedNodeId]);
  const queue = [selectedNodeId];
  while (queue.length) {
    const currentId = queue.shift();
    const children = childrenMap.get(currentId) || [];
    children.forEach((childId) => {
      if (visibleIds.has(childId)) return;
      visibleIds.add(childId);
      queue.push(childId);
    });
  }
  return visibleIds;
}

function getBranchVisibleMessages() {
  const localMessages = currentBranchMessages.slice();
  if (!FORCE_BRANCH_INDEX_AGGREGATE_MODE || !currentConversationBranchIndexMessages.length) {
    return localMessages;
  }

  const entryKey = normalizeSingleLine(selectedEntryKey || "", 200);
  const classifiedOwnerEntryKey = entryKey ? normalizeSingleLine(getManualBranchOwnerEntryKey(entryKey) || "", 200) : "";
  if (!entryKey) {
    return localMessages.length ? localMessages : currentConversationBranchIndexMessages.slice();
  }

  const isMessageRelatedToEntry = (message) => {
    if (!message || message.role !== "user") return false;
    const sourceKey = resolveBranchMessageSourceEntryKey(message);
    if (sourceKey && sourceKey === entryKey) return true;
    const answerKey = resolveBranchQuestionAnswerEntryKey(message);
    return answerKey === entryKey;
  };

  const stripAggregatePrefix = (id) => {
    const raw = String(id || "").trim();
    const sep = raw.indexOf("::");
    if (sep <= 0) return raw;
    const maybeToken = raw.slice(0, sep);
    // Aggregate branch index scopes ids as "<entryToken>::<messageId>".
    if (maybeToken.includes("::")) return raw;
    return raw.slice(sep + 2);
  };

  const relatedLocal = localMessages.filter(isMessageRelatedToEntry);
  const relatedAggregate = currentConversationBranchIndexMessages.filter(isMessageRelatedToEntry);
  const mergedByCanonicalId = new Map();
  [...relatedLocal, ...relatedAggregate].forEach((message, index) => {
    const canonicalId = stripAggregatePrefix(message?.id || "") || `fallback-${index}`;
    if (!mergedByCanonicalId.has(canonicalId)) {
      mergedByCanonicalId.set(canonicalId, message);
      return;
    }
    const existing = mergedByCanonicalId.get(canonicalId) || {};
    // Prefer richer message text when both local and aggregate copies exist.
    if (String(message?.text || "").length > String(existing?.text || "").length) {
      mergedByCanonicalId.set(canonicalId, message);
    }
  });
  const merged = Array.from(mergedByCanonicalId.values());
  merged.sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0));
  if (merged.length) return merged;
  if (classifiedOwnerEntryKey && classifiedOwnerEntryKey !== entryKey) {
    return localMessages.length ? localMessages : currentConversationBranchIndexMessages.slice();
  }
  return localMessages;
}

function resetBranchAutoSuggestionState(options = {}) {
  const keepSeen = Boolean(options?.keepSeen);
  branchAutoSuggestOwnerEntryKey = "";
  branchAutoSuggestTargetEntryKey = "";
  if (!keepSeen) branchAutoSuggestSeenEntryKeys.clear();
}

function resolveBranchAutoSuggestion() {
  const ownerEntryKey = normalizeSingleLine(branchAutoSuggestOwnerEntryKey || "", 200);
  const targetEntryKey = normalizeSingleLine(branchAutoSuggestTargetEntryKey || "", 200);
  if (!ownerEntryKey || !targetEntryKey) return null;
  if (ownerEntryKey !== selectedEntryKey) return null;
  const ownerEntry = getEntryByRuntimeKey(ownerEntryKey);
  const targetEntry = getEntryByRuntimeKey(targetEntryKey);
  if (!ownerEntry || !targetEntry || isEntryManuallyClassified(targetEntry)) return null;
  return { ownerEntryKey, targetEntryKey, ownerEntry, targetEntry };
}

function maybeQueueBranchAutoSuggestion(newEntryKeys = [], ownerEntryKey = selectedEntryKey) {
  if (!Array.isArray(newEntryKeys) || !newEntryKeys.length) return;
  const normalizedOwnerEntryKey = normalizeSingleLine(ownerEntryKey || "", 200);
  if (!normalizedOwnerEntryKey) return;
  const ownerEntry = getEntryByRuntimeKey(normalizedOwnerEntryKey);
  if (!ownerEntry) return;
  const ownerTimestamp = Number(ownerEntry?.timestamp) || 0;
  if (!ownerTimestamp) return;

  const linkedAnswerKeys = new Set();
  currentBranchMessages.forEach((message) => {
    const answerKey = resolveBranchQuestionAnswerEntryKey(message);
    if (answerKey) linkedAnswerKeys.add(answerKey);
  });

  const BRANCH_AUTO_SUGGEST_MAX_GAP_MS = 12 * 60 * 1000;
  const candidates = newEntryKeys
    .map((key) => getEntryByRuntimeKey(normalizeSingleLine(key || "", 200)))
    .filter((entry) => entry && entry._runtimeKey !== normalizedOwnerEntryKey)
    .filter((entry) => !isEntryManuallyClassified(entry))
    .filter((entry) => !linkedAnswerKeys.has(entry._runtimeKey))
    .filter((entry) => !branchAutoSuggestSeenEntryKeys.has(entry._runtimeKey))
    .filter((entry) => {
      const entryTs = Number(entry?.timestamp) || 0;
      if (!entryTs || entryTs < ownerTimestamp) return false;
      return entryTs - ownerTimestamp <= BRANCH_AUTO_SUGGEST_MAX_GAP_MS;
    })
    .sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0));
  const picked = candidates[0] || null;
  if (!picked) return;
  branchAutoSuggestOwnerEntryKey = normalizedOwnerEntryKey;
  branchAutoSuggestTargetEntryKey = picked._runtimeKey;
}

function getDraggedWorkspaceEntryKeyFromEvent(event) {
  const direct = normalizeSingleLine(workspaceDraggingEntryKey || "", 200);
  if (direct && getEntryByRuntimeKey(direct)) return direct;
  const custom = normalizeSingleLine(event?.dataTransfer?.getData("application/x-gtf-entry-key") || "", 200);
  if (custom && getEntryByRuntimeKey(custom)) return custom;
  const plain = normalizeSingleLine(event?.dataTransfer?.getData("text/plain") || "", 200);
  if (plain && getEntryByRuntimeKey(plain)) return plain;
  return "";
}

async function classifyEntryToCurrentBranchThreadByDrag(draggedEntryKey) {
  const targetEntryKey = normalizeSingleLine(draggedEntryKey || "", 200);
  if (!targetEntryKey) return false;
  const draggedEntry = getEntryByRuntimeKey(targetEntryKey);
  if (!draggedEntry) return false;
  const wasInLearningCategory = isEntryInLearningCategory(draggedEntry);

  const ownerEntryKey = getActiveBranchRootEntryKey(selectedEntryKey || targetEntryKey);
  const ownerEntry = getEntryByRuntimeKey(ownerEntryKey);
  if (!ownerEntryKey || !ownerEntry) return false;
  if (ownerEntryKey === targetEntryKey) return false;
  const ownerEntryToken = normalizeSingleLine(getBranchEntryToken(ownerEntry) || "", 240);
  if (!ownerEntryToken) return false;

  settingsState.branchDragGuideDismissed = true;
  persistSettingsState().catch((error) => {
    console.error("persistSettingsState(branchDragGuideDismissed by classify drag) failed", error);
  });
  if (wasInLearningCategory) {
    currentEntries = currentEntries.map((entry) => {
      if (entry._runtimeKey !== targetEntryKey) return entry;
      return { ...entry, folderId: DEFAULT_FOLDER_ID };
    });
  }
  markEntryManuallyClassified(draggedEntry, ownerEntryToken);
  if (normalizeSingleLine(branchAutoSuggestTargetEntryKey || "", 200) === targetEntryKey) {
    branchAutoSuggestSeenEntryKeys.add(targetEntryKey);
    resetBranchAutoSuggestionState({ keepSeen: true });
  }
  branchTreeSelectedNodeId = getBranchTreeEntryNodeId(ownerEntryKey) || branchTreeSelectedNodeId;
  renderTimeline();
  renderLearningCategoryPanel();
  renderBranchThread();
  renderBranchTreePanel();
  renderBranchMiniTimeline();
  await persistCurrentSession({
    entries: currentEntries,
    manualBranchClassifiedEntryKeys: Array.from(manualBranchClassifiedEntryKeys),
    manualBranchClassifiedEntryOwners
  });
  branchManualSelectLockUntil = Date.now() + 3500;
  setDetailMode("branch");
  return true;
}

function buildBranchUserMessageMaps(messages = currentBranchMessages) {
  const byId = new Map();
  const childrenMap = new Map();
  messages.forEach((message, index) => {
    if (!message || message.role !== "user") return;
    const nodeId = String(message.id || `legacy-node-${index}`);
    const parentId = String(message.parentNodeId || "").trim();
    const record = {
      id: nodeId,
      parentId,
      message,
      index
    };
    byId.set(nodeId, record);
    const key = parentId || "__ROOT__";
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key).push(record);
  });
  return { byId, childrenMap };
}

function findBranchQuestionMessageById(nodeId, messages = currentBranchMessages) {
  const targetId = String(nodeId || "").trim();
  if (!targetId) return null;
  return messages.find((message) => message?.role === "user" && String(message?.id || "").trim() === targetId) || null;
}

function jumpToBranchNode(nodeId, options = {}) {
  const message = findBranchQuestionMessageById(nodeId, getBranchVisibleMessages());
  const targetEntryKey = resolveBranchQuestionAnswerEntryKey(message);
  const syncScroll = options.syncScroll !== false;
  if (!targetEntryKey) return false;
  if (targetEntryKey !== selectedEntryKey) {
    selectEntry(targetEntryKey, { syncScroll, force: true }).catch((error) => {
      console.error("selectEntry by branch node failed", error);
    });
    return true;
  }
  sendScrollRequest(targetEntryKey, { force: true }).catch((error) => {
    console.error("sendScrollRequest by branch node failed", error);
  });
  return true;
}

function getBranchTreeEntryNodeId(entryKey) {
  const targetKey = normalizeSingleLine(entryKey || "", 200);
  if (!targetKey) return "";
  return `${BRANCH_TREE_ENTRY_NODE_PREFIX}${targetKey}`;
}

function isBranchTreeEntryNodeId(nodeId) {
  const targetId = normalizeSingleLine(nodeId || "", 240);
  return targetId.startsWith(BRANCH_TREE_ENTRY_NODE_PREFIX);
}

function getBranchLineageState(selectedNodeId, messages = currentBranchMessages) {
  const targetId = String(selectedNodeId || "").trim();
  if (!targetId || targetId === "__root__" || isBranchTreeEntryNodeId(targetId)) {
    return {
      selectedId: targetId,
      ancestorIds: new Set(),
      descendantIds: new Set(),
      pathIds: new Set()
    };
  }
  const { byId, childrenMap } = buildBranchUserMessageMaps(messages);
  if (!byId.has(targetId)) {
    return {
      selectedId: targetId,
      ancestorIds: new Set(),
      descendantIds: new Set(),
      pathIds: new Set([targetId])
    };
  }
  const ancestorIds = new Set();
  const descendantIds = new Set();
  const pathIds = new Set([targetId]);
  let cursor = byId.get(targetId);
  const guard = new Set([targetId]);
  while (cursor?.parentId && byId.has(cursor.parentId) && !guard.has(cursor.parentId)) {
    guard.add(cursor.parentId);
    ancestorIds.add(cursor.parentId);
    pathIds.add(cursor.parentId);
    cursor = byId.get(cursor.parentId);
  }
  const queue = [targetId];
  while (queue.length) {
    const currentId = queue.shift();
    const children = childrenMap.get(currentId) || [];
    children.forEach((child) => {
      if (!child?.id || descendantIds.has(child.id) || child.id === targetId) return;
      descendantIds.add(child.id);
      queue.push(child.id);
    });
  }
  return { selectedId: targetId, ancestorIds, descendantIds, pathIds };
}

function expandBranchPath(nodeId, messages = currentBranchMessages) {
  const targetId = String(nodeId || "").trim();
  if (!targetId || targetId === "__root__" || isBranchTreeEntryNodeId(targetId)) return;
  const { ancestorIds } = getBranchLineageState(targetId, messages);
  ancestorIds.forEach((ancestorId) => branchTreeCollapsedNodeIds.delete(ancestorId));
}

function getBranchTreeNodes() {
  const branchMessages = getBranchVisibleMessages();
  const nodes = [];
  const byId = new Map();
  const orderedEntries = currentEntries
    .slice()
    .sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));

  orderedEntries.forEach((entry) => {
    const nodeId = getBranchTreeEntryNodeId(entry?._runtimeKey || "");
    if (!nodeId) return;
    const ownerEntryKey = normalizeSingleLine(getManualBranchOwnerEntryKey(entry) || "", 200);
    const node = {
      id: nodeId,
      parentId: ownerEntryKey && ownerEntryKey !== entry._runtimeKey ? getBranchTreeEntryNodeId(ownerEntryKey) : "",
      title: clampText(getEntryTitle(entry), 28) || t("branch_tree_root"),
      sourceEntryKey: entry._runtimeKey || "",
      answerEntryKey: entry._runtimeKey || "",
      anchorQuote: "",
      createdAt: Number(entry?.timestamp) || Date.now(),
      level: 0,
      nodeType: "entry"
    };
    nodes.push(node);
    byId.set(nodeId, node);
  });

  branchMessages.forEach((message, index) => {
    if (!message || message.role !== "user") return;
    const nodeId = String(message.id || `legacy-node-${index}`);
    const parentIdRaw = String(message.parentNodeId || "").trim();
    const answerEntryKey = resolveBranchQuestionAnswerEntryKey(message);
    const sourceEntryKey = resolveBranchMessageSourceEntryKey(message);
    const ownerEntryKey = answerEntryKey || sourceEntryKey;
    const ownerEntryNodeId = getBranchTreeEntryNodeId(ownerEntryKey);
    const parentId = parentIdRaw && byId.has(parentIdRaw)
      ? parentIdRaw
      : (ownerEntryNodeId && byId.has(ownerEntryNodeId) ? ownerEntryNodeId : "");
    const titleSource = normalizeSingleLine(message.text || "", 240);
    const title = clampText(titleSource || t("branch_tree_node"), 28);
    const node = {
      id: nodeId,
      parentId,
      title,
        sourceEntryKey: sourceEntryKey || selectedEntryKey || "",
      answerEntryKey,
      anchorQuote: normalizeSingleLine(message.anchorQuote || "", 160),
      createdAt: Number(message.timestamp) || Date.now(),
      level: 0,
      nodeType: "branch"
    };
    nodes.push(node);
    byId.set(nodeId, node);
  });

  nodes.forEach((node) => {
    let level = 0;
    let cursor = node;
    const guard = new Set();
    while (cursor?.parentId && byId.has(cursor.parentId) && !guard.has(cursor.parentId)) {
      guard.add(cursor.parentId);
      cursor = byId.get(cursor.parentId);
      level += 1;
    }
    node.level = level;
  });

  return nodes;
}

function getBranchTreeChildrenMap(nodes) {
  const childrenMap = new Map();
  nodes.forEach((node) => {
    const key = node.parentId || "__ROOT__";
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key).push(node);
  });
  return childrenMap;
}

function renderBranchTreePanel() {
  if (!branchTreePanelEl || !branchTreeListEl) return;
  branchTreePanelEl.hidden = false;
  const branchMessages = getBranchVisibleMessages();
  const nodes = getBranchTreeNodes();
  const collapsedSignature = Array.from(branchTreeCollapsedNodeIds).sort().join("|");
  let selectedNodeId = String(branchTreeSelectedNodeId || "").trim();
  if (!nodes.some((node) => node.id === selectedNodeId)) {
    const preferredEntryNodeId = getBranchTreeEntryNodeId(selectedEntryKey);
    selectedNodeId = nodes.some((node) => node.id === preferredEntryNodeId) ? preferredEntryNodeId : nodes[0]?.id || "";
    branchTreeSelectedNodeId = selectedNodeId;
  }
  expandBranchPath(selectedNodeId, branchMessages);
  const lineage = getBranchLineageState(selectedNodeId, branchMessages);
  const nodeSignature = nodes
    .map((node) => `${node.id}:${node.parentId || ""}:${node.title || ""}:${node.level || 0}:${Number(node.createdAt) || 0}`)
    .join("|");
  const nextSignature = `${currentLocale}|${selectedEntryKey}|${selectedNodeId}|${collapsedSignature}|${nodeSignature}`;
  if (nextSignature === branchTreeRenderSignature) return;
  branchTreeRenderSignature = nextSignature;
  branchTreeListEl.innerHTML = "";
  if (!nodes.length) {
    const empty = document.createElement("p");
    empty.className = "branch-tree-empty";
    empty.textContent = t("branch_empty");
    branchTreeListEl.appendChild(empty);
    return;
  }
  const childrenMap = getBranchTreeChildrenMap(nodes);
  const resolveNodeEntryKey = (node) => {
    if (!node || node.id === "__root__" || isBranchTreeEntryNodeId(node.id)) {
      return String(node?.sourceEntryKey || "").trim();
    }
    return String(node?.answerEntryKey || "").trim();
  };

  const renderNodeRow = (node) => {
    const row = document.createElement("div");
    row.className = "branch-tree-node";
    row.dataset.level = String(Math.max(0, node.level || 0));
    row.style.setProperty("--branch-tree-level", String(Math.max(0, node.level || 0)));
    row.dataset.nodeId = node.id;
    row.classList.toggle("branch-tree-node-current", node.id === lineage.selectedId);
    row.classList.toggle("branch-tree-node-path", lineage.pathIds.has(node.id));
    row.classList.toggle("branch-tree-node-descendant", lineage.descendantIds.has(node.id));

    const children = childrenMap.get(node.id) || [];
    const hasChildren = children.length > 0;
    const collapsed = branchTreeCollapsedNodeIds.has(node.id);

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "branch-tree-toggle";
    toggleBtn.textContent = hasChildren ? (collapsed ? "▸" : "▾") : "";
    toggleBtn.disabled = !hasChildren;
    toggleBtn.addEventListener("click", () => {
      if (!hasChildren) return;
      if (branchTreeCollapsedNodeIds.has(node.id)) {
        branchTreeCollapsedNodeIds.delete(node.id);
      } else {
        branchTreeCollapsedNodeIds.add(node.id);
      }
      renderBranchTreePanel();
    });

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "branch-tree-btn";
    btn.title = t("branch_tree_jump");
    btn.classList.toggle("active", node.id === selectedNodeId);
    const titleWrap = document.createElement("span");
    titleWrap.className = "branch-tree-btn-main";
    const titleText = document.createElement("span");
    titleText.className = "branch-tree-btn-title";
    titleText.textContent = node.title || t("branch_tree_node");
    titleWrap.appendChild(titleText);
    if (node.id !== "__root__") {
      const relationTag = document.createElement("span");
      relationTag.className = `branch-tree-relation-tag level-${Math.min(2, Math.max(0, node.level || 0))}`;
      relationTag.textContent = getBranchLevelLabel(node.level || 0);
      titleWrap.appendChild(relationTag);
    }
    const childCount = children.length;
    if (childCount > 0) {
      const countTag = document.createElement("span");
      countTag.className = "branch-tree-count-tag";
      countTag.textContent = `${childCount}`;
      titleWrap.appendChild(countTag);
    }
    btn.appendChild(titleWrap);
    btn.addEventListener("click", () => {
      branchTreeSelectedNodeId = node.id;
      branchDraftParentNodeId = node.id === "__root__" || isBranchTreeEntryNodeId(node.id) ? "" : node.id;
      expandBranchPath(node.id, branchMessages);
      const targetEntryKey = resolveNodeEntryKey(node);
      if (targetEntryKey && targetEntryKey !== selectedEntryKey) {
        selectEntry(targetEntryKey, { syncScroll: true, force: true }).catch((error) => {
          console.error("selectEntry by branch tree node failed", error);
        });
        return;
      }
      const didJump = node.id !== "__root__" && !isBranchTreeEntryNodeId(node.id)
        ? jumpToBranchNode(node.id, { syncScroll: true })
        : false;
      if (didJump) {
        if (!targetEntryKey || targetEntryKey === selectedEntryKey) {
          renderBranchThread();
          renderSessionMeta();
          updateBranchMetaText();
          if (selectedEntryKey) renderDetail(selectedEntryKey);
          renderNodeEditor(getSelectedEntry());
        }
        return;
      }
      renderBranchThread();
      renderSessionMeta();
      updateBranchMetaText();
      if (selectedEntryKey) renderDetail(selectedEntryKey);
      renderNodeEditor(getSelectedEntry());
      if (targetEntryKey) {
        sendScrollRequest(targetEntryKey, { force: true }).catch((error) => {
          console.error("sendScrollRequest by branch tree node failed", error);
        });
      }
    });

    row.append(toggleBtn, btn);
    branchTreeListEl.appendChild(row);

    if (hasChildren && !collapsed) {
      children
        .slice()
        .sort((a, b) => Number(a?.createdAt || 0) - Number(b?.createdAt || 0))
        .forEach((child) => renderNodeRow(child));
    }
  };

  (childrenMap.get("__ROOT__") || [])
    .slice()
    .sort((a, b) => Number(a?.createdAt || 0) - Number(b?.createdAt || 0))
    .forEach((node) => renderNodeRow(node));
}

function recordBranchMiniEvent(entryKey, type) {
  const targetKey = String(entryKey || selectedEntryKey || "");
  if (!targetKey) return;
  const current = branchMiniTimelineMemory.get(targetKey) || [];
  const next = [...current, { id: createId("timeline"), type, at: Date.now() }].slice(-12);
  branchMiniTimelineMemory.set(targetKey, next);
  scheduleTimelineBranchPreviewRender(targetKey);
}

function renderBranchMiniTimeline() {
  if (!branchMiniTimelineListEl) return;
  const activeTimelineEntryKey = getActiveBranchRootEntryKey(selectedEntryKey);
  const events = branchMiniTimelineMemory.get(activeTimelineEntryKey) || [];
  const eventSignature = events.map((event) => `${event?.id || ""}:${event?.type || ""}:${Number(event?.at) || 0}`).join("|");
  const nextSignature = `${currentLocale}|${activeTimelineEntryKey}|${eventSignature}`;
  if (nextSignature === branchMiniTimelineRenderSignature) return;
  branchMiniTimelineRenderSignature = nextSignature;
  branchMiniTimelineListEl.innerHTML = "";
  if (!events.length) {
    const empty = document.createElement("p");
    empty.className = "branch-mini-timeline-empty";
    empty.textContent = t("branch_timeline_mini_title");
    branchMiniTimelineListEl.appendChild(empty);
    return;
  }
  events
    .slice()
    .reverse()
    .forEach((event) => {
      const item = document.createElement("p");
      item.className = "branch-mini-timeline-item";
      const eventLabel =
        event.type === "answered"
          ? t("branch_timeline_event_answered")
          : event.type === "note"
            ? t("branch_timeline_event_note")
            : t("branch_timeline_event_created");
      item.textContent = `${formatTime(event.at)} · ${eventLabel}`;
      branchMiniTimelineListEl.appendChild(item);
    });
}

function syncBranchAnchorBar() {
  if (!branchAnchorBarEl || !branchAnchorTextEl) return;
  const quote = normalizeSingleLine(branchAnchorQuote || "", 200);
  branchAnchorBarEl.hidden = !quote;
  branchAnchorTextEl.textContent = quote ? t("branch_anchor_from_selection", { quote: clampText(quote, 68) }) : "";
}

function pickSelectionQuoteFromBranchZones() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return "";
  const quote = normalizeSingleLine(selection.toString() || "", 300);
  if (!quote) return "";
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const owner = container && container.nodeType === 1 ? container : container?.parentElement;
  if (!owner || typeof owner.closest !== "function") return "";
  const inBranchThread = Boolean(owner.closest("#branchThread"));
  const inDetailAnswer = Boolean(owner.closest("#detailMarkdown"));
  return inBranchThread || inDetailAnswer ? quote : "";
}

function buildSessionRecord(overrides = {}) {
  const folders = normalizeFolders(overrides.folders ?? currentFolders);
  const folderIds = new Set(folders.map((folder) => folder.id));
  const sourceEntries = (Array.isArray(overrides.entries) ? overrides.entries : currentEntries).filter(
    (entry) => !isVirtualBranchEntry(entry)
  );
  const normalizedSourceEntries = sourceEntries.map((entry) => normalizeEntry(stripRuntimeEntry(entry)));
  const entries = dedupeEntries(normalizedSourceEntries).map((entry) => ({
    ...entry,
    folderId: folderIds.has(entry.folderId) ? entry.folderId : DEFAULT_FOLDER_ID
  }));
  const customTitle = normalizeConversationTitle(overrides.customTitle ?? currentConversationTitle);
  const collapsedIds = normalizeCollapsedFolderIds(
    overrides.collapsedFolderIds ?? Array.from(collapsedFolderIds),
    folders
  );
  const mainNote = normalizeStudyNote(overrides.mainNote !== undefined ? overrides.mainNote : currentMainNote);
  const mainNoteImage = overrides.mainNoteImage !== undefined ? overrides.mainNoteImage : currentMainNoteImage;
  const timelineBookmarks = normalizeTimelineBookmarks(overrides.timelineBookmarks ?? currentTimelineBookmarks);
  const branchNodeNotes = normalizeBranchNodeNotes(overrides.branchNodeNotes ?? currentBranchNodeNotes);
  const manualBranchClassified = normalizeManualBranchClassifiedEntryKeys(
    overrides.manualBranchClassifiedEntryKeys ?? Array.from(manualBranchClassifiedEntryKeys)
  );
  const manualBranchOwners = normalizeManualBranchClassifiedEntryOwners(
    overrides.manualBranchClassifiedEntryOwners ?? manualBranchClassifiedEntryOwners
  );

  return {
    conversationId: currentConversationId,
    url: overrides.url || currentSessionUrl || currentConversationId,
    updatedAt: Date.now(),
    entries,
    customTitle,
    mainNote,
    mainNoteImage,
    timelineBookmarks,
    branchNodeNotes,
    folders,
    collapsedFolderIds: collapsedIds,
    manualBranchClassifiedEntryKeys: manualBranchClassified,
    manualBranchClassifiedEntryOwners: manualBranchOwners
  };
}

function getSessionPersistSignature(record) {
  const safeRecord = record && typeof record === "object" ? record : {};
  const entries = Array.isArray(safeRecord.entries) ? safeRecord.entries : [];
  const folders = Array.isArray(safeRecord.folders) ? safeRecord.folders : [];
  const entrySignature = entries
    .map((entry) =>
      [
        entry?.id || "",
        Number(entry?.timestamp) || 0,
        (entry?.question || "").length,
        (entry?.answerMarkdown || "").length,
        (entry?.studyNote || "").length,
        entry?.studyNoteImage ? 1 : 0,
        entry?.folderId || "",
        Number(entry?.reviewCount) || 0,
        Number(entry?.reviewedAt) || 0
      ].join(":")
    )
    .join("|");
  const folderSignature = folders
    .map((folder) => `${folder?.id || ""}:${folder?.name || ""}:${folder?.parentId || ""}`)
    .join("|");
  const branchNodeNotes = safeRecord.branchNodeNotes && typeof safeRecord.branchNodeNotes === "object" ? safeRecord.branchNodeNotes : {};
  const timelineBookmarks = safeRecord.timelineBookmarks && typeof safeRecord.timelineBookmarks === "object"
    ? safeRecord.timelineBookmarks
    : {};
  const branchNodeNoteSignature = Object.keys(branchNodeNotes)
    .sort()
    .map((nodeId) => {
      const item = branchNodeNotes[nodeId] || {};
      return `${nodeId}:${(item.studyNote || "").length}:${item.studyNoteImage ? 1 : 0}:${item.sourceEntryKey || ""}`;
    })
    .join("|");
  const bookmarkSignature = Object.keys(timelineBookmarks)
    .sort()
    .map((entryId) => {
      const item = timelineBookmarks[entryId] || {};
      return `${entryId}:${item.type || ""}:${(item.note || "").length}:${Number(item.updatedAt) || 0}`;
    })
    .join("|");
  const collapsedSignature = Array.isArray(safeRecord.collapsedFolderIds) ? safeRecord.collapsedFolderIds.join(",") : "";
  const manualClassifiedSignature = Array.isArray(safeRecord.manualBranchClassifiedEntryKeys)
    ? safeRecord.manualBranchClassifiedEntryKeys.join(",")
    : "";
  const manualOwnerSignature = safeRecord.manualBranchClassifiedEntryOwners && typeof safeRecord.manualBranchClassifiedEntryOwners === "object"
    ? Object.keys(safeRecord.manualBranchClassifiedEntryOwners)
      .sort()
      .map((key) => `${key}:${safeRecord.manualBranchClassifiedEntryOwners[key] || ""}`)
      .join(",")
    : "";
  return [
    safeRecord.url || "",
    safeRecord.customTitle || "",
    safeRecord.mainNote || "",
    safeRecord.mainNoteImage ? "1" : "0",
    bookmarkSignature,
    branchNodeNoteSignature,
    folderSignature,
    collapsedSignature,
    manualClassifiedSignature,
    manualOwnerSignature,
    entrySignature
  ].join("||");
}

async function persistCurrentSession(overrides = {}) {
  if (!currentStorageKey || !currentConversationId) return null;
  const record = buildSessionRecord(overrides);
  const signature = getSessionPersistSignature(record);
  if (signature !== lastPersistedSessionSignature) {
    await storageSet({ [currentStorageKey]: record });
    lastPersistedSessionSignature = signature;
  }

  currentSessionUrl = record.url;
  if (Array.isArray(overrides.entries)) {
    currentEntries = overrides.entries;
  } else if (!Array.isArray(currentEntries) || !currentEntries.length) {
    currentEntries = assignRuntimeEntryKeys(record.entries);
  }
  currentConversationTitle = record.customTitle;
  currentMainNote = record.mainNote;
  currentMainNoteImage = record.mainNoteImage;
  currentTimelineBookmarks = normalizeTimelineBookmarks(record.timelineBookmarks || {});
  currentBranchNodeNotes = normalizeBranchNodeNotes(record.branchNodeNotes || {});
  currentFolders = record.folders;
  collapsedFolderIds = new Set(record.collapsedFolderIds || []);
  manualBranchClassifiedEntryKeys = new Set(
    normalizeManualBranchClassifiedEntryKeys(record.manualBranchClassifiedEntryKeys || [])
  );
  manualBranchClassifiedEntryOwners = normalizeManualBranchClassifiedEntryOwners(
    record.manualBranchClassifiedEntryOwners || {}
  );
  setConversationSnapshotCache(currentConversationId, {
    sessionUrl: currentSessionUrl,
    conversationTitle: currentConversationTitle,
    mainNote: currentMainNote,
    mainNoteImage: currentMainNoteImage,
    timelineBookmarks: currentTimelineBookmarks,
    branchNodeNotes: currentBranchNodeNotes,
    folders: currentFolders,
    collapsedFolderIds: Array.from(collapsedFolderIds),
    manualBranchClassifiedEntryKeys: Array.from(manualBranchClassifiedEntryKeys),
    manualBranchClassifiedEntryOwners,
    entries: getPersistableEntries(currentEntries)
  });
  return record;
}

function parseTimestampFromBranchMessageId(messageId) {
  const text = String(messageId || "").trim();
  if (!text) return 0;
  const match = text.match(/^[a-z]+_(\d{10,13})_/i);
  if (!match?.[1]) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeBranchMessage(message, fallbackEntryKey = "") {
  const raw = message && typeof message === "object" ? message : {};
  const directTs = Number(raw.timestamp);
  const legacyCreatedAt = Number(raw.createdAt);
  const parsedIdTs = parseTimestampFromBranchMessageId(raw.id);
  const directSourceEntryKey = normalizeSingleLine(raw?.sourceEntryKey || "", 200);
  const fallbackSourceEntryKey = normalizeSingleLine(fallbackEntryKey || "", 200);
  const directSourceEntry = directSourceEntryKey ? getEntryByRuntimeKey(directSourceEntryKey) : null;
  const fallbackSourceEntry = fallbackSourceEntryKey ? getEntryByRuntimeKey(fallbackSourceEntryKey) : null;
  const sourceEntryKey = directSourceEntry
    ? directSourceEntryKey
    : (fallbackSourceEntry ? fallbackSourceEntryKey : (directSourceEntryKey || fallbackSourceEntryKey));
  const sourceEntry = getEntryByRuntimeKey(sourceEntryKey);
  const directAnswerEntryKey = normalizeSingleLine(raw?.answerEntryKey || "", 200);
  const directAnswerEntry = directAnswerEntryKey ? getEntryByRuntimeKey(directAnswerEntryKey) : null;
  const normalizedTimestamp = Number.isFinite(directTs) && directTs > 0
    ? directTs
    : (Number.isFinite(legacyCreatedAt) && legacyCreatedAt > 0 ? legacyCreatedAt : parsedIdTs || Date.now());
  return {
    ...raw,
    timestamp: normalizedTimestamp,
    sourceEntryKey,
    sourceEntryToken: normalizeSingleLine(raw?.sourceEntryToken || getBranchEntryToken(sourceEntry) || "", 240),
    sourceEntryId: normalizeSingleLine(raw?.sourceEntryId || sourceEntry?.id || "", 200),
    sourceDomIndex: Number.isInteger(raw?.sourceDomIndex)
      ? raw.sourceDomIndex
      : (Number.isInteger(sourceEntry?.domIndex) ? sourceEntry.domIndex : -1),
    sourceTimestamp: Number(raw?.sourceTimestamp) || Number(sourceEntry?.timestamp) || 0,
    answerEntryKey: normalizeSingleLine(raw?.answerEntryKey || "", 200),
    answerEntryToken: normalizeSingleLine(raw?.answerEntryToken || getBranchEntryToken(directAnswerEntry) || "", 240),
    answerEntryId: normalizeSingleLine(raw?.answerEntryId || "", 200),
    answerDomIndex: Number.isInteger(raw?.answerDomIndex) ? raw.answerDomIndex : -1,
    answerTimestamp: Number(raw?.answerTimestamp) || 0
  };
}

function toScopedBranchMessagesForIndex(messages, entryToken, fallbackEntryKey = "") {
  const token = normalizeSingleLine(entryToken || "", 240);
  if (!token || !Array.isArray(messages) || !messages.length) return [];
  return messages
    .slice(-MAX_BRANCH_MESSAGES)
    .map((message, index) => {
      const normalized = normalizeBranchMessage(message, fallbackEntryKey);
      const rawId = normalizeSingleLine(normalized?.id || "", 160) || `legacy-${index}`;
      const rawParentId = normalizeSingleLine(normalized?.parentNodeId || "", 160);
      const rawReplyToId = normalizeSingleLine(normalized?.replyToNodeId || "", 160);
      return {
        ...normalized,
        id: `${token}::${rawId}`,
        parentNodeId: rawParentId ? `${token}::${rawParentId}` : "",
        replyToNodeId: rawReplyToId ? `${token}::${rawReplyToId}` : "",
        _aggregateToken: token
      };
    });
}

function buildConversationBranchIndexMessagesFromStore(store = {}, conversationId = currentConversationId) {
  if (!conversationId) return [];
  const prefix = `${BRANCH_PREFIX}${conversationId}:`;
  const next = [];
  Object.keys(store || {}).forEach((key) => {
    if (!key.startsWith(prefix)) return;
    const token = key.slice(prefix.length);
    if (!token) return;
    const payload = store[key];
    const messages = Array.isArray(payload?.messages) ? payload.messages : Array.isArray(payload) ? payload : [];
    if (!messages.length) return;
    const scoped = toScopedBranchMessagesForIndex(messages, token);
    if (scoped.length) next.push(...scoped);
  });
  next.sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0));
  return next.slice(-BRANCH_INDEX_AGGREGATE_MAX_MESSAGES);
}

function upsertConversationBranchIndexMessages(entryToken, messages, fallbackEntryKey = "") {
  if (!FORCE_BRANCH_INDEX_AGGREGATE_MODE) return;
  const token = normalizeSingleLine(entryToken || "", 240);
  if (!token) return;
  const preserved = currentConversationBranchIndexMessages.filter(
    (message) => normalizeSingleLine(message?._aggregateToken || "", 240) !== token
  );
  const scoped = toScopedBranchMessagesForIndex(messages, token, fallbackEntryKey);
  const next = [...preserved, ...scoped];
  next.sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0));
  currentConversationBranchIndexMessages = next.slice(-BRANCH_INDEX_AGGREGATE_MAX_MESSAGES);
}

function rebuildEntryKeysWithBranchQuestionsFromStore(store = {}) {
  const prefix = `${BRANCH_PREFIX}${currentConversationId}:`;
  const tokensWithUserMessages = new Set();
  const answerLocators = [];
  Object.keys(store || {}).forEach((key) => {
    if (!key.startsWith(prefix)) return;
    const token = key.slice(prefix.length);
    if (!token) return;
    const payload = store[key];
    const messages = Array.isArray(payload?.messages) ? payload.messages : Array.isArray(payload) ? payload : [];
    if (!messages.length) return;
    const hasUserMessage = messages.some((message) => {
      if (message?.role !== "user" || !normalizeMultiline(message?.text || "")) return false;
      answerLocators.push({
        answerEntryKey: normalizeSingleLine(message?.answerEntryKey || "", 200),
        answerEntryToken: normalizeSingleLine(message?.answerEntryToken || "", 240),
        answerEntryId: normalizeSingleLine(message?.answerEntryId || "", 200),
        answerDomIndex: Number.isInteger(message?.answerDomIndex) ? message.answerDomIndex : -1,
        answerTimestamp: Number(message?.answerTimestamp) || 0
      });
      return true;
    });
    if (hasUserMessage) tokensWithUserMessages.add(token);
  });

  const nextQuestions = new Set();
  currentEntries.forEach((entry) => {
    if (!entry?._runtimeKey || isVirtualBranchEntry(entry)) return;
    const tokenCandidates = getBranchEntryTokenCandidates(entry);
    if (tokenCandidates.some((token) => tokensWithUserMessages.has(token))) {
      nextQuestions.add(entry._runtimeKey);
    }
  });

  const nextAnswers = new Set();
  answerLocators.forEach((locator) => {
    const directKey = normalizeSingleLine(locator?.answerEntryKey || "", 200);
    if (directKey && getEntryByRuntimeKey(directKey)) {
      nextAnswers.add(directKey);
      return;
    }
    const byToken = findEntryRuntimeKeyByBranchToken(locator?.answerEntryToken || "");
    if (byToken) {
      nextAnswers.add(byToken);
      return;
    }
    const resolvedKey = findEntryRuntimeKeyByLocateTarget({
      entryId: locator?.answerEntryId || "",
      domIndex: Number.isInteger(locator?.answerDomIndex) && locator.answerDomIndex >= 0 ? locator.answerDomIndex : null,
      timestamp: Number(locator?.answerTimestamp) || 0
    });
    if (resolvedKey) nextAnswers.add(resolvedKey);
  });

  entryKeysWithBranchQuestions = nextQuestions;
  entryKeysWithBranchAnswers = nextAnswers;
}

function resolveBranchQuestionAnswerEntryKey(message) {
  const directKey = normalizeSingleLine(message?.answerEntryKey || "", 200);
  if (directKey && getEntryByRuntimeKey(directKey)) return directKey;
  const byToken = findEntryRuntimeKeyByBranchToken(message?.answerEntryToken || "");
  if (byToken) return byToken;

  const targetEntryId = normalizeSingleLine(message?.answerEntryId || "", 200);
  const targetDomIndex = Number.isInteger(message?.answerDomIndex) && message.answerDomIndex >= 0
    ? message.answerDomIndex
    : null;
  const targetTimestamp = Number(message?.answerTimestamp) || 0;
  const byLocator = findEntryRuntimeKeyByLocateTarget({
    entryId: targetEntryId,
    domIndex: targetDomIndex,
    timestamp: targetTimestamp
  });
  if (byLocator) return byLocator;

  const questionFp = normalizeDedupText(stripSpeakerPrefix(message?.text || "", "user")).slice(0, 120);
  if (!questionFp) return "";
  const questionTimestamp = Number(message?.timestamp) || 0;
  const candidates = currentEntries.filter((entry) => {
    const entryQuestionFp = normalizeDedupText(entry?.question || "").slice(0, 120);
    if (!entryQuestionFp || entryQuestionFp !== questionFp) return false;
    if (!questionTimestamp) return true;
    const delta = Number(entry?.timestamp || 0) - questionTimestamp;
    return delta >= -10 * 1000 && delta <= 30 * 60 * 1000;
  });
  if (!candidates.length) return "";
  candidates.sort((a, b) => Math.abs((a.timestamp || 0) - questionTimestamp) - Math.abs((b.timestamp || 0) - questionTimestamp));
  return candidates[0]?._runtimeKey || "";
}

function resolveBranchMessageSourceEntryKey(message) {
  const directKey = normalizeSingleLine(message?.sourceEntryKey || "", 200);
  if (directKey && getEntryByRuntimeKey(directKey)) return directKey;
  const byToken = findEntryRuntimeKeyByBranchToken(message?.sourceEntryToken || "");
  if (byToken) return byToken;
  const sourceEntryId = normalizeSingleLine(message?.sourceEntryId || "", 200);
  const sourceDomIndex = Number.isInteger(message?.sourceDomIndex) && message.sourceDomIndex >= 0
    ? message.sourceDomIndex
    : null;
  const sourceTimestamp = Number(message?.sourceTimestamp) || 0;
  const byLocator = findEntryRuntimeKeyByLocateTarget({
    entryId: sourceEntryId,
    domIndex: sourceDomIndex,
    timestamp: sourceTimestamp
  });
  if (byLocator) return byLocator;
  return "";
}

function findBranchNodeIdByEntryKey(entryKey, messages = currentBranchMessages) {
  const targetEntryKey = normalizeSingleLine(entryKey || "", 200);
  if (!targetEntryKey || !Array.isArray(messages) || !messages.length) return "";
  const targetEntry = getEntryByRuntimeKey(targetEntryKey);
  const targetTimestamp = Number(targetEntry?.timestamp || 0);
  const matched = [];
  messages.forEach((message) => {
    if (!message || message.role !== "user") return;
    const nodeId = normalizeSingleLine(message.id || "", 120);
    if (!nodeId) return;
    const resolvedEntryKey = resolveBranchQuestionAnswerEntryKey(message);
    if (resolvedEntryKey !== targetEntryKey) return;
    matched.push(message);
  });
  if (!matched.length) return "";
  if (!targetTimestamp) {
    return normalizeSingleLine(matched[matched.length - 1]?.id || "", 120);
  }
  matched.sort((a, b) => {
    const aDelta = Math.abs((Number(a?.timestamp) || 0) - targetTimestamp);
    const bDelta = Math.abs((Number(b?.timestamp) || 0) - targetTimestamp);
    if (aDelta !== bDelta) return aDelta - bDelta;
    return (Number(b?.timestamp) || 0) - (Number(a?.timestamp) || 0);
  });
  return normalizeSingleLine(matched[0]?.id || "", 120);
}

function syncBranchTreeSelectionWithEntry(entryKey) {
  const visibleMessages = getBranchVisibleMessages();
  const nodeId = findBranchNodeIdByEntryKey(entryKey, visibleMessages);
  if (!nodeId) {
    branchTreeSelectedNodeId = "__root__";
    branchDraftParentNodeId = "";
    return;
  }
  branchTreeSelectedNodeId = nodeId;
  branchDraftParentNodeId = nodeId;
  expandBranchPath(nodeId, visibleMessages);
}

async function linkBranchQuestionToTurn(turn) {
  if (!turn || !Array.isArray(currentBranchMessages) || !currentBranchMessages.length) return false;
  const turnQuestionFp = normalizeDedupText(turn.question || "").slice(0, 120);
  if (!turnQuestionFp) return false;
  const turnTimestamp = Number(turn.timestamp) || Date.now();
  const turnEntryId = normalizeSingleLine(turn.id || "", 200);
  const turnDomIndex = Number.isInteger(turn.domIndex) ? turn.domIndex : -1;
  const targetRuntimeKey = findEntryRuntimeKeyByLocateTarget({
    entryId: turnEntryId,
    domIndex: turnDomIndex >= 0 ? turnDomIndex : null,
    timestamp: turnTimestamp
  });

  let targetIndex = -1;
  let nearestDelta = Number.POSITIVE_INFINITY;
  currentBranchMessages.forEach((message, index) => {
    if (message?.role !== "user") return;
    const answerEntryId = normalizeSingleLine(message?.answerEntryId || "", 200);
    if (answerEntryId) return;
    const userQuestionFp = normalizeDedupText(stripSpeakerPrefix(message?.text || "", "user")).slice(0, 120);
    if (!userQuestionFp || userQuestionFp !== turnQuestionFp) return;
    const delta = Math.abs((Number(message?.timestamp) || 0) - turnTimestamp);
    if (delta < nearestDelta) {
      nearestDelta = delta;
      targetIndex = index;
    }
  });
  if (targetIndex < 0 || nearestDelta > 30 * 60 * 1000) return false;

  const targetMessage = currentBranchMessages[targetIndex] || {};
  currentBranchMessages[targetIndex] = normalizeBranchMessage(
    {
      ...targetMessage,
      answerEntryId: turnEntryId,
      answerDomIndex: turnDomIndex,
      answerTimestamp: turnTimestamp,
      answerEntryToken: normalizeSingleLine(getBranchEntryToken(getEntryByRuntimeKey(targetRuntimeKey)) || "", 240),
      answerEntryKey: targetRuntimeKey || normalizeSingleLine(targetMessage?.answerEntryKey || "", 200)
    },
    targetMessage?.sourceEntryKey || selectedEntryKey || ""
  );
  const resolvedAnswerKey = normalizeSingleLine(currentBranchMessages[targetIndex]?.answerEntryKey || "", 200);
  if (resolvedAnswerKey) {
    entryKeysWithBranchAnswers.add(resolvedAnswerKey);
    scheduleTimelineRender();
  }
  await saveBranchThread(resolveBranchMessageSourceEntryKey(currentBranchMessages[targetIndex]) || selectedEntryKey || "");
  return true;
}

async function linkBranchQuestionToAnswerEntry(messageId, patch = {}) {
  const normalizedMessageId = normalizeSingleLine(messageId || "", 120);
  if (!normalizedMessageId || !Array.isArray(currentBranchMessages) || !currentBranchMessages.length) return false;
  const targetIndex = currentBranchMessages.findIndex(
    (message) => message?.role === "user" && normalizeSingleLine(message?.id || "", 120) === normalizedMessageId
  );
  if (targetIndex < 0) return false;

  const targetMessage = currentBranchMessages[targetIndex] || {};
  currentBranchMessages[targetIndex] = normalizeBranchMessage(
    {
      ...targetMessage,
      ...patch
    },
    targetMessage?.sourceEntryKey || selectedEntryKey || ""
  );
  const resolvedAnswerKey = normalizeSingleLine(currentBranchMessages[targetIndex]?.answerEntryKey || "", 200);
  if (resolvedAnswerKey) {
    entryKeysWithBranchAnswers.add(resolvedAnswerKey);
    scheduleTimelineRender();
  }
  await saveBranchThread(resolveBranchMessageSourceEntryKey(currentBranchMessages[targetIndex]) || selectedEntryKey || "");
  return true;
}

async function loadBranchThread(entryKey) {
  const token = ++branchLoadToken;

  const resolvedEntryKey = getManualBranchOwnerEntryKey(entryKey) || entryKey;
  const entry = getEntryByRuntimeKey(resolvedEntryKey);
  if (!currentConversationId || !entry) return;
  const entryTokens = getBranchEntryTokenCandidates(entry);
  if (!entryTokens.length) return;
  const primaryEntryToken = entryTokens[0];
  const branchKeys = entryTokens.map((entryToken) => toBranchKey(currentConversationId, entryToken));
  const primaryKey = branchKeys[0];

  const cachedKey = branchKeys.find((key) => branchThreadMemoryCache.has(key));
  if (cachedKey) {
    if (token !== branchLoadToken) return;
    const cached = branchThreadMemoryCache.get(cachedKey) || [];
    if (cachedKey !== primaryKey) {
      rememberBranchThreadCache(primaryKey, cached);
    }
    currentBranchMessages = cached.slice(-MAX_BRANCH_MESSAGES).map((message) => normalizeBranchMessage(message, resolvedEntryKey));
    syncBranchTreeSelectionWithEntry(entryKey);
    setBranchComposerStatus("");
    renderBranchThread();
    renderSessionMeta();
    updateBranchMetaText();
    if (selectedEntryKey) renderDetail(selectedEntryKey);
    if (cachedKey !== primaryKey) {
      saveBranchThread(resolvedEntryKey).catch((error) => {
        console.error("saveBranchThread migrate from cache failed", error);
      });
    }
    return;
  }

  const result = await storageGet(branchKeys);
  if (token !== branchLoadToken) return;

  let usedKey = "";
  let messages;
  for (const key of branchKeys) {
    const candidate = result?.[key]?.messages;
    if (Array.isArray(candidate)) {
      usedKey = key;
      messages = candidate;
      break;
    }
  }

  if (!Array.isArray(messages) && currentConversationId) {
    currentBranchMessages = [];
    syncBranchTreeSelectionWithEntry(entryKey);
    branchThreadRenderSignature = "";
    renderBranchThread();
    renderSessionMeta();
    updateBranchMetaText();
    if (selectedEntryKey) renderDetail(selectedEntryKey);
    await new Promise((resolve) => setTimeout(resolve, 60));
    if (token !== branchLoadToken) return;

    const fullStore = await storageGet(null);
    if (token !== branchLoadToken) return;
    const prefix = `${BRANCH_PREFIX}${currentConversationId}:`;
    let fallbackMessages = null;
    let fallbackKey = "";
    let fallbackScore = -1;
    let fallbackLatestTs = 0;
    Object.keys(fullStore || {}).forEach((key) => {
      if (!key.startsWith(prefix)) return;
      const payload = fullStore[key];
      const candidateMessages = Array.isArray(payload?.messages) ? payload.messages : Array.isArray(payload) ? payload : [];
      if (!candidateMessages.length) return;
      const normalizedMessages = candidateMessages
        .slice(-MAX_BRANCH_MESSAGES)
        .map((message) => normalizeBranchMessage(message, entryKey));
      let score = 0;
      let latestTs = 0;
      normalizedMessages.forEach((message) => {
        if (message?.role !== "user") return;
        latestTs = Math.max(latestTs, Number(message?.timestamp) || 0);
        const sourceEntryKey = resolveBranchMessageSourceEntryKey(message);
        if (sourceEntryKey && sourceEntryKey === resolvedEntryKey) score += 1;
        const answerEntryKey = resolveBranchQuestionAnswerEntryKey(message);
        if (answerEntryKey && answerEntryKey === entryKey) score += 2;
      });
      if (score <= 0) return;
      if (score > fallbackScore || (score === fallbackScore && latestTs > fallbackLatestTs)) {
        fallbackScore = score;
        fallbackLatestTs = latestTs;
        fallbackMessages = candidateMessages;
        fallbackKey = key;
      }
    });
    if (Array.isArray(fallbackMessages)) {
      messages = fallbackMessages;
      usedKey = fallbackKey;
    }
  }

  if (Array.isArray(messages)) {
    rememberBranchThreadCache(primaryKey, messages);
    branchKeys.forEach((key) => branchThreadMissingKeys.delete(key));
  } else {
    branchKeys.forEach((key) => branchThreadMissingKeys.add(key));
  }

  currentBranchMessages = Array.isArray(messages)
    ? messages.slice(-MAX_BRANCH_MESSAGES).map((message) => normalizeBranchMessage(message, resolvedEntryKey))
    : [];
  syncBranchTreeSelectionWithEntry(entryKey);
  setBranchComposerStatus("");
  renderBranchThread();
  renderSessionMeta();
  updateBranchMetaText();
  if (selectedEntryKey) renderDetail(selectedEntryKey);

  if (Array.isArray(messages) && usedKey && usedKey !== primaryKey) {
    await saveBranchThread(resolvedEntryKey);
  }
}

async function saveBranchThread(entryKey) {
  const entry = getEntryByRuntimeKey(entryKey);
  if (!currentConversationId || !entry) return;
  const entryToken = getBranchEntryToken(entry);
  if (!entryToken) return;
  const key = toBranchKey(currentConversationId, entryToken);
  const snapshotMessages = currentBranchMessages.slice(-MAX_BRANCH_MESSAGES);
  rememberBranchThreadCache(key, snapshotMessages);
  branchThreadMissingKeys.delete(key);
  await storageSet({
    [key]: {
      conversationId: currentConversationId,
      entryId: entry.id,
      entryToken,
      domIndex: Number.isInteger(entry.domIndex) ? entry.domIndex : -1,
      updatedAt: Date.now(),
      messages: snapshotMessages
    }
  });
  upsertConversationBranchIndexMessages(entryToken, snapshotMessages, entryKey);
}

async function appendBranchMessage(entryKey, role, text, extra = {}) {
  const sourceEntryKey = normalizeSingleLine(extra?.sourceEntryKey || entryKey || "", 200);
  const sourceEntry = getEntryByRuntimeKey(sourceEntryKey);
  const message = {
    id: createId("branch"),
    role,
    text,
    timestamp: Date.now(),
    sourceEntryKey,
    sourceEntryToken: normalizeSingleLine(getBranchEntryToken(sourceEntry) || "", 240),
    sourceEntryId: normalizeSingleLine(sourceEntry?.id || "", 200),
    sourceDomIndex: Number.isInteger(sourceEntry?.domIndex) ? sourceEntry.domIndex : -1,
    sourceTimestamp: Number(sourceEntry?.timestamp) || 0,
    parentNodeId: normalizeSingleLine(extra?.parentNodeId || "", 80),
    anchorQuote: normalizeSingleLine(extra?.anchorQuote || "", 220),
    replyToNodeId: normalizeSingleLine(extra?.replyToNodeId || "", 80)
  };
  currentBranchMessages.push(normalizeBranchMessage(message, entryKey));
  currentBranchMessages = currentBranchMessages.slice(-MAX_BRANCH_MESSAGES);
  if (role === "user") {
    recordBranchMiniEvent(entryKey, "created");
    if (entryKey) {
      entryKeysWithBranchQuestions.add(entryKey);
      scheduleTimelineRender();
    }
    if (!branchTreeSelectedNodeId || branchTreeSelectedNodeId === "__root__") {
      branchTreeSelectedNodeId = message.id;
      branchDraftParentNodeId = message.id;
    }
  } else if (role === "assistant") {
    recordBranchMiniEvent(entryKey, "answered");
  }
  renderBranchThread();
  await saveBranchThread(entryKey);
  return message;
}

function updateSelectedStyle(mode = "full") {
  if (activeTimelineButtonKey !== selectedEntryKey) {
    if (activeTimelineButtonEl) {
      activeTimelineButtonEl.classList.remove("active");
    }
    activeTimelineButtonEl = timelineButtonMap.get(selectedEntryKey) || null;
    if (activeTimelineButtonEl) {
      activeTimelineButtonEl.classList.add("active");
    }
    activeTimelineButtonKey = selectedEntryKey;
  }
  if (mode !== "full") return;
  if (branchTimelineListEl) {
    branchTimelineListEl.querySelectorAll(".branch-timeline-dot").forEach((dot) => {
      const active = dot.dataset.entryKey === selectedEntryKey;
      dot.classList.toggle("active", active);
    });
  }
  updateNoteHistoryActiveStyle();
  if (typeof renderTimelineBranchPreviews === "function") renderTimelineBranchPreviews();
}

function scheduleBranchThreadLoad(entryKey) {
  if (!entryKey) return;
  const token = ++branchLoadDebounceToken;
  if (branchLoadDebounceTimer) clearTimeout(branchLoadDebounceTimer);
  branchLoadDebounceTimer = setTimeout(() => {
    branchLoadDebounceTimer = null;
    if (token !== branchLoadDebounceToken) return;
    loadBranchThread(entryKey).catch((error) => {
      console.error("loadBranchThread failed", error);
    });
  }, 16);
}

function scheduleTimelineRender() {
  if (panelResizeActive) {
    deferredResizeRenderPending = true;
    return;
  }
  if (timelineRenderRafId || timelineRenderTimer) return;
  timelineRenderTimer = setTimeout(() => {
    timelineRenderTimer = 0;
    timelineRenderRafId = window.requestAnimationFrame(() => {
      timelineRenderRafId = 0;
      renderTimeline();
    });
  }, 24);
}

function schedulePostSelectionRender(entryKey, options = {}) {
  if (postSelectionRenderTimer) clearTimeout(postSelectionRenderTimer);
  const delay = panelResizeActive ? PANEL_RESIZE_SETTLE_MS : POST_SELECTION_RENDER_DELAY_MS;
  postSelectionRenderTimer = setTimeout(() => {
    postSelectionRenderTimer = 0;
    if (panelResizeActive) {
      schedulePostSelectionRender(entryKey, options);
      return;
    }
    if (entryKey && entryKey !== selectedEntryKey) return;
    if (options?.selectionChanged) {
      renderBranchThread();
      syncBranchAnchorBar();
    }
    renderMainLearningMap();
    renderSessionMeta();
    updateBranchMetaText();
  }, delay);
}

function scheduleBranchStorageSync(changedKeys = []) {
  (changedKeys || []).forEach((key) => {
    if (key) pendingBranchStorageKeys.add(key);
  });
  if (branchStorageSyncTimer) clearTimeout(branchStorageSyncTimer);
  branchStorageSyncTimer = setTimeout(() => {
    branchStorageSyncTimer = 0;
    const keys = Array.from(pendingBranchStorageKeys);
    pendingBranchStorageKeys.clear();
    keys.forEach((key) => {
      branchThreadMemoryCache.delete(key);
      branchThreadMissingKeys.delete(key);
    });
    storageGet(null)
      .then((allStorage) => {
        currentConversationBranchIndexMessages = FORCE_BRANCH_INDEX_AGGREGATE_MODE
          ? buildConversationBranchIndexMessagesFromStore(allStorage, currentConversationId)
          : [];
        rebuildEntryKeysWithBranchQuestionsFromStore(allStorage);
        timelineRenderSignature = "";
        learningCategoryRenderSignature = "";
        scheduleTimelineRender();
        renderMainLearningMap();
        if (selectedEntryKey) scheduleBranchThreadLoad(selectedEntryKey);
      })
      .catch((error) => {
        console.error("storage branch sync failed:", error);
      });
  }, 180);
}

function renderBranchQuickTimeline() {
  if (!branchTimelineRailEl || !branchTimelineListEl) return;
  branchTimelineRailEl.hidden = true;
  branchTimelineListEl.innerHTML = "";
}

async function updateWorkspaceEmptyDiagnostic() {
  return;
}

function renderTimeline() {
  const perfMark = perfStart();
  const currentBuildToken = ++timelineTreeBuildToken;
  if (timelineRenderTimer) {
    clearTimeout(timelineRenderTimer);
    timelineRenderTimer = 0;
  }
  if (timelineRenderRafId) {
    window.cancelAnimationFrame(timelineRenderRafId);
    timelineRenderRafId = 0;
  }
  renderTimelineFilterButtons();
  // In minimal workspace, keep the tree visible by default.
  workspaceTreeCollapsed = false;
  if (collapsedFolderIds.has(DEFAULT_FOLDER_ID)) {
    collapsedFolderIds.delete(DEFAULT_FOLDER_ID);
  }

  if (!currentEntries.length) {
    timelineRenderSignature = "empty";
    timelineListEl.innerHTML = "";
    timelineEmptyEl.style.display = "block";
    timelineEmptyEl.textContent = t("timeline_empty");
    if (detailTitleEl) detailTitleEl.textContent = t("detail_select_hint");
    detailTimeEl.textContent = "";
    detailTimeEl.style.color = "var(--muted)";
    if (detailMarkdownEl) detailMarkdownEl.textContent = "";
    branchMetaEl.textContent = t("branch_meta_hint");
    branchInputEl.value = "";
    selectedEntryKey = "";
    selectedContextEntryKeys.clear();
    currentBranchMessages = [];
    currentConversationBranchIndexMessages = [];
    currentBranchNodeNotes = {};
    timelineButtonMap.clear();
    timelineBranchPreviewMap.clear();
    activeTimelineButtonEl = null;
    activeTimelineButtonKey = "";
    renderBranchThread();
    renderBranchQuickTimeline();
    renderContextSelectionMeta();
    setStudyHelperStatus("");
    if (locateBtnEl) locateBtnEl.disabled = true;
    setBranchBusy(false);
    renderNodeEditor(null);
    if (isNotePaneVisible()) refreshNoteHistoryPanel();
    return;
  }

  const filteredEntries = getFilteredTimelineEntries();
  renderLearningCategoryPanel();
  renderPendingQuestionBoard();
  const validFolderIds = new Set(currentFolders.map((folder) => folder.id));
  timelineFolderFilterIds = new Set([...timelineFolderFilterIds].filter((folderId) => validFolderIds.has(folderId)));
  if (timelineFolderFilterIds.size > 0) {
    timelineFolderFilterIds.forEach((folderId) => expandTimelineFolderPath(folderId));
  }
  collapsedFolderIds = new Set([...collapsedFolderIds].filter((folderId) => validFolderIds.has(folderId)));
  const entrySignature = filteredEntries
    .map((entry) => {
      const folderId = ensureValidFolderId(entry?.folderId, currentFolders);
      return `${entry._runtimeKey}:${Number(entry.timestamp) || 0}:${entry.studyNote ? 1 : 0}:${folderId}`;
    })
    .join("|");
  const dayCollapseSignature = Array.from(collapsedFolderIds).sort().join(",");
  const folderFilterSignature = Array.from(timelineFolderFilterIds).sort().join(",");
  const branchMarkerSignature = `${Array.from(entryKeysWithBranchQuestions).sort().join(",")}|${Array.from(entryKeysWithBranchAnswers).sort().join(",")}`;
  const manualClassifiedSignature = `${Array.from(manualBranchClassifiedEntryKeys).sort().join(",")}|${Object.keys(manualBranchClassifiedEntryOwners)
    .sort()
    .map((key) => `${key}:${manualBranchClassifiedEntryOwners[key] || ""}`)
    .join(",")}`;
  const pendingModeSignature = `${pendingQuestionBoardMode}:${getActiveBranchRootEntryKey(selectedEntryKey)}`;
  const nextSignature = `${currentLocale}|${pendingModeSignature}|${timelineFilterMode}|${timelineFolderItemSortOrder}|${normalizeSingleLine(
    timelineSearchText || "",
    200
  )}|${folderFilterSignature}|${workspaceTreeCollapsed ? "tree-collapsed" : "tree-open"}|${dayCollapseSignature}|${manualClassifiedSignature}|${branchMarkerSignature}|${entrySignature}`;
  const canReuseTimelineList = timelineRenderSignature === nextSignature && timelineListEl.childElementCount > 0;

  if (!filteredEntries.length) {
    timelineRenderSignature = `${nextSignature}|filtered-empty`;
    timelineListEl.innerHTML = "";
    timelineEmptyEl.style.display = "block";
    timelineEmptyEl.textContent = getPendingQuestionEmptyText();
    const existingKeys = new Set(currentEntries.map((entry) => entry._runtimeKey));
    selectedContextEntryKeys = new Set([...selectedContextEntryKeys].filter((entryKey) => existingKeys.has(entryKey)));
    if (!selectedContextEntryKeys.size && selectedEntryKey && existingKeys.has(selectedEntryKey)) {
      selectedContextEntryKeys.add(selectedEntryKey);
    }
    updateSelectedStyle();
    renderContextSelectionMeta();
    if (selectedEntryKey && existingKeys.has(selectedEntryKey)) {
      renderDetail(selectedEntryKey);
    }
    renderBranchQuickTimeline();
    updateStudyProgressHint();
    if (isNotePaneVisible()) refreshNoteHistoryPanel();
    return;
  }

  timelineEmptyEl.style.display = "none";
  timelineEmptyEl.textContent = t("timeline_empty");
  if (!canReuseTimelineList) {
    timelineRenderSignature = nextSignature;
    timelineBranchMarkerSignature = branchMarkerSignature;
    timelineListEl.innerHTML = "";
    timelineButtonMap.clear();
    timelineBranchPreviewMap.clear();
    activeTimelineButtonEl = null;
    activeTimelineButtonKey = "";
    const ordered = filteredEntries
      .slice()
      .sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
    timelineListEl.appendChild(createLearningQueueListSection(ordered));
  }
  if (canReuseTimelineList && timelineBranchMarkerSignature !== branchMarkerSignature) {
    timelineBranchMarkerSignature = branchMarkerSignature;
    syncTimelineNodeBranchStates();
    renderTimelineBranchPreviews(true);
  }

  const existingKeys = new Set(filteredEntries.map((entry) => entry._runtimeKey));
  const allKeys = new Set(currentEntries.map((entry) => entry._runtimeKey));
  const prevSelectedEntryKey = selectedEntryKey;
  if (selectedEntryKey !== "" && !existingKeys.has(selectedEntryKey)) {
    const selectedEntry = getEntryByRuntimeKey(selectedEntryKey);
    const hiddenByCategory = Boolean(selectedEntry && isEntryInLearningCategory(selectedEntry));
    if (!hiddenByCategory) {
      const ownerEntryKey = getManualBranchOwnerEntryKey(selectedEntryKey);
      if (ownerEntryKey && existingKeys.has(ownerEntryKey)) {
        selectedEntryKey = ownerEntryKey;
      } else {
        selectedEntryKey = filteredEntries[filteredEntries.length - 1]._runtimeKey;
      }
    } else {
      selectedEntryKey = prevSelectedEntryKey;
    }
  }

  selectedContextEntryKeys = new Set([...selectedContextEntryKeys].filter((entryKey) => allKeys.has(entryKey)));
  if (!selectedContextEntryKeys.size && selectedEntryKey) {
    selectedContextEntryKeys.add(selectedEntryKey);
  }

  updateSelectedStyle();
  renderContextSelectionMeta();
  renderDetail(selectedEntryKey);
  if (selectedEntryKey && selectedEntryKey !== prevSelectedEntryKey) {
    scheduleBranchThreadLoad(selectedEntryKey);
  }
  renderBranchQuickTimeline();
  refreshStudyToolPanels();
  if (detailMode === "note" || compactWorkspacePane === "note") {
    refreshNoteHistoryPanel();
  }
  recordSidePanelPerf("renderTimeline", perfMark, {
    entries: currentEntries.length,
    filtered: filteredEntries.length,
    reused: canReuseTimelineList ? 1 : 0
  });
}

function renderDetail(entryKey) {
  if (entryKey === "") {
    cancelScheduledDetailMarkdownRender();
    detailRenderSignature = `empty:${currentLocale}`;
    if (detailBranchViewEl) {
      detailBranchViewEl.hidden = false;
      detailBranchViewEl.classList.add("detail-view-active");
    }

    if (detailTitleEl) detailTitleEl.textContent = t("detail_select_hint");
    detailTimeEl.textContent = "";
    detailTimeEl.style.color = "var(--muted)";
    if (locateBtnEl) locateBtnEl.disabled = true;
    renderNodeEditor(null);
    if (branchToolsOpen) renderReviewSprintPanel();
    setBranchBusy(false);
    return;
  }

  if (detailBranchViewEl) {
    detailBranchViewEl.hidden = false;
    detailBranchViewEl.classList.add("detail-view-active");
  }

  const entry = getEntryByRuntimeKey(entryKey);
  if (!entry) {
    cancelScheduledDetailMarkdownRender();
    detailRenderSignature = `missing:${entryKey}:${currentLocale}`;
    if (detailTitleEl) detailTitleEl.textContent = t("detail_select_hint");
    detailTimeEl.textContent = "";
    detailTimeEl.style.color = "var(--muted)";
    if (detailMarkdownEl) detailMarkdownEl.textContent = "";
    if (locateBtnEl) locateBtnEl.disabled = true;
    renderNodeEditor(null);
    if (branchToolsOpen) renderReviewSprintPanel();
    return;
  }

  const nextDetailSignature = getEntryDetailRenderSignature(entry);
  if (nextDetailSignature === detailRenderSignature) {
    if (locateBtnEl) locateBtnEl.disabled = false;
    setBranchBusy(false);
    return;
  }
  detailRenderSignature = nextDetailSignature;
  const branchTitle = getActiveBranchNodeDisplayTitle();
  if (detailTitleEl) detailTitleEl.textContent = branchTitle || getEntryTitle(entry);
  detailTimeEl.textContent = buildEntryStudyTimeText(entry);
  detailTimeEl.style.color = "var(--muted)";
  if (detailMarkdownEl) scheduleDetailMarkdownRender(entry);
  renderNodeEditor(entry);

  if (locateBtnEl) locateBtnEl.disabled = false;
  if (branchToolsOpen) renderReviewSprintPanel();
  setBranchBusy(false);
}

function buildBranchContextFragments(contextEntries, askMode = "quick") {
  const mode = askMode === "deep" ? "deep" : "quick";
  const maxEntries = mode === "deep" ? 6 : 4;
  const perEntryLimit = mode === "deep" ? 900 : 500;
  const totalLimit = mode === "deep" ? 5200 : 2300;
  let totalUsed = 0;

  return (contextEntries || [])
    .slice(-maxEntries)
    .map((item, idx) => {
      const title = clampText(getEntryTitle(item), 160);
      const questionText = normalizeSingleLine(item?.question || "", 240);
      const answerText = normalizeMultiline(item?.answerMarkdown || "").replace(/\s+/g, " ").trim();
      const noteText = normalizeMultiline(item?.studyNote || "").replace(/\s+/g, " ").trim();
      const fragmentParts = [];
      if (questionText) fragmentParts.push(`题目: ${questionText}`);
      if (answerText) fragmentParts.push(`答案要点: ${clampText(answerText, mode === "deep" ? 620 : 260)}`);
      if (noteText) fragmentParts.push(`学习笔记: ${clampText(noteText, mode === "deep" ? 300 : 180)}`);
      const joined = clampText(fragmentParts.join("\n"), perEntryLimit);
      if (!joined) return null;
      totalUsed += joined.length;
      if (totalUsed > totalLimit) return null;
      return {
        index: idx + 1,
        id: item.id,
        entryToken: getBranchEntryToken(item),
        timestamp: item.timestamp || 0,
        nodeTitle: title,
        folderName: clampText(getFolderNameById(item.folderId), 80),
        snippet: joined
      };
    })
    .filter(Boolean);
}

function buildStudyNoteSuggestionText(type, entry) {
  const title = getEntryTitle(entry);
  const hasImage = Boolean(currentStudyNoteImageBase64 || entry?.studyNoteImage);
  if (currentLocale === "en") {
    if (type === "structure") {
      return "Core Point:\n- \n\nSolve Steps:\n1. \n2. \n3. \n\nCommon Pitfalls:\n- \n\nReview Checklist:\n- ";
    }
    if (type === "steps") {
      return `Solve Steps:\n1. What is the goal of "${title}"?\n2. Which known rule or formula applies?\n3. What is the key intermediate step?\n4. How do I verify the final answer?`;
    }
    if (type === "pitfalls") {
      return `Common Pitfalls:\n- The condition or hidden constraint in "${title}" is easy to miss.\n- Be careful about sign, unit, boundary, and special-case checks.\n- Write one sentence on how to avoid the same error next time.`;
    }
    if (type === "review") {
      return "Review Checklist:\n- Can I restate the core idea in one sentence?\n- Can I redo it without looking at the answer?\n- Can I identify the first step quickly?\n- Do I know the easiest place to make a mistake?";
    }
    if (type === "image") {
      return hasImage
        ? "Image Note:\n- What part of the image is the key evidence?\n- Which step does this image support?\n- What mistake or confusion did this image help resolve?"
        : "Image Note:\n- Add an image first, then describe what the image proves, where it helps, and what to watch out for.";
    }
    return "";
  }

  if (type === "structure") {
    return "\u6838\u5fc3\u7ed3\u8bba\uff1a\n- \n\n\u89e3\u9898\u6b65\u9aa4\uff1a\n1. \n2. \n3. \n\n\u6613\u9519\u70b9\uff1a\n- \n\n\u590d\u4e60\u68c0\u67e5\uff1a\n- ";
  }
  if (type === "steps") {
    return `\u89e3\u9898\u6b65\u9aa4\uff1a\n1. \u8fd9\u9898\u8981\u89e3\u51b3\u7684\u76ee\u6807\u662f\u4ec0\u4e48\uff1f\n2. \u9700\u8981\u7528\u5230\u54ea\u4e2a\u89c4\u5219\u3001\u516c\u5f0f\u6216\u601d\u8def\uff1f\n3. \u6700\u5173\u952e\u7684\u4e2d\u95f4\u6b65\u9aa4\u662f\u4ec0\u4e48\uff1f\n4. \u6211\u600e\u4e48\u9a8c\u8bc1\u6700\u540e\u7ed3\u679c\uff1f\n\u9898\u76ee\uff1a${title}`;
  }
  if (type === "pitfalls") {
    return `\u6613\u9519\u70b9\uff1a\n- \u5bb9\u6613\u5ffd\u7565\u7684\u6761\u4ef6\uff1a\n- \u7b26\u53f7\u3001\u5355\u4f4d\u3001\u8fb9\u754c\u6216\u7279\u6b8a\u60c5\u51b5\uff1a\n- \u4e0b\u6b21\u907f\u514d\u540c\u7c7b\u9519\u8bef\u7684\u65b9\u6cd5\uff1a\n\u9898\u76ee\uff1a${title}`;
  }
  if (type === "review") {
    return "\u590d\u4e60\u68c0\u67e5\uff1a\n- \u6211\u80fd\u7528\u4e00\u53e5\u8bdd\u8bf4\u51fa\u6838\u5fc3\u601d\u8def\u5417\uff1f\n- \u4e0d\u770b\u7b54\u6848\u80fd\u91cd\u505a\u5417\uff1f\n- \u6211\u77e5\u9053\u7b2c\u4e00\u6b65\u5e94\u8be5\u505a\u4ec0\u4e48\u5417\uff1f\n- \u6700\u5bb9\u6613\u9519\u7684\u5730\u65b9\u662f\u4ec0\u4e48\uff1f";
  }
  if (type === "image") {
    return hasImage
      ? "\u56fe\u7247\u7b14\u8bb0\uff1a\n- \u56fe\u91cc\u6700\u5173\u952e\u7684\u4fe1\u606f\u662f\u4ec0\u4e48\uff1f\n- \u5b83\u652f\u6301\u54ea\u4e2a\u89e3\u9898\u6b65\u9aa4\uff1f\n- \u5b83\u5e2e\u6211\u89e3\u51b3\u4e86\u54ea\u4e2a\u7591\u60d1\u6216\u9519\u8bef\uff1f"
      : "\u56fe\u7247\u7b14\u8bb0\uff1a\n- \u5148\u6dfb\u52a0\u56fe\u7247\uff0c\u518d\u5199\u5b83\u8bc1\u660e\u4e86\u4ec0\u4e48\u3001\u5e2e\u52a9\u4e86\u54ea\u4e00\u6b65\u3001\u9700\u8981\u6ce8\u610f\u4ec0\u4e48\u3002";
  }

  if (type === "structure") {
    return "核心结论：\n- \n\n解题步骤：\n1. \n2. \n3. \n\n易错点：\n- \n\n复习清单：\n- ";
  }
  if (type === "steps") {
    return `解题步骤：\n1. 这道“${title}”先看清题目要我求什么。\n2. 确认对应的公式、概念或判定方法。\n3. 写出最关键的中间步骤。\n4. 最后检查结果是否合理。`;
  }
  if (type === "pitfalls") {
    return `易错点：\n- “${title}”里最容易漏掉的条件是什么？\n- 计算时要特别检查符号、单位、边界和特殊情况。\n- 写一句下次如何避免同类错误。`;
  }
  if (type === "review") {
    return "复习清单：\n- 我能不能用一句话说清核心结论？\n- 我能不能不看答案重做一遍？\n- 我是否知道第一步该做什么？\n- 我是否知道最容易错在哪里？";
  }
  if (type === "image") {
    return hasImage
      ? "图片说明：\n- 这张图里最关键的信息是什么？\n- 它对应解题的哪一步？\n- 它帮我纠正了什么误解或错误？"
      : "图片说明：\n- 先上传相关图片，再补充这张图说明了什么、帮助了哪一步、需要注意什么。";
  }
  return "";
}

function applyStudyNoteSuggestion(type) {
  if (!studyNoteInputEl || studyNoteInputEl.disabled) return;
  const entry = getSelectedEntry();
  if (!entry) {
    setStudyNoteStatus(t("study_note_select_entry_ph"), true);
    return;
  }
  const snippet = buildStudyNoteSuggestionText(type, entry);
  if (!snippet) return;
  const current = normalizeStudyNote(studyNoteInputEl.value || "");
  studyNoteInputEl.value = current ? `${current}\n\n${snippet}` : snippet;
  setStudyNoteStatus(t("study_note_suggestion_applied"));
  studyNoteInputEl.focus();
  saveStudyNote().catch((error) => {
    console.error("saveStudyNote after suggestion failed", error);
  });
}

function requestBranchAnswer(entry, question, contextEntries, options = {}) {
  return new Promise((resolve, reject) => {
    queryActiveGeminiTab(currentConversationId).then((activeTab) => {
      if (!activeTab?.id) {
        reject(new Error("Gemini tab not found"));
        return;
      }

      const askMode = getBranchAskMode(options);
      const selectedEntryToken = getBranchEntryToken(entry);
      const branchRequestId = options?.branchRequestId || createId("branchreq");
      const onStage = typeof options?.onStage === "function" ? options.onStage : () => {};
      const contextRefs = buildBranchContextFragments(contextEntries, askMode);
      onStage("dispatch", { askMode, contextCount: contextRefs.length });

      sendMessageWithAutoInject(activeTab.id, {
        type: "GEMINI_BRANCH_ASK",
        payload: {
          askMode,
          conversationId: currentConversationId,
          entryId: entry.id,
          entryToken: selectedEntryToken,
          branchRequestId,
          question: clampText(question, 1600),
          contextRefs
        }
      })
        .then((response) => {
          if (!response?.ok) {
            reject(new Error(response?.error || "branch ask failed"));
            return;
          }
          resolve({
            answer: String(response?.answer || ""),
            meta: response?.meta && typeof response.meta === "object" ? response.meta : {}
          });
        })
        .catch((error) => {
          reject(new Error(error?.message || "sendMessage failed"));
        });
    });
  });
}

async function requestContentDebugStats(preferredConversationId = "") {
  const activeTab = await queryActiveGeminiTab(preferredConversationId || currentConversationId);
  if (!activeTab?.id) return null;
  try {
    const response = await sendMessageWithAutoInject(activeTab.id, {
      type: "GEMINI_DEBUG_STATS",
      conversationId: preferredConversationId || currentConversationId
    });
    return response?.ok ? (response.stats || null) : null;
  } catch {
    return null;
  }
}

function buildBranchDispatchStatusMessage(stats, branchRequestId, elapsedSec = 0) {
  if (!stats || !branchRequestId || String(stats.branchDispatchId || "") !== String(branchRequestId)) {
    return "";
  }
  const stage = String(stats.branchDispatchStage || "");
  if (!stage) return "";
  if (stage === "branch_ask_error") {
    return t("branch_stage_error", { error: stats.lastError || "unknown error" });
  }
  if (stage === "answer_received") {
    return t("branch_stage_done", { elapsed: Math.max(1, Number(elapsedSec) || 1) });
  }
  if (
    stage === "branch_ask_start" ||
    stage === "composer_lookup_start" ||
    stage === "composer_not_found"
  ) {
    return t("branch_dispatch_lookup");
  }
  if (
    stage === "composer_found" ||
    stage === "composer_fill_attempt" ||
    stage === "composer_fill_ok" ||
    stage === "composer_setrangetext_ok" ||
    stage === "composer_execcommand_ok" ||
    stage === "composer_synced_no_send"
  ) {
    return t("branch_dispatch_fill");
  }
  if (stage === "send_button_wait_start" || stage === "send_button_wait_timeout") {
    return t("branch_dispatch_ready");
  }
  if (stage === "send_button_ready" || stage === "send_trigger_ok") {
    return t("branch_dispatch_send");
  }
  if (stage === "pending_cached" || stage === "pending_found") {
    return t("branch_dispatch_queue");
  }
  if (
    stage === "pending_consume_start" ||
    stage === "pending_retry" ||
    stage === "pending_retry_exhausted"
  ) {
    return t("branch_dispatch_pending_retry");
  }
  if (stage === "pending_sent") {
    return t("branch_dispatch_sent_waiting");
  }
  return "";
}

function buildStudyQuickPrompt(action, entry) {
  const nodeTitle = getEntryTitle(entry);
  const noteText = normalizeStudyNote(entry.studyNote || "");
  const bookmark = getEntryTimelineBookmark(entry);
  const bookmarkLabel = bookmark ? getEntryTimelineBookmarkTypeLabel(entry) : "";
  const bookmarkBlockZh = bookmark
    ? `\n当前学习标签：${bookmarkLabel}${bookmark.note ? `\n书签备注：${bookmark.note}` : ""}\n`
    : "\n";
  const bookmarkBlockEn = bookmark
    ? `\nCurrent learning tag: ${bookmarkLabel}${bookmark.note ? `\nBookmark note: ${bookmark.note}` : ""}\n`
    : "\n";
  const noteBlockZh = noteText ? `\n已有学习笔记（可参考但不要机械重复）：\n${noteText}\n` : "\n";
  const noteBlockEn = noteText ? `\nExisting study note (use if helpful, do not repeat mechanically):\n${noteText}\n` : "\n";
  const sharedPrefixZh = `你是我的学习助手。请只基于“当前分问题”和我勾选的上下文回答；如果信息不足，要明确说明“不足以确定”，不要编造。\n当前分问题：${nodeTitle}\n`;
  const sharedPrefixEn = `You are my study assistant. Use only the current sub-question and checked context nodes. If the information is insufficient, say so clearly instead of guessing.\nCurrent sub-question: ${nodeTitle}\n`;

  if (action === "simplify" || action === "example" || action === "pitfall" || action === "practice") {
    const quickTasks = {
      simplify: currentLocale === "en"
        ? "Explain this sub-question in the simplest useful way. Focus on the core idea, use one short analogy only if helpful, and end with one check question."
        : "\u628a\u8fd9\u4e2a\u5206\u95ee\u9898\u7528\u6700\u7b80\u5355\u3001\u6700\u597d\u61c2\u7684\u65b9\u5f0f\u8bb2\u6e05\u695a\uff1b\u5148\u8bf4\u6838\u5fc3\u70b9\uff0c\u5fc5\u8981\u65f6\u7528\u4e00\u4e2a\u7c7b\u6bd4\uff0c\u6700\u540e\u7ed9\u4e00\u4e2a\u68c0\u67e5\u7406\u89e3\u7684\u5c0f\u95ee\u9898\u3002",
      example: currentLocale === "en"
        ? "Give one concrete example. Show it step by step, explain why each step is needed, and end with a similar mini exercise."
        : "\u7ed9\u4e00\u4e2a\u5177\u4f53\u4f8b\u5b50\uff1b\u6309\u6b65\u9aa4\u5c55\u793a\uff0c\u8bf4\u660e\u6bcf\u6b65\u4e3a\u4ec0\u4e48\u8fd9\u6837\u505a\uff0c\u6700\u540e\u7ed9\u4e00\u4e2a\u76f8\u4f3c\u5c0f\u7ec3\u4e60\u3002",
      pitfall: currentLocale === "en"
        ? "List 3 likely pitfalls. For each, explain the symptom, cause, and fix, then end with a pre-answer checklist."
        : "\u5217\u51fa 3 \u4e2a\u6700\u5bb9\u6613\u51fa\u9519\u7684\u70b9\uff1b\u6bcf\u4e2a\u8bf4\u6e05\u8868\u73b0\u3001\u539f\u56e0\u548c\u4fee\u6b63\u65b9\u6cd5\uff0c\u6700\u540e\u7ed9\u7b54\u9898\u524d\u68c0\u67e5\u6e05\u5355\u3002",
      practice: currentLocale === "en"
        ? "Create 3 short practice questions from easy to harder. Put questions first, then concise answers with key reasoning."
        : "\u51fa 3 \u9053\u4ece\u7b80\u5355\u5230\u7a0d\u96be\u7684\u77ed\u7ec3\u4e60\uff1b\u5148\u7ed9\u9898\u76ee\uff0c\u518d\u7ed9\u7b54\u6848\u548c\u5173\u952e\u63a8\u7406\u3002"
    };
    const prefix = currentLocale === "en" ? sharedPrefixEn : sharedPrefixZh;
    const bookmarkBlock = currentLocale === "en" ? bookmarkBlockEn : bookmarkBlockZh;
    const noteBlock = currentLocale === "en" ? noteBlockEn : noteBlockZh;
    return `${prefix}${bookmarkBlock}${noteBlock}${quickTasks[action] || ""}`;
  }

  if (currentLocale === "en") {
    if (action === "summary") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: produce a precise review summary for this sub-question.
Requirements:
1) Focus only on the current sub-question.
2) Output exactly 4 sections in plain text:
Core Point:
Solve Framework:
Common Pitfalls:
Quick Recall:
3) Each section stays concise and actionable.
4) Avoid generic encouragement and filler.`;
    }
    if (action === "quiz") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: generate 5 progressive practice questions for the current sub-question.
Requirements:
1) Cover basic understanding to harder transfer.
2) Output in this order:
Questions:
1. ...
2. ...
Answers and Explanations:
1. answer + key reasoning
2. answer + key reasoning
3) Keep each explanation focused on why the answer is correct.`;
    }
    if (action === "mistake") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: create an error-analysis review for the current sub-question.
Requirements:
1) Identify 3-5 likely mistakes.
2) For each mistake, explain:
- what the mistake is
- why it happens
- how to correct it
3) End with a short self-check workflow I can reuse next time.`;
    }
    if (action === "flashcards") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: generate at least 8 flashcards for memorization.
Requirements:
1) Use Q/A format only.
2) Cover concept, method, trigger conditions, and common pitfalls.
3) Keep each answer short, exact, and easy to memorize.
4) Avoid repeating nearly identical cards.`;
    }
    if (action === "simplify") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: explain this sub-question in the simplest useful way.
Requirements:
1) Use plain language and one short analogy if helpful.
2) Keep the answer focused on what I must understand first.
3) End with one check question to confirm understanding.`;
    }
    if (action === "example") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: give one concrete example for this sub-question.
Requirements:
1) Show the example step by step.
2) Explain why each step is needed.
3) End with a similar mini exercise.`;
    }
    if (action === "pitfall") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: identify the most likely pitfalls for this sub-question.
Requirements:
1) List 3 pitfalls.
2) For each one, show the symptom and the fix.
3) End with a quick checklist before answering.`;
    }
    if (action === "practice") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: create 3 short practice questions for this sub-question.
Requirements:
1) Sort from easy to hard.
2) Include concise answers after the questions.
3) Explain the key reasoning, not just the final result.`;
    }
    return "";
  }

  if (action === "summary") {
    return `${sharedPrefixZh}${bookmarkBlockZh}${noteBlockZh}
任务：围绕当前分问题生成高质量复习总结。
要求：
1）只聚焦当前分问题，不泛化到无关内容。
2）严格输出 4 段纯文本：
核心结论：
解题框架：
易错点：
速记清单：
3）每段简洁、可直接复习。
4）不要空话，不要重复题干。`;
  }
  if (action === "quiz") {
    return `${sharedPrefixZh}${bookmarkBlockZh}${noteBlockZh}
任务：基于当前分问题生成 5 道难度递进的自测题。
要求：
1）覆盖基础理解、方法应用、易错辨析、综合迁移。
2）按这个顺序输出：
题目：
1. ...
2. ...
答案与解析：
1. 答案：...
解析：...
3）解析重点说明“为什么对”，不要只报结果。`;
  }
  if (action === "mistake") {
    return `${sharedPrefixZh}${bookmarkBlockZh}${noteBlockZh}
任务：做一份针对当前分问题的错题复盘。
要求：
1）列出 3-5 个最可能出现的错误。
2）每个错误都要写清：
- 错在哪里
- 为什么会错
- 正确修正步骤
3）最后补一个“以后再做这类题的自检流程”。`;
  }
  if (action === "flashcards") {
    return `${sharedPrefixZh}${bookmarkBlockZh}${noteBlockZh}
任务：生成不少于 8 条记忆卡片。
要求：
1）严格使用 Q/A 格式。
2）覆盖概念、方法、触发条件、易错点。
3）答案要短、准、方便速记。
4）不要生成内容高度重复的卡片。`;
  }
  return "";
}

function buildAutoStudyNotePrompt(entry, contextEntries = []) {
  const nodeTitle = getEntryTitle(entry);
  const existingNote = normalizeStudyNote(entry.studyNote || "");
  const bookmark = getEntryTimelineBookmark(entry);
  const bookmarkLabel = bookmark ? getEntryTimelineBookmarkTypeLabel(entry) : "";
  const contextFragments = buildBranchContextFragments(contextEntries, "quick");
  const contextBlockZh = contextFragments.length
    ? `\n关联上下文（只可引用这些信息）：\n${contextFragments.map((item) => `- ${item.nodeTitle}\n${item.snippet}`).join("\n\n")}\n`
    : "\n";
  const contextBlockEn = contextFragments.length
    ? `\nRelated context (only use these references):\n${contextFragments.map((item) => `- ${item.nodeTitle}\n${item.snippet}`).join("\n\n")}\n`
    : "\n";
  const existingNoteZh = existingNote ? `\n已有笔记（可参考并优化）：\n${existingNote}\n` : "\n";
  const existingNoteEn = existingNote ? `\nExisting note (improve if useful):\n${existingNote}\n` : "\n";
  const sharedZh = `仅基于当前分问题和我勾选的上下文内容生成笔记。当前分问题：${nodeTitle}\n`;
  const sharedEn = `Use only the selected node and checked context nodes to generate the note.\nCurrent node: ${nodeTitle}\n`;

  if (currentLocale === "en") {
    return `${sharedEn}${contextBlockEn}${existingNoteEn}Output a concise note directly usable in a textarea.
Rules:
1) Keep within 220 words.
2) Use exactly 4 sections in plain text:
Core Point:
Solve Steps:
Common Pitfalls:
Review Checklist:
3) Keep each section practical and short.
4) No markdown headings, no code block, no extra explanation.`;
  }

  return `${sharedZh}${contextBlockZh}${existingNoteZh}请输出可直接保存到笔记框的精简内容。
要求：
1）控制在220字以内。
2）严格使用4段纯文本结构：
核心结论：
解题步骤：
易错点：
复习清单：
3）每段简短、可执行。
4）不要使用 Markdown 标题，不要代码块，不要额外解释。`;
}

function getStudyActionLabel(action) {
  if (action === "summary") return t("study_action_summary");
  if (action === "quiz") return t("study_action_quiz");
  if (action === "mistake") return t("study_action_mistake");
  if (action === "flashcards") return t("study_action_flashcards");
  if (action === "simplify") return currentLocale === "en" ? "Simplify" : "\u8bb2\u7b80\u5355\u70b9";
  if (action === "example") return currentLocale === "en" ? "Example" : "\u4e3e\u4e2a\u4f8b\u5b50";
  if (action === "pitfall") return currentLocale === "en" ? "Pitfalls" : "\u54ea\u91cc\u6613\u9519";
  if (action === "practice") return currentLocale === "en" ? "Practice" : "\u51fa\u9898\u7ec3\u4e60";
  return t("study_actions_title");
}

function buildStudyQuickPrompt(action, entry) {
  const nodeTitle = getEntryTitle(entry);
  const noteText = normalizeStudyNote(entry.studyNote || "");
  const bookmark = getEntryTimelineBookmark(entry);
  const bookmarkLabel = bookmark ? getEntryTimelineBookmarkTypeLabel(entry) : "";
  const bookmarkBlockZh = bookmark
    ? `\n当前学习标签：${bookmarkLabel}${bookmark.note ? `\n书签备注：${bookmark.note}` : ""}\n`
    : "\n";
  const bookmarkBlockEn = bookmark
    ? `\nCurrent learning tag: ${bookmarkLabel}${bookmark.note ? `\nBookmark note: ${bookmark.note}` : ""}\n`
    : "\n";
  const noteBlockZh = noteText ? `\n已有学习笔记（可参考但不要机械重复）：\n${noteText}\n` : "\n";
  const noteBlockEn = noteText ? `\nExisting study note (use if helpful, do not repeat mechanically):\n${noteText}\n` : "\n";
  const sharedPrefixZh =
    `你是我的学习助手。请只基于“当前分问题”和我勾选的上下文回答；如果信息不足，要明确说明“不足以确定”，不要编造。\n当前分问题：${nodeTitle}\n`;
  const sharedPrefixEn =
    `You are my study assistant. Use only the current sub-question and checked context nodes. If the information is insufficient, say so clearly instead of guessing.\nCurrent sub-question: ${nodeTitle}\n`;

  if (action === "simplify" || action === "example" || action === "pitfall" || action === "practice") {
    const quickTasks = {
      simplify: currentLocale === "en"
        ? "Explain this sub-question in the simplest useful way. Focus on the core idea, use one short analogy only if helpful, and end with one check question."
        : "\u628a\u8fd9\u4e2a\u5206\u95ee\u9898\u7528\u6700\u7b80\u5355\u3001\u6700\u597d\u61c2\u7684\u65b9\u5f0f\u8bb2\u6e05\u695a\uff1b\u5148\u8bf4\u6838\u5fc3\u70b9\uff0c\u5fc5\u8981\u65f6\u7528\u4e00\u4e2a\u7c7b\u6bd4\uff0c\u6700\u540e\u7ed9\u4e00\u4e2a\u68c0\u67e5\u7406\u89e3\u7684\u5c0f\u95ee\u9898\u3002",
      example: currentLocale === "en"
        ? "Give one concrete example. Show it step by step, explain why each step is needed, and end with a similar mini exercise."
        : "\u7ed9\u4e00\u4e2a\u5177\u4f53\u4f8b\u5b50\uff1b\u6309\u6b65\u9aa4\u5c55\u793a\uff0c\u8bf4\u660e\u6bcf\u6b65\u4e3a\u4ec0\u4e48\u8fd9\u6837\u505a\uff0c\u6700\u540e\u7ed9\u4e00\u4e2a\u76f8\u4f3c\u5c0f\u7ec3\u4e60\u3002",
      pitfall: currentLocale === "en"
        ? "List 3 likely pitfalls. For each, explain the symptom, cause, and fix, then end with a pre-answer checklist."
        : "\u5217\u51fa 3 \u4e2a\u6700\u5bb9\u6613\u51fa\u9519\u7684\u70b9\uff1b\u6bcf\u4e2a\u8bf4\u6e05\u8868\u73b0\u3001\u539f\u56e0\u548c\u4fee\u6b63\u65b9\u6cd5\uff0c\u6700\u540e\u7ed9\u7b54\u9898\u524d\u68c0\u67e5\u6e05\u5355\u3002",
      practice: currentLocale === "en"
        ? "Create 3 short practice questions from easy to harder. Put questions first, then concise answers with key reasoning."
        : "\u51fa 3 \u9053\u4ece\u7b80\u5355\u5230\u7a0d\u96be\u7684\u77ed\u7ec3\u4e60\uff1b\u5148\u7ed9\u9898\u76ee\uff0c\u518d\u7ed9\u7b54\u6848\u548c\u5173\u952e\u63a8\u7406\u3002"
    };
    const prefix = currentLocale === "en" ? sharedPrefixEn : sharedPrefixZh;
    const bookmarkBlock = currentLocale === "en" ? bookmarkBlockEn : bookmarkBlockZh;
    const noteBlock = currentLocale === "en" ? noteBlockEn : noteBlockZh;
    return `${prefix}${bookmarkBlock}${noteBlock}${quickTasks[action] || ""}`;
  }

  if (currentLocale === "en") {
    if (action === "summary") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: produce a precise review summary for this sub-question.
Requirements:
1) Focus only on the current sub-question.
2) Output exactly 4 sections in plain text:
Core Point:
Solve Framework:
Common Pitfalls:
Quick Recall:
3) Each section stays concise and actionable.
4) Avoid generic encouragement and filler.`;
    }
    if (action === "quiz") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: generate 5 progressive practice questions for the current sub-question.
Requirements:
1) Cover basic understanding to harder transfer.
2) Output in this order:
Questions:
1. ...
2. ...
Answers and Explanations:
1. answer + key reasoning
2. answer + key reasoning
3) Keep each explanation focused on why the answer is correct.`;
    }
    if (action === "mistake") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: create an error-analysis review for the current sub-question.
Requirements:
1) Identify 3-5 likely mistakes.
2) For each mistake, explain:
- what the mistake is
- why it happens
- how to correct it
3) End with a short self-check workflow I can reuse next time.`;
    }
    if (action === "flashcards") {
      return `${sharedPrefixEn}${bookmarkBlockEn}${noteBlockEn}
Task: generate at least 8 flashcards for memorization.
Requirements:
1) Use Q/A format only.
2) Cover concept, method, trigger conditions, and common pitfalls.
3) Keep each answer short, exact, and easy to memorize.
4) Avoid repeating nearly identical cards.`;
    }
    return "";
  }

  if (action === "summary") {
    return `${sharedPrefixZh}${bookmarkBlockZh}${noteBlockZh}
任务：围绕当前分问题生成高质量复习总结。
要求：
1) 只聚焦当前分问题，不泛化到无关内容。
2) 严格输出 4 段纯文本：
核心结论：
解题框架：
易错点：
速记清单：
3) 每段简洁、可直接复习。
4) 不要空话，不要重复题干。`;
  }
  if (action === "quiz") {
    return `${sharedPrefixZh}${bookmarkBlockZh}${noteBlockZh}
任务：基于当前分问题生成 5 道难度递进的自测题。
要求：
1) 覆盖基础理解、方法应用、易错辨析、综合迁移。
2) 按这个顺序输出：
题目：
1. ...
2. ...
答案与解析：
1. 答案：...
解析：...
3) 解析重点说明“为什么对”，不要只报结果。`;
  }
  if (action === "mistake") {
    return `${sharedPrefixZh}${bookmarkBlockZh}${noteBlockZh}
任务：做一份针对当前分问题的错题复盘。
要求：
1) 列出 3-5 个最可能出现的错误。
2) 每个错误都要写清：
- 错在哪里
- 为什么会错
- 正确修正步骤
3) 最后补一个“以后再做这类题的自检流程”。`;
  }
  if (action === "flashcards") {
    return `${sharedPrefixZh}${bookmarkBlockZh}${noteBlockZh}
任务：生成不少于 8 条记忆卡片。
要求：
1) 严格使用 Q/A 格式。
2) 覆盖概念、方法、触发条件、易错点。
3) 答案要短、准、方便速记。
4) 不要生成内容高度重复的卡片。`;
  }
  return "";
}

function buildAutoStudyNotePrompt(entry, contextEntries = []) {
  const nodeTitle = getEntryTitle(entry);
  const existingNote = normalizeStudyNote(entry.studyNote || "");
  const bookmark = getEntryTimelineBookmark(entry);
  const bookmarkLabel = bookmark ? getEntryTimelineBookmarkTypeLabel(entry) : "";
  const contextFragments = buildBranchContextFragments(contextEntries, "quick");
  const bookmarkBlockZh = bookmark
    ? `\n当前学习标签：${bookmarkLabel}${bookmark.note ? `\n书签备注：${bookmark.note}` : ""}\n`
    : "\n";
  const bookmarkBlockEn = bookmark
    ? `\nCurrent learning tag: ${bookmarkLabel}${bookmark.note ? `\nBookmark note: ${bookmark.note}` : ""}\n`
    : "\n";
  const contextBlockZh = contextFragments.length
    ? `\n关联上下文（只可引用这些信息）：\n${contextFragments.map((item) => `- ${item.nodeTitle}\n${item.snippet}`).join("\n\n")}\n`
    : "\n";
  const contextBlockEn = contextFragments.length
    ? `\nRelated context (only use these references):\n${contextFragments.map((item) => `- ${item.nodeTitle}\n${item.snippet}`).join("\n\n")}\n`
    : "\n";
  const existingNoteZh = existingNote ? `\n已有笔记（可参考并优化）：\n${existingNote}\n` : "\n";
  const existingNoteEn = existingNote ? `\nExisting note (improve if useful):\n${existingNote}\n` : "\n";
  const sharedZh = `仅基于当前分问题和我勾选的上下文内容生成笔记。当前分问题：${nodeTitle}\n`;
  const sharedEn = `Use only the selected node and checked context nodes to generate the note.\nCurrent node: ${nodeTitle}\n`;

  if (currentLocale === "en") {
    return `${sharedEn}${bookmarkBlockEn}${contextBlockEn}${existingNoteEn}Output a concise note directly usable in a textarea.
Rules:
1) Keep within 220 words.
2) Use exactly 4 sections in plain text:
Core Point:
Solve Steps:
Common Pitfalls:
Review Checklist:
3) Keep each section practical and short.
4) No markdown headings, no code block, no extra explanation.`;
  }

  return `${sharedZh}${bookmarkBlockZh}${contextBlockZh}${existingNoteZh}请输出可直接保存到笔记框的精简内容。
要求：
1) 控制在 220 字以内。
2) 严格使用 4 段纯文本结构：
核心结论：
解题步骤：
易错点：
复习清单：
3) 每段简短、可执行。
4) 不要使用 Markdown 标题，不要代码块，不要额外解释。`;
}

async function runStudyQuickAction(action) {
  if (branchBusy) return;
  let entry = getSelectedEntry();
  entry = ensureEntryMatchesStudyScope(entry, {
    renderDetail: false,
    announceRedirect: Boolean(entry),
    reportEmpty: true
  });
  if (!entry) {
    const fallbackPool = getStudyCandidateEntries();
    if (fallbackPool.length) {
      entry = fallbackPool[0];
      selectedEntryKey = entry._runtimeKey;
      updateSelectedStyle();
    } else {
      const fallbackContext = getEffectiveContextEntries();
      if (fallbackContext.length) {
        entry = fallbackContext[fallbackContext.length - 1];
        selectedEntryKey = entry._runtimeKey;
        updateSelectedStyle();
      }
    }
  }
  entry = ensureEntryMatchesStudyScope(entry, { renderDetail: false, reportEmpty: true });
  if (!entry) return;

  const prompt = buildStudyQuickPrompt(action, entry);
  if (!prompt) return;
  await handleBranchSend(prompt, { askMode: "quick", displayQuestion: `[${getStudyActionLabel(action)}]` });
  setBranchToolsOpen(false);
}

async function generateStudyNote() {
  if (branchBusy) return;
  const entry = getSelectedEntry();
  if (!entry) {
    setStudyNoteStatus(t("study_note_select_entry_ph"), true);
    return;
  }

  let contextEntries = getContextEntries();
  if (!contextEntries.length) {
    contextEntries = getEffectiveContextEntries(entry);
  }
  if (!contextEntries.length) {
    contextEntries = [entry];
  } else if (!contextEntries.some((item) => item._runtimeKey === entry._runtimeKey)) {
    contextEntries = [...contextEntries, entry];
  }

  setBranchBusy(true);
  setStudyNoteStatus(t("study_note_generating"));
  try {
    const prompt = buildAutoStudyNotePrompt(entry, contextEntries);
    const response = await requestBranchAnswer(entry, prompt, contextEntries, { askMode: "quick" });
    const generated = normalizeStudyNote(response?.answer || "");
    if (!generated) throw new Error("empty generated note");

    if (studyNoteInputEl) {
      studyNoteInputEl.disabled = false;
      studyNoteInputEl.value = generated;
    }
    await saveStudyNote();
    setStudyNoteStatus(t("study_note_generated"));
  } catch (error) {
    console.error("generateStudyNote failed", error);
    setStudyNoteStatus(t("study_note_generate_failed"), true);
  } finally {
    setBranchBusy(false);
  }
}

async function pickRandomNodeForStudy() {
  const pool = getStudyCandidateEntries({ scopeMode: studyScopeMode });
  if (!pool.length) {
    setStudyHelperStatus(getStudyScopeEmptyMessage(studyScopeMode), true);
    return;
  }

  let candidates = pool;
  if (selectedEntryKey && pool.length > 1) {
    const narrowed = pool.filter((entry) => entry._runtimeKey !== selectedEntryKey);
    if (narrowed.length) candidates = narrowed;
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  if (!picked) {
    setStudyHelperStatus(getStudyScopeEmptyMessage(studyScopeMode), true);
    return;
  }

  await selectEntry(picked._runtimeKey, { syncScroll: false });
  setDetailMode("branch");
  setStudyHelperStatus(t("study_helper_random", { title: clampText(getEntryTitle(picked), 20) }));
}

async function focusNextReviewSprintCard(options = {}) {
  const ordered = getOrderedReviewEntries("review");
  if (!ordered.length) {
    if (reviewSprintActive) {
      setStudyHelperStatus(currentLocale === "en" ? "Review sprint complete." : "回看冲刺已完成。");
    }
    reviewSprintActive = false;
    renderReviewSprintPanel();
    return null;
  }
  let picked = ordered[0]?.entry || null;
  if (!picked) {
    reviewSprintActive = false;
    renderReviewSprintPanel();
    return null;
  }
  if (selectedEntryKey && ordered.length > 1 && picked._runtimeKey === selectedEntryKey) {
    const alternative = ordered.find((item) => item.entry._runtimeKey !== selectedEntryKey);
    if (alternative?.entry) picked = alternative.entry;
  }
  await selectEntry(picked._runtimeKey, { syncScroll: false });
  setDetailMode("branch");
  if (options.showStatus !== false) {
    setStudyHelperStatus(t("study_helper_review", { title: clampText(getEntryTitle(picked), 20) }));
  }
  renderReviewSprintPanel();
  return picked;
}

async function startReviewSprint() {
  reviewSprintCompletedKeys.clear();
  reviewSprintActive = true;
  setStudyScopeMode("review");
  const picked = await focusNextReviewSprintCard({ showStatus: false });
  if (!picked) {
    setStudyHelperStatus(getReviewSprintEmptyText(), true);
    return;
  }
  setStudyHelperStatus(currentLocale === "en" ? "Review sprint started." : "已开始回看冲刺。");
}

function stopReviewSprint() {
  reviewSprintActive = false;
  renderReviewSprintPanel();
  setStudyHelperStatus(currentLocale === "en" ? "Review sprint stopped." : "已结束回看冲刺。");
}

async function toggleReviewSprint() {
  if (reviewSprintActive) {
    stopReviewSprint();
    return;
  }
  await startReviewSprint();
}

async function pickSpacedReviewNode() {
  const studyEntries = getStudyCandidateEntries({ scopeMode: studyScopeMode });
  if (!studyEntries.length) {
    setStudyHelperStatus(getStudyScopeEmptyMessage(studyScopeMode), true);
    return;
  }
  const weighted = getOrderedReviewEntries(studyScopeMode);

  let picked = weighted[0]?.entry || null;
  if (!picked) {
    setStudyHelperStatus(getStudyScopeEmptyMessage(studyScopeMode), true);
    return;
  }
  if (selectedEntryKey && weighted.length > 1 && picked._runtimeKey === selectedEntryKey) {
    const alternative = weighted.find((item) => item.entry._runtimeKey !== selectedEntryKey);
    if (alternative?.entry) picked = alternative.entry;
  }

  await selectEntry(picked._runtimeKey, { syncScroll: false });
  setDetailMode("branch");
  setStudyHelperStatus(t("study_helper_review", { title: clampText(getEntryTitle(picked), 20) }));
}

async function markCurrentEntryReviewed(options = {}) {
  if (!currentConversationId || !currentStorageKey) return;
  const entry = getSelectedEntry();
  if (!entry) {
    setStudyHelperStatus(t("study_helper_empty"), true);
    return;
  }

  const now = Date.now();
  const nextCount = Math.max(0, Number(entry.reviewCount || 0)) + 1;
  currentEntries = currentEntries.map((item) => {
    if (item._runtimeKey !== entry._runtimeKey) return item;
    return {
      ...item,
      reviewedAt: now,
      reviewCount: nextCount
    };
  });
  if (reviewSprintActive) {
    reviewSprintCompletedKeys.add(entry._runtimeKey);
  }
  await persistCurrentSession({ entries: currentEntries });
  setStudyHelperStatus(t("study_helper_marked", { title: clampText(getEntryTitle(entry), 20) }));
  if (options.autoNext) {
    if (reviewSprintActive) {
      await focusNextReviewSprintCard({ showStatus: false });
    } else {
      await pickSpacedReviewNode();
    }
  } else {
    scheduleTimelineRender();
  }
  renderReviewSprintPanel();
}

async function handleBranchSend(overrideQuestion = "", options = {}) {
  if (branchBusy) return;

  let entry = getSelectedEntry();
  if (!entry) {
    const fallbackContext = getEffectiveContextEntries();
    if (fallbackContext.length) {
      entry = fallbackContext[fallbackContext.length - 1];
      selectedEntryKey = entry._runtimeKey;
      updateSelectedStyle();
    }
  }
  if (!entry) return;
  setDetailMode("branch");

  const question = normalizeMultiline(overrideQuestion || branchInputEl.value);
  if (!question) {
    branchInputEl.focus();
    return;
  }

  let contextEntries = getContextEntries();
  if (!contextEntries.length) {
    contextEntries = getEffectiveContextEntries(entry);
  }
  if (!contextEntries.length) {
    contextEntries = [entry];
  } else if (!contextEntries.some((item) => item._runtimeKey === entry._runtimeKey)) {
    contextEntries = [...contextEntries, entry];
  }

  branchInputEl.value = "";
  setBranchModeMenuOpen(false);
  setBranchToolsOpen(false);
  clearBranchStatusTimer();
  const askMode = getBranchAskMode(options);
  const modeLabel = askMode === "deep" ? t("composer_mode_thinking") : t("composer_mode_standard");
  setBranchComposerStatus(t("branch_stage_prepare", { mode: modeLabel }));
  const userDisplayQuestion = options.displayQuestion ? options.displayQuestion : question;
  const parentNodeId = normalizeSingleLine(
    options.parentNodeId || branchDraftParentNodeId || branchTreeSelectedNodeId || "",
    80
  );
  const anchorQuote = normalizeSingleLine(options.anchorQuote || branchAnchorQuote || "", 220);
  const userMessage = await appendBranchMessage(entry._runtimeKey, "user", userDisplayQuestion, {
    sourceEntryKey: entry._runtimeKey,
    parentNodeId: parentNodeId === "__root__" ? "" : parentNodeId,
    anchorQuote
  });
  setBranchBusy(true);

  try {
    const startedAt = Date.now();
    setBranchComposerStatus(t("branch_stage_dispatch"));
    const responseRequestId = createId("branchstatus");
    let branchDispatchPollToken = 0;
    branchStatusTimer = setInterval(() => {
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const currentToken = ++branchDispatchPollToken;
      requestContentDebugStats(currentConversationId)
        .then((stats) => {
          if (!branchBusy || currentToken !== branchDispatchPollToken) return;
          const dispatchStatus = buildBranchDispatchStatusMessage(
            stats,
            responseRequestId,
            elapsedSec
          );
          if (dispatchStatus) {
            setBranchComposerStatus(dispatchStatus);
            return;
          }
          setBranchComposerStatus(t("branch_stage_waiting", { elapsed: elapsedSec }));
        })
        .catch(() => {
          if (!branchBusy || currentToken !== branchDispatchPollToken) return;
          setBranchComposerStatus(t("branch_stage_waiting", { elapsed: elapsedSec }));
        });
    }, BRANCH_STATUS_TICK_MS);

    const response = await requestBranchAnswer(entry, question, contextEntries, {
      ...options,
      askMode,
      branchRequestId: responseRequestId
    });
    const answer = response?.answer || "";
    const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    if (response?.meta?.fallbackUsed) {
      setBranchComposerStatus(t("branch_stage_fallback"));
    }
    if (answer) {
      const optimisticRuntimeKey = upsertOptimisticBranchAnswerEntry(entry, userMessage, answer);
      if (optimisticRuntimeKey) {
        await linkBranchQuestionToAnswerEntry(userMessage?.id || "", {
          answerEntryKey: optimisticRuntimeKey,
          answerEntryToken: normalizeSingleLine(getBranchEntryToken(getEntryByRuntimeKey(optimisticRuntimeKey)) || "", 240),
          answerEntryId: getEntryByRuntimeKey(optimisticRuntimeKey)?.id || "",
          answerDomIndex: -1,
          answerTimestamp: Date.now()
        });
      }
      await appendBranchMessage(entry._runtimeKey, "assistant", answer, {
        sourceEntryKey: entry._runtimeKey,
        replyToNodeId: userMessage?.id || ""
      });
      setBranchComposerStatus(t("branch_stage_done", { elapsed: elapsedSec }));
      branchAnchorQuote = "";
      syncBranchAnchorBar();
    } else {
      await appendBranchMessage(entry._runtimeKey, "assistant", t("branch_no_answer"), {
        sourceEntryKey: entry._runtimeKey,
        replyToNodeId: userMessage?.id || ""
      });
      setBranchComposerStatus(t("branch_no_answer"), true);
    }
  } catch (error) {
    await appendBranchMessage(entry._runtimeKey, "assistant", t("send_failed", { error: error.message || "unknown error" }), {
      sourceEntryKey: entry._runtimeKey,
      replyToNodeId: userMessage?.id || ""
    });
    setBranchComposerStatus(t("branch_stage_error", { error: error?.message || "unknown error" }), true);
  } finally {
    clearBranchStatusTimer();
    setBranchBusy(false);
  }
}

async function sendScrollRequest(entryKey, options = {}) {
  if (!entryKey) return false;
  const now = Date.now();
  if (!options?.force && entryKey === lastScrollRequestEntryKey && now - lastScrollRequestAt < SCROLL_REQUEST_DUPLICATE_WINDOW_MS) {
    return true;
  }
  lastScrollRequestEntryKey = entryKey;
  lastScrollRequestAt = now;
  const entry = getEntryByRuntimeKey(entryKey);
  if (!entry) return false;
  if (options?.ensureConversation) {
    try {
      await navigateGeminiTabToConversation(currentConversationId);
    } catch (error) {
      console.warn("navigate before sendScrollRequest failed", error);
    }
  }
  const activeTab = await queryActiveGeminiTab(currentConversationId);
  if (!activeTab?.id) return false;
  const response = await sendMessageWithAutoInject(activeTab.id, {
    type: "GEMINI_SCROLL_TO_ENTRY",
    conversationId: currentConversationId,
    entryId: entry.id,
    domIndex: Number.isInteger(entry.domIndex) ? entry.domIndex : null,
    strictEntryMatch: true,
    force: Boolean(options?.force)
  });
  return Boolean(response?.ok);
}

function appendTextToBranchComposer(text, options = {}) {
  const normalized = normalizeMultiline(text || "");
  if (!normalized || !branchInputEl) return false;
  const current = normalizeMultiline(branchInputEl.value);
  branchInputEl.value = current ? `${current}\n${normalized}` : normalized;
  if (options?.setAnchor !== false) {
    branchAnchorQuote = normalizeSingleLine(normalized, 220);
    syncBranchAnchorBar();
  }
  branchInputEl.focus();
  setBranchBusy(branchBusy);
  return true;
}

async function requestPageSelectionQuote() {
  const activeTab = await queryActiveGeminiTab(currentConversationId);
  if (!activeTab?.id) return "";
  const response = await sendMessageWithAutoInject(activeTab.id, {
    type: "GEMINI_GET_ACTIVE_SELECTION",
    conversationId: currentConversationId
  });
  if (!response?.ok) return "";
  return normalizeMultiline(response?.text || "");
}

function scheduleScrollRequest(entryKey, options = {}) {
  if (!entryKey) return;
  if (options?.force && !panelResizeActive) {
    if (pendingScrollRequestTimer) {
      clearTimeout(pendingScrollRequestTimer);
      pendingScrollRequestTimer = null;
    }
    pendingScrollRequestEntryKey = "";
    pendingScrollRequestToken += 1;
    sendScrollRequest(entryKey, options).catch((error) => {
      console.error("scheduleScrollRequest(force) failed", error);
    });
    return;
  }
  pendingScrollRequestEntryKey = entryKey;
  const token = ++pendingScrollRequestToken;
  if (pendingScrollRequestTimer) clearTimeout(pendingScrollRequestTimer);
  pendingScrollRequestTimer = setTimeout(() => {
    pendingScrollRequestTimer = null;
    if (token !== pendingScrollRequestToken) return;
    const targetKey = pendingScrollRequestEntryKey;
    pendingScrollRequestEntryKey = "";
    sendScrollRequest(targetKey, options).catch((error) => {
      console.error("scheduleScrollRequest failed", error);
    });
  }, panelResizeActive ? PANEL_RESIZE_SETTLE_MS : SCROLL_REQUEST_DEBOUNCE_MS);
}

function scheduleSelectEntry(entryKey, options = {}) {
  if (!entryKey) return;
  pendingSelectEntryKey = entryKey;
  const nextOptions = options && typeof options === "object" ? options : {};
  pendingSelectEntryOptions = {
    syncScroll: Boolean(pendingSelectEntryOptions?.syncScroll || nextOptions.syncScroll),
    force: Boolean(pendingSelectEntryOptions?.force || nextOptions.force),
    openWorkbench: Boolean(pendingSelectEntryOptions?.openWorkbench || nextOptions.openWorkbench)
  };
  if (pendingSelectEntryRafId) return;
  pendingSelectEntryRafId = window.requestAnimationFrame(() => {
    pendingSelectEntryRafId = 0;
    const targetKey = pendingSelectEntryKey;
    const targetOptions = pendingSelectEntryOptions || { syncScroll: false };
    pendingSelectEntryKey = "";
    pendingSelectEntryOptions = null;
    selectEntry(targetKey, targetOptions).catch((error) => {
      console.error("scheduleSelectEntry failed", error);
    });
  });
}

async function selectEntry(entryKey, options = { syncScroll: false }) {
  if (entryKey && options?.openWorkbench === true) {
    setSubQuestionWorkbenchOpen(true);
  }
  if (!options?.force && selectedEntryKey === entryKey) {
    if (options.syncScroll) {
      scheduleScrollRequest(entryKey, { force: Boolean(options?.force) });
    }
    return;
  }
  const prevEntryKey = selectedEntryKey;
  const selectionChanged = prevEntryKey !== entryKey;
  selectedEntryKey = entryKey;
  if (!selectedContextEntryKeys.size && entryKey) {
    selectedContextEntryKeys.add(entryKey);
  }
  if (selectionChanged) {
    currentBranchMessages = [];
    branchThreadRenderSignature = "";
    branchTreeRenderSignature = "";
    branchMiniTimelineRenderSignature = "";
    branchAnchorQuote = "";
    setBranchComposerStatus(entryKey ? "\u6b63\u5728\u52a0\u8f7d\u5f53\u524d\u5206\u95ee\u9898..." : "");
  }
  syncBranchTreeSelectionWithEntry(entryKey);
  refreshEntryTitlesImmediately(entryKey);
  updateSelectedStyle();
  renderContextSelectionMeta();
  detailRenderSignature = "";
  renderDetail(entryKey);
  if (selectionChanged && !panelResizeActive) {
    renderBranchThread();
  }
  if (panelResizeActive) {
    deferredResizeRenderPending = true;
  }
  schedulePostSelectionRender(entryKey, { selectionChanged: selectionChanged && panelResizeActive });
  if (selectionChanged && !panelResizeActive) {
    syncBranchAnchorBar();
  }
  if (selectionChanged || options?.force === true) scheduleBranchThreadLoad(entryKey);

  if (options.syncScroll) {
    scheduleScrollRequest(entryKey, { force: Boolean(options?.force) });
  }
}

async function saveConversationTitle() {
  if (!currentConversationId || !currentStorageKey) return;
  const title = normalizeConversationTitle(sessionTitleInputEl.value);
  currentConversationTitle = title;
  await persistCurrentSession({ customTitle: title });
  renderSessionMeta();
  refreshHomeList().catch((error) => {
    console.error("refreshHomeList after saveConversationTitle failed", error);
  });
}

async function addFolder() {
  if (!currentConversationId || !currentStorageKey) return;
  const folderName = normalizeFolderName(newFolderInputEl.value);
  const parentId = ensureValidFolderId(nodeParentFolderSelectEl?.value || DEFAULT_FOLDER_ID, currentFolders);
  if (!folderName) {
    newFolderInputEl.focus();
    return;
  }

  const duplicated = currentFolders.find(
    (folder) =>
      ensureValidFolderId(folder.parentId || DEFAULT_FOLDER_ID, currentFolders) === parentId &&
      (folder.name || "").toLowerCase() === folderName.toLowerCase()
  );
  if (duplicated) {
    if (nodeFolderSelectEl) nodeFolderSelectEl.value = duplicated.id;
    if (nodeParentFolderSelectEl) nodeParentFolderSelectEl.value = parentId;
    newFolderInputEl.value = "";
    setMoveStatus(t("workspace_folder_exists", { name: duplicated.name }));
    return;
  }

  const folder = {
    id: normalizeFolderId(createId("folder")),
    name: folderName,
    parentId
  };
  currentFolders = [...currentFolders, folder];
  await persistCurrentSession({ folders: currentFolders });

  newFolderInputEl.value = "";
  renderNodeParentFolderOptions(parentId);
  setMoveStatus(t("workspace_folder_created", { name: folderName }));
  setNodeManageMode("create");
  renderTimeline();
  const selected = getSelectedEntry();
  renderNodeEditor(selected);
  renderBulkMoveFolderOptions();
}

async function moveSelectedUncategorizedToFolder() {
  if (!currentConversationId || !currentStorageKey) return;

  const targetFolderId = bulkMoveFolderSelectEl?.value || "";
  if (!targetFolderId || targetFolderId === DEFAULT_FOLDER_ID) {
    setMoveStatus(t("move_status_select_target"), true);
    return;
  }

  const selectedKeys = getSelectedUncategorizedEntryKeys();
  if (!selectedKeys.length && selectedEntryKey) {
    const selectedEntry = getEntryByRuntimeKey(selectedEntryKey);
    if (selectedEntry && ensureValidFolderId(selectedEntry.folderId) === DEFAULT_FOLDER_ID) {
      selectedKeys.push(selectedEntryKey);
    }
  }
  if (!selectedKeys.length) {
    setMoveStatus(t("move_status_select_uncategorized"), true);
    return;
  }

  let movedCount = 0;
  currentEntries = currentEntries.map((entry) => {
    if (!selectedKeys.includes(entry._runtimeKey)) return entry;
    movedCount += 1;
    return { ...entry, folderId: targetFolderId };
  });

  await persistCurrentSession({ entries: currentEntries });
  setMoveStatus(t("move_status_moved", { count: movedCount, name: getFolderNameById(targetFolderId) }));
  setNodeManageMode("move");
  renderTimeline();
}

async function saveSelectedNodeMeta() {
  return;
}

async function saveStudyNote() {
  if (!currentConversationId || !currentStorageKey) return;
  
  const nextStudyNote = normalizeStudyNote(studyNoteInputEl?.value || "");
  const nextStudyNoteImage = currentStudyNoteImageBase64 || "";

  if (!selectedEntryKey) {
    setStudyNoteStatus(t("study_note_select_entry_ph"), true);
    return;
  }

  const target = getSelectedEntry();
  if (!target) return;
  const activeNodeId = getActiveBranchNodeIdForNote();

  if (activeNodeId) {
    const currentNodeNote = currentBranchNodeNotes[activeNodeId] || {};
    const changed =
      nextStudyNote !== normalizeStudyNote(currentNodeNote.studyNote || "") ||
      nextStudyNoteImage !== (currentNodeNote.studyNoteImage || "") ||
      (currentNodeNote.sourceEntryKey || "") !== selectedEntryKey;
    if (!changed) return;

    const nextNodeNotes = { ...currentBranchNodeNotes };
    if (!nextStudyNote && !nextStudyNoteImage) {
      delete nextNodeNotes[activeNodeId];
    } else {
      nextNodeNotes[activeNodeId] = {
        studyNote: nextStudyNote,
        studyNoteImage: nextStudyNoteImage,
        sourceEntryKey: selectedEntryKey,
        updatedAt: Date.now()
      };
    }

    currentBranchNodeNotes = normalizeBranchNodeNotes(nextNodeNotes);
    await persistCurrentSession({ branchNodeNotes: currentBranchNodeNotes });
    recordBranchMiniEvent(selectedEntryKey, "note");
    setStudyNoteStatus(nextStudyNote || nextStudyNoteImage ? t("study_note_saved") : t("study_note_cleared"));
    if (nextStudyNote || nextStudyNoteImage) showBackupReminder();
    invalidateGlobalNoteLibraryCache();
    refreshNoteHistoryPanel();
    scheduleTimelineRender();
    return;
  }

  const changed = nextStudyNote !== normalizeStudyNote(target.studyNote || "") || nextStudyNoteImage !== (target.studyNoteImage || "");
  if (!changed) return;

  currentEntries = currentEntries.map((entry) => {
    if (entry._runtimeKey !== selectedEntryKey) return entry;
    return {
      ...entry,
      studyNote: nextStudyNote,
      studyNoteImage: nextStudyNoteImage
    };
  });

  await persistCurrentSession({ entries: currentEntries });
  recordBranchMiniEvent(selectedEntryKey, "note");
  setStudyNoteStatus(nextStudyNote || nextStudyNoteImage ? t("study_note_saved") : t("study_note_cleared"));
  if (nextStudyNote || nextStudyNoteImage) showBackupReminder();
  invalidateGlobalNoteLibraryCache();
  refreshNoteHistoryPanel();
  scheduleTimelineRender();
}

async function persistTurn(payload) {
  const conversationId = toConversationId(payload.conversationId || payload.url);
  if (!conversationId || !isConcreteConversationId(conversationId) || !payload.turn || !payload.turn.id) return false;

  const storageKey = toStorageKey(conversationId);
  const storageData = await storageGet(storageKey);
  const session = storageData[storageKey] || {
    conversationId,
    url: payload.url || conversationId,
    updatedAt: Date.now(),
    entries: [],
    customTitle: "",
    folders: normalizeFolders([]),
    collapsedFolderIds: []
  };

  const folders = normalizeFolders(session.folders);
  const entries = getEntriesFromSession(session).map(normalizeEntry).map((entry) => ({
    ...entry,
    folderId: ensureValidFolderId(entry.folderId, folders)
  }));

  const newTurn = normalizeEntry(payload.turn);
  if (!isRenderableEntry(newTurn)) return false;
  newTurn.folderId = ensureValidFolderId(newTurn.folderId, folders);

  const existingIndex = entries.findIndex((item) => {
    if (item.id !== newTurn.id) return false;
    if (Number.isInteger(newTurn.domIndex) && Number.isInteger(item.domIndex)) {
      return item.domIndex === newTurn.domIndex;
    }
    return true;
  });
  let changed = false;

  if (existingIndex >= 0) {
    const current = entries[existingIndex];
    if ((newTurn.answerMarkdown || "").length > (current.answerMarkdown || "").length) {
      entries[existingIndex] = {
        ...current,
        ...newTurn,
        id: current.id || newTurn.id,
        nodeTitle: normalizeNodeTitle(current.nodeTitle || newTurn.nodeTitle || ""),
        studyNote: normalizeStudyNote(current.studyNote || newTurn.studyNote || ""),
        studyNoteImage: current.studyNoteImage || newTurn.studyNoteImage || "",
        interleavedNotes: { ...(current.interleavedNotes || {}), ...(newTurn.interleavedNotes || {}) },
        folderId: ensureValidFolderId(current.folderId || newTurn.folderId, folders)
      };
      changed = true;
    } else {
      entries[existingIndex] = {
        ...current,
        nodeTitle: normalizeNodeTitle(current.nodeTitle || newTurn.nodeTitle || ""),
        studyNote: normalizeStudyNote(current.studyNote || newTurn.studyNote || ""),
        studyNoteImage: current.studyNoteImage || newTurn.studyNoteImage || "",
        interleavedNotes: { ...(current.interleavedNotes || {}), ...(newTurn.interleavedNotes || {}) },
        folderId: ensureValidFolderId(current.folderId || newTurn.folderId, folders)
      };
      changed = true;
    }
  } else {
    const newQuestionFp = normalizeDedupText(newTurn.question || "").slice(0, 120);
    const newFp = answerFingerprint(newTurn.answerMarkdown || "");
    const newStableId = normalizeSingleLine(newTurn.id || "", 120);
    const similarIndex = entries.findIndex((item) => {
      const itemStableId = normalizeSingleLine(item.id || "", 120);
      if (newStableId && itemStableId && newStableId !== itemStableId) return false;
      const questionFp = normalizeDedupText(item.question || "").slice(0, 120);
      const fp = answerFingerprint(item.answerMarkdown || "");
      const closeTime = Math.abs((item.timestamp || 0) - (newTurn.timestamp || 0)) <= 45 * 1000;
      const sameDomIndex =
        Number.isInteger(newTurn.domIndex) && Number.isInteger(item.domIndex) ? item.domIndex === newTurn.domIndex : false;
      return fp && newFp && questionFp && newQuestionFp && fp === newFp && questionFp === newQuestionFp && closeTime && sameDomIndex;
    });

    if (similarIndex >= 0) {
      const current = entries[similarIndex];
      if ((newTurn.answerMarkdown || "").length > (current.answerMarkdown || "").length) {
        entries[similarIndex] = {
          ...current,
          ...newTurn,
          id: current.id,
          nodeTitle: normalizeNodeTitle(current.nodeTitle || newTurn.nodeTitle || ""),
          studyNote: normalizeStudyNote(current.studyNote || newTurn.studyNote || ""),
          studyNoteImage: current.studyNoteImage || newTurn.studyNoteImage || "",
          interleavedNotes: { ...(current.interleavedNotes || {}), ...(newTurn.interleavedNotes || {}) },
          folderId: ensureValidFolderId(current.folderId || newTurn.folderId, folders)
        };
        changed = true;
      } else {
        entries[similarIndex] = {
          ...current,
          nodeTitle: normalizeNodeTitle(current.nodeTitle || newTurn.nodeTitle || ""),
          studyNote: normalizeStudyNote(current.studyNote || newTurn.studyNote || ""),
          studyNoteImage: current.studyNoteImage || newTurn.studyNoteImage || "",
          interleavedNotes: { ...(current.interleavedNotes || {}), ...(newTurn.interleavedNotes || {}) },
          folderId: ensureValidFolderId(current.folderId || newTurn.folderId, folders)
        };
        changed = true;
      }
    } else {
      entries.push(newTurn);
      changed = true;
    }
  }

  if (!changed) return false;

  entries.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const mergedManualBranchClassifiedEntryKeys = normalizeManualBranchClassifiedEntryKeys([
    ...(session.manualBranchClassifiedEntryKeys || []),
    ...(conversationId === currentConversationId ? Array.from(manualBranchClassifiedEntryKeys) : [])
  ]);
  const mergedManualBranchClassifiedEntryOwners = normalizeManualBranchClassifiedEntryOwners({
    ...(session.manualBranchClassifiedEntryOwners || {}),
    ...(conversationId === currentConversationId ? manualBranchClassifiedEntryOwners : {})
  });
  const mergedTimelineBookmarks = normalizeTimelineBookmarks({
    ...(session.timelineBookmarks || {}),
    ...(conversationId === currentConversationId ? currentTimelineBookmarks : {})
  });

  await storageSet({
    [storageKey]: {
      conversationId,
      url: payload.url || session.url || conversationId,
      updatedAt: Date.now(),
      entries,
      customTitle: normalizeConversationTitle(session.customTitle || ""),
      mainNote: normalizeStudyNote(session.mainNote || ""),
      mainNoteImage: session.mainNoteImage || "",
      timelineBookmarks: mergedTimelineBookmarks,
      branchNodeNotes: normalizeBranchNodeNotes(session.branchNodeNotes || {}),
      folders,
      collapsedFolderIds: normalizeCollapsedFolderIds(session.collapsedFolderIds, folders),
      manualBranchClassifiedEntryKeys: mergedManualBranchClassifiedEntryKeys,
      manualBranchClassifiedEntryOwners: mergedManualBranchClassifiedEntryOwners
    }
  });

  return true;
}

async function loadConversation(conversationId, options = {}) {
  const perfMark = perfStart();
  const token = ++loadConversationToken;
  const nextConversationId = toConversationId(conversationId);
  const previousConversationId = currentConversationId;
  const previousEntries = previousConversationId === nextConversationId ? currentEntries.slice() : [];
  if (previousConversationId !== nextConversationId) {
    resetBranchAutoSuggestionState({ keepSeen: false });
    reviewSprintActive = false;
    reviewSprintCompletedKeys.clear();
  }
  currentConversationId = nextConversationId;
  currentAccountScope = getAccountScopeFromConversationId(currentConversationId || conversationId);
  currentStorageKey = toStorageKey(currentConversationId);
  const cachedSnapshot = options?.forceFresh ? null : getConversationSnapshotFromCache(currentConversationId);
  if (cachedSnapshot?.entries?.length > 1) {
    const fallbackTitle = normalizeConversationTitle(options?.fallbackTitle || "");
    await applyConversationSnapshot(currentConversationId, {
      ...cachedSnapshot,
      conversationTitle: pickConversationTitle(cachedSnapshot.conversationTitle || "", fallbackTitle)
    }, { deferBranchIndex: true });
    return;
  }

  if (!options?.forceFresh) {
    try {
      const quickStorage = await storageGet(currentStorageKey);
      if (token !== loadConversationToken) return;
      const quickSession = quickStorage?.[currentStorageKey] || {};
      if (getEntriesFromSession(quickSession).length) {
        const quickSnapshot = buildConversationSnapshotFromSession(currentConversationId, quickSession, {
          fallbackTitle: normalizeConversationTitle(options?.fallbackTitle || "")
        });
        await applyConversationSnapshot(currentConversationId, quickSnapshot, { deferBranchIndex: true });
      }
    } catch (error) {
      console.warn("quick conversation snapshot failed", error);
    }
  }

  const allStorage = await storageGet(null);
  if (token !== loadConversationToken) return;
  const homeIndexKey = getHomeIndexStorageKey(currentAccountScope);
  const homeIndex = normalizeHomeCatalogIndex(allStorage?.[homeIndexKey]);
  const sortedSessions = pickConversationSessions(allStorage, currentConversationId).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const sessions = sortedSessions;
  const latestSession = sortedSessions[0]?.session || {};
  const stableSession = allStorage[currentStorageKey] || {};
  const metadataSource = Object.keys(stableSession).length ? stableSession : latestSession;

  const fallbackTitle = normalizeConversationTitle(options?.fallbackTitle || "");
  const sidebarTitle = normalizeConversationTitle(homeIndex?.[currentConversationId]?.sidebarTitle || "");
  currentSessionUrl = metadataSource.url || latestSession.url || conversationId || currentConversationId;
  currentConversationTitle = pickConversationTitle(
    metadataSource.customTitle || "",
    latestSession.customTitle || "",
    fallbackTitle,
    sidebarTitle
  );
  currentMainNote = normalizeStudyNote(metadataSource.mainNote || latestSession.mainNote || "");
  currentMainNoteImage = metadataSource.mainNoteImage || latestSession.mainNoteImage || "";
  currentTimelineBookmarks = normalizeTimelineBookmarks(
    metadataSource.timelineBookmarks || latestSession.timelineBookmarks || {}
  );
  currentBranchNodeNotes = normalizeBranchNodeNotes(metadataSource.branchNodeNotes || latestSession.branchNodeNotes || {});
  currentFolders = normalizeFolders(metadataSource.folders || latestSession.folders);
  collapsedFolderIds = new Set(
    normalizeCollapsedFolderIds(metadataSource.collapsedFolderIds || latestSession.collapsedFolderIds, currentFolders)
  );
  manualBranchClassifiedEntryKeys = new Set(
    normalizeManualBranchClassifiedEntryKeys(
      metadataSource.manualBranchClassifiedEntryKeys || latestSession.manualBranchClassifiedEntryKeys || []
    )
  );
  manualBranchClassifiedEntryOwners = normalizeManualBranchClassifiedEntryOwners(
    metadataSource.manualBranchClassifiedEntryOwners || latestSession.manualBranchClassifiedEntryOwners || {}
  );

  const mergedRawEntries = sessions.flatMap((item) => item.entries || []);
  let dedupedEntries = dedupeEntries(mergedRawEntries.map(normalizeEntry)).map((entry) => ({
    ...entry,
    folderId: ensureValidFolderId(entry.folderId, currentFolders)
  }));
  if (!dedupedEntries.length) {
    dedupedEntries = buildVirtualEntriesFromBranchStore(allStorage, currentConversationId);
  }
  currentEntries = assignRuntimeEntryKeys(dedupedEntries);
  const previousEntryKeys = new Set(previousEntries.map((entry) => entry?._runtimeKey).filter(Boolean));
  const newlyAddedEntryKeys = currentEntries
    .map((entry) => entry?._runtimeKey)
    .filter((key) => key && !previousEntryKeys.has(key));
  rebuildEntryKeysWithBranchQuestionsFromStore(allStorage);
  currentConversationBranchIndexMessages = FORCE_BRANCH_INDEX_AGGREGATE_MODE
    ? buildConversationBranchIndexMessagesFromStore(allStorage, currentConversationId)
    : [];

  const availableKeys = new Set(currentEntries.map((entry) => entry._runtimeKey));
  manualBranchClassifiedEntryKeys = new Set(
    [...manualBranchClassifiedEntryKeys].filter((entryKey) => {
      if (String(entryKey).startsWith("tok:")) return true;
      return availableKeys.has(entryKey);
    })
  );
  if (!selectedEntryKey || !availableKeys.has(selectedEntryKey)) {
    const ownerEntryKey = getManualBranchOwnerEntryKey(selectedEntryKey);
    if (ownerEntryKey && availableKeys.has(ownerEntryKey)) {
      selectedEntryKey = ownerEntryKey;
    } else {
      selectedEntryKey = currentEntries.length ? currentEntries[currentEntries.length - 1]._runtimeKey : "";
    }
  }

  selectedContextEntryKeys = new Set([...selectedContextEntryKeys].filter((entryKey) => availableKeys.has(entryKey)));
  if (!selectedContextEntryKeys.size && selectedEntryKey) {
    selectedContextEntryKeys.add(selectedEntryKey);
  }

  renderSessionMeta();
  renderTimeline();

  if (selectedEntryKey) {
    scheduleBranchThreadLoad(selectedEntryKey);
  }
  maybeQueueBranchAutoSuggestion(newlyAddedEntryKeys, selectedEntryKey);

  setConversationSnapshotCache(currentConversationId, {
    sessionUrl: currentSessionUrl,
    conversationTitle: currentConversationTitle,
    mainNote: currentMainNote,
    mainNoteImage: currentMainNoteImage,
    timelineBookmarks: currentTimelineBookmarks,
    branchNodeNotes: currentBranchNodeNotes,
    folders: currentFolders,
    collapsedFolderIds: Array.from(collapsedFolderIds),
    manualBranchClassifiedEntryKeys: Array.from(manualBranchClassifiedEntryKeys),
    manualBranchClassifiedEntryOwners,
    entries: getPersistableEntries(currentEntries)
  });

  const stableEntries = dedupeEntries(getEntriesFromSession(stableSession).map(normalizeEntry)).map((entry) => ({
    ...entry,
    folderId: ensureValidFolderId(entry.folderId, currentFolders)
  }));
  const stableFolders = normalizeFolders(stableSession.folders);
  const stableTitle = normalizeConversationTitle(stableSession.customTitle || "");
  const stableMainNote = normalizeStudyNote(stableSession.mainNote || "");
  const stableMainNoteImage = stableSession.mainNoteImage || "";
  const stableTimelineBookmarks = normalizeTimelineBookmarks(stableSession.timelineBookmarks || {});
  const stableBranchNodeNotes = normalizeBranchNodeNotes(stableSession.branchNodeNotes || {});
  const stableCollapsed = normalizeCollapsedFolderIds(stableSession.collapsedFolderIds, stableFolders);
  const stableManualClassified = normalizeManualBranchClassifiedEntryKeys(stableSession.manualBranchClassifiedEntryKeys || []);
  const stableManualOwners = normalizeManualBranchClassifiedEntryOwners(stableSession.manualBranchClassifiedEntryOwners || {});

  const shouldRewriteStorage =
    JSON.stringify(stableEntries) !== JSON.stringify(getPersistableEntries(currentEntries)) ||
    JSON.stringify(stableFolders) !== JSON.stringify(currentFolders) ||
    stableTitle !== currentConversationTitle ||
    stableMainNote !== currentMainNote ||
    stableMainNoteImage !== currentMainNoteImage ||
    JSON.stringify(stableTimelineBookmarks) !== JSON.stringify(currentTimelineBookmarks) ||
    JSON.stringify(stableBranchNodeNotes) !== JSON.stringify(currentBranchNodeNotes) ||
    JSON.stringify(stableCollapsed) !== JSON.stringify(Array.from(collapsedFolderIds)) ||
    JSON.stringify(stableManualClassified) !== JSON.stringify(Array.from(manualBranchClassifiedEntryKeys)) ||
    JSON.stringify(stableManualOwners) !== JSON.stringify(manualBranchClassifiedEntryOwners) ||
    (stableSession.url || "") !== currentSessionUrl;

  if (shouldRewriteStorage) {
    persistCurrentSession().catch((error) => {
      console.error("persistCurrentSession after loadConversation failed", error);
    });
  }
  recordSidePanelPerf("loadConversation", perfMark, {
    entries: currentEntries.length,
    conversationId: currentConversationId ? 1 : 0
  });
}

async function requestSnapshotFromTab(tab, attempt = 0) {
  const perfMark = perfStart();
  if (!tab?.id) return;
  if (attempt === 0) {
    setTimelineSyncState("syncing", currentEntries.length);
  } else {
    setTimelineSyncState("partial", currentEntries.length);
  }

  let response = null;
  try {
    response = await sendMessageWithAutoInject(tab.id, {
      type: "GEMINI_REQUEST_SNAPSHOT",
      conversationId: currentConversationId
    });
  } catch {
    if (attempt < 3) {
      setTimeout(() => {
        requestSnapshotFromTab(tab, attempt + 1).catch((innerError) => {
          console.error("requestSnapshotFromTab retry failed", innerError);
        });
      }, 700 + attempt * 700);
    }
    return;
  }

  if (!response?.ok || !Array.isArray(response.turns)) {
    if (attempt < 3) {
      setTimeout(() => {
        requestSnapshotFromTab(tab, attempt + 1).catch((innerError) => {
          console.error("requestSnapshotFromTab retry failed", innerError);
        });
      }, 700 + attempt * 700);
    }
    return;
  }

  let changed = false;
  for (const turn of response.turns) {
    const saved = await persistTurn({
      conversationId: currentConversationId,
      url: tab.url,
      turn
    });
    changed = changed || saved;
  }

  if (changed) {
    await loadConversation(currentConversationId);
    setTimelineSyncState("done", currentEntries.length);
    if (attempt < 2) {
      setTimeout(() => {
        requestSnapshotFromTab(tab, attempt + 1).catch((innerError) => {
          console.error("requestSnapshotFromTab follow-up retry failed", innerError);
        });
      }, 500 + attempt * 600);
    }
    return;
  }

  const shouldRetryForHydration =
    attempt < 4 &&
    (response.turns.length <= Math.max(2, currentEntries.length) || (!response.turns.length && !currentEntries.length));
  if (shouldRetryForHydration) {
    setTimeout(() => {
      requestSnapshotFromTab(tab, attempt + 1).catch((innerError) => {
        console.error("requestSnapshotFromTab retry failed", innerError);
      });
    }, 500 + attempt * 650);
  } else {
    setTimelineSyncState("done", currentEntries.length || response.turns.length);
  }
  recordSidePanelPerf("requestSnapshot", perfMark, {
    attempt,
    turns: Array.isArray(response?.turns) ? response.turns.length : 0,
    changed: changed ? 1 : 0
  });
}

function updateDragHint() {
  if (!dragHintEl) return;
  if (currentView !== "workspace") {
    dragHintEl.hidden = true;
    return;
  }
  if (followupFocusMode) {
    dragHintEl.hidden = true;
    return;
  }
  if (timelineCollapsed) {
    dragHintEl.textContent = t("drag_hint_expand");
    dragHintEl.hidden = false;
    return;
  }
  dragHintEl.textContent = t("drag_hint");
  dragHintEl.hidden = window.innerWidth >= 560;
}

function syncWorkspaceFollowupFocusMode(force = false) {
  const next = currentView === "workspace" && window.innerWidth <= FOLLOWUP_FOCUS_MAX_WIDTH;
  if (!force && next === followupFocusMode) return;
  followupFocusMode = next;

  if (workspaceViewEl) {
    workspaceViewEl.classList.toggle("workspace-followup-focus", followupFocusMode);
  }

  if (followupFocusMode) {
    if (detailMode !== "branch") setDetailMode("branch");
    setBranchAddMenuOpen(false);
    setBranchToolsOpen(false);
    setBranchModeMenuOpen(false);
  }

  updateDragHint();
  applyCompactWorkspaceMode();
}

async function initWorkspaceFromActiveTab() {
  const activeTab = await queryActiveGeminiTab();
  currentAccountScope = getAccountScopeFromUrl(activeTab?.url || "");
  const conversationId = toConversationId(activeTab?.url || "");

  if (!isConcreteConversationId(conversationId)) {
    currentConversationId = "";
    currentStorageKey = "";
    currentSessionUrl = "";
    currentConversationTitle = "";
    currentFolders = normalizeFolders([]);
    collapsedFolderIds = new Set();
    currentEntries = [];
    selectedEntryKey = "";
    selectedContextEntryKeys.clear();
    currentBranchMessages = [];
    currentConversationBranchIndexMessages = [];

    renderSessionMeta();
    showView("workspace");
    timelineListEl.innerHTML = "";
    timelineEmptyEl.style.display = "block";
    if (detailMarkdownEl) detailMarkdownEl.textContent = "";
  if (detailTitleEl) detailTitleEl.textContent = t("no_gemini_conversation");
    detailTimeEl.textContent = "";
    branchMetaEl.textContent = t("branch_meta_hint");
    branchInputEl.value = "";
    if (locateBtnEl) locateBtnEl.disabled = true;
    setBranchBusy(false);
    setBranchComposerMode("standard");
    renderBranchThread();
    renderContextSelectionMeta();
    renderNodeEditor(null);
    renderBulkMoveFolderOptions();
    renderNodeParentFolderOptions(DEFAULT_FOLDER_ID);
    await applyTheme();
    return;
  }

  await loadConversation(conversationId);
  requestSnapshotFromTab(activeTab).catch((error) => {
    console.error("requestSnapshotFromTab in initWorkspaceFromActiveTab failed", error);
  });
  await applyTheme(conversationId);
  await syncBranchComposerModeFromGemini(conversationId);
}

async function enterHomeView() {
  const activeTab = await queryActiveGeminiTab();
  if (activeTab?.url) {
    currentAccountScope = getAccountScopeFromUrl(activeTab.url);
  } else {
    const allStorage = await storageGet(null);
    currentAccountScope = pickBestAccountScopeFromStorage(allStorage, currentAccountScope);
  }
  showView("home");
  setHomeStatus("");
  selectedHomeConversationIds.clear();
  homeDrillParentConversationId = "";
  homeDrillParentConversationTitle = "";
  homeDrillEntries = [];
  if (homeManageDetailsEl instanceof HTMLDetailsElement) {
    homeManageDetailsEl.open = true;
  }
  await loadHomeState();
  await refreshHomeList({ skipSidebarSync: true, showStatus: false });
  // Run one immediate sidebar sync so default auto-classification can take effect right away.
  if (!homeSidebarSyncInFlight) {
    homeSidebarSyncInFlight = true;
    refreshHomeList({ showStatus: false, skipSidebarSync: false })
      .catch((error) => {
        console.warn("immediate home sidebar sync failed", error);
      })
      .finally(() => {
        homeSidebarSyncInFlight = false;
      });
  }
  scheduleHomeSidebarSync(420);
  await applyTheme();
}

async function bootstrap() {
  markedReady = configureMarked();
  await loadSettingsState();
  await loadHomeState();
  applyLanguageToStaticUi();
  syncLocaleSelectors();
  syncThemeSelectors();
  applyWorkspaceUiDensity();
  applyTimelineLayout();
  applyWorkspaceTreeStyleUi();
  applyStudySplitLayout();
  syncVideoModulePlacement();
  updateDragHint();
  syncWorkspaceFollowupFocusMode(true);
  renderSessionMeta();
  renderContextSelectionMeta();

  if (!settingsState.welcomeCompleted) {
    showView("welcome");
    markWelcomeSeenOnce();
    await applyTheme();
    return;
  }

  const consumed = await consumePendingPanelNavigation();
  if (consumed) return;

  await enterHomeView();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GEMINI_NAVIGATE_HOME_VIEW") {
    enterHomeView()
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error?.message || "enter home failed" });
      });
    return true;
  }

  if (message?.type === "GEMINI_OPEN_WORKSPACE_CONVERSATION_REQUEST") {
    const conversationId = normalizeConversationId(message?.conversationId || message?.url || "");
    if (!isConcreteConversationId(conversationId)) {
      sendResponse({ ok: false, error: "invalid conversation id" });
      return;
    }
    openWorkspaceConversation(conversationId, { requestSnapshot: true })
      .then(() => {
        sendResponse({ ok: true, conversationId });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error?.message || "open workspace failed" });
      });
    return true;
  }

  if (message?.type === "GEMINI_ACTIVE_CONVERSATION_CHANGED" || message?.type === "GEMINI_RELOAD_STATE") {
    const conversationId = normalizeConversationId(message?.conversationId || message?.url || "");
    if (!isConcreteConversationId(conversationId)) {
      sendResponse({ ok: false, error: "invalid conversation id" });
      return;
    }
    
    if (message?.type === "GEMINI_RELOAD_STATE") {
      // Force fresh load from storage to pick up inline annotations
      loadConversation(conversationId, { forceFresh: true }).then(() => {
        scheduleTimelineRender();
        renderDetailView();
        sendResponse({ ok: true, conversationId });
      }).catch((error) => {
        sendResponse({ ok: false, error: error?.message || "reload state failed" });
      });
      return true;
    }

    openWorkspaceConversation(conversationId, { requestSnapshot: true, navigateTab: false })
      .then(() => {
        sendResponse({ ok: true, conversationId });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error?.message || "sync workspace failed" });
      });
    return true;
  }

  if (message?.type === "GEMINI_SELECT_ENTRY") {
    const conversationId = normalizeConversationId(message?.conversationId || message?.url || "");
    if (!isConcreteConversationId(conversationId)) {
      sendResponse({ ok: false, error: "invalid conversation id" });
      return;
    }

    const locateTarget = {
      entryId: normalizeSingleLine(message?.entryId || "", 200),
      domIndex: Number.isInteger(message?.domIndex) ? message.domIndex : null,
      timestamp: Number(message?.timestamp) || 0
    };

    const syncScroll = Boolean(message?.syncScroll);
    const force = Boolean(message?.force);
    const isPassiveSelectionSync = !force;
    // During branch sending, ignore passive viewport-driven selection sync
    // to keep the current branch context stable.
    if (!force && Date.now() < branchManualSelectLockUntil) {
      sendResponse({ ok: true, skipped: "branch_manual_select_lock" });
      return;
    }
    if (!force && branchBusy) {
      sendResponse({ ok: true, skipped: "branch_busy" });
      return;
    }
    if (isPassiveSelectionSync && (currentView !== "workspace" || currentConversationId !== conversationId)) {
      rememberPassiveSelectionHint(conversationId, locateTarget);
      sendResponse({ ok: true, skipped: "passive_select_requires_active_workspace" });
      return;
    }
    const openAndSelect = async () => {
      if (currentView !== "workspace" || currentConversationId !== conversationId) {
        await openWorkspaceConversation(conversationId, {
          requestSnapshot: true,
          navigateTab: false,
          detailMode: "branch"
        });
      }

      let targetKey = findEntryRuntimeKeyByLocateTarget(locateTarget);
      if (!targetKey) {
        // Timeline updates can arrive slightly earlier than side panel cache refresh.
        await loadConversation(conversationId, { forceFresh: true });
        targetKey = findEntryRuntimeKeyByLocateTarget(locateTarget);
      }
      if (!targetKey) {
        return false;
      }

      await selectEntry(targetKey, {
        syncScroll,
        force,
        openWorkbench: force || subQuestionWorkbenchOpen
      });
      return true;
    };

    openAndSelect()
      .then((ok) => {
        sendResponse({ ok, conversationId });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error?.message || "select entry failed" });
      });
    return true;
  }

  if (message?.type === "GEMINI_APPEND_TO_BRANCH_INPUT") {
    const text = normalizeMultiline(message?.text || "");
    if (!text) {
      sendResponse({ ok: false, error: "empty text" });
      return;
    }
    if (!branchInputEl) {
      sendResponse({ ok: false, error: "branch input not found" });
      return;
    }

    const applyAppend = () => {
      const shouldSetAnchor = message?.setAnchor === true || String(message?.source || "").includes("selection");
      appendTextToBranchComposer(text, { setAnchor: shouldSetAnchor });
    };

    if (currentView === "workspace") {
      applyAppend();
      sendResponse({ ok: true });
      return;
    }

    openActiveConversationFromTab()
      .then(() => {
        applyAppend();
        sendResponse({ ok: true, openedWorkspace: true });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error?.message || "open workspace failed" });
      });
    return true;
  }

  if (message?.type !== "GEMINI_TURN_CAPTURED") return;

  persistTurn(message.payload)
    .then(async (changed) => {
      const payloadConversationId = toConversationId(message?.payload?.conversationId || message?.payload?.url || "");
      if (changed && currentView === "workspace" && payloadConversationId === currentConversationId) {
        await loadConversation(currentConversationId);
        const linked = await linkBranchQuestionToTurn(message?.payload?.turn || {});
        if (linked) {
          renderBranchThread();
        }
      }
      if (changed && currentView === "home") {
        scheduleHomeRefreshFromTurn();
      }
      sendResponse({ ok: true });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error?.message || "storage write failed" });
    });

  return true;
});

if (refreshBtnEl) refreshBtnEl.addEventListener("click", () => {
  initWorkspaceFromActiveTab().catch((error) => {
    console.error("Workspace refresh failed:", error);
  });
});

if (welcomeContinueBtnEl) welcomeContinueBtnEl.addEventListener("click", () => {
  settingsState.welcomeCompleted = true;
  setLocale(welcomeLangSelectEl.value || "zh", false)
    .then(async () => {
      await persistSettingsState();
      await enterHomeView();
    })
    .catch((error) => {
      console.error("welcome continue failed", error);
    });
});

if (homeRefreshBtnEl) homeRefreshBtnEl.addEventListener("click", () => {
  refreshHomeList({ showStatus: true }).catch((error) => {
    console.error("refreshHomeList failed", error);
  });
});

if (openActiveConversationBtnEl) openActiveConversationBtnEl.addEventListener("click", () => {
  openActiveSubConversationFromTab().catch((error) => {
    console.error("openActiveSubConversationFromTab failed", error);
    setHomeStatus(t("home_status_open_active_fail"), true);
  });
});

if (homeAddFolderBtnEl) homeAddFolderBtnEl.addEventListener("click", () => {
  addHomeFolder().catch((error) => {
    console.error("addHomeFolder failed", error);
  });
});

if (homeNewFolderInputEl) homeNewFolderInputEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addHomeFolder().catch((error) => {
    console.error("addHomeFolder failed", error);
  });
});

if (homeAutoClassifySaveBtnEl) homeAutoClassifySaveBtnEl.addEventListener("click", () => {
  saveHomeAutoClassifySettings().catch((error) => {
    console.error("saveHomeAutoClassifySettings failed", error);
    setHomeStatus(error?.message || t("home_auto_save_failed"), true);
  });
});

if (homeAutoClassifyEnabledEl) homeAutoClassifyEnabledEl.addEventListener("change", () => {
  saveHomeAutoClassifySettings({ skipRulesParsing: true }).catch((error) => {
    console.error("saveHomeAutoClassifySettings(toggle) failed", error);
    setHomeStatus(error?.message || t("home_auto_save_failed"), true);
  });
});

if (homeAutoClassifyResetBtnEl) homeAutoClassifyResetBtnEl.addEventListener("click", () => {
  saveHomeAutoClassifySettings({ resetDefaults: true }).catch((error) => {
    console.error("resetHomeAutoClassifySettings failed", error);
    setHomeStatus(error?.message || t("home_auto_reset_failed"), true);
  });
});

if (homeOpenAutoClassifyBtnEl) homeOpenAutoClassifyBtnEl.addEventListener("click", () => {
  setHomeAutoClassifyOverlayVisible(true);
});

if (homeAutoClassifyCloseBtnEl) homeAutoClassifyCloseBtnEl.addEventListener("click", () => {
  setHomeAutoClassifyOverlayVisible(false);
});

if (homeAutoClassifyOverlayEl) {
  homeAutoClassifyOverlayEl.addEventListener("click", (event) => {
    if (event.target === homeAutoClassifyOverlayEl) {
      setHomeAutoClassifyOverlayVisible(false);
    }
  });
}

if (homeAutoClassifyRulesInputEl) {
  homeAutoClassifyRulesInputEl.addEventListener("input", () => {
    scheduleHomeAutoClassifyRuleListRender();
  });
  homeAutoClassifyRulesInputEl.addEventListener("blur", () => {
    renderHomeAutoClassifyRuleList();
  });
}

if (homeAutoClassifyAddRuleBtnEl) {
  homeAutoClassifyAddRuleBtnEl.addEventListener("click", () => {
    addHomeAutoClassifyRuleFromInputs();
  });
}

if (homeAutoClassifyFolderInputEl) {
  homeAutoClassifyFolderInputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addHomeAutoClassifyRuleFromInputs();
  });
}

if (homeAutoClassifyKeywordsInputEl) {
  homeAutoClassifyKeywordsInputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addHomeAutoClassifyRuleFromInputs();
  });
}

if (homeAutoClassifyRuleListEl) {
  homeAutoClassifyRuleListEl.addEventListener("click", (event) => {
    const actionEl = event.target instanceof HTMLElement ? event.target.closest("[data-action]") : null;
    if (!(actionEl instanceof HTMLElement)) return;
    const action = actionEl.dataset.action || "";
    const index = Number(actionEl.dataset.index || -1);
    if (!Number.isFinite(index) || index < 0) return;
    if (action === "move-up") reorderHomeAutoClassifyRulesByIndex(index, index - 1);
    if (action === "move-down") reorderHomeAutoClassifyRulesByIndex(index, index + 1);
    if (action === "delete") removeHomeAutoClassifyRule(index);
  });

  homeAutoClassifyRuleListEl.addEventListener("input", (event) => {
    const inputEl = event.target instanceof HTMLInputElement ? event.target : null;
    if (!inputEl) return;
    const action = inputEl.dataset.action || "";
    const index = Number(inputEl.dataset.index || -1);
    if (!Number.isFinite(index) || index < 0) return;
    if (action === "edit-folder") updateHomeAutoClassifyRule(index, "folder", inputEl.value);
    if (action === "edit-keywords") updateHomeAutoClassifyRule(index, "keywords", inputEl.value);
    setHomeStatus(t("home_auto_pending_save"));
  });

  homeAutoClassifyRuleListEl.addEventListener("blur", (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    renderHomeAutoClassifyRuleList();
  }, true);
}

if (homeMoveBtnEl) homeMoveBtnEl.addEventListener("click", () => {
  moveSelectedHomeConversations().catch((error) => {
    console.error("moveSelectedHomeConversations failed", error);
  });
});
if (homeDrillBackBtnEl) homeDrillBackBtnEl.addEventListener("click", () => {
  leaveHomeDrilldown();
});
if (homeDrillSortBtnEl) homeDrillSortBtnEl.addEventListener("click", () => {
  homeDrillSortOrder = homeDrillSortOrder === "asc" ? "desc" : "asc";
  renderHomeConversationList();
});
if (homeMoveFolderSelectEl) homeMoveFolderSelectEl.addEventListener("change", () => {
  updateHomeSelectionUi();
});

if (homeManageDetailsEl instanceof HTMLDetailsElement) {
  homeManageDetailsEl.addEventListener("toggle", () => {
    if (!homeManageDetailsEl.open) {
      homeManageDetailsEl.open = true;
      return;
    }
    updateHomeSelectionUi();
  });
}

if (backToPreviousPageBtnEl) backToPreviousPageBtnEl.addEventListener("click", () => {
  navigateToPreviousPageInGeminiTab()
    .then((ok) => {
      if (!ok) {
        return enterHomeView();
      }
      return true;
    })
    .catch((error) => {
      console.error("backToPreviousPage action failed", error);
      enterHomeView().catch((fallbackError) => {
        console.error("fallback enterHomeView failed", fallbackError);
      });
    });
});

if (quickBackHomeBtnEl) quickBackHomeBtnEl.addEventListener("click", () => {
  enterHomeView()
    .catch((error) => {
      console.error("quick enterHomeView failed", error);
    });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!homeAutoClassifyOverlayEl || homeAutoClassifyOverlayEl.hidden) return;
  setHomeAutoClassifyOverlayVisible(false);
});

function bindLocaleSelect(selectEl) {
  if (!selectEl) return;
  selectEl.addEventListener("change", () => {
    setLocale(selectEl.value || "zh", true).catch((error) => {
      console.error("setLocale failed", error);
    });
  });
}

function bindThemeSelect(selectEl) {
  if (!selectEl) return;
  selectEl.addEventListener("change", () => {
    setTheme(selectEl.value || "gemini", true).catch((error) => {
      console.error("setTheme failed", error);
    });
  });
}

bindLocaleSelect(welcomeLangSelectEl);
bindLocaleSelect(homeLangSelectEl);
bindLocaleSelect(workspaceLangSelectEl);
bindThemeSelect(homeThemeSelectEl);
bindThemeSelect(workspaceThemeSelectEl);
if (lowPowerModeToggleEl) {
  lowPowerModeToggleEl.addEventListener("change", () => {
    setLowPowerMode(lowPowerModeToggleEl.checked).catch((error) => {
      console.error("setLowPowerMode failed", error);
      setDataPortabilityStatus(error?.message || "Failed to save low footprint mode.", true);
    });
  });
}
if (exportDataBtnEl) {
  exportDataBtnEl.addEventListener("click", () => {
    exportAllData().catch((error) => {
      console.error("exportAllData failed", error);
      setDataPortabilityStatus(error?.message || "Export failed.", true);
    });
  });
}
function bindBackupButton(buttonEl) {
  if (!buttonEl) return;
  buttonEl.addEventListener("click", () => {
    exportAllData().catch((error) => {
      console.error("exportAllData quick backup failed", error);
      setDataPortabilityStatus(error?.message || "Export failed.", true);
      setStudyNoteStatus(error?.message || "backup failed", true);
    });
  });
}
bindBackupButton(homeBackupBtnEl);
bindBackupButton(quickBackupBtnEl);
if (importDataBtnEl && importDataInputEl) {
  importDataBtnEl.addEventListener("click", () => {
    importDataInputEl.value = "";
    importDataInputEl.click();
  });
  importDataInputEl.addEventListener("change", () => {
    const file = importDataInputEl.files?.[0];
    importAllDataFromFile(file).catch((error) => {
      console.error("importAllDataFromFile failed", error);
      setDataPortabilityStatus(error?.message || "Import failed.", true);
    });
  });
}
ensureSimplifiedWorkspaceUi();

if (homeLayoutSelectEl) {
  homeLayoutSelectEl.addEventListener("change", () => {
    homeLayoutMode = normalizeHomeLayoutMode(homeLayoutSelectEl.value || homeLayoutMode);
    persistHomeState({ layoutMode: homeLayoutMode }).catch((error) => {
      console.error("persistHomeState(layoutMode) failed", error);
    });
    renderHomeConversationList();
  });
}

if (homeTreeDirectionSelectEl) {
  homeTreeDirectionSelectEl.addEventListener("change", () => {
    homeTreeDirection = normalizeHomeTreeDirection(homeTreeDirectionSelectEl.value || homeTreeDirection);
    persistHomeState({ treeDirection: homeTreeDirection }).catch((error) => {
      console.error("persistHomeState(treeDirection) failed", error);
    });
    renderHomeConversationList();
  });
}

if (saveSessionTitleBtnEl) saveSessionTitleBtnEl.addEventListener("click", () => {
  saveConversationTitle().catch((error) => {
    console.error("saveConversationTitle failed", error);
  });
});

if (sessionTitleInputEl) sessionTitleInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveConversationTitle().catch((error) => {
      console.error("saveConversationTitle failed", error);
    });
  }
});

if (openSettingsBtnEl) {
  openSettingsBtnEl.addEventListener("click", () => {
    if (settingsPanelOverlayEl) settingsPanelOverlayEl.hidden = false;
    setNodeManageMode("create");
    if (newFolderInputEl) newFolderInputEl.focus();
  });
}

if (closeSettingsBtnEl) {
  closeSettingsBtnEl.addEventListener("click", () => {
    if (settingsPanelOverlayEl) settingsPanelOverlayEl.hidden = true;
  });
}

if (toggleCreateFolderBtnEl) {
  toggleCreateFolderBtnEl.addEventListener("click", () => {
    setNodeManageMode("create");
    if (newFolderInputEl) newFolderInputEl.focus();
  });
}

if (toggleMoveFolderBtnEl) {
  toggleMoveFolderBtnEl.addEventListener("click", () => {
    setNodeManageMode("move");
    if (bulkMoveFolderSelectEl) bulkMoveFolderSelectEl.focus();
  });
}

if (addFolderBtnEl) {
  addFolderBtnEl.addEventListener("click", () => {
    addFolder().catch((error) => {
      console.error("addFolder failed", error);
    });
  });
}

if (newFolderInputEl) {
  newFolderInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addFolder().catch((error) => {
        console.error("addFolder failed", error);
      });
    }
  });
}

if (moveSelectedBtnEl) {
  moveSelectedBtnEl.addEventListener("click", () => {
    moveSelectedUncategorizedToFolder().catch((error) => {
      console.error("moveSelectedUncategorizedToFolder failed", error);
      setMoveStatus(t("move_status_failed"), true);
    });
  });
}

if (timelineSearchInputEl) {
  timelineSearchInputEl.addEventListener("input", () => {
    timelineSearchText = timelineSearchInputEl.value || "";
    if (timelineSearchTimer) clearTimeout(timelineSearchTimer);
    timelineSearchTimer = setTimeout(() => {
      timelineSearchTimer = null;
      scheduleTimelineRender();
    }, TIMELINE_SEARCH_DEBOUNCE_MS);
  });
}

if (homeSearchInputEl) {
  homeSearchInputEl.addEventListener("input", () => {
    homeSearchText = homeSearchInputEl.value || "";
    if (homeSearchTimer) clearTimeout(homeSearchTimer);
    homeSearchTimer = setTimeout(() => {
      homeSearchTimer = null;
      renderHomeConversationList();
    }, 120);
  });
}

if (loadVideoEmbedBtnEl) {
  loadVideoEmbedBtnEl.addEventListener("click", () => {
    loadVideoEmbedFromInput().catch((error) => {
      console.error("loadVideoEmbedFromInput failed", error);
      setVideoEmbedStatus(t("video_embed_invalid"), true);
    });
  });
}

if (videoEmbedInputEl) {
  videoEmbedInputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    loadVideoEmbedFromInput().catch((error) => {
      console.error("loadVideoEmbedFromInput by keydown failed", error);
      setVideoEmbedStatus(t("video_embed_invalid"), true);
    });
  });
}

if (pasteVideoEmbedBtnEl) {
  pasteVideoEmbedBtnEl.addEventListener("click", () => {
    pasteVideoEmbedLink().catch((error) => {
      console.error("pasteVideoEmbedLink failed", error);
      setVideoEmbedStatus(t("video_embed_paste_failed"), true);
    });
  });
}

if (openVideoEmbedTabBtnEl) {
  openVideoEmbedTabBtnEl.addEventListener("click", () => {
    openVideoEmbedInTab().catch((error) => {
      console.error("openVideoEmbedInTab failed", error);
      setVideoEmbedStatus(t("video_embed_invalid"), true);
    });
  });
}

if (toggleVideoFullscreenBtnEl) {
  toggleVideoFullscreenBtnEl.addEventListener("click", () => {
    toggleVideoFullscreen().catch((error) => {
      console.error("toggleVideoFullscreen failed", error);
      setVideoEmbedStatus(error?.message || "toggle fullscreen failed", true);
    });
  });
}

if (clearVideoEmbedBtnEl) {
  clearVideoEmbedBtnEl.addEventListener("click", () => {
    persistVideoEmbedUrl("").catch((error) => {
      console.error("clear video embed url failed", error);
      setVideoEmbedStatus(error?.message || "clear failed", true);
    });
  });
}

if (videoEmbedFrameEl) {
  videoEmbedFrameEl.addEventListener("load", () => {
    if (!currentVideoEmbedUrl) return;
    setVideoEmbedStatus(`${t("video_embed_loaded")} ${t("video_embed_fallback_hint")}`);
  });
}

document.addEventListener("fullscreenchange", () => {
  updateVideoFullscreenButtonUi();
});

if (pickRandomNodeBtnEl) {
  pickRandomNodeBtnEl.addEventListener("click", () => {
    pickRandomNodeForStudy().catch((error) => {
      console.error("pickRandomNodeForStudy failed", error);
      setStudyHelperStatus(error?.message || "pick failed", true);
    });
  });
}

if (pickReviewNodeBtnEl) {
  pickReviewNodeBtnEl.addEventListener("click", () => {
    pickSpacedReviewNode().catch((error) => {
      console.error("pickSpacedReviewNode failed", error);
      setStudyHelperStatus(error?.message || "pick failed", true);
    });
  });
}

if (markReviewedBtnEl) {
  markReviewedBtnEl.addEventListener("click", () => {
    markCurrentEntryReviewed({ autoNext: true }).catch((error) => {
      console.error("markCurrentEntryReviewed failed", error);
      setStudyHelperStatus(error?.message || "mark reviewed failed", true);
    });
  });
}

if (startReviewSprintBtnEl) {
  startReviewSprintBtnEl.addEventListener("click", () => {
    toggleReviewSprint().catch((error) => {
      console.error("toggleReviewSprint failed", error);
      setStudyHelperStatus(error?.message || "review sprint failed", true);
    });
  });
}

if (nextReviewSprintBtnEl) {
  nextReviewSprintBtnEl.addEventListener("click", () => {
    focusNextReviewSprintCard().catch((error) => {
      console.error("focusNextReviewSprintCard failed", error);
      setStudyHelperStatus(error?.message || "next review card failed", true);
    });
  });
}

if (markReviewedNextBtnEl) {
  markReviewedNextBtnEl.addEventListener("click", () => {
    if (!reviewSprintActive) {
      startReviewSprint().catch((error) => {
        console.error("startReviewSprint before mark-next failed", error);
        setStudyHelperStatus(error?.message || "review sprint failed", true);
      });
      return;
    }
    markCurrentEntryReviewed({ autoNext: true }).catch((error) => {
      console.error("markCurrentEntryReviewed(mark-next) failed", error);
      setStudyHelperStatus(error?.message || "mark reviewed failed", true);
    });
  });
}

if (mistakeNotebookListEl) {
  mistakeNotebookListEl.addEventListener("click", (event) => {
    const target = event.target;
    const button = target && typeof target.closest === "function" ? target.closest(".study-pocket-btn") : null;
    const entryKey = button?.dataset?.entryKey || "";
    if (!entryKey) return;
    selectEntry(entryKey, { syncScroll: false }).catch((error) => {
      console.error("selectEntry from mistake notebook failed", error);
    });
    setDetailMode("branch");
  });
}

if (studyScopeBarEl) {
  studyScopeBarEl.addEventListener("click", (event) => {
    const target = event.target;
    const button = target && typeof target.closest === "function" ? target.closest(".study-scope-btn") : null;
    if (!button) return;
    const nextScope = normalizeStudyScopeMode(button.dataset.studyScope || "");
    if (!nextScope) return;
    setStudyScopeMode(nextScope);
  });
}

if (timelineFilterBarEl) {
  timelineFilterBarEl.addEventListener("click", (event) => {
    const target = event.target;
    const button = target && typeof target.closest === "function" ? target.closest(".timeline-filter-btn") : null;
    if (!button) return;
    const nextFilter = (button.dataset.filter || "").trim();
    if (!nextFilter || nextFilter === timelineFilterMode) return;
    timelineFilterMode = nextFilter;
    scheduleTimelineRender();
  });
}

if (timelineFolderFilterBarEl) {
  timelineFolderFilterBarEl.addEventListener("click", (event) => {
    const target = event.target;
    const button = target && typeof target.closest === "function" ? target.closest(".timeline-folder-filter-btn") : null;
    if (!button) return;
    const action = (button.dataset.folderAction || "").trim();
    if (action === "all") {
      if (!timelineFolderFilterIds.size) return;
      timelineFolderFilterIds.clear();
      scheduleTimelineRender();
      return;
    }
    const folderId = ensureValidFolderId((button.dataset.folderId || "").trim(), currentFolders);
    if (!folderId) return;
    if (timelineFolderFilterIds.has(folderId)) {
      timelineFolderFilterIds.delete(folderId);
    } else {
      timelineFolderFilterIds.add(folderId);
    }
    scheduleTimelineRender();
  });
}

if (timelineSortToggleBtnEl) {
  timelineSortToggleBtnEl.addEventListener("click", () => {
    timelineFolderItemSortOrder = timelineFolderItemSortOrder === "asc" ? "desc" : "asc";
    renderTimelineSortToggleButton();
    scheduleTimelineRender();
  });
}

if (noteLibraryCurrentBtnEl) {
  noteLibraryCurrentBtnEl.addEventListener("click", () => {
    if (noteLibraryMode === "current") return;
    noteLibraryMode = "current";
    noteHistoryRenderSignature = "";
    refreshNoteHistoryPanel();
  });
}

  if (noteLibraryAllBtnEl) {
    noteLibraryAllBtnEl.addEventListener("click", () => {
      if (noteLibraryMode === "all") return;
      noteLibraryMode = "all";
      noteHistoryRenderSignature = "";
      refreshNoteHistoryPanel();
    });
  }

if (noteLibraryImageBtnEl) {
  noteLibraryImageBtnEl.addEventListener("click", () => {
    noteLibraryContentFilter = noteLibraryContentFilter === "image" ? "all" : "image";
    noteHistoryRenderSignature = "";
    refreshNoteHistoryPanel();
  });
}

if (noteLibrarySortBtnEl) {
  noteLibrarySortBtnEl.addEventListener("click", () => {
    noteLibrarySortOrder = noteLibrarySortOrder === "asc" ? "desc" : "asc";
    noteHistoryRenderSignature = "";
    refreshNoteHistoryPanel();
  });
}

if (noteLibrarySearchInputEl) {
  noteLibrarySearchInputEl.addEventListener("input", () => {
    noteLibrarySearchText = normalizeSingleLine(noteLibrarySearchInputEl.value || "", 160);
    noteHistoryRenderSignature = "";
    renderNoteHistoryList();
  });
}

if (openNodeSettingsBtnEl) {
  openNodeSettingsBtnEl.addEventListener("click", () => {
    if (!getSelectedEntry()) return;
    setDetailMode(detailMode === "settings" ? "branch" : "settings");
  });
}

if (openNodeNoteBtnEl) {
  openNodeNoteBtnEl.addEventListener("click", () => {
    setDetailMode(detailMode === "note" ? "branch" : "note");
  });
}

if (saveNodeMetaBtnEl) saveNodeMetaBtnEl.addEventListener("click", () => {
  saveSelectedNodeMeta().catch((error) => {
    console.error("saveSelectedNodeMeta failed", error);
  });
});

if (saveStudyNoteBtnEl) {
  saveStudyNoteBtnEl.addEventListener("click", () => {
    saveStudyNote().catch((error) => {
      console.error("saveStudyNote failed", error);
      setStudyNoteStatus(error?.message || "save failed", true);
    });
  });
}

if (generateStudyNoteBtnEl) {
  generateStudyNoteBtnEl.addEventListener("click", () => {
    generateStudyNote().catch((error) => {
      console.error("generateStudyNote failed", error);
      setStudyNoteStatus(t("study_note_generate_failed"), true);
    });
  });
}

document.querySelectorAll(".study-note-suggestion-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    applyStudyNoteSuggestion(String(btn.dataset.noteSuggestion || "").trim());
  });
});

if (uploadStudyNoteImageBtnEl) {
  uploadStudyNoteImageBtnEl.addEventListener("click", () => {
    if (studyNoteFileInputEl && !uploadStudyNoteImageBtnEl.disabled) {
      studyNoteFileInputEl.click();
    }
  });
}

if (studyNoteFileInputEl) {
  studyNoteFileInputEl.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        currentStudyNoteImageBase64 = e.target.result;
        if (studyNoteImagePreviewEl) studyNoteImagePreviewEl.hidden = false;
        if (studyNoteImageEl) studyNoteImageEl.src = currentStudyNoteImageBase64;
        saveStudyNote().catch((error) => {
          console.error("saveStudyNote after image upload failed", error);
          setStudyNoteStatus(error?.message || "save failed", true);
        });
      };
      reader.readAsDataURL(file);
    }
    event.target.value = "";
  });
}

if (removeStudyNoteImageBtnEl) {
  removeStudyNoteImageBtnEl.addEventListener("click", () => {
    currentStudyNoteImageBase64 = "";
    if (studyNoteImagePreviewEl) studyNoteImagePreviewEl.hidden = true;
    if (studyNoteImageEl) studyNoteImageEl.src = "";
    saveStudyNote().catch((error) => {
      console.error("saveStudyNote after image remove failed", error);
      setStudyNoteStatus(error?.message || "save failed", true);
    });
  });
}

let nodeTitleSaveTimer = null;
if (nodeTitleInputEl) {
  nodeTitleInputEl.addEventListener("input", () => {
    if (nodeTitleSaveTimer) clearTimeout(nodeTitleSaveTimer);
    nodeTitleSaveTimer = setTimeout(() => {
      saveSelectedNodeMeta().catch((error) => {
        console.error("saveSelectedNodeMeta failed", error);
      });
    }, 1000);
  });
  nodeTitleInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (nodeTitleSaveTimer) clearTimeout(nodeTitleSaveTimer);
      nodeTitleInputEl.blur();
    }
  });
  nodeTitleInputEl.addEventListener("blur", () => {
    if (nodeTitleSaveTimer) clearTimeout(nodeTitleSaveTimer);
    saveSelectedNodeMeta().catch((error) => {
      console.error("saveSelectedNodeMeta failed", error);
    });
  });
}

if (nodeFolderSelectEl) {
  nodeFolderSelectEl.addEventListener("change", () => {
    saveSelectedNodeMeta().catch((error) => {
      console.error("saveSelectedNodeMeta failed", error);
    });
  });
}

let studyNoteSaveTimer = null;
if (studyNoteInputEl) {
  studyNoteInputEl.addEventListener("input", () => {
    if (studyNoteSaveTimer) clearTimeout(studyNoteSaveTimer);
    studyNoteSaveTimer = setTimeout(() => {
      saveStudyNote().catch((error) => {
        console.error("saveStudyNote failed", error);
      });
    }, 1500);
  });
  studyNoteInputEl.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (studyNoteSaveTimer) clearTimeout(studyNoteSaveTimer);
      studyNoteInputEl.blur();
    }
  });
  studyNoteInputEl.addEventListener("blur", () => {
    if (studyNoteSaveTimer) clearTimeout(studyNoteSaveTimer);
    saveStudyNote().catch((error) => {
      console.error("saveStudyNote failed", error);
      setStudyNoteStatus(error?.message || "save failed", true);
    });
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "hidden") return;
  if (studyNoteSaveTimer) {
    clearTimeout(studyNoteSaveTimer);
    studyNoteSaveTimer = null;
  }
  saveStudyNote().catch((error) => {
    console.error("saveStudyNote on visibilitychange failed", error);
  });
});

if (studyActionsBarEl) {
  studyActionsBarEl.addEventListener("click", (event) => {
    const target = event.target;
    const button = target && typeof target.closest === "function" ? target.closest(".study-action-btn") : null;
    if (!button || button.disabled) return;
    const action = (button.dataset.action || "").trim();
    if (!action) return;
    runStudyQuickAction(action).catch((error) => {
      console.error("runStudyQuickAction failed", error);
    });
  });
}

if (noteQuickFollowupsEl) {
  noteQuickFollowupsEl.addEventListener("click", (event) => {
    const target = event.target;
    const button = target && typeof target.closest === "function" ? target.closest(".note-quick-followup-btn") : null;
    if (!button || button.disabled) return;
    const action = String(button.dataset.action || "").trim();
    if (!action) return;
    runStudyQuickAction(action).catch((error) => {
      console.error("note quick follow-up failed", error);
      setBranchComposerStatus(error?.message || "quick follow-up failed", true);
    });
  });
}

if (branchAddBtnEl) {
  branchAddBtnEl.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (branchAddBtnEl.disabled) return;
    setBranchAddMenuOpen(!branchAddMenuOpen);
  });
}

if (branchUploadImageBtnEl) {
  branchUploadImageBtnEl.addEventListener("click", () => {
    setBranchAddMenuOpen(false);
    requestNativeUpload("image")
      .then(() => {
        setStudyHelperStatus("");
      })
      .catch(() => {
        setStudyHelperStatus(t("composer_upload_failed"), true);
      });
  });
}

if (branchQuoteSelectionBtnEl) {
  branchQuoteSelectionBtnEl.addEventListener("click", () => {
    setBranchAddMenuOpen(false);
    requestPageSelectionQuote()
      .then((text) => {
        if (!text) {
          setStudyHelperStatus(t("branch_anchor_none"), true);
          return;
        }
        appendTextToBranchComposer(text, { setAnchor: true });
        setStudyHelperStatus("");
      })
      .catch((error) => {
        console.warn("requestPageSelectionQuote failed", error);
        setStudyHelperStatus(t("branch_anchor_none"), true);
      });
  });
}

if (branchUploadFileBtnEl) {
  branchUploadFileBtnEl.addEventListener("click", () => {
    setBranchAddMenuOpen(false);
    requestNativeUpload("file")
      .then(() => {
        setStudyHelperStatus("");
      })
      .catch(() => {
        setStudyHelperStatus(t("composer_upload_failed"), true);
      });
  });
}

if (branchToolsBtnEl) {
  branchToolsBtnEl.addEventListener("click", () => {
    setBranchToolsOpen(!branchToolsOpen);
  });
}

if (branchModeBtnEl) {
  branchModeBtnEl.addEventListener("click", () => {
    if (!branchModeMenuOpen) {
      syncBranchComposerModeFromGemini().catch(() => {});
    }
    setBranchModeMenuOpen(!branchModeMenuOpen);
  });
}

if (branchModeThinkingBtnEl) {
  branchModeThinkingBtnEl.addEventListener("click", () => {
    setNativeComposerMode("thinking").catch((error) => {
      console.warn("setNativeComposerMode(thinking) failed", error);
    });
    setBranchModeMenuOpen(false);
  });
}

if (branchModeDirectBtnEl) {
  branchModeDirectBtnEl.addEventListener("click", () => {
    setNativeComposerMode("standard").catch((error) => {
      console.warn("setNativeComposerMode(standard) failed", error);
    });
    setBranchModeMenuOpen(false);
  });
}

if (locateBtnEl) {
  locateBtnEl.addEventListener("click", () => {
    if (!selectedEntryKey) return;
    sendScrollRequest(selectedEntryKey, { force: true }).catch((error) => {
      console.error("locate button sendScrollRequest failed", error);
    });
  });
}

if (clearContextBtnEl) clearContextBtnEl.addEventListener("click", () => {
  selectedContextEntryKeys.clear();
  if (selectedEntryKey) {
    selectedContextEntryKeys.add(selectedEntryKey);
  }
  renderTimeline();
});

if (branchTreeCollapseAllBtnEl) {
  branchTreeCollapseAllBtnEl.addEventListener("click", () => {
    const nodes = getBranchTreeNodes();
    branchTreeCollapsedNodeIds = new Set(nodes.map((node) => node.id).filter((id) => id && id !== "__root__"));
    renderBranchTreePanel();
  });
}

if (branchTreeExpandAllBtnEl) {
  branchTreeExpandAllBtnEl.addEventListener("click", () => {
    branchTreeCollapsedNodeIds.clear();
    renderBranchTreePanel();
  });
}

if (clearBranchAnchorBtnEl) {
  clearBranchAnchorBtnEl.addEventListener("click", () => {
    branchAnchorQuote = "";
    syncBranchAnchorBar();
  });
}

if (branchThreadEl) {
  branchThreadEl.dataset.branchDropTarget = "1";

  const handleBranchThreadDragOver = (event) => {
    const draggedEntryKey = getDraggedWorkspaceEntryKeyFromEvent(event);
    if (!draggedEntryKey) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    branchThreadEl.classList.add("is-drop-over");
  };

  const handleBranchThreadDragLeave = () => {
    branchThreadEl.classList.remove("is-drop-over");
  };

  const handleBranchThreadDrop = (event) => {
    const draggedEntryKey = getDraggedWorkspaceEntryKeyFromEvent(event);
    branchThreadEl.classList.remove("is-drop-over");
    workspaceDraggingEntryKey = "";
    if (!draggedEntryKey) return;
    event.preventDefault();
    event.stopPropagation();
    classifyEntryToCurrentBranchThreadByDrag(draggedEntryKey).catch((error) => {
      console.error("classifyEntryToCurrentBranchThreadByDrag failed", error);
      setBranchComposerStatus(error?.message || "manual classify failed", true);
    });
  };

  branchThreadEl.addEventListener("dragover", handleBranchThreadDragOver, true);
  branchThreadEl.addEventListener("dragover", handleBranchThreadDragOver);
  branchThreadEl.addEventListener("dragleave", handleBranchThreadDragLeave, true);
  branchThreadEl.addEventListener("dragleave", handleBranchThreadDragLeave);
  branchThreadEl.addEventListener("drop", handleBranchThreadDrop, true);
  branchThreadEl.addEventListener("drop", handleBranchThreadDrop);
  branchThreadEl.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const card = target.closest(".branch-card-question");
    if (!card) return;
    const nodeId = String(card.dataset.branchNodeId || "").trim();
    if (!nodeId) return;
    branchTreeSelectedNodeId = nodeId;
    branchDraftParentNodeId = nodeId;
    expandBranchPath(nodeId, currentBranchMessages);
    renderBranchTreePanel();
    const targetMessage = findBranchQuestionMessageById(nodeId, getBranchVisibleMessages());
    const targetEntryKey = resolveBranchQuestionAnswerEntryKey(targetMessage);
    const didJump = jumpToBranchNode(nodeId, { syncScroll: true });
    if (!didJump || !targetEntryKey || targetEntryKey === selectedEntryKey) {
      renderBranchThread();
      renderNodeEditor(getSelectedEntry());
    }
  });
}

if (timelineListEl) {
  timelineListEl.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const entryEl = target.closest("[data-entry-key]");
    if (!(entryEl instanceof HTMLElement)) return;
    const entryKey = normalizeSingleLine(entryEl.dataset.entryKey || "", 200);
    if (!entryKey) return;
    setSubQuestionWorkbenchOpen(false);
    scheduleSelectEntry(entryKey, { syncScroll: true, force: true, openWorkbench: false });
  });
}

if (branchSendBtnEl) branchSendBtnEl.addEventListener("click", () => {
  handleBranchSend().catch((error) => {
    console.error("handleBranchSend failed", error);
  });
});

if (toggleTimelineBtnEl) {
  toggleTimelineBtnEl.addEventListener("click", () => {
    setTimelineCollapsed(!timelineCollapsed, true).catch((error) => {
      console.error("setTimelineCollapsed failed", error);
    });
  });
}

if (treeStyleWireBtnEl) {
  treeStyleWireBtnEl.addEventListener("click", () => {
    setWorkspaceTreeStyle("wire", true).catch((error) => {
      console.error("setWorkspaceTreeStyle(wire) failed", error);
    });
  });
}

if (treeStyleGlassBtnEl) {
  treeStyleGlassBtnEl.addEventListener("click", () => {
    setWorkspaceTreeStyle("glass", true).catch((error) => {
      console.error("setWorkspaceTreeStyle(glass) failed", error);
    });
  });
}

if (floatingToggleBtnEl) {
  floatingToggleBtnEl.addEventListener("click", () => {
    setTimelineCollapsed(false, true).catch((error) => {
      console.error("setTimelineCollapsed false failed", error);
    });
  });
}

if (compactShowChatBtnEl) {
  compactShowChatBtnEl.addEventListener("click", () => {
    setCompactWorkspacePane("chat");
  });
}

if (compactShowNoteBtnEl) {
  compactShowNoteBtnEl.addEventListener("click", () => {
    setCompactWorkspacePane("note");
  });
}

if (branchInputEl) branchInputEl.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    handleBranchSend().catch((error) => {
      console.error("handleBranchSend failed", error);
    });
  }
});

document.addEventListener("mouseup", () => {
  const quote = pickSelectionQuoteFromBranchZones();
  if (!quote) return;
  branchAnchorQuote = quote;
  syncBranchAnchorBar();
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (
    branchAddMenuOpen &&
    !target.closest("#branchAddMenu") &&
    !target.closest("#branchAddBtn")
  ) {
    setBranchAddMenuOpen(false);
  }
  if (
    branchToolsOpen &&
    !target.closest("#branchToolsPanel") &&
    !target.closest("#branchToolsBtn")
  ) {
    setBranchToolsOpen(false);
  }
  if (
    branchModeMenuOpen &&
    !target.closest("#branchModeMenu") &&
    !target.closest("#branchModeBtn")
  ) {
    setBranchModeMenuOpen(false);
  }
});

setNodeManageMode("create");
setBranchAddMenuOpen(false);
setBranchToolsOpen(false);
setBranchComposerMode("standard");

document.addEventListener("keydown", (event) => {
  if (currentView !== "workspace") return;
  const target = event.target;
  const tagName = target && target.tagName ? String(target.tagName).toLowerCase() : "";
  const isTypingArea = tagName === "input" || tagName === "textarea" || (target && target.isContentEditable);
  if (isTypingArea) return;
  if (!(event.ctrlKey && event.altKey)) return;

  const key = (event.key || "").toLowerCase();
  if (key === "r") {
    event.preventDefault();
    pickRandomNodeForStudy().catch((error) => {
      console.error("pickRandomNodeForStudy shortcut failed", error);
    });
    return;
  }
  if (key === "l") {
    event.preventDefault();
    pickSpacedReviewNode().catch((error) => {
      console.error("pickSpacedReviewNode shortcut failed", error);
    });
    return;
  }
  if (key === "m") {
    event.preventDefault();
    markCurrentEntryReviewed({ autoNext: true }).catch((error) => {
      console.error("markCurrentEntryReviewed shortcut failed", error);
    });
  }
});

async function refreshPanelByActiveGeminiTab() {
  if (currentView === "workspace") {
    await initWorkspaceFromActiveTab();
    return true;
  }
  if (currentView === "home") {
    await enterHomeView();
    return true;
  }
  return false;
}

function schedulePanelRefresh() {
  const elapsed = Date.now() - panelRefreshLastAt;
  const delay = elapsed >= PANEL_REFRESH_MIN_INTERVAL_MS ? PANEL_REFRESH_DEBOUNCE_MS : PANEL_REFRESH_MIN_INTERVAL_MS - elapsed;
  if (panelRefreshTimer) clearTimeout(panelRefreshTimer);
  panelRefreshTimer = setTimeout(() => {
    panelRefreshTimer = null;
    if (panelRefreshInFlight) return;
    panelRefreshInFlight = true;
    refreshPanelByActiveGeminiTab()
      .catch((error) => {
        console.error("scheduled panel refresh failed:", error);
      })
      .finally(() => {
        panelRefreshInFlight = false;
        panelRefreshLastAt = Date.now();
      });
  }, Math.max(PANEL_REFRESH_DEBOUNCE_MS, delay));
}

chrome.tabs.onActivated.addListener(() => {
  if (currentView === "workspace" || currentView === "home") {
    schedulePanelRefresh();
    return;
  }
  if (currentTheme === "gemini") {
    applyTheme().catch((error) => {
      console.error("onActivated applyTheme failed:", error);
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== "complete" || !tab.active || !tab.url?.includes("gemini.google.com")) return;
  if (currentView === "workspace" || currentView === "home") {
    schedulePanelRefresh();
    return;
  }
  if (currentTheme === "gemini") {
    applyTheme().catch((error) => {
      console.error("onUpdated applyTheme failed:", error);
    });
  }
});

if (chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    const next = changes[PANEL_NAV_KEY]?.newValue;
    if (next && typeof next === "object") {
      if (next.view === "home" && currentView !== "home") {
        enterHomeView().catch((error) => {
          console.error("storage navigate home failed:", error);
        });
      } else if (next.view === "workspace" && next.conversationId) {
        openWorkspaceConversation(next.conversationId, { requestSnapshot: true }).catch((error) => {
          console.error("storage navigate workspace failed:", error);
        });
      }
    }

    if (currentView === "workspace" && currentConversationId) {
      const branchPrefix = `${BRANCH_PREFIX}${currentConversationId}:`;
      const changedBranchKeys = Object.keys(changes || {}).filter((key) => key.startsWith(branchPrefix));
      const hasBranchChange = changedBranchKeys.length > 0;
      if (hasBranchChange) {
        scheduleBranchStorageSync(changedBranchKeys);
      }
    }

    if (currentView !== "home" || homeStorageChangeSyncing) return;
    const homeKey = getHomeStorageKey();
    const homeIndexKey = getHomeIndexStorageKey();
    if (!changes[homeKey] && !changes[homeIndexKey]) return;

    homeStorageChangeSyncing = true;
    Promise.resolve()
      .then(async () => {
        await loadHomeState();
        await refreshHomeList({ showStatus: false, skipSidebarSync: true });
      })
      .catch((error) => {
        console.error("storage home sync failed:", error);
      })
      .finally(() => {
        homeStorageChangeSyncing = false;
      });
  });
}

let workspaceResizeSyncTimer = null;
let workspaceResizeRafId = 0;
function setPanelResizingState(active) {
  const nextActive = Boolean(active);
  const wasActive = panelResizeActive;
  panelResizeActive = nextActive;
  if (!document.body) return;
  document.body.classList.toggle("panel-resizing", nextActive);
  if (wasActive && !nextActive && deferredResizeRenderPending) {
    deferredResizeRenderPending = false;
    scheduleTimelineRender();
    schedulePostSelectionRender(selectedEntryKey, { selectionChanged: false });
  }
}
window.addEventListener("resize", () => {
  setPanelResizingState(true);
  if (!workspaceResizeRafId) {
    workspaceResizeRafId = window.requestAnimationFrame(() => {
      workspaceResizeRafId = 0;
      syncWorkspaceFollowupFocusMode();
    });
  }
  if (workspaceResizeSyncTimer) clearTimeout(workspaceResizeSyncTimer);
  workspaceResizeSyncTimer = setTimeout(() => {
    workspaceResizeSyncTimer = null;
    syncWorkspaceFollowupFocusMode();
    setPanelResizingState(false);
  }, PANEL_RESIZE_SETTLE_MS);
});
window.addEventListener("focus", () => {
  if (currentView === "workspace" || currentView === "home") {
    schedulePanelRefresh();
  }
  if (currentTheme !== "gemini") return;
  applyTheme().catch((error) => {
    console.error("window focus applyTheme failed:", error);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GEMINI_HAJIMI_PERF") {
    const action = normalizeSingleLine(message?.action || "list", 20);
    if (action === "clear") {
      sidePanelPerfTrace.length = 0;
    }
    sendResponse({
      ok: true,
      action,
      items: action === "clear" ? [] : sidePanelPerfTrace.slice()
    });
    return true;
  }

  if (message?.type === "GEMINI_PING_SIDE_PANEL") {
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === "GEMINI_CLOSE_SIDE_PANEL") {
    window.close();
    sendResponse({ ok: true });
    return true;
  }
});

function connectToBackground() {
  const port = chrome.runtime.connect({ name: "gemini-sidepanel" });
  
  let initSent = false;
  const sendInit = (winId) => {
    if (initSent || !winId) return;
    initSent = true;
    port.postMessage({ type: "INIT", windowId: winId });
  };

  if (chrome.windows && chrome.windows.getCurrent) {
    chrome.windows.getCurrent((win) => {
      if (win && win.id) sendInit(win.id);
    });
  }
  
  if (chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].windowId) {
        sendInit(tabs[0].windowId);
      }
    });
  }

  port.onMessage.addListener((msg) => {
    if (msg.type === "GEMINI_CLOSE_SIDE_PANEL") {
      window.close();
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "GEMINI_CLOSE_SIDE_PANEL") {
      // If windowId is provided, check if it matches ours
      if (msg.windowId) {
        chrome.windows && chrome.windows.getCurrent && chrome.windows.getCurrent((win) => {
          if (win && win.id === msg.windowId) {
            window.close();
          }
        });
      } else {
        window.close();
      }
    }
  });

  port.onDisconnect.addListener(() => {
    // Reconnect if background script restarts
    setTimeout(connectToBackground, 1000);
  });
}
connectToBackground();

const prefersDarkMedia = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
if (prefersDarkMedia) {
  const onPrefersThemeChange = () => {
    if (currentTheme !== "gemini") return;
    applyTheme().catch((error) => {
      console.error("prefers-color-scheme applyTheme failed:", error);
    });
  };
  if (typeof prefersDarkMedia.addEventListener === "function") {
    prefersDarkMedia.addEventListener("change", onPrefersThemeChange);
  } else if (typeof prefersDarkMedia.addListener === "function") {
    prefersDarkMedia.addListener(onPrefersThemeChange);
  }
}

function init() {
  bootstrap().catch((error) => {
    console.error("Side panel bootstrap failed:", error);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
