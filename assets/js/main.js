/**
 * Littoralicious — Main JavaScript
 * Minimal, purposeful interactions only
 */

(function () {
    'use strict';

    // ==========================================================================
    // Theme Toggle
    // ==========================================================================

    const THEME_KEY = 'littoralicious-theme';

    function getPreferredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) return stored;

        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
    }

    // Initialize theme on load
    setTheme(getPreferredTheme());

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });

    // Expose toggle function globally for theme toggle button
    window.toggleTheme = toggleTheme;

    // ==========================================================================
    // Temperature Auto-formatting
    // ==========================================================================

    function formatTemperatures() {
        const temps = document.querySelectorAll('.temperature:not([data-formatted])');
        temps.forEach((el) => {
            el.setAttribute('data-formatted', 'true');
            // Already formatted via CSS pseudo-element
        });
    }

    // ==========================================================================
    // Reading Progress (for articles)
    // ==========================================================================

    function initReadingProgress() {
        const article = document.querySelector('.article-body');
        if (!article) return;

        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 2px;
            background: var(--color-sea);
            z-index: 1000;
            transition: width 100ms ease-out;
        `;
        document.body.appendChild(progressBar);

        function updateProgress() {
            const articleRect = article.getBoundingClientRect();
            const articleTop = articleRect.top + window.scrollY;
            const articleHeight = articleRect.height;
            const windowHeight = window.innerHeight;
            const scrollY = window.scrollY;

            const start = articleTop;
            const end = articleTop + articleHeight - windowHeight;
            const current = scrollY;

            let progress = ((current - start) / (end - start)) * 100;
            progress = Math.max(0, Math.min(100, progress));

            progressBar.style.width = `${progress}%`;
        }

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
    }

    // ==========================================================================
    // Smooth Scroll for Anchor Links
    // ==========================================================================

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;

                const target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
                }
            });
        });
    }

    // ==========================================================================
    // Copy Code Blocks
    // ==========================================================================

    function initCodeCopy() {
        document.querySelectorAll('pre').forEach((pre) => {
            const button = document.createElement('button');
            button.textContent = 'Copy';
            button.style.cssText = `
                position: absolute;
                top: var(--space-2);
                right: var(--space-2);
                padding: var(--space-1) var(--space-2);
                font-size: var(--text-xs);
                font-family: var(--font-mono);
                background: var(--color-paper);
                border: 1px solid var(--color-border);
                cursor: pointer;
                opacity: 0;
                transition: opacity 150ms ease;
            `;

            pre.style.position = 'relative';
            pre.appendChild(button);

            pre.addEventListener('mouseenter', () => {
                button.style.opacity = '1';
            });

            pre.addEventListener('mouseleave', () => {
                button.style.opacity = '0';
            });

            button.addEventListener('click', async () => {
                const code = pre.querySelector('code')?.textContent || pre.textContent;
                try {
                    await navigator.clipboard.writeText(code);
                    button.textContent = 'Copied';
                    setTimeout(() => {
                        button.textContent = 'Copy';
                    }, 2000);
                } catch (err) {
                    button.textContent = 'Failed';
                }
            });
        });
    }

    // ==========================================================================
    // External Link Handling
    // ==========================================================================

    function initExternalLinks() {
        document.querySelectorAll('a[href^="http"]').forEach((link) => {
            if (!link.hostname.includes(window.location.hostname)) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
    }

    // ==========================================================================
    // Newsletter Form
    // ==========================================================================

    function initNewsletterForm() {
        const forms = document.querySelectorAll('.newsletter-form');
        if (!forms.length) return;

        forms.forEach(function (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const emailInput = form.querySelector('input[type="email"]');
                const button = form.querySelector('button[type="submit"]');
                const statusEl = form.parentElement.querySelector('[class*="status"]');
                const email = emailInput?.value;

                if (!email) return;

                button.textContent = 'Subscribing...';
                button.disabled = true;

                try {
                    const formData = new FormData();
                    formData.append('email', email);

                    const res = await fetch(form.action, {
                        method: 'POST',
                        body: formData,
                    });

                    if (res.ok || res.status === 201) {
                        button.textContent = 'Subscribed';
                        emailInput.value = '';
                        if (statusEl) {
                            statusEl.textContent = 'You\'re in. First issue arrives next month.';
                            statusEl.className = statusEl.className.replace(/--error/, '') + ' newsletter-signup__status--success';
                        }
                    } else {
                        throw new Error('Subscription failed');
                    }
                } catch (err) {
                    button.textContent = 'Subscribe';
                    if (statusEl) {
                        statusEl.textContent = 'Something went wrong. Try again.';
                        statusEl.className = statusEl.className.replace(/--success/, '') + ' newsletter-signup__status--error';
                    }
                }

                button.disabled = false;

                setTimeout(() => {
                    button.textContent = 'Subscribe';
                    if (statusEl) statusEl.textContent = '';
                }, 5000);
            });
        });
    }

    // ==========================================================================
    // Share Buttons
    // ==========================================================================

    function initShareButtons() {
        const shareSection = document.querySelector('.article-share');
        if (!shareSection) return;

        const title = document.title;
        const url = window.location.href;

        const twitterBtn = shareSection.querySelector('[data-share="twitter"]');
        const linkedinBtn = shareSection.querySelector('[data-share="linkedin"]');
        const copyBtn = shareSection.querySelector('[data-share="copy"]');

        twitterBtn?.addEventListener('click', () => {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank', 'width=550,height=420');
        });

        linkedinBtn?.addEventListener('click', () => {
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=550,height=420');
        });

        copyBtn?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(url);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
                }, 2000);
            } catch {
                // Fallback
            }
        });
    }

    // ==========================================================================
    // Print & Download
    // ==========================================================================

    function initPrintButton() {
        const printBtns = document.querySelectorAll('.print-btn, [data-action="print"]');
        printBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                window.print();
            });
        });
    }

    function initDownloadPDF() {
        const downloadBtns = document.querySelectorAll('.download-btn, [data-action="download"]');
        downloadBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Use browser's print-to-PDF functionality
                // This triggers the print dialog where user can save as PDF
                window.print();
            });
        });
    }

    // ==========================================================================
    // Table of Contents Generator
    // ==========================================================================

    function generateTableOfContents() {
        const tocContainer = document.querySelector('.article-toc');
        if (!tocContainer) return;

        const article = document.querySelector('.article__content, .article-body');
        if (!article) return;

        const headings = article.querySelectorAll('h2');
        if (headings.length < 2) {
            tocContainer.style.display = 'none';
            return;
        }

        const list = document.createElement('ol');

        headings.forEach((heading, index) => {
            // Add ID to heading if it doesn't have one
            if (!heading.id) {
                heading.id = `section-${index + 1}`;
            }

            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = `#${heading.id}`;
            link.textContent = heading.textContent;
            li.appendChild(link);
            list.appendChild(li);
        });

        // Clear existing content and add new TOC
        const title = tocContainer.querySelector('.article-toc__title');
        if (title) {
            tocContainer.innerHTML = '';
            tocContainer.appendChild(title.cloneNode(true));
        }
        tocContainer.appendChild(list);
    }

    // ==========================================================================
    // Initialize
    // ==========================================================================

    // ==========================================================================
    // WhatsApp links — auto-enhance phone numbers
    // - Adds a WhatsApp button after every <a href="tel:+...">
    // - Auto-linkifies "Phone / Mobile / Harbour / WhatsApp" entries in supplier
    //   meta blocks (so existing static articles get WA links without edits)
    // ==========================================================================

    function buildWaButton(digits) {
        const a = document.createElement('a');
        a.className = 'wa-link';
        a.href = 'https://wa.me/' + digits;
        a.target = '_blank';
        a.rel = 'noopener';
        a.title = 'Chat on WhatsApp';
        a.setAttribute('aria-label', 'Chat on WhatsApp');
        a.innerHTML = '<span aria-hidden="true">💬</span> WhatsApp';
        return a;
    }

    function enhancePhoneNumbers() {
        // 1) Tel links → append WhatsApp button
        document.querySelectorAll('a[href^="tel:+"]').forEach((a) => {
            if (a.dataset.waEnhanced) return;
            const digits = a.getAttribute('href').replace(/^tel:\+/, '').replace(/\D/g, '');
            if (!digits) return;
            a.dataset.waEnhanced = '1';
            a.insertAdjacentText('afterend', ' ');
            a.parentNode.insertBefore(buildWaButton(digits), a.nextSibling);
        });

        // 2) Static "Phone / Mobile / Harbour / WhatsApp" rows in supplier meta blocks
        const PHONE_LABELS = ['phone', 'mobile', 'harbour', 'whatsapp', 'tel', 'cell'];
        document.querySelectorAll('.pfold__meta div, .pcv-card__meta div').forEach((row) => {
            if (row.dataset.waEnhanced) return;
            const strong = row.querySelector('strong');
            if (!strong) return;
            const label = strong.textContent.trim().toLowerCase();
            if (!PHONE_LABELS.includes(label)) return;
            // Already linkified?
            if (row.querySelector('a[href^="tel:"]')) return;
            // Extract phone number from the text node after <strong>
            const after = strong.nextSibling;
            if (!after || after.nodeType !== 3) return;
            const raw = after.textContent.trim();
            const match = raw.match(/\+?[\d][\d\s\-().]{6,}/);
            if (!match) return;
            const fullNum = match[0].trim();
            const digits = fullNum.replace(/\D/g, '');
            if (digits.length < 7) return;
            const tel = document.createElement('a');
            tel.href = 'tel:+' + digits;
            tel.textContent = fullNum;
            after.parentNode.replaceChild(tel, after);
            tel.insertAdjacentText('afterend', ' ');
            tel.parentNode.insertBefore(buildWaButton(digits), tel.nextSibling);
            row.dataset.waEnhanced = '1';
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        formatTemperatures();
        initReadingProgress();
        initSmoothScroll();
        initCodeCopy();
        initExternalLinks();
        initNewsletterForm();
        // Reactions and comments now handled by community.js (Firebase-backed)
        initShareButtons();
        initPrintButton();
        initDownloadPDF();
        generateTableOfContents();
        enhancePhoneNumbers();
        // Re-run after dynamic supplier rendering
        setTimeout(enhancePhoneNumbers, 1500);
    });
})();
