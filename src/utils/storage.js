// In-memory storage for demo purposes (since localStorage is not available in Claude artifacts)
let memoryStorage = {};

export const saveToStorage = (key, data) => {
  try {
    memoryStorage[key] = JSON.stringify(data);
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
};

export const loadFromStorage = (key) => {
  try {
    const data = memoryStorage[key];
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading from storage:', error);
    return null;
  }
};

export const removeFromStorage = (key) => {
  try {
    delete memoryStorage[key];
  } catch (error) {
    console.error('Error removing from storage:', error);
  }
};

export const clearStorage = () => {
  try {
    memoryStorage = {};
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};