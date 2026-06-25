import { useState, useEffect } from "react";
import CryptoJS from "crypto-js";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";

import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "./firebase";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");

  const [files, setFiles] = useState([]);
  const [cards, setCards] = useState([]);
  const [allCards, setAllCards] = useState([]);

  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const ENCRYPTION_KEY = import.meta.env.VITE_APP_ENCRYPTION_KEY;

  const encryptCard = (card) => {
    return CryptoJS.AES.encrypt(
      JSON.stringify(card),
      ENCRYPTION_KEY
    ).toString();
  };

  const decryptCard = (encryptedData) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      if (!decrypted) return null;

      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  };

  const loadUserCards = async (uid) => {
    try {
      const cardsRef = collection(db, "users", uid, "encryptedCards");
      const q = query(cardsRef, orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);

      const savedCards = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        if (data.encryptedData) {
          const decrypted = decryptCard(data.encryptedData);

          if (decrypted) {
            savedCards.push(decrypted);
          }
        }
      });

      setAllCards(savedCards);
    } catch (error) {
      console.error("Failed to load saved cards:", error);
      setAllCards([]);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);

        await loadUserCards(currentUser.uid);

        const unsubDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setCredits(docSnap.data().credits ?? 0);
          } else {
            await setDoc(userRef, { credits: 10 });
            setCredits(10);
          }
        });

        return () => unsubDoc();
      } else {
        setCredits(0);
        setCards([]);
        setAllCards([]);
        setFiles([]);
        setAuthEmail("");
        setAuthPassword("");
        setAuthError("");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (!authEmail || !authPassword) {
      setAuthError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err) {
      setAuthError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const saveEncryptedCards = async (newCards) => {
    const cardsRef = collection(db, "users", user.uid, "encryptedCards");

    for (const card of newCards) {
      const encryptedData = encryptCard(card);

      await addDoc(cardsRef, {
        encryptedData,
        createdAt: serverTimestamp()
      });
    }
  };

  const uploadCards = async () => {
    if (!files.length) return;

    if (!ENCRYPTION_KEY) {
      alert("Encryption key missing. Please add VITE_APP_ENCRYPTION_KEY in .env");
      return;
    }

    if (credits < files.length) {
      alert(
        `Insufficient credits. You need ${files.length} credits, but you only have ${credits} credits left.`
      );
      return;
    }

    setLoading(true);
    setCards([]);

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (result.error) {
        alert(result.error);
        return;
      }

      const newCards = result.cards || [];

      setCards(newCards);

      await saveEncryptedCards(newCards);

      setAllCards((prev) => [...prev, ...newCards]);

      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        credits: credits - files.length
      });

      setFiles([]);
    } catch (error) {
      console.error(error);
      alert("Something went wrong during card scanning.");
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!allCards || !allCards.length) {
      alert("No saved cards available to download.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/download-excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(allCards)
      });

      if (!response.ok) {
        throw new Error("Excel generation failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "cardsdetails.xlsx");

      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to download Excel. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {loading && (
        <div className="loadingOverlay">
          <div className="loadingModal">
            <div className="loader"></div>
            <h2>Processing Request</h2>
            <p>Please wait while we perform this secure operation.</p>
          </div>
        </div>
      )}

      <div className="bgGlow glowOne"></div>
      <div className="bgGlow glowTwo"></div>

      {!user ? (
        <main className="ocrCard authContainer">
          <div className="badge">WeCanServe</div>

          <h1>CardFlow Client Portal</h1>

          <p className="subtitle">
            Log in or sign up to securely scan business cards. 1 Rs per card.
          </p>

          <form onSubmit={handleAuth} className="authForm">
            {authError && <div className="authError">{authError}</div>}

            <div className="inputGroup">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </div>

            <div className="inputGroup">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="primaryBtn authBtn">
              {authMode === "login" ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <div className="authToggle">
            {authMode === "login" ? (
              <p>
                Don&apos;t have an account?{" "}
                <span
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError("");
                  }}
                >
                  Register here
                </span>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <span
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                  }}
                >
                  Sign in here
                </span>
              </p>
            )}
          </div>

          <div className="privacyDisclaimer">
            🔒 <strong>Privacy First:</strong> Your card photos are never stored.
            Card details are saved in encrypted form for Excel append history.
          </div>
        </main>
      ) : (
        <main className="ocrCard">
          <header className="appHeader">
            <div className="userInfo">
              <span className="userEmail">{user.email}</span>

              <div className="creditBadge">🪙 {credits} credits left</div>
            </div>

            <button className="logoutBtn" onClick={handleLogout}>
              Logout
            </button>
          </header>

          <div className="badge">WeCanServe</div>

          <h1>Business Card Scanner</h1>

          <p className="subtitle">
            Upload visiting card images. Each card uses 1 credit. Your previous
            scanned card details are encrypted and added to the same Excel history.
          </p>

          <label className="uploadBox">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files))}
            />

            <div className="uploadIcon">📇</div>

            <h3>
              {files.length
                ? `${files.length} card(s) selected`
                : "Upload visiting cards"}
            </h3>

            <p>PNG, JPG or JPEG supported. Upload straight images only.</p>
          </label>

          {files.length > 0 && (
            <div className="fileList">
              {files.map((file, index) => (
                <span key={index}>
                  Card {index + 1}: {file.name}
                </span>
              ))}
            </div>
          )}

          <button
            className="primaryBtn"
            disabled={!files.length || loading}
            onClick={uploadCards}
          >
            {loading
              ? "Extracting..."
              : `Extract Details (${files.length} credits)`}
          </button>

          <section className="previewTable">
            <div className="tableHeader">
              <h2>Saved Card History</h2>
              <span>{allCards.length} Total Cards</span>
            </div>

            {allCards.length === 0 ? (
              <div className="emptyState">
                Upload cards to create your Excel history.
              </div>
            ) : (
              <>
                <div className="multiCards">
                  {allCards.map((card, index) => (
                    <div className="resultCard" key={index}>
                      <div className="resultCardHeader">
                        <h3>Card {index + 1}</h3>
                      </div>

                      <p>
                        <b>Name:</b> {card.name || "Not available"}
                      </p>

                      <p>
                        <b>Company:</b> {card.company || "Not available"}
                      </p>

                      <p>
                        <b>Designation:</b>{" "}
                        {card.designation || "Not available"}
                      </p>

                      <p>
                        <b>Phone:</b> {card.phone || "Not available"}
                      </p>

                      <p>
                        <b>Country:</b> {card.country || "Not available"}
                      </p>

                      <p>
                        <b>Email:</b> {card.email || "Not available"}
                      </p>

                      <p>
                        <b>Website:</b> {card.website || "Not available"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="downloadArea">
                  <button className="downloadBtn" onClick={downloadExcel}>
                    Download Full Excel
                  </button>
                </div>
              </>
            )}
          </section>
        </main>
      )}
    </div>
  );
}

export default App;