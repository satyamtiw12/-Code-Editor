import { useState, useRef, useEffect } from "react";

const Chat = ({ messages, userName, onSend, onClose }) => {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span>💬 Chat</span>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.userName === userName ? "own" : ""}`}>
            <span className="msg-user">{m.userName}</span>
            <span className="msg-text">{m.message}</span>
            <span className="msg-time">{m.time}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
};

export default Chat;