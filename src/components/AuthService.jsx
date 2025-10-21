import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./Firebase";

let currentUser = null;

// Set up global listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

export const handleLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Errore logout:", error);
  }
};

/**
 * Get the current ID token of the authenticated user
 * @param {boolean} forceRefresh - Optional, force refresh the token
 * @returns {Promise<string|null>}
 */
export const getIdToken = async (forceRefresh = false) => {
  if (!currentUser) return null;
  return await currentUser.getIdToken(forceRefresh);
};

/**
 * Get the current user
 */
export const getCurrentUser = () => currentUser;
