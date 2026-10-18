import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(location.state?.expired ? 'Tu sesión expiró, inicia sesión nuevamente' : '');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e = {};
    if (!email.trim()) e.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = 'Ingresa un correo electrónico válido';
    if (!password) e.password = 'La contraseña es obligatoria';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18 }}>
          <img src="/favicon.svg" alt="" width="32" height="32" /> SMarDevs
        </div>
        <div>
          <h2>Controla tu inventario y tus ventas en un solo lugar</h2>
          <p>Gestiona productos, bodegas, compras a proveedores y facturación a clientes con información en tiempo real.</p>
        </div>
        <small style={{ color: '#8fa0c4' }}>© {new Date().getFullYear()} SMarDevs · v1.4.2</small>
      </div>
      <div className="login-form-wrap">
        <div className="login-card">
          <img className="logo" src="/img/logo-smardevs.png" alt="SMarDevs" />
          <h1>Iniciar sesión</h1>
          <p className="sub">Ingresa tus credenciales para continuar</p>
          {error && <div className="alert alert-error" data-testid="login-error">{error}</div>}
          <form onSubmit={e => e.preventDefault()} noValidate>
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" maxLength={100} value={email} onChange={e => setEmail(e.target.value)}
                className={errors.email ? 'invalid' : ''} placeholder="usuario@smardevs.com" data-testid="login-email" />
              {errors.email && <div className="err">{errors.email}</div>}
            </div>
            <div className="field" style={{ marginBottom: 20 }}>
              <label htmlFor="password">Contraseña</label>
              <div className="pw-wrap">
                <input id="password" type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className={errors.password ? 'invalid' : ''} placeholder="••••••••" data-testid="login-password" />
                <button type="button" onClick={() => setShow(s => !s)} data-testid="toggle-password">{show ? 'Ocultar' : 'Mostrar'}</button>
              </div>
              {errors.password && <div className="err">{errors.password}</div>}
            </div>
            <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={submit} disabled={loading} data-testid="login-submit">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
