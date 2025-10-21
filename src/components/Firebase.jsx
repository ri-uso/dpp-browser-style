import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCLXLrG5HLCF9zVWjxqL8x2whCPa4f_8RE",
  authDomain: "dpp-browser-328eb.firebaseapp.com",
  projectId: "dpp-browser-328eb",
  storageBucket: "dpp-browser-328eb.firebasestorage.app",
  messagingSenderId: "621635885490",
  appId: "1:621635885490:web:736d7aab3789bc3a0b6cab",
  measurementId: "G-7YT2W5BCNZ"
};

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export { auth, googleProvider, facebookProvider };

/**
 * Funzione comune per il login con qualsiasi provider
 * @param {AuthProvider} provider - es. googleProvider, facebookProvider
 */
const handleLogin = async (provider) => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;

  } catch (error) {
    if (error.code === "auth/account-exists-with-different-credential") {
      alert("It looks like you're already signed in with a different provider. Please continue by logging in with the one you used before.");
      console.error("Login error:", error);
    }
  }
};

export const loginWithGoogle = () => handleLogin(googleProvider);
export const loginWithFacebook = () => handleLogin(facebookProvider);
