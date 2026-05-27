/* ==============================================================================
   🧠 black-noir — API Key Dashboard Client Engine
   Aesthetics & Utility: Dynamic Clerk authentication bindings, native streaming SSE playground
   ============================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const devName = document.getElementById('dev-name');
  const devEmail = document.getElementById('dev-email');
  const btnGenerate = document.getElementById('btn-generate');
  const keyContainer = document.getElementById('key-result-container');
  const apiKeyValue = document.getElementById('api-key-value');
  const btnCopy = document.getElementById('btn-copy');
  const copySuccess = btnCopy.querySelector('.copy-success');
  const countdownEl = document.getElementById('countdown');
  const statusEl = document.querySelector('.status-active');
  const playKey = document.getElementById('play-key');
  const playPrompt = document.getElementById('play-prompt');
  const btnRun = document.getElementById('btn-run');
  const terminalOut = document.getElementById('terminal-output');
  const timingBadge = document.getElementById('timing-badge');

  // Clerk Auth Bindings
  const clerkAuthContainer = document.getElementById('clerk-auth-container');
  const generatorFormContainer = document.getElementById('generator-form-container');
  const userProfileBanner = document.getElementById('user-profile-banner');
  const profileNameEl = document.getElementById('profile-name');
  const profileEmailEl = document.getElementById('profile-email');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const sandboxIndicator = document.getElementById('sandbox-indicator');

  let clerkInstance = null;
  let countdownInterval = null;

  // 1. Fetch Clerk Configuration from Server Backend
  try {
    const configRes = await fetch('/v1/auth/config');
    const configData = await configRes.json();
    const publishableKey = configData.clerkPublishableKey;

    if (publishableKey && publishableKey.trim() !== '' && publishableKey !== 'your_clerk_publishable_key_here') {
      // Initialize Clerk JS SDK
      await waitForAndInitializeClerk(publishableKey);
    } else {
      // Fallback: Enable Sandbox Mode
      enableSandboxMode();
    }
  } catch (err) {
    console.warn('⚠️ Config endpoint unreachable or errored. Falling back to Sandbox Mode:', err.message);
    enableSandboxMode();
  }

  // 2. Sandbox Setup Helper
  function enableSandboxMode() {
    sandboxIndicator.classList.remove('hidden');
    clerkAuthContainer.classList.add('hidden');
    generatorFormContainer.classList.remove('hidden');
    userProfileBanner.classList.add('hidden');
    
    // Enable manual editing
    devName.disabled = false;
    devEmail.disabled = false;
  }

  // 3. Clerk JS SDK Integration Loader
  function waitForAndInitializeClerk(publishableKey) {
    return new Promise((resolve) => {
      const checkClerk = async () => {
        if (window.Clerk) {
          try {
            clerkInstance = new window.Clerk(publishableKey);
            await clerkInstance.load();
            
            // Listen and render active auth states
            renderClerkAuthState();
            resolve();
          } catch (initErr) {
            console.error('❌ Clerk load failed:', initErr);
            enableSandboxMode();
            resolve();
          }
        } else {
          // Keep polling for script load
          setTimeout(checkClerk, 100);
        }
      };
      checkClerk();
    });
  }

  // 4. Render Logged-In / Logged-Out views
  function renderClerkAuthState() {
    if (!clerkInstance) return;

    if (clerkInstance.user) {
      // LOGGED IN STATE
      clerkAuthContainer.classList.add('hidden');
      generatorFormContainer.classList.remove('hidden');
      userProfileBanner.classList.remove('hidden');
      sandboxIndicator.classList.add('hidden');

      // Sync and lock profile fields
      const firstName = clerkInstance.user.firstName || '';
      const lastName = clerkInstance.user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Clerk User';
      const email = clerkInstance.user.primaryEmailAddress?.emailAddress || '';

      profileNameEl.textContent = fullName;
      profileEmailEl.textContent = email;

      devName.value = fullName;
      devEmail.value = email;

      // Lock forms to prevent user injection of false emails
      devName.disabled = true;
      devEmail.disabled = true;

    } else {
      // LOGGED OUT STATE
      clerkAuthContainer.classList.remove('hidden');
      generatorFormContainer.classList.add('hidden');
      userProfileBanner.classList.add('hidden');
    }
  }

  // 5. Auth Action Listeners
  btnLogin.addEventListener('click', () => {
    if (clerkInstance) {
      clerkInstance.openSignIn();
    }
  });

  btnLogout.addEventListener('click', async () => {
    if (clerkInstance) {
      await clerkInstance.signOut();
      renderClerkAuthState();
      keyContainer.classList.add('hidden');
    }
  });

  // 6. Generate Key Action (Uses Clerk Session Token)
  btnGenerate.addEventListener('click', async () => {
    const name = devName.value.trim();
    const email = devEmail.value.trim();

    if (!name) {
      alert('⚠️ Please enter your Developer Name.');
      return;
    }

    try {
      setButtonLoading(btnGenerate, true, 'Provisioning...');
      
      let clerkSessionToken = undefined;

      // Fetch dynamic active JWT session token if Clerk is logged in
      if (clerkInstance && clerkInstance.session) {
        clerkSessionToken = await clerkInstance.session.getToken();
      }

      const response = await fetch('/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email || undefined,
          clerkSessionToken: clerkSessionToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || 'Failed to generate token');
      }

      const data = await response.json();
      
      // Update DOM with Key details
      apiKeyValue.textContent = data.token;
      playKey.value = data.token; // Sync instantly with playground input for seamless UX
      
      // Transition Containers
      keyContainer.classList.remove('hidden');
      
      // Start Countdown
      startCountdownTimer(new Date(data.expiresAt));

    } catch (err) {
      alert(`⚠️ Generation Error: ${err.message}`);
    } finally {
      setButtonLoading(btnGenerate, false, 'Generate Secure API Key');
    }
  });

  // 7. High-Precision Countdown Timer (Supporting Hours)
  function startCountdownTimer(expirationTime) {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    statusEl.textContent = '● ACTIVE';
    statusEl.className = 'stat-value status-active';
    statusEl.style.color = '#10b981';

    function updateTimer() {
      const now = new Date();
      const diff = expirationTime - now;

      if (diff <= 0) {
        clearInterval(countdownInterval);
        countdownEl.textContent = '00:00:00';
        countdownEl.style.color = '#ef4444';
        statusEl.textContent = '● EXPIRED';
        statusEl.style.color = '#ef4444';
        alert('⚠️ Your active API Key has expired. Please generate a new key.');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formattedHrs = String(hours).padStart(2, '0');
      const formattedMin = String(minutes).padStart(2, '0');
      const formattedSec = String(seconds).padStart(2, '0');

      countdownEl.textContent = `${formattedHrs}:${formattedMin}:${formattedSec}`;

      // Pulse color changes when approaching expiration (last 10 minutes)
      if (hours === 0 && minutes < 10) {
        countdownEl.style.color = '#ef4444';
        countdownEl.style.textShadow = '0 0 10px rgba(239, 68, 68, 0.4)';
      } else {
        countdownEl.style.color = '#e025ff';
        countdownEl.style.textShadow = '0 0 10px rgba(224, 37, 255, 0.3)';
      }
    }

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
  }

  // 8. One-Click Clipboard Copier
  btnCopy.addEventListener('click', async () => {
    const key = apiKeyValue.textContent;
    if (!key || key.includes('...')) return;

    try {
      await navigator.clipboard.writeText(key);
      copySuccess.classList.remove('hidden');
      setTimeout(() => {
        copySuccess.classList.add('hidden');
      }, 1500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  });

  // 9. Live Stream SSE completions Playground
  btnRun.addEventListener('click', async () => {
    const key = playKey.value.trim();
    const prompt = playPrompt.value.trim();

    if (!key) {
      alert('Please enter or generate an API Key first.');
      return;
    }
    if (!prompt) {
      alert('Please write a prompt in the textarea.');
      return;
    }

    try {
      setButtonLoading(btnRun, true, 'Executing...');
      terminalOut.classList.remove('terminal-empty');
      terminalOut.textContent = '// Connecting to black-noir gateway...\n';
      
      const startTime = performance.now();
      timingBadge.classList.add('hidden');

      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'llama-small',
          messages: [{ role: 'user', content: prompt }],
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        let parsedErr;
        try {
          parsedErr = JSON.parse(errText);
        } catch {
          parsedErr = { error: { message: errText } };
        }
        throw new Error(parsedErr?.error?.message || `Gateway returned status ${response.status}`);
      }

      // Check for stream response
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      terminalOut.textContent = ''; // Clear connection banner
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Parse SSE lines (e.g. "data: {...}")
        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const dataObj = JSON.parse(trimmed.slice(6));
              const delta = dataObj?.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullText += delta;
                terminalOut.textContent = fullText;
                
                // Keep terminal scrolled to bottom
                terminalOut.parentElement.scrollTop = terminalOut.parentElement.scrollHeight;
              }
            } catch (jsonErr) {
              // Ignore partial or unparseable JSON chunks gracefully
            }
          }
        }
      }

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      timingBadge.textContent = `${elapsed}s`;
      timingBadge.classList.remove('hidden');

    } catch (err) {
      terminalOut.textContent = `❌ Execution Error:\n${err.message}`;
      terminalOut.style.color = '#ef4444';
      setTimeout(() => {
        terminalOut.style.color = '';
      }, 5000);
    } finally {
      setButtonLoading(btnRun, false, 'Execute Chat completions');
    }
  });

  // UI Utilities
  function setButtonLoading(button, isLoading, text) {
    const textEl = button.querySelector('.btn-text');
    const iconEl = button.querySelector('.btn-icon');
    
    if (isLoading) {
      button.disabled = true;
      textEl.textContent = text;
      if (iconEl) iconEl.style.opacity = '0.3';
      button.style.opacity = '0.75';
    } else {
      button.disabled = false;
      textEl.textContent = text;
      if (iconEl) iconEl.style.opacity = '1';
      button.style.opacity = '1';
    }
  }
});
