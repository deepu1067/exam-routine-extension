function extractStudentId() {
  const element = document.querySelector('#ctl00_lbtnUserName');
  return element ? element.textContent : null;
}

function extractStudentName() {
  const element = document.querySelector('#ctl00_MainContainer_SI_Name');
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


async function extractAndSendData() {
  const extractedCourses = extractCourses();
  // const matchedCourses = await matchCoursesWithExam(extractedCourses);

  // // Sort courses by exam date and time
  // matchedCourses.sort((a, b) => {
  //   const dateA = new Date(a.date).getTime();
  //   const dateB = new Date(b.date).getTime();
  //   if (dateA !== dateB) {
  //     return dateA - dateB;
  //   }
  //   return new Date(`1970-01-01T${convertTo24Hour(a.time)}`).getTime() - new Date(`1970-01-01T${convertTo24Hour(b.time)}`).getTime();
  // });

  const pageData = {
    studentId: extractStudentId(),
    studentName: extractStudentName(),
    courses: extractedCourses
  };
  console.log(pageData);
  chrome.runtime.sendMessage({ action: 'pageData', data: pageData });
}

if (document.readyState === 'complete') {
  extractAndSendData();
} else {
  window.addEventListener('load', extractAndSendData);
}