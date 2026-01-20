// Generate or retrieve session ID
function getSessionId() {
    let sessionId = sessionStorage.getItem('lecturelive_session');
    if (!sessionId) {
        sessionId = 'stu_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        sessionStorage.setItem('lecturelive_session', sessionId);
    }
    return sessionId;
}

// Show status message
function showStatus(message, isError = false) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.classList.add('show');
    statusEl.classList.toggle('error', isError);

    setTimeout(() => {
        statusEl.classList.remove('show');
    }, 3000);
}

// Submit state to server
async function submitState(state) {
    const sessionId = getSessionId();

    try {
        const response = await fetch('/api/state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId, state })
        });

        if (!response.ok) {
            throw new Error('Failed to submit');
        }

        showStatus('Your feedback has been recorded! ✓');
    } catch (error) {
        console.error('Error submitting state:', error);
        showStatus('Failed to submit. Please try again.', true);
    }
}

// Update UI to show selected button
function selectButton(selectedBtn) {
    document.querySelectorAll('.state-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    selectedBtn.classList.add('selected');

    // Store selection locally
    sessionStorage.setItem('lecturelive_state', selectedBtn.dataset.state);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.state-btn');

    // Restore previous selection if any
    const savedState = sessionStorage.getItem('lecturelive_state');
    if (savedState) {
        const savedBtn = document.querySelector(`.state-btn[data-state="${savedState}"]`);
        if (savedBtn) {
            savedBtn.classList.add('selected');
        }
    }

    // Add click handlers
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const state = parseInt(btn.dataset.state);
            selectButton(btn);
            submitState(state);
        });
    });

    // Question panel toggle
    const questionToggle = document.getElementById('question-toggle');
    const questionPanel = document.getElementById('question-panel');
    const questionInput = document.getElementById('question-input');
    const questionSubmit = document.getElementById('question-submit');

    questionToggle.addEventListener('click', () => {
        questionToggle.classList.toggle('active');
        questionPanel.classList.toggle('show');
        if (questionPanel.classList.contains('show')) {
            questionInput.focus();
        }
    });

    // Submit question
    async function submitQuestion() {
        const text = questionInput.value.trim();

        if (!text) {
            showStatus('Please enter a question first.', true);
            return;
        }

        questionSubmit.disabled = true;

        try {
            const response = await fetch('/api/question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                throw new Error('Failed to submit question');
            }

            questionInput.value = '';
            showStatus('Question sent anonymously! ✓');
        } catch (error) {
            console.error('Error submitting question:', error);
            showStatus('Failed to send question. Please try again.', true);
        } finally {
            questionSubmit.disabled = false;
        }
    }

    questionSubmit.addEventListener('click', submitQuestion);

    // Also submit on Enter key (Ctrl+Enter for multi-line)
    questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitQuestion();
        }
    });
});
