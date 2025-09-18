chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📩 Received message in content.js:", request);

  if (request.action === 'getJobDescription') {
    let jobDescription = '';

    // LinkedIn
    const linkedinSelector = '.jobs-description__container ';
    const linkedinElement = document.querySelector(linkedinSelector);
    if (linkedinElement) {
      jobDescription = linkedinElement.innerText;
      console.log("✅ LinkedIn JD found");
    }

    // Indeed
    const indeedSelector = '#jobDescriptionText';
    const indeedElement = document.querySelector(indeedSelector);
    if (!jobDescription && indeedElement) {
      jobDescription = indeedElement.innerText;
      console.log("✅ Indeed JD found");
    }

    // Glassdoor
    const glassdoorSelector = '.job-description-content';
    const glassdoorElement = document.querySelector(glassdoorSelector);
    if (!jobDescription && glassdoorElement) {
      jobDescription = glassdoorElement.innerText;
      console.log("✅ Glassdoor JD found");
    }

    if (jobDescription) {
      console.log("📄 Extracted JD:", jobDescription.substring(0, 200) + "...");
    } else {
      console.warn("⚠️ No JD found on this page");
    }

    sendResponse({ jobDescription });
  }

  return true; // 👈 Keeps the message channel open for sendResponse
});
