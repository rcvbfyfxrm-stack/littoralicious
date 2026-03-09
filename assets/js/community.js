/**
 * Littoralicious — Community Engagement
 * Firebase-backed reactions, comments, voting, and replies
 */

(function () {
    'use strict';

    const VOTE_KEY = 'littoralicious-votes';
    const COMMENT_VOTE_KEY = 'littoralicious-comment-votes';

    // ======================================================================
    // Helpers
    // ======================================================================

    function getVotes() {
        try { return JSON.parse(localStorage.getItem(VOTE_KEY) || '{}'); }
        catch { return {}; }
    }

    function saveVote(articleId, type) {
        const votes = getVotes();
        votes[articleId] = type;
        localStorage.setItem(VOTE_KEY, JSON.stringify(votes));
    }

    function getCommentVotes() {
        try { return JSON.parse(localStorage.getItem(COMMENT_VOTE_KEY) || '{}'); }
        catch { return {}; }
    }

    function saveCommentVote(commentId, type) {
        const votes = getCommentVotes();
        votes[commentId] = type;
        localStorage.setItem(COMMENT_VOTE_KEY, JSON.stringify(votes));
    }

    const AVATAR_COLORS = ['#2d4a5e', '#5c9ead', '#4caf50', '#d4a816', '#7b1fa2', '#c0392b', '#e67e22', '#1abc9c'];

    function getAvatarColor(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }

    function buildAvatarHTML(name, photoURL) {
        if (photoURL) {
            return '<img class="comment__avatar" src="' + escapeHtml(photoURL) + '" alt="" loading="lazy">';
        }
        const initial = (name || '?').charAt(0).toUpperCase();
        const color = getAvatarColor(name || '');
        return '<span class="comment__avatar comment__avatar--initial" style="background:' + color + '">' + escapeHtml(initial) + '</span>';
    }

    function resizeImage(file, maxSize) {
        return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var img = new Image();
                img.onload = function () {
                    var w = img.width, h = img.height;
                    if (w > maxSize || h > maxSize) {
                        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
                        else { w = Math.round(w * maxSize / h); h = maxSize; }
                    }
                    var canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    canvas.toBlob(function (blob) { resolve(blob); }, 'image/jpeg', 0.85);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async function uploadAvatar(file) {
        if (!storage) return null;
        var blob = await resizeImage(file, 200);
        var filename = 'avatars/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.jpg';
        var ref = storage.ref(filename);
        await ref.put(blob, { contentType: 'image/jpeg' });
        return ref.getDownloadURL();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function timeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
        const days = Math.floor(hours / 24);
        if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
        const months = Math.floor(days / 30);
        return months + (months === 1 ? ' month ago' : ' months ago');
    }

    function getArticleSlug() {
        const section = document.querySelector('.article-reactions');
        return section ? section.dataset.articleId : null;
    }

    // ======================================================================
    // Article Reactions
    // ======================================================================

    async function initReactions() {
        const section = document.querySelector('.article-reactions');
        if (!section) return;

        const slug = section.dataset.articleId;
        if (!slug) return;

        const agreeBtn = section.querySelector('[data-reaction="agree"]');
        const disagreeBtn = section.querySelector('[data-reaction="disagree"]');
        const agreeCountEl = section.querySelector('.reaction-count--agree');
        const disagreeCountEl = section.querySelector('.reaction-count--disagree');
        const barFill = section.querySelector('.article-reactions__bar-fill');
        const statsEl = section.querySelector('.article-reactions__stats');

        const docRef = db.collection('articles').doc(slug);

        // Fetch current counts
        let data = { agrees: 0, disagrees: 0 };
        try {
            const snap = await docRef.get();
            if (snap.exists) data = snap.data();
        } catch (err) {
            console.log('Firestore read failed:', err.message);
        }

        function render(d) {
            if (agreeCountEl) agreeCountEl.textContent = d.agrees || 0;
            if (disagreeCountEl) disagreeCountEl.textContent = d.disagrees || 0;
            const total = (d.agrees || 0) + (d.disagrees || 0);
            if (barFill && total > 0) {
                barFill.style.width = Math.round(((d.agrees || 0) / total) * 100) + '%';
            }
            if (statsEl && total > 0) {
                statsEl.textContent = total + (total === 1 ? ' chef reacted' : ' chefs reacted');
            }
        }

        render(data);

        // Restore existing vote
        const existing = getVotes()[slug];
        if (existing === 'agree' && agreeBtn) agreeBtn.classList.add('active');
        if (existing === 'disagree' && disagreeBtn) disagreeBtn.classList.add('active');

        async function handleReaction(type, btn, otherBtn) {
            const wasActive = btn.classList.contains('active');
            agreeBtn?.classList.remove('active');
            disagreeBtn?.classList.remove('active');

            try {
                const updates = {
                    agrees: firebase.firestore.FieldValue.increment(0),
                    disagrees: firebase.firestore.FieldValue.increment(0),
                };

                if (wasActive) {
                    saveVote(slug, null);
                    updates[type + 's'] = firebase.firestore.FieldValue.increment(-1);
                    data[type + 's'] = Math.max(0, (data[type + 's'] || 0) - 1);
                } else {
                    const prev = getVotes()[slug];
                    if (prev && prev !== type) {
                        updates[prev + 's'] = firebase.firestore.FieldValue.increment(-1);
                        data[prev + 's'] = Math.max(0, (data[prev + 's'] || 0) - 1);
                    }
                    btn.classList.add('active');
                    saveVote(slug, type);
                    updates[type + 's'] = firebase.firestore.FieldValue.increment(1);
                    data[type + 's'] = (data[type + 's'] || 0) + 1;
                }

                await docRef.set(updates, { merge: true });
            } catch (err) {
                console.log('Firestore write failed:', err.message);
            }

            render(data);
        }

        agreeBtn?.addEventListener('click', () => handleReaction('agree', agreeBtn, disagreeBtn));
        disagreeBtn?.addEventListener('click', () => handleReaction('disagree', disagreeBtn, agreeBtn));
    }

    // ======================================================================
    // Comments
    // ======================================================================

    let currentSort = 'newest';

    function buildCommentHTML(comment, id, isReply) {
        const cls = isReply ? 'comment comment--reply' : 'comment';
        const commentVotes = getCommentVotes();
        const existingVote = commentVotes[id];
        const agreeActive = existingVote === 'agree' ? ' active' : '';
        const disagreeActive = existingVote === 'disagree' ? ' active' : '';
        const ts = comment.timestamp?.toDate ? comment.timestamp.toDate() : new Date(comment.timestamp);

        let html = '<div class="' + cls + '" data-comment-id="' + id + '">';
        html += '<div class="comment__header">';
        html += buildAvatarHTML(comment.name, comment.photoURL);
        html += '<div class="comment__meta">';
        html += '<span class="comment__author">' + escapeHtml(comment.name) + '</span>';

        // Badge
        if (comment.badge) {
            html += '<span class="comment__badge" style="color:' + escapeHtml(comment.badgeColor || '#94a3b8') + ';border-color:' + escapeHtml(comment.badgeColor || '#94a3b8') + '">' + escapeHtml(comment.badge) + '</span>';
        }

        // Boat & location info
        var infoItems = [];
        if (comment.boatName && comment.showBoatInfo !== false) {
            var boatText = comment.boatName;
            if (comment.boatSize) boatText += ' · ' + comment.boatSize + 'm';
            infoItems.push(boatText);
        }
        if (comment.location) infoItems.push(comment.location);
        if (infoItems.length > 0) {
            html += '<span class="comment__info">' + escapeHtml(infoItems.join(' — ')) + '</span>';
        }

        html += '</div>'; // .comment__meta
        html += '<span class="comment__date">' + timeAgo(ts) + '</span>';
        html += '</div>';
        html += '<div class="comment__body">' + escapeHtml(comment.content) + '</div>';
        html += '<div class="comment__actions">';
        html += '<button class="comment-vote-btn' + agreeActive + '" data-vote="agree" data-id="' + id + '">';
        html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>';
        html += '<span class="comment-vote-count">' + (comment.agrees || 0) + '</span>';
        html += '</button>';
        html += '<button class="comment-vote-btn' + disagreeActive + '" data-vote="disagree" data-id="' + id + '">';
        html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>';
        html += '<span class="comment-vote-count">' + (comment.disagrees || 0) + '</span>';
        html += '</button>';
        if (!isReply) {
            html += '<button class="comment-reply-btn" data-parent-id="' + id + '">Reply</button>';
        }
        html += '</div>';
        if (!isReply) {
            html += '<div class="comment__replies" data-parent-id="' + id + '"></div>';
        }
        html += '</div>';
        return html;
    }

    async function loadComments(slug) {
        const list = document.querySelector('.comments-list');
        if (!list) return;

        list.innerHTML = '<p class="comments-loading">Loading comments...</p>';

        try {
            const commentsRef = db.collection('articles').doc(slug).collection('comments');
            const orderField = currentSort === 'most-agreed' ? 'agrees' : 'timestamp';
            const orderDir = currentSort === 'most-agreed' ? 'desc' : 'desc';
            const snap = await commentsRef.orderBy(orderField, orderDir).get();

            if (snap.empty) {
                list.innerHTML = '<p class="comments-empty">No comments yet. Be the first to share your thoughts.</p>';
                updatePulse(slug, 0);
                return;
            }

            let html = '';
            const commentIds = [];
            snap.forEach(doc => {
                html += buildCommentHTML(doc.data(), doc.id, false);
                commentIds.push(doc.id);
            });
            list.innerHTML = html;

            updatePulse(slug, snap.size);

            // Load replies for each comment
            for (const cid of commentIds) {
                const repliesSnap = await commentsRef.doc(cid).collection('replies')
                    .orderBy('timestamp', 'asc').get();
                if (!repliesSnap.empty) {
                    const container = list.querySelector('.comment__replies[data-parent-id="' + cid + '"]');
                    if (container) {
                        repliesSnap.forEach(doc => {
                            container.innerHTML += buildCommentHTML(doc.data(), doc.id, true);
                        });
                    }
                }
            }

            bindCommentActions(slug);

        } catch (err) {
            console.log('Failed to load comments:', err.message);
            list.innerHTML = '<p class="comments-empty">Comments unavailable. Check back later.</p>';
        }
    }

    function bindCommentActions(slug) {
        // Vote buttons
        document.querySelectorAll('.comment-vote-btn').forEach(btn => {
            btn.addEventListener('click', async function () {
                const id = this.dataset.id;
                const type = this.dataset.vote;
                const countEl = this.querySelector('.comment-vote-count');
                const commentVotes = getCommentVotes();

                if (commentVotes[id] === type) return; // Already voted this way

                // Find the parent comment element to determine if this is a reply
                const commentEl = this.closest('.comment');
                const isReply = commentEl.classList.contains('comment--reply');
                const parentEl = commentEl.closest('.comment__replies');

                let ref;
                if (isReply && parentEl) {
                    const parentId = parentEl.dataset.parentId;
                    ref = db.collection('articles').doc(slug)
                        .collection('comments').doc(parentId)
                        .collection('replies').doc(id);
                } else {
                    ref = db.collection('articles').doc(slug).collection('comments').doc(id);
                }

                const prev = commentVotes[id];
                try {
                    const updates = { [type + 's']: firebase.firestore.FieldValue.increment(1) };
                    if (prev) {
                        updates[prev + 's'] = firebase.firestore.FieldValue.increment(-1);
                    }
                    await ref.update(updates);

                    // Update UI
                    const parent = this.parentElement;
                    if (prev) {
                        const prevBtn = parent.querySelector('[data-vote="' + prev + '"]');
                        prevBtn?.classList.remove('active');
                        const prevCount = prevBtn?.querySelector('.comment-vote-count');
                        if (prevCount) prevCount.textContent = Math.max(0, parseInt(prevCount.textContent) - 1);
                    }
                    this.classList.add('active');
                    if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
                    saveCommentVote(id, type);
                } catch (err) {
                    console.log('Vote failed:', err.message);
                }
            });
        });

        // Reply buttons
        document.querySelectorAll('.comment-reply-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const parentId = this.dataset.parentId;
                const repliesContainer = document.querySelector('.comment__replies[data-parent-id="' + parentId + '"]');
                if (!repliesContainer) return;

                // Don't add duplicate reply forms
                if (repliesContainer.querySelector('.reply-form')) return;

                const form = document.createElement('div');
                form.className = 'reply-form';
                form.innerHTML = `
                    <form>
                        <div class="comment-form__row">
                            <input type="text" name="name" placeholder="Your name" required>
                        </div>
                        <textarea name="comment" placeholder="Write a reply..." rows="3" required></textarea>
                        <div class="reply-form__actions">
                            <button type="submit">Post Reply</button>
                            <button type="button" class="reply-cancel-btn">Cancel</button>
                        </div>
                    </form>
                `;

                repliesContainer.prepend(form);
                form.querySelector('input[name="name"]').focus();

                form.querySelector('.reply-cancel-btn').addEventListener('click', () => form.remove());

                form.querySelector('form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const name = form.querySelector('input[name="name"]').value.trim();
                    const content = form.querySelector('textarea[name="comment"]').value.trim();
                    if (!name || !content) return;

                    const submitBtn = form.querySelector('button[type="submit"]');
                    submitBtn.textContent = 'Posting...';
                    submitBtn.disabled = true;

                    try {
                        const replyData = {
                            name: name,
                            content: content,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            agrees: 0,
                            disagrees: 0,
                        };

                        // Attach profile data if user is authenticated
                        if (window.littoralAuth) {
                            var authUser = window.littoralAuth.getUser();
                            if (authUser) {
                                replyData.uid = authUser.uid;
                                try {
                                    var profile = await window.littoralAuth.getUserProfile(authUser.uid);
                                    if (profile) {
                                        var badge = window.littoralAuth.getBadge(profile.yearsInIndustry);
                                        replyData.badge = badge.name;
                                        replyData.badgeColor = badge.color;
                                        if (profile.showBoatInfo !== false) {
                                            replyData.boatName = profile.boatName || '';
                                            replyData.boatSize = profile.boatSize || '';
                                            replyData.showBoatInfo = true;
                                        }
                                        replyData.location = profile.location || '';
                                    }
                                } catch (e) { /* proceed without profile data */ }
                            }
                        }

                        const docRef = await db.collection('articles').doc(slug)
                            .collection('comments').doc(parentId)
                            .collection('replies').add(replyData);

                        // Show reply immediately
                        const replyEl = document.createElement('div');
                        replyEl.innerHTML = buildCommentHTML(
                            { ...replyData, timestamp: { toDate: () => new Date() } },
                            docRef.id,
                            true
                        );
                        const newReply = replyEl.firstElementChild;
                        newReply.classList.add('comment--new');
                        form.remove();
                        repliesContainer.appendChild(newReply);
                        bindCommentActions(slug);
                    } catch (err) {
                        console.log('Reply failed:', err.message);
                        submitBtn.textContent = 'Post Reply';
                        submitBtn.disabled = false;
                    }
                });
            });
        });
    }

    function updatePulse(slug, commentCount) {
        const pulseEl = document.querySelector('.community-pulse__count');
        if (!pulseEl) return;
        // Count unique authors (approximate via comment count)
        if (commentCount > 0) {
            pulseEl.textContent = commentCount + (commentCount === 1 ? ' chef joined the conversation' : ' chefs joined the conversation');
        } else {
            pulseEl.textContent = 'Be the first to join the conversation';
        }
    }

    async function initComments() {
        const slug = getArticleSlug();
        if (!slug) return;

        const commentsSection = document.querySelector('.article-comments');
        if (!commentsSection) return;

        // Sort controls
        const sortBtns = commentsSection.querySelectorAll('.comments-sort__btn');
        sortBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                sortBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentSort = this.dataset.sort;
                loadComments(slug);
            });
        });

        // Comment form
        const form = commentsSection.querySelector('.comment-form form');
        if (form) {
            // Photo upload preview
            let pendingPhoto = null;
            const photoInput = form.querySelector('input[name="photo"]');
            const photoPreview = form.querySelector('.photo-upload__preview');
            if (photoInput) {
                photoInput.addEventListener('change', function () {
                    const file = this.files[0];
                    if (!file) { pendingPhoto = null; if (photoPreview) photoPreview.style.backgroundImage = ''; return; }
                    pendingPhoto = file;
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        if (photoPreview) {
                            photoPreview.style.backgroundImage = 'url(' + e.target.result + ')';
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const nameInput = form.querySelector('input[name="name"]');
                const emailInput = form.querySelector('input[name="email"]');
                const commentInput = form.querySelector('textarea[name="comment"]');
                const subscribeCheckbox = form.querySelector('input[name="subscribe"]');
                const submitBtn = form.querySelector('button[type="submit"]');

                const name = nameInput?.value?.trim();
                const email = emailInput?.value?.trim();
                const content = commentInput?.value?.trim();
                const subscribe = subscribeCheckbox?.checked;

                if (!name || !content) {
                    alert('Please enter your name and comment.');
                    return;
                }

                submitBtn.textContent = 'Posting...';
                submitBtn.disabled = true;

                // Newsletter opt-in
                if (subscribe && email) {
                    try {
                        const formData = new FormData();
                        formData.append('email', email);
                        await fetch('https://buttondown.com/api/emails/embed-subscribe/littoralicious', {
                            method: 'POST',
                            body: formData,
                        });
                    } catch (err) {
                        console.log('Newsletter subscription attempted');
                    }
                }

                try {
                    // Upload photo if selected
                    let photoURL = null;
                    if (pendingPhoto) {
                        try {
                            photoURL = await uploadAvatar(pendingPhoto);
                        } catch (err) {
                            console.log('Photo upload failed:', err.message);
                        }
                    }

                    const commentData = {
                        name: name,
                        content: content,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        agrees: 0,
                        disagrees: 0,
                    };
                    if (photoURL) commentData.photoURL = photoURL;

                    // Attach profile data if user is authenticated
                    if (window.littoralAuth) {
                        var authUser = window.littoralAuth.getUser();
                        if (authUser) {
                            commentData.uid = authUser.uid;
                            try {
                                var profile = await window.littoralAuth.getUserProfile(authUser.uid);
                                if (profile) {
                                    var badge = window.littoralAuth.getBadge(profile.yearsInIndustry);
                                    commentData.badge = badge.name;
                                    commentData.badgeColor = badge.color;
                                    if (profile.showBoatInfo !== false) {
                                        commentData.boatName = profile.boatName || '';
                                        commentData.boatSize = profile.boatSize || '';
                                        commentData.showBoatInfo = true;
                                    }
                                    commentData.location = profile.location || '';
                                }
                            } catch (e) { /* proceed without profile data */ }
                        }
                    }

                    const docRef = await db.collection('articles').doc(slug)
                        .collection('comments').add(commentData);

                    // Show comment immediately
                    const list = document.querySelector('.comments-list');
                    const emptyMsg = list?.querySelector('.comments-empty');
                    if (emptyMsg) emptyMsg.remove();

                    if (list) {
                        const el = document.createElement('div');
                        el.innerHTML = buildCommentHTML(
                            { ...commentData, photoURL: photoURL, timestamp: { toDate: () => new Date() } },
                            docRef.id,
                            false
                        );
                        const newComment = el.firstElementChild;
                        newComment.classList.add('comment--new');
                        list.prepend(newComment);
                        bindCommentActions(slug);
                    }

                    form.reset();
                    pendingPhoto = null;
                    if (photoPreview) photoPreview.style.backgroundImage = '';
                    submitBtn.textContent = 'Posted!';
                    setTimeout(() => {
                        submitBtn.textContent = 'Post Comment';
                        submitBtn.disabled = false;
                    }, 2000);
                } catch (err) {
                    console.log('Comment failed:', err.message);
                    submitBtn.textContent = 'Post Comment';
                    submitBtn.disabled = false;
                }
            });
        }

        await loadComments(slug);
    }

    // ======================================================================
    // Initialize
    // ======================================================================

    document.addEventListener('DOMContentLoaded', () => {
        if (typeof firebase === 'undefined' || typeof db === 'undefined') {
            console.log('Firebase not loaded — community features disabled');
            return;
        }
        initReactions();
        initComments();
    });
})();
