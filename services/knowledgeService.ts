// This service simulates a backend by using localStorage for persistence.
// In a real-world scenario, these functions would make API calls to a server.

const KNOWLEDGE_FILES_KEY = 'eta_ai_diagnose_knowledge_files';

export interface KnowledgeFile {
  name: string;
  content: string;
  uploadedAt: string;
}

/**
 * Retrieves all knowledge files from localStorage.
 */
const getFiles = (): KnowledgeFile[] => {
  try {
    const filesJson = localStorage.getItem(KNOWLEDGE_FILES_KEY);
    return filesJson ? JSON.parse(filesJson) : [];
  } catch (error) {
    console.error("Failed to parse knowledge files from localStorage:", error);
    return [];
  }
};

/**
 * Saves the list of knowledge files to localStorage.
 */
const saveFiles = (files: KnowledgeFile[]): void => {
  localStorage.setItem(KNOWLEDGE_FILES_KEY, JSON.stringify(files));
};

/**
 * Adds a new file to the knowledge base. If a file with the same name exists, it's overwritten.
 */
export const addFile = (file: KnowledgeFile): void => {
  const files = getFiles();
  // Remove existing file with the same name to avoid duplicates
  const otherFiles = files.filter(f => f.name !== file.name);
  saveFiles([...otherFiles, file]);
};

/**
 * Deletes a file from the knowledge base by its name.
 */
export const deleteFile = (fileName: string): void => {
  const files = getFiles();
  const updatedFiles = files.filter(f => f.name !== fileName);
  saveFiles(updatedFiles);
};

/**
 * Clears all files from the knowledge base.
 */
export const clearAll = (): void => {
  localStorage.removeItem(KNOWLEDGE_FILES_KEY);
};

/**
 * Retrieves the list of all file names and their upload dates.
 */
export const listFiles = (): { name: string, uploadedAt: string }[] => {
  return getFiles().map(({ name, uploadedAt }) => ({ name, uploadedAt })).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
};

/**
 * Concatenates the content of all stored files into a single string.
 */
export const getKnowledgeBaseContent = (): string => {
  const files = getFiles();
  if (files.length === 0) {
    return '';
  }
  return files
    .map(file => `--- Start of ${file.name} ---\n\n${file.content}\n\n--- End of ${file.name} ---`)
    .join('\n\n');
};
