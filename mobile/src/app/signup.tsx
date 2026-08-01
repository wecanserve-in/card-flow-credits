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
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { router } from "expo-router";

import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  setDoc,
} from "firebase/firestore";

import {
  AntDesign,
  Ionicons,
} from "@expo/vector-icons";

import {
  auth,
  db,
} from "../services/firebase";

import { signInWithGoogle } from "../services/googleAuth";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    loadingMethod,
    setLoadingMethod,
  ] = useState<
    "email" | "google" | null
  >(null);

  const isLoading =
    loadingMethod !== null;

  const handleSignup = async () => {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        "Missing Details",
        "Please fill in all the required fields."
      );

      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Password Error",
        "Passwords do not match."
      );

      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 6 characters."
      );

      return;
    }

    try {
      setLoadingMethod("email");

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      await updateProfile(
        userCredential.user,
        {
          displayName:
            fullName.trim(),
        }
      );

      await setDoc(
        doc(
          db,
          "users",
          userCredential.user.uid
        ),
        {
          uid: userCredential.user.uid,
          name: fullName.trim(),
          email: email.trim(),
          photoURL: "",
          packId: "free",
          packName: "Free Plan",
          totalScans: 5,
          usedScans: 0,
          remainingScans: 5,
          exportsGenerated: 0,
          subscriptionActive: false,
          subscriptionExpiry: null,
          exportsGenerated: 0,
          subscriptionActive: false,
          subscriptionExpiry: null,
          authProvider: "email",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      );

      router.replace("/home");
    } catch (error: any) {
      Alert.alert(
        "Signup Failed",
        error?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoadingMethod(null);
    }
  };

  const handleGoogleSignup =
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
          "Google Signup Failed",
          error?.message ||
            "Unable to continue with Google."
        );
      } finally {
        setLoadingMethod(null);
      }
    };

  const passwordValid =
    password.length >= 6;

  const passwordsMatch =
    confirmPassword.length > 0 &&
    password === confirmPassword;

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
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
                insets.bottom + 28,
                36
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
                name="sparkles-outline"
                size={14}
                color="#078E42"
              />

              <Text
                style={
                  styles.brandBadgeText
                }
              >
                Turn cards into contacts
              </Text>
            </View>
          </View>

          {/* Welcome */}

          <View
            style={styles.welcomeSection}
          >
            <Text style={styles.title}>
              Create your account
            </Text>

            <Text style={styles.subtitle}>
              Start scanning business cards,
              organizing contacts and
              exporting your network.
            </Text>
          </View>

          {/* Signup Form */}

          <View style={styles.formCard}>
            <View
              style={styles.formHeader}
            >
              <View
                style={styles.formHeaderIcon}
              >
                <Ionicons
                  name="person-add-outline"
                  size={21}
                  color="#09A84E"
                />
              </View>

              <View
                style={
                  styles.formHeaderContent
                }
              >
                <Text
                  style={
                    styles.formTitle
                  }
                >
                  Personal information
                </Text>

                <Text
                  style={
                    styles.formSubtitle
                  }
                >
                  Enter your details to get
                  started
                </Text>
              </View>
            </View>

            {/* Full Name */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Full name
              </Text>

              <View
                style={
                  styles.inputContainer
                }
              >
                <View
                  style={styles.inputIcon}
                >
                  <Ionicons
                    name="person-outline"
                    size={19}
                    color="#09A84E"
                  />
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#A0A8A3"
                  autoCorrect={false}
                  autoCapitalize="words"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!isLoading}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Email */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email address
              </Text>

              <View
                style={
                  styles.inputContainer
                }
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
                style={
                  styles.inputContainer
                }
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
                  style={
                    styles.passwordInput
                  }
                  placeholder="Create a password"
                  placeholderTextColor="#A0A8A3"
                  secureTextEntry={
                    !showPassword
                  }
                  autoCorrect={false}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                  returnKeyType="next"
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

              {password.length > 0 && (
                <View
                  style={
                    styles.validationRow
                  }
                >
                  <Ionicons
                    name={
                      passwordValid
                        ? "checkmark-circle"
                        : "information-circle-outline"
                    }
                    size={15}
                    color={
                      passwordValid
                        ? "#09A84E"
                        : "#D8902F"
                    }
                  />

                  <Text
                    style={[
                      styles.validationText,
                      passwordValid &&
                        styles.validText,
                    ]}
                  >
                    At least 6 characters
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Confirm password
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  confirmPassword.length >
                    0 &&
                    !passwordsMatch &&
                    styles.inputError,
                  passwordsMatch &&
                    styles.inputSuccess,
                ]}
              >
                <View
                  style={styles.inputIcon}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color="#09A84E"
                  />
                </View>

                <TextInput
                  style={
                    styles.passwordInput
                  }
                  placeholder="Repeat your password"
                  placeholderTextColor="#A0A8A3"
                  secureTextEntry={
                    !showConfirmPassword
                  }
                  autoCorrect={false}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={
                    setConfirmPassword
                  }
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={
                    handleSignup
                  }
                />

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={
                    styles.passwordToggle
                  }
                  onPress={() =>
                    setShowConfirmPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  disabled={isLoading}
                >
                  <Ionicons
                    name={
                      showConfirmPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={21}
                    color="#6F7973"
                  />
                </TouchableOpacity>
              </View>

              {confirmPassword.length >
                0 && (
                <View
                  style={
                    styles.validationRow
                  }
                >
                  <Ionicons
                    name={
                      passwordsMatch
                        ? "checkmark-circle"
                        : "close-circle-outline"
                    }
                    size={15}
                    color={
                      passwordsMatch
                        ? "#09A84E"
                        : "#E05252"
                    }
                  />

                  <Text
                    style={[
                      styles.validationText,
                      passwordsMatch
                        ? styles.validText
                        : styles.invalidText,
                    ]}
                  >
                    {passwordsMatch
                      ? "Passwords match"
                      : "Passwords do not match"}
                  </Text>
                </View>
              )}
            </View>

            {/* Create Account */}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.primaryButton,
                isLoading &&
                  styles.disabledButton,
              ]}
              onPress={handleSignup}
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
                    name="person-add-outline"
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
                    ? "Creating Account"
                    : "Create Account"}
                </Text>

                <Text
                  style={
                    styles.primarySubtitle
                  }
                >
                  Start with your free plan
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

            {/* Google */}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.googleButton,
                isLoading &&
                  styles.disabledGoogleButton,
              ]}
              onPress={handleGoogleSignup}
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

          {/* Login Link */}

          <View
            style={styles.loginContainer}
          >
            <Text style={styles.loginText}>
              Already have an account?
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.replace("/login")
              }
              disabled={isLoading}
            >
              <Text
                style={styles.loginLink}
              >
                Sign in
              </Text>
            </TouchableOpacity>
          </View>

          {/* Free Plan Information */}

          <View style={styles.planCard}>
            <View style={styles.planIcon}>
              <Ionicons
                name="gift-outline"
                size={19}
                color="#09A84E"
              />
            </View>

            <View style={styles.planContent}>
              <Text style={styles.planTitle}>
                Free plan included
              </Text>

              <Text style={styles.planText}>
                Create your account and get
                5 free business card scans
                to start.
              </Text>
            </View>

            <Ionicons
              name="checkmark-circle"
              size={21}
              color="#09A84E"
            />
          </View>

          {/* Security */}

          <View
            style={styles.securityNote}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={17}
              color="#09A84E"
            />

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

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
  },

  brandSection: {
    alignItems: "center",
  },

  logoContainer: {
    width: 185,
    height: 90,
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
    marginTop: 22,
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
    marginTop: 25,
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

  formHeaderContent: {
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

  inputSuccess: {
    borderColor: "#9EDBB7",
    backgroundColor: "#F5FCF8",
  },

  inputError: {
    borderColor: "#EDB3B3",
    backgroundColor: "#FFF8F8",
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

  validationRow: {
    marginTop: 7,
    marginLeft: 4,
    flexDirection: "row",
    alignItems: "center",
  },

  validationText: {
    marginLeft: 5,
    color: "#9A6B2B",
    fontSize: 10.5,
    fontWeight: "600",
  },

  validText: {
    color: "#078E42",
  },

  invalidText: {
    color: "#D14848",
  },

  primaryButton: {
    minHeight: 62,
    marginTop: 8,
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

  primarySubtitle: {
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

  loginContainer: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  loginText: {
    color: "#7C8680",
    fontSize: 13,
    fontWeight: "600",
  },

  loginLink: {
    marginLeft: 5,
    color: "#078E42",
    fontSize: 13,
    fontWeight: "900",
  },

  planCard: {
    marginTop: 22,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#EFF9F3",
    borderWidth: 1,
    borderColor: "#DCEFE4",
    flexDirection: "row",
    alignItems: "center",
  },

  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  planContent: {
    flex: 1,
    marginHorizontal: 11,
  },

  planTitle: {
    color: "#2C3931",
    fontSize: 12.5,
    fontWeight: "800",
  },

  planText: {
    marginTop: 3,
    color: "#718078",
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
  },

  securityNote: {
    alignSelf: "center",
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  securityText: {
    marginLeft: 7,
    color: "#829089",
    fontSize: 10.5,
    fontWeight: "600",
  },
});