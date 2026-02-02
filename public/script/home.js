"use strict";

/* =========================================================
   AUTH UI + AUTH REQUESTS (FULL, GLITCH-PROOF VERSION)
   ✅ Slider always moves correctly (no desync with radios/CSS)
   ✅ Rate-limit countdown persists across refresh (localStorage)
   ✅ Button label never goes invisible (data-label fallback)
   ✅ No stacked timers / no flicker
========================================================= */

(function () {
  // -------------------------
  // DOM Ready
  // -------------------------
  const ready = (fn) =>
    document.readyState === "loading"
      ? document.addEventListener("DOMContentLoaded", fn, { once: true })
      : fn();

  // -------------------------
  // CONFIG
  // -------------------------
  const API_BASE = ""; // e.g. "http://localhost:3000" if backend is different origin
  const AUTH_TAB_KEY = "auth_active_tab"; // "login" | "signup"

  // -------------------------
  // Safety CSS (helps with invisible submit text)
  // -------------------------
  function injectSafetyCSS() {
    if (document.getElementById("authSafetyCSS")) return;
    const style = document.createElement("style");
    style.id = "authSafetyCSS";
    style.textContent = `
      input[type="submit"], button[type="submit"]{
        -webkit-text-fill-color: currentColor;
      }
      input[type="submit"]:disabled, button[type="submit"]:disabled{
        opacity: .65 !important;
        cursor: not-allowed !important;
        filter: grayscale(.2);
      }
      .loading{
        opacity:.75;
        pointer-events:none;
        filter:grayscale(.2);
      }
    `;
    document.head.appendChild(style);
  }

  // -------------------------
  // Toast + Alert UI
  // -------------------------
  function ensureToastUI() {
    if (!document.getElementById("toastWrap")) {
      const wrap = document.createElement("div");
      wrap.id = "toastWrap";
      wrap.style.cssText = `
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(wrap);
    }

    if (!document.getElementById("toastStyles")) {
      const style = document.createElement("style");
      style.id = "toastStyles";
      style.textContent = `
        .toast{
          pointer-events:auto;
          min-width:280px;
          max-width:420px;
          border-radius:14px;
          padding:14px;
          box-shadow:0 12px 30px rgba(0,0,0,.18);
          color:#fff;
          position:relative;
          overflow:hidden;
          transform:translateY(-10px);
          opacity:0;
          animation:toastIn .28s ease forwards;
          display:flex;
          gap:12px;
          align-items:flex-start;
        }
        .toast.success{ background:linear-gradient(135deg,#16a34a,#22c55e); }
        .toast.error{ background:linear-gradient(135deg,#dc2626,#f43f5e); }
        .toast .icon{
          width:34px;height:34px;border-radius:10px;
          display:grid;place-items:center;
          background:rgba(255,255,255,.18);
          flex:0 0 auto;font-weight:800;
        }
        .toast .content{ flex:1; }
        .toast .title{ font-weight:800;margin:0;line-height:1.1;letter-spacing:.2px; }
        .toast .msg{ margin:6px 0 0;opacity:.95;line-height:1.35;word-break:break-word; }
        .toast .close{
          border:none;background:rgba(255,255,255,.18);color:#fff;
          border-radius:10px;width:32px;height:32px;
          cursor:pointer;flex:0 0 auto;font-size:18px;line-height:1;
        }
        .toast .bar{
          position:absolute;left:0;bottom:0;height:4px;width:100%;
          background:rgba(255,255,255,.35);
          transform-origin:left;
          animation:bar 3.2s linear forwards;
        }
        @keyframes toastIn{ to{ transform:translateY(0);opacity:1; } }
        @keyframes toastOut{ to{ transform:translateY(-8px);opacity:0; } }
        @keyframes bar{ to{ transform:scaleX(0); } }

        .form-alert{
          margin:10px 0 0;
          border-radius:12px;
          padding:10px 12px;
          display:none;
          font-size:14px;
          line-height:1.35;
          border:1px solid rgba(0,0,0,.06);
        }
        .form-alert.error{
          display:block;
          background:rgba(244,63,94,.10);
          color:#9f1239;
          border-color:rgba(244,63,94,.25);
        }
        .form-alert.success{
          display:block;
          background:rgba(34,197,94,.12);
          color:#166534;
          border-color:rgba(34,197,94,.25);
        }
      `;
      document.head.appendChild(style);
    }
  }

  const escapeHtml = (str) =>
    String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  function showToast(type, title, msg) {
    const wrap = document.getElementById("toastWrap");
    if (!wrap) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="icon">${type === "success" ? "✓" : "!"}</div>
      <div class="content">
        <p class="title">${escapeHtml(title)}</p>
        <p class="msg">${escapeHtml(msg)}</p>
      </div>
      <button class="close" aria-label="Close">×</button>
      <div class="bar"></div>
    `;

    const dismiss = () => {
      if (toast.dataset.closing) return;
      toast.dataset.closing = "1";
      toast.style.animation = "toastOut .22s ease forwards";
      setTimeout(() => toast.remove(), 220);
    };

    toast.querySelector(".close").addEventListener("click", dismiss);
    wrap.appendChild(toast);
    setTimeout(dismiss, 3200);
  }

  function ensureInlineAlert(formEl, id) {
    if (!formEl) return null;
    let alert = document.getElementById(id);
    if (!alert) {
      alert = document.createElement("div");
      alert.id = id;
      alert.className = "form-alert";
      const btnWrap = formEl.querySelector(".field.btn");
      if (btnWrap) btnWrap.insertAdjacentElement("beforebegin", alert);
      else formEl.appendChild(alert);
    }
    return alert;
  }

  function clearAlert(alertEl) {
    if (!alertEl) return;
    alertEl.className = "form-alert";
    alertEl.textContent = "";
  }

  function showAlert(alertEl, type, msg) {
    if (!alertEl) return;
    alertEl.className = `form-alert ${type}`;
    alertEl.textContent = msg;
  }

  function setLoading(formEl, isLoading) {
    if (!formEl) return;
    formEl.classList.toggle("loading", !!isLoading);
  }

  // -------------------------
  // Persistent Button Lock
  // -------------------------
  function getSubmitButton(formEl) {
    return formEl?.querySelector('input[type="submit"], button[type="submit"]') || null;
  }

  function getButtonLabel(btn) {
    const dataLabel = btn?.getAttribute("data-label");
    const aria = btn?.getAttribute("aria-label");
    const direct =
      btn?.tagName === "INPUT" ? btn.value : (btn?.textContent || "").trim();
    return (dataLabel || aria || direct || "Submit").trim();
  }

  function setButtonLabel(btn, txt) {
    const safe = String(txt ?? "").trim() || "Submit";
    if (btn.tagName === "INPUT") btn.value = safe;
    else btn.textContent = safe;
  }

  function parseRetryAfterSeconds(res, fallback = 60) {
    const raw = res.headers.get("Retry-After");
    if (!raw) return fallback;

    const asNum = Number(raw);
    if (Number.isFinite(asNum) && asNum > 0) return Math.ceil(asNum);

    const dt = Date.parse(raw);
    if (!Number.isNaN(dt)) {
      const diff = Math.ceil((dt - Date.now()) / 1000);
      return diff > 0 ? diff : fallback;
    }
    return fallback;
  }

  function getLockKey(formEl) {
    // Make login/signup keys never collide
    if (formEl?.classList.contains("login")) return "auth_lock_login";
    if (formEl?.classList.contains("signup")) return "auth_lock_signup";

    // fallback (rare)
    const id = formEl?.id || "";
    const cls = formEl?.className || "";
    return `auth_lock_${id || cls || "form"}`;
  }

  function saveLockState(formEl, btn) {
    const key = getLockKey(formEl);
    const unlockAt = Number(btn.dataset.unlockAt || 0);
    const originalLabel = btn.dataset.originalLabel || getButtonLabel(btn);
    localStorage.setItem(key, JSON.stringify({ unlockAt, originalLabel }));
  }

  function clearLockState(formEl) {
    localStorage.removeItem(getLockKey(formEl));
  }

  function lockButtonUntil(formEl, unlockAtMs) {
    const btn = getSubmitButton(formEl);
    if (!formEl || !btn) return;

    if (!btn.dataset.originalLabel) {
      btn.dataset.originalLabel = getButtonLabel(btn);
    }

    btn.dataset.unlockAt = String(unlockAtMs);
    saveLockState(formEl, btn);

    // Clear old timer
    if (btn.dataset.lockTimer) {
      clearInterval(Number(btn.dataset.lockTimer));
      btn.dataset.lockTimer = "";
    }

    btn.disabled = true;

    const tick = () => {
      const remaining = Math.ceil((Number(btn.dataset.unlockAt) - Date.now()) / 1000);

      if (remaining <= 0) {
        if (btn.dataset.lockTimer) clearInterval(Number(btn.dataset.lockTimer));
        btn.dataset.lockTimer = "";
        btn.disabled = false;

        setButtonLabel(btn, btn.dataset.originalLabel || "Submit");
        delete btn.dataset.unlockAt;

        clearLockState(formEl);
        return;
      }

      setButtonLabel(btn, `Wait ${remaining}s`);
    };

    tick();
    const id = setInterval(tick, 250);
    btn.dataset.lockTimer = String(id);
  }

  function lockButtonFor(formEl, seconds) {
    const s = Math.max(0, Math.ceil(Number(seconds) || 0));
    if (s <= 0) return;
    lockButtonUntil(formEl, Date.now() + s * 1000);
  }

  function restoreButtonLock(formEl) {
    const btn = getSubmitButton(formEl);
    if (!formEl || !btn) return;

    const raw = localStorage.getItem(getLockKey(formEl));
    if (!raw) return;

    let saved;
    try {
      saved = JSON.parse(raw);
    } catch {
      clearLockState(formEl);
      return;
    }

    const unlockAt = Number(saved?.unlockAt || 0);
    if (!unlockAt) {
      clearLockState(formEl);
      return;
    }

    const remaining = Math.ceil((unlockAt - Date.now()) / 1000);
    if (remaining <= 0) {
      clearLockState(formEl);
      return;
    }

    btn.dataset.originalLabel = (saved?.originalLabel || getButtonLabel(btn) || "Submit").trim();
    lockButtonUntil(formEl, unlockAt);
  }

  // -------------------------
  // Extract message once
  // -------------------------
  function getMessageFromData(data, status) {
    if (data?.message) return data.message;
    if (Array.isArray(data?.errors) && data.errors.length) {
      return data.errors.map((e) => e.msg).filter(Boolean).join(" • ");
    }
    if (typeof data === "string" && data.trim()) return data;
    return `Request failed (${status})`;
  }

  // -------------------------
  // Slider (SYNCED: JS + radios + wrapper class)
  // -------------------------
  function initSlider() {
    const loginText = document.querySelector(".title-text .login");
    const loginFormSlide = document.querySelector("form.login");

    const loginLabel = document.querySelector("label.login");
    const signupLabel = document.querySelector("label.signup");
    const signupLink = document.querySelector("form .signup-link a");

    const wrapper =
      (loginFormSlide && loginFormSlide.closest(".wrapper")) ||
      document.querySelector(".wrapper") ||
      document.body;

    const loginRadio =
      document.querySelector('input[type="radio"][id="login"]') ||
      document.querySelector('input[type="radio"][name="slide"][value="login"]') ||
      document.querySelector('input[type="radio"][name="slide"].login');

    const signupRadio =
      document.querySelector('input[type="radio"][id="signup"]') ||
      document.querySelector('input[type="radio"][name="slide"][value="signup"]') ||
      document.querySelector('input[type="radio"][name="slide"].signup');

    function setSliderTransition(enabled) {
      if (!loginFormSlide || !loginText) return;
      const val = enabled ? "" : "none";
      loginFormSlide.style.transition = val;
      loginText.style.transition = val;
    }

    function forceReflow() {
      // eslint-disable-next-line no-unused-expressions
      document.body.offsetHeight;
    }

    function applyTab(tab, { animate = true } = {}) {
      const isSignup = tab === "signup";

      if (!animate) setSliderTransition(false);

      // Radios (if exist)
      if (loginRadio && signupRadio) {
        loginRadio.checked = !isSignup;
        signupRadio.checked = isSignup;
      }

      // Wrapper state class (helps CSS)
      wrapper.classList.toggle("is-signup", isSignup);
      wrapper.classList.toggle("is-login", !isSignup);
      wrapper.dataset.authTab = isSignup ? "signup" : "login";

      // Slide movement
      if (loginFormSlide && loginText) {
        forceReflow();
        loginFormSlide.style.marginLeft = isSignup ? "-50%" : "0%";
        loginText.style.marginLeft = isSignup ? "-50%" : "0%";
      }

      localStorage.setItem(AUTH_TAB_KEY, isSignup ? "signup" : "login");

      if (!animate) requestAnimationFrame(() => setSliderTransition(true));
    }

    // Restore tab on load (no jump)
    const saved = localStorage.getItem(AUTH_TAB_KEY);
    applyTab(saved === "signup" ? "signup" : "login", { animate: false });

    // Click handlers: prevent default to stop CSS label/radio fighting JS
    const goSignup = (e) => {
      if (e) e.preventDefault();
      applyTab("signup");
    };
    const goLogin = (e) => {
      if (e) e.preventDefault();
      applyTab("login");
    };

    if (signupLabel) signupLabel.addEventListener("click", goSignup);
    if (loginLabel) loginLabel.addEventListener("click", goLogin);
    if (signupLink) signupLink.addEventListener("click", goSignup);

    // Keyboard toggle radios
    if (signupRadio) signupRadio.addEventListener("change", () => applyTab("signup"));
    if (loginRadio) loginRadio.addEventListener("change", () => applyTab("login"));

    // expose function for later use (e.g. after signup success)
    return { applyTab };
  }

  // -------------------------
  // Auth submit handlers
  // -------------------------
  function initAuth(sliderApi) {
    const loginForm = document.querySelector("form.login");
    const signupForm = document.querySelector("form.signup");

    const loginAlert = ensureInlineAlert(loginForm, "loginAlert");
    const signupAlert = ensureInlineAlert(signupForm, "signupAlert");

    // Restore persistent locks on refresh
    restoreButtonLock(loginForm);
    restoreButtonLock(signupForm);

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearAlert(loginAlert);

        const inputs = loginForm.querySelectorAll("input");
        const user_name = (inputs[0]?.value || "").trim();
        const password = inputs[1]?.value || "";

        setLoading(loginForm, true);

        try {
          const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_name, password }),
          });

          const data = await res.json().catch(() => null);

          if (res.status === 429) {
            const retryAfter = parseRetryAfterSeconds(res, 60);
            const msg = getMessageFromData(data, res.status);

            showAlert(loginAlert, "error", msg);
            showToast("error", "Rate limited", msg);

            lockButtonFor(loginForm, retryAfter);
            return;
          }

          if (!res.ok) {
            const msg = getMessageFromData(data, res.status);
            showAlert(loginAlert, "error", msg);
            showToast("error", "Login failed", msg);
            return;
          }

          const okMsg = data?.message || "Login successful";
          showAlert(loginAlert, "success", okMsg);
          showToast("success", "Welcome back", okMsg);

          window.location.href = data?.redirectTo || "/show_cinemas";
          
        } catch {
          const msg = "Could not reach server. Check API_BASE / CORS.";
          showAlert(loginAlert, "error", msg);
          showToast("error", "Network error", msg);
        } finally {
          setLoading(loginForm, false);
        }
      });
    }

    if (signupForm) {
      signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearAlert(signupAlert);

        const inputs = signupForm.querySelectorAll("input");
        const first_name = (inputs[0]?.value || "").trim();
        const last_name = (inputs[1]?.value || "").trim();
        const user_name = (inputs[2]?.value || "").trim();
        const password = inputs[3]?.value || "";

        setLoading(signupForm, true);

        try {
          const res = await fetch(`${API_BASE}/create_account`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ first_name, last_name, user_name, password }),
          });

          const data = await res.json().catch(() => null);

          if (res.status === 429) {
            const retryAfter = parseRetryAfterSeconds(res, 60);
            const msg = getMessageFromData(data, res.status);

            showAlert(signupAlert, "error", msg);
            showToast("error", "Rate limited", msg);

            lockButtonFor(signupForm, retryAfter);
            return;
          }

          if (!res.ok) {
            const msg = getMessageFromData(data, res.status);
            showAlert(signupAlert, "error", msg);
            showToast("error", "Signup failed", msg);
            return;
          }

          const okMsg = data?.message || "Account created successfully";
          showAlert(signupAlert, "success", okMsg);
          showToast("success", "Account created", okMsg);

          // Switch to login after success + persist
          localStorage.setItem(AUTH_TAB_KEY, "login");
          if (sliderApi?.applyTab) sliderApi.applyTab("login");
          else {
            // fallback if sliderApi missing
            const loginLabel = document.querySelector("label.login");
            if (loginLabel) loginLabel.click();
          }

          inputs.forEach((i) => (i.value = ""));
        } catch {
          const msg = "Could not reach server. Check API_BASE / CORS.";
          showAlert(signupAlert, "error", msg);
          showToast("error", "Network error", msg);
        } finally {
          setLoading(signupForm, false);
        }
      });
    }
  }

  // -------------------------
  // Boot
  // -------------------------
  ready(() => {
    injectSafetyCSS();
    ensureToastUI();
    const sliderApi = initSlider();
    initAuth(sliderApi);
  });
})();
