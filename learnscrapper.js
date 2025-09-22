// ==UserScript==
// @name         Export Quiz Text → Clipboard
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Copy quiz questions + choices to clipboard with one click
// @match        https://learn.astanait.edu.kz/*
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // --- UI button ---
  function addButton() {
    const btn = document.createElement('button');
    btn.textContent = 'Export text';
    Object.assign(btn.style, {
      position: 'fixed', right: '18px', bottom: '18px', zIndex: 99999,
      padding: '8px 12px', borderRadius: '6px', background: '#fff',
      border: '1px solid #2d6cdf', boxShadow: '0 2px 6px rgba(0,0,0,.15)',
      cursor: 'pointer', fontFamily: 'system-ui, Arial, sans-serif'
    });
    btn.addEventListener('click', copyAll);
    document.body.appendChild(btn);
  }

  // --- Helpers ---
  const qSelectors = [
    '.wrapper-problem-response', // primary (your saved page)
    '.problem',                  // common edX
    '.problems-wrapper .problem' // fallback
  ];

  function findProblems() {
    for (const sel of qSelectors) {
      const list = Array.from(document.querySelectorAll(sel));
      if (list.length) return list;
    }
    return [];
  }

  function getQuestionText(node) {
    // get visible textual parts commonly used for the prompt
    const parts = Array.from(node.querySelectorAll(
      // headings / prompt paragraphs near the top
      'h1, h2, h3, .problem-header, .problem-statement, .prompt, .question, .problem > p, p'
    )).map(e => e.innerText.trim()).filter(Boolean);

    // Heuristic: keep first few non-empty paragraphs if there’s too much
    const joined = parts.length ? parts.join('\n') : (node.innerText || '').trim();
    // Light cleanup
    return joined.replace(/\n{3,}/g, '\n\n');
  }

  function getChoices(node) {
    // collect labels for radio/checkbox choices
    const raw = Array.from(node.querySelectorAll('.response-label, .choice label, label'))
      .map(l => l.innerText.trim()).filter(Boolean);

    // de-dup + strip submit-like items
    const unique = Array.from(new Set(raw)).filter(t =>
      !/^submit|check|проверить|отправить/i.test(t)
    );

    // label choices A), B), ...
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return unique.map((t, i) => `${letters[i] || '?'} ) ${t}`);
  }

  function buildPlainText() {
    const problems = findProblems();
    if (!problems.length) return 'No questions found on this page.';

    const lines = [];
    problems.forEach((p, idx) => {
      const q = getQuestionText(p);
      const choices = getChoices(p);
      lines.push(`${idx + 1}. ${q}`);
      if (choices.length) {
        choices.forEach(ch => lines.push(`   ${ch}`));
      } else {
        lines.push('   [Open-response / no choices detected]');
      }
      lines.push(''); // blank line between questions
    });
    return lines.join('\n');
  }

  async function copyText(text) {
    // Prefer Tampermonkey API if available
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(text, { type: 'text', mimetype: 'text/plain' });
      return true;
    }
    // Then try modern clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    }
    // Fallback: hidden textarea + execCommand
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      document.body.removeChild(ta);
      return false;
    }
  }

  async function copyAll() {
    const txt = buildPlainText();
    const ok = await copyText(txt);
    showToast(ok ? 'Exported: text copied to clipboard ✅' : 'Copy failed ❌');
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '18px', left: '18px', zIndex: 99999,
      background: '#111', color: '#fff', padding: '10px 12px',
      borderRadius: '8px', opacity: '0', transition: 'opacity .2s'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.style.opacity = '1');
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 1600);
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addButton);
  } else {
    addButton();
  }
})();
