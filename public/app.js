/* ==============================================================================
   🧠 black-noir — API Key Dashboard Client Engine
   Aesthetics & Utility: Dynamic reactive DOM bindings, native streaming SSE reader
   ============================================================================== */

document.addEventListener('DOMContentLoaded', () => {
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

  let countdownInterval = null;

  // 1. Generate Key Trigger (Linked to v1/auth/token)
  btnGenerate.addEventListener('click', async () => {
    const name = devName.value.trim();
    const email = devEmail.value.trim();

    if (!name) {
      alert('⚠️ Please enter a Developer Name.');
      return;
    }

    try {
      setButtonLoading(btnGenerate, true, 'Provisioning...');
      
      const response = await fetch('/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email || undefined
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

  // 2. High-Precision Countdown Timer (Supporting Hours)
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

  // 3. One-Click Clipboard Copier
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

  // 4. Live Stream SSE completions Playground
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
