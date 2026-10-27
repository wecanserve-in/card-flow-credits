import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { sendEmailVerification } from "firebase/auth";

import { auth } from "../services/firebase";
import {
  claimFreeScans,
  FREE_SCANS,
  FreeScansResult,
} from "../services/userService";
import { User } from "../types/user";

type Props = {
  user: User | null;
  remainingScans: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Home-screen banner for the welcome free scans:
 * - claims them automatically once the email is verified (Google emails always are),
 * - otherwise asks the user to verify their email,
 * - tells the user when the free scans were already used on this phone/email.
 */
export default function FreeScansBanner({
  user,
  remainingScans,
  style,
}: Props) {
  const status = user?.freeScansStatus;

  const [busy, setBusy] = useState(false);
  const [result, setResult] =
    useState<FreeScansResult | null>(null);

  const autoClaimed = useRef(false);

  const claim = async (fromButton: boolean) => {
    setBusy(true);

    const outcome = await claimFreeScans();

    setResult(outcome);
    setBusy(false);

    if (outcome === "granted") {
      Alert.alert(
        "Free scans added 🎉",
        `${FREE_SCANS} free scans have been added to your account.`
      );
    } else if (
      fromButton &&
      outcome === "email_not_verified"
    ) {
      Alert.alert(
        "Email not verified yet",
        "Open the link we sent to your email, then tap \"I've verified\" again. Check your spam folder if you can't find it."
      );
    } else if (fromButton && outcome === "error") {
      Alert.alert(
        "Something went wrong",
        "Please check your internet connection and try again."
      );
    }
  };

  useEffect(() => {
    if (status === "pending" && !autoClaimed.current) {
      autoClaimed.current = true;
      claim(false);
    }
  }, [status]);

  const resendEmail = async () => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      return;
    }

    try {
      await sendEmailVerification(firebaseUser);

      Alert.alert(
        "Email sent",
        `We sent a verification link to ${firebaseUser.email}.`
      );
    } catch (error: any) {
      Alert.alert(
        "Please wait",
        error?.code === "auth/too-many-requests"
          ? "An email was sent recently. Please wait a few minutes before asking again."
          : "Could not send the email. Please try again."
      );
    }
  };

  if (status === "already_used") {
    if (remainingScans > 0 || user?.packId !== "free") {
      return null;
    }

    return (
      <View style={[styles.card, styles.infoCard, style]}>
        <View style={styles.row}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#9A6B2B"
          />

          <Text style={styles.text}>
            Free scans have already been used on this
            phone or email. Buy a pack to keep
            scanning.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryButton}
          onPress={() => router.push("/plans")}
        >
          <Text style={styles.primaryButtonText}>
            View plans
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status !== "pending") {
    return null;
  }

  if (busy || result === null) {
    return (
      <View style={[styles.card, style]}>
        <View style={styles.row}>
          <ActivityIndicator
            size="small"
            color="#09A84E"
          />

          <Text style={styles.text}>
            Unlocking your {FREE_SCANS} free scans…
          </Text>
        </View>
      </View>
    );
  }

  if (result === "email_not_verified") {
    return (
      <View style={[styles.card, style]}>
        <View style={styles.row}>
          <Ionicons
            name="mail-unread-outline"
            size={22}
            color="#09A84E"
          />

          <View style={styles.textBlock}>
            <Text style={styles.title}>
              Verify your email to get{" "}
              {FREE_SCANS} free scans
            </Text>

            <Text style={styles.text}>
              We sent a link to{" "}
              {auth.currentUser?.email}. Open it,
              then come back and tap &quot;I&apos;ve
              verified&quot;.
            </Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() => claim(true)}
          >
            <Text style={styles.primaryButtonText}>
              I&apos;ve verified
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.secondaryButton}
            onPress={resendEmail}
          >
            <Text style={styles.secondaryButtonText}>
              Resend email
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // "error" (or an unexpected answer): let the user retry.
  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        <Ionicons
          name="gift-outline"
          size={22}
          color="#09A84E"
        />

        <Text style={styles.text}>
          Your {FREE_SCANS} free scans are waiting.
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.primaryButton}
        onPress={() => claim(true)}
      >
        <Text style={styles.primaryButtonText}>
          Get free scans
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 13,
    padding: 15,
    borderRadius: 18,
    backgroundColor: "#EFF9F3",
    borderWidth: 1,
    borderColor: "#D8F0E2",
  },

  infoCard: {
    backgroundColor: "#FFF8EC",
    borderColor: "#F3E1BD",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  textBlock: {
    flex: 1,
  },

  title: {
    marginLeft: 10,
    color: "#17261D",
    fontSize: 13.5,
    fontWeight: "800",
  },

  text: {
    flex: 1,
    marginLeft: 10,
    marginTop: 2,
    color: "#4F5A54",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },

  buttons: {
    flexDirection: "row",
    gap: 10,
  },

  primaryButton: {
    flex: 1,
    minHeight: 42,
    marginTop: 12,
    borderRadius: 13,
    backgroundColor: "#09A84E",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  secondaryButton: {
    flex: 1,
    minHeight: 42,
    marginTop: 12,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFE8D9",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: "#078E42",
    fontSize: 13,
    fontWeight: "800",
  },
});
