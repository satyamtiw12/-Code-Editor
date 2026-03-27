import { useState } from "react";

const Sidebar = ({
  roomId, users, typing, language, micOn,
  chatOpen, unread, onLanguageChange, onMicToggle,
  onRun, onLeave, onChatToggle,
}) => {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="logo">{"</>"}</span>
        <span className="sidebar-title">Satyam Code Editor</span>
      </div>

      <div className="room-section">
        <p className="section-label">Room</p>
        <div className="room-id-row">
          <span className="room-id">{roomId}</span>
          <button className="icon-btn" onClick={copyId}>
            {copied ? "✓" : "⎘"}
          </button>
        </div>
      </div>

      <div className="users-section">
        <p className="section-label">Users ({users.length})</p>
        {/* {users.map((u, i) => (
          <div className="user-item" key={i}>
            <span className="user-dot"></span>
            <span className="user-name">{u}</span>
          </div>
        ))} */}


        {users.map((u) => (
  <div className="user-item" key={u.id || u}>
    <span className="user-dot"></span>
    <span className="user-name">{u.name || u}</span>
  </div>
))}   


        {typing && <p className="typing-text">{typing}</p>}
      </div>

      <div className="controls-section">
        <p className="section-label">Language</p>
        <select
          className="lang-select"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
        >
          <option value="javascript">JavaScript</option>
          <option value="java">Java</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
        </select>
      </div>

      <div className="btn-section">
        <button
          className={`sidebar-btn mic-btn ${micOn ? "active" : ""}`}
          onClick={onMicToggle}
        >
          {/* {micOn ? "🔴 Mic Off" : "🎤 Mic On"} */}
          {micOn ? " Mic Off" : " Mic On"}
        </button>

        <button className="sidebar-btn chat-btn" onClick={onChatToggle}>
          {/* 💬 Chat {unread > 0 && <span className="badge">{unread}</span>} */}
                    💬 Chat {unread > 0 && <span className="badge">{unread}</span>}

        </button>

        <button className="sidebar-btn run-btn" onClick={onRun}>
          ▶ Run Code
        </button>

        <button className="sidebar-btn leave-btn" onClick={onLeave}>
          ⬅ Leave
        </button>
      </div>
    </div>
  );
};

export default Sidebar;