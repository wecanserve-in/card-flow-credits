import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import BottomNav from "@/components/BottomNav";
import { PLANS } from "../constants/plans";
import { createOrder } from "../services/paymentService";
import { auth } from "../services/firebase";

type BillingType = "monthly" | "yearly";
type PaymentMethod = "auto";

const PLAN_COLORS: Record<
  string,
  {
    primary: string;
    light: string;
    border: string;
  }
> = {
  starter: {
    primary: "#0AA84F",
    light: "#EFFBF4",
    border: "#82D7A4",
  },

  growth: {
    primary: "#F27522",
    light: "#FFF8F1",
    border: "#F7B27E",
  },

  pro: {
    primary: "#7353B6",
    light: "#F9F6FF",
    border: "#B7A3E4",
  },

  business: {
    primary: "#08985A",
    light: "#F1FCF7",
    border: "#86D3AC",
  },

  free: {
    primary: "#64748B",
    light: "#F8FAFC",
    border: "#CBD5E1",
  },
};

export default function PlansScreen() {
  const insets = useSafeAreaInsets();

  const [billing, setBilling] = useState<BillingType>("monthly");
  const [selected, setSelected] = useState("starter");
  const [loading, setLoading] = useState(false);

  const paymentMethod: PaymentMethod = "auto";

  const visiblePlans = useMemo(() => {
    return PLANS.filter((plan) => {
      if (plan.id === "free") {
        return false;
      }

      if (billing === "monthly") {
        return plan.interval === "Month";
      }

      return plan.interval === "Year";
    });
  }, [billing]);

  useEffect(() => {
    const selectedPlanIsVisible = visiblePlans.some(
      (plan) => plan.id === selected
    );

    if (!selectedPlanIsVisible && visiblePlans.length > 0) {
      setSelected(visiblePlans[0].id);
    }
  }, [billing, selected, visiblePlans]);

  const selectedPlan = useMemo(() => {
    return PLANS.find((plan) => plan.id === selected);
  }, [selected]);

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const getPerCardPrice = (price: number, scans: number) => {
    if (price <= 0 || scans <= 0) {
      return "Included";
    }

    return `₹${(price / scans).toFixed(2)} per card`;
  };

  const handleContinue = async () => {
    if (
      !selectedPlan ||
      selectedPlan.id === "free" ||
      loading
    ) {
      return;
    }

    try {
      setLoading(true);

      const order = await createOrder(selectedPlan.id);

      if (
        !order.key ||
        !order.order_id ||
        !order.amount ||
        !order.currency
      ) {
        throw new Error("Incomplete payment order details.");
      }

      const user = auth.currentUser;

      router.push({
        pathname: "/payment",
        params: {
          key: order.key,
          orderId: order.order_id,
          amount: String(order.amount),
          currency: order.currency,

          planId: selectedPlan.id,
          planName: selectedPlan.name,

          userName: user?.displayName || "",
          userEmail: user?.email || "",
          userPhone: "",

          paymentMethod,
        },
      });
    } catch (error) {
      console.error("Create payment order error:", error);

      Alert.alert(
        "Unable to continue",
        "We could not create the payment order. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#20252B"
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Choose Your Plan</Text>

            <Text style={styles.headerSubtitle}>
              Select the perfect plan for you
            </Text>
          </View>

          <View style={styles.headerRightSpace} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: 175 + insets.bottom,
            },
          ]}
        >
          {/* Billing Toggle */}
          <View style={styles.billingToggle}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.billingTab,
                billing === "monthly" && styles.activeBillingTab,
              ]}
              onPress={() => setBilling("monthly")}
            >
              <Text
                style={[
                  styles.billingTabText,
                  billing === "monthly" &&
                    styles.activeBillingTabText,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.billingTab,
                billing === "yearly" && styles.activeBillingTab,
              ]}
              onPress={() => setBilling("yearly")}
            >
              <Text
                style={[
                  styles.billingTabText,
                  billing === "yearly" &&
                    styles.activeBillingTabText,
                ]}
              >
                Yearly
              </Text>

              <Text
                style={[
                  styles.saveText,
                  billing === "yearly" && styles.activeSaveText,
                ]}
              >
                Save 20%
              </Text>
            </TouchableOpacity>
          </View>

          {/* Plan Cards */}
          <View style={styles.planList}>
            {visiblePlans.map((plan) => {
              const isSelected = selected === plan.id;

              const colors =
                PLAN_COLORS[plan.id] || PLAN_COLORS.starter;

              const isBestValue =
                plan.popular === true || plan.id === "pro";

              return (
                <TouchableOpacity
                  key={plan.id}
                  activeOpacity={0.88}
                  onPress={() => setSelected(plan.id)}
                  style={[
                    styles.planCard,
                    {
                      borderColor: isSelected
                        ? colors.primary
                        : colors.border,

                      backgroundColor: isSelected
                        ? colors.light
                        : "#FFFFFF",
                    },
                    isSelected && styles.selectedPlanCard,
                  ]}
                >
                  {isBestValue && (
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueText}>
                        Best Value
                      </Text>
                    </View>
                  )}

                  <View style={styles.planTopRow}>
                    <View style={styles.planLeft}>
                      <Text
                        style={[
                          styles.planName,
                          { color: colors.primary },
                        ]}
                      >
                        {plan.name}
                      </Text>

                      <View style={styles.priceRow}>
                        <Text style={styles.planPrice}>
                          {formatPrice(plan.price)}
                        </Text>

                        <Text style={styles.priceInterval}>
                          /{plan.interval === "Year" ? "year" : "month"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.planRight}>
                      <View style={styles.scanInformation}>
                        <Text style={styles.scanCount}>
                          {plan.scans} Cards
                        </Text>

                        <Text style={styles.scanRate}>
                          {getPerCardPrice(plan.price, plan.scans)}
                        </Text>
                      </View>

                      <Ionicons
                        name={
                          isSelected
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={28}
                        color={
                          isSelected
                            ? colors.primary
                            : "#C9D0D5"
                        }
                      />
                    </View>
                  </View>

                  <View style={styles.featurePreview}>
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />

                    <Text
                      numberOfLines={1}
                      style={styles.featurePreviewText}
                    >
                      {plan.features?.[0] ||
                        `${plan.scans} business card scans`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View
          style={[
            styles.bottomSection,
            {
              bottom: 72 + insets.bottom,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={
              loading ||
              !selectedPlan ||
              selectedPlan.id === "free"
            }
            onPress={handleContinue}
            style={[
              styles.continueButton,
              loading && styles.disabledContinueButton,
            ]}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />

                <Text style={styles.continueButtonText}>
                  Processing...
                </Text>
              </View>
            ) : (
              <Text style={styles.continueButtonText}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <BottomNav active="plans" />
      </View>
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
    backgroundColor: "#FFFFFF",
  },

  header: {
    minHeight: 78,
    paddingHorizontal: 19,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EFF1F2",
  },

  backButton: {
    width: 42,
    height: 48,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 2,
  },

  headerRightSpace: {
    width: 42,
  },

  headerTitle: {
    color: "#20242A",
    fontSize: 21,
    fontWeight: "800",
  },

  headerSubtitle: {
    marginTop: 3,
    color: "#8A9097",
    fontSize: 13,
    fontWeight: "500",
  },

  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },

  billingToggle: {
    height: 50,
    padding: 4,
    borderRadius: 25,
    backgroundColor: "#E9F9EF",
    flexDirection: "row",
    alignItems: "center",
  },

  billingTab: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  activeBillingTab: {
    backgroundColor: "#09AD4B",

    shadowColor: "#13843B",
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  billingTabText: {
    color: "#18773A",
    fontSize: 15,
    fontWeight: "700",
  },

  activeBillingTabText: {
    color: "#FFFFFF",
  },

  saveText: {
    marginLeft: 5,
    color: "#4E8C61",
    fontSize: 11,
    fontWeight: "600",
  },

  activeSaveText: {
    color: "#DDF6E5",
  },

  planList: {
    marginTop: 21,
    gap: 15,
  },

  planCard: {
    position: "relative",
    minHeight: 142,
    paddingHorizontal: 21,
    paddingVertical: 19,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: "center",

    shadowColor: "#1F2937",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  selectedPlanCard: {
    borderWidth: 2.2,

    shadowColor: "#0F7B3D",
    shadowOpacity: 0.08,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  planLeft: {
    flex: 1,
    paddingRight: 10,
  },

  planName: {
    fontSize: 17,
    fontWeight: "800",
  },

  priceRow: {
    marginTop: 11,
    flexDirection: "row",
    alignItems: "baseline",
  },

  planPrice: {
    color: "#1D2228",
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  priceInterval: {
    marginLeft: 4,
    color: "#838A92",
    fontSize: 12,
    fontWeight: "600",
  },

  planRight: {
    minWidth: 135,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  scanInformation: {
    marginRight: 11,
    alignItems: "flex-end",
  },

  scanCount: {
    color: "#2B3036",
    fontSize: 15,
    fontWeight: "800",
  },

  scanRate: {
    marginTop: 4,
    color: "#8C929A",
    fontSize: 11,
    fontWeight: "500",
  },

  featurePreview: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  featurePreviewText: {
    flex: 1,
    marginLeft: 7,
    color: "#6F767E",
    fontSize: 12.5,
    fontWeight: "600",
  },

  bestValueBadge: {
    position: "absolute",
    top: -12,
    right: 18,
    zIndex: 5,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: "#F4B800",
  },

  bestValueText: {
    color: "#624900",
    fontSize: 11,
    fontWeight: "800",
  },

  bottomSection: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EFF1F2",
  },

  continueButton: {
    height: 58,
    borderRadius: 15,
    backgroundColor: "#09AF4C",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#138A3C",
    shadowOpacity: 0.21,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  disabledContinueButton: {
    opacity: 0.7,
  },

  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
});