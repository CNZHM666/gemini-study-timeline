const CHAT_VIEW_SELECTORS = [
  "ms-chat-view",
  "chat-window",
  "#chat-history",
  "infinite-scroller.chat-history",
  "main",
  "[role='main']"
];
const USER_QUERY_SELECTORS = [
  "user-query",
  "user-query-bubble-with-background",
  "[data-message-author-role='user']",
  "[data-author='user']",
  "[data-testid*='conversation'] [data-testid*='user']",
  "[data-testid*='turn-user']",
  "[class*='conversation-turn'][class*='user']",
  "[aria-label*='\u4f60\u8bf4']",
  "[data-testid*='user']",
  "[class*='user-query']",
  "[class*='userMessage']",
  "[class*='query-text']",
  "[class*='userBubble']"
];
const MODEL_RESPONSE_SELECTORS = [
  "model-response",
  "model-response-content",
  "chat-response",
  "[data-message-author-role='assistant']",
  "[data-author='assistant']",
  "[data-testid*='conversation'] [data-testid*='assistant']",
  "[data-testid*='turn-assistant']",
  "[class*='conversation-turn'][class*='assistant']",
  "[aria-label*='Gemini']",
  "[data-testid*='assistant']",
  "[class*='model-response']",
  "[class*='assistantMessage']",
  "[class*='response-content']",
  "message-content"
];
const STORAGE_PREFIX = "gemini:session:";
const SETTINGS_KEY = "gemini:settings:v1";
const HOME_KEY = "gemini:home:v1";
const HOME_INDEX_KEY = "gemini:home:index:v1";
const PANEL_NAV_KEY = "gemini:panel:navigate:v1";
const HOME_DEFAULT_FOLDER_ID = "home_default";
const DEFAULT_ACCOUNT_SCOPE = "u0";
const SCAN_DEBOUNCE_MS = 360;
const RESPONSE_STABLE_MS = 1200;
const PENDING_FOLLOWUP_KEY = "gemini:pending_followup";
const FOLLOWUP_TTL_MS = 5 * 60 * 1000;
const FOLLOWUP_COMPOSER_RETRY_COUNT = 60;
const FOLLOWUP_COMPOSER_RETRY_INTERVAL_MS = 500;
const NATIVE_TIMELINE_POLL_MS = 12000;
const NATIVE_TIMELINE_ACTIVE_SYNC_MIN_MS = 140;
const NATIVE_TIMELINE_ACTIVE_LOCAL_SCAN_RADIUS = 4;
const NATIVE_TIMELINE_ACTIVE_MAX_NEAR_SCORE = 220;
const NATIVE_TIMELINE_RESIZE_SETTLE_MS = 620;
const SIDEBAR_CONVERSATION_CACHE_MS = 1500;
const ACTIVE_SIDEBAR_CONVERSATION_CACHE_MS = 900;
const ROUTE_TICK_HEARTBEAT_MS = 12000;
const SIDEBAR_REBIND_INTERVAL_MS = 18000;
const SIDEBAR_HEALTH_CHECK_INTERVAL_MS = 18000;
const SIDEBAR_HEALTH_CHECK_MAX_INTERVAL_MS = 48000;
const SIDEBAR_MUTATION_SETTLE_MS = 260;
const SIDEBAR_REGION_CACHE_MS = 520;
const DUAL_SIDEBAR_SCAN_DEBOUNCE_MS = 780;
const DUAL_SIDEBAR_TIMELINE_MIN_RENDER_MS = 900;
const NATIVE_TIMELINE_EMPTY_RETRY_BASE_MS = 120;
const NATIVE_TIMELINE_EMPTY_RETRY_STEP_MS = 140;
const QUICK_QUOTE_SELECTION_SETTLE_MS = 110;
const QUICK_QUOTE_POST_POINTER_DELAY_MS = 70;
const QUICK_QUOTE_FIRST_INTERACTION_GRACE_MS = 1400;
const SIDEBAR_DND_ENHANCE_MIN_MS = 1800;
const CONTENT_BOOT_HEAVY_WORK_GRACE_MS = 900;
const PERF_SAMPLE_LIMIT = 24;
const PERF_SLOW_THRESHOLD_MS = 24;
const RAW_ENTRY_CACHE_TTL_MS = 1800;
const NATIVE_TIMELINE_UNCHANGED_ANNOTATION_SYNC_MS = 1800;
const NATIVE_TIMELINE_CHANGED_ANNOTATION_SYNC_MS = 520;
const TIMELINE_SCROLL_TOP_GAP_MIN_PX = 116;
const TIMELINE_SCROLL_TOP_GAP_MAX_PX = 180;
const TIMELINE_SCROLL_TOP_GAP_VIEWPORT_RATIO = 0.16;
const INLINE_ANNOTATION_MAX_LENGTH = 800;
const INLINE_ANNOTATION_SAVE_DEBOUNCE_MS = 520;
const INLINE_ANNOTATION_STATUS_SETTLE_MS = 1400;
const CONVERSATION_SWITCH_SETTLE_MS = 120;
const INLINE_ANNOTATION_UI_MODE_KEY = "gtf:inline_annotation_ui_mode";
const MAIN_CONVERSATION_NOTE_MAX_LENGTH = 3000;
const PROMPT_LIBRARY_STORAGE_KEY = "gemini:prompt_library:v1";
const PROMPT_LIBRARY_MAX_ITEMS = 12;
const PROMPT_LIBRARY_NAME_MAX_LENGTH = 24;
const PROMPT_LIBRARY_GROUP_MAX_LENGTH = 18;
const PROMPT_LIBRARY_TEXT_MAX_LENGTH = 4000;
const ENABLE_NATIVE_MAIN_NOTE = false;
const ENABLE_NATIVE_SIDEBAR_WIDGET = false;
const BRANCH_PROMPT_MARKER_RE = /\[\[GTF_BRANCH:([a-zA-Z0-9_-]{6,80})\]\]/;

let chatContainer = null;
let chatObserver = null;
let scanTimer = null;
let writeQueue = Promise.resolve();

let currentConversationId = toConversationId(location.href);
let currentLocale = "zh";
let lowPowerModeEnabled = false;
let knownTurnIds = new Set();
let knownTurnTimestampMap = new Map();
const responseFinalizeTimers = new WeakMap();
const userTextCache = new WeakMap();
const responseMarkdownCache = new WeakMap();
const responseStructuredShareBlocksCache = new WeakMap();
const finalizedResponseSignatureMap = new WeakMap();
const domEntryMap = new Map();
const timelineShareBlocksByTurnId = new Map();
let followupDrawerEl = null;
let followupContext = null;
let nativeFolderPanelRoot = null;
let nativeFolderPanelShell = null;
let nativeFolderPanelRenderTimer = null;
let nativeFolderContextMenuEl = null;
let nativePanelQuietUntil = 0;
let nativePanelRendering = false;
let nativeCatalogSyncTimer = null;
let nativeCatalogSyncHash = "";
let nativeCatalogSyncKey = "";
let nativePendingCollapsedIds = null;
let quickQuoteBarEl = null;
let quickQuoteHideTimer = null;
let quickQuoteSelectionText = "";
let quickQuoteAnchorElement = null;
let quickQuotePointerSelecting = false;
let quickQuoteLastSignature = "";
let quickQuoteBoundAt = 0;
let pendingConsumeRetryTimer = null;
let nativeChatTimelineRoot = null;
let nativeChatTimelineList = null;
let nativeChatTimelineRenderTimer = null;
let nativeChatTimelinePollTimer = null;
let nativeChatTimelineLastScheduleAt = 0;
let nativeChatTimelineRenderToken = 0;
let nativeChatTimelineActiveTurnId = "";
let nativeChatTimelineLastTurnsJSON = "";
let nativeChatTimelineTurnsCache = [];
let nativeChatTimelineEmptyRetryCount = 0;
let nativeChatTimelineHighlightedIds = new Set();
let nativeChatTimelineHighlightLoadedFor = "";
let nativeChatTimelineBookmarks = new Map();
let nativeChatTimelineFilterMode = "all";
let nativeChatTimelineDotMap = new Map();
let nativeChatTimelineActiveDot = null;
let nativeChatTimelineActiveSyncRaf = null;
let nativeChatTimelineActiveSyncLastAt = 0;
let nativeChatTimelineLastNotifiedTurnId = "";
let nativeChatTimelineListenersBound = false;
let nativeChatTimelineFilterBar = null;
let nativeChatTimelinePositionSettleTimerIds = [];
let nativeTimelineBookmarkMenuRoot = null;
let nativeTimelineBookmarkMenuTurnId = "";
let nativeTimelineBookmarkMenuPositionLock = false;
let nativeTimelineFollowupTopicStarted = false;
let nativeTimelineFollowupGroups = [];
let nativeTimelineActiveFollowupGroupId = "";
let nativeTimelineFollowupColorCursor = 0;
let nativeTimelineJumpLockUntil = 0;
let nativeTimelineJumpEntryId = "";
let routeSwitchPendingConversationId = "";
let routeSwitchSettledUntil = 0;
let contentBootHeavyWorkUntil = Date.now() + CONTENT_BOOT_HEAVY_WORK_GRACE_MS;
let sidebarConversationCache = {
  routeKey: "",
  maxCount: 0,
  collectedAt: 0,
  items: []
};
let sidebarRegionCacheNode = null;
let sidebarRegionCacheAt = 0;
let activeSidebarConversationCache = { id: "", at: 0 };
let nativeSidebarMutationObserver = null;
let nativeSidebarObservedRoot = null;
let nativeSidebarMutationTimer = null;
let nativeSidebarMutationSignature = "";
let nativeSidebarScrollQuietUntil = 0;
let nativeSidebarHealthTimer = null;
let nativeSidebarHealthIntervalMs = SIDEBAR_HEALTH_CHECK_INTERVAL_MS;
let nativeSidebarDndEnhanceAt = 0;
let nativeSidebarDndEnhanceRoot = null;
let layoutResizeActiveUntil = 0;
let layoutResizeRenderTimer = null;
let layoutResizePositionRaf = 0;
let rawEntryCache = { key: "", at: 0, entries: [] };
const perfTrace = [];
const inlineAnnotationSaveTimers = new Map();
const inlineAnnotationStatusTimers = new WeakMap();
let inlineAnnotationSyncTimer = null;
let inlineAnnotationSyncInFlight = false;
let inlineAnnotationSyncPending = false;
let inlineAnnotationUiMode = "readable";
let inlineAnnotationShareMenuBound = false;
let nativeMainNoteRoot = null;
let nativeMainNoteTextarea = null;
let nativeMainNoteStatusEl = null;
let nativeMainNoteCountEl = null;
let nativeMainNotePrevBtn = null;
let nativeMainNoteNextBtn = null;
let nativeMainNoteJumpBtn = null;
let nativeMainNoteRenderTimer = null;
let nativeMainNoteSaveTimer = null;
let nativeMainNoteFlashTimer = null;
let nativeMainNoteLoadedConversationId = "";
let nativeMainNoteLastSavedText = "";
let nativeMainNoteDirty = false;
let nativeMainNoteLinks = [];
let nativeMainNoteActiveLinkedTurnId = "";
let nativePromptLibraryRoot = null;
let nativePromptLibraryButton = null;
let nativePromptLibraryPanel = null;
let nativePromptLibraryStatusEl = null;
let nativePromptLibraryListEl = null;
let nativePromptLibraryEmptyEl = null;
let nativePromptLibrarySearchInput = null;
let nativePromptLibraryFilterBar = null;
let nativePromptLibraryRecentListEl = null;
let nativePromptLibraryImportInput = null;
let nativePromptLibraryNameInput = null;
let nativePromptLibraryGroupInput = null;
let nativePromptLibraryTextarea = null;
let nativePromptLibraryEditor = null;
let nativePromptLibraryTemplateDialog = null;
let nativePromptLibraryTemplateFieldsEl = null;
let nativePromptLibraryTemplateTitleEl = null;
let nativePromptLibraryTemplateConfirmBtn = null;
let nativePromptLibraryTemplateCancelBtn = null;
let nativePromptLibraryTitleEl = null;
let nativePromptLibrarySaveBtn = null;
let nativePromptLibraryCancelBtn = null;
let nativePromptLibraryImportBtn = null;
let nativePromptLibraryExportBtn = null;
let nativePromptLibraryRenderTimer = null;
let nativePromptLibraryPositionRaf = 0;
let nativePromptLibraryItems = [];
let nativePromptLibraryLoaded = false;
let nativePromptLibraryOpen = false;
let nativePromptLibraryEditingId = "";
let nativePromptLibrarySearchTerm = "";
let nativePromptLibraryActiveFilter = "all";
let nativePromptLibraryDragId = "";
let nativePromptLibraryCollapsedGroups = new Set();
let nativeFolderPanelState = {
  folders: [],
  conversationFolderMap: {}
};
let nativeFolderPanelUiState = {
  createInlineOpen: false,
  createDraftName: "",
  createDraftParentId: "",
  statusText: "",
  statusError: false,
  folderListOpen: false,
  perfDiagEnabled: false
};
const debugState = {
  lastScanAt: 0,
  lastScanUsers: 0,
  lastScanResponses: 0,
  lastScanLooseResponses: 0,
  lastScanPairs: 0,
  lastSnapshotTurns: 0,
  lastSnapshotFallbackTurns: 0,
  lastError: "",
  observerConnected: false,
  containerTag: "",
  containerClass: "",
  perfLastName: "",
  perfLastMs: 0,
  perfLastAt: 0,
  perfSlowCount: 0,
  sidebarHealthOk: true,
  sidebarHealthReasons: "",
  sidebarHealthAt: 0,
  branchDispatchId: "",
  branchDispatchStage: "",
  branchDispatchUpdatedAt: 0,
  branchDispatchAttempt: 0,
  branchDispatchMode: "",
  branchDispatchPromptLength: 0,
  branchDispatchQueued: false,
  branchDispatchComposerFound: false,
  branchDispatchSendReady: false,
  branchDispatchSent: false,
  branchDispatchTrace: []
};

const CONTENT_I18N = {
  zh: {
    timeline_aria_label: "对话时间轴",
    timeline_toggle_sidebar: "切换侧边栏",
    timeline_bookmark_title_prefix: "学习标记：",
    timeline_bookmark_note_prefix: "备注：",
    timeline_turn_unnamed: "未命名问题",
    timeline_turn_hint: "点击定位；Shift+点击快速标待复习；右键设置学习标记",
    timeline_menu_note_placeholder: "写一句学习备注，比如“这里容易把条件看反”",
    timeline_menu_save: "保存备注",
    timeline_menu_clear: "清除标记",
    timeline_bookmark_panel_title: "学习标记",
    timeline_menu_share_download: "下载图片",
    timeline_menu_share_download_svg: "下载 SVG",
    timeline_menu_share_copy: "复制图片",
    timeline_menu_status_rendering: "正在生成卡片...",
    timeline_menu_status_downloaded: "卡片已下载",
    timeline_menu_status_downloaded_svg: "SVG 已下载",
    timeline_menu_status_copied: "卡片已复制",
    timeline_menu_status_saved_note: "已保存到主对话笔记",
    timeline_menu_status_copy_unsupported: "当前环境不支持复制图片，请改用下载",
    timeline_menu_status_image_error: "生成卡片失败，请重试",
    timeline_menu_status_note_error: "保存到主对话笔记失败，请重试",
    timeline_menu_status_note_limit: "主对话笔记已满，请先精简后再保存",
    timeline_share_card_badge: "分问题分享",
    timeline_share_card_title: "学习复盘卡",
    timeline_share_card_question: "问题",
    timeline_share_card_answer: "回答摘要",
    timeline_share_card_takeaway: "关键结论",
    timeline_share_card_note: "学习备注",
    timeline_share_card_note_linked: "已联动笔记区",
    timeline_share_card_status: "学习状态",
    timeline_share_card_status_unmarked: "未标记",
    timeline_share_card_suggestion: "复习提示",
    timeline_share_card_time: "时间",
    timeline_share_card_footer: "用于学习复盘与分享",
    timeline_share_card_note_empty: "还没有添加学习备注，建议补一句自己的理解或易错点。",
    timeline_share_tip_default: "建议把这条内容复述一遍，再用自己的话写下 1 句总结。",
    timeline_share_tip_important: "这是当前待复习项，适合课后再快速过一遍并整理成知识卡片。",
    timeline_share_tip_mistake: "这是易错点，建议补做 1 道同类题并记录错误原因。",
    timeline_share_tip_review: "这条内容适合加入后续复习清单，隔一段时间再回顾一次。",
    timeline_share_tip_mastered: "这部分已基本掌握，可以尝试讲给别人听来进一步巩固。",
    inline_annotation_share_title: "分享当前分问题",
    inline_annotation_share_more: "更多操作",
    inline_annotation_share_download: "保存图片",
    timeline_filter_all_label: "全",
    timeline_filter_all_title: "显示全部时间点",
    timeline_filter_bookmarked_label: "标",
    timeline_filter_bookmarked_title: "只显示已标记的问题",
    timeline_filter_mistake_label: "错",
    timeline_filter_mistake_title: "只显示标为易错的问题",
    timeline_filter_review_label: "复",
    timeline_filter_review_title: "只显示标为待复习的问题",
    timeline_bookmark_important_label: "待复习",
    timeline_bookmark_important_short: "复",
    timeline_bookmark_mistake_label: "易错",
    timeline_bookmark_mistake_short: "错",
    timeline_bookmark_review_label: "待复习",
    timeline_bookmark_review_short: "复",
    timeline_bookmark_mastered_label: "已掌握",
    timeline_bookmark_mastered_short: "会",
    quick_quote_main: "引入主对话",
    quick_quote_note: "批注",
    inline_annotation_mode_compact: "紧凑",
    inline_annotation_mode_readable: "阅读",
    inline_annotation_mode_toggle: "切换批注样式",
    inline_annotation_placeholder: "输入批注内容（自动保存）",
    inline_annotation_label: "批注",
    inline_annotation_main_placeholder: "记录这条回答的理解、疑问或记忆点（自动保存）",
    inline_annotation_main_label: "主批注",
    inline_annotation_interleaved_placeholder: "记录这一段的批注（自动保存）",
    inline_annotation_interleaved_label: "段落批注",
    inline_annotation_status_editing: "编辑中...",
    inline_annotation_status_saving: "保存中...",
    inline_annotation_status_saved: "已保存",
    inline_annotation_status_cleared: "已清空",
    inline_annotation_status_error: "保存失败",
    inline_annotation_summary_empty: "这一段还没有批注",
    main_note_aria_label: "主对话笔记",
    main_note_label: "主对话笔记",
    main_note_status_ready: "可编辑",
    main_note_status_editing: "编辑中...",
    main_note_status_saved: "已保存",
    main_note_status_saving: "保存中...",
    main_note_status_error: "保存失败",
    main_note_status_waiting: "等待会话",
    main_note_status_synced: "已同步",
    main_note_placeholder: "在这里记录当前主对话的总笔记（Ctrl+Enter 立即保存）",
    main_note_placeholder_waiting: "请先进入具体主对话后再记录主笔记",
    main_note_prev_turn: "上一条",
    main_note_next_turn: "下一条",
    main_note_jump_turn: "定位原分问题",
    prompt_library_button: "提示词",
    prompt_library_title: "快捷提示词",
    prompt_library_subtitle: "点卡片即可导入到输入框",
    prompt_library_new: "新建",
    prompt_library_close: "收起",
    prompt_library_empty: "还没有保存提示词，先新建一个常用模板吧。",
    prompt_library_empty_filtered: "没有匹配的提示词，试试换个关键词或分组。",
    prompt_library_editor_new: "新建提示词",
    prompt_library_editor_edit: "编辑提示词",
    prompt_library_search_placeholder: "搜索标题、分组或内容",
    prompt_library_name_placeholder: "标题，如：总结题目",
    prompt_library_group_placeholder: "分组，如：总结 / 刷题 / 写作",
    prompt_library_text_placeholder: "输入提示词内容，保存后点击即可一键导入到原生输入框",
    prompt_library_save: "保存",
    prompt_library_cancel: "取消",
    prompt_library_edit: "编辑",
    prompt_library_delete: "删除",
    prompt_library_group_all: "全部",
    prompt_library_group_recent: "最近使用",
    prompt_library_recent_title: "最近使用",
    prompt_library_import: "导入",
    prompt_library_export: "导出",
    prompt_library_template_chip: "变量",
    prompt_library_group_untitled: "未分组",
    prompt_library_template_title: "填写变量",
    prompt_library_template_hint: "补全下面变量后再导入",
    prompt_library_template_apply: "导入",
    prompt_library_group_expand: "展开分组",
    prompt_library_group_collapse: "收起分组",
    prompt_library_status_ready: "可直接导入",
    prompt_library_status_imported: "已导入到输入框",
    prompt_library_status_saved: "已保存",
    prompt_library_status_deleted: "已删除",
    prompt_library_status_sorted: "已更新顺序",
    prompt_library_status_exported: "已导出提示词库",
    prompt_library_status_imported_file: "已导入提示词库",
    prompt_library_status_import_invalid: "导入文件格式不正确",
    prompt_library_status_limit: "最多保存 {count} 条提示词",
    prompt_library_status_missing_name: "请先填写标题",
    prompt_library_status_missing_text: "请先填写提示词内容",
    prompt_library_status_input_missing: "未找到原生输入框，请稍后重试",
    prompt_library_status_error: "操作失败，请重试",
    prompt_library_confirm_delete: "确认删除这个提示词吗？",
    prompt_library_placeholder_prompt: "请输入占位符「{name}」的内容"
  },
  en: {
    timeline_aria_label: "Conversation Timeline",
    timeline_toggle_sidebar: "Toggle Side Panel",
    timeline_bookmark_title_prefix: "Learning Mark: ",
    timeline_bookmark_note_prefix: "Note: ",
    timeline_turn_unnamed: "Untitled question",
    timeline_turn_hint: "Click to jump; Shift+click to mark Review; right-click to set a learning mark",
    timeline_menu_note_placeholder: "Add a short study note, such as \"easy to reverse this condition\"",
    timeline_menu_save: "Save Note",
    timeline_menu_clear: "Clear Bookmark",
    timeline_bookmark_panel_title: "Learning Mark",
    timeline_menu_share_title: "Share This Turn",
    timeline_menu_share_download: "Download",
    timeline_menu_share_download_svg: "Download SVG",
    timeline_menu_share_copy: "Copy Image",
    timeline_menu_share_save_note: "Save To Note",
    timeline_menu_status_rendering: "Rendering share card...",
    timeline_menu_status_downloaded: "Share card downloaded",
    timeline_menu_status_downloaded_svg: "SVG downloaded",
    timeline_menu_status_copied: "Share card copied",
    timeline_menu_status_saved_note: "Saved to the main conversation note",
    timeline_menu_status_copy_unsupported: "Image copy is not supported here. Please use download instead",
    timeline_menu_status_image_error: "Failed to generate the share card. Please retry",
    timeline_menu_status_note_error: "Failed to save to the main conversation note",
    timeline_menu_status_note_limit: "The main note is full. Please shorten it before saving",
    timeline_share_card_badge: "Turn Share",
    timeline_share_card_title: "Study Review Card",
    timeline_share_card_question: "Question",
    timeline_share_card_answer: "Answer Summary",
    timeline_share_card_takeaway: "Key Takeaway",
    timeline_share_card_note: "Study Note",
    timeline_share_card_note_linked: "Linked With Notes",
    timeline_share_card_status: "Learning Status",
    timeline_share_card_status_unmarked: "Unmarked",
    timeline_share_card_suggestion: "Review Tip",
    timeline_share_card_time: "Time",
    timeline_share_card_footer: "Made for study review and sharing",
    timeline_share_card_note_empty: "No study note yet. Add one line about your understanding or the likely pitfall.",
    timeline_share_tip_default: "Try restating this point once and write one sentence in your own words.",
    timeline_share_tip_important: "This item is queued for review. Revisit it later and turn it into a knowledge card.",
    timeline_share_tip_mistake: "This is an easy mistake. Solve one similar problem and record why the mistake happened.",
    timeline_share_tip_review: "Add this to your review list and revisit it after some time.",
    timeline_share_tip_mastered: "This part looks solid. Try teaching it to someone else to reinforce it.",
    inline_annotation_share_title: "Share This Turn",
    inline_annotation_share_more: "More Actions",
    inline_annotation_share_download: "Save Card",
    timeline_filter_all_label: "A",
    timeline_filter_all_title: "Show all timeline points",
    timeline_filter_bookmarked_label: "M",
    timeline_filter_bookmarked_title: "Show only marked items",
    timeline_filter_mistake_label: "M",
    timeline_filter_mistake_title: "Show only items marked as mistakes",
    timeline_filter_review_label: "R",
    timeline_filter_review_title: "Show only items marked for review",
    timeline_bookmark_important_label: "Review",
    timeline_bookmark_important_short: "Rev",
    timeline_bookmark_mistake_label: "Mistake",
    timeline_bookmark_mistake_short: "Mis",
    timeline_bookmark_review_label: "Review",
    timeline_bookmark_review_short: "Rev",
    timeline_bookmark_mastered_label: "Mastered",
    timeline_bookmark_mastered_short: "Done",
    quick_quote_main: "Quote To Chat",
    quick_quote_note: "Annotate",
    inline_annotation_mode_compact: "Compact",
    inline_annotation_mode_readable: "Readable",
    inline_annotation_mode_toggle: "Toggle annotation density",
    inline_annotation_placeholder: "Write an annotation here (auto-save)",
    inline_annotation_label: "Annotation",
    inline_annotation_main_placeholder: "Write your understanding, questions, or memory cues for this answer (auto-save)",
    inline_annotation_main_label: "Main Annotation",
    inline_annotation_interleaved_placeholder: "Write an annotation for this paragraph (auto-save)",
    inline_annotation_interleaved_label: "Paragraph Annotation",
    inline_annotation_status_editing: "Editing...",
    inline_annotation_status_saving: "Saving...",
    inline_annotation_status_saved: "Saved",
    inline_annotation_status_cleared: "Cleared",
    inline_annotation_status_error: "Save failed",
    inline_annotation_summary_empty: "No note for this paragraph yet",
    main_note_aria_label: "Main Conversation Note",
    main_note_label: "Main Conversation Note",
    main_note_status_ready: "Editable",
    main_note_status_editing: "Editing...",
    main_note_status_saved: "Saved",
    main_note_status_saving: "Saving...",
    main_note_status_error: "Save failed",
    main_note_status_waiting: "Waiting for a conversation",
    main_note_status_synced: "Synced",
    main_note_placeholder: "Write a summary note for the current main conversation here (Ctrl+Enter to save now)",
    main_note_placeholder_waiting: "Open a concrete main conversation before writing a note here",
    main_note_prev_turn: "Previous",
    main_note_next_turn: "Next",
    main_note_jump_turn: "Jump To Source",
    prompt_library_button: "Prompts",
    prompt_library_title: "Quick Prompts",
    prompt_library_subtitle: "Click a card to insert it into the composer",
    prompt_library_new: "New",
    prompt_library_close: "Close",
    prompt_library_empty: "No saved prompts yet. Create one to reuse your common templates.",
    prompt_library_empty_filtered: "No prompts match the current search or group.",
    prompt_library_editor_new: "New Prompt",
    prompt_library_editor_edit: "Edit Prompt",
    prompt_library_search_placeholder: "Search title, group, or content",
    prompt_library_name_placeholder: "Title, e.g. Summarize this",
    prompt_library_group_placeholder: "Group, e.g. Review / Practice / Writing",
    prompt_library_text_placeholder: "Write the prompt text here. Save it, then click to insert it into the native composer",
    prompt_library_save: "Save",
    prompt_library_cancel: "Cancel",
    prompt_library_edit: "Edit",
    prompt_library_delete: "Delete",
    prompt_library_group_all: "All",
    prompt_library_group_recent: "Recent",
    prompt_library_recent_title: "Recently Used",
    prompt_library_import: "Import",
    prompt_library_export: "Export",
    prompt_library_template_chip: "Vars",
    prompt_library_group_untitled: "Ungrouped",
    prompt_library_template_title: "Fill Variables",
    prompt_library_template_hint: "Complete these variables before insertion",
    prompt_library_template_apply: "Insert",
    prompt_library_group_expand: "Expand group",
    prompt_library_group_collapse: "Collapse group",
    prompt_library_status_ready: "Ready",
    prompt_library_status_imported: "Inserted into composer",
    prompt_library_status_saved: "Saved",
    prompt_library_status_deleted: "Deleted",
    prompt_library_status_sorted: "Order updated",
    prompt_library_status_exported: "Prompt library exported",
    prompt_library_status_imported_file: "Prompt library imported",
    prompt_library_status_import_invalid: "Invalid import file format",
    prompt_library_status_limit: "You can save up to {count} prompts",
    prompt_library_status_missing_name: "Please enter a title",
    prompt_library_status_missing_text: "Please enter prompt text",
    prompt_library_status_input_missing: "Composer not found. Try again in a moment",
    prompt_library_status_error: "Action failed. Please retry",
    prompt_library_confirm_delete: "Delete this prompt?",
    prompt_library_placeholder_prompt: "Enter a value for placeholder \"{name}\""
  }
};

Object.assign(CONTENT_I18N.zh, {
  timeline_bookmark_title_prefix: "标注状态：",
  timeline_bookmark_note_prefix: "标注说明：",
  timeline_turn_hint: "点击定位；Shift+点击加入复习；右键设置卡片标注",
  timeline_menu_note_placeholder: "写一句标注说明，比如“这里容易把条件看反”",
  timeline_menu_save: "保存标注说明",
  timeline_bookmark_panel_title: "卡片标注",
  timeline_menu_status_saved_note: "已保存到学习卡片",
  timeline_menu_status_note_error: "保存到学习卡片失败，请重试",
  timeline_menu_status_note_limit: "卡片内容过长，请精简后再保存",
  timeline_share_card_title: "学习卡片",
  timeline_share_card_note: "标注说明",
  timeline_share_card_note_linked: "已联动卡片内容",
  timeline_share_card_status: "卡片状态",
  timeline_share_card_footer: "用于复习与分享",
  timeline_share_card_note_empty: "还没有标注说明，建议补一句自己的理解、错因或复习理由。",
  quick_quote_note: "来源摘录",
  inline_annotation_placeholder: "记录来源摘录或你的理解（自动保存）",
  inline_annotation_label: "来源摘录",
  inline_annotation_main_placeholder: "记录这条回答的来源摘录、理解、疑问或记忆点（自动保存）",
  inline_annotation_main_label: "来源摘录",
  inline_annotation_interleaved_placeholder: "记录这一段的来源摘录（自动保存）",
  inline_annotation_interleaved_label: "段落摘录",
  inline_annotation_summary_empty: "这一段还没有来源摘录",
  main_note_aria_label: "主对话卡片内容",
  main_note_label: "主对话卡片内容",
  main_note_placeholder: "在这里整理当前主对话的卡片内容（Ctrl+Enter 立即保存）",
  main_note_placeholder_waiting: "请先进入具体主对话后再整理卡片内容"
});

Object.assign(CONTENT_I18N.en, {
  timeline_bookmark_title_prefix: "Card label: ",
  timeline_bookmark_note_prefix: "Label reason: ",
  timeline_turn_hint: "Click to jump; Shift+click to add Review; right-click to label this card source",
  timeline_menu_note_placeholder: "Add a short label reason, e.g. \"easy to reverse this condition\"",
  timeline_menu_save: "Save Label Reason",
  timeline_bookmark_panel_title: "Card Label",
  timeline_menu_share_save_note: "Save To Card",
  timeline_menu_status_saved_note: "Saved to the study card",
  timeline_menu_status_note_error: "Failed to save to the study card",
  timeline_menu_status_note_limit: "The card content is full. Please shorten it before saving",
  timeline_share_card_title: "Study Card",
  timeline_share_card_note: "Label Reason",
  timeline_share_card_note_linked: "Linked With Card Content",
  timeline_share_card_status: "Card Status",
  timeline_share_card_footer: "Made for review and sharing",
  timeline_share_card_note_empty: "No label reason yet. Add one line about your understanding, mistake, or review reason.",
  quick_quote_note: "Source Excerpt",
  inline_annotation_placeholder: "Write a source excerpt or your understanding here (auto-save)",
  inline_annotation_label: "Source Excerpt",
  inline_annotation_main_placeholder: "Write source excerpts, understanding, questions, or memory cues for this answer (auto-save)",
  inline_annotation_main_label: "Source Excerpt",
  inline_annotation_interleaved_placeholder: "Write a source excerpt for this paragraph (auto-save)",
  inline_annotation_interleaved_label: "Paragraph Excerpt",
  inline_annotation_summary_empty: "No source excerpt for this paragraph yet",
  main_note_aria_label: "Main Conversation Card Content",
  main_note_label: "Main Conversation Card Content",
  main_note_placeholder: "Organize card content for the current main conversation here (Ctrl+Enter to save now)",
  main_note_placeholder_waiting: "Open a concrete main conversation before organizing card content here"
});

function normalizeLocale(locale) {
  return String(locale || "").trim().toLowerCase() === "en" ? "en" : "zh";
}

function getContentIntlLocale() {
  return currentLocale === "en" ? "en-US" : "zh-CN";
}

function ct(key, vars = null) {
  const table = CONTENT_I18N[currentLocale] || CONTENT_I18N.zh;
  const fallback = CONTENT_I18N.zh;
  let text = table[key] ?? fallback[key] ?? key;
  if (vars && typeof vars === "object") {
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value ?? ""));
    });
  }
  return text;
}

function getTimelineBookmarkTypeMeta() {
  return {
    mistake: { label: ct("timeline_bookmark_mistake_label"), shortLabel: ct("timeline_bookmark_mistake_short"), className: "bookmark-mistake" },
    review: { label: ct("timeline_bookmark_review_label"), shortLabel: ct("timeline_bookmark_review_short"), className: "bookmark-review" },
    mastered: { label: ct("timeline_bookmark_mastered_label"), shortLabel: ct("timeline_bookmark_mastered_short"), className: "bookmark-mastered" }
  };
}

function getTimelineFilterMeta() {
  return {
    all: { label: ct("timeline_filter_all_label"), title: ct("timeline_filter_all_title") },
    bookmarked: { label: ct("timeline_filter_bookmarked_label"), title: ct("timeline_filter_bookmarked_title") },
    mistake: { label: ct("timeline_filter_mistake_label"), title: ct("timeline_filter_mistake_title") },
    review: { label: ct("timeline_filter_review_label"), title: ct("timeline_filter_review_title") }
  };
}

function setNativeMainConversationNoteStatusByKey(key, isError = false) {
  if (!(nativeMainNoteStatusEl instanceof HTMLElement)) return;
  nativeMainNoteStatusEl.dataset.i18nKey = key;
  setNativeMainConversationNoteStatus(ct(key), isError);
}

function setInlineAnnotationStatusByKey(container, state, key) {
  setInlineAnnotationStatus(container, state, ct(key));
  const statusEl = container instanceof HTMLElement ? container.querySelector(".gtf-inline-annotation-status") : null;
  if (statusEl instanceof HTMLElement) {
    statusEl.dataset.i18nKey = key;
  }
}

function refreshQuickQuoteBarLocale() {
  if (!(quickQuoteBarEl instanceof HTMLElement)) return;
  const mainBtn = quickQuoteBarEl.querySelector('[data-gtf-quote-action="main"]');
  if (mainBtn instanceof HTMLButtonElement) {
    setQuickQuoteButtonContent(mainBtn, "main", ct("quick_quote_main"));
  }
  const noteBtn = quickQuoteBarEl.querySelector('[data-gtf-quote-action="note"]');
  if (noteBtn instanceof HTMLButtonElement) {
    setQuickQuoteButtonContent(noteBtn, "note", ct("quick_quote_note"));
  }
}

function getQuickQuoteIconSvg(name) {
  switch (name) {
    case "main":
      return '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M3.75 4.5A1.75 1.75 0 0 1 5.5 2.75h4a.75.75 0 0 1 0 1.5h-4a.25.25 0 0 0-.25.25v11a.25.25 0 0 0 .25.25h9a.25.25 0 0 0 .25-.25v-4a.75.75 0 0 1 1.5 0v4A1.75 1.75 0 0 1 14.5 17.25h-9a1.75 1.75 0 0 1-1.75-1.75zm12.78-1.53a.75.75 0 0 1 0 1.06L11.06 9.5H13.5a.75.75 0 0 1 0 1.5H9.25a.75.75 0 0 1-.75-.75V6a.75.75 0 0 1 1.5 0v2.44l5.47-5.47a.75.75 0 0 1 1.06 0"/></svg>';
    case "note":
      return '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M4.75 3.5A1.75 1.75 0 0 0 3 5.25v9.5c0 .966.784 1.75 1.75 1.75h6.19a1.75 1.75 0 0 0 1.238-.513l3.81-3.81c.329-.328.513-.773.513-1.238V5.25A1.75 1.75 0 0 0 14.75 3.5zm0 1.5h10a.25.25 0 0 1 .25.25v5.5h-2.75A1.75 1.75 0 0 0 10.5 12.5v2.75H4.75a.25.25 0 0 1-.25-.25v-9.5a.25.25 0 0 1 .25-.25m7.25 9.19V12.5a.25.25 0 0 1 .25-.25h1.69zM6.5 7.25a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75m0 3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75"/></svg>';
    default:
      return "";
  }
}

function setQuickQuoteButtonContent(button, type, label) {
  if (!(button instanceof HTMLButtonElement)) return;
  button.textContent = "";
  const icon = document.createElement("span");
  icon.className = "gtf-quote-btn-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = getQuickQuoteIconSvg(type);
  const text = document.createElement("span");
  text.className = "gtf-quote-btn-label";
  text.textContent = label;
  button.append(icon, text);
  button.setAttribute("aria-label", label);
  button.title = label;
}

function getInlineShareIconSvg() {
  return '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M10 2.75a.75.75 0 0 1 .75.75v6.69l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V3.5a.75.75 0 0 1 .75-.75M4.5 12.25a.75.75 0 0 1 .75.75v1.5c0 .138.112.25.25.25h9a.25.25 0 0 0 .25-.25V13a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 14.5 16.25h-9A1.75 1.75 0 0 1 3.75 14.5V13a.75.75 0 0 1 .75-.75"/></svg>';
}

function getInlineShareMoreIconSvg() {
  return '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><circle cx="4" cy="10" r="1.8"/><circle cx="10" cy="10" r="1.8"/><circle cx="16" cy="10" r="1.8"/></svg>';
}

function getInlineShareMenuActionIconSvg(action) {
  if (action === "copy") {
    return '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M6.25 4A2.25 2.25 0 0 1 8.5 1.75h5A2.25 2.25 0 0 1 15.75 4v.25h.25A2.25 2.25 0 0 1 18.25 6.5v7A2.25 2.25 0 0 1 16 15.75h-.25V16A2.25 2.25 0 0 1 13.5 18.25h-7A2.25 2.25 0 0 1 4.25 16V9A2.25 2.25 0 0 1 6.5 6.75h.25zm1.5 2.75h5.75a.75.75 0 0 1 .75.75v6.75h1.75a.75.75 0 0 0 .75-.75v-7a.75.75 0 0 0-.75-.75h-7a.75.75 0 0 0-.75.75zM6.5 8.25A.75.75 0 0 0 5.75 9v7a.75.75 0 0 0 .75.75h7a.75.75 0 0 0 .75-.75V9a.75.75 0 0 0-.75-.75z"/></svg>';
  }
  if (action === "download" || action === "download-svg") {
    return '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M10 2.75a.75.75 0 0 1 .75.75v6.69l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V3.5a.75.75 0 0 1 .75-.75M4.5 12.25a.75.75 0 0 1 .75.75v1.5c0 .138.112.25.25.25h9a.25.25 0 0 0 .25-.25V13a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 14.5 16.25h-9A1.75 1.75 0 0 1 3.75 14.5V13a.75.75 0 0 1 .75-.75"/></svg>';
  }
  return '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M4.75 3.5A1.75 1.75 0 0 0 3 5.25v9.5c0 .966.784 1.75 1.75 1.75h6.19a1.75 1.75 0 0 0 1.238-.513l3.81-3.81c.329-.328.513-.773.513-1.238V5.25A1.75 1.75 0 0 0 14.75 3.5zm0 1.5h10a.25.25 0 0 1 .25.25v5.5h-2.75A1.75 1.75 0 0 0 10.5 12.5v2.75H4.75a.25.25 0 0 1-.25-.25v-9.5a.25.25 0 0 1 .25-.25m7.25 9.19V12.5a.25.25 0 0 1 .25-.25h1.69zM6.5 7.25a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75m0 3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75"/></svg>';
}

function setInlineAnnotationShareButtonContent(button, label) {
  if (!(button instanceof HTMLButtonElement)) return;
  button.textContent = "";
  const icon = document.createElement("span");
  icon.className = "gtf-inline-share-btn-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = getInlineShareIconSvg();
  const text = document.createElement("span");
  text.className = "gtf-inline-share-btn-label";
  text.textContent = label;
  button.append(icon, text);
  button.setAttribute("aria-label", label);
  button.title = label;
}

function setInlineAnnotationShareMenuOpen(group, open) {
  if (!(group instanceof HTMLElement)) return;
  const menu = group.querySelector(".gtf-inline-annotation-share-menu");
  const shareBtn = group.querySelector(".gtf-inline-annotation-share-btn");
  group.classList.toggle("is-open", Boolean(open));
  if (menu instanceof HTMLElement) {
    menu.hidden = !open;
  }
  if (shareBtn instanceof HTMLButtonElement) {
    shareBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
}

function closeInlineAnnotationShareMenus(exceptGroup = null) {
  document.querySelectorAll(".gtf-inline-annotation-share-group.is-open").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (exceptGroup && node === exceptGroup) return;
    setInlineAnnotationShareMenuOpen(node, false);
  });
}

function ensureInlineAnnotationShareMenuDismiss() {
  if (inlineAnnotationShareMenuBound) return;
  inlineAnnotationShareMenuBound = true;
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".gtf-inline-annotation-share-group")) return;
      closeInlineAnnotationShareMenus();
    },
    false
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        closeInlineAnnotationShareMenus();
      }
    },
    false
  );
}

function refreshNativeTimelineBookmarkMenuLocale() {
  const menu = nativeTimelineBookmarkMenuRoot;
  if (!(menu instanceof HTMLElement)) return;
  const textarea = menu.querySelector("textarea");
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.placeholder = ct("timeline_menu_note_placeholder");
  }
  const saveBtn = menu.querySelector(".gtf-native-timeline-bookmark-save");
  if (saveBtn instanceof HTMLButtonElement) saveBtn.textContent = ct("timeline_menu_save");
  const clearBtn = menu.querySelector(".gtf-native-timeline-bookmark-clear");
  if (clearBtn instanceof HTMLButtonElement) clearBtn.textContent = ct("timeline_menu_clear");
  menu.querySelectorAll("[data-bookmark-type]").forEach((node) => {
    if (!(node instanceof HTMLButtonElement)) return;
    const meta = getTimelineBookmarkTypeMeta()[String(node.dataset.bookmarkType || "")];
    if (meta) node.textContent = meta.label;
  });
  menu.querySelectorAll("[data-workbench-action]").forEach((node) => {
    if (!(node instanceof HTMLButtonElement)) return;
    const action = String(node.dataset.workbenchAction || "");
    node.hidden = action === "followup-new" && !nativeTimelineFollowupTopicStarted;
    node.textContent = getTimelineWorkbenchActionLabel(action);
  });
  const turn = nativeChatTimelineTurnsCache.find((item) => item?.id === nativeTimelineBookmarkMenuTurnId);
  const titleEl = menu.querySelector(".gtf-native-timeline-bookmark-title");
  if (titleEl instanceof HTMLElement) {
    titleEl.textContent = turn ? `${ct("timeline_bookmark_title_prefix")}${clampText(getTimelineTurnDisplayTitle(turn), 56)}` : ct("timeline_bookmark_panel_title");
  }
  const statusEl = menu.querySelector(".gtf-native-timeline-bookmark-status");
  if (statusEl instanceof HTMLElement && statusEl.dataset.i18nKey) {
    statusEl.textContent = ct(statusEl.dataset.i18nKey);
  }
  menu.querySelectorAll("[data-share-action]").forEach((node) => {
    if (!(node instanceof HTMLButtonElement)) return;
    const action = String(node.dataset.shareAction || "");
    const label =
      action === "copy"
        ? ct("timeline_menu_share_copy")
        : action === "download-svg"
        ? ct("timeline_menu_share_download_svg")
        : ct("timeline_menu_share_download");
    const labelSpan = node.querySelector("span");
    if (labelSpan instanceof HTMLElement) {
      labelSpan.textContent = label;
    }
  });
}

function getTimelineTurnDisplayTitle(turn) {
  const text = normalizeText(turn?.title || turn?.question || turn?.summary || "");
  return text || ct("timeline_turn_unnamed");
}

function setNativeTimelineBookmarkMenuStatus(text, isError = false, i18nKey = "") {
  const menu = nativeTimelineBookmarkMenuRoot;
  if (!(menu instanceof HTMLElement)) return;
  const statusEl = menu.querySelector(".gtf-native-timeline-bookmark-status");
  if (!(statusEl instanceof HTMLElement)) return;
  const value = String(text || "").trim();
  statusEl.textContent = value;
  statusEl.hidden = !value;
  statusEl.classList.toggle("error", Boolean(isError));
  statusEl.dataset.i18nKey = i18nKey || "";
}

function setNativeTimelineBookmarkMenuStatusByKey(key, isError = false, vars = undefined) {
  setNativeTimelineBookmarkMenuStatus(ct(key, vars), isError, key);
}

function getTimelineWorkbenchActionLabel(action) {
  const zh = currentLocale !== "en";
  if (action === "card-source") return zh ? "\u8bbe\u4e3a\u5361\u7247\u6765\u6e90" : "Set as card source";
  if (action === "source-excerpt") return zh ? "\u5199\u5165\u6765\u6e90\u6458\u5f55" : "Add source excerpt";
  if (action === "pitfall") return zh ? "\u5199\u5165\u6613\u9519\u70b9" : "Add pitfall";
  if (action === "followup") {
    if (nativeTimelineFollowupTopicStarted) return zh ? "\u52a0\u5165\u8ffd\u95ee\u4e3b\u9898" : "Add to follow-up topic";
    return zh ? "\u4f5c\u4e3a\u8ffd\u95ee\u4e3b\u9898" : "Use as follow-up";
  }
  if (action === "followup-new") return zh ? "\u4f5c\u4e3a\u65b0\u8ffd\u95ee\u4e3b\u9898" : "New follow-up topic";
  return action;
}

const NATIVE_TIMELINE_FOLLOWUP_COLORS = [
  { line: "rgba(35, 106, 163, 0.52)", lineSoft: "rgba(35, 106, 163, 0.12)", border: "rgba(35, 106, 163, 0.86)", bg: "rgba(229, 244, 255, 0.98)", halo: "rgba(35, 106, 163, 0.16)", text: "#174d74" },
  { line: "rgba(35, 132, 95, 0.52)", lineSoft: "rgba(35, 132, 95, 0.12)", border: "rgba(35, 132, 95, 0.86)", bg: "rgba(225, 248, 238, 0.98)", halo: "rgba(35, 132, 95, 0.16)", text: "#176247" },
  { line: "rgba(136, 77, 188, 0.52)", lineSoft: "rgba(136, 77, 188, 0.12)", border: "rgba(136, 77, 188, 0.86)", bg: "rgba(244, 235, 255, 0.98)", halo: "rgba(136, 77, 188, 0.16)", text: "#5b3286" },
  { line: "rgba(206, 117, 28, 0.54)", lineSoft: "rgba(206, 117, 28, 0.13)", border: "rgba(206, 117, 28, 0.88)", bg: "rgba(255, 241, 220, 0.98)", halo: "rgba(206, 117, 28, 0.17)", text: "#8a4c12" },
  { line: "rgba(199, 68, 112, 0.52)", lineSoft: "rgba(199, 68, 112, 0.12)", border: "rgba(199, 68, 112, 0.86)", bg: "rgba(255, 232, 241, 0.98)", halo: "rgba(199, 68, 112, 0.16)", text: "#883151" }
];

function getNativeTimelineFollowupGroupById(groupId) {
  return nativeTimelineFollowupGroups.find((group) => group?.id === groupId) || null;
}

function getNativeTimelineFollowupGroupForTurn(turnId) {
  return nativeTimelineFollowupGroups.find((group) => group?.turnIds?.has?.(turnId)) || null;
}

function createNativeTimelineFollowupGroup(initialTurnId = "") {
  const paletteIndex = nativeTimelineFollowupColorCursor % NATIVE_TIMELINE_FOLLOWUP_COLORS.length;
  nativeTimelineFollowupColorCursor += 1;
  const group = {
    id: `followup_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
    paletteIndex,
    mainTurnId: initialTurnId || "",
    turnIds: new Set()
  };
  if (initialTurnId) group.turnIds.add(initialTurnId);
  nativeTimelineFollowupGroups.push(group);
  nativeTimelineActiveFollowupGroupId = group.id;
  nativeTimelineFollowupTopicStarted = true;
  return group;
}

function addTurnToNativeTimelineFollowupGroup(turnId, forceNew = false) {
  const id = String(turnId || "").trim();
  if (!id) return null;
  let group = forceNew ? null : getNativeTimelineFollowupGroupById(nativeTimelineActiveFollowupGroupId);
  if (!group) group = createNativeTimelineFollowupGroup();
  if (!group.mainTurnId) group.mainTurnId = id;
  group.turnIds.add(id);
  nativeTimelineActiveFollowupGroupId = group.id;
  nativeTimelineFollowupTopicStarted = true;
  return group;
}

function applyNativeTimelineFollowupColors(element, paletteIndex, isBridge = false) {
  if (!(element instanceof HTMLElement)) return;
  const color = NATIVE_TIMELINE_FOLLOWUP_COLORS[paletteIndex % NATIVE_TIMELINE_FOLLOWUP_COLORS.length] || NATIVE_TIMELINE_FOLLOWUP_COLORS[0];
  element.style.setProperty("--gtf-followup-line", color.line);
  element.style.setProperty("--gtf-followup-line-soft", color.lineSoft);
  element.style.setProperty("--gtf-followup-border", color.border);
  element.style.setProperty("--gtf-followup-bg", isBridge ? color.lineSoft : color.bg);
  element.style.setProperty("--gtf-followup-halo", color.halo);
  element.style.setProperty("--gtf-followup-text", color.text);
}

function updateNativeTimelineFollowupStatus() {
  nativeTimelineFollowupGroups = nativeTimelineFollowupGroups.filter((group) => group?.turnIds instanceof Set && group.turnIds.size > 0);
  const count = nativeTimelineFollowupGroups.reduce((sum, group) => sum + group.turnIds.size, 0);
  nativeTimelineFollowupTopicStarted = count > 0 || nativeTimelineFollowupTopicStarted;
  const turnIds = nativeChatTimelineTurnsCache.map((turn) => turn?.id).filter(Boolean);
  const bridgeByTurnId = new Map();
  nativeTimelineFollowupGroups.forEach((group) => {
    const indexes = turnIds
      .map((turnId, index) => (group.turnIds.has(turnId) ? index : -1))
      .filter((index) => index >= 0);
    if (indexes.length < 2) return;
    const firstIndex = Math.min(...indexes);
    const lastIndex = Math.max(...indexes);
    for (let index = firstIndex + 1; index < lastIndex; index += 1) {
      const bridgeTurnId = turnIds[index];
      if (bridgeTurnId && !group.turnIds.has(bridgeTurnId)) bridgeByTurnId.set(bridgeTurnId, group);
    }
  });
  nativeChatTimelineDotMap.forEach((dot, turnId) => {
    if (!(dot instanceof HTMLElement)) return;
    const group = getNativeTimelineFollowupGroupForTurn(turnId);
    const bridgeGroup = bridgeByTurnId.get(turnId) || null;
    const inFollowup = Boolean(group);
    const isBridge = Boolean(bridgeGroup && !group);
    dot.classList.toggle("followup-topic", inFollowup);
    dot.classList.toggle("followup-main", Boolean(group && group.mainTurnId === turnId));
    dot.classList.toggle("followup-sub", Boolean(group && group.mainTurnId !== turnId));
    dot.classList.toggle("followup-bridge", isBridge);
    if (group || bridgeGroup) {
      applyNativeTimelineFollowupColors(dot, (group || bridgeGroup).paletteIndex, Boolean(bridgeGroup && !group));
    }
    const item = dot.closest(".gtf-native-chat-timeline-item");
    if (item instanceof HTMLElement) {
      item.classList.toggle("followup-topic", inFollowup);
      item.classList.toggle("followup-main", Boolean(group && group.mainTurnId === turnId));
      item.classList.toggle("followup-sub", Boolean(group && group.mainTurnId !== turnId));
      item.classList.toggle("followup-bridge", isBridge);
      if (group || bridgeGroup) applyNativeTimelineFollowupColors(item, (group || bridgeGroup).paletteIndex, Boolean(bridgeGroup && !group));
    }
  });
  refreshNativeTimelineBookmarkMenuLocale();
}

function sendTimelineWorkbenchAction(turnId, action) {
  const id = String(turnId || "").trim();
  const normalizedAction = String(action || "").trim();
  if (!id || !normalizedAction || !isConcreteConversationId(currentConversationId)) return;
  const turn = getTimelineTurnById(id);
  if (!turn) return;
  const bookmark = getNativeTimelineBookmark(id);
  const payloadAction = normalizedAction === "followup-new" ? "followup" : normalizedAction;
  const payload = {
    type: "GEMINI_TIMELINE_WORKBENCH_ACTION",
    conversationId: currentConversationId,
    entryId: id,
    domIndex: Number.isInteger(turn.domIndex) ? turn.domIndex : null,
    timestamp: Number(turn.timestamp) || 0,
    action: payloadAction,
    bookmarkNote: normalizeTimelineBookmarkNote(bookmark?.note || ""),
    title: getTimelineTurnDisplayTitle(turn)
  };
  const dispatch = () => {
    try {
      chrome.runtime.sendMessage(payload, () => void chrome.runtime?.lastError);
    } catch {}
  };
  try {
    chrome.runtime.sendMessage({ type: "GEMINI_OPEN_SIDE_PANEL_REQUEST" }, () => void chrome.runtime?.lastError);
  } catch {}
  dispatch();
  setTimeout(dispatch, 220);
  setTimeout(dispatch, 720);
  setTimeout(dispatch, 1350);
  if (normalizedAction === "followup" || normalizedAction === "followup-new") {
    addTurnToNativeTimelineFollowupGroup(id, normalizedAction === "followup-new");
    updateNativeTimelineFollowupStatus();
    refreshNativeTimelineBookmarkMenuLocale();
  }
  setNativeTimelineBookmarkMenuStatus(getTimelineWorkbenchActionLabel(normalizedAction));
}

function refreshNativeMainConversationNoteLocale() {
  if (!(nativeMainNoteRoot instanceof HTMLElement)) return;
  nativeMainNoteRoot.setAttribute("aria-label", ct("main_note_aria_label"));
  const labelEl = nativeMainNoteRoot.querySelector(".gtf-native-main-note-label");
  if (labelEl instanceof HTMLElement) labelEl.textContent = ct("main_note_label");
  if (nativeMainNotePrevBtn instanceof HTMLButtonElement) {
    nativeMainNotePrevBtn.textContent = ct("main_note_prev_turn");
    nativeMainNotePrevBtn.setAttribute("aria-label", ct("main_note_prev_turn"));
  }
  if (nativeMainNoteNextBtn instanceof HTMLButtonElement) {
    nativeMainNoteNextBtn.textContent = ct("main_note_next_turn");
    nativeMainNoteNextBtn.setAttribute("aria-label", ct("main_note_next_turn"));
  }
  if (nativeMainNoteJumpBtn instanceof HTMLButtonElement) {
    updateNativeMainConversationNoteJumpState();
  }
  if (nativeMainNoteTextarea instanceof HTMLTextAreaElement) {
    nativeMainNoteTextarea.placeholder = nativeMainNoteTextarea.disabled
      ? ct("main_note_placeholder_waiting")
      : ct("main_note_placeholder");
  }
  if (nativeMainNoteStatusEl instanceof HTMLElement && nativeMainNoteStatusEl.dataset.i18nKey) {
    nativeMainNoteStatusEl.textContent = ct(nativeMainNoteStatusEl.dataset.i18nKey);
  }
}

function createPromptLibraryId() {
  return `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultPromptLibraryItems() {
  if (currentLocale === "en") {
    return [
      {
        id: createPromptLibraryId(),
        name: "Summarize",
        group: "Review",
        text: "Please summarize the current topic into key points, common mistakes, and a short review checklist.",
        updatedAt: Date.now()
      },
      {
        id: createPromptLibraryId(),
        name: "Step by step",
        group: "Explain",
        text: "Please explain this problem step by step, state each assumption clearly, and point out where beginners usually get confused.",
        updatedAt: Date.now() - 1
      },
      {
        id: createPromptLibraryId(),
        name: "Practice set",
        group: "Practice",
        text: "Please create 3 practice questions from easy to hard, then give concise answers and why each answer is correct.",
        updatedAt: Date.now() - 2
      }
    ];
  }
  return [
    {
      id: createPromptLibraryId(),
      name: "知识总结",
      group: "总结",
      text: "请把当前内容整理成：1. 核心结论 2. 关键步骤 3. 易错点 4. 最后给我一份简短复习清单。",
      updatedAt: Date.now()
    },
    {
      id: createPromptLibraryId(),
      name: "分步讲解",
      group: "讲解",
      text: "请一步一步讲解这道题，每一步都说明依据和目的，并指出初学者最容易出错的地方。",
      updatedAt: Date.now() - 1
    },
    {
      id: createPromptLibraryId(),
      name: "举一反三",
      group: "练习",
      text: "请基于当前知识点再出 3 道由易到难的练习题，并给出简洁解析与常见误区提醒。",
      updatedAt: Date.now() - 2
    }
  ];
}

function normalizePromptLibraryGroup(value) {
  return normalizeText(value || "").slice(0, PROMPT_LIBRARY_GROUP_MAX_LENGTH);
}

function normalizePromptLibraryItem(item) {
  const name = normalizeText(item?.name || "").slice(0, PROMPT_LIBRARY_NAME_MAX_LENGTH);
  const text = String(item?.text || "").replace(/\r\n/g, "\n").trim().slice(0, PROMPT_LIBRARY_TEXT_MAX_LENGTH);
  if (!name || !text) return null;
  const id = normalizeText(item?.id || "").replace(/[^\w-]/g, "").slice(0, 64) || createPromptLibraryId();
  return {
    id,
    name,
    group: normalizePromptLibraryGroup(item?.group || ""),
    text,
    order: Math.max(0, Number(item?.order) || 0),
    updatedAt: Number(item?.updatedAt) || Date.now(),
    usedAt: Number(item?.usedAt) || 0,
    useCount: Math.max(0, Number(item?.useCount) || 0)
  };
}

function getPromptLibraryTextPreview(text) {
  return normalizeText(String(text || "").replace(/\n+/g, " ")).slice(0, 120);
}

function getPromptLibraryStoragePayload(items) {
  return {
    version: 2,
    items
  };
}

function resequencePromptLibraryItems(items) {
  return (Array.isArray(items) ? items : []).map((item, index) => ({
    ...item,
    order: index
  }));
}

function extractPromptTemplateVariables(text) {
  const seen = new Set();
  const vars = [];
  String(text || "").replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, rawName) => {
    const name = normalizeText(rawName || "").slice(0, 80);
    if (!name || seen.has(name)) return _;
    seen.add(name);
    vars.push(name);
    return _;
  });
  return vars;
}

async function resolvePromptTemplatePlaceholders(text) {
  const template = String(text || "");
  const vars = extractPromptTemplateVariables(template);
  if (!vars.length) return template;
  if (!(nativePromptLibraryTemplateDialog instanceof HTMLElement) || !(nativePromptLibraryTemplateFieldsEl instanceof HTMLElement)) {
    let nextText = template;
    for (const name of vars) {
      const value = window.prompt(ct("prompt_library_placeholder_prompt", { name }), "");
      if (value === null) return null;
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      nextText = nextText.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "g"), String(value));
    }
    return nextText;
  }
  return new Promise((resolve) => {
    nativePromptLibraryTemplateFieldsEl.textContent = "";
    if (nativePromptLibraryTemplateTitleEl instanceof HTMLElement) {
      nativePromptLibraryTemplateTitleEl.textContent = ct("prompt_library_template_title");
    }
    const inputs = [];
    vars.forEach((name) => {
      const row = document.createElement("label");
      row.className = "gtf-prompt-library-template-row";
      const label = document.createElement("span");
      label.className = "gtf-prompt-library-template-label";
      label.textContent = name;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "gtf-prompt-library-template-input";
      input.placeholder = ct("prompt_library_placeholder_prompt", { name });
      row.append(label, input);
      nativePromptLibraryTemplateFieldsEl.appendChild(row);
      inputs.push({ name, input });
    });
    const cleanup = () => {
      nativePromptLibraryTemplateDialog.hidden = true;
      if (nativePromptLibraryTemplateConfirmBtn instanceof HTMLButtonElement) {
        nativePromptLibraryTemplateConfirmBtn.onclick = null;
      }
      if (nativePromptLibraryTemplateCancelBtn instanceof HTMLButtonElement) {
        nativePromptLibraryTemplateCancelBtn.onclick = null;
      }
    };
    if (nativePromptLibraryTemplateCancelBtn instanceof HTMLButtonElement) {
      nativePromptLibraryTemplateCancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };
    }
    if (nativePromptLibraryTemplateConfirmBtn instanceof HTMLButtonElement) {
      nativePromptLibraryTemplateConfirmBtn.onclick = () => {
        let nextText = template;
        inputs.forEach(({ name, input }) => {
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          nextText = nextText.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "g"), String(input.value || ""));
        });
        cleanup();
        resolve(nextText);
      };
    }
    nativePromptLibraryTemplateDialog.hidden = false;
    inputs[0]?.input?.focus();
  });
}

function canDragSortPromptLibrary() {
  return nativePromptLibraryActiveFilter === "all" && !normalizeText(nativePromptLibrarySearchTerm || "");
}

function shouldGroupPromptLibraryList() {
  return nativePromptLibraryActiveFilter === "all" && !normalizeText(nativePromptLibrarySearchTerm || "");
}

async function loadPromptLibraryItems(force = false) {
  if (nativePromptLibraryLoaded && !force) return nativePromptLibraryItems;
  try {
    const result = await storageGet(PROMPT_LIBRARY_STORAGE_KEY);
    const rawStore = result?.[PROMPT_LIBRARY_STORAGE_KEY];
    let rawItems = [];
    let needsMigration = false;
    if (Array.isArray(rawStore)) {
      rawItems = rawStore;
      needsMigration = true;
    } else if (rawStore && Array.isArray(rawStore.items)) {
      rawItems = rawStore.items;
    } else {
      rawItems = getDefaultPromptLibraryItems();
      needsMigration = true;
    }
    const items = resequencePromptLibraryItems(rawItems
      .map((item) => normalizePromptLibraryItem(item))
      .filter(Boolean)
      .slice(0, PROMPT_LIBRARY_MAX_ITEMS));
    nativePromptLibraryItems = items;
    nativePromptLibraryLoaded = true;
    if (needsMigration) {
      await storageSet({ [PROMPT_LIBRARY_STORAGE_KEY]: getPromptLibraryStoragePayload(items) });
    }
  } catch (error) {
    console.warn("[Gemini Timeline] load prompt library failed", error);
    nativePromptLibraryItems = resequencePromptLibraryItems(getDefaultPromptLibraryItems());
    nativePromptLibraryLoaded = true;
  }
  return nativePromptLibraryItems;
}

async function persistPromptLibraryItems(items) {
  const normalized = resequencePromptLibraryItems(Array.isArray(items)
    ? items.map((item) => normalizePromptLibraryItem(item)).filter(Boolean).slice(0, PROMPT_LIBRARY_MAX_ITEMS)
    : []);
  await storageSet({ [PROMPT_LIBRARY_STORAGE_KEY]: getPromptLibraryStoragePayload(normalized) });
  nativePromptLibraryItems = normalized;
  nativePromptLibraryLoaded = true;
  return normalized;
}

function setNativePromptLibraryStatusByKey(key, isError = false, vars = null) {
  if (!(nativePromptLibraryStatusEl instanceof HTMLElement)) return;
  nativePromptLibraryStatusEl.dataset.i18nKey = key;
  nativePromptLibraryStatusEl.textContent = ct(key, vars);
  nativePromptLibraryStatusEl.classList.toggle("error", Boolean(isError));
  if (vars && typeof vars === "object") {
    nativePromptLibraryStatusEl.dataset.i18nVars = JSON.stringify(vars);
  } else {
    delete nativePromptLibraryStatusEl.dataset.i18nVars;
  }
}

function openNativePromptLibraryEditor(item = null) {
  nativePromptLibraryEditingId = item?.id || "";
  if (nativePromptLibraryEditor instanceof HTMLElement) {
    nativePromptLibraryEditor.hidden = false;
  }
  if (nativePromptLibraryTitleEl instanceof HTMLElement) {
    nativePromptLibraryTitleEl.textContent = ct(item ? "prompt_library_editor_edit" : "prompt_library_editor_new");
  }
  if (nativePromptLibraryNameInput instanceof HTMLInputElement) {
    nativePromptLibraryNameInput.value = item?.name || "";
  }
  if (nativePromptLibraryGroupInput instanceof HTMLInputElement) {
    nativePromptLibraryGroupInput.value = item?.group || "";
  }
  if (nativePromptLibraryTextarea instanceof HTMLTextAreaElement) {
    nativePromptLibraryTextarea.value = item?.text || "";
  }
  if (nativePromptLibraryNameInput instanceof HTMLInputElement) {
    nativePromptLibraryNameInput.focus();
  }
}

function closeNativePromptLibraryEditor() {
  nativePromptLibraryEditingId = "";
  if (nativePromptLibraryEditor instanceof HTMLElement) {
    nativePromptLibraryEditor.hidden = true;
  }
  if (nativePromptLibraryNameInput instanceof HTMLInputElement) {
    nativePromptLibraryNameInput.value = "";
  }
  if (nativePromptLibraryGroupInput instanceof HTMLInputElement) {
    nativePromptLibraryGroupInput.value = "";
  }
  if (nativePromptLibraryTextarea instanceof HTMLTextAreaElement) {
    nativePromptLibraryTextarea.value = "";
  }
}

function mergePromptIntoComposerDraft(currentText, promptText) {
  const current = String(currentText || "").replace(/\r\n/g, "\n").trim();
  const prompt = String(promptText || "").replace(/\r\n/g, "\n").trim();
  if (!prompt) return current;
  if (!current) return prompt;
  if (normalizeComposerTextForCompare(current) === normalizeComposerTextForCompare(prompt)) return current;
  const separator = /\n\s*$/.test(currentText || "") ? "\n" : "\n\n";
  return `${String(currentText || "").trimEnd()}${separator}${prompt}`;
}

function getPromptLibraryGroups() {
  const names = new Set();
  nativePromptLibraryItems.forEach((item) => {
    const group = normalizePromptLibraryGroup(item?.group || "");
    if (group) names.add(group);
  });
  return [...names].sort((a, b) => a.localeCompare(b, getContentIntlLocale()));
}

function getRecentPromptLibraryItems(limit = 3) {
  return nativePromptLibraryItems
    .filter((item) => Number(item?.usedAt) > 0)
    .sort((a, b) => Number(b.usedAt || 0) - Number(a.usedAt || 0))
    .slice(0, limit);
}

function getFilteredPromptLibraryItems() {
  const search = normalizeText(nativePromptLibrarySearchTerm || "").toLowerCase();
  const filter = nativePromptLibraryActiveFilter || "all";
  return nativePromptLibraryItems
    .filter((item) => {
      if (filter === "recent" && !(Number(item?.usedAt) > 0)) return false;
      if (filter.startsWith("group:")) {
        const groupName = filter.slice(6);
        if (normalizePromptLibraryGroup(item?.group || "") !== groupName) return false;
      }
      if (!search) return true;
      const haystack = normalizeText(`${item?.name || ""}\n${item?.group || ""}\n${item?.text || ""}`).toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) => {
      if (filter === "recent") {
        return Number(b.usedAt || 0) - Number(a.usedAt || 0);
      }
      const orderDiff = Number(a.order || 0) - Number(b.order || 0);
      if (orderDiff !== 0) return orderDiff;
      return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    });
}

function getPromptLibraryGroupedItems(items) {
  const groups = [];
  const map = new Map();
  items.forEach((item) => {
    const rawName = normalizePromptLibraryGroup(item?.group || "");
    const key = rawName || "__ungrouped__";
    if (!map.has(key)) {
      const payload = {
        key,
        name: rawName || ct("prompt_library_group_untitled"),
        items: []
      };
      map.set(key, payload);
      groups.push(payload);
    }
    map.get(key).items.push(item);
  });
  return groups;
}

function getPromptLibraryIconSvg(name) {
  switch (name) {
    case "new":
      return '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M19 11H13V5a1 1 0 1 0-2 0v6H5a1 1 0 1 0 0 2h6v6a1 1 0 1 0 2 0v-6h6a1 1 0 1 0 0-2"/></svg>';
    case "import":
      return '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.42l-4 3.98a1 1 0 0 1-1.4 0l-4-3.98a1 1 0 0 1 1.4-1.42L11 12.59V4a1 1 0 0 1 1-1m-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1"/></svg>';
    case "export":
      return '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 21a1 1 0 0 1-1-1v-8.59l-2.3 2.29a1 1 0 1 1-1.4-1.42l4-3.98a1 1 0 0 1 1.4 0l4 3.98a1 1 0 0 1-1.4 1.42L13 11.41V20a1 1 0 0 1-1 1m-7-4a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1"/></svg>';
    case "close":
      return '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6.7 5.3a1 1 0 0 1 1.4 0L12 9.17l3.9-3.88a1 1 0 1 1 1.4 1.42L13.4 10.6l3.88 3.9a1 1 0 1 1-1.42 1.4L12 12.02l-3.9 3.88a1 1 0 1 1-1.4-1.42l3.88-3.88-3.88-3.9a1 1 0 0 1 0-1.4"/></svg>';
    case "edit":
      return '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    case "delete":
      return '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    case "prompt":
      return '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z"/></svg>';
    default:
      return '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z"/></svg>';
  }
}

function createPromptLibraryIcon(name, className = "gtf-prompt-library-icon") {
  const icon = document.createElement("span");
  icon.className = className;
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = getPromptLibraryIconSvg(name);
  return icon;
}

function setNativePromptLibraryTriggerContent(button) {
  if (!(button instanceof HTMLButtonElement)) return;
  const label = ct("prompt_library_button");
  button.textContent = "";
  button.append(
    createPromptLibraryIcon("prompt", "gtf-prompt-library-trigger-icon"),
    Object.assign(document.createElement("span"), {
      className: "gtf-prompt-library-trigger-label",
      textContent: label
    })
  );
  button.title = label;
  button.setAttribute("aria-label", label);
}

function setPromptLibraryHeadButtonContent(button, iconName, label) {
  if (!(button instanceof HTMLButtonElement)) return;
  button.textContent = "";
  button.append(
    createPromptLibraryIcon(iconName, "gtf-prompt-library-head-btn-icon"),
    Object.assign(document.createElement("span"), {
      className: "gtf-prompt-library-head-btn-label",
      textContent: label
    })
  );
  button.title = label;
  button.setAttribute("aria-label", label);
}

function renderNativePromptLibraryFilterBar() {
  if (!(nativePromptLibraryFilterBar instanceof HTMLElement)) return;
  nativePromptLibraryFilterBar.textContent = "";
  const groups = getPromptLibraryGroups();
  const options = [
    { value: "all", label: ct("prompt_library_group_all") },
    { value: "recent", label: ct("prompt_library_group_recent") },
    ...groups.map((group) => ({ value: `group:${group}`, label: group }))
  ];
  if (!options.some((option) => option.value === nativePromptLibraryActiveFilter)) {
    nativePromptLibraryActiveFilter = "all";
  }
  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gtf-prompt-library-filter-btn";
    if (option.value === nativePromptLibraryActiveFilter) btn.classList.add("active");
    btn.textContent = option.label;
    btn.addEventListener("click", () => {
      nativePromptLibraryActiveFilter = option.value;
      refreshNativePromptLibraryList();
    });
    nativePromptLibraryFilterBar.appendChild(btn);
  });
}

async function exportPromptLibraryItems() {
  const payload = {
    version: 2,
    exportedAt: Date.now(),
    items: nativePromptLibraryItems
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gemini-prompt-library-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
  setNativePromptLibraryStatusByKey("prompt_library_status_exported");
}

async function importPromptLibraryItemsFromFile(file) {
  if (!file) return;
  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const importedRaw = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : null);
    if (!importedRaw) {
      setNativePromptLibraryStatusByKey("prompt_library_status_import_invalid", true);
      return;
    }
    const normalizedImported = importedRaw
      .map((item) => normalizePromptLibraryItem(item))
      .filter(Boolean);
    if (!normalizedImported.length) {
      setNativePromptLibraryStatusByKey("prompt_library_status_import_invalid", true);
      return;
    }
    const merged = [];
    const seen = new Set();
    [...normalizedImported, ...nativePromptLibraryItems].forEach((item) => {
      const fingerprint = `${item.id}::${normalizeText(item.name)}::${normalizeText(item.text)}`;
      if (seen.has(fingerprint)) return;
      seen.add(fingerprint);
      merged.push(item);
    });
    await persistPromptLibraryItems(merged.slice(0, PROMPT_LIBRARY_MAX_ITEMS));
    refreshNativePromptLibraryList();
    setNativePromptLibraryStatusByKey("prompt_library_status_imported_file");
  } catch (error) {
    console.warn("[Gemini Timeline] import prompt library failed", error);
    setNativePromptLibraryStatusByKey("prompt_library_status_import_invalid", true);
  }
}

async function reorderPromptLibraryItems(dragId, dropId) {
  if (!dragId || !dropId || dragId === dropId) return;
  const nextItems = nativePromptLibraryItems.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const fromIndex = nextItems.findIndex((item) => item.id === dragId);
  const toIndex = nextItems.findIndex((item) => item.id === dropId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  await persistPromptLibraryItems(nextItems);
  refreshNativePromptLibraryList();
  setNativePromptLibraryStatusByKey("prompt_library_status_sorted");
}

async function applyPromptLibraryItem(item) {
  const input = findComposerInput();
  if (!input) {
    setNativePromptLibraryStatusByKey("prompt_library_status_input_missing", true);
    return;
  }
  const resolvedText = await resolvePromptTemplatePlaceholders(item.text);
  if (resolvedText === null) return;
  const nextText = mergePromptIntoComposerDraft(getComposerText(input), resolvedText);
  fillComposerInput(input, nextText);
  setComposerCaretToEnd(input);
  input.focus();
  input.scrollIntoView({ behavior: "smooth", block: "nearest" });
  nativePromptLibraryOpen = false;
  if (nativePromptLibraryPanel instanceof HTMLElement) {
    nativePromptLibraryPanel.hidden = true;
  }
  if (nativePromptLibraryButton instanceof HTMLButtonElement) {
    nativePromptLibraryButton.classList.remove("active");
    nativePromptLibraryButton.setAttribute("aria-expanded", "false");
  }
  try {
    const nextItems = nativePromptLibraryItems.map((entry) => {
      if (entry.id !== item.id) return entry;
      return {
        ...entry,
        usedAt: Date.now(),
        useCount: Math.max(0, Number(entry.useCount) || 0) + 1
      };
    });
    await persistPromptLibraryItems(nextItems);
  } catch (error) {
    console.warn("[Gemini Timeline] update prompt recent usage failed", error);
  }
  setNativePromptLibraryStatusByKey("prompt_library_status_imported");
  scheduleNativePromptLibraryPosition();
}

function buildPromptLibraryCard(item, options = {}) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "gtf-prompt-library-card";
  if (options.compact) card.classList.add("compact");
  card.setAttribute("data-prompt-id", item.id);
  card.title = item.name;
  const templateVars = extractPromptTemplateVariables(item.text);
  const allowSort = !options.compact && canDragSortPromptLibrary();
  if (allowSort) {
    card.draggable = true;
    card.classList.add("sortable");
    card.title = `${item.name} · ${currentLocale === "en" ? "Drag to reorder" : "可拖动排序"}`;
    card.addEventListener("dragstart", (event) => {
      nativePromptLibraryDragId = item.id;
      card.classList.add("dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
      }
    });
    card.addEventListener("dragend", () => {
      nativePromptLibraryDragId = "";
      card.classList.remove("dragging");
      nativePromptLibraryListEl?.querySelectorAll(".drag-over").forEach((node) => node.classList.remove("drag-over"));
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      if (nativePromptLibraryDragId && nativePromptLibraryDragId !== item.id) {
        card.classList.add("drag-over");
      }
    });
    card.addEventListener("dragleave", (event) => {
      if (!card.contains(event.relatedTarget)) {
        card.classList.remove("drag-over");
      }
    });
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("drag-over");
      const dragId = nativePromptLibraryDragId || event.dataTransfer?.getData("text/plain") || "";
      reorderPromptLibraryItems(dragId, item.id).catch((error) => {
        console.warn("[Gemini Timeline] reorder prompt failed", error);
        setNativePromptLibraryStatusByKey("prompt_library_status_error", true);
      });
    });
  }

  const head = document.createElement("div");
  head.className = "gtf-prompt-library-card-head";
  const titleWrap = document.createElement("div");
  titleWrap.className = "gtf-prompt-library-card-title-wrap";
  const title = document.createElement("span");
  title.className = "gtf-prompt-library-card-title";
  title.textContent = item.name;
  titleWrap.appendChild(title);
  if (item.group) {
    const chip = document.createElement("span");
    chip.className = "gtf-prompt-library-group-chip";
    chip.textContent = item.group;
    titleWrap.appendChild(chip);
  }
  if (templateVars.length) {
    const chip = document.createElement("span");
    chip.className = "gtf-prompt-library-group-chip template";
    chip.textContent = ct("prompt_library_template_chip");
    titleWrap.appendChild(chip);
  }
  head.appendChild(titleWrap);

  if (!options.compact) {
    const actions = document.createElement("div");
    actions.className = "gtf-prompt-library-card-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "gtf-prompt-library-mini-btn icon-only";
    editBtn.title = ct("prompt_library_edit");
    editBtn.setAttribute("aria-label", ct("prompt_library_edit"));
    editBtn.appendChild(createPromptLibraryIcon("edit"));
    editBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openNativePromptLibraryEditor(item);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "gtf-prompt-library-mini-btn icon-only danger";
    deleteBtn.title = ct("prompt_library_delete");
    deleteBtn.setAttribute("aria-label", ct("prompt_library_delete"));
    deleteBtn.appendChild(createPromptLibraryIcon("delete"));
    deleteBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!window.confirm(ct("prompt_library_confirm_delete"))) return;
      try {
        nativePromptLibraryItems = nativePromptLibraryItems.filter((entry) => entry.id !== item.id);
        await persistPromptLibraryItems(nativePromptLibraryItems);
        if (nativePromptLibraryEditingId === item.id) {
          closeNativePromptLibraryEditor();
        }
        refreshNativePromptLibraryList();
        setNativePromptLibraryStatusByKey("prompt_library_status_deleted");
      } catch (error) {
        console.warn("[Gemini Timeline] delete prompt failed", error);
        setNativePromptLibraryStatusByKey("prompt_library_status_error", true);
      }
    });

    actions.append(editBtn, deleteBtn);
    head.appendChild(actions);
  }

  const body = document.createElement("div");
  body.className = "gtf-prompt-library-card-body";
  body.textContent = getPromptLibraryTextPreview(item.text);

  card.append(head, body);
  card.addEventListener("click", () => {
    applyPromptLibraryItem(item).catch((error) => {
      console.warn("[Gemini Timeline] apply prompt failed", error);
      setNativePromptLibraryStatusByKey("prompt_library_status_error", true);
    });
  });
  return card;
}

function refreshNativePromptLibraryList() {
  if (!(nativePromptLibraryListEl instanceof HTMLElement)) return;
  nativePromptLibraryListEl.textContent = "";
  renderNativePromptLibraryFilterBar();

  if (nativePromptLibraryRecentListEl instanceof HTMLElement) {
    nativePromptLibraryRecentListEl.textContent = "";
    const recentItems = getRecentPromptLibraryItems();
    nativePromptLibraryRecentListEl.parentElement.hidden = recentItems.length === 0;
    recentItems.forEach((item) => {
      nativePromptLibraryRecentListEl.appendChild(buildPromptLibraryCard(item, { compact: true }));
    });
  }

  const items = getFilteredPromptLibraryItems();
  if (nativePromptLibraryEmptyEl instanceof HTMLElement) {
    nativePromptLibraryEmptyEl.hidden = items.length > 0;
    nativePromptLibraryEmptyEl.textContent = nativePromptLibraryItems.length
      ? ct("prompt_library_empty_filtered")
      : ct("prompt_library_empty");
  }
  if (shouldGroupPromptLibraryList()) {
    getPromptLibraryGroupedItems(items).forEach((group) => {
      const section = document.createElement("section");
      section.className = "gtf-prompt-library-group";
      const head = document.createElement("button");
      head.type = "button";
      head.className = "gtf-prompt-library-group-head";
      const collapsed = nativePromptLibraryCollapsedGroups.has(group.key);
      head.title = ct(collapsed ? "prompt_library_group_expand" : "prompt_library_group_collapse");
      head.setAttribute("aria-expanded", collapsed ? "false" : "true");
      head.innerHTML = `<span class="gtf-prompt-library-group-name">${group.name}</span><span class="gtf-prompt-library-group-meta">${group.items.length}</span><span class="gtf-prompt-library-group-caret" aria-hidden="true">${collapsed ? "▸" : "▾"}</span>`;
      const body = document.createElement("div");
      body.className = "gtf-prompt-library-group-body";
      body.hidden = collapsed;
      group.items.forEach((item) => {
        body.appendChild(buildPromptLibraryCard(item));
      });
      head.addEventListener("click", () => {
        if (nativePromptLibraryCollapsedGroups.has(group.key)) {
          nativePromptLibraryCollapsedGroups.delete(group.key);
        } else {
          nativePromptLibraryCollapsedGroups.add(group.key);
        }
        refreshNativePromptLibraryList();
      });
      section.append(head, body);
      nativePromptLibraryListEl.appendChild(section);
    });
    return;
  }
  items.forEach((item) => {
    nativePromptLibraryListEl.appendChild(buildPromptLibraryCard(item));
  });
}

function refreshNativePromptLibraryLocale() {
  if (!(nativePromptLibraryRoot instanceof HTMLElement)) return;
  if (nativePromptLibraryButton instanceof HTMLButtonElement) {
    setNativePromptLibraryTriggerContent(nativePromptLibraryButton);
  }
  const title = nativePromptLibraryRoot.querySelector(".gtf-prompt-library-title");
  if (title instanceof HTMLElement) title.textContent = ct("prompt_library_title");
  const subtitle = nativePromptLibraryRoot.querySelector(".gtf-prompt-library-subtitle");
  if (subtitle instanceof HTMLElement) subtitle.textContent = ct("prompt_library_subtitle");
  const recentTitle = nativePromptLibraryRoot.querySelector(".gtf-prompt-library-recent-title");
  if (recentTitle instanceof HTMLElement) recentTitle.textContent = ct("prompt_library_recent_title");
  const newBtn = nativePromptLibraryRoot.querySelector(".gtf-prompt-library-new-btn");
  if (newBtn instanceof HTMLButtonElement) {
    setPromptLibraryHeadButtonContent(newBtn, "new", ct("prompt_library_new"));
  }
  if (nativePromptLibraryImportBtn instanceof HTMLButtonElement) {
    setPromptLibraryHeadButtonContent(nativePromptLibraryImportBtn, "import", ct("prompt_library_import"));
  }
  if (nativePromptLibraryExportBtn instanceof HTMLButtonElement) {
    setPromptLibraryHeadButtonContent(nativePromptLibraryExportBtn, "export", ct("prompt_library_export"));
  }
  const closeBtn = nativePromptLibraryRoot.querySelector(".gtf-prompt-library-close-btn");
  if (closeBtn instanceof HTMLButtonElement) {
    setPromptLibraryHeadButtonContent(closeBtn, "close", ct("prompt_library_close"));
  }
  if (nativePromptLibrarySearchInput instanceof HTMLInputElement) {
    nativePromptLibrarySearchInput.placeholder = ct("prompt_library_search_placeholder");
  }
  if (nativePromptLibraryTitleEl instanceof HTMLElement) {
    nativePromptLibraryTitleEl.textContent = ct(nativePromptLibraryEditingId ? "prompt_library_editor_edit" : "prompt_library_editor_new");
  }
  if (nativePromptLibraryNameInput instanceof HTMLInputElement) {
    nativePromptLibraryNameInput.placeholder = ct("prompt_library_name_placeholder");
  }
  if (nativePromptLibraryGroupInput instanceof HTMLInputElement) {
    nativePromptLibraryGroupInput.placeholder = ct("prompt_library_group_placeholder");
  }
  if (nativePromptLibraryTextarea instanceof HTMLTextAreaElement) {
    nativePromptLibraryTextarea.placeholder = ct("prompt_library_text_placeholder");
  }
  if (nativePromptLibrarySaveBtn instanceof HTMLButtonElement) {
    nativePromptLibrarySaveBtn.textContent = ct("prompt_library_save");
  }
  if (nativePromptLibraryCancelBtn instanceof HTMLButtonElement) {
    nativePromptLibraryCancelBtn.textContent = ct("prompt_library_cancel");
  }
  if (nativePromptLibraryTemplateTitleEl instanceof HTMLElement) {
    nativePromptLibraryTemplateTitleEl.textContent = ct("prompt_library_template_title");
  }
  const templateHint = nativePromptLibraryRoot.querySelector(".gtf-prompt-library-template-hint");
  if (templateHint instanceof HTMLElement) {
    templateHint.textContent = ct("prompt_library_template_hint");
  }
  if (nativePromptLibraryTemplateConfirmBtn instanceof HTMLButtonElement) {
    nativePromptLibraryTemplateConfirmBtn.textContent = ct("prompt_library_template_apply");
  }
  if (nativePromptLibraryTemplateCancelBtn instanceof HTMLButtonElement) {
    nativePromptLibraryTemplateCancelBtn.textContent = ct("prompt_library_cancel");
  }
  if (nativePromptLibraryStatusEl instanceof HTMLElement && nativePromptLibraryStatusEl.dataset.i18nKey) {
    let vars = null;
    if (nativePromptLibraryStatusEl.dataset.i18nVars) {
      try {
        vars = JSON.parse(nativePromptLibraryStatusEl.dataset.i18nVars);
      } catch {
        vars = null;
      }
    }
    nativePromptLibraryStatusEl.textContent = ct(nativePromptLibraryStatusEl.dataset.i18nKey, vars);
  }
  refreshNativePromptLibraryList();
}

function refreshInlineAnnotationLocale() {
  document.querySelectorAll(".gtf-inline-annotation-wrapper, .gtf-interleaved-container, .gtf-turn-share-bar").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const labelEl = node.querySelector(".gtf-inline-annotation-label");
    if (labelEl instanceof HTMLElement) {
      labelEl.textContent = ct(node.dataset.annotationLabelKey || "inline_annotation_label");
    }
    const textarea = node.querySelector(".gtf-inline-annotation-textarea");
    if (textarea instanceof HTMLTextAreaElement) {
      textarea.placeholder = ct(node.dataset.annotationPlaceholderKey || "inline_annotation_placeholder");
    }
    const shareTitle = node.querySelector(".gtf-inline-annotation-actions-title");
    if (shareTitle instanceof HTMLElement) {
      shareTitle.textContent = ct("inline_annotation_share_title");
    }
    const modeBtn = node.querySelector(".gtf-inline-annotation-mode-toggle");
    if (modeBtn instanceof HTMLButtonElement) {
      modeBtn.textContent = inlineAnnotationUiMode === "compact" ? ct("inline_annotation_mode_compact") : ct("inline_annotation_mode_readable");
      modeBtn.title = ct("inline_annotation_mode_toggle");
    }
    const shareBtn = node.querySelector(".gtf-inline-annotation-share-btn");
    if (shareBtn instanceof HTMLButtonElement) {
      const label = currentLocale === "en" ? "Learning Share" : "学习分享";
      shareBtn.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.75a.75.75 0 0 1 .75.75v6.69l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V3.5a.75.75 0 0 1 .75-.75M4.5 12.25a.75.75 0 0 1 .75.75v1.5c0 .138.112.25.25.25h9a.25.25 0 0 0 .25-.25V13a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 14.5 16.25h-9A1.75 1.75 0 0 1 3.75 14.5V13a.75.75 0 0 1 .75-.75"/></svg><span>${label}</span>`;
    }
    
    node.querySelectorAll("[data-inline-share-action]").forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      const action = btn.dataset.inlineShareAction;
      const label =
        action === "copy"
          ? ct("timeline_menu_share_copy")
          : action === "note"
          ? ct("timeline_menu_share_save_note")
          : action === "download-svg"
          ? ct("timeline_menu_share_download_svg")
          : ct("inline_annotation_share_download");
      const labelSpan = btn.querySelector("span");
      if (labelSpan instanceof HTMLElement) {
        labelSpan.textContent = label;
      }
    });
    const statusEl = node.querySelector(".gtf-inline-annotation-status");
    if (statusEl instanceof HTMLElement && statusEl.dataset.i18nKey) {
      statusEl.textContent = ct(statusEl.dataset.i18nKey);
    }
    const summaryEl = node.querySelector(".gtf-inline-annotation-summary");
    if (summaryEl instanceof HTMLButtonElement && textarea instanceof HTMLTextAreaElement) {
      summaryEl.textContent = buildInterleavedSummaryText(textarea.value);
    }
  });
}

function refreshFollowupDrawerLocale() {
  if (!(followupDrawerEl instanceof HTMLElement)) return;
  const titleEl = followupDrawerEl.querySelector(".gtf-head h3");
  if (titleEl instanceof HTMLElement) {
    titleEl.textContent = currentLocale === "en" ? "Start a New Chat From This Note" : "基于当前笔记发起新会话";
  }
  const descEl = followupDrawerEl.querySelector(".gtf-head p");
  if (descEl instanceof HTMLElement) {
    descEl.textContent = currentLocale === "en"
      ? "Summarize what you want to continue, then open a clean Gemini chat with this context."
      : "先概括你想继续追问的方向，再带着这段上下文打开一个全新的 Gemini 会话。";
  }
  const closeBtn = followupDrawerEl.querySelector(".gtf-close");
  if (closeBtn instanceof HTMLButtonElement) {
    closeBtn.title = currentLocale === "en" ? "Close" : "关闭";
    closeBtn.textContent = "×";
  }
  const cardTitles = followupDrawerEl.querySelectorAll(".gtf-card-title");
  if (cardTitles[0] instanceof HTMLElement) {
    cardTitles[0].textContent = currentLocale === "en" ? "Original Question" : "原问题";
  }
  if (cardTitles[1] instanceof HTMLElement) {
    cardTitles[1].textContent = currentLocale === "en" ? "Original Answer Summary" : "原回答摘要";
  }
  const inputEl = followupDrawerEl.querySelector("#gtfInput");
  if (inputEl instanceof HTMLTextAreaElement) {
    inputEl.placeholder = currentLocale === "en"
      ? "Example: keep the previous answer concise, then explain the last step with one more concrete example."
      : "例如：保留上一条回答的结论，但把最后一步再用一个更具体的例子讲清楚。";
  }
  const cancelBtn = followupDrawerEl.querySelector("#gtfCancel");
  if (cancelBtn instanceof HTMLButtonElement) {
    cancelBtn.textContent = currentLocale === "en" ? "Cancel" : "取消";
  }
  const openBtn = followupDrawerEl.querySelector("#gtfOpenNew");
  if (openBtn instanceof HTMLButtonElement) {
    openBtn.textContent = currentLocale === "en" ? "Open New Chat" : "打开新会话";
  }
  if (followupContext && followupDrawerEl.classList.contains("open")) {
    const metaEl = followupDrawerEl.querySelector("#gtfMeta");
    if (metaEl instanceof HTMLElement) {
      metaEl.textContent = `${followupContext.summary || (currentLocale === "en" ? "Untitled note" : "未命名笔记")} · ${formatLocalTime(followupContext.timestamp)}`;
    }
    const questionEl = followupDrawerEl.querySelector("#gtfQuestion");
    if (questionEl instanceof HTMLElement) {
      questionEl.textContent = followupContext.question || (currentLocale === "en" ? "(empty)" : "(空)");
    }
    const answerEl = followupDrawerEl.querySelector("#gtfAnswer");
    if (answerEl instanceof HTMLElement) {
      answerEl.textContent = followupContext.answerMarkdown || (currentLocale === "en" ? "(empty)" : "(空)");
    }
  }
}

function applyContentLocaleToUi() {
  if (nativeChatTimelineRoot instanceof HTMLElement) {
    nativeChatTimelineRoot.setAttribute("aria-label", ct("timeline_aria_label"));
    const toggleBtn = nativeChatTimelineRoot.querySelector(".gtf-native-chat-timeline-head");
    if (toggleBtn instanceof HTMLButtonElement) toggleBtn.title = ct("timeline_toggle_sidebar");
  }
  updateNativeTimelineFilterButtons();
  nativeChatTimelineTurnsCache.forEach((turn, idx) => {
    const dot = nativeChatTimelineDotMap.get(turn?.id);
    if (dot instanceof HTMLElement) applyNativeTimelineDotBookmarkState(dot, turn, idx);
  });
  refreshNativeTimelineBookmarkMenuLocale();
  refreshNativeMainConversationNoteLocale();
  refreshNativePromptLibraryLocale();
  refreshInlineAnnotationLocale();
  refreshQuickQuoteBarLocale();
  refreshFollowupDrawerLocale();
}

function normalizePathname(pathname) {
  const normalized = (pathname || "/").replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return normalized || "/";
}

function looksLikeRouteTitle(value) {
  const text = normalizeText(value || "");
  if (!text) return false;
  if (/^https?:\/\//i.test(text)) return true;
  return /^\/(?:u\/\d+\/)?app(?:\/|$)/i.test(text);
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

function getAccountScopeFromUrl(urlText) {
  if (!urlText) return DEFAULT_ACCOUNT_SCOPE;
  try {
    const url = new URL(urlText);
    if (url.hostname !== "gemini.google.com") return DEFAULT_ACCOUNT_SCOPE;
    return getAccountScopeFromPath(url.pathname);
  } catch {
    return DEFAULT_ACCOUNT_SCOPE;
  }
}

function getAccountScopeFromConversationId(conversationId) {
  return getAccountScopeFromUrl(conversationId);
}

function getAccountPath(scope = DEFAULT_ACCOUNT_SCOPE) {
  const normalized = normalizeAccountScope(scope);
  return `/u/${normalized.slice(1)}`;
}

function toConversationId(urlText) {
  if (!urlText) return "";
  try {
    const url = new URL(urlText);
    if (url.hostname !== "gemini.google.com") return "";
    const path = normalizePathname(url.pathname);
    const scope = getAccountScopeFromPath(path);
    const accountPath = getAccountPath(scope);
    const pathWithoutAccount = path.replace(/^\/u\/\d+(?=\/|$)/i, "") || "/";
    const chatMatch = pathWithoutAccount.match(/^\/app\/([^/?#]+)/i);
    if (chatMatch?.[1]) {
      return `${url.origin}${accountPath}/app/${chatMatch[1]}`;
    }
    const queryTokenKeys = ["conversation", "conversation_id", "chat_id", "chat", "cid", "c", "id"];
    for (const key of queryTokenKeys) {
      const value = (url.searchParams.get(key) || "").trim();
      if (/^[a-z0-9_-]{6,}$/i.test(value)) {
        return `${url.origin}${accountPath}/app/${value}`;
      }
    }
    if (/^\/app$/i.test(pathWithoutAccount)) return `${url.origin}${accountPath}/app`;
    if (pathWithoutAccount === "/") return `${url.origin}${accountPath}`;
    return `${url.origin}${accountPath}${pathWithoutAccount}`;
  } catch {
    return "";
  }
}

function forceConversationToScope(value, scope = getAccountScopeFromUrl(location.href)) {
  const normalizedConversationId = toConversationId(value);
  if (!normalizedConversationId) return "";
  const match = normalizedConversationId.match(/\/app\/([^/?#]+)/i);
  if (!match?.[1]) return normalizedConversationId;
  try {
    const url = new URL(normalizedConversationId);
    return `${url.origin}${getAccountPath(scope)}/app/${match[1]}`;
  } catch {
    return normalizedConversationId;
  }
}

function getHomeStorageKey(scope = getAccountScopeFromUrl(location.href)) {
  return `${HOME_KEY}:${normalizeAccountScope(scope)}`;
}

function getHomeIndexStorageKey(scope = getAccountScopeFromUrl(location.href)) {
  return `${HOME_INDEX_KEY}:${normalizeAccountScope(scope)}`;
}

function toStorageKey(conversationId) {
  return `${STORAGE_PREFIX}${conversationId}`;
}

async function requestPanelOpenConversation(conversationId) {
  const normalizedConversationId = forceConversationToScope(conversationId);
  if (!isConcreteConversationId(normalizedConversationId)) return false;
  let messageSent = false;
  try {
    messageSent = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "GEMINI_OPEN_WORKSPACE_CONVERSATION_REQUEST",
          conversationId: normalizedConversationId
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(false);
            return;
          }
          resolve(Boolean(response?.ok));
        }
      );
    });
  } catch {
    messageSent = false;
  }

  let storageSent = false;
  try {
    await storageSet({
      [PANEL_NAV_KEY]: {
        view: "workspace",
        conversationId: normalizedConversationId,
        createdAt: Date.now(),
        source: "native-folder-panel"
      }
    });
    storageSent = true;
  } catch (error) {
    console.warn("[Gemini Timeline] request panel open conversation failed", error);
    storageSent = false;
  }
  return messageSent || storageSent;
}

function findNativeConversationAnchor(targetConversationId) {
  const targetId = toConversationId(targetConversationId);
  if (!isConcreteConversationId(targetId)) return null;
  const anchors = Array.from(document.querySelectorAll("a[href*='/app/']"));
  for (const anchor of anchors) {
    if (!(anchor instanceof HTMLAnchorElement)) continue;
    if (anchor.closest("#gtf-native-folder-panel")) continue;
    const hrefId = toConversationId(anchor.href || "");
    if (hrefId !== targetId) continue;
    return anchor;
  }
  return null;
}

function navigateConversationInPage(conversationId, options = {}) {
  const allowHardFallback = options?.allowHardFallback === true;
  const allowHistoryFallback = options?.allowHistoryFallback !== false;
  const targetConversationId = forceConversationToScope(conversationId);
  if (!isConcreteConversationId(targetConversationId)) return false;
  if (toConversationId(location.href) === targetConversationId) return true;

  const nativeAnchor = findNativeConversationAnchor(targetConversationId);
  if (nativeAnchor) {
    nativeAnchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  }

  if (allowHistoryFallback) {
    try {
      const targetUrl = new URL(targetConversationId);
      const next = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
      history.pushState({}, "", next);
      window.dispatchEvent(new PopStateEvent("popstate"));
      setTimeout(() => {
        if (toConversationId(location.href) === targetConversationId) return;
        const retryAnchor = findNativeConversationAnchor(targetConversationId);
        if (!retryAnchor) return;
        retryAnchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      }, 120);
      return true;
    } catch {}
  }

  if (allowHardFallback) {
    try {
      location.assign(targetConversationId);
    } catch {
      location.href = targetConversationId;
    }
    return true;
  }
  return false;
}

function updateDebugState(patch) {
  Object.assign(debugState, patch || {});
}

function pushBranchDispatchTrace(stage, extra = {}) {
  const nextItem = {
    at: Date.now(),
    stage: String(stage || ""),
    ...extra
  };
  const prev = Array.isArray(debugState.branchDispatchTrace) ? debugState.branchDispatchTrace : [];
  const trace = prev.concat(nextItem).slice(-12);
  updateDebugState({
    branchDispatchStage: nextItem.stage,
    branchDispatchUpdatedAt: nextItem.at,
    branchDispatchTrace: trace,
    ...extra
  });
}

function markLayoutResizing(ms = 320) {
  const until = Date.now() + Math.max(120, Number(ms) || 0);
  layoutResizeActiveUntil = Math.max(layoutResizeActiveUntil, until);
  scheduleNativeTimelinePositionUpdate();
  if (layoutResizeRenderTimer) clearTimeout(layoutResizeRenderTimer);
  layoutResizeRenderTimer = setTimeout(() => {
    layoutResizeRenderTimer = null;
    layoutResizeActiveUntil = 0;
    scheduleNativeTimelinePositionUpdate();
    scheduleNativeChatTimelineRender(100);
    scheduleNativeFolderPanelRender();
    scheduleNativeTimelineActiveSync();
  }, Math.max(180, ms));
}

function isLayoutResizing() {
  return Date.now() < layoutResizeActiveUntil;
}

function isLowPowerLayoutMode() {
  return lowPowerModeEnabled || isLayoutResizing() || window.innerWidth <= 1320;
}

function applyLowPowerModeUi() {
  if (lowPowerModeEnabled) {
    cleanupNativeChatTimeline();
  }
}

async function loadContentSettings() {
  try {
    const result = await storageGet(SETTINGS_KEY);
    currentLocale = normalizeLocale(result?.[SETTINGS_KEY]?.locale);
    lowPowerModeEnabled = Boolean(result?.[SETTINGS_KEY]?.lowPowerMode);
    applyLowPowerModeUi();
  } catch {
    currentLocale = "zh";
    lowPowerModeEnabled = false;
  }
}

async function syncContentLocaleFromStorage(forceRefresh = false) {
  try {
    const result = await storageGet(SETTINGS_KEY);
    const nextLocale = normalizeLocale(result?.[SETTINGS_KEY]?.locale);
    if (nextLocale !== currentLocale || forceRefresh) {
      currentLocale = nextLocale;
      applyContentLocaleToUi();
    }
  } catch {
    // ignore locale sync failures and keep current in-memory locale
  }
}

function perfNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function recordPerf(name, startedAt, meta = null) {
  const durationMs = Math.max(0, perfNow() - Number(startedAt || 0));
  const roundedMs = Math.round(durationMs * 10) / 10;
  const sample = {
    name: String(name || "unknown"),
    durationMs: roundedMs,
    at: Date.now(),
    meta: meta && typeof meta === "object" ? meta : null
  };
  perfTrace.unshift(sample);
  if (perfTrace.length > PERF_SAMPLE_LIMIT) perfTrace.length = PERF_SAMPLE_LIMIT;
  updateDebugState({
    perfLastName: sample.name,
    perfLastMs: roundedMs,
    perfLastAt: sample.at,
    perfSlowCount: Number(debugState.perfSlowCount || 0) + (roundedMs >= PERF_SLOW_THRESHOLD_MS ? 1 : 0)
  });
  return roundedMs;
}

function getContentPerfItems() {
  return perfTrace.map((item) => ({ source: "content", ...item }));
}

function requestSidePanelPerf(action) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GEMINI_HAJIMI_PERF", action }, (response) => {
      const errorMessage = chrome.runtime?.lastError?.message || "";
      if (errorMessage) {
        resolve({ ok: false, error: errorMessage, items: [] });
        return;
      }
      resolve(response || { ok: false, error: "Side panel did not respond", items: [] });
    });
  });
}

async function handlePagePerfBridgeRequest(action) {
  const normalizedAction = String(action || "list").trim();
  if (normalizedAction === "clear") {
    perfTrace.length = 0;
  }
  const sidePanelPayload = await requestSidePanelPerf(normalizedAction);
  const sidePanelItems = Array.isArray(sidePanelPayload?.items)
    ? sidePanelPayload.items.map((item) => ({ source: "sidepanel", ...item }))
    : [];
  const contentItems = normalizedAction === "clear" ? [] : getContentPerfItems();
  return {
    ok: true,
    action: normalizedAction,
    sidepanel: sidePanelPayload,
    items: sidePanelItems.concat(contentItems)
  };
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data || {};
  if (data.source !== "hajimi-perf-page") return;
  const id = String(data.id || "");
  if (!id) return;
  handlePagePerfBridgeRequest(data.action)
    .then((payload) => {
      window.postMessage({ source: "hajimi-perf-content", id, payload }, "*");
    })
    .catch((error) => {
      window.postMessage({
        source: "hajimi-perf-content",
        id,
        payload: { ok: false, error: error?.message || "Perf bridge failed", items: [] }
      }, "*");
    });
});

function describeNode(node) {
  if (!node || !(node instanceof Element)) {
    return { tag: "", className: "" };
  }
  return {
    tag: (node.tagName || "").toLowerCase(),
    className: (node.className || "").toString().slice(0, 120)
  };
}

function normalizeText(value) {
  return (value || "").replace(/\u00a0/g, " ").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function clampText(text, maxLength) {
  const normalized = normalizeText(text);
  if (!maxLength || normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function stripMarkdownForShare(value) {
  return normalizeText(
    String(value || "")
      .replace(/```([\s\S]*?)```/g, (_, code) => `\n${String(code || "").trim()}\n`)
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/^>\s?/gm, "")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^[-*+]\s+/gm, "• ")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/\|/g, " ")
  );
}

function parseRgbColor(text) {
  const raw = (text || "").trim();
  const match = raw.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3])
  };
}

function getLuminance(rgb) {
  if (!rgb) return 1;
  const normalize = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * normalize(rgb.r) + 0.7152 * normalize(rgb.g) + 0.0722 * normalize(rgb.b);
}

function detectGeminiTheme() {
  const html = document.documentElement;
  const body = document.body;
  const classText = `${html?.className || ""} ${body?.className || ""}`.toLowerCase();
  if (/(\bdark\b|theme-dark|dark-theme|color-scheme-dark)/i.test(classText)) return "dark";

  const rootStyle = window.getComputedStyle(body || html);
  const colorScheme = (rootStyle.colorScheme || "").toLowerCase();
  if (colorScheme.includes("dark")) return "dark";
  if (colorScheme.includes("light")) return "light";

  const bg = parseRgbColor(rootStyle.backgroundColor || "");
  if (bg) {
    return getLuminance(bg) < 0.36 ? "dark" : "light";
  }

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function stripSpeakerPrefix(text, role) {
  let result = normalizeText(text).replace(/^[\u200B-\u200D\uFEFF]+/g, "");
  if (!result) return "";

  if (!role || role === "assistant") {
    result = result.replace(/^(?:gemini|assistant)\s*(?:说|回复|回答|said|replied|responded)?\s*[:：-]?\s*/i, "");
    result = result.replace(/^(?:说|回复|回答|said|replied|responded)\s*[:：-]\s*/i, "");
  }

  if (!role || role === "user") {
    result = result.replace(/^(?:you|你|您)\s*(?:说|问|提问|输入|said|asked)?\s*[:：-]?\s*/i, "");
    result = result.replace(/^(?:问|提问|输入|asked)\s*[:：-]\s*/i, "");
  }

  return normalizeText(result).replace(/^[\u200B-\u200D\uFEFF]+/g, "");
}


function normalizeFingerprintText(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
}

function isNoiseResponseText(text) {
  const normalized = normalizeFingerprintText(text);
  if (!normalized) return true;
  if (normalized.length < 3) return true;

  const blockedPhrases = [
    "show thinking",
    "continue",
    "ok",
    "received",
    "ask gemini",
    "gemini is an ai tool",
    "gemini is an ai tool its responses may be inaccurate",
    "gemini是一款ai工具其回答未必正确无误",
    "其回答未必正确无误",
    "回答未必正确无误"
  ];
  const exactSet = new Set(blockedPhrases.map((item) => normalizeFingerprintText(item)));
  if (exactSet.has(normalized)) return true;

  if (normalized.length <= 48) {
    return blockedPhrases.some((phrase) => normalized.includes(normalizeFingerprintText(phrase)));
  }
  return false;
}

function isNoiseQuestionText(text) {
  const normalized = normalizeFingerprintText(text);
  if (!normalized) return true;
  if (normalized.length < 2) return true;
  const blockedExact = [
    "未检测到用户提问",
    "没有检测到用户提问",
    "当前未检测到用户提问",
    "ask gemini",
    "thinking",
    "show thinking",
    "思考",
    "显示思考过程",
    "提示词",
    "prompts",
    "prompt library",
    "gemini is an ai tool",
    "gemini is an ai tool its responses may be inaccurate",
    "gemini是一款ai工具其回答未必正确无误",
    "其回答未必正确无误",
    "回答未必正确无误"
  ];
  if (blockedExact.some((item) => normalized.includes(normalizeFingerprintText(item)))) return true;
  return false;
}


function sanitizeMessageText(text, role) {
  return stripSpeakerPrefix(normalizeText(text), role);
}

function extractFollowupQuestion(text) {
  const source = normalizeText(text);
  if (!source) return "";

  const markerMatch = source.match(/\[(follow-up|杩介棶)\][\s\S]*$/i);
  if (markerMatch && markerMatch[0]) {
    return normalizeText(markerMatch[0].replace(/\[(follow-up|杩介棶)\]/i, ""));
  }
  return source;
}

function extractBranchPromptMarker(text) {
  const source = normalizeText(text);
  if (!source) return "";
  const match = source.match(BRANCH_PROMPT_MARKER_RE);
  return match?.[1] ? String(match[1]) : "";
}

function stripBranchPromptMarker(text) {
  const source = normalizeText(text);
  if (!source) return "";
  return normalizeText(source.replace(BRANCH_PROMPT_MARKER_RE, "").replace(/\n{3,}/g, "\n\n"));
}

function markBranchTurnNodeHidden(node) {
  if (!(node instanceof Element)) return;
  node.dataset.gtfBranchHidden = "1";
  node.setAttribute("aria-hidden", "true");
  node.style.setProperty("display", "none", "important");
}

function isBranchTurnNodeHidden(node) {
  if (!(node instanceof Element)) return false;
  if (node.dataset?.gtfBranchHidden === "1") return true;
  if (node.getAttribute("aria-hidden") === "true") return true;
  return false;
}

function hideBranchTurnsByMarker(marker = "") {
  const markerText = normalizeText(marker);
  if (!markerText) return 0;
  const container = chatContainer && chatContainer.isConnected ? chatContainer : pickChatContainer() || document.body;
  const { users, responses } = getMessageNodes(container);
  const pairs = pairConversationNodes(users, responses);
  let hiddenCount = 0;
  pairs.forEach(({ userNode, responseNode }) => {
    const userText = getUserText(userNode);
    if (!userText || !userText.includes(`[[GTF_BRANCH:${markerText}]]`)) return;
    markBranchTurnNodeHidden(userNode);
    markBranchTurnNodeHidden(responseNode);
    hiddenCount += 1;
  });
  return hiddenCount;
}

function hideBranchTurnsByQuestion(question = "") {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) return 0;
  const container = chatContainer && chatContainer.isConnected ? chatContainer : pickChatContainer() || document.body;
  const { users, responses } = getMessageNodes(container);
  const pairs = pairConversationNodes(users, responses);
  for (let i = pairs.length - 1; i >= 0; i -= 1) {
    const pair = pairs[i];
    const userText = normalizeText(getUserText(pair.userNode) || "");
    if (!userText) continue;
    if (userText === normalizedQuestion || userText.includes(normalizedQuestion)) {
      markBranchTurnNodeHidden(pair.userNode);
      markBranchTurnNodeHidden(pair.responseNode);
      return 1;
    }
  }
  return 0;
}


function summarize(text) {
  const oneLine = (text || "").replace(/\s+/g, " ").trim();
  if (!oneLine) return "(empty)";
  return oneLine.length > 72 ? `${oneLine.slice(0, 72)}...` : oneLine;
}

function hashFNV1a(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function buildTurnId(question, answer) {
  return `turn_${hashFNV1a(`${question}\n---\n${answer}`)}`;
}

function buildTurnFingerprint(turn) {
  const q = normalizeFingerprintText(turn?.question || "").slice(0, 120);
  const a = normalizeFingerprintText(turn?.answerMarkdown || "").slice(0, 220);
  return `${q}|${a}`;
}

const MATH_COPY_SELECTOR = ".katex, math, .math-inline, .math-display, mjx-container, .MathJax, .MathJax_Display";
const MATH_AUXILIARY_SELECTOR = "mjx-assistive-mml, .katex-mathml, .katex-html, .MathJax_Assistive_MathML";

function isStructuredMathNodeElement(node) {
  if (!(node instanceof Element)) return false;
  if (node.matches?.(MATH_COPY_SELECTOR)) return true;
  if (
    node.hasAttribute("data-tex") ||
    node.hasAttribute("data-latex") ||
    node.hasAttribute("data-math") ||
    node.hasAttribute("data-original-tex") ||
    node.hasAttribute("data-original-latex")
  ) {
    return true;
  }
  const classText = String(node.getAttribute("class") || "").toLowerCase();
  if (/(katex|mathjax|mjx|equation|math-inline|math-display)/.test(classText)) {
    if (
      node.querySelector?.("math, svg, mjx-assistive-mml, .katex-mathml, annotation[encoding*='tex'], script[type^='math/tex']") ||
      node.querySelector?.("annotation[encoding*='latex'], script[type*='latex']")
    ) {
      return true;
    }
  }
  if (
    node.querySelector?.("mjx-assistive-mml math") ||
    node.querySelector?.(".katex-mathml math") ||
    node.querySelector?.("annotation[encoding='application/x-tex'], annotation[encoding='application/x-latex']") ||
    node.querySelector?.("script[type^='math/tex'], script[type*='latex']")
  ) {
    return true;
  }
  return false;
}

function closestAcrossShadow(startNode, selector) {
  let current = startNode instanceof Element ? startNode : startNode?.parentElement || null;
  while (current) {
    if (current.matches?.(selector)) return current;
    const parent = current.parentElement;
    if (parent) {
      current = parent;
      continue;
    }
    const root = current.getRootNode?.();
    if (root instanceof ShadowRoot && root.host) {
      current = root.host;
      continue;
    }
    break;
  }
  return null;
}

function isDisplayMathNode(node) {
  if (!(node instanceof Element)) return false;
  if (node.classList.contains("katex-display")) return true;
  if (node.classList.contains("math-display")) return true;
  if (node.classList.contains("MathJax_Display")) return true;
  if (node.getAttribute("display") === "block") return true;
  if (node.getAttribute("mode") === "display") return true;
  return false;
}

function extractTexFromMathNode(node) {
  if (!(node instanceof Element)) return "";

  const scriptTex = node.querySelector('script[type^="math/tex"], script[type*="latex"]');
  if (scriptTex?.textContent) {
    return scriptTex.textContent.trim();
  }

  const annotation = node.querySelector('annotation[encoding="application/x-tex"], annotation[encoding="application/x-latex"]');
  if (annotation?.textContent) {
    return annotation.textContent.trim();
  }

  const attrCandidates = [
    node.getAttribute("data-tex"),
    node.getAttribute("data-latex"),
    node.getAttribute("data-math"),
    node.getAttribute("data-original-tex"),
    node.getAttribute("data-original-latex"),
    node.getAttribute("aria-label")
  ];
  for (const raw of attrCandidates) {
    const value = normalizeText(raw || "");
    if (value) return value;
  }

  const assistiveMath = node.querySelector("mjx-assistive-mml math");
  if (assistiveMath) {
    const innerAnnotation = assistiveMath.querySelector('annotation[encoding="application/x-tex"], annotation[encoding="application/x-latex"]');
    if (innerAnnotation?.textContent) {
      return innerAnnotation.textContent.trim();
    }
    const mathText = normalizeText(assistiveMath.textContent || "");
    if (mathText) return mathText;
  }

  const mathNode = node.matches("math") ? node : node.querySelector("math");
  if (mathNode) {
    const mathText = normalizeText(mathNode.textContent || "");
    if (mathText) return mathText;
  }

  const fallbackText = normalizeText(node.textContent || "");
  if (fallbackText) return fallbackText;

  return "";
}

function buildMathReplacementText(tex, isDisplay) {
  if (!tex) return "";
  return isDisplay ? `\n$$${tex}$$\n` : `$${tex}$`;
}

function replaceMathNodesWithTex(root) {
  if (!(root instanceof Element || root instanceof DocumentFragment)) {
    return false;
  }

  let hasMath = false;

  root.querySelectorAll(".katex").forEach((node) => {
    const tex = extractTexFromMathNode(node);
    if (tex && node.parentNode) {
      hasMath = true;
      const replacement = document.createTextNode(buildMathReplacementText(tex, isDisplayMathNode(node)));
      node.parentNode.replaceChild(replacement, node);
      return;
    }
    const mathml = node.querySelector(".katex-mathml");
    const html = node.querySelector(".katex-html");
    if (mathml && html) {
      hasMath = true;
      html.remove();
    }
  });

  root.querySelectorAll("math").forEach((node) => {
    if (!node.parentNode) return;
    const tex = extractTexFromMathNode(node);
    if (!tex) return;
    hasMath = true;
    const replacement = document.createTextNode(buildMathReplacementText(tex, isDisplayMathNode(node)));
    node.parentNode.replaceChild(replacement, node);
  });

  root.querySelectorAll(".math-inline, .math-display, mjx-container, .MathJax, .MathJax_Display").forEach((node) => {
    if (!node.parentNode) return;
    const tex = extractTexFromMathNode(node);
    if (!tex) return;
    hasMath = true;
    const replacement = document.createTextNode(buildMathReplacementText(tex, isDisplayMathNode(node)));
    node.parentNode.replaceChild(replacement, node);
  });

  root.querySelectorAll(".katex-html, mjx-assistive-mml").forEach((node) => node.remove());
  return hasMath;
}

function extractTextDeep(node) {
  if (!node) return "";

  const chunks = [];
  const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "IMG", "VIDEO", "AUDIO", "BUTTON"]);

  function walk(current) {
    if (!current) return;

    if (current.nodeType === Node.TEXT_NODE) {
      const text = current.nodeValue || "";
      if (text.trim()) chunks.push(text);
      return;
    }

    if (current.nodeType !== Node.ELEMENT_NODE && current.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
      return;
    }

    const el = current;
    if (el.tagName && skipTags.has(el.tagName.toUpperCase())) return;

    if (el.shadowRoot) {
      walk(el.shadowRoot);
    }

    const children = el.childNodes || [];
    for (let i = 0; i < children.length; i += 1) {
      walk(children[i]);
    }
  }

  walk(node);
  return normalizeText(chunks.join(" "));
}

function getNodeContentSignature(node) {
  if (!(node instanceof Element)) return "";
  const text = node.textContent || "";
  return `${text.length}:${node.childElementCount}:${text.slice(-80)}`;
}

function getUserText(userNode) {
  if (userNode instanceof Element) {
    const signature = getNodeContentSignature(userNode);
    const cached = userTextCache.get(userNode);
    if (cached?.signature === signature) return cached.value;
    const directText = sanitizeMessageText(userNode?.innerText || userNode?.textContent || "", "user");
    const value = directText || sanitizeMessageText(extractTextDeep(userNode), "user");
    userTextCache.set(userNode, { signature, value });
    return value;
  }
  const directText = sanitizeMessageText(userNode?.innerText || userNode?.textContent || "", "user");
  if (directText) return directText;
  return sanitizeMessageText(extractTextDeep(userNode), "user");
}

function getResponseMarkdown(responseNode) {
  if (!responseNode) return "";
  if (responseNode instanceof Element) {
    const signature = getNodeContentSignature(responseNode);
    const cached = responseMarkdownCache.get(responseNode);
    if (cached?.signature === signature) return cached.value;
  }

  // Gemini 页面通常展示的是渲染好的富文本，这里尽可能提取出恢复的“准Markdown”文本
  // 从而确保在侧边栏的 side panel 里 marked + 样式能渲染对
  const clone = responseNode.cloneNode(true);
  clone.querySelectorAll("button, svg, img, video, audio, script, style").forEach((el) => el.remove());

  replaceMathNodesWithTex(clone);

  const tempDiv = document.createElement("div");
  tempDiv.appendChild(clone);
  document.body.appendChild(tempDiv);
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "-9999px";
  tempDiv.style.whiteSpace = "pre-wrap";
  
  const rawText = tempDiv.innerText || tempDiv.textContent || "";
  document.body.removeChild(tempDiv);

  const markdown = sanitizeMessageText(rawText, "assistant");
  const value = markdown || sanitizeMessageText(extractTextDeep(responseNode), "assistant");
  if (responseNode instanceof Element) {
    responseMarkdownCache.set(responseNode, {
      signature: getNodeContentSignature(responseNode),
      value
    });
  }
  return value;
}

function appendShareTextSegment(segments, text, preserveWhitespace = false, isBold = false) {
  if (!Array.isArray(segments)) return;
  const value = preserveWhitespace ? String(text || "") : String(text || "").replace(/\s+/g, " ");
  if (!value || !value.trim()) return;
  const last = segments[segments.length - 1];
  if (last && last.type === "text" && Boolean(last.isBold) === Boolean(isBold)) {
    last.text += value;
    return;
  }
  segments.push({ type: "text", text: value, isBold: Boolean(isBold) });
}

function cloneStructuredShareBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .map((block) => {
      const segments = Array.isArray(block?.segments)
        ? block.segments.map((segment) => ({ ...segment }))
        : [];
      return { segments };
    })
    .filter((block) => Array.isArray(block.segments));
}

function extractSvgMarkupFromMathNode(node) {
  if (!(node instanceof Element)) return "";
  const svg =
    (node.matches("svg") ? node : null) ||
    node.querySelector("svg") ||
    node.querySelector("mjx-container svg") ||
    node.querySelector(".katex svg");
  if (!(svg instanceof SVGElement)) return "";
  const cloned = svg.cloneNode(true);
  cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const rect = svg.getBoundingClientRect();
  if (rect.width > 0) cloned.setAttribute("width", `${Math.ceil(rect.width)}`);
  if (rect.height > 0) cloned.setAttribute("height", `${Math.ceil(rect.height)}`);
  return new XMLSerializer().serializeToString(cloned);
}

function extractMathMlMarkupFromMathNode(node) {
  if (!(node instanceof Element)) return "";
  const mathNode =
    (node.matches("math") ? node : null) ||
    node.querySelector("mjx-assistive-mml math") ||
    node.querySelector(".katex-mathml math") ||
    node.querySelector("math");
  if (!(mathNode instanceof Element)) return "";
  const cloned = mathNode.cloneNode(true);
  if (!cloned.getAttribute("xmlns")) {
    cloned.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
  }
  return new XMLSerializer().serializeToString(cloned);
}

function appendShareFormulaSegment(segments, tex, displayMode = false, svgMarkup = "", mathMlMarkup = "") {
  if (!Array.isArray(segments)) return;
  const normalizedTex = String(tex || "").trim();
  const normalizedMathMl = String(mathMlMarkup || "").trim();
  const normalizedSvg = String(svgMarkup || "").trim();
  if (!normalizedTex && !normalizedMathMl && !normalizedSvg) return;
  const displayText = formatLatexForCanvasDisplay(normalizedTex);
  segments.push({
    type: "formula",
    tex: normalizedTex,
    text: displayText || normalizedTex,
    displayMode: Boolean(displayMode),
    svgMarkup: normalizedSvg,
    mathMlMarkup: normalizedMathMl
  });
}

function extractStructuredShareAnswerBlocks(responseNode) {
  if (!(responseNode instanceof Element)) return [];
  const signature = getNodeContentSignature(responseNode);
  const cached = responseStructuredShareBlocksCache.get(responseNode);
  if (cached?.signature === signature) {
    return cloneStructuredShareBlocks(cached.blocks);
  }
  const blocks = [];
  let currentSegments = [];
  const blockTags = new Set([
    "P", "DIV", "LI", "UL", "OL", "PRE", "BLOCKQUOTE",
    "H1", "H2", "H3", "H4", "H5", "H6", "TABLE", "TR", "TD", "TH",
    "SECTION", "ARTICLE"
  ]);
  const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "BUTTON", "IMG", "VIDEO", "AUDIO", "SVG"]);

  const flushBlock = () => {
    const nextSegments = currentSegments
      .map((segment) => {
        if (segment.type !== "text") return segment;
        const normalized = segment.text.replace(/\s+/g, " ");
        return { ...segment, text: normalized };
      })
      .filter((segment) => segment.type === "formula" || (segment.text && segment.text.trim()));
    if (nextSegments.length) {
      blocks.push({ segments: nextSegments });
    }
    currentSegments = [];
  };

  const walk = (node, inPre = false, activeBold = false) => {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const parentEl = node.parentElement;
      if (parentEl instanceof Element && parentEl.closest(MATH_AUXILIARY_SELECTOR)) {
        return;
      }
      appendShareTextSegment(currentSegments, node.nodeValue || "", inPre, activeBold);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

    const el = node;
    const tagName = (el.tagName || "").toUpperCase();
    if (tagName && skipTags.has(tagName)) return;

    if (isStructuredMathNodeElement(el)) {
      appendShareFormulaSegment(
        currentSegments,
        extractTexFromMathNode(el),
        isDisplayMathNode(el),
        extractSvgMarkupFromMathNode(el),
        extractMathMlMarkupFromMathNode(el)
      );
      return;
    }

    if (tagName === "BR") {
      flushBlock();
      return;
    }

    const isBlock = Boolean(tagName && blockTags.has(tagName));
    if (isBlock && currentSegments.length) {
      flushBlock();
    }

    const nextInPre = inPre || tagName === "PRE";
    const ownBold =
      tagName === "STRONG" ||
      tagName === "B" ||
      /\b(font-weight\s*:\s*(bold|[6-9]00))\b/i.test(String(el.getAttribute?.("style") || "")) ||
      Number(el.getAttribute?.("data-font-weight")) >= 600;
    const nextBold = activeBold || ownBold;
    if (el.shadowRoot) {
      walk(el.shadowRoot, nextInPre, nextBold);
    }
    const children = el.childNodes || [];
    for (let i = 0; i < children.length; i += 1) {
      walk(children[i], nextInPre, nextBold);
    }

    if (isBlock) {
      flushBlock();
    }
  };

  walk(responseNode);
  flushBlock();
  const cloned = cloneStructuredShareBlocks(blocks);
  responseStructuredShareBlocksCache.set(responseNode, { signature, blocks: cloned });
  return cloneStructuredShareBlocks(cloned);
}

function isLikelyStreaming(responseNode) {
  if (!responseNode) return false;

  if (responseNode.getAttribute("aria-busy") === "true") return true;

  const loadingSelectors = [
    "[aria-label*='Generating']",
    "[aria-label*='生成中']",
    ".loading",
    ".spinner",
    "mat-progress-bar",
    "[data-testid*='typing']"
  ];

  const hasLoadingMarker = loadingSelectors.some((selector) => Boolean(responseNode.querySelector(selector)));
  if (!hasLoadingMarker) return false;
  const text = getResponseMarkdown(responseNode);
  // Avoid false positives: many stable cards contain spinner/loading class descendants.
  if ((text || "").length >= 48) return false;
  return true;
}

function storageGet(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
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

function storageRemove(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(key, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

async function hydrateKnownTurnIds() {
  if (!currentConversationId) return;
  const key = toStorageKey(currentConversationId);
  const result = await storageGet(key);
  const entries = result?.[key]?.entries;

  if (!Array.isArray(entries)) return;
  knownTurnIds = new Set(entries.map((item) => item.id).filter(Boolean));
}

async function persistTurnDirectly(turn) {
  if (!turn?.id) return;
  const conversationId = resolveEffectiveConversationId(true);
  if (!isConcreteConversationId(conversationId)) return;
  if (conversationId !== currentConversationId) {
    currentConversationId = conversationId;
  }

  const key = toStorageKey(conversationId);
  const result = await storageGet(key);
  const session = result[key] || {
    conversationId,
    url: location.href,
    updatedAt: Date.now(),
    entries: []
  };

  const entries = Array.isArray(session.entries) ? session.entries : [];

  // Prevent duplicate storage writes:
  // 1) Prefer stable turn ids when present.
  // 2) If Gemini rewrites DOM fragments while streaming, only keep the richer answer snapshot.
  const existingIndex = entries.findIndex((item) => item.id === turn.id);
  let changed = false;

  if (existingIndex >= 0) {
    const oldTurn = entries[existingIndex];
    if ((turn.answerMarkdown || "").length > (oldTurn.answerMarkdown || "").length) {
      entries[existingIndex] = { ...oldTurn, ...turn };
      changed = true;
    }
  } else {
    const newFp = buildTurnFingerprint(turn);
    const maybeDuplicateIndex = entries.findIndex((item) => {
      if (buildTurnFingerprint(item) !== newFp) return false;
      return Math.abs((item.timestamp || 0) - (turn.timestamp || 0)) <= 3 * 60 * 1000;
    });

    if (maybeDuplicateIndex >= 0) {
      const oldTurn = entries[maybeDuplicateIndex];
      if ((turn.answerMarkdown || "").length > (oldTurn.answerMarkdown || "").length) {
        entries[maybeDuplicateIndex] = { ...oldTurn, ...turn, id: oldTurn.id };
        changed = true;
      }
    } else {
      entries.push(turn);
      changed = true;
    }
  }

  if (!changed) return;

  entries.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  await storageSet({
    [key]: {
      conversationId,
      url: location.href,
      updatedAt: Date.now(),
      entries
    }
  });
}

function queueStorageWrite(turn) {
  writeQueue = writeQueue
    .then(() => persistTurnDirectly(turn))
    .catch((error) => {
      console.error("[Gemini Timeline] direct storage write failed", error);
    });
}

function sendTurnToSidePanel(turn, conversationId = currentConversationId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "GEMINI_TURN_CAPTURED",
        payload: {
          conversationId,
          url: location.href,
          turn
        }
      },
      (response) => {
        if (chrome.runtime.lastError || !response?.ok) {
          resolve(false);
          return;
        }
        resolve(true);
      }
    );
  });
}

async function emitTurn(turn) {
  if (!turn?.id) return;
  const conversationId = resolveEffectiveConversationId(true);
  if (!isConcreteConversationId(conversationId)) return;
  if (conversationId !== currentConversationId) {
    currentConversationId = conversationId;
  }

  // Avoid duplicate emits for the same turn id while Gemini is still reshaping the DOM.
  if (knownTurnIds.has(turn.id)) return;
  knownTurnIds.add(turn.id);

  // Always persist locally so capture does not depend on side panel lifecycle.
  queueStorageWrite(turn);
  await sendTurnToSidePanel(turn, conversationId);
}

function buildTurnFromPair(userNode, responseNode, index) {
  const rawQuestion = getUserText(userNode);
  const normalizedRawQuestion = normalizeText(rawQuestion);
  const branchMarkerDetected = Boolean(extractBranchPromptMarker(normalizedRawQuestion));
  const followupMarkerDetected = /\[follow-up\]/i.test(normalizedRawQuestion);
  if (branchMarkerDetected || followupMarkerDetected) {
    markBranchTurnNodeHidden(userNode);
    markBranchTurnNodeHidden(responseNode);
    return null;
  }
  const question = extractFollowupQuestion(stripBranchPromptMarker(rawQuestion));
  const answerMarkdown = getResponseMarkdown(responseNode);

  if (!question || isNoiseQuestionText(question) || !answerMarkdown) return null;
  if (isNoiseResponseText(answerMarkdown)) return null;

  const q = normalizeFingerprintText(question);
  const a = normalizeFingerprintText(answerMarkdown);
  if (!q || !a) return null;

  if (q === a) return null;
  const turnId = buildTurnId(q, a);
  const cachedTimestamp = Number(knownTurnTimestampMap.get(turnId)) || 0;
  const stableTimestamp = cachedTimestamp > 0 ? cachedTimestamp : Date.now();
  if (!cachedTimestamp) {
    knownTurnTimestampMap.set(turnId, stableTimestamp);
    if (knownTurnTimestampMap.size > 2400) {
      const oldestKey = knownTurnTimestampMap.keys().next().value;
      if (oldestKey) knownTurnTimestampMap.delete(oldestKey);
    }
  }

  return {
    // Keep a stable timestamp per synthesized turn id so rerenders do not create fake "new" turns.
    id: turnId,
    question,
    answerMarkdown,
    summary: summarize(answerMarkdown),
    timestamp: stableTimestamp,
    domIndex: index
  };
}

function finalizePair(userNode, responseNode, index) {
  if (!responseNode || !responseNode.isConnected) return;
  if (userNode && !userNode.isConnected) return;

  // If the answer is still streaming, wait and retry so we capture the completed content once.
  if (isLikelyStreaming(responseNode)) {
    scheduleFinalize(userNode, responseNode, index);
    return;
  }

  const turn = buildTurnFromPair(userNode, responseNode, index);
  if (!turn) return;

  // Keep a single turn mapping per response node to prevent duplicate main annotations.
  for (const [id, refs] of Array.from(domEntryMap.entries())) {
    if (id === turn.id) continue;
    if (refs?.responseNode === responseNode) {
      domEntryMap.delete(id);
    }
  }
  domEntryMap.set(turn.id, { userNode: userNode || null, responseNode });
  if (responseNode instanceof Element) {
    finalizedResponseSignatureMap.set(responseNode, getNodeContentSignature(responseNode));
  }
  emitTurn(turn).catch((error) => {
    console.error("[Gemini Timeline] emit turn failed", error);
  });
}

function scheduleFinalize(userNode, responseNode, index) {
  const oldTimer = responseFinalizeTimers.get(responseNode);
  if (oldTimer) {
    clearTimeout(oldTimer);
  }

  const timer = setTimeout(() => {
    finalizePair(userNode, responseNode, index);
  }, RESPONSE_STABLE_MS);

  responseFinalizeTimers.set(responseNode, timer);
}

function collectSearchRoots(root) {
  const roots = [];
  const queue = [];

  if (!root) return roots;
  roots.push(root);
  queue.push(root);

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current.querySelectorAll !== "function") continue;

    current.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) {
        roots.push(el.shadowRoot);
        queue.push(el.shadowRoot);
      }
    });
  }

  return roots;
}

function queryUniqueNodes(root, selectors) {
  const seen = new Set();
  const list = [];
  const roots = collectSearchRoots(root);

  roots.forEach((searchRoot) => {
    selectors.forEach((selector) => {
      searchRoot.querySelectorAll(selector).forEach((node) => {
        if (seen.has(node)) return;
        seen.add(node);
        list.push(node);
      });
    });
  });

  return list;
}

function sortNodesByVisualOrder(nodes) {
  return nodes.slice().sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();

    const topDiff = ra.top - rb.top;
    if (Math.abs(topDiff) > 6) return topDiff;

    return ra.left - rb.left;
  });
}

function keepLongestPerTopBucket(candidates, bucketSize) {
  const best = new Map();

  candidates.forEach((candidate) => {
    const bucket = Math.round(candidate.rect.top / bucketSize);
    const current = best.get(bucket);
    if (!current || candidate.text.length > current.text.length) {
      best.set(bucket, candidate);
    }
  });

  return [...best.values()];
}

function dedupeMessageNodes(nodes, role) {
  const validItems = [];

  nodes.forEach((node) => {
    if (!(node instanceof Element)) return;

    const text = role === "assistant" ? getResponseMarkdown(node) : getUserText(node);
    const fp = normalizeFingerprintText(text).slice(0, 180);
    if (!fp) return;

    validItems.push({ node, text, fp, rect: node.getBoundingClientRect() });
  });

  validItems.sort((a, b) => a.rect.top - b.rect.top);

  const results = [];

  validItems.forEach((item) => {
    let isDuplicate = false;
    for (let i = results.length - 1; i >= 0; i--) {
      const prev = results[i];
      
      if (Math.abs(item.rect.top - prev.rect.top) > 150) {
        continue;
      }
      
      if (prev.node.contains(item.node) || item.node.contains(prev.node) || item.fp === prev.fp) {
        isDuplicate = true;
        if (item.text.length > prev.text.length) {
          results[i] = item;
        }
        break;
      }
    }
    
    if (!isDuplicate) {
      results.push(item);
    }
  });

  return sortNodesByVisualOrder(results.map((item) => item.node));
}

function inferMessageNodesByLayout(root) {
  if (!root || typeof root.querySelectorAll !== "function") {
    return { users: [], responses: [] };
  }

  const minTop = 90;
  const maxBottom = window.innerHeight - 110;
  const candidates = [];
  const seen = new Set();
  const userMinLeft = window.innerWidth * 0.42;
  const contentMinRight = window.innerWidth * 0.3;

  root.querySelectorAll("div, p, article, section, li, pre").forEach((el) => {
    if (!(el instanceof Element)) return;
    if (el.closest("#gtf-native-prompt-library, #gemini-followup-drawer, #gtf-native-folder-shell, #gtf-quick-quote-bar")) return;
    if (el.matches("button, [role='button'], label")) return;
    if (el.querySelector("textarea, input, button, [role='button']")) return;

    const rect = el.getBoundingClientRect();
    if (rect.width < 90 || rect.height < 18) return;
    if (rect.top < minTop || rect.bottom > maxBottom) return;
    if (rect.right < contentMinRight) return;

    const text = normalizeText(el.innerText || el.textContent || "");
    if (!text || text.length < 2 || text.length > 5000) return;
    if (isNoiseQuestionText(text) || isNoiseResponseText(text)) return;

    const childWithTextCount = [...el.children].filter((child) => {
      const childText = normalizeText(child.innerText || child.textContent || "");
      return childText.length > 0;
    }).length;
    if (childWithTextCount > 8) return;

    const key = `${Math.round(rect.top / 8)}|${text.slice(0, 60)}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ el, text, rect });
  });

  const reduced = keepLongestPerTopBucket(candidates, 28);
  const users = [];
  const responses = [];

  reduced.forEach((item) => {
    if (item.rect.left >= userMinLeft && item.text.length <= 1200) {
      users.push(item.el);
      return;
    }

    if (item.rect.left >= window.innerWidth * 0.2 && item.text.length >= 20) {
      responses.push(item.el);
    }
  });

  return {
    users: sortNodesByVisualOrder(users),
    responses: sortNodesByVisualOrder(responses)
  };
}

function filterCandidateNodes(nodes, role) {
  return nodes.filter((node) => {
    if (!(node instanceof Element)) return false;
    if (isComposerLikeNode(node)) return false;
    if (node.closest("#gtf-native-prompt-library, #gemini-followup-drawer, #gtf-native-folder-shell, #gtf-quick-quote-bar")) return false;
    if (node.matches("button, [role='button'], label")) return false;
    if (node.querySelector("textarea, input, button, [role='button']")) return false;

    const text = role === "assistant" ? getResponseMarkdown(node) : getUserText(node);
    if (!text) return false;
    if (role === "user" && isNoiseQuestionText(text)) return false;
    if (role === "assistant" && isNoiseResponseText(text)) return false;

    const rect = node.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 16) return false;
    // Keep a minimal geometry check only. Layout in Gemini changes frequently and
    // strict left/right thresholds can drop all turns unexpectedly.
    if (rect.right < window.innerWidth * 0.12) return false;

    return true;
  });
}

function isComposerLikeNode(node) {
  if (!(node instanceof Element)) return false;
  const directEditable = node.matches("textarea, input, rich-textarea, [contenteditable='true'], [role='textbox']");
  if (directEditable) return true;
  const inComposer = node.closest(
    "footer, form, rich-textarea, [class*='composer'], [class*='input-area'], [class*='prompt'], [data-testid*='input'], [data-test-id*='input']"
  );
  if (inComposer) return true;
  return Boolean(node.querySelector("textarea, input, [contenteditable='true'], [role='textbox']"));
}

function getNodesByTextFallback(root, role) {
  if (!root || typeof root.querySelectorAll !== "function") return [];
  const nodes = [];
  const seen = new Set();
  root.querySelectorAll("article, section, div, li, p").forEach((el) => {
    if (!(el instanceof Element)) return;
    if (isComposerLikeNode(el)) return;
    if (el.closest("#gtf-native-prompt-library, #gemini-followup-drawer, #gtf-native-folder-shell, #gtf-quick-quote-bar")) return;
    if (el.matches("button, [role='button'], label")) return;
    if (el.querySelector("textarea, input, button, [role='button']")) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 70 || rect.height < 16) return;
    const text = role === "assistant" ? getResponseMarkdown(el) : getUserText(el);
    if (!text) return;
    if (role === "assistant" && text.length < 20) return;
    if (role === "user" && text.length < 2) return;
    if (role === "user" && isNoiseQuestionText(text)) return;
    if (role === "assistant" && isNoiseResponseText(text)) return;
    const fp = `${Math.round(rect.top / 14)}|${normalizeFingerprintText(text).slice(0, 96)}`;
    if (!fp || seen.has(fp)) return;
    seen.add(fp);
    nodes.push(el);
  });
  return sortNodesByVisualOrder(dedupeMessageNodes(nodes, role));
}

function getMessageNodes(root) {
  let users = sortNodesByVisualOrder(filterCandidateNodes(queryUniqueNodes(root, USER_QUERY_SELECTORS), "user"));
  let responses = sortNodesByVisualOrder(filterCandidateNodes(queryUniqueNodes(root, MODEL_RESPONSE_SELECTORS), "assistant"));

  if (!users.length || !responses.length) {
    const fallback = inferMessageNodesByLayout(root);
    if (!users.length) users = fallback.users;
    if (!responses.length) responses = fallback.responses;
  }

  // Last-resort text fallback: prefer recall over precision when DOM selectors drift.
  if (!users.length) {
    users = getNodesByTextFallback(root, "user");
  }
  if (!responses.length) {
    responses = getNodesByTextFallback(root, "assistant");
  }

  users = dedupeMessageNodes(users, "user");
  responses = dedupeMessageNodes(responses, "assistant");

  return { users, responses };
}

function getLooseAssistantNodes(root) {
  if (!root || typeof root.querySelectorAll !== "function") return [];

  const candidates = [];
  const seen = new Set();

  root.querySelectorAll("model-response, model-response-content, chat-response, article, section").forEach((node) => {
    if (!(node instanceof Element)) return;

    const rect = node.getBoundingClientRect();
    if (rect.width < 180 || rect.height < 28) return;
    if (rect.left < window.innerWidth * 0.08) return;
    if (rect.right < window.innerWidth * 0.28) return;

    const text = getResponseMarkdown(node);
    if (isNoiseResponseText(text)) return;

    const fp = normalizeFingerprintText(text).slice(0, 180);
    if (!fp) return;

    const key = `${Math.round(rect.top / 18)}|${fp}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ node, text, rect });
  });

  const bestByBucket = new Map();
  candidates.forEach((item) => {
    const bucket = Math.round(item.rect.top / 26);
    const current = bestByBucket.get(bucket);
    if (!current || item.text.length > current.text.length) {
      bestByBucket.set(bucket, item);
    }
  });

  return sortNodesByVisualOrder([...bestByBucket.values()].map((item) => item.node));
}

function pairConversationNodes(users, responses) {
  const orderedUsers = sortNodesByVisualOrder(Array.isArray(users) ? users : []);
  const orderedResponses = sortNodesByVisualOrder(Array.isArray(responses) ? responses : []);

  if (!orderedResponses.length) return [];
  if (!orderedUsers.length) {
    return orderedResponses.map((responseNode, index) => ({ userNode: null, responseNode, index }));
  }

  let cursor = 0;
  return orderedResponses.map((responseNode, index) => {
    const responseTop = responseNode.getBoundingClientRect().top;

    while (cursor + 1 < orderedUsers.length) {
      const nextTop = orderedUsers[cursor + 1].getBoundingClientRect().top;
      if (nextTop > responseTop + 20) break;
      cursor += 1;
    }

    const candidate = orderedUsers[cursor] || null;
    const userNode =
      candidate && candidate.getBoundingClientRect().top <= responseTop + 28 ? candidate : null;

    return { userNode, responseNode, index };
  });
}

function pickChatContainer() {
  let fallbackCandidate = null;
  for (const selector of CHAT_VIEW_SELECTORS) {
    const node = document.querySelector(selector);
    if (!node) continue;
    if (!(node instanceof Element)) continue;

    const { users, responses } = getMessageNodes(node);
    if (users.length || responses.length) {
      return node;
    }
    if (!fallbackCandidate && isVisible(node)) {
      fallbackCandidate = node;
    }
  }

  return fallbackCandidate;
}

function isSidebarMutationTarget(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest("#gtf-native-folder-shell, #gtf-native-chat-timeline-root, #gtf-native-main-note-root")) {
    return true;
  }
  return Boolean(
    target.closest(
      "aside, nav, [role='navigation'], [class*='sidebar'], [class*='drawer'], [class*='sidenav'], [data-test-id*='side-nav']"
    )
  );
}

function shouldProcessChatMutations(records) {
  if (!Array.isArray(records) || !records.length) return true;
  let meaningful = 0;
  for (let i = 0; i < records.length && i < 30; i += 1) {
    const record = records[i];
    const target = record?.target;
    if (isSidebarMutationTarget(target)) continue;
    const added = Number(record?.addedNodes?.length || 0);
    const removed = Number(record?.removedNodes?.length || 0);
    if (added || removed || record?.type === "characterData") {
      meaningful += 1;
      if (meaningful >= 2) return true;
    }
  }
  return meaningful > 0;
}

function ensureNativeMainNoteStyle() {
  if (document.getElementById("gtf-native-main-note-style")) return;
  const style = document.createElement("style");
  style.id = "gtf-native-main-note-style";
  style.textContent = `
    .gtf-native-main-note {
      width: min(100%, 860px);
      margin: 6px auto 10px;
      padding: 8px 10px;
      border: 1px solid rgba(60, 60, 67, 0.18);
      border-radius: 12px;
      background: rgba(250, 252, 255, 0.96);
      transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
    }
    .gtf-native-main-note.is-share-focus {
      border-color: rgba(47, 122, 83, 0.42);
      background: rgba(244, 251, 247, 0.98);
      box-shadow: 0 0 0 3px rgba(47, 122, 83, 0.12);
    }
    .gtf-native-main-note-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 12px;
      color: #22303a;
    }
    .gtf-native-main-note-label {
      font-weight: 600;
    }
    .gtf-native-main-note-head-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .gtf-native-main-note-nav {
      min-height: 26px;
      padding: 0 9px;
      border-radius: 999px;
      border: 1px solid rgba(84, 104, 124, 0.14);
      background: rgba(255, 255, 255, 0.96);
      color: #4f6275;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease, opacity 160ms ease;
    }
    .gtf-native-main-note-nav:hover {
      border-color: rgba(84, 104, 124, 0.28);
      background: rgba(247, 250, 252, 0.98);
      color: #314252;
    }
    .gtf-native-main-note-nav:disabled {
      opacity: 0.45;
      cursor: default;
    }
    .gtf-native-main-note-nav[hidden] {
      display: none !important;
    }
    .gtf-native-main-note-jump {
      min-height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid rgba(47, 122, 83, 0.18);
      background: rgba(248, 252, 249, 0.98);
      color: #2f6d4c;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
    }
    .gtf-native-main-note-jump:hover {
      border-color: rgba(47, 122, 83, 0.34);
      background: rgba(236, 247, 241, 0.98);
      color: #23553a;
    }
    .gtf-native-main-note-jump[hidden] {
      display: none !important;
    }
    .gtf-native-main-note-status {
      font-size: 12px;
      color: #5f7285;
      white-space: nowrap;
    }
    .gtf-native-main-note-status.error {
      color: #b42318;
    }
    .gtf-native-main-note textarea {
      width: 100%;
      min-height: 56px;
      max-height: 170px;
      resize: vertical;
      border-radius: 10px;
      border: 1px solid rgba(60, 60, 67, 0.24);
      padding: 7px 9px;
      font-size: 12px;
      line-height: 1.45;
      background: #fff;
      color: #1f2937;
      box-sizing: border-box;
    }
    .gtf-native-main-note textarea:focus {
      outline: none;
      border-color: #4f8df7;
      box-shadow: 0 0 0 2px rgba(79, 141, 247, 0.16);
    }
    .gtf-native-main-note-foot {
      margin-top: 4px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      font-size: 11px;
      color: #6b7280;
    }
  `;
  document.documentElement.appendChild(style);
}

function ensureNativePromptLibraryStyle() {
  if (document.getElementById("gtf-prompt-library-style")) return;
  const style = document.createElement("style");
  style.id = "gtf-prompt-library-style";
  style.textContent = `
    #gtf-native-prompt-library {
      --gtf-prompt-panel-width: 320px;
      --gtf-prompt-accent: #2f7a53;
      --gtf-prompt-accent-soft: #e8f5ec;
      --gtf-prompt-accent-softer: #f0fdf4;
      --gtf-prompt-accent-border: #bbd8c4;
      --gtf-prompt-card-border: #cce4dc;
      --gtf-prompt-card-shadow: 0 10px 24px rgba(47, 122, 83, 0.05);
      --gtf-prompt-text-main: #27543e;
      --gtf-prompt-text-subtle: #5d7667;
      position: relative;
      z-index: 2147483644;
      display: inline-flex;
      align-items: center;
      flex: 0 0 auto;
      pointer-events: auto;
      font-family: inherit;
      margin: 0 4px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-trigger {
      height: 36px;
      min-height: 36px;
      padding: 0 16px;
      border-radius: 18px;
      border: 1px solid rgba(187, 216, 196, 0.85);
      background: rgba(232, 245, 236, 0.82);
      color: var(--gtf-prompt-text-main);
      font-size: 14px;
      font-weight: 600;
      line-height: 1;
      box-shadow: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      margin: 0;
      transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease;
      -webkit-user-select: none;
      user-select: none;
    }
    #gtf-native-prompt-library .gtf-prompt-library-trigger-icon {
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    #gtf-native-prompt-library .gtf-prompt-library-trigger-icon svg {
      width: 20px;
      height: 20px;
      display: block;
      fill: currentColor;
    }
    #gtf-native-prompt-library .gtf-prompt-library-trigger-label {
      display: inline-flex;
      align-items: center;
      min-width: 0;
      line-height: 1;
    }
    #gtf-native-prompt-library .gtf-prompt-library-trigger:hover {
      background-color: var(--gtf-prompt-accent-soft);
      color: #1f5f41;
      border-color: #9fc5ab;
      box-shadow: 0 4px 10px rgba(47, 122, 83, 0.08);
    }
    #gtf-native-prompt-library .gtf-prompt-library-trigger.active {
      background-color: var(--gtf-prompt-accent-soft);
      color: #1f5f41;
      border-color: #9fc5ab;
      box-shadow: inset 0 0 0 1px rgba(47, 122, 83, 0.06);
    }
    #gtf-native-prompt-library .gtf-prompt-library-trigger:active {
      background-color: #dceddf;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-trigger {
      background: rgba(111, 168, 131, 0.18);
      color: #d7f0de;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-trigger:hover {
      background-color: rgba(111, 168, 131, 0.28);
      color: #eefbf2;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-trigger.active {
      background-color: rgba(111, 168, 131, 0.30);
      color: #eefbf2;
    }
    #gtf-native-prompt-library .gtf-prompt-library-trigger:focus-visible {
      outline: 2px solid var(--gtf-prompt-accent);
      outline-offset: 2px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-panel {
      position: fixed;
      inset: auto;
      left: 12px;
      top: 12px;
      right: auto;
      bottom: auto;
      width: min(320px, calc(100vw - 24px));
      border-radius: 16px;
      border: 1px solid #e5ebf3;
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 16px 36px rgba(15, 23, 42, 0.10), 0 2px 8px rgba(15, 23, 42, 0.04);
      backdrop-filter: blur(16px);
      overflow: hidden;
      transform-origin: top left;
      animation: gtfPromptPanelIn 180ms cubic-bezier(0.19, 1, 0.22, 1);
    }
    @keyframes gtfPromptPanelIn {
      from {
        opacity: 0;
        transform: translateY(6px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    #gtf-native-prompt-library[data-expand='up'] .gtf-prompt-library-panel {
      transform-origin: bottom right;
    }
    #gtf-native-prompt-library[data-expand='down'] .gtf-prompt-library-panel {
      transform-origin: top right;
    }
    #gtf-native-prompt-library .gtf-prompt-library-panel[hidden] {
      display: none;
    }
    #gtf-native-prompt-library .gtf-prompt-library-head {
      display: grid;
      gap: 8px;
      padding: 14px 14px 12px;
      border-bottom: 1px solid #edf2f7;
      background: #ffffff;
    }
    #gtf-native-prompt-library .gtf-prompt-library-head-copy {
      min-width: 0;
    }
    #gtf-native-prompt-library .gtf-prompt-library-head-copy > * {
      max-width: 100%;
    }
    #gtf-native-prompt-library .gtf-prompt-library-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    }
    #gtf-native-prompt-library .gtf-prompt-library-subtitle {
      margin: 3px 0 0;
      font-size: 10px;
      color: #94a3b8;
    }
    #gtf-native-prompt-library .gtf-prompt-library-head-actions,
    #gtf-native-prompt-library .gtf-prompt-library-card-actions,
    #gtf-native-prompt-library .gtf-prompt-library-editor-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
    }
    #gtf-native-prompt-library .gtf-prompt-library-head-actions {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 4px;
      padding-top: 2px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-head-btn,
    #gtf-native-prompt-library .gtf-prompt-library-mini-btn,
    #gtf-native-prompt-library .gtf-prompt-library-save-btn,
    #gtf-native-prompt-library .gtf-prompt-library-cancel-btn {
      display: inline-flex;
      align-items: center;
      min-height: 30px;
      padding: 0 10px;
      border-radius: 9px;
      border: 1px solid #e7edf5;
      background: #fbfdff;
      color: #526579;
      font-size: 10px;
      line-height: 1;
      vertical-align: middle;
      cursor: pointer;
    }
    #gtf-native-prompt-library .gtf-prompt-library-head-btn {
      min-width: 0;
      width: 100%;
      justify-content: center;
      gap: 5px;
      padding: 0 8px;
      transition: border-color 120ms ease, background-color 120ms ease, color 120ms ease, transform 120ms ease;
    }
    #gtf-native-prompt-library .gtf-prompt-library-head-btn:hover,
    #gtf-native-prompt-library .gtf-prompt-library-mini-btn:hover,
    #gtf-native-prompt-library .gtf-prompt-library-save-btn:hover,
    #gtf-native-prompt-library .gtf-prompt-library-cancel-btn:hover {
      transform: none;
      border-color: #d5e1ef;
      background: #ffffff;
      color: #334155;
    }
    #gtf-native-prompt-library .gtf-prompt-library-head-btn-icon {
      width: 12px;
      height: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      align-self: center;
      transform: translateY(-0.5px);
    }
    #gtf-native-prompt-library .gtf-prompt-library-head-btn-icon svg {
      width: 12px;
      height: 12px;
      fill: currentColor;
      display: block;
    }
    #gtf-native-prompt-library .gtf-prompt-library-head-btn-label {
      display: inline-flex;
      align-items: center;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1;
    }
    #gtf-native-prompt-library .gtf-prompt-library-mini-btn.danger {
      color: #a63131;
      background: #fff7f7;
    }
    #gtf-native-prompt-library .gtf-prompt-library-mini-btn.icon-only {
      width: 28px;
      min-width: 28px;
      padding: 0;
      justify-content: center;
      background: transparent;
    }
    #gtf-native-prompt-library .gtf-prompt-library-mini-btn.icon-only svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
      display: block;
    }
    #gtf-native-prompt-library .gtf-prompt-library-status {
      margin: 0;
      padding: 0 14px 10px;
      font-size: 12px;
      color: var(--gtf-prompt-text-subtle);
    }
    #gtf-native-prompt-library .gtf-prompt-library-status.error {
      color: #b42318;
    }
    #gtf-native-prompt-library .gtf-prompt-library-search {
      padding: 0 14px 10px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-search-input {
      width: 100%;
      box-sizing: border-box;
      min-height: 34px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid var(--gtf-prompt-accent-border);
      background: rgba(255, 255, 255, 0.96);
      color: #234734;
      outline: none;
      font-size: 11px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-search-input:focus {
      border-color: var(--gtf-prompt-accent);
      box-shadow: 0 0 0 2px rgba(47, 122, 83, 0.14);
    }
    #gtf-native-prompt-library .gtf-prompt-library-filter-bar {
      display: flex;
      gap: 8px;
      padding: 0 14px 12px;
      overflow-x: auto;
    }
    #gtf-native-prompt-library .gtf-prompt-library-filter-btn {
      flex: 0 0 auto;
      min-height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid var(--gtf-prompt-accent-border);
      background: #f6fbf7;
      color: var(--gtf-prompt-text-subtle);
      font-size: 11px;
      cursor: pointer;
      transition: border-color 120ms ease, background-color 120ms ease, color 120ms ease, transform 120ms ease;
    }
    #gtf-native-prompt-library .gtf-prompt-library-filter-btn:hover {
      transform: translateY(-1px);
      border-color: #9fc5ab;
      background: var(--gtf-prompt-accent-soft);
    }
    #gtf-native-prompt-library .gtf-prompt-library-filter-btn.active {
      border-color: #9fc5ab;
      background: var(--gtf-prompt-accent-soft);
      color: var(--gtf-prompt-accent);
    }
    #gtf-native-prompt-library .gtf-prompt-library-recent {
      padding: 0 14px 12px;
      display: grid;
      gap: 8px;
      border-bottom: 1px solid rgba(187, 216, 196, 0.72);
    }
    #gtf-native-prompt-library .gtf-prompt-library-recent[hidden] {
      display: none;
    }
    #gtf-native-prompt-library .gtf-prompt-library-recent-title {
      margin: 0 0 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--gtf-prompt-text-main);
    }
    #gtf-native-prompt-library .gtf-prompt-library-recent-list {
      display: grid;
      gap: 6px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-empty {
      margin: 0;
      padding: 0 14px 14px;
      font-size: 12px;
      color: var(--gtf-prompt-text-subtle);
    }
    #gtf-native-prompt-library .gtf-prompt-library-list {
      display: grid;
      gap: 6px;
      max-height: 260px;
      padding: 0 14px 14px;
      overflow: auto;
      grid-template-columns: 1fr;
    }
    #gtf-native-prompt-library .gtf-prompt-library-group {
      display: grid;
      gap: 6px;
      grid-column: 1 / -1;
    }
    #gtf-native-prompt-library .gtf-prompt-library-group-head {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: 8px;
      min-height: 34px;
      padding: 0 10px;
      border: 1px solid var(--gtf-prompt-accent-border);
      border-radius: 8px;
      background: #f6fbf7;
      color: var(--gtf-prompt-text-main);
      cursor: pointer;
      text-align: left;
      font-size: 11px;
      font-weight: 500;
      transition: border-color 120ms ease, background-color 120ms ease, transform 120ms ease;
    }
    #gtf-native-prompt-library .gtf-prompt-library-group-head:hover {
      transform: none;
      border-color: #9fc5ab;
      background: var(--gtf-prompt-accent-soft);
    }
    #gtf-native-prompt-library .gtf-prompt-library-group-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #gtf-native-prompt-library .gtf-prompt-library-group-meta,
    #gtf-native-prompt-library .gtf-prompt-library-group-caret {
      color: var(--gtf-prompt-text-subtle);
      font-weight: 500;
    }
    #gtf-native-prompt-library .gtf-prompt-library-group-body {
      display: grid;
      gap: 8px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-card {
      width: 100%;
      text-align: left;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--gtf-prompt-card-border);
      background: #ffffff;
      cursor: pointer;
      transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms ease;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-card:hover {
      background-color: var(--gtf-prompt-accent-softer);
      border-color: #9fc5ab;
      box-shadow: 0 6px 14px rgba(47, 122, 83, 0.04);
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-card {
      background: #1e1f20;
      border-color: #444746;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-card:hover {
      background-color: #282a2d;
      border-color: #8fbc9d;
    }
    #gtf-native-prompt-library .gtf-prompt-library-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-card-title-wrap {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-card-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--gtf-prompt-text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-card-title {
      color: #e3e3e3;
    }
    #gtf-native-prompt-library .gtf-prompt-library-card-actions {
      display: flex;
      gap: 2px;
      opacity: 0;
      transition: opacity 200ms ease;
    }
    #gtf-native-prompt-library .gtf-prompt-library-card:hover .gtf-prompt-library-card-actions {
      opacity: 1;
    }
    #gtf-native-prompt-library .gtf-prompt-library-group-chip {
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      background: var(--gtf-prompt-accent-softer);
      color: var(--gtf-prompt-accent);
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-group-chip {
      background: #333537;
      color: #c4c7c5;
    }
    #gtf-native-prompt-library .gtf-prompt-library-card-body {
      font-size: 10px;
      color: var(--gtf-prompt-text-subtle);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-card-body {
      color: #c4c7c5;
    }
    #gtf-native-prompt-library .gtf-prompt-library-card.sortable {
      cursor: grab;
    }
    #gtf-native-prompt-library .gtf-prompt-library-card.dragging {
      opacity: 0.5;
    }
    #gtf-native-prompt-library .gtf-prompt-library-card.drag-over {
      border-color: var(--gtf-prompt-accent);
      background-color: var(--gtf-prompt-accent-soft);
    }
    #gtf-native-prompt-library .gtf-prompt-library-card.compact {
      padding: 8px 12px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-group-chip.template {
      background: #dff3e4;
      color: #2f7a53;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-group-chip.template {
      background: rgba(111, 168, 131, 0.18);
      color: #b8e0c4;
    }
    #gtf-native-prompt-library .gtf-prompt-library-editor {
      padding: 0 14px 14px;
      border-top: 1px solid rgba(187, 216, 196, 0.8);
      background: rgba(240, 253, 244, 0.64);
    }
    #gtf-native-prompt-library .gtf-prompt-library-editor[hidden] {
      display: none;
    }
    #gtf-native-prompt-library .gtf-prompt-library-template-dialog {
      margin: 0 14px 14px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--gtf-prompt-accent-border);
      background: rgba(240, 253, 244, 0.96);
    }
    #gtf-native-prompt-library .gtf-prompt-library-template-dialog[hidden] {
      display: none;
    }
    #gtf-native-prompt-library .gtf-prompt-library-template-title {
      margin: 0 0 4px;
      font-size: 13px;
      font-weight: 700;
      color: var(--gtf-prompt-text-main);
    }
    #gtf-native-prompt-library .gtf-prompt-library-template-hint {
      margin: 0 0 10px;
      font-size: 12px;
      color: var(--gtf-prompt-text-subtle);
    }
    #gtf-native-prompt-library .gtf-prompt-library-template-fields {
      display: grid;
      gap: 8px;
      margin-bottom: 10px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-template-row {
      display: grid;
      gap: 4px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-template-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--gtf-prompt-text-main);
    }
    #gtf-native-prompt-library .gtf-prompt-library-template-input {
      width: 100%;
      box-sizing: border-box;
      min-height: 34px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid var(--gtf-prompt-accent-border);
      background: rgba(255, 255, 255, 0.98);
      color: #234734;
      outline: none;
      font-size: 12px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-template-input:focus {
      border-color: var(--gtf-prompt-accent);
      box-shadow: 0 0 0 2px rgba(47, 122, 83, 0.14);
    }
    #gtf-native-prompt-library .gtf-prompt-library-template-input::placeholder,
    #gtf-native-prompt-library .gtf-prompt-library-search-input::placeholder,
    #gtf-native-prompt-library .gtf-prompt-library-input::placeholder,
    #gtf-native-prompt-library .gtf-prompt-library-textarea::placeholder {
      color: #88a08f;
    }
    #gtf-native-prompt-library .gtf-prompt-library-template-actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-editor-title {
      margin: 10px 0 8px;
      font-size: 11px;
      font-weight: 600;
      color: var(--gtf-prompt-text-main);
    }
    #gtf-native-prompt-library .gtf-prompt-library-input,
    #gtf-native-prompt-library .gtf-prompt-library-textarea {
      width: 100%;
      box-sizing: border-box;
      border-radius: 8px;
      border: 1px solid var(--gtf-prompt-accent-border);
      background: rgba(255, 255, 255, 0.96);
      color: #234734;
      padding: 9px 12px;
      font-size: 11px;
      outline: none;
    }
    #gtf-native-prompt-library .gtf-prompt-library-input:focus,
    #gtf-native-prompt-library .gtf-prompt-library-textarea:focus {
      border-color: var(--gtf-prompt-accent);
      box-shadow: 0 0 0 2px rgba(47, 122, 83, 0.14);
    }
    #gtf-native-prompt-library .gtf-prompt-library-input {
      margin-bottom: 8px;
    }
    #gtf-native-prompt-library .gtf-prompt-library-textarea {
      min-height: 110px;
      max-height: 220px;
      resize: vertical;
      line-height: 1.55;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-trigger {
      background: rgba(111, 168, 131, 0.18);
      border-color: rgba(111, 168, 131, 0.28);
      color: #d7f0de;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-panel {
      border-color: rgba(111, 168, 131, 0.28);
      background: rgba(16, 31, 24, 0.96);
      box-shadow: 0 18px 40px rgba(7, 19, 13, 0.34);
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-head,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-editor {
      border-color: rgba(111, 168, 131, 0.18);
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-title,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-card-title,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-editor-title {
      color: #e1f3e7;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-subtitle,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-card-body,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-empty,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-status,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-recent-title {
      color: #a7c5b1;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-group-head,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-template-hint,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-template-label {
      color: #b5d6c0;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-group-head {
      border-color: rgba(111, 168, 131, 0.2);
      background: rgba(26, 46, 36, 0.72);
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-group-head:hover {
      border-color: rgba(151, 201, 168, 0.34);
      background: rgba(33, 59, 46, 0.92);
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-head-btn,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-mini-btn,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-save-btn,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-cancel-btn {
      border-color: rgba(111, 168, 131, 0.24);
      background: rgba(21, 44, 33, 0.92);
      color: #d7f0de;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-mini-btn.danger {
      background: rgba(76, 29, 29, 0.58);
      color: #fecaca;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-filter-btn {
      border-color: rgba(111, 168, 131, 0.24);
      background: rgba(28, 57, 42, 0.88);
      color: #b5d6c0;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-filter-btn.active {
      border-color: rgba(151, 201, 168, 0.36);
      background: rgba(78, 128, 96, 0.28);
      color: #e1f3e7;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-group-chip {
      background: rgba(78, 128, 96, 0.28);
      color: #d7f0de;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-search-input {
      border-color: rgba(111, 168, 131, 0.22);
      background: rgba(18, 39, 29, 0.92);
      color: #e1f3e7;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-input,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-textarea,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-template-input {
      border-color: rgba(111, 168, 131, 0.22);
      background: rgba(18, 39, 29, 0.92);
      color: #e1f3e7;
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-template-dialog {
      border-color: rgba(148, 163, 184, 0.12);
      background: rgba(24, 35, 58, 0.88);
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-recent {
      border-color: rgba(148, 163, 184, 0.08);
    }
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-template-input::placeholder,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-search-input::placeholder,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-input::placeholder,
    #gtf-native-prompt-library[data-theme='dark'] .gtf-prompt-library-textarea::placeholder {
      color: #88a0bb;
    }
    @media (prefers-reduced-motion: reduce) {
      #gtf-native-prompt-library .gtf-prompt-library-panel {
        animation: none;
      }
      #gtf-native-prompt-library .gtf-prompt-library-trigger,
      #gtf-native-prompt-library .gtf-prompt-library-head-btn,
      #gtf-native-prompt-library .gtf-prompt-library-mini-btn,
      #gtf-native-prompt-library .gtf-prompt-library-save-btn,
      #gtf-native-prompt-library .gtf-prompt-library-cancel-btn,
      #gtf-native-prompt-library .gtf-prompt-library-filter-btn,
      #gtf-native-prompt-library .gtf-prompt-library-group-head,
      #gtf-native-prompt-library .gtf-prompt-library-card {
        transition: none;
      }
      #gtf-native-prompt-library .gtf-prompt-library-trigger:hover,
      #gtf-native-prompt-library .gtf-prompt-library-head-btn:hover,
      #gtf-native-prompt-library .gtf-prompt-library-mini-btn:hover,
      #gtf-native-prompt-library .gtf-prompt-library-save-btn:hover,
      #gtf-native-prompt-library .gtf-prompt-library-cancel-btn:hover,
      #gtf-native-prompt-library .gtf-prompt-library-filter-btn:hover,
      #gtf-native-prompt-library .gtf-prompt-library-group-head:hover,
      #gtf-native-prompt-library .gtf-prompt-library-card:hover {
        transform: none;
      }
    }
  `;
  document.documentElement.appendChild(style);
}

function scheduleNativePromptLibraryPosition() {
  if (nativePromptLibraryPositionRaf) return;
  nativePromptLibraryPositionRaf = requestAnimationFrame(() => {
    nativePromptLibraryPositionRaf = 0;
    if (!(nativePromptLibraryRoot instanceof HTMLElement)) return;
    const input = findComposerInput();
    if (!(input instanceof HTMLElement) || !isVisible(input)) {
      nativePromptLibraryRoot.classList.remove("open");
      return;
    }
    if (!placeNativePromptLibraryRoot(input)) {
      nativePromptLibraryRoot.classList.remove("open");
      return;
    }
    const preferredAnchor = nativePromptLibraryButton instanceof HTMLButtonElement && isVisible(nativePromptLibraryButton)
      ? nativePromptLibraryButton
      : input;
    const preferredRect = preferredAnchor.getBoundingClientRect();
    const composerScope = getComposerScopeRoot(input);
    const scopeRect = composerScope instanceof Element ? composerScope.getBoundingClientRect() : null;
    const isUsableRect = (rect) => Boolean(
      rect &&
      rect.width >= 24 &&
      rect.height >= 24 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight - 24 &&
      rect.left < window.innerWidth - 24
    );
    const hasConversationTurns = nativeChatTimelineTurnsCache.length > 0 || domEntryMap.size > 0;
    const inputRect = input.getBoundingClientRect();
    const useWelcomeComposerAnchor = !hasConversationTurns && isUsableRect(inputRect) && inputRect.width >= 240;
    
    const anchorRect = isUsableRect(preferredRect)
      ? preferredRect
      : (isUsableRect(inputRect) ? inputRect : null);
      
    const rect = useWelcomeComposerAnchor
      ? inputRect
      : (anchorRect || scopeRect || inputRect);

    const panelWidth = Math.min(320, Math.max(280, window.innerWidth - 24));
    const measuredPanelHeight = nativePromptLibraryPanel instanceof HTMLElement
      ? nativePromptLibraryPanel.offsetHeight
      : 0;
    const panelHeight = Math.min(
      Math.max(measuredPanelHeight || 0, nativePromptLibraryOpen ? 420 : 360),
      Math.max(240, window.innerHeight - 24)
    );

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldExpandUp = spaceBelow < Math.min(panelHeight, 360) && spaceAbove > spaceBelow;

    const left = useWelcomeComposerAnchor
      ? Math.max(12, Math.min(Math.round(rect.left + (rect.width / 2) - (panelWidth / 2)), window.innerWidth - panelWidth - 12))
      : Math.max(12, Math.min(Math.round(rect.right - panelWidth), window.innerWidth - panelWidth - 12));
    const top = shouldExpandUp
      ? Math.max(12, Math.round(rect.top - panelHeight - 8))
      : Math.min(window.innerHeight - panelHeight - 12, Math.round(rect.bottom + 8));
    nativePromptLibraryRoot.style.left = "";
    nativePromptLibraryRoot.style.top = "";
    nativePromptLibraryRoot.style.maxWidth = "";
    if (nativePromptLibraryPanel instanceof HTMLElement) {
      nativePromptLibraryPanel.style.inset = "auto";
      nativePromptLibraryPanel.style.left = `${left}px`;
      nativePromptLibraryPanel.style.top = `${top}px`;
      nativePromptLibraryPanel.style.right = "auto";
      nativePromptLibraryPanel.style.bottom = "auto";
      nativePromptLibraryPanel.style.maxWidth = `${panelWidth}px`;
      nativePromptLibraryPanel.style.maxHeight = `${Math.max(240, window.innerHeight - 24)}px`;
    }
    nativePromptLibraryRoot.dataset.expand = shouldExpandUp ? "up" : "down";
    nativePromptLibraryRoot.dataset.theme = detectGeminiTheme();
    nativePromptLibraryRoot.classList.add("open");
  });
}

async function renderNativePromptLibrary(force = false) {
  try {
    await loadPromptLibraryItems(force);
  } catch {
    // keep the UI alive with in-memory defaults if storage is temporarily unavailable
  }
  const input = findComposerInput();
  if (!input) {
    if (nativePromptLibraryRoot instanceof HTMLElement) {
      nativePromptLibraryRoot.classList.remove("open");
    }
    return;
  }
  ensureNativePromptLibraryStyle();
  if (!(nativePromptLibraryRoot instanceof HTMLElement) || !nativePromptLibraryRoot.isConnected) {
    const root = document.createElement("div");
    root.id = "gtf-native-prompt-library";
    root.dataset.theme = detectGeminiTheme();
    root.dataset.expand = "up";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "gtf-prompt-library-trigger";
    trigger.setAttribute("aria-expanded", "false");
    setNativePromptLibraryTriggerContent(trigger);

    const panel = document.createElement("section");
    panel.className = "gtf-prompt-library-panel";
    panel.hidden = true;

    const head = document.createElement("div");
    head.className = "gtf-prompt-library-head";
    const headCopy = document.createElement("div");
    headCopy.className = "gtf-prompt-library-head-copy";
    const title = document.createElement("h3");
    title.className = "gtf-prompt-library-title";
    title.textContent = ct("prompt_library_title");
    const subtitle = document.createElement("p");
    subtitle.className = "gtf-prompt-library-subtitle";
    subtitle.textContent = ct("prompt_library_subtitle");
    headCopy.append(title, subtitle);

    const headActions = document.createElement("div");
    headActions.className = "gtf-prompt-library-head-actions";
    const newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "gtf-prompt-library-head-btn gtf-prompt-library-new-btn";
    setPromptLibraryHeadButtonContent(newBtn, "new", ct("prompt_library_new"));
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "gtf-prompt-library-head-btn gtf-prompt-library-close-btn";
    setPromptLibraryHeadButtonContent(closeBtn, "close", ct("prompt_library_close"));
    const importBtn = document.createElement("button");
    importBtn.type = "button";
    importBtn.className = "gtf-prompt-library-head-btn gtf-prompt-library-import-btn";
    setPromptLibraryHeadButtonContent(importBtn, "import", ct("prompt_library_import"));
    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "gtf-prompt-library-head-btn gtf-prompt-library-export-btn";
    setPromptLibraryHeadButtonContent(exportBtn, "export", ct("prompt_library_export"));
    headActions.append(newBtn, importBtn, exportBtn, closeBtn);
    head.append(headCopy, headActions);

    const status = document.createElement("p");
    status.className = "gtf-prompt-library-status";
    status.dataset.i18nKey = "prompt_library_status_ready";
    status.textContent = ct("prompt_library_status_ready");

    const searchWrap = document.createElement("div");
    searchWrap.className = "gtf-prompt-library-search";
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "gtf-prompt-library-search-input";
    searchInput.placeholder = ct("prompt_library_search_placeholder");
    searchInput.autocomplete = "off";
    searchInput.setAttribute("aria-label", ct("prompt_library_search_placeholder"));
    searchWrap.appendChild(searchInput);

    const filterBar = document.createElement("div");
    filterBar.className = "gtf-prompt-library-filter-bar";

    const recentSection = document.createElement("section");
    recentSection.className = "gtf-prompt-library-recent";
    recentSection.hidden = true;
    const recentTitle = document.createElement("p");
    recentTitle.className = "gtf-prompt-library-recent-title";
    recentTitle.textContent = ct("prompt_library_recent_title");
    const recentList = document.createElement("div");
    recentList.className = "gtf-prompt-library-recent-list";
    recentSection.append(recentTitle, recentList);

    const importInput = document.createElement("input");
    importInput.type = "file";
    importInput.accept = "application/json,.json";
    importInput.hidden = true;

    const empty = document.createElement("p");
    empty.className = "gtf-prompt-library-empty";
    empty.textContent = ct("prompt_library_empty");

    const list = document.createElement("div");
    list.className = "gtf-prompt-library-list";

    const templateDialog = document.createElement("section");
    templateDialog.className = "gtf-prompt-library-template-dialog";
    templateDialog.hidden = true;
    const templateTitle = document.createElement("div");
    templateTitle.className = "gtf-prompt-library-template-title";
    templateTitle.textContent = ct("prompt_library_template_title");
    const templateHint = document.createElement("p");
    templateHint.className = "gtf-prompt-library-template-hint";
    templateHint.textContent = ct("prompt_library_template_hint");
    const templateFields = document.createElement("div");
    templateFields.className = "gtf-prompt-library-template-fields";
    const templateActions = document.createElement("div");
    templateActions.className = "gtf-prompt-library-template-actions";
    const templateCancelBtn = document.createElement("button");
    templateCancelBtn.type = "button";
    templateCancelBtn.className = "gtf-prompt-library-cancel-btn";
    templateCancelBtn.textContent = ct("prompt_library_cancel");
    const templateConfirmBtn = document.createElement("button");
    templateConfirmBtn.type = "button";
    templateConfirmBtn.className = "gtf-prompt-library-save-btn";
    templateConfirmBtn.textContent = ct("prompt_library_template_apply");
    templateActions.append(templateCancelBtn, templateConfirmBtn);
    templateDialog.append(templateTitle, templateHint, templateFields, templateActions);

    const editor = document.createElement("div");
    editor.className = "gtf-prompt-library-editor";
    editor.hidden = true;
    const editorTitle = document.createElement("div");
    editorTitle.className = "gtf-prompt-library-editor-title";
    editorTitle.textContent = ct("prompt_library_editor_new");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = PROMPT_LIBRARY_NAME_MAX_LENGTH;
    nameInput.className = "gtf-prompt-library-input";
    nameInput.placeholder = ct("prompt_library_name_placeholder");
    const groupInput = document.createElement("input");
    groupInput.type = "text";
    groupInput.maxLength = PROMPT_LIBRARY_GROUP_MAX_LENGTH;
    groupInput.className = "gtf-prompt-library-input";
    groupInput.placeholder = ct("prompt_library_group_placeholder");
    const textarea = document.createElement("textarea");
    textarea.maxLength = PROMPT_LIBRARY_TEXT_MAX_LENGTH;
    textarea.className = "gtf-prompt-library-textarea";
    textarea.placeholder = ct("prompt_library_text_placeholder");
    const editorActions = document.createElement("div");
    editorActions.className = "gtf-prompt-library-editor-actions";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "gtf-prompt-library-save-btn";
    saveBtn.textContent = ct("prompt_library_save");
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "gtf-prompt-library-cancel-btn";
    cancelBtn.textContent = ct("prompt_library_cancel");
    editorActions.append(saveBtn, cancelBtn);
    editor.append(editorTitle, nameInput, groupInput, textarea, editorActions);

    panel.append(head, status, searchWrap, filterBar, recentSection, empty, list, templateDialog, editor);
    root.append(trigger, panel, importInput);
    document.body.appendChild(root);

    nativePromptLibraryRoot = root;
    nativePromptLibraryButton = trigger;
    nativePromptLibraryPanel = panel;
    nativePromptLibraryStatusEl = status;
    nativePromptLibrarySearchInput = searchInput;
    nativePromptLibraryFilterBar = filterBar;
    nativePromptLibraryRecentListEl = recentList;
    nativePromptLibraryListEl = list;
    nativePromptLibraryEmptyEl = empty;
    nativePromptLibraryEditor = editor;
    nativePromptLibraryTemplateDialog = templateDialog;
    nativePromptLibraryTemplateFieldsEl = templateFields;
    nativePromptLibraryTemplateTitleEl = templateTitle;
    nativePromptLibraryTemplateConfirmBtn = templateConfirmBtn;
    nativePromptLibraryTemplateCancelBtn = templateCancelBtn;
    nativePromptLibraryNameInput = nameInput;
    nativePromptLibraryGroupInput = groupInput;
    nativePromptLibraryTextarea = textarea;
    nativePromptLibraryTitleEl = editorTitle;
    nativePromptLibrarySaveBtn = saveBtn;
    nativePromptLibraryCancelBtn = cancelBtn;
    nativePromptLibraryImportInput = importInput;
    nativePromptLibraryImportBtn = importBtn;
    nativePromptLibraryExportBtn = exportBtn;
    placeNativePromptLibraryRoot(input);

    trigger.addEventListener("click", () => {
      nativePromptLibraryOpen = !nativePromptLibraryOpen;
      panel.hidden = !nativePromptLibraryOpen;
      trigger.classList.toggle("active", nativePromptLibraryOpen);
      trigger.setAttribute("aria-expanded", nativePromptLibraryOpen ? "true" : "false");
      if (nativePromptLibraryOpen) {
        refreshNativePromptLibraryList();
      } else {
        closeNativePromptLibraryEditor();
      }
      scheduleNativePromptLibraryPosition();
    });

    searchInput.addEventListener("input", () => {
      nativePromptLibrarySearchTerm = searchInput.value || "";
      refreshNativePromptLibraryList();
    });

    importBtn.addEventListener("click", () => {
      importInput.click();
    });

    exportBtn.addEventListener("click", () => {
      exportPromptLibraryItems().catch((error) => {
        console.warn("[Gemini Timeline] export prompt library failed", error);
        setNativePromptLibraryStatusByKey("prompt_library_status_error", true);
      });
    });

    importInput.addEventListener("change", () => {
      const file = importInput.files?.[0] || null;
      importPromptLibraryItemsFromFile(file).catch((error) => {
        console.warn("[Gemini Timeline] import prompt library failed", error);
        setNativePromptLibraryStatusByKey("prompt_library_status_error", true);
      }).finally(() => {
        importInput.value = "";
      });
    });

    newBtn.addEventListener("click", () => {
      if (nativePromptLibraryItems.length >= PROMPT_LIBRARY_MAX_ITEMS && !nativePromptLibraryEditingId) {
        setNativePromptLibraryStatusByKey("prompt_library_status_limit", true, { count: PROMPT_LIBRARY_MAX_ITEMS });
        return;
      }
      openNativePromptLibraryEditor();
    });

    closeBtn.addEventListener("click", () => {
      nativePromptLibraryOpen = false;
      panel.hidden = true;
      trigger.classList.remove("active");
      trigger.setAttribute("aria-expanded", "false");
      closeNativePromptLibraryEditor();
      scheduleNativePromptLibraryPosition();
    });

    cancelBtn.addEventListener("click", () => {
      closeNativePromptLibraryEditor();
    });

    saveBtn.addEventListener("click", async () => {
      const name = normalizeText(nameInput.value || "").slice(0, PROMPT_LIBRARY_NAME_MAX_LENGTH);
      const group = normalizePromptLibraryGroup(groupInput.value || "");
      const text = String(textarea.value || "").replace(/\r\n/g, "\n").trim().slice(0, PROMPT_LIBRARY_TEXT_MAX_LENGTH);
      if (!name) {
        setNativePromptLibraryStatusByKey("prompt_library_status_missing_name", true);
        nameInput.focus();
        return;
      }
      if (!text) {
        setNativePromptLibraryStatusByKey("prompt_library_status_missing_text", true);
        textarea.focus();
        return;
      }
      try {
        const nextItems = nativePromptLibraryItems.slice();
        const nextItem = {
          id: nativePromptLibraryEditingId || createPromptLibraryId(),
          name,
          group,
          text,
          updatedAt: Date.now(),
          usedAt: 0,
          useCount: 0
        };
        const existingIndex = nextItems.findIndex((item) => item.id === nextItem.id);
        if (existingIndex >= 0) {
          nextItems.splice(existingIndex, 1, {
            ...nextItems[existingIndex],
            ...nextItem,
            usedAt: Number(nextItems[existingIndex]?.usedAt) || 0,
            useCount: Math.max(0, Number(nextItems[existingIndex]?.useCount) || 0)
          });
        } else {
          if (nextItems.length >= PROMPT_LIBRARY_MAX_ITEMS) {
            setNativePromptLibraryStatusByKey("prompt_library_status_limit", true, { count: PROMPT_LIBRARY_MAX_ITEMS });
            return;
          }
          nextItems.unshift(nextItem);
        }
        await persistPromptLibraryItems(nextItems);
        closeNativePromptLibraryEditor();
        refreshNativePromptLibraryList();
        setNativePromptLibraryStatusByKey("prompt_library_status_saved");
      } catch (error) {
        console.warn("[Gemini Timeline] save prompt failed", error);
        setNativePromptLibraryStatusByKey("prompt_library_status_error", true);
      }
    });

    textarea.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        saveBtn.click();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancelBtn.click();
      }
    });

    document.addEventListener("pointerdown", (event) => {
      if (!nativePromptLibraryOpen) return;
      const target = event.target;
      if (target instanceof Element && nativePromptLibraryRoot?.contains(target)) return;
      nativePromptLibraryOpen = false;
      panel.hidden = true;
      trigger.classList.remove("active");
      trigger.setAttribute("aria-expanded", "false");
      closeNativePromptLibraryEditor();
    }, true);

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !nativePromptLibraryOpen) return;
      nativePromptLibraryOpen = false;
      panel.hidden = true;
      trigger.classList.remove("active");
      trigger.setAttribute("aria-expanded", "false");
      closeNativePromptLibraryEditor();
    });

    window.addEventListener("resize", scheduleNativePromptLibraryPosition, { passive: true });
    document.addEventListener("scroll", scheduleNativePromptLibraryPosition, true);
  }
  refreshNativePromptLibraryLocale();
  if (nativePromptLibraryPanel instanceof HTMLElement) {
    nativePromptLibraryPanel.hidden = !nativePromptLibraryOpen;
  }
  if (nativePromptLibraryButton instanceof HTMLButtonElement) {
    nativePromptLibraryButton.classList.toggle("active", nativePromptLibraryOpen);
    nativePromptLibraryButton.setAttribute("aria-expanded", nativePromptLibraryOpen ? "true" : "false");
  }
  scheduleNativePromptLibraryPosition();
}

function scheduleNativePromptLibraryRender(delay = 80, force = false) {
  if (nativePromptLibraryRenderTimer) clearTimeout(nativePromptLibraryRenderTimer);
  nativePromptLibraryRenderTimer = setTimeout(() => {
    nativePromptLibraryRenderTimer = null;
    renderNativePromptLibrary(force).catch((error) => {
      console.warn("[Gemini Timeline] renderNativePromptLibrary failed", error);
    });
  }, Math.max(0, delay));
}

function findNativeMainNoteMountTarget() {
  if (chatContainer instanceof Element && chatContainer.isConnected && chatContainer !== document.body) return chatContainer;
  const strict = document.querySelector("ms-chat-view, chat-window, main, [role='main']");
  if (strict instanceof Element && strict.isConnected) return strict;
  const candidate = pickChatContainer();
  if (candidate === document.body) {
    const fallback = document.querySelector("main, [role='main']");
    if (fallback instanceof Element && fallback.isConnected) return fallback;
  }
  return candidate instanceof Element ? candidate : null;
}

function getElementOffsetLeftWithinAncestor(el, ancestor) {
  if (!(el instanceof HTMLElement) || !(ancestor instanceof HTMLElement)) return NaN;
  let offset = 0;
  let current = el;
  while (current && current !== ancestor) {
    offset += current.offsetLeft || 0;
    const parent = current.offsetParent;
    if (!(parent instanceof HTMLElement)) return NaN;
    current = parent;
  }
  return current === ancestor ? offset : NaN;
}

function findMainNoteAnchorNode(mountTarget) {
  if (!(mountTarget instanceof Element)) return null;
  const { responses } = getMessageNodes(mountTarget);
  for (let i = responses.length - 1; i >= 0; i -= 1) {
    const node = responses[i];
    if (!(node instanceof HTMLElement) || !node.isConnected) continue;
    if (isComposerLikeNode(node)) continue;
    if (!isVisible(node)) continue;
    return node;
  }
  return null;
}

function placeNativeMainConversationNote(mountTarget) {
  if (!(nativeMainNoteRoot instanceof HTMLElement)) return null;
  if (!(mountTarget instanceof Element)) return null;
  const anchorNode = findMainNoteAnchorNode(mountTarget);
  if (anchorNode instanceof Element && anchorNode.parentElement instanceof Element) {
    const parent = anchorNode.parentElement;
    if (nativeMainNoteRoot.parentElement !== parent || nativeMainNoteRoot.previousSibling !== anchorNode) {
      parent.insertBefore(nativeMainNoteRoot, anchorNode.nextSibling);
    }
    return anchorNode;
  }
  if (nativeMainNoteRoot.parentElement !== mountTarget) {
    mountTarget.appendChild(nativeMainNoteRoot);
  }
  return null;
}

function syncNativeMainConversationNoteLayout(mountTarget) {
  if (!(nativeMainNoteRoot instanceof HTMLElement)) return;
  if (!(mountTarget instanceof Element)) return;
  const { users, responses } = getMessageNodes(mountTarget);
  const sampleNode = findMainNoteAnchorNode(mountTarget) || responses[responses.length - 1] || users[users.length - 1] || null;
  const sampleWidth = sampleNode instanceof HTMLElement
    ? sampleNode.offsetWidth || sampleNode.getBoundingClientRect().width
    : 0;
  const targetRect = mountTarget.getBoundingClientRect();
  const sampleRect = sampleNode instanceof Element ? sampleNode.getBoundingClientRect() : null;
  if (sampleWidth >= 360) {
    const targetWidth = mountTarget instanceof HTMLElement ? mountTarget.clientWidth : targetRect.width;
    const maxAvailableWidth = Math.max(320, targetWidth - 24);
    const width = Math.round(Math.min(sampleWidth, maxAvailableWidth));
    nativeMainNoteRoot.style.maxWidth = `${width}px`;
    nativeMainNoteRoot.style.width = `${width}px`;
    nativeMainNoteRoot.style.marginRight = "auto";
    if (sampleRect && targetRect) {
      const offsetByLayout = getElementOffsetLeftWithinAncestor(
        sampleNode instanceof HTMLElement ? sampleNode : null,
        mountTarget instanceof HTMLElement ? mountTarget : null
      );
      const offsetByRect = Math.max(0, Math.round(sampleRect.left - targetRect.left));
      const leftOffset = Number.isFinite(offsetByLayout) ? Math.max(0, Math.round(offsetByLayout)) : offsetByRect;
      nativeMainNoteRoot.style.marginLeft = `${leftOffset}px`;
    } else {
      nativeMainNoteRoot.style.marginLeft = "auto";
    }
  } else {
    nativeMainNoteRoot.style.width = "min(100%, 860px)";
    nativeMainNoteRoot.style.maxWidth = "860px";
    nativeMainNoteRoot.style.marginLeft = "auto";
    nativeMainNoteRoot.style.marginRight = "auto";
  }
}

function normalizeMainConversationNote(note) {
  return String(note || "").trim().slice(0, MAIN_CONVERSATION_NOTE_MAX_LENGTH);
}

function normalizeMainConversationNoteLinks(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const turnId = String(item?.turnId || "").trim();
      const blockText = String(item?.blockText || "").trim().slice(0, MAIN_CONVERSATION_NOTE_MAX_LENGTH);
      const question = normalizeText(item?.question || "").slice(0, 220);
      if (!turnId || !blockText) return null;
      return {
        turnId,
        blockText,
        question,
        updatedAt: Number(item?.updatedAt) || Date.now()
      };
    })
    .filter(Boolean)
    .slice(-80);
}

function resolveMainConversationNoteLinkRange(noteText, link) {
  const fullText = String(noteText || "");
  const blockText = String(link?.blockText || "");
  if (!blockText) return null;
  const exactIndex = fullText.indexOf(blockText);
  if (exactIndex >= 0) {
    return { start: exactIndex, end: exactIndex + blockText.length };
  }
  const question = normalizeText(link?.question || "");
  if (!question) return null;
  const questionIndex = fullText.indexOf(question);
  if (questionIndex < 0) return null;
  const badgeIndex = fullText.lastIndexOf("[", questionIndex);
  const nextBlockIndex = fullText.indexOf("\n[", questionIndex + question.length);
  return {
    start: badgeIndex >= 0 ? badgeIndex : questionIndex,
    end: nextBlockIndex >= 0 ? nextBlockIndex : fullText.length
  };
}

function getResolvedMainConversationNoteLinkMatches() {
  if (!(nativeMainNoteTextarea instanceof HTMLTextAreaElement)) return [];
  return nativeMainNoteLinks
    .map((item) => {
      const range = resolveMainConversationNoteLinkRange(nativeMainNoteTextarea.value, item);
      return range ? { link: item, range } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.range.start - b.range.start);
}

function focusNativeMainConversationNoteLinkedMatch(match) {
  if (!match?.range) return false;
  focusNativeMainConversationNoteFromShare(match.range.start, match.range.end);
  updateNativeMainConversationNoteJumpState();
  return true;
}

function navigateNativeMainConversationNoteLink(step = 1) {
  const matches = getResolvedMainConversationNoteLinkMatches();
  if (!matches.length || !(nativeMainNoteTextarea instanceof HTMLTextAreaElement)) return false;
  const caret = Math.max(0, Math.min(nativeMainNoteTextarea.value.length, nativeMainNoteTextarea.selectionStart || 0));
  const activeIndex = matches.findIndex((item) => caret >= item.range.start && caret <= item.range.end);
  let targetIndex = step >= 0 ? 0 : matches.length - 1;
  if (activeIndex >= 0) {
    const offset = step >= 0 ? 1 : -1;
    targetIndex = (activeIndex + offset + matches.length) % matches.length;
  }
  return focusNativeMainConversationNoteLinkedMatch(matches[targetIndex]);
}

function updateNativeMainConversationNoteJumpState() {
  if (!(nativeMainNoteTextarea instanceof HTMLTextAreaElement)) return;
  const matches = getResolvedMainConversationNoteLinkMatches();
  const caret = Math.max(0, Math.min(nativeMainNoteTextarea.value.length, nativeMainNoteTextarea.selectionStart || 0));
  const activeIndex = matches.findIndex((item) => caret >= item.range.start && caret <= item.range.end);
  const match = activeIndex >= 0 ? matches[activeIndex].link : null;
  nativeMainNoteActiveLinkedTurnId = String(match?.turnId || "");
  const activeTurn = nativeMainNoteActiveLinkedTurnId ? getTimelineTurnById(nativeMainNoteActiveLinkedTurnId) : null;
  const titleSource = activeTurn ? getTimelineTurnDisplayTitle(activeTurn) : normalizeText(match?.question || "");
  const shortTitle = clampText(titleSource, currentLocale === "en" ? 22 : 14);
  const defaultLabel = ct("main_note_jump_turn");
  const label = shortTitle ? `${defaultLabel} · ${shortTitle}` : defaultLabel;
  if (nativeMainNotePrevBtn instanceof HTMLButtonElement) {
    const prevLabel = ct("main_note_prev_turn");
    nativeMainNotePrevBtn.hidden = matches.length < 2;
    nativeMainNotePrevBtn.disabled = matches.length < 2;
    nativeMainNotePrevBtn.title = prevLabel;
    nativeMainNotePrevBtn.setAttribute("aria-label", prevLabel);
  }
  if (nativeMainNoteNextBtn instanceof HTMLButtonElement) {
    const nextLabel = ct("main_note_next_turn");
    nativeMainNoteNextBtn.hidden = matches.length < 2;
    nativeMainNoteNextBtn.disabled = matches.length < 2;
    nativeMainNoteNextBtn.title = nextLabel;
    nativeMainNoteNextBtn.setAttribute("aria-label", nextLabel);
  }
  if (nativeMainNoteJumpBtn instanceof HTMLButtonElement) {
    nativeMainNoteJumpBtn.hidden = !nativeMainNoteActiveLinkedTurnId;
    nativeMainNoteJumpBtn.disabled = !nativeMainNoteActiveLinkedTurnId;
    nativeMainNoteJumpBtn.textContent = label;
    nativeMainNoteJumpBtn.title = nativeMainNoteActiveLinkedTurnId ? titleSource || defaultLabel : "";
    nativeMainNoteJumpBtn.setAttribute("aria-label", label);
  }
}

function jumpFromMainConversationNoteToTurn(turnId) {
  const id = String(turnId || "").trim();
  if (!id) return false;
  const turn = getTimelineTurnById(id);
  if (!turn) return false;
  nativeChatTimelineActiveTurnId = id;
  applyNativeTimelineActiveState();
  notifySidePanelTurnActivated(id, { syncScroll: false, force: true });
  const target = findResponseByLocator(id, Number.isInteger(turn.domIndex) ? turn.domIndex : null);
  if (target) {
    scrollTimelineTargetIntoView(target, id, { force: true });
  }
  return true;
}

function focusNativeMainConversationNoteFromShare(selectionStart = null, selectionEnd = null) {
  if (!(nativeMainNoteRoot instanceof HTMLElement) || !(nativeMainNoteTextarea instanceof HTMLTextAreaElement)) return;
  if (nativeMainNoteFlashTimer) {
    clearTimeout(nativeMainNoteFlashTimer);
    nativeMainNoteFlashTimer = null;
  }
  if (typeof nativeMainNoteRoot.scrollIntoView === "function") {
    nativeMainNoteRoot.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }
  nativeMainNoteRoot.classList.add("is-share-focus");
  nativeMainNoteTextarea.focus();
  const valueLength = nativeMainNoteTextarea.value.length;
  const start = Number.isInteger(selectionStart)
    ? Math.max(0, Math.min(valueLength, Number(selectionStart)))
    : valueLength;
  const end = Number.isInteger(selectionEnd)
    ? Math.max(start, Math.min(valueLength, Number(selectionEnd)))
    : start;
  if (typeof nativeMainNoteTextarea.setSelectionRange === "function") {
    nativeMainNoteTextarea.setSelectionRange(start, end);
  }
  updateNativeMainConversationNoteJumpState();
  nativeMainNoteFlashTimer = setTimeout(() => {
    nativeMainNoteFlashTimer = null;
    if (nativeMainNoteRoot instanceof HTMLElement) {
      nativeMainNoteRoot.classList.remove("is-share-focus");
    }
  }, 1800);
}

function setNativeMainConversationNoteStatus(text, isError = false) {
  if (!(nativeMainNoteStatusEl instanceof HTMLElement)) return;
  nativeMainNoteStatusEl.textContent = text;
  nativeMainNoteStatusEl.classList.toggle("error", Boolean(isError));
}

function refreshNativeMainConversationNoteCounter() {
  if (!(nativeMainNoteCountEl instanceof HTMLElement) || !(nativeMainNoteTextarea instanceof HTMLTextAreaElement)) return;
  nativeMainNoteCountEl.textContent = `${nativeMainNoteTextarea.value.length}/${MAIN_CONVERSATION_NOTE_MAX_LENGTH}`;
}

async function loadMainConversationNoteFromStorage(conversationId) {
  if (!isConcreteConversationId(conversationId)) return "";
  try {
    const key = toStorageKey(conversationId);
    const result = await storageGet(key);
    const session = result?.[key] || {};
    return normalizeMainConversationNote(session?.mainNote || "");
  } catch {
    return "";
  }
}

async function loadMainConversationNoteLinksFromStorage(conversationId) {
  if (!isConcreteConversationId(conversationId)) return [];
  try {
    const key = toStorageKey(conversationId);
    const result = await storageGet(key);
    const session = result?.[key] || {};
    return normalizeMainConversationNoteLinks(session?.mainNoteLinks || []);
  } catch {
    return [];
  }
}

async function persistMainConversationNote(note, options = {}) {
  if (!isConcreteConversationId(currentConversationId)) return false;
  const targetConversationId = currentConversationId;
  const normalizedNote = normalizeMainConversationNote(note);
  const normalizedLinks = Array.isArray(options?.mainNoteLinks)
    ? normalizeMainConversationNoteLinks(options.mainNoteLinks)
    : null;
  try {
    const key = toStorageKey(targetConversationId);
    const result = await storageGet(key);
    const session = result?.[key] || {
      conversationId: targetConversationId,
      url: targetConversationId,
      updatedAt: Date.now(),
      entries: []
    };
    session.mainNote = normalizedNote;
    if (normalizedLinks) {
      session.mainNoteLinks = normalizedLinks;
    } else {
      session.mainNoteLinks = normalizeMainConversationNoteLinks(session?.mainNoteLinks || []);
    }
    session.updatedAt = Date.now();
    await storageSet({ [key]: session });
    if (targetConversationId === currentConversationId) {
      nativeMainNoteLastSavedText = normalizedNote;
      nativeMainNoteDirty = false;
      nativeMainNoteLinks = Array.isArray(session.mainNoteLinks) ? session.mainNoteLinks.slice() : [];
      setNativeMainConversationNoteStatusByKey("main_note_status_saved");
    }
    chrome.runtime.sendMessage({ type: "GEMINI_RELOAD_STATE", conversationId: targetConversationId }, () => {});
    return true;
  } catch (error) {
    setNativeMainConversationNoteStatusByKey("main_note_status_error", true);
    console.warn("[Gemini Timeline] save main conversation note failed", error);
    return false;
  }
}

function scheduleMainConversationNoteSave(delay = 520) {
  if (nativeMainNoteSaveTimer) clearTimeout(nativeMainNoteSaveTimer);
  nativeMainNoteSaveTimer = setTimeout(() => {
    nativeMainNoteSaveTimer = null;
    if (!(nativeMainNoteTextarea instanceof HTMLTextAreaElement)) return;
    if (!nativeMainNoteDirty) return;
    setNativeMainConversationNoteStatusByKey("main_note_status_saving");
    persistMainConversationNote(nativeMainNoteTextarea.value);
  }, Math.max(0, delay));
}

function removeNativeMainConversationNoteUi() {
  if (nativeMainNoteRenderTimer) {
    clearTimeout(nativeMainNoteRenderTimer);
    nativeMainNoteRenderTimer = null;
  }
  if (nativeMainNoteSaveTimer) {
    clearTimeout(nativeMainNoteSaveTimer);
    nativeMainNoteSaveTimer = null;
  }
  if (nativeMainNoteRoot instanceof HTMLElement) {
    nativeMainNoteRoot.remove();
  }
  const style = document.getElementById("gtf-native-main-note-style");
  if (style) style.remove();
  nativeMainNoteRoot = null;
  nativeMainNoteTextarea = null;
  nativeMainNoteStatusEl = null;
  nativeMainNoteCountEl = null;
  nativeMainNotePrevBtn = null;
  nativeMainNoteNextBtn = null;
  nativeMainNoteJumpBtn = null;
  nativeMainNoteLoadedConversationId = "";
  nativeMainNoteLastSavedText = "";
  nativeMainNoteDirty = false;
  nativeMainNoteLinks = [];
  nativeMainNoteActiveLinkedTurnId = "";
}

async function renderNativeMainConversationNote(force = false) {
  if (!ENABLE_NATIVE_MAIN_NOTE) {
    removeNativeMainConversationNoteUi();
    return;
  }
  const mountTarget = findNativeMainNoteMountTarget();
  if (!(mountTarget instanceof Element) || !mountTarget.isConnected) return;

  ensureNativeMainNoteStyle();
  if (!(nativeMainNoteRoot instanceof HTMLElement) || !nativeMainNoteRoot.isConnected) {
    const root = document.createElement("section");
    root.id = "gtf-native-main-note";
    root.className = "gtf-native-main-note";
    root.setAttribute("aria-label", ct("main_note_aria_label"));

    const head = document.createElement("div");
    head.className = "gtf-native-main-note-head";

    const label = document.createElement("span");
    label.className = "gtf-native-main-note-label";
    label.textContent = ct("main_note_label");
    head.appendChild(label);

    const headActions = document.createElement("div");
    headActions.className = "gtf-native-main-note-head-actions";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "gtf-native-main-note-nav";
    prevBtn.textContent = ct("main_note_prev_turn");
    prevBtn.title = ct("main_note_prev_turn");
    prevBtn.setAttribute("aria-label", ct("main_note_prev_turn"));
    prevBtn.hidden = true;
    prevBtn.disabled = true;
    prevBtn.addEventListener("click", () => {
      navigateNativeMainConversationNoteLink(-1);
    });
    headActions.appendChild(prevBtn);

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "gtf-native-main-note-nav";
    nextBtn.textContent = ct("main_note_next_turn");
    nextBtn.title = ct("main_note_next_turn");
    nextBtn.setAttribute("aria-label", ct("main_note_next_turn"));
    nextBtn.hidden = true;
    nextBtn.disabled = true;
    nextBtn.addEventListener("click", () => {
      navigateNativeMainConversationNoteLink(1);
    });
    headActions.appendChild(nextBtn);

    const jumpBtn = document.createElement("button");
    jumpBtn.type = "button";
    jumpBtn.className = "gtf-native-main-note-jump";
    jumpBtn.textContent = ct("main_note_jump_turn");
    jumpBtn.title = ct("main_note_jump_turn");
    jumpBtn.setAttribute("aria-label", ct("main_note_jump_turn"));
    jumpBtn.hidden = true;
    jumpBtn.disabled = true;
    jumpBtn.addEventListener("click", () => {
      if (!nativeMainNoteActiveLinkedTurnId) return;
      jumpFromMainConversationNoteToTurn(nativeMainNoteActiveLinkedTurnId);
    });
    headActions.appendChild(jumpBtn);

    const status = document.createElement("span");
    status.className = "gtf-native-main-note-status";
    status.textContent = ct("main_note_status_ready");
    status.dataset.i18nKey = "main_note_status_ready";
    headActions.appendChild(status);
    head.appendChild(headActions);
    root.appendChild(head);

    const textarea = document.createElement("textarea");
    textarea.placeholder = ct("main_note_placeholder");
    textarea.maxLength = MAIN_CONVERSATION_NOTE_MAX_LENGTH;
    textarea.addEventListener("input", () => {
      if (!(nativeMainNoteTextarea instanceof HTMLTextAreaElement)) return;
      nativeMainNoteDirty = nativeMainNoteTextarea.value !== nativeMainNoteLastSavedText;
      setNativeMainConversationNoteStatusByKey(nativeMainNoteDirty ? "main_note_status_editing" : "main_note_status_saved");
      refreshNativeMainConversationNoteCounter();
      updateNativeMainConversationNoteJumpState();
      scheduleMainConversationNoteSave();
    });
    textarea.addEventListener("blur", () => {
      if (nativeMainNoteDirty) scheduleMainConversationNoteSave(0);
    });
    textarea.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        scheduleMainConversationNoteSave(0);
      }
    });
    ["click", "keyup", "select"].forEach((eventName) => {
      textarea.addEventListener(eventName, () => {
        updateNativeMainConversationNoteJumpState();
      });
    });
    root.appendChild(textarea);

    const foot = document.createElement("div");
    foot.className = "gtf-native-main-note-foot";
    const counter = document.createElement("span");
    foot.appendChild(counter);
    root.appendChild(foot);

    nativeMainNoteRoot = root;
    nativeMainNoteTextarea = textarea;
    nativeMainNotePrevBtn = prevBtn;
    nativeMainNoteNextBtn = nextBtn;
    nativeMainNoteJumpBtn = jumpBtn;
    nativeMainNoteStatusEl = status;
    nativeMainNoteCountEl = counter;
  }

  placeNativeMainConversationNote(mountTarget);
  nativeMainNoteRoot.style.display = "";
  syncNativeMainConversationNoteLayout(mountTarget);

  if (!isConcreteConversationId(currentConversationId)) {
    if (nativeMainNoteTextarea instanceof HTMLTextAreaElement) {
      nativeMainNoteTextarea.value = "";
      nativeMainNoteTextarea.disabled = true;
      nativeMainNoteTextarea.placeholder = ct("main_note_placeholder_waiting");
    }
    nativeMainNoteDirty = false;
    nativeMainNoteLastSavedText = "";
    nativeMainNoteLoadedConversationId = "";
    nativeMainNoteLinks = [];
    nativeMainNoteActiveLinkedTurnId = "";
    setNativeMainConversationNoteStatusByKey("main_note_status_waiting");
    refreshNativeMainConversationNoteCounter();
    updateNativeMainConversationNoteJumpState();
    return;
  }

  if (nativeMainNoteTextarea instanceof HTMLTextAreaElement) {
    nativeMainNoteTextarea.disabled = false;
    nativeMainNoteTextarea.placeholder = ct("main_note_placeholder");
  }

  const currentLoadedConversation = nativeMainNoteLoadedConversationId;
  const shouldReload =
    force ||
    currentLoadedConversation !== currentConversationId ||
    (!nativeMainNoteDirty && document.activeElement !== nativeMainNoteTextarea);

  if (shouldReload) {
    const note = await loadMainConversationNoteFromStorage(currentConversationId);
    const links = await loadMainConversationNoteLinksFromStorage(currentConversationId);
    nativeMainNoteLoadedConversationId = currentConversationId;
    nativeMainNoteLastSavedText = note;
    nativeMainNoteLinks = links;
    if (nativeMainNoteTextarea instanceof HTMLTextAreaElement) {
      if (document.activeElement !== nativeMainNoteTextarea || !nativeMainNoteDirty) {
        nativeMainNoteTextarea.value = note;
        nativeMainNoteDirty = false;
      }
    }
    setNativeMainConversationNoteStatusByKey("main_note_status_synced");
  }
  refreshNativeMainConversationNoteCounter();
  updateNativeMainConversationNoteJumpState();
}

function scheduleNativeMainConversationNoteRender(delay = 120, force = false) {
  if (!ENABLE_NATIVE_MAIN_NOTE) {
    removeNativeMainConversationNoteUi();
    return;
  }
  if (nativeMainNoteRenderTimer) clearTimeout(nativeMainNoteRenderTimer);
  nativeMainNoteRenderTimer = setTimeout(() => {
    nativeMainNoteRenderTimer = null;
    renderNativeMainConversationNote(force).catch((error) => {
      console.warn("[Gemini Timeline] renderNativeMainConversationNote failed", error);
    });
  }, Math.max(0, delay));
}

function resetConversationViewState(nextConversationId) {
  currentConversationId = nextConversationId;
  routeSwitchPendingConversationId = "";
  routeSwitchSettledUntil = Date.now() + CONVERSATION_SWITCH_SETTLE_MS;
  nativeChatTimelineLastTurnsJSON = "";
  nativeChatTimelineTurnsCache = [];
  nativeChatTimelineActiveTurnId = "";
  nativeChatTimelineEmptyRetryCount = 0;
  nativeChatTimelineHighlightLoadedFor = "";
  nativeChatTimelineBookmarks = new Map();
  nativeChatTimelineHighlightedIds = new Set();
  nativeTimelineFollowupGroups = [];
  nativeTimelineActiveFollowupGroupId = "";
  nativeTimelineFollowupColorCursor = 0;
  nativeTimelineFollowupTopicStarted = false;
  nativeChatTimelineDotMap = new Map();
  nativeChatTimelineActiveDot = null;
  nativeChatTimelineLastNotifiedTurnId = "";
  knownTurnIds.clear();
  knownTurnTimestampMap.clear();
  domEntryMap.clear();
  rawEntryCache = { key: "", at: 0, entries: [] };
  sidebarConversationCache.collectedAt = 0;
  hideNativeTimelineBookmarkMenu();
}

function shouldDeferConversationHeavyWork() {
  const now = Date.now();
  return now < routeSwitchSettledUntil || now < contentBootHeavyWorkUntil || isLayoutResizing();
}

function rebindChatObserverIfNeeded() {
  const nextContainer = pickChatContainer();
  if (!(nextContainer instanceof Element)) return false;
  if (chatContainer === nextContainer && chatObserver) return true;
  attachObserver(nextContainer);
  return true;
}

function scanConversation() {
  const perfStartedAt = perfNow();
  if (!chatContainer || !chatContainer.isConnected) return;
  if (shouldDeferConversationHeavyWork()) {
    queueScan();
    return;
  }

  const { users, responses } = getMessageNodes(chatContainer);
  let pairs = pairConversationNodes(users, responses);
  let looseCount = 0;

  if (!pairs.length) {
    const fallbackResponses = getLooseAssistantNodes(chatContainer);
    looseCount = fallbackResponses.length;
    pairs = fallbackResponses.map((responseNode, index) => ({ userNode: null, responseNode, index }));
  }

  updateDebugState({
    lastScanAt: Date.now(),
    lastScanUsers: users.length,
    lastScanResponses: responses.length,
    lastScanLooseResponses: looseCount,
    lastScanPairs: pairs.length
  });

  let scheduledPairs = 0;
  pairs.forEach(({ userNode, responseNode, index }) => {
    if (responseNode instanceof Element) {
      const signature = getNodeContentSignature(responseNode);
      if (finalizedResponseSignatureMap.get(responseNode) === signature && !isLikelyStreaming(responseNode)) {
        return;
      }
    }
    scheduledPairs += 1;
    scheduleFinalize(userNode, responseNode, index);
  });
  if (!document.hidden) {
    scheduleNativeChatTimelineRender(160);
  }
  scheduleNativeTimelineActiveSync();
  recordPerf("scanConversation", perfStartedAt, { pairs: pairs.length, scheduled: scheduledPairs });
}

function normalizeTurnIdList(rawList) {
  if (!Array.isArray(rawList)) return [];
  const seen = new Set();
  const list = [];
  rawList.forEach((item) => {
    const id = String(item || "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    list.push(id);
  });
  return list;
}

function normalizeTimelineBookmarkType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (normalized === "important") return "review";
  return getTimelineBookmarkTypeMeta()[normalized] ? normalized : "review";
}

function normalizeTimelineBookmarkNote(note) {
  const normalized = String(note || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized.slice(0, 180);
}

function normalizeTimelineBookmarkMap(rawMap, legacyHighlightIds = []) {
  const map = new Map();
  if (rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)) {
    Object.entries(rawMap).forEach(([turnId, rawValue]) => {
      const id = String(turnId || "").trim();
      if (!id) return;
      if (!rawValue || typeof rawValue !== "object") {
        map.set(id, {
          type: "review",
          note: "",
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        return;
      }
      map.set(id, {
        type: normalizeTimelineBookmarkType(rawValue.type),
        note: normalizeTimelineBookmarkNote(rawValue.note),
        createdAt: Number(rawValue.createdAt) || Date.now(),
        updatedAt: Number(rawValue.updatedAt) || Date.now()
      });
    });
  }
  normalizeTurnIdList(legacyHighlightIds).forEach((id) => {
    if (map.has(id)) return;
    map.set(id, {
      type: "review",
      note: "",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  });
  return map;
}

function serializeTimelineBookmarkMap(bookmarkMap) {
  const serialized = {};
  bookmarkMap.forEach((bookmark, turnId) => {
    const id = String(turnId || "").trim();
    if (!id) return;
    serialized[id] = {
      type: normalizeTimelineBookmarkType(bookmark?.type),
      note: normalizeTimelineBookmarkNote(bookmark?.note),
      createdAt: Number(bookmark?.createdAt) || Date.now(),
      updatedAt: Number(bookmark?.updatedAt) || Date.now()
    };
  });
  return serialized;
}

function syncNativeTimelineHighlightedIdsFromBookmarks() {
  nativeChatTimelineHighlightedIds = new Set(
    Array.from(nativeChatTimelineBookmarks.entries())
      .filter(([, bookmark]) => normalizeTimelineBookmarkType(bookmark?.type) === "review")
      .map(([turnId]) => turnId)
  );
}

function getNativeTimelineBookmark(turnId) {
  return nativeChatTimelineBookmarks.get(String(turnId || "").trim()) || null;
}

function getNativeTimelineBookmarkMeta(bookmark) {
  return getTimelineBookmarkTypeMeta()[normalizeTimelineBookmarkType(bookmark?.type)];
}

function getNativeTimelineBookmarkCounts(turns = nativeChatTimelineTurnsCache) {
  const restrictToTurns = Array.isArray(turns);
  const validIds = new Set((restrictToTurns ? turns : []).map((turn) => String(turn?.id || "")).filter(Boolean));
  const counts = { all: validIds.size, bookmarked: 0, mistake: 0, review: 0 };
  nativeChatTimelineBookmarks.forEach((bookmark, turnId) => {
    if (restrictToTurns && !validIds.has(turnId)) return;
    counts.bookmarked += 1;
    const type = normalizeTimelineBookmarkType(bookmark?.type);
    if (type === "mistake") counts.mistake += 1;
    if (type === "review") counts.review += 1;
  });
  return counts;
}

function isNativeTimelineTurnVisibleByFilter(turnId) {
  const bookmark = getNativeTimelineBookmark(turnId);
  if (nativeChatTimelineFilterMode === "all") return true;
  if (nativeChatTimelineFilterMode === "bookmarked") return Boolean(bookmark);
  if (!bookmark) return false;
  return normalizeTimelineBookmarkType(bookmark.type) === nativeChatTimelineFilterMode;
}

function applyNativeTimelineFilterVisibility(turns = nativeChatTimelineTurnsCache) {
  if (!Array.isArray(turns) || !turns.length) return;
  turns.forEach((turn) => {
    const dot = nativeChatTimelineDotMap.get(turn?.id);
    if (!(dot instanceof HTMLElement)) return;
    const item = dot.closest(".gtf-native-chat-timeline-item");
    if (item instanceof HTMLElement) {
      item.hidden = !isNativeTimelineTurnVisibleByFilter(turn?.id);
    }
  });
}

function buildNativeTimelineTurnTitle(turn, idx) {
  const bookmark = getNativeTimelineBookmark(turn?.id);
  const bookmarkMeta = bookmark ? getNativeTimelineBookmarkMeta(bookmark) : null;
  const lines = [`${idx + 1}. ${turn.title || ct("timeline_turn_unnamed")}`];
  if (bookmarkMeta) {
    lines.push(`${ct("timeline_bookmark_title_prefix")}${bookmarkMeta.label}`);
  }
  if (bookmark?.note) {
    lines.push(`${ct("timeline_bookmark_note_prefix")}${bookmark.note}`);
  }
  if (getNativeTimelineFollowupGroupForTurn(turn?.id)) {
    lines.push(currentLocale === "en" ? "Added to current follow-up topic" : "\u5df2\u52a0\u5165\u5f53\u524d\u8ffd\u95ee\u4e3b\u9898");
  }
  lines.push(ct("timeline_turn_hint"));
  return lines.join("\n");
}

function applyNativeTimelineDotBookmarkState(button, turn, idx) {
  if (!(button instanceof HTMLElement)) return;
  const bookmark = getNativeTimelineBookmark(turn?.id);
  const type = bookmark ? normalizeTimelineBookmarkType(bookmark.type) : "";
  button.classList.toggle("bookmarked", Boolean(bookmark));
  const followupGroup = getNativeTimelineFollowupGroupForTurn(turn?.id);
  button.classList.toggle("followup-topic", Boolean(followupGroup));
  button.classList.toggle("followup-main", Boolean(followupGroup && followupGroup.mainTurnId === turn?.id));
  button.classList.toggle("followup-sub", Boolean(followupGroup && followupGroup.mainTurnId !== turn?.id));
  if (followupGroup) applyNativeTimelineFollowupColors(button, followupGroup.paletteIndex);
  Object.entries(getTimelineBookmarkTypeMeta()).forEach(([bookmarkType, meta]) => {
    button.classList.toggle(meta.className, type === bookmarkType);
  });
  button.classList.toggle("highlighted", type === "review");
  button.title = buildNativeTimelineTurnTitle(turn, idx);
  button.setAttribute("aria-label", `${idx + 1}. ${turn.title || ct("timeline_turn_unnamed")}${bookmark ? `, ${getNativeTimelineBookmarkMeta(bookmark).label}` : ""}`);
  const item = button.closest(".gtf-native-chat-timeline-item");
  if (item instanceof HTMLElement) {
    item.classList.toggle("followup-topic", Boolean(followupGroup));
    item.classList.toggle("followup-main", Boolean(followupGroup && followupGroup.mainTurnId === turn?.id));
    item.classList.toggle("followup-sub", Boolean(followupGroup && followupGroup.mainTurnId !== turn?.id));
    if (followupGroup) applyNativeTimelineFollowupColors(item, followupGroup.paletteIndex);
    item.hidden = !isNativeTimelineTurnVisibleByFilter(turn?.id);
  }
}

async function ensureNativeTimelineHighlightsLoaded(force = false) {
  if (!isConcreteConversationId(currentConversationId)) {
    nativeChatTimelineBookmarks = new Map();
    nativeChatTimelineHighlightedIds = new Set();
    nativeChatTimelineHighlightLoadedFor = "";
    return;
  }
  if (!force && nativeChatTimelineHighlightLoadedFor === currentConversationId) return;
  try {
    const key = toStorageKey(currentConversationId);
    const result = await storageGet(key);
    const session = result?.[key] || {};
    nativeChatTimelineBookmarks = normalizeTimelineBookmarkMap(
      session?.timelineBookmarks || {},
      session?.highlightedTurnIds || session?.starredTurnIds || []
    );
    syncNativeTimelineHighlightedIdsFromBookmarks();
    nativeChatTimelineHighlightLoadedFor = currentConversationId;
  } catch {
    nativeChatTimelineBookmarks = new Map();
    nativeChatTimelineHighlightedIds = new Set();
    nativeChatTimelineHighlightLoadedFor = currentConversationId;
  }
}

function queuePersistNativeTimelineHighlights() {
  const targetConversationId = currentConversationId;
  if (!isConcreteConversationId(targetConversationId)) return;
  syncNativeTimelineHighlightedIdsFromBookmarks();
  const highlightIds = normalizeTurnIdList(Array.from(nativeChatTimelineHighlightedIds));
  const serializedBookmarks = serializeTimelineBookmarkMap(nativeChatTimelineBookmarks);
  writeQueue = writeQueue
    .then(async () => {
      const key = toStorageKey(targetConversationId);
      const result = await storageGet(key);
      const session = result?.[key] || {
        conversationId: targetConversationId,
        url: targetConversationId,
        updatedAt: Date.now(),
        entries: []
      };
      session.timelineBookmarks = serializedBookmarks;
      session.highlightedTurnIds = highlightIds;
      session.starredTurnIds = highlightIds;
      session.updatedAt = Date.now();
      await storageSet({ [key]: session });
      chrome.runtime.sendMessage({ type: "GEMINI_RELOAD_STATE", conversationId: targetConversationId }, () => {});
    })
    .catch((error) => {
      console.warn("[Gemini Timeline] persist timeline highlights failed", error);
    });
}

function toggleNativeTimelineHighlight(turnId) {
  const id = String(turnId || "").trim();
  if (!id) return false;
  const existing = getNativeTimelineBookmark(id);
  if (existing && normalizeTimelineBookmarkType(existing.type) === "review") {
    nativeChatTimelineBookmarks.delete(id);
  } else {
    nativeChatTimelineBookmarks.set(id, {
      type: "review",
      note: existing?.note || "",
      createdAt: Number(existing?.createdAt) || Date.now(),
      updatedAt: Date.now()
    });
  }
  queuePersistNativeTimelineHighlights();
  return Boolean(getNativeTimelineBookmark(id));
}

function upsertNativeTimelineBookmark(turnId, nextBookmark) {
  const id = String(turnId || "").trim();
  if (!id) return;
  const existing = getNativeTimelineBookmark(id);
  const nextType = normalizeTimelineBookmarkType(nextBookmark?.type || existing?.type || "review");
  const nextNote = normalizeTimelineBookmarkNote(
    Object.prototype.hasOwnProperty.call(nextBookmark || {}, "note") ? nextBookmark.note : existing?.note || ""
  );
  nativeChatTimelineBookmarks.set(id, {
    type: nextType,
    note: nextNote,
    createdAt: Number(existing?.createdAt) || Date.now(),
    updatedAt: Date.now()
  });
  queuePersistNativeTimelineHighlights();
}

function removeNativeTimelineBookmark(turnId) {
  const id = String(turnId || "").trim();
  if (!id) return;
  nativeChatTimelineBookmarks.delete(id);
  queuePersistNativeTimelineHighlights();
}

function queueScan() {
  if (document.hidden) return;
  clearTimeout(scanTimer);
  const now = Date.now();
  const debounceMs = isLowPowerLayoutMode()
    ? Math.max(SCAN_DEBOUNCE_MS, DUAL_SIDEBAR_SCAN_DEBOUNCE_MS)
    : SCAN_DEBOUNCE_MS;
  const bootDelayMs = now < contentBootHeavyWorkUntil ? Math.max(240, contentBootHeavyWorkUntil - now) : 0;
  scanTimer = setTimeout(scanConversation, Math.max(debounceMs, bootDelayMs));
}

function applyNativeTimelineActiveState() {
  if (!(nativeChatTimelineList instanceof HTMLElement)) return;
  const nextId = String(nativeChatTimelineActiveTurnId || "");
  if (nativeChatTimelineActiveDot instanceof HTMLElement && nativeChatTimelineActiveDot.isConnected) {
    const prevId = String(nativeChatTimelineActiveDot.dataset.turnId || "");
    if (!nextId || prevId !== nextId) {
      nativeChatTimelineActiveDot.classList.remove("active");
    }
  }
  if (!nextId) {
    nativeChatTimelineActiveDot = null;
    return;
  }
  const nextDot = nativeChatTimelineDotMap.get(nextId);
  if (nextDot instanceof HTMLElement && nextDot.isConnected) {
    nextDot.classList.add("active");
    nativeChatTimelineActiveDot = nextDot;
    return;
  }
  nativeChatTimelineActiveDot = null;
}

function shouldSyncNativeTimelineForScrollTarget(target) {
  if (document.hidden || isLayoutResizing()) return false;
  if (!nativeChatTimelineTurnsCache.length || !domEntryMap.size) return false;
  if (!(target instanceof Element)) return true;
  if (target.closest("#gtf-native-folder-shell, #gtf-native-chat-timeline, #gtf-native-main-note-root")) {
    return false;
  }
  const scrollingRoot = document.scrollingElement;
  if (target === document.body || target === document.documentElement || target === scrollingRoot) return true;
  if (chatContainer instanceof Element) {
    return target === chatContainer || chatContainer.contains(target) || target.contains(chatContainer);
  }
  return false;
}

function getNativeTimelineAnchorNode(turnId) {
  if (!turnId) return null;
  const refs = domEntryMap.get(turnId);
  if (refs?.responseNode?.isConnected) return refs.responseNode;
  if (refs?.userNode?.isConnected) return refs.userNode;
  return null;
}

function measureNativeTimelineAnchor(node, anchorTop) {
  if (!(node instanceof Element)) {
    return {
      score: Number.POSITIVE_INFINITY,
      fallback: false,
      near: false
    };
  }
  const rect = node.getBoundingClientRect();
  if (rect.bottom <= 16) {
    return {
      score: Number.POSITIVE_INFINITY,
      fallback: true,
      near: false
    };
  }
  const score = Math.abs(rect.top - anchorTop) + (rect.top < anchorTop ? 12 : 0);
  return {
    score,
    fallback: false,
    near: rect.top <= anchorTop + 72 && rect.bottom >= anchorTop - 40
  };
}

function findNativeTimelineTurnIndex(turnId) {
  if (!turnId) return -1;
  for (let i = 0; i < nativeChatTimelineTurnsCache.length; i += 1) {
    if (nativeChatTimelineTurnsCache[i]?.id === turnId) return i;
  }
  return -1;
}

function buildNativeTimelineScanIndices(centerIndex, radius) {
  const maxIndex = nativeChatTimelineTurnsCache.length - 1;
  if (maxIndex < 0) return [];
  const seen = new Set();
  const indices = [];
  const pushIndex = (value) => {
    if (!Number.isInteger(value) || value < 0 || value > maxIndex || seen.has(value)) return;
    seen.add(value);
    indices.push(value);
  };

  if (centerIndex < 0 || centerIndex > maxIndex) {
    for (let i = 0; i <= maxIndex; i += 1) pushIndex(i);
    return indices;
  }

  pushIndex(centerIndex);
  for (let offset = 1; offset <= radius; offset += 1) {
    pushIndex(centerIndex - offset);
    pushIndex(centerIndex + offset);
  }
  return indices;
}

function pickNativeTimelineBestTurn(indices, anchorTop) {
  let bestId = "";
  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  let fallbackId = "";

  indices.forEach((index) => {
    const turn = nativeChatTimelineTurnsCache[index];
    if (!turn?.id) return;
    const measurement = measureNativeTimelineAnchor(getNativeTimelineAnchorNode(turn.id), anchorTop);
    if (measurement.fallback) {
      fallbackId = turn.id;
      return;
    }
    if (measurement.score < bestScore) {
      bestScore = measurement.score;
      bestId = turn.id;
      bestIndex = index;
    }
  });

  return { bestId, bestIndex, bestScore, fallbackId };
}

function syncNativeTimelineActiveFromViewport() {
  if (!nativeChatTimelineTurnsCache.length || !domEntryMap.size) return;
  const anchorTop = 120;
  const activeMeasurement = measureNativeTimelineAnchor(
    getNativeTimelineAnchorNode(nativeChatTimelineActiveTurnId),
    anchorTop
  );
  if (activeMeasurement.near) return;

  const activeIndex = findNativeTimelineTurnIndex(nativeChatTimelineActiveTurnId);
  const localResult = pickNativeTimelineBestTurn(
    buildNativeTimelineScanIndices(activeIndex, NATIVE_TIMELINE_ACTIVE_LOCAL_SCAN_RADIUS),
    anchorTop
  );
  let nextActiveId = localResult.bestId || localResult.fallbackId || "";

  if (!nextActiveId || localResult.bestScore > NATIVE_TIMELINE_ACTIVE_MAX_NEAR_SCORE) {
    const coarseStep = nativeChatTimelineTurnsCache.length > 28 ? 3 : 2;
    const coarseIndices = [];
    for (let i = 0; i < nativeChatTimelineTurnsCache.length; i += coarseStep) {
      coarseIndices.push(i);
    }
    const lastIndex = nativeChatTimelineTurnsCache.length - 1;
    if (lastIndex >= 0 && coarseIndices[coarseIndices.length - 1] !== lastIndex) {
      coarseIndices.push(lastIndex);
    }
    const coarseResult = pickNativeTimelineBestTurn(coarseIndices, anchorTop);
    const refineCenterIndex = coarseResult.bestIndex >= 0 ? coarseResult.bestIndex : activeIndex;
    const refineRadius = coarseStep + NATIVE_TIMELINE_ACTIVE_LOCAL_SCAN_RADIUS;
    const refineResult = pickNativeTimelineBestTurn(
      buildNativeTimelineScanIndices(refineCenterIndex, refineRadius),
      anchorTop
    );
    nextActiveId =
      refineResult.bestId ||
      coarseResult.bestId ||
      localResult.bestId ||
      refineResult.fallbackId ||
      coarseResult.fallbackId ||
      localResult.fallbackId ||
      nativeChatTimelineActiveTurnId;
  }

  if (!nextActiveId || nextActiveId === nativeChatTimelineActiveTurnId) return;
  nativeChatTimelineActiveTurnId = nextActiveId;
  applyNativeTimelineActiveState();
  notifySidePanelTurnActivated(nextActiveId, { syncScroll: false, force: false });
}

function scheduleNativeTimelineActiveSync() {
  if (document.hidden || isLayoutResizing()) return;
  const now = Date.now();
  if (now - nativeChatTimelineActiveSyncLastAt < NATIVE_TIMELINE_ACTIVE_SYNC_MIN_MS) return;
  if (nativeChatTimelineActiveSyncRaf) return;
  nativeChatTimelineActiveSyncRaf = requestAnimationFrame(() => {
    nativeChatTimelineActiveSyncRaf = null;
    nativeChatTimelineActiveSyncLastAt = Date.now();
    syncNativeTimelineActiveFromViewport();
  });
}

function attachObserver(container) {
  if (chatObserver) {
    chatObserver.disconnect();
  }

  chatContainer = container;
  const desc = describeNode(container);
  updateDebugState({
    observerConnected: true,
    containerTag: desc.tag,
    containerClass: desc.className
  });
  chatObserver = new MutationObserver((records) => {
    if (document.hidden) return;
    if (!shouldProcessChatMutations(records)) return;
    queueScan();
    scheduleNativeMainConversationNoteRender(180);
    scheduleNativePromptLibraryRender(90);
  });

  chatObserver.observe(chatContainer, {
    childList: true,
    subtree: true
  });

  queueScan();
  scheduleNativeMainConversationNoteRender(90, true);
}

function bootstrapObserver() {
  const immediateContainer = pickChatContainer();
  if (immediateContainer) {
    attachObserver(immediateContainer);
    return;
  }

  const rootObserver = new MutationObserver(() => {
    const container = pickChatContainer();
    if (!container) return;

    rootObserver.disconnect();
    attachObserver(container);
  });

  rootObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function findResponseByEntryId(entryId) {
  const cached = domEntryMap.get(entryId);
  if (cached) {
    if (cached.responseNode?.isConnected) return cached.responseNode;
    if (cached.userNode?.isConnected) return cached.userNode;
  }

  if (!chatContainer) return null;

  const { users, responses } = getMessageNodes(chatContainer);
  let pairs = pairConversationNodes(users, responses);
  if (!pairs.length) {
    const fallbackResponses = getLooseAssistantNodes(chatContainer);
    pairs = fallbackResponses.map((responseNode, index) => ({ userNode: null, responseNode, index }));
  }

  for (let i = 0; i < pairs.length; i += 1) {
    const { userNode, responseNode, index } = pairs[i];
    const turn = buildTurnFromPair(userNode, responseNode, index);
    if (!turn) continue;
    domEntryMap.set(turn.id, { userNode: userNode || null, responseNode });
    if (turn.id === entryId) {
      return responseNode?.isConnected ? responseNode : userNode;
    }
  }

  return null;
}

function findResponseByLocator(entryId, domIndex, options = {}) {
  const strictEntryMatch = Boolean(options?.strictEntryMatch);
  const byEntryId = findResponseByEntryId(entryId);
  if (byEntryId) return byEntryId;
  if (Number.isInteger(domIndex) && chatContainer) {
    const { users, responses } = getMessageNodes(chatContainer);
    let pairs = pairConversationNodes(users, responses);
    if (!pairs.length) {
      const fallbackResponses = getLooseAssistantNodes(chatContainer);
      pairs = fallbackResponses.map((responseNode, index) => ({ userNode: null, responseNode, index }));
    }

    for (let i = 0; i < pairs.length; i += 1) {
      const { userNode, responseNode, index } = pairs[i];
      if (index !== domIndex) continue;
      const turn = buildTurnFromPair(userNode, responseNode, index);
      if (!turn) continue;
      if (strictEntryMatch && entryId && turn.id !== entryId) continue;
      return responseNode?.isConnected ? responseNode : userNode;
    }
  }
  return null;
}

function scrollTimelineTargetIntoView(target, entryId = "", options = {}) {
  if (!(target instanceof Element)) return false;
  const force = Boolean(options?.force);
  const now = Date.now();
  if (
    !force &&
    now < nativeTimelineJumpLockUntil &&
    entryId &&
    nativeTimelineJumpEntryId &&
    nativeTimelineJumpEntryId !== entryId
  ) {
    return false;
  }
  nativeTimelineJumpLockUntil = now + 80;
  nativeTimelineJumpEntryId = String(entryId || "");
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 900;
  const topGap = Math.max(
    TIMELINE_SCROLL_TOP_GAP_MIN_PX,
    Math.min(TIMELINE_SCROLL_TOP_GAP_MAX_PX, Math.round(viewportH * TIMELINE_SCROLL_TOP_GAP_VIEWPORT_RATIO))
  );
  // Always refresh to ensure old inline styles don't keep outdated offsets.
  target.style.scrollMarginTop = `${topGap}px`;
  target.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
  const rect = target.getBoundingClientRect();
  if (Number.isFinite(rect?.top)) {
    const adjust = Math.round(rect.top - topGap);
    if (adjust < -2) {
      let scrollParent = target.parentElement;
      while (scrollParent && scrollParent !== document.body && scrollParent !== document.documentElement) {
        const style = window.getComputedStyle(scrollParent);
        const overflowY = String(style.overflowY || "").toLowerCase();
        const canScroll = overflowY.includes("auto") || overflowY.includes("scroll") || overflowY.includes("overlay");
        if (canScroll && scrollParent.scrollHeight > scrollParent.clientHeight + 10) {
          break;
        }
        scrollParent = scrollParent.parentElement;
      }
      if (scrollParent && scrollParent !== document.body && scrollParent !== document.documentElement) {
        scrollParent.scrollBy({ top: adjust, behavior: "auto" });
      } else {
        window.scrollBy({ top: adjust, behavior: "auto" });
      }
    }
  }
  return true;
}

function notifySidePanelEntryActivated(entryId, domIndex = null, options = {}) {
  const normalizedEntryId = String(entryId || "").trim();
  if (!normalizedEntryId || !isConcreteConversationId(currentConversationId)) return;
  try {
    chrome.runtime.sendMessage(
      {
        type: "GEMINI_SELECT_ENTRY",
        conversationId: currentConversationId,
        entryId: normalizedEntryId,
        domIndex: Number.isInteger(domIndex) ? domIndex : null,
        syncScroll: Boolean(options?.syncScroll),
        force: Boolean(options?.force)
      },
      () => void chrome.runtime?.lastError
    );
  } catch {}
}

function notifySidePanelTurnActivated(turnId, options = {}) {
  const normalizedTurnId = String(turnId || "").trim();
  if (!normalizedTurnId) return;
  const force = Boolean(options?.force);
  if (!force && normalizedTurnId === nativeChatTimelineLastNotifiedTurnId) return;
  const turn = nativeChatTimelineTurnsCache.find((item) => item?.id === normalizedTurnId);
  if (!turn) return;
  nativeChatTimelineLastNotifiedTurnId = normalizedTurnId;
  notifySidePanelEntryActivated(normalizedTurnId, Number.isInteger(turn.domIndex) ? turn.domIndex : null, options);
}

function collectSnapshotCandidateRoots(container) {
  const roots = [];
  const seen = new Set();
  const pushRoot = (node) => {
    if (!(node instanceof Element) || seen.has(node)) return;
    seen.add(node);
    roots.push(node);
  };

  pushRoot(container);
  if (container instanceof Element) {
    pushRoot(container.closest("main, [role='main'], ms-chat-view, chat-window, #chat-history"));
    pushRoot(container.parentElement);
    pushRoot(container.parentElement?.parentElement || null);
  }
  pushRoot(document.querySelector("main"));
  pushRoot(document.querySelector("[role='main']"));
  pushRoot(document.body);
  return roots;
}

function mergeSnapshotTurnVariants(baseTurn, nextTurn) {
  if (!baseTurn) return nextTurn ? { ...nextTurn } : null;
  if (!nextTurn) return { ...baseTurn };
  const baseScore =
    normalizeText(baseTurn.question || "").length * 4 +
    normalizeText(baseTurn.answerMarkdown || "").length * 2 +
    normalizeText(baseTurn.summary || "").length;
  const nextScore =
    normalizeText(nextTurn.question || "").length * 4 +
    normalizeText(nextTurn.answerMarkdown || "").length * 2 +
    normalizeText(nextTurn.summary || "").length;
  const preferred = nextScore >= baseScore ? nextTurn : baseTurn;
  const fallback = preferred === nextTurn ? baseTurn : nextTurn;
  return {
    ...fallback,
    ...preferred,
    id: preferred.id || fallback.id,
    question: preferred.question || fallback.question || "",
    answerMarkdown: preferred.answerMarkdown || fallback.answerMarkdown || "",
    summary: preferred.summary || fallback.summary || "",
    timestamp: Math.max(Number(preferred.timestamp) || 0, Number(fallback.timestamp) || 0),
    domIndex: Number.isInteger(preferred.domIndex) ? preferred.domIndex : fallback.domIndex
  };
}

function collectSnapshotTurnsFromRoot(root, options = {}) {
  if (!(root instanceof Element)) {
    return {
      turns: [],
      usersCount: 0,
      responsesCount: 0,
      looseCount: 0,
      pairsCount: 0,
      fallbackTurns: 0
    };
  }

  const { users, responses } = getMessageNodes(root);
  let pairs = pairConversationNodes(users, responses);
  let looseCount = 0;
  if (!pairs.length) {
    const fallbackResponses = getLooseAssistantNodes(root);
    looseCount = fallbackResponses.length;
    pairs = fallbackResponses.map((responseNode, index) => ({ userNode: null, responseNode, index }));
  }

  const turns = [];
  let fallbackTurns = 0;
  for (let i = 0; i < pairs.length; i += 1) {
    const { userNode, responseNode, index } = pairs[i];
    if (isLikelyStreaming(responseNode)) continue;
    const turn = buildTurnFromPair(userNode, responseNode, index);
    if (!turn) continue;
    if (options.updateDomMap !== false) {
      domEntryMap.set(turn.id, { userNode: userNode || null, responseNode });
    }
    turns.push(turn);
  }

  if (!turns.length) {
    const rawFallback = getLooseAssistantNodes(root);
    rawFallback.forEach((responseNode) => {
      if (isLikelyStreaming(responseNode)) return;
      const answerMarkdown = getResponseMarkdown(responseNode);
      if (!answerMarkdown || isNoiseResponseText(answerMarkdown)) return;
      fallbackTurns += 1;
    });
  }

  return {
    turns,
    usersCount: users.length,
    responsesCount: responses.length,
    looseCount,
    pairsCount: pairs.length,
    fallbackTurns
  };
}

function collectSnapshotTurns() {
  const container =
    chatContainer && chatContainer.isConnected ? chatContainer : pickChatContainer() || document.body;
  if (!container) return [];
  const primary = collectSnapshotTurnsFromRoot(container, { updateDomMap: true });
  let turns = primary.turns.slice();
  let usersCount = primary.usersCount;
  let responsesCount = primary.responsesCount;
  let looseCount = primary.looseCount;
  let pairsCount = primary.pairsCount;
  let fallbackTurns = primary.fallbackTurns;

  if (turns.length <= 3) {
    const merged = new Map();
    turns.forEach((turn) => {
      if (!turn?.id) return;
      merged.set(turn.id, turn);
    });
    collectSnapshotCandidateRoots(container).forEach((root) => {
      const result = root === container
        ? primary
        : collectSnapshotTurnsFromRoot(root, { updateDomMap: true });
      usersCount = Math.max(usersCount, result.usersCount);
      responsesCount = Math.max(responsesCount, result.responsesCount);
      looseCount = Math.max(looseCount, result.looseCount);
      pairsCount = Math.max(pairsCount, result.pairsCount);
      fallbackTurns = Math.max(fallbackTurns, result.fallbackTurns);
      result.turns.forEach((turn) => {
        if (!turn?.id) return;
        merged.set(turn.id, mergeSnapshotTurnVariants(merged.get(turn.id), turn));
      });
    });
    turns = Array.from(merged.values())
      .filter(Boolean)
      .sort((a, b) => {
        const ta = Number(a?.timestamp) || 0;
        const tb = Number(b?.timestamp) || 0;
        if (ta !== tb) return ta - tb;
        const da = Number.isInteger(a?.domIndex) ? a.domIndex : 999999;
        const db = Number.isInteger(b?.domIndex) ? b.domIndex : 999999;
        return da - db;
      });
  }

  updateDebugState({
    lastScanAt: Date.now(),
    lastScanUsers: usersCount,
    lastScanResponses: responsesCount,
    lastScanLooseResponses: looseCount,
    lastScanPairs: pairsCount,
    lastSnapshotTurns: turns.length,
    lastSnapshotFallbackTurns: fallbackTurns
  });

  return turns;
}

async function collectDebugStats() {
  const container = chatContainer && chatContainer.isConnected ? chatContainer : pickChatContainer() || document.body;
  const { users, responses } = getMessageNodes(container);
  const looseResponses = getLooseAssistantNodes(container);
  const pairs = pairConversationNodes(users, responses);
  const snapshotTurns = collectSnapshotTurns();

  let storageEntries = 0;
  let storageError = "";
  try {
    const key = toStorageKey(currentConversationId);
    const result = await storageGet(key);
    const entries = result?.[key]?.entries;
    storageEntries = Array.isArray(entries) ? entries.length : 0;
  } catch (error) {
    storageError = error?.message || "unknown storage error";
  }

  return {
    conversationId: currentConversationId,
    url: location.href,
    usersCount: users.length,
    responsesCount: responses.length,
    looseResponsesCount: looseResponses.length,
    pairsCount: pairs.length,
    snapshotTurns: snapshotTurns.length,
    storageEntries,
    storageError,
    knownTurnIds: knownTurnIds.size,
    observerConnected: Boolean(chatObserver),
    perfTrace: perfTrace.slice(0, 12),
    ...debugState
  };
}

function formatLocalTime(ts) {
  const date = new Date(ts || Date.now());
  return new Intl.DateTimeFormat(getContentIntlLocale(), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function ensureFollowupDrawerStyles() {
  if (document.getElementById("gemini-followup-drawer-style")) return;

  const style = document.createElement("style");
  style.id = "gemini-followup-drawer-style";
  style.textContent = `
    #gemini-followup-drawer {
      position: fixed;
      top: 0;
      right: -420px;
      width: min(420px, 92vw);
      height: 100vh;
      z-index: 2147483646;
      background: #fff;
      box-shadow: -16px 0 40px rgba(0, 0, 0, 0.16);
      border-left: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      transition: right 0.25s ease;
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    #gemini-followup-drawer.open {
      right: 0;
    }
    #gemini-followup-drawer .gtf-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 14px 10px;
      border-bottom: 1px solid #eceff3;
      background: linear-gradient(180deg, #f6f9ff 0%, #ffffff 100%);
    }
    #gemini-followup-drawer .gtf-head h3 {
      margin: 0;
      font-size: 14px;
      line-height: 1.35;
      color: #111827;
    }
    #gemini-followup-drawer .gtf-head p {
      margin: 4px 0 0;
      font-size: 13px;
      color: #64748b;
      line-height: 1.4;
    }
    #gemini-followup-drawer .gtf-close {
      border: 1px solid #d7dde7;
      background: #fff;
      color: #1f2937;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }
    #gemini-followup-drawer .gtf-body {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    #gemini-followup-drawer .gtf-meta {
      margin: 0;
      font-size: 12px;
      color: #64748b;
    }
    #gemini-followup-drawer .gtf-card {
      border: 1px solid #e5e7eb;
      background: #fbfcfd;
      border-radius: 10px;
      padding: 9px 10px;
    }
    #gemini-followup-drawer .gtf-card-title {
      margin: 0 0 6px;
      font-size: 11px;
      color: #6b7280;
      letter-spacing: 0.03em;
    }
    #gemini-followup-drawer .gtf-card-content {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      color: #1f2937;
      max-height: 140px;
      overflow: auto;
    }
    #gemini-followup-drawer .gtf-input {
      width: 100%;
      min-height: 110px;
      resize: vertical;
      border: 1px solid #d6dbe5;
      border-radius: 10px;
      padding: 10px;
      font-size: 13px;
      line-height: 1.5;
      color: #111827;
      background: #fff;
      outline: none;
    }
    #gemini-followup-drawer .gtf-input:focus {
      border-color: #4f8cff;
      box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.12);
    }
    #gemini-followup-drawer .gtf-foot {
      padding: 12px 14px;
      border-top: 1px solid #eceff3;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      background: #fff;
    }
    #gemini-followup-drawer .gtf-btn {
      border: 1px solid transparent;
      border-radius: 9px;
      padding: 7px 10px;
      font-size: 12px;
      cursor: pointer;
    }
    #gemini-followup-drawer .gtf-btn.cancel {
      border-color: #d7dde7;
      background: #fff;
      color: #1f2937;
    }
    #gemini-followup-drawer .gtf-btn.primary {
      background: #2563eb;
      color: #fff;
    }
  `;

}

function buildFollowupPrompt(context, userQuestion) {
  return [
    currentLocale === "en"
      ? "Continue the learning in a fresh Gemini chat. Use the original question, answer summary, and the user's new request below to write the next prompt."
      : "请基于下面的原问题、回答摘要和新的追问需求，整理出一段适合在全新 Gemini 会话里继续学习的提示词。",
    "",
    currentLocale === "en" ? "[Original Question]" : "[原问题]",
    context.question || (currentLocale === "en" ? "(empty)" : "(空)"),
    "",
    currentLocale === "en" ? "[Original Answer Summary]" : "[原回答摘要]",
    context.answerMarkdown || (currentLocale === "en" ? "(empty)" : "(空)"),
    "",
    currentLocale === "en" ? "[New Request]" : "[新的追问需求]",
    userQuestion
  ].join("\n");
}

function ensureFollowupDrawer() {
  ensureFollowupDrawerStyles();

  if (followupDrawerEl && followupDrawerEl.isConnected) {
    return followupDrawerEl;
  }

  const el = document.createElement("section");
  el.id = "gemini-followup-drawer";
  el.innerHTML = `
    <div class="gtf-head">
      <div>
        <h3>${currentLocale === "en" ? "Start a New Chat From This Note" : "基于当前笔记发起新会话"}</h3>
        <p>${currentLocale === "en"
          ? "Summarize what you want to continue, then open a clean Gemini chat with this context."
          : "先概括你想继续追问的方向，再带着这段上下文打开一个全新的 Gemini 会话。"}</p>
      </div>
      <button class="gtf-close" type="button" title="${currentLocale === "en" ? "Close" : "关闭"}">×</button>
    </div>
    <div class="gtf-body">
      <p id="gtfMeta" class="gtf-meta"></p>
      <div class="gtf-card">
        <p class="gtf-card-title">${currentLocale === "en" ? "Original Question" : "原问题"}</p>
        <pre id="gtfQuestion" class="gtf-card-content"></pre>
      </div>
      <div class="gtf-card">
        <p class="gtf-card-title">${currentLocale === "en" ? "Original Answer Summary" : "原回答摘要"}</p>
        <pre id="gtfAnswer" class="gtf-card-content"></pre>
      </div>
      <textarea id="gtfInput" class="gtf-input" placeholder="${currentLocale === "en"
        ? "Example: keep the previous answer concise, then explain the last step with one more concrete example."
        : "例如：保留上一条回答的结论，但把最后一步再用一个更具体的例子讲清楚。"}"></textarea>
    </div>
    <div class="gtf-foot">
      <button id="gtfCancel" class="gtf-btn cancel" type="button">${currentLocale === "en" ? "Cancel" : "取消"}</button>
      <button id="gtfOpenNew" class="gtf-btn primary" type="button">${currentLocale === "en" ? "Open New Chat" : "打开新会话"}</button>
    </div>
  `;

  const closeDrawer = () => {
    el.classList.remove("open");
  };

  el.querySelector(".gtf-close").addEventListener("click", closeDrawer);
  el.querySelector("#gtfCancel").addEventListener("click", closeDrawer);

  el.querySelector("#gtfOpenNew").addEventListener("click", async () => {
    const inputEl = el.querySelector("#gtfInput");
    const question = normalizeText(inputEl.value || "");

    if (!question) {
      inputEl.focus();
      return;
    }

    if (!followupContext) return;

    const prompt = buildFollowupPrompt(followupContext, question);

    try {
      await storageSet({
        [PENDING_FOLLOWUP_KEY]: {
          prompt,
          createdAt: Date.now(),
          sourceConversationId: followupContext.sourceConversationId || "",
          sourceEntryId: followupContext.entryId || "",
          targetPath: "/app"
        }
      });
    } catch (error) {
      console.error("[Gemini Timeline] failed to cache followup prompt", error);
      return;
    }

    window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
    inputEl.value = "";
    closeDrawer();
  });

  document.documentElement.appendChild(el);
  followupDrawerEl = el;
  return el;
}

function openFollowupDrawer(payload) {
  const drawer = ensureFollowupDrawer();
  followupContext = {
    sourceConversationId: payload.sourceConversationId || "",
    entryId: payload.entryId || "",
    timestamp: payload.timestamp || Date.now(),
    summary: payload.summary || "",
    question: payload.question || "",
    answerMarkdown: payload.answerMarkdown || ""
  };

  drawer.querySelector("#gtfMeta").textContent = `${followupContext.summary || (currentLocale === "en" ? "Untitled note" : "未命名笔记")} · ${formatLocalTime(followupContext.timestamp)}`;
  drawer.querySelector("#gtfQuestion").textContent = followupContext.question || (currentLocale === "en" ? "(empty)" : "(空)");
  drawer.querySelector("#gtfAnswer").textContent = followupContext.answerMarkdown || (currentLocale === "en" ? "(empty)" : "(空)");
  drawer.classList.add("open");

  const inputEl = drawer.querySelector("#gtfInput");
  inputEl.focus();
}

function isVisible(el) {
  if (!el) return false;
  if (el.offsetParent !== null) return true;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function normalizeComposerTextForCompare(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function isGeminiAppRoute(pathname = location.pathname) {
  return /^\/app(?:\/.*)?$/.test(String(pathname || ""));
}

function findComposerInput() {
  const selectors = [
    "rich-textarea textarea",
    "textarea[aria-label*='\u6d88\u606f']",
    "textarea[aria-label*='message']",
    "textarea[placeholder]",
    "textarea",
    "div[contenteditable='true'][role='textbox']",
    "div[contenteditable='true']"
  ];
  const activeEl = document.activeElement;
  const candidates = [];

  selectors.forEach((selector, order) => {
    document.querySelectorAll(selector).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (!isVisible(node)) return;
      if (node.classList.contains("gtf-inline-annotation-textarea")) return;
      if (node.id === "gtfInput") return;
      if (node.closest("#gemini-followup-drawer, #gtf-native-folder-shell, #gtf-quick-quote-bar")) return;
      if (node instanceof HTMLInputElement && node.type && node.type !== "text") return;
      if ("disabled" in node && node.disabled) return;
      if ("readOnly" in node && node.readOnly) return;

      const rect = node.getBoundingClientRect();
      const textHints = normalizeText(
        `${node.getAttribute("aria-label") || ""} ${node.getAttribute("placeholder") || ""} ${node.getAttribute("data-test-id") || ""}`
      ).toLowerCase();
      let score = Math.max(0, 40 - order * 3);
      if (activeEl === node) score += 18;
      if (activeEl instanceof Element && (node.contains(activeEl) || activeEl.contains(node))) score += 12;
      if (node.matches("div[contenteditable='true'][role='textbox']")) score += 10;
      if (node.matches("rich-textarea textarea")) score += 12;
      if (node.closest("form, footer, [role='form']")) score += 8;
      if (/message|prompt|chat|ask|输入|提问|发送/.test(textHints)) score += 8;
      if (rect.height >= 32) score += 4;
      if (rect.width >= 280) score += 4;
      candidates.push({ node, score });
    });
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.node || null;
}

function getComposerScopeRoot(inputEl = null) {
  const input = inputEl || findComposerInput();
  if (!input) return document;
  return (
    input.closest("form, [role='form'], [class*='composer'], [class*='input'], [class*='chat-input'], [class*='message-input']") ||
    input.parentElement ||
    document
  );
}

function findPromptLibraryToolbarMount(inputEl = null) {
  const input = inputEl || findComposerInput();
  if (!input) return { mountTarget: null, beforeNode: null };
  const sendBtn = findSendButton(input);
  if (sendBtn instanceof Element) {
    const directParent = sendBtn.parentElement;
    const parentElementCount = directParent instanceof Element
      ? [...directParent.children].filter((node) => node instanceof HTMLElement && isVisible(node)).length
      : 0;
    if (directParent instanceof Element && parentElementCount > 1) {
      return { mountTarget: directParent, beforeNode: sendBtn };
    }
    const outerParent = directParent?.parentElement;
    if (outerParent instanceof Element) {
      return {
        mountTarget: outerParent,
        beforeNode: directParent instanceof Node ? directParent : sendBtn
      };
    }
  }
  const scope = getComposerScopeRoot(input);
  if (scope instanceof Element) {
    const toolbar = scope.querySelector(
      "[role='toolbar'], footer, [class*='toolbar'], [class*='action'], [class*='button'], [class*='composer']"
    );
    if (toolbar instanceof Element) {
      return { mountTarget: toolbar, beforeNode: null };
    }
    const form = input.closest("form");
    if (form instanceof Element) {
      return { mountTarget: form, beforeNode: null };
    }
    return { mountTarget: scope, beforeNode: null };
  }
  return { mountTarget: null, beforeNode: null };
}

function placeNativePromptLibraryRoot(inputEl = null) {
  if (!(nativePromptLibraryRoot instanceof HTMLElement)) return false;
  const { mountTarget, beforeNode } = findPromptLibraryToolbarMount(inputEl);
  if (!(mountTarget instanceof Element) || !mountTarget.isConnected) return false;
  const parent = nativePromptLibraryRoot.parentElement;
  
  // Guard against HierarchyRequestError (The new child element contains the parent)
  if (nativePromptLibraryRoot.contains(mountTarget)) {
    return false;
  }
  
  if (parent !== mountTarget) {
    // Also check if beforeNode is a child of mountTarget before inserting
    const validBeforeNode = (beforeNode instanceof Node && beforeNode.parentNode === mountTarget) ? beforeNode : null;
    mountTarget.insertBefore(nativePromptLibraryRoot, validBeforeNode);
    return true;
  }
  if (beforeNode instanceof Node && beforeNode.parentNode === mountTarget && nativePromptLibraryRoot.nextSibling !== beforeNode) {
    mountTarget.insertBefore(nativePromptLibraryRoot, beforeNode);
    return true;
  }
  return true;
}

function findSendButton(inputEl = null) {
  const selectors = [
    "button[aria-label*='\u53d1\u9001']",
    "button[aria-label*='Send']",
    "button[data-testid*='send']",
    "button.send-button",
    "button[type='submit']"
  ];
  const scope = getComposerScopeRoot(inputEl);
  const roots = [scope, document];
  const seen = new Set();
  const candidates = [];

  roots.forEach((root, rootIndex) => {
    if (!root || typeof root.querySelectorAll !== "function") return;
    selectors.forEach((selector, selectorIndex) => {
      root.querySelectorAll(selector).forEach((node) => {
        if (!(node instanceof HTMLButtonElement) || !isVisible(node) || seen.has(node)) return;
        if (node.closest("#gemini-followup-drawer, #gtf-native-folder-shell")) return;
        seen.add(node);
        const text = getInteractiveText(node);
        let score = 40 - selectorIndex * 4 - rootIndex * 8;
        if (scope instanceof Element && scope.contains(node)) score += 18;
        if (node.closest("form") && inputEl?.closest?.("form") === node.closest("form")) score += 14;
        if (/send|发送|submit|arrow up/.test(text)) score += 10;
        if (node.type === "submit") score += 6;
        if (node.disabled) score -= 4;
        candidates.push({ node, score });
      });
    });
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.node || null;
}

async function triggerSendFromComposer(inputEl) {
  if (!inputEl) return false;
  let activeInput = inputEl;
  const initialText = getComposerText(activeInput).trim();
  if (!initialText) return false;

  const didComposerStateAdvance = () => {
    activeInput = findComposerInput() || activeInput;
    const currentText = getComposerText(activeInput).trim();
    const sendBtn = findSendButton(activeInput);
    return !currentText || (sendBtn instanceof HTMLElement && sendBtn.disabled);
  };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    activeInput = findComposerInput() || activeInput;
    activeInput.focus();
    const sendBtn = await waitForSendButtonReady(activeInput, 900);
    if (sendBtn instanceof HTMLElement && !sendBtn.disabled) {
      sendBtn.click();
      await wait(100);
      if (didComposerStateAdvance()) return true;
    }

    const form = activeInput.closest("form");
    if (form && typeof form.requestSubmit === "function") {
      form.requestSubmit();
      await wait(100);
      if (didComposerStateAdvance()) return true;
    }

    activeInput.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      })
    );
    activeInput.dispatchEvent(
      new KeyboardEvent("keypress", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      })
    );
    activeInput.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true
      })
    );
    await wait(120);
    if (didComposerStateAdvance()) return true;
    await wait(80);
  }

  return false;
}

function getInteractiveText(node) {
  if (!node || !(node instanceof Element)) return "";
  const aria = node.getAttribute("aria-label") || "";
  const title = node.getAttribute("title") || "";
  const text = node.textContent || "";
  return normalizeText(`${aria} ${title} ${text}`).toLowerCase();
}

function inferComposerModeFromText(text) {
  const normalized = normalizeText(text).toLowerCase();
  if (!normalized) return "";

  const standardHints = ["\u6807\u51c6", "standard", "normal", "direct", "\u666e\u901a"];
  const thinkingHints = ["\u601d\u8003", "thinking", "reasoning", "\u63a8\u7406"];

  if (standardHints.some((item) => normalized.includes(item))) return "standard";
  if (thinkingHints.some((item) => normalized.includes(item))) return "thinking";
  return "";
}

function findComposerModeControl() {
  const roots = [getComposerScopeRoot(), document];
  const seen = new Set();
  const candidates = [];

  roots.forEach((root, idx) => {
    if (!root || typeof root.querySelectorAll !== "function") return;
    root.querySelectorAll("button, [role='button']").forEach((node) => {
      if (!(node instanceof HTMLElement) || node.disabled || !isVisible(node) || seen.has(node)) return;
      seen.add(node);
      const text = getInteractiveText(node);
      if (!text) return;
      if (!/(思考|thinking|标准|standard|模式|mode|normal|direct|普通)/i.test(text)) return;
      let score = idx === 0 ? 8 : 0;
      if (inferComposerModeFromText(text)) score += 8;
      if (node.getAttribute("aria-haspopup")) score += 3;
      if (node.closest("[role='toolbar'], form")) score += 2;
      candidates.push({ node, score });
    });
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.node || null;
}

function detectComposerMode() {
  const control = findComposerModeControl();
  const direct = inferComposerModeFromText(getInteractiveText(control));
  if (direct) return direct;

  const selected = [...document.querySelectorAll("[role='menuitemradio'][aria-checked='true'], [role='option'][aria-selected='true'], button[aria-pressed='true']")]
    .filter((node) => isVisible(node))
    .map((node) => inferComposerModeFromText(getInteractiveText(node)))
    .find(Boolean);

  return selected || "";
}

function findComposerModeOption(desiredMode = "thinking") {
  const targetMode = desiredMode === "standard" ? "standard" : "thinking";
  const keywords =
    targetMode === "standard" ? ["标准", "standard", "normal", "direct", "普通"] : ["思考", "thinking", "reasoning", "推理"];

  const selector = "[role='menuitemradio'], [role='menuitem'], [role='option'], button, [mat-menu-item], li";
  let best = null;
  document.querySelectorAll(selector).forEach((node) => {
    if (!(node instanceof HTMLElement) || node.disabled || !isVisible(node)) return;
    const text = getInteractiveText(node);
    if (!text) return;
    if (!keywords.some((word) => text.includes(word))) return;

    let score = 0;
    if (node.closest("[role='menu'], [role='listbox'], .cdk-overlay-pane, .mat-mdc-menu-panel, .menu, .dropdown")) score += 4;
    if (node.getAttribute("aria-checked") === "true" || node.getAttribute("aria-selected") === "true") score += 1;
    if (!best || score > best.score) {
      best = { node, score };
    }
  });
  return best?.node || null;
}

async function setComposerMode(mode = "thinking") {
  const desiredMode = mode === "standard" ? "standard" : "thinking";
  const before = detectComposerMode();
  if (before === desiredMode) {
    return { ok: true, mode: before, changed: false };
  }

  const control = findComposerModeControl();
  if (!control) {
    return { ok: false, error: "mode control not found", mode: before || "" };
  }

  control.click();
  await wait(90);

  let switched = false;
  const option = findComposerModeOption(desiredMode);
  if (option) {
    option.click();
    switched = true;
  } else {
    await wait(120);
    const toggled = detectComposerMode();
    if (toggled === desiredMode) {
      switched = true;
    }
  }

  await wait(120);
  const after = detectComposerMode();
  if (switched && (!after || after === desiredMode)) {
    return { ok: true, mode: after || desiredMode, changed: true };
  }
  if (after === desiredMode) {
    return { ok: true, mode: after, changed: true };
  }
  return { ok: false, error: "mode switch failed", mode: after || before || "" };
}

function inputAcceptMatchesKind(input, kind = "file") {
  if (!input) return false;
  const accept = (input.accept || "").toLowerCase();
  if (!accept) return true;
  if (kind === "image") {
    return accept.includes("image") || accept.includes(".png") || accept.includes(".jpg") || accept.includes(".jpeg") || accept.includes(".webp");
  }
  return true;
}

function clickNativeFileInput(kind = "file") {
  const scope = getComposerScopeRoot();
  const inputs = [...document.querySelectorAll("input[type='file']")];
  const candidates = inputs.filter((input) => inputAcceptMatchesKind(input, kind));
  const targetInScope =
    scope && scope instanceof Element ? candidates.find((input) => scope.contains(input) || input.closest("form") === scope.closest?.("form")) : null;
  const target = targetInScope || candidates[0] || null;
  if (!target) return false;
  try {
    target.click();
    return true;
  } catch {
    return false;
  }
}

function findComposerAttachButton() {
  const roots = [getComposerScopeRoot(), document];
  const seen = new Set();
  const candidates = [];

  roots.forEach((root, idx) => {
    if (!root || typeof root.querySelectorAll !== "function") return;
    root.querySelectorAll("button, [role='button'], label").forEach((node) => {
      if (!(node instanceof HTMLElement) || node.disabled || !isVisible(node) || seen.has(node)) return;
      seen.add(node);
      const text = getInteractiveText(node);
      if (!text) return;
      if (!/(\+|add|上传|upload|附件|attach|图片|image|文件|file)/i.test(text)) return;
      let score = idx === 0 ? 6 : 0;
      if (/(\+|add)/i.test(text)) score += 3;
      if (/上传|upload|附件|attach/i.test(text)) score += 2;
      candidates.push({ node, score });
    });
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.node || null;
}

function clickUploadMenuOption(kind = "file") {
  const imageWords = ["\u56fe\u7247", "\u56fe\u50cf", "image", "photo", "\u7167\u7247"];
  const fileWords = ["\u6587\u4ef6", "file", "document", "\u6587\u6863", "pdf"];
  const genericWords = ["\u4e0a\u4f20", "upload", "\u9644\u4ef6", "attach"];
  const preferLocalWords = [
    "\u672c\u5730",
    "\u8bbe\u5907",
    "\u7535\u8111",
    "\u672c\u673a",
    "local",
    "device",
    "computer",
    "from device",
    "your device",
  ];
  const avoidNonLocalWords = [
    "\u5bf9\u8bdd",
    "\u804a\u5929",
    "\u5386\u53f2",
    "\u5df2\u53d1\u9001",
    "\u56fe\u5e93",
    "\u76f8\u518c",
    "gallery",
    "camera",
    "conversation",
    "chat",
    "history",
    "drive",
    "google drive",
    "\u4e91\u76d8",
    "url",
    "link",
  ];
  const targetWords = kind === "image" ? imageWords : fileWords;

  const selector = "[role='menuitem'], [role='option'], button, li, [role='button']";
  const candidates = [];
  document.querySelectorAll(selector).forEach((node) => {
    if (!(node instanceof HTMLElement) || node.disabled || !isVisible(node)) return;
    const text = getInteractiveText(node);
    if (!text) return;
    const hasTarget = targetWords.some((word) => text.includes(word));
    const hasGeneric = genericWords.some((word) => text.includes(word));
    if (!hasTarget && !hasGeneric) return;
    let score = 0;
    if (hasTarget) score += 6;
    if (hasGeneric) score += 2;
    if (preferLocalWords.some((w) => text.includes(w))) score += 8;
    if (avoidNonLocalWords.some((w) => text.includes(w))) score -= 8;
    if (node.closest("[role='menu'], [role='listbox'], .cdk-overlay-pane, .mat-mdc-menu-panel, .menu, .dropdown")) score += 3;
    candidates.push({ node, score, text });
  });

  candidates.sort((a, b) => b.score - a.score);

  for (const item of candidates) {
    try {
      item.node.click();
    } catch {}
    // Give menu action a brief moment to render file input
    // The actual open will be triggered by clickNativeFileInput
    // which ensures we use the system picker
    // Return true only if the native input is clickable
    if (clickNativeFileInput(kind)) {
      return true;
    }
  }
  return false;
}

async function openNativeUploadPicker(kind = "file") {
  const uploadKind = kind === "image" ? "image" : "file";

  if (clickNativeFileInput(uploadKind)) {
    return { ok: true, source: "input-direct" };
  }

  const attachBtn = findComposerAttachButton();
  if (attachBtn) {
    attachBtn.click();
    await wait(90);
  }

  // Try clicking upload menu options with a strong preference for local device,
  // only succeed if we can subsequently trigger the native file input.
  const ensured = clickUploadMenuOption(uploadKind);
  if (ensured) return { ok: true, source: "menu-input" };

  if (clickNativeFileInput(uploadKind)) {
    return { ok: true, source: "input-late" };
  }

  return { ok: false, error: "upload control not found" };
}

function fillComposerInput(inputEl, text) {
  const normalized = text || "";
  if (!inputEl) return;
  inputEl.focus();
  if (typeof inputEl.click === "function") {
    try {
      inputEl.click();
    } catch {}
  }

  if (typeof InputEvent === "function") {
    try {
      inputEl.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: normalized
      }));
    } catch {}
  }

  if (typeof inputEl.value === "string") {
    const prototype = inputEl instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : (inputEl instanceof HTMLInputElement ? HTMLInputElement.prototype : Object.getPrototypeOf(inputEl));
    const descriptor = prototype ? Object.getOwnPropertyDescriptor(prototype, "value") : null;
    const setter = descriptor?.set;
    if (typeof setter === "function") {
      setter.call(inputEl, normalized);
    } else {
      inputEl.value = normalized;
    }
  } else {
    inputEl.textContent = normalized;
  }
  if (typeof InputEvent === "function") {
    inputEl.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, data: normalized }));
  } else {
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  }
  inputEl.dispatchEvent(new Event("keyup", { bubbles: true }));
  inputEl.dispatchEvent(new Event("change", { bubbles: true }));
  setComposerCaretToEnd(inputEl);
}

function replaceComposerTextWithExecCommand(inputEl, text) {
  if (!(inputEl instanceof HTMLElement) || typeof document.execCommand !== "function") return false;
  try {
    inputEl.focus();
    if (inputEl.isContentEditable) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(inputEl);
      range.deleteContents();
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else if (typeof inputEl.select === "function") {
      inputEl.select();
    }
    document.execCommand("insertText", false, text);
    return true;
  } catch {
    return false;
  }
}

function getComposerText(inputEl) {
  if (!inputEl) return "";
  if (typeof inputEl.value === "string") return inputEl.value;
  return inputEl.innerText || inputEl.textContent || "";
}

function setComposerCaretToEnd(inputEl) {
  if (!inputEl) return;
  if (typeof inputEl.selectionStart === "number") {
    const len = (inputEl.value || "").length;
    inputEl.selectionStart = len;
    inputEl.selectionEnd = len;
    return;
  }
  if (inputEl.isContentEditable) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(inputEl);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function focusComposerInputElement(inputEl) {
  if (!(inputEl instanceof HTMLElement)) return;
  inputEl.focus();
  setComposerCaretToEnd(inputEl);
  if (typeof inputEl.scrollIntoView === "function") {
    inputEl.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function appendTextToComposer(inputEl, text) {
  const incoming = (text || "").replace(/\r\n/g, "\n").trim();
  if (!incoming) return false;

  const current = getComposerText(inputEl);
  const next = current && current.trim() ? `${current.replace(/\s+$/, "")}\n${incoming}` : incoming;
  fillComposerInput(inputEl, next);
  focusComposerInputElement(inputEl);
  return true;
}

function appendQuotedTextToComposer(inputEl, text) {
  const incoming = (text || "").replace(/\r\n/g, "\n").trim();
  if (!incoming) return false;

  const current = getComposerText(inputEl).replace(/\r\n/g, "\n");
  const normalizedCurrent = current.replace(/\s+$/, "");
  const quotedBlock = incoming
    .split("\n")
    .map((line) => `> ${line}`.trimEnd())
    .join("\n");
  const next = normalizedCurrent
    ? `${normalizedCurrent}\n\n${quotedBlock}\n\n`
    : `${quotedBlock}\n\n`;
  fillComposerInput(inputEl, next);
  focusComposerInputElement(inputEl);
  return true;
}

async function ensureComposerInputValue(inputEl, text, maxAttempts = 4) {
  const expected = normalizeComposerTextForCompare(text);
  if (!inputEl || !expected) return false;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    pushBranchDispatchTrace("composer_fill_attempt", {
      branchDispatchAttempt: attempt + 1
    });
    const activeInput = findComposerInput() || inputEl;
    fillComposerInput(activeInput, text);
    await wait(80 + attempt * 40);
    let current = normalizeComposerTextForCompare(getComposerText(activeInput));
    if (current === expected) {
      pushBranchDispatchTrace("composer_fill_ok", {
        branchDispatchComposerFound: true
      });
      return true;
    }

    if (typeof activeInput.setRangeText === "function" && typeof activeInput.value === "string") {
      try {
        activeInput.focus();
        activeInput.setSelectionRange(0, activeInput.value.length);
        activeInput.setRangeText(text, 0, activeInput.value.length, "end");
        activeInput.dispatchEvent(new Event("input", { bubbles: true }));
        activeInput.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
      await wait(90);
      current = normalizeComposerTextForCompare(getComposerText(activeInput));
      if (current === expected) {
        pushBranchDispatchTrace("composer_setrangetext_ok", {
          branchDispatchComposerFound: true
        });
        return true;
      }
    }

    if (replaceComposerTextWithExecCommand(activeInput, text)) {
      await wait(90);
      current = normalizeComposerTextForCompare(getComposerText(activeInput));
      if (current === expected) {
        pushBranchDispatchTrace("composer_execcommand_ok", {
          branchDispatchComposerFound: true
        });
        return true;
      }
    }
  }

  pushBranchDispatchTrace("composer_fill_failed");
  return false;
}

async function waitForSendButtonReady(inputEl, timeoutMs = 900) {
  const start = Date.now();
  let lastButton = null;
  pushBranchDispatchTrace("send_button_wait_start");
  while (Date.now() - start < timeoutMs) {
    const activeInput = findComposerInput() || inputEl;
    const currentText = normalizeComposerTextForCompare(getComposerText(activeInput));
    const button = findSendButton(activeInput);
    if (button instanceof HTMLElement) {
      lastButton = button;
      if (!button.disabled && currentText) {
        pushBranchDispatchTrace("send_button_ready", {
          branchDispatchSendReady: true
        });
        return button;
      }
    }
    await wait(80);
  }
  pushBranchDispatchTrace("send_button_wait_timeout", {
    branchDispatchSendReady: Boolean(lastButton && !lastButton.disabled)
  });
  return lastButton;
}

async function syncPromptToNativeComposer(prompt, options = {}) {
  const normalizedPrompt = String(prompt || "").replace(/\r\n/g, "\n").trim();
  if (!normalizedPrompt) {
    return { ok: false, error: "empty prompt" };
  }

  const maxAttempts = Number(options?.maxAttempts) || 5;
  const autoSend = options?.autoSend !== false;
  const sendTimeoutMs = Number(options?.sendTimeoutMs) || 1200;
  pushBranchDispatchTrace("composer_lookup_start", {
    branchDispatchPromptLength: normalizedPrompt.length
  });
  const input = (await waitForComposerInput(18, 180)) || findComposerInput();
  if (!input) {
    pushBranchDispatchTrace("composer_not_found", {
      branchDispatchComposerFound: false
    });
    return { ok: false, error: "composer not found" };
  }

  focusComposerInput();
  const activeInput = findComposerInput() || input;
  pushBranchDispatchTrace("composer_found", {
    branchDispatchComposerFound: true
  });
  const filled = await ensureComposerInputValue(activeInput, normalizedPrompt, maxAttempts);
  if (!filled) {
    return { ok: false, error: "composer value sync failed" };
  }
  if (!autoSend) {
    pushBranchDispatchTrace("composer_synced_no_send");
    return { ok: true, sent: false };
  }

  const readySendButton = await waitForSendButtonReady(activeInput, sendTimeoutMs);
  if (readySendButton instanceof HTMLElement && readySendButton.disabled) {
    return { ok: false, error: "send button not ready" };
  }
  const sent = await triggerSendFromComposer(activeInput);
  if (!sent) {
    pushBranchDispatchTrace("send_trigger_failed", {
      branchDispatchSent: false
    });
    return { ok: false, error: "unable to send" };
  }
  pushBranchDispatchTrace("send_trigger_ok", {
    branchDispatchSent: true
  });
  return { ok: true, sent: true };
}

function schedulePendingFollowupConsume(delay = FOLLOWUP_COMPOSER_RETRY_INTERVAL_MS) {
  if (pendingConsumeRetryTimer) {
    clearTimeout(pendingConsumeRetryTimer);
  }
  pendingConsumeRetryTimer = setTimeout(() => {
    pendingConsumeRetryTimer = null;
    consumePendingFollowupPrompt().catch(() => {});
  }, Math.max(60, Number(delay) || FOLLOWUP_COMPOSER_RETRY_INTERVAL_MS));
}

async function cachePendingFollowupPrompt(prompt, extra = {}) {
  const normalizedPrompt = String(prompt || "").replace(/\r\n/g, "\n").trim();
  if (!normalizedPrompt) return false;
  await storageSet({
    [PENDING_FOLLOWUP_KEY]: {
      prompt: normalizedPrompt,
      autoSend: extra?.autoSend !== false,
      createdAt: Date.now(),
      sourceConversationId: extra?.sourceConversationId || currentConversationId || "",
      sourceEntryId: extra?.sourceEntryId || "",
      targetPath: extra?.targetPath || location.pathname || "/app"
    }
  });
  pushBranchDispatchTrace("pending_cached", {
    branchDispatchQueued: true
  });
  return true;
}

function getCurrentSelectionText() {
  const selection = window.getSelection();
  if (!selection) return "";
  return (selection.toString() || "").replace(/\r\n/g, "\n").trim();
}

function getSelectionTextWithMath(selection, maxLen = 8000) {
  if (!selection || selection.rangeCount < 1 || selection.isCollapsed) return "";
  const chunks = [];
  for (let i = 0; i < selection.rangeCount; i += 1) {
    const range = selection.getRangeAt(i);
    const clone = range.cloneContents();
    const wrapper = document.createElement("div");
    wrapper.appendChild(clone);
    replaceMathNodesWithTex(wrapper);
    wrapper.querySelectorAll("button, svg, img, video, audio, script, style").forEach((el) => el.remove());
    const text = normalizeText(wrapper.innerText || wrapper.textContent || "");
    if (text) chunks.push(text);
  }
  const merged = chunks.join("\n").replace(/\r\n/g, "\n").trim();
  if (merged) return merged.slice(0, maxLen);
  return (selection.toString() || "").replace(/\r\n/g, "\n").trim().slice(0, maxLen);
}

function getActiveSelectionForSidepanel() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount < 1 || selection.isCollapsed || isSelectionInsideEditable(selection)) {
    return "";
  }
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer instanceof Element
    ? range.commonAncestorContainer
    : range.commonAncestorContainer?.parentElement;
  if (!container || !container.closest) return "";
  if (!container.closest(CHAT_VIEW_SELECTORS.join(","))) return "";
  return getSelectionTextWithMath(selection, 8000);
}

function focusComposerInput() {
  const input = findComposerInput();
  if (!input) return false;
  input.focus();
  setComposerCaretToEnd(input);
  return true;
}

async function handleQuickInsert(message = {}) {
  const text = (message.text || "").replace(/\r\n/g, "\n").trim() || getCurrentSelectionText();
  if (!text) {
    return { ok: false, error: "empty selection" };
  }

  const input = (await waitForComposerInput(18, 180)) || findComposerInput();
  if (!input) {
    return { ok: false, error: "composer not found" };
  }

  const insertText = text.slice(0, 8000);
  const inserted = message?.source === "selection_floating"
    ? appendQuotedTextToComposer(input, insertText)
    : appendTextToComposer(input, insertText);
  if (!inserted) {
    return { ok: false, error: "empty selection" };
  }

  return { ok: true };
}

function ensureQuickQuoteBarStyle() {
  if (document.getElementById("gtf-quick-quote-style")) return;
  const style = document.createElement("style");
  style.id = "gtf-quick-quote-style";
  style.textContent = `
    #gtf-quick-quote-bar {
      position: fixed;
      z-index: 2147483645;
      display: none;
      align-items: center;
      gap: 6px;
      padding: 6px;
      border-radius: 14px;
      border: 1px solid rgba(187, 216, 196, 0.9);
      box-shadow: 0 10px 24px rgba(47, 122, 83, 0.10), 0 2px 8px rgba(47, 122, 83, 0.05);
      background: rgba(248, 252, 249, 0.98);
      backdrop-filter: blur(10px);
    }
    #gtf-quick-quote-bar.open {
      display: inline-flex;
    }
    #gtf-quick-quote-bar .gtf-quote-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #cce4dc;
      background: #ffffff;
      color: #27543e;
      border-radius: 10px;
      min-height: 30px;
      padding: 0 11px;
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      white-space: nowrap;
      transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease, color .16s ease;
    }
    #gtf-quick-quote-bar .gtf-quote-btn:hover {
      background: #f0fdf4;
      border-color: #9fc5ab;
      box-shadow: 0 4px 10px rgba(47, 122, 83, 0.08);
    }
    #gtf-quick-quote-bar .gtf-quote-btn:focus-visible {
      outline: 2px solid #2f7a53;
      outline-offset: 2px;
    }
    #gtf-quick-quote-bar .gtf-quote-btn-icon {
      width: 15px;
      height: 15px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
    }
    #gtf-quick-quote-bar .gtf-quote-btn-icon svg {
      width: 15px;
      height: 15px;
      fill: currentColor;
      display: block;
    }
    #gtf-quick-quote-bar .gtf-quote-btn-label {
      display: inline-flex;
      align-items: center;
      min-width: 0;
    }
  `;
  document.documentElement.appendChild(style);
}

function ensureInlineAnnotationStyles() {
  let style = document.getElementById("gtf-inline-annotation-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "gtf-inline-annotation-style";
    style.textContent = `
      .gtf-inline-annotation-wrapper,
      .gtf-interleaved-container {
        box-sizing: border-box;
        display: block;
        width: 100% !important;
        max-width: 100% !important;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
        transition: border-color .16s ease, box-shadow .16s ease, background-color .16s ease;
      }
      .gtf-inline-annotation-wrapper {
        clear: both;
        border-radius: 18px;
        margin: 12px auto 18px;
        padding: 12px 14px;
      }
      .gtf-interleaved-container {
        border-radius: 14px;
        margin: 10px 0 14px;
        padding: 10px 12px;
      }
      .gtf-inline-annotation-wrapper[data-annotation-kind="main"] {
        background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        border-color: #d9e6f4;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
      }
      .gtf-interleaved-container[data-annotation-kind="interleaved"] {
        background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
        border-color: #e4ebf3;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
      }
      .gtf-inline-annotation-wrapper:hover,
      .gtf-interleaved-container:hover {
        border-color: #cdd8e6;
        box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
      }
      .gtf-inline-annotation-wrapper[data-state="saving"],
      .gtf-interleaved-container[data-state="saving"] {
        border-color: #bcd2ee;
      }
      .gtf-inline-annotation-wrapper[data-state="saved"],
      .gtf-interleaved-container[data-state="saved"] {
        border-color: #bbddc4;
      }
      .gtf-inline-annotation-wrapper[data-state="error"],
      .gtf-interleaved-container[data-state="error"] {
        border-color: #efc3c3;
      }
      .gtf-turn-share-bar {
        display: none !important;
      }
      .gtf-turn-share-bar .gtf-inline-annotation-status {
        color: #64748b;
        font-size: 11px;
        line-height: 1.2;
        margin-right: 8px;
        opacity: 0.85;
      }
      .gtf-turn-share-bar .gtf-inline-annotation-status:empty {
        display: none;
      }
      .gtf-turn-share-bar[data-state="saving"] .gtf-inline-annotation-status {
        color: #2f5ea1;
      }
      .gtf-turn-share-bar[data-state="saved"] .gtf-inline-annotation-status {
        color: #2e7d32;
      }
      .gtf-turn-share-bar[data-state="error"] .gtf-inline-annotation-status {
        color: #b42318;
      }
      .gtf-turn-share-bar .gtf-inline-annotation-share-group {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .gtf-turn-share-bar .gtf-inline-annotation-share-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px solid rgba(47, 122, 83, 0.2);
        background: rgba(248, 252, 249, 0.96);
        color: #2f7a53;
        border-radius: 999px;
        font-size: 12px;
        line-height: 1;
        font-weight: 500;
        height: 28px;
        padding: 0 14px;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(47, 122, 83, 0.04);
        transition: all 0.2s ease;
      }
      .gtf-turn-share-bar .gtf-inline-annotation-share-btn:hover,
      .gtf-turn-share-bar .gtf-inline-annotation-share-group.is-open .gtf-inline-annotation-share-btn {
        border-color: rgba(47, 122, 83, 0.35);
        background: rgba(236, 247, 241, 0.98);
        color: #1f5438;
        box-shadow: 0 2px 6px rgba(47, 122, 83, 0.08);
        transform: translateY(-1px);
      }
      .gtf-turn-share-bar .gtf-inline-annotation-share-btn svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
      }
      .gtf-turn-share-bar .gtf-inline-annotation-share-menu {
        position: absolute;
        bottom: calc(100% + 8px);
        right: 0;
        z-index: 100;
        background: #ffffff;
        border: 1px solid rgba(47, 122, 83, 0.15);
        border-radius: 12px;
        padding: 6px;
        min-width: 150px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        transform-origin: bottom right;
        transition: opacity 0.15s ease, transform 0.15s ease;
        opacity: 0;
        transform: scale(0.95);
        pointer-events: none;
      }
      .gtf-turn-share-bar .gtf-inline-annotation-share-group.is-open .gtf-inline-annotation-share-menu {
        opacity: 1;
        transform: scale(1);
        pointer-events: auto;
      }
      .gtf-turn-share-bar .gtf-inline-annotation-share-menu[hidden] {
        display: none !important;
      }
      .gtf-turn-share-bar .gtf-inline-annotation-share-menu button {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        border: none;
        background: transparent;
        color: #3f554b;
        font-size: 13px;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        text-align: left;
        line-height: 1.4;
        transition: background 0.15s ease, color 0.15s ease;
        white-space: nowrap;
      }
      .gtf-turn-share-bar .gtf-inline-annotation-share-menu button:hover {
        background: rgba(236, 247, 241, 0.98);
        color: #1f5438;
      }
      .gtf-turn-share-bar .gtf-inline-annotation-share-menu button svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
        flex-shrink: 0;
      }
      .gtf-inline-annotation-head {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px 8px;
        margin-bottom: 8px;
        min-height: 22px;
      }
      .gtf-inline-annotation-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 10px;
        padding: 2px 0 0;
      }
      .gtf-inline-annotation-actions-title {
        display: inline-flex;
        align-items: center;
        color: #587084;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        letter-spacing: .01em;
        white-space: nowrap;
        margin-right: 2px;
      }
      .gtf-inline-annotation-actions[hidden] {
        display: none !important;
      }
      .gtf-inline-annotation-label {
        display: inline-flex;
        align-items: center;
        border: 1px solid #d6deea;
        background: #f5f8fc;
        color: #334155;
        border-radius: 999px;
        padding: 2px 9px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.2;
      }
      .gtf-inline-annotation-wrapper[data-annotation-kind="main"] .gtf-inline-annotation-label {
        border-color: #d7e4f4;
        background: #eef5ff;
        color: #26486a;
      }
      .gtf-interleaved-container[data-annotation-kind="interleaved"] .gtf-inline-annotation-label {
        border-color: #e5ebf2;
        background: #f8fafc;
        color: #5b6b7f;
        font-weight: 500;
      }
      .gtf-inline-annotation-status {
        color: #64748b;
        font-size: 10.5px;
        line-height: 1.2;
        opacity: .78;
      }
      .gtf-inline-annotation-status:empty {
        display: none;
      }
      .gtf-inline-annotation-count {
        margin-left: auto;
        color: #8a97a8;
        font-size: 10.5px;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
      }
      .gtf-inline-annotation-share-group {
        display: none !important;
      }
      .gtf-inline-annotation-share-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        border: 1px solid rgba(84, 104, 124, 0.14);
        background: rgba(255, 255, 255, 0.96);
        color: #42586f;
        border-radius: 999px;
        font-size: 9.5px;
        line-height: 1;
        font-weight: 500;
        letter-spacing: .01em;
        height: 24px;
        box-sizing: border-box;
        padding: 0 9px;
        cursor: pointer;
        box-shadow: 0 1px 1px rgba(15, 23, 42, 0.028);
        transition: border-color .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease, opacity .18s ease, transform .18s ease;
      }
      .gtf-inline-annotation-share-btn:hover {
        border-color: rgba(84, 104, 124, 0.26);
        background: rgba(247, 250, 252, 0.98);
        color: #314252;
        box-shadow: 0 3px 8px rgba(15, 23, 42, 0.05);
        transform: translateY(-1px);
      }
      .gtf-inline-annotation-share-btn:disabled {
        cursor: wait;
        opacity: .72;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
        transform: none;
      }
      .gtf-inline-share-btn-icon,
      .gtf-inline-share-btn-label {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
      .gtf-inline-share-btn-icon {
        width: 11px;
        height: 11px;
        flex: 0 0 11px;
      }
      .gtf-inline-share-btn-icon svg {
        width: 11px;
        height: 11px;
        display: block;
        fill: currentColor;
      }
      .gtf-inline-annotation-share-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 146px;
        padding: 7px;
        border: 1px solid rgba(211, 223, 239, 0.96);
        background: rgba(255, 255, 255, 0.96);
        border-radius: 16px;
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.10), 0 2px 8px rgba(15, 23, 42, 0.04);
        backdrop-filter: blur(14px);
        display: flex;
        flex-direction: column;
        gap: 3px;
        z-index: 40;
      }
      .gtf-inline-annotation-share-menu::before {
        content: "";
        position: absolute;
        top: -7px;
        right: 14px;
        width: 12px;
        height: 12px;
        background: rgba(255, 255, 255, 0.96);
        border-top: 1px solid rgba(211, 223, 239, 0.96);
        border-left: 1px solid rgba(211, 223, 239, 0.96);
        transform: rotate(45deg);
      }
      .gtf-inline-annotation-share-menu[hidden] {
        display: none !important;
      }
      .gtf-inline-annotation-share-menu button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        border: 0;
        background: transparent;
        color: #334155;
        border-radius: 11px;
        padding: 7px 9px;
        text-align: left;
        font-size: 12px;
        line-height: 1.3;
        font-weight: 500;
        cursor: pointer;
        transition: background .18s ease, color .18s ease, transform .18s ease;
      }
      .gtf-inline-annotation-share-menu button:hover {
        background: #f4f8ff;
        color: #214f7b;
        transform: translateY(-1px);
      }
      .gtf-inline-annotation-share-menu button:disabled {
        opacity: .72;
        cursor: wait;
      }
      .gtf-inline-annotation-share-btn:focus-visible,
      .gtf-inline-annotation-share-menu button:focus-visible,
      .gtf-inline-annotation-mode-toggle:focus-visible {
        outline: 2px solid rgba(47, 122, 83, 0.32);
        outline-offset: 2px;
      }
      .gtf-inline-share-menu-action-icon,
      .gtf-inline-share-menu-action-label {
        display: inline-flex;
        align-items: center;
      }
      .gtf-inline-share-menu-action-icon {
        width: 11px;
        height: 11px;
        flex: 0 0 11px;
        color: #5f7691;
      }
      .gtf-inline-annotation-share-menu button:hover .gtf-inline-share-menu-action-icon {
        color: #214f7b;
      }
      .gtf-inline-share-menu-action-icon svg {
        width: 11px;
        height: 11px;
        display: block;
        fill: currentColor;
      }
      .gtf-inline-annotation-wrapper.is-share-note-success {
        box-shadow: 0 0 0 1px rgba(78, 145, 100, 0.14), 0 0 0 4px rgba(105, 170, 126, 0.12), 0 10px 26px rgba(78, 145, 100, 0.12);
        border-color: #b9dcc1;
      }
      .gtf-inline-annotation-mode-toggle {
        margin-left: 2px;
        border: 1px solid #d4dce8;
        background: #ffffff;
        color: #475569;
        border-radius: 999px;
        font-size: 11px;
        line-height: 1;
        padding: 4px 9px;
        cursor: pointer;
        opacity: .86;
      }
      .gtf-inline-annotation-mode-toggle:hover {
        border-color: #b8c8dc;
        background: #f7faff;
        opacity: 1;
      }
      .gtf-inline-annotation-wrapper[data-state="saving"] .gtf-inline-annotation-status,
      .gtf-interleaved-container[data-state="saving"] .gtf-inline-annotation-status {
        color: #2f5ea1;
      }
      .gtf-inline-annotation-wrapper[data-state="saved"] .gtf-inline-annotation-status,
      .gtf-interleaved-container[data-state="saved"] .gtf-inline-annotation-status {
        color: #2e7d32;
      }
      .gtf-inline-annotation-wrapper[data-state="error"] .gtf-inline-annotation-status,
      .gtf-interleaved-container[data-state="error"] .gtf-inline-annotation-status {
        color: #b42318;
      }
      .gtf-inline-annotation-textarea {
        width: 100% !important;
        min-height: 108px;
        box-sizing: border-box;
        border: 1px solid #dfe7f3;
        border-radius: 14px;
        background: #fcfdff;
        color: #1f2937;
        resize: vertical;
        outline: none;
        font: 400 14px/1.65 "Google Sans","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
        padding: 12px 14px;
        margin: 0;
        overflow: auto;
      }
      .gtf-inline-annotation-textarea::placeholder {
        color: #94a3b8;
      }
      .gtf-inline-annotation-textarea:focus {
        border-color: #adc2e2;
        background: #ffffff;
        box-shadow: 0 0 0 3px rgba(148, 181, 226, 0.2);
      }
      html[data-gtf-inline-annotation-mode="compact"] .gtf-inline-annotation-wrapper {
        margin: 10px auto 14px;
        padding: 9px 10px;
        border-radius: 12px;
      }
      html[data-gtf-inline-annotation-mode="compact"] .gtf-interleaved-container {
        margin: 8px 0 10px;
        padding: 8px 9px;
        border-radius: 10px;
      }
      html[data-gtf-inline-annotation-mode="compact"] .gtf-inline-annotation-textarea {
        min-height: 66px;
        border-radius: 12px;
        padding: 9px 11px;
        font-size: 13px;
        line-height: 1.55;
      }
      .gtf-inline-annotation-collapsible .gtf-inline-annotation-summary {
        width: 100%;
        min-height: 40px;
        border: 1px solid #dfe7f3;
        border-radius: 12px;
        background: #f8fafd;
        color: #475569;
        font-size: 12.5px;
        line-height: 1.5;
        text-align: left;
        padding: 10px 12px;
        cursor: pointer;
        white-space: normal;
        overflow: hidden;
        text-overflow: unset;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .gtf-inline-annotation-collapsible .gtf-inline-annotation-summary:hover {
        border-color: #c8d8ec;
        background: #f4f8ff;
      }
      .gtf-inline-annotation-collapsible .gtf-inline-annotation-editor-wrap {
        display: block;
      }
      .gtf-inline-annotation-collapsible.is-collapsed .gtf-inline-annotation-editor-wrap {
        display: none;
      }
      .gtf-inline-annotation-collapsible:not(.is-collapsed) .gtf-inline-annotation-summary {
        display: none;
      }
      html[data-gtf-inline-annotation-mode="compact"] .gtf-inline-annotation-collapsible .gtf-inline-annotation-summary {
        min-height: 32px;
        font-size: 12px;
        padding: 7px 9px;
      }
      @media (max-width: 960px) {
        .gtf-inline-annotation-head {
          gap: 5px 7px;
        }
        .gtf-inline-annotation-actions {
          gap: 5px;
        }
        .gtf-turn-share-bar {
          margin: 4px 0 8px;
          padding: 0 8px;
        }
        .gtf-turn-share-bar .gtf-inline-annotation-status {
          margin-right: 6px;
        }
        .gtf-inline-annotation-actions-title {
          width: 100%;
          margin-right: 0;
          margin-bottom: 2px;
        }
        .gtf-inline-annotation-count {
          margin-left: 0;
        }
        .gtf-inline-annotation-mode-toggle {
          margin-left: 0;
        }
      }
      @media (max-width: 680px) {
        .gtf-inline-annotation-wrapper {
          margin: 10px 0 14px;
          border-radius: 14px;
        }
        .gtf-interleaved-container {
          margin: 8px 0 10px;
        }
        .gtf-inline-annotation-textarea {
          min-height: 82px;
          font-size: 13px;
          line-height: 1.58;
        }
      }
    `;
    document.documentElement.appendChild(style);
  }
  applyInlineAnnotationUiMode();
}

function getInlineAnnotationUiMode() {
  try {
    const value = String(localStorage.getItem(INLINE_ANNOTATION_UI_MODE_KEY) || "").trim();
    return value === "compact" ? "compact" : "readable";
  } catch {
    return "readable";
  }
}

function applyInlineAnnotationUiMode() {
  inlineAnnotationUiMode = getInlineAnnotationUiMode();
  document.documentElement.setAttribute("data-gtf-inline-annotation-mode", inlineAnnotationUiMode);
}

function setInlineAnnotationUiMode(nextMode) {
  const normalized = nextMode === "compact" ? "compact" : "readable";
  inlineAnnotationUiMode = normalized;
  try {
    localStorage.setItem(INLINE_ANNOTATION_UI_MODE_KEY, normalized);
  } catch {}
  applyInlineAnnotationUiMode();
  document.querySelectorAll(".gtf-inline-annotation-mode-toggle").forEach((btn) => {
    btn.textContent = inlineAnnotationUiMode === "compact" ? ct("inline_annotation_mode_compact") : ct("inline_annotation_mode_readable");
    btn.title = ct("inline_annotation_mode_toggle");
  });
}

function toggleInlineAnnotationUiMode() {
  setInlineAnnotationUiMode(inlineAnnotationUiMode === "compact" ? "readable" : "compact");
}

function hideQuickQuoteBar() {
  if (quickQuoteHideTimer) {
    clearTimeout(quickQuoteHideTimer);
    quickQuoteHideTimer = null;
  }
  if (!quickQuoteBarEl) return;
  quickQuoteBarEl.classList.remove("open");
}

function scheduleHideQuickQuoteBar(delay = 180) {
  if (quickQuoteHideTimer) {
    clearTimeout(quickQuoteHideTimer);
  }
  quickQuoteHideTimer = setTimeout(() => {
    hideQuickQuoteBar();
  }, delay);
}

function ensureSingleMainAnnotationContainer(responseNode, turnId) {
  if (!(responseNode instanceof Element) || !turnId) return null;
  const parent = responseNode.parentElement;
  if (!(parent instanceof Element)) return null;
  Array.from(parent.querySelectorAll(".gtf-inline-annotation-wrapper")).forEach((node) => {
    if (node.previousElementSibling === responseNode) {
      node.remove();
    }
  });
  responseNode
    .querySelectorAll(`.gtf-inline-annotation-wrapper[data-turn-id="${turnId}"]`)
    .forEach((node) => node.remove());

  const existingAll = Array.from(
    document.querySelectorAll(`.gtf-inline-annotation-wrapper[data-turn-id="${turnId}"]`)
  );
  let container = existingAll[0] || null;
  if (!container) {
    container = document.createElement("div");
    container.className = "gtf-inline-annotation-wrapper";
    container.dataset.turnId = turnId;
  }

  if (container.parentElement !== parent) {
    parent.insertBefore(container, responseNode.nextSibling);
  }
  if (container.previousElementSibling !== responseNode) {
    parent.insertBefore(container, responseNode.nextSibling);
  }

  container.dataset.turnId = turnId;
  existingAll.forEach((node) => {
    if (node !== container && node?.isConnected) node.remove();
  });
  return container;
}

async function triggerAnnotationForElement(element) {
  if (!element) return;

  const responseSelector = MODEL_RESPONSE_SELECTORS.join(", ");
  const userSelector = USER_QUERY_SELECTORS.join(", ");
  let messageNode =
    element.closest(responseSelector) ||
    element.closest(userSelector) ||
    element.closest('model-response, user-query, [data-test-id="model-response"], [data-test-id="user-query"]');

  let turnId = null;
  let blockIndex = null;
  let containerNode = null;
  let isResponse = false;

  if (!messageNode) {
    for (const [id, refs] of domEntryMap.entries()) {
      const responseNode = refs.responseNode;
      const userNode = refs.userNode;
      if (responseNode && responseNode.isConnected && responseNode.contains(element)) {
        turnId = id;
        containerNode = responseNode;
        isResponse = true;
        break;
      }
      if (userNode && userNode.isConnected && userNode.contains(element)) {
        turnId = id;
        containerNode = responseNode || userNode;
        isResponse = false;
        break;
      }
    }
  } else {
    isResponse =
      messageNode.matches(responseSelector) ||
      messageNode.tagName.toLowerCase() === "model-response" ||
      messageNode.getAttribute("data-test-id") === "model-response";
  }

  if (!turnId || !containerNode) {
    for (const [id, refs] of domEntryMap.entries()) {
      const responseNode = refs.responseNode;
      const userNode = refs.userNode;
      if (messageNode && (responseNode === messageNode || userNode === messageNode || responseNode?.contains(messageNode) || userNode?.contains(messageNode))) {
        turnId = id;
        containerNode = responseNode || userNode;
        break;
      }
    }
  }

  if (!turnId || !containerNode) {
    // Fallback: re-scan once and bind to latest visible response
    collectSnapshotTurns();
    const latest = collectSnapshotTurns().slice(-1)[0];
    if (latest?.id) {
      const refs = domEntryMap.get(latest.id);
      if (refs?.responseNode || refs?.userNode) {
        turnId = latest.id;
        containerNode = refs.responseNode || refs.userNode;
        isResponse = Boolean(refs.responseNode);
      }
    }
  }
  if (!turnId || !containerNode) return;

  if (isResponse) {
    const selectedRange = getActiveSelectionRangeForAnnotation();
    const selectedAnchor =
      selectedRange?.startContainer instanceof Element
        ? selectedRange.startContainer
        : selectedRange?.startContainer?.parentElement;
    const block = selectedAnchor?.closest?.('p, pre, ul, ol, table, blockquote') || null;
    if (block && containerNode.contains(block)) {
      const blocks = getResponseBlocks(containerNode);
      const index = blocks.indexOf(block);
      if (index >= 0) blockIndex = index;
    }
  }

  const openMainAnnotationEditor = (mainContainer) => {
    if (!mainContainer) return;
    mainContainer.dataset.pinnedMain = "1";
    mainContainer.style.display = "block";
    const ta = ensureInlineAnnotationEditor(mainContainer, {
      turnId,
      blockIndex: null,
      noteText: "",
      placeholder: ct("inline_annotation_main_placeholder"),
      placeholderKey: "inline_annotation_main_placeholder",
      label: ct("inline_annotation_main_label"),
      labelKey: "inline_annotation_main_label",
      onSaved: (savedText) => {
        if (!savedText) {
          collapseEmptyMainAnnotation(mainContainer);
          return;
        }
        mainContainer.style.display = "block";
      }
    });
    if (ta) {
      ta.focus();
      ta.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (blockIndex !== null) {
    let interleavedContainer = containerNode.querySelector(`.gtf-interleaved-container[data-turn-id="${turnId}"][data-block-index="${blockIndex}"]`);
    if (!interleavedContainer && containerNode instanceof Element) {
      const blocks = getResponseBlocks(containerNode);
      const block = blocks[blockIndex];
      if (block) {
        interleavedContainer = document.createElement("div");
        interleavedContainer.className = "gtf-interleaved-container";
        interleavedContainer.dataset.turnId = turnId;
        interleavedContainer.dataset.blockIndex = String(blockIndex);
        block.insertAdjacentElement("afterend", interleavedContainer);
      }
    }
    if (interleavedContainer && !interleavedContainer.classList.contains('has-note')) {
      interleavedContainer.classList.add('has-note');
    }
    if (interleavedContainer) {
      interleavedContainer.dataset.editingUntil = String(Date.now() + 20000);
      interleavedContainer.dataset.justOpenedUntil = String(Date.now() + 1200);
      interleavedContainer.dataset.collapsed = "0";
      const ta = ensureInlineAnnotationEditor(interleavedContainer, {
        turnId,
        blockIndex,
        noteText: "",
        placeholder: ct("inline_annotation_interleaved_placeholder"),
        placeholderKey: "inline_annotation_interleaved_placeholder",
        label: ct("inline_annotation_interleaved_label"),
        labelKey: "inline_annotation_interleaved_label"
      });
      if (ta) {
        ta.focus();
        setTimeout(() => ta.focus(), 0);
      }
    }
  } else {
    const refs = domEntryMap.get(turnId);
    const responseAnchor =
      refs?.responseNode?.isConnected
        ? refs.responseNode
        : (isResponse && containerNode?.isConnected ? containerNode : null);
    if (!(responseAnchor instanceof Element)) return;
    let mainContainer = ensureSingleMainAnnotationContainer(responseAnchor, turnId);
    if (!mainContainer) {
      syncInlineAnnotations(true)
        .then(() => {
          const nextRefs = domEntryMap.get(turnId);
          const nextAnchor = nextRefs?.responseNode?.isConnected ? nextRefs.responseNode : responseAnchor;
          const created = ensureSingleMainAnnotationContainer(nextAnchor, turnId);
          openMainAnnotationEditor(created);
        })
        .catch((error) => {
          console.warn("[Gemini Timeline] force syncInlineAnnotations failed", error);
        });
      return;
    }
    openMainAnnotationEditor(mainContainer);
  }
}
function ensureQuickQuoteBar() {
  if (quickQuoteBarEl?.isConnected) return quickQuoteBarEl;
  ensureQuickQuoteBarStyle();

  const bar = document.createElement("div");
  bar.id = "gtf-quick-quote-bar";
  bar.setAttribute("role", "toolbar");
  bar.addEventListener("mousedown", (event) => event.stopPropagation());
  bar.addEventListener("mouseup", (event) => event.stopPropagation());

  const mainBtn = document.createElement("button");
  mainBtn.type = "button";
  mainBtn.className = "gtf-quote-btn";
  mainBtn.dataset.gtfQuoteAction = "main";
  setQuickQuoteButtonContent(mainBtn, "main", ct("quick_quote_main"));
  mainBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const text = (quickQuoteSelectionText || "").trim();
    if (!text) return;
    try {
      await handleQuickInsert({ text, source: "selection_floating" });
      hideQuickQuoteBar();
    } catch (error) {
      console.warn("[Gemini Timeline] quick insert to composer failed", error);
    }
  });

  const noteBtn = document.createElement("button");
  noteBtn.type = "button";
  noteBtn.className = "gtf-quote-btn";
  noteBtn.dataset.gtfQuoteAction = "note";
  setQuickQuoteButtonContent(noteBtn, "note", ct("quick_quote_note"));
  noteBtn.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  noteBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const preservedAnchor = quickQuoteAnchorElement;
    const selection = window.getSelection();
    const anchorNode = selection && selection.rangeCount > 0
      ? (selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement)
      : null;
    const anchorInsideQuickBar = anchorNode instanceof Element && Boolean(anchorNode.closest("#gtf-quick-quote-bar"));
    const stableAnchor = (
      preservedAnchor ||
      (!anchorInsideQuickBar ? anchorNode : null) ||
      quickQuoteAnchorElement ||
      document.querySelector("main model-response:last-of-type, main [data-test-id='model-response']:last-of-type")
    );
    triggerAnnotationForElement(stableAnchor).catch((error) => {
      console.warn("[Gemini Timeline] triggerAnnotationForElement failed", error);
    });
    hideQuickQuoteBar();
  });

  bar.append(mainBtn, noteBtn);
  document.documentElement.appendChild(bar);
  quickQuoteBarEl = bar;
  return bar;
}

function prewarmQuickQuoteBar() {
  if (quickQuoteBarEl?.isConnected) return;
  try {
    ensureQuickQuoteBar();
  } catch (error) {
    console.warn("[Gemini Timeline] prewarm quick quote bar failed", error);
  }
}

function isSelectionInsideEditable(selection) {
  if (!selection) return false;
  const anchor = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
  if (!anchor) return false;
  return Boolean(anchor.closest("textarea, input, [contenteditable='true'], [contenteditable=''], [contenteditable='plaintext-only']"));
}

function getActiveSelectionRangeForAnnotation() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount < 1 || selection.isCollapsed || isSelectionInsideEditable(selection)) return null;
  const text = (selection.toString() || "").replace(/\r\n/g, "\n").trim();
  if (!text) return null;
  try {
    return selection.getRangeAt(0);
  } catch {
    return null;
  }
}

function positionQuickQuoteBar(rangeRect) {
  const bar = ensureQuickQuoteBar();
  bar.classList.add("open");
  bar.style.left = "0px";
  bar.style.top = "0px";

  const width = bar.offsetWidth || 220;
  const height = bar.offsetHeight || 42;
  const centerX = rangeRect.left + rangeRect.width / 2;
  const topY = rangeRect.top - 10;

  const viewportW = window.innerWidth || document.documentElement.clientWidth || 1280;
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 720;
  const x = Math.min(viewportW - width - 8, Math.max(8, centerX - width / 2));
  const y = topY - height > 8 ? topY - height : Math.min(viewportH - height - 8, rangeRect.bottom + 10);

  bar.style.left = `${Math.round(x)}px`;
  bar.style.top = `${Math.round(y)}px`;
}

async function updateQuickQuoteBarFromSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount < 1 || selection.isCollapsed || isSelectionInsideEditable(selection)) {
    quickQuoteLastSignature = "";
    quickQuoteAnchorElement = null;
    hideQuickQuoteBar();
    return;
  }

  const text = (selection.toString() || "").replace(/\r\n/g, "\n").trim();
  if (!text || text.length < 2) {
    quickQuoteLastSignature = "";
    quickQuoteAnchorElement = null;
    hideQuickQuoteBar();
    return;
  }

  const range = selection.getRangeAt(0);
  const rangeStart = range.startContainer instanceof Element ? range.startContainer : range.startContainer?.parentElement;
  if (!(rangeStart instanceof Element)) {
    quickQuoteLastSignature = "";
    quickQuoteAnchorElement = null;
    hideQuickQuoteBar();
    return;
  }
  const responseSelector = MODEL_RESPONSE_SELECTORS.join(", ");
  const inResponse = Boolean(
    rangeStart.closest(responseSelector) ||
    rangeStart.closest('model-response, [data-test-id="model-response"], .model-response')
  );
  if (!inResponse) {
    quickQuoteLastSignature = "";
    quickQuoteAnchorElement = null;
    hideQuickQuoteBar();
    return;
  }
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width < 1 && rect.height < 1)) {
    quickQuoteLastSignature = "";
    quickQuoteAnchorElement = null;
    hideQuickQuoteBar();
    return;
  }
  const signature = `${range.startOffset}|${range.endOffset}|${text.length}|${Math.round(rect.left)}|${Math.round(rect.top)}`;
  if (signature === quickQuoteLastSignature) return;
  await syncContentLocaleFromStorage(true);
  quickQuoteLastSignature = signature;
  quickQuoteAnchorElement = rangeStart instanceof Element ? rangeStart : null;
  quickQuoteSelectionText = text.slice(0, 8000);
  positionQuickQuoteBar(rect);
}

function bindSelectionQuickQuote() {
  if (window.__GEMINI_TIMELINE_SELECTION_QUOTE_BOUND__) return;
  window.__GEMINI_TIMELINE_SELECTION_QUOTE_BOUND__ = true;
  quickQuoteBoundAt = Date.now();

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => prewarmQuickQuoteBar(), { timeout: 1200 });
  } else {
    setTimeout(() => prewarmQuickQuoteBar(), 480);
  }

  let selectionTimer = null;
  const queueUpdate = (delay = QUICK_QUOTE_SELECTION_SETTLE_MS) => {
    if (selectionTimer) clearTimeout(selectionTimer);
    const age = Date.now() - quickQuoteBoundAt;
    const effectiveDelay = age < QUICK_QUOTE_FIRST_INTERACTION_GRACE_MS
      ? Math.max(delay, 180)
      : delay;
    selectionTimer = setTimeout(() => {
      window.requestAnimationFrame(() => {
        updateQuickQuoteBarFromSelection();
      });
    }, effectiveDelay);
  };

  document.addEventListener("selectionchange", () => {
    if (quickQuotePointerSelecting) return;
    queueUpdate(160);
  }, true);
  document.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    quickQuotePointerSelecting = true;
    if (!quickQuoteBarEl) return;
    if (quickQuoteBarEl.contains(event.target)) return;
    scheduleHideQuickQuoteBar(80);
  }, true);
  document.addEventListener("mouseup", () => {
    quickQuotePointerSelecting = false;
    queueUpdate(QUICK_QUOTE_POST_POINTER_DELAY_MS);
  }, true);
  document.addEventListener("touchstart", () => {
    quickQuotePointerSelecting = true;
  }, { passive: true, capture: true });
  document.addEventListener("touchend", () => {
    quickQuotePointerSelecting = false;
    queueUpdate(QUICK_QUOTE_POST_POINTER_DELAY_MS);
  }, { passive: true, capture: true });
  document.addEventListener("keyup", (event) => {
    if (event.key === "Escape") {
      quickQuoteLastSignature = "";
      hideQuickQuoteBar();
      return;
    }
    queueUpdate(90);
  });
  document.addEventListener("scroll", () => scheduleHideQuickQuoteBar(50), true);
  window.addEventListener("resize", () => scheduleHideQuickQuoteBar(50));
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requestOpenHomeView() {
  chrome.runtime.sendMessage(
    {
      type: "GEMINI_OPEN_HOME_VIEW_REQUEST",
      conversationId: currentConversationId
    },
    () => {
      // ignore callback
    }
  );
}

function requestToggleSidePanel() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GEMINI_TOGGLE_SIDE_PANEL_REQUEST" }, (response) => {
      const hasError = Boolean(chrome.runtime?.lastError);
      resolve({
        ok: !hasError && Boolean(response?.ok),
        action: String(response?.action || "")
      });
    });
  });
}

function requestOpenSidePanel() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GEMINI_OPEN_SIDE_PANEL_REQUEST" }, (response) => {
      const hasError = Boolean(chrome.runtime?.lastError);
      resolve({
        ok: !hasError && Boolean(response?.ok),
        action: String(response?.action || "")
      });
    });
  });
}

async function requestOpenSidePanelSafe() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await requestOpenSidePanel();
    if (result.ok) return true;
    await wait(120 + attempt * 120);
  }
  requestOpenHomeView();
  setTimeout(() => {
    requestOpenSidePanel().catch(() => {});
  }, 180);
  return false;
}

function isConcreteConversationId(conversationId) {
  return /\/app\/[^/?#]+$/i.test(conversationId || "");
}

function resolveEffectiveConversationId(preferSidebar = false) {
  const normalizedCurrent = toConversationId(currentConversationId || "");
  const normalizedUrl = toConversationId(location.href);
  const sidebarId = resolveActiveConversationIdFromSidebar();
  const candidates = preferSidebar
    ? [sidebarId, normalizedCurrent, normalizedUrl]
    : [normalizedCurrent, sidebarId, normalizedUrl];
  for (const candidate of candidates) {
    if (isConcreteConversationId(candidate)) return candidate;
  }
  return "";
}

function invalidateActiveSidebarConversationCache() {
  activeSidebarConversationCache = { id: "", at: 0 };
}

function resolveActiveConversationIdFromSidebar() {
  const now = Date.now();
  if (now - Number(activeSidebarConversationCache.at || 0) < ACTIVE_SIDEBAR_CONVERSATION_CACHE_MS) {
    return String(activeSidebarConversationCache.id || "");
  }
  const selectors = [
    "aside a[href*='/app/']",
    "nav a[href*='/app/']",
    "[role='navigation'] a[href*='/app/']",
    "a[href*='/u/'][href*='/app/']",
    "a[href*='/app/']"
  ];
  const seen = new Set();
  const candidates = [];
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      if (!(node instanceof HTMLAnchorElement)) return;
      if (node.closest("#gtf-native-folder-panel")) return;
      if (seen.has(node)) return;
      seen.add(node);
      candidates.push(node);
    });
  });

  let pickedId = "";
  let bestScore = -1;
  candidates.forEach((anchor) => {
    const conversationId = toConversationId(anchor.getAttribute("href") || anchor.href || "");
    if (!isConcreteConversationId(conversationId)) return;
    let score = 0;
    const ariaCurrent = String(anchor.getAttribute("aria-current") || "").toLowerCase();
    if (ariaCurrent === "page" || ariaCurrent === "true") score += 8;
    const ariaSelected = String(anchor.getAttribute("aria-selected") || "").toLowerCase();
    if (ariaSelected === "true") score += 7;
    const className = String(anchor.className || "").toLowerCase();
    if (/active|selected|current/.test(className)) score += 4;
    const parent = anchor.closest("[aria-current], [aria-selected], [data-selected], [data-active], li, div");
    if (parent instanceof Element) {
      const pAriaCurrent = String(parent.getAttribute("aria-current") || "").toLowerCase();
      const pAriaSelected = String(parent.getAttribute("aria-selected") || "").toLowerCase();
      const pDataSelected = String(parent.getAttribute("data-selected") || "").toLowerCase();
      const pDataActive = String(parent.getAttribute("data-active") || "").toLowerCase();
      const pClass = String(parent.className || "").toLowerCase();
      if (pAriaCurrent === "page" || pAriaCurrent === "true") score += 5;
      if (pAriaSelected === "true") score += 4;
      if (pDataSelected === "true") score += 3;
      if (pDataActive === "true") score += 3;
      if (/active|selected|current/.test(pClass)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      pickedId = conversationId;
    }
  });

  const resolved = bestScore >= 0 ? pickedId : "";
  activeSidebarConversationCache = { id: resolved, at: now };
  return resolved;
}

function collectSidebarConversations(maxCount = 240) {
  const perfStartedAt = perfNow();
  const routeKey = `${location.pathname}|${location.search}|${toConversationId(location.href)}`;
  const now = Date.now();
  if (
    sidebarConversationCache.routeKey === routeKey &&
    sidebarConversationCache.maxCount >= maxCount &&
    now - sidebarConversationCache.collectedAt < SIDEBAR_CONVERSATION_CACHE_MS &&
    Array.isArray(sidebarConversationCache.items)
  ) {
    recordPerf("collectSidebarConversations", perfStartedAt, { cached: true, count: Math.min(maxCount, sidebarConversationCache.items.length) });
    return sidebarConversationCache.items.slice(0, maxCount);
  }

  const anchorSelectors = [
    "aside a[href*='/app/']",
    "nav a[href*='/app/']",
    "[role='navigation'] a[href*='/app/']",
    "a[href*='/u/'][href*='/app/']",
    "a[href*='/app/']"
  ];

  const blockedTitles = new Set([
    "新对话",
    "new chat",
    "gems 管理器",
    "gems",
    "gem",
    "设置和帮助",
    "settings & help",
    "settings and help"
  ]);

  const orderedAnchors = [];
  const seenAnchor = new Set();
  anchorSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      if (!(node instanceof HTMLAnchorElement)) return;
      if (node.closest("#gtf-native-folder-panel")) return;
      if (seenAnchor.has(node)) return;
      seenAnchor.add(node);
      orderedAnchors.push(node);
    });
  });

  const map = new Map();
  for (const anchor of orderedAnchors) {
    const hrefRaw = anchor.getAttribute("href") || anchor.href || "";
    if (!hrefRaw) continue;

    let absoluteUrl = "";
    try {
      absoluteUrl = new URL(hrefRaw, location.origin).href;
    } catch {
      continue;
    }

    const conversationId = toConversationId(absoluteUrl);
    if (!isConcreteConversationId(conversationId)) continue;

    const title = normalizeText(
      anchor.getAttribute("aria-label") ||
        anchor.getAttribute("title") ||
        anchor.innerText ||
        anchor.textContent ||
        extractTextDeep(anchor)
    ).slice(0, 140);
    if (!title) continue;
    if (blockedTitles.has(title.toLowerCase())) continue;

    if (!map.has(conversationId)) {
      map.set(conversationId, {
        conversationId,
        url: absoluteUrl,
        title
      });
    }

    if (map.size >= maxCount) break;
  }

  const currentConversationId = toConversationId(location.href);
  if (isConcreteConversationId(currentConversationId) && !map.has(currentConversationId)) {
    const heading = normalizeText(
      document.querySelector("main h1, h1")?.textContent ||
        document.title ||
        ""
    ).replace(/\s*-\s*Google Gemini\s*$/i, "");
    map.set(currentConversationId, {
      conversationId: currentConversationId,
      url: location.href,
      title: !looksLikeRouteTitle(heading) ? heading : (currentLocale === "en" ? "Current Conversation" : "当前对话")
    });
  }

  const result = Array.from(map.values()).slice(0, maxCount);
  sidebarConversationCache = {
    routeKey,
    maxCount,
    collectedAt: now,
    items: result
  };
  recordPerf("collectSidebarConversations", perfStartedAt, { cached: false, count: result.length });
  return result;
}

function countSidebarConversationAnchors() {
  const anchorSelectors = [
    "aside a[href*='/app/']",
    "nav a[href*='/app/']",
    "[role='navigation'] a[href*='/app/']",
    "a[href*='/u/'][href*='/app/']",
    "a[href*='/app/']"
  ];
  const ids = new Set();
  anchorSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      if (!(node instanceof HTMLAnchorElement)) return;
      if (node.closest("#gtf-native-folder-panel")) return;
      const hrefRaw = node.getAttribute("href") || node.href || "";
      const conversationId = toConversationId(hrefRaw);
      if (!isConcreteConversationId(conversationId)) return;
      ids.add(conversationId);
    });
  });
  return ids.size;
}

function findSidebarToggleButton() {
  const selectors = [
    "button[aria-label*='Main menu' i]",
    "button[aria-label*='menu' i]",
    "button[aria-label*='navigation' i]",
    "button[aria-label*='sidebar' i]",
    "[role='button'][aria-label*='menu' i]",
    "[role='button'][aria-label*='navigation' i]",
    "[role='button'][aria-label*='sidebar' i]",
    "button[aria-label*='菜单' i]",
    "button[aria-label*='导航' i]",
    "button[aria-label*='侧边' i]",
    "[role='button'][aria-label*='菜单' i]",
    "[role='button'][aria-label*='导航' i]",
    "[role='button'][aria-label*='侧边' i]",
    "button[title*='menu' i]",
    "button[title*='菜单' i]",
    "[role='button'][title*='menu' i]",
    "[role='button'][title*='菜单' i]"
  ];
  const seen = new Set();
  const candidates = [];
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (seen.has(node)) return;
      const rect = node.getBoundingClientRect();
      if (rect.width < 18 || rect.height < 18) return;
      if (rect.left > 260 || rect.top > 220) return;
      seen.add(node);
      candidates.push(node);
    });
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    if (Math.abs(ra.left - rb.left) > 2) return ra.left - rb.left;
    return ra.top - rb.top;
  });
  return candidates[0] || null;
}

function findSidebarScrollContainer() {
  const candidates = [];
  const seen = new Set();
  const pushIfValid = (node) => {
    if (!(node instanceof HTMLElement) || seen.has(node)) return;
    seen.add(node);
    const style = window.getComputedStyle(node);
    const overflowY = String(style.overflowY || "").toLowerCase();
    const canScrollByStyle = overflowY.includes("auto") || overflowY.includes("scroll") || overflowY.includes("overlay");
    const scrollable = node.scrollHeight - node.clientHeight > 24;
    if (!canScrollByStyle && !scrollable) return;
    candidates.push(node);
  };

  document.querySelectorAll("aside, nav, [role='navigation']").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    pushIfValid(node);
    node.querySelectorAll("div, section, ul").forEach((child) => pushIfValid(child));
  });

  if (!candidates.length) {
    const firstAnchor = document.querySelector("aside a[href*='/app/'], nav a[href*='/app/'], [role='navigation'] a[href*='/app/']");
    let cursor = firstAnchor instanceof HTMLElement ? firstAnchor.parentElement : null;
    while (cursor) {
      pushIfValid(cursor);
      cursor = cursor.parentElement;
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const anchorCountA = a.querySelectorAll("a[href*='/app/']").length;
    const anchorCountB = b.querySelectorAll("a[href*='/app/']").length;
    if (anchorCountA !== anchorCountB) return anchorCountB - anchorCountA;
    return (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight);
  });
  return candidates[0] || null;
}

async function collectSidebarConversationsByAutoScroll(maxCount = 240, options = {}) {
  const rounds = Math.max(4, Math.min(20, Number(options?.forceRounds) || 12));
  const settleMs = Math.max(140, Math.min(600, Number(options?.settleMs) || 230));
  const merged = new Map();
  const absorb = (items) => {
    (Array.isArray(items) ? items : []).forEach((item) => {
      const conversationId = toConversationId(item?.conversationId || item?.url || "");
      if (!isConcreteConversationId(conversationId)) return;
      if (merged.has(conversationId)) return;
      merged.set(conversationId, {
        conversationId,
        url: conversationId,
        title: normalizeText(item?.title || item?.sidebarTitle || "").slice(0, 140) || "Current Conversation"
      });
    });
  };

  absorb(collectSidebarConversations(maxCount));
  let stableRounds = 0;
  let previousCount = merged.size;
  for (let i = 0; i < rounds; i += 1) {
    if (merged.size >= maxCount) break;
    let scrollContainer = findSidebarScrollContainer();
    if (!(scrollContainer instanceof HTMLElement)) break;
    const maxTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    if (maxTop <= 0) break;
    const step = Math.max(220, Math.round(scrollContainer.clientHeight * 0.9));
    const nextTop = Math.min(maxTop, scrollContainer.scrollTop + step);
    if (nextTop === scrollContainer.scrollTop) {
      stableRounds += 1;
    } else {
      scrollContainer.scrollTop = nextTop;
      scrollContainer.dispatchEvent(new Event("scroll", { bubbles: true }));
    }
    await wait(settleMs);
    sidebarConversationCache.collectedAt = 0;
    absorb(collectSidebarConversations(maxCount));
    if (merged.size === previousCount) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
      previousCount = merged.size;
    }
    if (stableRounds >= 3) break;
  }

  return Array.from(merged.values()).slice(0, maxCount);
}

async function collectSidebarConversationsSmart(maxCount = 240, options = {}) {
  let conversations = collectSidebarConversations(maxCount);
  if (conversations.length >= 2 && !options?.forceFull) return conversations;

  const beforeCount = countSidebarConversationAnchors();
  if (beforeCount >= 2 && !options?.forceFull) return conversations;

  const toggleBtn = findSidebarToggleButton();
  if (!toggleBtn) {
    if (options?.forceFull) {
      return collectSidebarConversationsByAutoScroll(maxCount, options);
    }
    return conversations;
  }

  const expandedAttr = String(toggleBtn.getAttribute("aria-expanded") || "").toLowerCase();
  const wasExpanded = expandedAttr === "true";
  let openedByUs = false;
  if (!wasExpanded) {
    try {
      toggleBtn.click();
      openedByUs = true;
    } catch {
      if (options?.forceFull) {
        return collectSidebarConversationsByAutoScroll(maxCount, options);
      }
      return conversations;
    }
    await wait(280);
    sidebarConversationCache.collectedAt = 0;
  }

  if (options?.forceFull) {
    conversations = await collectSidebarConversationsByAutoScroll(maxCount, options);
  } else {
    conversations = collectSidebarConversations(maxCount);
  }

  if (openedByUs) {
    setTimeout(() => {
      try {
        toggleBtn.click();
      } catch {}
    }, 160);
  }

  return conversations;
}

async function collectHomeIndexConversationsFallback(maxCount = 240) {
  try {
    const homeIndexKey = getHomeIndexStorageKey();
    const result = await storageGet(homeIndexKey);
    const rawIndex = result?.[homeIndexKey];
    if (!rawIndex || typeof rawIndex !== "object") return [];
    const items = Object.values(rawIndex)
      .map((item) => {
        const conversationId = toConversationId(item?.url || item?.conversationId || "");
        if (!isConcreteConversationId(conversationId)) return null;
        const title = normalizeText(item?.sidebarTitle || item?.title || "").slice(0, 140);
        return {
          conversationId,
          url: conversationId,
          title: title || "当前对话"
        };
      })
      .filter(Boolean);
    const deduped = [];
    const seen = new Set();
    items.forEach((item) => {
      if (!item || seen.has(item.conversationId)) return;
      seen.add(item.conversationId);
      deduped.push(item);
    });
    return deduped.slice(0, maxCount);
  } catch {
    return [];
  }
}

async function collectSessionStorageConversationsFallback(maxCount = 240) {
  try {
    const allStorage = await storageGet(null);
    const items = [];
    Object.entries(allStorage || {}).forEach(([key, value]) => {
      if (!String(key || "").startsWith(STORAGE_PREFIX)) return;
      const conversationIdRaw = String(key || "").slice(STORAGE_PREFIX.length);
      const conversationId = toConversationId(conversationIdRaw);
      if (!isConcreteConversationId(conversationId)) return;
      const session = value && typeof value === "object" ? value : {};
      const entries = Array.isArray(session.entries) ? session.entries : [];
      const lastEntry = entries[entries.length - 1] || null;
      const title = normalizeText(
        session.customTitle ||
        session.sidebarTitle ||
        lastEntry?.question ||
        lastEntry?.summary ||
        ""
      ).slice(0, 140);
      const updatedAt =
        Number(session.updatedAt) ||
        Number(lastEntry?.timestamp) ||
        0;
      items.push({
        conversationId,
        url: conversationId,
        title: title || "Current Conversation",
        updatedAt
      });
    });
    items.sort((a, b) => Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0));
    const deduped = [];
    const seen = new Set();
    items.forEach((item) => {
      if (!item || seen.has(item.conversationId)) return;
      seen.add(item.conversationId);
      deduped.push(item);
    });
    return deduped.slice(0, maxCount).map(({ updatedAt, ...rest }) => rest);
  } catch {
    return [];
  }
}

function mergeConversationSources(sources, maxCount = 240) {
  const merged = [];
  const indexById = new Map();
  (Array.isArray(sources) ? sources : []).forEach((source) => {
    (Array.isArray(source) ? source : []).forEach((item) => {
      const conversationId = toConversationId(item?.conversationId || item?.url || "");
      if (!isConcreteConversationId(conversationId)) return;
      const title = normalizeText(item?.title || item?.sidebarTitle || "").slice(0, 140);
      const normalized = {
        conversationId,
        url: conversationId,
        title: title || "Current Conversation"
      };
      const existingIndex = indexById.get(conversationId);
      if (existingIndex === undefined) {
        indexById.set(conversationId, merged.length);
        merged.push(normalized);
        return;
      }
      if (!merged[existingIndex].title && normalized.title) {
        merged[existingIndex].title = normalized.title;
      }
    });
  });
  return merged.slice(0, maxCount);
}

async function collectReliableConversations(maxCount = 240, options = {}) {
  const [sidebarConversations, homeIndexConversations, sessionConversations] = await Promise.all([
    collectSidebarConversationsSmart(maxCount, options).catch(() => []),
    collectHomeIndexConversationsFallback(maxCount),
    collectSessionStorageConversationsFallback(maxCount)
  ]);
  return mergeConversationSources(
    [sidebarConversations, homeIndexConversations, sessionConversations],
    maxCount
  );
}

function normalizeHomeFoldersForNative(rawFolders) {
  const result = [{ id: HOME_DEFAULT_FOLDER_ID, name: "\u672A\u5206\u7C7B", parentId: null, system: true }];
  const seen = new Set([HOME_DEFAULT_FOLDER_ID]);
  if (!Array.isArray(rawFolders)) return result;

  const staged = [];
  rawFolders.forEach((item) => {
    const id = normalizeText(item?.id || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const name = normalizeText(item?.name || "").slice(0, 32);
    const parentIdRaw = normalizeText(item?.parentId || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!id || !name || id === HOME_DEFAULT_FOLDER_ID || seen.has(id)) return;
    seen.add(id);
    staged.push({ id, name, parentIdRaw });
  });

  const validCustomIds = new Set(staged.map((item) => item.id));
  staged.forEach((item) => {
    const parentId =
      item.parentIdRaw && validCustomIds.has(item.parentIdRaw) && item.parentIdRaw !== item.id
        ? item.parentIdRaw
        : null;
    result.push({ id: item.id, name: item.name, parentId });
  });

  return result;
}


function normalizeHomeConversationFolderMapForNative(rawMap, folders) {
  const validIds = new Set((folders || []).map((item) => item.id));
  const map = {};
  if (!rawMap || typeof rawMap !== "object") return map;

  Object.entries(rawMap).forEach(([conversationId, folderId]) => {
    const normalizedConversationId = toConversationId(conversationId);
    if (!normalizedConversationId) return;
    map[normalizedConversationId] = validIds.has(folderId) ? folderId : HOME_DEFAULT_FOLDER_ID;
  });
  return map;
}

function normalizeHomeStateForNative(rawState) {
  const folders = normalizeHomeFoldersForNative(rawState?.folders);
  const conversationFolderMap = normalizeHomeConversationFolderMapForNative(rawState?.conversationFolderMap, folders);
  const collapsedFolderIds = Array.isArray(rawState?.collapsedFolderIds) ? rawState.collapsedFolderIds : [];
  return { folders, conversationFolderMap, collapsedFolderIds };
}

function normalizeHomeIndexEntries(rawIndex) {
  const result = [];
  const currentScope = normalizeAccountScope(getAccountScopeFromUrl(location.href));
  if (!rawIndex || typeof rawIndex !== "object") return result;
  Object.values(rawIndex).forEach((item) => {
    const conversationId = toConversationId(item?.conversationId || item?.url || "");
    if (!isConcreteConversationId(conversationId)) return;
    if (getAccountScopeFromConversationId(conversationId) !== currentScope) return;
    const title = normalizeText(item?.sidebarTitle || item?.title || "").slice(0, 140);
    const url = conversationId;
    result.push({ conversationId, title, url });
  });
  return result;
}

function buildHomeIndexSignature(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((item) => {
      const conversationId = toConversationId(item?.conversationId || item?.url || "");
      if (!isConcreteConversationId(conversationId)) return "";
      const title = normalizeText(item?.sidebarTitle || item?.title || "").slice(0, 140);
      return `${conversationId}::${title}`;
    })
    .filter(Boolean)
    .sort()
    .join("|");
}

function buildHomeIndexObjectFromCatalog(catalog) {
  const result = {};
  const now = Date.now();
  let offset = 0;
  (Array.isArray(catalog) ? catalog : []).forEach((item) => {
    const conversationId = toConversationId(item?.conversationId || item?.url || "");
    if (!isConcreteConversationId(conversationId) || result[conversationId]) return;
    const title = normalizeText(item?.title || item?.sidebarTitle || "").slice(0, 140);
    const url = item?.url || conversationId;
    result[conversationId] = {
      conversationId,
      url,
      sidebarTitle: title,
      updatedAt: now - offset
    };
    offset += 1;
  });
  return result;
}

function queueNativeHomeIndexSync(catalog, homeIndexKey) {
  if (!homeIndexKey) return;
  const snapshot = buildHomeIndexObjectFromCatalog(catalog);
  const signature = buildHomeIndexSignature(Object.values(snapshot));
  if (!signature) return;

  if (nativeCatalogSyncKey === homeIndexKey && nativeCatalogSyncHash === signature) {
    return;
  }
  nativeCatalogSyncKey = homeIndexKey;
  nativeCatalogSyncHash = signature;

  if (nativeCatalogSyncTimer) clearTimeout(nativeCatalogSyncTimer);
  nativeCatalogSyncTimer = setTimeout(async () => {
    nativeCatalogSyncTimer = null;
    try {
      const stored = await storageGet(homeIndexKey);
      const existingEntries = normalizeHomeIndexEntries(stored?.[homeIndexKey] || {});
      const existingSignature = buildHomeIndexSignature(existingEntries);
      if (existingSignature === signature) return;
      await storageSet({ [homeIndexKey]: snapshot });
    } catch (error) {
      console.warn("[Gemini Timeline] sync native home index failed", error);
    }
  }, 420);
}

function formatNativeTimestamp(ts) {
  const value = Number(ts) || 0;
  if (!value) return currentLocale === "en" ? "Unknown time" : "未知时间";
  try {
    return new Intl.DateTimeFormat(getContentIntlLocale(), {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return currentLocale === "en" ? "Unknown time" : "未知时间";
  }
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (!value) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return Boolean(copied);
  } catch {
    return false;
  }
}

function getTimelineTurnById(turnId) {
  const id = String(turnId || "").trim();
  if (!id) return null;
  return nativeChatTimelineTurnsCache.find((item) => item?.id === id) || null;
}

function getTimelineShareBookmarkTheme(type) {
  switch (normalizeTimelineBookmarkType(type)) {
    case "mistake":
      return { accent: "#c85656", accentSoft: "#fcecec", accentBorder: "rgba(200, 86, 86, 0.16)" };
    case "review":
      return { accent: "#376fcb", accentSoft: "#edf3ff", accentBorder: "rgba(55, 111, 203, 0.16)" };
    case "mastered":
      return { accent: "#2f8b57", accentSoft: "#e9f7ef", accentBorder: "rgba(47, 139, 87, 0.16)" };
    default:
      return { accent: "#376fcb", accentSoft: "#edf3ff", accentBorder: "rgba(55, 111, 203, 0.16)" };
  }
}

function getTimelineShareReviewTip(type) {
  switch (normalizeTimelineBookmarkType(type)) {
    case "mistake":
      return ct("timeline_share_tip_mistake");
    case "review":
      return ct("timeline_share_tip_review");
    case "mastered":
      return ct("timeline_share_tip_mastered");
    default:
      return ct("timeline_share_tip_default");
  }
}

async function loadTimelineShareSourceData(turn) {
  if (!turn) return null;
  const domEntry = domEntryMap.get(turn.id);
  const userNode = domEntry?.userNode;
  const responseNode = domEntry?.responseNode;
  
  const question = userNode ? getUserText(userNode) : turn.question || turn.title || "";
  const answerMarkdown = responseNode ? getResponseMarkdown(responseNode) : turn.summary || "";
  // Do not truncate! User explicitly requested the FULL content in the image.
  const answer = answerMarkdown || turn.summary || "";
  let answerBlocks = [];
  const cachedByTurn = timelineShareBlocksByTurnId.get(turn.id);
  if (responseNode instanceof Element) {
    const responseSignature = getNodeContentSignature(responseNode);
    if (cachedByTurn?.signature === responseSignature) {
      answerBlocks = cloneStructuredShareBlocks(cachedByTurn.blocks);
    } else {
      answerBlocks = extractStructuredShareAnswerBlocks(responseNode);
      timelineShareBlocksByTurnId.set(turn.id, {
        signature: responseSignature,
        blocks: cloneStructuredShareBlocks(answerBlocks)
      });
    }
  } else if (cachedByTurn?.blocks?.length) {
    answerBlocks = cloneStructuredShareBlocks(cachedByTurn.blocks);
  } else if (Array.isArray(turn.answerBlocks) && turn.answerBlocks.length) {
    answerBlocks = cloneStructuredShareBlocks(turn.answerBlocks);
    timelineShareBlocksByTurnId.set(turn.id, {
      signature: `turn:${String(turn.id || "")}:${String(turn.timestamp || "")}:${String(turn.answer || "").length}`,
      blocks: cloneStructuredShareBlocks(answerBlocks)
    });
  }
  
  const bookmark = nativeChatTimelineBookmarks.get(turn.id) || {};
  const note = bookmark.note || "";
  const typeMeta = getTimelineBookmarkTypeMeta()[bookmark.type] || null;
  const typeLabel = typeMeta ? typeMeta.label : "";
  
  return {
    question: normalizeText(question),
    answer: normalizeText(answer),
    answerBlocks,
    note: normalizeText(note),
    typeLabel
  };
}

function buildTimelineShareTakeaway(turn, sourceData = {}) {
  return "";
}

function escapeHtmlForShareCard(unsafe) {
  // It's critical that the content output into the SVG's XHTML foreignObject is valid XML.
  // Any unescaped &, <, > or unclosed tag will cause XML parsing to fail and result in an empty image.
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // Remove invalid XML control characters
}

async function renderHtmlToCanvas(htmlContent, width) {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.width = width + "px";
  container.style.visibility = "hidden";
  container.innerHTML = htmlContent;
  document.body.appendChild(container);
  
  // Force layout
  const height = container.offsetHeight;
  
  // Serialize as valid XML for SVG foreignObject
  container.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  
  // A robust approach to clean up problematic characters that break SVG XML parsing
  const cleanHtml = (html) => {
    return html
      .replace(/<br\s*>/gi, "<br/>")
      .replace(/<hr\s*>/gi, "<hr/>")
      // Very aggressively strip ALL img tags to 100% prevent Tainted Canvas issues.
      // We do not want to just close them, we want them GONE.
      .replace(/<img[^>]*>/gi, "")
      .replace(/<col([^>]+[^\/])>/gi, "<col$1/>")
      .replace(/<input([^>]+[^\/])>/gi, "<input$1/>")
      .replace(/<meta([^>]+[^\/])>/gi, "<meta$1/>")
      .replace(/<link([^>]+[^\/])>/gi, "<link$1/>")
      .replace(/&nbsp;/gi, "&#160;")
      .replace(/&(?!(?:amp|lt|gt|quot|#\d+|#[xX][0-9a-fA-F]+|#160);)/g, "&amp;"); // Carefully escape unescaped ampersands only
  };
  container.innerHTML = cleanHtml(container.innerHTML);

  const xmlSerializer = new XMLSerializer();
  let validXHTML = xmlSerializer.serializeToString(container);
  
  // Last resort fallback if serializeToString leaves invalid namespace prefixes or entities
  validXHTML = validXHTML.replace(/<([^>]+)\s+xmlns:[a-zA-Z0-9]+="[^"]*"/gi, "<$1");

  document.body.removeChild(container);
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        ${validXHTML}
      </foreignObject>
    </svg>
  `;
  
      // Add detailed error logging to the image load process to help diagnose "Image error"
  return new Promise((resolve) => {
    // When using foreignObject, all resources (like images inside the SVG) must be external or base64.
    // If the HTML has external image links without CORS, rendering the SVG to canvas makes it "tainted".
    // We can't toBlob a tainted canvas.
    // We proactively strip ANY external resources that could cause tainting (img tags, inline background-image urls).
    const safeSvg = svg
      // We already stripped img tags in cleanHtml, but do it again just to be absolutely sure.
      .replace(/<img[^>]*>/gi, "")
      // Strip any background images or external urls in styles
      .replace(/url\(['"]?(?:http|https|\/\/)[^)]+['"]?\)/gi, "none");

    const blob = new Blob([safeSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2; // High DPI
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      
      // Draw white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      
      try {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      } catch (err) {
        console.error("[Gemini Timeline] Draw SVG to Canvas error", err);
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = (e) => {
      console.error("[Gemini Timeline] SVG to Image conversion failed", e);
      console.error("[Gemini Timeline] Problematic SVG content:", svg);
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function wrapCanvasText(ctx, text, maxWidth) {
  const lines = [];
  const paragraphs = String(text || "").split('\n');
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    
    // Since Chinese and English mixed text is hard to split by words simply, 
    // we use a character-by-character approach which is safest for CJK.
    let currentLine = '';
    for (let j = 0; j < paragraph.length; j++) {
      const char = paragraph[j];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && j > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
  }
  return lines;
}

function findClosingMathDelimiter(text, startIndex, delimiter) {
  let i = startIndex;
  while (i < text.length) {
    if (text[i] === "\\") {
      i += 2;
      continue;
    }
    if (text.startsWith(delimiter, i)) return i;
    i += 1;
  }
  return -1;
}

function extractLatexScriptToken(text, startIndex) {
  if (startIndex >= text.length) return { token: "", nextIndex: startIndex };
  if (text[startIndex] === "{") {
    let depth = 1;
    let i = startIndex + 1;
    let token = "";
    while (i < text.length) {
      const char = text[i];
      if (char === "{") {
        depth += 1;
        token += char;
        i += 1;
        continue;
      }
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return { token, nextIndex: i + 1 };
        }
        token += char;
        i += 1;
        continue;
      }
      token += char;
      i += 1;
    }
    return { token, nextIndex: i };
  }
  return { token: text[startIndex], nextIndex: startIndex + 1 };
}

function mapLatexScriptText(token, kind = "sup") {
  const superscriptMap = {
    "0": "\u2070",
    "1": "\u00b9",
    "2": "\u00b2",
    "3": "\u00b3",
    "4": "\u2074",
    "5": "\u2075",
    "6": "\u2076",
    "7": "\u2077",
    "8": "\u2078",
    "9": "\u2079",
    "+": "\u207a",
    "-": "\u207b",
    "=": "\u207c",
    "(": "\u207d",
    ")": "\u207e",
    "n": "\u207f",
    "i": "\u2071"
  };
  const subscriptMap = {
    "0": "\u2080",
    "1": "\u2081",
    "2": "\u2082",
    "3": "\u2083",
    "4": "\u2084",
    "5": "\u2085",
    "6": "\u2086",
    "7": "\u2087",
    "8": "\u2088",
    "9": "\u2089",
    "+": "\u208a",
    "-": "\u208b",
    "=": "\u208c",
    "(": "\u208d",
    ")": "\u208e",
    "a": "\u2090",
    "e": "\u2091",
    "h": "\u2095",
    "i": "\u1d62",
    "j": "\u2c7c",
    "k": "\u2096",
    "l": "\u2097",
    "m": "\u2098",
    "n": "\u2099",
    "o": "\u2092",
    "p": "\u209a",
    "r": "\u1d63",
    "s": "\u209b",
    "t": "\u209c",
    "u": "\u1d64",
    "v": "\u1d65",
    "x": "\u2093"
  };
  const map = kind === "sub" ? subscriptMap : superscriptMap;
  const source = String(token || "").trim();
  if (!source) return "";
  let output = "";
  for (const char of source) {
    if (!map[char]) return kind === "sub" ? `_(${source})` : `^(${source})`;
    output += map[char];
  }
  return output;
}

function formatLatexForCanvasDisplay(tex) {
  let text = String(tex || "").trim();
  if (!text) return "";
  const commandMap = {
    alpha: "\u03b1",
    beta: "\u03b2",
    gamma: "\u03b3",
    delta: "\u03b4",
    theta: "\u03b8",
    lambda: "\u03bb",
    mu: "\u03bc",
    pi: "\u03c0",
    sigma: "\u03c3",
    phi: "\u03c6",
    omega: "\u03c9",
    times: "\u00d7",
    cdot: "\u00b7",
    pm: "\u00b1",
    neq: "\u2260",
    leq: "\u2264",
    geq: "\u2265",
    approx: "\u2248",
    infty: "\u221e",
    to: "\u2192",
    rightarrow: "\u2192",
    leftarrow: "\u2190",
    degree: "\u00b0"
  };
  text = text
    .replace(/\\(?:mathrm|text|operatorname)\{([^{}]*)\}/g, "$1")
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, "\u221a($1)")
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\\,/g, " ")
    .replace(/\\;/g, " ")
    .replace(/\\!/g, "")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "");

  let output = "";
  for (let i = 0; i < text.length; ) {
    const char = text[i];
    if (char === "\\") {
      const match = text.slice(i + 1).match(/^[a-zA-Z]+/);
      if (match) {
        const command = match[0];
        output += commandMap[command] || command;
        i += command.length + 1;
        continue;
      }
      output += text[i + 1] || "";
      i += 2;
      continue;
    }
    if (char === "^" || char === "_") {
      const { token, nextIndex } = extractLatexScriptToken(text, i + 1);
      output += mapLatexScriptText(token, char === "_" ? "sub" : "sup");
      i = nextIndex;
      continue;
    }
    if (char !== "{" && char !== "}") {
      output += char;
    }
    i += 1;
  }
  return output.replace(/\s+/g, " ").trim();
}

const timelineShareFormulaSvgCache = new Map();
const timelineShareFormulaMathMlCache = new Map();
const TIMELINE_SHARE_INLINE_FORMULA_TARGET_HEIGHT = 26;
const TIMELINE_SHARE_DISPLAY_FORMULA_TARGET_HEIGHT = 54;
const TIMELINE_SHARE_FORMULA_BLOCK_THRESHOLD = 0.5;
const TIMELINE_SHARE_INLINE_FORMULA_MIN_HEIGHT = 24;
const TIMELINE_SHARE_DISPLAY_FORMULA_MIN_HEIGHT = 42;
const TIMELINE_SHARE_INLINE_FORMULA_MAX_SCALE = 2.1;
const TIMELINE_SHARE_DISPLAY_FORMULA_MAX_SCALE = 2.8;
const TIMELINE_SHARE_DISPLAY_FORMULA_TARGET_WIDTH_RATIO = 0.58;

function loadImageFromUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function parseShareSvgLength(value, fallback = 0) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const number = Number.parseFloat(text);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  if (/\bex\b/i.test(text)) return number * 8;
  if (/\bem\b/i.test(text)) return number * 16;
  if (/\bpt\b/i.test(text)) return number * (96 / 72);
  if (/\bpc\b/i.test(text)) return number * 16;
  if (/\bcm\b/i.test(text)) return number * (96 / 2.54);
  if (/\bmm\b/i.test(text)) return number * (96 / 25.4);
  if (/\bin\b/i.test(text)) return number * 96;
  return number;
}

function measureShareSvgElement(svg) {
  if (!(svg instanceof SVGElement)) {
    return { width: 0, height: 0, svgText: "" };
  }
  const clonedSvg = svg.cloneNode(true);
  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const mountedSvg = clonedSvg.cloneNode(true);
  const measureHost = document.createElement("div");
  measureHost.style.position = "absolute";
  measureHost.style.left = "-9999px";
  measureHost.style.top = "-9999px";
  measureHost.style.visibility = "hidden";
  measureHost.style.pointerEvents = "none";
  measureHost.style.display = "inline-block";
  measureHost.style.whiteSpace = "nowrap";
  mountedSvg.style.display = "block";
  measureHost.appendChild(mountedSvg);
  document.body.appendChild(measureHost);

  let width = 0;
  let height = 0;
  try {
    const rect = mountedSvg.getBoundingClientRect();
    width = Math.ceil(rect.width || 0);
    height = Math.ceil(rect.height || 0);
    if ((!width || !height) && typeof mountedSvg.getBBox === "function") {
      try {
        const bbox = mountedSvg.getBBox();
        width = Math.max(width, Math.ceil(bbox.width || 0));
        height = Math.max(height, Math.ceil(bbox.height || 0));
      } catch {}
    }
    if (!width || !height) {
      const hostRect = measureHost.getBoundingClientRect();
      width = Math.max(width, Math.ceil(hostRect.width || 0));
      height = Math.max(height, Math.ceil(hostRect.height || 0));
    }
  } finally {
    document.body.removeChild(measureHost);
  }

  if (width > 0) clonedSvg.setAttribute("width", String(width));
  if (height > 0) clonedSvg.setAttribute("height", String(height));
  return {
    width: Math.max(10, width || 0),
    height: Math.max(14, height || 0),
    svgText: new XMLSerializer().serializeToString(clonedSvg)
  };
}

function getShareSvgIntrinsicSize(svgMarkup, img = null) {
  const fallbackWidth = Number(img?.naturalWidth || img?.width || 0) || 0;
  const fallbackHeight = Number(img?.naturalHeight || img?.height || 0) || 0;
  let width = fallbackWidth;
  let height = fallbackHeight;
  try {
    const parsed = new DOMParser().parseFromString(String(svgMarkup || ""), "image/svg+xml");
    const svg = parsed.documentElement;
    if (svg?.tagName?.toLowerCase?.() === "svg") {
      width = parseShareSvgLength(svg.getAttribute("width"), width);
      height = parseShareSvgLength(svg.getAttribute("height"), height);
      const viewBox = String(svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
      if (viewBox.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0) {
        if (!width && height) width = height * (viewBox[2] / viewBox[3]);
        if (!height && width) height = width * (viewBox[3] / viewBox[2]);
        if (!width && !height) {
          width = viewBox[2] / 8;
          height = viewBox[3] / 8;
        }
      }
    }
  } catch {}
  width = Math.max(10, Math.ceil(width || fallbackWidth || 0));
  height = Math.max(14, Math.ceil(height || fallbackHeight || 0));
  return { width, height };
}

function getScaledFormulaAssetSize(asset, fallbackWidth, maxWidth, displayMode = false) {
  const rawWidth = Math.max(10, Number(asset?.width || 0) || Number(fallbackWidth || 0) || 10);
  const rawHeight = Math.max(14, Number(asset?.height || 0) || 20);
  const limit = Math.max(10, Number(maxWidth || rawWidth) || rawWidth);
  const maxScale = displayMode ? TIMELINE_SHARE_DISPLAY_FORMULA_MAX_SCALE : TIMELINE_SHARE_INLINE_FORMULA_MAX_SCALE;
  const targetHeight = displayMode ? TIMELINE_SHARE_DISPLAY_FORMULA_TARGET_HEIGHT : TIMELINE_SHARE_INLINE_FORMULA_TARGET_HEIGHT;
  const targetWidth = displayMode ? limit * TIMELINE_SHARE_DISPLAY_FORMULA_TARGET_WIDTH_RATIO : limit;
  const minScale = displayMode ? 0.9 : 0.95;
  const desiredScale = Math.min(maxScale, Math.max(minScale, targetHeight / rawHeight));
  const normalizationStrength = displayMode ? 0.72 : 0.58;
  let scale = 1 + (desiredScale - 1) * normalizationStrength;

  // Keep formula sizes naturally close to each other instead of forcing a strict uniform height.
  // Width still only caps the result and does not drive additional enlargement.
  if (rawWidth * scale > targetWidth) {
    scale = targetWidth / rawWidth;
  }
  if (rawWidth * scale > limit) {
    scale = limit / rawWidth;
  }
  scale = Math.max(displayMode ? 0.78 : 0.82, Math.min(scale, maxScale));
  return {
    width: Math.max(10, Math.ceil(rawWidth * scale)),
    height: Math.max(14, Math.ceil(rawHeight * scale)),
    rawWidth,
    rawHeight,
    scale
  };
}

function getInlineFormulaBaselineShift(seg, size) {
  if (seg?.displayMode) return 0;
  const tex = String(seg?.tex || seg?.text || "");
  const scaledHeight = Math.max(14, Number(size?.height || 0) || 14);
  const rawHeight = Math.max(14, Number(size?.rawHeight || 0) || scaledHeight);
  let shift = -5;

  if (scaledHeight >= 30) shift -= 1;
  if (scaledHeight >= 36 || rawHeight >= 24) shift -= 1;

  if (/\\(?:frac|dfrac|tfrac|sqrt|sum|prod|int|iint|iiint|oint|lim|overbrace|underbrace|overset|underset|stackrel|begin\{(?:matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|cases|aligned|align|gathered)\})/.test(tex)) {
    shift -= 1;
  }
  if (/(?:_[{(]?[^}\s]+|[{(]_[^)]|\^[{(]?[^}\s]+|[{(]\^[^)])/.test(tex) || /[_^].*[_^]/.test(tex)) {
    shift -= 1;
  }

  return Math.max(-8, shift);
}

function shouldRenderFormulaAsBlock(asset, fallbackWidth, maxWidth, displayMode = false, forceFormulaBlock = false) {
  if (displayMode || forceFormulaBlock) return true;
  const rawWidth = Math.max(10, Number(asset?.width || 0) || Number(fallbackWidth || 0) || 10);
  const preferredWidth = rawWidth * Math.min(
    TIMELINE_SHARE_INLINE_FORMULA_MAX_SCALE,
    Math.max(TIMELINE_SHARE_INLINE_FORMULA_MIN_HEIGHT / Math.max(14, Number(asset?.height || 0) || 20), TIMELINE_SHARE_INLINE_FORMULA_TARGET_HEIGHT / Math.max(14, Number(asset?.height || 0) || 20))
  );
  const limit = Math.max(10, Number(maxWidth || preferredWidth) || preferredWidth);
  return preferredWidth > limit * TIMELINE_SHARE_FORMULA_BLOCK_THRESHOLD;
}

async function renderSvgMarkupToAsset(svgMarkup, cacheKey = "") {
  const normalizedSvg = String(svgMarkup || "").trim();
  if (!normalizedSvg) return null;
  const key = cacheKey || `svg::${normalizedSvg.slice(0, 240)}`;
  if (timelineShareFormulaSvgCache.has(key)) {
    const cached = timelineShareFormulaSvgCache.get(key);
    if (cached) return cached;
    timelineShareFormulaSvgCache.delete(key);
  }
  let result = null;
  try {
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizedSvg)}`;
    const img = await loadImageFromUrl(url);
    if (img) {
      const size = getShareSvgIntrinsicSize(normalizedSvg, img);
      result = {
        img,
        width: size.width,
        height: size.height,
        svgMarkup: normalizedSvg,
        dataUrl: url
      };
    }
  } catch (error) {
    console.warn("[Gemini Timeline] raw svg asset render failed", error);
  }
  if (result) {
    timelineShareFormulaSvgCache.set(key, result);
  }
  return result;
}

async function renderTexToSvgAsset(tex, displayMode = false, svgMarkup = "") {
  const normalizedTex = String(tex || "").trim();
  if (!normalizedTex) return null;
  const cacheKey = `${displayMode ? "display" : "inline"}::${normalizedTex}`;
  if (timelineShareFormulaSvgCache.has(cacheKey)) {
    const cached = timelineShareFormulaSvgCache.get(cacheKey);
    if (cached) return cached;
    timelineShareFormulaSvgCache.delete(cacheKey);
  }
  let result = null;
  try {
    const mathJax = window.MathJax;
    if (mathJax && (typeof mathJax.tex2svgPromise === "function" || typeof mathJax.tex2svg === "function")) {
      if (mathJax.startup?.promise && typeof mathJax.startup.promise.then === "function") {
        try {
          await mathJax.startup.promise;
        } catch {}
      }
      const rendered = typeof mathJax.tex2svgPromise === "function"
        ? await mathJax.tex2svgPromise(normalizedTex, { display: displayMode })
        : mathJax.tex2svg(normalizedTex, { display: displayMode });
      const svg = rendered?.querySelector?.("svg") || (rendered?.tagName?.toLowerCase?.() === "svg" ? rendered : null);
      if (svg) {
        const measured = measureShareSvgElement(svg);
        const svgText = measured.svgText || new XMLSerializer().serializeToString(svg);
        const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
        const img = await loadImageFromUrl(url);
        if (img) {
          const size = getShareSvgIntrinsicSize(svgText, img);
          result = {
            img,
            width: Math.max(size.width || 0, measured.width || 0),
            height: Math.max(size.height || 0, measured.height || 0),
            svgMarkup: svgText,
            dataUrl: url
          };
        }
      }
    }
    if (!result && svgMarkup) {
      result = await renderSvgMarkupToAsset(svgMarkup, `raw:${cacheKey}`);
      if (result) {
        timelineShareFormulaSvgCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (error) {
    console.warn("[Gemini Timeline] formula svg render failed", error);
  }
  if (result) {
    timelineShareFormulaSvgCache.set(cacheKey, result);
  }
  return result;
}

async function renderTexToMathMlMarkup(tex, displayMode = false) {
  const normalizedTex = String(tex || "").trim();
  if (!normalizedTex) return "";
  const cacheKey = `${displayMode ? "display" : "inline"}::${normalizedTex}`;
  if (timelineShareFormulaMathMlCache.has(cacheKey)) {
    return timelineShareFormulaMathMlCache.get(cacheKey) || "";
  }
  let mathMl = "";
  try {
    const mathJax = window.MathJax;
    if (mathJax && (typeof mathJax.tex2mmlPromise === "function" || typeof mathJax.tex2mml === "function")) {
      if (mathJax.startup?.promise && typeof mathJax.startup.promise.then === "function") {
        try {
          await mathJax.startup.promise;
        } catch {}
      }
      const raw = typeof mathJax.tex2mmlPromise === "function"
        ? await mathJax.tex2mmlPromise(normalizedTex, { display: displayMode })
        : mathJax.tex2mml(normalizedTex, { display: displayMode });
      mathMl = String(raw || "")
        .replace(/^\s*<\?xml[^>]*>\s*/i, "")
        .trim();
    }
  } catch (error) {
    console.warn("[Gemini Timeline] formula mathml render failed", error);
    mathMl = "";
  }
  timelineShareFormulaMathMlCache.set(cacheKey, mathMl);
  return mathMl;
}

async function renderMathMlMarkupToAsset(mathMlMarkup, cacheKey = "") {
  const normalizedMathMl = String(mathMlMarkup || "").trim();
  if (!normalizedMathMl) return null;
  const key = cacheKey || `mathml::${normalizedMathMl.slice(0, 240)}`;
  if (timelineShareFormulaSvgCache.has(key)) {
    const cached = timelineShareFormulaSvgCache.get(key);
    if (cached) return cached;
    timelineShareFormulaSvgCache.delete(key);
  }
  let result = null;
  try {
    const mathJax = window.MathJax;
    if (mathJax && (typeof mathJax.mathml2svgPromise === "function" || typeof mathJax.mathml2svg === "function")) {
      if (mathJax.startup?.promise && typeof mathJax.startup.promise.then === "function") {
        try {
          await mathJax.startup.promise;
        } catch {}
      }
      const rendered = typeof mathJax.mathml2svgPromise === "function"
        ? await mathJax.mathml2svgPromise(normalizedMathMl)
        : mathJax.mathml2svg(normalizedMathMl);
      const svg = rendered?.querySelector?.("svg") || (rendered?.tagName?.toLowerCase?.() === "svg" ? rendered : null);
      if (svg) {
        const measured = measureShareSvgElement(svg);
        const svgText = measured.svgText || new XMLSerializer().serializeToString(svg);
        result = await renderSvgMarkupToAsset(svgText, `from-mathml:${key}`);
        if (result && (measured.width || measured.height)) {
          result = {
            ...result,
            width: Math.max(Number(result.width || 0), measured.width || 0),
            height: Math.max(Number(result.height || 0), measured.height || 0),
            svgMarkup: svgText
          };
        }
      }
    }
  } catch (error) {
    console.warn("[Gemini Timeline] formula mathml->svg render failed", error);
  }
  if (result) timelineShareFormulaSvgCache.set(key, result);
  return result;
}

function parseMarkdownSegments(text) {
  const segments = [];
  let current = "";
  let bold = false;
  const formulaCommandNames = [
    "frac", "dfrac", "tfrac", "binom", "sqrt", "root",
    "sum", "prod", "coprod", "lim", "limsup", "liminf",
    "int", "iint", "iiint", "oint", "partial", "nabla", "infty",
    "sin", "cos", "tan", "cot", "sec", "csc", "arcsin", "arccos", "arctan",
    "sinh", "cosh", "tanh", "log", "ln", "exp",
    "cdot", "times", "div", "pm", "mp", "leq", "geq", "neq", "approx", "sim", "propto",
    "to", "rightarrow", "leftarrow", "leftrightarrow",
    "vec", "overrightarrow", "overline", "underline", "hat", "bar", "dot", "ddot",
    "mathbf", "mathrm", "mathit", "mathcal", "mathbb", "text", "operatorname",
    "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "vartheta",
    "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "varpi", "rho", "varrho", "sigma", "varsigma",
    "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega",
    "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega"
  ];
  const escapedCommands = formulaCommandNames
    .slice()
    .sort((a, b) => b.length - a.length)
    .join("|");
  const scriptToken = "(?:\\^\\{[^{}\\n]{1,30}\\}|\\^[A-Za-z0-9+\\-]{1,10}|_\\{[^{}\\n]{1,30}\\}|_[A-Za-z0-9+\\-]{1,10})";
  const formulaHintPatterns = [
    new RegExp(`\\\\(?:${escapedCommands})(?:\\s*\\{[^{}\\n]{1,90}\\}){0,6}(?:\\s*${scriptToken}){0,4}`, "g"),
    /\\begin\{(?:aligned|align|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}[\s\S]{1,240}?\\end\{(?:aligned|align|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}/g,
    /\b(?:sin|cos|tan|cot|sec|csc|log|ln|exp)\b(?:\s*(?:\^\{[^{}\n]{1,20}\}|\^[A-Za-z0-9+\-]{1,10}))?\s*(?:\([^\n()]{1,80}\)|[A-Za-z0-9]+)/g,
    /[A-Za-z0-9\)\]]+(?:\^\{[^{}\n]{1,20}\}|\^[A-Za-z0-9+\-]{1,10}|_\{[^{}\n]{1,20}\}|_[A-Za-z0-9+\-]{1,10}){1,3}/g,
    /(?:d|∂)\s*\/\s*(?:d|∂)\s*[A-Za-z]/g
  ];
  const collectFormulaHintMatches = (source) => {
    const candidates = [];
    formulaHintPatterns.forEach((pattern) => {
      pattern.lastIndex = 0;
      let match = null;
      while ((match = pattern.exec(source))) {
        const raw = String(match[0] || "");
        if (!raw.trim()) continue;
        const start = Number(match.index || 0);
        const end = start + raw.length;
        candidates.push({ start, end, raw });
      }
    });
    candidates.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return (b.end - b.start) - (a.end - a.start);
    });
    const selected = [];
    let cursor = -1;
    for (const candidate of candidates) {
      if (candidate.start < cursor) continue;
      selected.push(candidate);
      cursor = candidate.end;
    }
    return selected;
  };
  const pushTextSegment = (value, isBoldValue) => {
    if (!value) return;
    const last = segments[segments.length - 1];
    if (last && !last.isFormula && Boolean(last.isBold) === Boolean(isBoldValue)) {
      last.text += value;
      return;
    }
    segments.push({ text: value, isBold: Boolean(isBoldValue), isFormula: false });
  };
  const pushFormulaHintSegments = (value, isBoldValue) => {
    const source = String(value || "");
    if (!source) return;
    let cursor = 0;
    const matches = collectFormulaHintMatches(source);
    for (const match of matches) {
      const raw = String(match.raw || "");
      const start = Number(match.start || 0);
      const end = Number(match.end || start + raw.length);
      const looksFormula =
        raw.startsWith("\\") ||
        /\b(?:sin|cos|tan|cot|sec|csc|log|ln|exp)\b/.test(raw) ||
        raw.includes("/") ||
        raw.includes("^") ||
        raw.includes("_");
      if (!looksFormula) continue;
      if (start > cursor) {
        pushTextSegment(source.slice(cursor, start), isBoldValue);
      }
      const tex = raw.trim();
      if (!tex) {
        cursor = end;
        continue;
      }
      segments.push({
        text: formatLatexForCanvasDisplay(tex) || tex,
        isBold: Boolean(isBoldValue),
        isFormula: true,
        tex,
        displayMode: false
      });
      cursor = end;
    }
    if (cursor < source.length) {
      pushTextSegment(source.slice(cursor), isBoldValue);
    }
  };
  const pushText = () => {
    if (!current) return;
    pushFormulaHintSegments(current, bold);
    current = "";
  };

  for (let i = 0; i < text.length; ) {
    if (text.startsWith("$$", i) || text[i] === "$") {
      const delimiter = text.startsWith("$$", i) ? "$$" : "$";
      const endIndex = findClosingMathDelimiter(text, i + delimiter.length, delimiter);
      if (endIndex > i) {
        pushText();
        const tex = text.slice(i + delimiter.length, endIndex).trim();
        const formulaText = formatLatexForCanvasDisplay(tex);
        segments.push({
          text: formulaText || tex,
          isBold: bold,
          isFormula: true,
          tex,
          displayMode: delimiter === "$$"
        });
        i = endIndex + delimiter.length;
        continue;
      }
    }
    if (text.startsWith("**", i) || text.startsWith("__", i)) {
      pushText();
      bold = !bold;
      i += 2;
      continue;
    }
    current += text[i];
    i += 1;
  }
  pushText();
  return segments;
}

async function wrapRichCanvasTextWithAssets(ctx, text, maxWidth, fontNormal, fontBold, fontFormula = fontNormal, options = {}) {
  const lines = [];
  const paragraphs = String(text || "").split("\n");
  const forceFormulaBlock = options?.forceFormulaBlock === true;

  const pushLine = (segments, height) => {
    if (!segments.length) return;
    lines.push({ segments: segments.slice(), height: Math.max(26, height || 26) });
  };

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (paragraph.trim() === "") {
      lines.push({ segments: [], height: 26 });
      continue;
    }

    const parsedSegments = parseMarkdownSegments(paragraph);
    const preparedSegments = [];
    for (const segment of parsedSegments) {
      if (segment.isFormula && segment.tex) {
        let asset = await renderTexToSvgAsset(segment.tex, segment.displayMode, segment.svgMarkup || "");
        const mathMlMarkup = segment.tex ? await renderTexToMathMlMarkup(segment.tex, Boolean(segment.displayMode)) : "";
        if (!asset && mathMlMarkup) {
          asset = await renderMathMlMarkupToAsset(mathMlMarkup, `rich:${String(segment.tex || "").slice(0, 180)}`);
        }
        preparedSegments.push({ ...segment, mathMlMarkup, asset });
      } else {
        preparedSegments.push(segment);
      }
    }

    let currentLine = [];
    let currentLineWidth = 0;
    let currentLineHeight = 26;

    for (const seg of preparedSegments) {
      if (seg.isFormula) {
        const fallbackWidth = ctx.measureText(seg.text || "").width;
        const isDisplayFormula = shouldRenderFormulaAsBlock(seg.asset, fallbackWidth, maxWidth, seg.displayMode === true, forceFormulaBlock);
        const size = getScaledFormulaAssetSize(seg.asset, fallbackWidth, maxWidth, isDisplayFormula);
        const segWidth = size.width;
        const segHeight = Math.max(isDisplayFormula ? 82 : 36, Math.ceil(size.height + (isDisplayFormula ? 44 : 10)));
        if (isDisplayFormula && currentLineWidth > 0) {
          pushLine(currentLine, currentLineHeight);
          currentLine = [];
          currentLineWidth = 0;
          currentLineHeight = 26;
        }
        if (currentLineWidth + segWidth > maxWidth && currentLineWidth > 0) {
          pushLine(currentLine, currentLineHeight);
          currentLine = [];
          currentLineWidth = 0;
          currentLineHeight = 26;
        }
        currentLine.push({
          ...seg,
          width: Math.min(segWidth, maxWidth),
          rawWidth: size.rawWidth,
          drawWidth: segWidth,
          drawHeight: size.height,
          height: segHeight,
          displayMode: isDisplayFormula,
          baselineShift: getInlineFormulaBaselineShift({ ...seg, displayMode: isDisplayFormula }, size),
          topPadding: isDisplayFormula ? 22 : 5,
          bottomPadding: isDisplayFormula ? 22 : 5
        });
        currentLineWidth += segWidth;
        currentLineHeight = Math.max(currentLineHeight, segHeight);
        if (isDisplayFormula) {
          pushLine(currentLine, currentLineHeight);
          currentLine = [];
          currentLineWidth = 0;
          currentLineHeight = 26;
        }
        continue;
      }

      ctx.font = seg.isBold ? fontBold : fontNormal;
      let currentSegText = "";
      for (let j = 0; j < seg.text.length; j++) {
        const char = seg.text[j];
        const testText = currentSegText + char;
        const testWidth = ctx.measureText(testText).width;
        const charWidth = testWidth - (currentSegText ? ctx.measureText(currentSegText).width : 0);

        if (currentLineWidth + charWidth > maxWidth && currentLineWidth > 0) {
          if (currentSegText) {
            currentLine.push({
              text: currentSegText,
              isBold: seg.isBold,
              isFormula: false,
              width: ctx.measureText(currentSegText).width
            });
          }
          pushLine(currentLine, currentLineHeight);
          currentLine = [];
          currentLineWidth = 0;
          currentLineHeight = 26;
          currentSegText = char;
          currentLineWidth += ctx.measureText(char).width;
        } else {
          currentSegText = testText;
          currentLineWidth += charWidth;
        }
      }
      if (currentSegText) {
        currentLine.push({
          text: currentSegText,
          isBold: seg.isBold,
          isFormula: false,
          width: ctx.measureText(currentSegText).width
        });
      }
    }

    pushLine(currentLine, currentLineHeight);
  }

  return lines;
}

async function wrapStructuredAnswerBlocksWithAssets(ctx, blocks, maxWidth, fontNormal, fontBold, options = {}) {
  const lines = [];
  const forceFormulaBlock = options?.forceFormulaBlock === true;
  const pushLine = (segments, height) => {
    if (!segments.length) return;
    lines.push({ segments: segments.slice(), height: Math.max(26, height || 26) });
  };

  const blockList = Array.isArray(blocks) ? blocks : [];
  for (let blockIndex = 0; blockIndex < blockList.length; blockIndex += 1) {
    const block = blockList[blockIndex];
    const sourceSegments = Array.isArray(block?.segments) ? block.segments : [];
    const preparedSegments = [];
    for (const segment of sourceSegments) {
      if (segment?.type === "formula" && (segment.tex || segment.svgMarkup || segment.mathMlMarkup)) {
        let asset = segment.tex
          ? await renderTexToSvgAsset(segment.tex, segment.displayMode, segment.svgMarkup || "")
          : await renderSvgMarkupToAsset(
              segment.svgMarkup || "",
              `struct:formula:svg-only:${String(segment.svgMarkup || "").slice(0, 240)}`
            );
        const mathMlMarkup =
          String(segment.mathMlMarkup || "").trim() ||
          (segment.tex ? await renderTexToMathMlMarkup(segment.tex, Boolean(segment.displayMode)) : "");
        if (!asset && mathMlMarkup) {
          asset = await renderMathMlMarkupToAsset(
            mathMlMarkup,
            `struct:formula:mathml:${String(segment.tex || "").slice(0, 180)}:${String(mathMlMarkup).slice(0, 80)}`
          );
        }
        preparedSegments.push({
          text: segment.text || formatLatexForCanvasDisplay(segment.tex),
          tex: segment.tex,
          isBold: false,
          isFormula: true,
          displayMode: Boolean(segment.displayMode),
          svgMarkup: segment.svgMarkup || "",
          mathMlMarkup,
          asset
        });
      } else if (segment?.type === "text") {
        const parsedTextSegments = parseMarkdownSegments(String(segment.text || ""));
        if (!parsedTextSegments.length) continue;
        for (const parsed of parsedTextSegments) {
          if (parsed?.isFormula && parsed?.tex) {
            let asset = await renderTexToSvgAsset(parsed.tex, Boolean(parsed.displayMode), "");
            const mathMlMarkup = parsed.tex ? await renderTexToMathMlMarkup(parsed.tex, Boolean(parsed.displayMode)) : "";
            if (!asset && mathMlMarkup) {
              asset = await renderMathMlMarkupToAsset(
                mathMlMarkup,
                `struct:text-formula:mathml:${String(parsed.tex || "").slice(0, 180)}:${String(mathMlMarkup).slice(0, 80)}`
              );
            }
            preparedSegments.push({
              text: parsed.text || formatLatexForCanvasDisplay(parsed.tex),
              tex: parsed.tex,
              isBold: false,
              isFormula: true,
              displayMode: Boolean(parsed.displayMode),
              svgMarkup: "",
              mathMlMarkup,
              asset
            });
            continue;
          }
          preparedSegments.push({
            text: String(parsed?.text || ""),
            isBold: Boolean(segment.isBold) || Boolean(parsed?.isBold),
            isFormula: false
          });
        }
      }
    }

    let currentLine = [];
    let currentLineWidth = 0;
    let currentLineHeight = 26;

    for (const seg of preparedSegments) {
      if (seg.isFormula) {
        const fallbackWidth = ctx.measureText(seg.text || "").width;
        const isDisplayFormula = shouldRenderFormulaAsBlock(seg.asset, fallbackWidth, maxWidth, seg.displayMode === true, forceFormulaBlock);
        const size = getScaledFormulaAssetSize(seg.asset, fallbackWidth, maxWidth, isDisplayFormula);
        const segWidth = size.width;
        const segHeight = Math.max(isDisplayFormula ? 82 : 36, Math.ceil(size.height + (isDisplayFormula ? 44 : 10)));
        if (isDisplayFormula && currentLineWidth > 0) {
          pushLine(currentLine, currentLineHeight);
          currentLine = [];
          currentLineWidth = 0;
          currentLineHeight = 26;
        }
        if (currentLineWidth + segWidth > maxWidth && currentLineWidth > 0) {
          pushLine(currentLine, currentLineHeight);
          currentLine = [];
          currentLineWidth = 0;
          currentLineHeight = 26;
        }
        currentLine.push({
          ...seg,
          width: Math.min(segWidth, maxWidth),
          rawWidth: size.rawWidth,
          drawWidth: segWidth,
          drawHeight: size.height,
          height: segHeight,
          displayMode: isDisplayFormula,
          baselineShift: getInlineFormulaBaselineShift({ ...seg, displayMode: isDisplayFormula }, size),
          topPadding: isDisplayFormula ? 22 : 5,
          bottomPadding: isDisplayFormula ? 22 : 5
        });
        currentLineWidth += segWidth;
        currentLineHeight = Math.max(currentLineHeight, segHeight);
        if (isDisplayFormula) {
          pushLine(currentLine, currentLineHeight);
          currentLine = [];
          currentLineWidth = 0;
          currentLineHeight = 26;
        }
        continue;
      }

      ctx.font = seg.isBold ? fontBold : fontNormal;
      let currentSegText = "";
      for (let j = 0; j < seg.text.length; j += 1) {
        const char = seg.text[j];
        const testText = currentSegText + char;
        const testWidth = ctx.measureText(testText).width;
        const charWidth = testWidth - (currentSegText ? ctx.measureText(currentSegText).width : 0);
        if (currentLineWidth + charWidth > maxWidth && currentLineWidth > 0) {
          if (currentSegText) {
            currentLine.push({
              text: currentSegText,
              isBold: seg.isBold,
              isFormula: false,
              width: ctx.measureText(currentSegText).width
            });
          }
          pushLine(currentLine, currentLineHeight);
          currentLine = [];
          currentLineWidth = 0;
          currentLineHeight = 26;
          currentSegText = char;
          currentLineWidth += ctx.measureText(char).width;
        } else {
          currentSegText = testText;
          currentLineWidth += charWidth;
        }
      }
      if (currentSegText) {
        currentLine.push({
          text: currentSegText,
          isBold: seg.isBold,
          isFormula: false,
          width: ctx.measureText(currentSegText).width
        });
      }
    }

    pushLine(currentLine, currentLineHeight);
    if (blockIndex < blockList.length - 1) {
      lines.push({ segments: [], height: 12 });
    }
  }

  return lines;
}

function wrapRichCanvasText(ctx, text, maxWidth, fontNormal, fontBold, fontFormula = fontNormal) {
  const lines = [];
  const paragraphs = String(text || "").split('\n');
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (paragraph.trim() === '') {
      lines.push([]); // empty line
      continue;
    }
    
    const segments = parseMarkdownSegments(paragraph);
    let currentLine = [];
    let currentLineWidth = 0;
    
    for (const seg of segments) {
      ctx.font = seg.isFormula ? fontFormula : (seg.isBold ? fontBold : fontNormal);
      let currentSegText = '';
      
      for (let j = 0; j < seg.text.length; j++) {
        const char = seg.text[j];
        // measureText is accurate, but sometimes browser kerning causes tiny visual gaps between segments
        // We measure the whole string so far to be more precise about the actual width it will take
        const testText = currentSegText + char;
        const testWidth = ctx.measureText(testText).width;
        // The effective width of this char is the difference
        const charWidth = testWidth - (currentSegText ? ctx.measureText(currentSegText).width : 0);
        
        if (currentLineWidth + charWidth > maxWidth && currentLineWidth > 0) {
          if (currentSegText) {
            currentLine.push({ text: currentSegText, isBold: seg.isBold, isFormula: seg.isFormula });
          }
          lines.push(currentLine);
          currentLine = [];
          currentLineWidth = 0;
          currentSegText = char;
        currentLineWidth += ctx.measureText(char).width;
        } else {
          currentSegText = testText;
          currentLineWidth += charWidth;
        }
      }
      if (currentSegText) {
        currentLine.push({ text: currentSegText, isBold: seg.isBold, isFormula: seg.isFormula });
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
  }
  return lines;
}

function drawCanvasRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function buildTimelineShareCardCanvas(turn, sourceData = {}) {
  if (!sourceData) return null;
  const question = sourceData.question || ct("timeline_turn_unnamed");
  const answer = sourceData.answer || "";
  const answerBlocks = Array.isArray(sourceData.answerBlocks) ? sourceData.answerBlocks : [];
  const note = sourceData.note || "";
  const typeLabel = sourceData.typeLabel || "";
  const titleText = ct("timeline_share_card_title");
  
  // We switch completely back to Native Canvas 2D API drawing.
  // This 100% bypasses any DOM, SVG, XML parsing, and CORS/Tainted issues.
  
  const scale = 2; // High DPI
  const cardWidth = 1440; // Give formulas enough horizontal room to stay readable.
  const padding = 40;
  const innerWidth = cardWidth - padding * 2;
  const innerPadding = 48;
  const textWidth = innerWidth - innerPadding * 2;
  const answerContentInset = 8;
  
  // Create a temporary canvas just to measure text heights
  const measureCanvas = document.createElement("canvas");
  const mCtx = measureCanvas.getContext("2d");
  
  // Fonts - Modern, clean typography
  const fontTitle = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const fontBadge = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const fontSectionTitle = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const fontQuestion = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const fontNote = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const fontBody = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const fontBodyBold = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const fontBodyFormula = "italic 17px 'Cambria Math', 'STIX Two Math', 'Times New Roman', serif";
  const fontFooter = "500 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  
  // Measure everything
  mCtx.font = fontQuestion;
  const qLines = wrapCanvasText(mCtx, question, textWidth);
  const qHeight = qLines.length * 38;
  
  let nLines = [];
  let nHeight = 0;
  if (note) {
    mCtx.font = fontNote;
    nLines = wrapCanvasText(mCtx, note, textWidth - 48); // Padding inside note box
    nHeight = nLines.length * 30 + 48; // lines + top/bottom padding
  }

  let aLines = [];
  let aHeight = 0;
  if (answerBlocks.length) {
    aLines = await wrapStructuredAnswerBlocksWithAssets(mCtx, answerBlocks, textWidth - answerContentInset, fontBody, fontBodyBold);
    aHeight = aLines.reduce((sum, line) => sum + Math.max(12, Number(line?.height || 26)), 0) + 16;
  } else if (answer) {
    // Fallback path: parse formulas from markdown/text when no structured DOM blocks are available.
    let plainAnswer = answer.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    plainAnswer = plainAnswer.replace(/`([^`]+)`/g, "$1").replace(/~~(.*?)~~/g, "$1");
    aLines = await wrapRichCanvasTextWithAssets(mCtx, plainAnswer, textWidth - answerContentInset, fontBody, fontBodyBold, fontBodyFormula);
    aHeight = aLines.reduce((sum, line) => sum + Math.max(26, Number(line?.height || 26)), 0) + 16;
  }
  
  // Calculate total height (Order: Header -> Question -> Note -> Answer -> Footer)
  let innerHeight = innerPadding + 24 + 32; // top padding + title height + margin bottom
  
  innerHeight += qHeight + 24; // question + margin
  
  if (note) {
    innerHeight += 24 + 16; // note section title + margin
    innerHeight += nHeight + 32; // note block + margin
  }
  
  if (answerBlocks.length || answer) {
    innerHeight += 24 + 16; // answer section title + margin
    innerHeight += aHeight + 32; // answer block + margin
  }
  
  innerHeight += 20 + 20 + 20 + innerPadding; // separator margin + border + footer + bottom padding
  
  const cardHeight = innerHeight + padding * 2;
  
  // Now actually draw
  const canvas = document.createElement("canvas");
  canvas.width = cardWidth * scale;
  canvas.height = cardHeight * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  
  // 1. Background Gradient (Soft elegant background)
  const grad = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
  grad.addColorStop(0, "#f8f9fa");
  grad.addColorStop(1, "#e8eaed");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cardWidth, cardHeight);
  
  // 2. Inner Card Shadow
  ctx.shadowColor = "rgba(0,0,0,0.06)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;
  drawCanvasRoundedRect(ctx, padding, padding, innerWidth, innerHeight, 20);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.shadowColor = "transparent"; // Reset shadow
  
  let currentY = padding + innerPadding;
  const leftX = padding + innerPadding;
  
  // 3. Header (Title + Badge)
  ctx.font = fontTitle;
  ctx.fillStyle = "#202124";
  ctx.textBaseline = "top";
  ctx.fillText(titleText, leftX, currentY);
  
  if (typeLabel) {
    ctx.font = fontBadge;
    const badgeW = ctx.measureText(typeLabel).width + 32;
    const badgeH = 32;
    const badgeX = padding + innerWidth - innerPadding - badgeW;
    const badgeY = currentY - 6;
    
    ctx.fillStyle = "#e8f0fe";
    drawCanvasRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 16);
    ctx.fill();
    
    ctx.fillStyle = "#1a73e8";
    ctx.textBaseline = "middle";
    ctx.fillText(typeLabel, badgeX + 16, badgeY + badgeH / 2);
  }
  
  currentY += 24 + 32; // title height + margin
  
  // Helper for Section Titles
  const drawSectionTitle = (text, color) => {
    ctx.font = fontSectionTitle;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    ctx.fillText(text, leftX, currentY);
    currentY += 15 + 16; // font height + margin
  };
  
  // 4. Question Section (Large & Prominent)
  ctx.font = fontQuestion;
  ctx.fillStyle = "#1f1f1f";
  for (let i = 0; i < qLines.length; i++) {
    ctx.fillText(qLines[i], leftX, currentY);
    currentY += 38;
  }
  currentY += 24;
  
  // 5. Note Section (Highly Prominent User Highlight)
  if (note) {
    drawSectionTitle(ct("timeline_share_card_note"), "#e67c73");
    
    ctx.fillStyle = "#fce8e6"; // soft red/orange background
    drawCanvasRoundedRect(ctx, leftX, currentY, textWidth, nHeight, 16);
    ctx.fill();
    
    // Stronger accent line on the left
    ctx.fillStyle = "#e67c73";
    ctx.beginPath();
    ctx.moveTo(leftX, currentY + 12);
    ctx.lineTo(leftX, currentY + nHeight - 12);
    ctx.arcTo(leftX, currentY + nHeight, leftX + 6, currentY + nHeight, 6);
    ctx.lineTo(leftX + 6, currentY);
    ctx.arcTo(leftX, currentY, leftX, currentY + 12, 6);
    ctx.fill();
    
    ctx.font = fontNote;
    ctx.fillStyle = "#b03d32"; // Darker red/orange text
    let textY = currentY + 24;
    ctx.save();
    drawCanvasRoundedRect(ctx, leftX, currentY, textWidth, nHeight, 16);
    ctx.clip();
    for (let i = 0; i < nLines.length; i++) {
      ctx.fillText(nLines[i], leftX + 24 + 6, textY);
      textY += 30;
    }
    ctx.restore();
    currentY += nHeight + 32;
  }
  
  // 6. Answer Section (Clean, subtle)
  if (answerBlocks.length || answer) {
    drawSectionTitle(ct("timeline_share_card_answer"), "#1a73e8");
    
    // Just a clean left border for the answer, no heavy background
    ctx.fillStyle = "#e8eaed";
    drawCanvasRoundedRect(ctx, leftX, currentY, 4, aHeight, 2);
    ctx.fill();
    
    ctx.fillStyle = "#5f6368";
    let textY = currentY + 8;
    ctx.save();
    drawCanvasRoundedRect(ctx, leftX + answerContentInset, currentY, textWidth - answerContentInset, aHeight, 4);
    ctx.clip();
    for (let i = 0; i < aLines.length; i++) {
      let currentX = leftX + answerContentInset;
      const line = aLines[i] || { segments: [], height: 26 };
      const lineHeight = Math.max(12, Number(line.height || 26));
      const lineSegments = Array.isArray(line.segments) ? line.segments : [];
      const singleDisplayFormula =
        lineSegments.length === 1 &&
        lineSegments[0]?.isFormula &&
        lineSegments[0]?.displayMode;
      if (singleDisplayFormula) {
        currentX = leftX + answerContentInset + Math.max(0, Math.round((textWidth - answerContentInset - (lineSegments[0].drawWidth || lineSegments[0].width || 0)) / 2));
      }
      for (const seg of lineSegments) {
        if (seg.isFormula && seg.asset?.img) {
          const drawWidth = Math.max(10, Math.ceil(seg.drawWidth || seg.width || seg.asset.width || 0));
          const drawHeight = Math.max(14, Math.ceil(seg.drawHeight || seg.asset.height || 0));
          const topPadding = Math.max(0, Number(seg.topPadding || 0));
          const bottomPadding = Math.max(0, Number(seg.bottomPadding || 0));
          const baselineShift = Number(seg.baselineShift || 0);
          const availableHeight = Math.max(drawHeight, lineHeight - topPadding - bottomPadding);
          const drawY = textY + topPadding + Math.max(0, Math.round((availableHeight - drawHeight) / 2)) + baselineShift;
          ctx.drawImage(seg.asset.img, currentX, drawY, drawWidth, drawHeight);
          currentX += drawWidth;
          continue;
        }
        ctx.font = seg.isFormula ? fontBodyFormula : (seg.isBold ? fontBodyBold : fontBody);
        ctx.fillText(seg.text, currentX, textY);
        currentX += Number(seg.width || 0) || ctx.measureText(seg.text).width;
      }
      textY += lineHeight;
    }
    ctx.restore();
    currentY += aHeight + 32;
  }
  
  // 7. Footer
  currentY += 20;
  ctx.strokeStyle = "#f1f3f4";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftX, currentY);
  ctx.lineTo(padding + innerWidth - innerPadding, currentY);
  ctx.stroke();
  
  currentY += 20;
  ctx.font = fontFooter;
  ctx.fillStyle = "#9aa0a6";
  ctx.textBaseline = "top";
  const footerText = ct("timeline_share_card_footer");
  const footerW = ctx.measureText(footerText).width;
  ctx.fillText(footerText, padding + innerWidth / 2 - footerW / 2, currentY);
  
  return canvas;
}

function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve) => {
    if (!canvas) return resolve(null);
    try {
      canvas.toBlob(resolve, type, 1.0);
    } catch (e) {
      console.error("[Gemini Timeline] canvasToBlob error:", e);
      resolve(null);
    }
  });
}

function escapeSvgText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function buildTimelineShareCardSvg(turn, sourceData = {}) {
  if (!sourceData) return "";
  const question = sourceData.question || ct("timeline_turn_unnamed");
  const answer = sourceData.answer || "";
  const answerBlocks = Array.isArray(sourceData.answerBlocks) ? sourceData.answerBlocks : [];
  const note = sourceData.note || "";
  const typeLabel = sourceData.typeLabel || "";
  const titleText = ct("timeline_share_card_title");

  const cardWidth = 1440;
  const padding = 40;
  const innerWidth = cardWidth - padding * 2;
  const innerPadding = 48;
  const textWidth = innerWidth - innerPadding * 2;
  const answerContentInset = 8;
  const leftX = padding + innerPadding;

  const measureCanvas = document.createElement("canvas");
  const mCtx = measureCanvas.getContext("2d");
  const fontQuestion = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const fontNote = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const fontBody = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const fontBodyBold = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const fontBodyFormula = "italic 17px 'Cambria Math', 'STIX Two Math', 'Times New Roman', serif";

  mCtx.font = fontQuestion;
  const qLines = wrapCanvasText(mCtx, question, textWidth);
  const qHeight = qLines.length * 38;

  let nLines = [];
  let nHeight = 0;
  if (note) {
    mCtx.font = fontNote;
    nLines = wrapCanvasText(mCtx, note, textWidth - 48);
    nHeight = nLines.length * 30 + 48;
  }

  let aLines = [];
  let aHeight = 0;
  if (answerBlocks.length) {
    aLines = await wrapStructuredAnswerBlocksWithAssets(mCtx, answerBlocks, textWidth - answerContentInset, fontBody, fontBodyBold);
    aHeight = aLines.reduce((sum, line) => sum + Math.max(12, Number(line?.height || 26)), 0) + 16;
  } else if (answer) {
    let plainAnswer = answer.replace(/\[(.*?)\]\(.*?\)/g, "$1");
    plainAnswer = plainAnswer.replace(/`([^`]+)`/g, "$1").replace(/~~(.*?)~~/g, "$1");
    aLines = await wrapRichCanvasTextWithAssets(mCtx, plainAnswer, textWidth - answerContentInset, fontBody, fontBodyBold, fontBodyFormula);
    aHeight = aLines.reduce((sum, line) => sum + Math.max(26, Number(line?.height || 26)), 0) + 16;
  }

  let innerHeight = innerPadding + 24 + 32;
  innerHeight += qHeight + 24;
  if (note) innerHeight += 24 + 16 + nHeight + 32;
  if (answerBlocks.length || answer) innerHeight += 24 + 16 + aHeight + 32;
  innerHeight += 20 + 20 + 20 + innerPadding;
  const cardHeight = innerHeight + padding * 2;

  let currentY = padding + innerPadding;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">`);
  parts.push(`<defs>
    <linearGradient id="gtfBgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8f9fa"/>
      <stop offset="100%" stop-color="#e8eaed"/>
    </linearGradient>
  </defs>`);
  parts.push(`<style>
    .gtf-share-math {
      width: auto;
      height: auto;
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      color: #5f6368;
      max-width: 100%;
      overflow: visible;
    }
    .gtf-share-math math {
      font-size: 16px;
      line-height: 1.4;
    }
  </style>`);
  parts.push(`<rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" fill="url(#gtfBgGrad)"/>`);
  parts.push(`<rect x="${padding}" y="${padding}" width="${innerWidth}" height="${innerHeight}" rx="20" ry="20" fill="#ffffff"/>`);

  parts.push(`<text x="${leftX}" y="${currentY}" dominant-baseline="text-before-edge" font-size="20" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" fill="#202124">${escapeSvgText(titleText)}</text>`);
  if (typeLabel) {
    mCtx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    const badgeW = mCtx.measureText(typeLabel).width + 32;
    const badgeH = 32;
    const badgeX = padding + innerWidth - innerPadding - badgeW;
    const badgeY = currentY - 6;
    parts.push(`<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="16" ry="16" fill="#e8f0fe"/>`);
    parts.push(`<text x="${badgeX + 16}" y="${badgeY + 9}" dominant-baseline="text-before-edge" font-size="14" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" fill="#1a73e8">${escapeSvgText(typeLabel)}</text>`);
  }

  currentY += 24 + 32;
  for (const line of qLines) {
    parts.push(`<text x="${leftX}" y="${currentY}" dominant-baseline="text-before-edge" font-size="26" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" fill="#1f1f1f">${escapeSvgText(line)}</text>`);
    currentY += 38;
  }
  currentY += 24;

  if (note) {
    parts.push(`<text x="${leftX}" y="${currentY}" dominant-baseline="text-before-edge" font-size="15" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" fill="#e67c73">${escapeSvgText(ct("timeline_share_card_note"))}</text>`);
    currentY += 31;
    parts.push(`<rect x="${leftX}" y="${currentY}" width="${textWidth}" height="${nHeight}" rx="16" ry="16" fill="#fce8e6"/>`);
    parts.push(`<rect x="${leftX}" y="${currentY + 12}" width="6" height="${Math.max(6, nHeight - 24)}" rx="3" ry="3" fill="#e67c73"/>`);
    parts.push(`<clipPath id="gtfNoteClip"><rect x="${leftX}" y="${currentY}" width="${textWidth}" height="${nHeight}" rx="16" ry="16"/></clipPath>`);
    parts.push(`<g clip-path="url(#gtfNoteClip)">`);
    let noteY = currentY + 24;
    for (const line of nLines) {
      parts.push(`<text x="${leftX + 30}" y="${noteY}" dominant-baseline="text-before-edge" font-size="18" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" fill="#b03d32">${escapeSvgText(line)}</text>`);
      noteY += 30;
    }
    parts.push(`</g>`);
    currentY += nHeight + 32;
  }

  if (answerBlocks.length || answer) {
    parts.push(`<text x="${leftX}" y="${currentY}" dominant-baseline="text-before-edge" font-size="15" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" fill="#1a73e8">${escapeSvgText(ct("timeline_share_card_answer"))}</text>`);
    currentY += 31;
    parts.push(`<rect x="${leftX}" y="${currentY}" width="4" height="${aHeight}" rx="2" ry="2" fill="#e8eaed"/>`);
    parts.push(`<clipPath id="gtfAnswerClip"><rect x="${leftX + answerContentInset}" y="${currentY}" width="${textWidth - answerContentInset}" height="${aHeight}" rx="4" ry="4"/></clipPath>`);
    parts.push(`<g clip-path="url(#gtfAnswerClip)">`);
    let textY = currentY + 8;
    for (let i = 0; i < aLines.length; i++) {
      let currentX = leftX + answerContentInset;
      const line = aLines[i] || { segments: [], height: 26 };
      const lineHeight = Math.max(12, Number(line.height || 26));
      const lineSegments = Array.isArray(line.segments) ? line.segments : [];
      const singleDisplayFormula =
        lineSegments.length === 1 &&
        lineSegments[0]?.isFormula &&
        lineSegments[0]?.displayMode;
      if (singleDisplayFormula) {
        currentX = leftX + answerContentInset + Math.max(0, Math.round((textWidth - answerContentInset - (lineSegments[0].drawWidth || lineSegments[0].width || 0)) / 2));
      }
      for (const seg of lineSegments) {
        if (seg.isFormula) {
          const drawWidth = Math.max(10, Math.ceil(seg.drawWidth || seg.width || seg.asset?.width || 0));
          const drawHeight = Math.max(14, Math.ceil(seg.drawHeight || seg.asset?.height || 0));
          const topPadding = Math.max(0, Number(seg.topPadding || 0));
          const bottomPadding = Math.max(0, Number(seg.bottomPadding || 0));
          const baselineShift = Number(seg.baselineShift || 0);
          const availableHeight = Math.max(drawHeight, lineHeight - topPadding - bottomPadding);
          const drawY = textY + topPadding + Math.max(0, Math.round((availableHeight - drawHeight) / 2)) + baselineShift;
          const fallbackHref =
            seg.asset?.dataUrl ||
            (seg.asset?.svgMarkup ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(seg.asset.svgMarkup)}` : "");
          if (fallbackHref) {
            parts.push(`<image x="${currentX}" y="${drawY}" width="${drawWidth}" height="${drawHeight}" preserveAspectRatio="xMinYMin meet" href="${escapeSvgText(fallbackHref)}"/>`);
            currentX += drawWidth;
            continue;
          }
          const mathMlMarkup = String(seg.mathMlMarkup || "").trim() || (seg.tex ? await renderTexToMathMlMarkup(seg.tex, Boolean(seg.displayMode)) : "");
          if (mathMlMarkup) {
            parts.push(`<foreignObject x="${currentX}" y="${drawY}" width="${drawWidth}" height="${drawHeight}">
              <div xmlns="http://www.w3.org/1999/xhtml" class="gtf-share-math">${mathMlMarkup}</div>
            </foreignObject>`);
            currentX += drawWidth;
            continue;
          }
        }
        const isBold = seg.isBold ? "700" : "400";
        const isFormula = seg.isFormula;
        const size = isFormula ? 17 : 16;
        const family = isFormula
          ? "'Cambria Math','STIX Two Math','Times New Roman',serif"
          : "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
        const style = isFormula ? "italic" : "normal";
        parts.push(`<text x="${currentX}" y="${textY}" dominant-baseline="text-before-edge" font-size="${size}" font-style="${style}" font-weight="${isBold}" font-family="${family}" fill="#5f6368">${escapeSvgText(seg.text || "")}</text>`);
        mCtx.font = isFormula
          ? "italic 17px 'Cambria Math', 'STIX Two Math', 'Times New Roman', serif"
          : (seg.isBold ? fontBodyBold : fontBody);
        currentX += Number(seg.width || 0) || mCtx.measureText(seg.text || "").width;
      }
      textY += lineHeight;
    }
    parts.push(`</g>`);
    currentY += aHeight + 32;
  }

  currentY += 20;
  parts.push(`<line x1="${leftX}" y1="${currentY}" x2="${padding + innerWidth - innerPadding}" y2="${currentY}" stroke="#f1f3f4" stroke-width="1.5"/>`);
  currentY += 20;
  const footerText = ct("timeline_share_card_footer");
  mCtx.font = "500 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const footerW = mCtx.measureText(footerText).width;
  parts.push(`<text x="${padding + innerWidth / 2 - footerW / 2}" y="${currentY}" dominant-baseline="text-before-edge" font-size="13" font-weight="500" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" fill="#9aa0a6">${escapeSvgText(footerText)}</text>`);
  parts.push(`</svg>`);
  return parts.join("");
}

function buildTimelineShareFileName(turn, sourceData = {}, extension = "png") {
  // Use local timezone format (YYYY-MM-DD)
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  // Use the full conversation title or question as the base name
  let text = String(sourceData.question || turn?.title || "未命名对话");
  
  // Truncate to a reasonable length to avoid OS path length limits
  if (text.length > 30) {
    text = text.slice(0, 30);
  }
  
  // Replace invalid characters for Windows/Mac file systems with an underscore
  text = text.replace(/[<>:"/\\|?*\x00-\x1F\n\r\t]/g, "_");
  
  // Remove leading/trailing spaces and underscores
  text = text.replace(/^_+|_+$/g, '').trim();
  
  const safeExt = String(extension || "png").replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  return `${text}_${dateStr}.${safeExt}`;
}

async function downloadTimelineShareCard(turn, sourceData = {}) {
  const canvas = await buildTimelineShareCardCanvas(turn, sourceData);
  if (!canvas) return false;
  const blob = await canvasToBlob(canvas);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildTimelineShareFileName(turn, sourceData, "png");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

async function downloadTimelineShareCardSvg(turn, sourceData = {}) {
  const svgText = await buildTimelineShareCardSvg(turn, sourceData);
  if (!svgText) return false;
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildTimelineShareFileName(turn, sourceData, "svg");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

async function copyTimelineShareCard(turn, sourceData = {}) {
  try {
    const canvas = await buildTimelineShareCardCanvas(turn, sourceData);
    if (!canvas) return false;
    const blob = await canvasToBlob(canvas);
    if (!blob) return false;
    const item = new ClipboardItem({ "image/png": blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (error) {
    console.warn("Failed to copy image", error);
    return false;
  }
}

function formatTimelineShareCardNote(turn, sourceData = {}) {
  return "";
}

async function saveTimelineShareCardToMainNote(turn, sourceData = {}) {
  if (!turn || !isConcreteConversationId(currentConversationId)) return false;
  const block = formatTimelineShareCardNote(turn, sourceData);
  if (!block) return false;
  const baseNote = nativeMainNoteTextarea instanceof HTMLTextAreaElement
    ? nativeMainNoteTextarea.value
    : await loadMainConversationNoteFromStorage(currentConversationId);
  const baseLinks = nativeMainNoteLinks.length
    ? nativeMainNoteLinks.slice()
    : await loadMainConversationNoteLinksFromStorage(currentConversationId);
  const normalizedBase = normalizeMainConversationNote(baseNote);
  const prefix = normalizedBase ? `${normalizedBase}\n\n` : "";
  const next = `${prefix}${block}`;
  if (next.length > MAIN_CONVERSATION_NOTE_MAX_LENGTH) {
    return "limit";
  }
  const nextLinks = normalizeMainConversationNoteLinks(
    baseLinks
      .filter((item) => !(item?.turnId === turn.id && normalizeText(item?.question || "") === normalizeText(turn.question || "")))
      .concat({
        turnId: turn.id,
        blockText: block,
        question: getTimelineTurnDisplayTitle(turn),
        updatedAt: Date.now()
      })
  );
  const insertedStart = prefix.length;
  const insertedEnd = insertedStart + block.length;
  const saved = await persistMainConversationNote(next, { mainNoteLinks: nextLinks });
  if (saved && nativeMainNoteTextarea instanceof HTMLTextAreaElement) {
    nativeMainNoteTextarea.value = next;
    nativeMainNoteDirty = false;
    nativeMainNoteLastSavedText = next;
    nativeMainNoteLinks = nextLinks;
    refreshNativeMainConversationNoteCounter();
    updateNativeMainConversationNoteJumpState();
    focusNativeMainConversationNoteFromShare(insertedStart, insertedEnd);
  }
  return saved;
}

async function handleInlineAnnotationShareAction(container, turnId, action, shareScope = null) {
  if (!(container instanceof HTMLElement) || !turnId) return false;
  const turn = getTimelineTurnById(turnId);
  if (!turn) {
    setInlineAnnotationStatusByKey(container, "error", "timeline_menu_status_image_error");
    return false;
  }

  const shareButtons = shareScope instanceof HTMLElement
    ? [...shareScope.querySelectorAll(".gtf-inline-annotation-share-btn, .gtf-inline-annotation-share-more-btn, [data-inline-share-action]")]
      .filter((node) => node instanceof HTMLButtonElement)
    : [];
  shareButtons.forEach((btn) => {
    btn.disabled = true;
  });
  container.classList.remove("is-share-note-success");
  setInlineAnnotationStatusByKey(container, "saving", "timeline_menu_status_rendering");

  try {
    const sourceData = await loadTimelineShareSourceData(turn);
    if (action === "download") {
      const ok = await downloadTimelineShareCard(turn, sourceData);
      setInlineAnnotationStatusByKey(container, ok ? "saved" : "error", ok ? "timeline_menu_status_downloaded" : "timeline_menu_status_image_error");
      return ok;
    }
    if (action === "download-svg") {
      const ok = await downloadTimelineShareCardSvg(turn, sourceData);
      setInlineAnnotationStatusByKey(container, ok ? "saved" : "error", ok ? "timeline_menu_status_downloaded_svg" : "timeline_menu_status_image_error");
      return ok;
    }
    if (action === "copy") {
      const copied = await copyTimelineShareCard(turn, sourceData);
      if (copied === null) {
        setInlineAnnotationStatusByKey(container, "error", "timeline_menu_status_copy_unsupported");
        return null;
      }
      setInlineAnnotationStatusByKey(container, copied ? "saved" : "error", copied ? "timeline_menu_status_copied" : "timeline_menu_status_image_error");
      return copied;
    }
    if (action === "note") {
      const saved = await saveTimelineShareCardToMainNote(turn, sourceData);
      if (saved === "limit") {
        setInlineAnnotationStatusByKey(container, "error", "timeline_menu_status_note_limit");
        return "limit";
      }
      if (saved) {
        container.classList.add("is-share-note-success");
        setTimeout(() => {
          if (container instanceof HTMLElement && container.isConnected) {
            container.classList.remove("is-share-note-success");
          }
        }, 2200);
      }
      setInlineAnnotationStatusByKey(container, saved ? "saved" : "error", saved ? "timeline_menu_status_saved_note" : "timeline_menu_status_note_error");
      return saved;
    }
    setInlineAnnotationStatusByKey(container, "error", "timeline_menu_status_image_error");
    return false;
  } catch (error) {
    console.warn("[Gemini Timeline] inline share action failed", error);
    const isNoteAction = action === "note";
    setInlineAnnotationStatusByKey(container, "error", isNoteAction ? "timeline_menu_status_note_error" : "timeline_menu_status_image_error");
    return false;
  } finally {
    shareButtons.forEach((btn) => {
      btn.disabled = false;
    });
  }
}

function bindInlineShareGroup(container, shareGroup, turnId) {
  if (!(container instanceof HTMLElement) || !(shareGroup instanceof HTMLElement) || !turnId) return;
  ensureInlineAnnotationShareMenuDismiss();
  shareGroup.dataset.turnId = turnId;
  const shareBtn = shareGroup.querySelector(".gtf-inline-annotation-share-btn");
  const menu = shareGroup.querySelector(".gtf-inline-annotation-share-menu");
  
  if (shareBtn instanceof HTMLButtonElement) {
    if (!shareBtn.dataset.boundShareToggle) {
      shareBtn.dataset.boundShareToggle = "1";
      shareBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextOpen = !shareGroup.classList.contains("is-open");
        closeInlineAnnotationShareMenus(nextOpen ? shareGroup : null);
        setInlineAnnotationShareMenuOpen(shareGroup, nextOpen);
      });
    }
  }
  
  if (menu instanceof HTMLElement) {
    if (!menu.dataset.boundShareMenu) {
      menu.dataset.boundShareMenu = "1";
      menu.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const actionBtn = target.closest("[data-inline-share-action]");
        if (!(actionBtn instanceof HTMLButtonElement)) return;
        event.preventDefault();
        event.stopPropagation();
        setInlineAnnotationShareMenuOpen(shareGroup, false);
        await handleInlineAnnotationShareAction(
          container,
          String(shareGroup.dataset.turnId || "").trim(),
          String(actionBtn.dataset.inlineShareAction || ""),
          shareGroup
        );
      });
    }
  }
  
  if (!shareGroup.dataset.boundShareEscape) {
    shareGroup.dataset.boundShareEscape = "1";
    shareGroup.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setInlineAnnotationShareMenuOpen(shareGroup, false);
      }
    });
  }
}

function getNativeResponseActionText(node) {
  if (!(node instanceof Element)) return "";
  return normalizeText(
    `${node.getAttribute("aria-label") || ""} ${node.getAttribute("title") || ""} ${node.textContent || ""}`
  ).toLowerCase();
}

function findNativeResponseActionRow(responseNode) {
  if (!(responseNode instanceof Element)) return null;
  const roots = [
    responseNode,
    responseNode.nextElementSibling,
    responseNode.parentElement,
    responseNode.parentElement?.nextElementSibling
  ].filter((node, index, arr) => node instanceof Element && arr.indexOf(node) === index);
  const candidates = [];
  roots.forEach((root, rootIndex) => {
    if (!(root instanceof Element)) return;
    root.querySelectorAll("[role='toolbar'], footer, [class*='toolbar'], [class*='action'], [class*='footer'], [class*='button']").forEach((node) => {
      if (!(node instanceof HTMLElement) || !isVisible(node)) return;
      if (node.closest(".gtf-turn-share-bar, .gtf-inline-annotation-wrapper, .gtf-interleaved-container")) return;
      const buttons = Array.from(node.querySelectorAll("button, [role='button']")).filter((btn) => btn instanceof HTMLElement && isVisible(btn));
      if (!buttons.length) return;
      let score = 30 - rootIndex * 8;
      if (node.getAttribute("role") === "toolbar") score += 18;
      if (buttons.length >= 2) score += Math.min(18, buttons.length * 4);
      buttons.forEach((btn) => {
        const text = getNativeResponseActionText(btn);
        if (/(copy|复制|like|good|bad|dislike|thumb|share|more|menu|朗读|speak|voice|重试|regenerate|编辑|edit)/i.test(text)) {
          score += 8;
        }
      });
      if (root === responseNode.parentElement || root === responseNode.nextElementSibling) score += 6;
      candidates.push({ node, score });
    });
  });
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.node || null;
}

function ensureTurnShareBar(responseNode, turnId) {
  return null; // Turn share bar is deprecated
}

async function handleNativeTimelineShareAction(action) {
  const turnId = nativeTimelineBookmarkMenuTurnId;
  if (!turnId) return;
  const turn = getTimelineTurnById(turnId);
  if (!turn) return;

  setNativeTimelineBookmarkMenuStatusByKey("timeline_menu_status_rendering");
  
  try {
    const sourceData = await loadTimelineShareSourceData(turn);
    if (!sourceData) {
      setNativeTimelineBookmarkMenuStatusByKey("timeline_menu_status_image_error", true);
      return;
    }

    if (action === "download") {
      const ok = await downloadTimelineShareCard(turn, sourceData);
      if (ok) {
        setNativeTimelineBookmarkMenuStatusByKey("timeline_menu_status_downloaded");
      } else {
        setNativeTimelineBookmarkMenuStatusByKey("timeline_menu_status_image_error", true);
      }
    } else if (action === "download-svg") {
      const ok = await downloadTimelineShareCardSvg(turn, sourceData);
      if (ok) {
        setNativeTimelineBookmarkMenuStatusByKey("timeline_menu_status_downloaded_svg");
      } else {
        setNativeTimelineBookmarkMenuStatusByKey("timeline_menu_status_image_error", true);
      }
    } else if (action === "copy") {
      const ok = await copyTimelineShareCard(turn, sourceData);
      if (ok) {
        setNativeTimelineBookmarkMenuStatusByKey("timeline_menu_status_copied");
      } else {
        setNativeTimelineBookmarkMenuStatusByKey("timeline_menu_status_image_error", true);
      }
    }
  } catch (error) {
    console.error("[Gemini Timeline] Share action error", error);
    setNativeTimelineBookmarkMenuStatusByKey("timeline_menu_status_image_error", true);
  }
}

function buildNotebookLmStudyPack(conversationId, session) {
  const entries = Array.isArray(session?.entries) ? session.entries : [];
  const recent = entries.slice(-8);
  const defaultTitle = currentLocale === "en" ? "Gemini Study Notes" : "Gemini 学习记录";
  const titleRaw = normalizeText(session?.customTitle || document.title || defaultTitle);
  const title = titleRaw.replace(/\s*-\s*Google Gemini\s*$/i, "").slice(0, 80) || defaultTitle;
  const noteCount = entries.filter((entry) => normalizeText(entry?.studyNote || "") || entry?.studyNoteImage).length;

  const turns = recent.map((entry, idx) => {
    const nodeTitle = normalizeText(entry?.nodeTitle || "").slice(0, 80);
    const question = normalizeText(entry?.question || (currentLocale === "en" ? "(empty question)" : "(空问题)")).slice(0, 320);
    const answer = normalizeText(entry?.summary || entry?.answerMarkdown || (currentLocale === "en" ? "(empty answer)" : "(空回答)")).slice(0, 520);
    const note = normalizeText(entry?.studyNote || "").slice(0, 380);
    return [
      currentLocale === "en"
        ? `## Note ${idx + 1} · ${formatNativeTimestamp(entry?.timestamp)}`
        : `## 笔记 ${idx + 1} · ${formatNativeTimestamp(entry?.timestamp)}`,
      nodeTitle ? (currentLocale === "en" ? `Section: ${nodeTitle}` : `节点标题：${nodeTitle}`) : "",
      currentLocale === "en" ? `Question: ${question}` : `问题：${question}`,
      currentLocale === "en" ? `Answer Summary: ${answer}` : `回答摘要：${answer}`,
      note ? (currentLocale === "en" ? `Study Note: ${note}` : `学习笔记：${note}`) : ""
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    `# ${title}`,
    "",
    currentLocale === "en" ? `Source Conversation: ${conversationId || "(unknown)"}` : `源对话：${conversationId || "(未知)"}`,
    currentLocale === "en" ? `Exported At: ${formatNativeTimestamp(Date.now())}` : `导出时间：${formatNativeTimestamp(Date.now())}`,
    currentLocale === "en"
      ? `Total Notes: ${entries.length}, Notes With Annotations: ${noteCount}`
      : `总笔记数：${entries.length}，有批注的笔记：${noteCount}`,
    "",
    currentLocale === "en" ? "## Suggested Use (Paste Into NotebookLM)" : "## 使用建议（粘贴到 NotebookLM）",
    currentLocale === "en" ? "- Ask NotebookLM to build a knowledge map from these notes." : "- 让 NotebookLM 基于笔记内容生成知识地图",
    currentLocale === "en" ? "- Then ask it to generate 5 self-test questions." : "- 再要求它生成 5 道可自测练习题",
    currentLocale === "en" ? "- Finally, review the mistakes and explain them again to close the loop." : "- 最后按错题重讲，形成闭环复习",
    "",
    currentLocale === "en" ? "## Study Q&A Notes" : "## 学习问答笔记",
    turns.length ? turns.join("\n\n") : (currentLocale === "en" ? "(No usable notes collected yet)" : "(当前未采集到可用笔记)")
  ].join("\n");
}

function buildNativeLearningPrompt(mode, conversationId, session) {
  const entries = Array.isArray(session?.entries) ? session.entries : [];
  const recent = entries.slice(-6);
  const defaultTitle = currentLocale === "en" ? "Current Study Conversation" : "当前学习对话";
  const titleRaw = normalizeText(session?.customTitle || document.title || defaultTitle);
  const title = titleRaw.replace(/\s*-\s*Google Gemini\s*$/i, "").slice(0, 80) || defaultTitle;

  const context = recent
    .map((entry, idx) => {
      const question = normalizeText(entry?.question || "").slice(0, 220);
      const answer = normalizeText(entry?.summary || entry?.answerMarkdown || "").slice(0, 320);
      const note = normalizeText(entry?.studyNote || "").slice(0, 160);
      return [
        currentLocale === "en" ? `Note ${idx + 1}` : `笔记${idx + 1}`,
        question ? (currentLocale === "en" ? `Question: ${question}` : `问题：${question}`) : "",
        answer ? (currentLocale === "en" ? `Answer Summary: ${answer}` : `回答摘要：${answer}`) : "",
        note ? (currentLocale === "en" ? `Study Note: ${note}` : `笔记：${note}`) : ""
      ]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  const base = [
    currentLocale === "en" ? `Conversation Title: ${title}` : `对话标题：${title}`,
    currentLocale === "en" ? `Conversation ID: ${conversationId || "(unknown)"}` : `对话ID：${conversationId || "(未知)"}`,
    currentLocale === "en" ? `Total Notes: ${entries.length}` : `笔记总数：${entries.length}`,
    "",
    currentLocale === "en" ? "[Study Context]" : "[学习上下文]",
    context || (currentLocale === "en" ? "(No usable notes yet)" : "(暂无可用笔记)")
  ];

  if (mode === "quiz") {
    return [
      currentLocale === "en"
        ? "You are a learning coach. Generate self-test questions using only the study context below."
        : "你是一名学习教练。请仅基于下面的学习上下文生成自测题。",
      currentLocale === "en" ? "Requirements:" : "要求：",
      currentLocale === "en" ? "1) Create 5 questions from easy to hard." : "1) 生成 5 道由浅入深的题目；",
      currentLocale === "en" ? "2) Give a standard answer and a short explanation for each one." : "2) 每题给出标准答案与简短解析；",
      currentLocale === "en" ? "3) End with one next-step study suggestion." : "3) 最后给出一条下一步学习建议。",
      "",
      ...base
    ].join("\n");
  }

  return [
    currentLocale === "en"
      ? "You are a study assistant. Output structured review material using only the study context below."
      : "你是一名学习助手。请仅基于下面的学习上下文输出结构化复习材料。",
    currentLocale === "en" ? "Requirements:" : "要求：",
    currentLocale === "en" ? "1) Start with a clear core knowledge framework." : "1) 先给出核心知识框架（条理清晰）；",
    currentLocale === "en" ? "2) Provide a 24-hour, 3-day, and 7-day review plan." : "2) 给出 24 小时、3 天、7 天复习计划；",
    currentLocale === "en" ? "3) Add a mistake review checklist and memory cues." : "3) 额外提供错题复盘清单与记忆提示。",
    "",
    ...base
  ].join("\n");
}

function makeNativeFolderSectionStyle() {
  let style = document.getElementById("gtf-native-folder-panel-style");
  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement("style");
    style.id = "gtf-native-folder-panel-style";
    document.documentElement.appendChild(style);
  }
  style.textContent = `
    #gtf-native-folder-shell {
      position: relative !important;
      display: block !important;
      width: 100%;
      max-width: 100%;
      margin: 6px 0 10px;
      padding: 0;
      z-index: 1;
      isolation: isolate;
      touch-action: pan-y;
      transform: none !important;
    }
    #gtf-native-folder-shell[hidden] {
      display: none !important;
    }
    #gtf-native-folder-panel,
    #gtf-native-folder-panel * {
      box-sizing: border-box;
      font-family: "Google Sans", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    #gtf-native-folder-panel {
      position: static !important;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 100%;
      margin: 4px 0 8px;
      padding: 4px 0 6px;
      min-height: 0;
      max-height: none;
      overflow: visible;
    }
    #gtf-native-folder-panel .gtf-native-folder-body {
      padding-right: 2px;
      overflow: visible;
      flex: 1;
      min-height: 0;
    }
    #gtf-native-folder-panel .gtf-native-title {
      margin: 0;
      font-size: 14px;
      line-height: 1.2;
      font-weight: 600;
      color: #1f2937;
      padding: 6px 10px 7px;
      letter-spacing: 0.01em;
    }
    #gtf-native-folder-panel .gtf-native-title-inner {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    #gtf-native-folder-panel .gtf-native-title-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #gtf-native-folder-panel .gtf-native-title-icon {
      color: #6b7280;
      line-height: 1;
      flex: 0 0 auto;
    }
    #gtf-native-folder-panel .gtf-native-icon {
      display: inline-flex;
      width: 16px;
      height: 16px;
      align-items: center;
      justify-content: center;
      color: currentColor;
      opacity: 0.92;
      vertical-align: middle;
      pointer-events: none;
    }
    #gtf-native-folder-panel .gtf-native-icon svg {
      width: 16px;
      height: 16px;
      display: block;
      fill: currentColor;
    }
    #gtf-native-folder-panel .gtf-native-title-btn {
      width: calc(100% - 10px);
      margin: 0 5px 5px;
      text-align: left;
      border: 1px solid transparent;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    #gtf-native-folder-panel .gtf-native-title-btn:hover {
      background: #f3f4f6;
    }
    #gtf-native-folder-panel .gtf-native-title-btn:focus-visible {
      outline: 2px solid rgba(59, 130, 246, 0.5);
      outline-offset: 1px;
    }
    #gtf-native-folder-panel .gtf-native-title-static {
      width: calc(100% - 10px);
      margin: 0 5px 8px;
      text-align: left;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 12px;
      padding: 9px 10px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    #gtf-native-folder-panel .gtf-native-actions {
      margin: 0 5px 8px;
      display: grid;
      gap: 8px;
      padding: 10px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    }
    #gtf-native-folder-panel .gtf-native-folder-body[hidden] {
      display: none !important;
    }
    #gtf-native-folder-panel .gtf-native-folder-body {
      padding-right: 2px;
      overflow: visible;
      min-height: 0;
    }
    #gtf-native-folder-panel .gtf-native-quick-actions {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 6px;
    }
    #gtf-native-folder-panel .gtf-native-quick-btn {
      width: 100%;
      min-height: 32px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #ffffff;
      color: #374151;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background 0.15s ease, border-color 0.15s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    #gtf-native-folder-panel .gtf-native-quick-btn:hover {
      border-color: #d1d5db;
      background: #f9fafb;
    }
    #gtf-native-folder-panel .gtf-native-quick-btn:focus-visible {
      outline: 2px solid rgba(59, 130, 246, 0.5);
      outline-offset: 1px;
    }
    #gtf-native-folder-panel .gtf-native-quick-btn.active {
      border-color: #3b82f6;
      background: #eff6ff;
      color: #1d4ed8;
    }
    #gtf-native-folder-panel .gtf-native-study-metrics {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
      min-height: 20px;
    }
    #gtf-native-folder-panel .gtf-native-metric-chip {
      display: inline-flex;
      align-items: center;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      background: #f9fafb;
      color: #4b5563;
      padding: 2px 8px;
      font-size: 11px;
      line-height: 1.25;
      white-space: nowrap;
    }
    #gtf-native-folder-panel .gtf-native-create-inline {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        "input input"
        "select btn";
      gap: 7px;
      align-items: center;
      padding-top: 2px;
    }
    #gtf-native-folder-panel .gtf-native-create-inline[hidden] {
      display: none !important;
    }
    #gtf-native-folder-panel .gtf-native-create-inline .gtf-native-inline-input {
      grid-area: input;
    }
    #gtf-native-folder-panel .gtf-native-create-inline .gtf-native-inline-select {
      grid-area: select;
    }
    #gtf-native-folder-panel .gtf-native-create-inline .gtf-native-action-btn {
      grid-area: btn;
      min-width: 74px;
      justify-self: end;
    }
    #gtf-native-folder-panel .gtf-native-inline-input,
    #gtf-native-folder-panel .gtf-native-inline-select {
      min-height: 33px;
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #1f2937;
      border-radius: 8px;
      padding: 0 10px;
      font-size: 12px;
      line-height: 1.2;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    #gtf-native-folder-panel .gtf-native-inline-input:focus,
    #gtf-native-folder-panel .gtf-native-inline-select:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
    }
    #gtf-native-folder-panel .gtf-native-action-btn {
      border: none;
      background: #2563eb;
      color: #ffffff;
      border-radius: 8px;
      padding: 0 12px;
      min-height: 33px;
      font-size: 12px;
      line-height: 1.3;
      cursor: pointer;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.15);
      transition: background 0.15s ease;
    }
    #gtf-native-folder-panel .gtf-native-action-btn:hover {
      background: #1d4ed8;
    }
    #gtf-native-folder-panel .gtf-native-inline-status {
      margin: 0;
      padding: 0 2px;
      min-height: 15px;
      font-size: 11px;
      line-height: 1.3;
      color: #6b7280;
    }
    #gtf-native-folder-panel .gtf-native-inline-status[data-error="1"] {
      color: #dc2626;
    }
    #gtf-native-folder-panel .gtf-native-folder {
      margin: 0 4px 8px;
      border-radius: 10px;
      padding: 2px 0;
      border: 1px solid transparent;
      background: transparent;
      transition: background 0.15s ease;
    }
    #gtf-native-folder-panel .gtf-native-folder.drag-over {
      border-color: #93c5fd;
      background: #eff6ff;
    }
    #gtf-native-folder-panel .gtf-native-folder-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 8px;
      cursor: move;
      color: #374151;
      font-size: 13px;
      font-weight: 500;
      transition: background 0.15s ease;
    }
    #gtf-native-folder-panel .gtf-native-folder-head:hover {
      background: #f3f4f6;
    }
    #gtf-native-folder-panel .gtf-native-folder-head-left {
      min-width: 0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
      flex: 1;
      pointer-events: none;
    }
    #gtf-native-folder-panel .gtf-native-folder-toggle {
      border: none;
      background: transparent;
      color: #6b7280;
      padding: 0;
      width: 16px;
      height: 16px;
      line-height: 1;
      border-radius: 4px;
      cursor: pointer;
      flex: 0 0 auto;
      pointer-events: auto;
    }
    #gtf-native-folder-panel .gtf-native-folder-toggle:hover {
      background: #e5e7eb;
      color: #1f2937;
    }
    #gtf-native-folder-panel .gtf-native-folder-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: text;
      border-radius: 4px;
      padding: 1px 4px;
      margin-left: -2px;
      transition: background 0.15s ease;
      pointer-events: auto;
    }
    #gtf-native-folder-panel .gtf-native-folder-name:hover {
      background: #e5e7eb;
    }
    #gtf-native-folder-panel .gtf-native-folder-icon {
      color: #6b7280;
      line-height: 1;
      flex: 0 0 auto;
    }
    #gtf-native-folder-panel .gtf-native-folder-head.fixed {
      cursor: default;
    }
    #gtf-native-folder-panel .gtf-native-folder-count {
      font-size: 11px;
      color: #6b7280;
      font-weight: 400;
      white-space: nowrap;
      flex: 0 0 auto;
      padding: 2px 6px;
      border-radius: 12px;
      background: #f3f4f6;
      pointer-events: none;
    }
    #gtf-native-folder-panel .gtf-native-folder-rename-input {
      width: 100%;
      min-height: 24px;
      border: 1px solid #3b82f6;
      background: #ffffff;
      color: #1f2937;
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 12px;
      line-height: 1.2;
      outline: none;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
    }
    #gtf-native-folder-panel .gtf-native-folder-rename-input:focus {
      border-color: #2563eb;
    }
    #gtf-native-folder-panel .gtf-native-conversation-list {
      list-style: none;
      margin: 0;
      padding: 2px 4px 4px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: none;
      overflow: visible;
      overscroll-behavior: auto;
      scrollbar-gutter: stable;
    }
    #gtf-native-folder-panel .gtf-native-conversation-item {
      margin: 0;
      padding: 0;
    }
    #gtf-native-folder-panel .gtf-native-conversation-btn {
      width: 100%;
      text-align: left;
      border: 1px solid transparent;
      background: transparent;
      border-radius: 6px;
      padding: 6px 10px;
      color: #4b5563;
      font-size: 12px;
      line-height: 1.35;
      cursor: pointer;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      letter-spacing: 0.005em;
      transition: background 0.15s ease, color 0.15s ease;
    }
    #gtf-native-folder-panel .gtf-native-conversation-btn:hover {
      background: #f3f4f6;
      color: #111827;
    }
    #gtf-native-folder-panel .gtf-native-conversation-btn.active {
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 500;
    }
    #gtf-native-folder-panel .gtf-native-conversation-btn::before {
      content: "";
      margin-right: 0;
    }
    #gtf-native-folder-panel .gtf-native-empty {
      margin: 0;
      padding: 4px 12px 8px 24px;
      font-size: 11px;
      color: #9ca3af;
    }
    @media (max-width: 420px) {
      #gtf-native-folder-panel .gtf-native-quick-actions {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
    #gtf-native-folder-context-menu {
      position: fixed;
      z-index: 2147483646;
      min-width: 180px;
      max-width: 260px;
      padding: 6px;
      border-radius: 12px;
      border: 1px solid #d8e0ec;
      background: #ffffff;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
      display: none;
    }
    #gtf-native-folder-context-menu.open {
      display: block;
    }
    #gtf-native-folder-context-menu .gtf-menu-title {
      margin: 2px 8px 6px;
      font-size: 12px;
      color: #6b7a92;
      line-height: 1.35;
    }
    #gtf-native-folder-context-menu .gtf-menu-item {
      width: 100%;
      border: none;
      background: transparent;
      border-radius: 8px;
      padding: 8px 10px;
      text-align: left;
      color: #24344f;
      font-size: 13px;
      cursor: pointer;
      line-height: 1.35;
    }
    #gtf-native-folder-context-menu .gtf-menu-item:hover {
      background: #edf4ff;
      color: #114ca9;
    }
    #gtf-native-folder-context-menu .gtf-menu-item.current {
      color: #7b8798;
      cursor: default;
      background: #f7f9fc;
    }
  `;
  document.documentElement.appendChild(style);
}

function hideNativeFolderContextMenu() {
  if (!nativeFolderContextMenuEl) return;
  nativeFolderContextMenuEl.classList.remove("open");
}

function ensureNativeFolderContextMenu() {
  if (nativeFolderContextMenuEl && nativeFolderContextMenuEl.isConnected) return nativeFolderContextMenuEl;

  const menu = document.createElement("div");
  menu.id = "gtf-native-folder-context-menu";
  menu.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  document.documentElement.appendChild(menu);
  nativeFolderContextMenuEl = menu;

  document.addEventListener("click", hideNativeFolderContextMenu, true);
  document.addEventListener("scroll", hideNativeFolderContextMenu, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideNativeFolderContextMenu();
  });

  return menu;
}

function getNativeFolderIconSvg(kind) {
  if (kind === "open") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4l2 2h8a2 2 0 0 1 2 2v1H2V6a2 2 0 0 1 2-2h6zm12 7H2l2.1 8.4A2 2 0 0 0 6.03 21h11.94a2 2 0 0 0 1.94-1.6L22 11z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4l2 2h8a2 2 0 0 1 2 2v1H2V6a2 2 0 0 1 2-2h6zm12 7v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8h20z"/></svg>';
}

function getFolderNameForNative(folderId) {
  if (folderId === HOME_DEFAULT_FOLDER_ID) return "\u672A\u5206\u7C7B";
  return nativeFolderPanelState.folders.find((item) => item.id === folderId)?.name || "\u672A\u5206\u7C7B";
}

function getConversationFolderIdForNative(conversationId) {
  const folderId = nativeFolderPanelState.conversationFolderMap[conversationId];
  const validIds = new Set(nativeFolderPanelState.folders.map((item) => item.id));
  return validIds.has(folderId) ? folderId : HOME_DEFAULT_FOLDER_ID;
}

function showNativeFolderContextMenu(event, conversationItem) {
  if (!conversationItem?.conversationId) return;
  const menu = ensureNativeFolderContextMenu();
  const currentFolderId = getConversationFolderIdForNative(conversationItem.conversationId);
  menu.innerHTML = "";

  const title = document.createElement("p");
  title.className = "gtf-menu-title";
  title.textContent = currentLocale === "en"
    ? `Move "${(conversationItem.title || "Conversation").slice(0, 24)}" to`
    : `把“${(conversationItem.title || "对话").slice(0, 24)}”移动到`;
  menu.appendChild(title);

  nativeFolderPanelState.folders.forEach((folder) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gtf-menu-item";
    const folderName = getFolderNameForNative(folder.id);
    btn.textContent = folderName;
    if (folder.id === currentFolderId) {
      btn.classList.add("current");
      btn.textContent = currentLocale === "en" ? `${folderName} (Current)` : `${folderName}（当前）`;
      btn.disabled = true;
    } else {
      btn.addEventListener("click", async () => {
        const nextMap = { ...nativeFolderPanelState.conversationFolderMap, [conversationItem.conversationId]: folder.id };
        await persistNativeHomeState({ conversationFolderMap: nextMap });
        hideNativeFolderContextMenu();
        scheduleNativeFolderPanelRender();
      });
    }
    menu.appendChild(btn);
  });

  const viewportW = window.innerWidth || document.documentElement.clientWidth || 1200;
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 800;
  const x = event.clientX || 0;
  const y = event.clientY || 0;
  const maxX = viewportW - 280;
  const maxY = viewportH - 280;
  menu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;
  menu.classList.add("open");
}

function makeNativeChatTimelineStyle() {
  let style = document.getElementById("gtf-native-chat-timeline-style");
  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement("style");
    style.id = "gtf-native-chat-timeline-style";
    document.documentElement.appendChild(style);
  }
  style.textContent = `
    #gtf-native-chat-timeline,
    #gtf-native-chat-timeline * {
      box-sizing: border-box;
      font-family: "Google Sans", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    #gtf-native-chat-timeline {
      position: fixed;
      right: 14px;
      top: 112px;
      bottom: 144px;
      width: 58px;
      z-index: 2147483000;
      border: 1px solid rgba(85, 118, 106, 0.26);
      border-radius: 14px;
      background: rgba(250, 254, 252, 0.98);
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 6px;
      box-shadow: 0 2px 10px rgba(26, 62, 51, 0.1);
    }
    #gtf-native-chat-timeline[hidden] {
      display: none !important;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-head {
      margin: 0;
      text-align: center;
      color: #4f6d63;
      user-select: none;
      border-radius: 8px;
      transition: all 0.2s;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-head:hover {
      background: rgba(96, 132, 120, 0.1) !important;
      color: #1f322d;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-filter-bar {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px;
      width: 100%;
      margin: 2px 0 4px;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-filter-btn {
      border: 1px solid rgba(97, 130, 118, 0.18);
      background: rgba(255, 255, 255, 0.92);
      color: #55766a;
      border-radius: 8px;
      font-size: 11px;
      line-height: 1;
      min-height: 22px;
      cursor: pointer;
      padding: 3px 0;
      transition: all 0.16s ease;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-filter-btn:hover {
      border-color: rgba(76, 123, 106, 0.4);
      background: rgba(236, 246, 241, 0.96);
      color: #244339;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-filter-btn.active {
      border-color: rgba(62, 124, 103, 0.74);
      background: rgba(215, 239, 230, 0.98);
      color: #1f4438;
      box-shadow: 0 0 0 1px rgba(87, 158, 133, 0.12);
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-list {
      margin: 0;
      padding: 2px 0;
      list-style: none;
      overflow: auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      scrollbar-width: none;
      overscroll-behavior: contain;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-list::-webkit-scrollbar {
      width: 0;
      height: 0;
      display: none;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-item {
      margin: 0;
      padding: 0;
      width: 100%;
      display: flex;
      justify-content: center;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-item.followup-topic,
    #gtf-native-chat-timeline .gtf-native-chat-timeline-item.followup-bridge {
      position: relative;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-item.followup-topic::before,
    #gtf-native-chat-timeline .gtf-native-chat-timeline-item.followup-bridge::before {
      content: "";
      position: absolute;
      left: 50%;
      top: -10px;
      bottom: -10px;
      width: 2px;
      transform: translateX(-50%);
      background: linear-gradient(180deg, var(--gtf-followup-line-soft, rgba(35, 106, 163, 0.08)), var(--gtf-followup-line, rgba(35, 106, 163, 0.46)), var(--gtf-followup-line-soft, rgba(35, 106, 163, 0.08)));
      border-radius: 999px;
      pointer-events: none;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      border: 1px solid rgba(96, 132, 120, 0.4);
      background: rgba(255, 255, 255, 0.96);
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot:hover {
      border-color: rgba(69, 122, 104, 0.72);
      background: rgba(231, 246, 239, 0.98);
      transform: scale(1.03);
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.active {
      border-color: rgba(62, 124, 103, 0.96);
      background: rgba(211, 237, 227, 0.98);
      box-shadow: 0 0 0 2px rgba(87, 158, 133, 0.2);
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.followup-topic {
      border-color: var(--gtf-followup-border, rgba(35, 106, 163, 0.86));
      background: var(--gtf-followup-bg, rgba(229, 244, 255, 0.98));
      box-shadow: 0 0 0 3px var(--gtf-followup-halo, rgba(35, 106, 163, 0.16));
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.followup-topic::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -52%);
      width: auto;
      height: auto;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      color: var(--gtf-followup-text, #174d74);
      font-size: 9px;
      font-weight: 900;
      line-height: 1;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.followup-topic.followup-main::before {
      content: "\\4e3b";
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.followup-topic.followup-sub::before {
      content: "\\5206";
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.followup-bridge {
      border-color: var(--gtf-followup-line, rgba(35, 106, 163, 0.28));
      background: var(--gtf-followup-bg, rgba(229, 244, 255, 0.45));
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.highlighted {
      border-color: rgba(245, 158, 11, 0.95);
      background: rgba(255, 243, 205, 0.98);
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.18);
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.highlighted.active {
      background: rgba(255, 233, 166, 0.98);
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.bookmarked.bookmark-mistake {
      border-color: rgba(220, 38, 38, 0.78);
      background: rgba(254, 226, 226, 0.98);
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.14);
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.bookmarked.bookmark-mistake::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 6px;
      height: 6px;
      transform: translate(-50%, -50%) rotate(45deg);
      background: #b91c1c;
      border-radius: 1px;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.bookmarked.bookmark-review {
      border-color: rgba(37, 99, 235, 0.72);
      background: rgba(219, 234, 254, 0.98);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.12);
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.bookmarked.bookmark-review::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 6px;
      height: 6px;
      border-radius: 999px;
      border: 2px solid #1d4ed8;
      border-top-color: transparent;
      transform: translate(-50%, -50%);
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.bookmarked.bookmark-mastered {
      border-color: rgba(22, 163, 74, 0.76);
      background: rgba(220, 252, 231, 0.98);
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.12);
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.bookmarked.bookmark-mastered::after {
      content: "✓";
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -58%);
      color: #166534;
      font-size: 8px;
      font-weight: 700;
      line-height: 1;
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.highlighted::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: #b45309;
      transform: translate(-50%, -50%);
    }
    #gtf-native-chat-timeline .gtf-native-chat-timeline-dot.has-note::before {
      content: "";
      position: absolute;
      right: -1px;
      top: -1px;
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: #2f7d67;
      box-shadow: 0 0 0 2px rgba(250, 254, 252, 0.96);
    }
    #gtf-native-timeline-bookmark-menu,
    #gtf-native-timeline-bookmark-menu * {
      box-sizing: border-box;
      font-family: "Google Sans", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    #gtf-native-timeline-bookmark-menu {
      position: fixed;
      z-index: 2147483600;
      width: 252px;
      padding: 10px;
      border-radius: 14px;
      border: 1px solid rgba(86, 119, 107, 0.22);
      background: rgba(252, 255, 253, 0.98);
      box-shadow: 0 12px 32px rgba(25, 55, 45, 0.18);
      color: #1f322d;
    }
    #gtf-native-timeline-bookmark-menu[hidden] {
      display: none !important;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-bookmark-title {
      font-size: 12px;
      line-height: 1.45;
      font-weight: 600;
      margin-bottom: 8px;
      color: #29463d;
      word-break: break-word;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-bookmark-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      margin-bottom: 8px;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-workbench-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      padding: 8px;
      margin-bottom: 8px;
      border: 1px solid rgba(92, 135, 121, 0.16);
      border-radius: 12px;
      background: rgba(239, 248, 244, 0.84);
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-workbench-actions button {
      min-height: 30px;
      border: 1px solid rgba(97, 130, 118, 0.18);
      background: rgba(255, 255, 255, 0.96);
      color: #245345;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.16s ease;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-workbench-actions button:hover {
      border-color: rgba(62, 124, 103, 0.62);
      background: #ffffff;
      color: #163c31;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-share-actions {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-share-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      height: 28px;
      border: none;
      background: transparent;
      color: #1a73e8;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.16s ease;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-share-btn:hover {
      background: rgba(26, 115, 232, 0.08);
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-share-btn svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-bookmark-type {
      border: 1px solid rgba(97, 130, 118, 0.18);
      background: rgba(255, 255, 255, 0.94);
      color: #45665b;
      border-radius: 10px;
      min-height: 32px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.16s ease;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-bookmark-type:hover,
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-bookmark-type.active {
      border-color: rgba(62, 124, 103, 0.74);
      background: rgba(216, 239, 229, 0.98);
      color: #1f4438;
    }
    #gtf-native-timeline-bookmark-menu textarea {
      width: 100%;
      min-height: 72px;
      resize: vertical;
      border-radius: 10px;
      border: 1px solid rgba(109, 140, 128, 0.22);
      background: rgba(255, 255, 255, 0.96);
      padding: 8px 9px;
      color: #1f322d;
      font-size: 12px;
      line-height: 1.45;
      outline: none;
      overscroll-behavior: none; /* Prevent scroll chaining to parent */
    }
    #gtf-native-timeline-bookmark-menu textarea:focus {
      border-color: rgba(62, 124, 103, 0.6);
      box-shadow: 0 0 0 2px rgba(87, 158, 133, 0.12);
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-bookmark-foot {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-bookmark-status {
      margin-top: 8px;
      font-size: 11px;
      line-height: 1.45;
      color: #587166;
      min-height: 16px;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-bookmark-status.error {
      color: #9c3131;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-bookmark-foot button {
      flex: 1;
      min-height: 30px;
      border-radius: 10px;
      border: 1px solid rgba(97, 130, 118, 0.18);
      background: rgba(255, 255, 255, 0.94);
      color: #35584d;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.16s ease;
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-bookmark-foot button:hover {
      border-color: rgba(76, 123, 106, 0.4);
      background: rgba(236, 246, 241, 0.96);
    }
    #gtf-native-timeline-bookmark-menu .gtf-native-timeline-bookmark-clear {
      color: #8f2d2d;
    }
    @media (max-width: 1180px) {
      #gtf-native-chat-timeline {
        right: 6px;
        top: 104px;
        bottom: 124px;
        width: 46px;
        padding: 7px 4px;
      }
      #gtf-native-chat-timeline .gtf-native-chat-timeline-filter-bar {
        gap: 3px;
      }
      #gtf-native-chat-timeline .gtf-native-chat-timeline-filter-btn {
        min-height: 20px;
        font-size: 10px;
      }
      #gtf-native-chat-timeline .gtf-native-chat-timeline-dot {
        width: 16px;
        height: 16px;
      }
    }
  `;
}

function positionNativeChatTimeline(root) {
  if (!(root instanceof HTMLElement)) return;
  const viewportW = window.innerWidth || document.documentElement.clientWidth || 1280;
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 900;

  let top = 112;
  let bottom = 144;
  let right = 14;

  const chatRect = chatContainer?.isConnected ? chatContainer.getBoundingClientRect() : null;
  if (chatRect && chatRect.width > 220 && chatRect.height > 160) {
    top = Math.max(88, Math.round(chatRect.top + 10));
    if (chatRect.right > viewportW * 0.42 && chatRect.right < viewportW - 4) {
      right = Math.max(8, Math.round(viewportW - chatRect.right + 10));
    }
  }

  const composerScope = getComposerScopeRoot();
  if (composerScope && composerScope !== document && composerScope instanceof Element) {
    const composerRect = composerScope.getBoundingClientRect();
    if (composerRect.width > 180 && composerRect.height > 38) {
      right = Math.max(8, Math.round(viewportW - composerRect.right + 10));
      const preferredBottom = Math.round(viewportH - composerRect.top + 8);
      bottom = Math.max(96, Math.min(preferredBottom, Math.round(viewportH * 0.36)));
    }
  }

  const maxBottom = Math.max(72, viewportH - top - 180);
  bottom = Math.min(bottom, maxBottom);
  if (bottom < 72) bottom = 72;

  root.style.top = `${top}px`;
  root.style.bottom = `${bottom}px`;
  root.style.right = `${right}px`;
}

function runNativeTimelinePositionUpdate() {
  if (nativeTimelineBookmarkMenuPositionLock) return;
  if (nativeChatTimelineRoot instanceof HTMLElement && nativeChatTimelineRoot.isConnected) {
    positionNativeChatTimeline(nativeChatTimelineRoot);
  }
}

function scheduleNativeTimelinePositionUpdate() {
  if (document.hidden) return;
  if (layoutResizePositionRaf) return;
  layoutResizePositionRaf = requestAnimationFrame(() => {
    layoutResizePositionRaf = 0;
    runNativeTimelinePositionUpdate();
  });
}

function scheduleNativeTimelinePositionSettle() {
  if (document.hidden) return;
  scheduleNativeTimelinePositionUpdate();
  nativeChatTimelinePositionSettleTimerIds.forEach((timerId) => clearTimeout(timerId));
  nativeChatTimelinePositionSettleTimerIds = [80, 180, 360, 720].map((delay) =>
    setTimeout(() => {
      scheduleNativeTimelinePositionUpdate();
    }, delay)
  );
}

function cleanupNativeChatTimeline() {
  if (nativeChatTimelineRenderTimer) {
    clearTimeout(nativeChatTimelineRenderTimer);
    nativeChatTimelineRenderTimer = null;
  }
  nativeChatTimelinePositionSettleTimerIds.forEach((timerId) => clearTimeout(timerId));
  nativeChatTimelinePositionSettleTimerIds = [];
  if (nativeChatTimelineRoot instanceof HTMLElement) {
    nativeChatTimelineRoot.remove();
  }
  nativeChatTimelineRoot = null;
  nativeChatTimelineList = null;
  nativeChatTimelineFilterBar = null;
  nativeChatTimelineDotMap = new Map();
  nativeChatTimelineActiveDot = null;
}

function ensureNativeChatTimelineRoot() {
  makeNativeChatTimelineStyle();
  if (nativeChatTimelineRoot?.isConnected && nativeChatTimelineList?.isConnected) {
    syncContentLocaleFromStorage().catch(() => {});
    updateNativeTimelineFilterButtons();
    positionNativeChatTimeline(nativeChatTimelineRoot);
    return nativeChatTimelineRoot;
  }

  // Remove any orphaned elements from previous extension reloads
  const existingRoot = document.getElementById("gtf-native-chat-timeline");
  if (existingRoot) existingRoot.remove();
  const existingToggle = document.getElementById("gtf-floating-toggle");
  if (existingToggle) existingToggle.remove();

  const root = document.createElement("aside");
  root.id = "gtf-native-chat-timeline";
  root.setAttribute("aria-label", ct("timeline_aria_label"));
  root.hidden = true;

  const toggleSidebarBtn = document.createElement("button");
  toggleSidebarBtn.className = "gtf-native-chat-timeline-head";
  toggleSidebarBtn.style.cursor = "pointer";
  toggleSidebarBtn.style.background = "transparent";
  toggleSidebarBtn.style.border = "none";
  toggleSidebarBtn.style.padding = "4px 0";
  toggleSidebarBtn.style.width = "100%";
  toggleSidebarBtn.title = ct("timeline_toggle_sidebar");
  toggleSidebarBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto; display: block;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>`;
  toggleSidebarBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const toggled = await requestToggleSidePanel();
    if (toggled.ok) {
      scheduleNativeTimelinePositionSettle();
      if (toggled.action === "opened") {
        requestOpenHomeView();
        setTimeout(() => {
          requestOpenHomeView();
          scheduleNativeTimelinePositionSettle();
        }, 180);
        setTimeout(() => {
          requestOpenHomeView();
          scheduleNativeTimelinePositionSettle();
        }, 520);
        setTimeout(() => {
          collapseNativeSidebarIfAutoOpened();
          scheduleNativeTimelinePositionSettle();
        }, 220);
      }
      return;
    }
    const opened = await requestOpenSidePanelSafe();
    if (opened) {
      scheduleNativeTimelinePositionSettle();
      setTimeout(() => {
        collapseNativeSidebarIfAutoOpened();
        scheduleNativeTimelinePositionSettle();
      }, 220);
      return;
    }
    requestOpenHomeView();
  });

  const list = document.createElement("ul");
  list.className = "gtf-native-chat-timeline-list";

  const filterBar = document.createElement("div");
  filterBar.className = "gtf-native-chat-timeline-filter-bar";
  Object.entries(getTimelineFilterMeta()).forEach(([mode, meta]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gtf-native-chat-timeline-filter-btn";
    btn.dataset.filter = mode;
    btn.textContent = meta.label;
    btn.title = meta.title;
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setNativeTimelineFilterMode(mode);
      scheduleNativeTimelinePositionSettle();
    });
    filterBar.appendChild(btn);
  });

  root.append(toggleSidebarBtn, filterBar, list);
  document.body.appendChild(root);
  nativeChatTimelineRoot = root;
  nativeChatTimelineList = list;
  nativeChatTimelineFilterBar = filterBar;
  ensureNativeTimelineBookmarkMenuRoot();
  syncContentLocaleFromStorage().catch(() => {});
  updateNativeTimelineFilterButtons();
  updateNativeTimelineFollowupStatus();
  positionNativeChatTimeline(root);
  return root;
}

function updateNativeTimelineFilterButtons(turns = nativeChatTimelineTurnsCache) {
  if (!(nativeChatTimelineFilterBar instanceof HTMLElement)) return;
  const counts = getNativeTimelineBookmarkCounts(turns);
  const filterMeta = getTimelineFilterMeta();
  nativeChatTimelineFilterBar.querySelectorAll(".gtf-native-chat-timeline-filter-btn").forEach((node) => {
    if (!(node instanceof HTMLButtonElement)) return;
    const mode = String(node.dataset.filter || "");
    const meta = filterMeta[mode];
    if (!meta) return;
    node.classList.toggle("active", mode === nativeChatTimelineFilterMode);
    node.textContent = meta.label;
    const countSuffix =
      mode === "all"
        ? `${counts.all}`
        : mode === "bookmarked"
        ? `${counts.bookmarked}`
        : mode === "mistake"
        ? `${counts.mistake}`
        : `${counts.review}`;
    node.title = `${meta.title} (${countSuffix})`;
  });
}

function setNativeTimelineFilterMode(mode) {
  if (!getTimelineFilterMeta()[mode]) return;
  if (nativeChatTimelineFilterMode === mode) return;
  nativeChatTimelineFilterMode = mode;
  scheduleNativeTimelinePositionSettle();
  updateNativeTimelineFilterButtons();
  applyNativeTimelineFilterVisibility();
  if (!nativeChatTimelineDotMap.size) {
    scheduleNativeChatTimelineRender(0, { bypassDefer: true, bypassMinGap: true });
  }
}

function ensureNativeTimelineBookmarkMenuRoot() {
  if (nativeTimelineBookmarkMenuRoot?.isConnected) return nativeTimelineBookmarkMenuRoot;
  const existing = document.getElementById("gtf-native-timeline-bookmark-menu");
  if (existing) existing.remove();

  const menu = document.createElement("div");
  menu.id = "gtf-native-timeline-bookmark-menu";
  menu.hidden = true;
  menu.innerHTML = `
    <div class="gtf-native-timeline-bookmark-title"></div>
    <div class="gtf-native-timeline-workbench-actions">
      <button type="button" data-workbench-action="card-source">${getTimelineWorkbenchActionLabel("card-source")}</button>
      <button type="button" data-workbench-action="source-excerpt">${getTimelineWorkbenchActionLabel("source-excerpt")}</button>
      <button type="button" data-workbench-action="pitfall">${getTimelineWorkbenchActionLabel("pitfall")}</button>
      <button type="button" data-workbench-action="followup">${getTimelineWorkbenchActionLabel("followup")}</button>
      <button type="button" data-workbench-action="followup-new">${getTimelineWorkbenchActionLabel("followup-new")}</button>
    </div>
    <div class="gtf-native-timeline-bookmark-actions"></div>
    <textarea placeholder="${ct("timeline_menu_note_placeholder")}"></textarea>
    <div class="gtf-native-timeline-share-actions">
      <button type="button" class="gtf-native-timeline-share-btn" data-share-action="download">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.75a.75.75 0 0 1 .75.75v6.69l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V3.5a.75.75 0 0 1 .75-.75M4.5 12.25a.75.75 0 0 1 .75.75v1.5c0 .138.112.25.25.25h9a.25.25 0 0 0 .25-.25V13a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 14.5 16.25h-9A1.75 1.75 0 0 1 3.75 14.5V13a.75.75 0 0 1 .75-.75"/></svg>
        <span>${ct("timeline_menu_share_download")}</span>
      </button>
      <button type="button" class="gtf-native-timeline-share-btn" data-share-action="download-svg">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.75a.75.75 0 0 1 .75.75v6.69l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V3.5a.75.75 0 0 1 .75-.75M4.5 12.25a.75.75 0 0 1 .75.75v1.5c0 .138.112.25.25.25h2.75a.75.75 0 0 1 0 1.5H5.5A1.75 1.75 0 0 1 3.75 14.5V13a.75.75 0 0 1 .75-.75m6.75 2.5a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75m0-3a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75"/></svg>
        <span>${ct("timeline_menu_share_download_svg")}</span>
      </button>
    </div>
    <div class="gtf-native-timeline-bookmark-status" hidden aria-live="polite"></div>
    <div class="gtf-native-timeline-bookmark-foot">
      <button type="button" class="gtf-native-timeline-bookmark-save">${ct("timeline_menu_save")}</button>
      <button type="button" class="gtf-native-timeline-bookmark-clear">${ct("timeline_menu_clear")}</button>
    </div>
  `;
  const actions = menu.querySelector(".gtf-native-timeline-bookmark-actions");
  Object.entries(getTimelineBookmarkTypeMeta()).forEach(([type, meta]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gtf-native-timeline-bookmark-type";
    btn.dataset.bookmarkType = type;
    btn.textContent = meta.label;
    actions?.appendChild(btn);
  });

  menu.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const workbenchBtn = target.closest("[data-workbench-action]");
    if (workbenchBtn instanceof HTMLElement) {
      const turnId = nativeTimelineBookmarkMenuTurnId;
      const action = String(workbenchBtn.dataset.workbenchAction || "");
      if (turnId && action) {
        sendTimelineWorkbenchAction(turnId, action);
        if (action === "pitfall") {
          const textarea = menu.querySelector("textarea");
          upsertNativeTimelineBookmark(turnId, {
            type: "mistake",
            note: textarea instanceof HTMLTextAreaElement ? textarea.value : ""
          });
          scheduleNativeChatTimelineRender(0, { bypassDefer: true, bypassMinGap: true });
        }
      }
      return;
    }
    const typeBtn = target.closest("[data-bookmark-type]");
    if (typeBtn instanceof HTMLElement) {
      const turnId = nativeTimelineBookmarkMenuTurnId;
      if (!turnId) return;
      const textarea = menu.querySelector("textarea");
      upsertNativeTimelineBookmark(turnId, {
        type: String(typeBtn.dataset.bookmarkType || "review"),
        note: textarea instanceof HTMLTextAreaElement ? textarea.value : ""
      });
      scheduleNativeChatTimelineRender(0, { bypassDefer: true, bypassMinGap: true });
      menu.querySelectorAll("[data-bookmark-type]").forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        node.classList.toggle("active", node === typeBtn);
      });
      return;
    }
    if (target.closest(".gtf-native-timeline-bookmark-save")) {
      const turnId = nativeTimelineBookmarkMenuTurnId;
      if (!turnId) return;
      const textarea = menu.querySelector("textarea");
      const existingBookmark = getNativeTimelineBookmark(turnId);
      upsertNativeTimelineBookmark(turnId, {
        type: existingBookmark?.type || "review",
        note: textarea instanceof HTMLTextAreaElement ? textarea.value : ""
      });
      scheduleNativeChatTimelineRender(0, { bypassDefer: true, bypassMinGap: true });
      hideNativeTimelineBookmarkMenu();
      return;
    }
    const shareBtn = target.closest("[data-share-action]");
    if (shareBtn instanceof HTMLElement) {
      handleNativeTimelineShareAction(String(shareBtn.dataset.shareAction || ""));
      return;
    }
    if (target.closest(".gtf-native-timeline-bookmark-clear")) {
      if (nativeTimelineBookmarkMenuTurnId) {
        removeNativeTimelineBookmark(nativeTimelineBookmarkMenuTurnId);
      }
      scheduleNativeChatTimelineRender(0, { bypassDefer: true, bypassMinGap: true });
      hideNativeTimelineBookmarkMenu();
    }
  });

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (menu.hidden) return;
      const target = event.target instanceof Node ? event.target : null;
      if (target && menu.contains(target)) return;
      if (target instanceof Element && target.closest(".gtf-native-chat-timeline-dot")) return;
      hideNativeTimelineBookmarkMenu();
    },
    true
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideNativeTimelineBookmarkMenu();
  });
  
  // Prevent Gemini's global event listeners from capturing keystrokes in our menu
  menu.addEventListener("keydown", (e) => e.stopPropagation());
  menu.addEventListener("keyup", (e) => e.stopPropagation());
  menu.addEventListener("keypress", (e) => e.stopPropagation());
  
  // Prevent scrolling inside the textarea from bubbling up and moving the parent document
  menu.addEventListener("wheel", (e) => {
    const textarea = menu.querySelector("textarea");
    if (e.target === textarea && textarea.scrollHeight > textarea.clientHeight) {
      e.stopPropagation();
    }
  }, { passive: false });

  document.body.appendChild(menu);
  nativeTimelineBookmarkMenuRoot = menu;
  return menu;
}

function hideNativeTimelineBookmarkMenu() {
  if (!(nativeTimelineBookmarkMenuRoot instanceof HTMLElement)) return;
  nativeTimelineBookmarkMenuRoot.hidden = true;
  nativeTimelineBookmarkMenuRoot.style.visibility = "";
  nativeTimelineBookmarkMenuTurnId = "";
  nativeTimelineBookmarkMenuPositionLock = false;
  scheduleNativeTimelinePositionUpdate();
}

function showNativeTimelineBookmarkMenu(turnId, anchorEl) {
  const id = String(turnId || "").trim();
  if (!id) return;
  const menu = ensureNativeTimelineBookmarkMenuRoot();
  if (!(menu instanceof HTMLElement)) return;
  nativeTimelineBookmarkMenuPositionLock = true;
  nativeTimelineBookmarkMenuTurnId = id;
  const turn = getTimelineTurnById(id);
  const bookmark = getNativeTimelineBookmark(id);
  const titleEl = menu.querySelector(".gtf-native-timeline-bookmark-title");
  if (titleEl instanceof HTMLElement) {
    titleEl.textContent = turn ? `${ct("timeline_bookmark_title_prefix")}${clampText(getTimelineTurnDisplayTitle(turn), 56)}` : ct("timeline_bookmark_panel_title");
  }
  const textarea = menu.querySelector("textarea");
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.value = bookmark?.note || "";
  }
  setNativeTimelineBookmarkMenuStatus("");
  refreshNativeTimelineBookmarkMenuLocale();
  menu.querySelectorAll("[data-bookmark-type]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.classList.toggle("active", String(node.dataset.bookmarkType || "") === normalizeTimelineBookmarkType(bookmark?.type));
  });
  const rect = anchorEl instanceof Element ? anchorEl.getBoundingClientRect() : null;
  const menuWidth = 252;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720;
  menu.hidden = false;
  menu.style.visibility = "hidden";
  menu.style.left = "8px";
  menu.style.top = "8px";
  const menuHeight = Math.max(220, menu.offsetHeight || 296);
  const left = rect ? Math.max(8, Math.min(viewportWidth - menuWidth - 8, rect.left - menuWidth - 10)) : Math.max(8, viewportWidth - menuWidth - 16);
  const top = rect ? Math.max(8, Math.min(viewportHeight - menuHeight - 8, rect.top - 6)) : 120;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.visibility = "";
  
  // Do not auto-focus the textarea here. On Gemini's responsive layout that
  // focus can trigger a scroll/viewport resize and make the timeline rail drift.
}

async function loadRawEntries(options = {}) {
  const allowSnapshotFallback = options?.allowSnapshotFallback !== false;
  const includeLegacyConversationVariants = options?.includeLegacyConversationVariants === true;
  if (!isConcreteConversationId(currentConversationId)) return [];
  const cacheKey = [
    currentConversationId,
    allowSnapshotFallback ? "snapshot" : "stored",
    includeLegacyConversationVariants ? "legacy" : "current"
  ].join("|");
  if (
    !options?.forceFresh &&
    rawEntryCache.key === cacheKey &&
    Date.now() - rawEntryCache.at < RAW_ENTRY_CACHE_TTL_MS &&
    Array.isArray(rawEntryCache.entries)
  ) {
    return rawEntryCache.entries.slice();
  }
  const collectedLists = [];

  function appendEntryList(list) {
    if (!Array.isArray(list) || !list.length) return;
    collectedLists.push(list.slice());
  }

  function entryRichnessScore(entry) {
    if (!entry || typeof entry !== "object") return 0;
    let score = 0;
    score += normalizeText(entry.question || "").length * 4;
    score += normalizeText(entry.answerMarkdown || "").length * 2;
    score += normalizeText(entry.summary || "").length;
    score += normalizeText(entry.studyNote || "").length * 3;
    if (entry.studyNoteImage) score += 120;
    if (entry.interleavedNotes && typeof entry.interleavedNotes === "object") {
      score += Object.keys(entry.interleavedNotes).length * 40;
    }
    if (Number.isFinite(Number(entry.timestamp)) && Number(entry.timestamp) > 0) score += 20;
    if (Number.isInteger(entry.domIndex)) score += 8;
    return score;
  }

  function mergeEntryVariants(baseEntry, nextEntry) {
    if (!baseEntry) return { ...nextEntry };
    if (!nextEntry) return { ...baseEntry };
    const baseScore = entryRichnessScore(baseEntry);
    const nextScore = entryRichnessScore(nextEntry);
    const preferred = nextScore >= baseScore ? nextEntry : baseEntry;
    const fallback = preferred === nextEntry ? baseEntry : nextEntry;
    const merged = { ...fallback, ...preferred };
    if (!normalizeText(merged.question || "")) {
      merged.question = normalizeText(preferred.question || "") || fallback.question || "";
    }
    if (!normalizeText(merged.answerMarkdown || "")) {
      merged.answerMarkdown = preferred.answerMarkdown || fallback.answerMarkdown || "";
    }
    if (!normalizeText(merged.summary || "")) {
      merged.summary = preferred.summary || fallback.summary || "";
    }
    if (!normalizeText(merged.studyNote || "")) {
      merged.studyNote = preferred.studyNote || fallback.studyNote || "";
    }
    if (!merged.studyNoteImage && fallback.studyNoteImage) {
      merged.studyNoteImage = fallback.studyNoteImage;
    }
    if (!merged.studyNoteImage && preferred.studyNoteImage) {
      merged.studyNoteImage = preferred.studyNoteImage;
    }
    if (
      (!merged.interleavedNotes || typeof merged.interleavedNotes !== "object") &&
      fallback.interleavedNotes &&
      typeof fallback.interleavedNotes === "object"
    ) {
      merged.interleavedNotes = { ...fallback.interleavedNotes };
    }
    if (
      preferred.interleavedNotes &&
      typeof preferred.interleavedNotes === "object" &&
      (!merged.interleavedNotes || typeof merged.interleavedNotes !== "object")
    ) {
      merged.interleavedNotes = { ...preferred.interleavedNotes };
    }
    return merged;
  }

  function finalizeCollectedEntries() {
    if (!collectedLists.length) return [];
    const entryMap = new Map();
    const orderedIds = [];
    collectedLists.forEach((list) => {
      list.forEach((item) => {
        const id = String(item?.id || "").trim();
        if (!id) return;
        if (!entryMap.has(id)) orderedIds.push(id);
        entryMap.set(id, mergeEntryVariants(entryMap.get(id), item));
      });
    });
    return orderedIds.map((id) => entryMap.get(id)).filter(Boolean);
  }

  try {
    const currentKey = toStorageKey(currentConversationId);
    const currentResult = await storageGet(currentKey);
    const currentEntries = currentResult?.[currentKey]?.entries || currentResult?.[currentKey]?.turns;
    appendEntryList(currentEntries);

    if (includeLegacyConversationVariants) {
      const allData = await storageGet(null);
      const sessions = [];
      Object.keys(allData).forEach(k => {
        if (!k.startsWith(`${STORAGE_PREFIX}`)) return;
        if (k !== currentKey && !k.startsWith(`${currentKey}-`) && !k.startsWith(`${currentKey}_`)) return;
        const value = allData[k];
        if (value && (Array.isArray(value.entries) || Array.isArray(value.turns))) {
          sessions.push({
            session: value,
            updatedAt: value.updatedAt || 0
          });
        }
      });

      const mergedRawEntries = sessions.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).flatMap((item) => item.session.entries || item.session.turns || []);
      appendEntryList(mergedRawEntries);
    }
  } catch {}

  let entries = finalizeCollectedEntries();
  if (allowSnapshotFallback) {
    appendEntryList(collectSnapshotTurns());
    entries = finalizeCollectedEntries();
  }
  rawEntryCache = { key: cacheKey, at: Date.now(), entries: entries.slice() };
  return entries;
}

async function loadNativeChatTimelineTurns() {
  const entries = await loadRawEntries({ allowSnapshotFallback: true, includeLegacyConversationVariants: false });
  const liveTurns = collectSnapshotTurns();
  const liveIdByDomIndex = new Map();
  liveTurns.forEach((turn) => {
    if (!Number.isInteger(turn?.domIndex) || !turn?.id) return;
    liveIdByDomIndex.set(turn.domIndex, turn.id);
  });

  const turnsByKey = new Map();
  const preferTimelineTurn = (baseTurn, nextTurn, preferredLiveId = "") => {
    if (!baseTurn) return nextTurn;
    if (!nextTurn) return baseTurn;
    if (preferredLiveId) {
      if (nextTurn.id === preferredLiveId && baseTurn.id !== preferredLiveId) return nextTurn;
      if (baseTurn.id === preferredLiveId && nextTurn.id !== preferredLiveId) return baseTurn;
    }
    if (nextTurn.hasNote !== baseTurn.hasNote) {
      return nextTurn.hasNote ? nextTurn : baseTurn;
    }
    const baseTitleLen = normalizeText(baseTurn.title || "").length;
    const nextTitleLen = normalizeText(nextTurn.title || "").length;
    if (nextTitleLen !== baseTitleLen) {
      return nextTitleLen > baseTitleLen ? nextTurn : baseTurn;
    }
    const baseTs = Number(baseTurn.timestamp) || 0;
    const nextTs = Number(nextTurn.timestamp) || 0;
    if (nextTs !== baseTs) {
      return nextTs > baseTs ? nextTurn : baseTurn;
    }
    return baseTurn;
  };

  entries.forEach((item, idx) => {
    const id = item?.id || "";
    if (!id) return;
    const question = normalizeText(item?.question || "");
    const summaryText = summarize(question || item?.summary || item?.answerMarkdown || "");
    const title = summaryText || `\u8282\u70B9 ${idx + 1}`;
    const turn = {
      id,
      title,
      domIndex: Number.isInteger(item?.domIndex) ? item.domIndex : null,
      timestamp: Number.isFinite(Number(item?.timestamp)) ? Number(item.timestamp) : 0,
      hasNote: normalizeText(item?.studyNote || "").length > 0 || !!item?.studyNoteImage
    };
    const key = Number.isInteger(turn.domIndex) ? `dom:${turn.domIndex}` : `id:${id}`;
    const preferredLiveId = Number.isInteger(turn.domIndex) ? liveIdByDomIndex.get(turn.domIndex) || "" : "";
    turnsByKey.set(key, preferTimelineTurn(turnsByKey.get(key), turn, preferredLiveId));
  });

  const turns = Array.from(turnsByKey.values()).filter(Boolean);
  if (!turns.length) return [];
  return turns.sort((a, b) => {
    const ta = a.timestamp || 0;
    const tb = b.timestamp || 0;
    if (ta !== tb) return ta - tb;
    const da = Number.isInteger(a.domIndex) ? a.domIndex : 999999;
    const db = Number.isInteger(b.domIndex) ? b.domIndex : 999999;
    return da - db;
  });
}

function collapseEmptyMainAnnotation(container) {
  if (!(container instanceof HTMLElement)) return;
  container.classList.remove("has-note");
  delete container.dataset.pinnedMain;
  container.style.display = "none";
  const textarea = container.querySelector(".gtf-inline-annotation-textarea");
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.value = "";
  }
  const statusEl = container.querySelector(".gtf-inline-annotation-status");
  if (statusEl instanceof HTMLElement) {
    statusEl.textContent = "";
  }
  const summaryEl = container.querySelector(".gtf-inline-annotation-summary");
  if (summaryEl instanceof HTMLElement) {
    summaryEl.textContent = ct("inline_annotation_summary_empty");
  }
  const countEl = container.querySelector(".gtf-inline-annotation-count");
  if (countEl instanceof HTMLElement) {
    countEl.textContent = `0/${INLINE_ANNOTATION_MAX_LENGTH}`;
  }
  container.remove();
}

function removeEmptyInterleavedAnnotation(container) {
  if (!(container instanceof HTMLElement)) return;
  container.classList.remove("has-note");
  container.style.display = "none";
  const textarea = container.querySelector(".gtf-inline-annotation-textarea");
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.value = "";
  }
  const statusEl = container.querySelector(".gtf-inline-annotation-status");
  if (statusEl instanceof HTMLElement) {
    statusEl.textContent = "";
  }
  const summaryEl = container.querySelector(".gtf-inline-annotation-summary");
  if (summaryEl instanceof HTMLElement) {
    summaryEl.textContent = "";
  }
  const countEl = container.querySelector(".gtf-inline-annotation-count");
  if (countEl instanceof HTMLElement) {
    countEl.textContent = `0/${INLINE_ANNOTATION_MAX_LENGTH}`;
  }
  container.remove();
}

function buildNativeTimelineTurnsSignature(turns) {
  if (!Array.isArray(turns) || !turns.length) return "";
  return turns
    .map((turn) => `${turn.id}|${turn.hasNote ? 1 : 0}|${Number.isInteger(turn.domIndex) ? turn.domIndex : ""}`)
    .join(";");
}

async function saveAnnotationToStorage(turnId, blockIndex, note) {
  if (!isConcreteConversationId(currentConversationId)) return;
  try {
    const currentKey = toStorageKey(currentConversationId);
    const currentResult = await storageGet(currentKey);
    const currentSessionData = currentResult?.[currentKey];
    const currentEntries = Array.isArray(currentSessionData?.entries)
      ? currentSessionData.entries
      : Array.isArray(currentSessionData?.turns)
      ? currentSessionData.turns
      : null;
    if (Array.isArray(currentEntries)) {
      const idx = currentEntries.findIndex((e) => e.id === turnId);
      if (idx >= 0) {
        const entry = currentEntries[idx];
        if (blockIndex !== null) {
          if (!entry.interleavedNotes) entry.interleavedNotes = {};
          if (note) entry.interleavedNotes[blockIndex] = note;
          else delete entry.interleavedNotes[blockIndex];
        } else {
          entry.studyNote = note;
        }
        currentSessionData.updatedAt = Date.now();
        await storageSet({ [currentKey]: currentSessionData });
        chrome.runtime.sendMessage({ type: "GEMINI_RELOAD_STATE", conversationId: currentConversationId }, () => {});
        return;
      }
    }

    const allData = await storageGet(null);
    const sessionKeys = Object.keys(allData).filter(k => 
      k.startsWith(`${STORAGE_PREFIX}`) && 
      (k.includes(`:${currentConversationId}`) || k.includes(`:${currentConversationId}-`))
    );
    
    let targetSessionKey = null;
    let targetEntryIndex = -1;
    
    // Sort keys to prefer the most recently updated session
    sessionKeys.sort((a, b) => {
      const ta = allData[a]?.updatedAt || 0;
      const tb = allData[b]?.updatedAt || 0;
      return tb - ta;
    });

    for (const k of sessionKeys) {
      const entries = allData[k]?.entries || allData[k]?.turns;
      if (Array.isArray(entries)) {
        const idx = entries.findIndex(e => e.id === turnId);
        if (idx >= 0) {
          targetSessionKey = k;
          targetEntryIndex = idx;
          break;
        }
      }
    }
    
    if (targetSessionKey && targetEntryIndex >= 0) {
      const sessionData = allData[targetSessionKey];
      const entries = Array.isArray(sessionData.entries) ? sessionData.entries : sessionData.turns;
      const entry = entries[targetEntryIndex];
      
      if (blockIndex !== null) {
        if (!entry.interleavedNotes) entry.interleavedNotes = {};
        if (note) {
          entry.interleavedNotes[blockIndex] = note;
        } else {
          delete entry.interleavedNotes[blockIndex];
        }
      } else {
        entry.studyNote = note;
      }
      
      sessionData.updatedAt = Date.now();
      await storageSet({ [targetSessionKey]: sessionData });
      chrome.runtime.sendMessage({ type: "GEMINI_RELOAD_STATE", conversationId: currentConversationId }, () => {});
    } else {
      // Fallback if not found in saved sessions yet (e.g. newly created turn)
      let sessionData = allData[currentKey] || { 
        conversationId: currentConversationId,
        url: location.href,
        updatedAt: Date.now(),
        entries: [] 
      };
      let entries = Array.isArray(sessionData.entries) ? sessionData.entries : sessionData.turns;
      if (!Array.isArray(entries)) {
        entries = [];
        sessionData.entries = entries;
      }
      
      const idx = entries.findIndex(e => e.id === turnId);
      if (idx >= 0) {
        const entry = entries[idx];
        if (blockIndex !== null) {
          if (!entry.interleavedNotes) entry.interleavedNotes = {};
          if (note) entry.interleavedNotes[blockIndex] = note;
          else delete entry.interleavedNotes[blockIndex];
        } else {
          entry.studyNote = note;
        }
        sessionData.updatedAt = Date.now();
        await storageSet({ [currentKey]: sessionData });
        chrome.runtime.sendMessage({ type: "GEMINI_RELOAD_STATE", conversationId: currentConversationId }, () => {});
      } else {
        // Find from DOM snapshot if it was never saved to storage
        const snapshotTurns = collectSnapshotTurns();
        const targetEntry = snapshotTurns.find(e => e.id === turnId);
        if (targetEntry) {
          if (blockIndex !== null) {
            if (!targetEntry.interleavedNotes) targetEntry.interleavedNotes = {};
            if (note) targetEntry.interleavedNotes[blockIndex] = note;
            else delete targetEntry.interleavedNotes[blockIndex];
          } else {
            targetEntry.studyNote = note;
          }
          entries.push(targetEntry);
          sessionData.updatedAt = Date.now();
          await storageSet({ [currentKey]: sessionData });
          chrome.runtime.sendMessage({ type: "GEMINI_RELOAD_STATE", conversationId: currentConversationId }, () => {});
        }
      }
    }
  } catch (error) {
    console.error("saveAnnotationToStorage error", error);
  }
}

async function saveInlineAnnotation(turnId, note) {
  return saveAnnotationToStorage(turnId, null, note);
}

async function saveInterleavedAnnotation(turnId, blockIndex, note) {
  return saveAnnotationToStorage(turnId, blockIndex, note);
}

function getInlineAnnotationKey(turnId, blockIndex) {
  return `${turnId}::${blockIndex === null ? "main" : String(blockIndex)}`;
}

function resizeInlineAnnotationTextarea(textarea) {
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  const minHeight = inlineAnnotationUiMode === "compact" ? 64 : 86;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(minHeight, textarea.scrollHeight)}px`;
}

function updateInlineAnnotationMeta(container, noteText, maxLength = INLINE_ANNOTATION_MAX_LENGTH) {
  if (!(container instanceof HTMLElement)) return;
  const countEl = container.querySelector(".gtf-inline-annotation-count");
  if (countEl) countEl.textContent = `${String(noteText || "").length}/${maxLength}`;
}

function setInlineAnnotationStatus(container, state, message = "") {
  if (!(container instanceof HTMLElement)) return;
  const existingTimer = inlineAnnotationStatusTimers.get(container);
  if (existingTimer) {
    clearTimeout(existingTimer);
    inlineAnnotationStatusTimers.delete(container);
  }
  container.dataset.state = state || "";
  const statusEl = container.querySelector(".gtf-inline-annotation-status");
  if (statusEl) statusEl.textContent = message || "";
  if (state === "saved" && message) {
    const timer = setTimeout(() => {
      if (!(container instanceof HTMLElement) || !container.isConnected) return;
      if (container.dataset.state !== "saved") return;
      container.dataset.state = "";
      const nextStatusEl = container.querySelector(".gtf-inline-annotation-status");
      if (nextStatusEl) nextStatusEl.textContent = "";
      inlineAnnotationStatusTimers.delete(container);
    }, INLINE_ANNOTATION_STATUS_SETTLE_MS);
    inlineAnnotationStatusTimers.set(container, timer);
  }
}

function buildInterleavedSummaryText(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const preview = normalized.replace(/^[-*•\d.)\s]+/, "");
  if (preview.length <= 112) return preview;
  return `${preview.slice(0, 112).trim()}…`;
}

function flushInlineAnnotationSave(turnId, blockIndex, noteText, container, options = {}) {
  const normalized = String(noteText || "").trim().slice(0, INLINE_ANNOTATION_MAX_LENGTH);
  const key = getInlineAnnotationKey(turnId, blockIndex);
  const timer = inlineAnnotationSaveTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    inlineAnnotationSaveTimers.delete(key);
  }

  const persist = async () => {
    try {
      setInlineAnnotationStatusByKey(container, "saving", "inline_annotation_status_saving");
      if (blockIndex === null) await saveInlineAnnotation(turnId, normalized);
      else await saveInterleavedAnnotation(turnId, blockIndex, normalized);
      setInlineAnnotationStatusByKey(container, "saved", normalized ? "inline_annotation_status_saved" : "inline_annotation_status_cleared");
      if (options.onSaved && typeof options.onSaved === "function") options.onSaved(normalized);
      scheduleNativeChatTimelineRender(260);
    } catch (error) {
      console.error("flushInlineAnnotationSave failed", error);
      setInlineAnnotationStatusByKey(container, "error", "inline_annotation_status_error");
    }
  };

  if (options.immediate) {
    persist();
  } else {
    const nextTimer = setTimeout(persist, INLINE_ANNOTATION_SAVE_DEBOUNCE_MS);
    inlineAnnotationSaveTimers.set(key, nextTimer);
  }
}

function ensureInlineAnnotationEditor(
  container,
  {
    turnId,
    blockIndex = null,
    noteText = "",
    placeholder = ct("inline_annotation_placeholder"),
    placeholderKey = "inline_annotation_placeholder",
    label = ct("inline_annotation_label"),
    labelKey = "inline_annotation_label",
    onSaved
  } = {}
) {
  if (!(container instanceof HTMLElement) || !turnId) return null;
  ensureInlineAnnotationStyles();

  const isInterleaved = blockIndex !== null;
  const markEditingActive = () => {
    container.dataset.editingUntil = String(Date.now() + 12000);
  };
  const markInterleavedJustOpened = () => {
    if (!isInterleaved) return;
    container.dataset.justOpenedUntil = String(Date.now() + 280);
  };
  const isEditingActive = () => {
    if (!isInterleaved) return false;
    return Number(container.dataset.editingUntil || 0) > Date.now();
  };
  if (isInterleaved) {
    container.classList.add("gtf-inline-annotation-collapsible");
  } else {
    container.classList.remove("gtf-inline-annotation-collapsible");
    container.classList.remove("is-collapsed");
  }
  container.dataset.annotationPlaceholderKey = placeholderKey;
  container.dataset.annotationLabelKey = labelKey;
  container.dataset.annotationKind = isInterleaved ? "interleaved" : "main";

  let head = container.querySelector(".gtf-inline-annotation-head");
  let actionsRow = container.querySelector(".gtf-inline-annotation-actions");
  let textarea = container.querySelector(".gtf-inline-annotation-textarea");
  if (!head) {
    head = document.createElement("div");
    head.className = "gtf-inline-annotation-head";
    const labelEl = document.createElement("span");
    labelEl.className = "gtf-inline-annotation-label";
    labelEl.textContent = label;
    const statusEl = document.createElement("span");
    statusEl.className = "gtf-inline-annotation-status";
    const countEl = document.createElement("span");
    countEl.className = "gtf-inline-annotation-count";
    const modeBtn = document.createElement("button");
    modeBtn.type = "button";
    modeBtn.className = "gtf-inline-annotation-mode-toggle";
    modeBtn.textContent = inlineAnnotationUiMode === "compact" ? ct("inline_annotation_mode_compact") : ct("inline_annotation_mode_readable");
    modeBtn.title = ct("inline_annotation_mode_toggle");
    modeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleInlineAnnotationUiMode();
      resizeInlineAnnotationTextarea(textarea);
    });
    head.append(labelEl, statusEl, countEl, modeBtn);
    container.appendChild(head);
  } else {
    const labelEl = head.querySelector(".gtf-inline-annotation-label");
    if (labelEl) labelEl.textContent = label;
    const modeBtn = head.querySelector(".gtf-inline-annotation-mode-toggle");
    if (modeBtn) {
      modeBtn.textContent = inlineAnnotationUiMode === "compact" ? ct("inline_annotation_mode_compact") : ct("inline_annotation_mode_readable");
      modeBtn.title = ct("inline_annotation_mode_toggle");
    }
  }

  if (actionsRow instanceof HTMLElement) {
    actionsRow.remove();
  }

  if (!(textarea instanceof HTMLTextAreaElement)) {
    textarea = document.createElement("textarea");
    textarea.className = "gtf-inline-annotation-textarea";
    container.appendChild(textarea);
  }

  let summaryEl = null;
  let editorWrap = null;
  if (isInterleaved) {
    summaryEl = container.querySelector(".gtf-inline-annotation-summary");
    if (!(summaryEl instanceof HTMLButtonElement)) {
      summaryEl = document.createElement("button");
      summaryEl.type = "button";
      summaryEl.className = "gtf-inline-annotation-summary";
      container.prepend(summaryEl);
    }

    editorWrap = container.querySelector(".gtf-inline-annotation-editor-wrap");
    if (!(editorWrap instanceof HTMLElement)) {
      editorWrap = document.createElement("div");
      editorWrap.className = "gtf-inline-annotation-editor-wrap";
      container.appendChild(editorWrap);
    }
    if (head.parentElement !== editorWrap) editorWrap.appendChild(head);
    if (textarea.parentElement !== editorWrap) editorWrap.appendChild(textarea);

    if (!container.dataset.collapseInit) {
      container.dataset.collapseInit = "1";
      container.dataset.collapsed = "1";
    }
  } else {
    if (head.parentElement !== container) container.appendChild(head);
    if (textarea.parentElement !== container) container.appendChild(textarea);
    const oldSummary = container.querySelector(".gtf-inline-annotation-summary");
    if (oldSummary) oldSummary.remove();
    const oldWrap = container.querySelector(".gtf-inline-annotation-editor-wrap");
    if (oldWrap) oldWrap.remove();
    delete container.dataset.collapseInit;
    delete container.dataset.collapsed;
  }

  textarea.maxLength = INLINE_ANNOTATION_MAX_LENGTH;
  textarea.placeholder = placeholder;

  if (document.activeElement !== textarea && textarea.value !== (noteText || "")) {
    textarea.value = noteText || "";
  }
  updateInlineAnnotationMeta(container, textarea.value);
  resizeInlineAnnotationTextarea(textarea);

  const applyInterleavedCollapsedUi = () => {
    if (!isInterleaved || !(summaryEl instanceof HTMLButtonElement)) return;
    const collapsed = container.dataset.collapsed !== "0" && !isEditingActive();
    const summaryText = buildInterleavedSummaryText(textarea.value);
    if (collapsed && !summaryText) {
      removeEmptyInterleavedAnnotation(container);
      return;
    }
    container.style.display = "block";
    container.classList.toggle("is-collapsed", collapsed);
    summaryEl.textContent = summaryText;
  };
  applyInterleavedCollapsedUi();

  if (!textarea.dataset.boundInlineAnnotation) {
    textarea.dataset.boundInlineAnnotation = "1";
    textarea.addEventListener("input", () => {
      if (textarea.value.length > INLINE_ANNOTATION_MAX_LENGTH) {
        textarea.value = textarea.value.slice(0, INLINE_ANNOTATION_MAX_LENGTH);
      }
      resizeInlineAnnotationTextarea(textarea);
      updateInlineAnnotationMeta(container, textarea.value);
      setInlineAnnotationStatusByKey(container, "editing", "inline_annotation_status_editing");
      if (isInterleaved) {
        markEditingActive();
        container.dataset.collapsed = "0";
        applyInterleavedCollapsedUi();
      }
      flushInlineAnnotationSave(turnId, blockIndex, textarea.value, container, { onSaved });
    });
    textarea.addEventListener("focus", () => {
      if (!isInterleaved) return;
      markEditingActive();
      markInterleavedJustOpened();
      container.dataset.collapsed = "0";
      applyInterleavedCollapsedUi();
    });
    textarea.addEventListener("blur", () => {
      flushInlineAnnotationSave(turnId, blockIndex, textarea.value, container, {
        immediate: true,
        onSaved
      });
    });
    textarea.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        flushInlineAnnotationSave(turnId, blockIndex, textarea.value, container, {
          immediate: true,
          onSaved
        });
        textarea.blur();
      }
    });
  }

  if (isInterleaved && summaryEl && !summaryEl.dataset.boundSummaryToggle) {
    summaryEl.dataset.boundSummaryToggle = "1";
    summaryEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      markEditingActive();
      markInterleavedJustOpened();
      container.dataset.collapsed = "0";
      applyInterleavedCollapsedUi();
      textarea.focus();
    });
  }

  if (isInterleaved && !container.dataset.boundContainerToggle) {
    container.dataset.boundContainerToggle = "1";
    container.addEventListener("pointerdown", (event) => {
      if (container.dataset.collapsed !== "1") return;
      if (event.target instanceof Element && event.target.closest(".gtf-inline-annotation-summary")) return;
      markEditingActive();
      markInterleavedJustOpened();
      container.dataset.collapsed = "0";
      applyInterleavedCollapsedUi();
      setTimeout(() => textarea.focus(), 0);
    });
  }

  if (isInterleaved && !container.dataset.boundOutsideClickCollapse) {
    container.dataset.boundOutsideClickCollapse = "1";
    document.addEventListener(
      "click",
      (event) => {
        if (container.dataset.collapsed === "1") return;
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (container.contains(target)) return;
        if (Number(container.dataset.justOpenedUntil || 0) > Date.now()) return;
        container.dataset.editingUntil = "0";
        container.dataset.collapsed = "1";
        applyInterleavedCollapsedUi();
      },
      false
    );
  }

  return textarea;
}
function getResponseBlocks(responseNode) {
  if (!responseNode) return [];
  const blocks = Array.from(responseNode.querySelectorAll('p, pre, ul, ol, table, blockquote'));
  return blocks.filter(b => {
    let parent = b.parentElement;
    while(parent && parent !== responseNode) {
      if (['P','PRE','UL','OL','TABLE','LI','BLOCKQUOTE'].includes(parent.tagName)) return false;
      parent = parent.parentElement;
    }
    return true;
  });
}

function scheduleInlineAnnotationSync(delay = 140) {
  if (inlineAnnotationSyncTimer) clearTimeout(inlineAnnotationSyncTimer);
  inlineAnnotationSyncTimer = setTimeout(() => {
    inlineAnnotationSyncTimer = null;
    syncInlineAnnotations(true).catch((error) => {
      console.warn("[Gemini Timeline] syncInlineAnnotations failed", error);
    });
  }, Math.max(0, delay));
}

async function syncInlineAnnotations(force = false) {
  if (!force) {
    scheduleInlineAnnotationSync(120);
    return;
  }
  if (inlineAnnotationSyncInFlight) {
    inlineAnnotationSyncPending = true;
    return;
  }
  const perfStartedAt = perfNow();
  inlineAnnotationSyncInFlight = true;
  try {
    const entries = await loadRawEntries({ allowSnapshotFallback: false, includeLegacyConversationVariants: false });
    const noteEntryMap = new Map();
    entries.forEach((entry) => {
      const id = entry?.id;
      if (!id) return;
      const mainNoteText = String(entry?.studyNote || "");
      const interleavedNotesRaw = entry?.interleavedNotes && typeof entry.interleavedNotes === "object" ? entry.interleavedNotes : {};
      const interleavedNotes = {};
      Object.keys(interleavedNotesRaw).forEach((key) => {
        const value = String(interleavedNotesRaw[key] || "");
        if (!value) return;
        const idx = Number(key);
        if (!Number.isInteger(idx) || idx < 0) return;
        interleavedNotes[idx] = value;
      });
      if (!mainNoteText && !Object.keys(interleavedNotes).length) return;
      noteEntryMap.set(id, { mainNoteText, interleavedNotes });
    });
    const renderTargets = new Map();
    for (const [id, domRefs] of domEntryMap.entries()) {
      const responseNode = domRefs?.responseNode;
      if (!(responseNode instanceof Element) || !responseNode.isConnected) continue;
      if (isBranchTurnNodeHidden(responseNode) || !isVisible(responseNode)) continue;
      renderTargets.set(responseNode, id);
    }

    const activeTurnIds = new Set(Array.from(renderTargets.values()));
    document.querySelectorAll(".gtf-inline-annotation-wrapper[data-turn-id]").forEach((node) => {
      const tid = String(node?.dataset?.turnId || "");
      if (tid && !activeTurnIds.has(tid)) node.remove();
    });
    document.querySelectorAll(".gtf-turn-share-bar[data-turn-id]").forEach((node) => {
      node.remove(); // Turn share bar is deprecated
    });
    document.querySelectorAll(".gtf-interleaved-container[data-turn-id]").forEach((node) => {
      const tid = String(node?.dataset?.turnId || "");
      if (tid && !activeTurnIds.has(tid)) node.remove();
    });

    for (const [responseNode, id] of renderTargets.entries()) {
      const noteData = noteEntryMap.get(id) || { mainNoteText: "", interleavedNotes: {} };
      // Turn share bar is deprecated, skip rendering
      const existingMain = document.querySelector(`.gtf-inline-annotation-wrapper[data-turn-id="${id}"]`);
      const mainFocused = existingMain?.contains(document.activeElement) || false;
      const mainPinned = existingMain?.dataset?.pinnedMain === "1";
      const shouldShowMain = Boolean(noteData.mainNoteText || mainFocused || mainPinned);
      if (shouldShowMain) {
        let annotationContainer = ensureSingleMainAnnotationContainer(responseNode, id);
        if (!annotationContainer) continue;
        annotationContainer.style.display = "block";
        ensureInlineAnnotationEditor(annotationContainer, {
          turnId: id,
          blockIndex: null,
          noteText: noteData.mainNoteText,
          placeholder: ct("inline_annotation_main_placeholder"),
          placeholderKey: "inline_annotation_main_placeholder",
          label: ct("inline_annotation_main_label"),
          labelKey: "inline_annotation_main_label",
          onSaved: (savedText) => {
            if (!savedText && !annotationContainer.contains(document.activeElement)) {
              collapseEmptyMainAnnotation(annotationContainer);
              return;
            }
            annotationContainer.style.display = "block";
          }
        });
      } else {
        document
          .querySelectorAll(`.gtf-inline-annotation-wrapper[data-turn-id="${id}"]`)
          .forEach((node) => node.remove());
      }
      if (!responseNode || !responseNode.isConnected || responseNode.querySelector(".generating-indicator")) continue;

      const interleavedIndices = Object.keys(noteData.interleavedNotes).map((key) => Number(key)).filter((n) => Number.isInteger(n) && n >= 0);
      const existingInterleaved = Array.from(
        responseNode.querySelectorAll(`.gtf-interleaved-container[data-turn-id="${id}"]`)
      );
      if (!interleavedIndices.length && !existingInterleaved.length) continue;

      let blocks = null;
      if (interleavedIndices.length) {
        blocks = getResponseBlocks(responseNode);
        interleavedIndices.forEach((idx) => {
          const block = blocks[idx];
          if (!block) return;
          let container = responseNode.querySelector(
            `.gtf-interleaved-container[data-turn-id="${id}"][data-block-index="${idx}"]`
          );
          if (!container) {
            container = document.createElement("div");
            container.className = "gtf-interleaved-container";
            container.dataset.turnId = id;
            container.dataset.blockIndex = String(idx);
            block.insertAdjacentElement("afterend", container);
          }

          const noteText = noteData.interleavedNotes[idx];
          const editor = ensureInlineAnnotationEditor(container, {
            turnId: id,
            blockIndex: idx,
            noteText,
            placeholder: ct("inline_annotation_interleaved_placeholder"),
            placeholderKey: "inline_annotation_interleaved_placeholder",
            label: ct("inline_annotation_interleaved_label"),
            labelKey: "inline_annotation_interleaved_label",
            onSaved: (savedText) => {
              if (!savedText && document.activeElement !== editor) {
                removeEmptyInterleavedAnnotation(container);
              }
            }
          });
          if (noteText) {
            container.classList.add("has-note");
            container.style.display = "block";
          }
        });
      }

      existingInterleaved.forEach((container) => {
        const idx = Number(container?.dataset?.blockIndex);
        const noteText = Number.isInteger(idx) ? String(noteData.interleavedNotes[idx] || "") : "";
        const active = container.contains(document.activeElement);
        const editingActive = Number(container?.dataset?.editingUntil || 0) > Date.now();
        const justOpened = Number(container?.dataset?.justOpenedUntil || 0) > Date.now();
        const savingOrEditing = container?.dataset?.state === "saving" || container?.dataset?.state === "editing";
        const textarea = container.querySelector(".gtf-inline-annotation-textarea");
        const localDraftText = String(textarea?.value || "").trim();
        if (!noteText && !active && !editingActive && !justOpened && !savingOrEditing && !localDraftText) {
          container.remove();
          return;
        }
        if (noteText) {
          container.classList.add("has-note");
          container.style.display = "block";
        }
      });
    }
  } finally {
    recordPerf("syncInlineAnnotations", perfStartedAt, { force: Boolean(force) });
    inlineAnnotationSyncInFlight = false;
    if (inlineAnnotationSyncPending) {
      inlineAnnotationSyncPending = false;
      scheduleInlineAnnotationSync(120);
    }
  }
}
async function renderNativeChatTimeline() {
  const perfStartedAt = perfNow();
  if (lowPowerModeEnabled) {
    cleanupNativeChatTimeline();
    recordPerf("renderNativeChatTimeline", perfStartedAt, { skipped: true, reason: "low-power" });
    return;
  }
  await syncContentLocaleFromStorage(true);
  const token = ++nativeChatTimelineRenderToken;
  const root = ensureNativeChatTimelineRoot();
  positionNativeChatTimeline(root);
  scheduleNativeTimelinePositionUpdate();
  if (!(root instanceof HTMLElement) || !(nativeChatTimelineList instanceof HTMLElement)) {
    recordPerf("renderNativeChatTimeline", perfStartedAt, { skipped: true, reason: "no-root" });
    return;
  }
  if (!isConcreteConversationId(currentConversationId)) {
    nativeChatTimelineEmptyRetryCount = 0;
    nativeChatTimelineDotMap = new Map();
    nativeChatTimelineActiveDot = null;
    // Keep the rail visible on the Gemini home screen so users can still open the side panel.
    root.hidden = false;
    nativeChatTimelineList.innerHTML = "";
    updateNativeTimelineFilterButtons([]);
    hideNativeTimelineBookmarkMenu();
    recordPerf("renderNativeChatTimeline", perfStartedAt, { skipped: true, reason: "no-conversation" });
    return;
  }
  await ensureNativeTimelineHighlightsLoaded(false);

  const turns = await loadNativeChatTimelineTurns();
  if (token !== nativeChatTimelineRenderToken) {
    recordPerf("renderNativeChatTimeline", perfStartedAt, { skipped: true, reason: "stale-token" });
    return;
  }

  if (!turns.length) {
    const retryCount = nativeChatTimelineEmptyRetryCount;
    nativeChatTimelineEmptyRetryCount = Math.min(4, retryCount + 1);
    if (retryCount < 4) {
      // Route switch / hydration can temporarily return empty turns, retry a few times.
      queueScan();
      scheduleNativeChatTimelineRender(
        NATIVE_TIMELINE_EMPTY_RETRY_BASE_MS + retryCount * NATIVE_TIMELINE_EMPTY_RETRY_STEP_MS,
        { bypassMinGap: true }
      );
    }
    nativeChatTimelineDotMap = new Map();
    nativeChatTimelineActiveDot = null;
    root.hidden = true;
    nativeChatTimelineList.innerHTML = "";
    nativeChatTimelineLastTurnsJSON = "";
    updateNativeTimelineFilterButtons([]);
    hideNativeTimelineBookmarkMenu();
    recordPerf("renderNativeChatTimeline", perfStartedAt, { count: 0 });
    return;
  }
  nativeChatTimelineEmptyRetryCount = 0;
  const validTurnIds = new Set(turns.map((item) => item.id).filter(Boolean));
  let cleaned = false;
  Array.from(nativeChatTimelineBookmarks.keys()).forEach((id) => {
    if (validTurnIds.has(id)) return;
    nativeChatTimelineBookmarks.delete(id);
    cleaned = true;
  });
  if (cleaned) queuePersistNativeTimelineHighlights();
  updateNativeTimelineFilterButtons(turns);

  const turnsSignature = buildNativeTimelineTurnsSignature(turns);
  if (turnsSignature === nativeChatTimelineLastTurnsJSON && root.hidden === false) {
    // Only update active state
    if (!turns.some((item) => item.id === nativeChatTimelineActiveTurnId)) {
      nativeChatTimelineActiveTurnId = turns[turns.length - 1]?.id || "";
    }
    turns.forEach((turn, idx) => {
      const dot = nativeChatTimelineDotMap.get(turn.id);
      if (!(dot instanceof HTMLElement)) return;
      dot.classList.toggle("has-note", turn.hasNote);
      applyNativeTimelineDotBookmarkState(dot, turn, idx);
    });
    updateNativeTimelineFollowupStatus();
    applyNativeTimelineActiveState();
    scheduleInlineAnnotationSync(NATIVE_TIMELINE_UNCHANGED_ANNOTATION_SYNC_MS);
    scheduleNativeTimelineActiveSync();
    recordPerf("renderNativeChatTimeline", perfStartedAt, { count: turns.length, changed: false });
    return;
  }
  
  nativeChatTimelineLastTurnsJSON = turnsSignature;
  nativeChatTimelineTurnsCache = turns;
  nativeChatTimelineDotMap = new Map();
  nativeChatTimelineActiveDot = null;
  root.hidden = false;
  nativeChatTimelineList.innerHTML = "";
  if (!turns.some((item) => item.id === nativeChatTimelineActiveTurnId)) {
    nativeChatTimelineActiveTurnId = turns[turns.length - 1]?.id || "";
  }

  const fragment = document.createDocumentFragment();
  turns.forEach((turn, idx) => {
    const li = document.createElement("li");
    li.className = "gtf-native-chat-timeline-item";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gtf-native-chat-timeline-dot";
    btn.dataset.turnId = turn.id;
    nativeChatTimelineDotMap.set(turn.id, btn);
    if (turn.hasNote) btn.classList.add("has-note");
    if (turn.id === nativeChatTimelineActiveTurnId) {
      btn.classList.add("active");
      nativeChatTimelineActiveDot = btn;
    }
    const toggleHighlightUi = () => {
      toggleNativeTimelineHighlight(turn.id);
      applyNativeTimelineDotBookmarkState(btn, turn, idx);
      updateNativeTimelineFilterButtons(turns);
      scheduleNativeChatTimelineRender(10);
    };
    applyNativeTimelineDotBookmarkState(btn, turn, idx);
    btn.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showNativeTimelineBookmarkMenu(turn.id, btn);
    });
    btn.addEventListener("click", (event) => {
      if (event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        toggleHighlightUi();
        return;
      }
      nativeChatTimelineActiveTurnId = turn.id;
      applyNativeTimelineActiveState();
      hideNativeTimelineBookmarkMenu();
      notifySidePanelTurnActivated(turn.id, {
        syncScroll: false,
        force: true
      });
      const target = findResponseByLocator(
        turn.id,
        Number.isInteger(turn.domIndex) ? turn.domIndex : null
      );
      if (target) {
        scrollTimelineTargetIntoView(target, turn.id, { force: true });
      }
    });
    li.appendChild(btn);
    fragment.appendChild(li);
  });
  nativeChatTimelineList.appendChild(fragment);
  updateNativeTimelineFollowupStatus();

  // Sync inline annotations to DOM
  scheduleInlineAnnotationSync(NATIVE_TIMELINE_CHANGED_ANNOTATION_SYNC_MS);
  scheduleNativeTimelineActiveSync();
  updateNativeTimelineFilterButtons(turns);
  recordPerf("renderNativeChatTimeline", perfStartedAt, { count: turns.length, changed: true });
}

function scheduleNativeChatTimelineRender(delay = 120, options = {}) {
  if (document.hidden) return;
  if (lowPowerModeEnabled) {
    cleanupNativeChatTimeline();
    return;
  }
  const bypassDefer = Boolean(options?.bypassDefer);
  const bypassMinGap = Boolean(options?.bypassMinGap);
  if (!bypassDefer && shouldDeferConversationHeavyWork()) {
    delay = Math.max(
      delay,
      Math.max(
        120,
        routeSwitchSettledUntil - Date.now(),
        contentBootHeavyWorkUntil - Date.now(),
        layoutResizeActiveUntil - Date.now()
      )
    );
  }
  const minGapMs = bypassMinGap ? 0 : isLowPowerLayoutMode() ? DUAL_SIDEBAR_TIMELINE_MIN_RENDER_MS : 120;
  const elapsedMs = Date.now() - nativeChatTimelineLastScheduleAt;
  const adaptiveDelay = bypassMinGap ? 0 : Math.max(0, minGapMs - elapsedMs);
  if (nativeChatTimelineRenderTimer) clearTimeout(nativeChatTimelineRenderTimer);
  nativeChatTimelineRenderTimer = setTimeout(() => {
    nativeChatTimelineRenderTimer = null;
    nativeChatTimelineLastScheduleAt = Date.now();
    renderNativeChatTimeline().catch((error) => {
      console.warn("[Gemini Timeline] renderNativeChatTimeline failed", error);
    });
  }, Math.max(0, delay, adaptiveDelay));
}

function watchNativeChatTimeline() {
  if (lowPowerModeEnabled) {
    cleanupNativeChatTimeline();
    return;
  }
  ensureNativeChatTimelineRoot();
  scheduleNativeChatTimelineRender(180);
  if (ENABLE_NATIVE_MAIN_NOTE) {
    scheduleNativeMainConversationNoteRender(220, true);
  }
  if (nativeChatTimelinePollTimer) clearInterval(nativeChatTimelinePollTimer);
  nativeChatTimelinePollTimer = setInterval(() => {
    if (document.hidden) return;
    if (isLayoutResizing()) return;
    scheduleNativeChatTimelineRender(0);
    if (ENABLE_NATIVE_MAIN_NOTE) {
      scheduleNativeMainConversationNoteRender(0);
    }
  }, NATIVE_TIMELINE_POLL_MS);
  if (!nativeChatTimelineListenersBound) {
    nativeChatTimelineListenersBound = true;
    window.addEventListener("resize", () => {
      scheduleNativeTimelinePositionSettle();
      markLayoutResizing(NATIVE_TIMELINE_RESIZE_SETTLE_MS);
    });
    window.visualViewport?.addEventListener?.("resize", () => {
      scheduleNativeTimelinePositionSettle();
      markLayoutResizing(NATIVE_TIMELINE_RESIZE_SETTLE_MS);
    });
    window.visualViewport?.addEventListener?.("scroll", () => {
      scheduleNativeTimelinePositionUpdate();
    });
    document.addEventListener("scroll", (event) => {
      if (!shouldSyncNativeTimelineForScrollTarget(event.target)) return;
      scheduleNativeTimelinePositionUpdate();
      scheduleNativeTimelineActiveSync();
    }, { passive: true, capture: true });
  }
}

function scheduleNonCriticalInit(task, delay = 0) {
  const runner = () => {
    try {
      task();
    } catch (error) {
      console.warn("[Gemini Timeline] non-critical init task failed", error);
    }
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => {
      if (delay > 0) {
        setTimeout(runner, delay);
      } else {
        runner();
      }
    }, { timeout: 1200 });
    return;
  }
  setTimeout(runner, Math.max(0, delay));
}

function findSidebarRegion() {
  const preferredCandidates = Array.from(
    document.querySelectorAll(
      "[data-test-id='overflow-container'], [data-test-id='side-nav-content'], [data-test-id='all-conversations']"
    )
  ).filter((item) => item instanceof Element && isVisible(item));
  if (preferredCandidates.length) {
    const best = preferredCandidates
      .map((root) => {
        const testId = (root.getAttribute("data-test-id") || "").toLowerCase();
        const rect = root.getBoundingClientRect();
        if (rect.width < 120 || rect.height < 120) return null;
        if (rect.left > window.innerWidth * 0.46) return null;
        if (rect.bottom < 120) return null;
        let score = 0;
        if (testId === "overflow-container") score += 120;
        else if (testId === "side-nav-content") score += 90;
        else if (testId === "all-conversations") score += 40;
        if (root.scrollHeight > root.clientHeight + 12) score += 50;
        score += Math.min(30, root.querySelectorAll("a[href*='/app/']").length);
        if (rect.height > 0) score += Math.min(24, rect.height / 35);
        return { root, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    if (best[0]?.root) return best[0].root;
  }

  const candidates = new Set(
    Array.from(
      document.querySelectorAll("aside, nav, [role='navigation'], [class*='sidebar'], [class*='sidenav'], [class*='drawer']")
    )
  );

  document.querySelectorAll("a[href*='/app/']").forEach((anchor) => {
    let cursor = anchor;
    for (let depth = 0; depth < 7 && cursor; depth += 1) {
      if (!(cursor instanceof Element)) break;
      candidates.add(cursor);
      cursor = cursor.parentElement;
    }
  });

  const scored = Array.from(candidates)
      .map((root) => {
        if (!(root instanceof Element)) return null;
        const rect = root.getBoundingClientRect();
        if (rect.width < 120) return null;
        if (rect.left > window.innerWidth * 0.42) return null;
        if (rect.height < window.innerHeight * 0.3) return null;
        if (rect.bottom < window.innerHeight * 0.35) return null;

        const appLinks = root.querySelectorAll("a[href*='/app/']").length;
        const navNodes = root.querySelectorAll("a, [role='button'], button, li").length;
        if (appLinks < 1 && navNodes < 4) return null;

      const text = normalizeText(root.textContent || "").toLowerCase();
      const notebookHit = text.includes("\u7b14\u8bb0\u672c") || text.includes("notebook");
      const dialogHit = text.includes("\u5bf9\u8bdd") || text.includes("chats");
      const newChatHit = text.includes("\u53d1\u8d77\u65b0\u5bf9\u8bdd") || text.includes("new chat");
      const gemHit = text.includes("gem");

      const score =
        appLinks * 2.4 +
        navNodes * 0.12 +
        (notebookHit ? 10 : 0) +
        (dialogHit ? 6 : 0) +
        (newChatHit ? 5 : 0) +
        (gemHit ? 3 : 0) -
        rect.left / 22;

      return { root, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.root || null;
}

function findSidebarRegionCached(maxAgeMs = SIDEBAR_REGION_CACHE_MS) {
  const cacheAge = Date.now() - sidebarRegionCacheAt;
  if (
    sidebarRegionCacheNode instanceof Element &&
    sidebarRegionCacheNode.isConnected &&
    isVisible(sidebarRegionCacheNode) &&
    cacheAge <= Math.max(120, Number(maxAgeMs) || SIDEBAR_REGION_CACHE_MS)
  ) {
    return sidebarRegionCacheNode;
  }
  const detected = findSidebarRegion();
  sidebarRegionCacheNode = detected instanceof Element ? detected : null;
  sidebarRegionCacheAt = Date.now();
  return sidebarRegionCacheNode;
}

function findNativeSidebarToggleButton() {
  const candidates = Array.from(document.querySelectorAll("button, [role='button']"))
    .filter((node) => node instanceof HTMLElement)
    .filter((node) => isVisible(node));
  let best = null;

  candidates.forEach((node) => {
    const label = normalizeText(
      node.getAttribute("aria-label") || node.getAttribute("title") || node.textContent || ""
    ).toLowerCase();
    const controls = (node.getAttribute("aria-controls") || "").toLowerCase();
    const expanded = (node.getAttribute("aria-expanded") || "").toLowerCase();
    const rect = node.getBoundingClientRect();
    if (rect.width < 14 || rect.height < 14) return;
    if (rect.left > 180 || rect.top > 180) return;

    let score = 0;
    if (expanded === "true") score += 12;
    if (expanded === "false") score -= 8;
    if (/menu|sidebar|navigation|drawer|nav|侧边栏|菜单|导航|折叠|展开|历史记录|会话/.test(label)) score += 6;
    if (/side|nav|drawer|menu|history/.test(controls)) score += 5;
    if (rect.left < 96 && rect.top < 96) score += 3;
    if (rect.width <= 56 && rect.height <= 56) score += 2;

    if (!best || score > best.score) {
      best = { node, score };
    }
  });

  return best && best.score >= 10 ? best.node : null;
}

function collapseNativeSidebarIfAutoOpened() {
  const detectedSidebar = findSidebarRegionCached();
  if (!(detectedSidebar instanceof Element)) return false;
  const rect = detectedSidebar.getBoundingClientRect();
  if (rect.width < 220 || rect.height < 140) return false;

  const toggleBtn = findNativeSidebarToggleButton();
  if (!(toggleBtn instanceof HTMLElement)) return false;
  if ((toggleBtn.getAttribute("aria-expanded") || "").toLowerCase() === "false") return false;

  try {
    toggleBtn.click();
    return true;
  } catch {
    return false;
  }
}

function findSidebarConversationSection(sidebarRoot) {
  if (!(sidebarRoot instanceof Element)) return null;

  const direct = sidebarRoot.querySelector("[data-test-id='all-conversations']");
  if (direct instanceof Element) return direct;

  const history = sidebarRoot.querySelector(".chat-history");
  if (history instanceof Element) return history;

  const firstConversation = sidebarRoot.querySelector("[data-test-id='conversation']");
  if (firstConversation instanceof Element) {
    return (
      firstConversation.closest("[data-test-id='all-conversations'], .chat-history, ul, section, div") ||
      firstConversation
    );
  }

  return null;
}

function setNativeFolderPanelVisibility(visible) {
  const shell = document.getElementById("gtf-native-folder-shell");
  const panel = document.getElementById("gtf-native-folder-panel");
  const applyHidden = (el) => {
    if (!(el instanceof HTMLElement)) return;
    el.hidden = true;
    el.style.display = "none";
    el.style.height = "0";
    el.style.minHeight = "0";
    el.style.maxHeight = "0";
    el.style.overflow = "hidden";
    el.style.margin = "0";
    el.style.padding = "0";
    el.style.pointerEvents = "none";
  };
  const clearHidden = (el) => {
    if (!(el instanceof HTMLElement)) return;
    el.hidden = false;
    el.style.display = "";
    el.style.height = "";
    el.style.minHeight = "";
    el.style.maxHeight = "";
    el.style.overflow = "";
    el.style.margin = "";
    el.style.padding = "";
    el.style.pointerEvents = "";
  };
  if (visible) {
    clearHidden(shell);
    if (panel instanceof HTMLElement) {
      panel.hidden = false;
      panel.style.display = "flex";
      panel.style.pointerEvents = "";
    }
  } else {
    applyHidden(shell);
    if (panel instanceof HTMLElement && panel.parentElement !== shell) {
      applyHidden(panel);
    }
    hideNativeFolderContextMenu();
  }
}

function cleanupNativeSidebarWidget() {
  if (nativeFolderPanelRenderTimer) {
    clearTimeout(nativeFolderPanelRenderTimer);
    nativeFolderPanelRenderTimer = null;
  }
  if (nativeSidebarMutationTimer) {
    clearTimeout(nativeSidebarMutationTimer);
    nativeSidebarMutationTimer = null;
  }
  if (nativeSidebarHealthTimer) {
    clearTimeout(nativeSidebarHealthTimer);
    nativeSidebarHealthTimer = null;
  }
  if (nativeSidebarMutationObserver) {
    nativeSidebarMutationObserver.disconnect();
    nativeSidebarMutationObserver = null;
  }
  nativeSidebarObservedRoot = null;
  nativeFolderPanelRoot = null;
  nativeFolderPanelShell = null;
  nativeSidebarMutationSignature = "";
  nativeSidebarScrollQuietUntil = 0;
  nativePanelQuietUntil = 0;
  nativePanelRendering = false;
  hideNativeFolderContextMenu();
  [
    "gtf-native-folder-shell",
    "gtf-native-folder-panel",
    "gtf-native-folder-panel-style",
    "gtf-native-folder-context-menu"
  ].forEach((id) => {
    const node = document.getElementById(id);
    if (node && node.parentElement) node.parentElement.removeChild(node);
  });
}

function shouldHideNativeFolderPanelByLayout(detectedSidebar, sidebarHost, sidebarMount) {
  const rects = [detectedSidebar, sidebarHost, sidebarMount]
    .filter((node) => node instanceof Element)
    .map((node) => node.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  if (!rects.length) return true;
  const effectiveWidth = Math.min(...rects.map((rect) => rect.width));
  if (effectiveWidth < 210) return true;

  const candidateRoot = sidebarHost instanceof Element ? sidebarHost : detectedSidebar;
  if (!(candidateRoot instanceof Element)) return true;
  const visibleConversationAnchors = Array.from(candidateRoot.querySelectorAll("a[href*='/app/']"))
    .filter((node) => node instanceof HTMLAnchorElement)
    .filter((node) => {
      const text = normalizeText(node.innerText || node.textContent || "");
      const rect = node.getBoundingClientRect();
      return text.length >= 2 && rect.width >= 80 && rect.height >= 14;
    });
  return visibleConversationAnchors.length === 0;
}

function resolveSidebarHost(sidebarRoot) {
  if (!(sidebarRoot instanceof Element)) return null;
  const direct = sidebarRoot.matches("[data-test-id='side-nav-content']")
    ? sidebarRoot
    : sidebarRoot.closest("[data-test-id='side-nav-content']");
  if (direct instanceof Element && isVisible(direct)) return direct;
  const overflowParent = sidebarRoot.matches("[data-test-id='overflow-container']")
    ? sidebarRoot.parentElement
    : sidebarRoot.closest("[data-test-id='overflow-container']")?.parentElement;
  if (overflowParent instanceof Element && isVisible(overflowParent)) return overflowParent;
  const nav = sidebarRoot.closest("aside, nav, [role='navigation']");
  if (nav instanceof Element && isVisible(nav)) return nav;
  return sidebarRoot;
}

function resolveSidebarMountTarget(sidebarHost, detectedSidebar) {
  if (sidebarHost instanceof Element) {
    const overflowInsideHost = sidebarHost.querySelector("[data-test-id='overflow-container']");
    if (overflowInsideHost instanceof Element && isVisible(overflowInsideHost)) return overflowInsideHost;
  }
  if (detectedSidebar instanceof Element) {
    if (
      detectedSidebar.matches("[data-test-id='overflow-container']") ||
      detectedSidebar.getAttribute("data-test-id") === "all-conversations"
    ) {
      return detectedSidebar;
    }
    const overflowNearDetected = detectedSidebar.querySelector("[data-test-id='overflow-container']");
    if (overflowNearDetected instanceof Element && isVisible(overflowNearDetected)) return overflowNearDetected;
  }
  if (sidebarHost instanceof Element && isVisible(sidebarHost)) return sidebarHost;
  if (detectedSidebar instanceof Element && isVisible(detectedSidebar)) return detectedSidebar;
  return null;
}

function runNativeSidebarHealthCheck(panel, mountTarget, sidebarHost) {
  if (!(panel instanceof Element) || !(mountTarget instanceof Element)) {
    return { ok: false, reasons: ["missing-node"], shouldRemount: true };
  }
  const reasons = [];

  if (!isVisible(panel)) reasons.push("panel-hidden");

  const panelRect = panel.getBoundingClientRect();
  const hostRect = (sidebarHost instanceof Element ? sidebarHost : mountTarget).getBoundingClientRect();
  if (panelRect.top < hostRect.top - 8 || panelRect.left < hostRect.left - 8 || panelRect.right > hostRect.right + 8) {
    reasons.push("panel-out-of-host");
  }

  const siblings = Array.from(mountTarget.children).filter((node) => node instanceof Element && node !== panel && isVisible(node));
  const firstSibling = siblings[0] || null;
  if (firstSibling instanceof Element) {
    const siblingRect = firstSibling.getBoundingClientRect();
    const overlapY = Math.min(panelRect.bottom, siblingRect.bottom) - Math.max(panelRect.top, siblingRect.top);
    if (overlapY > 8) reasons.push("panel-overlap");
  }

  const scrollNode = mountTarget.matches("[data-test-id='overflow-container']")
    ? mountTarget
    : mountTarget.querySelector("[data-test-id='overflow-container']");
  if (scrollNode instanceof Element) {
    const cs = getComputedStyle(scrollNode);
    if (scrollNode.scrollHeight > scrollNode.clientHeight + 12 && cs.overflowY === "hidden") {
      reasons.push("scroll-locked");
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    shouldRemount: reasons.some((reason) => reason === "panel-hidden" || reason === "panel-overlap" || reason === "panel-out-of-host")
  };
}

function resolveSidebarScrollContainer(sidebarHost, detectedSidebar, mountTarget) {
  const candidates = [
    mountTarget,
    sidebarHost,
    detectedSidebar,
    sidebarHost instanceof Element ? sidebarHost.querySelector("[data-test-id='overflow-container']") : null,
    detectedSidebar instanceof Element ? detectedSidebar.querySelector("[data-test-id='overflow-container']") : null
  ];
  for (const node of candidates) {
    if (!(node instanceof Element)) continue;
    if (node.scrollHeight > node.clientHeight + 12) return node;
    let parent = node.parentElement;
    while (parent instanceof Element) {
      if (parent.scrollHeight > parent.clientHeight + 12) return parent;
      parent = parent.parentElement;
    }
  }
  return null;
}

function findNotebookAnchorNode(sidebarRoot) {
  if (!sidebarRoot) return null;
  const all = Array.from(sidebarRoot.querySelectorAll("div, span, p, h2, h3, button, a, li"));
  const pickByKeywords = (keywords) => {
    const hit = all.find((node) => {
      const text = normalizeText(node.textContent || "").toLowerCase();
      if (!text || text.length > 44) return false;
      return keywords.some((key) => text === key || text.includes(key));
    });
    if (!hit) return null;
    return hit.closest("[role='button'], a, li, div, section, nav") || hit;
  };

  const notebookAnchor = pickByKeywords(["\u7b14\u8bb0\u672c", "notebook", "notebooks"]);
  if (notebookAnchor) return notebookAnchor;

  const secondaryAnchor = pickByKeywords(["gem", "\u5bf9\u8bdd", "chat", "chats"]);
  if (secondaryAnchor) return secondaryAnchor;

  return (
    sidebarRoot.querySelector("a[href*='/app/']")?.closest("li, div, section, nav, a") ||
    sidebarRoot.firstElementChild ||
    null
  );
}

function buildNativeConversationCatalog(homeIndexEntries) {
  const map = new Map();
  const currentScope = getAccountScopeFromUrl(location.href);
  
  // First, populate with cached entries to ensure we don't lose them
  (Array.isArray(homeIndexEntries) ? homeIndexEntries : []).forEach((item) => {
    const normalizedConversationId = forceConversationToScope(item.conversationId || item.url || "", currentScope);
    if (!isConcreteConversationId(normalizedConversationId)) return;
    map.set(normalizedConversationId, {
      conversationId: normalizedConversationId,
      title: item.title || "\u672A\u547D\u540D\u4F1A\u8BDD",
      url: normalizedConversationId
    });
  });

  // Then, override/add with currently visible sidebar conversations
  collectSidebarConversations(400).forEach((item) => {
    const normalizedConversationId = forceConversationToScope(item.conversationId || item.url || "", currentScope);
    if (!isConcreteConversationId(normalizedConversationId)) return;
    const old = map.get(normalizedConversationId);
    map.set(normalizedConversationId, {
      conversationId: normalizedConversationId,
      title: item.title || old?.title || "\u672A\u547D\u540D\u4F1A\u8BDD",
      url: normalizedConversationId
    });
  });

  return Array.from(map.values());
}

function reorderCustomFolders(folders, dragId, targetId) {
  if (!dragId || !targetId || dragId === targetId) return folders;
  const fixed = folders.find((item) => item.id === HOME_DEFAULT_FOLDER_ID) || { id: HOME_DEFAULT_FOLDER_ID, name: "\u672A\u5206\u7C7B" };
  const custom = folders.filter((item) => item.id !== HOME_DEFAULT_FOLDER_ID);
  const from = custom.findIndex((item) => item.id === dragId);
  const to = custom.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0) return folders;

  const nextCustom = custom.slice();
  const [moved] = nextCustom.splice(from, 1);
  nextCustom.splice(to, 0, moved);
  return [fixed, ...nextCustom];
}

async function persistNativeHomeState(nextState) {
  const homeKey = getHomeStorageKey();
  const result = await storageGet(homeKey);
  const raw = result?.[homeKey] || {};
  const normalized = normalizeHomeStateForNative({
    ...raw,
    ...nextState
  });
  nativeFolderPanelState = normalized;
  await storageSet({
    [homeKey]: {
      folders: normalized.folders,
      conversationFolderMap: normalized.conversationFolderMap,
      collapsedFolderIds: normalized.collapsedFolderIds
    }
  });
  if (nativePendingCollapsedIds) {
    const pendingSignature = JSON.stringify(nativePendingCollapsedIds);
    const savedSignature = JSON.stringify(normalized.collapsedFolderIds || []);
    if (pendingSignature === savedSignature) {
      nativePendingCollapsedIds = null;
    }
  }
}

function buildNativeFolderGroups(catalog, folders, conversationFolderMap) {
  const groups = new Map();
  const visibleIds = new Set();
  groups.set(HOME_DEFAULT_FOLDER_ID, []);
  visibleIds.add(HOME_DEFAULT_FOLDER_ID);

  folders.forEach((folder) => {
    if (folder.id === HOME_DEFAULT_FOLDER_ID) return;
    groups.set(folder.id, []);
    visibleIds.add(folder.id);
  });

  catalog.forEach((item) => {
    const folderId = conversationFolderMap[item.conversationId];
    const resolvedFolderId = folderId && visibleIds.has(folderId) ? folderId : HOME_DEFAULT_FOLDER_ID;
    if (!groups.has(resolvedFolderId)) groups.set(resolvedFolderId, []);
    groups.get(resolvedFolderId).push(item);
  });

  return groups;
}



function buildNativeFolderChildrenMap(folders) {
  const children = new Map();
  children.set(null, []);
  const source = Array.isArray(folders) ? folders : [];
  const defaultFolder = source.find((folder) => folder.id === HOME_DEFAULT_FOLDER_ID) || {
    id: HOME_DEFAULT_FOLDER_ID,
    name: "\u672A\u5206\u7C7B",
    parentId: null
  };
  children.get(null).push({ ...defaultFolder, parentId: null });

  const custom = source.filter((folder) => folder.id !== HOME_DEFAULT_FOLDER_ID);
  const idSet = new Set(custom.map((folder) => folder.id));

  custom.forEach((folder) => {
    const parentId = folder.parentId && idSet.has(folder.parentId) ? folder.parentId : null;
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push({ ...folder, parentId });
  });

  return children;
}

function shortenNativeTitle(title, max = 16) {
  const text = normalizeText(title || "");
  if (!text) return "\u672a\u547d\u540d\u4f1a\u8bdd";
  return text.length > max ? text.slice(0, max) + "\u2026" : text;
}


function canNestFolder(folders, dragId, targetId) {
  if (!dragId || !targetId || dragId === targetId) return false;
  const byId = new Map((folders || []).map((folder) => [folder.id, folder]));
  if (!byId.has(dragId) || !byId.has(targetId)) return false;

  let cursor = byId.get(targetId);
  const visited = new Set();
  while (cursor && cursor.parentId) {
    if (cursor.parentId === dragId) return false;
    if (visited.has(cursor.parentId)) break;
    visited.add(cursor.parentId);
    cursor = byId.get(cursor.parentId);
  }
  return true;
}

function canUseSidebarDnD() {
  return true;
}

function enhanceOriginalSidebarConversationDnD(sidebarRoot) {
  const allowDnD = canUseSidebarDnD();
  const root = (sidebarRoot instanceof Element) ? sidebarRoot : document;
  const now = Date.now();
  if (root === nativeSidebarDndEnhanceRoot && now - nativeSidebarDndEnhanceAt < SIDEBAR_DND_ENHANCE_MIN_MS) {
    return;
  }
  nativeSidebarDndEnhanceRoot = root;
  nativeSidebarDndEnhanceAt = now;
  const links = Array.from(root.querySelectorAll("a[href*='/app/']")).filter(
    (node) => node instanceof HTMLAnchorElement && !node.closest("#gtf-native-folder-panel")
  );

  links.forEach((link) => {
    const conversationId = toConversationId(link.href || "");
    if (!isConcreteConversationId(conversationId)) return;

    link.draggable = allowDnD;
    if (allowDnD && link.dataset.gtfDndListenerBound !== "1") {
      link.dataset.gtfDndListenerBound = "1";
      link.addEventListener("dragstart", (event) => {
        event.stopPropagation();
        const title = normalizeText(
          link.getAttribute("aria-label") || link.getAttribute("title") || link.innerText || link.textContent || ""
        ).slice(0, 140);
        
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
              type: "conversation",
              conversationId,
              url: link.href || conversationId,
              title
            })
          );
        }
      });
    }

    if (link.dataset.gtfDndBound === "1") return;
    link.dataset.gtfDndBound = "1";
    if (link.dataset.gtfPanelSyncBound !== "1") {
      link.dataset.gtfPanelSyncBound = "1";
      link.addEventListener("click", () => {
        const targetConversationId = forceConversationToScope(conversationId);
        requestPanelOpenConversation(targetConversationId).catch(() => {});
        try {
          chrome.runtime.sendMessage(
            {
              type: "GEMINI_ACTIVE_CONVERSATION_CHANGED",
              conversationId: targetConversationId,
              url: targetConversationId
            },
            () => void chrome.runtime?.lastError
          );
        } catch {}
      });
    }
  });
}

function scheduleNativeFolderPanelRender(force = false) {
  if (!ENABLE_NATIVE_SIDEBAR_WIDGET) {
    cleanupNativeSidebarWidget();
    return;
  }
  if (!force && Date.now() < nativeSidebarScrollQuietUntil) {
    if (nativeFolderPanelRenderTimer) clearTimeout(nativeFolderPanelRenderTimer);
    nativeFolderPanelRenderTimer = setTimeout(() => {
      nativeFolderPanelRenderTimer = null;
      scheduleNativeFolderPanelRender(force);
    }, Math.min(800, Math.max(120, nativeSidebarScrollQuietUntil - Date.now() + 80)));
    return;
  }
  if (!force && isLayoutResizing()) {
    if (nativeFolderPanelRenderTimer) clearTimeout(nativeFolderPanelRenderTimer);
    nativeFolderPanelRenderTimer = setTimeout(() => {
      nativeFolderPanelRenderTimer = null;
      scheduleNativeFolderPanelRender(force);
    }, 260);
    return;
  }
  const delayUntilQuiet = nativePanelQuietUntil - Date.now();
  if (!force && delayUntilQuiet > 0) {
    if (nativeFolderPanelRenderTimer) clearTimeout(nativeFolderPanelRenderTimer);
    nativeFolderPanelRenderTimer = setTimeout(() => {
      nativeFolderPanelRenderTimer = null;
      scheduleNativeFolderPanelRender(force);
    }, Math.min(800, Math.max(80, delayUntilQuiet + 60)));
    return;
  }
  if (nativePanelRendering) return;
  if (nativeFolderPanelRenderTimer) clearTimeout(nativeFolderPanelRenderTimer);
  nativeFolderPanelRenderTimer = setTimeout(() => {
    nativeFolderPanelRenderTimer = null;
    nativePanelRendering = true;
    renderNativeFolderPanel().catch((error) => {
      console.error("[Gemini Timeline] renderNativeFolderPanel failed", error);
    }).finally(() => {
      nativePanelRendering = false;
      nativePanelQuietUntil = Date.now() + 120;
    });
  }, force ? 0 : 60);
}

async function renderNativeFolderPanel() {
  if (!ENABLE_NATIVE_SIDEBAR_WIDGET) {
    cleanupNativeSidebarWidget();
    return;
  }
  const perfStartedAt = perfNow();
  const detectedSidebar = findSidebarRegionCached();
  if (!detectedSidebar) {
    setNativeFolderPanelVisibility(false);
    recordPerf("renderNativeFolderPanel", perfStartedAt, { skipped: true, reason: "no-sidebar" });
    return;
  }
  const sidebarHost = resolveSidebarHost(detectedSidebar) || detectedSidebar;
  const sidebarMount = resolveSidebarMountTarget(sidebarHost, detectedSidebar) || sidebarHost;
  let sidebarRoot = sidebarMount;
  let sidebarRect = sidebarRoot.getBoundingClientRect();
  if ((sidebarRect.width < 120 || sidebarRect.height < 120) && sidebarRoot.parentElement instanceof Element) {
    const parentRect = sidebarRoot.parentElement.getBoundingClientRect();
    if (parentRect.width >= 120 && parentRect.height >= 120) {
      sidebarRoot = sidebarRoot.parentElement;
      sidebarRect = sidebarRoot.getBoundingClientRect();
    }
  }
  const shouldHideByLayout = shouldHideNativeFolderPanelByLayout(detectedSidebar, sidebarHost, sidebarMount);
  if (sidebarRect.width < 120 || sidebarRect.height < 120 || shouldHideByLayout) {
    setNativeFolderPanelVisibility(false);
    recordPerf("renderNativeFolderPanel", perfStartedAt, { skipped: true, reason: "sidebar-too-small" });
    return;
  }

  makeNativeFolderSectionStyle();
  hideNativeFolderContextMenu();
  enhanceOriginalSidebarConversationDnD(sidebarMount);

  let panel = document.getElementById("gtf-native-folder-panel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "gtf-native-folder-panel";
    panel.setAttribute("data-gtf-native", "1");
  }
  let shell = document.getElementById("gtf-native-folder-shell");
  if (!(shell instanceof HTMLDivElement)) {
    shell = document.createElement("div");
    shell.id = "gtf-native-folder-shell";
  }
  if (panel.parentElement !== shell) shell.appendChild(panel);
  setNativeFolderPanelVisibility(true);
  panel.style.display = "flex";
  panel.style.maxHeight = "none";
  panel.style.overflow = "visible";
  nativeFolderPanelShell = shell;
  if (!panel.dataset.gtfInteractionBound) {
    const markQuiet = (ms = 1600) => {
      nativePanelQuietUntil = Math.max(nativePanelQuietUntil, Date.now() + ms);
    };
    panel.addEventListener("pointerdown", () => markQuiet(1800), true);
    panel.addEventListener("focusin", () => markQuiet(2000), true);
    panel.addEventListener("keydown", () => markQuiet(2000), true);
    panel.dataset.gtfInteractionBound = "1";
  }
  nativeFolderPanelRoot = shell;

  const notebookAnchor = findNotebookAnchorNode(sidebarMount);
  const conversationSection = findSidebarConversationSection(sidebarMount);
  const preferredAnchor = notebookAnchor || conversationSection;
  const resolveDirectChild = (root, node) => {
    if (!(root instanceof Element) || !(node instanceof Element)) return null;
    let cursor = node;
    while (cursor && cursor.parentElement && cursor.parentElement !== root) {
      cursor = cursor.parentElement;
    }
    return cursor?.parentElement === root ? cursor : null;
  };
  const insertBefore = resolveDirectChild(sidebarMount, preferredAnchor);

  if (insertBefore instanceof Element) {
    if (shell.parentElement !== sidebarMount) {
      sidebarMount.insertBefore(shell, insertBefore);
    } else if (shell.nextElementSibling !== insertBefore) {
      sidebarMount.insertBefore(shell, insertBefore);
    }
  } else if (shell.parentElement !== sidebarMount) {
    sidebarMount.appendChild(shell);
  }
  if (!isVisible(shell) && detectedSidebar instanceof Element && detectedSidebar !== sidebarMount) {
    const fallbackRoot = detectedSidebar;
    if (shell.parentElement !== fallbackRoot) {
      fallbackRoot.appendChild(shell);
    }
  }
  const health = runNativeSidebarHealthCheck(shell, sidebarMount, sidebarHost);
  debugState.sidebarHealthOk = health.ok;
  debugState.sidebarHealthReasons = health.reasons.join(",");
  debugState.sidebarHealthAt = Date.now();
  if (!health.ok) {
    console.warn("[Gemini Timeline] sidebar health check failed", {
      reasons: health.reasons,
      mountTestId: sidebarMount.getAttribute("data-test-id") || "",
      hostTestId: sidebarHost.getAttribute("data-test-id") || ""
    });
    debugState.lastError = `sidebar-health:${health.reasons.join(",")}`;
    if (health.shouldRemount && shell.parentElement !== sidebarMount) {
      sidebarMount.appendChild(shell);
    }
  }
  const scrollContainer = resolveSidebarScrollContainer(sidebarHost, detectedSidebar, sidebarMount);
  if (scrollContainer instanceof HTMLElement) {
    const cs = getComputedStyle(scrollContainer);
    if (scrollContainer.scrollHeight > scrollContainer.clientHeight + 8 && cs.overflowY === "hidden") {
      scrollContainer.style.overflowY = "auto";
      scrollContainer.style.touchAction = "pan-y";
      debugState.lastError = "sidebar-scroll-unlocked";
    }
  }
  if (!shell.dataset.gtfScrollProxyBound) {
    // Native scroll only: keep sidebar scrolling behavior fully owned by Gemini.
    shell.dataset.gtfScrollProxyBound = "native";
  }

  const homeKey = getHomeStorageKey();
  const homeIndexKey = getHomeIndexStorageKey();
  const storage = await storageGet([homeKey, homeIndexKey]);
  const homeState = normalizeHomeStateForNative(storage?.[homeKey] || {});
  if (Array.isArray(nativePendingCollapsedIds)) {
    homeState.collapsedFolderIds = [...nativePendingCollapsedIds];
  }
  nativeFolderPanelState = homeState;
  const homeIndexEntries = normalizeHomeIndexEntries(storage?.[homeIndexKey] || {});
  const catalog = buildNativeConversationCatalog(homeIndexEntries);
  queueNativeHomeIndexSync(catalog, homeIndexKey);
  const groups = buildNativeFolderGroups(catalog, homeState.folders, homeState.conversationFolderMap);
  const collapsedIds = new Set(Array.isArray(homeState.collapsedFolderIds) ? homeState.collapsedFolderIds : []);
  const folderChildrenMap = buildNativeFolderChildrenMap(homeState.folders);
  const customFolderCount = homeState.folders.filter((item) => item.id !== HOME_DEFAULT_FOLDER_ID).length;

  const loadActiveStudySession = async () => {
    const conversationId = toConversationId(location.href);
    if (!isConcreteConversationId(conversationId)) {
      return { conversationId: "", session: {}, entries: [] };
    }
    const key = toStorageKey(conversationId);
    const result = await storageGet(key);
    const session = result?.[key] || {};
    const entries = Array.isArray(session?.entries) ? session.entries : [];
    return { conversationId, session, entries };
  };

  const initialStudyState = await loadActiveStudySession();
  const currentEntryCount = initialStudyState.entries.length;
  const currentNoteCount = initialStudyState.entries.filter((entry) => normalizeText(entry?.studyNote || "") || entry?.studyNoteImage).length;

  panel.innerHTML = "";
  const title = document.createElement("div");
  title.className = "gtf-native-title gtf-native-title-static";
  title.innerHTML =
    '<span class="gtf-native-title-inner"><span class="gtf-native-title-icon gtf-native-icon">' +
    getNativeFolderIconSvg("closed") +
    '</span><span class="gtf-native-title-text">\u4f1a\u8bdd\u6587\u4ef6\u5939</span></span>';
  panel.appendChild(title);

  const actions = document.createElement("div");
  actions.className = "gtf-native-actions";
  const quickActions = document.createElement("div");
  quickActions.className = "gtf-native-quick-actions";

  const createQuickButton = (titleText, svgPath) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gtf-native-quick-btn";
    btn.title = titleText;
    btn.setAttribute("aria-label", titleText);
    btn.innerHTML = `<span class="gtf-native-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${svgPath}"/></svg></span>`;
    return btn;
  };

  const toggleCreateBtn = createQuickButton(
    "\u65b0\u5efa\u6587\u4ef6\u5939",
    "M11 4h2v6h6v2h-6v6h-2v-6H5v-2h6z"
  );
  const toggleFolderListBtn = createQuickButton(
    nativeFolderPanelUiState.folderListOpen ? "\u6536\u8d77\u5206\u7c7b\u5217\u8868" : "\u5c55\u5f00\u5206\u7c7b\u5217\u8868",
    "M4 6h16v2H4zm2 5h12v2H6zm3 5h6v2H9z"
  );
  toggleFolderListBtn.classList.toggle("active", nativeFolderPanelUiState.folderListOpen);
  const notebookBtn = createQuickButton(
    "\u5bfc\u51fa\u5230 NotebookLM",
    "M5 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 4v2h8V7zm0 4v2h8v-2zm0 4v2h5v-2zM19 3h1a1 1 0 0 1 1 1v15h-2z"
  );
  const quizBtn = createQuickButton(
    "\u751f\u6210\u81ea\u6d4b\u9898",
    "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm0 13.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zm0-9.9a3.2 3.2 0 0 0-3.2 3.2h2a1.2 1.2 0 1 1 2.4 0c0 .69-.42 1.1-1.15 1.62-.84.58-1.85 1.27-1.85 2.88v.3h2v-.2c0-.68.34-.97 1-1.43.89-.62 2-1.4 2-3.17A3.2 3.2 0 0 0 12 6.5z"
  );
  const reviewBtn = createQuickButton(
    "\u751f\u6210\u590d\u4e60\u8ba1\u5212",
    "M6 2h2v2h8V2h2v2h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V2zm13 8H5v9h14v-9zm-8 2h2v5h-2v-5zm3 2h2v3h-2v-3zm-6 1h2v2H8v-2z"
  );
  const refreshBtn = createQuickButton(
    "\u5237\u65b0\u9762\u677f",
    "M12 5a7 7 0 0 1 6.32 4H16v2h6V5h-2v2.1A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7z"
  );

  quickActions.append(toggleFolderListBtn, toggleCreateBtn, notebookBtn, quizBtn, reviewBtn, refreshBtn);

  const metrics = document.createElement("div");
  metrics.className = "gtf-native-study-metrics";
  const appendMetricChip = (text, titleText) => {
    const chip = document.createElement("span");
    chip.className = "gtf-native-metric-chip";
    chip.textContent = text;
    if (titleText) chip.title = titleText;
    metrics.appendChild(chip);
  };
  appendMetricChip("\u5206\u7c7b " + customFolderCount, "\u5f53\u524d\u81ea\u5b9a\u4e49\u6587\u4ef6\u5939\u6570\u91cf");
  appendMetricChip("\u4f1a\u8bdd " + catalog.length, "\u5f53\u524d\u53ef\u89c1\u4f1a\u8bdd\u6570\u91cf");
  if (initialStudyState.conversationId) {
    appendMetricChip("\u8282\u70b9 " + currentEntryCount, "\u5f53\u524d\u4f1a\u8bdd\u5b66\u4e60\u8282\u70b9");
    appendMetricChip("\u7b14\u8bb0 " + currentNoteCount, "\u5f53\u524d\u4f1a\u8bdd\u5df2\u4fdd\u5b58\u7b14\u8bb0");
  }

  const createInline = document.createElement("div");
  createInline.className = "gtf-native-create-inline";
  createInline.hidden = !nativeFolderPanelUiState.createInlineOpen;
  const createInput = document.createElement("input");
  createInput.className = "gtf-native-inline-input";
  createInput.type = "text";
  createInput.maxLength = 32;
  createInput.placeholder = "\u65b0\u5efa\u6587\u4ef6\u5939\uff08\u53ef\u9009\u7236\u7ea7\uff09";
  createInput.value = nativeFolderPanelUiState.createDraftName || "";
  const parentSelect = document.createElement("select");
  parentSelect.className = "gtf-native-inline-select";
  const rootOpt = document.createElement("option");
  rootOpt.value = "";
  rootOpt.textContent = "\u9876\u7ea7";
  parentSelect.appendChild(rootOpt);
  nativeFolderPanelState.folders
    .filter((item) => item.id !== HOME_DEFAULT_FOLDER_ID)
    .forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = shortenNativeTitle(item.name, 10);
      parentSelect.appendChild(opt);
    });
  const createBtn = document.createElement("button");
  createBtn.type = "button";
  createBtn.className = "gtf-native-action-btn";
  createBtn.textContent = "\u4fdd\u5b58";
  const createStatus = document.createElement("p");
  createStatus.className = "gtf-native-inline-status";
  const setCreateStatus = (message = "", isError = false) => {
    nativeFolderPanelUiState.statusText = message;
    nativeFolderPanelUiState.statusError = Boolean(isError);
    createStatus.textContent = message;
    if (isError) createStatus.setAttribute("data-error", "1");
    else createStatus.removeAttribute("data-error");
  };

  const pushPromptToComposer = (prompt, successMessage) => {
    const input = findComposerInput();
    if (!input) {
      setCreateStatus("\u672a\u627e\u5230\u63d0\u95ee\u8f93\u5165\u6846\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u540e\u91cd\u8bd5\u3002", true);
      return;
    }
    fillComposerInput(input, prompt);
    setComposerCaretToEnd(input);
    input.focus();
    input.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setCreateStatus(successMessage || "\u5df2\u586b\u5165\u8f93\u5165\u6846\uff0c\u6309 Enter \u53d1\u9001\u3002");
  };

  const updateCreateToggleState = () => {
    nativeFolderPanelUiState.createInlineOpen = !createInline.hidden;
    toggleCreateBtn.classList.toggle("active", !createInline.hidden);
  };

  toggleCreateBtn.addEventListener("click", () => {
    createInline.hidden = !createInline.hidden;
    updateCreateToggleState();
    if (!createInline.hidden) {
      nativePanelQuietUntil = Date.now() + 2200;
      createInput.focus();
    }
  });
  toggleFolderListBtn.addEventListener("click", () => {
    nativeFolderPanelUiState.folderListOpen = !nativeFolderPanelUiState.folderListOpen;
    scheduleNativeFolderPanelRender(true);
  });

  refreshBtn.addEventListener("click", () => {
    setCreateStatus("\u6b63\u5728\u5237\u65b0...");
    scheduleNativeFolderPanelRender();
  });

  notebookBtn.addEventListener("click", async () => {
    const activeStudyState = await loadActiveStudySession();
    const { conversationId, session, entries } = activeStudyState;
    if (!conversationId) {
      setCreateStatus("\u8bf7\u5148\u8fdb\u5165\u5177\u4f53\u4f1a\u8bdd\uff0c\u518d\u53d1\u9001\u5230 NotebookLM\u3002", true);
      return;
    }
    if (!entries.length) {
      setCreateStatus("\u5f53\u524d\u4f1a\u8bdd\u6682\u65e0\u53ef\u5bfc\u51fa\u7684\u5b66\u4e60\u8bb0\u5f55\u3002", true);
      return;
    }

    const studyPack = buildNotebookLmStudyPack(conversationId, session);
    const copied = await copyTextToClipboard(studyPack);
    window.open("https://notebooklm.google.com/", "_blank", "noopener,noreferrer");
    if (copied) {
      setCreateStatus("\u5b66\u4e60\u5305\u5df2\u590d\u5236\uff0cNotebookLM \u5df2\u6253\u5f00\u3002");
    } else {
      setCreateStatus("NotebookLM \u5df2\u6253\u5f00\uff0c\u590d\u5236\u5931\u8d25\u8bf7\u624b\u52a8\u590d\u5236\u3002", true);
    }
  });

  quizBtn.addEventListener("click", async () => {
    const activeStudyState = await loadActiveStudySession();
    if (!activeStudyState.conversationId || !activeStudyState.entries.length) {
      setCreateStatus("\u8bf7\u5148\u5728\u5f53\u524d\u4f1a\u8bdd\u4e2d\u5b8c\u6210\u81f3\u5c11 1 \u8f6e\u95ee\u7b54\u3002", true);
      return;
    }
    const prompt = buildNativeLearningPrompt("quiz", activeStudyState.conversationId, activeStudyState.session);
    pushPromptToComposer(prompt, "\u81ea\u6d4b\u9898\u63d0\u793a\u8bcd\u5df2\u586b\u5165\u8f93\u5165\u6846\uff0c\u6309 Enter \u53d1\u9001\u3002");
  });

  reviewBtn.addEventListener("click", async () => {
    const activeStudyState = await loadActiveStudySession();
    if (!activeStudyState.conversationId || !activeStudyState.entries.length) {
      setCreateStatus("\u8bf7\u5148\u5728\u5f53\u524d\u4f1a\u8bdd\u4e2d\u5b8c\u6210\u81f3\u5c11 1 \u8f6e\u95ee\u7b54\u3002", true);
      return;
    }
    const prompt = buildNativeLearningPrompt("review", activeStudyState.conversationId, activeStudyState.session);
    pushPromptToComposer(prompt, "\u590d\u4e60\u8ba1\u5212\u63d0\u793a\u8bcd\u5df2\u586b\u5165\u8f93\u5165\u6846\uff0c\u6309 Enter \u53d1\u9001\u3002");
  });

  createBtn.addEventListener("click", async () => {
    const name = normalizeText(createInput.value || "").slice(0, 32);
    if (!name) {
      setCreateStatus("\u8BF7\u8F93\u5165\u6587\u4EF6\u5939\u540D\u79F0\u3002", true);
      return;
    }

    const idBase = name.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const baseId = idBase || ("folder-" + Date.now());
    let id = baseId;
    let n = 1;
    while (nativeFolderPanelState.folders.some((item) => item.id === id)) {
      id = `${baseId}-${n}`;
      n += 1;
    }
    const parentId = parentSelect.value || null;
    await persistNativeHomeState({ folders: [...nativeFolderPanelState.folders, { id, name, parentId }] });
    createInput.value = "";
    nativeFolderPanelUiState.createDraftName = "";
    nativeFolderPanelUiState.createDraftParentId = "";
    setCreateStatus(`????${name}`);
    createInline.hidden = true;
    updateCreateToggleState();
    scheduleNativeFolderPanelRender();
  });
  createInput.addEventListener("input", () => {
    nativeFolderPanelUiState.createDraftName = String(createInput.value || "").slice(0, 32);
    nativePanelQuietUntil = Date.now() + 3200;
  });
  createInput.addEventListener("keydown", (event) => {
    nativePanelQuietUntil = Date.now() + 3200;
    if (event.key === "Enter") {
      event.preventDefault();
      createBtn.click();
    }
  });
  createInput.addEventListener("focus", () => {
    nativePanelQuietUntil = Date.now() + 2400;
  });
  parentSelect.addEventListener("focus", () => {
    nativePanelQuietUntil = Date.now() + 2400;
  });
  parentSelect.addEventListener("mousedown", () => {
    nativePanelQuietUntil = Date.now() + 2400;
  });
  parentSelect.addEventListener("change", () => {
    nativeFolderPanelUiState.createDraftParentId = parentSelect.value || "";
    nativePanelQuietUntil = Date.now() + 1600;
  });
  if (nativeFolderPanelUiState.createDraftParentId && parentSelect.querySelector(`option[value="${nativeFolderPanelUiState.createDraftParentId}"]`)) {
    parentSelect.value = nativeFolderPanelUiState.createDraftParentId;
  } else {
    parentSelect.value = "";
    nativeFolderPanelUiState.createDraftParentId = "";
  }
  createInline.append(createInput, parentSelect, createBtn);
  actions.append(quickActions, metrics, createInline, createStatus);
  updateCreateToggleState();
  if (nativeFolderPanelUiState.statusText) {
    setCreateStatus(nativeFolderPanelUiState.statusText, nativeFolderPanelUiState.statusError);
  }
  panel.appendChild(actions);

  const startInlineRename = (folder, labelEl) => {
    if (!folder || !labelEl) return;
    if (folder.id === HOME_DEFAULT_FOLDER_ID) return;
    const host = labelEl.parentElement;
    if (!host || host.querySelector(".gtf-native-folder-rename-input")) return;

    nativePanelQuietUntil = Date.now() + 4000;
    const oldName = String(folder.name || "");
    const input = document.createElement("input");
    input.className = "gtf-native-folder-rename-input";
    input.type = "text";
    input.maxLength = 32;
    input.value = oldName;
    input.title = "\u6309 Enter \u4FDD\u5B58\uFF0CEsc \u53D6\u6D88";

    let finished = false;
    const finish = async (save) => {
      if (finished) return;
      finished = true;

      const cleanup = () => {
        if (input.isConnected) input.remove();
        labelEl.hidden = false;
      };

      if (!save) {
        cleanup();
        return;
      }

      const nextName = normalizeText(input.value || "").slice(0, 32);
      if (!nextName || nextName === oldName) {
        cleanup();
        return;
      }

      const duplicated = nativeFolderPanelState.folders.some(
        (item) => item.id !== folder.id && String(item.name || "").trim().toLowerCase() === nextName.toLowerCase()
      );
      if (duplicated) {
        cleanup();
        return;
      }

      try {
        const nextFolders = nativeFolderPanelState.folders.map((item) =>
          item.id === folder.id ? { ...item, name: nextName } : item
        );
        await persistNativeHomeState({ folders: nextFolders });
      } catch (error) {
        console.error("[Gemini Timeline] rename native folder failed", error);
      }
      cleanup();
      scheduleNativeFolderPanelRender();
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(true).catch((error) => {
          console.error("[Gemini Timeline] rename native folder failed", error);
        });
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(false).catch(() => {});
      }
    });

    input.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });

    input.addEventListener("blur", () => {
      finish(true).catch((error) => {
        console.error("[Gemini Timeline] rename native folder failed", error);
      });
    });

    labelEl.hidden = true;
    host.appendChild(input);
    input.focus();
    input.select();
  };

  const renderFolder = (folder, depth = 0) => {
    const items = groups.get(folder.id) || [];
    const childFolders = folderChildrenMap.get(folder.id) || [];
    const isCollapsed = collapsedIds.has(folder.id);
    const isDefaultFolder = folder.id === HOME_DEFAULT_FOLDER_ID;

    const folderEl = document.createElement("section");
    folderEl.className = "gtf-native-folder";
    folderEl.dataset.folderId = folder.id;
    folderEl.style.marginLeft = `${Math.min(depth, 5) * 12}px`;

    const head = document.createElement("div");
    head.className = "gtf-native-folder-head";
    const allowDnD = canUseSidebarDnD();
    head.draggable = allowDnD && !isDefaultFolder;
    if (!allowDnD) {
      head.classList.add("fixed");
    } else {
      if (isDefaultFolder) {
        head.classList.add("fixed");
      } else {
        head.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData("text/plain", JSON.stringify({ type: "folder", folderId: folder.id }));
          event.dataTransfer.effectAllowed = "move";
        });
      }
      folderEl.addEventListener("dragenter", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      folderEl.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        folderEl.classList.add("drag-over");
      });

      folderEl.addEventListener("dragleave", (event) => {
        event.stopPropagation();
        if (!folderEl.contains(event.relatedTarget)) {
          folderEl.classList.remove("drag-over");
        }
      });

      folderEl.addEventListener("drop", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        folderEl.classList.remove("drag-over");
        let payload = null;
        try {
          const rawData = event.dataTransfer?.getData("text/plain") || "{}";
          if (rawData.startsWith("{") && rawData.endsWith("}")) {
            payload = JSON.parse(rawData);
          } else {
            // Fallback for native links that were not bound by us
            const url = event.dataTransfer?.getData("text/uri-list") || rawData;
            if (url && url.includes("gemini.google.com")) {
              const conversationId = toConversationId(url);
              if (isConcreteConversationId(conversationId)) {
                payload = { type: "conversation", conversationId };
              }
            }
          }
        } catch {
          payload = null;
        }
        if (!payload?.type) return;

        if (payload.type === "folder" && payload.folderId) {
          if (!canNestFolder(nativeFolderPanelState.folders, payload.folderId, folder.id)) return;
          const nextFolders = nativeFolderPanelState.folders.map((item) =>
            item.id === payload.folderId ? { ...item, parentId: folder.id } : item
          );
          await persistNativeHomeState({ folders: nextFolders });
          scheduleNativeFolderPanelRender();
          return;
        }

        if (payload.type === "conversation" && payload.conversationId) {
          const nextMap = { ...nativeFolderPanelState.conversationFolderMap, [payload.conversationId]: folder.id };
          await persistNativeHomeState({ conversationFolderMap: nextMap });
          scheduleNativeFolderPanelRender();
        }
      });
    }

    const headLeft = document.createElement("div");
    headLeft.className = "gtf-native-folder-head-left";
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "gtf-native-folder-toggle";
    toggleBtn.textContent = isCollapsed ? "\u25B8" : "\u25BE";
    toggleBtn.title = isCollapsed ? "\u5c55\u5f00" : "\u6536\u8d77";
    toggleBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextCollapsed = new Set(collapsedIds);
      if (nextCollapsed.has(folder.id)) nextCollapsed.delete(folder.id);
      else nextCollapsed.add(folder.id);
      const nextCollapsedIds = Array.from(nextCollapsed);
      nativePendingCollapsedIds = [...nextCollapsedIds];
      nativeFolderPanelState = { ...nativeFolderPanelState, collapsedFolderIds: nextCollapsedIds };
      nativePanelQuietUntil = 0;
      scheduleNativeFolderPanelRender(true);
      persistNativeHomeState({ collapsedFolderIds: nextCollapsedIds }).catch((error) => {
        console.error("[Gemini Timeline] persist collapsed folders failed", error);
      });
    });

    const iconEl = document.createElement("span");
    iconEl.className = "gtf-native-folder-icon gtf-native-icon";
    iconEl.innerHTML = getNativeFolderIconSvg("open");
    const nameEl = document.createElement("span");
    nameEl.className = "gtf-native-folder-name";
    nameEl.textContent = isDefaultFolder ? "\u672A\u5206\u7C7B" : folder.name;
    nameEl.title = isDefaultFolder ? "\u9ED8\u8BA4\u5206\u7C7B" : "\u53CC\u51FB\u91CD\u547D\u540D\u6587\u4EF6\u5939";
    nameEl.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isDefaultFolder) return;
      startInlineRename(folder, nameEl);
    });
    headLeft.append(toggleBtn, iconEl, nameEl);

    const countEl = document.createElement("span");
    countEl.className = "gtf-native-folder-count";
    countEl.textContent = `${items.length} \u4e2a`;
    head.append(headLeft, countEl);
    folderEl.appendChild(head);

    if (!isCollapsed) {
      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "gtf-native-empty";
        empty.textContent = "\u6682\u65e0\u4f1a\u8bdd\uff0c\u62d6\u52a8\u5230\u8fd9\u91cc";
        folderEl.appendChild(empty);
      } else {
        const listEl = document.createElement("ul");
        listEl.className = "gtf-native-conversation-list";
        items.forEach((item) => {
          const li = document.createElement("li");
          li.className = "gtf-native-conversation-item";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "gtf-native-conversation-btn";
          if (toConversationId(location.href) === item.conversationId) btn.classList.add("active");
          btn.title = item.title || "\u672a\u547d\u540d\u4f1a\u8bdd";
          btn.textContent = shortenNativeTitle(item.title, 14);
          
          btn.draggable = canUseSidebarDnD();
          btn.addEventListener("dragstart", (event) => {
            event.stopPropagation();
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(
                "text/plain",
                JSON.stringify({
                  type: "conversation",
                  conversationId: item.conversationId,
                  url: item.url || item.conversationId,
                  title: item.title
                })
              );
            }
          });

          btn.addEventListener("click", async () => {
            const targetConversationId = toConversationId(item.conversationId || item.url || "");
            if (!isConcreteConversationId(targetConversationId)) return;
            await requestPanelOpenConversation(targetConversationId);
            navigateConversationInPage(targetConversationId, { allowHardFallback: false, allowHistoryFallback: true });
          });
          li.appendChild(btn);
          listEl.appendChild(li);
        });
        folderEl.appendChild(listEl);
      }
      childFolders.forEach((child) => folderEl.appendChild(renderFolder(child, depth + 1)));
    }

    return folderEl;
  };

  const folderBody = document.createElement("div");
  folderBody.className = "gtf-native-folder-body";
  folderBody.hidden = !nativeFolderPanelUiState.folderListOpen;
  
  const rootFolders = folderChildrenMap.get(null) || [];
  const visibleRootFolders = rootFolders.filter((folder) => folder?.id !== HOME_DEFAULT_FOLDER_ID);
  visibleRootFolders.forEach((folder) => folderBody.appendChild(renderFolder(folder, 0)));
  panel.appendChild(folderBody);
  recordPerf("renderNativeFolderPanel", perfStartedAt, { catalog: catalog.length, folders: visibleRootFolders.length });
}


function watchNativeFolderPanel() {
  if (!ENABLE_NATIVE_SIDEBAR_WIDGET) {
    cleanupNativeSidebarWidget();
    return;
  }
  if (window.__GEMINI_TIMELINE_NATIVE_PANEL_WATCHING__) return;
  window.__GEMINI_TIMELINE_NATIVE_PANEL_WATCHING__ = true;

  scheduleNativeFolderPanelRender();
  const getMutationSignature = (records) => {
    if (!Array.isArray(records) || !records.length) return "";
    const parts = [];
    for (let i = 0; i < records.length && parts.length < 8; i += 1) {
      const record = records[i];
      const target = record?.target;
      if (target instanceof Element && target.closest("#gtf-native-folder-shell")) {
        continue;
      }
      const tag = target instanceof Element ? target.tagName : "N";
      const added = Number(record?.addedNodes?.length || 0);
      const removed = Number(record?.removedNodes?.length || 0);
      if (added === 0 && removed === 0) continue;
      parts.push(`${record.type || "u"}:${tag}:${added}:${removed}`);
    }
    return parts.join("|");
  };
  const bindSidebarMutationObserver = () => {
    const detectedSidebar = findSidebarRegionCached();
    if (!(detectedSidebar instanceof Element)) return;
    const sidebarHost = resolveSidebarHost(detectedSidebar) || detectedSidebar;
    const sidebarRoot = resolveSidebarMountTarget(sidebarHost, detectedSidebar) || sidebarHost;
    const bindQuietListener = (el) => {
      if (!(el instanceof Element)) return;
      if (el.dataset.gtfScrollQuietBound === "1") return;
      el.dataset.gtfScrollQuietBound = "1";
      const markScrollQuiet = (ms = 1200) => {
        nativeSidebarScrollQuietUntil = Math.max(nativeSidebarScrollQuietUntil, Date.now() + ms);
      };
      el.addEventListener("scroll", () => markScrollQuiet(1000), { passive: true });
    };
    bindQuietListener(sidebarRoot);
    bindQuietListener(findSidebarConversationSection(sidebarRoot));
    if (nativeSidebarObservedRoot === sidebarRoot && nativeSidebarMutationObserver) return;

    if (nativeSidebarMutationObserver) {
      nativeSidebarMutationObserver.disconnect();
      nativeSidebarMutationObserver = null;
    }

    nativeSidebarObservedRoot = sidebarRoot;
    nativeSidebarMutationObserver = new MutationObserver((records) => {
      if (nativePanelRendering) return;
      if (Date.now() < nativePanelQuietUntil) return;
      if (Date.now() < nativeSidebarScrollQuietUntil) return;
      if (isLayoutResizing()) return;
      if (document.hidden) return;

      const mutationSignature = getMutationSignature(records);
      if (!mutationSignature) return;
      if (mutationSignature === nativeSidebarMutationSignature) return;
      nativeSidebarMutationSignature = mutationSignature;

      const detectedSidebar = findSidebarRegionCached();
      const sidebarHost = detectedSidebar ? (resolveSidebarHost(detectedSidebar) || detectedSidebar) : null;
      const sidebarRoot = (sidebarHost && detectedSidebar) ? (resolveSidebarMountTarget(sidebarHost, detectedSidebar) || sidebarHost) : null;
      if (sidebarRoot) {
        enhanceOriginalSidebarConversationDnD(sidebarRoot);
      }

      if (nativeSidebarMutationTimer) clearTimeout(nativeSidebarMutationTimer);
      nativeSidebarMutationTimer = setTimeout(() => {
        nativeSidebarMutationTimer = null;
        const panel = document.getElementById("gtf-native-folder-shell") || document.getElementById("gtf-native-folder-panel");
        if (!panel || !panel.isConnected || !sidebarRoot.contains(panel)) {
          scheduleNativeFolderPanelRender(true);
          return;
        }
        // Avoid re-render loops while Gemini virtualizes sidebar rows during scrolling.
        return;
      }, SIDEBAR_MUTATION_SETTLE_MS);
    });
    nativeSidebarMutationObserver.observe(sidebarRoot, { childList: true, subtree: true });
  };
  bindSidebarMutationObserver();

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      const changedKeys = Object.keys(changes || {});
      if (changedKeys.includes(SETTINGS_KEY)) {
        const nextSettings = changes[SETTINGS_KEY]?.newValue || {};
        const nextLocale = normalizeLocale(nextSettings?.locale);
        const nextLowPower = Boolean(nextSettings?.lowPowerMode);
        if (nextLocale !== currentLocale) {
          currentLocale = nextLocale;
          applyContentLocaleToUi();
        }
        if (nextLowPower !== lowPowerModeEnabled) {
          lowPowerModeEnabled = nextLowPower;
          if (lowPowerModeEnabled) {
            cleanupNativeChatTimeline();
          } else {
            watchNativeChatTimeline();
          }
        }
        scheduleNativePromptLibraryRender(0, true);
      }
      if (Date.now() < nativePanelQuietUntil) return;
      if (changedKeys.includes(PROMPT_LIBRARY_STORAGE_KEY)) {
        nativePromptLibraryLoaded = false;
        scheduleNativePromptLibraryRender(0, true);
      }
      const hasHomeMutation = changedKeys.some(
        (key) => key.startsWith(`${HOME_KEY}:`) || key.startsWith(`${HOME_INDEX_KEY}:`)
      );
      if (hasHomeMutation) {
        scheduleNativeFolderPanelRender();
      }
      
      const isCurrentConversationChanged = changedKeys.includes(toStorageKey(currentConversationId));
      if (isCurrentConversationChanged) {
        rawEntryCache = { key: "", at: 0, entries: [] };
        scheduleInlineAnnotationSync(360);
        scheduleNativeMainConversationNoteRender(120, true);
      }
    });
  }

  setInterval(() => {
    if (document.hidden) return;
    bindSidebarMutationObserver();
    if (isLayoutResizing()) return;
    const detectedSidebar = findSidebarRegionCached();
    if (!detectedSidebar) {
      setNativeFolderPanelVisibility(false);
      return;
    }
    const sidebarHost = resolveSidebarHost(detectedSidebar) || detectedSidebar;
    const sidebarRoot = resolveSidebarMountTarget(sidebarHost, detectedSidebar) || sidebarHost;
    if (shouldHideNativeFolderPanelByLayout(detectedSidebar, sidebarHost, sidebarRoot)) {
      setNativeFolderPanelVisibility(false);
      return;
    }
    if (!nativeFolderPanelRoot || !nativeFolderPanelRoot.isConnected || !sidebarRoot.contains(nativeFolderPanelRoot)) {
      scheduleNativeFolderPanelRender(true);
    }
  }, SIDEBAR_REBIND_INTERVAL_MS);

  const scheduleNextHealthCheck = (delay = SIDEBAR_HEALTH_CHECK_INTERVAL_MS) => {
    if (nativeSidebarHealthTimer) clearTimeout(nativeSidebarHealthTimer);
    nativeSidebarHealthTimer = setTimeout(() => {
      let healthOk = true;
      if (!document.hidden && !isLayoutResizing()) {
        const shell = document.getElementById("gtf-native-folder-shell");
        if (shell instanceof Element && shell.isConnected) {
          const detectedSidebar = findSidebarRegionCached(SIDEBAR_REGION_CACHE_MS * 2);
          if (detectedSidebar instanceof Element) {
            const sidebarHost = resolveSidebarHost(detectedSidebar) || detectedSidebar;
            const mountTarget = resolveSidebarMountTarget(sidebarHost, detectedSidebar) || sidebarHost;
            const health = runNativeSidebarHealthCheck(shell, mountTarget, sidebarHost);
            debugState.sidebarHealthOk = health.ok;
            debugState.sidebarHealthReasons = health.reasons.join(",");
            debugState.sidebarHealthAt = Date.now();
            healthOk = health.ok;
            if (!health.ok) {
              console.warn("[Gemini Timeline] periodic sidebar health check failed", health.reasons);
              scheduleNativeFolderPanelRender(true);
            }
          }
        }
      }

      nativeSidebarHealthIntervalMs = healthOk
        ? Math.min(SIDEBAR_HEALTH_CHECK_MAX_INTERVAL_MS, nativeSidebarHealthIntervalMs * 2)
        : SIDEBAR_HEALTH_CHECK_INTERVAL_MS;
      scheduleNextHealthCheck(nativeSidebarHealthIntervalMs);
    }, Math.max(SIDEBAR_HEALTH_CHECK_INTERVAL_MS, Number(delay) || SIDEBAR_HEALTH_CHECK_INTERVAL_MS));
  };
  nativeSidebarHealthIntervalMs = SIDEBAR_HEALTH_CHECK_INTERVAL_MS;
  scheduleNextHealthCheck(nativeSidebarHealthIntervalMs);
}

function normalizeBranchAskMode(mode) {
  const text = normalizeText(mode || "").toLowerCase();
  if (text === "quick" || text === "fast" || text === "standard" || text === "direct") return "quick";
  if (text === "deep" || text === "thinking" || text === "reasoning") return "deep";
  return "quick";
}

function buildBranchContextContentBlock(payload, askMode = "quick") {
  const refs = Array.isArray(payload?.contextRefs) ? payload.contextRefs : [];
  if (!refs.length) return "";
  const mode = askMode === "deep" ? "deep" : "quick";
  const maxRefs = mode === "deep" ? 6 : 4;

  return refs
    .slice(-maxRefs)
    .map((item, idx) => {
      const title = normalizeText(item?.nodeTitle || "").slice(0, 120) || `分问题${idx + 1}`;
      const folder = normalizeText(item?.folderName || "").slice(0, 48);
      const token = normalizeText(item?.entryToken || item?.id || "").slice(0, 48);
      const snippet = normalizeText(item?.snippet || "").slice(0, mode === "deep" ? 960 : 480);
      const parts = [];
      if (token) parts.push(`#${token}`);
      parts.push(title);
      if (folder) parts.push(folder);
      const head = `- 参考${idx + 1}：${parts.join(" / ")}`;
      if (!snippet) return head;
      return `${head}\n${snippet}`;
    })
    .join("\n\n");
}

function buildBranchPrompt(payload, askMode = "quick") {
  const question = String(payload?.question || "").replace(/\r\n/g, "\n").trim();
  return question;
}

async function waitForComposerInput(maxAttempts = 40, interval = 350) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const input = findComposerInput();
    if (input) return input;
    await wait(interval);
  }
  return null;
}

function captureAssistantSnapshot() {
  const container = chatContainer && chatContainer.isConnected ? chatContainer : pickChatContainer();
  const { responses } = getMessageNodes(container || document.body);
  const last = responses.length ? responses[responses.length - 1] : null;

  return {
    count: responses.length,
    lastText: last ? getResponseMarkdown(last) : ""
  };
}

async function waitForNewAssistantAnswer(snapshot, timeoutMs = 90000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const container = chatContainer && chatContainer.isConnected ? chatContainer : pickChatContainer();
    const { responses } = getMessageNodes(container || document.body);
    const last = responses.length ? responses[responses.length - 1] : null;
    const text = last ? getResponseMarkdown(last) : "";

    if (last && text && !isLikelyStreaming(last)) {
      if (responses.length > snapshot.count && text !== snapshot.lastText) return text;
      if (responses.length === snapshot.count && text.length > snapshot.lastText.length + 40) return text;
    }

    await wait(800);
  }

  return "";
}

function getLatestAssistantAnswerMarkdown() {
  const container = chatContainer && chatContainer.isConnected ? chatContainer : pickChatContainer();
  const { responses } = getMessageNodes(container || document.body);
  if (!responses.length) return "";

  for (let i = responses.length - 1; i >= 0; i -= 1) {
    const node = responses[i];
    if (!node) continue;
    const text = getResponseMarkdown(node);
    if (!text) continue;
    if (isNoiseResponseText(text)) continue;
    if (isLikelyStreaming(node)) continue;
    return text;
  }
  return "";
}

async function handleBranchAsk(payload) {
  if (!payload?.question) {
    throw new Error("empty question");
  }

  const requestedMode = normalizeBranchAskMode(payload?.askMode || "");
  const attemptModes = requestedMode === "deep" ? ["deep", "quick"] : ["quick"];
  const timeoutByMode = {
    deep: 85000,
    quick: 38000
  };

  const input = await waitForComposerInput();
  if (!input) {
    throw new Error("composer not found");
  }

  let lastError = new Error("branch ask failed");
  for (let i = 0; i < attemptModes.length; i += 1) {
    const mode = attemptModes[i];
    try {
      updateDebugState({
        branchDispatchId: String(payload?.branchRequestId || createId("dispatch")),
        branchDispatchMode: mode,
        branchDispatchAttempt: i + 1,
        branchDispatchPromptLength: 0,
        branchDispatchQueued: false,
        branchDispatchComposerFound: false,
        branchDispatchSendReady: false,
        branchDispatchSent: false,
        branchDispatchTrace: []
      });
      pushBranchDispatchTrace("branch_ask_start");
      const snapshot = captureAssistantSnapshot();
      const prompt = buildBranchPrompt(payload, mode);
      let dispatchResult = await syncPromptToNativeComposer(prompt, {
        autoSend: true,
        maxAttempts: 5,
        sendTimeoutMs: 1200
      });

      if (!dispatchResult?.ok) {
        await cachePendingFollowupPrompt(prompt, {
          autoSend: true,
          sourceConversationId: currentConversationId || payload?.conversationId || "",
          sourceEntryId: payload?.entryId || "",
          targetPath: location.pathname || "/app"
        });
        pushBranchDispatchTrace("pending_consume_start");
        dispatchResult = await consumePendingFollowupPrompt();
      }

      if (!dispatchResult?.ok || !dispatchResult?.sent) {
        updateDebugState({ lastError: dispatchResult?.error || "unable to send" });
        throw new Error(dispatchResult?.error || "unable to send");
      }
      const answer = await waitForNewAssistantAnswer(snapshot, timeoutByMode[mode] || 45000);
      if (answer) {
        pushBranchDispatchTrace("answer_received");
        return {
          answer,
          meta: {
            modeUsed: mode,
            fallbackUsed: i > 0
          }
        };
      }
      pushBranchDispatchTrace("answer_empty");
      lastError = new Error("empty answer");
    } catch (error) {
      pushBranchDispatchTrace("branch_ask_error", {
        lastError: error?.message || "branch ask failed"
      });
      lastError = error instanceof Error ? error : new Error(String(error || "branch ask failed"));
    }
  }

  throw lastError;
}

let pendingConsumeInFlight = false;

async function consumePendingFollowupPrompt() {
  if (pendingConsumeInFlight) return;
  if (!isGeminiAppRoute(location.pathname)) {
    return { ok: false, error: "not app route", sent: false };
  }

  pendingConsumeInFlight = true;

  try {
    const result = await storageGet(PENDING_FOLLOWUP_KEY);
    const pending = result?.[PENDING_FOLLOWUP_KEY];
    if (!pending?.prompt) return { ok: false, error: "empty pending prompt", sent: false };
    pushBranchDispatchTrace("pending_found", {
      branchDispatchQueued: true
    });

    const age = Date.now() - (pending.createdAt || 0);
    if (age > FOLLOWUP_TTL_MS) {
      await storageRemove(PENDING_FOLLOWUP_KEY);
      pushBranchDispatchTrace("pending_expired");
      return { ok: false, error: "pending prompt expired", sent: false };
    }

    for (let i = 0; i < FOLLOWUP_COMPOSER_RETRY_COUNT; i += 1) {
      pushBranchDispatchTrace("pending_retry", {
        branchDispatchAttempt: i + 1
      });
      const syncResult = await syncPromptToNativeComposer(pending.prompt, {
        autoSend: pending.autoSend !== false,
        maxAttempts: 5,
        sendTimeoutMs: 1400
      });
      if (syncResult?.ok) {
        await storageRemove(PENDING_FOLLOWUP_KEY);
        pushBranchDispatchTrace("pending_sent", {
          branchDispatchQueued: false,
          branchDispatchSent: Boolean(syncResult?.sent)
        });
        return syncResult;
      }
      updateDebugState({ lastError: syncResult?.error || "consume pending followup failed" });
      await wait(FOLLOWUP_COMPOSER_RETRY_INTERVAL_MS);
    }

    pushBranchDispatchTrace("pending_retry_exhausted");
    schedulePendingFollowupConsume(FOLLOWUP_COMPOSER_RETRY_INTERVAL_MS);
    return { ok: false, error: "composer not ready", sent: false };
  } catch (error) {
    updateDebugState({ lastError: error?.message || "consume pending followup failed" });
    console.error("[Gemini Timeline] consume pending followup failed", error);
    pushBranchDispatchTrace("pending_consume_error", {
      lastError: error?.message || "consume pending followup failed"
    });
    schedulePendingFollowupConsume(FOLLOWUP_COMPOSER_RETRY_INTERVAL_MS);
    return { ok: false, error: error?.message || "consume pending followup failed", sent: false };
  } finally {
    pendingConsumeInFlight = false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GEMINI_PING") {
    sendResponse({ ok: true, conversationId: currentConversationId, url: location.href });
    return;
  }

  if (message?.type === "GEMINI_GET_THEME") {
    sendResponse({ ok: true, theme: detectGeminiTheme() });
    return;
  }

  if (message?.type === "GEMINI_FOCUS_COMPOSER") {
    const focused = focusComposerInput();
    sendResponse({ ok: focused, error: focused ? "" : "composer not found" });
    return;
  }

  if (message?.type === "GEMINI_GET_COMPOSER_MODE") {
    sendResponse({ ok: true, mode: detectComposerMode() || "" });
    return;
  }

  if (message?.type === "GEMINI_GET_ACTIVE_SELECTION") {
    const text = getActiveSelectionForSidepanel();
    if (!text) {
      sendResponse({ ok: false, text: "", error: "empty selection" });
      return;
    }
    sendResponse({ ok: true, text });
    return;
  }

  if (message?.type === "GEMINI_SET_COMPOSER_MODE") {
    setComposerMode(message?.mode || "thinking")
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error?.message || "set mode failed", mode: detectComposerMode() || "" });
      });
    return true;
  }

  if (message?.type === "GEMINI_OPEN_UPLOAD_PICKER") {
    openNativeUploadPicker(message?.kind || "file")
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error?.message || "open upload picker failed" });
      });
    return true;
  }

  if (message?.type === "GEMINI_NAVIGATE_TO_CONVERSATION") {
    const targetConversationId = forceConversationToScope(message?.conversationId || message?.url || "");
    if (!isConcreteConversationId(targetConversationId)) {
      sendResponse({ ok: false, error: "invalid conversation id" });
      return;
    }
    const navigated = navigateConversationInPage(targetConversationId, { allowHardFallback: true, allowHistoryFallback: false });
    sendResponse({ ok: navigated, conversationId: targetConversationId });
    return;
  }

  if (message?.type === "GEMINI_NAVIGATE_BACK_PAGE") {
    history.back();
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === "GEMINI_QUICK_INSERT_TEXT" || message?.type === "GEMINI_QUICK_INSERT_SELECTION") {
    handleQuickInsert(message)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error?.message || "quick insert failed" });
      });
    return true;
  }

  if (message?.type === "GEMINI_BRANCH_ASK") {
    handleBranchAsk(message.payload || {})
      .then((result) => {
        if (typeof result === "string") {
          sendResponse({ ok: true, answer: result, meta: { modeUsed: "quick", fallbackUsed: false } });
          return;
        }
        sendResponse({
          ok: true,
          answer: String(result?.answer || ""),
          meta: result?.meta && typeof result.meta === "object" ? result.meta : {}
        });
      })
      .catch((error) => {
        updateDebugState({ lastError: error?.message || "branch ask failed" });
        sendResponse({ ok: false, error: error?.message || "branch ask failed" });
      });
    return true;
  }

  if (message?.type === "GEMINI_COPY_LAST_ANSWER_MARKDOWN") {
    const markdown = getLatestAssistantAnswerMarkdown();
    if (!markdown) {
      sendResponse({ ok: false, error: "latest answer not found" });
      return;
    }
    copyTextToClipboard(markdown)
      .then((copied) => {
        sendResponse({ ok: copied, markdown, error: copied ? "" : "copy failed" });
      })
      .catch((error) => {
        sendResponse({ ok: false, markdown, error: error?.message || "copy failed" });
      });
    return true;
  }

  if (message?.type === "GEMINI_OPEN_FOLLOWUP_DRAWER") {
    // This interaction path is deprecated; branch chat now lives inside side panel.
    sendResponse({ ok: false, disabled: true });
    return;
  }

  if (message?.type === "GEMINI_SCROLL_TO_ENTRY") {
    const domIndex = Number.isInteger(message.domIndex) ? message.domIndex : null;
    const target = findResponseByLocator(message.entryId, domIndex, {
      strictEntryMatch: message?.strictEntryMatch !== false
    });
    if (!target) {
      sendResponse({ ok: false });
      return;
    }

    const ok = scrollTimelineTargetIntoView(target, String(message.entryId || ""), {
      force: Boolean(message?.force)
    });
    sendResponse({ ok });
    return;
  }

  if (message?.type === "GEMINI_REQUEST_SNAPSHOT") {
    loadRawEntries({ allowSnapshotFallback: true, includeLegacyConversationVariants: true })
      .then((turns) => {
        sendResponse({ ok: true, turns: Array.isArray(turns) ? turns : [] });
      })
      .catch((error) => {
        console.warn("[Gemini Timeline] request snapshot fallback failed", error);
        const turns = collectSnapshotTurns();
        sendResponse({ ok: true, turns });
      });
    return true;
  }

  if (message?.type === "GEMINI_LIST_SIDEBAR_CONVERSATIONS") {
    const maxCount = Number(message?.maxCount) || 240;
    const forceFull = Boolean(message?.forceFull);
    const forceRounds = Number(message?.forceRounds) || 0;
    collectReliableConversations(maxCount, { forceFull, forceRounds })
      .then((conversations) => {
        sendResponse({ ok: true, conversations });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error?.message || "collect sidebar conversations failed", conversations: [] });
      });
    return true;
  }

  if (message?.type === "GEMINI_DEBUG_STATS") {
    collectDebugStats()
      .then((stats) => {
        sendResponse({ ok: true, stats });
      })
      .catch((error) => {
        updateDebugState({ lastError: error?.message || "debug stats failed" });
        sendResponse({ ok: false, error: error?.message || "debug stats failed" });
      });
    return true;
  }
});

function watchConversationSwitch() {
  let prevConversationId = currentConversationId;
  let prevRouteKey = `${location.pathname}${location.search}`;
  let routeTickBusy = false;
  let routeTickTimer = null;
  const scheduleRouteTick = (delay = 0) => {
    if (routeTickTimer) clearTimeout(routeTickTimer);
    routeTickTimer = setTimeout(() => {
      routeTickTimer = null;
      onRouteTick().catch(() => {});
    }, Math.max(0, Number(delay) || 0));
  };
  const onRouteTick = async () => {
    if (document.hidden) return;
    if (isLayoutResizing()) return;
    if (routeTickBusy) return;
    routeTickBusy = true;
    try {
      const urlConversationId = toConversationId(location.href);
      const sidebarConversationId = resolveActiveConversationIdFromSidebar();
      let nextConversationId = "";
      if (isConcreteConversationId(sidebarConversationId)) {
        nextConversationId = sidebarConversationId;
      } else if (isConcreteConversationId(urlConversationId)) {
        nextConversationId = urlConversationId;
      }
      const nextRouteKey = `${location.pathname}${location.search}`;

      if (nextRouteKey !== prevRouteKey) {
        prevRouteKey = nextRouteKey;
        invalidateActiveSidebarConversationCache();
        sidebarConversationCache.collectedAt = 0;
        scheduleNativeFolderPanelRender();
      }

      if (!isConcreteConversationId(nextConversationId)) return;
      if (nextConversationId === prevConversationId) {
        routeSwitchPendingConversationId = "";
        return;
      }

      if (routeSwitchPendingConversationId !== nextConversationId) {
        routeSwitchPendingConversationId = nextConversationId;
        prevConversationId = nextConversationId;
        resetConversationViewState(nextConversationId);
        const rebound = rebindChatObserverIfNeeded();
        try {
          chrome.runtime.sendMessage({
            type: "GEMINI_ACTIVE_CONVERSATION_CHANGED",
            conversationId: currentConversationId,
            url: location.href
          }, () => void chrome.runtime?.lastError);
        } catch {}
        consumePendingFollowupPrompt();
        hydrateKnownTurnIds()
          .then(() => {
            if (!rebound) {
              setTimeout(() => {
                rebindChatObserverIfNeeded();
              }, 40);
            }
            queueScan();
            scheduleNativeChatTimelineRender(0, { bypassDefer: true, bypassMinGap: true });
            scheduleNativeChatTimelineRender(CONVERSATION_SWITCH_SETTLE_MS);
            if (ENABLE_NATIVE_MAIN_NOTE) {
              scheduleNativeMainConversationNoteRender(CONVERSATION_SWITCH_SETTLE_MS + 20, true);
            }
          })
          .catch((error) => {
            updateDebugState({ lastError: error?.message || "hydrate after route change failed" });
            console.error("[Gemini Timeline] hydrate after route change failed", error);
          });
        return;
      }
      routeSwitchPendingConversationId = "";
    } finally {
      routeTickBusy = false;
    }
  };

  window.addEventListener("popstate", () => {
    invalidateActiveSidebarConversationCache();
    scheduleRouteTick(0);
  });
  window.addEventListener("focus", () => scheduleRouteTick(40));
  window.addEventListener("pageshow", () => scheduleRouteTick(40));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleRouteTick(80);
  });
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const anchor = target.closest("a[href*='/app/']");
    if (!anchor || anchor.closest("#gtf-native-folder-panel")) return;
    invalidateActiveSidebarConversationCache();
    scheduleRouteTick(30);
  }, true);

  const historyObj = window.history;
  if (!window.__GEMINI_TIMELINE_ROUTE_HOOKED__) {
    window.__GEMINI_TIMELINE_ROUTE_HOOKED__ = true;
    const wrap = (name) => {
      const original = historyObj[name];
      if (typeof original !== "function") return;
      historyObj[name] = function patchedHistoryMethod(...args) {
        const result = original.apply(this, args);
        invalidateActiveSidebarConversationCache();
        scheduleRouteTick(0);
        return result;
      };
    };
    wrap("pushState");
    wrap("replaceState");
  }
  setInterval(() => {
    if (document.hidden) return;
    scheduleRouteTick(0);
  }, ROUTE_TICK_HEARTBEAT_MS);
  scheduleRouteTick(0);
}

function bindMathCopyInterceptor() {
  document.addEventListener("copy", (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const parent = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
    if (!parent) return;

    const startEl = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer.parentElement;
    const endEl = range.endContainer.nodeType === Node.ELEMENT_NODE
      ? range.endContainer
      : range.endContainer.parentElement;
    const startMath = closestAcrossShadow(startEl, MATH_COPY_SELECTOR);
    const endMath = closestAcrossShadow(endEl, MATH_COPY_SELECTOR);
    if (startMath && endMath && startMath === endMath) {
      const tex = extractTexFromMathNode(startMath);
      if (tex) {
        const replacement = buildMathReplacementText(tex, isDisplayMathNode(startMath));
        if (replacement && e.clipboardData) {
          e.clipboardData.setData("text/plain", replacement);
          e.clipboardData.setData("text/html", replacement);
          e.preventDefault();
          return;
        }
      }
    }

    const clone = range.cloneContents();
    const tempDiv = document.createElement("div");
    tempDiv.appendChild(clone);

    const mathNodes = tempDiv.querySelectorAll(MATH_COPY_SELECTOR);
    if (mathNodes.length === 0) return;

    const hasMath = replaceMathNodesWithTex(tempDiv);

    if (!hasMath) return;

    document.body.appendChild(tempDiv);
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "-9999px";
    tempDiv.style.whiteSpace = "pre-wrap";

    const plainText = getSelectionTextWithMath(selection, 20000) || tempDiv.innerText;
    const htmlText = tempDiv.innerHTML;
    document.body.removeChild(tempDiv);

    if (plainText && e.clipboardData) {
      e.clipboardData.setData("text/plain", plainText);
      e.clipboardData.setData("text/html", htmlText);
      e.preventDefault();
    }
  });
}

(async function init() {
  await loadContentSettings();
  applyContentLocaleToUi();
  try {
    await hydrateKnownTurnIds();
  } catch (error) {
    updateDebugState({ lastError: error?.message || "initial hydrate failed" });
    console.error("[Gemini Timeline] initial hydrate failed", error);
  }

  bootstrapObserver();
  applyInlineAnnotationUiMode();
  watchConversationSwitch();
  if (ENABLE_NATIVE_SIDEBAR_WIDGET) {
    scheduleNonCriticalInit(() => {
      watchNativeFolderPanel();
    }, 120);
  } else {
    cleanupNativeSidebarWidget();
  }
  scheduleNonCriticalInit(() => {
    watchNativeChatTimeline();
  }, 80);
  scheduleNonCriticalInit(() => {
    scheduleNativePromptLibraryRender(60, true);
  }, 100);
  bindSelectionQuickQuote();
  bindMathCopyInterceptor();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      queueScan();
      scheduleNativeChatTimelineRender(120);
      scheduleNativePromptLibraryRender(80, true);
      if (ENABLE_NATIVE_SIDEBAR_WIDGET) {
        scheduleNativeFolderPanelRender();
      }
      if (ENABLE_NATIVE_MAIN_NOTE) {
        scheduleNativeMainConversationNoteRender(130, true);
      }
    }
  });
  consumePendingFollowupPrompt();
  if (ENABLE_NATIVE_MAIN_NOTE) {
    scheduleNativeMainConversationNoteRender(80, true);
  }
})();



