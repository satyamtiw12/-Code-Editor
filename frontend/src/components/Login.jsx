import { useState } from "react";
import "../App.css";

const Login = ({ onJoin }) => {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");

  const handleJoin = () => {
    if (roomId.trim() && userName.trim()) {
      onJoin({ roomId, userName });
    }
  };

  return (
    <div className="join-container">
      <div className="join-form">
        {/* <div className="join-logo">{"</>"}</div>
        <h1>SatyamIDE</h1> */}
        <img 
         src="https://erp.mmumullana.org/assets/assets1/images/logo.webp" 
          alt="MMU Logo" 
           style={{ width: "180px", marginBottom: "0.5rem" }}
           />
            <h1>SatyamIDE</h1>
        <p className="join-sub">Real-time collaborative editor</p>
        <input
          type="text"
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Your Name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <button onClick={handleJoin}>Join Room</button>
        <p className="join-hint">
          New room? Just enter any Room ID to create one.
        </p>
      </div>
    </div>
  );
};

export default Login;