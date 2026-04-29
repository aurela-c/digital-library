import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import BookCard from "./pages/BookCard";
import CategoryBooks from "./pages/CategoryBooks";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";




function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/book/:id" element={<BookCard />} />
        <Route path="/categories/:category" element={<CategoryBooks />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}/>
        <Route path="*" element={ 
      <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold">404 - Page Not Found</h1> </div>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;