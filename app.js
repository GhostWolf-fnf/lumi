const CONFIG = {
  AI_ENDPOINT: "https://lumi.ghostwolffnaf.workers.dev",
  characterName: "Lumi",
  language: "pt-BR",
  voiceRate: 1.05,
  voicePitch: 1.25
};

const AVATARS = {
  normal: "normal.png",
  happy: "feliz.png",
  listening: "ouvindo.png",
  thinking: "pensando.png",
  speaking: "falando.png",
  surprised: "surpresa.png",
  sad: "triste.png",
  angry: "brava.png",
  excited: "animada.png"
};

const LABELS = {
  normal: "Normal",
  happy: "Feliz",
  listening: "Ouvindo",
  thinking: "Pensando",
  speaking: "Falando",
  surprised: "Surpresa",
  sad: "Triste",
  angry: "Brava",
  excited: "Animada"
};

const $ = (id) => document.getElementById(id);

const state = {
  emotion: "normal",
  lastResponse: "",
  recognition: null,
  recognizing: false,
  conversation: loadJSON("lumiConversation", []),
  settings: loadJSON("lumiSettings", {})
};

function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn("Lumi: não foi possível ler", key, error);
    return fallback;
  }
}

function saveConversation() {
  try {
    localStorage.setItem(
      "lumiConversation",
      JSON.stringify(state.conversation.slice(-30))
    );
  } catch (error) {
    console.warn("Lumi: não foi possível salvar a conversa.", error);
  }
}

function setEmotion(emotion) {
  if (!AVATARS[emotion]) {
    emotion = "normal";
  }

  state.emotion = emotion;

  const character = $("character");
  const avatarImage = $("avatarImage");
  const stateBadge = $("stateBadge");

  if (character) {
    character.className = "emotion-" + emotion;
  }

  if (avatarImage) {
    avatarImage.src = AVATARS[emotion];
    avatarImage.alt = "Lumi - " + LABELS[emotion];
  }

  if (stateBadge) {
    stateBadge.textContent = LABELS[emotion];
  }
}

function showSpeech(text) {
  const bubble = $("speechBubble");

  if (!bubble) {
    return;
  }

  bubble.textContent = String(text || "");
  bubble.classList.remove("speech-hidden");
}

function addMessage(role, text) {
  const messages = $("messages");

  if (!messages) {
    return;
  }

  const div = document.createElement("div");

  div.className =
    "msg " + (role === "user" ? "user" : "ai");

  div.textContent = String(text || "");

  messages.appendChild(div);

  messages.scrollTop = messages.scrollHeight;
}

function setConnectionStatus(text, className) {
  const status = $("connectionStatus");

  if (!status) {
    return;
  }

  status.textContent = text;
  status.className = className || "";
}

function configured() {
  return (
    typeof CONFIG.AI_ENDPOINT === "string" &&
    /^https?:\/\//i.test(CONFIG.AI_ENDPOINT) &&
    !CONFIG.AI_ENDPOINT.includes("COLE_AQUI")
  );
}


/* =========================================================
   VERIFICAR WORKER
   ========================================================= */

async function checkBackend() {
  if (!configured()) {
    setConnectionStatus(
      "● configure o Worker",
      "offline"
    );

    return false;
  }

  setConnectionStatus(
    "● verificando",
    ""
  );

  try {
    const response = await fetch(
      CONFIG.AI_ENDPOINT,
      {
        method: "GET",
        cache: "no-store"
      }
    );

    const data =
      await response.json().catch(() => null);

    console.log(
      "Lumi GET Worker:",
      response.status,
      data
    );

    if (
      response.ok &&
      data &&
      data.ok === true
    ) {
      setConnectionStatus(
        "● backend online",
        "online"
      );

      return true;
    }

    setConnectionStatus(
      "● backend com erro",
      "offline"
    );

    return false;

  } catch (error) {

    console.error(
      "Lumi: erro no GET do Worker:",
      error
    );

    setConnectionStatus(
      "● backend offline",
      "offline"
    );

    return false;
  }
}


/* =========================================================
   CHAMAR A IA
   ========================================================= */

async function ask(text) {

  if (!configured()) {
    throw new Error(
      "URL do Worker não configurada."
    );
  }

  console.log(
    "Lumi POST →",
    CONFIG.AI_ENDPOINT
  );

  let response;

  try {

    response = await fetch(
      CONFIG.AI_ENDPOINT,
      {
        method: "POST",
        mode: "cors",
        cache: "no-store",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          message: text,

          conversation:
            state.conversation.slice(-16)
        })
      }
    );

  } catch (error) {

    console.error(
      "Lumi: falha de conexão com o Worker:",
      error
    );

    throw new Error(
      "Não foi possível conectar ao Worker. " +
      (
        error && error.message
          ? error.message
          : "verifique a internet."
      )
    );
  }


  const rawText =
    await response.text();

  console.log(
    "Lumi resposta do Worker:",
    response.status,
    rawText
  );


  let data = null;

  try {

    data =
      rawText
        ? JSON.parse(rawText)
        : null;

  } catch (error) {

    throw new Error(
      "O Worker retornou uma resposta que não é JSON. HTTP " +
      response.status
    );
  }


  if (!response.ok) {

    let message = "";

    if (
      data &&
      typeof data.error === "string"
    ) {
      message = data.error;
    }

    else if (
      data &&
      typeof data.message === "string"
    ) {
      message = data.message;
    }

    else if (
      data &&
      data.details
    ) {

      try {

        message =
          typeof data.details === "string"
            ? data.details
            : JSON.stringify(
                data.details
              );

      } catch {

        message = "";
      }
    }


    throw new Error(
      message ||
      "Worker respondeu HTTP " +
      response.status
    );
  }


  if (
    !data ||
    typeof data.response !== "string" ||
    !data.response.trim()
  ) {

    throw new Error(
      "O Worker respondeu, mas não enviou a resposta da Lumi."
    );
  }


  return {

    message: data.response,

    emotion:
      AVATARS[data.emotion]
        ? data.emotion
        : "normal"
  };
}


/* =========================================================
   ENVIAR MENSAGEM
   ========================================================= */

async function sendMessage(text) {

  text = String(text || "").trim();

  if (!text) {
    return;
  }


  addMessage(
    "user",
    text
  );


  state.conversation.push({
    role: "user",
    content: text
  });

  saveConversation();


  const input =
    $("messageInput");

  if (input) {
    input.value = "";
  }


  const typing =
    $("typing");

  if (typing) {
    typing.hidden = false;
  }


  setEmotion("thinking");

  showSpeech(
    "Hmm... deixa eu pensar..."
  );


  try {

    const data =
      await ask(text);


    state.lastResponse =
      data.message;


    addMessage(
      "assistant",
      data.message
    );


    state.conversation.push({
      role: "assistant",
      content: data.message
    });

    saveConversation();


    showSpeech(
      data.message
    );


    setEmotion(
      data.emotion
    );


    speak(
      data.message
    );


  } catch (error) {

    console.error(
      "Lumi: erro ao conversar:",
      error
    );


    const message =
      error && error.message
        ? error.message
        : "Erro desconhecido.";


    showSpeech(
      "Erro: " + message
    );


    setEmotion(
      "sad"
    );


  } finally {

    if (typing) {
      typing.hidden = true;
    }
  }
}


/* =========================================================
   VOZ
   ========================================================= */

function speak(text) {

  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }


  window.speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  utterance.lang =
    CONFIG.language;


  utterance.rate =
    Number(
      state.settings.rate ||
      CONFIG.voiceRate
    );


  utterance.pitch =
    Number(
      state.settings.pitch ||
      CONFIG.voicePitch
    );


  setEmotion(
    "speaking"
  );


  utterance.onend = () => {

    if (
      state.emotion === "speaking"
    ) {
      setEmotion(
        "normal"
      );
    }
  };


  utterance.onerror = (event) => {

    console.error(
      "Lumi: erro na voz:",
      event
    );

    setEmotion(
      "normal"
    );
  };


  window.speechSynthesis.speak(
    utterance
  );
}


/* =========================================================
   RECONHECIMENTO DE VOZ
   ========================================================= */

function setupRecognition() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  const micBtn =
    $("micBtn");

  const talkBtn =
    $("talkBtn");


  if (!SpeechRecognition) {

    console.warn(
      "Lumi: reconhecimento de voz não suportado neste navegador."
    );


    if (micBtn) {
      micBtn.disabled = true;
    }

    if (talkBtn) {
      talkBtn.disabled = true;
    }

    return;
  }


  state.recognition =
    new SpeechRecognition();


  state.recognition.lang =
    CONFIG.language;


  state.recognition.interimResults =
    false;


  state.recognition.continuous =
    false;


  state.recognition.onstart =
    () => {

      state.recognizing = true;

      setEmotion(
        "listening"
      );

      showSpeech(
        "Estou ouvindo..."
      );
    };


  state.recognition.onresult =
    (event) => {

      const text =
        event.results &&
        event.results[0] &&
        event.results[0][0]
          ? event.results[0][0].transcript
          : "";


      const input =
        $("messageInput");


      if (input) {
        input.value = text;
      }


      if (text.trim()) {
        sendMessage(text);
      }
    };


  state.recognition.onerror =
    (event) => {

      console.error(
        "Lumi: erro no reconhecimento de voz:",
        event.error
      );


      state.recognizing =
        false;


      setEmotion(
        "normal"
      );


      if (
        event.error ===
        "not-allowed"
      ) {

        showSpeech(
          "Não consegui acessar o microfone."
        );
      }
    };


  state.recognition.onend =
    () => {

      state.recognizing =
        false;


      if (
        state.emotion ===
        "listening"
      ) {

        setEmotion(
          "normal"
        );
      }
    };
}


/* =========================================================
   OUVIR
   ========================================================= */

function listen() {

  if (!state.recognition) {

    showSpeech(
      "O reconhecimento de voz não está disponível neste navegador."
    );

    return;
  }


  if (state.recognizing) {

    state.recognition.stop();

    return;
  }


  try {

    state.recognition.start();

  } catch (error) {

    console.error(
      "Lumi: não foi possível iniciar o microfone:",
      error
    );
  }
}


/* =========================================================
   TESTE DAS EMOÇÕES
   ========================================================= */

function testEmotions() {

  const emotions =
    Object.keys(AVATARS);

  let index = 0;


  const timer =
    setInterval(() => {

      setEmotion(
        emotions[
          index %
          emotions.length
        ]
      );

      index++;


      if (
        index >=
        emotions.length
      ) {

        clearInterval(
          timer
        );
      }

    }, 600);
}


/* =========================================================
   EVENTOS DA INTERFACE
   ========================================================= */

function setupEvents() {

  const sendBtn =
    $("sendBtn");

  const messageInput =
    $("messageInput");

  const micBtn =
    $("micBtn");

  const talkBtn =
    $("talkBtn");

  const testBtn =
    $("testBtn");

  const moveBtn =
    $("moveBtn");

  const repeatBtn =
    $("repeatBtn");


  if (sendBtn) {

    sendBtn.onclick =
      () => {

        sendMessage(
          messageInput
            ? messageInput.value
            : ""
        );
      };
  }


  if (messageInput) {

    messageInput.onkeydown =
      (event) => {

        if (
          event.key ===
          "Enter"
        ) {

          event.preventDefault();

          sendMessage(
            event.target.value
          );
        }
      };
  }


  if (micBtn) {
    micBtn.onclick = listen;
  }


  if (talkBtn) {
    talkBtn.onclick = listen;
  }


  if (testBtn) {
    testBtn.onclick =
      testEmotions;
  }


  if (moveBtn) {

    moveBtn.onclick =
      () => {

        const character =
          $("character");


        if (!character) {
          return;
        }


        character.animate(
          [
            {
              transform:
                "translateX(0)"
            },

            {
              transform:
                "translateX(55px)"
            },

            {
              transform:
                "translateX(-45px)"
            },

            {
              transform:
                "translateX(0)"
            }
          ],

          {
            duration: 1000
          }
        );
      };
  }


  if (repeatBtn) {

    repeatBtn.onclick =
      () => {

        if (
          state.lastResponse
        ) {

          speak(
            state.lastResponse
          );
        }
      };
  }


  const settingsBtn =
    $("settingsBtn");

  const closeSettingsBtn =
    $("closeSettingsBtn");

  const saveSettingsBtn =
    $("saveSettingsBtn");


  if (settingsBtn) {

    settingsBtn.onclick =
      () => {

        const panel =
          $("settingsPanel");


        if (panel) {

          panel.classList.remove(
            "hidden"
          );
        }
      };
  }


  if (closeSettingsBtn) {

    closeSettingsBtn.onclick =
      () => {

        const panel =
          $("settingsPanel");


        if (panel) {

          panel.classList.add(
            "hidden"
          );
        }
      };
  }


  if (saveSettingsBtn) {

    saveSettingsBtn.onclick =
      () => {

        const nameInput =
          $("nameSetting");

        const rateInput =
          $("rateSetting");

        const pitchInput =
          $("pitchSetting");


        state.settings = {

          name:
            nameInput &&
            nameInput.value
              ? nameInput.value
              : "Lumi",

          rate:
            rateInput
              ? Number(
                  rateInput.value
                )
              : CONFIG.voiceRate,

          pitch:
            pitchInput
              ? Number(
                  pitchInput.value
                )
              : CONFIG.voicePitch
        };


        try {

          localStorage.setItem(
            "lumiSettings",

            JSON.stringify(
              state.settings
            )
          );

        } catch (error) {

          console.warn(
            "Lumi: não foi possível salvar configurações.",
            error
          );
        }


        const panel =
          $("settingsPanel");


        if (panel) {

          panel.classList.add(
            "hidden"
          );
        }
      };
  }
}


/* =========================================================
   CARREGAR CONVERSA
   ========================================================= */

function loadConversationIntoUI() {

  const messages =
    $("messages");


  if (!messages) {
    return;
  }


  messages.innerHTML = "";


  if (
    !state.conversation.length
  ) {

    const welcome =
      "Oi! Eu sou a Lumi. Agora posso conversar com você usando minha IA. ♡";


    state.conversation.push({

      role: "assistant",

      content: welcome
    });


    saveConversation();
  }


  state.conversation
    .slice(-20)
    .forEach(
      (message) => {

        addMessage(
          message.role,
          message.content
        );
      }
    );


  const lastAssistantMessage =
    [...state.conversation]
      .reverse()
      .find(
        (message) =>
          message.role ===
          "assistant"
      );


  if (
    lastAssistantMessage
  ) {

    state.lastResponse =
      lastAssistantMessage.content;


    showSpeech(
      lastAssistantMessage.content
    );
  }
}


/* =========================================================
   CARREGAR CONFIGURAÇÕES
   ========================================================= */

function loadSettingsIntoUI() {

  const nameInput =
    $("nameSetting");

  const rateInput =
    $("rateSetting");

  const pitchInput =
    $("pitchSetting");


  if (nameInput) {

    nameInput.value =
      state.settings.name ||
      "Lumi";
  }


  if (rateInput) {

    rateInput.value =
      state.settings.rate ||
      CONFIG.voiceRate;
  }


  if (pitchInput) {

    pitchInput.value =
      state.settings.pitch ||
      CONFIG.voicePitch;
  }
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function initLumi() {

  console.log(
    "Lumi iniciando. Worker:",
    CONFIG.AI_ENDPOINT
  );


  setupEvents();

  loadConversationIntoUI();

  loadSettingsIntoUI();

  setupRecognition();

  setEmotion(
    "normal"
  );


  checkBackend();
}


/* =========================================================
   INICIAR QUANDO A PÁGINA ESTIVER PRONTA
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initLumi
  );

} else {

  initLumi();
}
