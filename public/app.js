/* ==============================================================================
   🧠 black-noir — Simplified Playground Client Engine
   ============================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const playKey = document.getElementById('play-key');
  const playPrompt = document.getElementById('play-prompt');
  const btnRun = document.getElementById('btn-run');
  const terminalOut = document.getElementById('terminal-output');
  const timingBadge = document.getElementById('timing-badge');

  // Live Stream SSE completions Playground
  btnRun.addEventListener('click', async () => {
    const key = playKey.value.trim();
    const prompt = playPrompt.value.trim();

    if (!key) {
      alert('⚠️ Please enter an active API Key.');
      return;
    }
    if (!prompt) {
      alert('⚠️ Please write a prompt in the textarea.');
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
