import { useState, useEffect } from "react";
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
  onSnapshot
} from "firebase/firestore";
import { auth, db } from "./firebase";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'signup'
  const [authError, setAuthError] = useState("");

  const [files, setFiles] = useState([]);
  const [cards, setCards] = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Listen to their Firestore profile document to live-update credits
        const userRef = doc(db, "users", currentUser.uid);
        const unsubDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setCredits(docSnap.data().credits ?? 0);
          } else {
            // New signups get 10 free trial credits
            await setDoc(userRef, { credits: 10 });
            setCredits(10);
          }
        });
        return () => unsubDoc();
      } else {
        setCredits(0);
        setCards(null);
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

  const uploadCards = async () => {
    if (!files.length) return;

    if (credits < files.length) {
      alert(`Insufficient credits. You need ${files.length} credits (1 credit per card), but you only have ${credits} credits left.`);
      return;
    }

    setLoading(true);
    setCards(null);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.error) {
        alert(result.error);
        return;
      }

      setCards(result.cards || []);

      // Decrement credits based on the number of processed cards
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        credits: credits - (result.cards || []).length
      });

    } catch (error) {
      alert("Something went wrong during card scanning.");
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!cards || !cards.length) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/download-excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cards),
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
                Don't have an account?{" "}
                <span onClick={() => { setAuthMode("signup"); setAuthError(""); }}>
                  Register here
                </span>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <span onClick={() => { setAuthMode("login"); setAuthError(""); }}>
                  Sign in here
                </span>
              </p>
            )}
          </div>

          <div className="privacyDisclaimer">
            🔒 <strong>Privacy First:</strong> Your card photos and generated spreadsheets are processed strictly in-memory and are never stored on our servers.
          </div>
        </main>
      ) : (
        <main className="ocrCard">
          <header className="appHeader">
            <div className="userInfo">
              <span className="userEmail">{user.email}</span>
              <div className="creditBadge">
                🪙 {credits} credits left
              </div>
            </div>
            <button className="logoutBtn" onClick={handleLogout}>
              Logout
            </button>
          </header>

          <div className="badge">WeCanServe</div>

          <h1>Business Card Scanner</h1>

          <p className="subtitle">
            Upload clear, straight visiting card images. Each scan costs 1 credit.
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
            {loading ? "Extracting..." : `Extract Details (${files.length} credits)`}
          </button>

          <section className="previewTable">
            <div className="tableHeader">
              <h2>Extracted Details</h2>
              <span>{cards ? `${cards.length} Cards` : "Preview"}</span>
            </div>

            {!cards ? (
              <div className="emptyState">
                Upload cards to see extracted name, company, phone, email,
                country and address.
              </div>
            ) : (
              <>
                <div className="multiCards">
                  {cards.map((card, index) => (
                    <div className="resultCard" key={index}>
                      <div className="resultCardHeader">
                        <h3>Card {card.card_no || index + 1}</h3>
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
                    Download Excel
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