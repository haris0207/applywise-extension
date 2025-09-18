document.addEventListener('DOMContentLoaded', () => {
    // --- IMPORTANT: Configuration ---
    // Replace this with the actual URL of your deployed Next.js dashboard
    const dashboardBaseUrl = 'https://YOUR_DASHBOARD_URL.com';

    // --- Element Getters ---
    const companyInput = document.getElementById('company-input');
    const titleInput = document.getElementById('title-input');
    const linkInput = document.getElementById('link-input');
    const statusSelect = document.getElementById('status-select');
    const dateInput = document.getElementById('date-input');
    const notesTextarea = document.getElementById('notes-textarea');
    const saveBtn = document.getElementById('save-btn');

    // --- Set Today's Date by Default ---
    function setDefaultDate() {
        const today = new Date();
        const year = today.getFullYear();
        // Months are 0-indexed, so we add 1 and pad with a leading zero if needed
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        const formattedDate = `${year}-${month}-${day}`;
        dateInput.value = formattedDate;
    }

    // --- Event Listeners ---
    saveBtn.addEventListener('click', () => {
        // Basic validation
        if (!companyInput.value.trim() || !titleInput.value.trim()) {
            alert('Please enter at least a Company Name and Job Title.');
            return;
        }

        const params = new URLSearchParams();
        params.append('company', companyInput.value.trim());
        params.append('title', titleInput.value.trim());
        params.append('link', linkInput.value.trim());
        params.append('status', statusSelect.value);
        params.append('date', dateInput.value);
        params.append('notes', notesTextarea.value.trim());

        const fullUrl = `${dashboardBaseUrl}/track?${params.toString()}`;
        
        // Open the dashboard in a new tab with the pre-filled data
        chrome.tabs.create({ url: fullUrl });
    });

    // --- Initializations ---
    setDefaultDate();
});

i