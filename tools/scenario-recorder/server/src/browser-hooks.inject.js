/* Browser-only recorder hooks. Loaded via addInitScript — do not import from Node. */
(function () {
  var HOOKS_KEY = "__visualE2EHooksInstalled";
  var QUEUE_KEY = "__visualE2EActions";
  var RECORDING_KEY = "__visualE2ERecording";
  var BINDING_NAME = "__visualE2ERecord";
  var CLICK_DEDUP_MS = 80;
  var FOCUS_CLICK_DEDUP_MS = 150;
  var INPUT_DEBOUNCE_MS = 300;
  var CLICK_MOVE_TOLERANCE_PX = 8;

  var lastClick = null;
  var pendingPointer = null;
  var inputTimers = {};

  function escapeAttr(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function isUniqueId(id) {
    if (!id) return false;
    try {
      return document.querySelectorAll("#" + CSS.escape(id)).length === 1;
    } catch (_e) {
      return false;
    }
  }

  function isIgnorableElement(el) {
    if (!el || el.nodeType !== 1) return true;
    var tag = el.tagName.toLowerCase();
    return tag === "html" || tag === "body" || tag === "head" || tag === "script" || tag === "style";
  }

  function isInputField(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    var role = el.getAttribute("role");
    return role === "textbox" || role === "combobox" || role === "searchbox" || role === "spinbutton";
  }

  function cssPath(el) {
    var parts = [];
    var current = el;
    while (current && current.nodeType === 1 && parts.length < 8) {
      var part = current.tagName.toLowerCase();
      if (current.id && isUniqueId(current.id)) {
        parts.unshift("#" + CSS.escape(current.id));
        break;
      }
      var parentEl = current.parentElement;
      if (parentEl) {
        var siblings = Array.prototype.filter.call(parentEl.children, function (c) {
          return c.tagName === current.tagName;
        });
        if (siblings.length > 1) {
          part += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")";
        }
      }
      parts.unshift(part);
      current = parentEl;
    }
    return parts.join(" > ");
  }

  function inferRole(el) {
    var tag = el.tagName.toLowerCase();
    if (tag === "button") return "button";
    if (tag === "a") return "link";
    if (tag === "label") return "label";
    if (tag === "input") {
      if (el.type === "checkbox") return "checkbox";
      if (el.type === "radio") return "radio";
      return "textbox";
    }
    if (tag === "textarea") return "textbox";
    if (tag === "select") return "combobox";
    return null;
  }

  function visibleText(el) {
    var text = (el.innerText || el.textContent || "").trim().split("\n")[0];
    return text ? text.trim() : "";
  }

  function selectorFromElement(el, allowTextFallback) {
    if (!el || el.nodeType !== 1) return "";

    var testId = el.getAttribute("data-testid") || el.getAttribute("data-test");
    if (testId) return '[data-testid="' + escapeAttr(testId) + '"]';

    var aria = el.getAttribute("aria-label");
    if (aria) return '[aria-label="' + escapeAttr(aria) + '"]';

    var placeholder = el.getAttribute("placeholder");
    if (placeholder) {
      var byPlaceholder = el.tagName.toLowerCase() + '[placeholder="' + escapeAttr(placeholder) + '"]';
      try {
        if (document.querySelectorAll(byPlaceholder).length === 1) return byPlaceholder;
      } catch (_e) {}
    }

    var name = el.getAttribute("name");
    if (name) {
      var candidate = el.tagName.toLowerCase() + '[name="' + escapeAttr(name) + '"]';
      try {
        if (document.querySelectorAll(candidate).length === 1) return candidate;
      } catch (_e) {}
    }

    if (el.id && isUniqueId(el.id)) return "#" + CSS.escape(el.id);

    var role = el.getAttribute("role") || inferRole(el);
    var text = visibleText(el);
    if (role && text && text.length <= 40) {
      try {
        if (document.querySelectorAll('[role="' + escapeAttr(role) + '"]').length <= 12) {
          return "role=" + role + '[name="' + escapeAttr(text) + '"]';
        }
      } catch (_e) {}
    }

    if (allowTextFallback && text && text.length >= 2 && text.length <= 30) {
      return 'text="' + escapeAttr(text) + '"';
    }

    return cssPath(el);
  }

  function buildSelectorForClick(el) {
    var direct = selectorFromElement(el, false);
    if (direct) return direct;

    var current = el.parentElement;
    for (var depth = 0; depth < 3 && current; depth++) {
      var testId = current.getAttribute("data-testid") || current.getAttribute("data-test");
      if (testId) return '[data-testid="' + escapeAttr(testId) + '"]';
      if (current.id && isUniqueId(current.id)) return "#" + CSS.escape(current.id);
      current = current.parentElement;
    }
    return cssPath(el);
  }

  function resolveEventElement(event) {
    var path = typeof event.composedPath === "function" ? event.composedPath() : [];
    for (var i = 0; i < path.length; i++) {
      var node = path[i];
      if (node && node.nodeType === 1 && !isIgnorableElement(node)) return node;
    }

    var target = event.target;
    if (target && target.nodeType === 3) target = target.parentElement;
    if (target && target.nodeType === 1 && !isIgnorableElement(target)) return target;

    if (typeof event.clientX === "number" && typeof event.clientY === "number") {
      try {
        var atPoint = document.elementFromPoint(event.clientX, event.clientY);
        if (atPoint && atPoint.nodeType === 1 && !isIgnorableElement(atPoint)) return atPoint;
      } catch (_e) {}
    }
    return null;
  }

  function resolveInputTarget(target) {
    if (!target || target.nodeType !== 1) return null;
    if (isInputField(target)) return target;
    return target.closest(
      "input,textarea,select,[contenteditable='true'],[contenteditable=''],[role='textbox'],[role='combobox'],[role='searchbox']",
    );
  }

  function readFieldValue(el) {
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox") return { value: el.checked ? "true" : "false", password: false };
      if (el.type === "radio") return { value: el.value || (el.checked ? "true" : "false"), password: false };
      return { value: el.value, password: el.type === "password" };
    }
    if (el instanceof HTMLTextAreaElement) return { value: el.value, password: false };
    if (el instanceof HTMLSelectElement) return { value: el.value, password: false };
    if (el.isContentEditable) return { value: el.innerText || "", password: false };
    return { value: "", password: false };
  }

  function shouldSkipDuplicateClick(selector, timestamp) {
    if (!lastClick) return false;
    if (lastClick.selector !== selector) return false;
    return timestamp - lastClick.timestamp < CLICK_DEDUP_MS;
  }

  function shouldSkipFocusClick(selector, timestamp) {
    if (!lastClick) return false;
    if (lastClick.selector !== selector) return false;
    return timestamp - lastClick.timestamp < FOCUS_CLICK_DEDUP_MS;
  }

  function enqueue(action) {
    var queue = window[QUEUE_KEY];
    if (!Array.isArray(queue)) {
      queue = [];
      window[QUEUE_KEY] = queue;
    }
    queue.push(action);
  }

  function emit(action) {
    if (!window[RECORDING_KEY]) return;

    var binding = window[BINDING_NAME];
    if (typeof binding === "function") {
      try {
        var result = binding(action);
        if (result && typeof result.then === "function") {
          result.catch(function () {
            enqueue(action);
          });
        }
        return;
      } catch (_e) {
        enqueue(action);
        return;
      }
    }
    enqueue(action);
  }

  function recordClick(el, timestamp) {
    if (!el || isIgnorableElement(el)) return;
    var selector = buildSelectorForClick(el);
    if (!selector) return;
    if (shouldSkipDuplicateClick(selector, timestamp)) return;
    lastClick = { selector: selector, timestamp: timestamp };
    emit({ type: "click", selector: selector, timestamp: timestamp });
  }

  function installHooks() {
    if (window[HOOKS_KEY]) return true;

    window[QUEUE_KEY] = window[QUEUE_KEY] || [];
    if (typeof window[RECORDING_KEY] !== "boolean") window[RECORDING_KEY] = false;

    function scheduleInput(selector, value, password) {
      if (inputTimers[selector]) clearTimeout(inputTimers[selector]);
      inputTimers[selector] = setTimeout(function () {
        delete inputTimers[selector];
        emit({
          type: "input",
          selector: selector,
          value: value,
          password: password,
          timestamp: Date.now(),
        });
      }, INPUT_DEBOUNCE_MS);
    }

    function flushInputForElement(target) {
      if (!target || !isInputField(target)) return;
      var selector = selectorFromElement(target, true);
      if (!selector) return;
      if (inputTimers[selector]) {
        clearTimeout(inputTimers[selector]);
        delete inputTimers[selector];
      }
      var field = readFieldValue(target);
      emit({
        type: "input",
        selector: selector,
        value: field.value,
        password: field.password,
        timestamp: Date.now(),
      });
      emit({ type: "focusout", selector: selector, timestamp: Date.now() });
    }

    function onPointerDown(event) {
      if (event.button !== 0) return;
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen" && event.pointerType !== "touch") {
        return;
      }
      var el = resolveEventElement(event);
      if (!el) return;
      pendingPointer = {
        selector: buildSelectorForClick(el),
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now(),
        el: el,
      };
      recordClick(el, pendingPointer.timestamp);
    }

    function onClick(event) {
      if (event.button !== 0) return;
      var el = resolveEventElement(event);
      if (!el) return;
      var timestamp = Date.now();

      if (pendingPointer) {
        var dx = Math.abs(event.clientX - pendingPointer.x);
        var dy = Math.abs(event.clientY - pendingPointer.y);
        var sameGesture = dx <= CLICK_MOVE_TOLERANCE_PX && dy <= CLICK_MOVE_TOLERANCE_PX;
        pendingPointer = null;
        if (sameGesture) {
          // already recorded on pointerdown
          return;
        }
      }

      recordClick(el, timestamp);
    }

    function onFocusIn(event) {
      var target = event.target;
      if (!isInputField(target)) return;
      var selector = selectorFromElement(target, true);
      if (!selector) return;
      var timestamp = Date.now();
      if (shouldSkipFocusClick(selector, timestamp)) return;
      lastClick = { selector: selector, timestamp: timestamp };
      emit({ type: "focus", selector: selector, timestamp: timestamp });
    }

    function onFocusOut(event) {
      var target = event.target;
      if (!isInputField(target)) return;
      var selector = selectorFromElement(target, true);
      if (!selector) return;
      if (inputTimers[selector]) {
        clearTimeout(inputTimers[selector]);
        delete inputTimers[selector];
        var field = readFieldValue(target);
        emit({
          type: "input",
          selector: selector,
          value: field.value,
          password: field.password,
          timestamp: Date.now(),
        });
      }
      emit({ type: "focusout", selector: selector, timestamp: Date.now() });
    }

    function onInput(event) {
      var target = resolveInputTarget(event.target);
      if (!target) return;
      var selector = selectorFromElement(target, true);
      if (!selector) return;
      var field = readFieldValue(target);
      scheduleInput(selector, field.value, field.password);
    }

    function onChange(event) {
      var target = resolveInputTarget(event.target);
      if (!target) return;
      var selector = selectorFromElement(target, true);
      if (!selector) return;
      if (inputTimers[selector]) {
        clearTimeout(inputTimers[selector]);
        delete inputTimers[selector];
      }
      var field = readFieldValue(target);
      emit({
        type: "input",
        selector: selector,
        value: field.value,
        password: field.password,
        timestamp: Date.now(),
      });
    }

    function onKeyDown(event) {
      var target = resolveInputTarget(event.target);
      if (target && isInputField(target) && event.key === "Enter") {
        flushInputForElement(target);
        return;
      }

      var specialKeys = {
        Enter: 1,
        Escape: 1,
        Tab: 1,
        Backspace: 1,
        Delete: 1,
        ArrowUp: 1,
        ArrowDown: 1,
        ArrowLeft: 1,
        ArrowRight: 1,
      };
      var hasModifier = event.ctrlKey || event.metaKey || event.altKey;
      var isSpecial = !!specialKeys[event.key];
      if (!hasModifier && !isSpecial) return;

      var selector = target ? selectorFromElement(target, true) : "";
      var value = hasModifier
        ? (event.ctrlKey || event.metaKey ? "Control+" : "") + (event.altKey ? "Alt+" : "") + event.key
        : event.key;

      emit({
        type: "keyboard",
        selector: selector || "",
        value: value,
        timestamp: Date.now(),
      });
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("keydown", onKeyDown, true);

    window[HOOKS_KEY] = true;
    return true;
  }

  window.__visualE2EInstallHooks = installHooks;

  window.__visualE2EDrainActions = function () {
    var queue = window[QUEUE_KEY] || [];
    window[QUEUE_KEY] = [];
    return queue;
  };

  window.__visualE2ESetRecording = function (enabled) {
    window[RECORDING_KEY] = !!enabled;
  };

  window.__visualE2EHooksReady = function () {
    return window[HOOKS_KEY] === true && Array.isArray(window[QUEUE_KEY]);
  };

  // Init scripts run before page scripts; install as soon as DOM is usable.
  if (document.documentElement) {
    installHooks();
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      installHooks();
    });
  }
})();
