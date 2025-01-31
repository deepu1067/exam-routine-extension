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

async function readExcelFile() {
  const response = await fetch(chrome.runtime.getURL('final/final-exam-schedule_sose_undergrad_243.xlsx'));
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

async function matchCoursesWithExam(courses) {
  const examSchedule = await readExcelFile();
  const studentId = extractStudentId();

  const matchedCourses = courses.map(course => {
    const examInfo = examSchedule.find(row => {
      const rowCourseCode = row['Course Code'].replace(/\s+/g, '');
      const courseCodes = rowCourseCode.split('/');
      const studentCourseCode = course.code.replace(/\s+/g, '');
      return (courseCodes.includes(studentCourseCode)) && row['Section'] === course.section;
    });

    if (!examInfo) return null;

    const roomInfo = examInfo['Room'].split(' ');
    let room = null;
    let idRange = null; // New variable to store ID range

    for (let i = 0; i < roomInfo.length; i += 3) {
      const roomNumber = roomInfo[i];
      const range = roomInfo[i + 1].replace(/[()]/g, '').split('-');
      if (studentId >= range[0] && studentId <= range[1]) {
        room = roomNumber;
        idRange = roomInfo[i + 1]; // Store the ID range
        break;
      }
    }

    return {
      ...course,
      title: examInfo['Course Title'],
      time: examInfo['Exam Time'],
      date: examInfo['Exam Date'],
      room: room,
      idRange: idRange // Include ID range in the course data
    };
  });

  // Filter out null values (courses without exam info)
  return matchedCourses.filter(course => course !== null);
}

function convertTo24Hour(time) {
  const [timePart, modifier] = time.split(' ');
  let [hours, minutes] = timePart.split(':');
  if (hours === '12') {
    hours = '00';
  }
  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }
  return `${hours}:${minutes}`;
}

async function extractAndSendData() {
  const extractedCourses = extractCourses();
  const matchedCourses = await matchCoursesWithExam(extractedCourses);

  // Sort courses by exam date and time
  matchedCourses.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) {
      return dateA - dateB;
    }
    return new Date(`1970-01-01T${convertTo24Hour(a.time)}`).getTime() - new Date(`1970-01-01T${convertTo24Hour(b.time)}`).getTime();
  });

  const pageData = {
    studentId: extractStudentId(),
    studentName: extractStudentName(),
    courses: matchedCourses
  };
  console.log(pageData);
  chrome.runtime.sendMessage({ action: 'pageData', data: pageData });
}

if (typeof XLSX === 'undefined') {
  console.error('XLSX library not loaded');
} else {
  extractAndSendData();
}