const container = document.querySelector(".container");
const chatContainer = document.querySelector(".chat-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const themeBtn = document.querySelector("#themeBtn");

//Google for AI developers --> API Key
const API_KEY = "YOUR_API_KEY";
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const userData = { message: "", file: {} };
const chatHistory = [];

let typingInterval, controller;
// Scrolling automatically to down as messages's height increases
const scrollToBottom = () => {
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
};

// Creating parent div for holding inner messages
const createParentElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

//Typing word by word that feels like human is writing & smoothly
const typingEffect = (apiResponse, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = apiResponse.split(" ");
  let wordIdx = 0;

  typingInterval = setInterval(() => {
    if (wordIdx < words.length) {
      textElement.textContent += (wordIdx === 0 ? "" : " ") + words[wordIdx++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 50);
};

//Getting response from API on user's query
const genBotResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();
  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data
        ? [
            {
              inline_data: (({ fileName, isImage, ...rest }) => rest)(
                userData.file
              ),
            },
          ]
        : []),
    ],
  });
  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: chatHistory,
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    const apiResponse = data.candidates[0].content.parts[0].text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .trim();
    typingEffect(apiResponse, textElement, botMsgDiv);
    chatHistory.push({
      role: "model",
      parts: [{ text: apiResponse }],
    });
  } catch (error) {
    textElement.style.color = "rgb(255, 111, 111)";
    textElement.textContent =
      error.name === "Abbort Error"
        ? "Response Generation Stopped."
        : error.message;
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

//Handling user and bot messages
const handleForm = (e) => {
  e.preventDefault();
  const userMsg = promptInput.value.trim();
  if (!userMsg || document.body.classList.contains("bot-responding")) return;
  promptInput.value = "";
  userData.message = userMsg;
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
  document.body.classList.add("bot-responding", "chat-active");

  // Generating user message HTML with optional file attachment
  const userMsgHTML = `
    <p class="message-text"></p>
    ${
      userData.file.data
        ? `
        ${
          userData.file.isImage
            ? `
            <img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />
        `
            : `
            <p class="file-attachment">
                <span class="material-symbols-rounded">description</span>
                ${userData.file.fileName}
            </p>
        `
        }
    `
        : ""
    }
`;
  const userMsgDiv = createParentElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userMsg;
  chatContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    const botMsgHTML = `<img src="gemini-chatbot-logo.svg" alt="Gemini Logo"  class="avatar" /><p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createParentElement(botMsgHTML, "bot-message", "loading");
    chatContainer.appendChild(botMsgDiv);
    scrollToBottom();

    genBotResponse(botMsgDiv);
  }, 600);
};

// Select a file on the click of file attach icon and converting it to  readable by bot
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];

  if (!file) return;
  console.log(file);

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add(
      "active",
      isImage ? "img-attached" : "file-attached"
    );
    userData.file = {
      fileName: file.name,
      data: base64String,
      mime_type: file.type,
      isImage,
    };
  };
});

// Calcel Button --> to cancel selected images or file After attaching from file Explorer
document.querySelector("#cancelBtn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});

// Stop Button --> Stoping the bot response on click
document.querySelector("#stopBtn").addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
  clearInterval(typingInterval);
  chatContainer
    .querySelector(".bot-message.loading")
    .classList.remove("loading");
  document.body.classList.add("bot-responding");
});

//Delete Chat button --> to delete all the chat in the chat container
document.querySelector("#deleteBtn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatContainer.innerHTML = "";
  document.body.classList.remove("bot-responding", "chat-active");
});

document.querySelectorAll(".suggestion-item").forEach((item) => {
  item.addEventListener("click", () => {
    promptInput.value = item.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

// Show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide =
    target.classList.contains("prompt-input") ||
    (wrapper.classList.contains("hide-controls") &&
      (target.id === "add-file-btn" || target.id === "stop-response-btn"));

  wrapper.classList.toggle("hide-controls", shouldHide);
});

//theme toggle button -->  Dark to Light and Light to Dark on each click and storing theme in localStorage
themeBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem(
    "themeColor",
    isLightTheme ? "light_theme" : "dark_theme"
  );
  themeBtn.textContent = isLightTheme ? "light_mode" : "dark_mode";
});

//Getting theme from localStorage and showing it on UI

const isLightTheme = localStorage.getItem("themeColor") === "light_theme";
document.body.classList.toggle("light-theme", isLightTheme);
themeBtn.textContent = isLightTheme ? "light_mode" : "dark_mode";

promptForm.addEventListener("submit", handleForm);
promptForm.querySelector("#fileBtn").addEventListener("click", () => {
  fileInput.click();
});
