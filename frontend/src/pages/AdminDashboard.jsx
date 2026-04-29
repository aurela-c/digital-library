import { useEffect, useState } from "react";
import axios from "axios";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:4500/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => setUsers(res.data));
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>

      {users.map((u) => (
        <div key={u.id}>
          <p>{u.username}</p>
          <p>{u.email}</p>
          <p>{u.role}</p>
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;