import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  getMyReferralInfo,
  REFERRAL_BONUS,
} from "../services/userService";
import { User } from "../types/user";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.wecanserve.scanmycard";

type Props = {
  user: User | null;
};

/**
 * Profile-tab card with the user's own referral code and a Share button.
 * The code is created by the server the first time it's needed.
 */
export default function ReferralCard({ user }: Props) {
  const [fetchedCode, setFetchedCode] =
    useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // The saved code shows up in the user document once the server has created it.
  const code = user?.referralCode || fetchedCode;
  const needsCode = Boolean(user) && !user?.referralCode;
  const loading = needsCode && !fetchedCode && !failed;

  const applyResult = (
    info: Awaited<ReturnType<typeof getMyReferralInfo>>
  ) => {
    if (info?.code) {
      setFetchedCode(info.code);
    } else {
      setFailed(true);
    }
  };

  // Ask the server once for an account that has no code yet.
  useEffect(() => {
    if (!needsCode) {
      return;
    }

    let active = true;

    getMyReferralInfo().then((info) => {
      if (active) {
        applyResult(info);
      }
    });

    return () => {
      active = false;
    };
  }, [user?.uid, needsCode]);

  const retry = async () => {
    setFailed(false);
    applyResult(await getMyReferralInfo());
  };

  const shareCode = async () => {
    if (!code) {
      return;
    }

    try {
      await Share.share({
        message:
          `I use ScanMyCard to turn business cards into contacts and Excel sheets in seconds. ` +
          `Download it and enter my referral code ${code} when you sign up, and we both get ${REFERRAL_BONUS} free scans:\n${PLAY_STORE_URL}`,
      });
    } catch {
      Alert.alert(
        "Couldn't Share",
        `Your referral code is ${code}.`
      );
    }
  };

  const friends = user?.referralCount ?? 0;
  const earned = user?.referralScansEarned ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons
            name="gift-outline"
            size={21}
            color="#09A84E"
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Invite friends, get {REFERRAL_BONUS} free scans
          </Text>

          <Text style={styles.subtitle}>
            When a friend signs up with your code, you
            both get {REFERRAL_BONUS} free scans.
          </Text>
        </View>
      </View>

      <View style={styles.codeRow}>
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>
            Your code
          </Text>

          {code ? (
            <Text
              style={styles.code}
              selectable
            >
              {code}
            </Text>
          ) : loading ? (
            <ActivityIndicator
              size="small"
              color="#09A84E"
              style={styles.codeLoader}
            />
          ) : (
            <TouchableOpacity onPress={retry}>
              <Text style={styles.retry}>
                Tap to retry
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.shareButton,
            !code && styles.shareDisabled,
          ]}
          disabled={!code}
          onPress={shareCode}
          accessibilityLabel="Share your referral code"
        >
          <Ionicons
            name="share-social-outline"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.shareText}>
            Share
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.stats}>
        {friends === 0
          ? "No friends have joined yet."
          : `${friends} ${friends === 1 ? "friend" : "friends"} joined · ${earned} scans earned`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 16,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.065,
    shadowRadius: 11,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    marginLeft: 12,
  },

  title: {
    color: "#17261D",
    fontSize: 14.5,
    fontWeight: "800",
  },

  subtitle: {
    marginTop: 3,
    color: "#7B8580",
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "500",
  },

  codeRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },

  codeBox: {
    flex: 1,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: "#F5FBF7",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#9EDBB7",
    justifyContent: "center",
  },

  codeLabel: {
    color: "#7B8580",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  code: {
    marginTop: 2,
    color: "#078E42",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 3,
  },

  codeLoader: {
    marginTop: 6,
    alignSelf: "flex-start",
  },

  retry: {
    marginTop: 4,
    color: "#078E42",
    fontSize: 13,
    fontWeight: "800",
  },

  shareButton: {
    minWidth: 96,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  shareDisabled: {
    opacity: 0.5,
  },

  shareText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  stats: {
    marginTop: 12,
    color: "#5F6B65",
    fontSize: 12,
    fontWeight: "600",
  },
});
