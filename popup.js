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
  const updateUI = async (studentData) => {  // Added async keyword
    const coursesList = document.getElementById("coursesList");
    // Show loading indicator
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
      document.getElementById("studentId").textContent = studentData.studentId || "Not found";
      document.getElementById("studentName").textContent = studentData.studentName || "Not found";
      const matchedCourses = await matchCoursesWithExam(studentData.studentId, studentData.courses);

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
        coursesList.innerHTML = `<tr><td colspan="5">No courses found</td></tr>`;
      }
    } catch (error) {
      console.error('Error updating UI:', error);
      const coursesList = document.getElementById("coursesList");
      coursesList.innerHTML = `<tr><td colspan="5">Error loading data: ${error.message}</td></tr>`;
    }
  };

  const port = chrome.runtime.connect({ name: "popup" });

  port.postMessage({ action: 'getPageData' });

  port.onMessage.addListener((data) => {
    console.log(data);
    updateUI(data);
  });
});

async function readApiRoutine(studentId) {
  try {
    const response = await fetch('https://exam-routine.onrender.com/?student_id='+studentId);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const examSchedule = await response.json();
    return examSchedule;
  } catch (error) {
    console.error('Error fetching exam routine:', error);
    throw error;
  }
}

async function matchCoursesWithExam(studentId, courses) {
  const examSchedule = await readApiRoutine(studentId);
  console.log(examSchedule);
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