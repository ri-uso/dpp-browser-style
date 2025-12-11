
import "./styles/style.css";
import "./styles/header.css";
import "./styles/inputForm.css";
import "./styles/scanner.css";
import "./styles/outputForm.css";
import "./styles/compareModal.css";
import "./styles/chatInterface.css";
import "./styles/voiceInterface.css";
import "./styles/productChatModal.css";
import "./styles/fonts.css";

import { createRoot } from 'react-dom/client'

import MainRouter from './MainRouter';
//import { GoogleOAuthProvider } from '@react-oauth/google';
//const clientId = '28880670233-rfbhtbqpefv7mqpdikeevvmgg3mrg7gv.apps.googleusercontent.com';

createRoot(document.getElementById('root')).render(
  <MainRouter />
);