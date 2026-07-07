import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import BottomNav from "@/components/BottomNav";
import { PLANS } from "../constants/plans";
import { createOrder } from "../services/paymentService";

export default function PlansScreen() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selected, setSelected] = useState("starter");
  const [loading, setLoading] = useState(false);

  const visiblePlans = PLANS.filter(
    (plan) =>
      plan.id === "free" ||
      (billing === "monthly" && plan.interval === "Month") ||
      (billing === "yearly" && plan.interval === "Year")
  );
  const selectedPlan = PLANS.find((plan) => plan.id === selected);

  const handleContinue = async () => {
    if (!selectedPlan || selectedPlan.id === "free" || loading) return;

    try {
      setLoading(true);
      const order = await createOrder(selectedPlan.id);

      if (!order.success) {
        Alert.alert("Payment unavailable", order.message || "Please try again.");
        return;
      }

      router.push({
        pathname: "/payment",
        params: {
          key: order.key,
          orderId: order.order_id,
          amount: String(order.amount),
          currency: order.currency,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
        },
      });
    } catch {
      Alert.alert(
        "Network error",
        "Unable to create a payment order. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Select the perfect plan for you</Text>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.tab, billing === "monthly" && styles.activeTab]}
            onPress={() => setBilling("monthly")}
          >
            <Text
              style={[styles.tabText, billing === "monthly" && styles.activeTabText]}
            >
              Monthly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, billing === "yearly" && styles.activeTab]}
            onPress={() => setBilling("yearly")}
          >
            <Text
              style={[styles.tabText, billing === "yearly" && styles.activeTabText]}
            >
              Yearly (Save 20%)
            </Text>
          </TouchableOpacity>
        </View>

        {visiblePlans.map((plan) => {
          const selectedCard = selected === plan.id;

          return (
            <TouchableOpacity
              key={plan.id}
              style={[styles.card, selectedCard && styles.selected]}
              onPress={() => setSelected(plan.id)}
              activeOpacity={0.9}
            >
              <View style={styles.row}>
                <View style={styles.planInfo}>
                  <Text style={styles.plan}>{plan.name}</Text>
                  <Text style={styles.price}>
                    {plan.price === 0 ? "Free" : `Rs. ${plan.price}`}
                    {plan.price !== 0 && (
                      <Text style={styles.month}>
                        {" "}
                        /{plan.interval === "Year" ? "year" : "month"}
                      </Text>
                    )}
                  </Text>
                </View>

                <View style={styles.scanBox}>
                  <Text style={styles.scan}>
                    {plan.scans} {plan.id === "free" ? "Lifetime" : "Scans"}
                  </Text>
                  <Ionicons
                    name={selectedCard ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={selectedCard ? "#5B4BFF" : "#CBD5E1"}
                  />
                </View>
              </View>

              <View style={styles.features}>
                {plan.features.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                    <Text style={styles.feature}>{feature}</Text>
                  </View>
                ))}
              </View>

              {plan.popular && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Most Popular</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.bottomCTA}>
        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          disabled={loading || selected === "free"}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>
            {loading ? "Processing..." : selected === "free" ? "Current Plan" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>

      <BottomNav active="plans" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FF",
  },
  scrollContent: {
    paddingBottom: 180,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111111",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  subtitle: {
    paddingHorizontal: 20,
    color: "#6B7280",
    marginTop: 6,
    marginBottom: 20,
  },
  toggle: {
    marginHorizontal: 20,
    backgroundColor: "#ECEBFF",
    borderRadius: 18,
    padding: 5,
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
  },
  activeTab: {
    backgroundColor: "#5B4BFF",
  },
  tabText: {
    fontWeight: "700",
    color: "#5B4BFF",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  card: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  selected: {
    borderColor: "#5B4BFF",
    borderWidth: 2,
  },
  row: {
    flexDirection: "row",
  },
  planInfo: {
    flex: 1,
  },
  plan: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },
  price: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: "900",
  },
  month: {
    fontSize: 14,
    color: "#6B7280",
  },
  scanBox: {
    alignItems: "flex-end",
  },
  scan: {
    fontWeight: "800",
    color: "#111111",
  },
  features: {
    marginTop: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  feature: {
    marginLeft: 8,
    color: "#4B5563",
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    right: 16,
    top: -10,
    backgroundColor: "#5B4BFF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  bottomCTA: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 92,
    backgroundColor: "transparent",
  },
  button: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "#5B4BFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#5B4BFF",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 10,
  },
  disabledButton: {
    opacity: 0.75,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
