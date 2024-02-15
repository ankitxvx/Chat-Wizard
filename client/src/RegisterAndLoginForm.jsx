import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext.jsx";

export default function RegisterAndLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("login");
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);
  async function handleSubmit(ev) {
    ev.preventDefault();
    const url = isLoginOrRegister === "register" ? "register" : "login";
    const { data } = await axios.post(url, { username, password });
    setLoggedInUsername(username);
    setId(data.id);
  }
  return (
    <div className="bg-blue-50 h-screen flex flex-col items-center">
      <div className="bg-blue-100 mt-10 rounded-xl p-5 overflow-hidden">
        <h1 className=" text-3xl">Welcome to Chat Wizard App</h1>
        <h2 className="text-xl text-center mt-3">Lets connect</h2>
      </div>
      <div className="bg-red-100 rounded-xl mt-10">
        <form className="w-64 m-10 mb-12" onSubmit={handleSubmit}>
          <input
            value={username}
            onChange={(ev) => setUsername(ev.target.value)}
            type="text"
            placeholder="username"
            className="block w-full rounded-sm p-2 mb-2 border"
          />
          <input
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            type="password"
            placeholder="password"
            className="block w-full rounded-sm p-2 mb-2 border"
          />
          <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
            {isLoginOrRegister === "register" ? "Register" : "Login"}
          </button>
          <div className="text-center mt-2">
            {isLoginOrRegister === "register" && (
              <div>
                Already a member?
                <button
                  className="ml-1"
                  onClick={() => setIsLoginOrRegister("login")}
                >
                  Login here
                </button>
              </div>
            )}
            {isLoginOrRegister === "login" && (
              <div>
                Dont have an account?
                <button
                  className="ml-1"
                  onClick={() => setIsLoginOrRegister("register")}
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
