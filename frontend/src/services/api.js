/**
 * API Service for Portal ERP Jobs
 * Handles all HTTP requests to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://5000-impv5j8wkhhpbvjd7fptx-be1b5b70.manusvm.computer/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add auth token if exists
  const token = localStorage.getItem('authToken');
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return { success: true };
    }

    const data = await response.json();

    if (!response.ok) {
      // Log detailed error for debugging
      console.error('🔴 API Error Response:', data);
      const errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage);
      error.response = data; // Attach full response
      throw error;
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ============================================
// AUTH ENDPOINTS
// ============================================

export const authAPI = {
  /**
   * Register a new company
   */
  registerCompany: async (companyData) => {
    return fetchAPI('/auth/register/company', {
      method: 'POST',
      body: JSON.stringify(companyData),
    });
  },

  /**
   * Login company user
   */
  loginCompany: async (credentials) => {
    return fetchAPI('/auth/login/company', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Register a new candidate
   */
  registerCandidate: async (candidateData) => {
    return fetchAPI('/auth/register/candidate', {
      method: 'POST',
      body: JSON.stringify(candidateData),
    });
  },

  /**
   * Login candidate
   */
  loginCandidate: async (credentials) => {
    return fetchAPI('/auth/login/candidate', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Logout (clear token)
   */
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('userId');
  },
};

// ============================================
// COMPANY ENDPOINTS
// ============================================

export const companyAPI = {
  /**
   * Get company profile
   */
  getProfile: async (companyId) => {
    return fetchAPI(`/companies/${companyId}`);
  },

  /**
   * Update company profile
   */
  updateProfile: async (companyId, data) => {
    return fetchAPI(`/companies/${companyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get all companies
   */
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return fetchAPI(`/companies${queryParams ? `?${queryParams}` : ''}`);
  },
};

// ============================================
// JOB ENDPOINTS
// ============================================

export const jobAPI = {
  /**
   * Create a new job posting
   */
  create: async (jobData) => {
    return fetchAPI('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  },

  /**
   * Get all jobs
   */
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return fetchAPI(`/jobs${queryParams ? `?${queryParams}` : ''}`);
  },

  /**
   * Get single job by ID
   */
  getById: async (jobId) => {
    return fetchAPI(`/jobs/${jobId}`);
  },

  /**
   * Update job
   */
  update: async (jobId, data) => {
    return fetchAPI(`/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete job
   */
  delete: async (jobId) => {
    return fetchAPI(`/jobs/${jobId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get jobs by company
   */
  getByCompany: async (companyId) => {
    return fetchAPI(`/jobs?company_id=${companyId}`);
  },

  /**
   * Toggle job status (active/paused)
   */
  toggleStatus: async (jobId) => {
    return fetchAPI(`/jobs/${jobId}/toggle-status`, {
      method: 'PATCH',
    });
  },
};

// ============================================
// CANDIDATE ENDPOINTS
// ============================================

export const candidateAPI = {
  /**
   * Get candidate profile
   */
  getProfile: async (candidateId) => {
    return fetchAPI(`/candidates/${candidateId}`);
  },

  /**
   * Update candidate profile
   */
  updateProfile: async (candidateId, data) => {
    return fetchAPI(`/candidates/${candidateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Search candidates
   */
  search: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return fetchAPI(`/candidates${queryParams ? `?${queryParams}` : ''}`);
  },

  /**
   * Add experience
   */
  addExperience: async (candidateId, experienceData) => {
    return fetchAPI(`/candidates/${candidateId}/experiences`, {
      method: 'POST',
      body: JSON.stringify(experienceData),
    });
  },

  /**
   * Add education
   */
  addEducation: async (candidateId, educationData) => {
    return fetchAPI(`/candidates/${candidateId}/educations`, {
      method: 'POST',
      body: JSON.stringify(educationData),
    });
  },

  /**
   * Add skill
   */
  addSkill: async (candidateId, skillData) => {
    return fetchAPI(`/candidates/${candidateId}/skills`, {
      method: 'POST',
      body: JSON.stringify(skillData),
    });
  },
};

// ============================================
// APPLICATION ENDPOINTS
// ============================================

export const applicationAPI = {
  /**
   * Apply to a job
   */
  apply: async (applicationData) => {
    return fetchAPI('/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  },

  /**
   * Get applications for a job
   */
  getByJob: async (jobId) => {
    return fetchAPI(`/applications?job_id=${jobId}`);
  },

  /**
   * Get applications by candidate
   */
  getByCandidate: async (candidateId) => {
    return fetchAPI(`/applications?candidate_id=${candidateId}`);
  },

  /**
   * Update application status
   */
  updateStatus: async (applicationId, status) => {
    return fetchAPI(`/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// ============================================
// ADMIN ENDPOINTS (usando localStorage por enquanto)
// ============================================

export const adminAPI = {
  /**
   * Get all items from a collection
   */
  getAll: (collection) => {
    const data = localStorage.getItem(collection);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Create new item
   */
  create: (collection, item) => {
    const items = adminAPI.getAll(collection);
    const newItem = {
      ...item,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    localStorage.setItem(collection, JSON.stringify(items));
    return newItem;
  },

  /**
   * Update item
   */
  update: (collection, id, updates) => {
    const items = adminAPI.getAll(collection);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(collection, JSON.stringify(items));
      return items[index];
    }
    return null;
  },

  /**
   * Delete item
   */
  delete: (collection, id) => {
    const items = adminAPI.getAll(collection);
    const filtered = items.filter(item => item.id !== id);
    localStorage.setItem(collection, JSON.stringify(filtered));
    return true;
  },
};

export default {
  auth: authAPI,
  company: companyAPI,
  job: jobAPI,
  candidate: candidateAPI,
  application: applicationAPI,
  admin: adminAPI,
};




// ==================== RESUME/CURRICULUM CRUD ====================

/**
 * Get complete resume
 */
export async function getCompleteResume() {
  return fetchAPI('/resume/complete');
}

/**
 * Update complete resume
 */
export async function updateCompleteResume(resumeData) {
  return fetchAPI('/resume/complete', {
    method: 'PUT',
    body: JSON.stringify(resumeData),
  });
}

// ==================== EXPERIENCES ====================

/**
 * Get all experiences
 */
export async function getExperiences() {
  return fetchAPI('/resume/experiences');
}

/**
 * Create new experience
 */
export async function createExperience(experienceData) {
  return fetchAPI('/resume/experiences', {
    method: 'POST',
    body: JSON.stringify(experienceData),
  });
}

/**
 * Update experience
 */
export async function updateExperience(experienceId, experienceData) {
  return fetchAPI(`/resume/experiences/${experienceId}`, {
    method: 'PUT',
    body: JSON.stringify(experienceData),
  });
}

/**
 * Delete experience
 */
export async function deleteExperience(experienceId) {
  return fetchAPI(`/resume/experiences/${experienceId}`, {
    method: 'DELETE',
  });
}

// ==================== EDUCATION ====================

/**
 * Get all educations
 */
export async function getEducations() {
  return fetchAPI('/resume/educations');
}

/**
 * Create new education
 */
export async function createEducation(educationData) {
  return fetchAPI('/resume/educations', {
    method: 'POST',
    body: JSON.stringify(educationData),
  });
}

/**
 * Update education
 */
export async function updateEducation(educationId, educationData) {
  return fetchAPI(`/resume/educations/${educationId}`, {
    method: 'PUT',
    body: JSON.stringify(educationData),
  });
}

/**
 * Delete education
 */
export async function deleteEducation(educationId) {
  return fetchAPI(`/resume/educations/${educationId}`, {
    method: 'DELETE',
  });
}

// ==================== SKILLS ====================

/**
 * Get all skills
 */
export async function getSkills() {
  return fetchAPI('/resume/skills');
}

/**
 * Add skill
 */
export async function addSkill(skillData) {
  return fetchAPI('/resume/skills', {
    method: 'POST',
    body: JSON.stringify(skillData),
  });
}

/**
 * Remove skill
 */
export async function removeSkill(skillId) {
  return fetchAPI(`/resume/skills/${skillId}`, {
    method: 'DELETE',
  });
}

// ==================== CERTIFICATIONS ====================

/**
 * Get all certifications
 */
export async function getCertifications() {
  return fetchAPI('/resume/certifications');
}

/**
 * Add certification
 */
export async function addCertification(certData) {
  return fetchAPI('/resume/certifications', {
    method: 'POST',
    body: JSON.stringify(certData),
  });
}

/**
 * Remove certification
 */
export async function removeCertification(certId) {
  return fetchAPI(`/resume/certifications/${certId}`, {
    method: 'DELETE',
  });
}

// ==================== PROJECTS ====================

/**
 * Get all projects
 */
export async function getProjects() {
  return fetchAPI('/resume/projects');
}

/**
 * Add project
 */
export async function addProject(projectData) {
  return fetchAPI('/resume/projects', {
    method: 'POST',
    body: JSON.stringify(projectData),
  });
}

/**
 * Remove project
 */
export async function removeProject(projectId) {
  return fetchAPI(`/resume/projects/${projectId}`, {
    method: 'DELETE',
  });
}

// ==================== LANGUAGES ====================

/**
 * Get all languages
 */
export async function getLanguages() {
  return fetchAPI('/resume/languages');
}

/**
 * Add language
 */
export async function addLanguage(langData) {
  return fetchAPI('/resume/languages', {
    method: 'POST',
    body: JSON.stringify(langData),
  });
}

/**
 * Remove language
 */
export async function removeLanguage(langId) {
  return fetchAPI(`/resume/languages/${langId}`, {
    method: 'DELETE',
  });
}

// ==================== RESUME API OBJECT ====================
export const resumeAPI = {
  get: getCompleteResume,
  update: updateCompleteResume,
  getExperiences,
  addExperience: createExperience,
  updateExperience,
  deleteExperience,
  getEducations,
  addEducation: createEducation,
  updateEducation,
  deleteEducation,
  getSkills,
  addSkill,
  removeSkill,
  getCertifications,
  addCertification,
  removeCertification,
  getProjects,
  addProject,
  removeProject,
  getLanguages,
  addLanguage,
  removeLanguage
};
