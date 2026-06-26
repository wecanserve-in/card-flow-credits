import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import CryptoJS from "crypto-js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
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

import { auth, db } from "../services/firebase";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_APP_ENCRYPTION_KEY;

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [credits, setCredits] = useState(0);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const encryptCard = (card: any) => {
    return CryptoJS.AES.encrypt(
      JSON.stringify(card),
      ENCRYPTION_KEY || ""
    ).toString();
  };

  const decryptCard = (encryptedData: string) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY || "");
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) return null;
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  };

  const loadUserCards = async (uid: string) => {
    const cardsRef = collection(db, "users", uid, "encryptedCards");
    const q = query(cardsRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    const cards: any[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.encryptedData) {
        const decrypted = decryptCard(data.encryptedData);
        if (decrypted) cards.push(decrypted);
      }
    });

    setAllCards(cards);
  };

  useEffect(() => {
  let unsubscribeUserDoc: any = null;

  const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
    if (unsubscribeUserDoc) {
      unsubscribeUserDoc();
      unsubscribeUserDoc = null;
    }

    setUser(currentUser);

    if (currentUser) {
      await loadUserCards(currentUser.uid);

      const userRef = doc(db, "users", currentUser.uid);

      unsubscribeUserDoc = onSnapshot(
        userRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            setCredits(docSnap.data().credits ?? 0);
          } else {
            await setDoc(userRef, { credits: 10 });
            setCredits(10);
          }
        },
        (error) => {
          console.log("Credits listener error:", error.message);
        }
      );
    } else {
      setCredits(0);
      setAllCards([]);
      setSelectedImages([]);
    }
  });

  return () => {
    if (unsubscribeUserDoc) {
      unsubscribeUserDoc();
    }

    unsubscribeAuth();
  };
}, []);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      Alert.alert("Auth Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Camera permission is needed.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8
    });

    if (!result.canceled) {
      setSelectedImages((prev) => [...prev, result.assets[0]]);
    }
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8
    });

    if (!result.canceled) {
      setSelectedImages((prev) => [...prev, ...result.assets]);
    }
  };

  const saveEncryptedCards = async (cards: any[]) => {
    const cardsRef = collection(db, "users", user.uid, "encryptedCards");

    for (const card of cards) {
      await addDoc(cardsRef, {
        encryptedData: encryptCard(card),
        createdAt: serverTimestamp()
      });
    }
  };

  const uploadCards = async () => {
    if (!selectedImages.length) {
      Alert.alert("No cards", "Please select or capture cards first.");
      return;
    }

    if (credits < selectedImages.length) {
      Alert.alert(
        "Insufficient credits",
        `You need ${selectedImages.length} credits but have only ${credits}.`
      );
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      selectedImages.forEach((img, index) => {
        formData.append("files", {
          uri: img.uri,
          name: `card_${index + 1}.jpg`,
          type: "image/jpeg"
        } as any);
      });

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      const result = await response.json();

      if (result.error) {
        Alert.alert("Error", result.error);
        return;
      }

      const newCards = result.cards || [];

      await saveEncryptedCards(newCards);

      setAllCards((prev) => [...prev, ...newCards]);

      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        credits: credits - selectedImages.length
      });

      setSelectedImages([]);

      Alert.alert("Success", `${newCards.length} card(s) extracted.`);
    } catch (error: any) {
      Alert.alert("Upload failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);

    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  };

  const downloadExcel = async () => {
    if (!allCards.length) {
      Alert.alert("No data", "No cards available to download.");
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

      const buffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);

      const fileUri = FileSystem.documentDirectory + "cardsdetails.xlsx";

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64
      });

      await Sharing.shareAsync(fileUri);
    } catch (error: any) {
      Alert.alert("Excel Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.badge}>WeCanServe</Text>
        <Text style={styles.title}>CardFlow Mobile</Text>
        <Text style={styles.subtitle}>
          Login or sign up to scan visiting cards.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth}>
          <Text style={styles.btnText}>
            {authMode === "login" ? "Login" : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            setAuthMode(authMode === "login" ? "signup" : "login")
          }
        >
          <Text style={styles.link}>
            {authMode === "login"
              ? "New user? Register here"
              : "Already have account? Login"}
          </Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color="#078c90" />}
      </View>
    );
  }

  return (
    <ScrollView style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.credits}>🪙 {credits} credits left</Text>
        </View>

        <TouchableOpacity onPress={() => signOut(auth)}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Business Card Scanner</Text>
      <Text style={styles.subtitle}>
        Capture from camera or upload from gallery. 1 card = 1 credit.
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto}>
        <Text style={styles.btnText}>📷 Take Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={pickImages}>
        <Text style={styles.secondaryText}>🖼 Choose From Gallery</Text>
      </TouchableOpacity>

      <Text style={styles.selected}>
        Selected Cards: {selectedImages.length}
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={uploadCards}>
        <Text style={styles.btnText}>
          Extract Details ({selectedImages.length} credits)
        </Text>
      </TouchableOpacity>

      <View style={styles.historyBox}>
        <Text style={styles.sectionTitle}>Saved Card History</Text>
        <Text style={styles.count}>{allCards.length} Total Cards</Text>

        {allCards.map((card, index) => (
          <View style={styles.card} key={index}>
            <Text style={styles.cardTitle}>Card {index + 1}</Text>
            <Text>Name: {card.name || "Not available"}</Text>
            <Text>Company: {card.company || "Not available"}</Text>
            <Text>Designation: {card.designation || "Not available"}</Text>
            <Text>Phone: {card.phone || "Not available"}</Text>
            <Text>Email: {card.email || "Not available"}</Text>
            <Text>Website: {card.website || "Not available"}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.secondaryBtn} onPress={downloadExcel}>
          <Text style={styles.secondaryText}>Download Full Excel</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#078c90" />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#eef7fb",
    padding: 20
  },
  container: {
    flex: 1,
    backgroundColor: "#eef7fb",
    justifyContent: "center",
    padding: 24
  },
  badge: {
    color: "#078c90",
    fontWeight: "900",
    marginBottom: 12
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#061943",
    marginBottom: 10
  },
  subtitle: {
    color: "#5b7083",
    marginBottom: 24,
    lineHeight: 22
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#dceef7",
    borderRadius: 14,
    padding: 15,
    marginBottom: 14
  },
  primaryBtn: {
    backgroundColor: "#078c90",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12
  },
  secondaryBtn: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#078c90",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12
  },
  btnText: {
    color: "white",
    fontWeight: "900"
  },
  secondaryText: {
    color: "#078c90",
    fontWeight: "900"
  },
  link: {
    color: "#078c90",
    textAlign: "center",
    marginTop: 18,
    fontWeight: "700"
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  email: {
    color: "#334e68",
    fontWeight: "700"
  },
  credits: {
    marginTop: 6,
    color: "#e65100",
    fontWeight: "900"
  },
  logout: {
    color: "#c62828",
    fontWeight: "900"
  },
  selected: {
    marginTop: 16,
    fontWeight: "700",
    color: "#334e68"
  },
  historyBox: {
    marginTop: 28,
    marginBottom: 60
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#061943"
  },
  count: {
    color: "#078c90",
    fontWeight: "900",
    marginVertical: 10
  },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#dceef7"
  },
  cardTitle: {
    color: "#078c90",
    fontWeight: "900",
    marginBottom: 8
  }
});