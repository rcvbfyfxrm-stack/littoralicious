/**
 * Littoralicious — Authentication
 * Firebase Auth: sign-up, login, logout, profile with boat/industry info & badges
 */

(function () {
    'use strict';

    const auth = firebase.auth();

    // ======================================================================
    // Badge System — nautical-themed ranks by years in the industry
    // ======================================================================

    const BADGES = [
        { min: 0, max: 1, name: 'Beachcomber', color: '#94a3b8' },
        { min: 1, max: 3, name: 'Rockpooler', color: '#5c9ead' },
        { min: 3, max: 5, name: 'Tide Reader', color: '#2d4a5e' },
        { min: 5, max: 8, name: 'Salt Keeper', color: '#4caf50' },
        { min: 8, max: 12, name: 'Reef Master', color: '#d4a816' },
        { min: 12, max: 20, name: 'Deep Water', color: '#e67e22' },
        { min: 20, max: 99, name: 'Old Salt', color: '#7b1fa2' },
    ];

    function getBadge(years) {
        var y = parseInt(years) || 0;
        for (var i = 0; i < BADGES.length; i++) {
            if (y >= BADGES[i].min && y < BADGES[i].max) return BADGES[i];
        }
        return BADGES[BADGES.length - 1];
    }

    // Expose globally for community.js
    window.littoralAuth = {
        getBadge: getBadge,
        getUser: function () { return auth.currentUser; },
        getUserProfile: function (uid) {
            return db.collection('users').doc(uid).get().then(function (snap) {
                return snap.exists ? snap.data() : null;
            });
        },
        onAuthStateChanged: function (cb) { auth.onAuthStateChanged(cb); }
    };

    // ======================================================================
    // Auth State Observer
    // ======================================================================

    auth.onAuthStateChanged(function (user) {
        updateNavAuth(user);
        updateConnectPage(user);
        updateCommentForms(user);
    });

    // ======================================================================
    // Nav Auth State
    // ======================================================================

    function updateNavAuth(user) {
        document.querySelectorAll('.auth-nav-link').forEach(function (el) {
            if (user) {
                el.textContent = user.displayName || 'Profile';
                el.href = 'connect.html';
            } else {
                el.textContent = 'Sign In';
                el.href = 'connect.html';
            }
        });
    }

    // ======================================================================
    // Connect Page (Sign-up / Login / Profile)
    // ======================================================================

    function updateConnectPage(user) {
        var authSection = document.getElementById('auth-section');
        var profileSection = document.getElementById('profile-section');
        if (!authSection || !profileSection) return;

        if (user) {
            authSection.style.display = 'none';
            profileSection.style.display = 'block';
            renderProfile(user);
        } else {
            authSection.style.display = 'block';
            profileSection.style.display = 'none';
        }
    }

    function renderProfile(user) {
        var nameEl = document.getElementById('profile-name');
        var emailEl = document.getElementById('profile-email');
        var avatarEl = document.getElementById('profile-avatar');
        var nameInput = document.getElementById('profile-name-input');

        if (nameEl) nameEl.textContent = user.displayName || 'Chef';
        if (emailEl) emailEl.textContent = user.email;
        if (avatarEl) avatarEl.textContent = (user.displayName || 'C').charAt(0).toUpperCase();
        if (nameInput) nameInput.value = user.displayName || '';

        // Load extended profile from Firestore
        db.collection('users').doc(user.uid).get().then(function (snap) {
            if (!snap.exists) return;
            var data = snap.data();

            var boatInput = document.getElementById('profile-boat-name');
            var sizeInput = document.getElementById('profile-boat-size');
            var locationInput = document.getElementById('profile-location');
            var yearsInput = document.getElementById('profile-years');
            var showBoatCheckbox = document.getElementById('profile-show-boat');
            var badgeEl = document.getElementById('profile-badge');
            var badgeNameEl = document.getElementById('profile-badge-name');
            var boatInfoEl = document.getElementById('profile-boat-info');
            var locationInfoEl = document.getElementById('profile-location-info');

            if (boatInput) boatInput.value = data.boatName || '';
            if (sizeInput) sizeInput.value = data.boatSize || '';
            if (locationInput) locationInput.value = data.location || '';
            if (yearsInput) yearsInput.value = data.yearsInIndustry || '';
            if (showBoatCheckbox) showBoatCheckbox.checked = data.showBoatInfo !== false;

            // Show badge
            var badge = getBadge(data.yearsInIndustry);
            if (badgeEl) {
                badgeEl.style.borderColor = badge.color;
                badgeEl.style.color = badge.color;
            }
            if (badgeNameEl) badgeNameEl.textContent = badge.name;

            // Show boat info on card
            if (boatInfoEl && data.boatName && data.showBoatInfo !== false) {
                var text = data.boatName;
                if (data.boatSize) text += ' · ' + data.boatSize + 'm';
                boatInfoEl.textContent = text;
                boatInfoEl.style.display = 'block';
            }

            if (locationInfoEl && data.location) {
                locationInfoEl.textContent = data.location;
                locationInfoEl.style.display = 'block';
            }
        });
    }

    // ======================================================================
    // Update Comment Forms with Auth User
    // ======================================================================

    function updateCommentForms(user) {
        var nameInputs = document.querySelectorAll('.comment-form input[name="name"]');
        nameInputs.forEach(function (input) {
            if (user && user.displayName) {
                input.value = user.displayName;
                input.readOnly = true;
                input.style.opacity = '0.7';
            } else {
                input.readOnly = false;
                input.style.opacity = '1';
            }
        });
    }

    // ======================================================================
    // Form Handlers — initialized on DOMContentLoaded
    // ======================================================================

    document.addEventListener('DOMContentLoaded', function () {

        // --- Tab Switching ---
        var tabBtns = document.querySelectorAll('.auth-tab');
        var loginForm = document.getElementById('login-form');
        var signupForm = document.getElementById('signup-form');

        tabBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                tabBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var tab = btn.dataset.tab;
                if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
                if (signupForm) signupForm.style.display = tab === 'signup' ? 'block' : 'none';
                clearAuthError();
            });
        });

        // --- Sign Up ---
        var signupEl = document.getElementById('signup-form');
        if (signupEl) {
            signupEl.addEventListener('submit', function (e) {
                e.preventDefault();
                var name = signupEl.querySelector('input[name="name"]').value.trim();
                var email = signupEl.querySelector('input[name="email"]').value.trim();
                var password = signupEl.querySelector('input[name="password"]').value;
                var btn = signupEl.querySelector('button[type="submit"]');

                if (!name || !email || !password) return;
                if (password.length < 6) {
                    showAuthError('Password must be at least 6 characters.');
                    return;
                }

                btn.textContent = 'Creating account...';
                btn.disabled = true;

                auth.createUserWithEmailAndPassword(email, password)
                    .then(function (cred) {
                        return cred.user.updateProfile({ displayName: name });
                    })
                    .then(function () {
                        return db.collection('users').doc(auth.currentUser.uid).set({
                            name: name,
                            email: email,
                            joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                            yearsInIndustry: 0,
                            boatName: '',
                            boatSize: '',
                            location: '',
                            showBoatInfo: true
                        });
                    })
                    .then(function () {
                        clearAuthError();
                        updateConnectPage(auth.currentUser);
                    })
                    .catch(function (err) {
                        showAuthError(friendlyError(err.code));
                        btn.textContent = 'Create Account';
                        btn.disabled = false;
                    });
            });
        }

        // --- Login ---
        var loginEl = document.getElementById('login-form');
        if (loginEl) {
            loginEl.addEventListener('submit', function (e) {
                e.preventDefault();
                var email = loginEl.querySelector('input[name="email"]').value.trim();
                var password = loginEl.querySelector('input[name="password"]').value;
                var btn = loginEl.querySelector('button[type="submit"]');

                if (!email || !password) return;

                btn.textContent = 'Signing in...';
                btn.disabled = true;

                auth.signInWithEmailAndPassword(email, password)
                    .then(function () {
                        clearAuthError();
                    })
                    .catch(function (err) {
                        showAuthError(friendlyError(err.code));
                        btn.textContent = 'Sign In';
                        btn.disabled = false;
                    });
            });
        }

        // --- Google Sign-In ---
        var googleBtns = document.querySelectorAll('.auth-google-btn');
        googleBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var provider = new firebase.auth.GoogleAuthProvider();
                auth.signInWithPopup(provider)
                    .then(function (result) {
                        if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
                            return db.collection('users').doc(result.user.uid).set({
                                name: result.user.displayName || '',
                                email: result.user.email || '',
                                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                yearsInIndustry: 0,
                                boatName: '',
                                boatSize: '',
                                location: '',
                                showBoatInfo: true
                            });
                        }
                    })
                    .catch(function (err) {
                        if (err.code !== 'auth/popup-closed-by-user') {
                            showAuthError(friendlyError(err.code));
                        }
                    });
            });
        });

        // --- Logout ---
        var logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                auth.signOut();
            });
        }

        // --- Update Profile ---
        var profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var newName = document.getElementById('profile-name-input').value.trim();
                var boatName = document.getElementById('profile-boat-name').value.trim();
                var boatSize = document.getElementById('profile-boat-size').value.trim();
                var location = document.getElementById('profile-location').value.trim();
                var years = document.getElementById('profile-years').value.trim();
                var showBoat = document.getElementById('profile-show-boat').checked;
                var btn = profileForm.querySelector('button[type="submit"]');

                if (!newName) return;

                btn.textContent = 'Saving...';
                btn.disabled = true;

                var user = auth.currentUser;
                user.updateProfile({ displayName: newName })
                    .then(function () {
                        return db.collection('users').doc(user.uid).update({
                            name: newName,
                            boatName: boatName,
                            boatSize: boatSize,
                            location: location,
                            yearsInIndustry: parseInt(years) || 0,
                            showBoatInfo: showBoat
                        });
                    })
                    .then(function () {
                        btn.textContent = 'Saved!';
                        updateNavAuth(user);
                        renderProfile(user);
                        setTimeout(function () {
                            btn.textContent = 'Update Profile';
                            btn.disabled = false;
                        }, 2000);
                    })
                    .catch(function () {
                        btn.textContent = 'Update Profile';
                        btn.disabled = false;
                    });
            });
        }

        // --- Password Reset ---
        var resetLink = document.getElementById('forgot-password');
        if (resetLink) {
            resetLink.addEventListener('click', function (e) {
                e.preventDefault();
                var emailInput = document.querySelector('#login-form input[name="email"]');
                var email = emailInput ? emailInput.value.trim() : '';
                if (!email) {
                    showAuthError('Enter your email above, then click "Forgot password".');
                    return;
                }
                auth.sendPasswordResetEmail(email)
                    .then(function () {
                        showAuthSuccess('Password reset email sent. Check your inbox.');
                    })
                    .catch(function (err) {
                        showAuthError(friendlyError(err.code));
                    });
            });
        }
    });

    // ======================================================================
    // UI Helpers
    // ======================================================================

    function showAuthError(msg) {
        var el = document.getElementById('auth-error');
        if (el) { el.textContent = msg; el.style.display = 'block'; }
        var suc = document.getElementById('auth-success');
        if (suc) suc.style.display = 'none';
    }

    function showAuthSuccess(msg) {
        var el = document.getElementById('auth-success');
        if (el) { el.textContent = msg; el.style.display = 'block'; }
        var err = document.getElementById('auth-error');
        if (err) err.style.display = 'none';
    }

    function clearAuthError() {
        var el = document.getElementById('auth-error');
        if (el) el.style.display = 'none';
        var suc = document.getElementById('auth-success');
        if (suc) suc.style.display = 'none';
    }

    function friendlyError(code) {
        switch (code) {
            case 'auth/email-already-in-use': return 'This email is already registered. Try signing in.';
            case 'auth/invalid-email': return 'Please enter a valid email address.';
            case 'auth/weak-password': return 'Password must be at least 6 characters.';
            case 'auth/user-not-found': return 'No account found with this email.';
            case 'auth/wrong-password': return 'Incorrect password. Try again.';
            case 'auth/invalid-credential': return 'Incorrect email or password. Try again.';
            case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment.';
            default: return 'Something went wrong. Please try again.';
        }
    }
})();
