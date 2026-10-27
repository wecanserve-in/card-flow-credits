import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  cleanReferralCode,
  isValidReferralCode,
  REFERRAL_BONUS,
  setPendingReferralCode,
} from "../services/userService";

/**
 * First screen for logged-out users who haven't signed in on this phone yet:
 * one optional box for a friend's referral code, then the sign-in screen.
 * The code is used for whichever sign-in method they choose next.
 */
export default function ReferralScreen() {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  const goToSignIn = () => {
    router.replace("/login");
  };

  const handleSkip = async () => {
    await setPendingReferralCode(null);
    goToSignIn();
  };

  const handleContinue = async () => {
    const cleaned = cleanReferralCode(code);

    if (!cleaned) {
      await handleSkip();
      return;
    }

    setChecking(true);
    const valid = await isValidReferralCode(cleaned);
    setChecking(false);

    if (valid === false) {
      Alert.alert(
        "Invalid Referral Code",
        "This code doesn't exist. Please check it, or tap Skip."
      );
      return;
    }

    // Valid, or the server couldn't be reached (it re-checks the code later).
    await setPendingReferralCode(cleaned);
    goToSignIn();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.icon}>
          <Ionicons
            name="gift-outline"
            size={30}
            color="#09A84E"
          />
        </View>

        <Text style={styles.title}>
          Have a referral code?
        </Text>

        <Text style={styles.subtitle}>
          Enter your friend&apos;s code and they get{" "}
          {REFERRAL_BONUS} free scans when you join.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. K7P2QX"
          placeholderTextColor="#A0A8A3"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          value={code}
          onChangeText={setCode}
          editable={!checking}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          accessibilityLabel="Referral code"
        />

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.continueButton,
            checking && styles.disabled,
          ]}
          disabled={checking}
          onPress={handleContinue}
        >
          {checking ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.continueText}>
              Continue
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.skipButton}
          disabled={checking}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>
            Skip
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },

  content: {
    flex: 1,
    paddingHorizontal: 26,
    alignItems: "center",
    justifyContent: "center",
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

  icon: {
    width: 68,
    height: 68,
    marginTop: 26,
    borderRadius: 22,
    backgroundColor: "#EAF8F0",
    borderWidth: 1,
    borderColor: "#D6F0E1",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    marginTop: 18,
    color: "#171D19",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },

  subtitle: {
    maxWidth: 320,
    marginTop: 8,
    color: "#4F5A54",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    textAlign: "center",
  },

  input: {
    width: "100%",
    maxWidth: 360,
    minHeight: 58,
    marginTop: 26,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E2DC",
    color: "#17261D",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 3,
    textAlign: "center",
  },

  continueButton: {
    width: "100%",
    maxWidth: 360,
    minHeight: 56,
    marginTop: 16,
    borderRadius: 17,
    backgroundColor: "#09A84E",
    alignItems: "center",
    justifyContent: "center",
  },

  disabled: {
    opacity: 0.7,
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "800",
  },

  skipButton: {
    minHeight: 48,
    marginTop: 8,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  skipText: {
    color: "#3D4A43",
    fontSize: 15,
    fontWeight: "800",
  },
});
