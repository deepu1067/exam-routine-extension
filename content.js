function extractStudentId() {
  const element = document.querySelector('#ctl00_lbtnUserName');
  return element ? element.textContent : null;
}

function extractCourses() {
  const courseRows = document.querySelectorAll('#ctl00_MainContainer_Class_Schedule tr[title]');
  const courses = new Map();

  if (courseRows.length === 0) {
    console.warn('No course rows found');
    return [];
  }

  courseRows.forEach(row => {
    const cellText = row.cells[0]?.textContent?.trim() || '';
    const match = cellText.match(/([A-Z]+ \d+)\s*\(([A-Z]+)\)/);
    if (match) {
      courses.set(match[1], match[2]);
    }
  });

  const uniqueCourses = Array.from(courses).map(([code, section]) => ({
    code,
    section
  }));

  return uniqueCourses;
}

// Extract and store data on page load
const data = {
  studentId: extractStudentId(),
  courses: extractCourses()
};

// Store all data at once
chrome.storage.local.set(data)
  .catch(err => console.error('Error saving data:', err));

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Get fresh data from storage for all requests
  chrome.storage.local.get(['studentId', 'courses'], (result) => {
    sendResponse(result);
  });
  return true;
});