import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import {
  getGstAmount,
  getPlanTotal,
  GST_RATE,
  PLANS,
  PlanCategory,
} from "../constants/plans";
import { createOrder } from "../services/paymentService";
import { auth } from "../services/firebase";

type PaymentMethod = "auto";

const PLAN_COLORS: Record<
  string,
  {
    primary: string;
    light: string;
    border: string;
  }
> = {
  personal_starter: {
    primary: "#0AA84F",
    light: "#EFFBF4",
    border: "#82D7A4",
  },
  personal_popular: {
    primary: "#F27522",
    light: "#FFF8F1",
    border: "#F7B27E",
  },
  personal_pro: {
    primary: "#7353B6",
    light: "#F9F6FF",
    border: "#B7A3E4",
  },
  business_starter: {
    primary: "#2F80ED",
    light: "#F0F7FF",
    border: "#9CC4F5",
  },
  business_pro: {
    primary: "#08998A",
    light: "#F0FBF9",
    border: "#8AD9CF",
  },
  business_enterprise: {
    primary: "#E8590C",
    light: "#FFF6F0",
    border: "#F8B28C",
  },
};

const BEST_VALUE_IDS = new Set([
  "personal_popular",
  "business_pro",
]);

export default function PlansScreen() {
  const insets = useSafeAreaInsets();

  const [category, setCategory] =
    useState<PlanCategory>("personal");

  const [selected, setSelected] =
    useState<string>("personal_starter");

  const [loading, setLoading] =
    useState(false);

  const [summaryVisible, setSummaryVisible] =
    useState(false);

  const paymentMethod: PaymentMethod = "auto";

  const visiblePlans = useMemo(() => {
    return PLANS.filter(
      (plan) => plan.category === category
    );
  }, [category]);

  const selectedPlan = useMemo(() => {
    return PLANS.find(
      (plan) => plan.id === selected
    );
  }, [selected]);

  const gstAmount = selectedPlan
    ? getGstAmount(selectedPlan.price)
    : 0;

  const totalAmount = selectedPlan
    ? getPlanTotal(selectedPlan.price)
    : 0;

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const formatPerCard = (value: number) => {
    if (value >= 1) {
      const text =
        value % 1 === 0
          ? `${value}`
          : value
              .toFixed(2)
              .replace(/0+$/, "")
              .replace(/\.$/, "");

      return `₹${text}`;
    }

    return `₹${value.toFixed(2)}`;
  };

  const handleSelectCategory = (
    nextCategory: PlanCategory
  ) => {
    setCategory(nextCategory);

    const current = PLANS.find(
      (plan) => plan.id === selected
    );

    if (
      !current ||
      current.category !== nextCategory
    ) {
      const first = PLANS.find(
        (plan) => plan.category === nextCategory
      );

      if (first) {
        setSelected(first.id);
      }
    }
  };

  const handleContinue = () => {
    if (!selectedPlan || loading) {
      return;
    }

    setSummaryVisible(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan || loading) {
      return;
    }

    setSummaryVisible(false);

    try {
      setLoading(true);

      const order = await createOrder(
        selectedPlan.id
      );

      if (
        !order.key ||
        !order.order_id ||
        !order.amount ||
        !order.currency
      ) {
        throw new Error(
          "Incomplete payment order details"
        );
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
          baseAmount: String(selectedPlan.price),
          gstAmount: String(gstAmount),
          totalAmount: String(totalAmount),
          userName: user?.displayName || "",
          userEmail: user?.email || "",
          userPhone: "",
          paymentMethod,
        },
      });
    } catch (error) {
      console.error(
        "Create payment order error:",
        error
      );

      Alert.alert(
        "Unable to continue",
        "We could not create the payment order. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
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
            <Text style={styles.headerTitle}>
              Choose Your Plan
            </Text>

            <Text style={styles.headerSubtitle}>
              Buy credits once. Scan cards anytime.
            </Text>
          </View>

          <View style={styles.headerRightSpace} />
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.tab,
              category === "personal" &&
                styles.tabActive,
            ]}
            onPress={() =>
              handleSelectCategory("personal")
            }
          >
            <Text
              style={[
                styles.tabText,
                category === "personal" &&
                  styles.tabTextActive,
              ]}
            >
              Personal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.tab,
              category === "business" &&
                styles.tabActive,
            ]}
            onPress={() =>
              handleSelectCategory("business")
            }
          >
            <Text
              style={[
                styles.tabText,
                category === "business" &&
                  styles.tabTextActive,
              ]}
            >
              Business
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                175 + insets.bottom,
            },
          ]}
        >
          <View style={styles.gstBanner}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color="#9A6B00"
            />

            <Text style={styles.gstBannerText}>
              {`${Math.round(
                GST_RATE * 100
              )}% GST is added to the plan price.`}
            </Text>
          </View>

          <View style={styles.planList}>
            {visiblePlans.map((plan) => {
              const isSelected =
                selected === plan.id;

              const colors =
                PLAN_COLORS[plan.id] ||
                PLAN_COLORS.personal_starter;

              const isBestValue =
                BEST_VALUE_IDS.has(plan.id);

              return (
                <TouchableOpacity
                  key={plan.id}
                  activeOpacity={0.88}
                  onPress={() =>
                    setSelected(plan.id)
                  }
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
                    isSelected &&
                      styles.selectedPlanCard,
                  ]}
                >
                  {isBestValue && (
                    <View
                      style={styles.bestValueBadge}
                    >
                      <Text
                        style={
                          styles.bestValueText
                        }
                      >
                        Best Value
                      </Text>
                    </View>
                  )}

                  <View style={styles.planTopRow}>
                    <View style={styles.planLeft}>
                      <Text
                        style={[
                          styles.planName,
                          {
                            color: colors.primary,
                          },
                        ]}
                      >
                        {plan.name}
                      </Text>

                      <View style={styles.priceRow}>
                        <Text
                          style={styles.planPrice}
                        >
                          {formatPrice(plan.price)}
                        </Text>

                        <Text
                          style={styles.planGst}
                        >
                          {" + 18% GST"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.planRight}>
                      <View
                        style={
                          styles.scanInformation
                        }
                      >
                        <Text
                          style={styles.scanCount}
                        >
                          {plan.cards.toLocaleString(
                            "en-IN"
                          )}{" "}
                          Cards
                        </Text>

                        <Text
                          style={styles.scanRate}
                        >
                          {formatPerCard(
                            plan.perCard
                          )}{" "}
                          per card
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

                  <View
                    style={styles.featurePreview}
                  >
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />

                    <Text
                      numberOfLines={1}
                      style={
                        styles.featurePreviewText
                      }
                    >
                      {plan.cards.toLocaleString(
                        "en-IN"
                      )}{" "}
                      business cards included
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

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
            disabled={loading || !selectedPlan}
            onPress={handleContinue}
            style={[
              styles.continueButton,
              loading && styles.disabledContinueButton,
            ]}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text
                  style={styles.continueButtonText}
                >
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

      <Modal
        visible={summaryVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSummaryVisible(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={22}
                  color="#09AF4C"
                />
              </View>

              <Text style={styles.modalTitle}>
                Order Summary
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  setSummaryVisible(false)
                }
                style={styles.modalCloseButton}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color="#8A9097"
                />
              </TouchableOpacity>
            </View>

            {selectedPlan && (
              <>
                <View style={styles.modalPlanCard}>
                  <View>
                    <Text
                      style={styles.modalPlanName}
                    >
                      {selectedPlan.name}
                    </Text>

                    <Text
                      style={styles.modalPlanMeta}
                    >
                      {selectedPlan.cards.toLocaleString(
                        "en-IN"
                      )}{" "}
                      cards ·{" "}
                      {formatPerCard(
                        selectedPlan.perCard
                      )}{" "}
                      per card
                    </Text>
                  </View>

                  <Text
                    style={styles.modalPlanPrice}
                  >
                    {formatPrice(
                      selectedPlan.price
                    )}
                  </Text>
                </View>

                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>
                    Plan Price
                  </Text>

                  <Text style={styles.modalSummaryValue}>
                    {formatPrice(selectedPlan.price)}
                  </Text>
                </View>

                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>
                    {`GST (${Math.round(
                      GST_RATE * 100
                    )}%)`}
                  </Text>

                  <Text style={styles.modalSummaryValue}>
                    {formatPrice(gstAmount)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.modalSummaryRow,
                    styles.modalTotalRow,
                  ]}
                >
                  <Text style={styles.modalTotalLabel}>
                    Total Payable
                  </Text>

                  <Text style={styles.modalTotalValue}>
                    {formatPrice(totalAmount)}
                  </Text>
                </View>

                <Text style={styles.modalNote}>
                  {`${formatPrice(
                    selectedPlan.price
                  )} + ${Math.round(
                    GST_RATE * 100
                  )}% GST (${formatPrice(
                    gstAmount
                  )}) = ${formatPrice(
                    totalAmount
                  )} will be charged.`}
                </Text>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.modalCancelButton}
                onPress={() =>
                  setSummaryVisible(false)
                }
              >
                <Text style={styles.modalCancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={loading}
                style={[
                  styles.modalPayButton,
                  loading && styles.disabledContinueButton,
                ]}
                onPress={handleConfirmPayment}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />

                    <Text
                      style={styles.continueButtonText}
                    >
                      Processing...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.continueButtonText}>
                    {`Pay ${formatPrice(
                      totalAmount
                    )}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 4,
    borderRadius: 14,
    backgroundColor: "#F2F4F5",
  },

  tab: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  tabActive: {
    backgroundColor: "#FFFFFF",

    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  tabText: {
    color: "#8A9097",
    fontSize: 15,
    fontWeight: "700",
  },

  tabTextActive: {
    color: "#09AF4C",
    fontWeight: "800",
  },

  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 20,
  },

  gstBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#FFF8E5",
    borderWidth: 1,
    borderColor: "#F3E3B6",
  },

  gstBannerText: {
    flex: 1,
    marginLeft: 8,
    color: "#8A5A00",
    fontSize: 12.5,
    fontWeight: "600",
  },

  planList: {
    marginTop: 14,
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

  planGst: {
    marginLeft: 5,
    color: "#9AA1A8",
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
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EFF1F2",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(13, 16, 36, 0.55)",
    justifyContent: "flex-end",
  },

  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  modalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  modalTitle: {
    flex: 1,
    marginLeft: 12,
    color: "#1D2228",
    fontSize: 18,
    fontWeight: "800",
  },

  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F3F5F4",
    alignItems: "center",
    justifyContent: "center",
  },

  modalPlanCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#F7F9F8",
    borderWidth: 1,
    borderColor: "#E6EBE8",
    marginBottom: 14,
  },

  modalPlanName: {
    color: "#1D2228",
    fontSize: 15,
    fontWeight: "800",
  },

  modalPlanMeta: {
    marginTop: 3,
    color: "#8A9097",
    fontSize: 12,
    fontWeight: "500",
  },

  modalPlanPrice: {
    color: "#1D2228",
    fontSize: 17,
    fontWeight: "900",
  },

  modalSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
  },

  modalSummaryLabel: {
    color: "#6F767E",
    fontSize: 14,
    fontWeight: "600",
  },

  modalSummaryValue: {
    color: "#2B3036",
    fontSize: 14,
    fontWeight: "700",
  },

  modalTotalRow: {
    marginTop: 5,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#E6EBE8",
  },

  modalTotalLabel: {
    color: "#1D2228",
    fontSize: 16,
    fontWeight: "800",
  },

  modalTotalValue: {
    color: "#09AF4C",
    fontSize: 19,
    fontWeight: "900",
  },

  modalNote: {
    marginTop: 10,
    color: "#8A9097",
    fontSize: 11.5,
    fontWeight: "500",
    textAlign: "center",
  },

  modalActions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
  },

  modalCancelButton: {
    height: 56,
    flex: 1,
    borderRadius: 15,
    backgroundColor: "#F1F3F2",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCancelText: {
    color: "#4B5158",
    fontSize: 16,
    fontWeight: "800",
  },

  modalPayButton: {
    height: 56,
    flex: 1.5,
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

  continueButton: {
    height: 58,
    marginTop: 10,
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