import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

const port = process.env.PORT || 5000;
const __dirname = path.resolve();

const rooms = new Map();
const users = new Map();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(express.json());

io.on("connection", (socket) => {
  console.log("user connected", socket.id);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", ({ roomId, userName }) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      if (rooms.get(currentRoom)) {
        rooms.get(currentRoom).delete(currentUser);
        io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
      }
    }
    currentRoom = roomId;
    currentUser = userName;
    socket.join(roomId);
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(userName);
    io.to(roomId).emit("userJoined", Array.from(rooms.get(currentRoom)));
  });

  socket.on("codeChange", ({ roomId, code }) => {
    socket.to(roomId).emit("codeUpdate", code);
  });

  socket.on("languageChange", ({ roomId, language }) => {
    io.to(roomId).emit("languageUpdate", language);
  });

  socket.on("typing", ({ roomId, userName }) => {
    socket.to(roomId).emit("userTyping", userName);
  });

  socket.on("outputChange", ({ roomId, output }) => {
    socket.to(roomId).emit("outputUpdate", output);
  });

  // 💬 Chat
  socket.on("chatMessage", ({ roomId, userName, message }) => {
    io.to(roomId).emit("chatMessage", { userName, message, time: new Date().toLocaleTimeString() });
  });

  // 🎤 Voice
  socket.on("voice-offer", ({ offer, to }) => {
    socket.to(to).emit("voice-offer", { offer, from: socket.id });
  });
  socket.on("voice-answer", ({ answer, to }) => {
    socket.to(to).emit("voice-answer", { answer, from: socket.id });
  });
  socket.on("ice-candidate", ({ candidate, to }) => {
    socket.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("leaveRoom", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom)?.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom) || []));
      socket.leave(currentRoom);
      currentRoom = null;
      currentUser = null;
    }
  });

  socket.on("disconnect", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom)?.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom) || []));
    }
    console.log("user disconnected");
  });
});

// 🔥 Run Code
app.post("/run", (req, res) => {
  const { code, language } = req.body;

  if (language === "javascript") {
    const jsDir = path.join(__dirname, "jsTemp");
    if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir);
    const filePath = path.join(jsDir, "code.js");
    fs.writeFileSync(filePath, code);
    exec(`node "${filePath}"`, { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) return res.json({ output: stderr || err.message });
      if (stderr) return res.json({ output: stderr });
      return res.json({ output: stdout || "Code executed successfully" });
    });

   }  else if (language === "java") {
    const javaDir = path.join(__dirname, "javaTemp");
    if (!fs.existsSync(javaDir)) fs.mkdirSync(javaDir);

    // Purani saari files delete karo
    fs.readdirSync(javaDir).forEach(file => {
      try { fs.unlinkSync(path.join(javaDir, file)); } catch(e) {}
    });

    // main method se pehle closest class dhundho
    const mainIndex = code.indexOf("public static void main");
    let className = "Main";

    if (mainIndex !== -1) {
      const codeBefore = code.substring(0, mainIndex);
      const classMatches = [...codeBefore.matchAll(/class\s+(\w+)/g)];
      if (classMatches.length > 0) {
        className = classMatches[classMatches.length - 1][1];
      }
    }

    // Saari classes alag alag files mein save karo
    const allClassBlocks = [...code.matchAll(/class\s+(\w+)[\s\S]*?(?=\nclass\s|\s*$)/g)];
    
    if (allClassBlocks.length > 1) {
      // Multiple classes — sab alag file mein likho
      const classRegex = /class\s+(\w+)/g;
      let match;
      let positions = [];
      
      while ((match = classRegex.exec(code)) !== null) {
        positions.push({ name: match[1], index: match.index });
      }

      for (let i = 0; i < positions.length; i++) {
        const start = positions[i].index;
        const end = i + 1 < positions.length ? positions[i + 1].index : code.length;
        const classCode = code.substring(start, end).trim();
        fs.writeFileSync(path.join(javaDir, `${positions[i].name}.java`), classCode);
      }

      // Main wali class ko full code ke saath save karo
      fs.writeFileSync(path.join(javaDir, `${className}.java`), code);

    } else {
      fs.writeFileSync(path.join(javaDir, `${className}.java`), code);
    }

    // Compile — poora folder
    exec(`javac "${path.join(javaDir, `${className}.java`)}"`, { timeout: 10000 }, (compileErr, _, compileStderr) => {
      if (compileErr) return res.json({ output: compileStderr || compileErr.message });

      exec(`java -cp "${javaDir}" ${className}`, { timeout: 10000 }, (runErr, stdout, runStderr) => {
        if (runErr) return res.json({ output: runStderr || runErr.message });
        if (runStderr) return res.json({ output: runStderr });
        return res.json({ output: stdout });
      });
    });

  }  else if (language === "python") {
    const pyDir = path.join(__dirname, "pyTemp");
    if (!fs.existsSync(pyDir)) fs.mkdirSync(pyDir);
    const filePath = path.join(pyDir, "code.py");
    fs.writeFileSync(filePath, code);

    // python3 ya python dono try karo
    exec(`python3 "${filePath}"`, { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        exec(`python "${filePath}"`, { timeout: 5000 }, (err2, stdout2, stderr2) => {
          if (err2) return res.json({ output: stderr2 || err2.message });
          if (stderr2) return res.json({ output: stderr2 });
          return res.json({ output: stdout2 });
        });
      } else {
        if (stderr) return res.json({ output: stderr });
        return res.json({ output: stdout });
      }
    });

  }  else if (language === "cpp") {
    const cppDir = path.join(__dirname, "cppTemp");
    if (!fs.existsSync(cppDir)) fs.mkdirSync(cppDir);

    const filePath = path.join(cppDir, "code.cpp");
    const outPath = path.join(cppDir, "code_out");
    fs.writeFileSync(filePath, code);

    // Compile karo
    exec(`g++ "${filePath}" -o "${outPath}"`, { timeout: 10000 }, (compileErr, _, compileStderr) => {
      if (compileErr) return res.json({ output: compileStderr || compileErr.message });

      // Run karo
      exec(`"${outPath}"`, { timeout: 10000 }, (runErr, stdout, runStderr) => {
        if (runErr) return res.json({ output: runStderr || runErr.message });
        if (runStderr) return res.json({ output: runStderr });
        return res.json({ output: stdout });
      });
    });

  } else {
    return res.json({ output: "Language not supported" });
  }
});

const frontendPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

server.listen(port, () => console.log(`Server running on port ${port}`));