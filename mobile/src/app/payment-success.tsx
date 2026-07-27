import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { getStringParam } from "../utils/payment";
import { createNotification } from "../services/notificationService";

export default function PaymentSuccessScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const planName =
    getStringParam(params.planName) ||
    "Your plan";

  const paymentId =
    getStringParam(params.paymentId);

  const orderId =
    getStringParam(params.orderId);

  useEffect(() => {
    createNotification({
      type: "payment_success",
      title: "Payment successful",
      message: `${planName} was activated successfully.`,
      actionRoute: "/home",
      eventKey: `payment-success-${paymentId || orderId || planName}`,
    });
  }, [orderId, paymentId, planName]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topDecoration} />
        <View style={styles.bottomDecoration} />

        <View style={styles.content}>
          <View style={styles.successIconOuter}>
            <View style={styles.successIconInner}>
              <Ionicons
                name="checkmark"
                size={44}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.secureBadge}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.successBadge}>
            <View style={styles.successDot} />

            <Text style={styles.successBadgeText}>
              PAYMENT CONFIRMED
            </Text>
          </View>

          <Text style={styles.title}>
            Payment successful
          </Text>

          <Text style={styles.message}>
            Your subscription has been activated successfully.
          </Text>

          <View style={styles.planCard}>
            <View style={styles.planIcon}>
              <Ionicons
                name="diamond-outline"
                size={23}
                color="#09A84E"
              />
            </View>

            <View style={styles.planContent}>
              <Text style={styles.planLabel}>
                Active subscription
              </Text>

              <Text
                style={styles.planName}
                numberOfLines={1}
              >
                {planName}
              </Text>
            </View>

            <Ionicons
              name="checkmark-circle"
              size={24}
              color="#09A84E"
            />
          </View>

          {(paymentId || orderId) && (
            <View style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <View style={styles.receiptIcon}>
                  <Ionicons
                    name="receipt-outline"
                    size={20}
                    color="#09A84E"
                  />
                </View>

                <View>
                  <Text style={styles.receiptTitle}>
                    Payment receipt
                  </Text>

                  <Text style={styles.receiptSubtitle}>
                    Transaction details
                  </Text>
                </View>
              </View>

              {!!paymentId && (
                <DetailRow
                  label="Payment ID"
                  value={paymentId}
                  icon="card-outline"
                />
              )}

              {!!orderId && (
                <DetailRow
                  label="Order ID"
                  value={orderId}
                  icon="reader-outline"
                  last
                />
              )}
            </View>
          )}

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="sparkles-outline"
                size={19}
                color="#09A84E"
              />
            </View>

            <Text style={styles.infoText}>
              Your updated scan limit and subscription benefits are now available.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.bottomContainer,
            {
              paddingBottom: Math.max(
                insets.bottom,
                14
              ),
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.button}
            onPress={() =>
              router.replace("/home")
            }
          >
            <View style={styles.buttonIcon}>
              <Ionicons
                name="home-outline"
                size={20}
                color="#09A84E"
              />
            </View>

            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>
                Back to Home
              </Text>

              <Text style={styles.buttonSubtitle}>
                Continue using your new plan
              </Text>
            </View>

            <Ionicons
              name="arrow-forward"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  icon,
  last = false,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        last && styles.lastDetailRow,
      ]}
    >
      <View style={styles.detailIcon}>
        <Ionicons
          name={icon}
          size={17}
          color="#09A84E"
        />
      </View>

      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>
          {label}
        </Text>

        <Text
          style={styles.detailValue}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {value}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.copyButton}
      >
        <Ionicons
          name="copy-outline"
          size={16}
          color="#7A847E"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },

  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    overflow: "hidden",
  },

  topDecoration: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#E8F8EF",
  },

  bottomDecoration: {
    position: "absolute",
    bottom: -110,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "#EFF9F3",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingBottom: 120,
  },

  successIconOuter: {
    position: "relative",
    width: 112,
    height: 112,
    borderRadius: 36,
    backgroundColor: "#E5F8ED",
    alignItems: "center",
    justifyContent: "center",
  },

  successIconInner: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: "#09A84E",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.24,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  secureBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#202722",
    borderWidth: 4,
    borderColor: "#F7F9F8",
    alignItems: "center",
    justifyContent: "center",
  },

  successBadge: {
    minHeight: 31,
    marginTop: 21,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: "#EAF8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  successDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#09A84E",
  },

  successBadgeText: {
    marginLeft: 7,
    color: "#078E42",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  title: {
    marginTop: 18,
    color: "#202622",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },

  message: {
    maxWidth: 330,
    marginTop: 9,
    color: "#78817C",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },

  planCard: {
    width: "100%",
    maxWidth: 400,
    minHeight: 76,
    marginTop: 24,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3E9E5",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  planIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  planContent: {
    flex: 1,
    marginLeft: 12,
  },

  planLabel: {
    color: "#8A938E",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },

  planName: {
    marginTop: 4,
    color: "#29312C",
    fontSize: 15,
    fontWeight: "900",
  },

  receiptCard: {
    width: "100%",
    maxWidth: 400,
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3E9E5",

    shadowColor: "#17261D",
    shadowOpacity: 0.04,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  receiptHeader: {
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1EF",
    flexDirection: "row",
    alignItems: "center",
  },

  receiptIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  receiptTitle: {
    marginLeft: 11,
    color: "#2A312D",
    fontSize: 13.5,
    fontWeight: "800",
  },

  receiptSubtitle: {
    marginTop: 2,
    marginLeft: 11,
    color: "#8B948F",
    fontSize: 10,
    fontWeight: "500",
  },

  detailRow: {
    minHeight: 62,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1EF",
    flexDirection: "row",
    alignItems: "center",
  },

  lastDetailRow: {
    borderBottomWidth: 0,
  },

  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F3F8F5",
    alignItems: "center",
    justifyContent: "center",
  },

  detailContent: {
    flex: 1,
    marginLeft: 10,
  },

  detailLabel: {
    color: "#929A96",
    fontSize: 9.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  detailValue: {
    marginTop: 3,
    paddingRight: 8,
    color: "#374039",
    fontSize: 11.5,
    fontWeight: "700",
  },

  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F6F8F7",
    alignItems: "center",
    justifyContent: "center",
  },

  infoCard: {
    width: "100%",
    maxWidth: 400,
    minHeight: 58,
    marginTop: 16,
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: "#EFF9F3",
    borderWidth: 1,
    borderColor: "#DCEFE4",
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    color: "#68746C",
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "600",
  },

  bottomContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 8,
    paddingTop: 13,
    paddingHorizontal: 13,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",

    shadowColor: "#17261D",
    shadowOpacity: 0.12,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    elevation: 10,
  },

  button: {
    minHeight: 61,
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  buttonIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonContent: {
    flex: 1,
    marginLeft: 12,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },

  buttonSubtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontSize: 10.5,
    fontWeight: "500",
  },
});