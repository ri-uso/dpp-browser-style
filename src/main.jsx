import { createRoot } from 'react-dom/client'
//import './index.css'
import MainRouter from './MainRouter';
import { GoogleOAuthProvider } from '@react-oauth/google';
const clientId = '28880670233-rfbhtbqpefv7mqpdikeevvmgg3mrg7gv.apps.googleusercontent.com';

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={clientId}>
    <MainRouter />
  </GoogleOAuthProvider>
);