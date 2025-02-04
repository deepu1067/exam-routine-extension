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

document.addEventListener("DOMContentLoaded", function () {
  // Hide PDF button initially
  document.getElementById('generatePdf').style.display = 'none';

  const updateUI = async (studentData, examSchedule) => {  // Added async keyword
    const coursesList = document.getElementById("coursesList");
    const generatePdfButton = document.getElementById('generatePdf');

    // Always show student info if available
    document.getElementById("studentId").textContent = studentData.studentId || "Not found";
    document.getElementById("studentName").textContent = studentData.studentName || "Not found";

    // Hide PDF button when showing upload prompt
    if (!examSchedule) {
      generatePdfButton.style.display = 'none';
      coursesList.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="upload-prompt">
              <p>Please provide your exam routine</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // Hide PDF button during loading
    generatePdfButton.style.display = 'none';
    coursesList.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading exam schedule...</div>
          </div>
        </td>
      </tr>
    `;

    try {
      // console.log('Matching courses with before match schedule');
      // console.log(studentData.studentId);
      // console.log(studentData.courses);

      const matchedCourses = await matchCoursesWithExam(studentData.studentId, studentData.courses, examSchedule);

      // Clear loading indicator
      coursesList.innerHTML = "";

      // Sort courses by exam date and time
      matchedCourses.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
        return new Date(`1970-01-01T${convertTo24Hour(a.time)}`).getTime() - new Date(`1970-01-01T${convertTo24Hour(b.time)}`).getTime();
      });

      if (matchedCourses?.length > 0) {
        // Show PDF button only when courses are displayed
        generatePdfButton.style.display = 'block';

        matchedCourses.forEach(course => {
          coursesList.innerHTML += `
            <tr data-course-title="${course.title}" 
                data-course-date="${course.date}"
                data-course-time="${course.time}"
                data-course-room="${course.room}"
                data-course-id-range="${course.idRange}">
              <td>${course.code}</td>
              <td>${course.title}</td>
              <td>${course.section}</td>
              <td>${course.date}</td>
              <td>${course.time}</td>
              <td>${course.room}</td>
            </tr>
          `;
        });

        const rows = coursesList.getElementsByTagName('tr');
        const floatingCard = document.getElementById('floatingCard');

        Array.from(rows).forEach(row => {
          row.addEventListener('mousemove', (e) => {
            const rect = row.getBoundingClientRect();
            const title = row.dataset.courseTitle;
            const date = row.dataset.courseDate;
            const time = row.dataset.courseTime;
            const room = row.dataset.courseRoom;
            const idRange = row.dataset.courseIdRange; // New data attribute

            floatingCard.innerHTML = `
              <h4>${title}</h4>
              <p><span class="detail-label">Date:</span>${date}</p>
              <p><span class="detail-label">Time:</span>${time}</p>
              <p><span class="detail-label">Room:</span>${room} ${idRange}</p> <!-- Include ID range -->
            `;

            floatingCard.style.display = 'block';

            // Improve positioning to prevent off-screen display
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const cardWidth = 280; // Assuming fixed width

            let left = e.pageX - 140;
            let top = e.pageY - floatingCard.offsetHeight - 10;

            // Adjust if too close to right edge
            if (left + cardWidth > windowWidth) {
              left = windowWidth - cardWidth - 10;
            }
            // Adjust if too close to left edge
            if (left < 10) {
              left = 10;
            }
            // Adjust if too close to top
            if (top < 10) {
              top = e.pageY + 10;
            }

            floatingCard.style.left = `${left}px`;
            floatingCard.style.top = `${top}px`;
          });

          row.addEventListener('mouseleave', () => {
            floatingCard.style.display = 'none';
          });
        });
      } else {
        generatePdfButton.style.display = 'none';
        coursesList.innerHTML = `<tr><td colspan="5">No courses found</td></tr>`;
      }
    } catch (error) {
      generatePdfButton.style.display = 'none';
      console.error('Error updating UI:', error);
      const coursesList = document.getElementById("coursesList");
      coursesList.innerHTML = `<tr><td colspan="5">Error loading data: ${error.message}</td></tr>`;
    }
  };

  const port = chrome.runtime.connect({ name: "popup" });

  port.postMessage({ action: 'getPageData' });

  port.onMessage.addListener((data) => {
    console.log(data);
    const studentData = data;

    // Initial UI update without exam schedule
    updateUI(studentData, null);

    const fileInput = document.getElementById('excelFileInput');

    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const examSchedule = XLSX.utils.sheet_to_json(worksheet);

          updateUI(studentData, examSchedule);
        };
        reader.readAsBinaryString(file);
      }
    });
  });

  // Add PDF generation functionality
  document.getElementById('generatePdf').addEventListener('click', function() {
    const element = document.querySelector('table');
    const studentName = document.getElementById('studentName').textContent;
    const studentId = document.getElementById('studentId').textContent;

    const opt = {
      margin: 1,
      filename: `exam_schedule_${studentId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    // Create a temporary container for PDF generation
    const container = document.createElement('div');
    container.style.padding = '20px';
    
    // Add student info
    const header = document.createElement('div');
    header.style.marginBottom = '20px';
    header.innerHTML = `
      <h2 style="color: #0bc483; margin-bottom: 5px;">${studentName}</h2>
      <p style="margin: 0; color: #444;">Student ID: ${studentId}</p>
    `;
    container.appendChild(header);
    
    // Add the table
    const tableClone = element.cloneNode(true);
    container.appendChild(tableClone);

    // Generate PDF
    html2pdf().set(opt).from(container).save();
  });
});

async function matchCoursesWithExam(studentId, courses, examSchedule) {
  // const examSchedule = await readApiRoutine(studentId);
  // console.log('Matching courses with exam schedule');
  // console.log(studentId);
  // console.log(courses);
  // console.log(examSchedule);

  const matchedCourses = courses.map(course => {
    const examInfo = examSchedule.find(row => {
      const rowCourseCode = row['Course Code'].replace(/\s+/g, '');
      const courseCodes = rowCourseCode.split('/');
      const studentCourseCode = course.code.replace(/\s+/g, '');
      return (courseCodes.includes(studentCourseCode)) && row['Section'] === course.section;
    });

    if (!examInfo) return null;

    const roomAssignments = examInfo['Room']
      .split(/\s+/)
      .reduce((acc, part, index, array) => {
        if (part.match(/^\d+$/)) { // If it's a room number
          const nextPart = array[index + 1];
          if (nextPart && nextPart.startsWith('(')) {
            acc.push({
              room: part,
              range: nextPart.replace(/[()]/g, '')
            });
          }
        }
        return acc;
      }, []);

    const assignedRoom = roomAssignments.find(assignment => {
      const [start, end] = assignment.range.split('-');
      return studentId >= start && studentId <= end;
    });

    return {
      ...course,
      title: examInfo['Course Title'],
      time: examInfo['Exam Time'],
      date: examInfo['Exam Date'],
      room: assignedRoom?.room || null,
      idRange: assignedRoom?.range || null
    };
  });

  return matchedCourses.filter(course => course !== null);
}