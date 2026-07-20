// ============================================================
// 00-auth-login.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// ──────────────────────────────────────────────────────────────────
    //  LOGIN  — Employee ID verification
    //  Key change: passes pendingLineProfile flag to onLoginSuccess()
    // ──────────────────────────────────────────────────────────────────
    function checkLogin() {
        const idInput = document.getElementById('loginId');
        const userId  = idInput.value.trim();

        if (!userId) {
            Swal.fire('Warning', 'Please enter your Employee ID.', 'warning');
            return;
        }

        const btn     = document.getElementById('btnLogin');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Checking...';
        btn.disabled  = true;

        google.script.run
            .withSuccessHandler((res) => {
                btn.innerHTML = oldHtml;
                btn.disabled  = false;

                if (res.success) {
                    // ── KEY CHANGE ──────────────────────────────────────────
                    // skipLink = true  when there is NO pending LINE profile
                    // skipLink = false when there IS a pending LINE profile
                    //            → Controller will write LINE ID in background
                    const skipLink = (typeof pendingLineProfile === 'undefined' || pendingLineProfile === null);
                    onLoginSuccess(res.user, skipLink);
                    // ───────────────────────────────────────────────────────

                    Swal.fire({
                        icon: 'success',
                        title: 'Welcome Back!',
                        text: `Hello, ${res.user.name_eng || res.user.name_th}`,
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire('Login Failed', res.message, 'error');
                    idInput.value = '';
                }
            })
            .withFailureHandler((err) => {
                btn.innerHTML = oldHtml;
                btn.disabled  = false;
                Swal.fire('Error', err.message, 'error');
            })
            .checkLogin(userId);
    }

    // Show LINE banner if pendingLineProfile is already set when the form renders
    // (called from initLiffAndRoute in Controller_Script)
    function refreshLineNotice() {
        const notice  = document.getElementById('line-link-notice');
        const nameEl  = document.getElementById('line-link-name');
        if (!notice) return;
        if (typeof pendingLineProfile !== 'undefined' && pendingLineProfile) {
            notice.classList.remove('hidden');
            if (nameEl) nameEl.innerText = `Linking: ${pendingLineProfile.displayName}`;
        } else {
            notice.classList.add('hidden');
        }
    }

    // ──────────────────────────────────────────────────────────────────
    //  REGISTER MODAL
    // ──────────────────────────────────────────────────────────────────
    function openRegisterModal() {
        document.getElementById('registerModal').classList.remove('hidden');
        document.getElementById('reg-id').value = document.getElementById('loginId').value;
    }

    function closeRegisterModal() {
        document.getElementById('registerModal').classList.add('hidden');
        document.getElementById('reg-id').value        = '';
        document.getElementById('reg-name-th').value   = '';
        document.getElementById('reg-name-eng').value  = '';
        document.getElementById('reg-email').value     = '';
        document.getElementById('reg-team').value      = 'MED';
        document.getElementById('reg-position').value  = '';
        document.getElementById('reg-costCenter').value = '';
        document.getElementById('reg-supervisor').value = '';
        document.getElementById('reg-empType').value   = '';
        document.getElementById('reg-tel').value       = '';
    }

    function registerUser() {
        const form = {
            id:          document.getElementById('reg-id').value.trim(),
            name_th:     document.getElementById('reg-name-th').value.trim(),
            name_eng:    document.getElementById('reg-name-eng').value.trim(),
            email:       document.getElementById('reg-email').value.trim(),
            team:        document.getElementById('reg-team').value,
            position:    document.getElementById('reg-position').value.trim(),
            costCenter:  document.getElementById('reg-costCenter').value.trim(),
            supervisor:  document.getElementById('reg-supervisor').value.trim(),
            empType:     document.getElementById('reg-empType').value.trim(),
            tel:         document.getElementById('reg-tel').value.trim()
        };

        if (!form.id || !form.name_th || !form.name_eng || !form.email || !form.team || !form.position) {
            Swal.fire('Missing Information', 'Please fill in all required fields highlighted in red.', 'warning');
            return;
        }

        const btn     = document.querySelector('#registerModal button:last-child');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
        btn.disabled  = true;

        google.script.run
            .withSuccessHandler((res) => {
                btn.innerHTML = oldHtml;
                btn.disabled  = false;
                if (res.success) {
                    closeRegisterModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Registration Sent!',
                        html: '<p class="text-sm text-gray-600">Your request has been submitted.<br>Please check your email for status updates.</p>',
                        confirmButtonColor: '#004aad',
                        confirmButtonText: 'Back to Login'
                    });
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            })
            .withFailureHandler((err) => {
                btn.innerHTML = oldHtml;
                btn.disabled  = false;
                Swal.fire('Error', err.message, 'error');
            })
            .registerNewUser(form);
    }
