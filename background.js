const GEMINI_URL_PREFIX = "https://gemini.google.com/";
const GEMINI_MATCH_PATTERN = "https://gemini.google.com/*";
const MENU_INSERT_SELECTION = "gemini_timeline_insert_selection";
const MENU_COPY_LAST_ANSWER_MARKDOWN = "gemini_timeline_copy_last_answer_markdown";
const PANEL_NAV_KEY = "gemini:panel:navigate:v1";

function isGeminiUrl(url) {
  return typeof url === "string" && url.indexOf(GEMINI_URL_PREFIX) === 0;
}

function configureTabPanel(tabId, url) {
  if (!Number.isInteger(tabId) || tabId < 0) return;
  if (!chrome.sidePanel || typeof chrome.sidePanel.setOptions !== "function") return;

  chrome.sidePanel.setOptions(
    {
      tabId: tabId,
      path: "sidepanel.html",
      enabled: true
    },
    function () {
      // ignore runtime lastError
    }
  );
}

function ensureGeminiContentScriptReady(tabId, url) {
  if (!Number.isInteger(tabId) || tabId < 0) return;
  if (!isGeminiUrl(url || "")) return;
  sendMessageWithAutoInject(tabId, { type: "GEMINI_PING" }, function () {
    // best effort only
  });
}

function configureGlobalPanel() {
  if (!chrome.sidePanel || typeof chrome.sidePanel.setOptions !== "function") return;
  chrome.sidePanel.setOptions(
    {
      path: "sidepanel.html",
      enabled: true
    },
    function () {
      // ignore runtime lastError
    }
  );
}

function setPendingPanelNavigation(view, source) {
  if (!chrome.storage?.local) return;
  chrome.storage.local.set(
    {
      [PANEL_NAV_KEY]: {
        view: view || "home",
        source: source || "background",
        createdAt: Date.now()
      }
    },
    function () {
      // ignore runtime lastError
    }
  );
}

function enableActionOpenPanel() {
  if (!chrome.sidePanel || typeof chrome.sidePanel.setPanelBehavior !== "function") return;

  chrome.sidePanel.setPanelBehavior(
    { openPanelOnActionClick: true },
    function () {
      // ignore runtime lastError
    }
  );
}

function createQuickActionMenus() {
  if (!chrome.contextMenus || typeof chrome.contextMenus.create !== "function") return;

  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create(
      {
        id: MENU_INSERT_SELECTION,
        title: "引入选中文本到 Gemini 输入框",
        contexts: ["selection"],
        documentUrlPatterns: [GEMINI_MATCH_PATTERN]
      },
      function () {
        // ignore runtime lastError
      }
    );

    chrome.contextMenus.create(
      {
        id: MENU_COPY_LAST_ANSWER_MARKDOWN,
        title: "复制最新回答（原始 Markdown）",
        contexts: ["page", "selection"],
        documentUrlPatterns: [GEMINI_MATCH_PATTERN]
      },
      function () {
        // ignore runtime lastError
      }
    );
  });
}

configureGlobalPanel();
enableActionOpenPanel();
createQuickActionMenus();

chrome.runtime.onInstalled.addListener(function () {
  configureGlobalPanel();
  enableActionOpenPanel();
  createQuickActionMenus();
});

chrome.runtime.onStartup.addListener(function () {
  configureGlobalPanel();
  enableActionOpenPanel();
  createQuickActionMenus();
});

chrome.tabs.onCreated.addListener(function (tab) {
  if (!tab?.id) return;
  configureTabPanel(tab.id, tab.url || "");
  ensureGeminiContentScriptReady(tab.id, tab.url || "");
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === "complete" || typeof changeInfo.url === "string") {
    const finalUrl = (tab && tab.url) || changeInfo.url || "";
    configureTabPanel(tabId, finalUrl);
    ensureGeminiContentScriptReady(tabId, finalUrl);
  }
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  if (!activeInfo || !Number.isInteger(activeInfo.tabId)) return;

  chrome.tabs.get(activeInfo.tabId, function (tab) {
    if (chrome.runtime.lastError) return;
    configureTabPanel(activeInfo.tabId, tab && tab.url ? tab.url : "");
    ensureGeminiContentScriptReady(activeInfo.tabId, tab && tab.url ? tab.url : "");
  });
});

function ensureContentScriptInjected(tabId, sendResponse) {
  if (!Number.isInteger(tabId) || tabId < 0) {
    sendResponse({ ok: false, error: "invalid tab id" });
    return;
  }

  if (!chrome.scripting || typeof chrome.scripting.executeScript !== "function") {
    sendResponse({ ok: false, error: "scripting api unavailable" });
    return;
  }

  chrome.scripting.executeScript(
    {
      target: { tabId },
      files: ["content.js"]
    },
    function () {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message || "inject failed" });
        return;
      }
      sendResponse({ ok: true });
    }
  );
}

function isNoReceiverError(errorMessage) {
  const text = (errorMessage || "").toLowerCase();
  return text.includes("receiving end does not exist") || text.includes("could not establish connection");
}

function sendMessageWithAutoInject(tabId, message, callback) {
  if (!Number.isInteger(tabId) || tabId < 0) {
    callback({ ok: false, error: "invalid tab id" });
    return;
  }

  const trySend = function (retried) {
    chrome.tabs.sendMessage(tabId, message, function (response) {
      const errorMessage = chrome.runtime.lastError?.message || "";
      if (!errorMessage) {
        callback(response || { ok: true });
        return;
      }

      if (!retried && isNoReceiverError(errorMessage)) {
        ensureContentScriptInjected(tabId, function (injectResult) {
          if (!injectResult?.ok) {
            callback({ ok: false, error: injectResult?.error || errorMessage });
            return;
          }
          trySend(true);
        });
        return;
      }

      callback({ ok: false, error: errorMessage || "send message failed" });
    });
  };

  trySend(false);
}

function handleQuickInsertByContextMenu(info, tab) {
  if (!tab?.id || !isGeminiUrl(tab.url || "")) return;

  if (info?.menuItemId === MENU_COPY_LAST_ANSWER_MARKDOWN) {
    sendMessageWithAutoInject(
      tab.id,
      {
        type: "GEMINI_COPY_LAST_ANSWER_MARKDOWN",
        source: "context_menu"
      },
      function () {
        // ignore callback result for now
      }
    );
    return;
  }

  if (info?.menuItemId !== MENU_INSERT_SELECTION) return;

  const selectedText = (info.selectionText || "").trim();
  if (!selectedText) return;

  sendMessageWithAutoInject(
    tab.id,
    {
      type: "GEMINI_QUICK_INSERT_TEXT",
      text: selectedText,
      source: "context_menu"
    },
    function () {
      // ignore callback result for now
    }
  );
}

function handleCommand(command) {
  if (!chrome.tabs || typeof chrome.tabs.query !== "function") return;
  if (
    command !== "gemini_focus_input" &&
    command !== "gemini_insert_selection" &&
    command !== "gemini_copy_last_answer_markdown"
  ) return;

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = Array.isArray(tabs) ? tabs[0] : null;
    if (!tab?.id || !isGeminiUrl(tab.url || "")) return;

    if (command === "gemini_focus_input") {
      sendMessageWithAutoInject(
        tab.id,
        {
          type: "GEMINI_FOCUS_COMPOSER",
          source: "command"
        },
        function () {
          // ignore callback result for now
        }
      );
      return;
    }

    if (command === "gemini_insert_selection") {
      sendMessageWithAutoInject(
        tab.id,
        {
          type: "GEMINI_QUICK_INSERT_SELECTION",
          source: "command"
        },
        function () {
          // ignore callback result for now
        }
      );
      return;
    }

    sendMessageWithAutoInject(
      tab.id,
      {
        type: "GEMINI_COPY_LAST_ANSWER_MARKDOWN",
        source: "command"
      },
      function () {
        // ignore callback result for now
      }
    );
  });
}

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(handleQuickInsertByContextMenu);
}

if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener(handleCommand);
}

const openSidePanelPorts = new Set();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "gemini-sidepanel") {
    const senderWindowId = port.sender?.tab?.windowId;
    if (Number.isInteger(senderWindowId) && senderWindowId >= 0) {
      port.windowId = senderWindowId;
    }
    openSidePanelPorts.add(port);
    port.onMessage.addListener((msg) => {
      if (msg.type === "INIT" && msg.windowId) {
        port.windowId = msg.windowId;
      }
    });
    port.onDisconnect.addListener(() => {
      openSidePanelPorts.delete(port);
    });
  }
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

  if (message?.type === "GEMINI_ENSURE_CONTENT_SCRIPT") {
    ensureContentScriptInjected(message.tabId, sendResponse);
    return true;
  }

  if (message?.type === "GEMINI_OPEN_HOME_VIEW_REQUEST") {
    const tabId = sender?.tab?.id;
    if (!Number.isInteger(tabId) || tabId < 0) {
      sendResponse({ ok: false, error: "invalid tab id" });
      return;
    }

    setPendingPanelNavigation("home", "native_sidebar");

    const notifyHome = function () {
      chrome.runtime.sendMessage({ type: "GEMINI_NAVIGATE_HOME_VIEW", source: "native_sidebar" }, function () {
        // ignore runtime lastError
      });
    };

    if (chrome.sidePanel && typeof chrome.sidePanel.open === "function") {
      chrome.sidePanel.open({ tabId: tabId }, function () {
        // Give side panel a short time to hydrate, then navigate.
        setTimeout(notifyHome, 120);
        setTimeout(notifyHome, 560);
        setTimeout(notifyHome, 1100);
        sendResponse({ ok: true });
      });
      return true;
    }

    notifyHome();
    sendResponse({ ok: true, opened: false });
    return;
  }

  if (message?.type === "GEMINI_TOGGLE_SIDE_PANEL_REQUEST") {
    const windowId = sender?.tab?.windowId;
    if (!Number.isInteger(windowId) || windowId < 0) {
      sendResponse({ ok: false });
      return;
    }

    const togglePanel = (isOpen) => {
      if (isOpen) {
        // Close it via message
        try {
          // Broadcast to all side panels
          for (const port of openSidePanelPorts) {
            port.postMessage({ type: "GEMINI_CLOSE_SIDE_PANEL" });
          }
          chrome.runtime.sendMessage({ type: "GEMINI_CLOSE_SIDE_PANEL", windowId: windowId }, () => {
            // ignore error
            const _ = chrome.runtime.lastError;
          });
        } catch (e) {}
        try { sendResponse({ ok: true, action: "closed" }); } catch (e) {}
      } else {
        if (chrome.sidePanel && typeof chrome.sidePanel.open === "function") {
          chrome.sidePanel.open({ windowId: windowId }, () => {
            if (chrome.runtime.lastError) {
               console.error("SidePanel open failed", chrome.runtime.lastError);
               // Fallback to tabId if windowId fails
               const tabId = sender?.tab?.id;
               if (tabId) {
                 chrome.sidePanel.open({ tabId: tabId }, () => {
                   if (chrome.runtime.lastError) console.error("SidePanel open fallback failed", chrome.runtime.lastError);
                 });
               }
            }
          });
        }
        try { sendResponse({ ok: true, action: "opened" }); } catch (e) {}
      }
    };

    // Determine state synchronously to preserve user gesture
    let isOpen = false;
    if (Number.isInteger(windowId) && windowId >= 0) {
      for (const port of openSidePanelPorts) {
        if (port.windowId === windowId) {
          isOpen = true;
          break;
        }
      }
    } else {
      isOpen = openSidePanelPorts.size > 0;
    }

    togglePanel(isOpen);
    return false; // Return false to indicate synchronous completion and preserve user gesture
  }

  if (message?.type === "GEMINI_OPEN_SIDE_PANEL_REQUEST") {
    const windowId = sender?.tab?.windowId;
    const tabId = sender?.tab?.id;
    if (
      (!Number.isInteger(windowId) || windowId < 0) &&
      (!Number.isInteger(tabId) || tabId < 0)
    ) {
      sendResponse({ ok: false });
      return;
    }

    if (chrome.sidePanel && typeof chrome.sidePanel.open === "function") {
      const onDone = () => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message || "open failed" });
          return;
        }
        sendResponse({ ok: true, action: "opened" });
      };
      if (Number.isInteger(windowId) && windowId >= 0) {
        chrome.sidePanel.open({ windowId }, onDone);
      } else {
        chrome.sidePanel.open({ tabId }, onDone);
      }
      return true;
    }

    sendResponse({ ok: false, error: "sidepanel api unavailable" });
    return;
  }
});
