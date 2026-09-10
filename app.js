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

const $ = id => document.getElementById(id);

const state = {
  emotion: "normal",
  lastResponse: "",
  recognition: null,
  recognizing: false,
  conversation: JSON.parse(
    localStorage.getItem("lumiConversation") || "[]"
  ),
  settings: JSON.parse(
    localStorage.getItem("lumiSettings") || "{}"
  )
};


// ===============================
// EMOÇÕES
// ===============================

function setEmotion(emotion) {
  emotion = AVATARS[emotion] ? emotion : "normal";

  state.emotion = emotion;

  $("character").className = "emotion-" + emotion;
  $("avatarImage").src = AVATARS[emotion];
  $("stateBadge").textContent = LABELS[emotion];
}


// ===============================
// BALÃO DE FALA
// ===============================

function showSpeech(text) {
  $("speechBubble").textContent = text;
  $("speechBubble").classList.remove("speech-hidden");
}


// ===============================
// CHAT
// ===============================

function addMessage(role, text) {
  const div = document.createElement("div");

  div.className =
    "msg " + (role === "user" ? "user" : "ai");

  div.textContent = text;

  $("messages").appendChild(div);

  $("messages").scrollTop =
    $("messages").scrollHeight;
}


// ===============================
// SALVAR CONVERSA
// ===============================

function save() {
  localStorage.setItem(
    "lumiConversation",
    JSON.stringify(
      state.conversation.slice(-30)
    )
  );
}


// ===============================
// VERIFICAR CONFIGURAÇÃO
// ===============================

function configured() {
  return (
    /^https?:\/\//i.test(CONFIG.AI_ENDPOINT) &&
    !CONFIG.AI_ENDPOINT.includes("COLE_AQUI")
  );
}


// ===============================
// TESTAR BACKEND
// ===============================

async function checkBackend() {

  if (!configured()) {

    $("connectionStatus").textContent =
      "● configure o Worker";

    $("connectionStatus").className =
      "offline";

    return;
  }

  try {

    const response =
      await fetch(CONFIG.AI_ENDPOINT);

    const data =
      await response.json();

    if (data.ok) {

      $("connectionStatus").textContent =
        "● backend online";

      $("connectionStatus").className =
        "online";

    } else {

      $("connectionStatus").textContent =
        "● backend";

      $("connectionStatus").className =
        "offline";
    }

  } catch (error) {

    console.error(
      "Erro ao verificar backend:",
      error
    );

    $("connectionStatus").textContent =
      "● backend offline";

    $("connectionStatus").className =
      "offline";
  }
}


// ===============================
// ENVIAR PARA A IA
// ===============================

async function ask(text) {

  if (!configured()) {

    return {
      message:
        "Ainda estou no modo de teste. Coloque a URL do Cloudflare Worker no CONFIG.AI_ENDPOINT do app.js. ♡",
      emotion: "thinking"
    };
  }


  const response = await fetch(
    CONFIG.AI_ENDPOINT,
    {
      method: "POST",

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


  if (!response.ok) {

    let errorText = "";

    try {
      errorText =
        await response.text();
    } catch {}

    console.error(
      "Erro do Worker:",
      response.status,
      errorText
    );

    throw new Error(
      "HTTP " + response.status
    );
  }


  const data =
    await response.json();


  /*
    O Worker da Lumi retorna:

    {
      "response": "...",
      "emotion": "happy"
    }

    Portanto usamos data.response,
    e não data.message.
  */

  if (
    !data ||
    typeof data.response !== "string" ||
    !data.response.trim()
  ) {

    console.error(
      "Resposta recebida:",
      data
    );

    throw new Error(
      "Resposta inválida do backend"
    );
  }


  return {

    message: data.response,

    emotion:
      data.emotion || "normal"

  };
}


// ===============================
// ENVIAR MENSAGEM
// ===============================

async function sendMessage(text) {

  text = String(text || "").trim();

  if (!text) return;


  // Mostra mensagem do usuário
  addMessage("user", text);


  // Salva conversa
  state.conversation.push({
    role: "user",
    content: text
  });

  save();


  // Limpa campo
  $("messageInput").value = "";


  // Mostra indicador
  $("typing").hidden = false;


  // Lumi pensando
  setEmotion("thinking");


  try {

    const data =
      await ask(text);


    state.lastResponse =
      data.message;


    // Mostra resposta
    addMessage(
      "assistant",
      data.message
    );


    // Salva resposta
    state.conversation.push({
      role: "assistant",
      content: data.message
    });

    save();


    // Balão
    showSpeech(
      data.message
    );


    // Emoção enviada pela IA
    setEmotion(
      data.emotion
    );


    // Voz
    speak(
      data.message
    );


  } catch (error) {

    console.error(
      "Erro ao conversar com Lumi:",
      error
    );


    showSpeech(
      "Não consegui falar com meu backend. Confira a conexão do Worker."
    );


    setEmotion("sad");

  } finally {

    $("typing").hidden = true;

  }
}


// ===============================
// VOZ DA LUMI
// ===============================

function speak(text) {

  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }


  speechSynthesis.cancel();


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


  setEmotion("speaking");


  utterance.onend = () => {

    if (
      state.emotion === "speaking"
    ) {

      setEmotion(
        state.lastResponse
          ? "normal"
          : "normal"
      );
    }
  };


  speechSynthesis.speak(
    utterance
  );
}


// ===============================
// RECONHECIMENTO DE VOZ
// ===============================

function setupRecognition() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if (!SpeechRecognition) {

    $("micBtn").disabled = true;
    $("talkBtn").disabled = true;

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

      setEmotion("listening");

      showSpeech(
        "Estou ouvindo..."
      );
    };


  state.recognition.onresult =
    event => {

      const text =
        event
          .results[0][0]
          .transcript;


      $("messageInput").value =
        text;


      sendMessage(text);
    };


  state.recognition.onerror =
    event => {

      console.error(
        "Erro no reconhecimento de voz:",
        event.error
      );

      state.recognizing = false;

      setEmotion("normal");
    };


  state.recognition.onend =
    () => {

      state.recognizing = false;

      if (
        state.emotion ===
        "listening"
      ) {

        setEmotion("normal");
      }
    };
}


// ===============================
// MICROFONE
// ===============================

function listen() {

  if (!state.recognition) {
    return;
  }


  if (state.recognizing) {

    state.recognition.stop();

  } else {

    try {

      state.recognition.start();

    } catch (error) {

      console.error(
        "Não foi possível iniciar o microfone:",
        error
      );
    }
  }
}


// ===============================
// TESTE DE EMOÇÕES
// ===============================

function test() {

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

        clearInterval(timer);
      }

    }, 600);
}


// ===============================
// EVENTOS
// ===============================

$("sendBtn").onclick =
  () => {

    sendMessage(
      $("messageInput").value
    );

  };


$("messageInput").onkeydown =
  event => {

    if (event.key === "Enter") {

      event.preventDefault();

      sendMessage(
        event.target.value
      );
    }
  };


$("micBtn").onclick =
  listen;


$("talkBtn").onclick =
  listen;


$("testBtn").onclick =
  test;


$("moveBtn").onclick =
  () => {

    $("character").animate(

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


$("repeatBtn").onclick =
  () => {

    if (
      state.lastResponse
    ) {

      speak(
        state.lastResponse
      );
    }
  };


// ===============================
// CONFIGURAÇÕES
// ===============================

$("settingsBtn").onclick =
  () => {

    $("settingsPanel")
      .classList
      .remove("hidden");
  };


$("closeSettingsBtn").onclick =
  () => {

    $("settingsPanel")
      .classList
      .add("hidden");
  };


$("saveSettingsBtn").onclick =
  () => {

    state.settings = {

      name:
        $("nameSetting").value ||
        "Lumi",

      rate:
        Number(
          $("rateSetting").value
        ),

      pitch:
        Number(
          $("pitchSetting").value
        )
    };


    localStorage.setItem(
      "lumiSettings",
      JSON.stringify(
        state.settings
      )
    );


    $("settingsPanel")
      .classList
      .add("hidden");
  };


// ===============================
// INICIALIZAÇÃO
// ===============================

if (
  !state.conversation.length
) {

  const welcome =
    "Oi! Eu sou a Lumi. Agora posso conversar com você usando minha IA. ♡";


  state.conversation.push({

    role: "assistant",

    content: welcome

  });


  addMessage(
    "assistant",
    welcome
  );


  showSpeech(
    welcome
  );

} else {

  state.conversation
    .slice(-20)
    .forEach(message => {

      addMessage(
        message.role,
        message.content
      );

    });
}


// Inicializa voz
setupRecognition();


// Inicializa personagem
setEmotion("normal");


// Verifica Worker
checkBackend();
