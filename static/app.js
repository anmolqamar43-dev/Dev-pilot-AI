"use strict";

// ========================================
// DevPilot AI - Frontend Application
// ========================================

const API_BASE_URL = "";
let latestGeneratedProject = null;

// ==========================================
// PROJECT HISTORY
// ==========================================

const PROJECT_HISTORY_KEY = "devpilot_project_history";

function getProjectHistory() {
    try {
        const savedHistory = localStorage.getItem(PROJECT_HISTORY_KEY);
        return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
        console.error("Could not load project history:", error);
        return [];
    }
}

function saveProjectToHistory(project) {
    if (!project || !Array.isArray(project.files)) {
        return;
    }

    const history = getProjectHistory();

    const historyItem = {
        id: Date.now().toString(),
        project_name: project.project_name || "Untitled Project",
        summary: project.summary || "",
        files: project.files,
        setup_instructions: project.setup_instructions || [],
        created_at: new Date().toLocaleString()
    };

    history.unshift(historyItem);

    // Keep the most recent 20 projects.
    const limitedHistory = history.slice(0, 20);

    try {
        localStorage.setItem(
            PROJECT_HISTORY_KEY,
            JSON.stringify(limitedHistory)
        );
    } catch (error) {
        console.error("Could not save project history:", error);
    }

    renderProjectHistory();
    updateDashboardStatistics();
}

function renderProjectHistory() {
    const historyContainer = document.getElementById("projectHistoryList");

    if (!historyContainer) {
        return;
    }

    historyContainer.replaceChildren();

    const history = getProjectHistory();

    if (history.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "Your generated projects will appear here.";
        historyContainer.appendChild(emptyMessage);
        return;
    }

    history.forEach(function (project) {
        const card = document.createElement("article");
        card.className = "history-card";

        const title = document.createElement("h4");
        title.textContent = project.project_name;

        const date = document.createElement("p");
        date.className = "history-date";
        date.textContent = project.created_at;

        const fileCount = document.createElement("p");
        fileCount.textContent = `${project.files.length} files`;

        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.textContent = "View Project";
        viewButton.className = "history-view-button";

        viewButton.addEventListener("click", function () {
            const latestProject = {
                project_name: project.project_name,
                summary: project.summary,
                files: project.files,
                setup_instructions: project.setup_instructions
            };

            latestGeneratedProject = latestProject;

            const summaryElement =
                document.getElementById("generatedProjectSummary");
            const treeElement =
                document.getElementById("projectStructureTree");

            if (summaryElement) {
                summaryElement.textContent = project.summary;
            }

            if (treeElement) {
                treeElement.replaceChildren();

                const root = document.createElement("div");
                root.className = "tree-folder";
                root.textContent = "📁 " + project.project_name;

                const children = document.createElement("div");
                children.className = "tree-children";

                project.files.forEach(function (file) {
                    const row = document.createElement("div");
                    row.className = "tree-file";
                    row.textContent = "📄 " + file.path;
                    children.appendChild(row);
                });

                treeElement.append(root, children);
            }

            const results = document.getElementById("generatedProjectResults");

            if (results) {
                results.hidden = false;
                results.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Remove";
        deleteButton.className = "history-delete-button";

        deleteButton.addEventListener("click", function () {
            const updatedHistory = getProjectHistory().filter(function (item) {
                return item.id !== project.id;
            });

            localStorage.setItem(
                PROJECT_HISTORY_KEY,
                JSON.stringify(updatedHistory)
            );

            renderProjectHistory();
            updateDashboardStatistics();
        });

        card.append(title, date, fileCount, viewButton, deleteButton);
        historyContainer.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", renderProjectHistory);
const analyzeForm = document.getElementById("analyzeForm");
const projectNameInput = document.getElementById("projectName");
const projectPromptInput = document.getElementById("projectPrompt");
const analyzeButton = document.getElementById("analyzeButton");

const analysisStatus = document.getElementById("analysisStatus");
const analysisResults = document.getElementById("analysisResults");
const resultsContent = document.getElementById("resultsContent");
const resultProjectName = document.getElementById("resultProjectName");
const projectCount = document.getElementById("projectCount");

let analyzedProjects = 0;

// ========================================
// Safe HTML Helpers
// ========================================

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined && text !== null) {
        element.textContent = String(text);
    }

    return element;
}

// ========================================
// Status Messages
// ========================================

function showStatus(message, type = "") {
    analysisStatus.textContent = message;
    analysisStatus.className = "analysis-status";

    if (type) {
        analysisStatus.classList.add(type);
    }
}

function setLoading(isLoading) {
    analyzeButton.disabled = isLoading;
    analyzeButton.setAttribute("aria-busy", String(isLoading));

    analyzeButton.textContent = isLoading
        ? "Analyzing your prompt..."
        : "✳ Analyze Prompt →";
}

// ========================================
// Analysis Result Rendering
// ========================================

const resultSections = [
    {
        key: "project_objective",
        title: "Project Objective",
        type: "text"
    },
    {
        key: "mandatory_features",
        title: "Mandatory Features",
        type: "list"
    },
    {
        key: "frontend_requirements",
        title: "Frontend Requirements",
        type: "list"
    },
    {
        key: "backend_requirements",
        title: "Backend Requirements",
        type: "list"
    },
    {
        key: "database_requirements",
        title: "Database Requirements",
        type: "list"
    },
    {
        key: "ai_ml_requirements",
        title: "AI / ML Requirements",
        type: "list"
    },
    {
        key: "testing_requirements",
        title: "Testing Requirements",
        type: "list"
    },
    {
        key: "deployment_requirements",
        title: "Deployment Requirements",
        type: "list"
    },
    {
        key: "missing_information",
        title: "Missing Information",
        type: "list"
    },
    {
        key: "assumptions",
        title: "Assumptions",
        type: "list"
    },
    {
        key: "recommended_next_steps",
        title: "Recommended Next Steps",
        type: "list"
    }
];

function renderAnalysis(data) {
    resultsContent.replaceChildren();

    resultProjectName.textContent =
        data.project_name || "Project Analysis";

    for (const section of resultSections) {
        const value = data[section.key];

        const card = createElement("article", "result-item");
        const heading = createElement("h3", "", section.title);

        card.appendChild(heading);

        if (section.type === "text") {
            card.appendChild(
                createElement(
                    "p",
                    "",
                    value || "No information provided."
                )
            );
        } else if (Array.isArray(value) && value.length > 0) {
            const list = document.createElement("ul");

            for (const item of value) {
                list.appendChild(
                    createElement("li", "", item)
                );
            }

            card.appendChild(list);
        } else {
            card.appendChild(
                createElement("p", "", "No specific requirements identified.")
            );
        }

        resultsContent.appendChild(card);
    }

    analysisResults.hidden = false;
}

// ========================================
// Analyze Project Prompt
// ========================================

analyzeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const projectName = projectNameInput.value.trim();
    const prompt = projectPromptInput.value.trim();

    if (!projectName) {
        showStatus("Please enter a project name.", "error");
        projectNameInput.focus();
        return;
    }

    if (prompt.length < 20) {
        showStatus(
            "Please enter a project prompt with at least 20 characters.",
            "error"
        );

        projectPromptInput.focus();
        return;
    }

    const requestData = {
        project_name: projectName,
        prompt: prompt
    };

    setLoading(true);
    showStatus("Your assignment is being analyzed. Please wait...");
    analysisResults.hidden = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData)
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                "The server returned an unreadable response. Please try again."
            );
        }

        if (!response.ok) {
            const message =
                typeof data.detail === "string"
                    ? data.detail
                    : "The analysis request failed. Please try again.";

            throw new Error(message);
        }

        renderAnalysis(data);

        analyzedProjects += 1;
        projectCount.textContent = String(analyzedProjects);

        showStatus(
            "Analysis completed successfully. Review your requirements below.",
            "success"
        );

        analysisResults.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        console.error("DevPilot AI analysis error:", error);

        if (error instanceof TypeError) {
            showStatus(
                "Could not reach the backend. Make sure FastAPI is running at http://127.0.0.1:8000.",
                "error"
            );
        } else {
            showStatus(
                error.message || "Something went wrong. Please try again.",
                "error"
            );
        }

    } finally {
        setLoading(false);
    }
});

// ========================================
// Sidebar Navigation
// ========================================

const navigationLinks = document.querySelectorAll(".nav-item");

navigationLinks.forEach((link) => {
    link.addEventListener("click", () => {
        navigationLinks.forEach((item) => {
            item.classList.remove("active");
        });

        link.classList.add("active");
    });
});

// ========================================
// Welcome
// ========================================

console.info("DevPilot AI frontend loaded successfully.");


// DevPilot AI Chatbot
const chatForm = document.getElementById("chatForm");
const chatMessages = document.getElementById("chatMessages");
const chatStatus = document.getElementById("chatStatus");
const chatButton = document.getElementById("chatButton");

if (chatForm) {
    chatForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const projectName = document.getElementById("chatProjectName").value.trim();
        const projectPrompt = document.getElementById("chatProjectPrompt").value.trim();
        const messageInput = document.getElementById("chatMessage");
        const message = messageInput.value.trim();

        if (!projectName || !projectPrompt || !message) {
            chatStatus.textContent = "Please complete all fields.";
            return;
        }

        // Show the user's question.
        const userMessage = document.createElement("div");
        userMessage.className = "chat-message user-message";
        userMessage.textContent = message;
        chatMessages.appendChild(userMessage);

        chatStatus.textContent = "DevPilot AI is thinking...";
        chatButton.disabled = true;
        chatButton.textContent = "Please wait...";

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    project_name: projectName,
                    project_prompt: projectPrompt,
                    message: message
                })
            });

            const data = await response.json();


            if (!response.ok) {
                throw new Error(
                    data.detail || "Unable to get an answer from AI."
                );
            }
            
            const assistantMessage = document.createElement("div");
            assistantMessage.className = "chat-message assistant-message";
            assistantMessage.textContent = data.answer || "AI returned an empty answer.";
            chatMessages.appendChild(assistantMessage);

            messageInput.value = "";
            chatStatus.textContent = "Answer received successfully.";
            assistantMessage.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });

        } catch (error) {
            chatStatus.textContent = `Error: ${error.message}`;
        } finally {
            chatButton.disabled = false;
            chatButton.innerHTML = 'Ask AI <span>→</span>';
        }
    });
}

// ==========================================
// AI PROJECT CODE GENERATOR
// ==========================================

const generateProjectForm = document.getElementById("generateProjectForm");

if (generateProjectForm) {
    generateProjectForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const projectName = document
            .getElementById("generateProjectName")
            .value.trim();

        const prompt = document
            .getElementById("generateProjectPrompt")
            .value.trim();

        const generateButton = document.getElementById(
            "generateProjectButton"
        );

        const statusElement = document.getElementById(
            "generateProjectStatus"
        );

        const resultsElement = document.getElementById(
            "generatedProjectResults"
        );

        const summaryElement = document.getElementById(
            "generatedProjectSummary"
        );

        const filesElement = document.getElementById(
            "generatedProjectFiles"
        );

        const instructionsElement = document.getElementById(
            "generatedProjectInstructions"
        );

        const nameElement = document.getElementById(
            "generatedProjectName"
        );

        if (projectName.length === 0 || prompt.length < 20) {
            statusElement.textContent =
                "Please enter a project name and at least 20 characters of requirements.";
            return;
        }

        generateButton.disabled = true;
        generateButton.textContent = "Generating project...";

        statusElement.textContent =
            "DevPilot AI is generating your project. Please wait.";

        resultsElement.hidden = true;
        filesElement.replaceChildren();
        instructionsElement.replaceChildren();

        try {
            const response = await fetch("/api/generate-project", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    project_name: projectName,
                    prompt: prompt
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    typeof data.detail === "string"
                        ? data.detail
                        : "Project generation failed. Please try again."
                );
            }
            latestGeneratedProject = data;
            saveProjectToHistory(data);
            const treeElement = document.getElementById("projectStructureTree");

if (treeElement && Array.isArray(data.files)) {
    treeElement.replaceChildren();

    const rootFolder = document.createElement("div");
    rootFolder.className = "tree-folder";
    rootFolder.textContent = "📁 " + (data.project_name || "Generated Project");

    treeElement.appendChild(rootFolder);

    const childrenContainer = document.createElement("div");
    childrenContainer.className = "tree-children";

    const sortedFiles = [...data.files].sort((a, b) =>
        a.path.localeCompare(b.path)
    );

    sortedFiles.forEach(function (file) {
        const fileRow = document.createElement("div");
        fileRow.className = "tree-file";

        const fileIcon = document.createElement("span");
        fileIcon.className = "tree-icon";

        const fileName = document.createElement("span");
        fileName.textContent = file.path;


        fileName.style.cursor = "pointer";
fileName.title = "Click to view code";

fileName.addEventListener("click", function () {
    const targetFile = data.files.find(function (item) {
        return item.path === file.path;
    });

    if (!targetFile) {
        return;
    }

    const preview = document.getElementById("selectedFilePreview");

    if (!preview) {
        return;
    }

   const heading = preview.querySelector(".preview-header h3");
const codeElement = document.getElementById("selectedFileCode");

if (!heading || !codeElement) {
    return;
}

heading.textContent = "📄 " + targetFile.path;
codeElement.textContent = targetFile.content || "";

preview.hidden = false;

preview.scrollIntoView({
    behavior: "smooth",
    block: "start"
});

if (!heading || !codeElement) {
    return;
}

heading.textContent = "📄 " + targetFile.path;
codeElement.textContent = targetFile.content || "";

preview.hidden = false;

preview.scrollIntoView({
    behavior: "smooth",
    block: "start"
});

    preview.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});

        const extension = file.path.split(".").pop().toLowerCase();

        if (extension === "html") {
            fileIcon.textContent = "🌐";
        } else if (extension === "css") {
            fileIcon.textContent = "🎨";
        } else if (extension === "js") {
            fileIcon.textContent = "📜";
        } else if (extension === "py") {
            fileIcon.textContent = "🐍";
        } else if (extension === "json") {
            fileIcon.textContent = "⚙️";
        } else if (extension === "md") {
            fileIcon.textContent = "📝";
        } else {
            fileIcon.textContent = "📄";
        }

        fileRow.append(fileIcon, fileName);
        childrenContainer.appendChild(fileRow);
    });

    treeElement.appendChild(childrenContainer);
}
            nameElement.textContent = data.project_name || projectName;
            summaryElement.textContent =
                data.summary || "Your project files have been generated.";

            // Display generated files safely.
            (data.files || []).forEach(function (file, index) {
                const fileCard = document.createElement("article");
                fileCard.className = "generated-file-card";

                const fileTitle = document.createElement("h4");
                fileTitle.textContent = file.path || `File ${index + 1}`;

                const codeBlock = document.createElement("pre");
const code = document.createElement("code");

code.textContent = file.content || "";
codeBlock.appendChild(code);
codeBlock.hidden = true;

                // Create Copy Code button.
                const copyButton = document.createElement("button");
                copyButton.type = "button";
                copyButton.className = "copy-code-button";
                copyButton.textContent = "Copy Code";

                copyButton.addEventListener("click", async function () {
                    const originalText = "Copy Code";

                    try {
                        await navigator.clipboard.writeText(
                            file.content || ""
                        );

                        copyButton.textContent = "Copied!";
                        copyButton.disabled = true;

                        setTimeout(function () {
                            copyButton.textContent = originalText;
                            copyButton.disabled = false;
                        }, 1500);

                    } catch (error) {
                        copyButton.textContent =
                            "Select code below to copy";
                    }
                });

                // Add all elements to the file card.
                fileCard.append(fileTitle, copyButton);
                filesElement.appendChild(fileCard);
            });

            // Display setup instructions.
            (data.setup_instructions || []).forEach(function (instruction) {
                const item = document.createElement("li");
                item.textContent = instruction;
                instructionsElement.appendChild(item);
            });

            resultsElement.hidden = false;

            statusElement.textContent =
                "Project generated successfully! Review the files and setup instructions below.";

            resultsElement.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        } catch (error) {
            statusElement.textContent =
                error.message ||
                "Something went wrong. Please check that the backend is running.";

        } finally {
            generateButton.disabled = false;
            generateButton.textContent = "Generate Project →";
        }
    });
}

// ==========================================
// DOWNLOAD GENERATED PROJECT AS ZIP
// ==========================================



const downloadProjectButton = document.getElementById(
    "downloadProjectButton"
);

if (downloadProjectButton) {
    downloadProjectButton.addEventListener("click", async function () {
        const statusElement = document.getElementById(
            "downloadProjectStatus"
        );

        if (
            !latestGeneratedProject ||
            !Array.isArray(latestGeneratedProject.files) ||
            latestGeneratedProject.files.length === 0
        ) {
            statusElement.textContent =
                "Please generate a project first, then download it.";
            return;
        }

        downloadProjectButton.disabled = true;
        downloadProjectButton.textContent = "Preparing ZIP...";

        statusElement.textContent =
            "Preparing your project ZIP file. Please wait.";

        try {
            const response = await fetch("/api/download-project", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    project_name: latestGeneratedProject.project_name,
                    files: latestGeneratedProject.files,
                    setup_instructions:
                        latestGeneratedProject.setup_instructions || []
                })
            });

            if (!response.ok) {
                let message = "Could not create the ZIP file.";

                try {
                    const errorData = await response.json();

                    if (typeof errorData.detail === "string") {
                        message = errorData.detail;
                    }
                } catch (error) {
                    // Use the default error message.
                }

                throw new Error(message);
            }

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");

            const safeName = (
                latestGeneratedProject.project_name || "devpilot_project"
            ).replace(/[^a-z0-9_-]/gi, "_");

            link.href = downloadUrl;
            link.download = `${safeName || "devpilot_project"}.zip`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(downloadUrl);

            statusElement.textContent =
                "Your project ZIP download has started!";

        } catch (error) {
            statusElement.textContent =
                error.message || "Download failed. Please try again.";

        } finally {
            downloadProjectButton.disabled = false;
            downloadProjectButton.textContent =
                "↓ Download Complete Project (ZIP)";
        }
    });
}
const closePreviewButton = document.getElementById("closeFilePreview");
const filePreviewSection = document.getElementById("selectedFilePreview");

if (closePreviewButton && filePreviewSection) {
    closePreviewButton.addEventListener("click", function () {
        filePreviewSection.hidden = true;
    });
}

// ==========================================
// LIVE DASHBOARD STATISTICS
// ==========================================

function updateDashboardStatistics() {
    const historyKey = "devpilot_project_history";
    let history = [];

    try {
        const savedHistory = localStorage.getItem(historyKey);
        history = savedHistory ? JSON.parse(savedHistory) : [];

        if (!Array.isArray(history)) {
            history = [];
        }
    } catch (error) {
        console.error("Could not read project history:", error);
    }

    const projectCountElement = document.getElementById("projectCount");

    if (projectCountElement) {
        projectCountElement.textContent = history.length;
    }

    const totalFiles = history.reduce(function (total, project) {
        return total + (
            Array.isArray(project.files) ? project.files.length : 0
        );
    }, 0);

    const totalFilesElement = document.getElementById("totalGeneratedFiles");

    if (totalFilesElement) {
        totalFilesElement.textContent = totalFiles;
    }
}

// Update when the page loads.
document.addEventListener("DOMContentLoaded", updateDashboardStatistics);

// Refresh statistics when another part of the app updates local history.
window.addEventListener("storage", updateDashboardStatistics);

// ================================
// DevPilot AI - Project Notes
// ================================
(function () {
    "use strict";

    const NOTES_STORAGE_KEY = "devpilot_project_notes";

    document.addEventListener("DOMContentLoaded", initializeProjectNotes);

    function initializeProjectNotes() {
        const notesForm = document.getElementById("projectNotesForm");
        const titleInput = document.getElementById("noteTitle");
        const contentInput = document.getElementById("noteContent");
        const notesList = document.getElementById("projectNotesList");
        const notesStatus = document.getElementById("notesStatus");
        const saveButton = document.getElementById("saveNoteButton");

        // Agar Project Notes HTML mein nahi hain to kuch nahi karna.
        if (
            !notesForm ||
            !titleInput ||
            !contentInput ||
            !notesList ||
            !notesStatus ||
            !saveButton
        ) {
            return;
        }

        let editingNoteId = null;

        function getSavedNotes() {
            try {
                const savedData = localStorage.getItem(NOTES_STORAGE_KEY);
                const notes = savedData ? JSON.parse(savedData) : [];

                return Array.isArray(notes) ? notes.filter(function (note) {
                    return (
                        note &&
                        typeof note.id === "string" &&
                        typeof note.title === "string" &&
                        typeof note.content === "string"
                    );
                }) : [];
            } catch (error) {
                console.error("Could not read project notes:", error);
                notesStatus.textContent =
                    "Notes could not be loaded. Please check browser storage.";
                return [];
            }
        }

        function storeNotes(notes) {
            try {
                localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
                return true;
            } catch (error) {
                console.error("Could not save project notes:", error);
                notesStatus.textContent =
                    "Could not save notes. Browser storage may be full or disabled.";
                return false;
            }
        }

        function renderNotes() {
            const notes = getSavedNotes();
            notesList.replaceChildren();

            if (notes.length === 0) {
                const emptyMessage = document.createElement("p");
                emptyMessage.textContent =
                    "No notes saved yet. Create your first note above!";
                notesList.appendChild(emptyMessage);
                return;
            }

            notes.forEach(function (note) {
                const noteCard = document.createElement("article");
                noteCard.className = "project-note-card";

                const noteTitle = document.createElement("h4");
                noteTitle.textContent = note.title;

                const noteContent = document.createElement("p");
                noteContent.className = "project-note-content";
                noteContent.textContent = note.content;

                const noteDate = document.createElement("small");
                noteDate.textContent = note.updatedAt
                    ? "Last updated: " + note.updatedAt
                    : "";

                const actions = document.createElement("div");
                actions.className = "project-note-actions";

                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.className = "note-edit-button";
                editButton.textContent = "✏️ Edit";

                editButton.addEventListener("click", function () {
                    titleInput.value = note.title;
                    contentInput.value = note.content;
                    editingNoteId = note.id;

                    saveButton.textContent = "Update Note →";
                    notesStatus.textContent = "Editing: " + note.title;

                    titleInput.focus();
                    notesForm.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                });

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.className = "note-delete-button";
                deleteButton.textContent = "🗑️ Delete";

                deleteButton.addEventListener("click", function () {
                    const confirmed = window.confirm(
                        'Delete the note "' + note.title + '"?'
                    );

                    if (!confirmed) {
                        return;
                    }

                    const updatedNotes = getSavedNotes().filter(
                        function (savedNote) {
                            return savedNote.id !== note.id;
                        }
                    );

                    if (storeNotes(updatedNotes)) {
                        if (editingNoteId === note.id) {
                            resetForm();
                        }

                        renderNotes();
                        notesStatus.textContent = "Note deleted successfully.";
                    }
                });

                actions.append(editButton, deleteButton);
                noteCard.append(noteTitle, noteContent, noteDate, actions);
                notesList.appendChild(noteCard);
            });
        }

        function resetForm() {
            notesForm.reset();
            editingNoteId = null;
            saveButton.textContent = "Save Note →";
        }

        notesForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const title = titleInput.value.trim();
            const content = contentInput.value.trim();

            if (!title || !content) {
                notesStatus.textContent =
                    "Please enter both a note title and note content.";
                return;
            }

            const notes = getSavedNotes();
            const now = new Date().toLocaleString();

            if (editingNoteId) {
                const noteExists = notes.some(function (note) {
                    return note.id === editingNoteId;
                });

                if (!noteExists) {
                    editingNoteId = null;
                    notesStatus.textContent =
                        "This note no longer exists. Please save it again.";
                    saveButton.textContent = "Save Note →";
                    return;
                }

                const updatedNotes = notes.map(function (note) {
                    if (note.id === editingNoteId) {
                        return {
                            ...note,
                            title: title,
                            content: content,
                            updatedAt: now
                        };
                    }

                    return note;
                });

                if (storeNotes(updatedNotes)) {
                    resetForm();
                    renderNotes();
                    notesStatus.textContent = "Note updated successfully.";
                }
            } else {
                const newNote = {
                    id: window.crypto.randomUUID(),
                    title: title,
                    content: content,
                    updatedAt: now
                };

                if (storeNotes([newNote, ...notes])) {
                    resetForm();
                    renderNotes();
                    notesStatus.textContent = "Note saved successfully.";
                }
            }
        });

        renderNotes();
    }
})();