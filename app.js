const CONFIG = {
  AI_ENDPOINT: "https://lumi.ghostwolffnaf.workers.dev",
  characterName: "Lumi",
  language: "pt-BR",
  voiceRate: 1.05,
  voicePitch: 1.25
};


// ============================================================
// IMAGENS DA LUMI
// ============================================================

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


// ============================================================
// NOMES DAS EMOÇÕES
// ============================================================

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


// ============================================================
// ATALHO PARA ELEMENTOS
// ============================================================

const $ = id => document.getElementById(id);


// ============================================================
// ESTADO
// ============================================================

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


// ============================================================
// EMOÇÕES
// ============================================================

function setEmotion(emotion) {

  if (!AVATARS[emotion]) {
    emotion = "normal";
  }

  state.emotion = emotion;

  const character = $("character");
  const avatarImage = $("avatarImage");
  const stateBadge = $("stateBadge");

  if (character) {
    character.className =
      "emotion-" + emotion;
  }

  if (avatarImage) {
    avatarImage.src =
      AVATARS[emotion];

    avatarImage.alt =
      "Lumi - " + LABELS[emotion];
  }

  if (stateBadge) {
    stateBadge.textContent =
      LABELS[emotion];
  }

}


// ============================================================
// BALÃO
// ============================================================

function showSpeech(text) {

  const bubble =
    $("speechBubble");

  if (!bubble) return;

  bubble.textContent =
    String(text || "");

  bubble.classList.remove(
    "speech-hidden"
  );

}


// ============================================================
// CHAT
// ============================================================

function addMessage(role, text) {

  const messages =
    $("messages");

  if (!messages) return;

  const div =
    document.createElement("div");

  div.className =
    "msg " +
    (
      role === "user"
        ? "user"
        : "ai"
    );

  div.textContent =
    String(text || "");

  messages.appendChild(div);

  messages.scrollTop =
    messages.scrollHeight;

}


// ============================================================
// SALVAR CONVERSA
// ============================================================

function save() {

  try {

    localStorage.setItem(
      "lumiConversation",
      JSON.stringify(
        state.conversation.slice(-30)
      )
    );

  } catch (error) {

    console.error(
      "Não foi possível salvar a conversa:",
      error
    );

  }

}


// ============================================================
// VERIFICAR CONFIGURAÇÃO
// ============================================================

function configured() {

  return (
    /^https?:\/\//i.test(
      CONFIG.AI_ENDPOINT
    ) &&
    !CONFIG.AI_ENDPOINT.includes(
      "COLE_AQUI"
    )
  );

}


// ============================================================
// STATUS DO BACKEND
// ============================================================

function setConnectionStatus(
  text,
  className
) {

  const status =
    $("connectionStatus");

  if (!status) return;

  status.textContent =
    text;

  status.className =
    className || "";

}


// ============================================================
// TESTAR BACKEND
// ============================================================

async function checkBackend() {

  if (!configured()) {

    setConnectionStatus(
      "● configure o Worker",
      "offline"
    );

    return;

  }


  setConnectionStatus(
    "● verificando",
    ""
  );


  try {

    const response =
      await fetch(
        CONFIG.AI_ENDPOINT,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    let data = null;


    try {

      data =
        await response.json();

    } catch {

      data = null;

    }


    console.log(
      "Teste do Worker:",
      response.status,
      data
    );


    if (
      response.ok &&
      data &&
      data.ok
    ) {

      setConnectionStatus(
        "● backend online",
        "online"
      );

    } else {

      setConnectionStatus(
        "● backend com erro",
        "offline"
      );

    }

  } catch (error) {

    console.error(
      "Erro ao verificar backend:",
      error
    );

    setConnectionStatus(
      "● backend offline",
      "offline"
    );

  }

}


// ============================================================
// ENVIAR PARA A IA
// ============================================================

async function ask(text) {

  if (!configured()) {

    return {

      message:
        "Ainda estou no modo de teste. Configure o Worker.",

      emotion:
        "thinking"

    };

  }


  console.log(
    "Lumi enviando mensagem para:",
    CONFIG.AI_ENDPOINT
  );


  let response;


  // ----------------------------------------------------------
  // CONEXÃO
  // ----------------------------------------------------------

  try {

    response =
      await fetch(
        CONFIG.AI_ENDPOINT,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              message:
                text,

              conversation:
                state.conversation
                  .slice(-16)

            }),

            cache: "no-store"

        }
      );

  } catch (error) {

    console.error(
      "FALHA DE CONEXÃO COM O WORKER:",
      error
    );

    throw new Error(
      "Não foi possível conectar ao Worker. " +
      (
        error.message ||
        "Verifique sua internet."
      )
    );

  }


  // ----------------------------------------------------------
  // LER RESPOSTA
  // ----------------------------------------------------------

  let data = {};


  try {

    data =
      await response.json();

  } catch (error) {

    console.error(
      "O Worker não retornou JSON:",
      error
    );

    throw new Error(
      "O Worker retornou uma resposta inválida. HTTP " +
      response.status
    );

  }


  console.log(
    "Resposta completa do Worker:",
    response.status,
    data
  );


  // ----------------------------------------------------------
  // ERRO HTTP
  // ----------------------------------------------------------

  if (!response.ok) {

    let errorMessage =
      "";


    if (
      data &&
      typeof data.error === "string"
    ) {

      errorMessage =
        data.error;

    }


    if (
      !errorMessage &&
      data &&
      typeof data.message === "string"
    ) {

      errorMessage =
        data.message;

    }


    if (
      !errorMessage &&
      data &&
      data.details
    ) {

      if (
        typeof data.details === "string"
      ) {

        errorMessage =
          data.details;

      } else {

        try {

          errorMessage =
            JSON.stringify(
              data.details
            );

        } catch {

          errorMessage =
            "Detalhes do erro não disponíveis.";

        }

      }

    }


    if (!errorMessage) {

      errorMessage =
        "HTTP " +
        response.status;

    }


    console.error(
      "ERRO DEVOLVIDO PELO WORKER:",
      errorMessage
    );


    throw new Error(
      errorMessage
    );

  }


  // ----------------------------------------------------------
  // VALIDAR RESPOSTA
  // ----------------------------------------------------------

  if (
    !data ||
    typeof data.response !== "string" ||
    !data.response.trim()
  ) {

    console.error(
      "Resposta inválida recebida:",
      data
    );

    throw new Error(
      "O Worker respondeu, mas não enviou a resposta da Lumi."
    );

  }


  // ----------------------------------------------------------
  // RETORNO
  // ----------------------------------------------------------

  return {

    message:
      data.response,

    emotion:
      data.emotion || "normal"

  };

}


// ============================================================
// ENVIAR MENSAGEM
// ============================================================

async function sendMessage(text) {

  text =
    String(text || "").trim();


  if (!text) return;


  // ----------------------------------------------------------
  // MENSAGEM DO USUÁRIO
  // ----------------------------------------------------------

  addMessage(
    "user",
    text
  );


  state.conversation.push({

    role: "user",

    content: text

  });


  save();


  // ----------------------------------------------------------
  // LIMPAR INPUT
  // ----------------------------------------------------------

  const input =
    $("messageInput");

  if (input) {

    input.value =
      "";

  }


  // ----------------------------------------------------------
  // INDICADOR
  // ----------------------------------------------------------

  const typing =
    $("typing");

  if (typing) {

    typing.hidden =
      false;

  }


  // ----------------------------------------------------------
  // LUMI PENSANDO
  // ----------------------------------------------------------

  setEmotion(
    "thinking"
  );


  showSpeech(
    "Hmm... deixa eu pensar..."
  );


  // ----------------------------------------------------------
  // CHAMAR IA
  // ----------------------------------------------------------

  try {

    const data =
      await ask(text);


    state.lastResponse =
      data.message;


    // --------------------------------------------------------
    // MOSTRAR RESPOSTA
    // --------------------------------------------------------

    addMessage(
      "assistant",
      data.message
    );


    // --------------------------------------------------------
    // SALVAR RESPOSTA
    // --------------------------------------------------------

    state.conversation.push({

      role:
        "assistant",

      content:
        data.message

    });


    save();


    // --------------------------------------------------------
    // BALÃO
    // --------------------------------------------------------

    showSpeech(
      data.message
    );


    // --------------------------------------------------------
    // EMOÇÃO
    // --------------------------------------------------------

    setEmotion(
      data.emotion
    );


    // --------------------------------------------------------
    // VOZ
    // --------------------------------------------------------

    speak(
      data.message
    );


  } catch (error) {

    console.error(
      "ERRO AO CONVERSAR COM LUMI:",
      error
    );


    const errorMessage =
      error &&
      error.message
        ? error.message
        : "Erro desconhecido.";


    // --------------------------------------------------------
    // MOSTRAR ERRO REAL
    // --------------------------------------------------------

    showSpeech(
      "Erro: " +
      errorMessage
    );


    setEmotion(
      "sad"
    );

  } finally {

    if (typing) {

      typing.hidden =
        true;

    }

  }

}


// ============================================================
// VOZ DA LUMI
// ============================================================

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


  setEmotion(
    "speaking"
  );


  utterance.onend =
    () => {

      if (
        state.emotion ===
        "speaking"
      ) {

        setEmotion(
          "normal"
        );

      }

    };


  utterance.onerror =
    event => {

      console.error(
        "Erro na voz da Lumi:",
        event
      );

      setEmotion(
        "normal"
      );

    };


  speechSynthesis.speak(
    utterance
  );

}


// ============================================================
// RECONHECIMENTO DE VOZ
// ============================================================

function setupRecognition() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if (!SpeechRecognition) {

    console.warn(
      "Reconhecimento de voz não suportado neste navegador."
    );


    const micBtn =
      $("micBtn");

    const talkBtn =
      $("talkBtn");


    if (micBtn) {
      micBtn.disabled =
        true;
    }


    if (talkBtn) {
      talkBtn.disabled =
        true;
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

      state.recognizing =
        true;


      setEmotion(
        "listening"
      );


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


      const input =
        $("messageInput");


      if (input) {

        input.value =
          text;

      }


      sendMessage(
        text
      );

    };


  state.recognition.onerror =
    event => {

      console.error(
        "Erro no reconhecimento de voz:",
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


// ============================================================
// MICROFONE
// ============================================================

function listen() {

  if (
    !state.recognition
  ) {

    showSpeech(
      "O reconhecimento de voz não está disponível neste navegador."
    );

    return;

  }


  if (
    state.recognizing
  ) {

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


// ============================================================
// TESTE DE EMOÇÕES
// ============================================================

function test() {

  const emotions =
    Object.keys(
      AVATARS
    );


  let index =
    0;


  const timer =
    setInterval(
      () => {

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

      },
      600
    );

}


// ============================================================
// EVENTOS
// ============================================================

const sendBtn =
  $("sendBtn");


if (sendBtn) {

  sendBtn.onclick =
    () => {

      sendMessage(
        $("messageInput").value
      );

    };

}


const messageInput =
  $("messageInput");


if (messageInput) {

  messageInput.onkeydown =
    event => {

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


const micBtn =
  $("micBtn");


if (micBtn) {

  micBtn.onclick =
    listen;

}


const talkBtn =
  $("talkBtn");


if (talkBtn) {

  talkBtn.onclick =
    listen;

}


const testBtn =
  $("testBtn");


if (testBtn) {

  testBtn.onclick =
    test;

}


const moveBtn =
  $("moveBtn");


if (moveBtn) {

  moveBtn.onclick =
    () => {

      const character =
        $("character");


      if (!character) return;


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
          duration:
            1000
        }

      );

    };

}


const repeatBtn =
  $("repeatBtn");


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


// ============================================================
// CONFIGURAÇÕES
// ============================================================

const settingsBtn =
  $("settingsBtn");


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


const closeSettingsBtn =
  $("closeSettingsBtn");


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


const saveSettingsBtn =
  $("saveSettingsBtn");


if (saveSettingsBtn) {

  saveSettingsBtn.onclick =
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


      const panel =
        $("settingsPanel");


      if (panel) {

        panel.classList.add(
          "hidden"
        );

      }

    };

}


// ============================================================
// INICIALIZAÇÃO DA CONVERSA
// ============================================================

if (
  !state.conversation.length
) {

  const welcome =
    "Oi! Eu sou a Lumi. Agora posso conversar com você usando minha IA. ♡";


  state.conversation.push({

    role:
      "assistant",

    content:
      welcome

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
    .forEach(
      message => {

        addMessage(
          message.role,
          message.content
        );

      }
    );

}


// ============================================================
// INICIALIZAR VOZ
// ============================================================

setupRecognition();


// ============================================================
// INICIA
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
