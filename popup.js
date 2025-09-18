document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const dashboardBaseUrl = 'http://localhost:3000';

    // --- ELEMENT GETTERS ---
    const getJdBtn = document.getElementById('get-jd-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-btn');
    const jdTextarea = document.getElementById('jd-textarea');
    const cvTextarea = document.getElementById('cv-textarea');
    const templateSelect = document.getElementById('template-select');
    const messageBox = document.getElementById('message-box');
    const resultsSection = document.getElementById('results-section');
    const matchScoreBar = document.getElementById('match-score-bar');
    const matchScoreText = document.getElementById('match-score-text');
    const suggestionsList = document.getElementById('suggestions-list');
    const tailoredCvTextarea = document.getElementById('tailored-cv-textarea');
    const coverLetterTextarea = document.getElementById('cover-letter-textarea');
    const copyCvBtn = document.getElementById('copy-cv-btn');
    const copyCoverBtn = document.getElementById('copy-cover-btn');
    const downloadDocxBtn = document.getElementById('download-docx-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const analyzeBtnText = analyzeBtn.querySelector('span');
    const saveBtn = document.getElementById('save-dashboard-btn');
    const addManualBtn = document.getElementById('add-manual-btn');
    const viewDashboardBtn = document.getElementById('view-dashboard-btn');

    let lastAnalysisResult = null;

    // --- INITIALIZATION ---
    fetchBaseCv();

    // --- EVENT LISTENERS ---
    analyzeBtn.addEventListener('click', handleAnalysis);
    saveBtn.addEventListener('click', saveApplicationToDashboard);
    getJdBtn.addEventListener('click', getJobDescriptionFromPage);
    addManualBtn.addEventListener('click', () => { window.location.href = 'add_job.html'; });
    viewDashboardBtn.addEventListener('click', () => chrome.tabs.create({ url: dashboardBaseUrl }));
    clearBtn.addEventListener('click', () => {
        jdTextarea.value = '';
        cvTextarea.value = '';
        resultsSection.classList.add('hidden');
        showMessage('Fields cleared.', 'info');
    });
    copyCvBtn.addEventListener('click', () => copyToClipboard(tailoredCvTextarea, 'CV'));
    copyCoverBtn.addEventListener('click', () => copyToClipboard(coverLetterTextarea, 'Cover Letter'));
    downloadDocxBtn.addEventListener('click', () => generateDocx(lastAnalysisResult));
    downloadPdfBtn.addEventListener('click', () => generatePdf(lastAnalysisResult));

    // --- CORE FUNCTIONS ---

    async function fetchBaseCv() {
        try {
            const response = await fetch(`${dashboardBaseUrl}/api/profile`, { credentials: 'include' });
            if (response.status === 401) {
                showMessage('Please sign in to your dashboard to fetch your saved CV.', 'info');
                return;
            }
            if (!response.ok) throw new Error('Could not fetch CV from server.');
            
            const profile = await response.json();
            if (profile.baseCv) {
                cvTextarea.value = profile.baseCv;
                showMessage('Your CV was loaded from your profile!', 'success');
            }
        } catch (error) {
            console.error("Error fetching base CV:", error);
            showMessage('Could not connect to the dashboard to fetch your CV.', 'error');
        }
    }

    async function handleAnalysis() {
        const jd = jdTextarea.value.trim();
        const cv = cvTextarea.value.trim();
        const template = templateSelect.value;

        if (!jd || !cv) {
            showMessage('Please provide both a Job Description and your CV.', 'error');
            return;
        }

        setLoadingState(true);
        resultsSection.classList.add('hidden');

        try {
            const result = await callSecureAnalysisAPI(jd, cv, template);
            if (result) {
                lastAnalysisResult = result;
                updateUiWithResults(result);
                saveBtn.classList.remove('hidden');
            }
        } catch (error) {
            console.error("Analysis Error:", error);
            showMessage(error.message, 'error');
        } finally {
            setLoadingState(false);
        }
    }
    
    async function callSecureAnalysisAPI(jd, cv, template) {
        const response = await fetch(`${dashboardBaseUrl}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ jd, cv, template }),
        });

        if (response.status === 401) {
            throw new Error('You must be signed in to your dashboard to perform an analysis.');
        }
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to get analysis from server.');
        }
        return response.json();
    }
    
    async function saveApplicationToDashboard() {
        if (!lastAnalysisResult) {
            showMessage('Please analyze a CV first before saving.', 'error');
            return;
        }

        const { companyName, jobTitle, tailoredCv } = lastAnalysisResult;
        const payload = {
            company: companyName,
            title: jobTitle,
            tailoredCv,
            jd: jdTextarea.value.trim(),
            status: 'Saved',
            date: new Date().toISOString(),
        };
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const response = await fetch(`${dashboardBaseUrl}/api/applications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                showMessage('You must be signed in to the dashboard to save.', 'error');
                window.open(dashboardBaseUrl);
                return;
            }
            if (!response.ok) throw new Error('Failed to save application.');

            showMessage('Application saved to your dashboard!', 'success');
            setTimeout(() => chrome.tabs.create({ url: dashboardBaseUrl }), 1000);

        } catch (error) {
            console.error("Error saving application:", error);
            showMessage(error.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" /></svg> Save to Dashboard`;
        }
    }

    function getJobDescriptionFromPage() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.id) return;
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getJobDescription' }, (response) => {
                if (chrome.runtime.lastError) {
                    showMessage('Could not connect to the page. Try reloading it.', 'error');
                } else if (response && response.jobDescription) {
                    jdTextarea.value = response.jobDescription;
                    showMessage('Job description loaded!', 'success');
                } else {
                    showMessage('Could not find a job description on this page.', 'error');
                }
            });
        });
    }

    // --- UI HELPER FUNCTIONS ---

    function updateUiWithResults(result) {
          const analysis = result.analysis;
    const templateJson = result.templateJson;
      const rawScore = analysis.matchScore || 0;
    const score = parseInt(String(rawScore).replace('%', ''), 10);

    matchScoreBar.style.width = `${score}%`;
    matchScoreText.textContent = `${score}% Match`;
    // suggestions is now an array, so map it directly
    suggestionsList.innerHTML = analysis.suggestions?.map(s => `<li>${s}</li>`).join('') || '<li>No suggestions provided.</li>';
    tailoredCvTextarea.value = analysis.tailoredCv || '';
    coverLetterTextarea.value = analysis.coverLetter || '';
    resultsSection.classList.remove('hidden');
    showMessage('Analysis complete!', 'success');
    }

    function setLoadingState(isLoading) {
        analyzeBtn.disabled = isLoading;
        loadingSpinner.classList.toggle('hidden', !isLoading);
        analyzeBtnText.textContent = isLoading ? 'Analyzing...' : 'Analyze & Tailor CV';
    }

    function showMessage(message, type = 'info') {
        messageBox.textContent = message;
        messageBox.className = 'text-sm p-3 my-4 rounded-md border';
        const typeClasses = {
            error: ['bg-red-100', 'text-red-800', 'border-red-200'],
            success: ['bg-green-100', 'text-green-800', 'border-green-200'],
            info: ['bg-blue-100', 'text-blue-800', 'border-blue-200']
        };
        messageBox.classList.add(...(typeClasses[type] || typeClasses.info));
        messageBox.classList.remove('hidden');
        setTimeout(() => messageBox.classList.add('hidden'), 4000);
    }

    function copyToClipboard(textarea, type) {
        if(!textarea.value) return;
        textarea.select();
        document.execCommand('copy');
        showMessage(`${type} copied to clipboard!`, 'success');
    }
    
    // --- FILE GENERATION HELPERS ---

   

function parseCvForDocxtemplater(analysisResult) {
        if (!analysisResult || !analysisResult.tailoredCv) return {};

        const cvText = analysisResult.tailoredCv;
        const lines = cvText.split('\n').filter(line => line.trim() !== '');

        const data = {
            name: '',
            contact_info: '',
            summary: '',
            skills: '',
            work_experience: [],
            projects: [],
            education: []
        };

        let currentSection = 'HEADER';
        let currentItem = null;

        const headingRegex = /^(SUMMARY|SKILLS|WORK EXPERIENCE|EXPERIENCE|PROJECTS|EDUCATION)$/;
        const bulletRegex = /^\s*[\*•-]\s+/;

        for (const line of lines) {
            const trimmedLine = line.trim();
            const upperCaseLine = trimmedLine.toUpperCase();

            if (headingRegex.test(upperCaseLine)) {
                if (currentItem) { // Save the last item from the previous section
                    if (currentSection === 'EXPERIENCE') data.work_experience.push(currentItem);
                    if (currentSection === 'PROJECTS') data.projects.push(currentItem);
                }
                currentSection = upperCaseLine.replace('WORK EXPERIENCE', 'EXPERIENCE');
                currentItem = null; // Reset for the new section
                continue;
            }

            switch (currentSection) {
                case 'HEADER':
                    if (!data.name) data.name = trimmedLine;
                    else data.contact_info += (data.contact_info ? '\n' : '') + trimmedLine;
                    break;
                case 'SUMMARY':
                    data.summary += trimmedLine + ' ';
                    break;
                case 'SKILLS':
                    data.skills += trimmedLine + ' ';
                    break;
                case 'EXPERIENCE':
                    if (bulletRegex.test(line)) {
                        if (currentItem) {
                            currentItem.achievements.push({ point: trimmedLine.replace(bulletRegex, '') });
                        }
                    } else {
                        if (currentItem) data.work_experience.push(currentItem);
                        
                        const dateRegex = /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{4}|Present|\d{4})\s*–\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{4}|Present|\d{4})\b/i;
                        const dateMatch = trimmedLine.match(dateRegex);
                        const date = dateMatch ? dateMatch[0] : '';
                        
                        const companyAndTitle = date ? trimmedLine.replace(date, '').trim() : trimmedLine;
                        const companyTitleParts = companyAndTitle.split('|').map(p => p.trim());

                        currentItem = {
                            job_title: companyTitleParts[0] || '',
                            company: companyTitleParts[1] || '',
                            date: date,
                            achievements: []
                        };
                    }
                    break;
                case 'PROJECTS':
                    if (bulletRegex.test(line)) {
                        if (currentItem) {
                            currentItem.description.push({ point: trimmedLine.replace(bulletRegex, '') });
                        }
                    } else { 
                        if (currentItem) data.projects.push(currentItem);
                        currentItem = {
                            project_name: trimmedLine,
                            description: []
                        };
                    }
                    break;
                case 'EDUCATION':
  const eduParts = trimmedLine.split('|').map(p => p.trim());
  if (eduParts.length >= 2) {
    const dateRegex = /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\.?\s*\d{4})\b/;
    const dateMatch = eduParts[1].match(dateRegex);
    const graduation_date = dateMatch ? dateMatch[0] : '';
    const university = graduation_date ? eduParts[1].replace(graduation_date, '').trim() : eduParts[1];
    data.education.push({
      degree: eduParts[0],
      university,
      graduation_date
    });
  } else if (trimmedLine) {
    // fallback if no '|' separator
    data.education.push({
      degree: trimmedLine,
      university: '',
      graduation_date: ''
    });
  }
                    break;
            }
        }
        // Push the very last item after the loop finishes
        if (currentItem) {
            if (currentSection === 'EXPERIENCE') data.work_experience.push(currentItem);
            if (currentSection === 'PROJECTS') data.projects.push(currentItem);
        }
        
        // Final cleanup
        data.summary = data.summary.trim();
        data.skills = data.skills.trim();

        return data;
    }

    
        /**
         * Calls the secure backend to generate and download a DOCX file.
         * @param {object} analysisResult - The result from the Gemini API.
         */
         async function generateDocx(analysisResult) {
        if (!analysisResult) return showMessage('Please analyze a CV first.', 'error');
        
        // 1. Get the canonical data structure
    const baseData = analysisResult.templateJson;
        if (!baseData.name) return showMessage('Could not parse CV data.', 'error');

        // 2. Get the user's template choice from the UI
        const selectedTemplate = templateSelect.value; // e.g., 'classic', 'modern'

        // 3. Use the mapper to get the correctly formatted data
        //    (getMappedData function is in templateMappers.js)
        const docData = getMappedData(baseData, selectedTemplate);

        try {
            // 4. Send both the data AND the template name to the server
            const response = await fetch(`${dashboardBaseUrl}/api/generate-doc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    template: selectedTemplate,
                    data: docData
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to generate document on the server.');
            }

            // 5. Handle the download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'ApplyWise-CV.docx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('DOCX Generation Error:', error);
            showMessage(`Error generating DOCX: ${error.message}`, 'error');
        }
    }
async function generatePdf(analysisResult) {
    if (!analysisResult) return showMessage('Please analyze a CV first.', 'error');
    
    // 1. Get the canonical data structure directly from the API response
    const baseData = analysisResult.templateJson;
    if (!baseData.name) return showMessage('Could not find CV data from the API.', 'error');

    // 2. Get the user's template choice from the UI
    const selectedTemplate = templateSelect.value;

    // 3. Use the mapper to get the correctly formatted data
    const docData = getMappedData(baseData, selectedTemplate);
    
    try {
        // 4. Send both the data AND the template name to the new PDF API endpoint
        const response = await fetch(`${dashboardBaseUrl}/api/generate-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                template: selectedTemplate,
                data: docData
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to generate PDF on the server.');
        }

        // 5. Handle the download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'ApplyWise-CV.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showMessage('PDF generated successfully!', 'success');
    } catch (error) {
        console.error('PDF Generation Error:', error);
        showMessage(`Error generating PDF: ${error.message}`, 'error');
    }
}
});

