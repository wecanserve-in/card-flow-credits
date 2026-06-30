import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { AntDesign, Ionicons } from "@expo/vector-icons";

import { auth, db } from "../services/firebase";

export default function SignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing Details", "Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Error", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(userCredential.user, {
        displayName: fullName.trim(),
      });

     await setDoc(doc(db, "users", userCredential.user.uid), {
  uid: userCredential.user.uid,

  name: fullName.trim(),
  email: email.trim(),
  photoURL: "",

  planName: "Free",
  cardLimit: 100,

  cardsUsed: 0,
  exportsGenerated: 0,

  subscriptionActive: false,
  authProvider: "email",

  createdAt: new Date(),
});

      router.replace("/home");
    } catch (error: any) {
      Alert.alert("Signup Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    Alert.alert(
      "Coming Soon",
      "Google signup will be enabled after Development Build."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.top}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.title}>Create Account</Text>

            <Text style={styles.subtitle}>
              Start scanning business cards and exporting contacts in seconds.
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCorrect={false}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirmPassword}
                autoCorrect={false}
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowConfirmPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, loading && styles.disabledButton]}
              onPress={handleGoogleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              <AntDesign name="google" size={18} color="#4285F4" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/login")}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkBlue}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingVertical: 30,
  },

  top: {
    alignItems: "center",
    marginBottom: 30,
  },

  logo: {
    width: "55%",
    maxWidth: 210,
    height: 130,
    marginBottom: 4,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#07122F",
  },

  subtitle: {
    marginTop: 8,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 300,
  },

  form: {
    width: "100%",
  },

  input: {
    height: 54,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5EAF2",
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#07122F",
    marginBottom: 14,
  },

  passwordContainer: {
    height: 54,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5EAF2",
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: "#07122F",
    paddingRight: 10,
  },

  primaryButton: {
    height: 54,
    backgroundColor: "#2563FF",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  disabledButton: {
    opacity: 0.7,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5EAF2",
  },

  dividerText: {
    marginHorizontal: 12,
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
  },

  googleButton: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5EAF2",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  googleButtonText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#202124",
  },

  linkText: {
    marginTop: 24,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },

  linkBlue: {
    color: "#2563FF",
    fontWeight: "900",
  },
});