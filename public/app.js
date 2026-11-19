
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const chatArea = document.getElementById("chatArea");

const imagePanel = document.getElementById("imagePanel");
const inputSection = document.getElementById("inputSection");
const imagePrompt = document.getElementById("imagePrompt");
const imageResult = document.getElementById("imageResult");

let conversation = [];
let currentPage = "chat";
let isSending = false;

const SYSTEM_MODES = {
  chat: "",
  coding: "Act as an expert programming assistant. Help with debugging, web development, code explanations and complete projects. Use clear code blocks."
};

// CONNECTION CHECK

async function checkConnection() {
  const status = document.getElementById("connectionStatus");

  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("Offline");

    const data = await response.json();
    status.textContent = data.status === "online"
      ? "System online"
      : "System offline";

  } catch {
    status.textContent = "Connection unavailable";
  }
}

checkConnection();

// ADD MESSAGE

function addMessage(role, text) {
  welcome.style.display = "none";

  const message = document.createElement("div");
  message.className = `message ${role}`;

  const icon = document.createElement("div");
  icon.className = "message-icon";
  icon.textContent = role === "user" ? "YOU" : "N";

  const content = document.createElement("div");
  content.className = "message-content";

  // Use textContent to prevent HTML/script injection.
  content.textContent = text;

  message.append(icon, content);
  messages.appendChild(message);

  chatArea.scrollTop = chatArea.scrollHeight;

  return content;
}

// SEND MESSAGE

async function sendMessage(text) {
  text = text.trim();

  if (!text || isSending) return;

  isSending = true;
  sendButton.disabled = true;

  addMessage("user", text);

  conversation.push({
    role: "user",
    content: text
  });

  userInput.value = "";
  userInput.style.height = "auto";

  const typing = addMessage("assistant", "NOVA is thinking...");

  typing.classList.add("typing");

  try {
    const history = conversation.slice(-20);

    if (currentPage === "coding" && SYSTEM_MODES.coding) {
      history[history.length - 1] = {
        role: "user",
        content: SYSTEM_MODES.coding + "\n\n" + text
      };
    }

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: history
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "AI request failed.");
    }

    typing.classList.remove("typing");
    typing.textContent = data.reply;

    conversation.push({
      role: "assistant",
      content: data.reply
    });

  } catch (error) {
    typing.classList.remove("typing");
    typing.textContent = "NOVA ERROR: " + error.message;

  } finally {
    isSending = false;
    sendButton.disabled = false;
    userInput.focus();
    chatArea.scrollTop = chatArea.scrollHeight;
  }
}

// SEND BUTTON

sendButton.addEventListener("click", () => {
  sendMessage(userInput.value);
});

// ENTER TO SEND

userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(userInput.value);
  }
});

// AUTO RESIZE INPUT

userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height =
    Math.min(userInput.scrollHeight, 140) + "px";
});

// SUGGESTIONS

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

// NEW CHAT

function newChat() {
  if (isSending) return;

  conversation = [];
  messages.replaceChildren();
  welcome.style.display = "block";
  userInput.value = "";
}

document.getElementById("newChat").addEventListener("click", () => {
  newChat();
  switchPage("chat");
});

// CLEAR CHAT

document.getElementById("clearChat").addEventListener("click", () => {
  newChat();
});

// NAVIGATION

function switchPage(page) {
  currentPage = page;

  const isImage = page === "image";

  imagePanel.classList.toggle("visible", isImage);
  chatArea.style.display = isImage ? "none" : "block";
  inputSection.style.display = isImage ? "none" : "block";

  const titles = {
    chat: "NOVA AI Assistant",
    coding: "NOVA Coding Assistant",
    image: "NOVA Image Studio"
  };

  document.getElementById("pageTitle").textContent =
    titles[page] || titles.chat;

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle(
      "active",
      item.dataset.page === page
    );
  });

  document.getElementById("sidebar").classList.remove("open");
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    switchPage(button.dataset.page);
  });
});

// MOBILE MENU

document.getElementById("menuButton").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

// IMAGE GENERATION

document.getElementById("generateImage").addEventListener(
  "click",
  async () => {
    const prompt = imagePrompt.value.trim();

    if (!prompt) {
      imageResult.textContent = "Please describe your image first.";
      return;
    }

    const button = document.getElementById("generateImage");

    button.disabled = true;
    button.textContent = "Preparing image...";

    imageResult.replaceChildren();

    const status = document.createElement("p");
    status.textContent = "Connecting to image service...";
    imageResult.appendChild(status);

    try {
      // External image provider. The prompt is sent to that service.
      const imageURL =
        "https://image.pollinations.ai/prompt/" +
        encodeURIComponent(prompt) +
        "?width=1024&height=1024&nologo=true";

      const img = document.createElement("img");
      img.alt = "NOVA generated image";

      img.onload = () => {
        status.textContent = "Image created successfully.";
        imageResult.appendChild(img);
        img.src = imageURL;
      };

      img.onerror = () => {
        status.textContent =
          "Image generation failed. The external service may be unavailable.";
      };

      img.src = imageURL;

    } catch (error) {
      status.textContent = "Image error: " + error.message;
    } finally {
      button.disabled = false;
      button.textContent = "✦ Generate Image";
    }
  }
);

// ROBOT INTERACTION

const robot = document.getElementById("robot");

robot.addEventListener("click", () => {
  robot.style.animation = "none";

  // Restart the robot's floating animation.
  robot.offsetHeight;

  robot.style.animation =
    "float 0.7s ease-in-out 3";

  setTimeout(() => {
    robot.style.animation =
      "float 3s ease-in-out infinite";
  }, 2100);
});

// INITIALIZE

switchPage("chat");
