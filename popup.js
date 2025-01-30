document.addEventListener("DOMContentLoaded", function () {
    const updateUI = (studentData) => {
      document.getElementById("studentId").textContent = studentData.studentId || "Not found";
  
      const coursesList = document.getElementById("coursesList");
      coursesList.innerHTML = "";
  
      if (studentData.courses?.length > 0) {
        studentData.courses.forEach(course => {
          coursesList.innerHTML += `
            <tr>
              <td>${course.code}</td>
              <td>${course.section}</td>
            </tr>
          `;
        });
      } else {
        coursesList.innerHTML = `<tr><td colspan="2">No courses found</td></tr>`;
      }
    };
  
    chrome.storage.local.get(["studentId", "courses"], function (result) {
      updateUI(result);
    });
});
