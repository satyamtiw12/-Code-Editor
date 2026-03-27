import { useState } from "react";
import Login from "./components/Login";
import Editor from "./components/Editor";

const App = () => {
  const [user, setUser] = useState(null);

  return user ? (
    <Editor user={user} onLeave={() => setUser(null)} />
  ) : (
    <Login onJoin={setUser} />
  );
};

export default App;