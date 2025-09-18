// cv-matcher/templateMappers.js

/**
 * Mapper for Template A (your current "classic" template).
 * @param {object} data - The canonical CV JSON data.
 * @returns {object} The same data, unchanged.
 */
function mapToTemplateA(data) {
  // No transformation needed for the classic template as its keys already match the canonical schema
  return data;
}

/**
 * Example Mapper for a hypothetical "Template B".
 * @param {object} data - The canonical CV JSON data.
 * @returns {object} The transformed data for Template B.
 */
function mapToTemplateB(data) {
  return {
    full_name: data.name,
    contact: data.contact_info.split('|').map(s => s.trim()),
    summary_text: data.summary,
    
    // The canonical 'skills' is already an array of objects, 
    // so you can use it directly if your template loops over 'skills'
    skills_list: data.skills,
    
    // This demonstrates restructuring for a different work experience format
    positions: data.work_experience.map(job => ({
        role_and_company: `${job.job_title} | ${job.company}`,
        duration_and_date: job.date,
        responsibilities: job.achievements // Assuming template B uses a different loop name
    }))
  };
}


/**
 * The main router function that selects the correct mapper.
 * @param {object} baseData - The canonical CV JSON data from the API response.
 * @param {string} selectedTemplate - The name of the template (e.g., 'classic', 'modern').
 * @returns {object} The correctly mapped data for the chosen template.
 */
function getMappedData(baseData, selectedTemplate) {
  // The 'baseData' parameter now contains the canonical object from the API response.
  // You can route it to the correct mapper based on the template name.
  
  switch (selectedTemplate) {
    case 'modern':
      // This is a placeholder for a future template
      // return mapToTemplateModern(baseData);
      return mapToTemplateA(baseData);
    
    case 'templateB_example':
        return mapToTemplateB(baseData);

    case 'classic':
    default:
      // By default, use the mapping for your main, classic template.
      return mapToTemplateA(baseData);
  }
}