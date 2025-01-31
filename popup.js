document.addEventListener("DOMContentLoaded", function () {
  const updateUI = (studentData) => {
    document.getElementById("studentId").textContent = studentData.studentId || "Not found";
    document.getElementById("studentName").textContent = studentData.studentName || "Not found";

    const coursesList = document.getElementById("coursesList");
    coursesList.innerHTML = "";

    if (studentData.courses?.length > 0) {
      studentData.courses.forEach(course => {
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
          floatingCard.style.left = `${e.pageX - 140}px`;
          floatingCard.style.top = `${e.pageY - floatingCard.offsetHeight - 10}px`;
        });

        row.addEventListener('mouseleave', () => {
          floatingCard.style.display = 'none';
        });
      });
    } else {
      coursesList.innerHTML = `<tr><td colspan="5">No courses found</td></tr>`;
    }
  };

  const port = chrome.runtime.connect({ name: "popup" });

  port.postMessage({ action: 'getPageData' });

  port.onMessage.addListener((data) => {
    console.log(data);
    updateUI(data);
  });
});
