import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { AntDesign, Ionicons } from "@expo/vector-icons";

import { auth } from "../services/firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Details", "Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email.trim(), password);

      router.replace("/home");
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert("Coming Soon", "Google login will be connected after email auth.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.top}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Login to scan and export your business cards.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
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

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            activeOpacity={0.85}
          >
            <AntDesign name="google" size={18} color="#4285F4" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={styles.linkText}>
              New here? <Text style={styles.linkBlue}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    paddingHorizontal: 26,
    justifyContent: "center",
  },

  top: {
    alignItems: "center",
    marginBottom: 34,
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
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 290,
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
    marginTop: 6,
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