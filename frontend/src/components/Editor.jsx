import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import MonacoEditor from "@monaco-editor/react";
import Sidebar from "./Sidebar";
import Chat from "./Chat";
import "../App.css";

const socket = io("http://localhost:5000");

const Editor = ({ user, onLeave }) => {
  const { roomId, userName } = user;
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start coding here\n");
  const [output, setOutput] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showOutput, setShowOutput] = useState(true);
  const [outputHeight, setOutputHeight] = useState(150);
  const isDragging = useRef(false);

  const localStream = useRef(null);
  const peerConnections = useRef({});

  const createPeerConnection = (id) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { candidate: e.candidate, to: id });
    };
    pc.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.play();
    };
    peerConnections.current[id] = pc;
    return pc;
  };

  useEffect(() => {
    socket.emit("join", { roomId, userName });

    socket.on("userJoined", (u) => setUsers(u));
    socket.on("codeUpdate", (c) => setCode(c));
    socket.on("languageUpdate", (l) => setLanguage(l));
    socket.on("outputUpdate", (o) => setOutput(o));
    socket.on("userTyping", (u) => {
      setTyping(`${u.slice(0, 10)}... is typing`);
      setTimeout(() => setTyping(""), 2000);
    });
    socket.on("chatMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpen) setUnread((p) => p + 1);
    });
    socket.on("voice-offer", async ({ offer, from }) => {
      const pc = createPeerConnection(from);
      if (localStream.current)
        localStream.current.getTracks().forEach((t) => pc.addTrack(t, localStream.current));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voice-answer", { answer, to: from });
    });
    socket.on("voice-answer", async ({ answer, from }) => {
      const pc = peerConnections.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });
    socket.on("ice-candidate", async ({ candidate, from }) => {
      const pc = peerConnections.current[from];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.emit("leaveRoom");
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("languageUpdate");
      socket.off("outputUpdate");
      socket.off("userTyping");
      socket.off("chatMessage");
      socket.off("voice-offer");
      socket.off("voice-answer");
      socket.off("ice-candidate");
    };
  }, []);

  const handleCodeChange = (val) => {
    setCode(val);
    socket.emit("codeChange", { roomId, code: val });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    socket.emit("languageChange", { roomId, language: lang });
  };

  // const runCode = async () => {
  //   setOutput("Running...");
  //   try {
  //     const res = await fetch("http://localhost:5000/run", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ code, language }),
  //     });
  //     const data = await res.json();
  //     setOutput(data.output);
  //     socket.emit("outputChange", { roomId, output: data.output });
  //   } catch {
  //     setOutput("Error running code");
  //   }
  // };







       //not api
  // const runCode = async () => {
  //   setOutput("Running...");
  //   setShowOutput(true);
  //   try {
  //     const res = await fetch("http://localhost:5000/run", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ code, language }),
  //     });
  //     const data = await res.json();
  //     setOutput(data.output);
  //     socket.emit("outputChange", { roomId, output: data.output });
  //   } catch {
  //     setOutput("Error running code");
  //   }
  // };




  


    // this is api 
    const runCode = async () => {
    setOutput("Running...");
    setShowOutput(true);

    const languageMap = {
      javascript: { language: "javascript", version: "18.15.0" },
      java: { language: "java", version: "15.0.2" },
      python: { language: "python", version: "3.10.0" },
      cpp: { language: "c++", version: "10.2.0" },
      c: { language: "c", version: "10.2.0" },
    };

    const lang = languageMap[language];
    if (!lang) {
      setOutput("Language not supported");
      return;
    }

    try {
      const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang.language,
          version: lang.version,
          files: [{ name: "main", content: code }],
        }),
      });

      const data = await res.json();
      const output =
        data.run?.stdout ||
        data.run?.stderr ||
        data.compile?.stderr ||
        "No output";

      setOutput(output);
      socket.emit("outputChange", { roomId, output });

    } catch (err) {
      setOutput("Error: " + err.message);
    }
  };

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;
      setMicOn(true);
      users.forEach(async (u) => {
        if (u === userName) return;
        const pc = createPeerConnection(socket.id + u);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("voice-offer", { roomId, offer, to: u });
      });
    } catch {
      alert("Mic access nahi mila!");
    }
  };

  const stopVoice = () => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setMicOn(false);
  };

  const sendMessage = (msg) => {
    socket.emit("chatMessage", { roomId, userName, message: msg });
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    stopVoice();
    onLeave();
  };

  const startDrag = (e) => {
    isDragging.current = true;
    const startY = e.clientY;
    const startHeight = outputHeight;
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const diff = startY - e.clientY;
      const newHeight = Math.min(Math.max(startHeight + diff, 80), 500);
      setOutputHeight(newHeight);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };


  return (
    <div className="editor-container">
      <Sidebar
        roomId={roomId}
        users={users}
        typing={typing}
        language={language}
        micOn={micOn}
        chatOpen={chatOpen}
        unread={unread}
        onLanguageChange={handleLanguageChange}
        onMicToggle={micOn ? stopVoice : startVoice}
        onRun={runCode}
        onLeave={leaveRoom}
        onChatToggle={() => {
          setChatOpen((p) => !p);
          setUnread(0);
        }}
      />

  <div className="editor-wrapper">
        <MonacoEditor
          height={showOutput ? `calc(100vh - ${outputHeight}px)` : "100vh"}
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{ fontSize: 14, minimap: { enabled: false } }}
        />
        {showOutput && (
          <div className="output-container" style={{ height: `${outputHeight}px` }}>
            <div className="drag-handle" onMouseDown={startDrag}></div>
            <div className="output-header">
              <h3>Output:</h3>
              <div className="output-btns">
                <button 
                  onClick={() => setOutputHeight(h => Math.min(h + 50, 400))}
                  title="Increase"
                >▲</button>
                <button 
                  onClick={() => setOutputHeight(h => Math.max(h - 50, 80))}
                  title="Decrease"
                >▼</button>
                <button onClick={() => setOutput("")}>🗑 Clear</button>
                <button onClick={() => setShowOutput(false)}>✕ Close</button>
              </div>
            </div>
            <pre>{output}</pre>
          </div>
        )}
      </div>

      {chatOpen && (
        <Chat
          messages={messages}
          userName={userName}
          onSend={sendMessage}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
};

export default Editor;