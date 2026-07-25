import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { router } from "expo-router";
import {
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  AntDesign,
  Ionicons,
} from "@expo/vector-icons";

import { auth } from "../services/firebase";
import { signInWithGoogle } from "../services/googleAuth";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loadingMethod,
    setLoadingMethod,
  ] = useState<
    "email" | "google" | null
  >(null);

  const handleLogin = async () => {
    if (
      !email.trim() ||
      !password.trim()
    ) {
      Alert.alert(
        "Missing Details",
        "Please enter your email address and password."
      );

      return;
    }

    try {
      setLoadingMethod("email");

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      router.replace("/home");
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        error?.message ||
          "Unable to sign in. Please check your details and try again."
      );
    } finally {
      setLoadingMethod(null);
    }
  };

  const handleGoogleLogin =
    async () => {
      try {
        setLoadingMethod("google");

        const userCredential =
          await signInWithGoogle();

        if (userCredential) {
          router.replace("/home");
        }
      } catch (error: any) {
        Alert.alert(
          "Google Login Failed",
          error?.message ||
            "Unable to continue with Google."
        );
      } finally {
        setLoadingMethod(null);
      }
    };

  const isLoading =
    loadingMethod !== null;

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(
                insets.bottom + 24,
                34
              ),
            },
          ]}
        >
          {/* Branding */}

          <View style={styles.brandSection}>
            <View
              style={styles.logoContainer}
            >
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View
              style={styles.brandBadge}
            >
              <Ionicons
                name="scan-outline"
                size={14}
                color="#078E42"
              />

              <Text
                style={
                  styles.brandBadgeText
                }
              >
                Smart business card scanner
              </Text>
            </View>
          </View>

          {/* Welcome Content */}

          <View
            style={styles.welcomeSection}
          >
            <Text style={styles.title}>
              Welcome back
            </Text>

            <Text style={styles.subtitle}>
              Sign in to scan business
              cards, manage contacts and
              export your network.
            </Text>
          </View>

          {/* Login Card */}

          <View style={styles.formCard}>
            <View
              style={styles.formHeader}
            >
              <View
                style={styles.formHeaderIcon}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#09A84E"
                />
              </View>

              <View
                style={
                  styles.formHeaderText
                }
              >
                <Text
                  style={
                    styles.formTitle
                  }
                >
                  Sign in to your account
                </Text>

                <Text
                  style={
                    styles.formSubtitle
                  }
                >
                  Enter your registered
                  details below
                </Text>
              </View>
            </View>

            {/* Email */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email address
              </Text>

              <View
                style={styles.inputContainer}
              >
                <View
                  style={styles.inputIcon}
                >
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color="#09A84E"
                  />
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#A0A8A3"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  editable={!isLoading}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Password
              </Text>

              <View
                style={styles.inputContainer}
              >
                <View
                  style={styles.inputIcon}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={19}
                    color="#09A84E"
                  />
                </View>

                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#A0A8A3"
                  secureTextEntry={
                    !showPassword
                  }
                  autoCorrect={false}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={
                    handleLogin
                  }
                />

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={
                    styles.passwordToggle
                  }
                  onPress={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  disabled={isLoading}
                >
                  <Ionicons
                    name={
                      showPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={21}
                    color="#6F7973"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.primaryButton,
                isLoading &&
                  styles.disabledButton,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <View
                style={
                  styles.primaryIcon
                }
              >
                {loadingMethod ===
                "email" ? (
                  <ActivityIndicator
                    size="small"
                    color="#09A84E"
                  />
                ) : (
                  <Ionicons
                    name="log-in-outline"
                    size={20}
                    color="#09A84E"
                  />
                )}
              </View>

              <View
                style={
                  styles.primaryContent
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  {loadingMethod ===
                  "email"
                    ? "Signing In"
                    : "Sign In"}
                </Text>

                <Text
                  style={
                    styles.primaryButtonSubtitle
                  }
                >
                  Continue to your dashboard
                </Text>
              </View>

              {loadingMethod !==
                "email" && (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>

            {/* Divider */}

            <View
              style={styles.dividerRow}
            >
              <View
                style={styles.divider}
              />

              <Text
                style={styles.dividerText}
              >
                OR CONTINUE WITH
              </Text>

              <View
                style={styles.divider}
              />
            </View>

            {/* Google Login */}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.googleButton,
                isLoading &&
                  styles.disabledGoogleButton,
              ]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
              <View
                style={styles.googleIcon}
              >
                {loadingMethod ===
                "google" ? (
                  <ActivityIndicator
                    size="small"
                    color="#4285F4"
                  />
                ) : (
                  <AntDesign
                    name="google"
                    size={19}
                    color="#4285F4"
                  />
                )}
              </View>

              <Text
                style={
                  styles.googleButtonText
                }
              >
                {loadingMethod ===
                "google"
                  ? "Connecting to Google"
                  : "Continue with Google"}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#8A938E"
              />
            </TouchableOpacity>
          </View>

          {/* Sign Up */}

          <View
            style={styles.signupContainer}
          >
            <Text style={styles.signupText}>
              New to the app?
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.push("/signup")
              }
              disabled={isLoading}
            >
              <Text
                style={styles.signupLink}
              >
                Create an account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Note */}

          <View
            style={styles.securityNote}
          >
            <View
              style={styles.securityIcon}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="#09A84E"
              />
            </View>

            <Text
              style={styles.securityText}
            >
              Your account and contact data
              are securely protected.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    justifyContent: "center",
  },

  brandSection: {
    alignItems: "center",
  },

  logoContainer: {
    width: 190,
    height: 94,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  brandBadge: {
    minHeight: 31,
    marginTop: 5,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: "#EAF8F0",
    borderWidth: 1,
    borderColor: "#D8F0E2",
    flexDirection: "row",
    alignItems: "center",
  },

  brandBadgeText: {
    marginLeft: 6,
    color: "#078E42",
    fontSize: 10.5,
    fontWeight: "800",
  },

  welcomeSection: {
    marginTop: 25,
    alignItems: "center",
  },

  title: {
    color: "#171D19",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },

  subtitle: {
    maxWidth: 330,
    marginTop: 9,
    color: "#7B8580",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },

  formCard: {
    marginTop: 26,
    padding: 17,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAE6",

    shadowColor: "#17261D",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 4,
  },

  formHeader: {
    marginBottom: 21,
    flexDirection: "row",
    alignItems: "center",
  },

  formHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  formHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  formTitle: {
    color: "#222824",
    fontSize: 15,
    fontWeight: "800",
  },

  formSubtitle: {
    marginTop: 3,
    color: "#8B938F",
    fontSize: 10.5,
    fontWeight: "500",
  },

  inputGroup: {
    marginBottom: 15,
  },

  label: {
    marginBottom: 8,
    marginLeft: 2,
    color: "#505A54",
    fontSize: 12.5,
    fontWeight: "700",
  },

  inputContainer: {
    minHeight: 56,
    borderRadius: 17,
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: "#E3E9E5",
    flexDirection: "row",
    alignItems: "center",
  },

  inputIcon: {
    width: 42,
    height: 42,
    marginLeft: 6,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 12,
    color: "#202622",
    fontSize: 14,
    fontWeight: "600",
  },

  passwordInput: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 12,
    color: "#202622",
    fontSize: 14,
    fontWeight: "600",
  },

  passwordToggle: {
    width: 45,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButton: {
    minHeight: 62,
    marginTop: 7,
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.24,
    shadowRadius: 11,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  disabledButton: {
    opacity: 0.68,
  },

  primaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryContent: {
    flex: 1,
    marginLeft: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },

  primaryButtonSubtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontSize: 10.5,
    fontWeight: "500",
  },

  dividerRow: {
    marginVertical: 21,
    flexDirection: "row",
    alignItems: "center",
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E6EBE8",
  },

  dividerText: {
    marginHorizontal: 10,
    color: "#9AA29E",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  googleButton: {
    minHeight: 57,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E7E4",
    flexDirection: "row",
    alignItems: "center",
  },

  disabledGoogleButton: {
    opacity: 0.65,
  },

  googleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F7F9F8",
    borderWidth: 1,
    borderColor: "#E8ECEA",
    alignItems: "center",
    justifyContent: "center",
  },

  googleButtonText: {
    flex: 1,
    marginLeft: 11,
    color: "#303733",
    fontSize: 13.5,
    fontWeight: "700",
  },

  signupContainer: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  signupText: {
    color: "#7C8680",
    fontSize: 13,
    fontWeight: "600",
  },

  signupLink: {
    marginLeft: 5,
    color: "#078E42",
    fontSize: 13,
    fontWeight: "900",
  },

  securityNote: {
    alignSelf: "center",
    maxWidth: 300,
    minHeight: 44,
    marginTop: 22,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: "#EFF9F3",
    borderWidth: 1,
    borderColor: "#DCEFE4",
    flexDirection: "row",
    alignItems: "center",
  },

  securityIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  securityText: {
    flex: 1,
    marginLeft: 9,
    color: "#68746C",
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "600",
  },
});