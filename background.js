const script = document.createElement('script');
script.src = chrome.runtime.getURL('xlsx.full.min.js');
document.head.appendChild(script);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchExamSchedule") {

        fetch(chrome.runtime.getURL("final/final-exam-schedule_sose_undergrad_243.xlsx"))
            .then(response => response.arrayBuffer())
            .then(buffer => {
                const workbook = XLSX.read(buffer, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(sheet);
                console.log(data)
                sendResponse({ exams: data });
            })
            .catch(error => {
                console.error("Error loading exam schedule:", error);
                sendResponse({ error: "Failed to load exam schedule" });
            });
        return true;  // Keep the message channel open
    }
});
