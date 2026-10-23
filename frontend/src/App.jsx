import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Panel from './pages/Panel';
import Clientes from './pages/Clientes';
import Grupos from './pages/Grupos';
import Layout from './components/Layout';
import Ejercicios from './pages/Ejercicios';
import Rutinas from './pages/Rutinas';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<Layout />}>
          <Route path="/panel" element={<Panel />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/grupos" element={<Grupos />} />
          <Route path="/ejercicios" element={<Ejercicios />} />
          <Route path="/rutinas" element={<Rutinas />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}