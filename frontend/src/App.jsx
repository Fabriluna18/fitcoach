import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Panel from './pages/Panel';
import Clientes from './pages/Clientes';
import Grupos from './pages/Grupos';
import Layout from './components/Layout';
import Ejercicios from './pages/Ejercicios';
import Rutinas from './pages/Rutinas';
import MisRutinas from './pages/MisRutinas';
import MiProgreso from './pages/MiProgreso';
import ProgresoCliente from './pages/ProgresoCliente';
import Pagos from './pages/Pagos';
import Proximamente from './pages/Proximamente';
import Ajustes from './pages/Ajustes';
import Calendario from './pages/Calendario';
import MisCitas from './pages/MisCitas';

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
          <Route path="/mis-rutinas" element={<MisRutinas />} />
          <Route path="/mi-progreso" element={<MiProgreso />} />
          <Route path="/clientes/:id/progreso" element={<ProgresoCliente />} />
          <Route path="/pagos" element={<Pagos />} />
          <Route path="/progreso" element={<Proximamente titulo="Progreso" dia={18} />} />
          <Route path="/mensajes" element={<Proximamente titulo="Mensajes" dia={17} />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/mis-citas" element={<MisCitas />} />
          <Route path="/ajustes" element={<Ajustes />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}