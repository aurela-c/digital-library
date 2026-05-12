import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseURL } from "../config/apiBase.js";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const base = getApiBaseURL();
    axios
      .get(`${base}/users`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      })
      .then((res) => setUsers(res.data))
      .catch((err) => {
        setError(err.response?.data?.error || err.message);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#f5efe9] w-full overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#D34F4E] mb-2">
          Admin Dashboard
        </h1>
        <p className="text-sm text-gray-600 mb-6 sm:mb-8">
          Registered users (from user service).
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm p-3">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 sm:px-4 py-3">User</th>
                <th className="px-3 sm:px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="px-3 sm:px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/80">
                  <td className="px-3 sm:px-4 py-3 font-medium text-gray-900 break-words max-w-[140px] sm:max-w-none">
                    {u.username}
                    <div className="sm:hidden text-xs text-gray-500 font-normal mt-0.5">
                      {u.email}
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-gray-600 hidden sm:table-cell break-all">
                    {u.email}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-gray-700 whitespace-nowrap">
                    {u.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !error && (
            <p className="p-6 text-center text-gray-500 text-sm">No users loaded.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
